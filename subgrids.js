/* Schema *//*
{
	name: "Grid Name",
	dims: {
		width,
		height,
		size
	},
	position: {
		x, y, angle
	},
	master: {
		objectId: "id",
		type: "type",
		options: {
			highlight, master, mark
		}
	},
	markers: [
		{
			objectId: "id",
			type: "type",
			options: {
				highlight, master, mark
			}
		}
	]
}
*/

/**
 * Main class for Sub Grids
 * supports only square grids.
 *
 * @class SubGrid
 * @extends {SquareGrid}
 */
class SubGrid extends SquareGrid {
	/**
	 * Creates an instance of SubGrid.
	 * @param {number} width - Width of the whole grid in pixels
	 * @param {number} height - Height of the whole grid in pixels
	 * @param {number} size - Width/Height of a grid square
	 * @memberof SubGrid
	 */
	constructor(name, width, height, master, options={}) {
		const size = canvas.scene.data.grid;

		const w = width, h = height;

		width = width * size;
		height = height * size;

		super({
			dimensions: {
				width, height, size
			},
			color: 0xFF0066, //canvas.scene.data.gridColor.replace("#", "0x"),
			alpha: canvas.scene.data.gridAlpha
		})

		this.dims = {
			width, height, size, w, h
		}

	//	this.options = options;
		this.name = name;
		
		this.pivot.x = width / 2;
		this.pivot.y = height / 2;
		
		this.markers = [];
		
		if (master) this.setMaster(master);

		
		this.draw();

		this.reference = this.addChild(new PIXI.Container());

		this.transform.scale.x = 1;
		this.transform.scale.y = 1;
	}
	/**
	 * Draws the subgrid.
	 *
	 * @override
	 * @memberof SubGrid
	 */
	draw() {
		super.draw();
		this._drawBackground();
	}
	/**
	 * Draw a rectangular background
	 *
	 * @memberof SubGrid
	 */
	_drawBackground() {
		const background = new PIXI.Graphics();
		background.beginFill(0x003333, .3);
		background.drawRect(0, 0, this.dims.width, this.dims.height);
		background.endFill();
	//	background.width = this.options.dimensions.width;
	//	background.height = this.options.dimensions.height;
		this.background = background;
		this.addChild(background);
	}
	_updateFlags() {
		canvas.scene.setFlag("subgrids", `grids.${this.name}`, this.data);
	}
	addObjects() {
		canvas.tiles.controlled.forEach(t => this.addTile(t));
		canvas.tokens.controlled.forEach(t => this.addToken(t));
	}
	get data() {
		return {
			name: "",
			dims: this.dims,
			options: this.options,
			position: {
				x: this.position.x,
				y: this.position.y,
				angle: this.angle
			},
			master: this.master.data,
			markers: this.markers.map(m => m.data),
		}
	}
	/**
	 * Add a Marker
	 *
	 * @param {Marker} mark
	 * @memberof SubGrid
	 */
	add(mark) {
		this.addChild(mark);
		this.markers.push(mark);

		this._updateFlags();
	}
	addToken(tkn) {
		if (this.alreadyHas(tkn)) return;
		if (tkn.id == this.master.object.id) return;
		this.add(new TokenMarker(tkn, this));
	}
	addTile(tile) {
		if (this.alreadyHas(tile)) return;
		this.add(new TileMarker(tile, this));
	}
	autoAddObjects() {
		canvas.tiles.placeables.forEach(t => this.inBounds(t) ? this.addTile(t) : null);
		canvas.tokens.placeables.forEach(t => this.inBounds(t) ? this.addToken(t) : null);
	}
	alreadyHas(obj) {
		return this.markers.some(m => m.object.id == obj.id);
	}
	setMaster(object) {
		this.master = new TokenMarker(object, this, { master: true });
		this.addChild(this.master);

		this._updateFlags();

		let { x, y } = this.master._getCenterOffsetPos(object.x, object.y);
		this.x = x;
		this.y = y;

		Hooks.on("preUpdateToken", async (scene, data, update, options) => {
			if (data._id != this.master.object.id) return;

			if (update.rotation != undefined) {
				this.angle = update.rotation;
				await this.pullObjects(update.rotation);
			}

			if (update.x || update.y) {
				let nx = update.x ?? data.x;
				let ny = update.y ?? data.y;
				let { x, y } = this.master._getCenterOffsetPos(nx, ny);
				this.x = x;
				this.y = y;

				options.animate = false;

				await this.pullObjects();
			}

			this._updateFlags();
		});
	}
	async pullObjects(angle) {
		for (let i = 0; i < this.markers.length; i++) 
			await this.markers[i].pull(angle);
		return this;
	}
	globalBounds() {
		const b = this.getBounds();
		const t = canvas.stage.worldTransform;
		let nx = (b.x - t.tx) / canvas.stage.scale.x;
		let ny = (b.y - t.ty) / canvas.stage.scale.y;
		let w = b.width / canvas.stage.scale.x;
		let h = b.height / canvas.stage.scale.y;

		return new PIXI.Rectangle(nx, ny, w, h);
	}
	inBounds(object) {
		const bounds = this.globalBounds();
		const mark = object instanceof Token ? new TokenMarker(object, this, { highlight: false }) : new TileMarker(object, this, { highlight: false });
		const cp = this.addChild(mark).getCanvasPos();
		const { x, y } = mark._getCenterOffsetPos(cp.x, cp.y);
		 
		this.removeChild(mark);
		return bounds.contains(x, y);
	}
	doHighlight(x, y) {
		if (!this.highlightLayer) this.highlightLayer = this.addChild(new GridHighlight("sub_highlight"));

		this.highlightGridPosition(this.highlightLayer, { x, y, color: 0xFF0000, border: 0x0000FF })
	}
}

class Marker extends PIXI.Container {
	constructor(object, grid, options={ master: false, mark: false, highlight: true }) {
		super();

		this.options = options;

		this.grid = grid;
		this.object = object;

		if (options.mark) this._drawMarker();
		this.setPosition();

		this.relativeAngle = this.object.data.rotation - this.angle;

		if (options.highlight) this._highlight();

		this._createUpdateHook();
	}

	get type() { return null; }
	get data() {
		return {
			id: this.object.id,
			type: this.type,
			options: this.options
		}
	}

	async pull(angle) {
		const data = this.getCanvasPos();
		if (angle != undefined) data.rotation = this.relativeAngle + angle;
		await this.object.update(data, { animate: false, subgrid: true });
	}
	_highlight() {
		this.object._hover = true;
		this.object.refresh();
		window.setTimeout(() => {
			this.object._hover = false;
			this.object.refresh();
		}, 300);
	}
	_drawMarker() {
		this.mark = new PIXI.Graphics();
		this.mark.beginFill(0x660000);
		this.mark.drawCircle(70, 70, 35);
		this.mark.endFill();
		this.mark.pivot.x = 70;
		this.mark.pivot.y = 70;
		this.addChild(this.mark);
	}
	_createUpdateHook() {
		Hooks.on(`preUpdate${this.type}`, (scene, data, update, options) => {
			if (data._id != this.object.id || options.subgrid) return;
			if (update.x || update.y) options.animate = false;
		});
		Hooks.on(`update${this.type}`, (scene, data, update, options) => {
			if (data._id != this.object.id || options.subgrid) return;
			
			if (update.rotation != undefined) {
				this.relativeAngle = this.object.data.rotation - this.angle;
			}

			if (update.x || update.y) {
				this.setPosition();		
			}
		});
	}
	setPosition() {
		this.object.refresh();
		const { x, y } = this.options.master ? { x: this.grid.pivot.x, y: this.grid.pivot.y } : this.getLocalPos();
		this.position.set(x, y);
	}
	getCanvasPos() {
		const { x, y } = this.toGlobal(new PIXI.Point());
		const t = canvas.stage.worldTransform;
		let nx = (x - t.tx) / canvas.stage.scale.x;
		let ny = (y - t.ty) / canvas.stage.scale.y;
		

		return this._getCenterOffsetPos(nx, ny, true);;
	}
	/**
	 * Forwards call to static version, passing this.object
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {boolean} reverse - If true, find the corner, otherwise finds the center
	 * @return {number[] {x, y} - The calculated coordinates.
	 * @memberof Marker
	 */
	_getCenterOffsetPos(x, y, reverse) {
		return this.constructor.getCenterOffsetPos(this.object, x, y, reverse)
	}
	/**
 	 * Calculates the position of the object center,
 	 * or calculates the position of its corner based on the center.
	 *
	 * @static
	 * @param {Object} o
	 * @param {number} x
	 * @param {number} y
	 * @param {boolean} reverse - If true, find the corner, otherwise finds the center
	 * @return {number[]} {x, y} - The calculated coordinates.
	 * @memberof Marker
	 */
	static getCenterOffsetPos(o, x, y, reverse) {
		return { x, y };
	}
	getLocalPos() {
		const { x, y } = this.grid.toLocal(this.grid.reference.position, this.object);
		return this._getCenterOffsetPos(x, y);
	}
}
class TokenMarker extends Marker {
	/** @override */
	static getCenterOffsetPos(o, x, y, reverse) {
		return reverse ? {
			x: x - o.w / 2,
			y: y - o.h / 2
		} : {
			x: x + o.w / 2,
			y: y + o.h / 2
		};
	}
	get type() { return "Token"; }
}
class TileMarker extends Marker {
	/** @override */
	static getCenterOffsetPos(o, x, y, reverse) {
		const i = o.tile.img;
		return reverse ? {
			x: x - i.width  / 2,
			y: y - i.height / 2
		} : {
			x: x + i.width  / 2,
			y: y + i.height / 2
		};
	}
	get type() { return "Tile"; }
}

function startBoat(x, y, ...args) {
	const theBoat = new Boat(...args);
	theBoat.x = x;
	theBoat.y = y;
	
	theBoat.draw();
	canvas.grid.addChild(theBoat);

	window.theBoat = theBoat;
}

Hooks.on("renderTokenHUD", (hud, html) => {
	let button = document.createElement("div");

	button.classList.add("control-icon");
	button.classList.add("subgrid-ctr");
	button.innerHTML = `<i class="fas fa-th"></i>`

	const hasGrid = canvas.subgrids.find(grid => grid.master.object.id == hud.object.id);

	if (hasGrid) {
		button.innerHTML = `<i class="fas fa-plus"></i>`
		button.title = game.i18n.localize("Add to Subgrid");

		$(button).click((event) => {
			hasGrid.autoAddObjects();
		});
	}
	else {
		button.title = game.i18n.localize("Create Subgrid");

		$(button).click((event) => {
			new Dialog({
				title: game.i18n.localize("Create Subgrid"),
				content: `
					<label>${"Name (unique)"}</label>
					<input type="text" name="name" value="grid${randomID()}" placeholder="name"><br>
					<label>${"Width (squares)"}</label>
					<input type="number" name="width" value="5" placeholder="width"><br>
					<label>${"Height (squares)"}</label>
					<input type="number" name="height" value="5" placeholder="height">
				`,
				buttons: {
					submit: {
						icon: `<i class="fas fa-check"></i>`,
						label: "Create",
						callback: (html) => {
							const name = html.find("[name=name]").val();
							const width  = parseInt(html.find("[name=width]").val());
							const height = parseInt(html.find("[name=height]").val());

							const grid = new SubGrid(name, width, height, hud.object);
							canvas.grid.addChild(grid);
							canvas.subgrids.push(grid);

							grid.setMaster(hud.object);
						}
					},
					cancel: {
						icon: '<i class="fas fa-times"></i>',
						label: "Cancel",
						callback: () => {
							
						}
					}
				},
				default: "submit"
			}).render(true);
			
		});
	}
	html.find("div.left").append(button);
});

Hooks.on("canvasReady", (canvas) => {
	canvas.subgrids = [];

	const subData = canvas.scene.getFlag("subgrids", "grids");
	if (!subData || typeof subData != "object") return;

	canvas.subgrids = Object.values(subData).map(g => {
		const master = canvas.tokens.placeables.find(t => t.id == g.master.id);
		if (!master) return null;

		const grid = new SubGrid(g.name, g.dims.w, g.dims.h, master);
		canvas.grid.addChild(grid);

		return grid;
	});
});