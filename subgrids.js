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

		this.objects = [];
		this.markers = [];
	}
	/**
	 * Draws the subgrid.
	 *
	 * @override
	 * @memberof SubGrid
	 */
	draw() {
		this._drawBackground()
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
	/**
	 * Convert the position of the token to a local position.
	 *
	 * @param {*} object
	 * @param {*} reference
	 * @memberof SubGrid
	 */
	getLocalObjectPosition(object) {
		return this.toLocal(this.reference.position, object);
	}
	getGlobalMarkerPosition(marker) {
		return this.toLocal(this.position, marker);
	}
	addObject(object) {
		this.objects.push(object);
		this._markObject(object);
		return this;
	}
	markObjects() {
		this.objects.forEach(o => this._markObject(o));
		return this;
	}
	_markObject(obj) {
		const marker = new PIXI.Container();
		const m = new PIXI.Graphics();
		m.beginFill(0x660000);
		m.drawCircle(70, 70, 70);
		m.endFill();
		marker.position = this.getLocalObjectPosition(obj);
		marker.addChild(m);
		this.addChild(marker);
		this.markers.push(marker);
	}
	async pullObjects() {
		for (let i in this.objects) await this._pullObject(this.objects[i], i);
		return this;
	}
	async _pullObject(obj, i) {
		const pos = this.getGlobalMarkerPosition(this.markers[i]);
		obj.update({ x: pos.x, y: pos.y });
	}
}

class Boat extends SubGrid {
	sailTo = function (x, y) {
		this.x = x;
		this.y = y;
	}
	hardToStarboard = function () {
		this.angle += 90;
	}
	hardToPort = function () {
		this.angle -= 90;
	}
	turn(degrees) {
		this.angle += degrees; 
	}
	scuttle = function () {
		this.destroy();
	}
	doHighlight(x, y) {
		if (!this.highlightLayer) this.highlightLayer = this.addChild(new GridHighlight("sub_highlight"));

		this.highlightGridPosition(this.highlightLayer, { x, y, color: 0xFF0000, border: 0x0000FF })
	}
}

function startBoat(x, y, ...args) {
	const theBoat = new Boat(...args);
	theBoat.x = x;
	theBoat.y = y;
	
	theBoat.draw();
	canvas.tokens.addChild(theBoat);

	return theBoat;
}
