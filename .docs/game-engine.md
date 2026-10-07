# The game engine on one renderer

Status: approved plan, 26 September 2026, ready to execute. It follows the study in
[games-webgl.md](games-webgl.md) and replaces the current-state half of [engine.md](engine.md) once
it is built; engine.md keeps its study as history. The owner will test every game by hand at the end
of the last phase.

## Summary

We draw every game with one renderer, a WebGL2 canvas that takes the same description of a frame the
games already produce, so no game's rules have to change for it. A drawing from the shelf is
rasterised once into a shared texture page at the size it is shown, and a thousand copies of it cost
one draw call rather than a thousand elements in the page. The words a child reads, the buttons and
the tray stay in the page, where a screen reader and the keyboard already work, and a hidden copy of
each sprite's position lets the end-to-end tests find things as they do today. When the last game
has moved, we delete the Field and the Stage in the same change, so there is one way to draw a game
and nothing left behind to maintain.

On that renderer we then build the capabilities a studio that makes many games needs: shapes beyond
boxes and balls, joints, things that break, buoyancy, ropes and water; platformer movement, flocking,
goals and events, checkpoints, replays and one kit for generated levels; lighting, glow, water and
wind; sound kits and multi-touch; and the tools to inspect and tune a game while it runs. The games
the owner found plain are rebuilt or retired along the way, and the ones the owner likes move across
unchanged in their rules and richer in how they look and feel.

## Decisions taken

The owner asked us to proceed on our recommendations, and to leave anything else open for later.

1. A game's world stays in the one light palette. We tried a night that darkened the world towards
   the ink, and the owner found it off-style, so lights and glow wash their hue into the paper and
   nothing darkens it.
2. Where WebGL2 is missing, a turn game shows a still picture of its board beside its tray and stays
   playable, and an action game says in plain words that it needs a newer browser. We do not keep the
   DOM renderer alive as a second path.
3. The end-to-end tests read a hidden mirror of sprite positions, switched on only for tests. A
   separate job on a machine with a real GPU opens every game, checks that frames advance, and
   compares a picture of each game's first level at rest within a tolerance.
4. We keep planck behind `engine/motion/bodies.ts`. Rapier is reconsidered only if replays must
   match across devices.
5. Measurements on a real iPad and iPhone are part of the owner's manual pass at the end. Until then
   our gates use Chrome on the Mac, at normal speed and with the CPU slowed four times.
6. Spell the picture is rebuilt as a sound train and Find the rule as a physical number machine.
   Take the corner is retired, and its idea of choosing a speed before a corner becomes a level of
   Pocket rally.
7. Games stay on the grown-ups' side for this plan, so the children's bundle budgets and recording
   path are untouched.
8. After the migration the first physics wave serves the owner's complaints first: the pups' blocks
   and Charlie's bridge, then the marble run and water.

## What we have today

There are 25 games in `GAMES`. Twenty-one are action games drawn by the Field in
`engine/ui/stage.ts`, which turns each frame into one page element per sprite and moves it with a
CSS transform. Four are turn games drawn by the Stage in the same file (spell, rule, race and shut),
which keeps keyed SVG parts, glides them on springs, redraws a part when a setting changes, plays
beats and hosts the hands controller. Two runtimes sit above them, `game-action.ts` and
`game-turn.ts`, and `games.tsx` builds one or the other.

The map already has a WebGL2 core in `engine/ui/gl.ts` (named `map-gl.ts` until P0) with instanced strokes, filled polygons, a
paper grid pass, masks and recovery from a lost context, and `map-scene.ts` rasterises shelf SVGs into
textures within a memory budget. What games lack from it is an instanced image batch: the map draws
each image as its own quad.

The measurements in games-webgl.md set the need. Today's heaviest games use under sixty sprites and
cost 3 to 7 per cent of the main thread. The Field reaches 4.6 ms a frame at 600 moving sprites and
18.5 ms at 1,200, and 47.6 and 90.9 ms with the CPU slowed four times, where a WebGL batch stayed
between 0.8 and 2.7 ms at every load. The games we want next, with hundreds of marbles, swarms, rain
and long trails, are past where the Field can go.

## The renderer

### Layers

The renderer draws a frame in eight passes, each one an instanced draw or a small number of them.

1. Paper: the grid from `gl.ts`.
2. Far layers: parallax sprites at their depths.
3. World: sprites sorted by depth, then texture page.
4. Surfaces: water, ripples and wind drawn by shaders in world space.
5. Ink: the line batch for ropes, aims, trails, rings, boxes, dots and streams, with dashes.
6. Particles: one pool, with glowing motes drawn additively.
7. Fixed layer: readouts that stay on the screen.
8. Post: the lights' wash, drawn from a target a quarter the size.

Under reduced motion every pass draws its resting picture: no particles, no shake, water still, glow
steady, and one frame per press as the games already promise.

### Looks and texture pages

A look is a drawing with its settings, seed, crop and the size it is shown at times the screen's
density. The atlas in `engine/ui/game-atlas.ts` asks the existing SVG `render()` for the look,
decodes it, and packs it into shelf-packed pages of 2,048 pixels square. The budget is 48 MB on
phones and 96 MB elsewhere; whole pages are evicted, the least recently used first, and uploads are
capped at 6 ms a frame. A level rasterises every look it will use before the player says it is ready,
so nothing stalls during play. A look shown larger than it was drawn uses the softer texture until
the camera rests for 200 ms, and is then drawn again at the new size, as the map does.

A drawing that declares moving parts, such as a windmill's sails or a jug's water, is rasterised as
separate part textures placed by the drawing's own anchors, which is also how characters move
without their SVG being drawn again. A setting that changes continuously is handled in one of three
ways chosen per drawing: a small cache of looks at stepped values (a needle every few degrees), a
part turned as a sprite, or a shader for a level or a fill. The `live` sprites that redraw SVG on
every change today stop doing so.

### Words, controls and the test mirror

The toolbar, the note, trays, chips, the pad and the pause menu stay in the page. Words a game draws
go in a page overlay in screen space, in the hand font, where a screen reader and page search can
reach them. The canvas is hidden from screen readers, and `[data-game=reads]` keeps the text form of
every game. When the page carries `?probe=1`, a hidden element with each sprite's `data-key` and box
is updated every four frames, so the end-to-end tests that find sprites by key keep working without
change.

### Turn games

The Stage's work moves into `engine/ui/scene-view.ts`, which turns a turn game's scene into the
renderer's frame. Keyed parts become sprites with the same keys; glides, follows and nudges become a
spring per key stepped in the adapter; a morphing setting uses the stepped look cache; beats play as
they do now, since their poses are already plain data; and anchors come from the atlas, which records
them when it rasterises. The adapter implements the surface the hands controller uses, so
`hands.ts` and every binding stay as they are. The tray, chips and keyboard stay in the page. The two
runtimes merge into `engine/ui/game-play.ts`, where a turn game is a session stepped by events rather
than by the clock.

### When things go wrong

A lost context pauses the game, rebuilds the atlas from its list of looks and resumes, with the game's
state untouched, using the map's generation counter. Devices that report less than 4 GB of memory, or
iPhones by a heuristic, draw at a density of at most two. Without WebGL2 the player follows decision
2. Games do not print, so paper output is unaffected.

## Capabilities the engine will carry

Sizes are S for a few days, M for one to two weeks and L for three weeks or more.

### Rendering

| Capability | Games that need it first | Size |
|---|---|---|
| Instanced sprite batch and the atlas with part textures and stepped looks | every game | M |
| Line batch for ropes, trails, aims and streams | fishing, slingshot, firefly, river | S |
| Particle pool of thousands, normal and additive | every game | S |
| Glow and lights | firefly | M |
| Water surface with waves, ripples and flow | fishing, river, rafts, bridge, rabbit, pour | M |
| Wind and sway over declared parts | every outdoor game | S |
| Camera zoom, follow, lead, shake and framing a build | blocks, marble, river, plane, rally | S |
| Culling for big worlds and long parallax | river, plane, road | S |
| Screen effects: a pause on impact, a flash, a slow finish | slingshot, golf, shove | S |
| Animation of shelf characters from their parts | Charlie, the pups, the unicorn, the rabbit | M |
| Performance readout behind `?perf=1` | tools | S |

### Physics

| Capability | Games that need it first | Size |
|---|---|---|
| Polygon and compound bodies: triangle, arch, wedge, door frame | blocks, marble, slingshot, bridge, cargo | S |
| Prismatic, wheel, motor and pulley joints, limits and breaking force | marble, cargo, bridge | S to M |
| Collision groups and masks | bridge, blocks, marble | S |
| Sleeping and a body budget | marble with hundreds of marbles | S |
| Breakables that split into prepared pieces above an impulse | slingshot, blocks, marble | M |
| Buoyancy by submerged area | rafts, bridge, river, cargo | M |
| Chains and cloth on `line.ts` | fishing, cargo crane, flags | M |
| Water as particles | pour, marble water runs | L |

Determinism stays as it is: a fixed step, seeded chance, inputs recorded rather than trajectories,
and replay witnesses run in node as the gate. Physics is not promised to match across devices.

### Movement and game structure

Platformer movement on `walker.ts` with jump arcs, a jump buffer, one-way platforms and ladders (M);
flocking presets on `steer.ts` for shoals, flocks and birds (S); boats generalised from `canoe.ts`
(S); a construction kit with snapping by anchors (S); typed events and goals, separate from sounds
and effects, with all, any and in-order goals (M); checkpoints on every action game (M); replay of a
try in the player (M); and one generator kit for level variations, with a validator and a solver hook,
that the current per-game challenge files move onto (M).

### Sound and input

Per-game kits of synthesised cues with position, pitch by speed or impact and a limit on voices, and
looping ambiences for water, wind and engines (M), within the rules of [sound.md](sound.md).
Multi-touch for turning a block with two fingers and pinching to zoom (M), intention events beside
the Pad (M), and a gamepad for every control (S). The keyboard remains a gate for every game.

### Tools and tests

Behind `?dev=1` on the grown-ups' side: the tuning drawer wired into the player (S), an inspector
that pauses a game and shows bodies, sensors and anchors (M), a replay viewer (S), and later a level
editor that writes checked data (L). Tests keep the node physics tests and replay witnesses as the
main gate, and add a performance fixture that fails when main-thread time a frame passes its budget
(S), the GPU smoke job and picture comparison of decision 3 (M), and the probe mirror.

## Every game on the new engine

| Game | Moves across | Changes made on the way |
|---|---|---|
| Slingshot | P1 | Towers that break into pieces with dust (P4) |
| Penny shove | P1 | Coin trails and sparks |
| The road | P1 | Longer roads with scenery that is culled; rebuilt as a delivery round: stops on a dashboard list delivered by resting in their bays, stops behind the car or in any order, parcels that slide off a hard stop, and a finish line that waits for the list (30 September 2026, see games.md) |
| Pocket rally | P1 | A camera that follows on bigger tracks; a new level on choosing a speed before a corner, taken from Take the corner (P5) |
| Paper plane | P1 | Clouds to fly through, gusts |
| Garden mini-golf | P1 | Ponds as hazards and moving obstacles |
| Pocket pool | new | A new game in the shape of mini-golf: numbered balls banked and knocked into pockets to make a sum, with an L table, bumpers, an even-only pocket, soft cloth, a slope, a spinner and a fruit bowl (27 September 2026, see games.md) |
| Rescue pups | new | The Pup family as an original rescue team: a hose of particle water onto fires, a helicopter lowering a swinging rope, a digger loading exact tonnes into a truck and a life ring thrown from a boat, each set by degrees and decided by physics (28 September 2026, see games.md) |
| Charlie's bridge, now Charlie's rope swings | P1 | Ropes and pulleys, planks that bend under Charlie (P4); then replaced under the same id by rope swings (27 September 2026); its controls rebuilt as a pull to start, a swing that keeps going, a tap to let go and a tap to catch, with a live landing preview (30 September 2026, see games.md) |
| A home for the pups, now Fetch with the pups | P1 | Zoomed in on the build; roofs, arches and doors; the family walks in (P4); rebuilt around a swinging crane and the wolf's huff; then replaced under the same id by Fetch with the pups: a thrown ball, frisbee or stick, planck deciding where it goes, and each pup reaching what only it can (see games.md) |
| Marble workshop | P1 | Hundreds of marbles, a splitter and a bucket gate (P4); water runs later (P6) |
| Harbour cargo | P1 | A crane on a real rope and a boat that lists with its load (P4); its controls rebuilt as a drag of the crate itself, set down by the crane below where it is let go, beside crane driving from the keys and arrow buttons for skill, with a landing preview, a boat that sails by itself once balanced, and a new barge cover (30 September 2026, see games.md); a dragged crate is now placed where the finger lets go, on the deck's half squares, with no wait for a swing, and the keys let a crate straight down (2 October 2026) |
| Rafts | P1 | Real floating and flocking sheep (P4) |
| Gone fishing | P1 | Ripples at the bite, shoals that scatter (P4) |
| Down the river | P1 | Rapids whose speed shows in the water (P4) |
| Firefly trail | P1 | Lights and glow, and a pond (P4); tap a seed to fly there, with a way round what is in the way |
| Rabbit crossing | P1 | Water and splashes; chained hops with a jump buffer (P5) |
| Clear round | P1 | Rebuilt as a show jumping round: a gather held by degrees, a thrown leap over poles that fall, a canter from the runner and the actor, and a new pony on the shelf (27 September 2026, see games.md) |
| Shunting yard | P1 | Rebuilt as a hump yard: points, pushes by degree and sidings with boards (27 September 2026), then worked by hand: a points lever, a pull on the wagon, a tap to send one back, curved leads and a ghost of where a push stops (30 September 2026, see games.md) |
| See-saw, Cut the cake | P1 | Parity only; they stay off the list |
| Measure it out | P1 | Real liquid in the jugs (P6) |
| Market stall | P1 | Rebuilt as Charlie's lemonade stand: a jug tipped by degrees pouring real liquid, cups and coins slid along the counter, change into a dish and gusts of wind (27 September 2026, see games.md) |
| Shut the box | P2 | A throw with the keys by aim |
| Spell the picture | P2 | Rebuilt as a sound train in P5 |
| Find the rule | P2 | Rebuilt as a number machine in P5; fed by a tap on a numbered ball since 30 September |
| Take the corner | P2 | Retired in P5, its idea moved into Pocket rally |

## Phases

Every phase ends with `npm run check` green, every game's node tests and end-to-end tests green, and
the relevant pages of this document updated. Work that runs in parallel is split so that one agent
owns each file, shared lists take one-line insertions, and each agent writes its end-to-end output to
its own folder.

### P0. The core and one proof

We rename `map-gl.ts` to `engine/ui/gl.ts` and extend it with an instanced image batch, keeping the
map on it in the same change with its tests green. We write `game-view.ts` with the paper, world, ink,
particle and fixed passes, `game-atlas.ts`, the words overlay and the probe mirror, and a seam,
`viewFor(game)`, that sends a game to the new renderer when the page carries `?view=gl`. Garden
mini-golf is the proof. The gates are the golf end-to-end tests passing through the mirror, a
fixture of 600 moving sprites at or under 4 ms a frame on the Mac, twenty simulated context losses
survived, and a picture of golf's first level within tolerance of the Field's. One agent owns the
renderer files and another the mirror and the performance fixture.

P0 is done. `engine/ui/gl.ts` carries three game batches beside the map's draws: sprites from a
texture page, line segments in the stroke program's styles, and anti-aliased discs, each drawn
instanced from a buffer filled each frame under its own camera. The map's image, fill and stroke
draws, masks, grid and the blank-texture guard are as they were. The SVG rasteriser the map and the
atlas share moved from `map-scene.ts` to `engine/ui/raster.ts`. `engine/ui/game-atlas.ts` and
`engine/ui/game-view.ts` are the atlas and the view, `FieldView` in `game-view.ts` is the surface
`game-action.ts` draws through, and `viewFor` in `games.tsx` picks the view from the address.

The gates, measured on 26 September 2026 on an M4 Pro in Chrome:

- `npm run perf:games` draws 600 moving, turning sprites from five drawings at a median of 0.40 ms
  of main-thread work a frame, 0.50 ms at the 95th percentile and 0.60 ms at worst, against the
  budget of 4 ms. The time is the view's alone; the game's own step is not in it.
- `tools/e2e/games/garden-golf.e2e.ts` passes on the Field and with `?view=gl&probe=1` on all four
  projects, WebKit on the phone included.
- `tools/e2e/games/game-gl.e2e.ts` loses and restores the context twenty times: the ball's mirrored box
  and the page's words are unchanged afterwards, and the frame drawn again matches the golden frame.
- The same file compares golf's first level at rest, under reduced motion, with
  `tools/e2e/games/game-gl.e2e.ts-snapshots/golf-0-gl-desktop-darwin.png` at a tolerance of 1 per cent of
  pixels. After a change meant to move what the view draws, refresh it with
  `npm run test:e2e -- game-gl --project desktop --update-snapshots` and look at the new picture.
  The golden frame is the GPU view's own, taken after checking it by eye against the Field's; the
  two differ by antialiasing along every edge, so a pixel compare between them needs a looser rule
  than we wanted to fix in P0.

What P0 leaves to P1:

- Without WebGL2, `viewFor` falls back to the Field. Decision 2's message replaces the fallback when
  the Field is removed in P3.
- Part textures are not drawn. The atlas records every look's anchors, rescaled to its crop and
  size, for the parts to be placed by.
- The world's tint, surfaces, additive glow and the post pass are not written.
- Pages are evicted whole within the budget, but nothing yet measures memory on a phone.

### P1. Every action game

The 21 action games move to the new renderer, using particles, glow and the line batch where they
already draw bursts, trails and ropes. Games move in slices owned by four or five agents, none of
which edits the renderer; a gap in the renderer goes to its owner. The gates are every game's tests
passing through the mirror, pictures within tolerance, and the heaviest six (plane, marble, firefly,
fishing, rafts, slingshot) within budget with the CPU slowed four times.

The renderer's part of P1 is done:

- The player reports `data-game-ready` only after the drawings a level asks for have loaded and
  `GameView.ready()` has resolved, with four seconds as the most it waits.
- A whole drawing keeps a margin measured from how far its ink reaches past its box, from half a
  square up to four, so nothing the Field showed is cut off.
- A `live` sprite, such as a scale's needle or a jug's level, is drawn from the stepped cache while
  its value moves, in 32 steps over each setting's range, and exactly once it has rested for six
  frames or when motion is reduced. Forty looks are kept for each.
- Part textures are not drawn, since the Field never animated a declared part either. They move to
  P5 with part animation.
- The pen's marks match the Field's stylesheet: a faint or dashed line of many short segments is
  rounded only at its open ends, where the Field's cap is round, so overlapping rounds do not
  darken a ring or fill its gaps; round dashes are rounded as SVG rounds them; and a faint dot is
  drawn at 0.3 whatever its opacity, as the stylesheet overrides the attribute.
- The test mirror carries each sprite's angle and depth, turned as the Field turns it, and the
  view reports what it drew and where its camera and grid are, for the tests that read them.
- `tools/e2e/games/game-gl-frames.e2e.ts` holds a golden frame of every action game's first level at
  rest, on the desktop's Chrome.
- `npm run perf:games` also plays the heaviest six for five seconds each when `npm run dev` is
  serving. On an M4 Pro at 120 Hz, the main thread's busy time a frame was 0.9 to 1.8 ms at full
  speed, and 3.3 to 4.3 ms with the CPU slowed four times, except the plane at 10.4 ms. The median
  gap between frames stayed at 8.3 to 8.9 ms, and fewer than one frame in a hundred fell under
  30 fps in any run. We have not measured a phone.

### P2. The turn games

We write `scene-view.ts` with the hands surface and beats, move spell, rule, race and shut onto it,
and fold `game-turn.ts` and `game-action.ts` into `game-play.ts`. The gates are the binding, beat and
throw tests and the end-to-end tray and board keyboard paths.

P2 is done. The four turn games draw on the GPU by default, and `?view=field` still gives the Stage
and the Field until P3 removes them. A browser without WebGL2 falls back to the Stage.

- `engine/ui/scene-view.ts` is the Stage's work on the renderer. It keeps each keyed part's place,
  glide, morph, sway and pose as the Stage did, steps them on the same clock, and gives the game view
  a frame of sprites with the same keys. A part's box comes from its drawing's `box()` without drawing
  it, a turn about a pivot and a growth about the foot are worked into the sprite's centre, and a
  lifted part is drawn larger about a point near its middle, as the Stage's stylesheet had it. A ghost
  is drawn at the Stage's opacity, and `grab` shows a hand over the part.
- The pen's marks are drawn at the Stage's overlay depth: `GameView` takes an `inkAt`, 150 for a
  turn game, so parts are under the marks and a lifted part is over them. A part's own star, tick or
  loop is drawn into its look by the atlas, and the win's star is the shelf's sticker drawing, cut out
  and drawn at the size the Stage's pen drew it.
- Anchors are measured by drawing the part once off the page for each look it has, and kept, so a
  binding that asks for one right after a scene is shown gets the same answer the Stage gave. The
  atlas records the same anchors when it draws the look.
- A morphing setting, and any setting a beat moves, is drawn from the stepped look cache while it
  moves and exactly once it rests. Before a beat plays, every look it will show is asked for, so the
  faces and rolls of a tumbling die are in their pages before the throw reaches them.
- Captions stay text in the page over the canvas. The test copy of each part carries its drawing's
  description and takes a click, so the tests that click or read a part by key are unchanged.
- `engine/ui/game-play.ts` holds both runtimes: an action game stepped by the fixed clock, and a
  turn game stepped by the moves a hand or a key makes. `games.tsx` builds the view the game's kind
  needs and nothing else, so a turn game no longer makes a hidden Field.
- `engine/ui/__tests__/scene-view.test.ts` covers the placement of turned, grown, lifted and ghosted
  parts, glides and morphs ending exactly at rest, beats with their cues, marks and preloads, reduced
  motion, and the win's star. `tools/e2e/games/physical-games.e2e.ts` adds the board's keyboard path, a
  card picked up and put down with Enter, and `tools/e2e/games/game-gl-frames.e2e.ts` holds golden frames
  for the four turn games beside the action games'.

### P3. Removing the old renderers

We delete the Field, the Stage, the page motes and their styles, and the helpers that only served
them, and `?view=gl` stops being needed. We update engine.md, structure.md and games-webgl.md and note
the bundle size. The gate is a full green check and every game end-to-end test.

P3 is done. The GPU's view is the only renderer for the games, and the address no longer chooses
one.

- `engine/ui/stage.ts` (1,398 lines, the Field, the Stage and the page motes) and its test
  (254 lines) are deleted, with about 200 lines of `games.css` that only styled them: the sheet,
  placed parts, sprites, world layers and the SVG ink.
- `?view=field` and `?view=gl` are gone. The probe mirror stays, with `probe=1` or in a browser
  driven by tests.
- Without WebGL2, a turn game is drawn by `engine/ui/still-view.ts`: the scene view gives it the same
  frames it gives the GPU, and it draws each part once per look as the shelf's SVG on squared paper,
  with the pen's marks over them, no motes and no motion. The game stays playable from the tray, the
  keyboard and the pointer. An action game shows "This game needs a newer browser, one that can draw
  with WebGL2." where the page puts its problems, and draws nothing.
  `tools/e2e/games/game-fallback.e2e.ts` covers both by refusing the `webgl2` context.
- The Games chunk went from 706.3 kB (224.1 kB gzipped) to 690.6 kB (219.6 kB), and its stylesheet
  from 19.4 kB (4.4 kB) to 18.0 kB (4.0 kB). Another change to `games.tsx` in the same days added a
  little to the after figure.

### P4. Physics, construction and water

In parallel, with one owner each: polygons, compound bodies, joints, collision groups and sleeping in
`bodies.ts`; buoyancy; the construction kit; chains; the water surface, glow and lights. Then the
game upgrades in the order of decision 8: the pups' blocks and Charlie's bridge, then the marble run,
Harbour cargo, rafts, fishing, the river and the firefly's lights. Each capability comes with node
tests and a replay witness in one game.

The renderer's part of P4 is done: water, glow and lights.

- A frame may carry `water`: stretches of water with a level, a bed, a wave height, a river's flow
  and ripples by age. `surfaceAt` in `engine/motion/surface.ts` says where the surface is at a place
  and a moment, and the water shader in `gl.ts` draws the same sum, so a game that floats something
  on `surfaceAt` sees it ride the waves it is drawn on. The water is filled in its hue, deepening
  towards the pen at its bed, edged in ink along the surface, with two broken lines of glints under
  it. It is drawn over the world's sprites at or under its depth and under the ones above.
- A frame may carry `lights`, each with a reach, a strength, a hue and a flicker; a sprite with
  `glow` casts a light round itself. The lights are drawn as soft discs into a target a quarter the
  size of the canvas, and one pass then washes each light's hue into the paper under it. A glowing
  sprite is drawn over the wash, so its own light does not tint it. `engine/motion/lights.ts` holds
  the lights of a frame and the flicker. We first built a night that darkened the world towards the
  ink; the owner found it off-style and it was removed, so nothing in a game darkens the paper.
- A frame's `time` is the clock waves and flickers are drawn at, so the water a game floats things on
  and the water drawn agree. Under reduced motion both stand still at the clock's start, and the
  ripples are not drawn.
- Without WebGL2 the still view draws water as a resting surface in its hue, and no lights.
- Firefly trail is the witness: the firefly carries a flickering light, the seeds and beads glow,
  and the pond is water that a frog's gliding pad and its snap ripple.
- `tools/e2e/games/game-gl-frames.e2e.ts` holds a golden frame of the water, the lights and the glow, each
  drawn by the game view from a frame with no drawings in it, beside Firefly trail's own.
- `npm run perf:games` now also plays the pond level. On an M4 Pro the main thread is busy 1.8 ms a
  frame on the last level and 1.7 ms at the pond, and 6.0 and 6.9 ms with the CPU slowed four times, in
  the range of the other heaviest games.

The physics part of P4 is done, apart from a pulley in Charlie's bridge.

- `engine/motion/bodies.ts` gained convex polygons and compound bodies made of boxes, polygons and
  balls; hinges with limits and motors, sliders, pulleys and springs between two bodies or a body
  and the world, each able to break above a force; `drive` and `travel` for a motor and a joint's
  angle or distance; chains of links, of one length or of several, laid in a sag when longer than
  the way between their ends; named collision groups a body belongs to or passes through; water
  that floats a body by the area of it under a surface, flat or given by a function, with `wet`
  saying how much of a body is under; `outline` for a body's pieces in the world; `asleep`, `spin`
  and `census`, which counts the bodies that can move and those awake; and welds that give. The
  submerged area is worked out in `engine/motion/float.ts`. `engine/motion/construction.ts` gained
  anchors and `snap`, which moves a piece let go near a neighbour's anchor onto it.
- A home for the pups is drawn on a world of 36 squares by 21, so a cube reads as a block a child
  can take hold of, and the camera comes in close on a house that stands. Roofs, a wide roof, arches
  and a door frame join the blocks as polygon and compound bodies; a block let go by hand a hair from
  its neighbour meets it; three new jobs ask for a roof to a height, a door beside a room and three
  rooms in a row; and the family walks in one after another, hopping up to a floor above the pond. The
  game was later rebuilt around a swinging crane and the wolf's huff, on a world of 72 squares, as
  [games.md](games.md) describes.
- Charlie's bridge lays each plank as two to four pieces joined by welds that give, so a long plank
  sags under Charlie and springs back, and a new level hangs planks end to end on a rope between two
  posts: planks that add up to the gap make a bridge, a rope too long sags and she slips into the
  water, and one too short ends before the far post.
- The marble workshop has a splitter whose flap, on a motor, turns after every marble, a bucket on
  a motor that tips out a handful once it holds enough and keeps what is left, and a level of a
  hundred small marbles within a budget of 160 a run.
- Harbour cargo's crane runs a trolley along its jib with the hook on a rope; a crate is lifted
  before it travels, swings as it starts and stops, and is lowered once it hangs still. The barge
  floats in the harbour's water, held at its mooring and free to rise and list, and a crate dropped
  in the harbour splashes, rings the water and is brought back.
- The rafts float on `surfaceAt` for the river's waves, the river is drawn as water with a slow
  current and the ripples of sheep, and the flock mills about the bank while the front sheep waits.
- Gone fishing draws the lake as water with the float riding its surface, rings the water at a cast,
  a nibble, a bite and a strike, and its fish of one kind swim as a shoal and scatter together.
- Down the river is seen from above, which the side-on water of a frame does not draw, so its
  current shows as streaks that run longer and faster through the rapids, and a stroke leaves a ring
  that drifts with the water.

Every capability has node tests, and the games are its witnesses: the blocks' houses replay to the
same place, the bridge's crossings and rope, the marble run's witnesses, the cargo replays and the
rafts' recorded jumps. The raft witnesses that the waves changed were recorded again. The rules
versions of the blocks, the bridge, the rafts and cargo, the marble run and fishing moved on.

A pulley is built and tested in `bodies.ts`, and the bridge's lift (P5) is the game that uses it,
with a slider under each side; springs are not in a game yet.

### P5. Structure, input, sound and the plain puzzles

Goals and events, checkpoints, replay in the player, the generator kit, multi-touch and intentions,
the sound kits, platformer movement and character animation. Spell the picture becomes the sound
train and Find the rule the number machine, each meeting the six ingredients; Take the corner is
retired and its corner level added to Pocket rally.

Done for the plain puzzles: Find the rule is the number machine, an action game in
`school/games/rule.ts` where a ball rolled into a numbered pocket goes through the machine and has
to fill an order, with humps, stones and a second machine as the levels' obstacles and a dotted path
as the preview. Its turn game, its activity and the `rule` mechanic are deleted. Take the corner is
deleted with its circuit activity and its hands binding, and Pocket rally has a fourth level, Slow
for the bends, where each bend's sign gives the speed to take it at. The bridge has an eighth level,
the pulley lift, on the pulley and slider joints. See [games.md](games.md) for each.

Done for platformer movement and character animation: the runner in `engine/motion/walker.ts` (jump
arcs, a jump buffer, grace off an edge, a shorter hop when the jump is let go, walls and ceilings,
one-way and moving floors, ladders, and `seek` for a figure the game steers) and
`engine/motion/actor.ts` (poses by act, cycled by stride or clock, a fade between poses, a squash on
landing, facing, and the pose alone at rest). Node tests cover each, with a recorded run over a
course as the replay witness. The pups move into their house as runners and actors, hopping up onto
a floor on stilts, and Charlie's drawing in the bridge is an actor. No shelf drawing needed a change:
the poses the actors cycle are the ones the drawings have. A game a child steers as a platformer is
still to come; the runner is ready for it.

Done for the game structure and input: goals and events, checkpoints, replay in the player, the
generator kit, and multi-touch and intentions.

- A step's happenings can carry an event, `{ event: { kind, value? } }`, which the page does not draw
  or sound. `engine/motion/goals.ts` builds a level's goal from events (so many of one, all, any, or in
  order) as plain data kept in the game's state, with the progress the bar shows. Down the river is
  the witness: its gates of the count and the number on the line are one goal in order, which decides
  the win and the progress.
- The player keeps a tape of every step's pad and of the commands, take-backs and restores between
  steps (`engine/motion/tape.ts`). A game that emits a `checkpoint` event gets the button Back to the
  checkpoint, which replays the tape into a fresh start up to that step; nothing in the game copies its
  state, so every action game can have checkpoints by emitting the event. The river emits one at each
  gate of the count. A won try can be watched again from the start at the game's own pace, from the
  same tape, except under reduced motion, where nothing plays by itself. The node witness records the
  river's pilot, replays it to the same state, and returns to the last gate.
- The generator kit (`engine/motion/generator.ts`) is a generator, a validator for stored layouts and
  a solver hook. Every game's variations moved onto it: `school/games/challenges.ts` is now one record
  of families keyed by game, each with its generator, the stored shape, the ratings and how the game is
  opened, in place of two long chains of cases. The stored shapes are unchanged, so no saved challenge
  changes its identity.
- The Pad carries `intents`, a zoom from two fingers on the glass (`engine/motion/touches.ts`), the
  wheel, a trackpad's pinch and the plus and minus keys. A game that reads them says `intents: true`;
  Fetch with the pups zooms its park with them. Two fingers turning was a turn intent while the pups'
  crane turned a hanging block with it, and went with that game, since nothing else turned.
- Not done: a gamepad for every control beyond the arrows, go and brake that it already reaches.

Done for sound, and Spell the picture rebuilt as the sound train.

- `engine/sound/kit.ts` holds a game's sounds as data: each cue is a few layers of oscillator or
  filtered noise on an envelope, with everyone's sounds for every cue and a game's own `sounds` in
  place of any of them. A cue can be asked for with a `strength`, a `pitch` and a `pan`
  (`{ cue, strength?, pitch?, pan? }` in a step's happenings), so a knock is as loud as it was hard and
  a count can climb a scale. A limit of eight voices drops the quietest to come rather than cutting a
  loud one, and one cue asked twice within forty milliseconds is one sound. Hums (water, wind and an
  engine) are loops a game asks for with `hum(s)`, at a level and a pitch, and fade when left out.
  `engine/ui/game-sound.ts` plays all of it through Web Audio, behind the Sound switch, silent while
  paused, and hushed when the switch goes off or the game stops. The rules of [sound.md](sound.md)
  hold: no recordings, and every cue is also drawn.
- The rail model has banks and gravity: a hump, a dip or a ramp as a cosine, the height and grade at
  any place, and a loose group pulled down a slope and held still by its rolling on a gentle one.
- Spell the picture is the Sound train, an action game that keeps the id `spell` and the spelling
  mechanic's words and checks; see the section on it in [games.md](games.md). It meets the six
  ingredients: the pull sets the push by degrees, the rail decides after the release, a short push is
  only a nudge more and a wrong wagon is uncoupled, the levels are lines with banks, the dots preview
  the push on the early levels, and the phonics is which wagon comes next. Its variations are the
  level's words, certified by a solver whose recorded pads are the replay witness. The old tray and
  hands binding (`spell-hands.ts`) are deleted, and Shut the box is the one turn game left.
- Not done: no game but the train has a kit of its own yet, and only the train asks for a hum. The
  river's water and the plane's wind are the next hums to wire.

### P6. Tools and the last capabilities

The inspector, the tuning drawer, the replay viewer and the performance readout, breakables where
P4 did not reach them, and water as particles with real liquid in Measure it out and water runs in the
marble workshop. The level editor waits until two games share the construction kit's data.

Done for the tools. The player carries four tools for whoever makes a game, and none of them reaches
a child: they open with `tools=1` in the address, or `perf=1` for the frame readout alone, or with
shift, alt and D, and their code loads only then, so the Games chunk carries only the hooks.

- The inspector draws every body's outline over the field (heavy while it is awake, dashed asleep,
  faint when fixed and red for a sensor) and every joint as a rod ringed at its ends, and lists the
  bodies awake, the goal's count, the events the game said, and the sprite under the pointer with its
  settings. It finds the worlds in a game's state itself, through `isBodies` and `survey` in
  `bodies.ts`, so a game declares nothing for it.
- The tuning drawer turns each knob of a game's `tuning` while it runs, counts the knobs turned, and
  puts them all back.
- The replay viewer scrubs the tape step by step, holds the field on any step, cuts the try there and
  plays on, plays it again from the start, and copies it out, saves it, pastes it or opens it as JSON,
  which `readTape` in `tape.ts` reads before anything plays it.
- The frame readout gives the frames a second, the game step's time, the step and drawing time, the
  sprites and looks drawn, the atlas's pages and memory, and the bodies awake.
- The tools are a chunk of their own, 7.2 kB (2.8 kB gzipped) with a 2.1 kB stylesheet, loaded only
  when asked for. The Games chunk measured 739.4 kB (237.8 kB gzipped) before and 523.4 kB (188.8 kB)
  after, but other work landed between the two builds, so most of that fall is not the tools'; what
  the tools add to it is the probe and the address and key checks.

Done for the last capabilities: water as drops, and walls that break.

- `engine/motion/liquid.ts` is a small particle liquid. Drops fall, crowd and spread by double density
  relaxation, and run over walls and over any world of bodies through `solids` and `velocityAt` in
  `bodies.ts`, pushing what can be pushed. A liquid is four numbers a drop and a tag, so it is stored
  with a game's state and steps the same way every time. `WATER` pools and levels in a container;
  `STREAM` has no crowding, since a thin falling column pushed apart by its own crowding sprays
  sideways. A drop's crowding moves it at most a small share of its size in a step, so drops born on
  top of each other do not fly apart.
- A frame may carry `liquid`, bodies of drops that the game view draws as one water: each drop's field
  is added into a half-size target, and where the sum passes one half the water is filled in its hue
  with a pen line along its outline. The still view draws the drops as discs.
- `breakable` in `bodies.ts` stands a wall of square blocks welded where they touch, a hair apart so
  the welds do not also press; a join comes apart when a hit pulls it harder than the wall's strength.
- Measure it out counts its water exactly, jug by jug, and what leaves a jug falls as drops that each
  carry their share of it. A jug reads, and is drawn holding, what has landed in it, so its scale
  rises as the stream arrives; its water is drawn as drops under a surface that stays level however
  the jug is turned, tilts when the jug is carried, rings where the stream lands and stands still
  under reduced motion. The stream wavers, thins as a jug empties and breaks into drops at its end.
- The marble workshop has a water run: two tanks let out 5 and 3 litres that run down the ramps and
  pool in a cup read in litres. A cup counts as full within half a litre, since a drop or two of a
  good run splashes wide however it is built; the reading still says what landed.
- The slingshot's fourth level is a stone wall of ten blocks guarding two stars. It stands on its
  own, a soft throw knocks a join or two, and a hard straight one breaks it apart.
- `tools/e2e/games/game-gl-frames.e2e.ts` holds golden frames of the liquid and of a pour in progress. The
  pour with the tap running and the water run both hold 8.3 ms a frame on the Mac's 120 Hz display,
  also with the CPU slowed four times, and the pour holds 17 ms (60 frames a second) in WebKit at a
  phone's size.
- We removed the dimmed night that P4 added: nothing sets a frame's darkness any more, the shade pass
  only washes lights in, and `night.ts` became `lights.ts`.

## The owner's manual pass

At the end of P6 the owner plays every game on the Mac, an iPad and an iPhone. For each game we
provide a short checklist in this document: how to win each level by hand and by the keys, what a
miss looks like, what reduced motion should show, and the frame readout to note from `?perf=1`. We
record what the pass finds here and fix it before calling the plan done.

### Tracking

A game is marked done when the owner has played it and signed it off. "In rework" means a change the
owner asked for is being built, and the game goes back to "to check" when it lands.

| Game | Id | Status | Notes |
|---|---|---|---|
| Harbour cargo | `cargo-workshop` | to check | drag a crate for touch, crane driving by the keys |
| Marble workshop | `marble-workshop` | to check | |
| Sound train | `spell` | done, 30 September 2026 | coupling loosened the same day |
| The number machine | `rule` | to check | buttons for the keys back under the machine |
| Rabbit crossing | `jump` | to check | |
| Down the river | `straight` | to check | a held finger steers the canoe there; the arrow keys and buttons stay as they are |
| Shunting yard | `shunt` | to check | the keys as they were, their buttons back, and a push gauge |
| Measure it out | `pour` | to check | |
| Shut the box | `shut` | to check | |
| Slingshot | `sling` | to check | |
| See-saw | `weigh` | to check | off the list |
| Penny shove | `pay` | to check | |
| Cut the cake | `share` | to check | off the list |
| Firefly trail | `snake` | to check | the keys fly it as they did before, beside tap to fly; the bar is icons |
| The road | `road` | to check | rebuilt as a delivery round |
| Rafts | `herd` | to check | |
| Gone fishing | `fish` | to check | the keys play as before; on the glass, tap a fish, press on the bite, hold to reel |
| Paper plane | `plane` | to check | hoop check loosened, scenery thinned |
| Garden mini-golf | `golf` | to check | |
| Pocket pool | `pool` | to check | table enlarged, plain squared paper |
| Pocket rally | `rally` | to check | |
| Charlie's rope swings | `bridge` | to check | pull to start, tap to let go |
| Fetch with the pups | `blocks` | to check | a staked target for each ask, streaks, and a fourth ask with a twist on each level |
| Rescue pups | `rescue` | to check | frame rate with water and rope not yet measured |
| Charlie's lemonade stand | `wardrobe` | to check | landing ring on the customer |
| Clear round | `clear` | to check | the keys as before; a tap on the field lets the pony see its stride and choose its leap |
| Marble pegs | `pegs` | to check | new; frame rate on a phone's WebKit not yet measured |
| Knock it down | `knock` | to check | new; frame rate on a phone's WebKit not yet measured |
| Treasure island | `treasure` | to check | new; frame rate on a phone's WebKit not yet measured |
| Bolt's rescue | `bolt` | to check | new; frame rate on a phone's WebKit not yet measured |

## Risks

The first rasterisation of a level's looks can stall; the ready state hides it, and the budget caps
it. Phones may band colours at medium precision, so positions use high precision. A lost context on
iPhone is the crash the map met; the atlas budget and the density cap are there for it. Headless
browsers draw WebGL in software, so frame gates are measured on the Mac with a real GPU, and the
mirror, not the canvas, is what the end-to-end tests read. The migration touches every game, so each
game moves with its own tests passing, and no two agents edit the same file.

## Where the code lives

The renderer, the atlas, the scene adapter and the merged runtime are in `engine/ui/`, the only place
that touches the page. Physics and every movement or simulation piece are in `engine/motion/`, with
planck confined to `bodies.ts`. Rules, levels and variations stay in `school/games/`, and drawings on
the shelf in `engine/parts/`. No new top-level folder is needed; if a module needs its own directory
we record it in [structure.md](structure.md) and `boundaries.ts` in the same change.


### Responsive game composition

`ActionGame.frame(state, rest, room)` receives the available field size in pixels, cached at resize.
Games can return display-space sprites and marks plus a `Frame.projection` from logical simulation
coordinates to that layout. `motion/presentation.ts` maps points and axis-aligned/quarter-turn marks;
artwork size remains proportional. The field inverses the projection for pointer input, including
flick samples, and exposes it in the browser probe. Physics, keyboard input and replay stay in
logical coordinates. Resizing cancels an active gesture before changing the mapping.
