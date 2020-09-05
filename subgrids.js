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

	const thePassenger = new PIXI.Container();
	const p = new PIXI.Graphics();
	p.beginFill(0x660000);
	p.drawCircle(70, 70, 70);
	p.endFill();
	thePassenger.x = 70;
	thePassenger.y = 70;
	
	theBoat.draw();
	thePassenger.addChild(p);
	theBoat.addChild(thePassenger);
	canvas.tokens.addChild(theBoat);

	return { theBoat, thePassenger }
}
