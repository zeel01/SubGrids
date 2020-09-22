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

Markers therefore, are basically just PIXI.Point's with some special methods to facilitate translation. Maybe they should be PIXI.Containers? I'm not sure why they would need to be really.

One problem. Tokens, tiles, and lights all have a slightly different method required to determin their centers. Tokens and Tiles need to have their rectangular bounds referenced, which is slightly different for Tiles than tokens. Lights on the other hand, don't even need a translation for their centers as they are already have a center basis. However, I'm not especially happy with the need to have different types of markers.

