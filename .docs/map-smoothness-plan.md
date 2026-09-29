# The map without redraws

Status: planned on 28 September 2026; phases 0 to 7 built on 28 and 29 September, phase 8 waits for the
phone (see "Record"). The phases below are the order the work was done in, and
each lands with its gate passing before the next begins. What is built is recorded at the end as each phase
lands.

The overworld and a world's roll have both been drawn by the GPU since the work in `overworld-gpu.md` and
`world-gpu.md`. Nothing on the screen goes missing any more as a family moves over them, which
`tools/e2e/map-smoothness.e2e.ts` holds. What is left is art that is drawn again while it is on the screen:
the ground of a roll building up in steps as a child comes into a world, the whole roll repainted a moment
after it arrives, drawings sharpening in a wave after every zoom, a world entered for the second time drawn
from nothing, and the map drawn from nothing after a lesson is finished. Each of these reads as a flicker,
and each costs the phone memory and battery.

We read the scene renderer and everything that feeds it in September 2026 and traced every path by which a
drawing on the screen is rasterised again. The causes are not in the renderer's approach, which is sound,
but in how pixels are kept and found again. The scene treats a change anywhere in a drawing as a change to
all of it; its key for finding pixels again is taken too early and includes markup that changes from paint
to paint; a roll's scene is thrown away when a child leaves the world; parking a map keeps almost nothing;
and a flight paints and rasterises where the camera is rather than where it is going. This plan fixes each
of those, then makes the pixels last across scenes and across visits, and ends with the phone measured.

## What must hold

Every phase is measured against the same bar. Numbers are for desktop Chrome and phone WebKit in the e2e
suite unless a phone is named.

- No drawing that was on the screen in one frame is missing in the next (`art-lost`, held today).
- No drawing on the screen is rasterised again unless its markup changed or it is being drawn sharper than
  it was (`art-redrawn`, new in phase 0, zero in every flow).
- A drawing is drawn sharper at most once per flow, and a flow into a world or a map seen before in the
  same session rasterises nothing at all (`art-rastered`, new in phase 0).
- After a flow ends, every drawing in view is at its final sharpness within 300 ms on desktop
  (`time-to-sharp`, new in phase 0).
- The p95 frame is 17 ms or less while panning, zooming and flying on desktop, and no frame after the first
  of a flow is over 50 ms.
- After an arrival settles, with reduced motion on so the idles are still, three seconds of screen captures
  are identical to one another.
- The first map a child sees is complete (terrain at its level, every drawing in view sharp) within 2.5 s of
  navigation on desktop over a warm cache.
- On the phone, the GPU memory of every live map scene together stays under the budget phase 5 sets, and
  the phone survives the ten-minute walk in phase 8 without a reload.
- Unchanged: reduced motion stops everything that moves, touch targets are at least 44 px, what a screen
  reader finds is the same, printing is the same, and a lost GPU context draws again.

## Where the redraws come from

This is the list the phases are built from. Each line names the code as it stood when we read it.

On entering a world:

1. The roll's scene is stopped when the child leaves a world (`world.tsx:895`), so every entry starts
   with no pixels, including an entry into the world the child has just left.
2. The roll is shown at its first swap with only its washes, cards and guide. Every piece of scenery and
   ground is then painted into the source about one a frame, nearest first (`world.tsx:385`).
3. Each ground piece is added into the one SVG the stretch's ground is drawn in (`scenery.ts:6230`). The
   scene treats any change inside an SVG as a change to all of it (`touched`, `map-scene.ts:827`), so every
   ground tile in view is rasterised again for every piece that lands, and the display list of the whole
   ground is read again and posted to the workers again.
4. The relayout a moment after arrival, when the sheets have measured, paints the whole roll again into a
   staged source and waits on `scene.prepare`. No pixels are reused, for three reasons:
   - `prepare` walks the staged source while the old one is still live, and reuse looks only at drawings
     already taken off the scene (`retired`).
   - `mapSurface` renames every id in the ground with a counter on each paint (`map-surfaces.ts:14`), so the
     ground's markup is never the same twice.
   - The content key (`contentOf`, `map-scene.ts:489`) is taken the first time the scene sees a drawing
     and is not taken again when the drawing changes, so a ground first seen half painted never matches a
     ground painted whole.

   The swap is forced after a second, so drawings still rasterising then pop in. The idles also restart, and
   the day's blooms play again.
5. `painted.assemble(term)` looks for the arrival's drawings before `paintNear` has painted them, so the
   horizon's drawings appear at once rather than rising (`world.tsx:748`, `scenery.ts:7231`).

On zooming close or moving round a roll:

6. Every settle at reading distance asks for the past sheets near the camera (`lookBackNear`,
   `world.tsx:366`). A sheet that lands changes its row's height and the whole roll is painted again, with
   the same lack of reuse as above. A child's zoom never goes below the day level, so this is always armed.
7. Drawings imported from files mark their moving parts `data-anim-part` (`animate.ts:724`), and the scene
   knows only `data-part`. Every write the idle makes to such a part (sun rays, kite, rocket, sandcastle,
   the bicycle's wheel about thirty times a second) rasterises the whole drawing again, and their motion
   never shows on the GPU.
8. Each drawing keeps one texture. It is drawn at half sharpness while the camera moves and sharp once it
   rests, so a wave of sharpening follows every zoom, and a drawing drawn sharp is drawn soft again when the
   camera draws back, so zooming in again draws it sharp again.
9. Drawings with moving parts are never tiled (`map-scene.ts:1438`), so beyond 2,048 px on the screen they
   are drawn a window at a time as the camera pans.

On the overworld:

10. Any change to the map's view (a lesson finished, a record read again) builds a new `paintMapView`
    and with it a new scene, a new WebGL context, a new atlas and new terrain (`overworld.tsx:931`).
11. Every zoom frame writes `data-far` and `data-sea` on the source even when their values have not
    changed (`overworld.tsx:503`). The scene reads the write as a change to the source and forgets the
    placement it had read for every element, so every frame of a zoom reads every element's computed
    style again.
12. The day's lit road is drawn in by writing `stroke-dashoffset` every frame for 1.4 s (`map.ts:1548`),
    which rasterises the road again every frame.
13. Pieces are painted where the camera is, not where it is going (`overworld.tsx:316`), so a flight's
    destination is painted, then rasterised, only once the camera is there. Terrain is not fetched ahead
    either.
14. Landscape marks leave the terrain tiles at 1.3 times the landscape zoom before the live pieces that
    take over from them have pixels (`map-tiles.ts:758`).

Memory and scheduling:

15. Each map surface has its own WebGL context with its own budgets (192 MB of atlas, 48 MB of large
    textures, 160 MB of terrain), and three to five can be alive at once: the child's parked map, the
    grown-ups' page ground, a roll, the overlay and a game. Terrain textures are held once per context.
16. Parking trims to a third of the budget by whole atlas pages, and a page is let go only when it is
    empty, so a parked map keeps almost nothing (`map-scene.ts:1598`). There is one parking slot for the
    whole page, and the grown-ups' page ground parking itself stops the child's parked map
    (`overworld.tsx:69`, `:1148`).
17. How long pixels are kept is counted in frames (`RETIRED`, `FORGOTTEN`), which is two seconds at 60 Hz,
    four in low power, and forever when nothing is drawing.
18. The finer tiles standing in for a tile are drawn without being marked as drawn, so the atlas can let
    them go while they are on the screen (`map-scene.ts:1400`). Two drawings that looked the same when first
    seen share tiles, and a tile rebound to another drawing keeps its version.
19. Raster jobs keep the distance they had when they were queued, visible jobs are not ranked above the
    margin, and a job the camera has left is still drawn.
20. The worker reads its canvas back into bytes, the page copies them again (`map-scene.ts:942`), and the
    GPU premultiplies them again. Atlas mipmaps and terrain uploads are outside the 6 ms upload allowance.
21. The scene walks every element of the source and calls `document.getAnimations()` every frame.
22. After a lost context every drawing is rasterised from nothing, and the terrain's coarse tiles are
    never taken up again.

## The rules we build to

Four rules come out of that list, and every phase keeps them.

- A drawing in the source does not change after it is first drawn, apart from the transforms and opacity
  of its moving parts. What changes is a new drawing. The scene counts any other change (`art-mutated`
  under `?mapDebug`) so a painter that breaks the rule is found by the suite.
- A drawing's markup does not depend on where it stands. Its place is written on the box that holds it, so
  a drawing moved by a relayout is the same markup, and its pixels are found again.
- Pixels are found by what they show: a key made from the drawing's markup, with the attributes the idle
  writes taken out, the moving part, the scale and the rectangle. Nothing else decides whether a drawing
  is rasterised.
- Nothing is shown before it has pixels. A source the child is about to see is prepared under the camera it
  will be seen with, and a drawing that must arrive late fades in rather than appearing.

## Phase 0: measure it

The suite already fails on a drawing going missing. It cannot see a drawing drawn again while on the screen,
which is most of what a child notices, so it is taught to.

- `map-scene.ts` counts, under `?mapDebug`:
  - `art-rastered`, every raster job that finishes;
  - `art-redrawn`, an upload for a leaf that was on the screen the frame before at the same or a lower
    scale with the same content key;
  - `art-sharpened`, an upload for a leaf on the screen at a higher scale than it had;
  - `art-mutated`, a change inside a drawing that is not a moving part's transform or opacity.
- It also reports when the queue last emptied, so the suite can work out `time-to-sharp` from the end of a
  flow.
- `map-smoothness.e2e.ts` gets these flows, beside the ones it has:
  - going into the woods, out to the map and into the woods again (the second entry must rasterise
    nothing);
  - the map's view changing under it, by serving the record with one more lesson done
    (`page.route`, as `kid-map.e2e.ts` does) and asking the page to read it again;
  - zooming close on a roll and resting at reading distance, where past sheets land;
  - a paper-plane flight over every world and back.
- It gets a settle probe: after an arrival, with reduced motion on, it takes three seconds of screencast
  frames and fails on any frame that differs from the one before it. The probe we used for the relayout
  swap is the start of it.
- Every flow reports its counters and frame times as annotations, and the test fails on the bar above. The
  bar is added one counter at a time as the phases below make it pass, so the suite stays green between
  phases.

Gate: the counters exist, the new flows run on desktop and phone WebKit, and a baseline for every flow is
recorded at the end of this document.

## Phase 1: stop the redraws a child can see

These are the smallest changes that remove the flicker, before any of the caching below.

### The roll's first paint

`world.tsx` paints the pieces in view into the staged source before its first swap and waits on
`scene.prepare`, as a repaint already does. The camera it prepares under is the one the arrival lands on:
the day the roll opens at for a lesson, the horizon for a world, and the grown box for an arrival from the
map. The roll stays under the arrival's fade until then, with `PREPARING` as the longest it waits. The
overworld stays on the screen under it while it waits, so the child sees the map, then the world, and
nothing between.

`assemble` is called after the pieces are painted, so the horizon's drawings rise as they were meant to.

### The ground as drawings of its own

`paintStretch` gives each ground piece an SVG of its own, in the stretch's units, placed by its box. The
patterns, masks and gradients a piece uses are written into its own `defs`, with ids made from the piece's
key rather than a counter, so the same piece painted twice is the same markup. Adding or releasing a piece
then adds or removes one drawing and invalidates nothing else. `mapSurface` is not called for a ground that
is drawn from a hidden source, since the scene frames it itself.

A piece holds the ground under one tile of the stretch, so its drawing is a few hundred pixels on each side
at reading distance and becomes a tiled drawing only when the child zooms well in.

### Moving parts the scene knows

`movingPartsOf` (`sprites.ts`) and `movingParts` (`map-scene.ts`) take `[data-part]` and `[data-anim-part]`,
outermost only, so the drawings imported from files split their moving parts off, and the idle's writes move
a part's texture instead of rasterising the drawing. The spinning wheel and swaying rays then show on the
GPU.

### The overworld's zoom writes

`overworld.tsx` writes `data-far`, `data-sea` and the `ow-calm` class only when their values change. The
scene's observer treats a change to the source's own attributes as a reason to read placements again only
for what the attribute can move: the `style` properties for `.m-tokens`, as now, and a full reading only
when `data-far` or `data-sea` actually changes, which is a threshold crossed once per zoom.

### Past sheets that do not repaint the roll

The heights of the past sheets are what move the roll after it has arrived. Three changes stop that:

- A sheet's measured height is kept by lesson, level and width in the page's session (and in
  `localStorage` across visits, with a size limit), so a roll the child has seen before is laid out with
  its heights from the first paint.
- On the way into a world, the sheets near the day the roll opens at are measured while the arrival plays,
  so the first layout already has them.
- `reading.tsx` bumps its view only when a height actually changed, and `world.tsx` compares the view it is
  asked for with the one it is preparing as well as the one it last drew, so a sheet that is merely asked
  for does not cancel a preparation under way.

Whatever relayout remains (a sheet seen for the first time, drawn at a height nobody guessed) is paid for by
phase 2, which makes a repaint find every pixel it had.

### The lit road

The lit road is rasterised at twelve steps of its reveal the first time it is drawn in, and the scene
cross-fades from one step to the next over the 1.4 s, so the road is rasterised twelve times once rather
than eighty times, and the steps are kept for a replay.

Gate: `art-mutated` is zero in every flow; entering the woods and the marsh shows no ground tile rasterised
twice; the settle probe passes after an arrival; zooming on the overworld keeps `getComputedStyle` calls per
frame under a hundred.

## Phase 2: find every pixel again

### A key that stays true

`contentOf` becomes a hash of the drawing's markup with the attributes the idle writes taken out
(`data-anim-moved`, and the `transform`, `style` and `opacity` of moving parts), taken when the drawing is
first asked to rasterise rather than when it is first seen, and taken again when `touched` finds it changed.
It uses a 64-bit hash (two 32-bit FNV passes with different offsets) with the markup's length, so a
collision would need both to agree. With phase 1's rule that drawings do not change, this is almost always
the markup as painted.

### One store for pixels

A pixel store replaces the per-leaf texture and the `retired` map. An entry is the pixels for a content key,
a moving part, a scale and a rectangle, in an atlas cell or a texture of its own, with a count of the leaves
using it and the time it was last drawn. A leaf asks the store for the entry it wants before it asks the
workers; two live drawings with the same markup share one entry; a drawing taken off the scene leaves its
entry to the store, which lets it go by time (below) rather than by frames. Tiles become entries of the same
store, keyed by the content key and their place in the grid, so a tile no longer carries a version, and a
drawing that did change finds the tiles of its previous key as stand-ins through a record of the key it had
before.

`prepare` then finds the pixels of every drawing the old source still shows, since they are in the store
under the same key, and a relayout costs a walk and no rasterising.

### A drawing at more than one sharpness

The store keeps a drawing at every scale it has been drawn at, within the budget, and a leaf draws the best
entry it has at or above the scale it wants, or the nearest below as a stand-in while the sharper one is
drawn. Zooming out and in again then draws nothing. When a sharper entry replaces a softer one on the
screen, the two are cross-faded over 150 ms (at once under reduced motion), so a sharpening is never a jump.

While the camera moves, a drawing new to the view is asked for at its final scale when the workers have
room (fewer than twice `DECODING` jobs waiting) and at half scale only when they do not, so most drawings
are drawn once. Drawings with moving parts are tiled like any other, since their parts are drawn apart.

### Keeping by time

Every limit counted in frames is counted in milliseconds from `performance.now()`: a drawing let go by the
scene keeps its entry for 10 s unused before it may be evicted, an empty tile's place is kept for 20 s, and
the atlas never lets go of anything drawn in the last 100 ms. Eviction is by least recently drawn, of
entries with no leaf using them first, then of entries in use but off the screen, and never of an entry
drawn in the current or the last frame. Finer stand-ins are marked drawn when they stand in.

### Scenes that are kept

- The roll's scene is parked when a child leaves a world, as the map's is, keyed by world, grade, level and
  width. The two most recent are kept; a third parks the oldest out. Going back into a world takes up its
  scene with its pixels, and phase 1's preparation finds them at once.
- The overworld keeps one scene for its whole life, as `world.tsx` does. A new view is painted into a
  staged source and swapped after `scene.prepare`, so a finished lesson changes only the drawings that
  changed. The terrain stays as it is and only its masks are washed.
- Parking trims by entries, least recently drawn first, to a byte target counted from the cells in use
  rather than the pages, and a page is compacted (its live cells copied into a fresh page on the GPU with
  one draw) when fewer than a quarter of its cells are live.
- Parked maps are kept per key, not in one slot, and a page's own ground never parks over a child's map.

Gate: the second entry into the woods rasterises nothing; a relayout after arrival rasterises nothing that
was on the screen; zooming out and in again rasterises nothing; the map's view changing under it rasterises
only the drawings that changed; `art-redrawn` is zero in every flow.

## Phase 3: flights and zoom

- `paintNear` in `overworld.tsx` and `world.tsx` paints the pieces round the destination of a flight
  (`CanvasView.heading`) as well as the camera, the destination first, and does not release pieces while a
  flight is under way.
- The scene draws what is ahead at the scale it will want on arrival, not at half of it, and a drawing
  that already has that scale is not asked for a softer one on the way.
- Terrain is asked for at the destination's level when a flight starts (`ground.prefetch(camera)`), and the
  requests for levels the camera has passed through are cancelled.
- The landscape marks stay in the terrain tiles until the scene reports every live landscape piece in view
  as drawn, and then fade out over 150 ms, so there is no moment with neither.
- A drawing that still arrives late fades in over 120 ms rather than appearing, as `world-gpu.md` asks.

Gate: flying to every world and back, and gliding to a world, keep `art-late` for drawings on the screen
at zero after the first second of the flow, and `time-to-sharp` is under 300 ms at the end of each flight.

## Phase 4: scheduling and upload

- The queue is built again each frame from what the walk wanted. A job carries the frame it was last wanted
  in, and a job not wanted for 250 ms is dropped and its leaf let go of `pending`. Jobs are ranked in tiers:
  a drawing on the screen with no pixels at all, then a flight's destination, then a drawing on the screen
  with a stand-in, then sharpening, then the margin; and by distance to the camera as it is now within a
  tier.
- A raster message carries a generation, and a worker skips a job whose generation the page has since
  cancelled. A drawing's jobs go to the worker that already holds its display list when it is free, and the
  page tells the workers to forget a display list when its drawing changes.
- The worker draws into an `OffscreenCanvas` and sends an `ImageBitmap` (`transferToImageBitmap`), which the
  page uploads with `texImage2D` or `texSubImage2D` without reading it back, copying it, or premultiplying
  it again. Where a browser cannot send one, the bytes are sent as now, without the extra copy at
  `map-scene.ts:942`.
- Every upload counts against the frame's 6 ms: sprites, textures of their own, terrain tiles and each
  page's mipmaps, which are built one page a frame. A large upload is split into bands across frames.
- Nothing is pumped while the context is lost.
- The first map is started early: the page preloads the worker's script and the terrain's root and first
  level (`<link rel="preload">`), starts the workers and gives them the fonts while the map's code loads, and
  paints the pieces in the opening view first.

Gate: the p95 frame is 17 ms or less in every flow on desktop, no frame after the first of a flow is over
50 ms, and the first map is complete within 2.5 s over a warm cache.

## Phase 5: one set of budgets for the page

- Only the map surface in view draws and holds pixels on the GPU. A surface that is hidden, such as the
  grown-ups' page ground under a map screen or the child's map under a roll, is parked; a parked surface
  keeps its entries up to a small share of the budget, and the rest is let go to the memory store below,
  from which it is uploaded again when it is shown.
- A memory store of `ImageBitmap`s, shared by every scene on the page, holds the pixels a scene lets go of,
  by the same keys, up to a budget. A scene that needs a drawing asks the memory store before it asks the
  workers, and uploading from it costs a frame's allowance rather than a raster.
- The budgets are set once per device: on a phone (iOS, or `navigator.deviceMemory` of 4 or less) the
  scene in view has 96 MB of atlas and textures, terrain 64 MB, and the memory store 48 MB; on a desktop
  192 MB, 160 MB and 128 MB. The sum across every live scene, counted in the diagnostics, is what phase 8
  holds the phone to.
- After a lost context, a scene uploads again from the memory store rather than rasterising, and the
  terrain takes up its root and first level again.

We looked at one WebGL context shared by every surface. Two surfaces are on the screen together during the
handoff between the map and a world, and the words over each canvas must move in the same frame as it, so
one context would mean one canvas laid under both and drawn for both. That is a larger change than the
memory it saves once hidden surfaces hold nothing, so we keep a context per surface and make a hidden one
cheap.

Gate: going between the map, a world and a grown-ups' page keeps the sum of the live scenes' GPU memory
under the device's budget; losing and restoring the context rasterises nothing that the memory store holds.

## Phase 6: a retained scene

The scene walks every element of the source every frame, and asks the document for every animation on it.
With the roll's drawings in the hundreds this is most of what a still frame costs.

- The scene keeps a list of its drawings with their places in the world, their boxes and their motion,
  built from the source once and changed by the observer's records, and a grid of cells over the world
  that says which drawings touch each cell. A frame reads the cells in view and the drawings that move.
- It learns which elements are animated from `animationstart`, `animationend` and `animationcancel` in the
  source, and from the idle's own record of what it plays, rather than from `document.getAnimations()`.
- Placement read with `getComputedStyle` is cached per element and read again only for what a mutation
  touched.

Gate: a still frame of the woods at reading distance costs under 2 ms of the main thread on desktop, and a
pan under 4 ms, measured by the scene's own timer under `?mapDebug`.

## Phase 7: pixels that outlast the page

- Pixels a scene rasterises are written to the Cache API by a worker, encoded as WebP where the browser
  encodes it and as PNG where it does not, under a key made from the content key, the part, the scale, the
  rectangle and the renderer's version. The renderer's version is a hash of `sprites.worker.ts` and
  `sprites.ts` made at build, so a change to how drawings are drawn misses every old entry.
- A scene asks this cache after the memory store and before the workers, and decodes what it finds with
  `createImageBitmap` in the worker. Entries are let go least recently used, over a quota of 200 MB, and the
  cache is cleared when the renderer's version changes.
- If a child's first ever entry into a world is still slower than the bar after this, the arrival view of
  every world is rasterised at build, as the terrain is by `npm run map:tiles`, into the same keys, and the
  page seeds the cache from it. We will decide this from the numbers phase 8 records, since it adds to what
  the site ships.

Gate: reloading the page and going into a world seen before rasterises nothing, and the first map after a
reload is complete within 1.5 s on desktop.

## Phase 8: the phone

- On the iPhone we test with, through the WebKit inspector as we did for the crashes, every flow in the
  suite is walked by hand and by script, with the scene's counters, frame times and memory read from the
  page, and the GPU process's memory read from the device's log.
- A ten-minute walk moves between the map, three worlds, a grown-ups' page and back, flies the plane, and
  zooms in and out of a roll, and the phone must not reload the page.
- The budgets in phase 5 are set from what this shows, and the numbers are recorded below.

Gate: the walk completes, every counter meets the bar, and the numbers are recorded.

## How we check it as we go

- `npm run check` passes at the end of every phase, and each phase adds unit tests beside what it changes:
  the content key and what it leaves out, the pixel store's sharing and eviction by time, the scheduler's
  tiers and cancellation, the atlas's accounting by cells and its compaction, and the ground pieces'
  markup being the same when painted twice.
- The e2e suites that cover the map run on desktop and phone WebKit at the end of every phase:
  `map-smoothness`, `map-resources`, `map`, `kid-map`, `world-zoom`, `world-page`, `map-continuity`,
  `view-lifecycle` and `child-journey`.
- Phase 1 and phase 2 change what the map's tiles are drawn from, so `npm run map:tiles` is run and the new
  set committed with the phase, in turn with any other session exporting tiles.
- We measure on battery power only to compare like with like; the machine's frame cap on battery makes
  frame times meaningless otherwise.

## What we are not doing

- A different renderer. We looked at CanvasKit and at WebGPU. CanvasKit would draw the SVG itself on the
  GPU, but it is several megabytes of WebAssembly, draws text its own way, and none of the redraws above
  come from how a drawing is rasterised. WebGPU is in current Safari, but WebGL2 is not what limits us, and
  moving would cost the months the renderer has been tested for.
- Drawing the scene in a worker with `transferControlToOffscreen`. The scene reads the page's styles and
  animations, and the words over the canvas must move in the same frame as it, which a worker cannot
  promise.
- Compressed textures. They would cut the GPU memory of the terrain by about four, but the thin pencil lines
  suffer, and the budgets above are met without them. We will look again if phase 8 says otherwise.

## Record

Measured with `tools/e2e/map-smoothness.e2e.ts` on desktop Chrome, on a machine other sessions were loading
heavily (a load average of 20 to 50), so the frame times below are rough and the counts are what to go by.
"Rastered" is drawings drawn by the workers, "kept" those uploaded again from the memory store, and "cached"
those read back from the device's store.

| Flow | Baseline (phase 0) | First pass | Second pass |
|---|---|---|---|
| Every world, then a world: late | 4,486 | 271 | 15 |
| The map painted again: rastered | 34 | 0 | 10 |
| Fly: rastered, late | 863, 906 | 512, 161 | 515, 184 |
| Into a world: mutated | 6 | 0 | 0 |
| Close up on the roll, resting: lost, redrawn | 17, 108 | 0, 0 | 0, 0 |
| Back to the map again: rastered, redrawn | 58, not measured | 0, 0 | 213, 0 |
| Into the woods after a reload: rastered, cached | not measured | 27, 91 | 21, 70 |
| The woods drawn afresh and from what was kept: pixels that differ | not measured | not measured | 0.000% |

On desktop the p95 frame is 10 ms or less in every flow but the zoom out to every world (15.7 ms), and
every flow is sharp within 250 ms of its last move. On phone WebKit every flow passes with nothing lost;
the worlds' frames are at 17 ms, the overworld's at 58 to 68 ms, most of it the terrain's uploads, and a
map come back to draws about a hundred drawings again, since a phone's parked scene keeps half of 96 MB.

No flow loses a drawing, no drawing changes after it is drawn (`art-mutated` is zero in every flow), and
nothing is drawn again as it was except 8 or 9 on the overworld as it is panned. The scene costs 0.5 to 1.3
ms of a frame on desktop and 1 to 2 ms in a world on phone WebKit. The settle probe finds no change on the
screen once a world has arrived.

Phase 0. The scene counts `art-rastered`, `art-kept`, `art-cached`, `art-redrawn`, `art-sharpened` and
`art-mutated`, notes when it last went quiet and when the camera last moved, and times its own frames
(`scene-cost`). Under `?mapDebug` the overworld offers `mapRedraw`, which paints its view again as a record
read again after a lesson does. The suite has flows for the map painted again, a rest close up on a roll,
and a world gone into, left and gone into again, a settle probe on Chromium's screencast, and a reload.

Phase 1. The roll's first paint is prepared under the camera it opens at before it is shown, and the map
the child came from is held over the page (`engine/ui/handoff.ts`) until it is, then faded out over it;
the dive no longer fades the map to nothing. The map is taken into the curtain a microtask after the page
has taken it down, since the page puts the screen that replaces it at its place and would otherwise put
it in the curtain. A roll that is given newer views while it first draws (a child's sheets landing) opens
with the view it has and draws the newer one after, rather than starting again each time. Each ground piece is a drawing of its own, with its fades
worked out over the piece alone and its ids from its key, so it is the same markup however long its
stretch grows. `mapSurface` is gone with the DOM form of the roll it served. The idle marks every part it
moves (`data-anim-part`), the scene knows both marks, and a drawing that has moved stays drawn in parts,
so an idle that stops or starts draws nothing again. The overworld writes `data-far`, `data-sea` and
`ow-calm` only when they change. Sheet heights are kept on the device by level, width and child
(`engine/ui/paper.ts`), and a view the same as the one drawn or being prepared cancels nothing. The lit
road is drawn in as twelve drawings faded between, and the road is drawn again once, as its glow comes back.

Phase 2. The content key leaves out what the idle writes (a part's pose, the marks it leaves, the root's
`transform-origin`) and is taken again when a drawing changes. Leaves with the same markup share pixels,
counted so neither frees the other's; pixels of drawings taken off the scene are kept until the budget
wants them, and tiles are kept by the drawing's content, with the scale they were last drawn at kept the
same way. `Scene.rebind` points a scene at a new source, retiring the old one's drawings with their
pixels: a roll's scene is kept for the next roll a page opens, and the overworld hands its scene to the
map painted to replace it, which prepares under it before it takes it. Parking keeps half the atlas. A
drawing too sharp is drawn softer only past eight times, and a large drawing with moving parts is tiled.
Time limits are counted in milliseconds. We did not build a second resolution per leaf: keeping the sharp
texture to an eighth, as above, removed the redraws the suite found.

Phase 3. `paintNear` in the overworld and the roll paints where a flight is going first and lets nothing go
on the way; the scene draws what is ahead at the sharpness it will want and, while the workers have room,
draws what is new to the view at full sharpness while the camera moves. The terrain asks for the tiles a
flight's destination wants as it sets off, keeps the tiles of the view it was parked in, takes up its
coarse tiles again after a lost context, and keeps its marks until what is in view has been drawn, then
fades them out over 150 ms. A drawing that arrives with nothing standing in for it fades in over 120 ms.

Phase 4. Raster jobs are ranked each frame in tiers (a coarse stand-in, a drawing on the screen with
nothing, a flight's destination, one shown by a stand-in, sharpening, the margin) and by distance to the
camera as it is now, and a job no frame has wanted for 250 ms is dropped. A worker is given the jobs of the
display lists it holds. Chromium's workers send the canvas's bitmap with no reading back; WebKit's send
bytes, which it uploads a hundred times faster (8.6 ms of a frame against 0.09 under Playwright). The
terrain puts tiles' layers on the GPU for up to 4 ms a frame, at least one layer each frame, the root
first, and what waits is stood in for. The workers start when
a scene is made. We did not build the worker-side cancelling of jobs in flight, the mipmaps counted into
the frame's allowance, or large uploads split into bands; `DECODING` keeps what is in flight small.

Phase 5. The budgets are set per device (`smallDevice` in `engine/ui/device.ts`): on a phone 96 MB of
atlas, 48 MB of large textures, 64 MB of terrain and 48 MB of kept pixels; on a desktop 192, 96, 160 and 128.
A memory store shared by every scene holds what the workers drew, and a scene asks it before the workers,
so a drawing let go of on the GPU, drawn by another scene, or taken by a lost context is uploaded again
rather than drawn. Only a map worlds are gone into from parks, so a page's own ground no longer throws
away the child's parked map. We did not park a hidden page ground behind a roll; it draws only when its
camera moves.

Phase 6. The scene reads the animations of its own source rather than of the whole document. It costs 0.5
to 1.3 ms of a frame on desktop, under the 2 ms the gate asked of a still frame, so we did not build the
retained list and its grid; the numbers are here for when a world grows enough to need it.

Phase 7. The workers keep what they draw in the Cache API, under a store named by the build's hash of the
scene (so pixels one build drew are never shown by another), and look there before drawing. Chromium keeps
them as WebP, WebKit as bytes, and the oldest go past 3,000 drawings (400 in WebKit). In development nothing
is kept unless a page asks with `?mapCache`. After a reload the woods take 95 drawings from what was kept
and draw 27. Under Playwright's WebKit the writes land too slowly for a short visit to find much of them,
which the phone should settle. We did not rasterise the arrival views at build.

Phase 8 has not been done: the phone was not connected. It is the first thing to do with it, as the plan
says, and the WebKit numbers above (the terrain's uploads cost 12.8 ms of a frame while panning under
Playwright's WebKit, and what is kept on the device came back slowly) are what to look at first.

A second pass, after a review of the whole renderer, closed what the first left open.

- Going back to the map is now held the way going into a world is: the roll stays on the screen over the
  page (`hold` in `engine/ui/handoff.ts`, which now names what it holds) while a map kept from before
  prepares under the camera it rises from, and fades off it as it rises. A map drawn afresh fades in as
  the roll fades out, as before.
- A moving part is drawn over its own box at rest, worked out from its display list
  (`Sketch.partBoxes` in `engine/ui/sprites.ts`), rather than over the whole drawing's box, which was
  what the few drawings drawn again on a pan were.
- What the flight moves every frame (the plane, its rider, its shadow, the clouds) is marked
  `data-live`, and the scene reads its place from its inline style rather than styling it again. The
  flight gives the camera it is heading for (`Flying.ahead`), which the scene, the terrain and the
  overworld's painting use as they use a flight's destination, and nothing is let go of while flying.
- The zoom flags the overworld writes on its source reach only what they style (`flags` on
  `mapScene`); `data-far` is written only on the world's layer, where the words it hides are.
- Tiles are decoded in a worker of their own (`engine/ui/tiles.worker.ts`) and reach the GPU as a
  bitmap on Chromium and as bytes on WebKit, as the drawings do. Tiles still loading that no view has
  wanted for 60 frames are let go of. We kept the terrain's mipmaps: the level's hysteresis shows a
  tile down to about 0.43 of its size, where the pencil lines would shimmer without them.
- Letting drawings go frees whole atlas pages, the one seen longest ago first, since a page's memory
  goes only once nothing is in it. On a phone a parked map lets go of all it drew on the GPU and of
  the last view's tiles, and a roll left keeps no scene, so a phone holds one screen on its GPU; what
  comes back is uploaded again from the pixels kept in memory.
- Once the map is shown, its places are painted in idle moments and drawn at the size the whole
  country shows them, once for each map. A source prepared for a camera much further out, as this
  one is, never takes the pixels on the screen for a softer copy.
- The workers are given at most 6 megapixels at once as well as 6 drawings, a roll's dates and tape
  are on the page only near the camera, sheets no longer near are set aside (six of them) before they
  are let go of, the world's clip is written again only as the camera nears its edge, and a wash's rim
  is hatched again only once for each quarter it grows, scaled between.
- The suite compares the woods drawn afresh with the woods drawn from the pixels kept on the device
  after a reload, pixel for pixel, on desktop Chrome.

The second pass is measured on desktop Chrome in the table's last column. Drawing back to every world
is late 15 times where it was 271, since the places are drawn from afar before the child gets there.
What is rastered on the way back to the map, and as the map is painted again, went up (213 and 10
drawings) because the places are warmed in the background once the map is shown: in both flows nothing
on the screen is late or drawn again, and the map is sharp as it comes back. On phone WebKit a zoom
out to every world is still late about 4,500 times, and the overworld's scene still costs 17 to 30 ms a
frame there, as it did before this pass; the terrain's uploads are the first thing to look at on the
phone. In one run of the comparison, 36.8% of the pixels differed on each of three repeats within a
quarter of an hour, while other work was changing the lessons, and three repeats after it found none;
the suite now attaches both screenshots when they differ, so a difference can be looked at.

