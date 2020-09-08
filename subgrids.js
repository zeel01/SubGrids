/**
 * @example
 * let theBoat = startBoat(2000, 3000, 1000, 1000, 140)
 * theBoat.addObject(_token)
 * theBoat.sailTo(1900, 2400)
 * theBoat.pullObjects()
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
	constructor(width, height, size) {
		super({
			dimensions: {
				width, height, size
			},
			color: 0xFF0066, //canvas.scene.data.gridColor.replace("#", "0x"),
			alpha: canvas.scene.data.gridAlpha
		})
		this.width = width;
		this.height = height;
		this.size = size;
		this.pivot.x = width / 2;
		this.pivot.y = height / 2;

		this.reference = new PIXI.Container();
		this.reference.x = 0;
		this.reference.y = 0;
		this.addChild(this.reference);

		this.markers = [];
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
		background.drawRect(0, 0, this.width, this.height);
		background.endFill();
		background.width = this.width;
		background.height = this.height;
		this.background = background;
		this.addChild(background);
	}
	addObjects() {
		canvas.tiles.controlled.forEach(t => this.addTile(t));
		canvas.tokens.controlled.forEach(t => this.addToken(t));
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
	}
	addToken(tkn) {
		this.add(new TokenMarker(tkn, this));
	}
	addTile(tile) {
		this.add(new TileMarker(tile, this));
	}
	setMaster(object) {
		this.master = new TokenMarker(object, this);
		this.addChild(this.master);
		Hooks.on("preUpdateToken", (scene, data, update, options) => {
			if (data._id != this.master.object.id) return;

			if (update.rotation != undefined) {
				this.angle = update.rotation;
				this.pullObjects(update.rotation);
			}

			if (update.x || update.y) {
				let nx = update.x ?? data.x;
				let ny = update.y ?? data.y;
				let { x, y } = this.master._getCenterOffsetPos(nx, ny);
				this.x = x;
				this.y = y;

				this.pullObjects();
			}
		});
	}
	async pullObjects(angle) {
		for (let i = 0; i < this.markers.length; i++) 
			await this.markers[i].pull(angle);
		return this;
	}
}

class Marker extends PIXI.Container {
	constructor(object, grid) {
		super();

		this.grid = grid;
		this.object = object;
		this._drawMarker();
	}
	/** @override */
	async pull(angle) {
		return;
	}
	_drawMarker() {
		this.mark = new PIXI.Graphics();
		this.mark.beginFill(0x660000);
		this.mark.drawCircle(70, 70, 35);
		this.mark.endFill();
		this.mark.pivot.x = 70;
		this.mark.pivot.y = 70;
		const { x, y } = this.getLocalPos()
		this.position.set(x, y);
		this.addChild(this.mark);
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
	get relativeAngle() {
		if (!this._relativeAngle) {
			this._relativeAngle = this.object.data.rotation - this.angle;
		}
		return this._relativeAngle;
	}
	getLocalPos() {
		const { x, y } = this.grid.toLocal(this.position, this.object);
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
	async pull(angle) {
		const data = this.getCanvasPos();
		if (angle) data.rotation = this.relativeAngle + angle;
		await this.object.update(data);
	}
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
	async pull(angle) {
		const data = this.getCanvasPos();
		if (angle) data.rotation = this.relativeAngle + angle;
		await this.object.update(data);
	}
}
class Boat extends SubGrid {
	sailTo = function (x, y) {
		this.x = x;
		this.y = y;

		this.pullObjects();
	}
	hardToStarboard = function () {
		this.angle += 90;
		this.pullObjects(90);
	}
	hardToPort = function () {
		this.angle -= 90;
		this.pullObjects(-90);
	}
	turn(degrees) {
		this.angle += degrees;
		this.pullObjects(degrees);
	}
	scuttle = function () {
		this.destroy();
	}
	doHighlight(x, y) {
		if (!this.highlightLayer) this.highlightLayer = this.addChild(new GridHighlight("sub_highlight"));

		this.highlightGridPosition(this.highlightLayer, { x, y, color: 0xFF0000, border: 0x0000FF })
	}
}

window.theBoat = {};

function startBoat(x, y, ...args) {
	const theBoat = new Boat(...args);
	theBoat.x = x;
	theBoat.y = y;
	
	theBoat.draw();
	canvas.grid.addChild(theBoat);

	window.theBoat = theBoat;
}

Hooks.on("ready", () => startBoat(2000, 3000, 980, 980, 140));