/**
 * Request: https://discordapp.com/channels/732325252788387980/733339683278422068/751258458501808165
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
	constructor(name, width, height, master, options={ angle: 0, skipUpdates: false }) {
		const size = canvas.scene.data.grid;

		width = width * size;
		height = height * size;

		super({
			dimensions: {
				width, height, size
			},
			color: 0xFF0066, //canvas.scene.data.gridColor.replace("#", "0x"),
			alpha: canvas.scene.data.gridAlpha
		})

	//	this.options = options;
		this.name = name;
		this.skipUpdates = options.skipUpdates;
		
		this._updatePivot();
		
		this.markers = [];
		
		if (master) this.setMaster(master);

		
		this.draw();

		this.reference = this.addChild(new PIXI.Container());

		this.transform.scale.x = 1;
		this.transform.scale.y = 1;

		this.autoAddObjects();
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
	redraw() {
		this.clear();
		this.addChild(this.master);
		this.draw();
		this.autoAddObjects();
	}
	clear() {
		this.removeChildren().forEach(c => {
			if (c == this.master) return;
			c.destroy({ children: true });
		});
		this.markers = [];
	}
	/**
	 * Draw a rectangular background
	 *
	 * @memberof SubGrid
	 */
	_drawBackground() {
		const background = new PIXI.Graphics();
		background.beginFill(0x003333, .3);
		background.drawRect(0, 0, this.width, this.height);
		background.endFill();
		this.background = background;
		this.addChild(background);
	}
	_updateFlags() {
		if (this.skipUpdates) return;

		canvas.scene.update({ 
			[`flags.subgrids.grids.${this.name}`]: duplicate(this.data)
		}, {
			subgrid: true
		});
	}
	_updatePivot() {
		this.pivot.x = this.width / 2;
		this.pivot.y = this.height / 2;
	}
	addObjects() {
		canvas.tiles.controlled.forEach(t => this.addTile(t));
		canvas.tokens.controlled.forEach(t => this.addToken(t));
	}
	// Set width an height in grid squares, but save in pixels
	set cellWidth(w) { this.width = parseInt(w) * this.size; }
	set cellHeight(h) { this.height = parseInt(h) * this.size; }

	// Set the width in pixels
	set width(w) { 
		this.options.dimensions.width = parseInt(w);
		this._updatePivot();
	}	
	set height(h) { 
		this.options.dimensions.height = parseInt(h);
		this._updatePivot();
	}

	// Get the width and height from the stored size in pixels
	get cellWidth() { return this.width / this.size; }
	get cellHeight() { return this.height / this.size; }

	// Get the size
	get size() { return this.options.dimensions.size; }

	// Get the width and height in pixels
	get width() { return this.options.dimensions.width; }
	get height() { return this.options.dimensions.height; }
	
	// Return all the dimensions as an object.
	get dimensions() {
		return {
			width: this.width,
			height: this.height,
			size: this.size,
			cellWidth: this.cellWidth,
			cellHeight: this.cellHeight
		}
	}

	// Get the important data about the grid
	get data() {
		return {
			name: this.name,
			dimensions: this.dimensions,
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
		if (tkn.id == this.master.object.id) return;
		this.add(new TokenMarker(tkn, this));
	}
	addTile(tile) {
		this.add(new TileMarker(tile, this));
	}
	addLight(light) {
		this.add(new LightMarker(light, this));
	}
	canAdd(obj) {
		return this.inBounds(obj) && !this.alreadyHas(obj);
	}
	autoAddObjects() {
		if (this.skipUpdates) return;

		canvas.tiles.placeables.forEach(t => this.canAdd(t) ? this.addTile(t) : null);
		canvas.tokens.placeables.forEach(t => this.canAdd(t) ? this.addToken(t) : null);
		canvas.lighting.placeables.forEach(l => this.canAdd(l) ? this.addLight(l) : null);
	}
	addList(list) {
		this.addListByType(list, "Tile", canvas.tiles, this.addTile);
		this.addListByType(list, "Token", canvas.tokens, this.addToken);
		this.addListByType(list, "Light", canvas.lighting, this.addLight);
	}
	/**
	 * Add objects of a particular type from a list
	 *
	 * @param {object[]} list - List of data describing objects to add.
	 * @param {string} type - The name of the type of object.
	 * @param {PlaceablesLayer} layer - The canvas later this object resides on.
	 * @param {function} adder - The method which is used to add that type of object.
	 * @memberof SubGrid
	 */
	addListByType(list, type, layer, adder) {
		const objects = list.filter(m => m.type == type);
		const objIds = objects.map(t => t.id);
		layer.placeables.forEach(
			o => this.inBounds(o) && objIds.includes(o.id) ? adder.call(this, o) : null
		);
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
		this.angle = this.master.object.data.rotation ?? 0;
	}
	async preUpdateMaster(data, update, options) {
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
	}
	async pullObjects(angle) {
		if (this.skipUpdates) return;

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
	static getMarkerClass(object) {
		if (object instanceof Token) return TokenMarker;
		if (object instanceof Tile) return TileMarker;
		if (object instanceof AmbientLight) return LightMarker;
		
		return Marker;
	}
	inBounds(object) {
		const bounds = this.globalBounds();
		const mark = new (this.constructor.getMarkerClass(object))(object, this, { highlight: false });
		const cp = this.addChild(mark).getCanvasPos();
		const { x, y } = mark._getCenterOffsetPos(cp.x, cp.y);
		 
		this.removeChild(mark);
		return bounds.contains(x, y);
	}
	doHighlight(x, y) {
		if (!this.highlightLayer) this.highlightLayer = this.addChild(new GridHighlight("sub_highlight"));

		this.highlightGridPosition(this.highlightLayer, { x, y, color: 0xFF0000, border: 0x0000FF })
	}
	refresh(data) {
		//
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

		this.relativeAngle = this.object.data.rotation - this.grid.angle;

		if (options.highlight) this._highlight();
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
	updateObject(update) {	
		if (update.rotation != undefined) {
			this.relativeAngle = this.object.data.rotation - this.angle;
		}

		if (update.x || update.y) {
			this.setPosition();		
		}
	}
	setPosition() {
		this.object.refresh();
		const { x, y } = this.options.master ? { x: this.grid.pivot.x, y: this.grid.pivot.y } : this.getLocalPos();
		this.position.set(x, y);
	}
	getCanvasPos() {
		// Convert the position of this object to one local to the canvas
		const { x, y } = canvas.stage.toLocal(new PIXI.Point(), this);

		// Then get the reverse center offset, giving the position of the upper-left corner.
		return this._getCenterOffsetPos(x, y, true);
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
		// Find the center point of the objebt
		const cp = this._getCenterOffsetPos(this.object.x, this.object.y);

		// Create a temporary PIXI object there
		const center = new PIXI.Container();
		canvas.stage.addChild(center);
		center.position.set(cp.x, cp.y);

		// Convert that reference to a local position
		const { x, y } = this.grid.toLocal(new PIXI.Point(), center);

		// Remove the temporary object
		canvas.stage.removeChild(center);

		return { x, y };
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
class LightMarker extends Marker {
	get type() { return "Light" };
}
class SubGridSheet extends FormApplication {
	constructor(...args) {
		super(...args);
	}
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ['subgrids'],
			width: 600,
			height: 400,
			title: 'Edit Grid',
			editable: true,
			submitOnChange: true,
			closeOnSubmit: false,
			submitOnClose: true
		});
	}
	get template() {
		return `modules/subgrids/grid-sheet.html`;
	}

	getData() {
		// Return data to the template
		const data = {};

		data.object = this.object.data;

		return data;
	}

	activateListeners(html) {
		super.activateListeners(html);

	}
	async _updateObject(event, formData) {
		console.log(formData);

		this.object.name = formData.name;
		this.object.cellWidth = formData.width;
		this.object.cellHeight = formData.height;

		this.object._updateFlags();
		this.object.redraw();
	}
}

Hooks.on("renderTokenHUD", (hud, html) => {
	let button = document.createElement("div");

	button.classList.add("control-icon");
	button.classList.add("subgrid-ctr");
	button.innerHTML = `<i class="fas fa-th"></i>`
	button.title = game.i18n.localize("subgrids.editTooltip");
	
	$(button).click((event) => {
		const hasGrid = canvas.subgrids.find(grid => grid.master.object.id == hud.object.id);
		const grid = hasGrid || new SubGrid(randomID(), 1, 1, hud.object);
		if (!hasGrid) {
			canvas.grid.addChild(grid);
			canvas.subgrids.push(grid);
			grid.setMaster(hud.object);
		}
		if (!grid.sheet) grid.sheet = new SubGridSheet(grid);
		
		grid.sheet.render(true);
	});

	html.find("div.left").append(button);
});

Hooks.on("canvasReady", (canvas) => {
	canvas.subgrids = [];

	const subData = canvas.scene.getFlag("subgrids", "grids");
	if (!subData || typeof subData != "object") return;

	canvas.subgrids = Object.values(subData).map(g => {
		const master = canvas.tokens.placeables.find(t => t.id == g.master.id);
		if (!master) return null;

		const grid = new SubGrid(g.name, g.dimensions.cellWidth, g.dimensions.cellHeight, master, { angle: g.position.angle, skipUpdates: !SubGridManager.isGridMaster });
		canvas.grid.addChild(grid);

		grid.addList(g.markers);

		return grid;
	});
});

class SubGridHooks {
	static readyHook() {
		game.socket.on("module.subgrids", SubGridManager.handleIncomingSocket);
	}
	static async preUpdatePlaceable(type, scene, data, update, options) {
		if (options.subgrid) return;

		if (SubGridManager.isGridMaster) this.preUpdateMasters(data, update, options);
		
		this.preventAnimation(data, update, options);
	}
	static async updatePlaceable(type, scene, data, update, options) {
		if (options.subgrid) return;

		if (!SubGridManager.isGridMaster) this.preUpdateMasters(data, update, options);

		for (let grid of canvas.subgrids) {
			grid.markers.find(
				m => m.object.id == data._id
			)?.updateObject(update);
		}
	}
	static preventAnimation(data, update, options) {
		if (!(update.x || update.y)) return;
		if (canvas.subgrids.some(
				grid => grid.markers.some(m => m.object.id == data._id)
		)) options.animate = false;
	}
	static async preUpdateMasters(data, update, options) {
		for (let grid of canvas.subgrids) {
			if (data._id != grid.master.object.id) continue;
			await grid.preUpdateMaster(...arguments);
		}
	}
	static updateScene(scene, data, options) {
		if (!options.subgrid || SubGridManager.isGridMaster) return;
		Object.values(scene.data.flags.subgrids.grids).forEach(gd => {
			const grid = canvas.subgrids.find(g => g.name == gd.name);
			if (!grid) return;

			grid.name = gd.name ?? grid.name;
			grid.cellWidth = gd.dimensions.cellWidth ?? grid.cellWidth;
			grid.cellHeight = gd.dimensions.cellHeight ?? grid.cellHeight;

			grid.redraw();
		});
	}
}

class SubGridManager {
	static handleIncomingSocket({ command, options }) {
		if (!command) return;

		switch (command) {
			case "refresh": break;
		}
	}
	static get isGridMaster() {
		return game.user.isGM;
	}
}

Hooks.once("ready", () => SubGridHooks.readyHook());

Hooks.on("preUpdateToken", (...args) => SubGridHooks.preUpdatePlaceable("Token", ...args));
Hooks.on("preUpdateTile", (...args) => SubGridHooks.preUpdatePlaceable("Tile", ...args));

Hooks.on("updateToken", (...args) => SubGridHooks.updatePlaceable("Token", ...args));
Hooks.on("updateTile", (...args) => SubGridHooks.updatePlaceable("Tile", ...args));
Hooks.on("updateAmbientLight", (...args) => SubGridHooks.updatePlaceable("Light", ...args));

Hooks.on("updateScene", (...args) => SubGridHooks.updateScene(...args));