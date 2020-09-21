Okay, this is all a total mess. So I need a real plan for this.

# Goals

# Archetecture
This is the big thing on my mind. The reason I keep slamming my head against the wall, is that I don't really have this properly pinned down. I need to know how the module is structured, how it communicates with itself and other clients, what data is stored where and how.

```js
class Subgrid extends PIXI.Container {				// I think I still want to inherit from Container
	grid: BaseGrid <SquareGrid> 					// The grid itself
	markers: Marker[] < ? >							// Set of markers
	dimensions: {
		width: // Width in pixels
		height: // Height in pixels
		size: // Size of a cell, in pixels. Default to the size setting of the scene
	}
}
```

A memeber of the subgrid class should contain a grid, and it should contain a set of position markers. However, markers shouldn't be so intimately tied to the objects they represent. Instead, a marker should simply represent a position that can be translated between coordinate systems.

Perhaps there should be a static Translator class. This would take points from one context and translate them to another.
