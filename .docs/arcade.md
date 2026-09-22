# Arcade

Status: proposed, September 2026, with three action games (a bead string that steers like snake, a road whose kerb is a number line, and a slingshot aimed at a tower of Cuisenaire rods) first played on a page of their own, `scratchpad/arcade.html`, beside the slingshot built a second time in Phaser 4 for comparison. They have since moved into the one Games tab, `scratchpad/play.html`, on the one engine described in [engine.md](engine.md): the games are in `scratchpad/src/play/`, what they run on is in `scratchpad/src/engine/`, their tests are in `scratchpad/test/games.test.ts`, and Phaser was dropped (see "Phaser, compared and dropped" below). The old address opens the same game in the Games tab. This document extends [engine.md](engine.md), which answered the engine question for turn-like games with a prover, and it changes nothing in it. The owner asked which TypeScript and JavaScript game engines would let us build games like snake, races and Angry Birds into the app with our own art from the shelf. That is a different kind of game from the ten on the Games page: things move every frame, collide, scroll and bounce, and there is no position graph for a prover to walk. This document says what each genre needs, measures whether our SVG drawings hold up when they move like that, says how shelf art gets into each candidate and what it costs, updates the field of engines where these genres change the answer, and recommends a shape that fits [structure.md](structure.md).

## Summary

We recommend keeping our own engine and giving it three pieces for action games: a fixed-step game loop that reads one set of controls (now `src/engine/pad.ts`), a field that draws shelf drawings as layers the browser composites (now the `Field` in `src/engine/stage.ts`), and planck for the one genre that needs rigid bodies (now behind `src/engine/bodies.ts`). The drawings stay SVG from the seeded pen. Each look is drawn once and moved by a transform, so the browser rasterises it once at the device's pixel ratio and then only composites it, which is the texture an engine would have made, made by the browser, with the drawing still in the page for print and for the text form. In headless Chrome at a device pixel ratio of two with the CPU slowed four times, which we use as a stand-in for a mid-range tablet, this holds sixty frames a second with 400 moving, turning shelf drawings, and with 192 planck bodies drawn as shelf cubes; the games we built have between 11 and about 46 drawings on the field at once. It stops being enough somewhere between 400 and 800 moving drawings at that speed, and between 200 and 400 at six times slower, where a canvas or PixiJS keeps going past 800. None of the three genres comes near that, and we have not measured a real tablet.

Phaser 4 is the strongest alternative, and the slingshot was built in it too. It played the same and looked the same, because its textures were rasterised from the same drawings, and it cost 348 kB gzipped against 59 kB for our field, the three games and planck together, a canvas that does not print, a texture pipeline with the fonts embedded in it, and a runtime that cannot be imported in node. It was dropped when the games became one tab on one engine. We do not recommend a split between our engine for lesson games and an engine for action games, but the seam for one exists: an action game emits a `Frame` of keyed sprites and marks, and anything that can draw a `Frame` can be put under a game without touching the game.

The learning has to be in the move, as [activities.md](activities.md) asks, and that document's refusals still hold: nothing is timed, nobody races another child, and nothing costs a life. The bead string is always as long as the count and grows by its step, so skip counting is a length. The road's finish is a number, so the race is number line estimation, and at the harder level only the ends of the line are written. The slingshot is angle and pull, with the dots of the last two shots left on the paper. It does not teach arithmetic, and we do not pretend it does.

## What changes from the engine study

The engine study's games are positions and moves, and its gate is a prover that walks every reachable position. An action game has no such graph: the snake's position is a list of squares that changes four times a second, the car's speed is a real number, and the tower is a physics world. [engine.md](engine.md) already names the gate for a game like that, the second of its three: named invariants and a seeded replay, so the outcome is a pure function of the record. The tests in `test/games.test.ts` are that gate for these three games. The bead string is as long as the last number picked up, at both levels. A number that is not next is passed over and stays. Running into the edge stops the guide and loses nothing. The road reads the stop off its own line. A box slows the car and costs nothing else. A slingshot shot fired twice gives the same world body for body. Nothing falls before the first shot. Every drawing a frame asks for is on the shelf.

The second change is the product's refusals. [activities.md](activities.md) left out anything timed, anything where one child races another, and anything where a wrong move costs a life, and [product.md](product.md) rules out points and streaks. A real-time game is not the same as a timed one, and all three prototypes keep the refusals: there is no clock and no countdown, the road is raced against a number rather than a person, a bump stops the guide or slows the car and takes nothing away, and there is no score. The slingshot counts shots in the text form, because a parent reading the record will want to know, and shows no count on the screen.

The third change is reduced motion. The rule in [CLAUDE.md](../CLAUDE.md) is that everything that moves stops under `prefers-reduced-motion`, and a game whose moving is the game cannot simply stop. The prototypes take a rule that keeps the letter of it: under reduced motion, time moves only when the child acts, and each act is drawn once, at rest. The bead string moves one square a press. The car drives for half a second a press. A launched ball is worked out to rest at once and drawn where it stopped, with its path left in dots. There are no puffs, no shake, no camera easing and no parallax. This also gives each game a turn-based form, which is the form a child with a motor difficulty needs and the form a screen reader can follow, and the reduced-motion road is close to the Games page's race, where a turn is a change of speed.

## What each genre needs

| | Bead string (snake) | The road (race) | Slingshot |
|---|---|---|---|
| Loop | fixed step at sixty a second; the string moves a square every so many steps and glides between squares | fixed step; speed and steering integrate every step | fixed step; planck steps the world every step |
| Moving drawings | the guide, up to 30 beads, up to 15 number cards | the car, boxes knocked aside, the road and roadside drawn once | 13 to 15 bodies, the ball, a few puffs |
| Collisions | squares: the edge, the string, a card | a box against the car, rectangles | polygons and circles, resolved by planck |
| Rigid bodies | none | none | stacking, friction, a hinge with limits (the see-saw), a fast ball that must not pass through a rod |
| Camera | fixed; the paper is the board | follows the car, leading it by more the faster it goes, over a world up to 136 squares long | shows the whole world while aiming, follows the ball in flight at the harder level |
| Feedback | a puff when a number couples on, a shake on a bump | a puff and a shake when a box is hit, the car's arrow showing speed | puffs where things land, a shake on a hard hit, the dots of the flight |
| Controls | a direction: arrow, swipe, on-screen arrows, gamepad | go, brake, lane up and down; level one keeps a speed by itself so one finger steers and brakes | a pull: drag from the ball; or arrows to aim and space to let go |
| Grades one to four | count in ones to 10, then in twos and fives, then in threes and fours, then a count with a rule (start at 2, add 3); faster each rung | a line to 20 with every number written, then to 100 in tens, then only the ends written, then fractions of the way and decimals | a near tower with the path shown for half a second, then a wall to lob over with the angle in degrees and the path shown for a fifth of a second |
| Where the learning is | the string is as long as the count, grows by the step, and alternates in fives like the shelf's bead string | where a number is on a line, and how far a car goes before it stops | angle and pull, and changing one thing between two shots |

The learning, genre by genre, and what each cannot honestly claim.

The bead string teaches the count as a length. The shelf's bead string alternates colour every five beads so a number is read by its fives rather than counted from one, and the game's string is that drawing, one bead a square, so after 3, 6, 9 and 12 the string is twelve beads long, two fives and two, with the numbers it picked up written under the beads they landed on. That is the skip-counting picture teachers draw on a bead string, and here the child made it. A number that is not in the count, 14 in a count in threes, is passed over, and the guide says it is not next. What it cannot teach: counting in tens to a hundred, because the string would be a hundred squares long; that needs a bead worth ten, which the shelf does not draw. The planning a snake game is known for, not running into your own tail, is spatial rather than mathematical, and we count it as the game rather than the learning.

The road teaches where a number is on a line. The car stops, the nose's place on the kerb is read as a number, and the guide says how far the target is. At the first level every number to 30 is written and a flag stands on 20, so the question is braking, and the arrow drawn from the car is as long as the distance it will cover in the next half second, which makes braking distance something to see. At the second level only 0 and 100 are written, with a tick every ten, so the child has to judge where 70 is; that is the number line estimation task Siegler and Booth (2004) found tracks maths achievement at this age. Grades three and four would put fractions of the way and decimals on the same line. What it cannot teach: anything about speed as a rate, since the speed is not a number on the screen, and adding one would make it a readout rather than a move.

The slingshot teaches angle and pull as something felt first. The dots of the last two shots stay on the paper, so a child can change one thing and see what it did, which is the habit of a fair test. At the harder level the angle is written in degrees on the arc the pull makes, which is the protractor a grade four child is learning to read, used for something. The tower is Cuisenaire rods, so a child is knocking over the pieces they count with, and the numbers are on them because they are rods. What it cannot teach: arithmetic, and we do not add a sum to it. A count of stars knocked down is a count, not a lesson.

Controls a five year old can use. Every on-screen control is sixty pixels, above the forty four pixel floor. There is one direction at a time and one big button. Nothing needs two fingers at once at the first level, which is why the first road keeps a speed by itself; the second level asks for go and a lane together and is for older children. A swipe has to cover about a finger's width before it counts. The same four things come from a keyboard, a swipe, the buttons and a gamepad (d-pad or stick for a direction, A for the big button, B for the brake), so a game is written once against the `Pad` in `src/engine/pad.ts`.

## Does SVG hold up

We measured three things in headless Chrome 150 on the development Mac (an M4 Pro), at a device pixel ratio of two, on a 1200 by 700 pixel stage, with CPU throttling through the DevTools protocol at one, four and six times. Four times is the slowdown Lighthouse uses to stand for a mid-tier phone against a desktop, and we use it as a stand-in for a mid-range tablet; six times is there as a harsher case. We have not calibrated either against a device. Throttling slows only the renderer's main thread: rasterisation and the GPU run at this machine's speed, so the trace in the third table is there to show what lands on them instead. The display clock was 120 Hz and the page did its work at 60 Hz on it, so a frame over 20 ms is a frame a 60 Hz tablet would drop. The scripts and the raw results are not in the repository; the report that accompanies this document says where they are.

The drawings were a mix of shelf drawings drawn through the pen (the race car, the cube, the ball, the star, the apple and a carriage, seven paths each on average), each one moving and turning every frame. Five ways of drawing them: one SVG with every sprite a group whose transform changes, so the SVG is painted again every frame; the field's way, every sprite its own small SVG in an element the browser composites; a canvas with each drawing rasterised once to a bitmap; a canvas with the pen's paths replayed every frame; and PixiJS 8.20.1 with the same bitmaps as textures.

Main thread time a frame in milliseconds, and the share of frames over 20 ms where it was more than 2%:

| Moving drawings | One SVG, 4x | Layers, 4x | Bitmaps, 4x | Pen on canvas, 4x | PixiJS, 4x | One SVG, 6x | Layers, 6x | Bitmaps, 6x | PixiJS, 6x |
|---|---|---|---|---|---|---|---|---|---|
| 25 | 2.1 | 1.0 | 0.6 | 1.0 | 1.8 | 3.5 | 1.7 | 1.4 | 2.8 |
| 50 | 2.7 | 1.4 | 1.3 | 1.2 | 2.6 | 4.8 | 2.8 | 1.5 | 3.7 |
| 100 | 4.4 | 2.2 | 1.3 | 1.9 | 2.3 | 7.0 | 4.4 | 2.6 | 3.9 |
| 200 | 5.4 | 3.6 | 1.6 | 2.0 | 2.0 | 8.3 | 8.0 | 3.5 | 3.7 |
| 400 | 8.8 | 6.6 | 2.3 | 2.6 | 1.9 | 15.6, 6% | 15.3, 13% | 4.2 | 4.0 |
| 800 | 18.0, 13% | 14.0, 4% | 3.0 | 4.5 | 2.5 | 29.0, 99% | 28.9, 85% | 4.6 | 4.8 |

At one times every way held sixty frames a second to 800 drawings, with the SVG ways at 4.3 and 3.3 ms a frame.

Physics bodies drawn as shelf drawings: towers of cubes with a ball every sixth body, knocked over every two seconds, stepped by planck at sixty a second. Main thread time a frame, the part of it that was the physics step, and the share of frames over 20 ms where it was more than 1%:

| Bodies | Layers, 4x | of which the step | PixiJS, 4x | Layers, 6x | of which the step | One SVG, 6x | PixiJS, 6x |
|---|---|---|---|---|---|---|---|
| 24 | 1.3 | 0.4 | 1.7 | 2.3 | 0.8 | 2.6 | 2.5 |
| 48 | 2.8 | 1.2 | 2.3 | 2.7 | 1.2 | 5.1 | 4.2 |
| 96 | 3.9 | 1.5 | 3.4 | 3.5 | 1.4 | 7.3, 3% | 4.8, 1% |
| 192 | 9.1, 2% | 5.1 | 5.9 | 10.3, 2% | 5.6 | 14.7, 10% | 11.7, 7% |

Past a hundred bodies the physics is the cost, not the drawing: at six times, 192 bodies dropped frames with every renderer, PixiJS included.

The rest of the frame, from a Chrome trace at one times with 200 moving drawings: busy time a frame on each thread, in milliseconds.

| | Main | Compositor | Raster workers | GPU process |
|---|---|---|---|---|
| One SVG | 1.38 | 0.27 | 1.53 | 1.58 |
| Layers | 1.16 | 0.75 | 0.18 | 0.81 |
| Bitmaps on a canvas | 0.56 | 0.20 | 0 | 0.62 |
| PixiJS | 0.83 | 0.22 | 0.21 | 0.75 |

This is the table that decides between the two SVG ways. One SVG is painted again every frame, so it rasterises again every frame, and on a tablet's GPU that is the cost most likely to grow. Layers rasterise once and leave the compositor and the GPU with about what PixiJS leaves them. The field, now the `Field` in `src/engine/stage.ts`, uses layers for everything that moves and paints everything that stays (the road, the ground, the trees) into one layer of paper the size of the world, which the browser tiles and moves with the camera.

The three games themselves, from the production build, played through real key and mouse events: the page's own work, the game step and the field's drawing, came to between 0.03 and 1.1 ms a frame from one to six times, and no game dropped more than 2.4% of frames at any throttle. The slingshot's second level, with fifteen moving layers and planck, was the heaviest, at 1.1 ms at six times.

Where it stops, then. For a game that moves a few dozen drawings, which covers snake, a race, a slingshot, a platformer with a handful of enemies, a Breakout or a Frogger, the SVG field has several times the headroom it needs. It stops being enough for a game whose point is hundreds of moving things at once: a particle-heavy effect, a bullet pattern, a crowd. It also costs a new drawing whenever a look changes, so a drawing that changes every frame (a morph, a stretching band drawn by the pen) belongs in the ink over the field, as the band and the dots are here, rather than in a sprite. What we did not measure: a real tablet, Safari on an iPad, a real touchscreen, and memory on a device with 3 GB.

## How shelf art gets in

Three ways, all of them tried, and what each keeps of the seeded look, the paper grid, reduced motion and the forty four pixel floor.

Keeping SVG, as the field does. A drawing is drawn once through the pen, cropped when a sprite is part of it (a bead is cut out of the bead string, a star out of its box), and every sprite with that look is a copy. The seed is the drawing's, so the same bead is the same strokes every time. The grid is the world layer's own background, so it lines up with the drawings and moves with the camera. The pen's time for a look is 0.04 to 0.22 ms on this machine and 0.2 to 0.7 ms at four times; a level of the three games draws 11 to 38 looks and spends 3 to 14 ms of pen time on them in all, most of it on the road, whose car is drawn again each time its speed arrow changes length. The memory is the browser's, one layer at the device's pixel ratio per moving sprite, which is the same order as a texture. What it costs: nothing a game has to do, and the headroom measured above. It is the only one of the three in which the drawing is still in the page, so it is the only one where the resting picture prints as it is and the text form sits beside the thing it describes.

Rasterising a drawing to a texture, as the Phaser slingshot did in `src/arcade/raster.ts`, which went with it. The pen draws the SVG, the SVG is turned into an image at the size it will be on screen times the pixel ratio, and the image is uploaded. Three things have to be handled that the first way does not have. An SVG drawn as an image is a document of its own, so the page's fonts do not reach it: the numbers on the rods would come out in a fallback face, so we embed Andika's two weights in each image as data, 39 kB of font carried into every rasterisation. A texture costs width times height times four bytes for as long as it is loaded: at 30 pixels a square and a pixel ratio of two, a 2 by 2 square prop is 56 KB, a carriage 352 KB, and a pair of fir trees 1.4 MB, so the Phaser slingshot's twelve textures come to 914 KB at 22 pixels a square, and we estimate the shelf as a whole at well over 100 MB, which is why an engine would load an atlas per game and not the shelf. And rasterising takes 0.5 to 0.9 ms a drawing here and 2 to 3.4 ms at four times, before the first frame. The seed survives into the texture; the texture does not print and a screen reader finds a canvas. A texture is drawn at one scale, so a camera that zooms in makes it soft unless it is rasterised again.

Drawing with our pen onto a canvas surface, which is the `ink/surface.ts` of [structure.md](structure.md). Today's pen builds SVG through rough.js, and the drawings also build SVG elements of their own (text, circles), so a canvas surface needs that file first. Until then the nearest thing is to replay the pen's paths onto a canvas, which the measurement did: every path as a `Path2D`, stroked and filled every frame. It held sixty frames a second to 800 drawings at six times, better than the SVG field, and it keeps the vector drawing, so it is sharp at any zoom without rasterising again. It loses the page (no print, no text in place) and it has to redraw everything every frame. It is the right answer for a game that needs hundreds of moving drawings and our pen, and it is a reason to build `ink/surface.ts` as planned rather than a reason to adopt an engine.

In all three the forty four pixel floor is the game's, not the renderer's: the field grows a touch target (the ball's reach is the larger of two and a half squares and 44 pixels) and the on-screen controls are HTML buttons in every build, the Phaser one included. Reduced motion is the page's rule for time, and it has to be written for each renderer; we wrote it for Phaser too, where a launched ball is stepped to rest before anything is drawn.

## The field, for these genres

What changes from [engine.md](engine.md)'s field is that physics now matters for one genre, and that an engine's camera, particles and input would be used rather than ignored. Versions and dates are from the npm registry on 12 September 2026. Sizes are minified and gzipped at level 9 in kilobytes of 1,024 bytes, measured with esbuild on a small program that uses each library the way a slingshot would; they differ from bundlephobia's where tree shaking removes parts, and Vite's build output prints slightly larger figures because it counts in thousands and compresses less hard. Maintenance is the default branch on GitHub over the six months to 12 September 2026. "Runs in node" was checked by importing each package under Node 25; "phones home" by reading each built bundle for URLs and network calls and by a network trace of the prototype page, which contacted only its own host.

| Candidate | Version (date) | Licence | Maintained | Types | Size, min / gzip | Slingshot physics | Deterministic | Runs in node | Offline, outside hosts |
|---|---|---|---|---|---|---|---|---|---|
| Phaser | 4.2.1 (2026-07-09) | MIT | Phaser Studio Inc.; 418 commits in six months; 4.0 shipped 2026-04-10 | bundled declarations | 1,357 / 360 kB | bundled matter-js: rotation, constraints, sleeping, no continuous collision; Arcade bodies do not rotate | no claim; a fixed-step runner option | no: needs `window`; its own tests boot it on jsdom with mocks | the library contacts nothing and prints a banner (`banner: false`); its feature detection names `getUserMedia`; the `log.js` in its official project templates sends a request to gryzor.co on every dev and build run |
| KAPLAY | 3001.0.19 (2025-06-15); 4000 in alpha | MIT; a move to MPL-2.0 was proposed and withdrawn in August 2026 | a volunteer team; 80 commits in six months; no 3001 release in fifteen months | bundled | 184 / 67 kB | bodies do not rotate; no joints, no continuous collision | no | no | nothing found; its assets are inline |
| Excalibur | 0.32.0 (2025-12-23); 0.33 in alpha | BSD-2-Clause | one maintainer and Renovate; 139 commits; says breaking changes will occur before 1.0 | written in TypeScript | 484 / 124 kB | a solver with rotation; no joints; continuous collision marked as work in progress | no | no | nothing found; a boot message and a logo, both inline |
| LittleJS | 1.18.29 (2026-08-17) | MIT | one person, 547 of 549 commits | bundled | 62 / 23 kB; about 137 kB with its Box2D plugin | built-in collision ignores rotation; a Box2D 2.3.1 plugin (Emscripten) with joints, loaded as a classic script beside its `.wasm` | no | no, without a `window` shim, though it has a headless mode | nothing by default; a Newgrounds plugin that contacts newgrounds.io only if constructed |
| melonJS | 20.4.0 (2026-09-09) | MIT | effectively one person | bundled | 599 / 186 kB | built-in bodies do not rotate; official matter-js and planck adapters, 2026-08-23 | no | no | nothing found; a console banner |
| PixiJS with planck | 8.20.1 (2026-08-26) and 1.5.0 (2026-04-07) | MIT and MIT | Pixi a team, 105 commits; planck one person, 6 commits | written in TypeScript | 158 kB for all of Pixi's chunks, plus 45 kB | planck: Box2D 2.3 port, joints with limits, bullets, sleeping | planck: the same result for the same input on the same JavaScript runtime | planck yes, Pixi no | nothing by default; Pixi's optional Basis and KTX2 transcoders default to jsDelivr unless pointed at local copies |
| PixiJS with Rapier, deterministic build | 8.20.1 and 0.20.0 (2026-08-08) | MIT and Apache-2.0 | Dimforge; 124 commits in six months | bundled | 158 kB, plus 24 kB of JavaScript and a 549 kB `.wasm` | Rapier: joints, continuous collision on by default against fixed colliders, sleeping | cross-platform, with the caveat that our own `Math.sin` and `Math.cos` are not | the `-compat` build yes, at 786 kB with the wasm inlined; the plain build no | nothing; the `.wasm` would be served from our own build |
| Our engine with planck | ours, and 1.5.0 | ours, and MIT | ours | ours | 12 kB for the field, the three games and the page, plus 47 kB for planck and the slingshot | planck, as above | as planck | all of it | nothing; the page contacted only its own host |
| Our engine with matter-js | ours, and 0.20.0 (2024-06-23) | MIT | no commit since June 2024 | community declarations | plus 26 kB | no continuous collision | no claim | yes | nothing |
| Our engine with box2d3-wasm | ours, and 5.2.0 (2026-02-16) | MIT | two people; no commit since February | bundled | plus about 13 kB of JavaScript and a 153 kB `.wasm` | Box2D v3: continuous collision, joints, sleeping | Box2D says cross-platform from 3.1; not verified for this build | yes | nothing; fetches its `.wasm` beside itself |

Four findings change the earlier study. Rapier's deterministic build is about 24 kB of JavaScript plus a `.wasm` that is 1.5 MB, 549 kB gzipped, which the earlier study did not measure; it is the heaviest option on this list after Phaser, and it is worth that only if a physics result has to replay the same on every device. None of the full engines imports in node, so a game written in any of them is tested in a browser or not at all, where the three games here are tested in a plain node run. KAPLAY's bodies do not rotate, so it cannot build a slingshot without a second physics library, and matter-js, which Phaser bundles and melonJS adapts, has no continuous collision, so a fast ball can pass through a thin rod unless it is sub-stepped. And a same-machine repeat is available from all three physics libraries: a 48 body tower stepped 600 times in node repeated exactly in planck (0.19 ms a step), matter-js (0.03 ms, with its sleeping on) and Rapier's deterministic build (0.06 ms).

Sources: npm registry; github.com/phaserjs/phaser and its template-vite-ts `log.js`; kaplayjs.com and github.com/kaplayjs/kaplay pull 1131; excaliburjs.com and Excalibur issue 1161; github.com/KilledByAPixel/LittleJS FAQ; github.com/melonjs/melonJS; pixijs.com; github.com/piqnt/planck.js docs/pages/limitations.md; rapier.rs/docs/user_guides/javascript/determinism; github.com/dimforge/rapier typescript CHANGELOG; github.com/liabru/matter-js issues 5 and 820; box2d.org FAQ.

## The slingshot twice

`src/arcade/sling.ts` and `src/arcade/sling-phaser.ts` built the same two levels from the same data: the same rods, stars and see-saw, the same pull-to-speed rule, the same crops of the same shelf drawings, and the page switched between them. The table is the record of what the comparison showed; the Phaser build is gone, and our slingshot is `src/play/sling.ts`.

| | Our engine with planck | Phaser 4 with matter-js |
|---|---|---|
| Lines | 326 in `sling.ts`, of which 272 are code; the field and the pad are shared with the other two games | 281 in `sling-phaser.ts` and 74 in `raster.ts`, 308 of code; it imports the levels and the launch rule from `sling.ts` |
| Loaded | 47 kB gzipped for planck and the slingshot, over about 12 kB for the page, the field and the other two games; the page as a whole loads 282 kB, most of it the shelf and the pen that the Engine page (257 kB) and the Games page (245 kB) load too | 348 kB gzipped more, loaded only when its tab is opened |
| Art | 16 to 23 looks drawn by the pen, 4 ms in all; nothing rasterised by the page | 12 textures, 914 KB at a pixel ratio of two, 21 ms of rasterising before the first frame, with Andika embedded |
| Stacks at rest | stand still | jitter and, at the second level, dropped a star before the first shot until the level was made to start asleep, which is the usual way to build this game on matter-js |
| Hinge | a revolute joint with limits | a pin constraint with no limits; the ground stops the plank |
| Fast ball | planck's bullet flag | no continuous collision; we did not see the ball pass through a rod at these speeds, and we did not test faster |
| Camera, particles, shake | about 50 lines of the field, written once for all three games | Phaser's own: `startFollow`, `zoomTo`, `pan`, `shake`, a particle emitter |
| Reduced motion | the page's rule, the same for all three games | written for this game: the world is stepped to rest before drawing |
| Tests | 6 node tests, including the same shot twice body for body | none; Phaser does not load in node |
| Prints | the resting board is the page | no |

The feel was close enough that neither build is a reason to choose on its own. Phaser's camera tween and particles came for nothing and looked finished at once; ours are about fifty lines of the field and are shared by three games. Phaser's version was not shorter, because the texture pipeline, the font embedding, the reduced-motion path and the matter-js tuning were ours to write, and it is the only one of the two whose world cannot be checked in a test. We played both with a mouse and the keyboard in headless Chrome and with no child, so this says what the builds are like and not what a five year old will prefer.

## Phaser, compared and dropped

When the three tabs became one, the owner asked for one engine, and Phaser went with the Arcade tab: its slingshot, the texture pipeline in `raster.ts`, and the `phaser` dependency in `scratchpad/package.json`. We dropped it for the reasons the comparison above gives. It was a second runtime and a second way of drawing, so a shelf drawing had to be turned into a texture with the fonts embedded in it, 914 KB of textures for one level; its canvas does not print and a screen reader finds nothing in it; it cannot be imported in node, so its games could only be tested in a browser, and its slingshot had no tests; and it added 348 kB gzipped to what the page loaded. What it gave over our field for these genres was a camera tween, particles and input handling, which the field already has in a few hundred lines shared by every game. planck stays: it is a physics library under our own engine, reached through one file, and not a second engine.

## Recommendation

Keep one engine, which is now what we have. Build action games on our own, with the three pieces the prototypes use, and hold a physics library for the genres that need rigid bodies: planck now, for its size, its joint limits and bullets, and because it runs in node; Rapier's deterministic build if a physics outcome ever has to replay the same on every device, at the cost of 549 kB of wasm. Do not adopt Phaser, or any engine that owns the canvas, for these genres: it would be a second runtime and a second way of drawing, the printed page would not be the screen, and what it adds over the field for these three genres is a camera, particles and input handling, which the field already has in a few hundred lines. This is a recommendation and not a decision.

A split, our engine for lesson games and an engine for action games, was the obvious alternative and we do not recommend it now. The measurements leave the SVG field several times the headroom these genres need, and the split's cost is all the things above for every action game. What we do recommend is keeping the seam a split would use, so that one game that needs hundreds of moving things can have a different renderer without a second architecture. The seam is the `Frame`: a game is stepped from a `Pad` and returns `Happening`s (a cue, a puff, a shake) and a `Frame` of keyed sprites, marks and a camera, and it never touches the page. The field draws a `Frame` as composited SVG; a canvas field could draw the same `Frame` with bitmaps from `raster.ts`, or with the pen on `ink/surface.ts`, and the game would not change.

How it fits [structure.md](structure.md):

| Scratchpad | Destination | Why there |
|---|---|---|
| `src/engine/loop.ts` | `motion/loop.ts` | unchanged; the fixed step both kinds of game share |
| `src/engine/pad.ts`, from `src/arcade/pad.ts` | `motion/pad.ts` | the controls are plain data both sides import, and run in node |
| `src/engine/scene.ts`, with the `Frame` and the `Happening`s that were in the pad | `motion/scene.ts` | what the stage and the field draw, as data |
| `src/engine/bodies.ts`, the planck calls that were inside the slingshot | `motion/bodies.ts` | the one file that imports a physics library, so the library can be swapped behind it; `boundaries.ts` gains one line allowing that package there and nowhere else |
| `src/play/snake.ts`, `road.ts`, `sling.ts` | `games/snake.ts`, `games/road.ts`, `games/sling.ts` | action games are games; they import `motion/` and a part's id, never the page |
| `src/engine/stage.ts`, the field merged into the stage's file | `ui/stage.ts` | the stage of [engine.md](engine.md) and the field are one concept, keyed drawings moved by transforms, and one file holds both, drawing the same marks |
| `src/art/games.ts`, from `src/arcade/art.ts` | `parts/` | the road, the ground, the sling and the puff are on the shelf, with the tap the jugs needed |
| `src/arcade/raster.ts`, `sling-phaser.ts` | removed | they were the comparison, and went with Phaser |
| `src/pages/play.ts` and `play-action.ts`, from `src/pages/arcade.ts` | `apps/kids/game.ts` | the page around a game: which game, the loop, devices into a `Pad`, sound |

The road is `road.ts` because `race.ts` is already the turn-based race mechanic, which is the same mathematics and close to the reduced-motion form of this one; the two could become one game with two ways of playing, and that is an open question below.

## What the prototypes proved and did not

That the SVG field holds for these genres, with numbers and a trace, on one fast machine with throttling. That a physics game can keep the drawings, the grid and the node tests. That reduced motion can be a rule about time rather than a switch per animation, and that it gives each game a turn-based form for free. That every drawing the games need is on the shelf except four small ones, which are now there. That the learning can sit in the move for all three genres, with the limits said above.

What none of it proved. How any of it feels to a child: nobody under ten has played it. A real tablet, Safari on an iPad, or a finger on glass: all of it was driven with key events and a mouse in headless Chrome. Sound was never audible, only cued. Memory on a small device. Whether the bead string's decoys are fair to a six year old who has not met counting in threes, or whether the road at the second level is too hard without a tick every five. Whether a physics result will replay the same across devices, which planck does not promise and the record does not need, since what it records is the shots and the stars that fell.

What playing it changed. A cropped sprite first showed the whole drawing around the crop, because the page lets drawings overflow their box so a car's arrow can reach past it; a crop now clips. The first road needed a speed of its own, because a child cannot hold go and press a lane button with one finger. The string first grew one bead a move after a number was picked up, which left it shorter than the count for a moment and at the win; it now grows at once, back along the squares it has just left. The see-saw first held a star at one end and tipped it off before any shot; the star now sits between two cubes and waits for a hit. And the Phaser level dropped a star on its own until it started asleep.

## Order of work

The first two are done in the scratchpad: the loop, the pad and the field are in `src/engine/` with the stage, so the lesson games and the action games share one layer of drawings, and planck is behind `src/engine/bodies.ts`. The line in `boundaries.ts` waits for the move to the root. What is left:

1. A replay: the seed and the `Pad` each step, which is the record [engine.md](engine.md)'s second gate asks for, and a test that replays a recorded game to the same end.
2. The grade ladders in the table above as levels, starting with the road's fractions and the bead string's count with a rule.
3. Play it with children on a tablet, and measure the field on the tablets families have, before building a fourth genre.
4. `ink/surface.ts`, when a game needs hundreds of moving drawings, drawn with the pen onto a canvas under the same `Frame`.

## Open questions

Whether the road and the Games page's race should be one game with two ways of playing, since the reduced-motion road is close to the turn-based race already.

Whether the slingshot should record shots on the screen at all. The count is in the text form now and not on the paper.

Whether an action game gets a nudge after twenty seconds, as [activities.md](activities.md) gives activities, and what it would point at when there is no move to point at.

Whether the harder road should keep its ticks every ten, which make the question easier, or drop them, which makes it the task the research uses.

Whether a slingshot shot should be quantised, an angle in fives and a pull in halves, so the keyboard and the finger make the same shots and a record replays exactly on another device.
