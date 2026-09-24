# Engine

Status: proposed, September 2026, and since built: every game now runs on one engine, whose plain
logic is in the root's `engine/motion/`, whose page-facing stage is `engine/ui/stage.ts`, and whose
models, mechanics, bindings and prover are in `school/games/`. It is played in one prototype Games
tab, `scratchpad/play.html`, with its prototype page code in `scratchpad/src/pages/`. The section
"One engine and one Games tab" below says what that is; the rest is the study that led to it,
written when three games were played by hand on a page of their own. It is the third document about
the games and it changes nothing in the first two. [activities.md](activities.md) owns the model and
the promise, [games.md](games.md) owns the designed set, and this one answers the question the owner
put after playing what exists: the games are provable and they play like clicking boxes, the set is
meant to keep growing, and the building blocks should be shared rather than a pile of one-offs. It
says what real control means for a five to ten year old, whether anything in the TypeScript space
should sit under it, what we would build ourselves, which pieces every game draws on, and what one
game rebuilt with hands on it proved and did not.

## Summary

The games feel like clicking boxes because every one of them is played through a tray of buttons, and the tray is there for a good reason: a button is a move the mechanic listed, so the prover's guarantee holds for the game a child actually plays. We keep that and change where the button comes from. A drag, a flick, a push along a rail or a pull on an arc is a way of choosing among the moves the mechanic already lists, resolved against the drawing's own anchors, and it can no more invent a move than a button can. The step between two positions is then the engine's job: a spring that is a pure function of time moves a piece from where the hand let go to where the position says it now is, and a drawing is drawn again through the same seeded pen at values on the way from the old setting to the new, so a beam swings and a jug fills without the drawing knowing. The model stays discrete and provable, the view becomes physical, and paper gets the resting picture, which is the one the position describes.

The engine question has a short answer and a long one. The short answer is that nothing in the field renders the SVG we own: every full engine and every canvas library owns its renderer, and adopting one would mean giving up two hundred and forty drawings, the printed page and the DOM a screen reader reads, in exchange for a loop, an input layer and tweens that come to a few hundred lines. The long answer is the three options below, of which we recommend the second: a small engine of our own around SVG and the grid, about two thousand lines with three games bound to it, with a deterministic physics library held in reserve for the few games whose model is itself a simulation. Three games were rebuilt on those primitives, chosen because they are three different kinds of hand: the balance is a free drag to a target, the yard is a push along a rail, and the circuit is an aim let go with a ghost of where the car will land. The mechanics and the prover are the ones in `src/play/`, untouched. Every move can also be made from the keyboard, reduced motion loses nothing, sound is a named cue, and a test walks every reachable position of every level of every game and asserts that no gesture can resolve to a move the mechanic did not list.

## One engine and one Games tab

The games were first spread over three tabs, each built at a different time: the Games tab played nine mechanics from a tray of buttons, the Engine tab rebuilt three of them with real controls on this document's primitives, and the Arcade tab held the three action games of [arcade.md](arcade.md) and the slingshot a second time in Phaser. The owner found three tabs for one set of games confusing, and asked for one engine and one tab. This section describes what that became, in September 2026. The rest of the document is the study that led to the engine, kept with its figures, and it points here where something it describes has since changed.

### The engine

The garden games add reusable `rolling.ts` (bounded rolling disks, surface friction, wall contacts, slow cup capture), `vehicle.ts` (steering, acceleration, braking and lateral tyre grip), and physical material profiles. Course layout, checkpoints, winning conditions and difficulty remain in `school/games/`; artwork remains on the drawing shelf. Physics replay evidence is sampled and does not claim exhaustive solvability.

The engine is in the root. The plain logic is in `engine/motion/`, under the root's rules and tested
in `engine/motion/__tests__/`; `engine/ui/stage.ts` is the only part that touches the page. The
hands-on controller and its targets are in `school/games/`, beside the bindings that use them. It
holds no game logic: no engine file names a move, a level or a drawing, and every file but the stage
runs in a plain node test.

| File | What it holds | Lines |
|---|---|---|
| `engine/motion/loop.ts` | the fixed-step loop and the ticker that drives it from a browser's frames or a test's own clock | 128 |
| `engine/motion/spring.ts` | closed-form damped springs, and the five presets the games use: snap, back, swing, pour and drive | 77 |
| `engine/motion/timeline.ts` | named tracks and cues evaluated at a time, the easings, and `collapse`, which is what reduced motion plays | 76 |
| `engine/motion/gesture.ts` | the recogniser: pointer samples in, tap, hold, drag and flick out | 151 |
| `engine/motion/geometry.ts` | points, rectangles and circles in squares, paths, and `atLeast`, the 44 pixel floor as a shape | 102 |
| `engine/motion/trace.ts` | the input log beside the move log | 83 |
| `engine/motion/flight.ts` | a thing in flight under gravity in closed form: where it is at a time, where it comes down, the dots of its path, and a pull turned into a throw, and a lob from one point to another with its top a given height over the higher end | 87 |
| `engine/motion/camera.ts` | a camera in squares: the zoom that fits a world, keeping the view inside it, looking ahead of a moving thing, easing towards a wanted view at any step length, and `seen`, the part of a far or near layer in view | 81 |
| `engine/motion/spawn.ts` | the seeded generator every game draws its chance from | 13 |
| `engine/motion/tune.ts` | a tuning table: each number a game feels by, with its range, step, unit and the reason it is that number | 62 |
| `engine/motion/steer.ts` | steering, as a flock is steered: arrive, flee, keep apart, keep together, go with the others, wander from a seed, and turn towards a wanted velocity as fast as a mover can | 103 |
| `engine/motion/glide.ts` | one-button flight: a pull up while held, a fall that is always there, the fastest climb and sink, and a forward speed a climb spends and a dive gives back; and a floor and a ceiling that turn a flyer back | 60 |
| `engine/motion/burst.ts` | bursts of small things that fly apart and fade, as plain data stepped on the fixed clock from a seed, in a pool that keeps at most so many | 101 |
| `engine/motion/drop.ts` | a drop that bounces to rest, in closed form: where a thing let fall is at a time, each moment it meets the floor, and exactly on the floor once it is still | 58 |
| `engine/motion/flow.ts` | a pour's flow shared by two levels: how much has moved by a time as the flow starts, holds and stops, so what leaves one vessel arrives in the other at the same moment and the two always hold what they held | 41 |
| `engine/motion/sway.ts` | a carried thing's sway: a thing held from above, stepped from the hand's acceleration as a pendulum, leaning back when the hand sets off and settling when the hand is steady | 35 |
| `engine/motion/lever.ts` | a plank on a pivot: the turning effect of the loads along it, the angle it rests at for a difference, a swing towards that angle and the knock of a landing, and where a point on the turned plank is | 70 |
| `engine/motion/cuts.ts` | a length cut into pieces, how far each piece is from its share, and whether a share is fair within a distance | 30 |
| `engine/motion/slide.ts` | a thing slid to rest by damping: how far it goes for a speed, the speed for a distance, and where it is on the way | 26 |
| `engine/motion/stroke.ts` | an oar stroke: the timing of a catch against the last drive, the push a drive gives for its length and timing, the glide between strokes with the water and a current, how far a glide carries, and the meeting of a bow with a jetty | 73 |
| `engine/motion/rail.ts` | vehicles on one line: hooked below a speed, knocked and rolling above it, a shove without a hook after letting go, stops and gaps nothing passes, and the events of a step | 319 |
| `school/games/pieces.ts` | drop targets with a reach and a flick, the nearest target, and `settle`, which keeps an identity per piece where a model keeps only a count | 120 |
| `school/games/hands.ts` | the controller every hands-on game shares: a free drag, a push along a rail and an aim let go, judged against targets that carry the mechanic's own moves, and the surface it asks of the stage, and what a session may add to a move: its beat, the finish after a winning move, and where the win's star lands | 327 |
| `scratchpad/src/engine/pad.ts` | what an action game reads: a direction, the big button, a brake, a pull, and a finger held on the field and where it lifted, whether they came from the keys, a swipe, the buttons beside the field, a touch or a gamepad | 95 |
| `scratchpad/src/engine/bodies.ts` | rigid bodies for a game whose model is a simulation, and the one file that imports planck: boxes at any angle, balls, a ground, a sprung hinge, sensors, hits with how fast they closed, a push, a push at a point on a body (the water under a raft's end), live gravity, bodies that never turn, damping, and a body put where a level or a test wants it | 219 |
| `scratchpad/src/engine/scene.ts` | what the engine draws, as data: a scene of keyed parts for a turn game, a frame of sprites under a camera for an action game, the marks both carry, and the happenings a step asks for; a part may also turn about a pivot, squash and grow about its foot, be drawn cropped, and say where a hand holds it | 159 |
| `scratchpad/src/engine/beat.ts` | a move's presentation as data: tracks that move a part's place, turn, squash, size or settings on the stage's clock by an ease, a spring, a drop, a flight or a flow, with the settings a part switches to, parts only there while it plays, marks, bursts and cues; a score to write one, the pose of every part at a moment, reduced motion's version of a beat, one beat after another, and the checks that a beat starts on the scene before a move and ends exactly on the scene after | 253 |
| `scratchpad/src/engine/cues.ts` | the ten named sounds a game may ask for | 30 |
| `scratchpad/src/engine/stage.ts` | the only file that touches the page: the stage draws a scene, keeping a part while its key survives, gliding it when its place changes and drawing it again at spring values when a setting changes; the field draws a frame, each look drawn once and moved as a layer the browser composites, on layers at depths under a camera with a fixed layer over them, with bursts and a shake; both ink the same marks; the stage also plays a move's beat and is left on the scene it ends on, turns and squashes parts, sways a carried part from where it is held, and throws bursts over the sheet | 1028 |

`animation.ts` sits in the same folder and is the idle motion of drawings described in [animation.md](animation.md). It is other work and not part of the games engine.

Merging the Engine tab's primitives with the Arcade's pad and field changed six things in them. The stage and the field are one file and draw one type of mark, so a ring round a target, an aim, a crash and the dots of a flight are drawn the same way over a board and over a field. The stage can draw a part at a size of its own, which is how the rabbit on the number line is three squares across, and it lays parts that have no place in a row, which is how a puzzle's board is drawn on it. The hands controller no longer imports the games' model: it knows only whether a position is won and reaches the page through the stage's surface, so a test drives it against a stage of its own. The balance's identity for props became `settle` in `pieces.ts`, and the till and the plates use it too. planck is behind `bodies.ts`, so the slingshot never sees a planck type, and the world builds its bodies in the order the slingshot did, so its tests passed unchanged. And a handle smaller than a finger is grown to the 44 pixel floor when a press is tested, which the pieces on a plate needed at a phone's square size.

### Every game on it

The games live together in `school/games/`. Every game is one entry in `GAMES` in `catalogue.ts`,
declared in the one shape in `game.ts`: an id, a title, a group, a hint, and its levels, each a title
and the grades it is for. A turn game's level adds the round the prover walks, and an action game's
level adds its goal. A puzzle is a mechanic and its tray, a hands-on game is the same with a binding
that says which parts a hand picks up and which of the mechanic's own moves a landing means, and both
run on one runtime with the prover as their gate. An action game is gated by named invariants and a
seeded replay, the second gate below.

| Game | Group | Levels | Engine pieces | Gated by the prover |
|---|---|---|---|---|
| Spell the picture | puzzle | 4 | stage, cues, trace, timeline | yes |
| Find the rule | puzzle | 6 | stage with a beat, hands (free drag, a tap), bursts, cues, trace, timeline | yes |
| See-saw | action, full-bleed | 6 | loop, pad (a held finger), a field grown to the room, lever, sway, flight, bursts, cues, tuning | no: invariants and a seeded replay |
| Rabbit crossing | action, full-bleed | 6 | loop, pad (a held finger), a field grown to the room, flight, bursts, cues, tuning | no: invariants and a seeded replay |
| Penny shove | action, full-bleed | 6 | loop, pad (a held finger), a field grown to the room, bodies with no gravity, slide, bursts, cues, tuning | no: invariants and a seeded replay |
| Row to the jetty | action, full-bleed | 6 | loop, pad (a held finger), a field grown to the room, camera, stroke, bursts, cues, tuning | no: invariants and a seeded replay |
| Shunting yard | action, full-bleed | 6 | loop, pad (a held finger), a field grown to the room, rail, bursts, cues, tuning | no: invariants and a seeded replay, with every still yard a position the prover listed |
| Cut the cake | action, full-bleed | 6 | loop, pad (a held finger), a field grown to the room, cuts, bursts, cues, tuning | no: invariants and a seeded replay |
| Measure it out | hands on | 6 | stage with a beat and a sway, hands (free drag), flow, drop, flight, springs, bursts, a stream mark | yes |
| Take the corner | hands on | 4 | stage, hands (aim), pieces, springs, marks for the ghost and the crash | yes |
| Bead string | action | 2 | loop, pad, field, cues | no: invariants and a seeded replay |
| The road | action | 2 | loop, pad, field, cues | no: invariants and a seeded replay |
| Slingshot | action | 2 | loop, pad, field, cues, bodies, flight, camera, tuning | no: invariants and a seeded replay |
| Shut the box | hands on | 5 | stage, hands (free drag, flick, a tap), pieces, springs | yes |
| Rafts | action, full-bleed | 6 | loop, pad (a held finger), a field grown to the room, bodies with gravity and a push at a point, flight, sway, scenery, bursts, cues, tuning | no: invariants and a seeded replay |
| Gone fishing | action, full-bleed | 6 | loop, pad (a held finger), a field grown to the room, a live drawing, cues, flight, springs, steering, scenery, bursts, tuning | no: invariants and a seeded replay |
| Paper plane | action | 4 | loop, pad (a held finger, go and brake), field with layers at depths and a fixed layer, cues, glide, camera, scenery that goes round, bursts, tuning | no: invariants and a seeded replay |

Every level of every turn game keeps the promise, and a test walks every reachable position of every level of every hands-on game and asserts two things: that nothing a hand can do resolves to a move the mechanic did not list, and that every move the mechanic offers has a hand that plays it, so the hand is never poorer than the tray. The levels and their figures are listed in [games.md](games.md).

Five turn-based games moved onto real controls after the three this document first rebuilt. The number line is an aim let go along a line: a rabbit stands on the number the child is on, the numbers the cards in hand reach are ringed, and dragging draws the hop with the card written over it, so +5 is a hop of five ticks before it is played. The till is coins and notes dragged from the drawer to the counter and back, each one a drawing of its own. The plates are pieces dragged from the tray onto a plate, and the pieces on each plate lie under it, which the puzzle's board never showed: a half and two quarters as different pieces making the same share. The jugs are poured by putting one jug on another, filled by holding one under a tap, which was drawn for this and is on the shelf, and tipped away onto the flowers, with the water rising and falling through the jug drawing's own level. And the straight, which was the circuit's first level, is its own game with both of its versions. Each cost a binding of between 120 and 180 lines and no new kind of hand.

Two stay puzzles. In the rule machine the question is which number to feed in, and the machine does the rest. It is now played on a machine, as the section on beats below describes: a ball can be dropped into its hopper or tapped, and a card posted into its slot, while the tray is as it was, so it is still a puzzle, because none of that changes the thinking. In the sound boxes a tile goes in the next box whatever box a hand aimed at, so a drag would add a way to be wrong without adding a choice; it would take a tile drawing per sound, the boxes as targets of which only the next accepts, and a copy of the tile left in the rack, which `settle` does not do yet.

### Pieces a game is assembled from

The owner asked for new action games that are real games, beautiful, and cheap to add to, so that the next one is mostly assembly. The sheepdog, the fishing and the paper plane were built for that, and they replaced the rocket, the peg board and the see-saw, whose code was removed; their eleven drawings stay on the shelf, because the owner liked them as covers. What each new game is made of is three things, and the engine gained the pieces that let them be only that.

A rules file, in `school/games/`, is the game's state, a `step` from a `Pad`, a `frame`, the
sentence for the text form, and the level table beside them: `rafts.ts` is 392 lines, `cast.ts` 357
and `plane.ts` 281, levels and scene included. A level table is plain data a test can read: the sheep
and the pens with their boards and their rule, the fish in the sea with their weights and tags, the
pan's size and the weight to make, or the pole's marks and each gate's flag and hoops. A scene
composition is a list of shelf drawings with where each stands, and the rows, lengths and crossings
`scenery.ts` places for it.

The pieces, by what a game asks for:

- Bodies with gravity, drag, restitution and friction, and collisions between balls and boxes at any angle, are planck behind `bodies.ts`, which is deterministic on one runtime and so enough for a seeded replay. The sheepdog was the first game to use it with no gravity, sheep and a dog as balls that never turn and fences as boxes at any angle, and Rafts, which replaced it, uses it with gravity: rafts as boxes the water pushes up at each end, and sheep as upright balls that stand on them. `moveTo` puts a body where a level or a test wants it.
- Steering, in `engine/motion/steer.ts`, is the behaviour of a thing that moves by itself: a sheep flees the dog, keeps near the others and goes the way they go, and grazes on a seeded wander; a fish turns towards a hook; the dog runs to a finger. Each behaviour is a wanted velocity and a mover turns towards the blend as fast as it can, so a new creature is a few weights.
- Flight is two pieces: `flight.ts` for a thing thrown (a ball from a sling, a fish swung up onto a pan), and `glide.ts` for a thing flown with one button (the plane; a bird or a balloon would be the same four numbers).
- Effects are `burst.ts`: dust, sparkles, drops of water and bubbles, each a kind of mote with its own life, spread and fall, thrown by a step as a happening (`{ burst: { kind, x, y, n } }`) and drawn by the field from a shelf drawing (`arcade.puff`, `fx.sparkle` in four colours, `fx.drop`, a bubble cut from `bubbles`). The pool keeps at most sixty-four and retires the oldest, and reduced motion throws none.
- Sprites on the field can now stand on a line by their foot (`stand`), so a scene places a drawing on the ground without knowing how tall it is; grow or shrink about their centre (`scale`) for a thing that pops in; fade (`alpha`), which a far row uses to look far; and be drawn again whenever their settings change (`live`), which is how the fishing scale's needle swings through its readings and settles with no animation code in the drawing. Squash, rotation and a crop were there already, and a take is a drawing's settings.
- Layers: a sprite with a `depth` goes on a layer the camera moves by that share of its travel across, far hills at a third, near grass at one and a half, and a `fixed` sprite goes on a layer over the world that never moves, for a readout kept in sight such as the plane's row of stars. `seen` in `camera.ts` says which part of a layer is in view, so a scene fills only that.
- The camera follows with `follow` and `lead`, zooms, and at a finish leans in on the moment for a second and a half and settles back; the shake is the field's, and like every other motion it is left out under reduced motion.
- Input: a game that sets `touch` is given a finger or the mouse held on the field as a place in the world (the dog runs to it, the hook goes to it, the plane climbs while it is down), besides the directions, the big button, the brake and a pull. Every game draws a ring where a finger is held, filled once the dog or the hook has reached it, so every touch is answered at once.
- The tuning table is `tune.ts`, one per game, shown as sliders in the review drawer. Sound is a named cue; `ring` and `splash` joined the eight, and the page maps each to a note.
- Scenes are `scenery.ts`: `row` stands things along a line at a depth, chosen by how often each comes up and strayed a little from a seed, and repeats every lap of a course that goes round, so the plane's world wraps with no seam; `lengths` draws a ground, a sea or a meadow in lengths that meet; `crossing` sends geese, a gull, an eagle or a turtle across now and then, as a function of the time.

Reduced motion keeps the rule the action games already had, time moves only when the child acts, with one change: a press is worth its steps with the hands as they were, and what it started then settles with nothing held, so a key still down or a finger still on the glass does not count twice. The sheepdog moves the dog a third of a second a press and lets the flock settle; the fishing moves the hook the same and lets a catch land and the needle stop; the plane climbs, glides or dives for half a second a press.

None of this is only for action games. A board played by hand can stand its drawings on a line, fade what is far, throw sparkles where a piece lands, pop a sticker in with `scale`, redraw a gauge as it swings with `live`, keep a readout on a fixed layer, and take its backdrop from `scenery.ts`; the stage still draws the board itself.

A fourth game is then a rules file with a level table and a scene: choose the verb from the pad (a held finger, a pull, a direction or one button), move things with bodies, steering, flight or glide, put the maths in what the verb is aimed at, compose the place from the shelf with `scenery.ts`, throw bursts and cues on every touch and at the finish, and hold it with named invariants and a seeded replay in `test/games.test.ts`, as the three here are.

### A move as a beat

The owner found the puzzles and hands-on games beautiful and thin next to the action games, and asked for them to have the action games' quality, control, levels and mechanics. An audit found every board a diagram on grid paper rather than a place, and every move landing as a glide or a morph with no weight, so nothing fell, tipped, poured or bounced. We rebuilt three of the games end to end on the pieces in this section, the jugs, the balance and the rule machine, so that both the hands-on path and the puzzle path are proved on them, and wrote plans for the other eight in [games.md](games.md), under "Plans: the other eight".

A move's presentation is now data. When a move is played the model is already at its next position, the words and the tray change at once, and the session is asked for a beat with `beat(from, to, { was, now, hand, seed })`, where `was` and `now` are the scenes before and after the move and `hand` is where a carried part was let go. A beat, in `scratchpad/src/engine/beat.ts`, is a list of tracks on the stage's clock. Each track moves one channel of one part (its place across or down, its turn, its squash, its size, or one of its numeric settings) from one value to another by a named motion: an ease, a spring that leaves with a speed of its own, a drop that bounces to rest, a flight under gravity, or a flow that starts and stops as a pour does. Beside the tracks a beat lists the settings a part switches to at a moment (a tap turned on, a row written into a table), where a part turns about and how high it is stacked from a moment, parts that are on the board only while it plays, and the marks, bursts and cues. A `score` writes a beat a line at a time, and `poseAt` says what every part is at any moment of it. The stage plays a beat by drawing each frame from `poseAt`, and at its end it shows the scene after the move, so the board is left on the model's position whatever happened on the way. A beat that is still playing is finished at once when another move is played, a hand presses the board, a move is taken back or the window changes size, so nothing waits on a beat.

Two checks in `beat.ts` hold the promise that a beat ends on the position. `mismatches` lists every part whose pose at a beat's end is not its pose in the scene after the move, and `jumps` lists every part whose pose at its start is not its pose in the scene before, or that leaves the board without being one of the beat's own parts. The games' tests run both over every move from the first forty to sixty positions of every level of the three flagships, with the finish played after a winning move, and they play a winning line twice to check that the same moves and seeds give the same beats and that another seed changes how a move looks and nothing about where it ends. Under reduced motion `atRest` leaves a beat's sounds and nothing else, and the scene after the move is drawn at once, which is what the stage did before.

The motion a beat names comes from four pure pieces added to `engine/motion/`, each tested in `engine/motion/__tests__/`. `drop.ts` is a drop that bounces to rest in closed form, with the moments it meets the floor, so a squash or a knock can be timed to them. `flow.ts` is a pour's flow shared by two levels, so what leaves one jug arrives in the other at the same moment and the two always hold what they held. `sway.ts` is a carried thing hanging from the hand as a pendulum, stepped from the hand's acceleration. And `lob` in `flight.ts` is the throw from one point to another with its top a given height over the higher end.

The stage gained what the beats and the hands needed. A part can turn about a pivot of its own (`angle` and `pivot`), squash and grow about its foot (`squash` and `scale`), be drawn cropped (`crop`), and name where a hand holds it (`hold`), which makes it sway from that point while it is carried and come back upright when it is let go; as it is let go the stage moves it by what the change of pivot would shift it, so the drawing does not jump. A part the hand lets go glides home with the speed it was let go at. Bursts are thrown over the sheet as they are over the field, from the same pool and the same drawings, and a line mark can be a `stream`, a band of water as wide as it is running, edged in ink.

The turn runtime in `scratchpad/src/pages/play-turn.ts` asks the session for each move's beat, plays the session's `finish` after a winning move, and lands the win's star where the session says once the move has been seen. A level may carry an `intro`, the guide's authored line for it, which is shown under the goal until the first move while the goal itself is on the board: the order taped up in the kitchen, the card on the stall, the machine's question mark. A board with handles takes the keyboard. With the board chosen, the arrow keys go from one thing to the next, left to right, and Enter picks it up; then the arrow keys go from one place it may go to the next, with the rings and the preview a hand gets, and Enter puts it down there, which plays the same moves the hand and the tray play, while Escape puts it back. A square may now be as small as six pixels, so a wide scene shrinks to fit a phone held upright rather than running off it, and a handle is still grown to the forty four pixel floor when it is pressed. The board is sized after the tray is drawn, a tray of more than ten moves, and every tray on a phone, packs its chips closer while keeping each at forty four pixels, and on a phone a board whose tray still pushes the page past the window gives up what it overflows by, which is what fixed shut the box running off the bottom of the screen.

We have not measured the frame cost of a beat. A beat draws a part again on each frame that one of its settings changes, which for the jugs is the two jugs while the water moves and for the rule machine is the machine while its lever and cogs move, as the morphs did before.

### One direction, drawn full-bleed

The owner found every game but the slingshot and the road dull, and the games rebuilt since follow one direction, which [games.md](games.md) sets out under "Built since: one direction for every game". Three things in the page carry it. An action game may set `bleed`, and the page then hides the pad, the tray and the help on the keys, lays the line about what just happened and the few buttons over the field, and fits the field to the whole room under the bar. `Field.fit` takes a fourth argument that grows the view past what the game asked for, up to the size of its world, so a wider or taller window shows more sky and grass round the same play rather than blank paper, and `Field.draw` then keeps the camera inside the world, including when the grown view is exactly the world's size, where the camera is the world's centre (the yard's art pass found a world that tall drawn with its last rows blank). And an action game may set `plays` to the activity whose versions it now plays, with the level each version opens, so `levelOf` still opens a link that names the activity, as the see-saw does for `weigh.same-weight`, the cake for `share.fair-shares` and the penny shove for `pay.make-the-amount`. The slingshot has `bleed` too, with sky laid over each level so that a grown view has world to show. A game may also set `listed` to false, which keeps it off the Games tab's drawer while its address and its activity's links still open it; the see-saw and the cake are kept that way, since [games.md](games.md) under "The sharper bar" found them lesson items rather than games, and the page opens the slingshot when no game is named. The ring mark also takes `solid`, which draws it whole rather than dashed, for a ring too small for a dash to read, such as the penny shove's count of the pieces on its felt.

The rebuilt games move things with three new pure pieces in `engine/motion/`, each tested in `engine/motion/__tests__/`. `lever.ts` is a plank on a pivot: the turning effect of the loads on it, the angle it rests at, which grows with the square root of the difference and is level only at nought, a damped swing towards that angle, the knock a landing load gives it, and where a point on the turned plank is. `cuts.ts` cuts a length into pieces and says how far each piece is from its share and whether a share is fair within a given distance. `slide.ts` is a thing slid to rest by damping, whose distance is its speed over the damping, which is exactly how far a world stepped at a fixed step with that damping carries it, so a game can draw where a shove will stop before it is made.

### The tab

`scratchpad/play.html` is the only Games tab. The picker is a row per group, puzzles, hands on and action, and every game in it shows all of its levels as buttons at the 44 pixel floor. The address names a game and a level, `play.html?g=shunt&v=2`, or an activity and a version the way the journal's links do, `play.html?a=weigh.same-weight`, and may carry a move log to replay. The Engine and Arcade entries are gone from the top bar. `engine.html?g=` and `arcade.html?g=` are now small pages that open the same game in the Games tab, so the links in these documents and in older reports still work. Two ids changed on the way: the straight became `straight` and the circuit kept `race`, so `engine.html?g=race&v=0` opens the straight and a higher level opens the circuit one level down; and the arcade's `race` is `road`, and its `phaser` opens the slingshot.

### Frame cost

We measured in headless Chrome on the development Mac at a device pixel ratio of two, at normal speed and with the CPU slowed four times, which is the stand-in for a mid-range tablet that [arcade.md](arcade.md) uses. The busiest game is Measure it out while a jug is poured into another: both jugs are drawn again at every frame of the spring, at 0.29 ms a render at normal speed and 1.59 ms at four times slower, so about 3.2 ms of a frame at four times, with no frame over 20 ms and the worst at 17.3 ms. The balance's beam coming level is 242 renders at 0.35 ms each at normal speed, with no frame over 20 ms. The busiest action game is the slingshot's second level in flight, with 23 drawings on the field and 15 of them moving layers: the page's own work is 0.25 ms a frame at normal speed and 0.70 ms at four times, with no frame over 20 ms. The road and the bead string are lighter. In a production build the Games tab's own chunk is 83 kB gzipped, of which about 46 kB is planck, which every game loads today and which could be loaded only when the slingshot is opened. We have not measured a real tablet.

The three games added for the owner's second round were measured the same way, at 1180 by 820 pixels, with the mouse held on the field and moved for eight seconds. The page's own work in a frame, at normal speed and at four times slower: the sheepdog's fourth level, with fourteen sheep, a dog and the fences stepped by planck and 73 drawings on the field, 0.54 and 1.39 ms; the fishing's third level, with its scale drawn again while the needle swings, 0.40 and 0.99 ms; the plane's fourth level, with five layers and a course that goes round, 0.36 and 1.04 ms; and the slingshot's second level, for comparison, 0.12 and 0.37 ms. At four times slower one to three frames in a thousand went over 20 ms, the worst at 41.6 ms in the fishing when a fish was first drawn in flight, and none of the games dropped frames otherwise. We have not measured a real tablet.

### Phaser

Phaser was compared on the slingshot and dropped when the tabs became one, with its code and its dependency. The comparison and the reasons are in [arcade.md](arcade.md). planck stays, since it is a physics library under our own engine rather than a second engine.

### Where it goes

Mapped to the decided layout in [structure.md](structure.md):

| Scratchpad | Destination | Why there |
|---|---|---|
| `src/engine/` but for `stage.ts`, `pieces.ts` and `hands.ts` | `engine/motion/` | the plain logic: loop, spring, timeline, gesture, geometry, trace, flight, camera, spawn, tune, steer, glide, burst, drop, flow and sway have moved; pad, bodies, scene, beat and cues are still to come. They import nothing outside the module except planck, which `bodies.ts` imports and `motion`'s row in `boundaries.ts` will need to name among its packages. The check governs packages by module rather than by file, so it cannot keep planck to `bodies.ts` alone |
| `src/engine/pieces.ts`, `hands.ts` | `school/games/pieces.ts`, `hands.ts` (moved 22 September 2026) | the hands-on games' shared controller and the contract their bindings implement, which nothing but the games uses (decided 13 September 2026) |
| `src/engine/stage.ts` | `engine/ui/stage.ts` | the stage and the field are one concept, keyed shelf drawings moved by transforms, and the only code that touches the page |
| `src/play/` | `school/games/` (moved 22 September 2026) | the one game shape and the one list, the prover and the record, one file per mechanic, one binding per hands-on game and one file per action game. They import `motion/` and a drawing's id, never `ui/` |
| `src/art/games.ts`, `action.ts`, `playfield.ts` | `engine/parts/` | the road, the ground, the sling, the puff and the tap; the rocket, peg board and see-saw pieces; the sheep, its pen, the meadow, the sea, the fish, the hook and float, the catch scale, the hoop, the pole with a scale, the sparkle and the drop, which are on the shelf like every other drawing |
| `src/play/scenery.ts` | `school/games/` | how a game's place is composed from the shelf, which only the games use |
| `src/pages/play.ts`, `play-turn.ts`, `play-action.ts` | `apps/kids/game.ts` | the page around a game: the picker, the two runtimes, devices into a pad, sound and the figures |

`scene.ts` goes to `motion/` with the rest because it is what `motion/` draws. When `engine/scene.ts` is built for lessons, whether the two become one is a question for then.

## What exists, played

All ten activities and all twenty seven versions were played to a win with a move taken back on the way, in the page and from a script over the same model, and the figures below are the prover's own from that run.

| Activity | Versions | Positions | Shortest win | Dead ends | Gate figure |
|---|---|---|---|---|---|
| Balance the pans | 2 | 15, 134 | 3 | 0 | patience 3.3, and not half the time |
| Land on the number | 2 | 31, 32 | 3 | 22, 11 | not half the time |
| Find the rule | 3 | 151 | 2 | 0 | luck 11.1% |
| Stop on the line | 2 | 54, 45 | 7 | 2, 0 | not half the time |
| Take the corner | 2 | 1470, 1251 | 15, 13 | 16, 12 | not half the time |
| Shunt the carriages | 3 | 36, 48, 192 | 4, 5, 10 | 0 | not half the time |
| Measure it out | 3 | 14, 14, 16 | 2, 4, 6 | 0 | patience 4.5, and not half the time |
| Make the amount | 3 | 68, 115, 450 | 4, 4, 7 | 0 | not half the time |
| Share it out | 3 | 32, 79, 139 | 6 | 0 | not half the time |
| Spell the picture | 4 | 259, 259, 1555, 1555 | 3, 3, 4, 4 | 0 | not half the time |

Every version keeps the promise, and the prover takes between one and twenty milliseconds per version in node. That is the part to keep.

The runtime in `src/pages/play.ts` is the other part, and it is shaped exactly as [activities.md](activities.md) asked: every move is a button of at least fifty six pixels under a heading the mechanic gives it, arrow keys walk the buttons, Enter plays one and Backspace takes one back. The board is a picture the position draws. Two things in it already point the way. A part with a key is the same drawing in two positions, so the page moves the element it has instead of drawing a new one, and a carriage slides into the siding on a half second CSS transition. Five of the nine mechanics already place their parts on a shared sheet this way. And the race pad lays its nine moves out as a control rather than a list, so faster is above slower and the arrow keys walk the pad.

The reason it feels like clicking boxes is not the board and not the model. It is that the hand never touches the board. The controls stand beside the picture, the picture answers after the fact, and the only motion is the slide that follows a decision already made. The two taps and no gestures rule in [activities.md](activities.md) was the right rule for the accessible form and it became the only form.

## What real interactivity means for a five to ten year old

A child's hands want to do a small number of things: pick a thing up and put it somewhere and feel it take, pour and watch a level rise, pull something back and let it go, push a thing along a track, stack and watch it settle, tap in time, wind something up. The games we have contain most of these already, hidden behind buttons. The table says what each game could have had and did not, and the feel is described once below it, because the feel is shared.

| Game | Today | With hands | On release | A near miss |
|---|---|---|---|---|
| Balance the pans | tap a prop, it appears in the pan | drag a prop into a pan, or flick it there | it drops into the pile on a quick spring and the beam swings, overshoots once and settles | within a square of the pan it still lands; further out it goes home on a slower spring, and the position does not change |
| Land on the number | tap a card | drag an arc from where you stand; the arc's end snaps to the nearest tick a card in hand reaches | the card plays, the jump is drawn the way the line already draws jumps | with no legal tick under the finger the arc shrinks back |
| Shunt the carriages | tap in, out, round | push the carriage at the engine's end along the rail, through the points, into the siding; drag the engine over the train to run round | past the points it is in; the rest of the train closes up | short of the points it rolls back to the train |
| Take the corner | tap a direction on a pad | drag the car to one of the ringed cells, which are exactly the nine positions the moves lead to | the car travels there and the trail draws | off every ring, the car stays |
| Measure it out | tap fill, tip, pour | hold a jug over the other to pour, over the tap to fill, over the edge to tip | the level in each jug rises or falls as a morph of the drawing's own setting | the jug goes back to its place |
| Make the amount | tap a coin | drag coins from the till to the counter and back | the coin drops onto the counter | it goes back to its well |
| Share it out | tap a piece | drag a piece from the tray to a plate | it settles on the plate | it goes back to the tray |
| Spell the picture | tap a sound | drag a sound card into the next box | it drops into the box | a later box refuses it, and it goes back |
| Find the rule | tap a number, tap a rule | drag a number into the machine's hopper; the output slides out into the table on a short timeline | the row appears | the card goes back to the hand |
| Stop on the line | tap faster, slower, hold | drag the car forward to the cell it can reach next | it travels | it stays |

The feel, once. A lifted piece rises a little and casts a shadow, and it follows the finger exactly, with no lag and no inertia, because a five year old who has to wait for a thing to catch up thinks they have lost it. The places it may go show a dashed ring in pen ink while it is held, and the ring under the finger fills. On release the piece finds its place on a critically damped spring at four and a half hertz, which arrives in about a quarter of a second without overshooting, because a piece that bounces in a pan reads as not having landed. The beam is the one thing that overshoots: an underdamped spring at one and a half hertz with a damping ratio of a third swings past level and rings down over about two seconds, which is what a real balance does and what a child watches for. A near miss is generous, at least twenty two pixels outside the target, and a miss is quiet: the piece goes home on a slower spring, nothing is said unless there is a reason, and the reason is a sentence ("The right pan is full", "Only the right pan is yours to load"). A flick, a release faster than fourteen squares a second, is aimed: the piece's path is projected a third of a second ahead and lands in the first target it passes, so a child who tosses a ball at the pan gets the ball in the pan. A hold on a piece shows where it may go, which is the hint for a child who does not yet know what dragging is.

Two rules hold throughout, and both are older than this document. Anything a child has to hit is at least forty four pixels across, which the music work measured and wrote into `minSquarePx`; the spike grows every target to forty four divided by the square size, so at fourteen pixels to the square a pan is still a finger wide. And every game keeps a form that works from the keyboard and reads aloud: the tray of moves stays on the page, it is the same list of moves the gestures choose from, and it is the form that prints. WCAG 2.2 asks for the same thing under success criterion 2.5.7, Dragging Movements, at level AA: "All functionality that uses a dragging movement for operation can be achieved by a single pointer without dragging, unless dragging is essential." Our tray is that single pointer path, and it is also the keyboard path. The size floor sits above WCAG's 2.5.8 minimum of twenty four CSS pixels and at its enhanced 2.5.5 level of forty four. Motion that a child's own interaction starts is allowed to be turned off under 2.3.3, Animation from Interactions, and the sufficient technique named there is `prefers-reduced-motion`, which is what the stage reads.

## The art system, which constrains the engine choice more than anything else

Every drawing is SVG. `Pen` in `engine/ink/pen.ts` binds rough.js to one seed and numbers every call, so the same drawing gives the same strokes on screen, in a replay and on paper. `render` in `engine/ui/svg.ts` draws a visual into an element, reads its colours off that element, and on paper swaps colour for hatching from the same seed. A drawing declares its box in squares and returns its anchors in squares, `U` is twenty user units to a five millimetre square, and `Sheet` places drawings in whole squares on a page that prints life size. There are around two hundred and forty of these and `check:art` guards them.

An engine that owns the renderer pays four things at once. The drawings would have to be drawn again in its scene graph or rasterised into textures, and a texture does not print. The printed page would no longer be the screen, which is the promise [product.md](product.md) sells. A screen reader would find a canvas, and the accessibility overlays the engines offer (PixiJS has one) are a second description rather than the drawing. And the pen's seed would guarantee nothing, because the pen would not be drawing. What such an engine is still good at is the part that is not about drawing: a loop, input, tweens, and where a game needs it, physics. So the honest question is whether any of that is worth taking as a library and rendering ourselves, and the field below is read that way.

## The field

Versions, dates, licences and dependency counts are from the npm registry on 12 September 2026, sizes are minified and gzipped from bundlephobia for that version, and the qualitative claims come from each project's own documentation or README with the source named. Where a claim could not be confirmed from a primary source in this session it is marked not verified rather than guessed. The renderer table was gathered by a separate run against the same sources and its esbuild measurements are marked as such.

### Full engines

| Engine | Version (date) | Licence | min / gzip | Renders to | Loop | Does |
|---|---|---|---|---|---|---|
| Phaser | 4.2.1 (2026-07-09) | MIT | 1,338 / 347 kB | WebGL and Canvas | owns it; Arcade physics `fixedStep` default true at `fps` 60 | renders, simulates (Arcade, bundled Matter), schedules |
| Excalibur | 0.32.0 (2025-12-23) | BSD-2-Clause | 557 / 142 kB | WebGL, Canvas 2D fallback on poor performance | owns it; `fixedUpdateFps` and `fixedUpdateTimestep` options | renders, simulates, schedules |
| KAPLAY | 3001.0.19 (2025-06-15) | MIT | 179 / 65 kB | WebGL (from memory, not verified this session) | owns it | renders, simulates (simple), schedules |
| melonJS | 20.4.0 (2026-09-09) | MIT | 832 / 246 kB | WebGPU, WebGL 2, Canvas fallback | owns it | renders, simulates (SAT; adapters for matter-js and planck), schedules |
| PlayCanvas | 2.22.2 (2026-09-11) | MIT | 2,359 / 600 kB | WebGL 2 and WebGPU | owns it | renders (3D first, 2D supported), simulates (ammo.js) |
| three | 0.186.0 (2026-09-08) | MIT | 719 / 181 kB | WebGL, WebGPU; 2D by an orthographic camera | none of its own | renders |

None of the six can be used for input or its loop without its canvas, and none can draw our SVG or print. Phaser's README puts its own minified build at 345 kB gzipped and says it can be reduced by excluding features; Excalibur is the only one with a fixed update as a first class option. Against our constraints every one of them is a renderer we would not use carrying a loop we could write.

Sources: github.com/phaserjs/phaser README; docs.phaser.io ArcadeWorldConfig; excaliburjs.com/api/interface/EngineOptions; github.com/melonjs/melonJS; github.com/playcanvas/engine.

### Renderers and libraries that drive existing SVG

| Library | Version (date) | Licence | min / gzip | Renders to | Drives our SVG? | Scrub at a time without a clock? | Does |
|---|---|---|---|---|---|---|---|
| pixi.js | 8.20.1 (2026-08-26) | MIT | 881 / 252 kB | WebGL, WebGPU; no Canvas 2D in v8 | no | manual `Ticker.update` | renders, schedules |
| konva | 10.5.0 (2026-09-08) | MIT | 181 / 55 kB | Canvas 2D | no | `Tween.seek` then `layer.draw()` | renders, schedules |
| fabric | 7.4.0 (2026-05-18) | MIT | 292 / 90 kB | Canvas 2D | no, imports SVG into its own model | no | renders, schedules |
| paper | 0.12.18 (2024-07-17) | MIT | 232 / 82 kB | Canvas 2D | no | no | renders, schedules; dormant |
| two.js | 0.8.24 (2026-08-29) | MIT | 202 / 48 kB | SVG, Canvas or WebGL from its own graph | no, re-interprets | no tweens; manual `update()` | renders, schedules |
| @svgdotjs/svg.js | 3.2.8 (2026-08-04) | MIT | 90 / 29 kB | the SVG DOM | yes, `SVG(node)` adopts a node | yes, `Timeline.time()` is synchronous | schedules |
| snapsvg | 0.5.1 (2017-02-06) | Apache-2.0 | 82 / 29 kB | the SVG DOM | yes | partly | schedules; abandoned |
| d3-selection, -transition, -drag, -zoom | 3.x (2021-06) | ISC | 17 kB gzip for all four, 5.7 kB for drag with selection (esbuild) | nothing | yes | no, d3-timer is the real clock | schedules |
| roughjs | 4.6.6 (2023-11-20) | MIT | 26 / 8.6 kB | Canvas or SVG | it is our pen | no animation; `seed` from 1 to 2^31 | renders |
| motion | 13.2.0 (2026-09-02) | MIT | mini 3.1 kB, hybrid 22.5 kB gzip (esbuild) | nothing; WAAPI plus a JS loop | yes | yes, a settable `time`; manual timing exists but is undocumented | schedules |
| animejs | 4.5.0 (2026-06-22) | MIT | 13.7 kB gzip core, 21 kB with draggable and svg (esbuild) | nothing | yes; `svg.morphTo` on existing paths | yes, `seek()`, and `engine.useDefaultMainLoop = false` | schedules, with a spring easing |
| gsap | 3.15.0 (2026-04-13) | Webflow "Standard License", no SPDX id, not OSI open source | 69 / 27 kB | nothing | yes | yes, `progress()`, `updateRoot()` | schedules |
| Web Animations API | Baseline since 2020 | none | 0 | the compositor | yes, CSS properties only; `d` is not Baseline, `points` no | yes, `currentTime`; no springs | schedules |
| vivus | 0.4.6 (2021-04-17) | MIT | 13 / 4.5 kB | nothing | yes, strokes paths in place | yes, `setFrameProgress` | schedules |
| interactjs | 1.10.28 (2026-08-01) | MIT | 95 / 28 kB | nothing; reports positions, moves nothing | yes | not applicable | schedules |

Everything with its own canvas or scene graph replaces our renderer and is out. Of the DOM drivers, the Web Animations API costs nothing and cannot animate a path's `d` or a spring; Motion's mini build and anime.js are small and scrubbable and would be the choice if we wanted a tween library rather than the seventy five lines in `spring.ts`; SVG.js works and costs more than the others for the same thing; GSAP is technically strong and carries a proprietary licence, which would need a decision on its own. No candidate offers a keyboard path for a drag, so that is ours to write whatever we choose. None of these was found to load anything from an outside host at run time, on a reading of the docs and source rather than a network trace.

Sources: npm registry; bundlephobia; pixijs.com/8.x/guides; konvajs.org; fabricjs CHANGELOG; paperjs.org; two.js.org/docs; svgjs.dev/docs/3.2; d3js.org/d3-drag and d3-timer; motion.dev/docs; animejs.com/documentation; gsap.com/licensing and gsap.com/standard-license; MDN on `Element.animate`, CSS `cx` and CSS `d`.

### Physics

| Engine | Version (date) | Licence | min / gzip | Deterministic | Fixed step | Renders |
|---|---|---|---|---|---|---|
| matter-js | 0.20.0 (2024-06-23) | MIT | 81 / 25 kB | no claim; `Engine.update(engine, delta)` takes any delta, default 16.666 ms, and the docs say nothing about keeping it fixed | caller's choice | an optional canvas `Matter.Render` |
| planck | 1.5.0 (2026-04-07) | MIT | 206 / 46 kB | no claim; a "JavaScript/TypeScript rewrite of Box2D" | caller's choice | none; a separate testbed |
| @dimforge/rapier2d | 0.20.0 (2026-08-08) | Apache-2.0 | 126 / 23 kB of JS plus a separate `.wasm` | see the deterministic build | yes | none |
| @dimforge/rapier2d-deterministic | 0.20.0 (2026-08-08) | Apache-2.0 | 139 / 27 kB of JS plus a separate `.wasm` | "a less optimized build but with a guarantee of a cross-platform deterministic execution"; the docs add that the WASM build "is fully cross-platform deterministic" provided the inputs are, and warn that `Math.sin` and `Math.cos` are not | yes | none |
| @dimforge/rapier2d-compat | 0.20.0 (2026-08-08) | Apache-2.0 | 2,067 / 773 kB | as above | yes | none; the `.wasm` is inlined as base64, which is why it is this size |
| box2d3-wasm | 5.2.0 (2026-02-16) | MIT | 0.6 / 0.4 kB loader plus a `.wasm` not measured | Box2D v3 claims same results run to run on one machine and cross-platform determinism with FMA off and its own trigonometry (Catto, August 2024) | yes | none |
| @box2d/core | 0.11.0 (2024-08-17) | MIT | 230 / 50 kB | no claim | caller's choice | none |
| box2d-wasm | 7.0.0 (2021-11-28) | Zlib | 0.5 / 0.3 kB loader plus a `.wasm` | no claim | caller's choice | none; dormant |
| p2-es | 1.2.3 (2023-11-01) | MIT | 86 / 25 kB | no claim | caller's choice | none |

What a grid based child's game needs from any of this is very little. A piece that snaps to a pan, a level that rises, a beam that swings, a carriage on a rail and a peg on a lattice are each one value moving to a target, and one value moving to a target is a damped spring, which has a closed form. The spike's `spring.ts` is seventy five lines and needs no integrator. A stepped simulation is only needed where the model itself is one: a stack that may topple, a marble that rolls, a spinner that is spun. Those games do not exist yet, and when one does the deterministic Rapier build is the candidate, at twenty seven kilobytes of JavaScript plus a WASM file served from our own host, which the privacy rule allows since our host is not an outside one. The inlined compat build is not an option at 773 kB.

Sources: brm.io/matter-js/docs Engine; github.com/piqnt/planck.js; rapier.rs/docs/user_guides/javascript/determinism; github.com/dimforge/rapier typescript README; box2d.org/posts/2024/08/determinism.

### Pieces rather than engines

| Piece | Version (date) | Licence | min / gzip | Pure, runs in node | A function of time | Verdict against writing it |
|---|---|---|---|---|---|---|
| bitecs | 0.4.0 (2025-12-06) | MPL-2.0 | 15.7 / 5.6 kB | yes, zero dependencies | not applicable | an ECS answers a question we do not have; a position is a value and a board is a list |
| miniplex | 2.0.0 (2023-07-16) | MIT | 15 / 3.7 kB | yes | not applicable | same |
| koota | 0.6.6 (2026-04-09) | ISC | 37 / 10 kB | yes | not applicable | same |
| xstate | 5.33.0 (2026-09-12) | MIT | 46 / 14 kB | yes | not applicable | the gesture recogniser is a five state machine; forty six kilobytes is the wrong size for it |
| robot3 | 1.2.0 (2025-09-20) | BSD-2-Clause | 2.8 / 1.2 kB | yes | not applicable | small enough; still more than the `switch` it would replace |
| @tweenjs/tween.js | 25.0.0 (2024-07-26) | MIT | 12.5 / 3.7 kB | yes | advanced by `update(time)` | a closed form spring is shorter and scrubs for free |
| popmotion | 11.0.5 (2022-08-15) | MIT | 15 / 6.7 kB | yes | loop driven | dormant |
| wobble | 1.5.1 (2018-12-11) | MIT | 4.2 / 1.4 kB | yes | loop driven | dormant; the same maths as `spring.ts` |
| @react-spring/core | 10.1.2 (2026-06-24) | MIT | 42 / 16 kB | yes | loop driven | React shaped |
| spring-easing | 2.3.3 (2023-05-19) | MIT | 6.1 / 2.7 kB | yes | yes, precomputed | a curve, not a live spring with velocity carried in |
| hammerjs | 2.0.8 (2016-04-22) | MIT | 19.6 / 6.9 kB | no, DOM | not applicable | abandoned |
| @use-gesture/vanilla | 10.3.1 (2024-03-21) | MIT | 29 / 8.7 kB | no, DOM | not applicable | good, and it cannot be fed samples in a test |
| zingtouch | 1.0.6 (2018-03-26) | MIT | 25 / 5.3 kB | no, DOM | not applicable | abandoned |
| interactjs | 1.10.28 (2026-08-01) | MIT | 95 / 28 kB | no, DOM | not applicable | heavy for what we need |
| mainloop.js | 1.0.4 (2017-05-30) | MIT | 1.4 / 0.7 kB | yes | not applicable | the accumulator is thirty lines; the pattern is Fiedler's "Fix Your Timestep" (2004) |

The pattern across the table is that every piece is either shaped for the DOM, which our tests cannot run, or is a few dozen lines of arithmetic we would rather own than depend on. A recogniser that is fed plain samples and a spring that is a closed form are both testable in node, and neither candidate is.

### Children's and educational, and SVG native

| Project | Version (date) | Licence | min / gzip | Renders to | What it is for us |
|---|---|---|---|---|---|
| springroll | 2.9.0 (2026-02-03) | MIT in the README, ISC in the npm field | 112 / 35 kB | nothing; templates for Pixi, Phaser 3 and CreateJS | PBS Kids' toolset: captions, speech synthesis, colour blindness filters, mute state. Rendering agnostic, so it says nothing about our question, and its accessibility pieces are the ones the sound work already has |
| scratch-render, scratch-vm | 2.2.84 (2026-04-03), 5.0.300 (2025-05-04) | AGPL-3.0-only | 577 / 131 kB and larger | WebGL | the licence alone rules it out for a shipped product |
| jsxgraph | 1.13.3 (2026-09-07) | MIT or LGPL-3.0 | 944 / 247 kB | SVG or canvas of its own | interactive geometry with multi-touch dragging and documented ARIA and keyboard navigation guidance; the nearest thing to a solved "accessible interactive SVG", and it draws its own SVG rather than ours |
| mafs | 0.21.0 (2024-10-20) | MIT | 314 / 93 kB | React components (SVG first, from memory, not verified this session) | Khan Academy's interactive graph layer; React only |
| @khanacademy/perseus | 87.1.4 (2026-09-11) | MIT | 2,784 / 751 kB | React | a whole exercise platform |
| blockly | 13.3.0 (2026-09-10) | Apache-2.0 | 729 / 196 kB | its own SVG workspace | a block editor, for completeness |
| zdog, pencil.js | 1.1.3 (2022-01-22), 3.2.0 (2024-09-12) | MIT | 26.5 / 7 kB, 52.5 / 15 kB | canvas and SVG of its own; canvas | not applicable |

Nobody has solved our exact problem, which is a game whose drawing is already an SVG from a seeded pen and has to print. The two projects nearest to it, JSXGraph and Mafs, draw their own SVG and are worth reading for how they make a dragged point keyboard reachable, which is the same problem we have.

## Three options

Each is a whole answer, and the comparison follows in the shape [structure.md](structure.md) uses.

### Option 1: an engine takes over the games' screen

Phaser or Excalibur owns a canvas for the games only. The two hundred and forty drawings survive as bitmaps: each is rendered through our pen to an image and uploaded as a texture, so the art still looks like the product. The model stays as it is, the engine's scene code turns a board into sprites and its input layer turns pointers into moves.

What it makes easy: physics, particles, tweens and input arrive together; a designer used to Phaser can build a scene; a game that needs rigid bodies gets Matter or Arcade for nothing.

What it makes hard: printing, since an activity's paper companion would be the only paper form and the screen would no longer be the sheet; the screen reader, which would get an overlay describing a canvas rather than the drawing; the seed, which would guarantee the texture and not the scene; and the declared-not-coded rule in [activities.md](activities.md), because every game would need a scene class, which is exactly the bespoke code that rule exists to refuse.

What it costs now: 142 kB gzipped for Excalibur or 347 kB for Phaser on a page that today ships about 11 kB for the engine and its binding; a texture pipeline; a second runtime beside the lessons.

What it costs later: two ways of drawing a balance, and every drawing change made twice, once in the pen and once in whatever the texture pipeline does with it.

Failure cases: the games drift from the lessons in look and in behaviour; a parent prints a game and gets a caption; an update to the engine's renderer changes a texture's edge and `check:art` cannot see it.

### Option 2: a small engine of our own around SVG and the grid

The spike. The model is untouched. A stage draws each board part through the ordinary renderer, keeps it while its key survives, glides it on a spring when its place changes, and draws it again at interpolated settings when a numeric setting changes. A recogniser turns pointer samples into tap, hold, drag and flick. Drop targets are shapes on the drawing's own anchors with a reach and a flick projection. A timeline sequences feedback and names cues. An input log sits beside the move log. A binding per mechanic says which parts are handles and which moves a landing means.

What it makes easy: every drawing works as it is, in colour on screen and hatched on paper, because the renderer is the renderer; every primitive is a pure function tested in node; a new gesture is a hundred lines; the gate is unchanged by construction.

What it makes hard: anything that is really physics, which has to wait for the third option; anything the drawings do not expose, since a part without a size for its anchors gives us a point to aim at and not a shape; and the binding, which today is code per mechanic and should become data.

What it cost when this was written: 2,066 lines in `src/engine/`, of which 693 are the three bindings, 294 are the shared hands controller and 413 are the stage; 41.4 kB minified and 15.5 kB gzipped for the whole page with three games on it, over the chunks the Games page already loaded; two days. What it is now, with every game on it, is in the section near the top.

What it costs later: we own it. There is no community, no issue tracker and no upgrade path but ours. Each primitive is small enough that this is a maintenance cost rather than a risk, and the doubt is recorded in the failure cases.

Failure cases: a game wants stacking or rolling and springs cannot fake it, so it waits or takes option 3; a gesture we did not think of (a two finger stretch) needs the recogniser to grow; the beam's morph draws the balance every frame, which is fine for a balance at one millisecond and untested for the circuit at thirty by twenty squares.

### Option 3: a library simulates and our renderer draws

The second option plus a deterministic rigid body engine for the games whose model is a simulation: a tower of blocks that may topple, a marble on a ramp, a spinner spun and left to stop. The library steps the world on the fixed timestep loop; each body is a keyed part whose place and angle the stage draws; the model's position is the settled world, keyed after quantising, and a move is a discrete input to the world (place this block here, push with this much) rather than a pointer trace.

What it makes easy: the physics that springs cannot do, with the drawing still ours.

What it makes hard: the gate. Every edge of the position graph is now a simulation run to rest rather than a function call, so the prover's cost rises by three or four orders of magnitude and the position cap has to fall to match; a world that never settles is a version the prover refuses; and cross-platform determinism rests on the library's claim and on our own code avoiding `Math.sin` and `Math.cos` in anything the world reads, which Rapier's documentation names as the caveat.

What it costs now: nothing until a game needs it. Then 27 kB of JavaScript and a WASM file for `@dimforge/rapier2d-deterministic`, served from our own host, or Box2D v3 through `box2d3-wasm` at the cost of a loader we have not measured.

What it costs later: a second model of what a position is, and a prover with two speeds.

Failure cases: a physics game passes the prover on the build machine and behaves differently on a tablet because an input was rounded differently; the settled state's key is too fine and the graph explodes, or too coarse and two different piles collapse into one.

### The comparison

| | 1 engine owns the screen | 2 our own, around SVG | 3 our own plus a simulator |
|---|---|---|---|
| Drawings usable as they are | as textures | yes | yes |
| Prints | the companion only | the resting board | the settled board |
| Screen reader | an overlay | the text form and the tray | the same |
| Deterministic replay | of moves; frames depend on the engine | of moves; frames given the frame times | of moves; frames and world given the library's claim |
| The gate | unchanged | unchanged | a slower prover and a settle step |
| Added to the bundle | 142 to 347 kB gzipped | about 15 kB for three games | about 15 kB, plus 27 kB and a WASM for the games that need it |
| A new gesture costs | the engine's input API | about a hundred lines and a test | the same |
| A new game costs | a scene class | a binding of about two hundred lines, which should become data | a binding and a world |
| Dependency risk | one large one | none | one, with a determinism claim to hold it to |
| Cost to adopt now | most | least, and mostly spent | least now, real later |

We recommend option 2, with option 3 held for the games whose model is a simulation and adopted per game rather than in advance. This is a recommendation and not a decision.

## The five questions

### The gate

A discrete model is provable by search, and the three games keep it that way by making every gesture a selector: a landing resolves to indices into `moves(position)` or to nothing, and `test/engine.test.ts` walks every reachable position of every level of all three, asks each binding what every drop, every stop on the rail and every landing of the aim means, and asserts that every move it names is one the mechanic listed. For the yard it also asserts the converse, that every move the mechanic offers has a handle that plays it, so the hand is never poorer than the tray. That invariant, that a gesture chooses and never creates, is the whole of the gate for the games we have, and it should be stated in the contract rather than only in a test.

Three kinds of control do not reduce to a selector, and each gets a different gate.

Continuous input that is part of the model, an aim or a strength, is quantised into moves: an aim is one of twelve directions and a strength one of four, the prover walks the product, and the drawing shows the quantised choice (an arc snapped to a tick, a ring at the cell), which is also what makes it a keyboard move. The cost is that a child aiming at thirty seven degrees gets thirty, and the drawing has to show that honestly.

A timed judgement, the beat track in [games.md](games.md), has no win to search for. The gate is a set of named invariants and a seeded replay: every tap inside the tolerance band is accepted and every tap outside it is not, the band is drawn so the judgement is visible, the exercise is answerable with the volume at zero, and the record is the seed plus the taps with their times so the judgement is a pure function of the record. That is the judgement against a window that document already describes, and it is a decision for the owner whether a game with that gate ships at all.

A simulation model, option 3, is a discretised search: a move is a discrete input, the world is stepped on the fixed loop to rest, and the settled state is keyed after quantising. The prover is the same search over a much more expensive edge.

Of the four unprovable ideas in [games.md](games.md), clapping the rhythm gets the second gate, building on the hexagon waits for parts to have a geometry and would then get the first or the third, and the sentence and the stall are not games by that document's own test.

### The model and the view

We agree with the split and the runtime's keyed slide is the right first version of it. The line falls here. The model owns positions, moves, the win, the key, the words and the board, and it is a bag: it does not know which ball went into the pan. The view owns the identity of pieces (which ball, so the one the child dragged stays and the one that left comes back on undo), where pieces rest (a layout against the drawing's anchors as they are drawn right now), the motion between two boards (glides and morphs on the stage's clock), the resolution of a gesture into moves, and cues. Two things the bindings had to work out that the model should say instead, and one they read off the model's own words. The board does not carry the tray, because the games page draws the tray as buttons, so the spike reads the tray off the prover's own graph as the most of each kind any reachable position holds in the pans; a board that listed its tray as parts would remove that. And the binding, which parts are handles and which targets take them, is about two hundred lines of code per mechanic today and should be a `handles(position)` on the mechanic returning data, so the prover can check it and a generated activity's picture can be dragged without anyone writing a binding. The third thing is that the circuit's binding reads a move's resulting velocity off `sayMove` and the straight's speed off `say`, because the lanes board draws the runner and not the speed; a test checks the words against the next position's own board, and it holds, and it is still a view reading a sentence a screen reader was written for. We did not add the optional `handles` field to `src/play/types.ts` yet, because the three bindings show the data would need three things a mechanic cannot give today: a piece identity the balance's bag does not have, a rail the yard drawing knows and the mechanic does not, and a landing cell whose size comes from the page. The shape is clear enough to write once anchors carry a size; see the order of work.

### Determinism

A spring here is a closed form: `springAt(spring, from, to, v0, t)` returns the value and velocity at `t` seconds and keeps no state, so a frame is a pure function of the frame's time and a test asks for the value at 0.3 seconds without a clock. The position never depends on a frame. Replaying the moves rebuilds every position exactly, which the Games tab shows by linking each round back to itself with the same `?replay=`. Replaying the frames is exact given the same frame times on the same machine; across machines `Math.exp` and `Math.cos` may differ in the last place, which moves a stroke by less than a pixel and never changes a position. A stepped simulation on the fixed loop is deterministic for the same step count because the step never varies, which is Fiedler's argument and Box2D's. What we would give up with a library that makes no claim, matter-js for one, is the frame replay and the world replay, and we would be left with the moves, which is what the record stores anyway.

### Paper

For each kind of interactivity, what prints is the resting position, and nothing that exists only mid-motion may carry information. A drag and a snap print the board they led to, which is what prints today. A morph prints the drawing at the discrete setting, which is the picture the morph settles on. A timeline and its cues print nothing, because they are feedback. A drag along a rail prints the carriage where it stopped, an aim prints the car where it landed with the trail the circuit already draws, a crash prints the car at the last cell it reached with its arrow as the position gives it, and a simulation prints the pile as it settled. The guard is the print test [product.md](product.md) already uses, applied to motion: turn the motion off and the board must say the same thing, which is also the reduced motion path, so one switch tests both.

### Sound

A game names a cue and nothing else. `cues.ts` has eight, lift, place, back, nope, bump, crash, level and win, and the engine does not import `src/sound`; the page maps a cue to a note on `sounder()`, which is the silent sounder until the switch in the top bar is turned on, and the win is three notes at staggered times on the same clock the sound core uses. Every cue has a drawn twin: the lifted piece rises, the placed one settles, the returned one goes home, the bump is the carriage pushed back off the buffer, the crash is the arrow drawn past the kerb with a puff at its end, the level beam is level, the win has a sticker and the guide cheers. A test records cues with `recordCues()` and asserts the sequence without a browser. The volume at zero loses the notes and keeps the game.

## The shared building blocks

The inventory that decides whether the next twenty games are cheap. Everything marked built is in `src/engine/` and tested in `test/engine.test.ts`; the games named are the ones in the current ten and the twenty five in [games.md](games.md) that need the piece, at least two each.

| Primitive | Where, lines | What it is | Games that need it | What it does not do | How it is tested |
|---|---|---|---|---|---|
| Gesture recogniser | `gesture.ts`, 131, built | plain samples in, tap, hold, drag, drag end with velocity and a flick flag out; one pointer at a time; slop, hold time and flick speed as a `Feel` | every hands-on game; the flick for weigh and pay, the hold for a hint everywhere | pinch, rotate, two pointers; hit testing; anything with the DOM | samples fed in node: tap within slop, drag past it, a stopped finger is a drop, a fast release is a flick, a hold by polling, a second pointer ignored |
| Drop targets with reach and flick, and piece identity | `pieces.ts`, 120, built | a target is a shape carrying what landing means; `land()` returns on, near, flick or miss, and a point inside two grown targets goes to the nearer centre; `settle()` keeps one piece per thing where the model keeps a count, moving the one the hand moved | weigh, share, pay, pour, spell, sort, dot, exchange | move anything; know about moves, which are what the target carries | on, near, miss, flick aimed and slow throw, overlapping targets, and settle, in node |
| Geometry and hit tests | `geometry.ts`, 103, built | points, rects, circles; inside, distance to, overlap, contains; snap to grid; project onto a path; grow to a minimum size | every game for hit testing; peg and fold for the lattice; shunt and moment for the rail and the plank; array for the edge | read a drawing's shape, since a part declares a box and anchors and no geometry | arithmetic cases in node |
| Anchors as targets | `Stage.anchor`, built; a size per anchor, not built | a drawing's own anchor in sheet squares, as drawn right now, so a target follows a pan while the beam swings | weigh (`left-pan`, `right-pan`), jump (`tick(n)`), shunt (`place(i)`, `spur(i)`), pay, share | give a target a size; the spike hard codes two squares for a pan | in the browser only, since anchors come from a render; the layout over given anchors is tested in node |
| Springs | `spring.ts`, 77, built | closed form damped spring, five presets: snap, back, swing, pour, drive | every glide; the beam; the jug level; the seesaw; the dial needle | integrate anything; know about frames | no overshoot when critical, one overshoot for the swing, an overdamped case, a push, settle time bound |
| Fixed step loop and ticker | `loop.ts`, 104, built | an accumulator with a capped catch-up, and a ticker driven by given frame times | the stage's frames; any stepped simulation (option 3); a thing wound up and let go | choose a step; run without being asked | three steps and a remainder, eight steps for a five second gap, a ticker on a fake clock |
| Timeline with cues | `timeline.ts`, 68, built | named tracks from a value to a value over a stretch, cues at moments, evaluated at a time; `collapse()` for reduced motion | the win everywhere; rule's machine sequence; exchange's break, where a rod leaves and ten cubes arrive | run; own a clock | value before, during and after; cues fire once; collapsed is all at nought |
| Morph of a numeric setting | `stage.ts`, built | a keyed part whose numeric setting changed is drawn again at spring values on the way, through the ordinary renderer, then once at the target | weigh's tilt, pour's level, weigh out five hundred grams' needle, moment's tilt, down to minus four's thermometer | morph a list or a word, which switch at once; know how a drawing is built | in the browser: 242 redraws over 2.0 seconds of swing, 0.4 to 1.2 ms each at 32 px squares |
| Keyed parts that glide, and a lifted part | `stage.ts`, 720 with the morph and the field, built | the runtime's keyed slide with the CSS transition replaced by a spring that carries velocity, plus lift, place, glide and follow for a held part, a part drawn at a size of its own, parts without a place laid in a row, and named layers of marks | every turn game, puzzles included | draw a part that is inside another drawing, which is why the balance's props became parts of their own | in the browser; the drive scripts and the screenshots |
| The field | `stage.ts`, the same file, built | an action game's frame: each look drawn once through the pen and every moving sprite a layer the browser composites, a camera, dust and a shake, and the same marks | the bead string, the road, the slingshot, and every action game to come | draw a look that changes every frame, which belongs in the marks | in the browser; the frame figures above and in [arcade.md](arcade.md) |
| Scene, frame and marks as data | `scene.ts`, 107, built | what the stage and the field draw, with no page in it | every game | draw | read in node by the games' tests |
| Pad | `pad.ts`, 98, built | a direction, the big button, a brake and a pull, from keys, a swipe, buttons or a gamepad; a seeded generator | every action game | know which device a press came from | in node |
| Bodies | `bodies.ts`, 109, built | boxes, balls, a ground and a hinge stepped on the fixed loop, planck behind them | the slingshot; stacking, rolling and spinning games to come | promise the same world across runtimes, which planck does not | a world stepped twice to the same place, in node |
| Input log | `trace.ts`, 72, built | how each move was chosen, and the releases that chose nothing; the moves back out as the replay list | every game; the near miss count is the evidence a parent sees | store anything; replace the attempt log in `src/play/log.ts`, which it sits beside | summary and replay list in node |
| Cues | `cues.ts`, 29, built | eight names, a sink, a recorder | every game with sound | make a sound | the recorder in node |
| Hands, the controller | `hands.ts`, 299, built | what every game by hand shares: a press picks a handle up, grown to the 44 pixel floor, a drag moves it free, along a path, or as an aim that moves nothing until it is let go, a release is judged, and a judged release plays moves or sends the part home on the slower spring and says why; it reaches the page through the stage's surface and knows nothing of the model but whether a position is won | the eight hands-on games, and every game to come | name a move; know a game's geometry | a drag played against a stage of the test's own, stops within reach, a flick rolling along a rail and a push across it not, in node; the bindings' tests run through its resolution |
| A binding | in `src/play/`: `weigh-hands.ts` 271, `shunt-hands.ts` 200, `race-hands.ts` 202, `jump-hands.ts` 134, `pay-hands.ts` 161, `share-hands.ts` 177, `pour-hands.ts` 122, built | which parts are handles, where they rest, the rail or the landings, which moves a landing means, and a refusal in words; the levels as data | one per mechanic; should become `handles()` data on the mechanic | generalise yet | every reachable position of every level against the mechanic's own moves, both ways: a hand names only listed moves, and every listed move has a hand |

The gesture recogniser, the targets, the geometry, the springs, the log, the pad and the hands controller are what every game shares, and only the controller is over a hundred and thirty lines. The stage is the one large piece, and it is large because it is the page: it draws a scene and a frame, it holds, it listens. The binding is the one piece that is a cost per game, between 120 and 270 lines each for the seven files we have, and the proposal is still to move it into the contract so it is data.

## Three games on one layer

These three were first played on a page of their own, `scratchpad/engine.html` with `src/pages/engine.ts`, on the files above, with a switcher between them and the proof, hand, record and motion panels for each. That page is now part of the Games tab, and its address opens the same game there. The balance came first and the owner played it. The yard and the circuit were chosen after it because they are the two hands furthest from a drag to a place: a push constrained to a rail, and an aim that moves nothing until it is let go. Three kinds of drag and drop would have been one thing.

### The balance, a free drag

The gesture: a prop is dragged from the tray into a pan or flicked at it, and comes out again by the same road. It is the right gesture because the model's move is a thing going into a pan, so the hand does the move itself. Two levels, the activity's own: one pan to load, and either pan.

What it proved. A ball dragged into the pan plays the index of "Put a ball in the right pan", the same move the chip plays. A ball flicked at the pan lands in it. A star dropped short goes home, counts as a drop that went home, and changes nothing. The beam swings by drawing the balance again each frame, 242 times over two seconds in headless Chrome at 0.43 milliseconds a render, and the drawing has no animation code. Under reduced motion each move is one render.

What playing it changed: the tray moved beside the balance when there is room, because a tray below it put the props under the fold; and a pan to pan drop became two moves in one gesture, which is the only place a gesture plays more than one move.

### The yard, a drag along a rail

The gesture: the carriage at the engine's end is pushed along the main line, round the points and into the siding; the carriage nearest the points is pulled back out the same way; the engine is dragged over the train to the other end. The finger can be anywhere, and the carriage is at the nearest place on the rail to it, so the train moves only where the track goes. Past the points is the move; short of the points the carriage rolls back to the train on the slower spring. A flick rolls it on along the rail, and pushing on past the buffer stop, or the carriage already in the siding, bumps it back with a cue. The rail is read off the sidings drawing's own anchors, `place(i)`, `spur(i)` and `points`, after the yard is drawn. It is the right gesture because shunting is a thing done along rails and the model's three moves are three journeys along them.

Five levels. The first three are the activity's own, so their proofs are the puzzle's numbers: one carriage out of place (shortest win 4, 36 positions), the train standing backwards (5, 48), and four jumbled with room for three (10, 192). Two more are bound here as data on the same mechanic: four jumbled with room for only two (10 moves, 144 positions, the siding one place short of holding all but one), and five carriages with room for two (11 moves, 720 positions). Each rung is a deeper search or a tighter siding rather than more of the same, every level keeps the promise, and a test pins the five shortest wins at 4, 5, 10, 10 and 11.

What playing it changed: the reach past the points had to start half a square before the curve's end, because a carriage let go on the curve itself reads as having gone in; and the loco's stop is the middle of the train, because a child dragging the engine over three carriages does not go all the way. What it did not fix, and the model would have to: the pushed carriage passes through the engine standing at the end of the train, because the mechanic's yard has no place for the engine to get out of the way. A faithful yard is a mechanic change and not a view one.

### The circuit, an aim let go

The gesture: the child takes hold of the tip of the car's arrow, or the car itself, and drags. The car does not move. The landings the moves lead to are ringed, the nearest is filled, a ghost of the car stands on it with the arrow it would then have, and a dashed line joins the two. Letting go plays that move and the car travels the whole move on a spring with the trail drawing behind it. A chip in hand on the tray shows the same ghost, so the keyboard path has the preview too. It is the right gesture because the model's move is a change to a velocity, and a velocity is an arrow. On the straight the runner is the car and the arrow is drawn on the overlay, since the lanes drawing shows where and not how fast.

A crash is a position with no moves: the car is going too fast for any change to keep it on the track. The mechanic already refuses to offer a move over the kerb and the prover counts these positions as ends without a win. The view draws the car's own arrow on past the kerb in the berry ink with a puff at its end, the guide asks for another go, the sentence says there is nowhere to go at this speed, and a take-back undoes it. Nothing is lost and the child is not scored.

Five levels were bound at first: the straight, stop on the line (shortest win 7, 54 positions); the ring, cross the finish (15, 1,470 positions, 44 ways to win); the ring, stop on the finish (17 moves, 2 ways to win); the chicane, cross the finish (13 moves, 11 ways to win, 214 ends without a win); the chicane, stop on the finish (14 moves, 1 way to win). The second constraint is what climbs: having to come to rest on the finish takes the ring from 44 ways to win to 2 and the chicane from 11 to 1, and the chicane's tightening corner has more positions with nowhere to go than the ring's. The two levels taken from the activity are the same rounds, and a test asserts their proofs are equal to the activity's own, number for number. The straight is now a game of its own, Stop on the line, with both of the activity's versions, and the circuit, Take the corner, keeps the other four.

What playing it changed: the car itself became a handle beside the arrow's tip, because a child grabs the car; the landing cells are grown to the forty four pixel floor, which at eighteen pixels to the square makes a two square cell a 44 pixel target; and the straight needed the speed read off the position's own sentence, since its board has no car.

### Measured

When it was a page of its own, the engine page added 41.4 kB minified and 15.5 kB gzipped over the chunks the Games page already loaded; the one tab's figures are in the section near the top. A render of the balance costs 0.43 milliseconds at 32 pixels to the square, a render of the yard 1.0 milliseconds at 30, and a render of the circuit 2.0 milliseconds at 18, all in headless Chrome on the development Mac. The circuit draws again once per move because its trail is a list, and the car glides; nothing on the circuit morphs. Under `prefers-reduced-motion`, emulated in the browser and forced by a box on the page, each move is one render in all three games. `npx tsc --noEmit`, `npm test` (278 tests, 26 of them the engine's), `npx vite build` and `node scripts/check-privacy.mjs` pass.

What none of it proved. Feel on a real tablet with a child's finger: everything was driven with a mouse in headless Chrome, and the pointer events are shared with touch but touch was not run. Sound was never audible, only recorded. The morph on a large drawing was not measured, since neither new game morphs. And the hands controller has three modes because three games needed three; a fourth game may want a fourth.

Screenshots are in the report that accompanies this document rather than in the repository.

## What the model and the drawings need to say

Three small things, found by building.

A mechanic should declare its handles. `handles(position)` would return, as data, which board parts a hand may pick up and which anchors of which parts they may be dropped on, with the move each pairing means. The prover can then check the same invariant the spike's test checks, a studio can show it, and a parent's generated activity gets hands for free. Until then a binding is a file per mechanic.

A board should carry its tray as parts, for the same reason a carriage is a part: what a hand moves has to be a thing of its own. The balance's props were drawn inside the balance, so the spike draws the balance with empty pans and each prop as a part placed on the pan's anchor. That is the composition device [games.md](games.md) already found, applied one level down.

An anchor should be able to carry a size. A drop target is an anchor plus a reach today, and the reach is a number the binding chose. A drawing knows how big its pan is and should say so; it is one optional field on what `draw` returns. We did not do it before the other hands-on games, and eight bindings now hard code their sizes, so it is worth doing before the next one.

## Order of work

Four of the first seven are done. Pay and share are on drop targets and the number line on an aim, each as a binding rather than as data; the jugs pour by a drop on another jug rather than a hold, with the level morph; and the stage is under the one Games tab, so there is one runtime. Spell stayed a puzzle, for the reason given near the top. What is left:

1. A size on an anchor, then `handles()` on the contract as data, with the seven bindings moved onto it, and the tray as parts of the board.
2. planck loaded only when a game that needs it is opened, since the whole Games tab loads it today.
3. The judgement gate for the beat track, if the owner wants that game.
4. The deterministic Rapier build behind the fixed loop, when and only when a physics outcome has to replay the same on every device.
5. Every game played with children on a tablet, which none of this has been.

## Open questions

Whether a flick should count. A child tossing a ball into a pan is a good moment and it is also a way of winning by luck that the patience figure does not model, since the prover cannot see how a move was chosen. The input log can tell us how often it happens once children play.

Whether the tray of moves stays on screen beside the board or is revealed on focus. It is the keyboard and screen reader path and it is also the thing that made the games look like a form.

Whether cues should be authored, a mechanic naming its own in the contract, or fixed at six.

Whether frames need to be replayable at all, or whether the moves, which are exact, are the whole record.

Whether the morph should draw every frame or every other, on a device we have not measured.

Whether the yard should be made faithful, so the engine pushes and the carriages between it and the points move with it. That is a change to the mechanic's position and to its moves, and it would make the game a better toy at the cost of the three move contract the prover walks today.
