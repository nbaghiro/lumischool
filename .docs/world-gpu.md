# The world roll drawn by the GPU

Status: planned on 26 September 2026. Phase 0 is done, and what it found changes the order of the rest (see
"Phase 0: what we measured"). This document is the plan and its gates; what is built is recorded at its end
as each phase lands.

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

## Phases and gates

0. Baselines. Record every world's roll as it is: first visible frame, long tasks, idle cost, pan and zoom
   p95, memory, and reference screenshots. Add a probe that records presented frames and fails on an
   uncovered frame or a drawing that appears at once. Gate: the numbers are recorded here.
1. The roll on the GPU. The scene renderer's options, the hidden source in `world.tsx`, the layers that stay
   in the page, and staged redraws on `settled()`. Gate: the pixel comparison, the navigation numbers, and
   repeated round trips with no growth in memory.
2. Idle motion on the GPU. The world's group, its events, and the rule that at most four drawings move. Gate:
   the idle-cost target in the woods and the marsh, and a still picture under reduced motion.
3. The handoff. One owner for the grown-ups' map (`apps/home/map.tsx`), the sample overlay
   (`engine/ui/overlay.tsx`) and the child's app. Gate: the frame probe over entry, return, Escape, Back and
   Forward, rapid reversal, a cold cache and reduced motion, with no uncovered frame.
4. The map's last slow frames. Find which places cost 33 to 59 ms to build and split them within the shared
   4 ms paint allowance; if some still overrun, the pen that draws them records its strokes in the drawing
   worker instead. Gate: no frame over 33 ms in the fly and zoom probe.

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
