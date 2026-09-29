# The world roll drawn by the GPU

Status: planned on 26 September 2026 and revised on 27 September after the phone was measured (see "What the
phone showed"). Phase 0 is done; the plan below is the order the work is done in. What is built is recorded at
the end as each phase lands.

The overworld has been drawn by the GPU since 26 September (`overworld-gpu.md`), and it is now smoother and
cheaper than the DOM map it replaced. A world's roll (`engine/ui/world.tsx`) is still DOM and SVG. We said in
`overworld-gpu.md` that nothing we had measured pointed at it, but we had not measured it, and what the other
documents record says it is now the most expensive surface a child uses:

- At arrival the woods cost 936 ms of the main thread every second and the marsh 400 to 436 ms, mostly the
  guide's idle (`overworld.md`).
- The journal's page form draws in 1.27 to 1.75 s and its canvas form in 1.59 to 2.75 s (`journal.md`).
- 109 drawings on screen cost 243 ms a second in the motion player (`animation.md`).
- A world needs hundreds of texture marks, and painting a stretch's texture up front cost more than a
  second, which is why the painter hands most of it back as pieces (`engine/ui/scenery.ts`).
- Moving from the map into a world and back fades through bare paper, since each surface destroys the
  outgoing scene before the incoming one has drawn (`map-transition-continuity.md`).

This plan covers four pieces of work: the roll on the GPU, its idle motion on the GPU, a continuous handoff
between the map and a world, and the map's last slow frames.

## What must hold

Every phase is measured against the same bar, and a phase is not done until it passes.

- Navigation: the p95 frame is 17 ms or less while panning, zooming and gliding on desktop Chrome, and no
  frame after the first is over 50 ms.
- Art loading: no presented frame shows bare paper where a drawing stood in the frame before, and a drawing
  that arrives late fades in rather than appearing at once.
- Look: each world's roll matches its SVG form, measured by the same kind of pixel comparison the map's
  snapshots are held to. Hand-lettered words stay sharp, and grid lines stay one device pixel wide.
- Idle cost: under 150 ms of the main thread a second in the woods and in the marsh at arrival.
- Unchanged: reduced motion (everything that moves stops), touch targets of at least 44 px, what a screen
  reader finds, printing, recovery from a lost context, and the phone budgets in `overworld-gpu.md`.

The phone measurement waits on the same staging service as the map's phase 8.

## The design

The roll draws its scenery through the same scene renderer as the map. The ground and the drawings beside
the path are painted into a hidden source and drawn on a canvas under the sheets, while the sheets, the tape
at their corners and the dates stay in the page, so their words, inputs and order for a screen reader do not
change. A roll drawn again keeps the old picture until the new one has drawn everything the camera sees.

- `mapScene` (`engine/ui/map-scene.ts`) becomes a scene renderer with the map's terrain tiles, its colour
  mask and its grid as options. The roll takes it without tiles and draws its washes as plain fills.
- `paintWorldView` paints its ground and art layers into the hidden source. Its flags layer (dates, names and
  signs) and its over layer (tape) stay in the page above the sheets, since anything drawn on the canvas is
  under every sheet.
- `CanvasView` is given `paper: false`, and the renderer draws the grid.
- The world's animation group plays through the renderer, as the map's does (`animate.ts` with
  `drawnElsewhere`), so an idle drawing is a sprite moved each frame rather than an element restyled.
- The events the world plays (the horizon putting itself together, puffs, flows, blooms and a term's moment)
  are CSS and Web Animations, which the renderer already reads each frame.

The handoff between surfaces follows the contract in `map-transition-continuity.md`: prepare, move, commit and
release, owned in one place. The incoming scene is mounted hidden and waits for its first complete frame
(`settled()`), then fades in over the outgoing one, which is parked rather than destroyed.

## What the phone showed

On 27 September the iPhone Air in Chrome crashed on the map, and we found the cause with the phone's own log
and WebKit's layer tree (`LayerTree.layersForNode` through `ios_webkit_debug_proxy`). The map's scaled world
held its words and buttons over the GPU's canvas, and animated shapes in it gave it a composited layer, which
WebKit sized as if the world were unscaled: 230 to 316 MB, rebuilt on every repaint, until the page passed
2 GB. The world now moves in a screen-sized frame (`CanvasView.frame` in `engine/ui/view.ts`) and nothing
animated is lifted into it (`map-scene.ts`), and the map holds a steady 76 MB of layers; the phone measured
473 MB after the page loaded against 930 before, with no pressure warning and no kill through two full runs
of zooming, panning, flying and ten trips into worlds.

The rolls were not the crash. Inside the meadow, the woods, the harbour, the mountains and the night sky their
layers came to 122 to 142 MB, the roll zooms out only to half scale, and every return to the map dropped back
to 76 MB. What is left inside a world is speed: arriving takes 1.4 to 1.6 s with the CPU slowed four times,
zooming during the arrival runs at 18 to 33 ms a frame, and the idles cost up to 280 ms of the main thread a
second.

## Phases and gates

0. Baselines, done: the desktop numbers below. Before phase 2 lands, the same probe runs on the phone through
   the inspector, entering the meadow, the woods and the harbour: time to the roll being ready, every frame
   gap for six seconds after, and the idle cost at arrival.
1. The scene renderer. `mapScene` takes its terrain as an option, so a scene without terrain draws only its
   grid, its drawings and the words it lifts, and counts as complete when its drawings are; the map passes
   its terrain and does not change. Gate: the map's suites and its snapshots, and `npm run map:tiles`, since
   `map-scene.ts` is one of the tiles' sources.
2. The roll's scenery on the GPU. `paintWorldView` paints its ground and art layers into a hidden source the
   scene draws on a canvas under the view's frame; its flags and over layers, the sheets and the page's own
   layer stay in the world, in the order they have now. A drawing that sits over a sheet (the guide's
   z-index is above the sheets') stays in the page unless it never overlaps one. `CanvasView` is given
   `paper: false` and the renderer draws the grid. A roll drawn again keeps the old picture until the new one
   has drawn what the camera sees (`settled()`). The world's group plays through the renderer
   (`animate.ts` with `drawnElsewhere`). Gate: each world's roll against its SVG form by pixel comparison,
   the arrival and the world's events (the horizon putting itself together, puffs, flows, blooms, a term's
   moment) seen on screen, the navigation numbers, and repeated round trips with no growth.
3. Arriving faster. A piece of scenery is cut until each paints within the shared 4 ms allowance
   (`scene-work.ts`); the motion player starts what comes into view a few at a time rather than all in one
   callback (`animate.ts`); the sheets are built nearest the camera first. Gate: no frame over 50 ms during
   an arrival with the CPU slowed four times, and the roll ready in under 800 ms slowed.
4. Smoke as sprites. The puffs a drawing declares (`applyPuff` in `engine/ui/player.ts`) are drawn by the
   scene as sprites rather than as animated CSS shapes, which the map no longer lifts and so no longer shows.
   Gate: the volcano's smoke is back on the map and on its roll, and the map's layers stay at their size.
5. The handoff between the map and a world (`map-transition-continuity.md`), once both are drawn by the
   same renderer. Gate: the frame probe over entry, return, Escape, Back and Forward and rapid reversal.

## Risks

- A drawing that lies over a sheet's edge has to stay in the page, or it will be drawn under the sheet.
- The hidden source still costs DOM memory, though no layout or paint.
- `map-scene.ts` is one of the tiles' source files, so every change to it needs `npm run map:tiles`.
- `engine/ui/gl.ts` is shared with the games, whose session is told before any change to it.

## Phase 0: what we measured

We opened each world's roll through the site's overlay (`/#/map/<world>`, the sample child) at 1440 by 900 at
twice the pixel density in headless Chrome against the development server, held it at arrival for ten seconds,
then panned and zoomed with the wheel for about three seconds each. The main thread's share is Chrome's own
task time over the ten seconds. We ran it at full speed and with the CPU slowed four times, which stands in for
a phone until the phone itself is measured. The marsh and the night sky do not open through the site's overlay
and are not in these numbers.

The first run found that most of what we were measuring was not the roll. The site's backdrop map behind the
overlay kept drawing every frame, since a map counted as seen whenever its box was near the window, whatever
covered it, and the backdrop's framing loop read the page's layout every frame for as long as its live map was
not shown. With both fixed (below), the same rolls measured:

| World | Ready | Main thread at arrival | Elements | Pan p95 | Zoom p95 | Slowest frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Meadow | 423 ms | 101 ms/s | 9,131 | 10.3 ms | 10.3 ms | 10.5 ms |
| Harbour | 401 ms | 91 ms/s | 8,376 | 10.2 ms | 10.1 ms | 10.5 ms |
| Railway | 355 ms | 20 ms/s | 5,415 | 10.2 ms | 10.0 ms | 17.0 ms |
| Woods | 409 ms | 147 ms/s | 13,573 | 9.6 ms | 9.6 ms | 10.3 ms |
| Mountains | 418 ms | 127 ms/s | 13,290 | 9.8 ms | 9.6 ms | 16.6 ms |
| Kitchen | 493 ms | 73 ms/s | 17,248 | 10.1 ms | 10.2 ms | 10.4 ms |

Before the fixes the same rolls spent 236 to 334 ms a second and held 22,000 to 44,000 elements. With the CPU
slowed four times:

| World | Ready | Main thread at arrival | Pan p95 | Zoom p95 | Slowest frame |
| --- | ---: | ---: | ---: | ---: | ---: |
| Meadow | 1,361 ms | 215 ms/s | 10.2 ms | 18.5 ms | 33.6 ms |
| Harbour | 1,367 ms | 214 ms/s | 10.2 ms | 23.7 ms | 41.9 ms |
| Railway | 1,583 ms | 70 ms/s | 10.2 ms | 10.1 ms | 101.1 ms |
| Woods | 1,629 ms | 283 ms/s | 10.2 ms | 18.0 ms | 67.1 ms |
| Mountains | 1,354 ms | 278 ms/s | 10.2 ms | 33.0 ms | 75.1 ms |
| Kitchen | 1,559 ms | 176 ms/s | 10.2 ms | 25.1 ms | 42.4 ms |

At full speed every roll passes the bar. Slowed four times, the idle cost in the woods and the mountains and
the zoom's p95 in four of the six fail it, and each roll has one to four frames over 50 ms. Chrome's long
animation frame timings name the cause of each of those frames, and none of it is drawing:

- a scenery piece painted in one go past the shared 4 ms allowance (`scene-work.ts`, 32 to 38 ms of script);
- the motion player starting a drawing's animation as it comes into view (`animate.ts`, its intersection
  observer, 48 to 60 ms of script).

With motion off, the woods slowed four times spend 111 ms a second; with it on, 357, of which reading styles,
writing attributes and redrawing rough strokes are the most.

The fixes that came out of this phase:

- `whileNear` (`engine/ui/viewport.tsx`) counts a box under an open modal dialog that does not hold it as not
  near, so every map under the overlay lets its canvas go and returns, from the parked map, when it closes.
- The backdrop's framing loop (`engine/ui/backdrop.tsx`) rests once the framing has held for a second and
  wakes when the page or its box changes size or the aim changes.

What this changes in the plan. The roll's cost is script, not drawing: moving its scenery to the GPU would
still paint the same pieces with the same pen, and would not touch the motion player's start. We therefore do
the work that removes that script first, for the roll and the map together (phase 4, widened to the roll, and
the motion player's start), then measure again, and move the roll to the GPU only for what the numbers still
show, most likely the zoom's p95 when slowed. The handoff (phase 3) does not depend on any of it.

## Why the first port was not faster

The roll's scenery drawn by the scene renderer (phase 2 as first built) was no faster than the DOM roll with the
CPU slowed four times, and panned worse. We measured both in the woods, idling after the arrival and then
panning, panning back over the same ground, and zooming, with Chrome's own task times, a script profile, frame
gaps and the bytes uploaded to the GPU.

| Slowed four times, the woods | DOM roll | First port | Surfaces left whole |
| --- | ---: | ---: | ---: |
| Idle after arriving | 11 ms/s | 27 ms/s | |
| Pan, main thread | 768 to 783 ms/s | 827 to 855 ms/s | 667 to 757 ms/s |
| Pan, p95 frame | 9 ms | 33 ms | 17 ms |
| Pan, uploaded | 0 | 234 to 247 MB | 100 to 129 MB |
| Zoom, p95 frame | 25 ms | 26 to 33 ms | 9 ms |
| Zoom, uploaded | 0 | 121 to 130 MB | 29 MB |

Both rolls spend about the same time on the main thread; where it goes differs. The DOM roll's is the browser's
own painting, most of it outside script. The first port's was script and uploads: a stretch's ground and washes
are a few SVGs as tall as a term, and `mapSurface` reframes each to the camera as it moves, which changed the SVG
on every frame, so the scene read it again (`sketchOf`, 370 ms a second) and drew and uploaded a 2048 px window
of it again. Left whole when the scene draws them, the reframing and the reading stop, and zooming falls to a
p95 of 9 ms against the DOM roll's 25.

What remains is the window. A drawing larger than a texture is drawn as one window round the camera (`LARGEST`
in `map-scene.ts`), and a pan past the window draws and uploads a new one, about 10 MB, over ground already seen.
The browser cuts such a layer into fixed tiles, draws only the tiles coming into view, off the main thread, and
keeps them. The GPU is not the slower renderer; the port drew the roll's few largest drawings the costly way.
The map does not meet this, since its ground is a tile pyramid and its fills and strokes are drawn by the GPU
itself.

What makes the GPU roll faster than the DOM one, and keeps it so as worlds grow:

- A large drawing drawn as fixed tiles at a scale, each an atlas cell, kept and reused, so a pan draws only the
  tiles coming into view and a pan back draws none.
- A wash, which is a rectangle under a gradient and two fades, drawn by the GPU as a shaded quad rather than as
  pixels at all.
- The scene kept as a retained list, walked again only when a drawing changes, so a frame touches only what
  moves.

With those, what a frame costs grows with what is on the screen, not with the length of the roll or the number
of its drawings, which is what the DOM roll cannot do: its style, layout, painting and layer memory grow with
every element added.

## What was built

On 27 September the roll's scenery moved to the scene renderer, and the renderer gained what the roll needed.

- `world.tsx` gives its `CanvasView` no paper of its own, keeps a hidden source (`.wd-source`) the scene draws
  from and a layer of lifted words under the sheets (`.wd-lifted`), and redraws a roll into a staged source it
  swaps in whole. `paintWorldView` takes `hidden`, puts its ground and art there, leaves its dates and tape in
  the world, plays the world's idles through the scene, and stops reframing its surfaces, which the scene
  windows itself.
- `mapScene` takes its terrain as an option and, with `tiles`, draws a drawing larger than 1,024 px on screen as
  504 px tiles of a grid at a power-of-two scale, each an atlas cell, kept and reused. While the camera moves
  it draws them at a quarter of their sharpness and keeps the tiles it has unless they are four times too soft
  or twice too sharp; a tile not yet drawn is stood in for by the nearest coarser tile's share (up to four
  scales down, one three scales down asked for first) or by the finer tiles it has, and never by both. A tile
  behind the drawing's version, as a roll's ground is while the pieces near the camera are painted into it,
  shows as it was until it is drawn again. The map and the roll both take tiles, and their pages hold 192 MB. Both draw again after
  their GPU context is lost and restored (`map-resources.e2e.ts`, which moves the camera while the context is
  lost, since WebKit keeps showing the last frame until something is drawn).
- The workers keep the display lists they are given (64 each, the page keeping the same list in the same
  order), leave out any path whose box falls outside the tile, and send no pixels for a tile with nothing in
  it, which is most tiles of a long road.
- `sketchOf` reads a gradient's stop opacity and its default units, and a group's `mask` by its alpha, so the
  washes fade into the paper and the skies shade as the SVG does; the scene reads CSS `translate`, which a
  world's arrival raises its drawings with.

Measured in the woods with the CPU slowed four times, on battery (every frame capped at 33 ms): panning over
ground the roll has drawn uploads nothing and costs 204 to 231 ms of the main thread a second against the DOM
roll's 200; zooming costs 218 to 254 against 207 to 242. `tools/e2e/map-smoothness.e2e.ts` drives the
map and a roll through every world and then one world, panning and zooming, flying, going into a world,
moving round its roll and coming back, and fails if any drawing on the screen in one frame is missing in the
next, as the scene counts them under `?mapDebug` (`art-lost`); none is. A drawing redrawn as it was, as a roll's
scenery is when its record is read again, takes over the pixels of the one it replaces by its markup, and a
flight's destination is drawn ahead at the sharpness it will want there (`CanvasView.heading`). What remains is
a drawing new to the view arriving a few frames after it enters (`art-late`), most of it the place drawings
that come into view at once as the camera draws back to every world.

Not done: the washes as shaded quads, the scene as a retained list, arriving faster (phase 3), smoke as
sprites (phase 4) and the handoff (phase 5). The phone has not been measured on this build.
