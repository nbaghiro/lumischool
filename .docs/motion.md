# Motion

Status: proposed, September 2026. This document goes through the twelve worlds of the journal and the map above them and proposes small movements for the things drawn in them: what is always there and barely noticed, what answers a tap, what happens because of something the child did, and what happens once in a long while. It sets out the rules those movements have to keep, the few primitives they reduce to, and the ten we would build first. It is written against [journal.md](journal.md) and [story.md](story.md), which describe the worlds and what a child's work makes happen in them, and against the limits in [product.md](product.md), [ai.md](ai.md) and [sound.md](sound.md). Since it was written, the harbour has been built end to end from it, as it would ship, so the plan could be seen moving before the other eleven worlds are. The owner found that first pass too subtle, and a second pass made every movement larger and quicker and set the water flowing; the budget below is the second pass's, and the last sections say what the build is, what it measured, what it changed in the plan, and what the other worlds would take.

The movement of every drawing on the shelf, the harbour's included, is now declared in one format and played by one module that any page can opt into, with the principles it is built on, its primitives, the rule that a drawing carrying a reading never changes it, and how the worlds move onto it; [animation.md](animation.md) describes it. The harbour's declarations have moved from `src/art/motion.ts` into `src/art/animation.ts`. Since 17 September 2026 the worlds move on that module too: every drawing a world places plays its own declaration through `engine/ui/animate.ts`, on a group the page owns that knows the camera's zoom, and what the world draws beyond the drawing (a puff of smoke, the water's flow, a tap's answer, the day's events, a rare sight) is `engine/ui/player.ts`'s. Where a sentence below describes an idle movement as a CSS class with its own properties, that is how the harbour was built and no longer how it runs.

## The principle

The work is the point and the world is the room it happens in. A child doing a question should be able to forget the world is there, and a child who looks up from the page should find that it is. So the world moves when the child is in it and not at a sheet, and settles, without stopping mid-gesture, when a sheet has their attention. Everything that moves does so gently and out of step with everything else, in the margins and the sky and never across paper, but plainly enough that a child who looks up sees the world breathe within a few seconds of looking. Calm is the aim, and still is not calm; it reads as a picture. A child who taps something gets an answer, but nothing needs a tap and nothing counts one. And a device that asks for less motion gets a world that is still and complete.

## What exists

Each world is a declaration in `school/worlds/`, drawn from the shelf with the same pen as the lessons. The table is what is on screen today, taken from the declarations and from screenshots of each world's arrival and of a lesson day in it.

| World | Year, term | Sky | Ground, path | On the horizon | Beside the path | Creatures | Weather, seasons | Guide |
|---|---|---|---|---|---|---|---|---|
| The meadow | 1, 1 | sky wash, sun | grass, footpath | apple tree, hills, sheep; garden gate | tree through the year, pond, treehouse, flowers, sheep, wheelbarrow | rabbit, hedgehog, hen, minibeasts | clear; summer to autumn | firefly |
| The harbour | 1, 2 | sky wash, sun | sand between waters, boardwalk | two boats, the island far off; lighthouse gate, dark until the moment | sandcastle, market stall, kite, boat, bunting, fish tank | gull, crab, duck | breezy; autumn to winter | paper bird |
| The railway | 1, 3 | sky wash | embankment, rails on sleepers | train; station gate with a clock | departure board, suitcases, signpost, sidings, bus, bicycle | birds on a wire, fox, cat | cloudy; spring to summer | glow |
| The woods | 2, 1 | deep dusk, moon | leaves and ferns, stepping stones | three rows of firs; treehouse gate | tree through the year, pond, firs, apple tree | fox, owl, two rabbits, hedgehog | clear; autumn to winter | snail |
| The kitchen | 2, 2 | a wall, indoors | tiles, a rug | jug, window with snow, mixing bowl, cake; counter gate | birthday table, tray of buns, pizza, scales, mug, plates | cat, mouse | snow at the window; winter | dot |
| The town | 2, 3 | sky wash | paving with puddles, crossings | two streets of houses, clock tower; shop gate | market stall, bus, clock tower, bicycle, signpost, bunting | dog, cat, birds | rain; spring to summer | pencil stub |
| The night sky | 3, 1 | deep night, big moon, a hundred stars | heather hill, a line of stars | firs, far mountains, telescope; rocket gate | telescope, firs, pond, rocket | owl, fox, hedgehog | starry; autumn | firefly |
| The sports ground | 3, 2 | sky wash | mown stripes, running track | two grandstands, scoreboard; podium gate with an empty step | goal, target, team shirts, long jump, medals, race track | dog, birds | breezy; winter to spring | hand |
| The laboratory | 3, 3 | a wall, indoors | floorboards, floor tape | beaker, burner, jar of particles, window, balance; door gate | circuit, magnet, thermometer, stopwatch, spring balance, ramp | mouse | clear at the window; summer | glow |
| The mountains | 4, 1 | sky wash, eagle | snow, bootprints | peaks, firs in snow; tent gate | thermometer below zero, firs in snow, summit, signpost | hares, fox, perched eagle | snow; autumn to winter | paper bird |
| The open sea | 4, 2 | deep storm, gulls | open water, buoys on a rope | the harbour's lighthouse far off, iceberg, the island, whale; ship gate | compass rose, iceberg, lighthouse, chest | whale, gulls | rain; winter | glow |
| The volcano island | 4, 3 | deep ember glow, moon | big leaves and flowers, lanterns on posts | palms, volcano, stepped temple; boat gate | temple, chest, palms, lantern, volcano | parrot, crabs, gull | clear; spring to summer | firefly |

What moves today is small and mostly declared in one place. A creature in `school/worlds/art.ts` carries `moves`, one of bob, sway or hop, and the page gives it a CSS loop (bob is 7 units up and down over 3.4 seconds, sway 2.4 degrees either way over 4.2 seconds, hop a 16 unit hop once every 6 seconds), each started at a phase taken from where it stands so no two move in step. The same declaration makes the horizon's boats and the whale move, and the kite when the harbour is breezy. The seven guides have their own idle loops (bob, breathe, squash, sway, a wing flutter, a lamp flicker, a pulse, a blink). The engine's springs and timelines already drive four things: a world assembling itself as the child arrives from the map, the map's flights, the colour washing over newly reached land, and a found secret's hop. The map's sea sways and the island's smoke rises. Under reduced motion every one of these is off, and flights are cuts.

Two things are missing that everything below depends on. Nothing settles while a child is working: the creatures in the margin beside a sheet keep bobbing while the child writes. And nothing is declared on the drawing itself, so a boat that sways on the harbour's horizon is still when the same boat is drawn in a lesson or on the map.

## The rules

### The page first: settle and wake

Nothing moves under or across a sheet or its text. Every drawing a world places already keeps three squares clear of paper, and a movement's whole reach (the farthest a hop, a sway or a drift can carry any part of the drawing) has to stay inside that clearance, which the layout test can check once motion is declared with its amplitude. Weather that moves (rain, snow, a falling leaf) falls in the sky and in the margins and never across the column of sheets.

The world settles while a child is working and wakes when they come back to it. We would define working plainly: the camera is at reading distance with a sheet under the middle of the screen and covering at least a quarter of it, or a pencil or highlighter is in hand. While working, every idle movement eases to its rest pose over about a second and a half rather than freezing mid-gesture, so a boat comes to rest level and not tilted, and no rare event starts. When the child steps back to the days or the map, or rests the camera on a horizon or a margin, the movement eases back in over the same time. A tap on a drawing still answers during work, because the child chose it.

This is the rule that could not be judged on paper, and the harbour implements it for every world. Settling is the player's: `isWorking` calls `settle` on the page's group, and the module eases every drawing it moves back to rest over about a second and a half and then takes its keyframes away, the guide's idle included, so a settled world draws no frames at all. It was one amplitude on the stage with a CSS transition on it until 17 September 2026. The first threshold we tried, a sheet covering more than a third of the screen, missed: at 1440 pixels the reading camera shows the sheet with margins either side and the sheet covers 34 per cent, so the world never settled. A sheet under the middle of the screen and covering a quarter is the rule we keep, and `isWorking` in `engine/motion/world.ts` is it, with a test. Water is the one thing that does not ease back to a rest pose, because a current has none: settling slows it to a stop where it is over the same second and a half, and waking brings it back up to speed.

### Still is complete

Under `prefers-reduced-motion` nothing moves, and a still world must look finished rather than paused. Each movement below therefore names its rest pose, and the rest pose is the drawing as it is today: boats level, the smoke drawn as three puffs at rising heights (as the map already does), every star lit, the lantern lit once it has been. An event becomes a change of state with no motion: the moment is simply inked, the rocket is simply gone from its pad and three new stars are in the sky. A tap still answers, as a change held for a moment and released: in the harbour the lighthouse's lamp is lit for two seconds, and a creature is lit round its edge for a second. Rare events do not happen, and nothing is lost by that, because nothing is ever required of one.

### Delight, never a score

[product.md](product.md) rules out streaks, timers used as pressure, currency and anything taken away, and [story.md](story.md) keeps those refusals for the map. For motion that means a tap is never counted, a reaction never unlocks or earns anything, a rare event is never announced, listed, collected or shown to a grown-up as having been seen, and nothing a child can miss is ever something they will be told about. A rare sight is the same sight on another day, so a child who was not looking loses nothing and a child who was gets a small surprise.

### Sound

Sound stays off until it is asked for, as [sound.md](sound.md) sets out, and no movement means anything that depends on hearing it. Where a movement could carry a sound later (the lighthouse, the train's whistle, the bells at twelve), the engine's cues are the place to hang it, and the movement is complete without it.

### A budget

We would hold one screen to at most four things moving idly at once, counting the drawings in view and the guide's own idle, with a sea's flowing marks or a twinkling sky counted as one and never more than ten of its stars changing at a time. On top of that, one reaction while it plays and at most one rare event.

The first pass held idle periods between 4 and 12 seconds one way and amplitudes to 3.5 degrees and 8 units, and at the zoom a child looks at the world from, that read as a still picture: the owner opened the harbour and saw nothing moving. The budget is now set so that each movement is seen within two or three seconds of looking and still never jerks. Idle periods sit between 2.5 and 9 seconds one way, so a float up and back down takes 5 to 18, and each placement takes a seed from where the drawing stands, which moves its period up to twelve per cent either side of the declared one and starts it at its own point in its loop, so nothing pulses in step; a drawing's lift, drift and turn each run on their own multiple of its period, so its path never repeats in step either. Anything that turns takes at least 20 seconds a revolution, and twinkles run between 2.5 and 6.5 seconds. A drawing turns at most 5 degrees either way and travels at most 16 units (under a square); a small part (a flag on a string, a kite's tail) turns up to 16 degrees, on periods of its own between 0.9 and 4 seconds; opacity changes by at most 0.4 and size by 5 per cent. Travel is declared in world units but grows with the inverse zoom, up to 2.4 times, because the world is awake exactly when the camera has drawn back and a lift of a few world units is then a pixel; rotation needs no such help, since it scales with the drawing. The water's flow grows further, up to four times, since water keeps no clearance from paper. A reaction may reach twice the idle and is back at rest within two and a half seconds. The open sea is the one world allowed the top of that range, because a storm is its character.

### Performance

Motion moves pictures that are already drawn; it never redraws them. Idle movement is keyframes of transform and opacity, on the placed drawing or on one named part of it, handed to the browser by the player and played on the compositor, with no JavaScript per frame. Reactions and events run on the engine's ticker only while they play and stop when they settle. The roll already paints only what is near the camera; an observer pauses the animation of anything that leaves the screen, and the whole stage pauses while the tab is hidden or the map covers the roll. Nothing about motion runs while the journal opens: a drawing gets its motion when its piece is painted, and the scheduler for rare events starts after the first quiet second, so the time to open, about a second on a quiet machine, does not move.

### Taps

Anything a child can tap has a hit area of at least 44 CSS pixels at the current zoom: the drawing's own box, grown when the child has stepped back so far that it is smaller than that. A tap is a press and release without dragging, which the canvas already tells apart from moving the paper, so a reaction never gets in the way of panning.

## The primitives

The ideas below reduce to a small set of movements. Most exist in some form already; the new ones are the same kind of thing.

| Primitive | What it does | Used for | Exists as |
|---|---|---|---|
| bob | up and down, eased | creatures, buoys, the guide | `moves: "bob"`, the guides' `g-bob` |
| sway | a turn back and forth about a pivot | creatures, palms, a kite, a pendulum | `moves: "sway"`, `g-sway` |
| hop | a quick lift and land | rabbits, hares, a startled crab | `moves: "hop"`; as a reaction, an engine spring |
| breathe, flicker, pulse, blink, flutter | the guides' idle repertoire | lamps, candles, wings, eyes | the guides' classes, which would move to shared classes |
| float | up and down, side to side and a turn about a pivot, each on its own period | boats, the ship, the kite, creatures, buoys | built in the harbour, where it took over rock, bob and sway: each of those is a float with some of its three movements at nought |
| drift | a slow travel within a band, fading in and out at its ends | clouds, gulls, a far ship, a balloon | built in the harbour for its far ship |
| flow | marks carried steadily downwind in staggered layers, each fading in upstream and out downstream | the harbour's water, rivers, blown snow | built in the harbour, for its sea |
| trail | a part hanging from a point swings downwind while its shape widens and narrows, its knots turning in turn | a kite's tail, a streamer, a windsock | built in the harbour, on the kite's tail |
| twinkle | opacity and size, each at its own period | stars, fireflies, glints | new |
| puff | a small cloud that rises, grows and fades, carried downwind | smoke, steam, sand | built in the harbour, three at a time at a drawing's own anchor |
| fall | a drift downward with a turn and a sway | leaves, snow, rain in the sky | new |
| turn | a slow rotation, or a few turns that slow to a stop | a windmill, wheels, a spoon, clock hands going forward | new |
| ripple | a ring that grows and fades | puddles, the pond, a whale's splash | built in the harbour, for the duck's dip |
| flap | a wave passed along named parts, each turning about its own top | bunting, flags, grass in a gust | built in the harbour, on the bunting's seven flags, continuously rather than in gusts |
| flash | a light part coming on and going off on a timeline | the lighthouse, the tent's lamp, lanterns, the bulb | built in the harbour |
| swing | the engine's damped swing on a pivot part | the compass needle, the balance, the scales, the telescope | the engine's `SPRINGS.swing` |
| glide | travel round a slow ellipse with a bank | the eagle | new |
| travel | a drawing moving along a path | the train pulling in, a creature joining the guide | the map's travel along a road, on the engine's timeline |

Everything that is played once (a reaction, an event, a rare sight) is a timeline with cues on the engine's ticker, collapsed before it runs under reduced motion, which is how the world's arrival and the map's flights already work. Everything that loops is keyframes made from the drawing's declaration, at its own period, amplitude and phase, played by the one player so the whole world can settle together; the water, which cannot ease back to a rest, is the world's own keyframes and has its playback slowed to a stop instead. The primitives are few enough to keep in one module, which would be `school/worlds/motion.ts` beside the worlds.

### Declared on the drawing, once

Motion belongs to the drawing, the way its parameters and anchors do, so the same boat rocks in the harbour, on the map and in a lesson that asks for it. The first declaration was `moves` on a world's art entry, which is the right idea in the wrong place. The harbour build moved it to `src/art/motion.ts`, since folded into `src/art/animation.ts` ([animation.md](animation.md)): one declaration per drawing, keyed by the drawing's own name on the shelf (a coded visual's id, or a hand-drawn file's name), holding the idle movement with its amplitude and period, the reaction to a tap, and the parts that move on their own. It sits beside the shelf rather than inside each visual's definition because it imports nothing, so a lesson, the map and a test can all read it without loading any art. Where a coded drawing needs a part to move on its own, its draw function would put that part in a group of its own; where a hand-drawn file does, the declaration names the part by the order of the file's strokes, as it does for the bunting's seven flags, and the test checks that the file still has those strokes. Where a movement needs a point on the drawing (the lamp, the crater), it uses the anchor the drawing already declares. The harbour's gull showed one limit of keying by the drawing alone: the shelf draws the gull standing or in flight from one set of parameters, and a standing gull should shift its weight about its feet while a flying one floats. The declaration is for the standing gull the harbour uses, and a later version will need declarations that can depend on a drawing's parameters.

A world then only chooses. Weather scales the amplitude (a breezy harbour sways its bunting harder, a storm rolls the ship further), and the surface decides whether motion plays at all: the journal's margins and horizons play it, a lesson's sheet does not by default, and a lesson can ask for a drawing's motion in a block where the motion is the content, a pendulum or a rising level. Hand-drawn files have no parts, so they can bob, sway, hop and flash as a whole but not wag a tail; where a reaction below needs a part a file does not have, it says so.

## The worlds, one at a time

Each world is its own place, and its movements should be the kind that place has. The tables give each idea with the drawing it uses, the movement, how often, and what keeps it alive rather than busy. Where a world has nothing good to add of a kind, it says so.

### The meadow

A summer morning in long grass. The meadow moves like a breeze going through it and small lives in the grass.

| Kind | Drawing | Movement | How often | Why alive, not busy |
|---|---|---|---|---|
| Ambient | the long grass along the horizon | a gust: tufts lean together in a wave that crosses the world, 3 degrees, a second and a half a tuft | one gust every 12 to 18 seconds, still between | wind comes and goes; a loop would not |
| Ambient | the butterfly among the minibeasts | a wing flutter, then rest | a flutter of half a second every 3 to 6 seconds | rest is most of its time |
| Reactive | the rabbit | one hop and a turn to face the other way | on a tap | it answers and settles |
| Reactive | the pond | the frog jumps to another pad and a ring spreads on the water | on a tap; needs the frog as a part | a small surprise in a picture a child already knows |
| Event | the kite, the meadow's moment | rises into the moment's picture on a spring, then tugs gently | once, on the day the last lesson is finished | the term's end moves; nothing else does that day |
| Event | the apple tree, lit by making ten | its apples brighten and one falls into the grass | once, when it is lit | the lesson's gift is something that happened |
| Rare | a hot-air balloon, new | drifts across the upper sky, never behind the name | at most once a visit, after two minutes resting on the meadow's sky | a child who lingers sees the sky do something |

### The harbour

A breezy afternoon on the shore, with the wind from the left. The harbour moves like water and wind. These are the numbers from the second pass.

| Kind | Drawing | Movement | How often | Why alive, not busy |
|---|---|---|---|---|
| Ambient | the water's marks | flow downwind, 80 units in 9 seconds, fading in and out | always, in four layers a quarter of the flow apart; built | the sea reads as moving water, and no mark is seen to go back |
| Ambient | the kite | floats 13 units up and down and 8 side to side, turns 4 degrees about its knot; its tail streams downwind and ripples | periods near 3.7 seconds, the tail's near 2.3; built | the thing the owner looked at first, now plainly in the air |
| Ambient | the boats on the horizon and in the margin | rock about the waterline, 4 degrees and 10 units | each at its own period, spread by where it stands; built | two boats never lean together |
| Ambient | the bunting | a wave passed along its flags, 14 degrees a flag, and the string lifting 5 units | the wave always, 1.3 seconds a flag; built | wind is visible without anything travelling |
| Ambient | the gull, the duck, the crab | shift their weight about their feet, 4 to 5 degrees, and shuffle 6 to 9 units | periods near 2.9 to 3.7 seconds; built | each looks alive without leaving the ground |
| Ambient | the island's smoke, far off | three puffs rising and carried downwind | a new puff every 2 seconds; built | the island is a volcano, even from here |
| Reactive | the lighthouse | the lamp comes on, the beam swings across once and goes out | on a tap; built | the tallest thing answers the smallest touch |
| Reactive | the crab | a step sideways and back | on a tap; built | crabs go sideways; that is the joke |
| Reactive | the duck | dips its head under and up, with a ring on the water | on a tap; built | a creature doing what it does |
| Event | the lighthouse, the harbour's moment | on the day it is lit the beam makes one full sweep, then the lamp stays steady | once; built | the gate that was dark all term changes on the day |
| Event | the crab joining the guide | walks along the path from its place to behind the guide | once, on the day it joins; built | the follower is seen arriving, not just found there |
| Rare | the fourth year's sailing ship | crosses the far horizon slowly, rocking | at most once a visit, after two minutes on the horizon; built | it is the ship the child will sail on in three years |

### The railway

A cloudy day on the line with a train waiting. The railway moves like waiting and then going: steam and a timetable.

| Kind | Drawing | Movement | How often | Why alive, not busy |
|---|---|---|---|---|
| Ambient | the train on the horizon | a puff of steam from its chimney rises and fades | one every 5 to 9 seconds, irregular | an engine that is waiting breathes |
| Ambient | the birds on the wire | one bird hops a little way along the wire | one bird at a time, every 8 to 15 seconds | the row is still apart from one bird |
| Ambient | the clouds | drift 40 units and back | 20 seconds | a cloudy day is slow |
| Reactive | the train | a bigger puff and a small lurch forward and back on a spring | on a tap | it never leaves; leaving is the moment |
| Reactive | the bicycle | its wheels spin and slow to a stop | on a tap; needs the wheels as parts, and the bicycle is a file | a turn that runs down reads as real |
| Event | the train, the railway's moment | pulls in along the rails and stops at the station with one small overshoot | once | "The train pulls in" is the moment; the child sees it do so |
| Event | the birds joining the guide | one bird flies from the wire to the guide | once, on the day they join | as the harbour's crab |
| Rare | a goods train, the train drawing with more trucks | passes small along a far line | at most once a visit | the line is busy beyond what the child sees |

The station's clock does not react. A clock that changes when tapped would undo the lessons about reading time that the station stands beside.

### The woods

An autumn evening under a deep dusk. The woods move slowly and quietly: falling leaves and first lights.

| Kind | Drawing | Movement | How often | Why alive, not busy |
|---|---|---|---|---|
| Ambient | a leaf from the tree through the year or the firs | falls 120 units over 6 seconds, turning and swaying | one leaf every 8 to 15 seconds, in the margins only | one leaf is a season; many would be a screensaver |
| Ambient | fireflies under the firs, new marks | tiny lights coming on and going off unevenly | four to six, each on for half a second every 3 to 8 seconds | slow light at dusk |
| Ambient | the owl | its sway, slower than now | 6 seconds | an owl at dusk barely moves |
| Reactive | the owl | a small squash and turn, as if it turned its head | on a tap; a real head turn needs a part the file does not have | the owl notices |
| Reactive | the two rabbits | one freezes, then hops a little way off and back | on a tap | rabbits at dusk are wary |
| Event | the moon, the woods' moment | rises from behind the firs at the foot, its light growing | once | the moon that grew fuller all term arrives full |
| Event | the snail arriving | slides in to the gate, slower than any other guide | on arrival | the woods' pace is set by its guide |
| Rare | the fox | trots across the far edge of the clearing along the horizon | at most once a visit | the woods have more in them than the path shows |

### The kitchen

A warm kitchen with snow at the window. The kitchen moves like steam and the one weather that reaches indoors.

| Kind | Drawing | Movement | How often | Why alive, not busy |
|---|---|---|---|---|
| Ambient | the window | snowflakes fall past the glass, clipped to it | six flakes, each 8 seconds; needs the flakes as a part | the cold outside makes the room warm |
| Ambient | the mug and the pizza | a curl of steam rises and fades | one every 4 to 7 seconds each, out of step | warmth you can see |
| Ambient | the cake's candles, once lit | a flicker of each flame, uneven | 1.9 to 2.6 seconds, each its own | small and warm |
| Ambient | a wall clock, new, from the shelf's clock | a pendulum swings; the hands do not move | 2 seconds a swing, and it stops while the child works | the room's rhythm without a timer |
| Reactive | the scales | the pointer wobbles and settles back on its reading | on a tap; the engine's swing | the reading a lesson may ask about never changes |
| Reactive | the mixing bowl | the spoon stirs round once | on a tap; needs the spoon as a part | a kitchen thing doing a kitchen thing |
| Reactive | the cat | stretches | on a tap | a cat in a warm kitchen |
| Event | the cake, the kitchen's moment | its candles light one by one, left to right | once | "The cake is out of the oven" lands as a small ceremony |
| Event | the pizza, lit by thirds | its slices part a little and come back together | once, when it is lit | shows the equal parts the lesson was about |
| Rare | a robin, the bird from the wire | lands on the outside sill for twenty seconds | at most once a visit | winter visitors |

The brief for this round suggested a ticking clock here. We would not put a ticking second hand in a room where a child works, because it reads as a timer; a pendulum gives the room its rhythm, stops while the child works, and shows no time passing.

### The town

Market day in the rain. The town moves like rain and a busy square.

| Kind | Drawing | Movement | How often | Why alive, not busy |
|---|---|---|---|---|
| Ambient | the rain in the sky | the rain marks fall and fade in the sky band, slanted | a 1.2 second fall, looped, above the horizon only | rain is weather, kept out of the page |
| Ambient | the puddles in the paving | a ring grows and fades | one puddle at a time, every 2 to 5 seconds | the rain is landing somewhere |
| Ambient | the bunting | as the harbour's, gentler | a gust every 6 to 10 seconds | a market day |
| Reactive | the bus | its springs rock it a little | on a tap | it is waiting at the stop, not driving off |
| Reactive | the dog | wags, then sits | on a tap; a real wag needs the tail as a part | a dog pleased to be noticed |
| Event | the clock tower, the town's moment | the hands go forward round to twelve, the tower rocks twice, the birds lift off the roofs and settle | once | "Twelve o'clock. The bells ring out." with the bells heard in the movement |
| Rare | a rainbow, new, in the five markers | the rain stops and a rainbow shows over the rooftops for a minute | at most once a visit, only while the child lingers on the horizon | the best reason there is to look up |

### The night sky

A clear night on the hill under a real dark sky. The night sky moves like slow light.

| Kind | Drawing | Movement | How often | Why alive, not busy |
|---|---|---|---|---|
| Ambient | the stars | twinkle: dim to about half and back, a little smaller | each star its own period between 2.5 and 6.5 seconds; never more than ten changing at once | most stars are still, which is what makes it a sky |
| Ambient | the moon | its light breathes very slowly | 14 seconds | almost not there |
| Reactive | the telescope | swings a few degrees to a new star, and that star twinkles brighter | on a tap; the engine's swing on the tube as a part | looking is what a telescope is for |
| Reactive | the rocket | a small puff at its base | on a tap | it is waiting for its moment and not taking it |
| Event | the rocket, the night's moment | lifts off with puffs, climbs out of the sky and leaves a dotted trail that fades into three new stars | once; under reduced motion it is gone from the pad and the stars are there | the one dramatic thing the night sky does, earned |
| Event | the stars on arrival | come out one after another, brightest first | on arrival | the world assembling in its own way |
| Rare | a shooting star | a streak across part of the sky, never across the name | not before a minute and a half of lingering, then not more than once in five minutes | the reason a child keeps looking up at night |

### The sports ground

A crisp morning on the field. The sports ground moves like a crowd waiting.

| Kind | Drawing | Movement | How often | Why alive, not busy |
|---|---|---|---|---|
| Ambient | the people in the grandstands | a head here and there shifts | one or two at a time, every few seconds; needs the seats as parts | a crowd is never still and never together |
| Ambient | the goal's net | sways in the breeze | 6 seconds | breezy, as the world says |
| Reactive | the goal | the ball rolls into the net | on a tap | a goal every time |
| Reactive | the long jump pit | a puff of sand | on a tap | small |
| Event | the podium, the sports ground's moment | a figure steps up onto the empty third step and the crowd does one wave along both stands | once | the step that was empty all term is filled |
| Rare | the crowd | a wave on its own, along both stands | at most once a visit | the crowd's one piece of theatre |

The scoreboard does not react. The score is data a lesson can ask about, and a tap that changed it would make the drawing say something untrue.

### The laboratory

A bright laboratory in summer. The laboratory moves in small continuous processes: bubbles, a flame, a window.

| Kind | Drawing | Movement | How often | Why alive, not busy |
|---|---|---|---|---|
| Ambient | the beaker | bubbles rise through the liquid and vanish at its surface | two or three at a time, 2.5 seconds each; needs the liquid as a part | a process going on quietly |
| Ambient | the burner's flame | flickers and breathes, uneven | 1.3 to 1.9 seconds | a flame is never still |
| Ambient | the window | a cloud crosses the sky outside | one every 30 seconds | the summer beyond the glass |
| Reactive | the balance | the beam tips and swings back to level | on a tap; the engine's swing, as the balance game uses | the maths of a balance, felt |
| Reactive | the jar of particles | the particles jiggle in place for two seconds | on a tap | particles in a solid do vibrate, which is the lesson |
| Reactive | the magnet | its clips lift a little towards it and drop back | on a tap | a pull you can see |
| Event | the circuit, the laboratory's moment | the switch snaps shut, a spark runs round the wire, the bulb comes on | once | "The circuit is closed. The bulb lights." as cause and effect |
| Event | the door, the gate | swings open as the child arrives | on arrival | the room is entered |
| Rare | nothing | | | its life is in its small processes; a rare event in a room of apparatus would have to be an accident, and we would rather leave it out |

### The mountains

A cold bright climb. The mountains move like weather and distance.

| Kind | Drawing | Movement | How often | Why alive, not busy |
|---|---|---|---|---|
| Ambient | the snow | flakes fall 200 units over 8 to 12 seconds with a sideways sway | at most twelve in view | the climb is cold |
| Ambient | the far peaks | a cloud's shadow slides across them, a soft wash at low opacity | one every 40 seconds | distance is weather passing over something big |
| Ambient | the eagle | glides round a slow wide ellipse, banking | 24 seconds a loop | the one thing up there moving, far above |
| Reactive | the tent | the flap opens and the lamp brightens for two seconds | on a tap; the flap and the lamp as parts | somewhere warm on the way up |
| Reactive | the hares | bound away a short way and back | on a tap | hares in snow |
| Event | the summit, the mountains' moment | a small flag goes up and flaps, and a line of blue shows between the far peaks | once | "From the top you can see the sea," seen |
| Event | arrival | the snow begins, fading in | on arrival | the weather arrives with the child |
| Rare | the perched eagle | takes off, joins the gliding one for a loop and comes back | at most once a visit | a pair of eagles is a thing to have seen |

The thermometer does not react; its reading below zero is what its lesson is about.

### The open sea

A stormy winter crossing. The open sea has the largest movement of the twelve worlds, and it is still slow.

| Kind | Drawing | Movement | How often | Why alive, not busy |
|---|---|---|---|---|
| Ambient | the ship, the gate | pitches and rolls on the swell, 3.5 degrees and 8 units | 7 seconds, the slowest period anywhere | a storm is felt in the ship, not in the page |
| Ambient | the buoys | bob, each its own | 4 to 6 seconds | the rope is moving |
| Ambient | the harbour's lighthouse, far off | a tiny flash | once every 10 seconds | the first year's lamp, still keeping watch |
| Ambient | the whale | a spout | every 20 to 40 seconds, irregular | a big animal breathing, rarely |
| Ambient | the rain in the sky | falls slanted, harder than the town's | looped, above the horizon only | a storm |
| Reactive | the compass | the needle swings and settles on its bearing | on a tap; the engine's swing | a compass needle is the oscillator the spring describes |
| Reactive | the whale | spouts and lifts its tail, with a splash ring | on a tap | the biggest reaction in the product, for the biggest animal |
| Event | the ship, the sea's moment | in the moment's picture the rain stops and a sun comes out behind the ship; the deep sky itself does not change | once | "The storm is over. Land ahead." |
| Event | the whale joining the guide | surfaces beside the path near the guide | once, on the day it joins | a follower that cannot walk arrives its own way |
| Rare | dolphins, new | arc across the far horizon | at most once a visit | the sea's own creature, which it wants |

The iceberg does not react. It is honest for an iceberg to do nothing.

### The volcano island

A warm evening at the end of the map. The island moves like warmth and arrival.

| Kind | Drawing | Movement | How often | Why alive, not busy |
|---|---|---|---|---|
| Ambient | the volcano | a puff of smoke rises, grows and fades | one every 3 to 5 seconds | the same smoke the child has seen from the harbour since the first year |
| Ambient | the palms | sway at the crown about the trunk's foot, 2.5 degrees | 7 to 9 seconds each | an island breeze |
| Ambient | the lit lanterns on the path | flicker unevenly | 2 to 3.3 seconds each | the path the child walked, glowing |
| Ambient | the lava | its glow breathes | 6 seconds | warm, not dangerous |
| Reactive | the parrot | bobs and flaps | on a tap; the wing as a part | no words: the parrot repeats nothing |
| Reactive | the chest | the lid lifts a little and a coin glints | on a tap | treasure, without anything being given |
| Reactive | the volcano | one bigger puff | on a tap | never lava, never an eruption |
| Event | the lantern, the island's moment | the lanterns along the path light one after another from the beach to the top, and the lantern at the top comes on last | once, at the end of the fourth year | the end of the map, and the one large event in the product |
| Event | arrival | the boat slides up the beach and settles | on arrival | the crossing ends |
| Rare | the owl from the woods | flies across the moon | at most once a visit | a callback for a child who lingers at the very end |

### The map

The map of every world already has the sea's slow sway, the island's smoke and the colour washing over newly reached land. It would gain the windmill's sails turning (one revolution in 24 seconds), the boats rocking as they do in the harbour, the guide idling where the child is, and as its one rare sight the meadow's hot-air balloon drifting across the whole map. The map's flights already follow the rules here; its terrain would settle with the rest when the child goes into a world.

## What we would refuse

- Lightning, or any flash of the whole sky or a large part of the screen, and anything that flashes more than once a second. Some children are sensitive to flashing light, WCAG sets a limit of three flashes a second for that reason, and we would stay well under it; the lighthouse, the lanterns and the bulb are small and slow.
- A ticking second hand, a countdown or anything that shows time running out, anywhere in a world. The kitchen gets a pendulum instead.
- A reaction that changes a number a lesson may ask about: the scoreboard, the thermometers, the clocks, the scales, the price tags, the grandstand's count. A pointer may wobble; it comes back to the same reading.
- A creature that follows the pointer, runs from it, or can be chased. A creature answers a tap once and settles, or it becomes a toy that competes with the page.
- Counting taps, recording what was seen, or any list of reactions or rare sights, including for a grown-up. As with secrets in [story.md](story.md), a record of where a child looked is not something the product needs to teach.
- Words from any creature, and any guide movement beyond its declared repertoire, as [ai.md](ai.md) requires. The parrot bobs; it does not talk.
- Anything frightening: an eruption, an avalanche, a ship that capsizes. The volcano smokes and the storm rocks the ship.
- Celebration for an ordinary lesson: confetti, fireworks, a shower of stars. The term's moment is the one celebration, as [product.md](product.md) says cheering should be rare.
- Weather over the sheets. Rain and snow fall in the sky and the margins.
- Sound by default, and any movement whose meaning depends on sound.
- Idle movement on a lesson's sheet, unless the lesson declares a drawing's motion as its content.

## The first ten

The ranking weighs how much a movement gives the child against its cost, how well it fits its world, how little it risks the page, and how many worlds it serves. Settle and wake comes before all of them and is not on the list, because without it every item breaks the first rule; it is now built for every world.

1. The boats rock on the swell, in the harbour, the ship and buoys on the open sea, the island's boat and the map. One primitive in four places, and the one most like a world breathing. Built in the harbour and on the map.
2. The stars twinkle unevenly on the night hill, and a first star comes out over the woods at dusk. Cheap, and the deep skies are the most beautiful thing we have drawn and the most still.
3. Smoke and steam: the island's volcano, the waiting train, the kitchen's mug and pizza, the laboratory's beaker and the cottage's chimney on the map. One primitive, five worlds, each true to its place, and it already exists on the map.
4. Each world's moment plays once on the day it happens: the kite rising, the lighthouse sweeping, the train pulling in, the candles lighting, the rocket going up, the lanterns lighting in order. It is the story's payoff in all twelve worlds from one mechanism, a timeline with cues that collapses to a still under reduced motion.
5. Swing and settle on a tap: the compass needle, the laboratory's balance, the kitchen's scales and the telescope. The engine's swing spring is exactly this movement, it is true to the maths, and the reading always comes back.
6. The lighthouse flashes on a tap, and its far copy on the open sea flashes on its own. The simplest gift for a curious child and a thread across four years. The tap is built in the harbour.
7. Leaves fall one at a time in the woods. Character for the quietest world, at almost no cost.
8. A creature that joins the guide walks up the path to it on the day it joins. It makes the follower reward land, and uses the map's travel along a path.
9. Bunting and flags move in a wave, in the harbour and the town. Wind made visible, at the cost of naming the bunting's flags as parts. Built in the harbour.
10. A shooting star over the night hill. The first rare sight, chosen because building it builds the scheduler every rare sight needs: rest detection, once a visit, never announced.

Close behind: the eagle's glide over the mountains, the windmill turning on the map, rain rings in the town's puddles, snow at the kitchen's window, and the sailing ship crossing the harbour's far horizon.

## The harbour, built

The harbour was built end to end from this document as the pilot, in the order the document asks for: settle and wake first, then the primitives, then the harbour's own ideas. It is on by default, so a normal visit shows it; `?motion=off` shows the same view standing still, to compare; and `?motion=preview` plays the day's events on arrival and brings the rare sight on after eight seconds instead of two minutes, for someone reviewing it. For instance `journal.html?grade=1&at=0.5&arrive=2` arrives in the harbour, and `journal.html?grade=1&at=0.8&arrive=2&motion=preview` arrives after its term is finished and plays its moment. The two samples and their switch are gone; what they tried is part of this.

The table is the second pass, after the owner found the first too subtle. Distances are world units, so at the owner's zoom, where a square is about 27 pixels, a unit is 1.35 pixels; periods are one way.

| The thing | The movement | Its period | What settles it |
|---|---|---|---|
| the water's marks | flow downwind 80 units, fading in at the start and out at the end, in four layers a quarter of the flow apart | 9 seconds | a sheet at reading distance, or a pencil in hand, slows it to a stop |
| the kite | floats 13 units up and down and 8 side to side and turns 4 degrees about its knot; its tail swings 1 to 10 degrees downwind, its wave widens and narrows and its bows turn 15 degrees in turn | 3.3 to 4.1 seconds, the tail 2.3 | the same, easing to rest |
| the boats on the horizon and in the margin | rock about the waterline, 4 degrees and 10 units | 3.3 to 4.1 seconds, spread by where each stands | the same |
| the bunting | a wave along its seven flags, 14 degrees a flag, mostly downwind, and the string lifting 5 units | 1.3 seconds a flag, 0.22 seconds between flags; the string 2.9 to 3.7 | the same |
| the gull, the duck | turn about their feet, 5 and 4 degrees, and shuffle 8 and 6 units | 2.9 to 4.1 seconds | the same |
| the crab | turns 3 degrees about its feet and shuffles 9 units | 2.9 to 3.3 seconds | the same |
| the island's smoke, far off | three puffs from the volcano's crater rise 110 units and are carried 40 downwind as they grow and fade | a puff every 2 seconds | the same; its puffs fade out |
| a tap on the lighthouse | the lamp comes on, the beam swings out and it goes out | once, 1.7 seconds | answers during work too; lamp lit for 2 seconds under reduced motion |
| a tap on the crab, the gull, the duck | a step sideways and back, a hop, a dip with a ring on the water | once, under a second | the same |
| a tap on the boat, the kite, the bunting | its own movement twice over, dying away | once, 2.2 seconds | the same |
| the lighthouse lighting, the harbour's moment | the lamp comes on and its beam sweeps slowly across once, at the gate and at the foot of the world | once, on the day the last lesson is finished | nothing; it plays on that day's visits |
| the crab joining the guide | walks up the path to the guide | once, on the day it joins | the same |
| a landmark lit by a lesson | brightens once | once, on the day of its lesson | the same |
| the fourth year's ship | crosses the far horizon slowly, rocking | once a visit, after two minutes resting on the horizon | never starts while settled |

The second pass. The owner opened the harbour at a zoom where a square is about 27 pixels, looking at the kite over the water with no sheet in view, and saw nothing moving. We opened the same view and sampled the kite's and the water marks' positions on screen for ten seconds. The world was awake: its amplitude was 1, it had not settled, nothing was paused as off screen, and the lift's zoom factor was 1, so nothing was clamped. The kite was moving, but as one lean of 3.2 degrees taking 6.7 seconds each way, which moved its box 22 pixels sideways and 6.5 up and down in ten seconds and reads as still. The marks round it were not moving at all, because they were not the water's: the shore paints water from about 690 units either side of the middle but drew waves only beyond 1,270, so the sea round the kite carried the sand's ripple arcs, drawn into the still ground, and the drifting waves were at the world's fading edge, where they moved 16 pixels in nine seconds. So the motion was too small and too slow where it ran, and absent where the owner looked.

The second pass changed four things. The shore draws waves wherever it paints water, from the same two numbers that set its colours. The water flows rather than wobbling in place: its marks are shared among four layers that each drift 80 units downwind in nine seconds, fading in at the start and out at the end, so a mark is never seen to go back, and a layer moves on the compositor with nothing redrawn. Rock, bob and sway became one primitive, a float, with a lift, a drift and a turn on periods 1, 1.43 and 1.21 times the drawing's own, so its path never repeats in step; the kite has all three and a tail that trails. And every amplitude roughly doubled while the periods roughly halved, to the budget above, and the bunting's gusts became a wave that never stops. Measured again at the owner's view, the kite's box moves 24 pixels up and down and 24 sideways in ten seconds, its tail moves all the time, and each wave mark crosses 107 pixels of screen in nine seconds.

What changed structurally. Motion is declared on the drawing (then in `src/art/motion.ts`, now in `src/art/animation.ts`), and `engine/motion/world.ts` (then `src/world/motion.ts`) plays it: the settle rule, the primitives as CSS classes and properties, what a tap does, the day's events, the rare sight and the pausing, with every one-off movement on the engine's ticker, springs and timelines and nothing of the engine rewritten. `placeArt` records what it placed and its anchors, and plays a drawing's declared motion when the world is one that is built this way, which is one line, `FULL_MOTION`, naming the harbour. The other eleven worlds keep the older `moves` from their art list exactly as before; the one change they see is that their creatures now settle round a sheet and pause off screen as the harbour's do, because the older movements now read the same amplitude. The map's drawings take their declared motion wherever they are, so the boat on the map rocks the way the harbour's does and its gulls bob. The shore's water marks are drawn into four layers of their own in a world whose water moves, so they can flow on the compositor rather than being redrawn, and `easeFlow` slows those layers to a stop when the world settles. A hand-drawn file's moving parts (the bunting's flags, the kite's tail and its bows) are wrapped in groups of their own when the drawing is placed, by the order of the file's strokes. And a world's arrival now frames its whole horizon, name to gate, because the moment happens at the gate and the old framing left it below the edge of the screen.

The numbers, first pass. Measured against the same view with `?motion=off`, alternated five times each on the same machine, the journal opened in a median of 1,019 ms with the harbour's motion and 1,009 ms without it at "into term 3", and 978 against 977 ms at "just into term 2", with the journal's own share after the workspace at 147 against 144 ms and 100 against 108 ms: no difference we can measure. Across all twelve grades and points in the year it opened in 0.89 to 1.11 seconds, with two outliers while the machine's load average was above ten; the plan's figure was 0.86 to 1.00. On the busiest view, a day in the harbour with the boat, the bunting, the crab and three layers of water moving, the main thread spent about 106 ms a second, 22 of it in style, against 14 ms a second standing still, which is under a millisecond a frame at the display's 120 frames a second, with the slowest of 600 frames at 9.4 ms. Settled round a sheet it spent 17 ms a second, the same as standing still. The cost is almost all the work of producing a frame at all rather than the work of any one movement: taking the water, the flags or the rocking away one at a time did not change it by more than the noise between runs, which on this machine was about 30 ms a second.

The numbers, second pass. These were taken while other work kept the machine's load average between 13 and 20, and the lessons had grown since the first pass, so the workspace the journal reads now takes 700 to 900 ms of every open; the comparison with motion off, taken at the same time, is the number to read. Alternated five times each, the journal opened in a median of 1,114 ms with the harbour's motion and 1,126 ms without it at "into term 3", and 1,013 against 1,019 ms arriving in the harbour: still no difference we can measure. Across all twelve grades and points in the year it opened in 0.91 to 1.30 seconds. On the busiest view, a day in the harbour with the kite, the boat and the water flowing, the main thread spent 159 ms a second, 41 of it in style, against 9 ms a second with motion off; at the owner's view of the kite it spent 124, arriving at the horizon 133, and settled round a sheet 14. About 80 ms a second of the busiest view is the guide's own idle, which was there before any of this: with the guide's and the harbour's animations all stopped it spends 21. The water's layers cost nothing we could measure, since they move on the compositor; the drawings' floats and the parts inside the files cost about 57 ms a second together, mostly in style. No frame was dropped: of 600 frames at the display's 120 a second, the median was 8.3 ms, the 95th percentile 9.2 and the slowest 9.4.

What looked wrong once it was moving:

- A lift declared in world units vanishes when the camera draws back, which is exactly when the world is awake: a gull's 6 units was under 2 pixels at the zoom of a day. Lifts now grow with the inverse zoom, capped so the reach still stays inside the clearance.
- The arrival camera showed the sky and the horizon and left the gate below the screen, so the lighthouse lit where nobody could see it. The arrival now frames the whole horizon.
- Settling eased the movements to rest and then kept animating them at zero, so a settled world still drew every frame. It now pauses once the easing is done.
- The first threshold for working, a third of the screen in paper, never triggered at 1440 pixels.
- Seven degrees on a flag a few pixels wide could not be seen; small parts need a larger turn than whole drawings, and the budget now says so.
- Most of the harbour's movement is only seen at the zoom of the days and the horizon. At reading distance it is settled, which is the point, but it means an amplitude has to be judged at the zoom a child will see it at.
- The first pass itself was too subtle: judged in a recording at the days' zoom, it looked alive, and at the zoom the owner used it looked like a picture. An amplitude has to be judged by someone opening the page and glancing at it, not by a measurement.
- A standing gull and a standing duck that floated looked as if they hovered. What stands now turns about its feet and shuffles.
- The kite's tail first rippled by mirroring its wave, which passed through flat and made the bows vanish every two seconds. It now widens and narrows without going flat, and each bow turns about its knot.
- Settling the water by drawing its amplitude down would have carried every mark back upstream in a second and a half, faster than it flows. It is slowed to a stop instead.

What the other eleven would take. The system is built; each world is now data and a few drawings. For each world: a declaration in `src/art/animation.ts` for each of its drawings that moves, which is a line each; a part group in the draw function of each coded drawing whose idea needs a part (the windmill's sails, the telescope's tube, the compass's needle, the grandstand's heads, the beaker's liquid), which is a small change to a shelf file and has to be coordinated with whoever is working on the shelf; a stroke order for each hand-drawn file whose idea needs a part (the kitchen window's snow, the duck's head); the world's name added to `FULL_MOTION`; and its day's events, which are already general (a moment that is the gate's plays at the gate, any lit landmark brightens, any new follower walks in). Float, flow, flap, trail, puff, flash and ripple are built and tuned, and their numbers are the evidence for the defaults of any surface that plays a drawing's motion. Four of the primitives the other worlds need were not built for the harbour: twinkle for the night sky and the woods, fall for leaves and snow, turn for the windmill and wheels, and swing for the compass, the balance, the scales and the telescope. Twinkle and turn now exist in the animation module as `twinkle` and `spin`, and the windmill's sails and the night sky's stars already use them; fall and swing are still to build, and swing is the engine's swing spring on a part and would reuse the reaction code. We would expect a world with no new primitive to take half a day and a world that needs one to take a day, and the night sky, the woods, the laboratory and the open sea to be the ones that need one. The older `moves` field on the art list goes when the last world has moved over.

## The worlds round the run

The eleven worlds built round the twelve ([overworld.md](overworld.md)) are the next worlds to move this way after the harbour: they are in `FULL_MOTION`, and every drawing made for them that moves declares its movement in `src/art/animation.ts` in world units, as the harbour's do (the heron and the kingfisher shifting their weight about their feet, the dragonfly hovering, the skater gliding, the balloons and the bubbles lifting, the ferry and the dolphins riding the water, the tractor's exhaust puffing). Two things were added to the world's player for them. It plays the parts a coded drawing draws with `part()`, for the drawings named in `WORLD_PARTS`: the swing's seat swinging about its bar, the old tower's flag flying, the carousel's lights and a lantern's glow brightening and dimming slowly and never below half, and the windmill's sails turning at most once in twenty seconds; they settle, pause and stand still under reduced motion with everything else. And a drawing whose declaration the world cannot play yet, such as the minibeasts' wiggle, keeps its older `moves` from the art list rather than standing still, so moving a world over never takes movement away. Each world names its rare sight in its chapter, crossing the horizon, drifting across the sky, rising out of it or coming out and fading away, and the scheduler is the harbour's: once a visit, after two minutes resting on the horizon, never while settled, never announced, and never under reduced motion. The rainbow over the painter's hut is the one that changes brightness, fading in and out over about five seconds each way, well under the rate at which anything reads as a flash.

Every world moves this way now, and `FULL_MOTION` is gone, so whether a world's drawings play their declarations is the world's motion switch alone. What a world plays is `engine/motion/world.ts`, with nothing of the page in it, and `engine/ui/player.ts` plays it on the page. The twelve of the run each have a rare sight of their own, on the same scheduler, and [story.md](story.md) lists them. Two ways were added for them. A sight may come out at one of the drawings on its world's horizon, a share of that drawing's height up and in front of it, as the robin does on the kitchen's window sill and the kite in the laboratory's window. And a shooting star streaks across the night hill's sky in a little over three seconds, fading in and out rather than blinking. A sight that drifts across the sky now passes below the world's name rather than through it. The drawings made for the twelve's wants that move declare it in world units as the eleven's do (the robin, the starlings, the albatross, the owl in flight, the badger and the goat), and the lamp post's glow, the cable car's cabins, the shooting star, the owl's wings and the starlings' edge are parts in `WORLD_PARTS`. A drawing whose declaration a world could not play kept its older loop from the art list until the worlds moved onto the player, and now every drawing a world places plays its own declaration.

The map rests too. Putting every world on the grown-up's map and the places off the run on a child's made each frame of the map's small life dearer, because the guide's idle and boil are animations inside an SVG, so every frame they run goes through everything the map has drawn. Measured in headless Chrome at 1440 by 900 at twice the pixel density, a child's map halfway through year 2 went from 176 ms of main thread a second at rest to about 300, and a grown-up's whole country from 289 to about 370, while the worlds themselves were unchanged. Three things bring it back. A map left still lets its guide rest, and the camera or a pointer over it wakes it: it was a five second timer on the page (`mapWake`, `.ow-rest`) until 17 September 2026, and is now the settle policy of the map's own group in the player, which moves a drawing for half a minute after it comes into view and wakes it again when a pointer passes over it. Far out, where a drift is under a pixel, the lives, the smoke and the guide rest as the waves already did. And the roll under an open map is not drawn once the map has faded in over it, and the sea's wave tiles off screen have no animation rather than a paused one, which halved the map's composited layers. After them the child's map spends about 120 ms a second at rest and the grown-up's whole country none.

## Open questions

- Whether a child should be able to turn the world's motion off themselves, beside the grown-up's existing switch for the creatures and the device's reduced-motion setting. We lean towards no, because the settle rule does most of what a child would want, but it needs the owner's view.
- Whether sounds should come with the moments and a few reactions once a device has sound on. The cues are there to carry them; [sound.md](sound.md) owns whether they should exist.
- How rare is rare. The numbers above (once a visit, after a couple of minutes of lingering) are judgement, not measurement, and would want watching with children.
- Whether a lesson should ever animate a world drawing on its sheet. We have said not by default; the case for it is a look block where the motion is the idea, and the case against is every rule above.
