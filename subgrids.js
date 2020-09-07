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
			color: canvas.scene.data.gridColor.replace("#", "0x"),
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
		this._drawBackground();
		super.draw();
	}
	/**
	 * Draw a rectangular background
	 *
	 * @memberof SubGrid
	 */
	_drawBackground() {
		const background = new PIXI.Graphics();
		background.beginFill(0x003333);
		background.drawRect(0, 0, this.width, this.height);
		background.endFill();

		this.addChild(background);
	}
	addObject(object) {
		this._addObject(object);
		return this;
	}
	_addObject(obj) {
		const mark = new Marker(obj, this);
		this.addChild(mark);
		this.markers.push(mark);
	}
	async pullObjects() {
		for (let i = 0; i < this.markers.length; i++) 
			await this.markers[i].pull();
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
	async pull() {
		const pos = this.getCanvasPos();
		this.object.update({ x: pos.x, y: pos.y, rotation: this.grid.angle });
	}
	_drawMarker() {
		this.mark = new PIXI.Graphics();
		this.mark.beginFill(0x660000);
		this.mark.drawCircle(70, 70, 70);
		this.mark.endFill();
		this.mark.pivot.x = 70;
		this.mark.pivot.y = 70;
		this.position.set(...this.getLocalPos());
		this.addChild(this.mark);
	}
	getCanvasPos() {
		const { x, y } = this.toGlobal(new PIXI.Point());
		const t = canvas.stage.worldTransform;
		let nx = (x - t.tx) / canvas.stage.scale.x;
		let ny = (y - t.ty) / canvas.stage.scale.y;
		let [fx, fy] = this._getCenterOffsetPos(nx, ny, true);

		return { x: fx, y: fy };
	}
	/**
	 * Calculates the position of the object center,
	 * or calculates the position of its corner based on the center.
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {boolean} reverse - If true, find the corner, otherwise finds the center
	 * @return {number[]} [x, y] - The calculated coordinates. 
	 * @memberof Marker
	 */
	_getCenterOffsetPos(x, y, reverse) {
		const o = this.object;
		return reverse ? [
			x - o.width  / 2 ,
			y - o.height / 2
		] : [
			x + o.width / 2,
			y + o.height / 2
		];
	}
	getLocalPos() {
		const { x, y } = this.grid.toLocal(this.position, this.object);
		return this._getCenterOffsetPos(x, y);
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
		this.pullObjects();
	}
	hardToPort = function () {
		this.angle -= 90;
		this.pullObjects();
	}
	turn(degrees) {
		this.angle += degrees;
		this.pullObjects();
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
	canvas.tokens.addChild(theBoat);

	window.theBoat = theBoat;
}
