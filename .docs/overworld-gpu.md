# The overworld drawn by the GPU

Status: built on 26 September 2026 and waiting for its measurement on the phone (phase 8). This document is
the design, the plan it was built from, and, at its end, what was built and where it differs from the plan.

The overworld is drawn by the GPU into one canvas, and the page's DOM holds only the controls that sit over
it. We moved away from drawing the country as DOM and SVG after measuring it on an iPhone Air in Chrome:
WebKit gives every composited layer under the scaled-down map a backing store sized as if the map were at
full scale, up to 540 MB for one layer at the overview, and the parent map's 27,000 elements added another
500 MB of heap, so the page passed its 2,048 MB limit within seconds of opening. A canvas drawn from tiles and
texture atlases holds a fixed budget of GPU memory whatever the size of the country, and panning or zooming
changes one matrix rather than asking the browser to repaint its layers.

World interiors (a world's lesson roll, `engine/ui/world.tsx`) were left as DOM here, since the crash did not
point at them; moving their scenery to the same renderer is planned in `world-gpu.md`.

## What we measured

The crash was first reported on 23 September and the earlier fixes (`map-stability-stages.md`,
`map-loading-plan.md`) did not remove it. On 26 September we connected the phone to a Mac and read the
kernel's log with `idevicesyslog`, the page's layer tree through `ios_webkit_debug_proxy`, and the page
process's footprint in the iOS Simulator with `footprint`.

- The kernel kills the page process (`com.apple.WebKit.WebContent`) when it passes its `ActiveHard 2048 MB`
  limit. The kills we logged on the parent map came at 2.1 to 3.4 GB, between one and thirty-six seconds
  after the map opened, with or without anyone touching it.
- WebKit sizes a composited layer under the scaled-down world as if the world were at scale one, clipped to
  a cap that grows as the camera draws back: 216 MB at a zoom of 0.084, 415 MB at 0.039 and 540 MB at 0.0069,
  the parent map's opening overview. It also composites whatever overlaps a composited layer, so one
  composited element near the bottom of the world pulls every drawing above it into a layer of its own.
- Three things started that cascade: the terrain surface's `will-change: transform`, the paper canvas under
  the world, and every travelling drawing's animation. At the sample map's opening zoom the page held 71
  layers and 2,557 MB of them in the Simulator.
- Keeping the world as one layer and resting the animations below a zoom of 0.3 brought the sample map to
  250 to 254 MB in the Simulator and 261 MB at rest on the phone, 580 MB at most while it was used. The parent
  map still died: its one world layer was 540 MB at the overview, its world held 27,089 elements and a heap
  of about 500 MB, and the layer was painted again about twice a second at rest.
- Drawing the terrain from image tiles instead of SVG did not change the crash, since the terrain was never
  the cost. It did lower WebKit's footprint on a Mac from 1.38 to 1.51 GB to 0.93 to 0.96 GB while flying.
- CSS `zoom` on the world in place of `transform: scale` kept the layers at 72 to 212 MB, but iOS enforces a
  minimum size on text shrunk by zoom, and the place names grew to fill the screen.

Each of these is a way the browser's compositor was being asked to act as a map engine. Map engines draw
into one GPU canvas from tiles and atlases instead, and we do the same.

## The design

### Assets built ahead of time

The terrain is the tile pyramid from the tiled renderer (`tools/scripts/map-tiles.ts`): seven levels of
256-pixel tiles in four layers (sea, pencil, land, colour), stored as content-addressed PNGs with uniform
tiles folded into solid colours. The thin strokes (coasts, contour rings, rivers, lakes) are left out of
every level but the root and written as vector line chunks on the level-3 grid, binned so a frame strokes
only the bins it shows.

The world drawings become a sprite atlas, built by a new exporter (`tools/scripts/map-atlas.ts`) from the
shelf's catalogue for every drawing the overworld places (`refsOf(WORLDS)`, 210 drawings from 38 worlds on
26 September, 23 of them hand-drawn files). Each drawing is drawn through the same SVG surface the page uses
today and rasterized in Chrome, as the tile export already does, so the atlas cannot drift from the shelf. A
drawing's parts that move on their own (a windmill's sails, a volcano's smoke) are exported as frames of
their own with their anchors, so the renderer moves them as the page's animations do now. The atlas has a
small resident level, at a quarter of a texture pixel per world unit, which covers the far and middle zooms
for every drawing in about 8 MB, and a close level exported per drawing and loaded only for the drawings in
view, since holding every drawing at close-zoom resolution would take close to a gigabyte. The exporter
writes an index of frames, sizes and anchors with the same integrity tests the tiles have.

### What the renderer draws each frame

`engine/ui/gl.ts` is a WebGL2 renderer of our own, about as small as a tile layer, a sprite batch, a
line batch and a grid need. The frame is drawn in this order: the paper grid, from a shader, one device pixel
wide at every zoom; the terrain tiles, masked by what the child has reached; the child's own ink; the sprites
in one instanced draw, in pencil or in colour by a uniform rather than a CSS filter; the names; and the plane
and the guide's token.

The child's own ink is everything on the map that depends on the child: the roads and rails with the ones
walked lit, fields and forests drawn by the view, the known land's feather and the colour's reach. It is drawn
with Canvas2D into tile textures, once for each tile and level, from the same view data the page draws from
now, and drawn again only when the child's state changes, never because the camera moved. The Canvas2D
compositor we wrote for the tiled renderer already draws the reach masks and the line chunks this way; its
logic moves into this layer and its drawing on every frame goes away.

Names are drawn once each, in the hand font, with Canvas2D into textures at two sizes, and drawn as quads.

The renderer draws only when the camera moves or something visible is animating, and at rest it requests no
frames. Its textures live under one budget of about 96 MB (the tile cache's 24 MB, the child's ink, the
atlas and the names), smaller on a device that reports little memory, with the least recently seen evicted
first. Each map on a page owns one canvas and one context, created while the map is on screen and released
when it leaves, and a lost context is restored by uploading its textures again.

### The DOM over the canvas

The page keeps the controls in the DOM, in screen space, moved by translation and never scaled, so no
element under the map is ever a scaled-down layer. Every place is a button placed over its drawing each
frame, with its name for a screen reader, a 44-pixel target and the keyboard journey the map has now. The
HUD, the flight controls, the paper plane, hover and tap feedback for a locked place, and the rectangle a
world's entry animates from all stay DOM.

### The camera

`CanvasView` (`engine/ui/view.ts`) keeps the camera, gestures, the wheel, the keyboard and flights, and
gives each frame's camera to the renderer instead of transforming a world element. World interiors keep
using its world element as they do now.

### Decisions

Printing the poster keeps the SVG painter, used only for that one static render; the screen never draws it.

Phones test branches on a staging service on Render, which needs signing in over HTTPS, instead of taking
production for a branch as we did on 25 and 26 September. Creating the service is asked for before it is
made.

The renderer is our own on WebGL2 rather than PixiJS, which would add about 450 KB to a screen whose script
budget is 380 KB; we need only textured quads, instanced sprites, lines and a grid.

## Plan

Each phase ends at a gate, and the next phase starts only when it is passed.

### Phase 0: one checkout and a clean base

We remove the worktrees `/tmp/lumischool-map-tiles` and `/tmp/lumischool-zoom-fix` and delete the branches
`map/tiled-renderer`, `map/stepped-zoom` and `map/single-layer` here and on GitHub. Production goes back
to remote `main`.

From the tiled branch we bring to `main` the tile pipeline (`tools/scripts/map-tiles.ts`,
`map-tile-lines.ts`, `map-tile-compaction.ts`, `map-tile-artifacts.ts` and their tests), the tile index and
cache (`engine/ui/map-tile-schema.ts`, `map-tile-layout.ts`, `tile-cache.ts` and their tests), the
`map:tiles` script and the `.prettierignore` entry, and export the tiles again on `main`, since the exporter
draws with `main`'s painter. We do not bring the Canvas2D compositor, the generated map geometry (the atlas
makes it unneeded), the world interiors' scenery surfaces (unmeasured and out of scope) or the branch's
wiring into the apps.

We revert the uncommitted single-layer change on `main` (`map-surfaces.ts`, `overworld.tsx`,
`overworld.css` and its section in `overworld.md`), since it does not save the parent map and the renderer
replaces what it changed. We stop the debugging processes started on 26 September and record in `local.md`
how to read a phone's kills, layers and footprint.

Gate: `npm run check` passes on `main`, and the tiles' integrity tests pass on the export.

### Phase 1: the spike

A first renderer draws the paper grid, the terrain tiles, the line chunks, every world's drawings from a
first atlas at the resident level, and the names, on the parent map, with the real camera, behind a
`?mapRenderer=gpu` switch.

Gate, measured on the iPhone Air in Chrome on the staging service: the parent map survives ten minutes of
panning, zooming and flying; the page's footprint stays under 600 MB; flying holds a 95th-percentile frame
time of 17 ms. If it fails, we stop and decide again with the measurements.

### Phase 2: the atlas

The exporter for both levels, the parts that move, seasons and the states a drawing is shown in, the index
and its tests, and the close level loaded on demand. Gate: the atlas is byte-stable from the catalogue and
its tests pass.

### Phase 3: the renderer made robust

The budget and eviction, culling, drawing only on change, restoring a lost context, reduced motion, and
Node tests for the camera matrices, culling, batching and level choice. Gate: the tests pass, and a
browser test that opens and closes the map twenty times leaves no textures or canvases behind.

### Phase 4: everything the map does

Everything `engine/ui/map.ts` draws moves onto the renderer: the reach and the colour spreading after a
lesson, roads and lit roads, places and the guide walking and riding, worlds to come, secrets and lamps,
stamps, the title, key and compass, names in each state, the day's ink coming in, the travelling drawings
and the drawings' own idles, waves and smoke, the plane and its shadow. Gate: the map matches the SVG map's
snapshots within a set difference at the overview, a middle and a close zoom, and the behaviour tests pass.

### Phase 5: the DOM over the canvas

The place buttons, focus, the keyboard journey, what a screen reader hears, the transitions into and out of
a world, and a locked place's feedback. The eleven browser test files that read the map's DOM (`map.e2e.ts`,
`kid-map.e2e.ts`, `map-resources.e2e.ts`, `map-continuity.e2e.ts`, `site.e2e.ts`, `grown-ups.e2e.ts`,
`games.e2e.ts`, `kid-login.e2e.ts`, `view-lifecycle.e2e.ts`, `world-zoom.e2e.ts`, `world-overview.e2e.ts`)
are rewritten against the overlay. Gate: they pass, and a VoiceOver pass on the phone finds nothing missing.

### Phase 6: every page that shows the map

The parent map, the child's map, the site's two maps and the map over a page (`overlay.tsx`) take the
renderer, which loads with the map. The snapshot in the backdrop stays the first thing shown, and the
canvas fades in over it. Gate: the snapshot and first-view budget tests pass.

### Phase 7: the old path removed

The DOM and SVG overworld painters the screen no longer uses, the terrain's SVG surfaces, the rules in
`overworld.css` that styled them and the switch are deleted, leaving the poster's painter. Gate: nothing
exported is unused, and `npm run check` passes.

### Phase 8: devices

The iPhone Air in Chrome and in Safari, an older iPhone, an Android phone in Chrome, and desktop Chrome,
Safari and Firefox, each measured for survival, footprint, frame time, the snapshot difference, reduced
motion and a lost context. Gate: the measures at the top of the spike's gate on every device.

The spike takes one to two days and the whole about two to three weeks.

## What was built

The map is drawn by `engine/ui/gl.ts` (the renderer, which the games now share), `engine/ui/map-tiles.ts`
(the terrain) and `engine/ui/map-scene.ts` (everything else). `overworld.tsx`
gives the painters a container the page never lays out (`display: none`), and `map.ts` paints into it as
before. The scene reads that container every frame the camera moves or something in it plays, and draws each
SVG in it from a texture the browser's own SVG renderer made, at the power of two nearest the size the
camera shows it, placed by the positions and transforms the painters wrote. The words, the buttons and what
CSS draws itself (the stamps, the notes, the lamps' light) are moved out of that container into an overlay
over the canvas, inside the world element the camera already transforms, and nothing in the overlay has a
layer of its own.

This departs from the plan in one decision. We did not build a sprite atlas at build time. The painters
draw every drawing in the state it is shown in (pencil or colour, the season, what the child has lit), and an
atlas would have had to export each drawing in each of those states and still leave the painters' layout to
be written again in the renderer. Rasterising at run time what the painters already produce keeps one
painter for the screen, the poster and the snapshots, and costs a texture per drawing on screen, which the
scene holds under the budget the plan set (96 MB, least recently drawn first). While the camera moves, a
drawing keeps the texture it has unless it would look twice as soft, and is drawn sharp again once the camera
has rested for 200 ms, since rasterising an SVG runs on the main thread. The same reasoning put the names in
the overlay rather than in textures: they are text the page already sets in the hand font.

What moves is evaluated by the scene rather than played by the browser. CSS animations (the waves' drift,
the country's travellers, a windmill's sails) are read from the page's stylesheets, and the drawings' idles
(`engine/ui/animate.ts`) are read from their Web Animations. A part of a drawing that its idle moves is drawn
as a texture of its own, so the drawing is not rasterised again on every frame. The idles cannot see what is
on screen in a container that is never laid out, so the scene tells their group, once the camera rests
(`drawnElsewhere` and `see` in `animate.ts`).

The page waits for the scene before it calls the map drawn (`settled` in `map-scene.ts`), so the snapshot
under the map stays until the canvas holds everything it stands in for. A lost context is restored by
uploading every texture again when it is next drawn.

The snapshots were taken again, and they match the SVG map they replace closely: the colour's hatched rim is
drawn from a mask at up to twice the page's pixels for that reason. The snapshot harness now builds with the
project's `public/` folder, since the terrain's tiles are served from it; before this change it had drawn the
snapshots with no tiles at all.

### The terrain on the GPU

The first version drew the terrain's thin strokes, washes and reach masks with Canvas2D into textures over a
window round the camera, and drew them again whenever the view left the window or the zoom changed by a
quarter, which a pinch from the overview did about twenty times. The terrain is now drawn by the GPU from
data that does not change with the camera:

- The coast, contour, river and lake strokes are straight segments cut from the exported chunks once, as
  they load, and drawn instanced as capsules, with their dashes, their fades at the country's edge and their
  antialiasing worked out in the fragment shader. Each group of strokes is drawn opaque into a target of its
  own and laid down at its alpha, as SVG composites a group.
- The washes, the whole islands and the isles not yet reached are polygons filled even-odd through the
  stencil buffer, so no polygon is ever triangulated on the CPU.
- The masks are drawn every frame into a target the size of the screen: what the map knows as discs that
  fade out from 0.72 of their radius, the colour as discs with their hatched rims, and, without the rims,
  what the colour has reached, which is the painter's rule for choosing a pen for the landscape. A draw reads
  the channel it asks for where it lands on the screen, so a mask is never magnified or shifted.
- The paper's grid is drawn by the shader, one device pixel wide, so the view no longer keeps a canvas of
  its own for it (`paper: false` in `view.ts`), and every uploaded image has mipmaps.

The landscape's marks (the woods, the ranges, the fields and the reeds) and its waves are baked into four
more tile layers: the marks all in pencil and all in colour, which the masks choose between, and the waves
once, which the shader tints from soft ink to ink by how far the colour has reached and drifts as the
page's stylesheet does, asking for a frame only when the drift has moved half a device pixel. The finest
tiles would show the marks magnified close in, so there the painter draws the landscape as before, a tile at
a time as the camera comes near (`landscapeZoom` in `map-tiles.ts`); between that zoom and 1.3 times it
both are drawn, so one hands over to the other without a gap.

Tiles are held as textures, not images: a tile's decoded image is let go once it is on the GPU, identical
tiles share one texture, and the tiles the camera has left stay until the textures pass 160 MB, when the
least recently drawn go. The finest level a view asks for is the finest whose textures fit in 60 percent of
that, which a large desktop window at the closest level needs. A parked map keeps only the tiles that stand
in for the rest. The canvas has at most four million backing pixels, twice the CSS pixels on a phone and a
little under that in a large desktop window.

### The drawings, rasterised off the page's thread and packed into pages

The atlas the plan described, built ahead of time, would not have held the map's drawings: every placed
drawing takes its sketch's seed from where it stands, so each is a drawing of its own, and a picture of
every one at every size would have run to hundreds of megabytes. The atlas is filled as the map runs
instead, and nothing of it runs on the page's thread:

- `engine/ui/sprites.ts` reads a drawing's SVG, as the shelf's painters make it, into a display list of
  paths, text and groups (the attributes the painters write, and the page's computed style only for
  lettering and for a paint given as a custom property), each moving part a numbered group.
- A pool of up to four workers (`sprites.worker.ts`) draws the list with a canvas of their own at the size
  the camera wants, compositing a group's opacity and a glow as SVG does, and posts the pixels back. A game
  can mark a job urgent, and it goes before the queue.
- A drawing that fits a 512-pixel cell is drawn with four pixels of padding and written into a page of
  `engine/ui/atlas.ts`: 2048-pixel pages cut into shelves of cells of one size class each, with two levels
  of mipmaps the padding keeps apart, freed cells reused by the next drawing of their size, and a page
  nothing is in let go. Drawings that follow one another on a page are drawn as one instanced batch through
  the sprite program the games share, whose instances carry the drawing's transform as two axes, its
  crop, its opacity, its tone and its mask. A larger drawing keeps a texture of its own.

The games take the same sprite layout (19 floats an instance, agreed with them) and mean to move their own
rasterising onto the workers.

Two faults were found on the way. The mask pass drew into a texture that was still bound for reading, which
WebGL refuses as a feedback loop, so every polygon fill into the masks was dropped; the passes now bind a
blank texture first. And tiles that loaded while the context was lost were marked failed for thirty seconds;
a tile now becomes a texture when it is first drawn, and waits for the context if it is lost.

Measured on a Mac in Chrome over the parent map, panning holds a median frame of 8.3 ms and a 95th
percentile of 9.2 ms, where it was 33 and 134 ms with the Canvas2D terrain, and zooming holds 8.6 and 59 ms,
where it was 16 and 92 ms. With the drawings rasterised by the workers and drawn in batches, zooming holds a
median of 8.3 ms and a 95th percentile of 9 to 17 ms (59 ms before), and fast flight with turns 17 ms. What
is left of the slow frames, a single frame of 33 to 59 ms now and then, is the painter building new
places with rough.js as the camera comes to them. The tile export now takes about eight minutes and publishes 31 MB. The
phone has not been measured. The page's footprint, its survival over ten minutes and the frame times on the
iPhone Air are phase 8, and need the staging service, which has not been created.

The phases landed together rather than one at a time. The browser tests that read the map's drawings now
check that they are attached rather than visible, the test of the terrain's SVG surfaces checks the canvas
and the world's clip instead, and a new test loses and restores the context. The waves' `mo-off` pausing and
its observer are gone, since the scene draws only what the camera sees.

## Risks

The atlas might not match the SVG at the closest zoom; the close level exists for that, and the snapshot
difference is the measure. The hand font in textures might look soft when a name is between its two sizes;
we would add a third size or signed-distance glyphs. Some browsers limit how many contexts a page may hold;
the site's maps create theirs only while on screen. The rewrite of the browser tests is a real part of the
work and is planned as a phase, not left to the end.
