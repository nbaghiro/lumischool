# Animation

Status: built in the scratchpad, September 2026. This document is about small movements for every drawing on the art shelf: a breath, a bob, a sway, a blink, a flap, a hop. It sets out which of the classic animation principles apply to small hand-drawn things for children aged five to ten and how each one became a number in code, the vocabulary of movements those numbers make, how a drawing declares its movement once, the rules about what never moves, and the one module that plays a declaration on any page that asks for it. It generalises the harbour pilot in [motion.md](motion.md), which remains the document for the journal's worlds: the rules there (settle while a child works, reduced motion is complete and still, no flashes, nothing that reads as a timer, taps never recorded, a value a lesson may ask about never changes) are kept here, and the harbour's declarations now live in the same file as everyone else's.

The owner's comment on the harbour's first pass, that there was not much to see, is the constraint this was tuned against. Subtle here means small and slow, but still noticeable within two or three seconds of looking at the drawing.

## Where it lives

| Scratchpad file | What it holds | Module in [structure.md](structure.md) |
|---|---|---|
| `src/engine/animation.ts`, now `engine/motion/animation.ts` | The principles as numbers, the primitives as pure functions of time, seeds, the size rule, the envelope that wakes and settles a drawing, the reading rule and the frame budget's arithmetic. Imports nothing and runs in node. | `motion/animation.ts`, moved unchanged, beside the spring, the timeline and the loop |
| `src/art/animation.ts` | Every drawing's declaration, keyed by its id on the shelf, each shelf's default, the list of drawings that carry a reading, and `resolve`, which turns an id into the motion that plays. Imports no art. | the families' defaults are in `parts/drawing.ts` beside the contract already, so working out one drawing's motion (`motionOf`) never loads the catalogue, and each declaration moves into its drawing's `motion` in `parts/` as the drawing moves |
| `src/core/animate.ts`, now `engine/ui/animate.ts` | The player: one ticker, one watch on what is on screen, the budget, reduced motion, print and hidden tabs, and the code that finds a drawing's parts and writes its pose. | `ui/animate.ts`, moved with its print stylesheet; it plays the motion a page hands it, `motionOf` of a drawing, and the scratchpad's pages hand it the shelf's through `src/art/animate.ts` |
| `src/core/visual.ts`, `part()` | The one line a coded drawing uses to put a part in a group of its own, with its pivot. | `ink/surface.ts`, where `part` now is, a group on the SVG surface and on the recorder |
| `test/animation.test.ts` | The rules as tests. | the module's own rules are in `motion/__tests__/animation.test.ts`; the rules over the whole shelf stay here until the drawings move, and then go to `parts/__tests__/` |

The reach of `parts/` gains `motion/animation` in step 3 of [structure.md](structure.md), so a drawing's declaration and its family's default are typed by the module that plays them, and `parts/drawing.ts` applies the reading rule with that module's `rigid`.

## The principles, and how each is encoded

Most of the twelve principles are about drawing a character through a whole scene. Nine of them apply to a small drawing that moves in place for a long time, and each became a rule in the primitives or a number a declaration can change. The table gives the rule and its default; the sections after it give the three things that are not principles but decided as much as they did.

| Principle | How it is encoded | Default |
|---|---|---|
| Squash and stretch | A hop crouches before it leaves the ground, stretches on the way up and squashes as it lands, keeping its area (taller is thinner). A breath grows the drawing mostly upward from its feet. A blink squashes the eyes shut rather than swapping a drawing. | `squash` 0.1 of the height on a hop; `amt` 0.045 on a breath; a blink shuts 90 per cent |
| Anticipation | A hop's crouch comes first, a sixth of a second at 12 per cent of the hop's height. A wiggle swings 30 per cent the other way before it wags. A flap's wing goes up before its downstroke. | built into the shapes; `squash` sets the crouch |
| Follow-through and overlapping action | Every moment ends with an overshoot that dies away: the hop's small bounce, the stir's one dip below level, the wiggle's shrinking swings. A part can trail the drawing's own loop by `lag`, and repeated parts pass a wave along a row by `wave`, so bunting ripples and rabbits hop one after another. | `lag` 0; `wave` per declaration (0.22 s along the bunting, 0.42 s along the rabbits) |
| Slow in and slow out | Loops are sines, slowest at their ends. Moments use cubic easing. A drawing wakes and settles on a smoothstep envelope, so it never starts or stops at speed, and a spinning part coasts to a stop instead of halting. | wake 0.8 s, settle 1.2 s |
| Arcs | A bob strays sideways as it rises and tilts with that drift, so it travels on an arc rather than a line. A sway turns about a pivot, so its points move on arcs; a hop travels a parabola; a stir turns about a bottom corner. | `arc` 0.45 of the lift, a tilt of 1.6 degrees |
| Secondary action | A drawing can layer a second movement on its body, and each part moves on its own period: a cat breathes, blinks and flicks its tail, each out of step with the others. | as declared; at most one secondary on the body |
| Timing | Most loops take three to four and a half seconds, and the float and the drift, which carry a whole drawing on water or across a sky, are slower. Every moment's first comes 0.9 to 1.7 seconds after the drawing wakes, and the test checks that every drawing on the shelf does something visible in its first three seconds. Moments come irregularly: time is cut into windows with the moment at a seeded place in each, and one window in seven is left empty. Heavy things are slower and smaller, light things quicker. | loops 2.9 to 4.4 s; moments every 3.4 to 5.2 s; heavy 1.35 times the period and 0.8 the amplitude, light 0.82 and 1.12 |
| Exaggeration | A use site chooses an intensity, and a pointer over a drawing plays its moment at up to 2.2 times for about two seconds. The limits cap all of it. | calm 0.65, normal 1, lively 1.45 |
| Appeal | Moments are rest most of the time. Timings are uneven where life is: a blink shuts in 0.07 s and opens in 0.12, a downstroke is quicker than an upstroke. A plant bends from its foot and a creature leans rather than tilting, so the ground each stands on stays level. | the shapes, and `bend` on a sway |

Staging, solid drawing and the two ways of animating a scene do not apply to a drawing that is already drawn and moves in place. Staging comes back as the budget, which decides what on a page gets to move.

### A phase and a seed for every placement

Every placed drawing gets a seed from its id and where it is placed (`seedOf(id, key)`, the key being its index or position on the page). The seed moves its period up to twelve per cent either side of the declared one, starts it at its own point in its loop, and places its moments. A row of five rabbits therefore never moves in step, and the same seed moves the same way every time, which the test checks for every primitive. Copies of a part in a wave share one clock with an offset; copies without one each take their own seed, so the stars on the night sky twinkle unevenly.

### Rest is the drawing as drawn

Every pose is a distance from rest, and the envelope that wakes and settles a drawing multiplies it, so at nought every pose is exactly the drawing. When a drawing has settled, the player removes everything it wrote, so the page holds exactly what `render()` made. A spinning part is the one exception to easing back: it coasts forward to the next angle at which it looks as drawn (a quarter turn for four sails) and the player then takes its turn away. Paper never moves: `part()` draws nothing different on paper, the player puts every drawing back before printing, and a print stylesheet removes any pose as a second guard.

### Amplitude follows size on screen

A lift of four per cent of a drawing is under two pixels on a 40 pixel icon, which nobody sees, and seventeen pixels on a 420 pixel hero, which is too much. Travel is declared as a share of the drawing's larger side, and a gain of `(160 / size) ^ 0.35`, between 0.7 and 1.6, makes a small drawing move proportionally more and a large one less. A whole drawing never travels more than 16 pixels, turns more than 7 degrees or grows more than 12 per cent, whatever the declaration, the intensity or the size asks for. The player measures each drawing when it comes on screen and again when its size changes.

## The primitives

Fourteen movements, each with one set of tuned defaults. A whole drawing's travel is a share of its larger side; a part's is in the drawing's own units, twenty to a square. The recordings are on real shelf drawings, made frame by frame from the module's own clock.

| Primitive | What it does | Defaults | Recorded on |
|---|---|---|---|
| breathe | grows a little from its feet and back | 3.4 s, 4.5 per cent | the pizza |
| bob | floats up and back on an arc, tilting with it | 3.1 s, lift 0.045, arc 0.45, tilt 1.6 degrees | the placeholder guide |
| sway | turns about a pivot, or with `bend` leans from its foot; `range` makes it uneven, as a flag flutters | 3.9 s, 3.2 degrees | the tree, bending |
| float | a lift, a drift and a turn, each on its own period (1, 1.43 and 1.21 times the base), so it never repeats: the harbour's primitive | 7.4 s, lift 0.05, turn 3 degrees about 85 per cent of the way down | the boat |
| drift | slow travel side to side with a small rise | 7.2 s, 0.06 of the width | the day sky's clouds |
| hop | crouch, jump on an arc, stretch, land, squash and bounce | a moment every 4.2 s, 0.11 of the height, squash 0.1 | the ball; the rabbits in a wave |
| wiggle | a small swing the other way, then three swings that die away | every 4.4 s, 7 degrees | the dog's tail |
| stir | a breeze lifts the sheet at one side, it holds and settles with one dip | every 4.8 s, 1.6 degrees and 0.03 of the height | the ribbon; the number bond, travel only |
| blink | the eyes shut quickly and open a little slower, sometimes twice | every 3.9 s | the face |
| flap | a burst of wing beats, then a glide | three beats of 0.36 s every 3.4 s, 24 degrees | the gull, flying |
| spin | a steady turn that coasts to rest where it looks as drawn | 20 s a turn | the windmill's sails |
| twinkle | dims and shrinks a little, each copy on its own period | 2.9 s, to 58 per cent, 14 per cent smaller | the lantern; the night sky's stars |
| flow | slides back and forth, or rises and fades a little, as water and steam do | 3.3 s, 5 units | the mug's steam |
| idle | a breath, and now and then a lean to one side and back: the gentle idle for faces, creatures and guides | 3.6 s, a lean of 2.6 degrees every 7.5 s | the cat, which also blinks and flicks its tail |

The guides' own idle repertoire (bob, breathe, squash, sway, flutter, flicker, pulse, blink, sleep) is the same set of movements. Each guide design already tags its layers with a class for its styles, and a declaration can pick a part by that class, so the six guide designs on the shelf move here through this module without a change to their drawings.

## How a drawing declares its movement

A declaration is data in `src/art/animation.ts`, keyed by the drawing's id on the shelf. It names a movement for the whole drawing, movements for its parts, a weight, or a reason it is still.

```ts
"svg.cat": {
  body: m("idle"),
  parts: {
    eyes: p("blink", { of: [span(16, 21)], period: 4.2 }),
    tail: p("wiggle", { of: [span(0, 1)], deg: 10, period: 5.4, cycles: 2, pivot: [120, 134] }),
  },
},
windmill: { parts: { sails: p("spin", { rev: 18 }) } },
clock: { still: "An instrument holds still while its reading is taken." },
```

A part moves only where the drawing drew it, which answers a limit the harbour found: the shelf draws the gull standing or flying from one set of settings, and its wings are a part only when it flies, so a standing gull floats and a flying one also flaps. A part is found in one of three ways. A coded drawing draws the part into a group of its own with `part(c, "sails", hub, { symmetry: n })`, which carries its name, its pivot, a mirror for a part drawn facing the other way and how many ways round it looks the same; the change to a drawing is a line, and on paper `part()` returns the drawing's own group, so what prints is unchanged. A hand-drawn file has no groups, so its declaration names its elements by the order the file draws them (`of`), one list for each copy of the part, and the player gathers them into a group when the drawing first plays; the test fails if a file no longer has the elements a declaration names. A part a drawing already tags another way, such as a guide's `.g-flutter`, is picked by that selector (`pick`), and its pivot is read from the transform origin the drawing gave it. Excalidraw files move as a whole, since their elements are drawn through the pen and are not one to one with the file.

This round added parts to eighteen coded drawings: the gull's and the eagle's wings, the parrot's wing, the fox's brush and the dog's tail, each rabbit and each bird on the wire, the whale's spout, the frog on the pond, the day sky's clouds and the night sky's stars, the volcano's smoke, the windmill's sails, the lighthouse's lamp and beam, the cottage's smoke and lit windows, the cake's flames, the lantern's glow and flame, the face's eyes and the ten frame's counters. Every take of every one of them was rendered before and after the change, and the screen output is the same path for path, with the same anchors.

Each shelf has a default for a thing (an animal, a bus, a hand-drawn file) and for paper (a chart, a frame, a mark on the page), and a place a child writes or taps is still everywhere. `resolve(id, kind)` takes the drawing's own declaration if it has one and its shelf's default otherwise, then applies the reading rule, so every drawing on the shelf resolves, including one added today, and a still one says why.

| Shelf | A thing | Paper |
|---|---|---|
| Animals, people | idle | stir |
| Food and the kitchen | breathe | stir |
| At home and at play, outdoors and nature | sway, bending from the foot | stir |
| Buildings and places | still: a building's life is in a part that moves | still |
| Getting about and maps | float | stir |
| Sport and games, coding, the page | bob | stir |
| The maths shelves | bob | stir, travel only, because paper there carries a reading; measuring paper is still |
| Science | breathe | stir |
| Letters and words | still: letters and words hold still to be read | still |
| Stories | stir | still: read line by line |
| Writing | idle | still: it is written on |
| Music | stir | still: notes are read as text is |

Of the 335 drawings on the shelf when this was written, 61 have a movement of their own, 177 take their shelf's default and 97 are still; the count moves as drawings are added, and a new one takes its shelf's default the day it lands. The still ones, with their reasons: 21 instruments whose reading is taken off them (the clocks, the ruler, the protractor and set square, the jug, the dial and spring scales, the thermometer, the spinner, the beaker, burner and funnel, the scoreboard, the departure board, the fuel gauge, the station, the clock tower and the compass); 3 balances, where which way it tips is the answer; 17 places a child writes or taps; 15 pages of text; 11 letter and word drawings; 6 drawings that are written on; 3 music drawings; 10 buildings with no part that moves yet; 5 hand-drawn settings, which are the ground other drawings stand on; 2 clue pictures; and the signpost, the moon, the goal and the mountain peaks, each for its own reason. Of the drawings that move, 137 carry a reading and 106 of those move by travel alone.

## The rules

A drawing that carries a value a lesson may ask about never moves to a different reading. The rule is the resolver's, not each declaration's: for a drawing in `READS`, and for any paper on the maths shelves, `rigid()` takes every turn, lean, change of size and fade out of its movement and drops every part not marked `free` (the day sky's clouds and stars are free; its moon is not). What is left is travel as one piece, which moves every mark and the thing it is read against together. The test samples every such drawing for thirty seconds, at three seeds, at the lively intensity and at 40, 160 and 480 pixels, and fails on any frame with a turn, a lean, a size or an opacity that is not the drawing's own. A second test catches the drawing nobody listed: any drawing with a setting named like a reading (`hour`, `minute`, `value`, `level`, `tilt`, `price`, `phase` and the rest) must carry a reading or be still, or be named in `NOT_A_READING` with the reason, and the message says which line to add. Two drawings added by other work while this was being written, the canal lock and the arcade's road, were caught by it on the day they landed.

What never moves, and why:

- A reading, as above. The instruments are still rather than travelling, because a reading is taken off them.
- Anything under a pencil: every input, every page of text, every drawing that is written on, and the letters and words a child reads.
- Nothing flashes. Nothing dims below half, and nothing changes brightness more than 0.8 times a second, far under the three a second at which WCAG starts to worry about flashing.
- Nothing keeps a beat. Moments come at uneven intervals, a spinning part takes at least twelve seconds a turn, and no clock hand, needle or pointer ever moves.
- Nothing is recorded. A pointer over a drawing plays its moment and nothing counts it.
- Nothing moves under reduced motion. The module never starts, a device that asks for less motion mid-session gets every drawing back as drawn at once, and a still drawing is complete because rest is the drawing.
- Nothing moves on paper, and a hidden tab or a drawing off screen is put back as drawn and costs nothing.

## One module, any page

A use site opts in and says how much motion it wants. Everything it plays shares the page's one stage: one ticker (the engine's `ticker`) for what is still drawn frame by frame, one IntersectionObserver that rests whatever is off screen, one answer to reduced motion, printing and a hidden tab, and one frame budget.

```ts
const shelf = animate({ intensity: "normal", settle: "never", most: 60 });
shelf.play(svg);              // by the id render() stamped on it
shelf.scan(section);          // every drawing under a node
shelf.settle(true);           // rest while a child works, as the journal does
shelf.wake();                 // for a site that settles after a while: move again
playing.poke();               // its moment now, bigger for a moment; nothing records it
```

`settle` is the site's policy: "never" moves a drawing whenever it is on screen; a number of seconds moves it for that long after it comes into view, and then it rests until `wake()` or a pointer asks again; and any site can settle its drawings itself.

| Use site | Built | Intensity | Settles | What moves |
|---|---|---|---|---|
| The shelf, with its switch on | yes | normal | never, and the shelf rests while the detail is open | every drawing on screen, up to the budget; a pointer over a card plays its moment |
| The shelf's detail | yes | calm, normal or lively, chosen there | never, with a pause | the one drawing, with its declaration and every setting written out beside it |
| The site-l opening | yes | calm | after eight seconds, and again while a pointer moves over it | the drawings strewn behind the headline, except the ghosted ones behind the words; the clock by its own declaration |
| The journal's worlds | yes | the world's own, scaled by weather | while a child is working (`isWorking`), and half a minute after a drawing comes into view on the map | margins and horizons, never over paper |
| A lesson on screen | no | calm | after six seconds | only a drawing the lesson asks to move (below); never on the printed page |
| A parent's page | no | calm | after six seconds | a drawing beside a lesson's name or a letter |
| A game | no | lively | never while it plays | a board's decorations; the engine keeps its springs for play |

### A lesson could ask for it

We have not built this. The notation would take one flag on a scene's node, `windmill pic moves`, or `moves=calm` for an intensity, and only in a `look` block, where a drawing is shown rather than answered. The lesson's screen view plays such a drawing with the calm intensity and a six second settle, and the print view never loads the module. The checker would refuse `moves` on a drawing that resolves to still and say why (an input, a page of text, an instrument), so the reading rule holds by construction, and a lesson that asks for a clock to move gets the reason a clock does not. A pendulum or a rising level, where the motion is the idea, would need its own drawing and a declaration of its own, and would go through the same checks.

## Performance

The player hands the browser each movement as keyframes and lets it play them, rather than writing a pose every frame (14 September 2026). `keyframesOf` in `engine/motion/animation.ts` samples `poseOf` thirty times a second over one cycle, with the size rule and the limits applied, into one `transform` a keyframe. For the whole drawing that is a matrix on its `<svg>`, or on the box it fills when a page gives one; for a part, a matrix on its `<g>` in the drawing's own units. A plain loop's cycle is its period. Anything with moments, or a float's three periods, is sampled over a minute whose last second blends into its first, so it repeats without a jump and its moments still come unevenly. A wake and a poke are keyframes of their own that end where the cycle takes over, and a settle eases from wherever the browser has the drawing back to rest. Only a spinning part, which coasts to rest where it looks as drawn, and a recording that seeks the clock are still drawn by the player frame by frame, a part at most thirty times a second, and a drawing with parts still counts as three against the budget. Every update drawn that way is capped near sixty a second, so a 120 Hz display does not draw slow movement twice as often. Once a second the budget looks at what our own work cost per frame and at how many frames came later than one and a half of the display's own interval: over four milliseconds, or a quarter of frames late, and the least important quarter of the moving drawings settle; comfortably under, one more may wake. Importance is how much of the screen a drawing takes and how near the middle it is.

We measured on the production build in headless Chrome at 1440 by 900 on the development machine, a laptop that was running other work at the time (its load average was between ten and twelve), so these are the order of the cost rather than a benchmark. Main thread is the renderer's main thread, in milliseconds a second.

| View | Animation off | Animation on | Moving | Our own code |
|---|---|---|---|---|
| The top of the shelf, 20 drawings on screen | 5 ms/s | 65 ms/s | 10 | 0.18 ms a frame |
| Scrolling the whole shelf top to bottom, each drawing playing as it comes into view | 40 ms/s | 130 ms/s | up to 16 | 0.42 ms a frame |
| 109 drawings on screen at once, the grid shrunk to 66 px tiles | 8 ms/s | 243 ms/s | 36, with the budget | 0.44 ms a frame |
| The same, with the budget lifted | | 285 ms/s | 91 | 0.63 ms a frame |

The time is Chrome's rather than ours. A trace of the top of the shelf gave 41 ms a second of painting for drawings whose parts move and none for drawings that move as a whole, and our own code stays under a millisecond a frame even with 91 drawings moving. In two runs scrolling the whole shelf, the frame times were the same with animation on as off at the 95th and 99th percentiles (9.1 and 9.3 ms), the worst frame was 33 ms against 17 ms, and no frame took more than 50 ms; an earlier run had one frame of 525 ms, which the two later runs did not repeat. For comparison, the harbour's busiest view spent 106 ms a second, with six things moving. We have not measured on a 60 Hz or 120 Hz display with a GPU of its own, or on a tablet, and the budget's late-frame signal is there for exactly that case: headless Chrome drew at 30 frames a second in some runs and near 110 in others, and the budget followed each.

The change to keyframes was measured on the development server at rest on `/home` and `/kids`, at 1440 by 900 with the CPU slowed four times, taking the lower of two runs of each. Before it, the player spent 22 ms a second of its own script on the ten drawings behind `/home` and 19 behind `/kids`, and wrote 626 to 891 styles a second, with the pages' main thread at 936 and 615 ms a second (load average 10 to 12). With every whole drawing and part on keyframes, the player's script was under 1 ms a second on both and it wrote no styles, and the main thread was 291 and 199 ms a second (load average 9). The load was lower for the second pair, so the main-thread figures give the order of the change rather than its size. Measured on their own, over a page as heavy as the map, two moving parts in each of three drawings cost 34 to 55 ms a second of main thread as a `transform` attribute written thirty times a second, and 1 to 2.4 as keyframes on their `<g>`, which is why the parts moved to keyframes as well. The measuring scripts are kept outside the repository.

The pages were still paying for main-thread frames at rest after that, and a trace of Chrome's own compositing decisions (the `compositeFailed` reasons on its `Animation` trace events) found two causes, neither of them the keyframes (15 September 2026). The boil hid its two waiting frames with `visibility`, which no compositor animates, and an animation inside a frame hidden that way counts to Chrome as having no visible change, so a guide's idle in its three frames fell off the compositor and back on at every switch of the boil, and every switch cost the page a main frame of style, layerize, paint and commit. On `/home` at rest with the CPU slowed four times, the guides' boil cost 87 ms a second alone, their idle 176, the two together 206, and the page 284 in all. The boil now hides a frame with `opacity` (`.scratchpad/src/styles/boil.css`), which draws the same pixels, and the idle stays on the compositor, where the same animations cost under 5 ms a second. The second cause was the player's own. The wake it plays into a cycle and the cycle it hands over to are two animations on one element's `transform`, and Chrome plays neither on the compositor while both exist, nor looks again when one of them goes, so every cycle stayed on the main thread after its wake for as long as it ran. The player pauses and plays the cycle the moment the wake is cancelled, which moves no clock and has Chrome look again. Measured at rest and untouched, as thread time from a trace with the CPU slowed four times: `/home` went from 284 to 2 ms a second, `/kids` from 679 to 14, and the harbour from 715 to 29; what remains on the harbour is the world's own animations on parts (the kite's tail, the bunting, the bird's parts), which are not the player's. The guides' idle stayed on its CSS for the moment, since its animations on `<g>` were composited once no frame was hidden, and the bar's bird and the harbour's guide at rest were compared pixel for pixel before and after, and were the same. With the guides' move into `engine/parts/guide/` later that day, the CSS idle went: a guide's idle is the guide family's motion in `parts/drawing.ts`, on the layers its design tags, played by the player like every other drawing's, and the boil's rules are the player's stylesheet's (`engine/ui/animate.css`).

## How the worlds move onto it

The harbour's declarations moved first. `src/art/motion.ts` is gone: the boat, the ship, the gull, the crabs, the duck, the kite, the bunting, the lighthouse and the volcano are declared in `src/art/animation.ts` in this format, with the harbour's numbers (a float with its lift, drift and turn in world units, the bunting's flags and the kite's tail by the order of their paths, the volcano's puff and each drawing's answer to a tap). The world's player reads them through `worldMotion()`, which hands its styles exactly the values they had: all nine were compared field by field with the old declarations before the old file was deleted, and no other drawing a world places picked up motion it did not have. The world's budget, `MOTION_BUDGET`, moved into `src/world/motion.ts`, and the world's tests read the new declarations.

The rest was a sequence of small steps, and they landed together on 17 September 2026.

1. Every painter that places a drawing in a world hands it to a group from `animate()`, and `isWorking` calls `settle()` on that group. The world's intensity is its weather. The one thing the module did not know is the camera: a world is drawn on a stage that is scaled, so a site now carries a `zoom()` and the size rule reads the size on screen, which replaced the lift growth in `journal.css`. A camera that comes to rest at a new zoom calls `rescale()`, which makes the keyframes again where the change is enough to see.
2. The float, flag and tail rules in `journal.css` retired with the classes that drove them (`mo`, `mo-w`, `mo-float`, `mo-flag`, `mo-tail`, the coded parts and the older `moves-*` loops). The module's float is a sine where the styles eased in and out. Sampled every tenth of a second over fifteen seconds at rest, the child's map moved the same three drawings before and after, within the budget, with the boat turning a little less (6.5 degrees end to end against 8); on the harbour's horizon in the child's world only the crabs had moved before, and the boat, the two ducks, the kite and the cat now move as their declarations ask. Under reduced motion both trees drew the same markup and ran no animation.
3. The reactions to a tap (the lighthouse's flash, the crab's step, the duck's dip, the gull's hop) stay in `engine/ui/player.ts` on the engine's ticker, because they are events with cues rather than idle movement. The gust is the module's poke.
4. The puff and the water's flow stay the world's, because they draw things that are not in the drawing. So do the map's own travellers, which are one keyframe animation per element from the laid-out map rather than a drawing's declaration.
5. The older `moves` field on the world's art list is no longer read by a painter: every drawing a world places plays its own declaration.

What the world's player kept is what a world adds to a drawing: the puff, the water, a tap's answer, a moment's light, the day's events and the rare sights. What rests a drawing is the group's own policy, and nothing else on a page rests, wakes or pauses one: the map's five second wake became its group's settle policy, and the roll's stage-wide amplitude became `settle()` on its group. At rest with the CPU slowed four times, the child's map and world cost 0.5 and 0.3 ms a second of main thread after the move, against 0.3 and 0.4 before, and a five second trace of the harbour, the child's map and the child's world showed no style, paint or commit on the main thread while 16 to 115 animations ran.

## What is not done

- The notation's `moves` flag, and the lesson screen that would play it.
- Parts for the drawings that would gain most from one: the houses' chimneys, the goal's ball, the bus's wheels, the train's steam, the owl's eyes. Each is a line in its drawing.
- Paper output is not deterministic for anything filled with the glow colour: rough.js draws its dotted fill with an unseeded `Math.random()`, so two prints of the same lesson differ in their dots. This is not caused by animation, and printing is otherwise untouched by it, but it contradicts the promise in `core/pen.ts` that a seed draws the same strokes on screen, in replay and in print. A filler of our own, or a seeded copy of rough.js's, would fix it.
