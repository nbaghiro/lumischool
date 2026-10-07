# Games

The first physical-handling refinement is documented in [physical-games-refinement.md](physical-games-refinement.md).
## Treasure island (5 October 2026)

Treasure island (`school/games/treasure.ts`, `?g=treasure`) is a treasure hunt in the line of the
top-down adventures where a map and a spade are the whole kit: Charlie lands at the dock of an island
seen from above, the island squared like the map she carries, and digs where the map's clue says.
The island is bigger than the view, and the view follows her. Round the sandy beach are the dock and
its rowing boat with a friend in it, map posts lettered A to L along the top of the grid and numbered
1 to 9 down its side, the shipwreck, and inside it the palm tree, the cave in its rocks, the pond,
the big rock, the parrot's tree, the jungle and the lighthouse. Crabs scuttle sideways out of her
way, gulls wheel over, the surf runs up the beach, and Pip trots after her and sits when she stops.

She walks freely at any time, as in the garden (`engine/motion/roam.ts`): the arrows or W, A, S and
D walk her eight ways, speeding up and slowing down; a tap on the island sends her there round the
pond, the rocks and the landmarks; a finger held on the field is followed. The coast is the edge of
the ground, so she walks the dock to its end and never into the sea. Her shoe prints are left in the
sand and fade. The arrow buttons are named North, South, West and East.

The map is a parchment card in the top corner, and the clue's few words sit under it; the M key, the
Map button or a tap on the card holds it up big with the clue written out, and a tap or the arrows
put it away. One Action does what is in front of her, its icon and label following it: "Pick up
spade", "Dig", "Open chest", "Read bottle", "Tie rope to palm tree", "Untie rope", "Take out spade",
"Ask the parrot". A tap on Charlie does the Action too, and a tap on a chest, a bottle or the spade
walks her to it and uses it. She carries one tool, the spade or the knotted rope, and the T key or
the Swap tool button changes it. Dig opens the square she stands in, which is dashed round while she
holds the spade: she steps beside the square's middle, three strokes throw up sand, and what was
buried comes up: a chest, a bottle with the next clue, or on the free island a shell. A hole with
nothing in it says how far off it is, kindly and in the clue's own terms ("Nothing here. This is 2
north and 3 east from the palm tree. The map says 3 squares north, then 4 squares east."), and a
square already dug is not dug again. Undo puts her back where the clue starts, for another count.

The ten levels:

1. Three north, four east: fetch the spade from the beach, start at the palm tree, walk 3 north and
   4 east, and dig, grade 1.
2. Round the pond: from the cave, 4 west and 3 north, with the pond in the way, so the count goes on
   while she walks round it, grades 1 to 2.
3. Dig at G7: a square named by its letter along the top and its number down the side, grade 2.
4. A message in a bottle: dig at C8, and the bottle says "From where you dug this up, walk 3 north
   and 5 east", grade 2.
5. Follow the compass: from the lighthouse, 4 squares south-west, with a compass rose at her feet,
   grades 2 to 3.
6. Measure with the rope: tie the rope at the palm tree and walk it to the big rock, counting a knot
   at every square, and dig that far north of the parrot's tree, on a map torn at the corner, grade 3.
7. Three bottles: a square, then a walk from where the bottle came up, then a compass bearing from a
   landmark, grade 3.
8. The shortest way: 2 south and 5 east of the cave, where the star is for walking there straight
   from the dock rather than by way of the cave, grades 3 to 4.
9. Three treasures: three squares, in any order, grades 3 to 4.
10. Treasure island: the free island, where the map shows three squares at a time and a new map
    comes when they are found, shells are buried all over, and the coins, gems and shells found are
    kept in the browser (`saves: { level }`).

The previews fade by level. On the first two levels the map draws the way and the X, a dotted way is
drawn on the island once she stands at the start, each square along the leg she is walking is
counted out loud as a number rising beside her with a tick rising in pitch, and the count from the
start ("3 north and 2 east") stands over her head. From the third level the count, or the square's
name on the levels that name squares, still stands over her, and the map has no X. From the seventh
nothing is shown but the map's words and the posts, and a wrong hole says only to count again.

The principles are met this way. The hand sets amounts by degrees: she walks the squares herself,
and the rope stretches knot by knot. A try costs nothing: a wrong hole is a hint, there is no limit
on digging, and Undo starts the count again, so the game has no `ended`. The levels are places with
obstacles of their own (the pond in the way, the rock on the diagonal, the jungle walked slowly, a
torn map, a chain of bottles). The maths sits in the targets: counting squares, the compass's four
and then eight points, grid squares named by letter and number, a distance measured and walked again
elsewhere, paths of several legs, and the shortest way. The guide is the garden's
(`engine/motion/guide.ts`): a step strip ("Get the spade", "Go to palm tree", "Walk 3 north", "Walk 4
east", "Dig", "Open the chest"), each step ticked from the island as it stands; an arrow over the
next thing, at once on the first level and after 8 quiet seconds on the others, which points at the
next square along the leg rather than at the treasure, and on a named square at the post for its
letter and then for its number; and Charlie's bubble, beside her when there is no room over her head.
A landmark she walks behind is drawn faint so she is never lost behind the palm or the lighthouse.

The squares, compass points and walks are `engine/motion/compass.ts`. Every level has three
variations (`school/games/treasure-challenges.ts`) that change the landmark, the counts, the squares
and the bearings, each leading to a square that can be stood by and dug. A hunter plays every
variation through the real game by the keys, walking with held arrows and pressing the Action, and by
a finger, tapping where to go, tapping Charlie to dig and tapping the chest, swapping to the rope and
tying it where a level measures; the tests replay its acts to the same island. Walks, presses, drags
and taps made at random won none of twelve tries on any level. A player who walks to a square chosen
at random and digs it, again and again for a minute, digs about twelve holes and wins about one try
in six on a level with one chest and none on the chained and three-chest levels, since one square in
about ninety holds it; the hints after each hole make that the slow way.

There is no card (`card: null`): the clue, the map and the walk from a landmark to the spot span most
of the island, which a 360 by 240 card crops to a few squares. On a phone held upright the field
follows her across 20 of the view's 30 squares (`portrait.keep`), and the map card sits far enough in
from the corner to stay in the field. Under reduced motion a press walks her about a square and a tap
walks her all the way, each drawn once at rest, and nothing bobs, swells or scuttles. The sounds are
the game's own: a soft tick for each square counted, the spade biting sand, a knock on a lid, coins
tumbling out of a chest and a cork out of a bottle, over the sea and the wind.

Left out: a dig budget, which would make a wrong hole cost something; a "you are here" dot on the
map, which would let a child find a square by watching the dot instead of reading the grid; and
holding a finger to dig, since a tap on Charlie is one gesture and the hole is quick.

## Readouts never overlap (5 October 2026)

The owner found the Bridge builder's measure of the gorge, "12 squares" over a dashed arrow, written over the picker of materials, and asked that no game show its readouts on top of each other. The words a game writes and the readouts it keeps in sight (the boards and sum signs, the pickers, the step strips, the counters, the measures, the map card) never overlap each other and never run off the field. `school/games/__tests__/field-layout.test.ts` guards it: it lays out every action game's frame as the GPU view does, at the start of every level and through six seconds of seeded play, on a desktop, a wide screen and a phone held upright (and a game that asks to be turned, with `portrait.hint`, on a phone held sideways as well, since a child may not turn it), and fails on two readouts that overlap or a fixed one off the field. A word written on its own board or a chip inside its strip is one readout, and a word in the world may pass under a readout as the view moves but not sit under one at a level's start. Pairs that overlap on purpose are listed in the test with the reason; there are none yet.

Most of what it found came from how the view placed fixed readouts: each one moved by its own share of the field while keeping its size, so on a phone a row of icons ran into itself (Bolt's seats and batteries, the dollhouse's tray) and on a wide screen a coin drifted off its counter. Readouts now move a group at a time, as [engine.md](engine.md) sets out, and a strip whose words a phone holds at 14 pixels is drawn big enough to hold them. In the games themselves: the measure in the Bridge builder's gorges is down in the gap between the anchors, with its words under it; the dollhouse's tall shed and stairs are drawn inside their cards, and the keys' ring round a card clears its name; Fetch writes only the fives past 9 on its path, since two figures a metre apart ran together on a phone; Pocket pool's target goes on a line under a sign on a bottom pocket; the rescue's distances to swimmers a metre or two apart are on two lines; the garden's watering line says litres as "L", and its strip's step is written lower in the card; and Treasure island's tally of the free island sits further in. In Nutmeg's winter store the cheek acorns are spaced a little wider than an acorn, the step strip sits in the top left corner under the cheeks and the snow clock rather than over the oak, and the clouds pass lower, under the board rather than behind its edge. In Bolt's sky flight the board fades while a star or a crew robot flies behind it, since in a sky that scrolls something will always pass under a board kept in sight; the board's words stay over it.

The games that ask to be turned were then checked held upright too, since a child who does not turn the phone should still have a game that looks right. The dollhouse was the worst: its whole 48-square view shrank to seven pixels a square, and its room names, its switch's words and its coins, held at a phone's least size, ran into each other. It now keeps 26 squares across upright (`portrait.keep`), and its readouts carry an upright place (`upright` on a fixed sprite or word, laid out in the frame's `upright` view, as [engine.md](engine.md) describes): the switch at the top right with the way out of a room under it, a longer coin pill and job card, and a drawer whose rooms sit in two rows of bigger cards ("Living room" is "Living" there) and whose tabs sit in two rows of three over a row of bigger chips. What is in play sits a little above the field's middle there, clear of the drawer, and only one empty slot says "drop a room here", since the words of slots side by side ran together. In the domino machine the count and the price under a part in the tray are on lines of their own, and a phone writes only their numbers on one line ("2, 1 each"), since a slot six squares wide holds no more at a phone's least size. Harbour cargo and the rescue keep 34 squares across upright rather than 30 and 26, so the quay's crates and the moored boat, and the truck, boat or helicopter at the left with its label, stay in sight with what they are sent to; on a phone cargo's goals and its boat's words are said shorter ("All aboard", "Right is heavy") and the rescue's tank reads "Tank 20/20 L". A word says this shorter way with `phone`. The other games that ask to be turned show their whole view upright with nothing over anything else, though at small squares; we have not given them upright layouts.

## One card at the end of every round (4 October 2026)

Every round now ends on the same card over the lower middle of the field, described in
[engine.md](engine.md): a won round with the game's sentence and the way on, and a round that stopped
without a win with an encouraging heading and another go. Most games cannot stop without a win, since
a miss is set right for free, and they need nothing new. Two could, and both now hold the end rather
than starting again unannounced: pinball, when the balls of a level with a sum run out, and curling,
when the stones are gone and the ask is not met, or blue wins the bonspiel. Pool still sets its balls
out again after a level's shots, since play goes on from there. A turn game that runs out of moves
shows its sentence for that on the same card, as an end that is not won. In a lesson, the card is a smaller one with Again and
New one, in place of the "Well played!" label.

## The first physics wave (26 September 2026)

The games below took up the physics of P4 in [game-engine.md](game-engine.md). A home for the pups
has roofs, arches and a door frame, three new jobs (a roof to a height, a door beside a room, three
rooms in a row), blocks that meet a neighbour they are let go beside, a closer view, and a family
that walks in. Charlie's bridge has planks that bend under her and a level with a rope bridge, where
the planks hung between two posts have to add up to the gap. The marble workshop has a splitter that
halves a batch, a bucket that tips out fives and keeps what is left, and a level of a hundred
marbles. In Harbour cargo the crane carries a crate on a rope, lifting it before it travels and
lowering it once it hangs still, and the barge floats and lists towards the heavier side; the band
counted as balanced is 2.5 weight-squares wide, since a crane sets a crate down within about a third
of a square. The rafts float on the river's waves and the flock mills on the bank. Gone fishing's
float rides the lake's surface, bites ring the water, and a shoal scatters together. Down the river
shows its current as streaks, quicker through the rapids, and a stroke as a ring.

## Checkpoints, watching a try, and two fingers (26 September 2026)

From P5 in [game-engine.md](game-engine.md), every action game can return to a checkpoint and show a
won try again. Down the river is the first to use checkpoints: each gate of the count taken is one,
and Back to the checkpoint beside the undo button puts the canoe just past the last of them, so a
missed number further on costs only the stretch since that gate. Its gates and the number on the line
are one goal in order, which the progress bar counts. Watch it again, beside Play another, plays a won
try from the start with the hands it was played with; it is left out under reduced motion. In Fetch
with the pups a pinch, the wheel or the plus and minus keys zoom the park in and out.

## Fetch with the pups: a target to throw at (2 October 2026)

The owner found the game simple but confusing: the ask was only in the note, so a child did not know where to throw or why, and once they did there was little to it. We kept the pull-back throw, the keys and the pups, and changed what the field shows and asks.

- The ask is on the field. A number to throw to stands as a new `fetchmark` drawing: a stake with a round number sign and a dog bowl at its foot. An ask worked out from a pup ("5 past Maple", "the number that makes 20 with Dot's") stands by that pup as "+5" or "=20", so the sign does not give the answer away. The note now opens with the ask in short words.
- A good throw lights its sign and makes it jump while the pups cheer, and asks done with a single throw in a row show "2 in a row!" in the corner.
- Each level has a fourth ask, and the later ones have a twist: "halfway to the tree" on the playground, and "throw it to the number that makes 20 with Dot's" on the windy day and "15 with Pip's" in the snow. The snowy park keeps its ball that stops dead in snow and slides on ice.
- The landing band is drawn only while a level still shows the dotted path, so the later levels ask the child to judge it.
- The view is lower (34 by 16 squares), so the path and its numbers are bigger, and a high throw lifts the camera with it.
- On screen, Throw is a round launch icon and Swap shows what is in hand (a ball, a frisbee or a stick), through a new optional `brakeIcon` on the game contract.

We did not add moving pups or a second throw that continues from the first: each throw starts from the rug with the pups on their seats, which is what lets the solver prove every ask on its own, and a moving target would have made the keys solver search a far larger space. They are the next step if the owner wants more. The rules version is `-fetch-2`.

## Fetch with the pups (27 September 2026)

Fetch with the pups (`school/games/fetch.ts`, `?g=blocks`) replaced A home for the pups, the Pup
family's building game, after the owner found both of its versions (blocks nudged into place with
nine buttons, then blocks dropped from a swinging crane and tested by the wolf) boring. It keeps the
id `blocks`, so the links and the stored challenges filed under it still open the pups' game. We
looked at what makes fetch fun with a real dog (the throw, the chase, the catch and the dog trotting
back proud of itself) and at the throwing games the owner likes, Slingshot and Garden mini-golf, and
built the park around them.

A ball, a frisbee or a stick lies on the picnic rug. The child pulls it back and lets go, or aims with
up and down, sets the strength with left and right and presses space; B (Swap) changes what is thrown
where a level offers more than one thing. planck decides the rest: a ball bounces and rolls and slows
on the grass, stops dead in snow and slides on ice; a frisbee glides on its speed across and sinks as
it slows, and the wind carries it furthest; a stick tumbles and stays where it lands. Things bounce
off trees, the fence and the slide, catch in bushes, and float in the pond. The Pup family races
after it, each as it can: Pip sits at the front of the rug and is the fastest, but is slow to stop and
runs past before he turns back; Dot is small enough for the hole in the tall fence; Rufus is the only
one who swims; Maple jumps highest, over the low fence and up onto the slide's platform. The others
stop on the bank or at the fence and bark. A pup jumps for a thing passing over its head, so a low
frisbee is often caught in the air. Whoever gets it carries it back to the rug, and a pup that swam
shakes itself dry.

The mathematics is on the path, which is marked in metres from the rug's edge. Each level asks for
three throws in turn, as the note says: land it on a number (judged where it first comes down, marked
with a cross), land it a number of metres past where a pup sits, make it stop by a number (the pups
stay until it has stopped, which is the hill's lesson: a ball rolls back down and a stick stays), or
throw it where only one pup can fetch it. A number counts within a metre, or within half a metre on
the snowy park, whose first ask is a half. The dotted line of the throw is shown while aiming on the
early levels and shrinks to nothing by the last. The six places are the open meadow, the pond, the
hill, the playground with its slide and tall fence, a windy day with a bench and a low fence, and the
snowy park with a frozen pond. Each throw met is a checkpoint and moves the level's goal on; a throw
that misses costs nothing, and one nobody can reach comes back to the rug by itself.

A throw always starts from the same place, since the pups are put back on their seats before the
next, so each ask can be tried on its own. The variations (`school/games/fetch-challenges.ts`) move a
level's numbers along the path, and the solver certifies each one by searching the keyboard's aims
for a throw that does each ask, playing it through the real park, and then replaying the whole plan
from the start, which is the game's replay witness. `school/games/__tests__/fetch.test.ts` wins every
variation of every level by the keys, and shows a number judged where the throw lands and a stop only
once it has stopped, a ball rolling off the hill where a stick stays, only Rufus swimming for a thing
in the pond, Dot and Maple reaching where only they can, a frisbee gliding further than a ball and
further still in the wind, and random throws finishing a level rarely. `tools/e2e/games/pup-fetch.e2e.ts`
throws by the keys and by pulling, and swaps the ball for the stick. The sounds are a whoosh for a
throw, a bounce, each pup's bark at its own pitch, the pond's splash, and the pups panting while they
run, a new `pant` hum.

## Charlie's bridge (26 September 2026)

Replaced on 27 September 2026 by Charlie's rope swings under the same id; see "Charlie's rope
swings" below. This section and the pulley lift's are kept as the record of the plank game.

Charlie's bridge (`school/games/bridge.ts`, `?g=bridge`) is the first game built around Charlie, the
named character on the art shelf. Charlie and her dog want to reach a picnic on the far bank of a
stream. The stream is measured by a line along the water, stones stand in it at numbers on that line
(with a landing stone at each bank's edge, at nought and at the far bank's number), and planks with
their lengths written on them lie on the grass. The child drags a plank over the stream and lets go,
and it falls where it was let go and settles on whatever is under it, as a rigid body in
`engine/motion/bodies.ts`. Nothing snaps into place. A plank shorter than its gap falls in; one that
only just reaches rests on the edge of a stone; one that sticks out past its stone holds until
Charlie walks out along it, and her weight, pressed on the plank under her feet at every step, tips
it. The mathematics is reading the gaps off the line and choosing a plank long enough for each: whole
numbers, a line with no numbers on the stones, centimetres, and metres in tenths at grade 4.

A first version snapped planks onto the stones and decided tipping by a rule. The owner compared every
game against the six they like (Slingshot, Penny shove, The road, Pocket rally, Paper plane and Garden
mini-golf) and found the snapping one a quiz with a walk at the end, so the planks became bodies and
the weighted-plank level was dropped: with planks free to land anywhere, a plank long enough to be
weighed down is also long enough to reach the stone, so the weights were never needed. Moments stay
with the see-saw.

Nothing is checked until Charlie walks, a wrong bridge is seen to be wrong in the water, and a fall
costs nothing: she swims back and climbs out, and the plank floats back to the grass. Charlie walks
on `engine/motion/walker.ts` over whatever `rayDown` finds under her, and her drawing follows what
she does through `engine/motion/actor.ts`: it fades from her wave into her stride, puts her arms out
on a tipping plank, squashes when she lands and cheers at the picnic. With the keys, left and right
choose a plank and then move it half a unit at a time (a tenth on the metres level), up picks up and
lets go, down puts it back, and the big button is Go. `bridge-challenges.ts` gives each level other
stone layouts that the same planks bridge exactly. The tests in `school/games/__tests__/bridge.test.ts`
cross every level and layout by hand and by the keys, show a short plank falling in and a long one
tipping under Charlie, and check that random planks let go near the stones make a bridge at most one
time in five; `tools/e2e/charlie-bridge.e2e.ts` plays it in the app.

## Rabbit crossing on drifting logs (26 September 2026)

Rabbit crossing gained two levels, "Ride the log" (grades 2 to 3) and "Two logs" (grades 3 to 4), at
the end of its list so stored layouts of the others still open. A gap wider than any hop is crossed by
timing a hop onto a log that drifts along the stream and judging the hop off it from wherever it has
drifted to, so the number line is read from a moving position. A log's drift is a path in
`engine/motion/mover.ts`, a function of the step count alone, so replays and reduced motion agree.
`rabbit-challenges.ts` varies where the logs start along their drift, and the tests cross every
layout with the keys and with a pull by trying each hop on a copy first, as a child aims.

## Measure it out, poured by hand (26 September 2026)

Measure it out (`school/games/pour-hands.ts`, `?g=pour`) is now an action game in which the jugs are
picked up by their handles and tipped. It was a hands-on turn game whose drags only chose the
puzzle's listed moves; the owner found the turn games too plain next to the six they like, so the
pour itself became the control. A jug lifted clear of the rims tips by how far the hand is lowered
below the carry line, turning about its spout so the stream stays where it was aimed, and the
further it tips the faster it pours: a fuller jug pours at a smaller tilt, and a steep tip gushes
(`engine/motion/vessel.ts`). Poured into another jug it stops by itself at that jug's brim, before a
drop is spilt, so the puzzle's exact amounts can still be made; tipped again over a full jug it
spills, and the spill is lost. A jug set down under the tap fills while the tap is held, and one
tipped over the flowers is emptied. The round is won when a jug standing on the counter holds the
target within a fiftieth of the smaller jug, with nothing pouring for half a second.

The first two levels keep their scales, so an amount can be poured by eye and checked on the marks;
the other four are the classic puzzle with only the brim marked, so the amount has to be made from
what the jugs hold. The puzzle is still `pour.ts`, and its prover still holds every level, and every
generated version in `pour-challenges.ts`, to be winnable with whole pours. With the keys, left and
right choose a jug and then where to hold it, up picks up and puts down, holding down tips, and
holding the big button runs the tap. The tests in `school/games/__tests__/pour-hands.test.ts` win
every level along the puzzle's fewest pours by hand and with the keys, show the brim stop and the
spill, check that random tipping makes the amount at most one time in five, and hold replays and
reduced motion to the same jugs. The rules version for "pour" moved to `-physical-2`, so stored
versions of the turn game do not open as the new one.

Since 27 September the water is real drops. The jugs still count their water exactly, and what
leaves a jug falls as drops of the particle liquid in `engine/motion/liquid.ts` that each carry their
share, so the puzzle and the brim stop stay exact while the stream is something to watch. A jug's
scale and the water drawn in it show what has landed, so the reading rises as the stream arrives
and matches the real volume once it has. The stream from the tap or a tipped jug wavers a little,
thins as a jug empties and breaks into drops at its end; the water in a jug keeps a level surface
however the jug is turned, leans when the jug is carried and swings back, and rings where the stream
lands, with a splash. Under reduced motion the stream still falls and the surface stands level and
still. The rules version for "pour" is now `-liquid-1`.

## Charlie's market stall (26 September 2026, replaced by the lemonade stand)

This game was replaced on 27 September 2026 by Charlie's lemonade stand under the same id; see "Charlie's
lemonade stand (27 September 2026)" below. The section is kept for the reasoning behind it.

Charlie's market stall (`school/games/wardrobe.ts`, `?g=wardrobe`) replaces the turn game that was
first built under this id, a dress-up puzzle played from a tray. Charlie shops at a clothes stall.
Trying things on is free: a tap on a thing hanging on the stall puts it on her, or takes it off, and
the receipt beside her adds up what she wears. Nothing about dressing is checked. Paying is a
fairground penny pitch seen from the side. The coin in Charlie's hand is pulled back and let go, or
aimed with the arrows (up and down for the angle, left and right for the strength) and thrown with
the big button, and a short dotted arc shows how the throw leaves her hand but not where it lands.
Coins are balls in `engine/motion/bodies.ts` that bounce off the counter's edge, the dish's rims and
each other. A coin that comes to rest outside the dish is seen where it stopped for a moment and then
goes back to the purse, with a word on how near it came from `nearness` in `engine/motion/aim.ts`.
The round is won when Charlie wears a whole outfit (a top and a bottom, or a dress, and something on
her feet) and the coins resting in the dish make exactly the receipt's total. A coin too many is
tapped out of the dish again, or taken back with Backspace. Charlie then cheers.

The mathematics is in the amount and in the choice of coins, never in the throw. The levels go from
pennies and nickels to ten cents, then dimes to twenty, then quarters to fifty and to a dollar with
the dish further along the counter, then dollars and cents with a purse that holds more than any
outfit costs, and last a dish that the stallholder slides to a new place after every throw, with a
purse short of small coins so that a total has to be made mostly in quarters. A coin is chosen by
tapping it in the purse or with C, and a thing on the stall with N and T.

It is an action game gated by `school/games/__tests__/wardrobe.test.ts`: every level is dressed and
paid exactly through a real pad, once by pulling back and letting go and once by the keys alone;
every outfit a level offers can be paid exactly from its purse; random throws paid exactly in none of
twelve tries on any level, against an allowance of one in five; the same inputs give the same stall,
reduced motion settles where fixed steps do, every drawing is on the shelf and the tuning table has
no faults. A scene holds seven fixed bodies and the coins, at most about twenty. The dish moves only
between throws, since `bodies.ts` has no body that is moved by the game and still carries what rests
on it. The drawings added for it are `stallcounter` and `coindish`, beside `garment`, `clothesrail`,
`charlie`, `person`, `dog`, `prop.coins`, `purse`, `pricetag` and `receipt`.
`tools/e2e/charlie-wardrobe.e2e.ts` plays a level in the app by hand and dresses and throws with the
keys.

## Charlie's lemonade stand (27 September 2026)

Charlie's lemonade stand (`school/games/lemonade.ts`, `?g=wardrobe`) replaces the market stall, which
the owner found extremely boring: dressing had no aim, and paying was a pitch whose only question was
which coins. The id stays `wardrobe`, so links and stored progress still reach it. Customers stand
behind a long plank counter that runs on from Charlie's booth, each with an order in a speech bubble,
and Charlie serves them in three moves that each go by degrees.

She pours. The glass jug turns on a pin at the top of a post, and a hand drawn down it, or the down
arrow held, tips it: a gentle tilt dribbles and a steep one gushes (`pourRate` in
`engine/motion/vessel.ts`), and the lemonade falls from the spout as drops of the particle liquid in
`engine/motion/liquid.ts`, each carrying its share. The cup's level is what has landed in it, so a
pour is stopped by eye against the marks, allowing for what is still falling, and a cup filled past
its top spills. A press of the down arrow brings the jug straight to its lip, so the keys pour at once
and reduced motion pours a little at every press. The cup is marked in halves, in quarters or in
millilitres, and an order counts within six hundredths of a cup (eight on the halves level).

She slides. The full cup is pulled back and let go, or its push set with the left and right arrows
and sent with the big button, and it slides along the counter against its friction. The push is
measured as the distance it carries on a still counter, so an arrow press moves it half a square and
the guide on the early levels (a dotted path and a ring where it will stop) is the push itself. Too
soft, and the cup stops short and is pushed on from where it stands; too hard, and it goes off the end
and a fresh cup comes; stopped at a customer who asked for a different amount, it slides back with its
drink in it, to be topped up or tipped out with Backspace. Nothing is ever lost but time.

She gives change. A customer who has their drink pays, their coins hopping back along the counter to
Charlie's dish, and if they paid more than the price they set their own dish on the counter and ask
for their change. The change is rolled to them a coin at a time: a coin is chosen from Charlie's dish
by a tap or with C, pulled back or pushed with the arrows like a cup, and rolls face on along the
counter; the dish's rims catch a coin that reaches it, one that stops short or runs past comes back,
and one too many is taken back with Backspace or a tap on the dish. The customer thanks her when the
dish holds exactly their change, and walks away, and the next customer walks up to the free place.

Waiting customers' smiles fade slowly and never make them leave. The mathematics is in the orders
(halves and quarters of a cup, then millilitres on the cup's scale), in the price of one or two cups,
and in the change, never in the push. The six levels are a sunny park with two customers and halves,
quarters of a cup, change from a quarter with the cups in millilitres, a windy day whose gusts turn
about every eight seconds and push a sliding cup or coin (`engine/motion/gust.ts`, shown on a
windsock), a counter 66 squares long with the change from a dollar, and a busy fair with four
customers, a double order and wind. The fill line on the cup goes after the fourth level, and the
guide for a push after the fifth.

The whole stand is in view wherever the room allows: the frame's view is the world, which is the
counter and a little more, so the far customers on the long counter can be read while pouring, and on
a narrow phone the camera follows a cup or a coin along the counter. Ground runs past both ends. The
first customers are already waiting when a level opens, since the player runs only after the child's
first input. Charlie and the customers move by their poses through `engine/motion/actor.ts` (Charlie
holds when she pours, points when she pushes, waves at a new customer and cheers at a thank you), a
thanked customer is an event with a checkpoint and the level's goal counts them, the stand has its own
sounds (glass, a slide, the chink of coins and a thank-you chime) and hums the pour and the wind.

The variations (`school/games/lemonade-challenges.ts`) give each level five more sets of orders from
the level's amounts, in another order, with other customers, and where there is change another handful
to pay with. The solver serves a stand from the keys as a child would: it holds the jug tipped until a
pour let go then would settle on the order, and finds each push by trying it on a copy first. Its keys
replay to the same stand, which is the game's replay witness, and every variation is certified by it.
`school/games/__tests__/lemonade.test.ts` serves every level and variation this way, serves a customer
by hand, checks the short, long and wrong pushes, the change with a coin too many, that random pressing
serves at most one customer in five, that reduced motion settles, and the frame, the words and the
tuning table. `tools/e2e/games/lemonade-stand.e2e.ts` serves the first level from the keys under reduced
motion, and pours and slides with the mouse. The drawings added for it are `lemonadestand`, `pitcher`
and `lemoncup`; the market stall's drawings stay on the shelf. The rules version for `wardrobe` is now
`-lemonade-1`.

## Charlie's lemonade stand: change by tapping coins (2 October 2026)

The owner found the change step very hard to understand: a coin had to be picked with Next coin and rolled down the counter with a judged push, a coin that stopped short or rolled past came back, and nothing on the screen said how much was owed. The maths is in the change, not in the roll, so on the screen the roll is gone. When a customer pays, their speech bubble says what they paid and what the drink costs ("I paid 50¢. The cup is 35¢. My change, please!"), and the note says the same and tells the child to tap Charlie's coins. A tap on a coin in Charlie's dish hops it in one arc straight into that customer's dish with a clink, however far along the counter they stand, and the bubble's last line becomes the dish's running sum ("10¢ + 5¢ = 15¢"). When the dish holds exactly the change the customer says thank you and goes. A tapped coin that makes too much hops straight back with a kind word, and costs nothing; a tap on the customer's dish still takes the last coin back. On the levels that draw the fill line, the coins that still fit in the change are ringed. Next coin has no button any more, and the coin waiting to be rolled and its push guide are drawn only once the keys have been used. The keys are as they were: C picks the next coin, left and right set the push, space rolls it, and Backspace takes a coin back, and a rolled coin too many still waits to be taken back. Games may now mark a command `keysOnly`, which keeps its key and leaves out its button. The rules version is `-lemonade-3`.

## Pocket pool (27 September 2026)

Pocket pool (`school/games/pool.ts`, `?g=pool`) is a new game, chosen by the owner as the next game in
the shape of Garden mini-golf, the game they like most. A small table is seen from above with
numbered balls on it and a white ball. The child pulls back from the white ball and lets go, or turns
the aim with the left and right arrows, sets how hard with up and down, and strikes with space, using
the same aim as the putt (`engine/motion/aim.ts`); the cue is drawn behind the ball and draws back as
the shot is made harder. Once it is struck the table decides: the balls roll and slow on the cloth,
knock each other as equal weights do, bank off the cushions and the bumpers, and drop into the
pockets (`engine/motion/billiards.ts`). There is no spin, so a ball goes where its last knock sent
it, which is what a child can learn to judge by eye.

It plays like golf for the reasons golf works. The hand sets the aim and the strength by degrees,
physics decides what happens after the release, and a try costs nothing. Each level is a place with
its own obstacles, the dotted line helps early and goes later, and the maths is in the target rather
than in a question. Pool adds what golf lacks: the ball that is struck is not the ball that scores,
so every shot is judged twice, once for the white ball's line and once for where the struck ball goes,
and a bank shot is the same angle game as a golf wall.

The target is a sum. A ball potted is kept only when it fits: exactly 10, 10 in two shots, even balls
only, 12 with exactly three balls, or the one ball that makes a running 7 into a multiple of 5. A
shot that breaks the target (the white ball down, an odd ball on evens, a total past the target, too
many balls) is taken back for free, with the balls put back where they stood and a sentence that
says why, so the child tries that shot again. A rack that can no longer reach the target, or two
shots that did not make it, is set out again, also for free. There is no score and nothing to lose.

The eight levels:

1. Pot ten: three balls, 3 and 7 make it.
2. Ten in two shots: four balls, two pairs make 10, and after two shots the balls are set out again.
3. Round the corner: an L-shaped table, 12 from 5 and 7, with bank shots into the far pockets.
4. The bumpers: two round bumpers in the middle, pot 9.
5. Evens only: the middle pockets carry a sign and turn odd balls away; make 10 from even balls.
6. Soft cloth and a slope: a patch that slows a ball and a slope that pulls it, 12 with three balls.
7. The spinner: a bar turning in the middle, and one ball that makes 7 a multiple of 5.
8. The kitchen table: a fruit bowl in the way, on a kitchen floor, pot 15.

The dotted line shows the white ball's path with its first bank and the ball it meets, and the way
that ball will go, on the first two levels; only the way to what it meets first on levels three to
five; and nothing on the last three, where the cue alone shows the aim. Each level has three layouts
(`school/games/pool-challenges.ts`): as written, with the numbers moved round the spots, and turned
upside down (or the numbers moved again on the L table). A solver plays each layout through the real
table from the keys, trying the aims a player lines up and backing up a shot when a later one finds
nothing, and every layout is won that way in the tests.

Pocket pool has its own sounds: a tap for the cue, a clack pitched by how fast the balls met, a thud
off a cushion, a rattle down a pocket, a short double click when a pocket turns a ball away, a chime
for a ball kept, and a low rumble (the `roll` hum) while anything rolls. A ball kept emits a `pot`
event and a checkpoint, and the win a `won` event.

No activity in `school/games/activities.ts` asks for addition or number bonds yet, so Pocket pool does
not declare `plays`; when one is written, its versions can open these levels.

## Curling on the pond (4 October 2026)

Curling on the pond (`school/games/curling.ts`, `?g=curling`) is a new game on the shape that golf and
Pocket pool proved: the hand sets a throw by degrees, physics decides what happens after it is let
go, and a try costs nothing. A frozen pond is seen from above, with the house (four rings round the
button) at the far end, a hog line before it, and a winter park round the ice: snowy banks, firs,
a snowman, a bench, and the pups and a few people watching. Charlie stands at the hack with a stone.

The child pulls back from the stone and lets go, as in golf, and the length of the pull is the
weight. Up and down turn the line, left and right set the weight, and space throws, through the same
aim as every launch game (`engine/motion/aim.ts`). Which way the stone is turned is chosen with the second big
button, Change the curl (or B on the keys), or a tap on the stone, and the arrow drawn ahead of the stone bends the way
it will curl. While the stone glides, the child sweeps by holding a finger on the ice and scrubbing
it, holding space, or holding the Sweep button; sweeping by degrees makes the stone glide further and
bend less, which is what sweeping does in real curling. Brooms are drawn scrubbing ahead of the
stone and a faint trail is left where the ice was swept.

The ice is `engine/motion/ice.ts`, a small stepper of its own in fixed sub-steps: friction that slows
a stone (less when swept, more on a rough patch), a bend across the stone's path that grows as it
slows, a wind along the pond on one level, knocks between stones of equal weight that keep their
momentum, and lines past which a stone goes out. It is deterministic, so the same pads always leave
the stones in the same places.

The real rules are kept and made gentle. A stone that stops short of the hog line is taken off, and
the note says so. The rings score 4 at the button, then 3, 2 and 1, so a level can ask for a sum. A
full end is scored as curling scores it: only the side with the stone nearest the button scores, one
for each of its stones nearer than the other side's nearest. The blue team is a computer opponent
that throws first: it knocks out the child's stone when that stone is shot, and otherwise draws to
the house with a small error worked out from a seed, so its throws are the same for a seed. A throw
that misses the ask costs nothing; when the stones are gone and the ask is not met, the end is held
where it stopped with a sentence that says what happened, and the round's end card offers another
go.

The ten levels:

1. Slide to the house: stop a stone anywhere in the rings, with the whole path shown.
2. Hit the button: stop one in the middle ring.
3. Make exactly 6: three stones whose rings add up to 6.
4. Round the guard: a blue stone in front of the house, curled round.
5. Takeout: knock a blue stone out of the house.
6. Closer than: finish nearer the button than a blue stone, with the measure.
7. A windy afternoon: exactly 5, with a wind along the pond and no dotted line.
8. A full end: three stones each against blue, and score the end.
9. Exactly 10 on bumpy ice: a rough patch slows the stone on the way.
10. The village bonspiel: two ends of two stones each, and win the match.

The dotted line shows the whole slide to where the stone stops on the first three levels, only the
first part on levels four to six, and nothing from level seven, where the bent arrow alone shows the
aim. When a level measures, a tape runs from the button to each resting stone near it with its
distance in squares written beside it, in halves, so "closer" is a comparison of two numbers.
Near a ring edge the last moment of a slide plays a little slower, so the child sees which ring it
settles in.

The principles are met this way. The pull, the line, the weight and the sweep all act by degrees,
and a finger alone, the keys alone or the on-screen pad alone plays every level. The maths is in the
target (a ring sum, a distance, an end's score) rather than in a question. Every level has three
variations (`school/games/curling-challenges.ts`): as written, mirrored across the pond with the
wind turned round, and with the stones nudged and the total changed. A solver plays each through the
real pond, blue's replies included, by the keys and by a finger pulling back and letting go, backing
up a throw when a later one finds nothing, and every variation is won both ways in the tests; the
same pads replay to the same stones. Presses made at random win at most two levels in ten tries
each in the tests (none did when measured). The state is plain data, and under reduced motion a throw
jumps to where the stones stop and the snow does not fall. On a phone held upright the camera keeps
the stone and the house in view (`portrait.keep`), and while the child aims the whole pond fills the
room. The card plays the first level for two minutes.

The sounds are the kit's own: a thud as the stone is let go, a knock pitched by how hard two stones
met, a soft thud for a stone off the pond, a bell pitched by the ring a stone rests in, a cheer, and a
`sweep` hum of brushed noise while the child sweeps, beside the `roll` hum while a stone glides.

Some things were left out. The curl is set with B or a tap, not with left and right, since the arrows
already turn the line and set the weight. Blue throws without curl. The crowd has no hats, and the
breath puffs in the cold were not drawn.

### Curling: the polish pass (5 October 2026)

The pond was a plain blue box with small stones and empty paper round it, so this pass changed only how it looks and moves; the ice, the rules, the levels and the keys are as they were. The sheet is now painted on a frozen pond (`frozenpond`) with a soft shore, drifted snow, reeds and pebbles, and the sheet itself is brighter ice with a fine pebble, crisp rings under a glaze and soft painted sides rather than a box. Firs stand on the far bank, the pups and people watch from a snowy rise above the house, and a snowman, a bench, a sledge and three lanterns stand on the near bank, the lanterns laying a faint warm light on the snow. The camera is close on the hack and the first part of the sheet while a throw is lined up, rides the stone with a lead, comes in close on the house for the last stretch so the stones and rings are large when it settles, and then shows the house with the crowd above it. The stones are drawn true to their size with a band of their team's colour, and the polished track behind a moving stone fades the further back it lies. Charlie and a friend run either side of the stone in a new `sweep` pose from the figure kit, their brooms brushing just ahead of it, with frost kicked up and a puff of breath now and then. The aim arrow is longer and bends more with the curl, a stone that stays in the house makes the button pulse while the crowd cheers, the measure is a ticked tape, and the ask and the running total stay fixed at the top of the view. Snow falls as flakes in two depths (`snowflake`). Under reduced motion the camera cuts, and there is no snow, no light and no puff. On phone WebKit a glide on the full end runs at a median of 17 ms a frame.

## Charlie's garden (4 October 2026)

Charlie's garden (`school/games/garden.ts`, `?g=garden`) is a new game in the line of Stardew Valley
and Animal Crossing, where a plot is sown, watered and picked over a few days. A garden beside the
cottage is seen from above on a lawn on squared paper: seed packets on a potting bench down the
left, raised wooden beds with a label for each job in the middle, a hedge along the top with flowers
at the door, a sundial and a basket on the right, and the watering can by a water butt at the head of
a gravel path, with a compost bin at its far end that fills as the days go by. A robin sits on a
post, and butterflies and a bee drift over the lawn. Charlie stands in the garden, and the "Who
gardens here" button swaps her for Pip or a friend.

Charlie walks freely at any time. The arrows or W, A, S and D walk her eight ways, speeding up and
slowing down, facing the way she walks with a walk cycle (`engine/motion/actor.ts`); a tap or a click
on the lawn sends her there on a route round the bench, the butt, the sundial and the crates, and
round the beds where that is not much further; a finger held on the field is followed. She walks over
the beds' soil when that is where she is sent. The walking is `engine/motion/roam.ts`. On a phone held
upright the field follows her gently; on a wider screen the whole plot is in view.

She carries one thing at a time: a seed packet, the can, the basket, or nothing, drawn in her hand
and bobbing as she walks. One Action does what the thing she faces asks, and its button's icon and
label follow it: "Pick up can", "Plant", "Sow", "Water", "Pick", "Share", "Pull weed", "Shoo snail",
"Next day" or "Put down". A soft ring sits under the thing it would act on. Action at another thing
puts what she holds back where it lives and takes the new one, and on bare grass it puts it down in
front of her. Nothing ever leaves her hands by itself, which was the owner's complaint about the
earlier version, where a click on the can and its release put it down again at once. Action with
nothing to act on does nothing but a soft "nope" and a small shake, which reduced motion leaves out.
A tap on a thing walks her to it and does what Action would there: takes a packet, the can or the
basket, ends the day at the sundial, pulls a weed, shoos a snail, picks a ripe plant or shares into
a crate. A tap on Charlie with something in hand puts it down.

Planting is a rectangle she walks out. With seeds at a bed, Action starts the rows at the cell
nearest her, and as she walks the rectangle stretches to the cell nearest her, counted in plants:
rows of plants and plants in each row, snapped to the bed and, for a pumpkin that spreads over four
cells, to its own grid. Ghost seedlings and dots show the holes, a box goes round them, and the words
over the bed say "3 rows of 4 = 12". Action again sows. With a finger, a drag on a bed while she
holds seeds stretches the rectangle directly from where it went down, and lifting sows it.

Watering is held. With the can at a bed, holding Space or the Action button tips the can by degrees
and pours until it is let go; Enter, which has no hold, pours for a short while at each press. The
water comes out of the rose as real drops from the particle liquid (`engine/motion/liquid.ts`),
falls, and adds litres to the bed it lands in, which is the soil in front of her. The soil darkens as
it takes water, and too much stands as a puddle. With a finger, holding it on a bed while she has
the can walks her beside the spot and pours there until the finger lifts. A night spends the water:
each growing plant drinks a quarter of a litre, a bed with enough grows every plant on by a day, a
dry bed droops, and a bed standing in water grows nothing until it drains.

Picking and sharing take the basket. With the basket at a ripe plant Action picks it, and holding
Action while she walks along a row picks each ripe plant she passes, which flies into the basket;
with a finger, a tap or a drag over ripe plants picks them. Where a level shares the harvest, Action
at a crate puts one in and holding it goes on one at a time, as does a finger held on the crate.
The sundial, or the N key, ends the day.

The rules of the garden are `engine/motion/garden.ts`, free of any one game: beds of cells, sowing
rectangles, water by the litre with runoff from a slope into the bed below it, nights that grow, dry
out, drown, and the weeds and snails that cost a plant its night. The weeds and snails come from a
seed and the day, so the same garden grows the same way. A weed is pulled and a snail is shooed by
Action beside it, or by a tap on it, with nothing needed in her hands.

The nine levels:

1. A bed by the cottage: a row of 5 carrots, grade 1.
2. Rows of lettuces: 2 rows of 3, grades 1 to 2.
3. The vegetable patch: 3 rows of 4 carrots in the long bed, beside a bed that is not the job, grade 2.
4. A rainy spring: fill a bed 5 holes across and 3 down with sunflowers; it rains on some nights, so
   the child waters only on the dry ones, grade 2.
5. The greenhouse: 2 rows of 3 strawberries in each of two beds, and exactly 2 litres a day for each,
   with the litres poured written under the bed, grades 2 to 3.
6. A hilly garden: 4 rows of 5 strawberries under a slope, where water poured on the hill runs down
   into the bed below, grade 3.
7. Snail summer: grow 24 strawberries in an array the child chooses, pull the weeds and shoo the
   snails, and share the harvest equally between 4 baskets, grade 3.
8. The harvest fair: 3 customers want 5 carrots each, so the child works out 15, sows them, and fills
   each customer's crate, grades 3 to 4.
9. Your own garden: two beds and every crop, with no ask; the garden is kept in the browser and comes
   back when the level opens again (`saves: { level }`).

The previews fade by level. On the first three levels the words over the bed give the whole
multiplication and the board under each bed says how many nights its water will last. From the
fourth level the words give only the count, and from the seventh nothing is shown but the ghost
seedlings and the soil's colour, so the child counts the array and judges the water from the droop
and the puddle.

The principles are met this way. The hand sets amounts by degrees: the size of the array is
stretched out cell by cell, the can tips further the longer it is held, and a share is moved one at
a time for as long as the basket is held over a crate. The water is drops, and where they land after
the can lets go decides which bed gets them, including the runoff down the hill. A try costs nothing:
undo takes back a sowing, a day, a pick, a share, a pulled weed or a shooed snail, a dry or soggy night only holds a plant back a day, and
nothing dies. The levels are places (a cottage bed, a long patch, a greenhouse, a hillside, a fair)
with obstacles of their own (rain, an exact amount, runoff, weeds and snails, customers). The maths
sits in the targets: arrays as rows times columns, area as the holes in a bed, litres, equal sharing
as division, and the fair's multiplication before sowing. Every level has three variations
(`school/games/garden-challenges.ts`) that change the array, the litres, the total and the number of
baskets, or the customers and how many each wants. A solver plays every variation through the real
game by the keys, walking Charlie with held arrows and pressing Action, and by a finger, tapping
things to send her to them, dragging the rows and holding still to pour and share; the tests replay
its acts to the same garden. Walks, presses, drags and taps made at random win at most one level in
six tries each in the tests. The state is plain data.

The keys play everything: the arrows or W, A, S and D walk (a quick tap of an arrow only turns her),
Space or Enter is Action (Space held pours, picks along a row or shares on), Escape puts down what
she holds or drops a rectangle not yet sown, N is the next day, C changes the gardener and Backspace
takes back. The on-screen pad has only the arrows, the one Action button, Who gardens here and Undo,
each a round icon button of at least 44 pixels with its label as its name and tooltip; the Action
button's picture is a hand, a sprout, a can, a basket or the sun after what it would do. There is no
card (`card: null`), since the game is played by walking between the packets, the beds, the can and
the basket across a wide plot, which a small card would crop.

The sounds are the kit's own: a thud as the stone is let go, a knock pitched by how hard two stones
met, a soft thud for a stone off the pond, a bell pitched by the ring a stone rests in, a cheer, and a
`sweep` hum of brushed noise while the child sweeps, beside the `roll` hum while a stone glides.

Some things were left out. The curl is set with B or a tap, not with left and right, since the arrows
already turn the line and set the weight. Blue throws without curl. The crowd has no hats, and the
breath puffs in the cold were not drawn.

### Curling: the polish pass (5 October 2026)

The pond was a plain blue box with small stones and empty paper round it, so this pass changed only how it looks and moves; the ice, the rules, the levels and the keys are as they were. The sheet is now painted on a frozen pond (`frozenpond`) with a soft shore, drifted snow, reeds and pebbles, and the sheet itself is brighter ice with a fine pebble, crisp rings under a glaze and soft painted sides rather than a box. Firs stand on the far bank, the pups and people watch from a snowy rise above the house, and a snowman, a bench, a sledge and three lanterns stand on the near bank, the lanterns laying a faint warm light on the snow. The camera is close on the hack and the first part of the sheet while a throw is lined up, rides the stone with a lead, comes in close on the house for the last stretch so the stones and rings are large when it settles, and then shows the house with the crowd above it. The stones are drawn true to their size with a band of their team's colour, and the polished track behind a moving stone fades the further back it lies. Charlie and a friend run either side of the stone in a new `sweep` pose from the figure kit, their brooms brushing just ahead of it, with frost kicked up and a puff of breath now and then. The aim arrow is longer and bends more with the curl, a stone that stays in the house makes the button pulse while the crowd cheers, the measure is a ticked tape, and the ask and the running total stay fixed at the top of the view. Snow falls as flakes in two depths (`snowflake`). Under reduced motion the camera cuts, and there is no snow, no light and no puff. On phone WebKit a glide on the full end runs at a median of 17 ms a frame.

## Charlie's garden (4 October 2026)

Charlie's garden (`school/games/garden.ts`, `?g=garden`) is a new game in the line of Stardew Valley
and Animal Crossing, where a plot is sown, watered and picked over a few days. A garden beside the
cottage is seen from above on a lawn on squared paper: seed packets on a potting bench down the
left, raised wooden beds with a label for each job in the middle, a hedge along the top with flowers
at the door, a sundial and a basket on the right, and the watering can by a water butt at the head of
a gravel path, with a compost bin at its far end that fills as the days go by. A robin sits on a
post, and butterflies and a bee drift over the lawn. Charlie stands in the garden, and the "Who
gardens here" button swaps her for Pip or a friend.

Charlie walks freely at any time. The arrows or W, A, S and D walk her eight ways, speeding up and
slowing down, facing the way she walks with a walk cycle (`engine/motion/actor.ts`); a tap or a click
on the lawn sends her there on a route round the bench, the butt, the sundial and the crates, and
round the beds where that is not much further; a finger held on the field is followed. She walks over
the beds' soil when that is where she is sent. The walking is `engine/motion/roam.ts`. On a phone held
upright the field follows her gently; on a wider screen the whole plot is in view.

She carries one thing at a time: a seed packet, the can, the basket, or nothing, drawn in her hand
and bobbing as she walks. One Action does what the thing she faces asks, and its button's icon and
label follow it: "Pick up can", "Plant", "Sow", "Water", "Pick", "Share", "Pull weed", "Shoo snail",
"Next day" or "Put down". A soft ring sits under the thing it would act on. Action at another thing
puts what she holds back where it lives and takes the new one, and on bare grass it puts it down in
front of her. Nothing ever leaves her hands by itself, which was the owner's complaint about the
earlier version, where a click on the can and its release put it down again at once. Action with
nothing to act on does nothing but a soft "nope" and a small shake, which reduced motion leaves out.
A tap on a thing walks her to it and does what Action would there: takes a packet, the can or the
basket, ends the day at the sundial, pulls a weed, shoos a snail, picks a ripe plant or shares into
a crate. A tap on Charlie with something in hand puts it down.

Planting is a rectangle she walks out. With seeds at a bed, Action starts the rows at the cell
nearest her, and as she walks the rectangle stretches to the cell nearest her, counted in plants:
rows of plants and plants in each row, snapped to the bed and, for a pumpkin that spreads over four
cells, to its own grid. Ghost seedlings and dots show the holes, a box goes round them, and the words
over the bed say "3 rows of 4 = 12". Action again sows. With a finger, a drag on a bed while she
holds seeds stretches the rectangle directly from where it went down, and lifting sows it.

Watering is held. With the can at a bed, holding Space or the Action button tips the can by degrees
and pours until it is let go; Enter, which has no hold, pours for a short while at each press. The
water comes out of the rose as real drops from the particle liquid (`engine/motion/liquid.ts`),
falls, and adds litres to the bed it lands in, which is the soil in front of her. The soil darkens as
it takes water, and too much stands as a puddle. With a finger, holding it on a bed while she has
the can walks her beside the spot and pours there until the finger lifts. A night spends the water:
each growing plant drinks a quarter of a litre, a bed with enough grows every plant on by a day, a
dry bed droops, and a bed standing in water grows nothing until it drains.

Picking and sharing take the basket. With the basket at a ripe plant Action picks it, and holding
Action while she walks along a row picks each ripe plant she passes, which flies into the basket;
with a finger, a tap or a drag over ripe plants picks them. Where a level shares the harvest, Action
at a crate puts one in and holding it goes on one at a time, as does a finger held on the crate.
The sundial, or the N key, ends the day.

The rules of the garden are `engine/motion/garden.ts`, free of any one game: beds of cells, sowing
rectangles, water by the litre with runoff from a slope into the bed below it, nights that grow, dry
out, drown, and the weeds and snails that cost a plant its night. The weeds and snails come from a
seed and the day, so the same garden grows the same way. A weed is pulled and a snail is shooed by
Action beside it, or by a tap on it, with nothing needed in her hands.

The nine levels:

1. A bed by the cottage: a row of 5 carrots, grade 1.
2. Rows of lettuces: 2 rows of 3, grades 1 to 2.
3. The vegetable patch: 3 rows of 4 carrots in the long bed, beside a bed that is not the job, grade 2.
4. A rainy spring: fill a bed 5 holes across and 3 down with sunflowers; it rains on some nights, so
   the child waters only on the dry ones, grade 2.
5. The greenhouse: 2 rows of 3 strawberries in each of two beds, and exactly 2 litres a day for each,
   with the litres poured written under the bed, grades 2 to 3.
6. A hilly garden: 4 rows of 5 strawberries under a slope, where water poured on the hill runs down
   into the bed below, grade 3.
7. Snail summer: grow 24 strawberries in an array the child chooses, pull the weeds and shoo the
   snails, and share the harvest equally between 4 baskets, grade 3.
8. The harvest fair: 3 customers want 5 carrots each, so the child works out 15, sows them, and fills
   each customer's crate, grades 3 to 4.
9. Your own garden: two beds and every crop, with no ask; the garden is kept in the browser and comes
   back when the level opens again (`saves: { level }`).

The previews fade by level. On the first three levels the words over the bed give the whole
multiplication and the board under each bed says how many nights its water will last. From the
fourth level the words give only the count, and from the seventh nothing is shown but the ghost
seedlings and the soil's colour, so the child counts the array and judges the water from the droop
and the puddle.

The principles are met this way. The hand sets amounts by degrees: the size of the array is
stretched out cell by cell, the can tips further the longer it is held, and a share is moved one at
a time for as long as the basket is held over a crate. The water is drops, and where they land after
the can lets go decides which bed gets them, including the runoff down the hill. A try costs nothing:
undo takes back a sowing, a day, a pick, a share, a pulled weed or a shooed snail, a dry or soggy night only holds a plant back a day, and
nothing dies. The levels are places (a cottage bed, a long patch, a greenhouse, a hillside, a fair)
with obstacles of their own (rain, an exact amount, runoff, weeds and snails, customers). The maths
sits in the targets: arrays as rows times columns, area as the holes in a bed, litres, equal sharing
as division, and the fair's multiplication before sowing. Every level has three variations
(`school/games/garden-challenges.ts`) that change the array, the litres, the total and the number of
baskets, or the customers and how many each wants. A solver plays every variation through the real
game by the keys, walking Charlie with held arrows and pressing Action, and by a finger, tapping
things to send her to them, dragging the rows and holding still to pour and share; the tests replay
its acts to the same garden. Walks, presses, drags and taps made at random win at most one level in
six tries each in the tests. The state is plain data.

The keys play everything. The arrows move a cursor a cell at a time across the whole plot, Enter
takes what is under it and puts it down, Enter on a bed fixes the first corner of a sowing and a
second Enter the far one, Enter held with the can or the basket pours or shares, Escape puts things
down, N is the next day and C changes the gardener. The on-screen pad has the arrows, Take or put
down, Put down, Next day and Who gardens here, each a round icon button with its label. On a phone
held upright the field follows the hand across 30 of the plot's 44 squares (`portrait.keep`). There
is no card (`card: null`), since the game is played by carrying between the packets, the beds, the
can and the basket across a wide plot, which a small card would crop.

The sounds are the kit's own: seeds pattering into their holes, a rustle as a packet or the can is
lifted, a pop as a plant is picked, a soft thump into a basket, and a rising pair of notes for the
sprouts in the morning, with a quiet `birds` hum under the whole garden and the `water` hum while
the can pours. A thing taken pops as it comes into her hand, with a puff where it was. Under reduced
motion a press of an arrow walks her about a cell and a tap walks her all the way, each drawn once at
rest; the water lands at once, the produce does not fly, and nothing bobs or shakes.

Some things were left out. A
hose was considered for the hilly level and not drawn; the can does the same job. Planting by
holding the packet and dropping seeds one at a time was set aside for the stretch, which keeps the
array the thing the child makes.
### Charlie's garden: the guide (5 October 2026)

The owner could not tell how to play the garden as an adult: a screenshot showed Day 25 with nothing
planted, because nothing on the board said what to do first. Four things now say it.

A step strip runs across the top of the view, above the hedges: "1 Get carrot seeds", "2 Plant 5 in a
row", "3 Water", "4 Grow", "5 Pick", and "Share" on the levels that share. The step to do sits in a
yellow pill and a step done gets a tick. Each tick is read from the garden as it stands rather than
kept as a script, so the water step lights up again when a bed dries overnight. The strip sat between
the hedges and the beds at first; it moved to the top because there it stood over Charlie whenever she
worked the near side of a bed.

An arrow bobs over what the step to do needs next: the seed packet, the bed, the can, the sundial, the
basket, a ripe plant or a crate, and a weed or a snail before any of them. It is always on in the first
level and comes after 8 seconds with no progress on the others, and under reduced motion it stands
still. The description for a screen reader carries the same: "Step 1 of 5: Get carrot seeds." and "The
arrow points at the carrot seeds."

Charlie says things in a bubble. On the first visit she explains the controls once ("Walk with the
arrows or tap where to go. Press Space or the big button to use what is in front of you."), and the
bubble goes at the first action. After 8 quiet seconds, or when the Action has nothing to use, she
says the next step in a short sentence, and the note in the top bar always says it too. The bubble
stands over her head where there is room under the strip, and beside her at head height where there
is not, so it never covers her.

The sundial refuses a day when nothing is planted: "Plant something first: nothing will grow yet."
Letting the day pass would only repeat the confusion in the screenshot, an empty bed and a counting
calendar, so the kinder answer is to say what to do and stay on the same day. On the first three
levels a dry bed gets a warning first, and a second tap waits anyway; on later levels the day passes
and the night's own sentence says why nothing grew. The logic is `engine/motion/guide.ts`, which reads
a list of steps and a game's state and says which step is current, where the arrow points and how it
bobs, so another game can use it.

## Kite flying (5 October 2026)

Kite flying (`school/games/kite.ts`, `?g=kite`) is a kite on a real line in a gusty sky, chosen by the
owner from the list of new ideas with the brief that it be smooth to play, and neither too hard nor too
simple. Charlie stands at the left of a field with the reel, the wind blows from the left, and the kite
flies on its line downwind of her. The numbers are on balloons in the sky, and the kite pops one by
flying through it.

The physics is `engine/motion/kite.ts`, stepped 240 times a second. The kite flies along its nose at an
airspeed the wind gives it, drifts downwind with the air, and sinks once it flies slower than it
stalls. The line is a length the kite may not go past, so a taut line holds it on a circle round
Charlie's hands and it slides along that circle the way its nose and the wind send it. The wind's push
is strongest low and downwind and wanes towards the top of the sky, and it is weaker near the ground,
so a kite left alone rests at about 59 degrees, high downwind of her, and comes upright on its own.
Steering turns the nose, so a held turn swings the kite across the sky and loops it; a nose turned down
dives and gains speed, and a dive near the grass is a crash. Pulling the line in takes up slack and adds
airspeed, which is how a real flyer keeps a kite up when the wind drops, and letting it out lets the kite
climb away on the wind. Gusts and lulls come from a seeded day of changes (`changesOf`), each sweeping
across from the left at fourteen squares a second, so a variation's wind is the same on every try. A gust
lifts the kite and is drawn as streaks carried across with it, which a child sees before it arrives; a
lull is felt as the kite slowing and sinking, and the wind sock upwind of everything hangs limp in it
and streams out in a gust. The tail is a chain of six bows that streams behind wherever the kite goes,
and the line sags by its weight, more when it is slack or the wind is light.

The hand sets amounts by degrees: a finger held in the sky is where the kite should go, so the nose turns
towards it at the rate the kite can turn and the line goes out or comes in at the reel's rate to reach
it, which keeps the kite a kite rather than a cursor. With the keys, left and right steer (held, a loop),
up lets the line out, down pulls it in, and space gives a quick tug that throws the kite forward. W, A,
S and D do the same. The two round buttons under the field are Pull, held to reel in, and Let out. Once
the hands let go, the wind and the line decide.

A crash is a moment on the grass before Charlie sends the kite up again, and on most levels it costs
nothing. Two levels count flights, where the last crash ends the round on the not-won card, and the
festival is timed. A tree brushed makes the kite tumble, the tree that eats kites holds it for a moment
until Charlie tugs it free, a power line knocks it away with a line about keeping real kites far from
power lines, and another flyer's kite bumps it. On the first level the kite is gentler: it rights itself
quicker, stalls later, and a held steer only leans it, so it cannot be turned over and dived into the
ground.

The dotted way ahead is the next stretch of flight with the hands as they are, worked out by the same
step the kite flies by, so the dots and the flight agree to the last digit (a test holds them to it). It
is 1.2 seconds long on the first two levels, shorter later, and absent from the last three.

The maths is in the targets. The board over the sky says what is asked and keeps the sum as a sum
("2 + 6 = 8"). A balloon that would take an exact total past its target bounces away whole, and the line
under the goal says why ("9 + 4 would be 13, past 10"); a balloon out of order bounces too. An odd
balloon on the even level pops but does not count, and an even number counts once. A popped balloon
comes back after five seconds, so no try is ever stuck short of its target. The ten levels:

1. The meadow: pop four balloons, in a steady wind.
2. Make ten at the beach: balloons 1 to 6, exactly 10, first gusts.
3. Even numbers on the hill: four different even numbers among 2 to 9, first lulls.
4. Count by threes in the park: 3, 6, 9 and 12 in order, with trees and the tree that eats kites.
5. Up over the town: keep the kite higher than 35 metres on the pole for three seconds, over roofs and a power line. The line reaches only 36 squares, so letting it all out is not enough: the kite has to be leaned upwind and held there, since the sky's push wanes overhead. The board does not give the height; the pole is read in tens, and a dotted guide runs from the kite to it.
6. Twenty-five in the autumn wind: exactly 25 in two flights, with strong gusts and lulls.
7. Doubles on the windy hill: the board asks for double 7, then double 6, then double 9, and birds carry numbers across.
8. Fifty at the festival: exactly 50 with fives and tens before the clock runs out, dodging two other flyers' kites.
9. Sixes on the gusty beach: 6, 12, 18 and 24 in order, in three flights, under a power line.
10. Free sky: fly as high as you like, pop what you like; the best height is kept in the browser.

Each target level has three variations (`school/games/kite-challenges.ts`): the numbers moved round the
balloons, another day's wind, and on the doubles level other doubles. A pilot flies each one to its win
through the game, as a child would: it picks the balloon the ask wants next, lets the line out or pulls
it in to that balloon's distance, steers the nose at it, and pulls in when the kite flies slower than it
stalls; on the height level it lets all the line out and holds a lean of half a radian upwind. It does
this with the keys and, separately, with a finger in the sky and the Pull button in a lull, and the
challenges family certifies a variation only when both win. The tests play the recorded pads back to
the same win. Random hands for ninety seconds win the meadow 2 times in 20, make ten 3 times, the
festival 3 times, the autumn field once, and the other levels never. The card in a lesson plays the
meadow by a finger alone and wins in about four seconds of the pilot's play; the first level keeps a
square at 12 pixels in a 360 by 240 card.

The art is twelve new drawings, listed in [shelf.md](shelf.md). The sounds are the game's own: a tug's
whip, a balloon's pop pitched by its number, a crash on the grass, a soft double note for a balloon that
does not count, a creak for the tree that eats kites, a rising arpeggio for a win, and the wind hum,
louder in a gust and as the kite moves faster. The rules version is `kite-1` in `engine/answer.ts`.

## Pinball garden (4 October 2026)

Pinball garden (`school/games/pinball.ts`, `?g=pinball`) is a pinball table seen from above whose
playfield is a garden, chosen by the owner from the list of new ideas. It is built on the same six
ingredients as Garden mini-golf and Pocket pool. The hand sets amounts by degrees: the plunger is
pulled back as far as the child likes, and a flipper is up for as long as it is held. Once the ball is
away, physics decides. A drained ball comes back to the plunger in under a second, and no level ends in
a game over. Each level is a garden place, the dotted help fades as the levels go on, and the maths is
in what the ball has to hit.

The table is drawn by `engine/parts/sport/pinballtable.ts`, which also exports its measures, walls and
flippers, so the drawing and the physics cannot disagree. The physics is a small kit of its own,
`engine/motion/pinball.ts`: a ball on a tilted table, stepped 240 times a second with the speed capped
so the ball moves less than its own radius in a step, and so cannot pass through a wall, a post or a
flipper. Walls can kick (the slingshots), posts can kick and slide (the flower bumpers and the snail),
the flippers carry the speed of their own swing into the ball, the ladybirds drop when hit, lanes count
once on the way in, the sunflower spins as the ball crosses it, the beehive holds the ball and throws it
back out, and the watering can carries the ball along its spout. The kit keeps its state as plain data
and gives the same table for the same keys every time.

With the keys, down pulls the plunger and letting go launches, left and right swing the flippers, and
space nudges the table, three times a ball. With a finger, the plunger is drawn down in its lane and let
go, and holding the lower left or lower right of the table swings that flipper. Both reach the same
pull, since a pull is rounded to ninety-sixths either way, so a try found by the keys is the same try by
a finger. The icon buttons below the field are the keys' round 44 px buttons. A flip pressed while the
ball is still dropping onto that flipper waits up to a fifth of a second for the ball to arrive, and a
tap shorter than eight steps is held up that long, so a child a moment early or quick still bats the
ball. A ball that sits still for two and a half seconds is nudged free by the table itself.

The maths is in the targets. The flowers are bumpers with numbers on them, and on most levels the child
has to make an exact total. A hit that would go past the total does not count: the flower wilts, the
total stays, and the line under the goal says so. The third hit past the total in a try starts it again
from 0. We chose this over the stricter rule, where any overshoot ends the try, because a child of five
cannot aim a pinball at one flower, and losing a total of 8 to a stray 5 felt like a punishment for the
table rather than for the sum. Keeping the total still makes the child look for the flower that fits,
and the limit of three stops random play from winning by luck alone.

The nine levels:

1. The flowerbed: hit three flowers (1, 2 and 3), counting only.
2. Make ten: the flowers are 1, 5 and 2, and the total has to be exactly 10.
3. The pond lane: five flowers round a pond; light every odd flower, and an even one closes them again.
4. Ladybirds in order: four ladybird drop targets numbered 2, 4, 6 and 8, hit in counting order; one out of turn bounces the ball away.
5. Exactly twenty: flowers of 1, 10, 2, 5 and 2 and a snail worth 5 that slides across the orchard.
6. The beehive and the double lane: make 30 from flowers of 3, 5 and 2, the hive's 4, and a lane marked ×2 that doubles the next flower.
7. Three balls to fifty: at least 50 in three balls, with the watering can worth 10 and the sunflower spinning.
8. The evening garden: exactly 100 from flowers of 10 and 1 and the watering can, at dusk with lights on the bumpers.
9. Free play: every part on the table, a score, and the best score kept in the browser.

The launch is shown as a dotted path while the plunger is pulled, and the way a flip would send the ball
is shown while it comes down, on the first three levels. Levels four to six keep only the launch path,
and the last two show nothing. Levels with a sum give a try three balls (five in the evening garden), and a
try that runs out of balls stops with the total it reached, and the round's end card offers another go.

The art is twelve new drawings in `engine/parts/sport/`, all on the shelf: the table in five places, the
flower bumper (plain, lit, wilted and blooming), the leaf flipper, the plunger, the ladybird, the snail
target, the watering can ramp, the sunflower spinner, the beehive, the rollover lane, the marble and the
backbox. Charlie stands beside the table, pointing while the child plays and cheering a win, with
hedges, trees, flowers and a garden gate round it. The board above the table reads the target and the
total as a sum. A hit flower blooms and glows, the ball leaves a short trail, and under reduced motion
the trail is not drawn and the ball is settled before the frame is drawn.

The sounds come from the game's kit: a click for a flipper, a pop for a flower pitched by its number, a
rising twang for the launch, a splash for the watering can, a thump as the hive catches the ball, a tick
for the sunflower, a soft double note for a hit that would go too far, a falling note for a drain, a
chime for a lit lane or a ladybird, a rising arpeggio for the win, and the `roll` hum while the ball
moves. A win emits a `won` event.

There is no game card: the whole table has to be in view to play it, and a 240 px card would show it at
under 12 px a square. Each target level has three variations (`school/games/pinball-challenges.ts`): the
flowers' numbers turned round their places, and on the ladybird level the ladybirds counting in fives or
threes. The challenges family `pinball` gives them out without a solver at generation time, as pool
does, since a search takes about a second. Instead the tests play every variation to its win from the
keys with a beam search over the pulls and the flips, replay the same keys to the same table, play the
same win by a finger, and check that a single ball of random flipping hits the target at most four times
in twenty. The rules version is `pinball-1` in `engine/answer.ts`.

## Rescue pups (28 September 2026)

Rescue pups (`school/games/rescue.ts`, `?g=rescue`) is a new game the owner asked for as a rescue team
of pups. The team is our own Pup family from the shelf, each with a job, a vehicle and a piece of gear
in our palette: Rufus drives the fire truck in a red helmet, Maple flies the rescue helicopter in a
blue flying cap, Pip drives the digger in a yellow hard hat, and Dot crews the rescue boat in an orange
life vest. Nothing in the game is taken from any television show: no names, no badges, no look-alike
vehicles or buildings, and the rescue station is a low building with two garage doors and a bell.

Each level is a call-out. The pup runs from the station to its vehicle and hops in, and then the child
does one job, or two in a row on the last two levels. Every job is a real piece of physics that the
hand sets by degrees and the world decides once it is let go:

- Fire. A finger held on the field aims the hose there, further for more pressure, and the water
  sprays while it is held; with the keys, up and down aim, left and right set the pressure, and space
  sprays. The water is the particle liquid (`engine/motion/liquid.ts`), so it arcs, falls short when
  the pressure is low and bends in the wind. Each fire shows the litres it needs, the tank shows the
  litres left, and a fire nobody is spraying grows slowly. An empty tank fills again for free, with
  the fires as they began.
- Air. The helicopter follows a held finger across, and the finger's height sets how much rope is let
  down; with the keys, left and right fly and up and down wind the rope. The load swings on the rope
  as a weight does, slowed only by the air, so a fast move sets it swinging and a still hand lets it
  settle. The hook takes hold only when it meets the lamb or the hiker slowly, and sets them down only
  on the pad the call-out names. The rope carries a tick every metre, and each one waiting says how
  many metres down they are.
- Dig. A held finger is where the bucket goes, and lifting the finger scoops a rock or drops it; with
  the keys, left and right drive, up and down raise and lower the arm, and space scoops or drops. A
  dropped rock falls with the speed the bucket had, into the truck's bed or onto the road. The truck
  takes away only a load of exactly its size, and a rock that would take it over is tipped back out,
  so the road is cleared as whole loads: 2, 3 and 5 tonnes in loads of 5, or 14 tonnes in loads of 7.
- Sea. A held finger aims the throw and lifting it lets the ring go, as the slingshot's pull does;
  with the keys, up and down aim, left and right set the strength, and space throws. The ring flies on
  its rope, which stops it at the rope's length, lands, and drifts with the river. A swimmer takes it
  if it floats within reach, and holding then pulls them in against the current. A ring that misses is
  pulled back in to throw again. The river carries its metres from the boat, and each swimmer says how
  far out they are.

The eight levels:

1. Fire at the cottage: two window fires, a 20 litre tank.
2. The lamb on the cliff: one lamb on a ledge, landed on pad 2.
3. Rocks on the road: 2, 5 and 3 tonnes in loads of exactly 5.
4. Swimmer in the river: one swimmer 6 metres out, 9 metres of rope.
5. The barn and the wind: three fires on the barn with the wind blowing the water back.
6. Two on the cliff: the lamb to pad 4 and the hiker, further down, to pad 6, past a ledge.
7. Clear the road, then the fire: 14 tonnes in loads of 7, then three fires on the cottage.
8. Rescue at the river: two swimmers in a fast river with wind, then the hiker to pad 9.

The aids fade across the levels: the dotted arc of the water and the throw shows in full at first, half
of it on levels five and six, a quarter on level seven and none on the last, and the rope's numbers
and the drop line go the same way. Each part of a rescue done (a fire out, someone landed, a load
taken, a swimmer aboard) is a checkpoint, and the last one is the win, when the whole team cheers.
Each level has three layouts (`school/games/rescue-challenges.ts`) with other litres, ledges and pads,
rubble or distances, and a driver plays each one through the real game from the keys, lining up the
hose, the helicopter, the digger or the throw as a player would; every layout is won that way in the
tests, and random play for as long as the driver took rarely wins.

The sounds are the game's own: a bark at each pup's pitch as it boards and when a job is done, a thud
for a rock, and the hums of the siren, the helicopter's rotor, the digger's diesel and running water
(`siren`, `rotor` and `rumble` are new hums in `engine/sound/kit.ts`).

No activity in `school/games/activities.ts` covers these jobs, so the game does not declare `plays`.

## Penny shove, the slingshot and the stall on the shared aim (26 September 2026)

Penny shove now turns a pull into a shove through `engine/motion/aim.ts`, the aim control golf and
the stall share: the other way from the pull, as fast as the pull is long up to the fastest shove.
The flick, the keys and the aim commands are unchanged, and the aim line still shows where a shove
will stop. A piece that stops before the line now says how far short it was ("a little short of the
line", "well short of the line") before it goes back to its pile.

The slingshot's launch goes through the same aim, with the dotted arc it already drew. A shot that
knocks no star now says how near it came to one ("A little short of a star", "Well past the
stars") as the next ball loads. The new record of a shot is set only when a ball is let go, so the
starting state, and the identity of a stored challenge, are as they were.

Charlie's market stall's last level has a dish the stallholder glides back and forth along the
counter the whole time, coins in flight or not, rather than one that jumps to a new place after
each throw. The dish is carried by the game (a carried body in `bodies.ts`, following a path in
`mover.ts`), and a coin resting in it rides along and counts, judged by how it moves against the
dish rather than against the counter. The tests throw where the dish will be when the coin lands,
as a child learns to lead it. The stall's rules version moved on, since its state changed shape.

## Shut the box: a smoother throw (3 October 2026)

The owner liked the game and found the throw rough. Three things made it so. The die's turn on the table was a setting of its drawing, so every degree of spin was a new look the atlas had to draw while the dice moved, and a look still being drawn shows the nearest one it has, which reads as a stutter. The roll over its edges ran continuously, which asked for a new look every frame as well. And the tray of choices was drawn as soon as the move was made, so the faces could be read off the buttons before the dice had landed.

Now the turn is the sprite's own angle, turned by the GPU, and the drawing keeps one turn through the throw. The roll steps in twelfths of a quarter turn, so a throw passes through a few dozen looks the stage draws ahead of it. A die grows as it leaves the felt and shrinks as it lands, over three bounces each lower and shorter than the last, with a squash and a clack on each landing that is louder and lower the higher it fell, and a small give as it comes to rest. A throw tumbles for at most a second and a half. The player keeps the tray back while a beat that long plays and then brings the choices in, by opacity so a keyboard player keeps their place; a beat sounds its cues with a strength and pitch now, which any game can use. The rules, the seeded faces and the keys are unchanged.

## Shut the box, thrown by hand (26 September 2026)

The throw in Shut the box is now physical. A die flicked across the felt sends both dice the way and
as hard as the hand went, turned into a launch by `engine/motion/aim.ts`; they fly, knock off the
box's walls and each other, and tumble to rest, rolling over their edges as they go, with a knock
heard on each wall and a hard throw jolting the box. A die let go without a flick, a tap and the keys
throw them from where they lie towards the far end of the felt. Shutting numbers is unchanged: a
settled die is dragged or tapped onto a number, and the game keeps its turn shell, so the prover
still walks every level and the tray is still every move as a button.

What the dice show is not the simulation's to say. The mechanic's throw is decided first, from the
level's seed and the box as it stands, exactly as before, and `engine/motion/tumble.ts` simulates the
dice as bodies with no gravity and bends each path towards where the mechanic lands them and how they
lie, a little at the start and wholly by the end. So every throw looks different while the odds are
the ones `odds` in `shut.ts` proves, and taking a move back and throwing again still gives the same
dice. We chose this over reading the faces off the simulation, which would have needed its own
evidence that each face comes up a sixth of the time on every device and would have broken the
reproducible throws a replay depends on. No rules or configurations changed, so the rules version for
Shut the box is unchanged and its generated arrangements still open.

`school/games/__tests__/shut-throw.test.ts` shuts every level with moves a hand plays, checks that
every beat starts on the board before its move (or in the hand) and ends exactly on the board after,
that four different flicks fly four ways and all turn up the mechanic's faces, that a hard flick is
heard on the walls and jolts the box, and that the same throw tumbles the same way. The shut the box
case in `tools/e2e/games/physical-games.e2e.ts` flicks a die in the app and waits for the dice to rest.

## The keys as they were, beside easier on-screen play (30 September 2026)

The owner found the day's first reworks too primitive, and then put the problem precisely: the games' keyboard controls were good, and what was hard to use was the play on screen, touching or clicking the field and the buttons under it. So each game now has two layers. The keys are the ones in git before the reworks, unchanged, and the on-screen play is the easy direct touch the reworks brought, with the buttons that mirror the keys kept under the field.

- Firefly trail. The keys fly it as they did: pressing a key takes it off the hover and it keeps flying along its heading, left and right turn it, up or a held space hurries it and down slows it, at the speed it used to fly by the keys. A tap on a seed or a held finger takes over and the firefly flies there on its own. The comma and full stop ring from the morning is gone, since it was a new scheme, and the bar is back to Turn left, Turn right and Faster.
- Shunting yard. Up and down set the points, left and right set the push, space pushes at once and Backspace sends a wagon back, as before. The morning's wind-up on a held space is gone. The buttons for these are back under the yard, and a gauge over the front wagon shows the push the keys have set whenever a push is ready.
- The number machine. The roll the old keys set is gone with the track, so its keys could not come back as they were; the new keys keep their shape, left and right to choose and space to act, and the buttons Ball before, Ball after and Drop are back under the machine so a switch can play.

## Firefly trail, the bead string rebuilt (26 September 2026)

The bead string (`school/games/snake.ts`, still `?g=snake`) was a snake on squared paper that stepped
a square at a time, and the owner found it and the other plain games dull for their core, not their
details, so it was rebuilt rather than adjusted. It is now Firefly trail. A firefly flies a night
garden seen from the side and never stops: a finger held on the field is where it flies towards,
turning no faster than a firefly can, and the arrow keys turn it while the big button speeds it up.
Numbered seeds glow in the garden. Only the next number in the count joins the trail, and the trail
then grows by the count's step, one glowing bead for each one counted and a colour for each step, so
the trail is always as long as the count and a length of it reads in steps. A seed that is not next
is nudged away and floats back; the one wanted pulses, and an arrow at the edge of the view points
to it when it is out of sight.

The garden is a place to fly through. Nettles and frogs that snap at a low trail knock the last beads
off, and on the last level so does flying through the trail itself; the beads scatter and float down
to a height above the hazards, so they can always be flown through and picked up again, and the level
is finished only when every seed is caught and every bead is back on the string. Spiders' webs slow
the firefly, gusts of wind push it, and hedges turn it back. On the windy hill the count goes
backwards: the trail starts forty beads long and each seed takes four off. The six levels are
twos to 20 (grade 1), fives by the nettles to 40 (grades 1 to 2), tens over a pond with frogs to 60
(grade 2), threes in a hedge maze with webs to 30 (grades 2 to 3), back in fours from 40 on the windy
hill (grade 3), and sixes to 60 at midnight with drifting seeds and a trail that must not tangle
(grade 4). Layouts shuffle which number glows at which spot. Three drawings joined the shelf:
`glowbead`, `nettle` and `frog`.

The tests in `school/games/__tests__/snake.test.ts` fly every level in three layouts to the end by a
held finger and by the keys (a route-finding pilot in `firefly-pilot.ts` that goes round the hedges,
nettles, webs and frogs and picks fallen beads up first), check that a seed joins only in order, that
a nettle's beads are picked up again, that random flying for a minute finishes nothing, that a replay
is the same flight and that a reduced-motion press is its own steps. `tools/e2e/games/firefly-trail.e2e.ts`
plays the first level in the app.

## Firefly trail: tap to fly (30 September 2026)

The owner loved the idea and the look and found the flying clunky: the firefly never stopped, a held finger turned it no faster than a firefly can, and the arrows turned it while a big button sped it up, so a child fought the steering instead of choosing the next number. The number is the whole question, so choosing it is now the whole input. A tap on a seed sends the firefly to it on a curve, and its way goes round the hedges, the nettle beds and the webs by itself; a finger held on the field is followed closely and straight, for a child who wants to fly it. Left alone, the firefly hovers where it is and bobs. A tap on a seed that is not next flies there and the seed shies away with "not yet", once, and it costs nothing. Fallen beads are fetched by the firefly on its own once it has hovered a moment, so a knock costs a little flying and nothing else, as before.

What still asks for care is timing and order rather than steering: the frogs snap at a trail that passes low near them, so a tap is better made once a frog has hopped away; the wind still drifts the firefly on its way; and on the last level a way that doubles back through the trail still tangles it. With the keys, left and right move a ring from seed to seed in the order they stand, from left to right and round from the end, and space or the Fly button flies to the ringed seed; after a catch the ring moves to the seed that stood after it, so the keys carry on from where the count is. Those three are the only controls, kept for keyboards and switches; a finger needs none of them. Under reduced motion one press is a whole flight, drawn where it ends.

A random tapper is held by the taps a child who knows the count needs: tapping seeds at random, with as many taps as the level has seeds and two more, finishes at most one level in five. Every level and stored layout is still played to the end, by taps and by the keys, in node. The rules version is `-firefly-2`.

## Gone fishing, rebuilt (26 September 2026)

Gone fishing (`school/games/fishing.ts`, still `?g=fish`) was rebuilt from the start, because the old
game was a cast followed by a wait for whichever fish reached the hook first, with nothing to judge
after the cast. Charlie fishes from a jetty with a scale beside her, and the fish below carry their
weights on their tags, lighter ones near the top and heavier ones deeper. A pull back from the float
and a let go casts it through the shared aim (`engine/motion/aim.ts`) with a dotted start of the
throw, and it flies on a line that hangs and pulls like a line, a chain of points stepped by
`engine/motion/line.ts`. A finger held in the water, or the up and down keys, sets how deep the hook
goes. A fish notices a still bait near its own depth and not too far across, one at a time, so the
depth chooses the fish: a curious one comes from further off, a quick one bites fast, and a shy one
waits for a still float and is put off by a splash or a moving hook. It nibbles, and the float bobs;
then it bites, and the float goes under. A strike then hooks it; too soon scares it off and too late
lets it go, and nothing but the fish is lost. A hooked fish runs now and then. Reeling brings it in
and pulls the line tighter, the rod bending to show how tight, and a line held tight through a run
snaps and the fish swims off; letting go, or easing, lets it run. Reeled hard through a bed of weed
(`pondweed`, new on the shelf), the hook snags until it is eased free. A landed fish swings onto the
scale, whose pan takes a few, and the round is won when the needle reads the weight marked on the
dial exactly. A fish on the pan can be pressed, or Backspace used, to throw it back.

The six levels keep the old weights (two that make ten, three that make twenty, a kilogram in grams,
two and a half kilograms, fifty, and a kilogram and a half) at two spots, a sea with coral and a lake
with reeds, with weed beds added from the second level on. The state is plain data, with the seeded
generator's state in it, so the same hands catch the same fish and a stored day is only data.
`fish-challenges.ts` gives each level three other days, another seed and another weight to make, and
replaces the old entry in `remaining-challenges.ts`; the rules version for `fish` moved to its own
line. `engine/motion/reel.ts`, which only the old game used, was removed. The tests in
`school/games/__tests__/fishing.test.ts` fish every level and every day to its weight by hand and
every level by the keys, and check one fish at a time at the bait, the strike, the snap, the snag,
throwing back, random hands (at most one win in five), the same hands giving the same catch and
reduced motion; `tools/e2e/games/gone-fishing.e2e.ts` casts, waits for the bite and strikes in the app.


## Gone fishing: easier on the glass (30 September 2026)

The owner could not work out how to bring a caught fish in, and the keys were fine, so the keys and the
big button play as they did and only the glass changes. A tap on a fish casts to it: the float drops a
little ahead of it with the hook at its depth, that fish alone comes to the bait, and it is ringed until
it bites. A fish tapped to that is startled comes back once it settles, and one whose bite is missed
nibbles again, twice, before it swims off. The bite is plain: the float goes under and a large "!"
stands over it, and a press anywhere on the glass hooks the fish, so the hook no longer needs a tap on
the float. A finger held down then reels gently and stops by itself while the fish runs, so a line
reeled by a finger never snaps; the keys still reel hard and ease with down, as before. The float is
still pulled back to cast anywhere, for a child who wants to aim. The big button's word follows what a
press does (Cast, Wait, Hook!, Reel), and the ease button is the word Ease off where it was a drawing
that read as pause. A strike before the bite now costs nothing but a sentence, since the button reads
Wait until then, and the bite waits 1.2 seconds rather than 0.75. The first level, and every level
until a fish is caught, says what to do next by the float. The rules version is `-fishing-3`.

## Gone fishing: the cast's dots (2 October 2026)

The owner found the pulled cast's dots did not work as they do in the slingshot and the golf. They showed only the first third of a second of the throw, from a closed form that did not match the float, which is stepped a frame at a time, so they stopped in the air and never said where the float would land, and a pull too short to cast still drew them. The float's flight and the preview now take the same step (`flyStep`), so `castPath` walks the whole throw to the water and the dots end in a ring exactly where the float comes down. The dots are spaced evenly along the path, fade in its last part, and show only once the pull is past the dead zone; a shorter pull draws nothing and lets go quietly. The rod can now be grabbed at its tip as well as at the float, and it bends a little as the cast is drawn back. The keys and the tap on a fish are unchanged, and no rule changed, so the rules version stays.

## Gone fishing: one tap a fish (1 October 2026)

Removed on 2 October 2026; see "Gone fishing: cast by pulling, hook by a tap, reel by holding" below.
The section is kept as a record of what was tried.

The owner still found the glass hard to follow: the bar read Wait and Ease off, words that do not say
what to press, and a catch was five steps. A fish tapped to is now caught in one gesture. The float goes
out on a flat lob, the fish swims straight to the bait, nibbles once and bites, and on the first two
levels it hooks itself a fifth of a second after the float goes under; from the third level a press
anywhere on the bite hooks it, which keeps one moment of timing. A hooked fish that was tapped to is
reeled straight in, at two and a half times the keys' pace, without running or snagging, and swings up
onto the scale at twice the fall. From the tap to the scale takes 2.9 to 3.6 seconds on every level.
The bar holds one round button whose drawing follows what a press does (a cast arrow, a hook, a reel),
with the word as its name, and Undo; the ease button is gone from the glass, since the down key still
eases. A fish has a wider hit area, and a resting mouse rings the fish it is over, through a new `hover`
point on the Pad that a tape never records. The keys and the pulled cast play exactly as before. The
rules version is `-fishing-4`.


## Gone fishing: cast by pulling, hook by a tap, reel by holding (2 October 2026)

The owner found that tapping a fish to catch it interrupted free play: the game chose the fish, cast
for the child, and on the first levels hooked and reeled it by itself, so there was little left to do
and a tap meant for something else could start a cast. Tap-a-fish is removed with everything that
served it: a tap on a fish does nothing, there is no chosen fish and no ring round it, no fish hooks
itself, there is no fast reel for a tapped fish, and the Pad's `hover` point, which only rang the fish
under a resting mouse, is gone from the engine.

On the screen a catch is now the same three moves the keys make, each made directly. A cast is the
pulled cast with its dots: pull back from the rod's tip or the float, watch the ring land where the
float will come down, and let go. Any fish near the bait may come to it, so the child chooses a fish by
where and how deep they cast. When the float goes under, the "!" stands over it and a tap anywhere on
the water, or the big button, hooks the fish. A missed bite is not lost for any fish now: it nibbles
again twice before it swims off, so the window is generous without being automatic. Holding a finger
on the field, or the big button, reels the fish in. A finger reels only while the fish rests, so it
reels 1.6 times the keys' speed to make a catch by hand take about as long as one by the keys, and a
line reeled by a finger still never snaps. The keys are unchanged. The first level's hints by the
float read "Pull back and let go", "Wait for a bite", "Tap now" and "Hold to reel it in". The rules
version is `-fishing-5`.
## Marble workshop, rebuilt as a marble run (26 September 2026)

The marble workshop (`school/games/marble.ts`, `?g=marble-workshop`) is no longer three ramps nudged
towards one tray. Hoppers along the top each drop a numbered batch of marbles, cups on the floor each
want a number of marbles, and the child builds the run between them from a parts tray: short, middle
and long ramps, a springy bouncer, a funnel and a see-saw that tips under a pile of marbles. A part is
dragged anywhere on the bench and turned by an end, by any angle, with a gentle pull to the nearest
15 degrees within 3; with the keys, N chooses a part, the arrows move it half a square and Q and E
turn it 5 degrees. A faint path shows where one marble from each hopper would go through the machine
as it stands, recomputed as a part moves, so a child aims by it and gets better at reading it. Go
drops every marble, and planck decides the rest: marbles knock each other, bounce, pile up and tip
the see-saw, and each cup counts as it fills, with a ring and sparkles when it reaches its number. A
run that misses shows what each cup got and returns to the machine as it was built.

The mathematics is in the numbers. The first level is one hopper of 5 and a cup of 5 behind a block;
then a 5 and a 3 into a cup of 8; which two of 6, 4 and 3 make 10; 7 and 5 over a wall with the
bouncer; sharing 5, 3 and 8 into two cups of 8, where the middle hopper has to join the 5 and not
the 8; and 24 marbles into two cups of 12. Harbour cargo keeps
`workshops.ts` to itself, and the marble levels have no generated arrangements for now: the old ones
moved a tray the new levels do not have. The rules version is `games-1-marble-run-1`. The tests in
`school/games/__tests__/marble.test.ts` build a winning machine on every level through the child's
own controls, by hand and by the keys, check that random machines make the numbers at most one time in
five and an empty bench never, that a run repeats itself exactly, and that reduced motion judges a
run as the steps do; `tools/e2e/games/marble-workshop.e2e.ts` builds the first level with the keys and
drags and turns a part in the app. The parts are one shelf drawing, `marblerun`.

The tenth level, "A water run", has tanks in place of hoppers: they hold 5 and 3 litres and let the
water out as drops that run down the ramps like marbles, keep running, and pool in a cup read in
litres. The child builds the run so all the water arrives, and the cup wants 8. A cup counts as full
within half a litre, since a drop or two of a good run splashes wide however the run is built; the
reading still says what landed. The rules version for the workshop is now `-marble-run-3`.

## Down the river: steering with a finger (30 September 2026)

The owner found the canoe too hard to move by clicking or touching the field, while the arrow keys
felt good. The keys, the Paddle and Back water buttons and the stroke physics are unchanged. The old
touch gesture, a drag drawn back beside the canoe for a stroke on that side and a finger held still to
back water, asked a child to think like a paddler, and most spun the canoe. It is replaced by a helm:
a finger or the mouse held on the water is where the canoe goes. The canoe turns its bow towards the
finger no faster than 1.6 radians a second, paddles only while it faces roughly that way, eases up as
the bow comes within about a canoe's length and comes to rest there, and the paddle goes in on
alternate sides at the paddling beat with its splash and ring. Lifting the finger stops the paddling
and the canoe glides on the current. A faint line from the bow to a ring under the finger shows where
it is headed. At the pool the bow counts as well as the middle for being beside the bank, so a canoe
brought in bow first to the number rests there. The helm is `steer` in `engine/motion/canoe.ts`. The
drift-with-the-current idea from the brief was not needed for touch and would have changed the keys,
so it was left out. The rules version is `-river-3`.

## Down the river, Row to the jetty rebuilt (26 September 2026)

Row to the jetty was a boat on a straight line with one stroke button, and the owner found it plain:
the only decision was when to stop rowing. It is rebuilt from scratch as Down the river
(`school/games/row.ts`, the id `straight` kept). A canoe goes down a long winding river seen from
above, drawn from the new shelf drawings `riverreach`, `canoe`, `rivergate` and `boulder`. The river
runs faster where it narrows into rapids (chevrons on the water), slack water sits behind each rock,
and the canoe glides after every stroke and is carried by the water it is in. A stroke on one side
pushes it on and turns its bow away from that side, harder the longer the drag or the key is held,
and a stroke made too soon after the last pushes less, so paddling well has a rhythm. The physics is a
new pure module, `engine/motion/canoe.ts`; the oar stroke module the old game used is removed with it.
Rocks and logs drifting across the river (on paths from `mover.ts`) bump the canoe about and never end
the run, and a faint dotted line ahead of the canoe shows where it would drift with nothing done.

The mathematics is in where the targets are. Across the river stand pairs of gates with a number on
each, and the canoe has to pass through the one that comes next in a count: ones, twos, fives, tens,
threes, and 0.3 at a time at grade 4. A gate out of the count says which number it was and which
comes next, and the river carries the canoe back above it to try again, so nothing is lost. The count
ends at a wide pool with a line of posts along its bank, and the canoe has to come to rest against
the bank with its bow beside the number that comes next, which on the fourth level is read off a line
with only 0 and 100 written and on the sixth off a line in tenths. That last part is stopping on a
number line, so the game still plays the `race.stop-on-the-line` activity for a link that names it.

With a finger: drag back through the water beside the canoe to paddle on that side, drag forward to
back water, or hold a finger still in the water to hold the paddle back. With the keys: hold and let
go of up (or the big button) to paddle, left and right to turn, and hold down to back water, which
backs the canoe slowly once it has all but stopped. `action-challenges.ts` gives each level two more
stretches of river (the gates' sides mirrored or turned about, the bends shifted, the rocks moved
across), and the rules version for `straight` is now `river-1`. The tests in
`school/games/__tests__/row.test.ts` paddle every level and layout to a win with the keys alone and
with drags alone through a paddler in `river-pilot.ts` that uses only the Pad, check the strokes, the
rhythm, the gates' carry back, the rocks, the docking and reduced motion, and show random paddling
winning none of sixty runs; `tools/e2e/games/down-the-river.e2e.ts` paddles in the app.

## The road: how a stop ends (27 September 2026)

The owner found the finish did not feel good: the brake took speed off at one rate right down to nothing, so the car snapped to rest, a cruising car set off again as soon as the brake was let go, and a car nobody stopped ran into the end of the road and halted dead. Three changes answer it. The brake eases at low speed, taking off a third of its full rate at a standstill, so the car rolls onto its mark, and the ring that shows where a full brake would stop it is worked out with the same braking. A car braked to rest is parked: the cruise waits for go, so a stop stays where the child made it, and a stop in the wrong place is corrected by driving on or holding the brake to reverse. Past the end of the line the cruise lets go, and the car coasts to rest in the run-out instead of meeting the end of the road; it reaches the end only if go is held all the way there. The rules version is `-road-2`.

## The road, rebuilt as a delivery round (30 September 2026)

The owner found the finish off: the round was won by one perfect stop, and a car that missed ran on to the end of the road and was told to go back, which read as a rule about the end of the road rather than about the number. The control bar also read up, down, go and down again, since the brake carried the down arrow. The road is now the Delivery round brief below, kept in the road's own art: the same road from above, lanes, kerb number line, firs, houses, flowers and car.

A list pinned to the dashboard names the stops, as numbers or in words ("5 more than 10", "halfway to 70", "a quarter"), and a stop is delivered by bringing the car to rest with its nose in that number's bay: a parcel hops off the roof rack to the doorstep, the bay lights, the list ticks and the delivery is a checkpoint. A rest anywhere else leaves a chalk mark with the number the car stopped on and says how far the stop is, and on a list a rest in a later stop's bay says which comes first. The stops come in orders the road does not meet them in, so some are behind the car and reversing is part of the round, and two levels take the stops in any order, which makes the order a plan. The round ends by driving through a chequered finish line in the run-out past the end of the numbers, and the finish waits for the list, so there is no stop against the end of the road and no single stop that wins.

The car is held to drive, and lifting the hand brakes it over a distance that grows with its speed, at six tenths of the full brake, so when to lift is the question the line asks. The Brake button stops harder and, held at rest, reverses. On the levels with a rack, a hard stop above nine squares a second slides the front parcel off, past where the car comes to rest, and a stop at the next bay without a parcel says to go back for it; driving slowly over it puts it back. The eased brake and the coast into the run-out from "The road: how a stop ends" stay; the cruise and the parked car it described are gone, since lifting the hand now always brakes. The bar reads up and down for lanes, Go and Brake. Under reduced motion a press drives for half a second and the car then rolls to rest and its stop is read, so each press is a turn.

The bays are drawn on the levels whose kerb writes every tick, and on the levels with only the ends written a bay is drawn only once it is delivered, since a bay drawn in advance would answer the question. A ring shows where a lifted hand would stop the car on the first four levels. Levels: two doors, 4 then 8 on 0 to 10; three doors, 6, 13 and 18 on 0 to 20; back again, 5 more than 10, then 7, then 2 more than 10; in twos, 12, 28 and 20 on 0 to 40; in fives, 15, halfway to 70 and 25 on 0 to 50; in tens, 70, 30 and 50 in any order on 0 to 100; only the ends, 35, 80 and 15 in any order; quarters of the lane, a quarter, three quarters and a half on a lane from 0 to 1. Each level has three rounds among the challenges: numbers move along the line by a tick, and stops written in words come in another order.

New drawings: `parcel`, `finishline` and `deliverylist`. Sounds: a thump for a parcel on a doorstep, a squeal of brakes, a lift for a parcel picked up, a horn at the finish, and the engine as a hum that rises with speed. Held by (`school/games/__tests__/road.test.ts`, with a driver in `road-driver.ts` that uses only the Pad): every round of every level is delivered and its pads replay to the same road, a wrong stop leaves a chalk mark and says how far, a later stop on a list says which comes first, the finish waits for the list, a hard stop slides a parcel off and it can be picked up, a box slows the car and costs nothing else, random driving finishes a round at most four times in twenty, and the harder levels draw a bay only once it is delivered. `tools/e2e/games/the-road.e2e.ts` delivers the first stop by keys. The rules version is `-road-3`.

## Clear round, rebuilt as a show jumping round (27 September 2026)

The owner found Clear round stiff and not playful: a unicorn stepped along in beats on an empty field,
changing its stride by a whole square at each press, and a tap asked for a leap that always looked the
same. It is rebuilt (`school/games/clear.ts`, the id `clear` kept) around what real show jumping asks
of a rider, which is meeting each fence on a good stride and giving the horse the jump it needs. We
looked at show jumping itself, at horse riding games for children, and at runners with timed jumps
such as Alto and Canabalt. From the runners we took the continuous run and a jump whose strength is
held rather than tapped; from show jumping, the stride as the thing a rider changes and the poles that
fall.

A pony canters on its own at one hoof print every half a second, drawn from the new `pony` on the
shelf through the actor in `engine/motion/actor.ts`, with three canter poses a stride, a gather before
the leap, a squash on landing and a stop that slides. Left and right choose the stride, two, three or
four squares, which starts at the next hoof fall and is also how fast the pony goes. Holding Jump, or
a finger anywhere on the field, gathers the pony by degrees over nine tenths of a second; letting go
asks for the leap, and the pony takes off from its next hoof print. The leap is a thrown arc: its
height comes from the gather and its length from the stride, and a faster pony jumps flatter, so a
long stride buys length with height. The poles are bodies resting in cups: a hoof that brushes one
rattles it, and one that goes through it throws it out of its cups, which is a fault. A pony ridden
into a fence without a leap asked stops short, canters back and comes again, at no cost, and every
clean fence is a checkpoint, so Back to the checkpoint returns the pony to just past the last one.

The mathematics is in counting the strides. The hoof prints ahead are drawn on the grass and the take
off band before the next fence is shaded, and the question at every line is which stride puts a print
in the band and which print to let go on. The first level has one stride and three low fences, with the
prints numbered and the leap's arc drawn from the next print; the second asks for the stride to be
chosen; the third brings a spread, which needs a longer leap, and a double with one stride between,
where there is only time to gather half way; the fourth has a water jump five squares across, which
only a long stride and a big gather carry, and writes the squares from each fence to the next on the
grass; and the fifth draws only the next two prints, with no band and no arc. The course is dressed as a show ground, with stands full of
people, bunting, numbered fences with a red and a white flag, and a scoreboard of fences and faults.

`clear-challenges.ts` searches the hoof falls for a clear round, choosing a stride at each fall or a
leap with a gather there was time to hold, and a course is shipped only once one is found; every level
has three layouts, with a fence or two moved a square. The rules version for `clear` is now
`show-jumping-2`. The tests in `school/games/__tests__/clear.test.ts` ride every layout clean through
the game itself with a rider in `clear-rider.ts` that uses only the Pad, replay a round from its tape,
check that past the first level some layout cannot be ridden at one stride, and cover a knocked pole, a
stop, a hoof in the water, the stride keys, the gather and reduced motion, where each press rides one
stride. `tools/e2e/games/clear-round.e2e.ts` leaps the pony with the keys and with a held pointer, and
changes the stride.


## Clear round: easy on the screen, the keys as before (30 September 2026)

Children liked the show ground and the pony and found the jumping hard: on the screen a clean leap
needed three things at once, a stride chosen with the arrows, a gather held for the right time and a
let-go on exactly the right print. The owner asked for the keyboard to stay exactly as it was, since
the keys were good, and for the screen to become easy.

With the keys nothing changes: left and right choose the stride, holding space gathers the pony by
degrees, and letting go leaps it from its next hoof print with that gather, a tap of space being a
small hop. The game tells the keyboard's space bar from the Jump button on the screen by a new
optional `keys` flag on the Pad, which `engine/ui/game-play.ts` sets while space is held.

On the screen the pony rides itself. The first tap on the field, or on Jump, lets it see its own
stride into each fence from then on, the way a rider sees a stride: from each landing it chooses the
stride nearest its own, and a first stride a little shorter or longer where it must, so that a print
two to four ahead lands well inside the take-off band, and that print is ringed. A tap asks for the
leap, and the pony leaps from a print where some gather carries the fence, choosing the least that
does, so the height of the jump is never the child's to judge on the screen. A tap one print early
waits for the ringed print. The arrows on the screen still choose a stride for the fence at hand, and
the pony then keeps it. The timing is the whole skill on the screen, and the counting stays in the
course: the prints are numbered on the first two levels, and the note says "Tap now." through the
stride before the ringed print. The page begins a round on its first input, so a tap on the screen in
the round's first tenth of a second only starts the pony; the keys start it as they always did.

Two eases help both ways of playing, and are kept gentle. A knocked pole or a hoof in the water no
longer ends a clear round: the poles go back in their cups and the pony goes round to jump that fence
again, and the scoreboard counts the knocks on the way. A tap well early, or past the band, still
leaps, so a mistimed tap is seen and costs only the time to go round. The camera leads a little
further ahead, so the fence is in sight a few strides before the band.

We did not make the screen's jump automatic, which would leave nothing to do, and we did not keep the
screen's held gather, which asked a young child to judge a length of time and a place at once.
`clear-challenges.ts` now ships a course only when both a steady tapper on the screen and the keys to
a planned ride carry it clean through the game itself; every layout of every level passes both. The
tests in `school/games/__tests__/clear.test.ts` ride every layout both ways, replay a keys round from
its tape, and check that random tapping (with random holds of either kind) jumps a whole round within a
quarter more time than a steady rider in at most four tries of twenty. `tools/e2e/games/clear-round.e2e.ts`
leaps the pony with space held, rides the first course clean with one tap on the field a fence (a
mouse on the desk, a touch on the phone), and checks the stride keys. The rules version for `clear` is
now `show-jumping-3`, and `moveTo` in `engine/motion/bodies.ts` takes an angle, so a knocked pole can be
set square in its cups again.
## Clear round: a kept tap and a take-off zone (2 October 2026)

The owner still found jumping on the screen clunky. A tap had to land in one stride before the ringed print, a tap well early leapt short and cost a circle, and a tap even a little late meant a refusal, because the take-off print the pony chose was often the last place it could leave from.

On the screen a tap is now kept. From one stride before the take-off zone on, a tap is remembered and the pony leaps from the ringed print by itself, with the least gather that carries the fence; a small tick over the pony shows the tap is kept. The zone is the last three prints before the fence on the first two levels and the last two after, drawn as a strip under the prints that lights up as the pony comes into it, with "take off" written under it. Coming into the zone the note says "Tap!" and the canter's beats ring a little brighter; the take-off says "Up!" and a clean fence "Clear!".

A tap past the take-off print leaps at once from where the pony is. On the first two levels the pony plans its approach so there is half a stride of grass after the ringed print, and a late leap there sails over with no pole knocked, so a mistimed tap never costs a circle. From the third level a late leap is flown as it is, and a pole it brings down means going round again.

The brief asked for taps before the zone to be remembered for the next fence as well. We kept a tap only from a stride before the zone, and a tap in the air asks nothing: with every tap kept, a child tapping at random cleared the first course five times in twenty, and the game must not be won by tapping without looking. The keys are unchanged: left and right choose the stride, holding space gathers, and letting go leaps from the next print, so the band where some gather carries the fence is still drawn for a player using the keys. Enter, which the page already sends as a tap, rides the zone the way a finger does. Reduced motion is unchanged: a press rides a stride, and a leap settles before the next press. The rules version is `show-jumping-4`.

## Shared sizing (24 September 2026)

The tabletop stage uses the full available row; it no longer has a 1,100px desktop cap.
Both turn and action renderers scale to the available width and height without fixed 34/40px
square-size ceilings. Art remains proportional and controls remain outside the play surface.
Tall authored boards can still be height-limited on landscape screens; filling those side areas
with interactive content requires a responsive scene layout, rather than stretching the drawings.

## Production player and variations (23 September 2026)

Entry UX, updated 24 September: a game card opens its arena directly, using the last selected phase
for that game (or its first phase). Explicit `?g=...&v=...` links override that preference. Phase and
arrangement memory are per game, within the parent-practice storage namespace. Moving simulations
wait for their first deliberate keyboard, pointer, touch or control input; opening a card or
opening/closing help never starts motion or active-time accounting. Retry, a new arrangement and
phase changes return to that ready state. Pause remains available during play and on focus loss.
The optional pause menu contains expandable **Choose a challenge** cards using existing phase
names, plus How to play and Sound & accessibility. There is no entry modal or numbered dropdown.


The shared player receives feedback from both turn and action runtimes. During play, a compact
cream note uses that game's catalogue artwork; on completion the authored result moves beside
Play another. One live status region announces updates. Long in-play notes wrap to two lines,
with the full message available as the note's title and through the status region. On phones the
note sits below the compact title row. No completion modal interrupts the field.

The game view's squared paper fills its viewport independently of finite world bounds. Grid spacing
and offset track the same zoom and translation as the world, including camera shake; sprites,
collisions and pointer coordinates are unchanged. This also covers zoomed-out or off-centre views.

The production catalogue is `school/games/catalogue.ts`, opened through `/games` and the shared
`engine/ui/games.tsx` player. The older design notes below retain historical scratchpad paths; the
production player and generated challenges do not import the scratchpad.

`school/games/challenges.ts` owns versioned concrete descriptors, deterministic seeded selection,
configuration fingerprints, bounded recent-arrangement avoidance and authored fallback adapters.
Per-family `*-challenges.ts` modules own finite certified recipe pools, validators and opening the
existing game from a configuration. No physics search runs in the browser. `Try again` reuses the
configuration; `Play another` selects within the same named phase. Small pools eventually repeat.
Old rules or changed authored initial data are rejected by the opening adapter.

Discrete pool tests exhaust their position graphs; action tests replay complete winning inputs,
including the evolving Slingshot world and workshop controls. These sampled physics witnesses are
not mathematical guarantees for every timing or device. See [game-variations-plan.md](game-variations-plan.md)
for inventory, evidence, release checks and limits.

`GameChallenge` and `GameAttempt` in `engine/answer.ts` are bounded wire contracts. The parent Games
page is unassigned practice, with no child selector, progress report or advancement recommendation.
It ignores old cached child selections and only flushes already-owned pending attempts. The shared
player retains its injectable `onAttempt` callback for a future explicitly child-bound entry. The
`game-attempted` event uses existing authenticated sync with family/user binding and idempotent
attempt IDs. `engine/ui/game-recording.ts` keeps a recoverable, bounded device outbox. Reloaded
selection is scoped to family, user and child. Child access remains gated.

`school/games/progress.ts` projects factual completion and distinct-configuration counts. The currently undisplayed recommendation model requires three distinct, unassisted generated configurations in the most recent
five eligible attempts at the current versions and band. Neither summaries nor recommendations are rendered in the app yet. Initial difficulty ratings describe tasks,
not measured ability or mastery; no automatic phase changes occur.


Status: proposed, September 2026. It is the second document about activities and it does not replace the first. [activities.md](activities.md) owns the model: what a mechanic declares, what an activity declares, what the prover proves, and the promise we make to a parent. This one is a designed set of games to build on top of that model, chosen to spend the art catalogue and to climb from grade one to grade four. Twenty five games, eighteen of them on mechanics we already have and seven on new ones, and no new drawing in any of them.

It asks for four things the model does not have, all of them named in their own sections at the end and none of them large: one change to the contract in `scratchpad/src/play/types.ts`, so that a mechanic's board drawings come from a slot an activity fills rather than from a constant in its code; two additions to the prover; and five settings on drawings that already exist. The contract change turned out to matter more than any single game in the set, which is not how we expected this to come out.

Everything below was written after playing what exists. Six activities on five mechanics are in the page today; every version of each was driven to a win, the balance, the number line and the yard were played move by move with the text form on and moves taken back on the way, and the figures quoted for any of them come from the prover run in the page rather than from this document's guesses. Four more mechanics are being written while this was drafted, so the set avoids them and says where it would otherwise have collided.

## The games on the Games tab

This section lists what is built, and it is kept up to date; the rest of the document is the design it was written as. Every game is on one engine and in one Games tab, `scratchpad/play.html`, grouped by how it plays: puzzles, where the question is what to do next and the moves are a tray of buttons; hands-on games, where the same kind of mechanic has real controls on the board; and action games, which move by themselves. [engine.md](engine.md) says what the engine is and why each game is in its group. The figures are the prover's own for each level, and every level of every puzzle and hands-on game keeps the promise. An action game has no position graph, and is held to named invariants and a seeded replay in `scratchpad/test/games.test.ts`.

| Game (`?g=`) | Group | Mechanic | Levels, with their grades, positions and shortest win |
|---|---|---|---|
| Spell the picture (`spell`) | puzzle | `spell` | 1 three sounds, grades 1 to 2, 259 positions, 3 moves; 2 three sounds, four letters, 1 to 2, 259, 3; 3 four sounds, 1 to 2, 1555, 4; 4 four sounds, and a choice, 1 to 2, 1555, 4 |
| The number machine (`rule`) | action | none | 1 the adding machine, grade 3; 2 the doubling machine, 3; 3 a mixed-up tray, 3 to 4; 4 no 1 ball, 4; 5 two machines, 4; 6 mixed up, and no 3, 4 (see "The number machine: a tap, not a roll (30 September 2026)") |
| See-saw (`weigh`) | action, off the list | none | 1 seven kilograms, grade 1; 2 ten, in two bags, 1 to 2; 3 both sides, 2; 4 further out, 3; 5 two to balance, 3 to 4; 6 either side, any step, 4 (see "Built since: one direction for every game") |
| Rabbit crossing (`jump`) | action | `jump` | 1 0 to 20, land on 13, grades 1 to 2; 2 -10 to 10, land on -4, 3 to 4; 3 stones that sink, 2 to 3; 4 only some numbers written, 3 to 4; 5 back past nought, grade 4; 6 tens to a hundred, 3 to 4 (see "Land on the number, rebuilt as Rabbit crossing") |
| Penny shove (`pay`) | action | none | 1 ten cents, grade 1; 2 twenty-five cents in three coins, 1 to 2; 3 65 cents in four coins, 1 to 2; 4 change from a dollar, 2 to 3; 5 99 cents, 2 to 3; 6 $1.87 in seven pieces, 3 to 4 |
| Down the river (`straight`) | action | `race` | 1 count to five, grade 1; 2 count in twos, 1 to 2; 3 count in fives, 2; 4 tens, and only the ends written, 2 to 3; 5 count in threes, 3; 6 counting in tenths, 4 (see "Down the river, Row to the jetty rebuilt (26 September 2026)") |
| Shunting yard (`shunt`) | action | `shunt` | 1 two sidings, adding to 5 and 4, grades 1 to 2; 2 make ten, 1 to 2; 3 one carriage out of place, 1 to 3; 4 standing backwards, 1 to 3; 5 four jumbled, 2 to 3; 6 three sidings, one uphill, 2 to 4 (see "Shunting yard, rebuilt as a hump yard" and "Shunting yard: the yard worked by hand") |
| Cut the cake (`share`) | action, off the list | none | 1 two, grades 1 to 2; 2 three, 2; 3 four, 2 to 3; 4 a quarter has gone, 3; 5 six, 3 to 4; 6 the same as Ann's, 4 |
| Measure it out (`pour`) | action, tipped by hand (see "Measure it out, poured by hand") | `pour` | 1 500 and 300, measure 200, grades 2 to 3, 14 positions, 2 moves; 2 500 and 300, measure 100, 2 to 4, 14, 4; 3 5 and 3, measure 4, 3 to 4, 16, 6; 4 7 and 3, measure 5, 3 to 4, 20, 8; 5 900 and 400, measure 600, 3 to 4, 26, 8; 6 1 litre and 300, measure 100, grade 4, 24, 6 |
| Firefly trail (`snake`) | action | none | 1 count in twos, grade 1; 2 fives by the nettles, 1 to 2; 3 tens over the pond, 2; 4 threes in the hedge maze, 2 to 3; 5 back in fours on the windy hill, 3; 6 sixes at midnight, 4 (see "Firefly trail, the bead string rebuilt" and "Firefly trail: tap to fly") |
| The road (`road`) | action | none | 1 two doors, grade 1; 2 three doors, 1 to 2; 3 back again, 1 to 2; 4 in twos, 2; 5 in fives, 2 to 3; 6 in tens, any order, 2 to 3; 7 only the ends, 3 to 4; 8 quarters of the lane, 3 to 4 (see "The road, rebuilt as a delivery round") |
| Slingshot (`sling`) | action | none | 1 three stars, grades 1 to 2; 2 over the wall, grades 3 to 4 |
| Shut the box (`shut`) | hands on, a drag | `shut` | two dice: 1 up to 6, grade 1; 2 up to 8, 1 to 2; 3 up to 9, add or times, 2 to 3; 4 up to 9, three ways, 3 to 4; 5 up to 10, three ways, grade 4 (see "Built since: shut the box") |
| Rafts (`herd`) | action | none | 1 five on the raft, grade 1; 2 seven and three, 1 to 2; 3 the same on each, 2 to 3; 4 four to a raft, 3 to 4; 5 five, three and two, 1 to 2; 6 sixes from twenty, 3 to 4 (see "Sheepdog, rebuilt as Rafts") |
| Gone fishing (`fish`) | action | none | 1 two that make ten, grade 1; 2 three that make twenty, 1 to 2; 3 one kilogram, 2 to 3; 4 two and a half kilograms, 3 to 4; 5 three that make fifty, 2 to 3; 6 a kilogram and a half, 3 to 4 (see "Gone fishing, rebuilt (26 September 2026)") |
| Paper plane (`plane`) | action | none | 1 up to ten, grade 1; 2 tens to a hundred, grade 2; 3 halves, quarters and eighths, grade 3; 4 tenths, grade 4 |
| Charlie's rope swings (`bridge`) | action | none | 1 over the stream, grade 1; 2 land on 4, 1; 3 stones in twos, 1 to 2; 4 rope to rope, 2; 5 the ravine, in metres, 2 to 3; 6 up to the tree house, 2 to 3; 7 a windy day, 2 to 4; 8 three jumps to 12, 3 to 4 (see "Charlie's rope swings (27 September 2026)" and its controls, rebuilt) |
| Fetch with the pups (`blocks`) | action | each level's numbers moved along the path | 1 the open meadow, grades 1 to 2; 2 across the pond, 1 to 2; 3 up the hill, 2 to 3; 4 the playground, 2 to 3; 5 a windy day, 3 to 4; 6 the snowy park, 3 to 4 (see "Fetch with the pups") |
| Charlie's lemonade stand (`wardrobe`) | action | none | 1 a sunny park, halves, grade 1; 2 quarters of a cup, 1 to 2; 3 change, please, 2; 4 a windy day, 2 to 3; 5 the long counter, 3; 6 the busy fair, 3 to 4 (see "Charlie's lemonade stand (27 September 2026)") |
| Pocket pool (`pool`) | action | none | 1 pot ten, grades 1 to 3; 2 ten in two shots, 1 to 3; 3 round the corner, 2 to 4; 4 the bumpers, 2 to 4; 5 evens only, 2 to 4; 6 soft cloth and a slope, 3 to 4; 7 the spinner, 3 to 4; 8 the kitchen table, 3 to 4 (see "Pocket pool (27 September 2026)") |
| Curling on the pond (`curling`) | action | none | 1 slide to the house, grades 1 to 2; 2 hit the button, 1 to 2; 3 make exactly 6, 1 to 3; 4 round the guard, 2 to 3; 5 takeout, 2 to 3; 6 closer than, 2 to 4; 7 a windy afternoon, 3 to 4; 8 a full end, 3 to 4; 9 exactly 10 on bumpy ice, 3 to 4; 10 the village bonspiel, 3 to 4 (see "Curling on the pond (4 October 2026)") |
| Charlie's garden (`garden`) | action | the array, the litres, the total and baskets, or the customers | 1 a bed by the cottage, grade 1; 2 rows of lettuces, 1 to 2; 3 the vegetable patch, 2; 4 a rainy spring, 2; 5 the greenhouse, 2 to 3; 6 a hilly garden, 3; 7 snail summer, 3; 8 the harvest fair, 3 to 4; 9 your own garden, 1 to 4 (see "Charlie's garden (4 October 2026)") |
| Rescue pups (`rescue`) | action | none | 1 fire at the cottage, grades 1 to 2; 2 the lamb on the cliff, 1 to 2; 3 rocks on the road, 1 to 3; 4 swimmer in the river, 1 to 3; 5 the barn and the wind, 2 to 4; 6 two on the cliff, 2 to 4; 7 clear the road, then the fire, 2 to 4; 8 rescue at the river, 3 to 4 (see "Rescue pups (28 September 2026)") |

The race activity that is left, Stop on the line, is played by Down the river. Take the corner was retired in September 2026, and its idea, choosing a speed before a corner, became Pocket rally's fourth level; an old `?g=race` address opens Pocket rally. Find the rule's activity was retired with its turn game, since the number machine carries the same idea as an action game. The yard adds two levels of its own in the same way. A test checks that every version of every activity is a level of some game, so none was dropped when the tabs became one.

Adding a game is one entry in `GAMES` in `scratchpad/src/play/games.ts`, in the shape declared in `scratchpad/src/play/game.ts`: an id, a title, a group, a hint and its levels. The picker groups the list by each game's group and shows every level, and the page runs a game by its group.

## What is already taken

The set has to be additive, so it is worth listing what is not available to it.

Built and played: `weigh`, `jump`, `rule`, `race` and `shunt`. In flight as this is written: `pour`, `pay`, `share` and `spell`, which take the count to nine mechanics and ten activities. Designed in [activities.md](activities.md) and not built: `stack` the number pyramid, `spin` the fair spinner, `sort` into hoops, and `build` covering an outline, which waits for parts to have a geometry. Nothing in this document proposes any of those, and where a game of ours is near one we say so rather than letting the reader find out.

That leaves the mathematics of place value and exchange, area and perimeter, elapsed time, the mean, turning effect, symmetry and factorisation without a game, and it leaves grades three and four much thinner than grades one and two. The nine mechanics in flight are weighted towards the younger end: eight of the nine have a version at grade one or two, and `rule` is the only one that starts later. So this set is deliberately weighted the other way.

## The bar a game has to clear

Three tests, and the first is the one from [activities.md](activities.md) that decides everything else.

The move has to be the mathematics. Take the drawing away, put a text box in its place, and ask whether the activity still exists. A balance does not survive that and a timed ten frame does. Every game below is written with the move stated in the mechanic's own terms so this test can be applied to it rather than taken on trust.

The mathematics has to be what the child is learning now. A game that teaches something a child meets two years later is a bad game however good it looks, so every entry carries a grade band drawn from [curriculum.md](curriculum.md) and [tracks.md](tracks.md), and the harder versions climb inside that band rather than across it.

The pieces have to exist. A game whose drawings we cannot name is not designed, so every entry names its drawings by the id the renderer uses. Where a drawing needs a change, the change is named and priced, and the list of them is short on purpose.

## What the catalogue turned out to be

The instruction was to treat the shelf as a box of game pieces, and going through it that way changes what "better visuals" means here. It does not mean more drawings. There are around two hundred and forty of them, roughly two hundred and seventeen on the shelf and twenty two written but not yet indexed, and the set below spends about ninety without asking for one more. What it means instead is five composition devices, four of which the interface already has and one of which is the reason the newest game looks better than the oldest.

Several parts on one sheet of squares. `Board.parts` takes an `at` in squares and `Board.size` gives them a sheet to share, so a track can be one part and the car on it another. The circuit board puts down a track, a car, a scoreboard, a group of minibeasts in the infield and three birds on a wire, and it reads as a place. The balance board puts down one drawing on an empty sheet, and it reads as a diagram. That difference is entirely composition and it cost the race mechanic nothing that the weigh mechanic could not also have.

A key, so a piece travels. `BoardPart.key` means two positions that name a part with the same key are showing the same thing in two places, so the page moves the drawing it already has. This is the whole of our animation budget and it is free: a carriage slides into a siding rather than appearing in it, and `prefers-reduced-motion` turns the movement off without losing any information, because the position is also in the drawing.

A landmark that carries information. The race mechanic's `around` slot places a drawing beside a named cell, and the text form then says the car is passing the birds on the wire. A podium at the corner is something to steer by rather than decoration. This is the cheapest way to make a board look drawn rather than generated, and it is the device most worth copying into other mechanics.

A readout drawn as a part. The scoreboard on the circuit says the speed and the turns taken in large digits. It is not a score, it accumulates nothing across rounds, and it tells the child only what the board already tells them, which is why it is allowed under the rule in [product.md](product.md) against points. It is also the part that makes a number-heavy position legible without any text.

Marks on a drawing's own anchors. `BoardPart.marks` lays a tick, a loop or a star at an anchor the drawing returned, so a board can point at a place without a cursor. It is how a mechanic with a pointer, and two of ours have one, shows where the pointer is in ink rather than in CSS.

Two smaller things worth knowing. Every hand-drawn piece has a `flip` setting, so a piece can face the way it is going, and the imported settings each keep a clear surface with named anchors, which is what makes a shop front or a birthday table something to stand pieces on rather than a backdrop to put them in front of. Four of the nine settings become boards in this set and five stay scenery, and that is a real limit we come back to in the judgement.

### The cheapest visual change in the whole document

It is not a game. The `weigh` and `jump` boards are one drawing each on a sheet with nothing else on it, and both would look like the circuit for the price of an `around` slot and a setting naming a place to stand in: the balance on the market stall with a basket beside it, the number line along the bottom of the hills with the path running over them. That is a fill and a slot on two existing mechanics, and it would improve the two games a child is most likely to meet first more than any new mechanic in this set will.

---

# Part one: games that cost a skin

A mechanic is roughly a week of reviewed kernel work with tests, and a version is data, so the cheapest games are new versions of mechanics we already have. That is where we started, and reading the nine mechanics as they now stand changed what we can honestly call cheap. The finding is worth stating before the games, because it applies to almost all of them.

A mechanic's `draws` is a constant. In all nine, the drawings the board puts down are a fixed list in the mechanic's own code: `jump` draws `numberline`, `share` draws `fraction.circle` and a divider, `pay` draws a price tag, the money, the till and a ladder. And `slots`, the thing [activities.md](activities.md) describes as the palette and the boundary, is empty in six of the nine. Where it is not empty it holds props rather than boards: `weigh` fills the things that go in the pans, `spell` fills the picture to be spelled, and `race` fills the landmarks beside the track but not the track. `jump`'s own comment says it plainly, that the number line is the same drawing whatever the numbers are.

So a version today can change every number and no picture. That is the right decision for each of those mechanics taken alone and it means the palette argument is not yet true of the board, which matters for two reasons beyond this document: a generated activity cannot choose a picture, and a re-skin is a code change rather than a fill.

What a skin actually costs is one case in the mechanic's `board` function per drawing it learns to drive, plus one line in a new slot. The cases are real work, because the drawings take different settings: a number line takes a range and its jumps, a thermometer takes a range and a value, a staff takes a clef and a list of pitches. But a case is shared by every game that uses that drawing, and it is nearer a day than a week. We would price the eighteen games below at about twelve drawing cases between them, which is less than two mechanics for eighteen games, and we say so as an estimate rather than a measurement.

The recommendation that follows is in the contract section at the end: turn `draws` into a slot with an adapter per accepted drawing. It should happen before any new mechanic is written, because it is what makes this whole part of the set cheap and it is the one thing a parent's generated activity needs in order to choose what its game looks like.

Each entry below therefore names the mechanic it skins, the drawings the mechanic would have to learn, and what is genuinely only data. Where a game needs more than a skin, it says so in its own entry.

## On `weigh`: put a thing in, take one out, until two amounts match

### Make the train

Grade 1. "Lay rods end to end until the train is as long as the whole."

As `weigh` with one pan: the position is what the child has laid down, the moves are to add a rod of a given length or take the last one back, and it is won when the lengths total the whole. Every move can be taken back.

Drawings: `rods` in `mode=train` is the board, and it already draws the dashed whole across the top with the rods lying under it, which is the pan and the target in one picture; `rods` in `mode=stair` stands beside it as the key, so a child who cannot remember that the yellow one is five can count it off the staircase rather than being told.

The mathematics is bonds to ten and then to twenty, which is grade one lessons two and three, and it is the move because the rod's length is the number and laying it down is the addition.

Harder: the whole goes from ten to twenty; then at most two rods may be used, which turns it from counting up into choosing a pair; then the numbers come off the rods so the length is the only thing to read.

### Weigh out five hundred grams

Grade 2. "Put fruit on the scales until the needle reads five hundred grams."

As `weigh` against a dial rather than a beam: the win is that the reading equals the target rather than that two pans match, which is the same predicate over a different drawing.

Drawings: `dialscale` is the board and its needle can land between marks, which is the point of the harder versions; `masses` is the tray of brass masses; `pile` and `basket` are what is being weighed; `svg.market-stall` is the sheet it stands on, with the scales at the table anchor and the crates either side; `recipe` states the target in the version where it is written in kilograms and the dial reads grams.

The mathematics is grams and kilograms, grade two lesson ten, and reading a scale whose minor marks are worked out from the numbered ones.

Harder: the target lands between two marks; the tray omits the obvious mass so two have to combine; the target is given in kilograms while the dial reads grams, which makes the conversion the first move rather than a step beside it.

### Cover the hexagon

Grade 2 to 3. "Put blocks on the hexagon until it is exactly covered."

As `weigh` with fractional worths: a trapezoid is worth a half, a rhombus a third, a triangle a sixth, and the win is that the worths total one. Nothing about placement is involved, which is the whole reason this is buildable and `build` is not: the child is choosing quantities of named blocks, and the drawing shows the hexagon filling.

Drawings: `patternblocks` is the board, `fractionwall` beside it is the key that says which block is which fraction, `fraction.circle` shows the target as a whole.

The mathematics is halves, thirds and sixths of the same whole, grade two lesson eight and grade three lesson eight, and the move is the addition of unit fractions.

Harder: no two blocks alike, which forces a half plus a third plus a sixth; a block is already down and in the way; the target is two hexagons, so an improper total has to be recognised.

This wants three things and they are all small. `weigh`'s `worth` has to take a fraction, where its setting kind is whole numbers today. `weigh`'s two slots accept the four props and would have to accept the pattern blocks, which is a line in the slot rather than a change to the mechanic, and it is the one place in this set where an existing slot does exactly the job it was designed for. And `patternblocks` has to take which blocks are on the hexagon as data, where today it takes `mode` as one of four fixed pictures.

## On `jump`: play one card from your hand onto the line

### Up the ladder

Grade 1. "Land exactly on the top rung."

As `jump` with the line standing up. Same position, same cards, same win.

Drawings: `ladder` is the line, standing vertically with its values pegged at the right height, which is the drawing that already says up the page is more; `svg.treehouse` is the sheet, with the ladder at the drawing's own ladder anchor and the platform as the target; `starrow` marks the rungs already climbed.

The mathematics is counting on and back within twenty, grade one lessons four and five. A vertical line is worth having as well as a horizontal one because up and down is the reading a thermometer and a bar chart both need later.

Harder: the rungs go up in twos; one of the cards sends you back down; the top rung is not numbered so it has to be counted to.

### Cross the hundred square

Grade 2. "Land on sixty three without leaving the square."

As `jump` on a grid rather than a line, which changes only the drawing: a card of ten is a step down a row and a card of one is a step across, and the hundred square draws both.

Drawings: `hundred` is the board, and its `start` and `add` settings already draw the jumps down for tens and across for ones, so the trail is the drawing's own; `arrowcards` shows the target as the tens and ones it is built from; `pvchart` in `show=digits` reads out where you are.

The mathematics is adding tens and ones, grade two lesson two, and crossing a tens boundary, which is what makes the drawing earn its place: going from fifty eight to sixty three is a step across and a wrap, and on a line it is invisible.

Harder: the target is over a boundary; some cells are hidden with `hide` so the square cannot be counted square by square; only two cards, so the decomposition has to be exact.

### Down to minus four

Grade 4. "Land exactly on minus four."

As `jump` on a scale that goes below zero, which the mechanic already does in its second version. What is new is the drawing and the range.

Drawings: `thermometer` is the line, and its column shortens below zero rather than reversing, which is the reading that matters; `inequality` states the target region for the version where the win is a range rather than a point; `ladder` is the alternative vertical skin.

The mathematics is negative numbers, grade four lesson two, and in particular that subtracting past zero keeps going in the same direction.

Harder: the scale is in twos so the marks are not the numbers; the target is out of reach of any one card; the win is "below minus four but above minus ten", which is two constraints and reads off `inequality`.

### Land on the note

Music strand, grades 2 to 4. "Step up and down until you finish on the note the guide is holding."

As `jump` with the number line replaced by a staff and the cards replaced by intervals. The position is where you are and which interval cards are left, the moves are to play one, and it is won when you land on the named note. The position is a pitch rather than a number and the arithmetic is identical.

Drawings: `notes` is the board, and it is one of only three drawings that already declares its list settings, so `notes` and `lit` can be driven from a position without any registry work; `piano` is the second board and the second channel, because pressing a key lights it and sounds it; `fretboard` is the same declaration with the keys renamed, for the version where one pitch has several places.

The arithmetic is interval arithmetic, which is addition on a line whose units happen to be staff spaces, and it is the move. Whether that clears the bar set at the top of this document is the owner's call and we would rather ask than assume: the case for it is that a third up is a fact about distance and the child computes it to play, and the case against is that the subject is music rather than maths.

What makes it safe under [sound.md](sound.md) is structural rather than a promise. The key that sounds also lights, the note that sounds is also on the staff, and the round is playable and winnable with the volume at zero, because the prover has no ears and can only prove what the drawing says.

Harder: only the notes of one scale are legal; the phrase has to end where it began, which is a second constraint; a card would take you off the staff, which is the dead end the mechanic already reports.

## On `race`: change your speed by one, then travel by the speed you have

### Land the long jump

Grade 3. "Take off so you land exactly on three point four metres."

As `race` on a one-lane track whose scale is in metres and tenths, so the velocity is a decimal.

Drawings: `longjump` is the board, with the take-off board at zero and the tape in metres and tenths; `racetrack` is the run-up; `medalrow` and `scoreboard` are the readout and the trackside.

The mathematics is tenths, grade three lesson nine, and it is the move because a speed of three tenths a turn has to be added four times to get to one point two and the child has to see that before the third turn.

Harder: the board is in hundredths; a headwind takes one tenth off every turn, so the speed the child set is not the speed they get; the target is given as a fraction and the tape is in decimals.

### Make it to the next town

Grade 3 to 4. "Reach the town without running the tank dry."

As `race` with a second win condition. The fuel spent is a function of the speeds in the trail, which the position already carries, so this costs a fill and a readout rather than a field: going fast is legal and expensive, and the cheapest journey is not the fastest one.

Drawings: `fuelgauge` is the readout, marked at quarters with eighths between; `roaddistances` is the board, a winding road with towns dotted along it and each leg's length written on; `signpost` and `mapscale` say how far is left; `strokes.hills` is the sheet the road runs over.

The mathematics is distance and rate together, grade four lesson fourteen, and the second constraint is what makes it the right game for that lesson rather than a race in a hat.

Harder: the tank holds less; there is a filling station part way, so the plan has a decision in it; the gauge reads in eighths and the legs are in whole kilometres.

## On `shunt`: pull a carriage off one end and push it into the siding

### Spell it out of the siding

Grade 1. "Shunt the letters until they spell the word on the sign."

As `shunt` exactly, with a letter on each carriage instead of a number. The position, the three moves and the win are unchanged, and so is every drawing, because a carriage takes its label as text and a letter fits a plate as well as a numeral does. This is the one game in part one that is only data, and it is the cheapest game in the document.

Drawings: `carriage` takes its `label` as text, so a letter fits on the plate as easily as a numeral; `loco` and `sidings` are the yard; `lettercards` on the sign is the word to reach; `soundboxes` under the train shows one box per sound, so a digraph riding on one carriage is visible as one box.

This is the one place in the set where the move is the reading rather than the mathematics. Ordering letters into a word is the same act as ordering carriages into a sequence, and it is a real grade one skill from [tracks.md](tracks.md)'s reading track.

Harder: longer words; a digraph on one carriage, so the count of carriages is not the count of letters. Note that `shunt` already refuses a train where two carriages read the same, which means only words with distinct letters can be used, and that is a narrower set than it sounds. We have not counted how many grade one words survive it.

### Heaviest at the back

Grade 2. "Shunt the wagons so the heaviest is nearest the engine."

As `shunt` with the order given by a rule rather than written out, which is the only change: the win compares masses instead of comparing a list to a list.

Drawings: `suitcases` gives each wagon its mass on a tag and sizes the case by the cube root of it, so heavy is visible before it is read; `carriage` and `sidings` are the yard; `dialscale` weighs one if the child wants to check.

The mathematics is ordering by measure, grade two lesson ten, and the ordering is the move.

Harder: two masses in different units, so one has to be converted before it can be placed; the rule is lightest in the middle, which is not a sort; four wagons and a siding that holds two.

## On `pay`: take a coin out of the drawer or put one back

`pay` is being written as this is drafted, so these three are the least certain entries in the document. Each says what it assumes.

### Spend it all

Grade 2. "Buy things off the shelf until the purse is empty."

As `pay` with the pieces being priced goods rather than coins and the target being the money in the purse. The position is what is in the basket, the moves are to put a thing in or take it out, and it is won when the basket's total is exactly what the purse holds.

Drawings: `svg.shop-front` is the sheet, with `shop` items standing on its shelf anchor and the awning and door around them; `purse` shows what there is to spend; `pricetag` carries a reduced price with the old one crossed out; `receipt` fills in as things go in the basket, with the total blank until the win.

The mathematics is making an amount, grade one lesson eleven and grade two lesson twelve, as a subset sum rather than as a coin count.

Harder: one thing is reduced so its price is not the number on the tag; each thing may be bought once, which removes the repeat that makes coin problems easy; the purse cannot be broken, so the total has to be exact rather than affordable.

`pay` as now written cannot take this fill, and the reason is specific. Its pieces are an enumeration of six money pieces with their values in cents written into the mechanic, and it declares no slots, so an activity cannot say that a piece is an apple worth forty five. The change that makes this a skin is to turn that enumeration into a filled slot with a worth per piece, which is the same change `weigh` already has and `pay` does not. Until that happens this is half a mechanic rather than a version.

### Count up the change

Grade 2 to 3. "Give the change, and count it up the way a shopkeeper does."

`pay` already plays part of this. Its `paid` setting means the target can be the change from what was handed over rather than the price, and the goal sentence and the win both switch on it, so a round where a child counts out the coins of the change is data and nothing else. That version should be written first, because it is free.

This game is the other half, and it is a skin. The position is the hops laid down so far rather than the coins on the counter, the moves are to add a hop of a chosen size or take the last one back, and it is won when the hops reach from the price to what was handed over. The hop sizes are denominations, so the arithmetic is the one `pay` already does, and what is new is that the board is a line rather than a counter.

Drawings: `change` is the board and is exactly this method drawn, each hop five squares wide with its label worked out from the two amounts, and it is the drawing that makes this worth doing separately from the coin version; `till` is the drawer, with four note slots and four coin wells; `receipt` and `money` state the price and what was handed over.

The mathematics is counting up for change, grade two lesson twelve and grade three lesson thirteen, and the hops are the calculation.

Harder: the win asks for the fewest hops, which is a second constraint; the till is short of quarters so the obvious hop is unavailable; the amounts are dollars and cents with a decimal point, which is grade four lesson nine.

### Measure the spoonful

Grade 3 to 4. "Measure out two and three quarter teaspoons with the spoons on the ring."

As `pay` with fractional denominations. A half spoon and a quarter spoon are coins of a half and a quarter, and the target is a mixed number.

Drawings: `spoons` is the tray and already carries its sizes as written text, a tablespoon, a teaspoon, a half and a quarter; `recipe` states the target with the quantities in a column down the right; `mixingbowl` shows how full it is with the level drawn as a surface against the rim; `svg.kitchen-counter` is the sheet, with the bowl on the counter anchor and the jar at the end.

The mathematics is adding fractions with denominators of two, four and eight, grade four lesson six, and it is the move because a quarter spoon has to be recognised as the thing that closes a gap of a quarter.

Harder: the half spoon is missing so two quarters have to stand in for it; the recipe serves four and you are cooking for six, so the quantity is scaled before anything is measured, with `doubleline` showing the two scales; the target is written as an improper fraction.

This wants the same slot over pieces that Spend it all wants, and fractional worths on top of it, so a spoon can be worth a quarter. Both games are paid for once. It is worth noticing that these three money games between them ask for exactly the change that would let a parent's generated activity choose what a `pay` game is about, which is an argument for making it that has nothing to do with this set.

## On `share`: give a piece to a plate, or take it back

### Everyone the same

Grade 1 to 2. "Give out the cake until every plate holds the same."

As `share` in its rules: the position is what is on each plate and what is still in the tray, the moves are to give a piece to a plate or take it back, and it is won when every plate holds the same. Nothing about the position changes. What changes is the picture: `share` draws a fraction circle per plate and a wavy divider, so this is a skin of five drawings.

Drawings: `svg.birthday-table` is the sheet, with `cake` on its cake anchor, `plate` drawings at the plate anchors and the cup and present where the drawing puts them; `children` stands behind the table with names written under them and a count of what each holds; `cake` itself carries the candles and the cut lines.

The mathematics is sharing equally, grade two lesson seven, and dividing is the move.

Harder: the number does not divide, so there is a remainder and somewhere to put it; one child is owed twice as much as the others, which is ratio rather than sharing; the plates are given in the order they must be filled.

### Two pizzas, five people

Grade 3. "Cut and give out until everyone has the same amount."

As `share` where the pieces are not all the same size, which is the version that makes it fractions rather than division, and which is data rather than a skin: the mechanic already takes its pieces as how many units of a whole each one is worth. Only the drawings are new.

Drawings: `pizza` is the board and shows the slices taken with the board showing through the gap; `fractionwall` is the key; `equivalent` shows the same amount cut two ways with the arrow carrying what was multiplied; `plate` holds what each person has.

The mathematics is equivalent fractions, grade three lesson eight, and the move is recognising that two tenths and a fifth are the same amount.

Harder: the two pizzas are cut into different numbers of slices; a fifth is needed and nothing is cut into fifths, so two cuts have to combine; the win is that everyone has the same and nothing is left over.

## On `pour`: fill a jug, empty one, or tip one into another

### Get it back

Grade 3. "Filter and pour until the beaker holds exactly a hundred and fifty millilitres of clear water."

As `pour` with a third move, filtering, that moves the solid out and the liquid on. This is the most expensive entry in part one. `pour` draws a jug and a pinned card and declares no slots, so the glassware is a skin of four drawings, and filtering is a fourth kind of move rather than a setting, which means the position has to carry what is dissolved in each vessel as well as how much is in it. We would price it at half a mechanic and it is the one game here we would not build until the chemistry track is actually being used.

Drawings: `beaker` is the board, with a scale up its side, a level, room for a solid settled on the bottom and a stirring rod; `funnel` is the second vessel, with folded paper, residue on the paper and filtrate below, and it is the only drawing on the shelf where both halves of the answer are visible at once; `jug` and `containers` are the rest of the bench; `flame` is the heat for the version where evaporating is the move.

The mathematics is litres and millilitres, grade two lesson eleven and grade three chemistry lesson eight, and reading a scale whose minor marks are worked out from the numbered ones.

Harder: the funnel loses a fixed amount every pour, so the plan has to allow for it; three vessels with no common factor, which is where pouring becomes the classic jug problem; the target is not a mark on any vessel.

This is the entry that spends the chemistry glassware. Four drawings were made for the chemistry track and nothing else in the product plays with them.

## On `rule`: feed a number in, then name the rule

### Two machines

Grade 4. "Feed numbers in and name both rules."

As `rule` with two cards to name instead of one, which doubles the hidden information and makes the choice of test much sharper.

Drawings: `machinechain` is the board, two rules one after the other with the middle number shown or blank; `inout` records what has come out; `arrowchain` writes the composition out once it is named.

The mathematics is composition and inverse, grade four, and the skill is the one [activities.md](activities.md) says we do not know how to ask as a question: choosing an informative test.

Harder: the middle number is hidden, so only the pair can be inferred and not each rule separately; the two chains agree on some inputs, which is exactly what makes one test worth more than another; three numbers to feed and four cards each way.

This needs `rule`'s `audit` to be run over pairs of cards rather than single cards. The existing check asks whether the numbers still in hand can narrow the cards to one, and the same search over pairs is the same shape and a larger space. We have not measured how much larger.

---

# Part two: games that cost a mechanic

Seven, in the order we would build them. Each is given in full: the position, the moves, the win, the take-back, the drawings, the mathematics, the ladder, what the prover checks, and what it looks like.

## Break a ten

Grades 2 to 4. "Take away forty seven, and you may only take pieces you can see."

### The mechanic, `exchange`

The position is a count of pieces in each column, ones, tens, hundreds and thousands, plus what is still to be taken away. Three kinds of move. Bundle ten pieces from a column into one piece of the column to its left. Break one piece of a column into ten of the column to its right. Take one piece off a column, which is spent: it is gone and no move puts it back. It is won when the board holds the answer and nothing is left to take.

Bundling and breaking can be taken back and taking away cannot, which makes this the first mechanic in the product with both kinds of move in it. That has a consequence for the prover and it is set out below rather than glossed.

### The drawings

`pvchart` in `show=blank` is the frame: one named column per digit, four squares wide, with the point drawn as the heavy rule. It exists precisely to be written into, which is what a board is.

`baseten` is the pieces, one part per column, placed at that column's `cell` anchor. It is the drawing that can express the state in the middle of an exchange, because it takes its thousands, hundreds, tens and ones as counts rather than as digits, so eleven ones is a thing it can draw.

`arrowcards` above the chart shows the number the board started as, apart so they read two hundred, forty, seven.

`placename` states the target in the hardest version, with one digit ringed and its value named underneath, so the target is read off place value rather than off a numeral.

`tub` sits to the right and holds one counter for each piece taken off, spilled so they can be counted. It holds a count rather than the pieces themselves, which is the honest thing for it to do, because a tub of two-colour counters is not a place a hundred flat would go.

### The mathematics

Exchange, which is the whole of grade two lessons three and four, grade three lessons two and three, and grade four lessons four and five. It is the move in the strongest sense in the set: there is no arithmetic step beside it, because the only thing a child can do is convert one representation of a number into another and then take pieces away, and a child who can do that has understood the column method rather than having memorised it.

The moment the game exists for is the one where the ones column holds two and seven have to come off it. Nothing can be taken, so a ten has to be broken first, and if the tens column is empty a hundred has to be broken before that. Four hundred and two take away fifty seven is two breaks deep before anything moves. It is the calculation we would expect to be failed most often in the grades this product covers, and we are going on the two books this curriculum grows out of rather than on any evidence of our own.

### The ladder

Grade 2, two columns, bundling only: show this number with as few pieces as possible. Grade 2, two columns, one exchange in the tens. Grade 3, three columns and two exchanges. Grade 3, a zero in the middle, which is the double break above and is a genuinely deeper search rather than a bigger board. Grade 4, four columns with a break budget, so breaking everything down to ones and counting is not available. Grade 4, the target given as `placename` with a digit ringed rather than as a number, which is hidden information of a mild kind: the child knows the value of one digit and has to work out the rest from the board.

Every rung is a deeper search, a second constraint or less information. None of them is only more pieces.

### What the prover checks

Winnable, no dead ends, bounded, readable, all as they stand. Because moves are spent, the mechanic declares `luck` rather than `patience` and the prover refuses any dead end, which is the right severity here: a position where the remaining subtraction can no longer be done is a cruelty, and `accepts` should refuse a version that can reach one rather than leaving it to the search.

The clause the prover does not have is this. `reversible` is one boolean and `prove.ts` branches the whole third clause on it, so a mechanic with both kinds of move declares itself irreversible and is gated on the chance that uniformly random legal play wins. For this mechanic that number is close to meaningless, because random play spends almost every move bundling and breaking, so the figure measures how many exchange moves a position happens to offer rather than how likely a child is to stumble into a win. What we would want is the chance of a win computed over the spent moves only, with the reversible moves treated as free. That is a change to `luckProfile` and its weighting rather than a new pass, and it is the first of the three prover changes this document asks for.

### What it looks like

A place value chart across the top of the sheet, four columns wide, drawn as the heavy-ruled frame it is. Under each column head, base ten blocks standing on the floor of the cell: flats in the hundreds, rods in the tens, small cubes in the ones, at the true relative sizes the drawing keeps. Above the chart, arrow cards pulled apart. To the right, the tub, and the pieces taken off lying in it.

A bundle is ten cubes in the ones column leaving and one rod arriving in the tens, and because the rod is keyed it slides across rather than appearing. A break is the reverse and it is the move worth drawing well: the rod goes and ten cubes come, and for a moment the ones column holds twelve of them. That is the picture the whole game is about, `baseten` can already draw it, and nothing in the product currently asks it to.

The playful part is the spill. A column that has just been broken into is over-full and visibly untidy, and tidying it back up by bundling is a thing a child will do for its own sake.

## Make the connection

Grades 3 to 4. "Get to the harbour by half past four."

### The mechanic, `plan`

The position is where you are and what time it is. The moves are the services leaving this station at or after now, one move per row of the board, and taking one moves you and advances the clock. It is won when you are at the destination at or before the deadline. A leg can be taken back, so the dead-end clause is met by retreat and the mechanic declares `patience`.

The dead ends are the game. Taking the slow train is legal and it can cost you the last connection, and the prover reports those positions rather than refusing the version, which is the same judgement the `jump` mechanic already made about overshooting the flag.

### The drawings

`departureboard` is the board and the information at the same time: a heading row and one train to a row with where it goes, when it leaves and which platform, and a `mark` that lights the row you are on. It takes its rows as data, so a position drives it directly.

`elapsed` draws the journey so far as the bridging method it is, next o'clock, whole hours, then minutes, each hop five squares. It is the drawing that makes the time spent visible as a distance.

`clock` and `digital` say what time it is now, the analogue one for the grades that are still reading a face and the digital one beside it.

`ticket` prints as each leg is committed, from and to, date, time, seat and price, torn along its perforated edge.

`signpost` and `mapscale` say where the places are and how far apart, so the board is a journey rather than a table.

`train` travels along the bottom of the sheet between the two.

### The mathematics

Elapsed time across the hour, which is grade three lesson twelve, and adding durations to a clock time, which is the calculation children most often get wrong by treating an hour as a hundred minutes. It is the move because you cannot decide whether the 14:50 gets you there in time without working out when it arrives, and there is no step beside the move in which to do it.

The harder versions put a fare budget on it, which makes it grade four lesson nine as well, and then the cheapest route and the fastest route are different and both are legal.

### The ladder

Grade 3, two legs, whole hours. Grade 3, minutes past the hour and one change with a wait in the middle, so the wait has to be added. Grade 4, three legs where only one route meets the deadline. Grade 4, a fare budget as a second constraint, so the child is choosing against two things at once. Grade 4, the board gives the departure and the journey length but not the arrival, so every legal move has to be computed before it can be judged.

The last rung is the one worth building, because it is the version where nothing on the screen tells the child the answer to the question the move asks.

### What the prover checks

Everything as it stands, with `patience`. `accepts` has two jobs the contract cannot do. It has to refuse a board where no route meets the deadline, which would search cleanly and come out unwinnable with nothing useful to say. And it has to refuse a board where the fastest route needs no change and no thought, which is a legal fill that is a reading exercise rather than a game.

No new clause.

### What it looks like

A station board filling the top third of the sheet, two squares to a row, with one row lit. Below it, to the left, a clock and its digital twin showing the time now. Along the bottom, the road or the line drawn as a strip with the places on it and the train standing at the one you are at, keyed so it travels when a leg is taken. Between the two, the elapsed line growing a hop at a time, and to the right the tickets stacking up as they print.

The playful part is the board itself. A departure board is a thing children read for pleasure, and lighting the row you have chosen and then watching the next board come up with a different set of trains on it is most of the pleasure of a journey.

## Stretch the band

Grades 3 to 4. "Move the pegs until the band holds exactly twelve squares."

### The mechanic, `peg`

The position is the ordered list of pegs the rubber band goes round, which is a simple polygon on a lattice, plus which corner is currently ringed. Two kinds of move: ring the next corner, or move the ringed corner to one of the pegs a step away, where the result is still a simple polygon. It is won when the area is the number asked for, and in the harder versions when the perimeter is too. Every move can be taken back.

The two-tap shape is deliberate and it is a constraint rather than a preference. The natural move set, any corner in any of eight directions, offers up to thirty two moves from one position, which is four times the declared branch cap. Ringing a corner and then moving it keeps the branch at nine and keeps the pattern [activities.md](activities.md) already requires, two taps and no drag. The cost is that the move log fills with corner-ringing moves that are not mathematics, and that is the reason this mechanic is third on the list rather than first.

### The drawings

`geoboard` is the board and it takes its band as a list of pegs, so the position drives it with no change at all. Its `count` setting writes the area on, which the easier versions leave on and the harder ones turn off.

`grid` shows the target area as that many shaded squares, so twelve is a shape before it is a number.

`lshape` gives the target for the compound version, with every side labelled, which is grade four lesson ten drawn.

`tape` lies along the bottom for the perimeter versions, so the perimeter is a length rather than a count.

`marks` puts a loop on the ringed corner, at the peg anchor the drawing returns, so the pointer is in ink.

### The mathematics

Area and perimeter of a shape on squares, grade three lesson ten and grade four lesson ten. The move is the mathematics because moving one peg changes the area by a known amount and the perimeter by a different one, and playing well means knowing which.

The idea the second constraint carries is the one grade four is actually for: the same area can have many perimeters, and a long thin twelve has a much bigger edge than a fat one. Asking for both at once is asking the child to hold that fact, and there is no worksheet question we know how to write that asks it.

### The ladder

Grade 3, four corners on a four by four board, area only, with the count written on. Grade 3, area only with the count turned off. Grade 4, area and a fixed number of corners. Grade 4, area and perimeter together. Grade 4, a non-convex target with a corner count, which is the compound shape lesson. Grade 4, a move budget of five, so walking the band round the board until it happens to fit does not get there.

### What the prover checks

Everything as it stands, with `patience`. `accepts` has to refuse an impossible pair: not every area and perimeter can both be had by a simple polygon on a given board, and the mechanic can settle that by enumeration at build time and say which of the two numbers is wrong.

The risk here is the position count and it is the one thing in this document we have not measured at all. Four ordered corners on a five by five board is on the order of a few hundred thousand arrangements before simplicity and canonical rotation cut it down, and the declared cap is twenty thousand. The first versions have to sit on a four by four board and the mechanic has to key a position by its peg set rather than by its list, and even then we may find the cap has to rise or the boards have to stay small. A capped search proves nothing, so this is a real gate rather than a performance worry.

### What it looks like

A board of pegs two squares apart filling the middle of the sheet, with the band drawn round four of them in the ink a child reads as a line, and the area written inside it. One peg carries a loop. To the left, the target as a small block of shaded squares. Along the bottom, the tape.

When a corner moves, the band follows it and the area written inside changes, which is the whole feedback loop and needs nothing else. The playful part is that a rubber band on a geoboard is a thing whose behaviour a child already knows, and the drawing is close enough to the real apparatus that the knowledge transfers.

## Sit further out

Grades 3 to 4. "Move along the plank until it is level."

### The mechanic, `moment`

The position is, for each side, a list of masses and the step each one is hanging from. Three moves: hang a mass from the tray at a chosen step, take a hung mass back to the tray, or slide a hung mass one step in or out. It is won when the turning effects on the two sides are equal. Every move can be taken back.

This is the entry that sits between a version and a mechanic, and it is worth saying where the line falls. `weigh` already asks a child to match two amounts, and everything about this game except one thing is `weigh`: the tray, the take-back, the win as an equality, the refusal of a load nothing can match. The one thing is that the position has to know where each mass is hanging, and `weigh`'s position is a count of things per pan. A version cannot change a position type, so this cannot be a version. It is also not a week of new thinking. We would price it at half a mechanic and we have not built one, so that number is a guess.

### The drawings

`seesaw` is the board and it is drawn, indexed nowhere, and used by nothing. It takes a mass and a step for each side, it is marked off in equal steps either side of the pivot, and it tilts by the turning effect rather than by the weight, which is the only drawing on the shelf that makes distance from the pivot as visible as load. The first two versions need it exactly as it is.

`masses` is the tray, brass masses each labelled and sized by the cube root of its mass.

`children` is the playground skin, a row of children with names, for the version where two children of different weights have to find where to sit.

`ruler` lies under the plank so the steps are a length.

`balance` is the grade two ancestor, on the same sheet, where the distance is fixed and only the load can change.

### The mathematics

Multiplication as a product that has to match: two kilograms six steps out balances three kilograms four steps out, and no other arrangement of those masses at those steps does. That is the times tables, grade three lesson four, in a form where the answer is a physical fact rather than a recalled one, and it is grade four physics lesson thirteen, the see-saw rule.

The move is the mathematics because sliding a mass one step changes the turning effect by exactly that mass, so the child is adding and subtracting the mass while they move it, and there is nowhere else for the arithmetic to happen.

### The ladder

Grade 3, one mass each side, the step on one side fixed, so the game is to find the factor pair. Grade 3, one mass each side and both steps free, which is finding any pair with the same product. Grade 4, two masses on one side, so a product has to be split into a sum of two products. Grade 4, a mass that will not divide the target, so it cannot be used alone. Grade 4, the pivot off centre, so the two sides have different numbers of steps.

### What the prover checks

Everything as it stands, with `patience`. `accepts` has to refuse a load whose turning effect no combination of the tray at any legal step can match, which is the same shape as the refusal `weigh` already carries and is the reason that refusal is worth copying rather than rewriting.

No new clause.

### What it looks like

A plank on a pivot across the middle of the sheet, marked off in equal steps each side with the numbers under them, tilted by however far off it is. Masses hanging from the steps on short lines. To one side, the tray of brass masses with their labels. Under the plank, the ruler.

A move is a mass travelling from the tray to a step, or one step along the plank, and the plank's tilt changing as it goes. Because the tilt is the drawing's own function of the position, the feedback is continuous and needs no words: getting closer is the plank getting flatter, and that is legible at grade three without reading anything.

The playful part is the slide. Moving a heavy mass one step and watching the plank swing a long way, then moving a light one and watching it barely move, is the lesson, and it is a thing a child will do twenty times.

## Make the average

Grade 4. "Put in the goals until the team scores four a game and never more than six."

### The mechanic, `dot`

The position is a count of dots over each value. Two moves: add a dot over a value, or take a dot off a value. It is won when the plot has the number of dots asked for and the statistic asked for: the mean, the range, the mode, or two of them at once. Every move can be taken back.

Honesty about the boundary, because it matters to whether this is worth a week. The mean-only version is `weigh` in disguise: a dot over the value five is a weight worth five, the target mean times the target count is the sum that has to be matched, and `weigh` would play it. What the mechanic earns is the constraints that are not functions of the sum. A range is a fact about the extremes, a mode is a fact about the tallest pile, and neither can be expressed as a worth. So the first version we would write is the mean-only one, on `weigh`, to find out whether the game is any good before writing the mechanic that the rest of it needs.

### The drawings

`dotplot` is the board and takes its counts as a list over a value window, one dot to a square up and two squares to a value across, so both directions can be counted.

`bargraph` is the same position drawn as bars, for the version whose target is a bar chart.

`tallytable` is the same numbers written up as a survey, what it was, the tally, the number, with one column blank.

`comparebars` holds two groups for the version where two teams have the same mean and different spreads.

`scoreboard` reads out the total and the count as they change, which is what makes the mean legible while it is being built rather than only at the end.

### The mathematics

The mean as a thing that can be pushed about, grade four lesson thirteen. It is the move because every dot placed spends from a fixed total: once the child knows they need ten dots averaging four, they have forty to spend, and each dot is a withdrawal.

The range is the second constraint and it fights the first, because the cheapest way to fix a mean is to put everything in the middle and that is the one arrangement with no range at all. The two together are the grade four insight that an average does not describe a set.

### The ladder

Grade 3, the mode only, which is just making one pile tallest. Grade 3, a total and a range. Grade 4, a mean and a count, so the sum is fixed. Grade 4, a mean and a range with the count fixed, which is a real puzzle. Grade 4, one more dot must not change the mean, which is the question about what the mean is that we do not know how to ask on paper.

### What the prover checks

Everything as it stands, with `patience`. `accepts` has to refuse a count and a mean whose product is not a whole number, and a mean and a range that cannot both hold inside the value window, and it should say which of the two it was.

This is the mechanic that makes the second prover request concrete. Several games in this set win on two numbers at once, and the shortest win tells us nothing about how much the second number bites: a version where the range comes free once the mean is right and a version where they genuinely fight have the same shortest win. What we would want reported, not gated, is how many reachable positions satisfy one constraint and not the other. It is one more pass over a graph the prover has already built, it is the number that would tell an author whether their harder version is actually harder, and nothing today measures it.

### What it looks like

A dot plot across the middle of the sheet, values along the bottom two squares apart, dots stacked over them one square each. Above it, the scoreboard, with the total in one window and the number of games in the other and a line under them saying what the mean is now. To the left, the target written once in the guide's sentence and nowhere else.

A move is a dot arriving on top of a pile, or leaving it, and the scoreboard's numbers turning over. The playful part is the shape: a plot being pushed into a shape that satisfies two numbers at once ends up looking deliberate, and a child who has made a symmetric plot with a mean of four and a range of six has made a picture as well as an answer.

## Fold it in half

Grades 2 to 4. "Colour squares until the picture folds onto itself, using exactly nine."

### The mechanic, `fold`

The position is the set of coloured cells and where the pointer is. Moves: move the pointer one cell in a direction, and colour or clear the cell under it. Some cells are given and cannot be cleared. It is won when the figure is symmetric about the declared mirror line or lines and exactly the declared number of cells are coloured. Every move can be taken back.

The pointer is here for the same reason as in `peg` and with the same cost: a six by six board has thirty six cells and offering all of them breaks the branch cap, so the moves become four steps and a toggle. It also makes the shortest win long and mostly made of moves that are not mathematics, which matters to the difficulty band the prover gates on.

Two mechanics in this set arriving at the same workaround is the reason we think [activities.md](activities.md)'s own open question, whether the branch cap should count moves or choices, has to be answered before either is built. The alternative to a pointer is offering the cells as chips grouped by row, which is thirty six moves in six groups, and a cap counted in groups would allow it. The objection to counting groups is stated in that document and it is a good one: a mechanic could then hide a wide choice behind a narrow one. We do not have an answer and we would rather the owner set the rule than have each mechanic invent its own.

### The drawings

`reflect` is the board and takes its coloured cells as a list of coordinates with the mirror line drawn in, so the position drives it. Its `show` setting decides whether the other half is completed in pen, which the easiest version uses as a hint and the rest turn off.

`mirror` states the target: one shape with a dashed line across it, which is the question the game is a doing version of.

`grid` counts the budget as that many shaded squares, so nine is a quantity you can see.

`tessellation` and `patternblocks` make the border, which is the one place in this set where a drawing is there to be looked at.

`marks` loops the cell under the pointer.

### The mathematics

Symmetry, grade three lesson eleven. Reflection is a coordinate operation and the move is the mathematics because colouring a cell obliges its mirror image, so the child is computing the reflection to play at all.

The fact the budget carries is parity: an odd number of cells cannot be split into mirror pairs, so exactly one cell has to sit on the line. A child who works that out has understood something about symmetry that "is this line a line of symmetry" does not ask.

### The ladder

Grade 2, one vertical line, a generous budget, and the other half drawn in pen as a hint. Grade 3, the hint off. Grade 3, a diagonal mirror line, which is the swap of the coordinates and the rung children fall off. Grade 3, an odd budget. Grade 4, two mirror lines at once, so a cell obliges three others. Grade 4, some cells given and in the wrong place, so clearing has to happen before colouring and the budget is tight.

The diagonal rung wants one thing: `reflect` takes its line as vertical or horizontal, and `mirror` is the drawing that has a diagonal. Adding a diagonal to `reflect` is one value on one setting.

### What the prover checks

Everything as it stands, with `patience`, and the branch question above. `accepts` has to refuse a budget that parity makes impossible, a set of given cells that is already symmetric, and a given cell whose mirror image is a cell that cannot be coloured.

No new clause beyond the branch cap decision, which is not new so much as unresolved.

### What it looks like

A grid of squares in the middle of the sheet with the mirror line drawn across it as a dashed rule, some cells coloured in a flat wash, one cell looped. Round the outside, a band of tessellation in two colours, which is the one decorative thing in this document and is there because a symmetry game should look like a tile.

A move is a cell filling or emptying, and its mirror image staying empty, which is the thing the child has to notice. The playful part is the last move: an almost-symmetric figure has an obvious hole in it and filling it is satisfying in a way that has nothing to do with being told you were right.

## Fill the tray

Grades 3 to 4. "Set the tray so every bun fits with no gaps and none left over."

### The mechanic, `array`

The position is the shape of the tray, rows by columns, and the set of shapes already claimed. Three moves: one more or one fewer row, one more or one fewer column, and claim this shape, which is spent. It is won when every shape that fits has been claimed.

Resizing can be taken back and claiming cannot, so like `exchange` this is a mechanic with both kinds of move in it and it wants the same weighting the prover does not have.

### The drawings

`bakingtray` is the board, buns in rows and columns with some iced, and it takes its rows and columns as numbers.

`eggbox` is the second skin, cups full and empty, and the empty ones are drawn as carefully as the full ones, which is what makes a gap visible.

`boxes` shows what a failure looks like: so many boxes with so many in each and the ones left over standing outside, which is the picture of a remainder.

`array` is the abstract version for the grades that no longer need the buns.

`venn` holds the claimed shapes for the version with two numbers, with the shapes common to both in the middle, which is grade four lesson three drawn exactly as that lesson draws it.

`chocolate` is the bar version, rows and columns with some broken off.

### The mathematics

Factors, multiples and primes, grade four lesson three. A prime is the tray you cannot set; a square number is the tray that is the same both ways; a highly composite number is the one with many trays. The move is the mathematics because setting the tray is proposing a factor pair and the gaps are the remainder.

### The ladder

Grade 3, one shape to find, for a number with few factors. Grade 3, find them all, for numbers up to thirty six. Grade 4, two numbers at once and the win is the shapes both share, which is the highest common factor. Grade 4, numbers up to a hundred with a claim budget, so sweeping every row count does not work.

### What the prover checks

Everything as it stands, plus an `audit` of the kind `rule` already has, and for the same reason: the graph thinks claiming is always legal and cannot tell a worked-out claim from a lucky one. The check is whether the shapes can all be found inside the budget, which is a search over factor pairs rather than over positions, so it belongs to the mechanic. That the same hook is wanted by a second mechanic is worth recording, because [activities.md](activities.md) predicted it would generalise.

### What it looks like

A baking tray in the middle of the sheet with buns in it, and the tray visibly growing and shrinking a row at a time. To the right, the buns not yet on it, standing loose. Below, the shapes already claimed written as pairs. For the two-number version, a Venn with the two numbers as its ring labels and the shared shapes going into the middle.

The playful part is the near miss: a tray that is one bun short of full is the clearest picture of a remainder in the product, and it is the same drawing as the win with one thing different.

This is the entry in the set we are least confident is fun. The mathematics is right and the art is right, and we have not convinced ourselves that a child wants to find all the factors of thirty six more than once.

---

# Part three: what this adds to games already designed

Three short notes, because it would be dishonest to present these as new.

`sort`, moving a thing into a hoop until everything is where it belongs, is designed in [activities.md](activities.md) and blocked there on parts declaring their attributes, because whether a ball is round is a fact about a drawing rather than about an activity. That blocker applies to sorting drawings. It does not apply to sorting words, because `wordsort` takes its headings, its words and which column each word is in as data, so a sorting game over words is buildable today with no part attributes at all. That is a grade two to four reading and writing game, it is in both of those tracks' lesson lists, and it costs the mechanic that document already describes plus a fill.

`program`, adding an instruction and running it until the robot ends on the parcel, is designed there and is a grade one to four span. What is available now and was not when that was written is `turtle`, which takes its moves as a list and draws the path from them, so the picture cannot disagree with the program. That makes the grade three and four rungs of the same mechanic drawable: a square, a staircase, a repeat inside a repeat, all with a line budget. Those are versions of the designed mechanic rather than a new one, and they are the rungs that mechanic currently lacks.

`stack`, the number pyramid, is designed there and `pyramid` takes its cells and its blanks as data, so it needs nothing new. We mention it only because it is the cheapest unbuilt mechanic in either document and grade four lesson fourteen already names the drawing.

---

# Grade coverage

The set as a whole, with the games in flight included so the shape of the year is visible. A game is listed in every grade its ladder covers, so a game whose rungs span three grades appears three times.

| Grade | What the set covers | Games |
|---|---|---|
| 1 | bonds to twenty, counting on and back, ordering, sharing, coins, blending sounds | Make the train, Up the ladder, Spell it out of the siding, Everyone the same, and the grade one versions of weigh, jump, race, pay, share, spell |
| 2 | tens and ones, adding with exchange, mass, sharing with a remainder, making amounts, change, symmetry | Weigh out five hundred grams, Cover the hexagon, Cross the hundred square, Heaviest at the back, Spend it all, Count up the change, Break a ten, Fold it in half |
| 3 | tenths, equivalent fractions, area and perimeter, elapsed time, capacity, the times-table pair, rate | Land the long jump, Make it to the next town, Two pizzas five people, Get it back, Measure the spoonful, Count up the change, Break a ten, Make the connection, Stretch the band, Sit further out, Fold it in half, Fill the tray |
| 4 | negative numbers, adding fractions, decimals and money, compound area, the mean, factors, composition | Down to minus four, Two machines, Make the average, Land on the note, and the grade four rungs of Make it to the next town, Measure the spoonful, Count up the change, Break a ten, Make the connection, Stretch the band, Sit further out, Fold it in half, Fill the tray |

Grades three and four carry more of this set than grades one and two, which is the correction we set out to make: eight of the nine mechanics in flight have a version at grade one or two, and the mathematics those grades are learning was already the best served.

What the set still does not cover, and we should say so rather than let it be discovered: shape and solids beyond area and symmetry, angles and the protractor, rounding, long division as a method, percentages, and reading comprehension. The first two are the ones we would look at next, because `protractor`, `angle`, `setsquare`, `construction` and `net` are all drawn and none of them is in a game.

# What the mechanic contract needs

One change, and on the evidence of this set it is the most valuable thing in the document.

A mechanic's `draws` should be a slot rather than a constant. Today the drawings a board puts down are a fixed list in the mechanic's code, `slots` is empty in six of the nine mechanics, and where it is not empty it holds props and landmarks rather than boards. That means a version can change every number and no picture, which has three consequences. Most of part one costs code rather than data. A generated activity cannot choose what its game looks like, which is a gap in the loop [ai.md](ai.md) and [activities.md](activities.md) both describe, since the palette argument is currently true of a pan's contents and not of the board. And each mechanic that wants a second look invents its own way of getting one, which is how a contract drifts.

The shape we would propose is the one the contract already has. A mechanic declares a slot whose `from` lists the drawings that can carry its position, an activity fills it with one of them, and the mechanic holds an adapter per accepted drawing that turns a position into that drawing's settings. The adapter is the honest cost and it is not data: a number line takes a range and a list of jumps, a thermometer takes a range and a value, a staff takes a clef and a list of pitches, and something has to know which. But an adapter is written once and reused by every game that names that drawing, `accepts` can refuse a drawing that cannot show the range the version asks for, and the slot's `from` keeps the boundary exactly where [activities.md](activities.md) puts it.

We would do this before writing any of the seven mechanics in part two. Two of those mechanics, `exchange` and `fold`, want several skins of their own from the start, and writing them against a constant `draws` would mean building the wrong thing twice.

# What the prover needs

Two additions and one decision that is not ours. Only the first is a clause of the promise.

Luck weighted by which moves are spent. Two mechanics in this set, `exchange` and `array`, have reversible moves and spent moves in the same move set. `prove.ts` has one `reversible` boolean and branches the whole third clause on it, so such a mechanic declares itself irreversible and is gated on the chance that uniformly random legal play wins. That figure is dominated by the reversible moves and measures nothing we care about. The clause we want is the chance of a win over the spent moves, with the reversible ones free. It is a change to how `luckProfile` weights an edge rather than a new pass.

How much the second constraint bites, reported rather than gated. Six games in this set win on two numbers at once. The shortest win does not distinguish a version where the second number comes free from one where the two fight, which is exactly the difference between a rung and a re-skin. The figure we want is how many reachable positions satisfy one constraint and not the other, which is one more pass over a graph the prover has already built.

The branch cap counted in moves or in choices, which is [activities.md](activities.md)'s open question and not ours. `peg` and `fold` both arrive at a pointer to stay under a cap of moves, both pay for it in a move log full of moves that are not mathematics, and neither of them should be written until the rule is set.

# The art this needs

The point of the exercise was that the catalogue pays for most of it, and it does. Twenty five games use around ninety drawings, all of which exist and all of which are named in the entries above, and the list below is the whole cost. There is no new drawing in it.

Four settings have to change on parts that are already drawn, each for a stated game, and one mechanic setting has to widen its kind.

The mechanic one first, because it is not art. `weigh`'s and `pay`'s `worth` has to take a fraction where today the kind is whole numbers, for Cover the hexagon and Measure the spoonful.

`patternblocks` has to take which blocks are on the hexagon as data, where today it takes `mode` as one of four fixed pictures, for Cover the hexagon.

`reflect` has to accept a diagonal mirror line, which `mirror` already has, for the diagonal rung of Fold it in half.

`seesaw` has to take a list of masses and steps per side rather than one of each, for the grade four rungs of Sit further out. The grade three rungs need it exactly as it is, so this is not a blocker.

`seesaw` also wants an anchor at each marked step, so a mass or a child can be placed on one. It is one line in the drawing and it is what lets the board be composed rather than drawn whole.

Two things worth fixing that this set found and does not depend on.

`abacus` and `pvchart` cannot draw the state they were made for. Both take the number as a digit string, so a column holds at most nine, and `abacus`'s own description says a ten that has to be exchanged is a spike with ten beads on it, which its settings cannot express. `baseten` takes counts and can, which is why Break a ten uses it, but the abacus and the counter chart are the two skins a teacher would reach for and neither works. Counts per column rather than a digit string fixes both.

`circuit` is declared twice. `raceCircuit` in `src/art/sports.ts` and `circuit` in `src/art/physics.ts` both declare `id: "circuit"`, one being the race track seen from above and the other a cell, a bulb and a switch. Neither is in `src/art/catalog.ts` yet, which is why `check:art` has not caught it, and anything resolving a drawing by its id will have one shadow the other. It is a rename rather than a redraw, and it is worth doing before either drawing is indexed.

Finally, `rings` and `carroll` keeping their own contents is recorded in [tracks.md](tracks.md) as worth fixing, and the sorting game in part three is a second reason to fix it. It is not a dependency of anything else here.

# The ranking

Judged on what mathematics the game buys that nothing else covers, how firmly the move is the mathematics, what it costs, and how confident we are that a child will want to play it a second time.

The strongest thing to say about the ranking is that the top of it is not a game at all. It is the contract change in the section above, turning `draws` into a slot, because without it every game in part one is a code change and with it most of part one is a drawing adapter shared across several games. We would not have put a piece of plumbing at the top of a ranking of games if reading the nine mechanics had not made it unavoidable.

The second strongest thing is that the top of the games is not a mechanic either. Make the train, Up the ladder, Spell it out of the siding and Everyone the same are the four youngest games in the set, they use art that is drawn and unspent, they need no new mechanic and between them about five drawing adapters, and they roughly double the number of games a six-year-old can reach. Spell it out of the siding needs nothing at all, not even an adapter, which makes it the first thing to build on any reading of the evidence. Nothing in part two is better value than those four.

Among the mechanics:

1. Break a ten. It buys the spine of grades two to four, the move is unarguably the mathematics, every drawing it needs takes counts already, and the picture it makes, a column holding twelve ones for a moment, does not exist anywhere in the product. It also gives the prover the second spent-moves mechanic the current build says it is missing.
2. Make the connection. It buys grade three elapsed time, which no game touches; the travel art is drawn and almost unspent; the calculation is the move in the version where the board does not give the arrival time; and a departure board is a thing children read for pleasure.
3. Stretch the band. It buys grade three and four area and perimeter, the second constraint is a genuine ladder, and the geoboard already takes a band as data. Third rather than first only because of the position count, which we have not measured, and the pointer question, which is not ours to settle.
4. Sit further out. The cheapest of the seven, half a mechanic rather than one. It buys multiplication as a matched product and the grade four see-saw lesson, and `seesaw` is drawn, unused, and already tilts by the right quantity, which is the rarest thing on this list.
5. Make the average. It buys grade four statistics, which nothing else in either document covers, and its mean-only version can be written on `weigh` first to find out whether the game is good before the mechanic is written.
6. Fold it in half. Good mathematics, cheap art, and it should not be written until the branch cap rule is set, because it and Stretch the band would otherwise each invent their own answer.
7. Fill the tray. The mathematics is right and the art is right and we are not sure it is fun. Marked unsure rather than padded.

## The five we would build first

Make the train, Up the ladder, Spell it out of the siding and Everyone the same, as one piece of work, on top of the slot over `draws` that the contract section asks for. Four games and a contract change is less work than two mechanics, it is where the set is thinnest for the youngest child, and doing the contract change here rather than later means the first mechanic written afterwards is written against the right shape. Spell it out of the siding does not wait for any of it and could ship this week.

Then Break a ten, for the reasons above, and because the prover change it wants is worth having before a second mechanic needs it.

Then Make the connection, because it is the game in the set we are most confident a child would choose.

Then Sit further out, because it is half the price of the rest and it tells us whether growing an existing mechanic is really cheaper than writing a new one, which is a thing we have asserted twice in two documents and not yet tested.

Then Make the average, starting with its mean-only version written on `weigh`, so the question of whether the mechanic is needed is answered by playing rather than by argument.

Stretch the band and Fold it in half wait on the branch cap decision. Fill the tray waits on somebody watching a child play Break a ten, because if factor-hunting turns out to be dull there it will be dull here.

# Fun, and not provable

Four ideas that use the art well and that the gate would not pass. We would still want some of them, and each would need a different gate, which is a decision for the owner rather than a thing this document can settle.

Clapping the rhythm. `beattrack` is drawn and it is exactly this: the beats along a line, where each note should have fallen above it, where each tap actually fell below it, and the tolerance drawn as a band. It is the best piece of art in the product for a game and the game cannot be proved, because the position depends on a clock and [activities.md](activities.md) is deliberate that the notation cannot express a duration. The tolerance band is an honest gate of a different kind, a judgement against a window rather than a proof of a win, and saying so on the page is the rule [product.md](product.md) already uses for writing. We think this is the one in this section most worth having.

Building on the hexagon or the square. Covering an outline with pattern blocks or tangram pieces is `build`, and it waits for parts to have a geometry. Cover the hexagon in part one is the version of that idea that works without geometry, because it counts blocks instead of placing them, and it is worth being clear that it is a smaller game rather than the same one.

Making a sentence from word cards. `wordcards` and `sentence` are drawn and a child pushing words into an order is a real reading activity. With one target sentence it is a jigsaw with one answer, which is provable and thin. With any sentence allowed it is a judgement, so the grown-up is the marker, and the honest form of it is a collection surface rather than a game.

Setting up the stall. The hand-drawn settings are the best art we have and the most game-shaped, and this set uses five of the nine as scenery. A child arranging the market stall, pricing the crates on the chalk sign and laying out the shop window is obviously something they would enjoy and it has no win condition, so there is nothing for the prover to prove. We record it because the gap is real: the settings deserve a mechanic built for them and we have not designed one.

# Open questions

Whether Land on the note clears the bar at the top of this document. Interval arithmetic is arithmetic and the move is the move, and the subject is music. We would rather be told than decide.

Whether Stretch the band's position graph fits inside the declared cap on any board big enough to be interesting. This is the one number in the document we have not measured and it is a gate rather than a performance worry, because a capped search proves nothing.

Whether growing a mechanic by one field is really cheaper than writing one. Sit further out is the test and this document has assumed the answer twice.

Whether the branch cap counts moves or choices, which is [activities.md](activities.md)'s question and blocks two games here.

Whether an adapter per drawing is the right way to make `draws` a slot. It is the shape that fits the contract as it stands and it puts a per-drawing switch inside a mechanic, which is the kind of thing that grows. The alternative is a small declared mapping from a position's fields to a drawing's settings, which would be data and would be checkable, and which we suspect cannot express a jump drawn above a line or a trail drawn across a grid. We have not tried to write either.

Whether the four money and sharing games justify opening `pay` and `share` up at all, or whether the honest answer is that those two mechanics are finished and the games belong on a mechanic of their own. We think opening them up is right, because the arithmetic really is the same in every case, and it is the kind of judgement that looks different once somebody has tried it.

# Built since: shut the box

Status: built in the scratchpad, September 2026, and played on the Games tab as a hands-on game (`play.html?g=shut`). The mechanic is `scratchpad/src/play/shut.ts`, the binding to hands is `shut-hands.ts`, the three drawings (`die`, `shuttile` and `shutbox`) are in `src/art/dice.ts`, and the tests are in `test/games.test.ts`. Unlike the set above, it adds drawings, because a die seen part way through a roll and a box with hinged numbers were not on the shelf.

## Two dice

The owner played it and found three dice odd, so every level now throws two. The rule stays NRICH's basic one: a die put on its own number shuts it, and the two dice put together on a number shut it when they make it, by adding, and at the higher levels by multiplying or taking one from the other. We kept a die on its own number rather than asking for the pair's total every time, because with only the total a 1 could never be shut and far more throws would fit nothing. Two dice added reach a big number too seldom for a long box: good play would take 15 throws on average to shut 1 to 9 and 45 to shut 1 to 12, against a round of one to three minutes. So the ladder now climbs by what the pair may do rather than by a longer box, and the biggest box has ten numbers.

| Level | Grade | The box and the dice | Good | Random | Nine games in ten within |
|---|---|---|---|---|---|
| Up to 6 | 1 | 1 to 6, added | 6.8 | 7.1 | 10 |
| Up to 8 | 1 to 2 | 1 to 8, added, so 7 and 8 need both dice | 12.0 | 13.5 | 19 |
| Up to 9, add or times | 2 to 3 | 1 to 9, added or multiplied | 13.1 | 15.0 | 20 |
| Up to 9, three ways | 3 to 4 | 1 to 9, added, taken away or multiplied | 12.6 | 15.1 | 20 |
| Up to 10, three ways | 4 | 1 to 10, added, taken away or multiplied | 14.7 | 17.6 | 23 |

Choosing well matters least at the first level, where the maths is reading the dice, and most at the last, where random choices take 17.6 throws against 14.7. The seeds are the levels' own, and each level's declared shortest win and patience are the range over the first hundred seeds: 9 to 22 moves at the first level, then 15 to 41, 18 to 31, 18 to 26 and 22 to 27. No box a child can reach is one no throw can ever shut, and a throw offers at most 4, 6 or 8 moves at the three operations, under caps now set at 6, 8 and 10. Rounds are longer than they were with three dice, which is the cost of the change. The sections below describe the game as first built with three dice, and their figures are for three.

## The game

A box has a row of hinged numbers, all standing. The child throws three dice by flicking them across the felt, tapping them or pressing Space, and the dice tumble and land. Then a die is dragged onto a number: onto its own number it shuts it, and onto a bigger number it waits there until the dice put with it make the number. Each die is used once, and a throw is used until nothing more fits, when the next throw comes. A throw that fits nothing is thrown again, so nothing is lost, there is no clock and no score, and every round ends with the box shut. What the child's choices change is how many throws that takes, which the words at the end say in the same way the other games give their moves.

## What the research says a dice game can teach

Subitising, reading a small number without counting, is the first thing a die asks for. Clements (1999) describes it and argues for teaching it with arranged patterns, and grouping items into regular patterns makes a quantity quicker and more precise to read (Anobile et al. 2020; the Wikipedia summary cites Ciccione and Dehaene 2020 for dice patterns in particular). Every throw here starts with reading three faces.

Adding two or three dice, doubles and near doubles, and making ten are where dice games spend most of their time. NRICH's Two Dice (ages 5 to 7) has children find every total of two dice and notice that the middle totals have more ways to be made. Making ten and near doubles are named in the US first grade standard 1.OA.C.6, which we could not fetch in this session.

Race games on a number track are the best evidenced: after about an hour of a linear number board game, low-income preschoolers improved in comparing magnitudes, estimating on a number line, counting and naming numerals, and a version with colours instead of numbers did not (Siegler and Ramani 2008; Ramani and Siegler 2008). Place value with dice as digits is NRICH's Nice or Nasty (ages 7 to 11), where each digit is placed as it is rolled to make the biggest number, and the question it raises is why some places are worth more than others.

Probability with two dice runs into the equiprobability bias, the belief that outcomes of a random process are equally likely. Lecoutre's item, as Gauvrit and Morsanyi (2014) give it, is that a five and a six is twice as likely as two sixes. Strategy is NRICH's Shut the Box (ages 5 to 7), whose basic rule is to turn over the numbers rolled, whose variants add them, take one from the other, turn over any numbers with the same total, or multiply, and whose teacher's question is "Which cards could you turn over? Which would be best? Why?". The classic rules (Wikipedia) use numbers 1 to 9, allow one die once 7, 8 and 9 are down, and end the turn when no number can be shut, scoring what is left.

## Why this rule

Shut the box carries more of that list than any other design we considered, and it has a real choice in every throw. We changed it in two ways, and measured both with the analysis described under the gate. The classic game ends when a throw fits nothing and scores what is left, which is a way to fail, so here that throw is thrown again. With the classic rule, two dice added and the total split across numbers, that change makes the end of a game slow, because a lone 9 waits for a throw of exactly 9: good play takes about 14 throws to shut 1 to 9. So the rule is NRICH's basic one, grown to three dice: a die shuts its own number, or dice together shut the number they make. Good play then shuts 1 to 9 in about 7 throws, and nine games in ten take 9 or fewer.

We also looked at letting the child choose some of the dice and split their total across several numbers. It rewards thinking the most we measured, since random choices waste about six times as many throws as good ones on 1 to 12, but it needs two gestures and a position graph several times larger, and we left it for a later rung. Place value and racing on a hundred square are not in this game; Nice or Nasty is the model for a place value game later. The owner later asked for two dice, and "Two dice" above says what that changed.

## The levels

Throws are the average with good choices and with random ones (each time, any number the dice can shut, with any dice that make it), from the exact analysis below.

| Level | Grade | What the child does | The maths | Good | Random | Nine games in ten within |
|---|---|---|---|---|---|---|
| Up to 6 | 1 | Reads each die and puts it on its number, and puts small dice together on a number up to 6 | subitising, adding within 6 | 4.5 | 4.9 | 6 |
| Up to 9 | 1 to 2 | Makes 7, 8 and 9, which only dice together can | adding two or three numbers, doubles and near doubles | 7.0 | 7.9 | 9 |
| Up to 12 | 2 to 3 | Chooses which dice go together, and shuts the numbers that are hard to make while the dice can make them | adding three numbers to 18, making ten, planning | 10.7 | 12.8 | 14 |
| Add or times | 3 to 4 | Two dice together can also be multiplied | times tables with products to 12 | 9.5 | 11.3 | 12 |
| Add, take away or times | 4 | Two dice together can also be taken one from the other | choosing an operation, the difference of two numbers | 9.3 | 11.8 | 11 |

Choosing well matters least at the first level, where the maths is reading the dice, and most at the third, where random choices waste nearly twice as many throws (3.9 against 2.1).

## Fair and reproducible

A throw is a seeded function of the level's seed, the numbers still open and the throws in a row that fitted nothing. Each die is uniform over one to six, which a test checks over twenty thousand throws. The same moves rebuild the same throws, so a move log replays exactly, and taking a move back and throwing again gives the same dice, so a take-back cannot fish for a better throw. Each level's seed is the lowest whose shortest win is the median over the first hundred seeds, so it is a typical run of dice rather than one chosen for its figures, and no two twelve-number levels share one.

## The gate

A prover walks one run of dice, so it can prove that run and nothing about luck. The game has two gates. The prover walks the seeded round as it does every turn game, and its figures are the ones in the page's proof panel. The declared bounds for that proof are the ranges over the first hundred seeds, not over the chosen one.

The second gate is `odds` in `shut.ts`, reported through the mechanic's audit so a level that fails it is refused in the page and in the tests. It is exact rather than sampled: it takes every set of open numbers (up to 4,096) and every way three dice can fall (56), and works out the expected throws smallest box first, since a throw that fits only ever leaves a smaller box. It checks that no box a child can reach is one no throw can ever shut, that good choices shut the box within the declared average, that nine games in ten finish within the declared number of throws, that random choices take at least the declared multiple of good ones, and that no throw offers more than 12, 17 or 21 moves at the three operations. A test works out the best expectation a second way, by walking the mechanic's own moves within every throw, and gets the same number to nine decimal places.

## What it asked of the shared code

Two small changes, both general. A handle may declare what a tap plays (`tap` in `src/engine/hands.ts`), which is how a tap throws the dice. And in the turn runtime, when a position offers exactly one move and no chip has the focus, Space or Enter plays it (`src/pages/play-turn.ts`), which is how Space throws.

## What is not done

Starting a level again gives the same first throw, because the seed belongs to the level; the throws after it follow what the child shut. A new seed for each attempt needs the address to carry the seed and a level's `round()` to take one, which is a change to the Games tab's shell.

The odds figures are in the tests and here, not in the page's proof panel, which shows the prover's figures for the one seeded run. Showing them would need an optional list of figures on a round.

The guide's nudge after twenty seconds uses the seeded graph's distances, so it points at the fastest move for the dice this seed will throw, which a child cannot know. A nudge from the odds would point at the best move on average.

It was played by mouse and keyboard in headless Chrome, not by a child and not on a tablet.

## Sources

- Clements, D. H. (1999). Subitizing: What is it? Why teach it? *Teaching Children Mathematics* 5(7), 400 to 405. doi:10.5951/TCM.5.7.0400
- Anobile, G., Castaldi, E., Moscoso, P. A. M., Burr, D. C. and Arrighi, R. (2020). "Groupitizing": a strategy for numerosity estimation. *Scientific Reports* 10, 13436. doi:10.1038/s41598-020-68111-1
- Subitizing, Wikipedia: https://en.wikipedia.org/wiki/Subitizing
- Siegler, R. S. and Ramani, G. B. (2008). Playing linear numerical board games promotes low-income children's numerical development. *Developmental Science* 11(5), 655 to 661. doi:10.1111/j.1467-7687.2008.00714.x
- Ramani, G. B. and Siegler, R. S. (2008). Promoting broad and stable improvements in low-income children's numerical knowledge through playing number board games. *Child Development* 79(2), 375 to 394. doi:10.1111/j.1467-8624.2007.01131.x
- NRICH, Shut the Box: https://nrich.maths.org/problems/shut-box
- NRICH, Two Dice: https://nrich.maths.org/problems/two-dice
- NRICH, Nice or Nasty: https://nrich.maths.org/problems/nice-or-nasty
- Gauvrit, N. and Morsanyi, K. (2014). The equiprobability bias from a mathematical and psychological perspective. *Advances in Cognitive Psychology* 10(4), 119 to 130. doi:10.5709/acp-0163-9
- Lecoutre, M.-P. (1992). Cognitive models and problem spaces in "purely random" situations. *Educational Studies in Mathematics* 23(6), 557 to 568. doi:10.1007/BF00540060
- Shut the box, Wikipedia: https://en.wikipedia.org/wiki/Shut_the_box

# Built since: the sheepdog, the fishing and the paper plane

Status: built in the scratchpad, September 2026, and played on the Games tab as action games (`play.html?g=herd`, `?g=fish` and `?g=plane`, each with `&v=` for the level). The games are `scratchpad/src/play/herd.ts`, `fish.ts` and `plane.ts`, the scenes they share are composed by `scenery.ts`, the drawings they added are in `src/art/playfield.ts`, and the tests are in `test/games.test.ts`. What the engine gained for them is in [engine.md](engine.md), under "Pieces a game is assembled from".

## Why the first three were replaced

Three action games were added before these, a rocket to land, a peg board to drop balls through and a see-saw to level from a crane, and the owner found them broken and not interesting, next to the slingshot, the road and the bead string. We looked at what went wrong so it would not happen again, and found four things.

The scenes were empty when the owner played them: the drawings the games asked for were not yet in the catalogue, and the field skips a drawing it cannot find without saying so. A test now draws every frame of every new game over a minute of play and fails on any drawing that is not on the shelf.

The fields did not fit the screen. The peg board's world was eight squares wide and twenty-two tall, so on a tablet held sideways it was a strip 224 pixels wide, and the rocket's world was taller than its view with the camera starting at the top, so the ground and the pad were off the screen. The new games are drawn in landscape worlds of 36 to 40 squares by 22 to 25, with the plane's world going on sideways past the view.

Each was a physics toy with the maths beside it rather than in it. Landing the rocket was fiddly for a five year old, and its maths repeated the road's number line; where a ball lands on a peg board is chance, so the child does not choose the answer; and the see-saw's rule is good grade four maths, but moving a hook, dropping a rod and waiting for the plank is a slow verb.

And the drawings were diagrams on bare squared paper, where the games the owner liked stand in a place: the slingshot on its grass, the road between its firs and houses. The new ones are each a place composed from the shelf.

The eleven drawings the three games added stay on the shelf, because the owner liked them as covers in the games drawer; the code, the levels and the lines in the list of games are gone.

## The concepts weighed

We looked for the strongest verb, the most natural maths and the best use of the shelf, and weighed these.

| Concept | The verb | The maths | The shelf | Verdict |
|---|---|---|---|---|
| Sheepdog: drive a flock into pens | run a dog with a finger, and the sheep scatter, bunch and turn | counting, splitting ten, sharing equally, grouping with a remainder | the farm: barn, windmill, cottage, trees, the dog, hurdles | chosen: the verb is fun with no maths in it, and the pens are the sum |
| Fishing: weigh a catch | put a hook where a fish will take it, and swing the catch onto a scale | number bonds, adding three numbers, grams and kilograms, decimals, reading a dial | the harbour and the sea: jetty, boat, lighthouse, ship, reef, starfish, octopus, turtle | chosen: which fish to let near the hook is the addition |
| Paper plane through hoops at heights | hold to climb, let go to glide | where a number is on a line: to ten, to a hundred in tens, fractions and decimals from nought to one | the paper plane from the map, and four worlds seen from the air | chosen: the steering is the answer, and the scenery is the shelf's worlds |
| Pinball whose bumpers must total a number | flippers | adding to a total | little: a table would have to be drawn | not chosen: where a ball goes is mostly chance |
| Bowling, where the pins left standing are a subtraction | aim and roll | taking away from ten | little | not chosen: a child cannot choose how many fall |
| Mini golf on squared paper | pull back and let go | distance in squares, angles of a bounce | little: a course would have to be drawn | not chosen: the same verb as the slingshot, and the maths is a readout |
| Hot-air balloon dropping sandbags | drop a bag, fire the burner | mass against height | the balloon | not chosen: a slow verb, and the rule is invented |
| Marble run whose ramps route a marble | flip switches, then watch | a function machine as a route | little | not chosen: a puzzle with a film at the end |
| A tower stacked to a height | swing and drop | adding to a height | rods, the crane | not chosen: the maths is in choosing the rod, not in the drop, and it repeats the fishing's sums |
| Marbles knocked out of a ring | flick | adding to a total | balls, the ground | not chosen: the slingshot's verb again, and the sum repeats the fishing's |
| Darts or bean bags on a ringed target | aim and throw | doubles and trebles | the target | not chosen: aiming is too fine for a five year old, and darts are not a thing to put in a child's hands |
| The rocket, the peg board and the see-saw rebuilt | as before | as before | as before | not rebuilt: for the reasons in the section above |

## The sheepdog (`herd`)

The child runs the dog, with a finger held on the meadow, the arrow keys, the pad beside the field or a gamepad's stick, and a ring shows where the dog is running to. The sheep do what sheep do: each keeps out of the dog's way, keeps near the others and goes the way they go when it is frightened, and grazes on a wander of its own when it is left alone, so a flock can be driven, split and turned, and one sheep can be cut out of it and driven through a gate. Pens stand along the top of the meadow behind one fence, with a gap at each gate, so a flock is never lost behind them. A frightened sheep standing right in front of an open gate with the dog behind it is funnelled through, as a real gateway funnels a driven sheep, without the rest of the flock pouring in after it; and a dog that goes into a pen, past its gateway, lets out the sheep nearest the gate, which goes round the dog's side and out, one at a time for as long as the dog stays, so a pen with one too many can always be put right and the child sees which sheep is going. A calm sheep keeps to the back of a pen it is in and below the fence when it is out, so a pen that is right stays right until the dog comes. The round is won when every pen is right and everything has stood still for a little over half a second with the dog out of every pen; then the gates swing shut, the penned sheep hop, a star sticker lands on each pen and the camera leans in on them.

| Level | Grade | What the child does | The maths |
|---|---|---|---|
| Five in the pen | 1 | Eight sheep, one pen with 5 on its board | counting to five, one more and one less |
| Seven and three | 1 to 2 | Ten sheep, pens with 7 and 3 on their boards | ten split into two parts |
| The same in each | 2 to 3 | Twelve sheep, three pens with no boards, the same number in each | sharing equally, twelve divided by three |
| Four to a pen | 3 to 4 | Fourteen sheep, four pens with 4 on their boards, as many pens full as the flock will fill | grouping in fours, and two left over |

The sheep, the dog and the fences are bodies in planck's world with no gravity, stepped at sixty a second, and each sheep steers by `engine/motion/steer.ts` from a seeded generator. The scene is the farm from the shelf: a line of firs and trees on the skyline with the barn, a cottage, an apple tree and the windmill, the sun and clouds going over and geese crossing, a meadow of tufts, clover and daisies, the pens and their fence, flowers along the bottom, and dust where the dog runs.

## Gone fishing (`fish`)

The child fishes from a little sailing boat, with a child from the kit sitting in it holding a rod. A finger held on the water puts the hook there, the boat sails along to it and the line lets out or reels in, and the arrow keys, the pad or a gamepad do the same. Fish swim across at their own depths, each with its weight on a tag and each kind in a lane of its own, the light ones near the top and the heavy ones near the bed, and a fish that passes near the hook in its own lane, once the hook hangs still, turns to look and takes it, so a hook let down past the other lanes is not taken on the way, and how deep it is held chooses the kind of fish that can take it; the float dips, the fish is reeled up wriggling, and it flies up out of the water in an arc onto the pan of the scale on the jetty, whose needle swings round to the new weight. The scale's pan takes two or three fish, and the round is won when it is full and reads the weight marked in red on its rim. A full pan that reads anything else is thrown back from, with the Take that back button, Backspace, or `back()`, and the fish swims off; nothing bites while the pan is full, so the child chooses what to put back. When the round is won a star sticker lands by the scale and the camera leans in on it.

| Level | Grade | The sea and the pan | The maths |
|---|---|---|---|
| Two that make ten | 1 | fish tagged 2 to 8, two 5s; the pan holds 2; the dial goes to 12 | bonds to ten |
| Three that make twenty | 1 to 2 | fish tagged 3 and 5 to 9, two 6s and two 7s; the pan holds 3; the dial goes to 24 | adding three numbers to twenty |
| One kilogram | 2 to 3 | fish of 100, 250, 300, 400, 500 and 600 grams, two 250s and two 300s; the pan holds 3; the dial is in grams to 1200 | grams and kilograms, reading a dial between numbers |
| Two and a half kilograms | 3 to 4 | fish of 0.25 to 1.5 kilograms in quarters, two each of 0.5, 0.75 and 1; the pan holds 3; the dial is in kilograms to 3 | adding decimals |

A pan filled with any fish at random makes the weight at most one time in five at any level, which a test works out exactly over every pan the sea could give. The scale is a new drawing, `catchscale`, because the kitchen dial on the shelf is drawn for a lesson's size and its numbers cannot be read at a game's; it is drawn again as its needle swings (a `live` sprite). The scene is the harbour and the sea: the jetty with the scale and a gull on its post, the sun, clouds and gulls going over, a ship sailing far out and the lighthouse on its rock, the sea drawn in lengths with its weed and sand, the reef, a starfish, a crab going back and forth, the octopus under the jetty and now and then a turtle, with bubbles from the reef and splashes where a fish leaves or meets the water.

## The paper plane (`plane`)

The plane is the paper plane the map flies. It flies on by itself; holding a finger anywhere on the sky, the big button, the space bar or the up arrow lifts it, letting go lets it glide down, and the brake button or the down arrow dives. A climb costs it speed and a dive gives it back, and it leaves a line of dots behind it in the pen's ink. Poles stand along the way, each marked from its foot to its top as a number line, with three hoops hung at different heights and a flag at the top that says which height to go through. Through the right hoop, it lights and a star goes on the pole; through another, the sentence says what height that hoop is at and what the flag says; past them all, it says roughly what height the plane was at. The course goes round, so a flag missed comes round again, and a row of star slots in the corner fills as the flags are done. When the last one is done the plane loops the loop.

| Level | Grade | The poles | The flags |
|---|---|---|---|
| Up to ten | 1 | 0 to 10, every number written | 7, 4, 9, 2, 6, 3 |
| Tens to a hundred | 2 | 0 to 100 marked in tens, with 0, 50 and 100 written | 70, 30, 90, 20, 60, 40 |
| Halves, quarters and eighths | 3 | 0 to 1 in eighths, with 0, a half and 1 written | 3/4, 1/4, 3/8, 7/8, 5/8, 1/2 |
| Tenths | 4 | 0 to 1 in tenths, with 0 and 1 written | 0.7, 3/10, 2/5, 0.9, 1/2, 0.1 |

At the harder levels the flags are written in more than one way on the same pole, three quarters as a mark in eighths and two fifths as a mark in tenths, so equivalent fractions and decimals are where the hoops are. Each level is a world of the shelf's seen from the air, in layers that move by their depth: the meadow (firs, a windmill and trees far off, cottages, a barn and sheep nearer, flowers passing in front), the harbour (a lighthouse and ships far off, boats, a ferry and a jetty nearer, the sea below, where a plane that skims it splashes), the mountains (the peaks, firs in snow, a tent and the observatory, and an eagle crossing) and the town (houses and the clock tower far off, the station, the bandstand and the library nearer). The poles and the hoops are new drawings, `scalepole` and `hoop`, and a hoop is drawn in two halves so the plane passes between them.

## What holds them to the promise

An action game has no position graph, so each is held by named invariants and a seeded replay in `test/games.test.ts`, as the first three were. For the sheepdog: a pen with a board is right only with that many in it, and says how far off it is; a pen with one too many can be put right, since a dog that goes into the pen lets out the sheep nearest the gate, one at a time, and a dog at the gate lets nothing out; the same in each wants every sheep penned and every pen equal, and four to a pen wants fours and no more pens than the flock can fill; a round is won when the pens are right and everything settles, and the shut gates hold what the child made; a pen that is wrong is never won, and sheep left alone do not wander into a pen; the dog and the sheep never leave the meadow whatever the hands do; the dog drives the flock away from itself; and the same hands give the same flock. For the fishing: every level's weight can be made with the pan's number of fish from its sea; no pan hides a dead end, since whenever the fish on a pan could still be made up to the weight, a fish that does it is still in the sea; the scale reads the sum of the fish on its pan; a full pan that is not the weight never wins, nothing bites while it is full, and throwing back always makes room, so the round can always be won; random fishing seldom makes the weight; and the fish keep to the water, with the same hands giving the same sea. For the plane: the hoop at the flag's height counts, a hoop at another height never does, and every flag done wins; every flag is a mark on its pole and every hoop hangs within the plane's reach; a flag missed comes round again, and a plane left to glide skims the grass and loses nothing; and the same presses fly the same path. Under reduced motion, which each test also checks, a press is a step of the dog, the hook or the plane, and what it started is drawn once it has come to rest.

Nothing is timed as pressure in any of them: sheep graze, fish swim round and the course goes round for as long as a child takes, and there is no count carried from one round to the next. The copy a child reads is written sentence by sentence, with no exclamation marks.

## What is not done

All three were played through every level with the mouse held on the field in headless Chrome, by a script reading the sprites back, and not by a child or on a tablet. The sheepdog's flock is tuned by eye for a finger on a tablet, and the numbers are in its tuning table to be turned when children play it. The fishing's sea is the same sea every time a level starts, since its seed belongs to the level, as shut the box's does. And the plane's levels are fixed lists of flags; a level drawn from a range of flags, checked for the same invariants, would make it a family of rounds rather than one.


---

# Built since: the jugs, the balance and the rule machine

Status: built in the scratchpad, September 2026, and played on the Games tab (`play.html?g=pour`, `?g=weigh` and `?g=rule`, each with `&v=` for the level). The games are `scratchpad/src/play/pour-hands.ts`, `weigh-hands.ts` and `rule-hands.ts`, the drawings they added are `worktop`, `rulemachine` and `numberball` in `src/art/`, and the tests are in `test/games.test.ts`. What the engine gained for them is in [engine.md](engine.md), under "A move as a beat".

## Why

The owner found the puzzles and hands-on games beautiful and thin next to the action games, and asked for them to have the action games' quality, control, levels and mechanics. An audit played all eleven through several levels at 1024 by 768 and at 1440 by 900 and found six things. Every board was a diagram on grid paper rather than a place. A move landed as a glide or a morph with no weight, so nothing fell, tipped, poured or bounced. The balance's beam said only which side was heavier, so it could not guide a search. Every finish was the same star and a count of moves. The ladders were two or three levels, and the rule machine's three levels were one rung with a different answer. And at 1024 by 768 shut the box ran off the bottom of the screen. We rebuilt the three games the change helped most, the jugs, the balance and the rule machine, the last so that the puzzle path is proved as well as the hands-on one; fixed shut the box; and wrote a plan for each of the other eight, at the end of this document.

The action games set the bar, and each flagship was held to it the same way: a verb that is fun on its own, motion with weight, a whole scene from the shelf, a level ladder where each level adds something, and a finish that feels earned. The model stays the source of truth throughout. A move is made in the model at once, the words and the tray change at once, and the beat that shows it happening ends exactly on the scene of the new position.

## The jugs (`pour`)

A jug is picked up by its handle and hangs from the hand, swaying as it is carried. Put down on another jug, it is lifted over that jug's mouth, tips on its spout and pours: a stream as wide as it is running falls into the other jug, with splashes where it lands, and the water in the two jugs falls and rises together until one of them stops it, which is the subtraction the child is doing. Then the jug tips back and is thrown home to its place, where it lands with a knock and a puff of dust. Held under the tap, a jug is set in the sink, the tap runs and the jug fills; put on the flowers, it is tipped out over them from the back of its rim. A jug with nothing to give, or one that is already full, is refused in a sentence, and a move played from the tray plays the same beat from the jug's place.

The scene is a kitchen: a long worktop with tiles, cupboards and a sink, the tap on the wall over the sink, the flowers at the end, and the order taped to the wall, which is the goal on the board. The worktop is a new drawing, `worktop`, drawn to any length; the hand-drawn kitchen counter on the shelf, scaled to the width of the board, made its kettle bigger than the jugs.

| Level | Grade | Positions | Shortest win |
|---|---|---|---|
| 500 and 300, measure 200 | 2 to 3 | 14 | 2 |
| 500 and 300, measure 100 | 2 to 4 | 14 | 4 |
| 5 and 3, measure 4 | 3 to 4 | 16 | 6 |
| 7 and 3, measure 5 | 3 to 4 | 20 | 8 |
| 900 and 400, measure 600 | 3 to 4 | 26 | 8 |
| 1 litre and 300, measure 100 | 4 | 24 | 6 |

The first three are the levels the jugs had, at the same indices. The three added take the classic to more pours, and to scales read in hundreds of millilitres and against a litre. A level with three jugs offers more than the eight moves a position may, so there is none, and the cap stays at eight.

When the order is made, the jug holding it rings, sparkles out of its water with a ring round its level, and hops; the order on the wall is ticked, and the star lands over the jug.

## The balance (`weigh`)

The mechanic's board now says how far the beam leans, not only which way. The lean is half the square root of the difference in weight, up to the drawing's steepest, so a difference of one already shows and each more shows a little less, and a child can tell nearer from further. The prover's graph is unchanged, because a lean is part of the picture and not of the position's key.

A thing to weigh is carried from its basket and sways from the hand. Let go over a pan, it is carried over the pan and drops in with its weight, squashes as it lands and knocks the pan, and from that moment the beam swings, leaving with the knock's speed, overshooting and settling at its new lean, with everything in both pans riding their pans as they go. A thing taken out is thrown back to its basket, and the beam swings as it leaves. A move from one pan to the other is one carry.

The scene is the market stall from the shelf, with the balance standing on the ground in front of it, drawn a third bigger than its own box so it holds its own there, the things to weigh in two baskets either side, and a card taped over the stall's sign that says to make it level.

| Level | Grade | What it adds | Positions | Shortest win |
|---|---|---|---|---|
| One pan to load | 1 to 2 | a cube to match with balls and stars in the right pan | 15 | 3 |
| Either pan | 2 to 3 | both pans may be loaded | 134 | 3 |
| Two cubes | 1 to 2 | two cubes to match, with apples, balls and stars | 41 | 3 |
| No stars | 2 to 3 | only apples and balls, so an odd weight has to come from an apple | 19 | 3 |
| Nothing matches the cube | 2 to 3 | nothing in the baskets makes the cube on its own, so a ball goes in with the cube | 36 | 3 |
| Pans that hold three | 3 to 4 | three things to a pan, so both pans are loaded | 50 | 4 |

The first two are the levels the balance had, at the same indices, so the Experience tab's link to `?g=weigh&v=0` opens the same level. In the last two, every win uses the left pan.

When the beam is level, sparkles come from its pivot, everything in the pans hops from left to right, the card on the stall is ticked, and the star lands over the pivot.

## The rule machine (`rule`)

The numbers to feed are balls in a basket, and the rules are cards pinned up over the machine. A ball dropped into the hopper, or tapped, falls in; the lever pulls and springs back, the cogs turn once and the machine shakes, and a ball with the answer comes out of the chute, rolls down it and is thrown up into the next row of the table. A card posted into the slot on the machine's roof slides in out of sight, the machine works once more, and its panel shows the rule. When the card is the machine's rule, the bulb lights and the rule is written into the table; when it is not, the panel shows the rule the machine was using and the round ends, as it did before. A card posted before anything has been fed is refused in a sentence. It stays a puzzle: the tray is as it was, and nothing on the board changes the question, which is which number to feed.

The machine is `rulemachine`, drawn for this with its hopper, cogs, lever, chute, roof slot, panel and bulb, and the balls are `numberball`. They stand on the ground with the basket and the in and out table.

| Level | Grade | What it adds | Positions | Random play wins |
|---|---|---|---|---|
| The first machine | 3 to 4 | nine cards, and 1 to 4 to feed | 151 | 11.1% |
| The second machine | 3 to 4 | the same cards, another rule | 151 | 11.1% |
| The third machine | 3 to 4 | the same cards, another rule | 151 | 11.1% |
| Three numbers to feed | 3 to 4 | only 2, 3 and 4 to feed, and the machine's rule gives the same as another card for 2 | 71 | 11.1% |
| Twelve cards that agree | 4 | twelve cards in pairs and threes that give the same answer for some number, and a rule that shares an answer with another card at every number there is to feed | 196 | 8.3% |
| Twelve cards, and no 1 | 4 | the same twelve cards, with 2 to 5 to feed | 196 | 8.3% |

Every level's shortest win is two moves, a number and a card. The first three levels were one rung with a different answer, and they stay where they were. Each of the three added changes what choosing a number is about: fewer numbers, cards that agree, and the 1 taken away, where 5 is the number that tells the most cards apart. Every answer of both sets of cards keeps the promise, not only the one each level uses, which we checked in node.

When the rule is found, the machine lights, hops on its legs with dust from its feet and sparkles from its bulb, and the star lands over the bulb.

The owner later found a card whose rule ran past its right edge, "× 3 − 1", with the rule crowded against the pin. Our first fix widened the card and put the rule on a second line, which left it about 12 pixels tall in a corner of an otherwise empty card, so the owner asked for the rule to be the card's main thing. The shared `pinned` drawing now takes a text size and a centred alignment, with its defaults the old size and the old left alignment, so no lesson's card changed and its shelf takes render as they did. The rule machine's cards are ten squares wide with the rule as one centred line in the body below the pin, at 34 of the drawing's pixels, which is the largest size that leaves the longest rule, "× 2 + 1", a square of margin each side; drawn at 9.2 squares across, five fit a row of the board, and the twelve-card levels take three rows of four, which end a square and a half above the machine's roof. On screen the rule is about 22 pixels tall at 1024 wide and 27 at 1440, against the tray's numbers at 21. A sweep of every game and level at 1440 and 1024 wide found no other text cut off inside a drawing: the road's kerb numbers, the paper plane's top mark and Cast's smallest tag run a few pixels past their drawings' boxes and still show in full.

## What holds them to the promise

Every level is gated by the prover, as before, and the three games' tests add four checks. Every move from the first positions of every level plays a beat that starts on the scene before it and ends exactly on the scene after it, with the finish played after a winning move. The same moves give the same beats, and another seed changes how a move looks and nothing about where it ends. The balance's lean grows with the difference and is level only when the pans balance, and the pans the props are laid in are where the balance drawing puts them at every lean. And every ball and card on the rule machine's board plays only the mechanic's own moves, with a ball or a card for every move the tray offers.

Every level of the three was played to a win in headless Chrome with the real mouse, along the prover's shortest way: jugs and props dragged, balls tapped and cards posted, with the page checked after each move to read the position the move should make. The first level of the jugs and of the balance were also played with the keyboard's hand on the board alone. Each of the three fits at 1024 by 768, 1180 by 820, 1440 by 900 and 390 by 844, at every level, with nothing below the fold.

Nothing is timed as pressure, and no count is carried from one round to the next. Under reduced motion a move is drawn once, at rest, with its sounds. The copy a child reads (the hints, the refusals and the line the guide says as each level opens) is written sentence by sentence, with no exclamation marks, and the opening lines say what the level is without saying how to win it.

## What is not done

The three were played by a script, not by a child, and not on a tablet, and the beats' timings were set by eye. We have not measured a beat's frame cost. Taking a move back glides the board back, as it did, rather than playing the move's beat backwards. The guide's opening line is shown under the goal and is not spoken. The pour tips the water with the jug, because the jug drawing draws its level square to its own sides; a jug that kept its water level while it tipped would need the drawing to take an angle.

# Shut the box: the fix, and its plan

At 1024 by 768, on the fifth level, a throw of three dice offered up to seventeen moves, and the tray beside the board laid them out as rows of chips taller than the window, so the page scrolled. On a phone held upright the same happened at every level but the second, because the board was sized before the tray under it was drawn for the new throw. Both are fixed in the Games tab rather than in the game, so every turn game has the fix. A tray of more than ten moves packs its chips closer, each still at least forty four pixels (`.tray.dense` in `play.css`), and on a phone every tray is packed that way. The board is sized after the tray is drawn, so on a phone it takes the room the tray leaves, and if the page still runs past the window, which the floor on the room a board is given allowed at the first level, the board gives up what it overflows by. Every level now fits at the four sizes above, before a throw and after one.

The plan for its upgrade is shake and throw. The dice sit in a leather cup at the side of the box. Holding the cup, or the Throw key, shakes it, and the dice rattle inside with the cup's sway and a knock on each rattle; letting go, or flicking, throws them onto the felt. They fly on a lob, land and bounce along the felt with the drop piece, and tumble through faces that sit side by side on a real die, which a test already holds. The tumble is chosen backwards from the faces the model's seeded throw has already decided, so the last quarter turn of each die shows its face and the animation never decides anything. A number is shut by its tile turning down on its hinge, a turn about the hinge with a knock and a puff of dust. The box stands on the kitchen worktop. The ladder keeps its five levels, which the odds gate holds, and could add a sixth in which one die is thrown once 7, 8 and 9 are shut, a common house rule the odds analysis would need to cover. The finish is the lid closing over the shut tiles with a clap and sparkles out of the seam, and the dice rolling back into the cup. Size: medium, a cup drawing and a beat for each kind of move in `shut-hands.ts`.

# Plans: the other eight

These plans are superseded by "Build briefs: the other games" at the end of this document, which rebuild each game to the slingshot's bar rather than adding a beat to its moves. They are kept for the reasoning behind them.

Each plan below is written against the runtime in [engine.md](engine.md), under "A move as a beat", and can be built from it as the three flagships were: a scene composed from the shelf, a beat for each kind of move that ends on the next position's scene, a finish, an opening line for each level, and new levels appended so no index changes, each checked by the prover before it ships. A size says what a game needs beyond that. Small is a scene and beats in the binding the game already has, about the size of `rule-hands.ts` at 255 lines. Medium adds one or two drawings or a change to what the hands pick up. Large adds a change the prover has to check again, such as a new track. Shut the box, the eighth, is in the section above.

## Spell the picture (`spell`)

Superseded: the game is rebuilt as the Sound train; see "Spell the picture (`spell`), rebuilt as the Sound train" at the end of this document. The plan follows as written.

The verb is to pick a letter tile out of a rack and drop it into the next box, where it lands with a click and its sound is said; a tile aimed at a later box slides along into the next one, so the hand cannot be wrong where the tray is not. The scene is a school desk with a wooden letter rack, the sound boxes on a card, and the picture propped against a pencil pot. The ladder keeps its four levels and adds a word with a sound spelled by two letters on one tile, then a word of five sounds. The finish is the picture coming to life with its own idle motion from `animation.ts`, and the tiles hopping in order as their sounds are said again. Size: medium, a tile drawing with a letter setting, `settle` taught to leave a copy of a tile in the rack, and a binding; it can stay a puzzle with a board, as the rule machine did.

## Land on the number (`jump`)

The verb is the aim it has, a pull back from the rabbit to where the card would land, and the let go: the rabbit crouches, leaps on a lob over as many ticks as the card says, lands with a squash and a puff, and the card flips over onto the discard pile. The scene is a meadow path of stepping stones from `scenery.ts`, with the number line along the stones and a burrow at the target. The ladder keeps its two levels and adds 0 to 50 in fives, 0 to 2 in tenths, and minus ten to ten with three cards that go backwards. The finish is the rabbit hopping into the burrow and its ears coming back up, with sparkles from the burrow. Size: small, since the aim and the arc exist.

## Shunt the carriages (`shunt`)

The verb is a push along the rail with weight: a carriage rolls on after a flick and slows, as it does now, knocks into the one ahead with a knock that runs along the coupled train, each carriage taking a small kick, and bumps the buffer at the end. The scene is a goods yard with a signal (`railsignal`), a platform lamp and a goods shed. The ladder keeps its five levels and adds six carriages with room for three, which needs its branch checked against the cap. The finish is the signal dropping to clear and the engine whistling and pulling the ordered train out of the yard and back. Size: medium, beats for the couplings and the departure, and a shed drawing.

## Make the amount (`pay`)

The verb is to slide a coin across the counter: it skids with the hand's speed and spins down to rest face up, a note flutters down, and a coin taken back slides home. The scene is the shop front from the shelf (`shop-front`) with the till on its counter and the price on a tag. The ladder keeps its three levels and adds exact change for a note, and the fewest coins for 99 cents. The finish is the till drawer ringing shut, a receipt curling out, and the coins dropping into the drawer. Size: medium, a receipt drawing and beats for the slide and the spin.

## Take the corner (`race`)

The verb is the aim it has, the car's next speed chosen on the ring of cells it can reach, and the let go: the car drives the move with its nose along its path, leans into the turn, leaves tyre marks and dust, and pitches forward when it brakes. The scene is the circuit seen from above on grass, with the grandstand (`grandstand`) and flags, and cones on the chicane. The ladder keeps its four levels and adds a hairpin and two laps of the ring. The finish is a chequered flag, a lap of honour at the car's last speed, and sparkles on the line. Size: large, because a new track needs its positions and its branch checked against the prover's caps, which the ring already comes close to at 1,470 positions.

## Share it out (`share`)

The verb is to snap a piece off the whole, with a crack and a squash of what is left, and drop it onto a plate, where it bounces to rest and the plate wobbles; a piece taken back is lifted off. The scene is the birthday table from the shelf (`birthday-table`), with a person from the kit behind each plate. The ladder keeps its three levels and adds twelfths between four, and one and a half between three. The finish is each person lifting their plate once the shares are equal. Size: medium, beats for the snap and the drop, and a pose for the people.

## Stop on the line (`straight`)

The verb is to change speed by one and watch the runner go: a runner from `runners` leans forward to speed up and back to brake, strides as long as the speed, with dust at each footfall, and plants both feet with a squash on stopping. The scene is the running track with its lanes, the finish tape and the grandstand behind. The ladder keeps its two levels and adds 30 metres in threes and a stop on 64 in eights. The finish is the tape breaking and a medal (`medalrow`) dropping onto the runner. Size: small, since the lanes and the aim exist.

# Built since: one direction for every game

Status: built in the scratchpad, September 2026. The penny shove (`play.html?g=pay`), and Cast (`?g=fish`), Rafts (`?g=herd`), Rabbit crossing (`?g=jump`), Row to the jetty (`?g=straight`) and Shunting yard (`?g=shunt`), built after it to the sharper bar, are played on the Games tab, each with `&v=` for the level. The see-saw (`?g=weigh`) and cut the cake (`?g=share`) were built with it and taken off the Games tab's list after the owner played them, for the reason under "The sharper bar"; they still open by their addresses and their activities' links, and their mechanics are being turned into interactive lesson items. The games are `.scratchpad/src/play/seesaw.ts`, `cake.ts`, `shove.ts` and `cast.ts`, the drawings they added are in `.scratchpad/src/art/gamepieces.ts` and `counter.ts`, the engine gained `engine/motion/lever.ts`, `cuts.ts` and `slide.ts`, and the tests are in `.scratchpad/test/games.test.ts`. What the engine and the page gained is in [engine.md](engine.md), under "One direction, and a field that fills the room".

## The owner's verdict

The owner found two games playable, the slingshot and the road, and the rest dull, without a mechanic a child can act on. This part records what we took from playing all seventeen again with real input at 1024 by 768 and 1440 by 900, the direction every game now follows, the games rebuilt to it, and a brief for each of the others.

## What the slingshot does

We played the slingshot until both levels were won, at both sizes, with a mouse dragging the ball. Six things carry it, and none of them is its art, which is squared paper, a strip of grass and some rods.

The verb is direct and physical. One press on the ball and one pull back hold both the angle and the strength, and letting go is the whole decision. The goal can be read before anything is read: stars stand on towers, and a star on the grass is down. What happens has weight. Rods tip and roll, stars fall a different way each time, and the result is never quite the one aimed for, so a near miss is visible and interesting rather than a wrong answer. Control is one finger, and the arrow keys and space do the same. A try costs nothing: when everything has settled the next ball is in the sling, and the dots of the last two flights stay on the paper, so the next shot is a correction of the last one. And the maths sits inside the aim at the second level, where the angle and the pull are written on the arc as it is pulled.

Playing it also shows what it does not have. Its maths is thin, its field is a card of 640 by 350 pixels on a 1024 by 768 tablet with a pad of arrows beside it, and a long line of monospace text explains the keys. The direction below keeps the six things and fixes those three.

Its fourth level, "The stone wall" (27 September 2026), puts a wall of ten stone blocks welded where
they touch in front of two stars. The wall stands on its own, a soft throw knocks a join or two
loose, and a hard straight throw breaks it apart so the blocks fly into the stars. Each of its three
certified layouts is won by two throws on the keyboard's steps, held to the same aiming slack and
waits as the other levels. The rules version for "sling" is now `-wall-1`.

## Why the earlier rounds fell short

The first round replaced three physics toys with the sheepdog, the fishing and the paper plane. Each has a scene that reads well, and each has a verb that works through something else: the dog runs to a held finger with a lag, the boat sails to it and the hook waits for a fish to take it, and the plane climbs while a finger is down. The child mostly waits or chases, and the count or the weight happens beside the chase rather than in it.

The second round gave the jugs, the balance and the rule machine a beat, an animation played after a move is chosen. The move is still a choice among the moves the mechanic lists, so nothing the hand does changes an outcome by degrees, there is no near miss to learn from, and the tray of chips stayed on the screen as the way to play. The balance now drops its props into pans on a market stall, and it is still a question about which chip to press.

Both rounds kept every game in the same frame: a card of a few hundred pixels under a sentence, beside a column of buttons and a paragraph of help on the keys. A child's eye has to visit three places before it reaches the game.

## The sharper bar

The owner played the three games first built to the direction below and kept one: the penny shove is a game, and the see-saw and the cake are too simple to be called one. Playing them again shows why. In the shove the hand matters by degrees and does not fully control what follows. On the 65 cents level we pulled three quarters back 3.2, 3.6 and 4 squares along one line: the first two stopped short of the felt, the second knocked the first two squares further on, and the third stopped short itself while knocking the second onto the edge of the felt, which made the total 25 cents without the child putting a coin there. A later shot can finish or undo an earlier one, and which coin to send next depends on where the others lie and how many pieces the felt still takes, so a round is several moves of skill, consequence and choice, and a better hand does better. The see-saw has none of that: a bag let go anywhere over a step stands on that step, so once the child knows which bags balance the hand adds nothing, and the plank's swing shows the answer and never changes it. The cake has skill by degrees, since where the cut goes matters, but one set of cuts is judged on its own, nothing moves that the child did not move, and a try leaves nothing for the next one to work with, so it is a precision check rather than a game.

So the bar is the slingshot and the penny shove together, and a game has all four of these. The strength and direction of its verb matter by degrees, with a real chance of overshooting or falling short. Physics carries the result a little past what was controlled, so things slide, knock and tumble into each other, and the child reacts to what happened as well as to what was meant. A round is several moves, and each depends on what the earlier ones left. And a miss can always be recovered from, costs nothing, and rewards a better hand next time. A mechanic missing any of the four, however well it is drawn, is better as an interactive lesson item, and the see-saw and the cake have been taken off the Games tab's list and handed to that work.

## The direction

Every game is built to the same frame. The field takes the whole room under the Games tab's bar, with nothing beside it. The goal is a thing on the field rather than a sentence: a suitcase on one end of a plank, children waiting for cake. The sentence that states the goal is kept for a screen reader and is not shown. Over the top left of the field, in the hand font, is one short line about what just happened, and over the top right are the only buttons: take that back, start again, and next level once the round is won. The level picker and the games drawer stay in the bar, and the review drawer stays behind its button and the ` key.

Every game has one verb for one finger, whose strength and direction matter by degrees. A ball is pulled back and let go at a tower, and a coin is pulled back and let go along a counter. Keys do the same things, and the text form says where everything stands. There is no tray of moves to press.

What happens has weight and runs a little past what was meant: rods tip and roll, and coins slide and knock each other on and off the felt. A mistake is shown where it happened and in the terms of the task: a coin stops short of the felt, and the chalk total under the felt is not the price. Nothing is lost by a miss, a coin left behind the line goes back to its pile, and the last tries stay faint on the field, as the slingshot's dots do.

The finish happens in the world, and it is a different moment in each game: the last star rolls onto the grass, or a receipt slides out onto the counter. A finish carries nothing into the next round.

Scenes are drawn from the shelf in side view on the squared paper, with two or three drawings at the edges, a far and a near line of grass, and the things a child moves at least two squares across. The palette is the shelf's, with a wash only where the shelf already has one. Sound is the named cues: lift when something is picked up, bump when it lands, nope when a share is judged unfair, back when a thing goes home, and win at the finish.

Every action game is in the frame now, with nothing to set: the page fits the field to the room, grows the view to show more of the world round what the game asked for, and keeps the camera inside the world, as [engine.md](engine.md) describes under "One direction, and a field that fills the room". The slingshot joined the frame the same way, with sky laid over each level's play, more on the level shown zoomed out, so a tall window shows sky above the same towers rather than blank page.

## The verdicts

| Game | What the child does before the rebuild | Verdict | Redesign |
|---|---|---|---|
| Slingshot (`sling`) | pulls a ball back and lets go at stars on towers | the bar | keep, and move into the frame that fills the room |
| The road (`road`) | holds go and brake, changes lane round boxes, stops on a number | the right verb, with lanes and boxes that add nothing, drawn as a diagram from above | Park on the number: hold to drive and lift to stop, on a street in side view |
| Bead string (`snake`) | steers a bee to scattered numbers in order | a steering chore with no aim in it | replaced by Frog hops, on multiples and factors |
| Sheepdog (`herd`) | holds a finger for the dog to run to, and waits for sheep | a scene that reads well and an indirect, slow verb | replaced by Rafts, on counting and equal groups |
| Gone fishing (`fish`) | holds a finger to sail, lets the line out and waits for a bite | mostly waiting | built as Cast: pull back from the float and let go, and the first fish to reach the hook takes it |
| Paper plane (`plane`) | holds to climb through hoops at heights on poles | a good one-button feel, with tiny hoops and a reading of a pole in a busy scene | Parcel drop: tap to drop a parcel onto a field marked from 0 to 1 |
| Balance the pans (`weigh`) | drags props into pans, or presses chips | a choice with an animation after it | built as the see-saw, then taken off the list as a lesson item |
| Measure it out (`pour`) | carries a jug to another, or presses chips | the jug puzzle with water drawn well | Lemonade stand: tilt a jug to pour each glass to its order |
| Find the rule (`rule`) | feeds numbers and posts a card, or presses chips | a quiz with a machine drawn round it | Machine cannon: fling numbered balls into the machine to fill numbered baskets |
| Spell the picture (`spell`) | presses letter chips | a tray of letters | Word train: push letter carriages to couple in the order of the sounds |
| Land on the number (`jump`) | plays cards from a tray onto a number line | a tray of cards | replaced by Rod trough, on adding lengths and going below nought |
| Make the amount (`pay`) | drags coins from a drawer, or presses chips | a count with no act in it | built: the penny shove |
| Shunt the carriages (`shunt`) | presses in, out and round | a good puzzle drawn as a diagram | Flick yard: flick carriages so they roll, bump and couple |
| Share it out (`share`) | presses chips that say which plate | nothing to do but choose | built as cut the cake, then taken off the list as a lesson item |
| Take the corner (`race`) | drags the arrow to one of nine cells on a grid | a genuine mathematics game drawn as graph paper | a drawn circuit with the arrow pulled each turn and a bounce off hay bales |
| Stop on the line (`straight`) | presses faster, slower or hold | a thin puzzle that repeats the road | replaced by the first levels of the race |
| Shut the box (`shut`) | taps to throw, drags a die to a tile | chance and choice in a flat box | shake the cup and throw, and swipe a tile shut |

## The see-saw (`weigh`)

This game is off the Games tab's list and opens at `?g=weigh`. It is place-and-check rather than a game, as "The sharper bar" sets out, and its plank and `engine/motion/lever.ts` are going to an interactive lesson item.

A suitcase stands on one end of a plank on a pivot in a meadow, and bags of one to eight kilograms wait on the grass in front. The child presses on a bag, which lifts and swings from the finger by its handle, carries it over a step on the plank and lets go. The bag drops onto the step with a knock, the plank takes the knock and swings, overshoots and settles at a lean that grows with the square root of how far out of balance it is, so a difference of one kilogram one step out already shows and nearly level can be told from far off. Bags stand on each other on a step. A bag let go anywhere but a step falls onto the grass, bounces and walks back to its place, and a bag on the plank can be lifted off again. The arrow keys choose a bag and a step and space picks it up and puts it down. When the plank rests level with nothing carried, a robin flies in and lands on the middle of it, sparkles come from the pivot and the next level is offered.

At the first three levels every bag goes on one step, and the kilograms on each step are written over it in chalk, so the game is making seven or ten out of bags, which is bonds and adding. From the fourth level the steps are free and nothing is written: a bag further out turns the plank more, and the child finds that three kilograms four steps out balances six kilograms two steps out, which is the see-saw rule and the times tables as a fact about a plank.

| Level | Grade | The plank | The maths |
|---|---|---|---|
| Seven kilograms | 1 | a 7 kg suitcase on step 3; bags of 1 to 5 kg; step 3 on the right | bonds to seven |
| Ten, in two bags | 1 to 2 | a 10 kg suitcase on step 3; bags of 1, 2, 3, 4, 6 and 8 kg; two bags a side | bonds to ten |
| Both sides | 2 | a 9 kg suitcase on step 2; bags of 2, 3, 4, 5 and 7 kg on step 2 either side | both sides of an equals sign |
| Further out | 3 | a 6 kg suitcase on step 2; bags of 2 to 5 kg; one bag on any step on the right | factor pairs of twelve |
| Two to balance | 3 to 4 | a 5 kg suitcase on step 4; bags of 3, 6 and 7 kg, none of which does it alone | twenty as a sum of two products |
| Either side, any step | 4 | a 4 kg suitcase on step 5; bags of 1, 3, 5 and 8 kg; any step either side, two a side | turning effects on both sides |

The plank's rest, swing and knock are `engine/motion/lever.ts`, a bag's swing from the finger is `sway.ts`, and the robin's flight is `lob` in `flight.ts`. The plank is a new drawing, `seesawplank`, because the shelf's `plank` puts a step on every square, and scaled up for a game its lines and numbers thicken with it. The bags are the shelf's `masses`, the stand is `fulcrum`, and the scene is `hedge`, `cloud`, `flowers`, `arcade.ground` and `robin`. The six versions of `weigh.same-weight` open the levels nearest to them in their mathematics.

## Cut the cake (`share`)

This game is off the Games tab's list and opens at `?g=share`. It is a precision check rather than a game, as "The sharper bar" sets out, and its cake and `engine/motion/cuts.ts` are going to an interactive lesson item.

A long cake lies on the grass in front of the children who are to share it, with balloons tied by a hedge. The child holds a finger over the cake and the knife follows; letting go brings it down where the cut goes, with a knock and some crumbs, and the pieces part a little. The arrow keys move the knife and space cuts. Once there are enough cuts the pieces go along the grass, one to each child. If every piece is within a small distance of its share, the children lift their arms, the candles on each piece light, and sparkles come from them. If not, each piece is shown inside a dashed outline of the share it should have been, the line over the field says whether some were too big, too small or both, and after two seconds the cake goes back together with the cuts left as faint marks on the icing for the next try. A cut can be taken back before the pieces go.

The mathematics is where the cut goes. A half, a third or a sixth of the way along a length has to be judged by eye, and the distance a piece may be off shrinks as the levels climb, so a child who halves the cake at the first level is judging sixths by the fifth. The cake is long rather than round because the amount of cake then goes with its length, which is not true of a round cake seen from the side.

| Level | Grade | The cake | How far off a piece may be |
|---|---|---|---|
| Two | 1 to 2 | 20 squares, two children | 0.9 squares |
| Three | 2 | 21 squares, three children | 0.8 squares |
| Four | 2 to 3 | 24 squares, four children | 0.7 squares |
| A quarter has gone | 3 | 18 squares with a dashed outline of the quarter eaten, and three children who each get a quarter of the whole | 0.6 squares |
| Six | 3 to 4 | 24 squares, six children | 0.5 squares |
| The same as Ann's | 4 | Ann already has two sixths of a cake as long as this one, as two pieces; Ben and Cal each get the same, and the rest stays on the grass | 0.5 squares |

Cutting and judging are `engine/motion/cuts.ts`. The cake and the knife are new drawings: `longcake`, which draws any piece of the cake with its own candles and square cut ends, and `cakeknife`. The children are the kit's `person`, standing and then cheering, and the scene is `hedge`, `balloons`, `cloud` and `arcade.ground`. The three versions of `share.fair-shares` open the first, third and fifth levels.

## The penny shove (`pay`)

A counter seen from above has a wooden rim, a dashed line near one end and a square of felt near the other, with the price on a tag over the felt. The coins wait in full-size piles behind the line, each with a chalk count beside it, at their real relative sizes, a quarter two and a half squares across. The child presses on a pile, pulls the top coin back and lets go. A dashed arrow shows where it would stop if nothing were in its way, and the coin slides, slows and knocks any coin it meets, so a hard shove can put one coin on the felt and knock another off. The felt's total is written in chalk under it, with a row of small rings beside it, drawn whole, for the pieces the felt may hold. A tap on a coin lying on the counter sends it back to its pile, a piece that stops behind the line or across it goes home, and the rim keeps everything on the counter. The arrow keys choose a coin and set the strength, and space shoves it towards the felt. When the felt holds the amount in few enough pieces and everything has stopped, sparkles come from the felt, the ring sounds and a receipt slides out onto the counter with the total on it.

Which coins to send is the mathematics: making an amount, then making it in few coins, which means reaching for the big ones, and then the change from a dollar and a total over a dollar with notes. How hard to pull is the skill, and the arrow that shows where a shove will stop grows shorter as the levels climb, from the whole way at the first two levels to about a third of the way at the last.

| Level | Grade | The drawer | The felt |
|---|---|---|---|
| Ten cents | 1 | six pennies, two nickels and a dime | 10¢ |
| Twenty-five cents in three coins | 1 to 2 | five pennies, three nickels, two dimes and a quarter | 25¢ in at most three |
| 65 cents in four coins | 1 to 2 | three quarters, four dimes, three nickels and five pennies | 65¢ in at most four |
| Change from a dollar | 2 to 3 | the same drawer, for sweets of 48¢ paid for with a dollar | 52¢ in at most five |
| 99 cents | 2 to 3 | three quarters, three dimes, two nickels and five pennies | 99¢ in at most nine |
| $1.87 in seven pieces | 3 to 4 | two dollar notes, four quarters, three dimes, two nickels and four pennies | $1.87 in at most seven |

The coins and notes are bodies in planck behind `bodies.ts`, with no gravity and a damping that stands for the counter's friction, and the arrow's length is `slide.ts`, whose distance is exactly how far that damping carries a coin. The counter is a new drawing, `shoveboard`, in `.scratchpad/src/art/counter.ts`, and the pieces are the shelf's `prop.coins` and `money`, with `pricetag` and `receipt`. We first put the coins in the shelf's `till`, whose wells draw coins about a third of the size of a coin in the hand, and moved them to piles on the counter. A shelf take of the board draws a shorter counter between the line and the felt, through its `span` setting, so it fits a page. The three versions of `pay.make-the-amount` open the third, fourth and sixth levels.

We made three fixes after the owner played it, and kept its levels. The rings that count the felt's pieces were dashed like the rings round a target, and at their size the dashes read as a broken line at 1024 wide, so they are drawn whole, through a `solid` setting on the ring mark. On the last level five piles stood 4.6 squares apart and the dollar note's pile touched the rim, so a column too tall to keep a square and a half from the rims now closes up, and the piles of the other five levels have not moved. And a note could come to rest across the start line and stay on the counter, because its middle was over the line. A piece is now over the line only when all of it is, and one that stops across it goes back to its pile with "It stopped on the line, so it went back." Finding the third showed a fourth. The rim behind a pile stopped the hand's pull as well as the piece, so the note could be pulled back less than a square and a half and never reached the felt from its pile, and a coin pulled straight back got about two thirds of a full shove. The piece still stops at the rim, but the pull now goes on with the hand, as the keys' pull always did, so a full pull gives the full shove the tuning table describes. Whether the aim arrow stays the whole way on the first two levels is waiting on the owner.

## Gone fishing (`fish`), rebuilt as Cast

Built to "The sharper bar" once it was set, and played at `play.html?g=fish`. The harbour is in side view: a jetty on the left with a child from the kit holding the rod, the catch scale and a basket on the jetty, and the sea out to its bed with a reef and a starfish. Fish swim back and forth in lanes by weight, the light ones near the top and the heavy ones deep, each with its weight on a tag. The child presses at the float, pulls back and lets go, and the float flies on an arc whose first stretch is drawn in dots and lands where the pull sends it. The hook sinks from the float at a steady pace, a fish that sees it in its lane turns towards it, and the first fish whose mouth reaches the hook takes it, whichever fish that is. So a heavy fish deep down is reached only by landing the float where no lighter fish is swimming above it, and a good place at a bad moment catches the wrong fish. A bite dips the float, the fish is reeled up and swung onto the pan, and the needle swings to the new weight, while any fish near the hooked one swims clear of it. A fish on the pan is pressed to throw it back, and a hook that reaches the bed with nothing on it is reeled in with a tap. The round is won when the pan is full and the needle reads the weight marked on the dial; the bell rings, the catch is tipped into the basket a fish at a time, and the line says how much is in it. The arrow keys set the pull's strength and angle, space casts and reels in, and Backspace throws the last fish back.

Playing it with a real mouse showed all four parts of the bar. Where the float lands depends on the pull by degrees, and a cast a little long or short puts the hook in another fish's path. What bites is often not what was aimed for, since a lighter fish crossing above takes the hook first. Each catch changes what the pan still needs, so a 6 on the pan makes a 4 the fish to go for. And a wrong catch is thrown back at once, with nothing lost.

| Level | Grade | The sea | The pan |
|---|---|---|---|
| Two that make ten | 1 | fish of 2 to 8, with two 5s | two fish that make 10 |
| Three that make twenty | 1 to 2 | fish of 3 and 5 to 9, with two 6s and two 7s | three that make 20 |
| One kilogram | 2 to 3 | fish of 100, 250, 300, 400, 500 and 600 grams, with two 250s and two 300s | three that make 1000 grams |
| Two and a half kilograms | 3 to 4 | fish of a quarter to one and a half kilograms, with two halves and two of one | three that make 2.5 kilograms |
| Three that make fifty | 2 to 3 | fish of 5 to 30 in fives, with two 15s and two 20s | three that make 50 |
| A kilogram and a half in three | 3 to 4 | fish of 0.25, 0.4, 0.5, 0.6, 0.75 and 1 kilogram, with two halves | three that make 1.5 kilograms |

The first four levels are the old fishing's, at the same indices. We eased the fourth after play: with nine fish it took nineteen casts with a real mouse, and with one duplicate fewer and a longer aim preview, a simulated child who casts at random and throws back any pan that cannot make the weight needs a median of nine casts, as on the other levels. The float's flight is `flight.ts`, the needle's swing is a spring, a fish's turn to the hook is the steering in `engine/motion/steer.ts`, and the gull crosses by `scenery.ts`. The scene is the shelf's `jetty`, `catchscale`, `basket`, `person`, `fish`, `tackle`, `sea`, `coral`, `starfish`, `gull` and `cloud`, with no new drawing. It is held by named invariants and a seeded replay: every level's weight can be made with the pan's count from its sea, throwing back always makes room, a pan filled with any fish at random makes the weight at most one time in five, a cast lands where its arc says, the first fish to reach the hook takes it, the same casts give the same sea, nothing leaves the water but onto the pan or into the basket, and under reduced motion a cast is worked out to its bite or the bed. The old fishing, `fish.ts`, and its tests were deleted with it.

## Sheepdog (`herd`), rebuilt as Rafts

Built to "The sharper bar" and played at `play.html?g=herd`. A river runs across the view in side view between two banks, the flock waiting on the near bank at the left under a hedge, and one to four log rafts on the water, each tied to a post with a flag that carries its number, or no number where the rafts have to match. The child presses on the front sheep, pulls it back and lets go, and the sheep leaps on an arc whose first stretch is drawn in dots and lands where the pull sends it. A raft dips under a sheep and leans towards the end it landed on, and a raft loaded at one end leans until the end sheep slides off. Sheep on a raft stand in one layer: a sheep coming down on another's back drops into the gap the row opens for it, the row shuffling along the deck to make room, and one still up after a moment walks off the nearer end, or hops into the water if it is wedged. A sheep that lands short, long or off a raft splashes in, swims back to the bank and rejoins the flock, so nothing is lost, and a press on a sheep aboard takes it back. When every raft is still and carries its number, or the rafts match, the ropes are cast off and the rafts drift to the far bank, where the sheep hop off over the stile. The arrow keys set the pull's strength and angle, space jumps the next sheep, and Backspace takes the last sheep back.

The mathematics is counting and equal groups: a number on a flag, two numbers at once, the same on each raft with no number written, and so many to a raft with a remainder that stays on the bank. The skill is the pull, since a raft's deck is a few squares long and the pull sets both how far and how high. The first time a raft passes its lean its low end dips with a ripple and the sheep aboard look alarmed, which is the wordless lesson about balance, and the line "One end was heavier." is said once a round, the first time a sheep that stood on a leaning raft goes in.

| Level | Grade | The flock | The rafts |
|---|---|---|---|
| Five on the raft | 1 | eight sheep | one raft, flag 5 |
| Seven and three | 1 to 2 | ten sheep | a long raft with flag 7 and a short one with flag 3 |
| The same on each | 2 to 3 | twelve sheep | three rafts with no flags, the same number on each |
| Four to a raft | 3 to 4 | fourteen sheep | four short rafts, four to a raft, three filled and two sheep left on the bank |
| Five, three and two | 1 to 2 | ten sheep | three rafts with flags 5, 3 and 2 |
| Sixes from twenty | 3 to 4 | twenty sheep | three rafts, six to a raft, two sheep left on the bank |

The first four levels are the old sheepdog's, at the same indices. After the owner's round we asked for one layer of sheep, shorter rounds and the balance cue, and the fork's child simulation, a rough aim at the right raft with a thousand seeded rounds per level, gives medians of 6, 11, 15, 14, 12 and 21 jumps, with no round left unfinished in six thousand and no sheep on another's back longer than four seconds. Before the change the medians were 7, 22, 34, 59, 21 and 43, with rounds that never finished on four levels. The last level cannot reach fifteen, since three rafts of six from twenty need eighteen jumps, so its twenty-one is three over its floor. Played in headless Chrome with a real mouse at 1024 by 768, the six levels were won in 5, 10, 12, 12, 10 and 18 jumps with nobody in the river. The rafts are spaced so that a sheep landing between two always drops in, the fourth level's far bank moved two squares right to make room, and the stile stands in view at 1024.

The rafts and sheep are bodies in planck behind `bodies.ts`, which gained `pushAt` for the water's lift on a raft's ends, and the sheep bodies are upright, so a sheep never turns over on a deck. The jump is `flight.ts`, the drift to the far bank is `sway.ts`, and the tuning table holds the pull, the grip a sheep has on a leaning deck, the lean at which a raft dips, and how fast a raft settles. The scene is the shelf's `sheep`, `sea` in lengths as the river, `hedge`, `firs`, `stile` and `cloud`, with the raft, its post and its flag as a new `raft` drawing in `.scratchpad/src/art/river.ts`. It is held by named invariants and a seeded replay: every level can be completed from its flock, a raft is right only with its number and unnumbered rafts must match, sheep put on the rafts at random make every raft right at most one time in five, every sheep is always on a raft, in the river on its way back or on the bank, a loaded raft settles with its deck above the water and keeps the sheep laid on it, a raft carries one layer, a jump short lands in the river and one onto the raft stays, the same jumps give the same river body for body, and under reduced motion a jump is worked out to rest. The old sheepdog, `herd.ts`, and its tests were deleted with it.

## Land on the number (`jump`), rebuilt as Rabbit crossing

Rebuilt at the owner's asking, who liked the idea and found the game the dullest of the tab, and played at `play.html?g=jump`. A stream runs across a meadow in side view, with stepping stones standing in it at some of the numbers of a line marked along the water, the rabbit on the first stone and a carrot on the stone at the target. The child presses on the rabbit, pulls it back and lets go, and the rabbit hops on an arc whose first stretch is drawn in dots, as far as the pull says up to a longest hop. The longest hop is always a half, so a pull held at its longest never lands square on a stone, and every level needs at least three hops on its shortest route, which is where the mathematics is: hops that add up from stone to stone, and from the fifth level back past nought. A landing near a stone's edge wobbles, one nearer still tips the rabbit in, and a rabbit in the water swims back to the last standing stone on its path and climbs out, so only the hop is lost. From the third level some stones sink once the rabbit has hopped off them, so the way back closes as the way forward opens. The win line reads the route back as a sum, "From 0, on 5, on 5, on 3: the rabbit is on 13." The arrow keys step and sweep the pull, space hops and Backspace is not needed, since nothing is placed.

| Level | Grade | The line | The stones |
|---|---|---|---|
| 0 to 20, land on 13 | 1 to 2 | 0 to 20, every number written | 0, 3, 5, 8, 10, 13, 15, 18 and 20, the longest hop five and a half |
| -10 to 10, land on -4 | 3 to 4 | -10 to 10, from 5 | ten stones, the longest hop three and a half |
| Stones that sink | 2 to 3 | 0 to 30, fives written | thirteen stones, 5, 10, 15 and 20 sink once left |
| Only some numbers written | 3 to 4 | 0 to 50, only 0, 25 and 50 written | eight stones, the longest hop twelve and a half |
| Back past nought | 4 | -20 to 20, from 4 to -13 | fourteen stones, -8 and -3 sink once left |
| Tens to a hundred | 3 to 4 | 0 to 100, only 0, 50 and 100 written | eight stones, the longest hop twenty-seven and a half |

The first two levels keep the activity's two versions, so `jump.land-on` opens them. A simulated child with a rough aim needs medians of 5, 4, 8, 6, 4 and 6 hops, twelve random hops win at most one time in ten, and holding the longest pull every hop never wins. Played in headless Chrome with a real mouse at 1024 by 768 with a few pixels of noise on each pull, the six levels were won in 4, 4, 8, 5, 4 and 5 hops, six of those hops ending in the water and a swim back, and the first by keys in three. The hop is `flight.ts`, and the landing rule, the routes and the swim are in `rabbit.ts` with the tuning table `HOP`.

The art pass brought the camera in. The view is 32 squares wide over a world of 52, so at 1024 wide a square is 31 pixels, the stones and the rabbit are near three squares and the numbers on the stones read from arm's length, and the camera follows the rabbit along the stream with `camera.ts`, looking half the way towards the carrot so the next stones are in view, kept inside the world, and eased at two and a half a second; under reduced motion it stands where it would have settled. The clouds are on a far layer at half the camera's travel. The stones are a new `steppingstone` drawing in `.scratchpad/src/art/stream.ts`, a low dome with its number on a pale top, its underwater part seen faintly through the water, and a dark kind for the stones that sink, with the number written only where the level writes it, so a level that writes only the fives has blank stones between them; the prize is a `carrot`; a rabbit in the water is a `swimmingrabbit`, head and ears up with a wake; and `reeds` stand at the banks. The rabbit on a stone is still the shelf's `rabbits`, cropped to one. It is held by named invariants and a seeded replay: every level has a route of legal hops, and the stones that never sink alone join every stone to the carrot; a fewest-hops replay wins dry; landings stand, wobble, tip or fall by the rule at every stone of every level; a sunk stone never holds again; a wet rabbit swims back to the last standing stone on its path; twelve random hops win at most one time in five and the longest pull never; the same pulls give the same crossing; and under reduced motion a press is worked out to rest, dip included. The old number line by hand, `jump-hands.ts`, and its test were deleted with it.

## Stop on the line (`straight`), rebuilt as Row to the jetty

Rebuilt at the owner's asking as a steady two-oar drag where the rhythm of the strokes is the skill, so the tab does not fill with pull-and-release games, and played at `play.html?g=straight`. A river in side view, posts along the bank marked in metres, the boat at the start and a jetty, or on later levels a buoy, at the target. The child drags back through the water to drive the oars and brings the finger forward to recover, and the push of a drive follows the distance dragged, five squares being a whole stroke. The catch is judged against the time since the last drive ended: under half a second is rushed, splashes and keeps 0.4 of its push, and long after lets the boat slow first. Between strokes the boat glides, slowed by the water, and on later levels a current pushes it back while it waits. The bow has to come to rest touching the jetty: at 0.7 metres a second or slower it rests and the round is won, faster it bumps and comes back with half its speed, and oars still pulling at the jetty ram it. A buoy catches a gentle bow and lets a fast one pass, after which the child backs water, which a press that first drags forward does. A stop short is marked faintly on the water and said in metres, and the finish reads "The bow is touching the jetty at 100 metres." Space held is a drive on the keys and letting go the recovery, and the left arrow backs water.

| Level | Grade | The river | The finish |
|---|---|---|---|
| One hundred metres | 1 to 2 | 100 metres, a post every 10 | the jetty at 100 |
| Fifty metres in fives | 1 to 2 | 50 metres, a post every 5 | the jetty at 50 |
| Only some numbers | 2 to 3 | 100 metres, only 0, 50 and 100 written | the jetty at 100 |
| Against the current | 2 to 3 | 100 metres, the river pushing back | the jetty at 100 |
| The buoy on 64 | 3 to 4 | 80 metres of posts | the buoy at 64 |
| The buoy on 35, against the current | 4 | 50 metres in fives, only the tens written, the river pushing back | the buoy at 35 |

The first two levels play the race activity's two straight versions, so `race.stop-on-the-line` opens them. A simulated child needs medians of 18, 9, 18.5, 21.5, 12 and 7.5 strokes with the mouse and much the same with the keys, and random strokes win at most sixteen times in a hundred. Played in headless Chrome with a real mouse at 1024 by 768, the six levels were won in 13, 11, 16, 22, 10 and 7 strokes, the second after a deliberate ram and a recovery, and the first by keys in 19. The stroke's maths is `engine/motion/stroke.ts`, the timing of a catch, the drive, the glide, how far a glide carries, and the meeting with the jetty, with its own suite, and the tuning table `ROW` holds the push, the top speed, the water, the rushed and late windows, the gentle speed and the bounce.

The art pass drew the river in `.scratchpad/src/art/rowing.ts`. The boat is a `rowboat`, clinker built and seen from the side with a ring at the bow, a kit child sitting at the oars facing the stern, both oar handles in the hands and the near oar out through its rowlock into the water, whose blade goes back for the catch and forward through the drive by the `stroke` setting, lifts clear between strokes, and whose rower puts both arms up once tied up; the game draws it again at each eighth of a stroke, as the fishing draws its scale. The posts are `riverpost`, a post with a plate near its top, drawn six squares tall so the plates stand on the bank band above the boat and its rower, which is the clear band the numbers were asked for, with a blank plate where a level does not write the number. The buoy is a `mooringbuoy` with its metres painted on it. The current is a `current` drawing, three rows of streaks with heads that repeat every four squares, slid back along the surface at the current's speed and still under reduced motion. The far bank is different at every level from the shelf's river pieces: firs, hedges and trees, a cottage, a heron standing at the edge, a kingfisher on a twig or flying, a windmill, a bird hide, a barn and a stile, with reeds at the water's edge, kept away from the finish. It is held by named invariants and a seeded replay: every level can be rowed to a rest at its finish, a whole drag and a whole hold give the same speed, a rushed catch pushes less than one in time, a fast bow bumps and cannot win, a gentle one rests and does, the current never lets the boat rest short, random strokes win at most one time in five, the same strokes give the same river, and under reduced motion a press is a whole stroke worked out to rest. The straight's game in `race-hands.ts` was deleted with it, and the circuit stays.

## Shunt the carriages (`shunt`), rebuilt as Shunting yard

Superseded by "Shunting yard, rebuilt as a hump yard" at the end of this document. Kept for the reasoning behind the lift and the pit, which the owner found hard to read.

Rebuilt at the owner's asking, who could not work out how to play the old yard and saw that trains could make a good-looking game, and played at `play.html?g=shunt`. One straight line in side view with a stop at each end, the engine at the left end of a train of numbered carriages, and in the middle a lift over a pit with a lever beside it. Dragging anywhere drives the engine at the finger's speed, and it pushes what it meets and pulls what is hooked to it: carriages that meet under three and a half squares a second hook on with a clank, and one hit faster is knocked away and rolls, slowing, until it stops or bumps a stop and comes back a little. A tap on a hook unhooks. The lever works the lift: a carriage standing alone on it goes down into the pit onto any already there, and with the lift clear the top one comes back up, so the pit is the mechanic's siding, last down and first up, and the puzzle is the same one, which carriage to put down and when to bring it back. The lift refuses, with a ring and one plain sentence, whenever the result would leave the mechanic's graph: the engine on it, a carriage partly over it, a full pit, or carriages standing on both sides so the one on the lift would not be at an end of the train. The engine never needs to run round, because pushing the train across the lift puts its other end on the lift. Left and right drive on the keys, creeping first and winding up while held, space works the lift and down unhooks.

| Level | Grade | The train | The pit |
|---|---|---|---|
| One carriage out of place | 1 to 2 | three carriages, 3 1 2 | room for two |
| Standing backwards | 1 to 3 | three carriages, 3 2 1 | room for three |
| Four jumbled, room for three | 2 to 3 | four carriages, 2 4 1 3 | room for three |
| Four jumbled, room for two | 2 to 4 | four carriages, 3 1 4 2 | room for two |
| Five carriages, room for two | 3 to 4 | five carriages, 4 1 5 2 3 | room for two |
| Six carriages, room for three | 3 to 4 | six carriages, 3 4 1 5 6 2 | room for three |

The first five levels are the old yard's, at the same indices, and the sixth passes the prover's gate. Every still yard is a position the mechanic listed, the carriages on the line left to right its train and the pit its siding, which a test checks along random play, and the prover's shortest ways are 4, 5, 10, 10, 11 and 12 lifts. A simulated child following the prover's path with noise needs medians of 5, 12, 16, 20, 17 and 25 actions, and random dragging and pressing wins the first level at most one time in five. Played in headless Chrome with a real mouse at 1024 by 768, the six levels were won in 8, 12, 15, 20, 17 and 25 actions, and the first by keys in 8. The rail is `engine/motion/rail.ts`, vehicles on one line that hook below a speed and knock and roll above it, with stops nothing passes, and its own suite; the tuning table `YARD` holds the coupling speed, the knock, the rebound, the roll, the lift's time and its reach.

The art pass drew the yard in `.scratchpad/src/art/yardpieces.ts`. The line is a `railway`, a rail on sleepers over ballast with a strip of grass in front, drawn the length of the world with a gap where the pit is. The pit is a `liftpit`, a cutaway with the earth cut open round brick walls and a brick floor, a ladder, and a faint line for each carriage it holds, so the carriages seen stacked down in it say "last down, first up" from the picture; its platform, a plank with a piece of rail and a ring at each end, sits in the gap at rest and goes down between the walls with a carriage on it, hung by two cables from the wheels of a gantry standing over the pit, and the cables are ink from the wheels to the rings. The lever is a `yardlever`, a points lever on a plate with a toothed quadrant, standing behind the line beside the pit; its reach is a setting, and the game draws it so that its knob is two and a half, three or four squares by the width of the yard, four on the two widest, which is at least 44 pixels at 1024 wide at every level, and long enough that the knob stands clear over the roof of a carriage beside it; it leans over for a moment when pressed, and a dashed ring round the knob says where to press until the first touch. The couplings are a `coupling` drawing between neighbours, closed where they are hooked and open where two stand together unhooked. A `bufferstop` faces the line at each end, the target order is an `orderboard`, a sign on tall posts above the train's start with the carriages small and numbered in order, ticked once the train matches, and a `railsignal` at the far end goes from stop to go at the finish. The world has sky over the rail and the pit's earth under it, so a tall window shows sky rather than blank paper, with clouds, firs and a hedge behind the line, and a tree between the lever and the signal where the yard has room for one, which a train of three has not; the view the game asks for is the yard itself, so the width still sets the square. It is held by named invariants and a seeded replay: every level passes the gate, a still yard along random play is always a listed position, a slow meeting hooks and a fast one knocks, the lift takes and gives only at an end of the train, random play wins at most one time in five, the same drags give the same yard, under reduced motion a drag is worked out to rest, and every drawing it names is on the shelf. A test also holds the pit's slots, the platform, the gantry's wheels and the lever's box and knob to the numbers their drawings export, checks the knob's size at every level, and checks that a press on the knob is a press on the lever. The old yard by hand, `shunt-hands.ts`, and its tests were deleted with it.

## What holds them to the promise

All three are action games, held by named invariants and a seeded replay in `.scratchpad/test/games.test.ts`, with the prover's clauses as the model for them. For the see-saw, every way a level's bags can stand is enumerated: the plank rests level exactly when the turning effects are equal and leans towards the heavier side otherwise, every level can be made level, none starts level, and bags stood at random make it level at most one time in five. A bag let go over a step stands on it and one let go elsewhere walks home, so nothing is lost; a side takes only as many bags as its level says; the round is won only when the plank is level and still with nothing carried; the same hands give the same plank, bag for bag; and under reduced motion a press is a quarter of a second and what it started is drawn at rest. For the cake, every level can be cut fair, a cut off by more than the level's distance is not fair, and cuts made at random are fair at most one time in five, counted over twenty thousand seeded tries; an unfair share goes back together with its cuts kept faint, and a fair one wins with each piece in front of its child; a cut on another cut cuts nothing and a cut can be taken back; the same hands give the same cake; and under reduced motion the serving is worked out to rest. For the penny shove, every level's amount can be made on the felt in no more pieces than the felt takes, from its drawer, and a felt filled with any handful from the drawer makes the amount at most one time in five; the chalk total is what lies at rest on the felt, and a coin off the felt counts nothing; more pieces than the felt takes never wins, and the amount in few enough pieces, all at rest, wins; the same pulls give the same counter, body for body; nothing is lost off the counter, whatever the pulls; a piece lying across the start line goes back to its pile, and one wholly over it stays; the dollar note's pile keeps clear of the rims, and a hard pull on it reaches the felt; the count of pieces is drawn in whole rings; and under reduced motion a shove is worked out to rest. A test also holds the places the games stand bags, bring the knife down and count coins to the numbers their drawings export.

Nothing is timed as pressure: a bag waits on the grass, the knife waits over the cake and a coin waits in its pile for as long as a child likes, and nothing is counted from one round to the next. The child's copy is written sentence by sentence without exclamation marks, and the line over the field says only what just happened.

## What is not done

All three were played through their levels in headless Chrome with a real mouse at 1024 by 768 and 1440 by 900, and not by a child or on a tablet. The swing of the plank and the size of a fair share were set by eye and are in each game's tuning table. The Games tab's groups still say puzzle, hands on and action, and the rebuilt games sit under action until the rest are rebuilt and the groups can go. The penny shove's counter is seen from above, as the shelf draws things lying on a table, where the see-saw and the cake stand in a meadow in side view; the three still read as one set by their paper, their chalk and their frame, and whether a table game should also have a horizon is not decided. A dollar note that stops half on the felt turns as it slides and reads as borderline, though its middle decides whether it counts.

# Build briefs: the other games

Each brief was triaged against "The sharper bar". A real game has skill in the hand by degrees, physics that carries a result past what was meant, several moves whose choices depend on the earlier ones, and a miss that can be recovered from. A mechanic that falls short is marked as a candidate for an interactive lesson item, with one line on why, for the lesson items work to take up. The real games are written to be built as the penny shove was: one rules file in `.scratchpad/src/play/` declared with `bleed`, a scene from the shelf with any new drawing in a new file, named invariants and a seeded replay in `test/games.test.ts`, and play to a win with real input at both sizes before it is reported. An old id keeps opening the rebuilt game.

## The triage

| Game | Brief | Skill by degrees | Consequence past control | Moves that depend on each other | Recovery | Verdict |
|---|---|---|---|---|---|---|
| Gone fishing (`fish`) | Cast | how far the float is cast, and when | the first fish to reach the sinking hook takes it | which fish next, with the room left on the pan | throw a fish back | real game, built |
| Sheepdog (`herd`) | Rafts | how hard and high a sheep jumps | rafts dip and lean, and a sheep on a leaning end slides off | which raft next, and keeping each level | a sheep in the river swims back | real game, built |
| The road (`road`) | Delivery round | when to lift, and so how hard to brake | parcels on the roof rack slide forward and can fall | several doors in one drive, each stop setting up the next | a parcel in the road waits to be picked up | real game |
| Shunt the carriages (`shunt`) | Shunting yard | how gently the engine is dragged | a carriage pushed hard rolls on and bumps the buffers | the order puzzle over many moves of the engine | fetch a carriage back | real game, built and drawn |
| Take the corner (`race`) | Pull the car | how far the car is pulled each turn | the car keeps its speed, slides wide and bounces off the hay | every turn sets up the next corner | a bounce leaves the car on the road at rest | real game |
| Bead string (`snake`) | open | not yet chosen | not yet chosen | not yet chosen | not yet chosen | open: Frog hops gave its verb to the rabbit crossing, and the bead string needs another redesign |
| Shut the box (`shut`) | Shake and throw | none, since the dice decide | the dice tumble, but the seeded throw has chosen their faces | which tiles to shut, throw after throw | take a tile back | a real game of chance and choice rather than skill; keep it, and rebuild only the throw |
| Paper plane (`plane`) | Parcel drop | when to tap | a parcel skids a little | one drop settles each pass | another pass | lesson item: a timing check of where a fraction lies on a line |
| Measure it out (`pour`) | Lemonade stand | how far the jug tips | the stream lags a little | glasses fill one at a time and do not affect each other | tip a glass away | lesson item: pouring to a line is reading a scale as it rises, a precision check |
| Find the rule (`rule`) | Machine cannon | hitting the hopper, which is not the mathematics | none that the rule does not decide | choosing tests is the thinking | none needed | lesson item: deducing the rule is the lesson, and a fling adds nothing to it |
| Spell the picture (`spell`) | Word train | how hard a carriage is flicked, which is not the reading | carriages roll | the order of the sounds is the thinking | uncouple a carriage | lesson item, in the reading track: the order of the sounds is the whole task |
| Land on the number (`jump`) | Rabbit crossing | how far each hop goes, pulled back and let go | a landing near a stone's edge wobbles and can tip the rabbit in | a route of hops from stone to stone that adds up to the carrot | a rabbit in the water swims back to its last stone | real game, built and drawn |
| Stop on the line (`straight`) | Row to the jetty | the rhythm of a steady drag on two oars | the water slows the boat, and a boat that arrives fast bumps the jetty and bounces back | every stroke sets how far the next one has to carry | another stroke, or backing water | real game, built and drawn |
| See-saw (`weigh`) | built | none, since a bag snaps to its step | the plank's swing shows the answer and never changes it | one arrangement is checked | lift a bag off | lesson item, taken off the list |
| Cut the cake (`share`) | built | where the cut goes | none | one set of cuts is judged | the cake goes back together | lesson item, taken off the list |

The delivery round and pull the car are ready to fan out, Cast and Rafts having been built and reviewed. The rabbit crossing, the rowing and the shunting yard were redesigned at the owner's asking and are built and drawn, the bead string is open, and shut the box keeps two dice from here on, with its throw the last thing to rebuild.

## Gone fishing (`fish`): Cast

Built, and described under "Gone fishing, rebuilt as Cast" above.

## Sheepdog (`herd`): Rafts

Built: see "Sheepdog, rebuilt as Rafts" under "Built since: one direction for every game". The brief as written before the build follows.

"Jump the sheep onto the rafts so every raft carries the right number across."

A river in side view between two meadows, with the flock waiting on the near bank at the left and two to four log rafts on the water, each tied to a post with a flag showing its number, or no number where rafts must match. The child presses on the front sheep, pulls it back and lets go, and it leaps on an arc, with its first stretch in dots. A raft dips under a sheep and tips towards the end it landed on, sheep slide on a tipped raft, and a sheep landing on a crowded raft can knock another into the water. A sheep that lands short, long or off a raft splashes in, paddles back to the bank and rejoins the flock, so nothing is lost. When every raft is still and carries its number, or the rafts match, the ropes are cast off and the rafts drift to the far bank, where the sheep hop off. The mathematics is counting and equal groups, and at the last levels a remainder that stays on the bank. Keys: up and down set how high, left and right how far, and space jumps the next sheep. Levels: the four the game has, at the same indices, then five, three and two on three rafts, and sixes from twenty with two left over. Drawings: the shelf's `sheep`, the `sea` in lengths as the river, `hedge`, `firs` and `stile`, and a new `raft`. Held by: every level can be completed from its flock, a raft is right only with its number and unnumbered rafts must match, sheep put on the rafts at random make every raft right at most one time in five, every sheep is on a raft, in the river on its way back or on the bank, a loaded raft settles and does not sink, the same jumps give the same river, and under reduced motion a jump is worked out to rest. Size: large, being built.

## The road (`road`): Delivery round

Built on 30 September 2026 in the road's own art, from above with the car rather than a van in side view; see "The road, rebuilt as a delivery round".

"Drive the van along the street and stop at each door on your list, without losing the parcels."

The child holds anywhere to drive and lifts to brake, and the van brakes over a distance that grows with its speed. Parcels ride loose on the van's roof rack as bodies in planck, so a hard stop slides them forward and can drop one into the road, where it waits for the van to come back and pick it up. The street is a number line along the kerb, with numbers on the doors, and the list of deliveries is pinned to the dashboard. A stop within reach of a door on the list delivers that door's parcel; a stop elsewhere leaves a chalk mark with the number it stopped on. The list has several doors in one drive, some behind the van once it has passed them, so the order and how much speed to carry are choices, and a stop that was too hard costs a trip back for the parcel. From the fourth level only some door numbers are written. The scene is a street in side view with `houses`, `lamppost` and `firs`, with the kerb as a new `kerbline` drawing and the van as a new `van`. Levels: doors 3, 7 and 9 of 10; 12, 5 and 18 of 20 in fives; 30, 70 and 50 of 100 in tens; 35, 80 and 15 with only the ends written; 450 and 820 of 1000; a quarter, three quarters and a half along a lane from 0 to 1. The finish is the last parcel handed over and the van's horn. Held by: every list can be delivered, a stop delivers only within reach of a door on the list, a parcel in the road can always be picked up again, driving and braking at random delivers the whole list at most one time in five, and the same holds give the same round. Size: large.

## Shunt the carriages (`shunt`): Flick yard

Superseded: the owner asked for a yard with the engine dragged, and Shunting yard is built; see "Shunt the carriages, rebuilt as Shunting yard" under "Built since: one direction for every game". The flick brief follows as written.

"Flick the carriages along the rails and into the sidings, so the train goes out in order."

The yard's mechanic and its prover's gate stay, since the siding's room and the order are the puzzle; the hand becomes physical. A carriage is flicked along the rail and rolls with the flick's speed and slows; if it meets another slowly it couples with a clank, and if it meets one fast it knocks it along and both roll, and a carriage that reaches the buffer rebounds. A carriage that comes to rest between places rolls to the nearer place. So a careless flick does more than the move it meant and can undo an earlier shunt, and a good one is a single clean coupling. The engine is dragged along the rail to pull the coupled train. The scene is the yard in side view from `sidings`, `loco`, `carriage` and `railsignal`, with a goods shed. Levels: the five the game has, then six carriages with room for three. The finish is the signal dropping and the engine pulling the ordered train out. Held by: whenever everything is still the yard is a position the mechanic lists, every level keeps the prover's gate, a carriage never leaves the rails, and the same flicks give the same yard. Size: large.

## Take the corner (`race`): Pull the car

"Pull the car back and let go each turn, and get round without hitting the hay."

Each turn the child pulls back from the car and lets go, as with the slingshot and the shove, and the pull is added to the speed the car already has: the car travels along its new speed for one turn's time and waits for the next pull, leaving tyre marks. The speed is no longer snapped to cells, so every turn is a judgement of how much to change it, which is the racetrack game's mathematics done by hand, and a car carrying too much speed into a corner slides wide into the hay bales, bounces off and comes to rest on the road. The straight's two levels come first, stopping with the nose on the finish line, then the ring, the chicane and a hairpin, with the last three turns' paths left faint. The scene is the circuit seen from above as a place, with grass, a road with kerbs, `racecar`, `grandstand` and a new `haybale`. The finish is the chequered flag and a lap of honour. Held by: a turn's path is the car's speed plus the pull, every level can be finished, the hay always stops a car on the road, pulls at random finish at most one time in five, and the same pulls give the same race. A continuous speed replaces the mechanic's cells, so this is held by invariants rather than the prover, and `?g=straight` opens its first levels. Size: large.

## Bead string (`snake`): open

The frog hops brief gave its verb, a hop pulled back and let go onto stones along a number line, to the rabbit crossing that replaces Land on the number, so the bead string needs a redesign of its own, on counting in order and counting in steps, that meets the sharper bar with a verb the other games do not use.

## Shut the box (`shut`): Shake and throw

The mechanic, its odds gate and its two-dice levels stay, since the box is a real game of chance and choice. Only the throw is rebuilt: the dice rattle in a cup while it is held and tumble onto the felt when it is let go, through faces that sit side by side on a real die, landing on the faces the seeded throw chose, and a tile is swiped down to shut it. There is no skill in the hand, so it is not held to the sharper bar, and it is the last brief to build. Size: medium.

## Spell the picture (`spell`), rebuilt as the Sound train

"Push the sounds of the picture's word down the line, in order, gently enough to couple on behind the engine."

The picture is the question, as it was: the word is never written until it is spelled, and the text form names it. The engine waits at the left end of a side-on line with the picture above it and the sound boxes beside the picture, and the shed at the top right holds one wagon for each tile, each carrying its sound on a big card, in an order that gives nothing away. The child picks a wagon (a tap on it in the shed, or left and right), and it swings onto the line at the right end. A pull back from the wagon, or up and down on the keys, sets how hard it is pushed, and letting go (or space) pushes it. The rail model in `engine/motion/rail.ts` decides the rest: a wagon that reaches the train at no more than the coupling speed hooks on with a clank, pitched a step higher for each wagon so the train climbs a scale as it grows, and fills the next sound box; one that arrives faster knocks the train and rolls back; one that stops short waits for a nudge from where it stands. Uncouple (Backspace, the Uncouple button, or a tap on the last coupling) lets the last wagon go and rolls it back, so a wrong sound is changed rather than lost. When the wagons spell the word the engine whistles and pulls the train away to the left.

Levels are places, each a line with its own banks from `Bank` in the rail model: level ground, a hump that a weak push rolls back from, a dip that a wagon can come to rest in and has to be pushed out of, a hump and a dip together, and a ramp up to an engine waiting on higher ground. The dots show where the push will take the wagon, all of the way on the first two levels, half and then a third on the next two, and none on the last. The words are the spelling activity's, with more from the shelf's pictures: bus, ant and sun; star, ball and tree; clock, pond and snail; train and bird, where "ai" and "ay" or "ir" and "ur" are both on offer; and snail, pond and bird again for the ramp. `plays` sends each version of the activity to the level whose authored word it is.

Held by: every word of every level is accepted by the `spell` mechanic, so the sounds, the tiles and the one way to spell the word are the ones the prover checked; the solver in `school/games/train-challenges.ts` wins every word of every level from the start by picking each wagon with the keys and finding a push that couples it, nudging when a push falls short, and its recorded pads replay to the same win (the replay witness, and the certificate the generator kit keeps for each variation); a hard push knocks and never couples; the state is plain data. The first push of a level couples for about half a square of pull, and a push that falls short costs only a nudge, so a child can get there by degrees. Drawings: `soundwagon` and `railbank`, both new, the `railway` with a new `bank` setting for a line on raised ground, and the shelf's `loco`, `coupling`, `bufferstop`, `soundboxes`, `firs` and `cloud`. The rules version is `sound-train-1`. Size: large, built.

## The number machine, Find the rule rebuilt (26 September 2026)

Superseded: the roll is replaced by a tap; see "The number machine: a tap, not a roll (30 September 2026)". The roll is described as it was built.

"Roll a ball into a numbered pocket, and fill the orders with what the machine makes of it."

Find the rule was a quiz with a machine drawn round it: feed a number from a tray, read what came out, and name the rule from a row of cards. The number machine keeps the rule and moves the mathematics into the targets. A ball waits at the left end of a track with numbered pockets along it. The child pulls it back and lets go, or sets how hard with the left and right arrows and presses space, and it rolls: friction slows it, and it drops into the first pocket it is slow enough to fall into. That number goes up the pipe into the machine, and a ball with the answer rolls out towards the order at the front of the line. If it is the number the order asks for, it drops into the order's cup; if not, it bounces back, and the pair is written in the in and out table all the same. Three orders fill a level. To make 11 with a machine that adds 6, the child has to work out what the machine does and then what goes in to make 11, which is the inverse the old activity only asked for in words.

A wrong ball costs a roll and nothing else, and the table is the record of what has been found out. The rule is shown on the machine's panel, and the machine lights up, once every order is filled.

Levels are places. The first two have a dotted path that shows where the ball will stop while it is pulled back. The third has a hump after the 4: a slow ball rolls back off it, and the pockets past it need a harder roll. The fourth has a stone over the 1, so the one number that gives a rule away at once cannot be fed. The fifth has two machines one after the other, the second showing that it takes 2 away, so the child works out the first from the whole. The sixth has a long track with a hump and a stone and no dotted path.

The track is a model of its own in `school/games/rule.ts`: a ball on a line, slowed by friction, pushed back or on by a hump's slope, and caught by a pocket when it is slower than a set speed over it. `predict` runs the same steps from a pull, so the dotted path is exactly where the ball goes. Each level has three or four layouts with a different rule of the same kind (`rule-challenges.ts`), and a layout is kept only when every order is made by exactly one open pocket and some pull drops a ball into it. The tests fill every level and layout by pulling and by the keys, check the dotted path against the roll for pulls across the whole range, and keep a recorded set of pulls as the replay witness.

## The number machine: a tap, not a roll (30 September 2026)

The owner found the rolled number machine slower and heavier than the game needed. Feeding a number meant judging how hard to roll a ball so it dropped into the right pocket, which is a skill of the hand that has nothing to do with the mathematics, took eight to ten seconds a turn, and could turn a right idea into a wrong pocket. The roll, the track, the plunger and the Roll button are gone. The pockets are now a tray of numbered balls: a tap on a ball, or a drag, and it hops in an arc into the funnel. With the keys, left and right move a ring along the tray and space drops the ringed ball. The bar has no buttons.

The machine keeps its character and loses its waiting. It chugs and turns its cogs for half a second, the answer pops out of the chute with a bounce that dies away, and a matching ball drops into its order's cup with a splash of colour; the filled cup jumps and the next one wiggles to say it is at the front. A wrong ball bounces off the cup, goes into the in and out table, and the next ball can be dropped as it lands. A turn now takes about two seconds, so trying an idea is quick and the table fills with evidence rather than with rolls.

The levels that were about rolling are now about the numbers. The third has a mixed-up tray, so each number has to be read before it is dropped. The fourth has lost its 1 ball, the one number that gives most rules away at once. The sixth mixes the tray and loses the 3. The dotted path is gone with the roll, since there is nothing to aim. An optional card to name the rule was considered and left out, because a choice of cards brings back the quiz the game replaced; the rule still shows on the panel, and the machine lights up, once every order is filled.

A layout is kept only when every order is made by exactly one ball in the tray (`machineSolve` in `rule-challenges.ts`). The tests fill every level and layout by tapping and by the keys, time a turn at under three seconds, follow a dragged ball, check that tapping at random fills a level in six drops at most one time in five, and keep a recorded set of taps as the replay witness. The rules version is `-machine-2`.

## Pocket rally: slow for the bends (26 September 2026)

Take the corner asked a child to plan a speed before a corner, a turn at a time, on a grid. Pocket rally's fourth level asks the same thing of a car that is driven. The course is two straights and two tight bends, and each bend has a sign beside the road before it with the speed to take it at, in squares a second; the car's own speed is written beside it as it drives. A car over a bend's speed skids wide onto the grass, and a lap only counts when every bend was taken at its speed or slower, so the child brakes before the bend rather than in it. Each of the three layouts has a different radius and different signs. The tests drive every layout by pointer and by the keys, braking for each sign, and check that a lap driven flat out does not count.

## Charlie's bridge: the pulley lift (26 September 2026)

Replaced with the rest of the plank game by Charlie's rope swings (27 September 2026).

The far bank of the eighth level is six squares above the near one, and a lift stands at the water's edge, hung over a wheel against a basket on the near bank. The planks on the grass are sacks, each with its weight written on it, and the child drags them into the basket. Charlie weighs 20 kg. When she steps onto the lift it is let go: with less than 20 kg in the basket it stays down, with exactly 20 it hangs still, and with more it rises at a speed set by how much more, since the floor and the basket are damped. With up to four kilograms over, it reaches the top gently and Charlie walks off to the picnic; with more, it bangs into the top and she rides it back down, and a sack can be taken out. A sack added while she waits on the lift sends it up. The lift is the pulley and slider joints from `bodies.ts`; the sacks are not bodies, and their weight pulls on the basket.

## Shunting yard, rebuilt as a hump yard (27 September 2026)

"Set the points, then push each wagon over the hump, gently enough to couple on in its siding."

The owner played the lift-and-pit yard and said its mechanics did not make sense and it did not look good: the pit, the lift and the lever over it had no reason a child could see, and the pieces did not read as one idea. We looked at the real shunting puzzles (Inglenook sidings, the Timesaver, the sorting yards of wooden railway sets) and at how a real hump yard works, and chose the hump yard, because every part of it explains itself in the picture: the wagons wait in a line behind the engine at the top of a hump, the points at its foot send each one into a siding, and the siding's board says what that siding wants. It is also the only one of those puzzles where the hand sets an amount by degrees and physics decides the rest, which is what the games the owner liked have in common. The Inglenook's ordering puzzle survives inside it, since a siding fills from its buffer stop and a wagon sent back joins the end of the waiting line, so the old activity's three orders are three of its levels.

The child taps a siding's board (or presses up and down) to set the points; the route the points are set for is drawn whole with an arrow along it, and the others faint. A pull back from the front wagon, or left and right on the keys, sets the push, and letting go (or space) pushes it down the hump. The rail model in `engine/motion/rail.ts` decides the rest, one line per siding with its buffer stop as a fixed vehicle: a wagon that meets the siding's last wagon, or the buffer stop, at no more than the coupling speed hooks on with a clank pitched a step higher for each wagon; one that arrives faster knocks and rolls back; one that stops short waits to be pushed again from where it stands. Send back (Backspace, the button, or a tap on a siding's last wagon) returns a wagon to the end of the waiting line at no cost, so every mistake is undone by a move that is also part of the puzzle. When the boards are all met the engine pulls the empty line away.

The maths is in the boards. The first two levels and the last ask for wagons adding up to a number (5 and 4; two pairs that make ten; 10, 7 and 5 over three sidings), and the board shows the sum so far on a line under its target. The middle three are the shunt activity's versions, `plays` maps them to it, and ask for siding A in the order 1, 2, 3 (or 1 to 4) from its buffer stop with B as a spare siding of the version's size. Levels are places: the hump grows from 1 to 1.4 squares, the spare sidings are short, and siding C of the last level climbs a bank, so a push that couples in A rolls back from C. The dots show the whole push on the first two levels, less on the next three and none on the last. Pushes that couple span 6 to 8 steps of the keys (about one and a half squares a second of push), a softer one stops short, and a harder one knocks.

The world is wider and taller than the framed yard, with the meadow under the sidings down to its foot, the yard's rail out to its right edge, faint hills on the horizon and clouds through the sky, so a wide or tall room never shows the world's edge; the view is sixty squares across, so a phone at six pixels a square holds it without scrolling.

Held by `school/games/__tests__/yard.test.ts`: a gentle push couples, a hard one knocks and a soft one stops short; the points hold while a wagon rolls; a siding fills from its buffer stop, refuses when full, and sends its last wagon back to the end of the line; the solver in `school/games/yard-challenges.ts` plans the moves on the sidings as a puzzle and then plays every push through the real yard, and wins every variation of every level by the keys and by a finger; its recorded pads replay through the tape to the same yard, with a checkpoint for each board met; pressing at random rarely makes up an order level; every drawing is on the shelf and the ground reaches every edge of the world. `tools/e2e/games/shunting-yard.e2e.ts` makes up a level by the keys and sets the points and pushes by a finger. Drawings: `sidingboard`, new; `carriage`, `loco`, `coupling`, `bufferstop`, `railway`, `railbank`, `meadow`, `peaks`, `firs` and `cloud` from the shelf. The `liftpit`, `yardlever` and `orderboard` drawings went with the old yard. The rules version is `yard-2`.

## Shunting yard: the yard worked by hand (30 September 2026)

The owner liked how the hump yard looks and found it clunky to play. Under the field there were six buttons for one idea: arrows to set the points and the push, Push to confirm, Send back and Undo, so the hand never touched a wagon, and the lead to the second siding ran up the picture as a long straight diagonal. The yard is now worked in the yard. A points lever stands on the grass in front of the points with the letter of its siding over it, and a tap on it throws the points to the next siding with a click, the route it sets drawn whole and the others faint; up and down still move it from the keys. The front wagon is pulled back and let go, as in Slingshot and Pocket pool, and the wagon and the line behind it ease up the hump as it is pulled, so the pull is felt as well as seen. A wagon in a siding goes back to the end of the line when it is tapped or dragged towards the hump. The bar under the field keeps only Push and Undo: a tap of Push pushes with the push the keys have set (left and right, with no buttons of their own), and held it winds the push up until it is let go, which is how a switch user makes a hard push. A held push keeps the yard stepping, so it winds under reduced motion too.

Each siding now leaves the lead in an S, drawn by a new `railcurve` drawing whose bend is the rail module's ramp shape, so a wagon rolls along the curve the drawing shows; a wagon on a steep lead leans no further than about a quarter of a right angle. The ring round the wagon, the arrow along the route and the dots of a push are gone. While a push is aimed, by a pull, a held Push or the keys, a faint wagon stands where it will stop, fainter on the later levels and gone on the last, as the dots were. A coupling wagon bounces and a knocked one wobbles. The `yardlever` drawing, dropped with the lift-and-pit yard, is back on the shelf. The rules version is `-yard-3`.

## Harbour cargo: a crate dragged and let go (30 September 2026)

The owner asked for Harbour cargo to be as simple to play as the games reworked around it. Under the field there were seven buttons: four arrows to drive the hook, a hook button to pick up and let go, Ring the bell to send the boat off, and Undo. Loading one crate took the trolley over it, the hook down, a press, the hook up, the trolley over the boat, a wait for the swing to die, the hook down and another press. The crane was a bare line and the barge a plain trapezium, and the Games page cover was a thin crop of a crane's jib that said nothing about cargo.

A crate is now dragged. A finger or the mouse pressed on a crate brings the crane over it to take it, the crate follows the hand on its rope and swings as it travels, and letting go hands it to the crane, which carries it on to that place, lowers it straight down and lets go once it rests just above what is below: the deck, another crate, the dock or the sea. While it is lowered the crane eases the crate under the trolley, a spring with just enough damping to settle in about a second, so a set-down takes about two seconds and the child never waits for a swing to die. We kept the rope and the swing, since they are what the crane feels like, and took the waiting out of the hand. A barge loaded and balanced sails by itself with its horn, so there is no bell to ring.

A first version took the crane's own controls away altogether, leaving one big button and Undo, and the owner found it too primitive. So there are two ways to load the boat, and they are meant to be different. The drag is the easy way. Driving the crane is the skilful one, kept for the keys and the buttons: the arrows run the trolley along the jib and wind the hook up and down, a crate taken on the hook swings as the trolley starts and stops, and the big button, Pick up / let go, takes the crate within reach of the hook or lets the held one go exactly where it hangs. A driver who lets go high, or while the crate still swings, drops it off its place, so a good delivery is lowered close to the deck and steadied first. The keys work exactly as they did before this change, including the brake key sending a balanced boat off; only the touch and on-screen side changed. The bar has the four arrows, Pick up / let go and Undo, and the Ring the bell button is gone, since a balanced boat sails by itself.

While a crate is carried, a dashed line runs down from it to where it will land with the crate's outline there, and a faint mast shows which way the barge would list with it aboard. Both show on the first two levels, the line alone on the third, and neither on the last. The goals along the foot of the field are tick circles filled as each is met. The crane is now the shelf's `crane` drawing standing on the quay, its jib reaching out over the harbour, and the barge is a new `barge` drawing: a blue hull with a white stripe, portholes, a planked deck and a rail post at each end. With crates on its deck and a hook lowering another, the same drawing is the game's cover and the icon beside its note.

The mathematics is unchanged: the load is balanced when the weights times their distances from the mast cancel, within 2.5 weight-squares. `cargoPlan` in `workshop-challenges.ts` stands the heaviest crates nearest the mast and slides the whole row along until the moments cancel, and the tests use the same plan for both ways. The tests drag every crate of every level and every generated layout to its plan and let go, win every level by driving the crane from the keys alone, replay the recorded pads to the same landing places, check that a crate let go of on the move is set down where it was let go, and that crates dropped at random places deliver at most two times in ten. The rules version is `-cargo-5`.

## Harbour cargo: put where the finger lets go (2 October 2026)

Replaced on 3 October 2026; see "Harbour cargo: freeform again" below. The account as built follows.

The owner found the crate drag harder than before. The crate still swung on its rope as it travelled, and the crane would only let it go once it hung still over its place, so a drop meant waiting and often landed off the spot; driven from the keys, the note asked the child to lift the crate clear of the dock, move it over the boat, wait for it to stop swinging and then release, four steps for each crate.

A dragged crate is now placed, not dropped. A finger on a crate lifts it to a riding height above the other crates and it follows the finger across; letting go sets it down below where the finger was, at the nearest of the deck's half-square places and clear of the end rails, in under a second and with no wait for a swing. The trolley moves with it and the crate leans a little as it travels, but the lean is drawn only and never moves where it lands. A crate let go over the water near the boat goes onto the deck; over the quay it goes on the quay, which is how a crate is taken off the boat again; anywhere else it goes back to its place on the quay, and the note says so. A crate already aboard can be dragged to a new place to even the load. A drag cut short, by a pause or a lost pointer, sets its crate down below it.

The keys drive the crane exactly as before: the arrows move the hook, and Space or Enter takes the crate under it. The one change is the letting go, which lowers the crate straight down and steadies it rather than dropping it from where it swings; over open water it still goes in, and the harbour crew bring it back. The arrows, Pick up / let go and Undo are round icon buttons with their words as names. We kept the arrows and the button because the owner found the keys right, and keyboard and switch players use them.

The balance band is wider on the early levels, 4 weight-squares on the first and then 3.5, 3 and 2.5, and `cargoPlan` now puts each crate on a half-square place and nudges the lightest crate until the load comes out even, so every plan balances exactly. The notes are shorter ("Drag the crates onto the boat. Keep it level."). The rules version is `-cargo-6`. The tests win every level and generated layout by dragging and by the keys, replay a drag win from its recorded pads, set a crate down in under two and a half seconds on a half-square place, send a far drop back to the quay without touching the water, and keep random drags to at most two wins in ten.

## Harbour cargo: freeform again (3 October 2026)

The owner preferred the freer drag of 30 September to the placing of 2 October, and found the extra guides and shortcuts off. The snapping to the deck's half-square places is gone, and so are the crane setting a crate down below the finger in under a second with its swing only drawn, the return to the quay for a drop away from the boat, the dashed ring round the crate under the hook, the dashed line and outline showing where a carried crate would land, and the faint mast showing how the barge would list.

A dragged crate is again taken on the hook and carried on its rope, so it lags behind the trolley and swings as it travels. Letting go hands it to the crane, which lowers it straight down from where it was let go and eases it under the trolley, and physics decides where it ends: on the deck, on the quay, on another crate, or in the harbour, where it splashes and the crew bring it back. A crate already aboard can be dragged again to even the load.

What stays: the barge's dashed centre line, the words over it, the goal ticks along the foot, the boat listing as weight lands, the wider balance band on the early levels (4, 3.5, 3 and 2.5 weight-squares), the shorter notes, and the round icon buttons. The keys drive the crane as before. The one key behaviour kept from 2 October is the letting go: Space lowers the held crate straight down and steadies it rather than dropping it mid-swing, now through the same lowering as a drag, with no snapping. `cargoPlan` is back to its continuous form, with no rounding to half squares. The rules version is `-cargo-7`.

## Charlie's rope swings (27 September 2026)

"Hold to swing higher. Let go to fly."

The owner found Charlie's bridge extremely boring: laying planks and pressing Go is a puzzle with a
walk at the end, and nothing the hand does is judged by degrees. We looked at rope swings over water,
the kind a child has swung on, and at the swinging in platform games, and chose a swing that is
pumped and let go, because it is the one mechanic in which how long the child holds and when the
child lets go both matter, and physics decides where Charlie comes down. The game keeps the id
`bridge`, so a stored challenge or a link still opens it, and it lives in `school/games/swings.ts`.

Charlie stands on the near bank holding a rope tied to a branch over the stream. Holding Swing, or a
finger anywhere on the field, swings her off and pumps: every moment held adds a push along the way
she is going, so the swing rises by degrees up to a little short of level with the branch. Letting go
flies her from the rope on the arc the swing gave her, and she lands where it comes down: on a
stepping stone, on the far bank, in the tree house, or in the water. Holding again in the air
reaches for a rope, and she catches the first one her hands pass. A tap does not end a swing it
starts, since letting go counts only after a third of a second on the rope. A splash costs nothing:
she climbs out where she last stood, which is a checkpoint.

The mathematics is in where she lands. The stream has a number line along it, and a stone the level
does not ask for wobbles and tips her in, so "Land on 4" is reading the line and choosing how hard to
swing, and "Stones in twos" is counting in twos from stone to stone. On "Rope to rope" the ropes carry
tags with where they hang and the ones the level does not ask for are loosely tied and slip; the
ravine asks for the ropes at 4 m and 6 m with no tags, read off a tape across the gap; the tree house
asks for the ropes that count in threes before a swing high enough to reach it. "A windy day" pushes
her as she flies, and the windsock on the far bank shows how hard. "Three jumps to 12" writes each
landing as a sum along the top ("4 + 4 = 8") and counts the far bank only when it is the third jump,
with ropes that swing on their own and are taken by holding up the hands as one comes past. The
dotted arc of the flight she would take shows on the first levels, only while holding in the middle
ones, and not at all on the last.

The swing is `engine/motion/swing.ts`: a pendulum pumped along its way, a flight under gravity and
wind, and a catch that keeps the part of the flight's speed that goes round the new rope. The ropes
nobody holds swing back to hanging, or on and on if they sway. Charlie is the actor over her poses,
with a new `hang` pose (both arms up, as she holds a rope), turned with the rope while she swings. The
shelf has three new drawings for it: `swingrope`, a twisted rope with a knot and a tag;
`swingbranch`, the bough the ropes are tied to; and `streambank`, a bank that slopes into the water
or a cliff that drops to it, which runs to the foot of the world so no edge shows. The plank and sack
drawings stay on the shelf. The rope creaks at each end of a big swing, she whooshes as she lets go,
a catch knocks, a splash splashes, and the water and the wind hum under it.

`swings-challenges.ts` lays each level out three ways and ships a layout only when `crossing` has
found a way over it by stepping copies of the game with key presses a hand could make: from standing
each pull in turn and each moment of the swing to let go at, and in the air each moment to reach for
a rope the level wants. Held by `school/games/__tests__/swings.test.ts`: every level and layout is
crossed by the moves found for it; a crossing replays from its tape to the same state, with a
checkpoint at each steady stone; the pull sets how high she swings, the swing keeps going and one tap
lets her go; the button's word follows what a press will do; a stone the level does not ask for tips
her in and she is back where she last stood; a landing past a stone's edge steps back to its middle;
a rope is caught only by a tap in the air, the nearest in reach, and a loose one slips; jumps add up and the wrong number of them starts again; every stone she can
stand on has a rope she can reach; random presses and let-goes win at most one try in five on any
level that asks for something; and the frame draws only the shelf's drawings, with banks and water to
every edge. `tools/e2e/games/charlie-swings.e2e.ts` swings her across in the app.

### The controls, rebuilt (30 September 2026)

The owner found the swings hard to play. One held input did two jobs: holding pumped the swing and
letting go threw her off, so a child who stopped pumping to wait for a good moment let her go at
whatever point of the swing she was in, and most tries ended in the water. Catching a rope needed a
second hold, timed in the air. The look, the levels and their mathematics stay; the hand's part is
now three separate actions.

- Pull to start. The child takes Charlie by the hand and pulls her back up the rope's arc, as in
  Slingshot and Pocket pool, and a faint arc shows how high she will swing on the other side. Lifting
  the finger starts the swing from rest. From the keys, the left arrow pulls her back a tenth of a
  radian at a time and the right arrow lets her forward, and Pull starts the swing; holding Pull at
  the bank winds the pull further, for a player with one switch.
- The swing keeps going. It loses almost nothing each swing, so the child can watch a few and pick
  the moment, and it lingers slightly at each end, where the moment to let go is. On a rope caught in
  the air a gentle pump tops the swing up to a good height, which is what the tree house needs.
- Let go is one tap. A tap anywhere on the field, Let go, or space while she swings lets her go from
  where she is. The dotted flight she would take moves with the swing, and on the first three levels
  a ring shows where she would come down, filled in when that place counts, so the child learns the
  timing by watching the ring slide across the stones. The middle levels show the dots faintly and the
  last shows nothing.
- Catching is a tap in the air. The brief suggested catching any rope her hands pass, but the rope
  levels ask the child to fly past the loosely tied ropes to the one the level wants, so a rope taken
  without asking would undo the mathematics. Instead a tap in the air holds her hands out for about
  half a second, which makes an early tap still catch, and the reach is a square and a half. When two
  ropes are in reach she takes the nearer one.
- Landings forgive. A landing up to a third of a square past a stone's edge counts, and she steps to
  its middle. A splash is quicker than before, so a try again is at once.

The big button says what a press will do now: Pull, Let go, Catch, or Reach at a swaying rope. Held
still, a press at the bank winds the pull, and the swing then runs on to halfway up its forward swing
and waits there for a tap, where a let go flies forward and up; in the air it waits where the rope the
level wants next is in reach. The crossings the challenges ship are now found as key presses: pulls,
then Pull, a wait, Let go, and in the air a wait and Catch.


## Games as cards in lessons (2 October 2026)

Every game now says how it plays as a card, a single round inside a lesson ([game-cards.md](game-cards.md)): the level a lesson plays when it names no other, how many of its asks a round holds where a level has several, how many squares across the card shows round the frame's focus, and the most minutes a round should take. A game that cannot meet the card standard says `card: null` with its reason. The standard is a test, `school/games/__tests__/card.test.ts`: a square of at least 12 px in a 360 by 240 card, and one round won by the field alone, with no button under it, within its minutes.

Eleven games pass: Harbour cargo, Rabbit crossing, Down the river, Firefly trail, The road, Paper plane, Pocket pool, Charlie's rope swings, Fetch with the pups, Rescue pups and Clear round. The road, Fetch with the pups and Rescue pups play a card's round on their first ask only, through `round(level, asks)`; their levels are unchanged. Twelve listed games do not, because their play spans a field too wide to crop into 30 squares and keep in view: Marble workshop, the Sound train, The number machine, the Shunting yard, Measure it out, Slingshot, Penny shove, Rafts, Gone fishing, Garden mini-golf, Pocket rally and Charlie's lemonade stand. They wait for the turned view or the close-up with an overview from the portrait plan, and Gone fishing and the lemonade stand would also need a one-ask round then. Shut the box is not a card either: its box is about 35 squares wide on a turn board that is never cropped.

## Garden mini-golf: seven more holes (3 October 2026)

The owner loves Garden mini-golf and asked for more to it. The first three holes are unchanged; seven follow them, each a place with a mechanic of its own, and each with a par shown at the top of the board beside the putts. A ball sunk within par is told so and gets the bigger cheer, and one over par is told to have another go; nothing fails and a hole can always be started again. The older holes keep no par and their boards are as they were.

| Hole | Par | What it adds |
|---|---|---|
| 4. Off the boards | 2 | a rail hides the cup, so the way in is a bank off the top boards; the board reads the aim as a clock hour |
| 5. The windmill | 2 | a rail across the doorway in a wall comes and goes with the windmill's turning sails, so the putt is timed |
| 6. Down the hill | 3 | the middle of the lawn slopes, so a putt curves downhill and is aimed above the cup; the board reads the squares to the cup |
| 7. The ponds | 3 | two ponds with a strip of lawn between; a ball that rolls into water comes back to where it was putted from, and the putt still counts |
| 8. Through the pipe | 2 | a wall with no gap, and a pipe under it: a ball that rolls into the way in comes out the way out going the same way |
| 9. The gnome | 2 | a garden gnome walks up and down the one gap, so the putt waits for the way to clear |
| 10. Mud and a hill | 3 | a strip of mud slows a ball far more than sand, then the far lawn tips |

The slopes on holes 6 and 10 are drawn with `golfslope` as a hill in the lawn, shaded darker towards the low side with faint contour lines and tufts leaning downhill, in place of the arrowed `poolpatch`. Only the drawing changed: the ball rolls as before, and the solver and the rules version are unchanged.

The physics behind them: slopes are a new optional part of `engine/motion/rolling.ts`, a pull on a moving ball inside an area, kept weaker than the friction so a ball comes to rest on a slope and stays there; a world without slopes rolls exactly as before. Mud is a surface with a stronger friction than sand. The windmill's rail and the gnome are rails that come and go or slide with the hole's own clock, `t`, counted in steps, so a hole replays the same for the same putts. Water and pipes are checked after each step in `golf.ts`.

Each hole has three arrangements: the windmill's door and timing, the slope's direction, the cup's place. `golfPlan` in `golf-challenges.ts` proves each one: it judges a fan of aims and strengths by how near they leave the ball to the cup the long way round (a walking distance through the gaps and the pipe), with the windmill and the gnome taken away, then times the best few. Every arrangement is sunk within par through the Pad, and random putting sank none of 280 tries. The rules version is `-golf-holes-1`. Golf is still not a card: its board is too wide to crop, so it waits for the turned view.

## Charlie's dollhouse (4 October 2026)

The owner asked for a dollhouse game built around our own Charlie. It is id `dollhouse`, in `school/games/dollhouse.ts`, with its jobs proved in `dollhouse-challenges.ts`. The games we looked at were Roblox's Bloxburg and Adopt Me for building a house room by room on a budget, The Sims for the cut-away view and people who walk about the rooms they are given, Animal Crossing for furniture that is placed, turned and kept, and Toca Boca for a house a young child can play with no goal at all. What we took is the cut-away view seen from the side, rooms as blocks that snap together, furniture that settles on a floor or a wall, and a free build that no job ever stops.

The house is seen cut open from the front on a plot of 20 squares across and three storeys of three squares each. Every level opens with the house's shell standing on a stone plinth in the middle of the field: dashed slots where its first rooms go, each with a faint roof and the words "drop a room here", and the slot a job's room belongs in outlined. The camera frames the house and its open slots large in the middle, and eases to a new frame as the house grows. Rooms snap to any place where they stand on the ground or wholly on rooms below, and once a room is built the house offers further slots beside it and over it. A room is drawn as a box looked into: a slightly darker back wall, a thick outer wall, a doorway through a wall it shares with the room beside it, a heavy floor, and a sign with its name, its squares and how many things are in it.

The game has two modes, switched by a two-way switch at the top of the field. Building shows a slim drawer along the bottom with the seven rooms (a bedroom, a kitchen, a bathroom, a living room, a shed, an attic and stairs), and a room dragged up from it glows green over every slot it fits, with a faint ghost and its area where it will land. A built room can be dragged somewhere else, stretched by the handle on its right wall from 2 to 8 squares wide, or dragged back to the drawer to take it away, which only a room with nothing on top of it allows. Decorating fades the lawn and the sky, swaps the drawer for the furniture's, and a tap on a room eases the view into it until it fills the field, with the drawer opened on the tab that suits the room (Sleep, Sit, Kitchen, Bath, Walls and Plants, the Walls tab holding pictures, shelves and the four wallpapers). Each piece sits on a round chip with its price. A piece dragged from a chip glows green along the floors or walls it fits, rooms it cannot go in fade, a ghost shows where it will land, and it drops with a small squash and settle. A round back button eases out to the whole house, where pieces can still be dragged between rooms. A tap turns a sofa or a bed round or switches a lamp, a bath, a television or a cooker on. Every room costs a coin a square and every piece its price, against the level's coins, so the mathematics is area and budget. The coin readout at the top left shows the coins left, or for the jobs that count coins the coins spent against the target ("32 / 40 coins"), turning green on the target, and a card under it lists the job's parts with a tick for each one done.

Whoever lives in the house waits on the grass by its door and walks in with the actor the other games use, moving into each room once it is finished. Four households can be chosen with the "Who lives here" button: Charlie alone, Charlie with a friend and a grown-up, the Pup family, and another family of people. A tap on someone and then on a room sends them there along the floors, through shared walls and up the stairs, and they cheer when a room is finished. Someone can also be dragged into a room.

| Job | Ask |
|---|---|
| 1. Free build | 2000 coins and no goal |
| 2. A home for Charlie | a bedroom with a bed and a picture, for 40 coins |
| 3. Fifteen squares | a bedroom of exactly 15 squares |
| 4. Upstairs | a bedroom upstairs with stairs up to it, over a living room already built |
| 5. A kitchen for 20 coins | furnish the kitchen already built with given pieces, within 20 coins |
| 6. A bed for everyone | three beds, one for each of the household |
| 7. Twice as big | a living room twice the area of the bathroom |
| 8. Exactly 40 coins | a living room and its furniture costing exactly 40 coins |
| 9. A house of 36 squares | rooms that make 36 squares in all |

Each job has three or four variations (the area, the room upstairs, the pieces to furnish, the number of beds, the pair of rooms, the total and the whole area), and the free build varies by household. The keys play everything: the arrows move a highlight across the drawer's rooms, or its tabs and chips, the rooms, the pieces and the people, with up and down jumping between those rows; Enter takes and puts down, picks a tab, and while decorating looks into the highlighted room; the arrows step a held thing to the next place it fits; Delete takes it away, R turns it, = and - widen and narrow a room, B builds, D decorates, Z looks into a room and out again, C changes who lives here, N starts a new house, F shows the whole house, and [ and ] look left and right. Escape stays the pause menu's, which is why looking out of a room is Z. Wider, narrower, turn, remove, build, decorate and look inside are commands with keys only, and the round buttons are the arrows, the big button, remove, "Show the whole house", "Who lives here" and "New house". Undo takes back the last change.

The free build is saved in the browser. A game may now set `saves: { level }`, and the Games page keeps that level's checkpoint under the game's id every three seconds, when the page is hidden and when the game closes, and restores it when the level opens. "New house" goes back to the empty shell. A kept house is read through a checker that ignores fields it does not know, so houses kept before the shell still load. Only the free build saves, so a job always opens as authored.

The dollhouse is not a card (`card: null`): the house, the switch and the drawer fill a field about 48 squares wide and play by dragging between them, which a card's crop of the focus would cut off. The switch, the drawer and the back button are fixed sprites, and the pad now carries where the pointer is in the view's own squares (`view`), so a game can tell which fixed control a finger is on whatever its camera does. Every variation of every job is built to its win through the pad by a finger and by the keys, through the modes and the zoom as a child would, and the same hands replay to the same house; random hands finished at most 2 of 10 tries on any job. The rules version is `-dollhouse-3`.

A house grows as far as a child wants to build it. The owner reported a long house that could not be built further to the right, so the plot is now open: the jobs keep the 20 columns and three storeys of their brief, and the free build may run 224 columns to the left of the shell, 206 to the right and 29 storeys up, inside a world of 528 by 143 squares whose ground and trees run its whole width. A house holds at most 60 rooms, so a very big house still steps and draws within a frame, and the free build's coins were raised to 2000 so that only that cap stops it. The camera frames the whole house while it fits at 0.6 of the field's own scale; past that it stays at 0.6 and follows the last room put down, or the keys' highlight, and never shows less than the ground. A drag on the sky or the grass, two fingers or the scroll wheel pans the view, a pinch or ctrl with the wheel zooms it, a room carried near the left, right or top edge drifts the view that way, and "Show the whole house" frames every room however far out that takes. A view moved by hand keeps its middle over the house, so a pan never loses it. Rooms keep their columns in the saved house, so a house kept before the plot opened loads as it was.

The switch is a segmented control of two equal halves: a single pill outline, and a yellow knob inset evenly inside it that slides between the halves over about a fifth of a second, cut under reduced motion. It is drawn 2 squares tall and answers a tap over 3, which is 52 px drawn on a desktop and a 44 px target wherever a square is at least 15 px; on a phone held upright the whole field is drawn at about 7 px a square, so the switch, like the drawer, is smaller than 44 px there, and that needs a phone layout for the game. The unselected label stays in ink rather than ink-soft, since words drawn by the field take no colour of their own; that needs a change to how the field draws text.

The rework followed the owner's report that the interior was hard to see, the walls unclear and the way to put furniture in not obvious: the first version opened on an empty plot with the catalogue's room-like cards filling the right half, the room tray below the ground and the household under a tree. We considered keeping one mode with both drawers on screen and rejected it, since the two drawers competed for the same space and the furniture cards still read as rooms.

## Domino machine (4 October 2026)

The owner asked for a domino machine as an extension of the physics engine. It is id `machine`, in `school/games/machine.ts`, with its variations proved in `machine-challenges.ts` and its physics in `engine/motion/contraption.ts`. The games we looked at were The Incredible Machine, where a puzzle gives a few parts and a goal and the player places them and presses start, and the Rube Goldberg toys and domino sets where a row is stood up by hand and one push sets off the chain. What we took is the fixed scene with a goal at the far end, a short drawer of parts for each level, building and running as two separate phases, and a run that can be watched, reset and tried again at no cost.

The field is a toy room 48 squares wide: a floor of boards with a skirting board, a rug, a window with curtains, pictures, a shelf of books at the height of a grown-up's shoulder, a toy chest, blocks, a teddy, a lamp and a plant, and a bell on a wooden post. Each furnishing has a few places it may go and takes the first that is clear of the machine, so nothing in the room sits behind a part the child has to see. Wall shelves are drawn as wooden ledges, a shelf standing on the floor as a low wooden step, the pond as water with the engine's water surface, and the bucket as a tin pail hung from pulley wheels under a beam on the wall. The camera is framed to the machine on every level rather than the whole room, from a little before the first part to a little past the bell, and free play shows the whole room. The level's parts wait in a toy tray under the floor, one chip for each part, with a count on a row's chip; a chip whose part is out on the bench fades. A part dragged up from it shows as a green ghost where it would land, or a red one with "No room here" where it would not; standing parts settle onto the floor or the shelf under them, a row let go near the end of another row joins it two squares on, and a part lands with a small bounce. A row has a grip over its last domino that is dragged along to change how many dominoes it has, and a ramp has a grip at its end that tips it, with the slope drawn gently to the nearest 15 degrees within 3. A part dragged back into the drawer goes back. Go runs the machine: Charlie points at the first domino or ball, gives it the push and watches, and the camera follows whatever moved last. A run that misses says what happened and returns to the build after a moment with every part where it was, and a run that rings the bell makes Charlie cheer.

| Level | Ask | What varies |
|---|---|---|
| 1. Down the slide | Charlie pushes a ball off a shelf and down a slide; stand a row where it lands so the last domino rings a bell on a step | 4, 3 or 5 dominoes, each starting in another place |
| 2. Fill the gap | dominoes stand 2 apart; how many fill 14 squares | 12, 14 or 16 squares |
| 3. Down the ramp | put a ramp where the ball falls so it rolls into the row | where the row stands |
| 4. The see-saw | a weight lands on one end and the other swings up to the bell | where the shelf is |
| 5. Fill the bucket | let enough marbles into a bucket to lift a weight as heavy as 6 | 4, 6 or 8 marbles |
| 6. The fan | stand the fan within its reach of 8 squares behind a boat | where the boat floats |
| 7. On a budget | ring the bell for 12 coins with dominoes at 1, a short ramp at 5 and a long one at 8 | the gap the row fills |
| 8. Off the shelf | a row on a shelf reaches a ball that rolls down to the floor | how far along the shelf |
| 9. The grand machine | two rows to fill with a ramp between them | how the two rows share the floor |
| 10. Free play | every part and any machine that rings the bell | how far along the bell hangs |

The mathematics is in the targets: counting a row, the gap divided by the spacing (level 2), a length against the plank or the fan's reach (levels 4 and 6), one more than a weight (level 5), and a total of prices against a budget (level 7). A ruler under the gap or the plank gives the length, and a word over each row says how many it holds.

How the six ingredients are met. The hand sets amounts by degrees: a row's count and a ramp's slope are drags, not taps. Physics after release: nothing moves while the child builds, and once Go is pressed the bodies are left to planck. Retries cost nothing: a run never changes the layout, and the build is back as it was after a miss. Places with obstacles: shelves, the pond, the bell, the bucket and its weight all take room, and a part cannot be put through them. Fading previews: the first levels draw the plan's parts as faint hints (strong on level 1, lighter on levels 2 and 4, none from the bucket on). Maths in the targets: each level's answer is a number the child works out, as above.

The controls are a drag from the drawer, the grips, and round icon buttons for Go, reset and undo, with "Fewer" drawn as a new `less` icon beside `add`. The arrows, Go, the next part and undo always show; turning, more and fewer, and putting back show only while a part on the bench is chosen that they apply to, through the game's `shows`, and their keys work either way. The keys play everything: N chooses the next part in the drawer, the first arrow stands it in the middle of the floor and further arrows move it half a square, hopping past anything in the way, up and down step a standing part to the shelf above or the floor below, Q and R tip a ramp by 5 degrees, = and - change a row's count, X puts a part back, Backspace undoes and Space is Go. Every button is the 44 pixel floor.

Each domino that falls plays the place sound a semitone higher than the one before, so the chain is heard as a rising cascade; a hard knock plays a bump whose strength is how fast it was, a spring plays a lift, a running fan hums, and the bell rings before the win. Under `prefers-reduced-motion` the game declares `still`: Go plays the run out while it is settling and the page draws only its end, with the bell at rest. Fallen dominoes and those the wave has not reached sleep in planck, so a row of forty runs in under a second of computation in node. A run is deterministic: the same layout falls the same way step for step.

The machine is not a card (`card: null`): the bench, the bell and the drawer under the floor fill a wide field and play by dragging between them, which a card's crop would cut off. Free play saves its layout with `saves: { level }`, read back through `readDesign`, which refuses anything that is not a part from the level's drawer and drops parts that no longer have room. Every variation of every level is built through the pad by a finger and by the keys and rings the bell, a recorded build replays to the same machine and the same win, and random layouts rang the bell in at most a quarter of 16 tries on any level. The rules version is `-machine-3`.

The first level was at first a row after Charlie's own domino, which the owner found too easy and too empty. It now starts with a ball Charlie pushes down a slide, so the child sees one part set off another before building anything, and the bell stands on a step one square high: the ball rolls up against the step and stops, so only the last domino of the right row falls far enough to reach the bell, and a row one short misses it. The row comes from the tray at two dominoes and is grown to the count by its grip or by more and fewer, so counting is the choice the child makes.

## Charlie's climb (4 October 2026)

The owner asked for a gentle platformer in the manner of Super Mario and Alto, with Charlie running and jumping across rooftops and treetops, picking up coins and opening number doors. It is id `climb`, in `school/games/climb.ts`, with its routes proved in `climb-challenges.ts` and its places in `engine/motion/platforms.ts`. The games we looked at were Super Mario Bros. for a held jump that sets its height, coins that are counted as they are taken, and a level read from left to right; Alto's Adventure for a calm look with depth behind the player and no punishment beyond starting a little way back; and Celeste for the forgiving input it is known for, a jump that still works just after running off an edge and a press just before landing that is kept. What we took is the held jump, the counting, checkpoints that cost nothing, and the forgiving timing. What we left is lives, enemies, a timer and a score.

Charlie runs on the runner in `engine/motion/walker.ts`. Holding a jump longer jumps higher, up to the climber's full height, and letting go early cuts the rise; once she leaves the ground the runner decides the arc. A jump pressed up to a seventh of a second before landing is kept, a jump pressed up to an eighth of a second after running off an edge still works, and the tuning (gravity, the cut, the grace, the buffer and the wind) is a set of knobs. Ledges may be one-way, which she jumps up through and drops through on asking, may move along a sine, or may be a mushroom that throws her up higher than any jump. A fall into the water puts her back at once at the last flag she touched, with every coin she had, and the flags use the engine's checkpoint events and tape. Three climbers can be chosen with the "Who climbs" button or C: Charlie, Pip the pup who jumps higher, and Charlie's mum who runs faster. Changing who climbs keeps the climb where it is.

Coins carry their value on their face (1, 2, 3, 5 or 10), and the readout at the top left is fixed to the view and shows the total. A door is a block until its rule is met, and touching a shut one says how far off the count is, such as "This door wants exactly 12 coins. You have 14: 2 too many. A coin box takes coins back." A coin box stands by the path with a button in front of it, and every landing on the button gives one coin back, so a count that is too large can be made right. Where two doors stand one above the other, the way on depends on the count: one opens for an odd number and the other for an even one, or one for more than 20 and the other for 20 or fewer. A star waits off the plain route on every level for a child who wants more.

| Level | Place | Ask | What varies |
|---|---|---|---|
| 1. The garden wall | a garden with a gap and a low wall | a door that opens for 10 coins or more | 10, 8 or 9 |
| 2. The rooftops | roofs over a row of houses, coins worth 2 | a door for exactly 12 | 12, 10 or 8 |
| 3. The treetops | branches over a wood, with a mushroom spring | a door for exactly 20 in fives | 20 or 15 |
| 4. The clock tower | a moving plank, a ladder and a balcony | an odd door and an even door | which coins are worth 10 or 20 |
| 5. The windy hill | wind that carries her in the air, a coin box | a door for exactly 12 | the coins' values and 12 or 9 |
| 6. The castle | ramparts over a moat | more than 20, or 20 or fewer | the coins' values |
| 7. The night market | stalls and crates with two coin boxes | two doors, exactly 25 then 20 | 25 and 20, 21 and 18, 22 and 19 |
| 8. The cloud climb | a stack of clouds | doors that show a sum, 7 + 5 and 9 + 6 | the sums |

How the six ingredients are met. The hand sets amounts by degrees: how long a jump is held sets its height, and a finger held further above her keeps the jump going as she rises towards it. Physics after release: once she is in the air the runner carries her, and the only steering is the run left or right. Retries cost nothing: a fall puts her back at the flag at once with her coins, and there are no lives. Places, not screens: each level is somewhere a family would recognise, drawn with the shelf's trees, houses, clock tower, windmill, city walls, lamp posts and clouds behind it in rows of depth. Fading previews: the faint dotted arc of a full jump is shown on the first three levels, only while a jump is held on the next two, and not at all from the castle on. Maths in the targets: the door's number is the target, and the child counts by ones, twos, threes, fives and tens towards it, decides odd or even or more than, gives coins back to land on an exact number, and adds the two numbers on a cloud door.

The controls are left and right to run, Space or up to jump (held for higher), down to drop through a one-way ledge, and up or down on a ladder to climb. On the field, a finger or the mouse held ahead of her runs her that way, raising it well above her jumps and keeps the jump held, holding it below her drops, and a quick tap hops. The round buttons are the arrows, a big Jump button with the launch icon and "Who climbs", each at least 44 pixels, and a gamepad plays through the pad. The keys are never taken away.

The camera leads the way she runs and keeps still while she hops, moving up or down only when she leaves a band in the middle of the view. She squashes on landing in proportion to how hard she came down and springs back through the actor's squash, a little dust goes up at a jump and a landing, and coins taken in a quick run ring a semitone higher each. The sound kit gives a jump its lift, a coin its ring, a door its level chord, a splash its own sound and a coin given back its back. Under `prefers-reduced-motion` the game declares `still`: a press plays a third of a second, and a jump plays out while it is settling, so the page draws only where she lands. On a phone held upright `portrait.keep` keeps 22 squares across, and the game is a card (`card: { round: { level: 0 }, keep: 24, minutes: 2 }`) played by touch.

Every variation of every level is climbed home by a pilot through the pad, once by the keys and once by a finger on the field, along a route of runs, hops, waits for the moving plank, ladder climbs and coin boxes, and the recorded pads replay to the same climb. Random hands got home at most 2 times in 10 on any level. The rules version is `-climb-1`. A phone layout that puts the run buttons under the left thumb and Jump under the right is not done, since the controls' stylesheet is shared with every other game.
## Bridge builder (5 October 2026)

The owner chose Bridge builder from the list of ideas. It is id `bridgebuild`, in `school/games/bridgebuild.ts`, with its variations proved in `bridgebuild-challenges.ts` and its physics in `engine/motion/truss.ts`. The game we looked at was Poly Bridge, where a bridge is drawn from beams between fixed anchors on a budget and a vehicle then drives over it, and the bridge bends, shows its strain in colour and breaks where it is weakest. What we took is the drawing of beams from joint to joint, the materials with their own lengths and strengths, the budget, the colours of strain and the run that can be reset to the bridge as built. What we left is the scoring, hydraulics, springs, several vehicles and a timer.

The field is a place with water or a drop between two grassy banks: the stream, a deep ravine, a wide river with a boat waiting to sail under, banks of two heights, a rock in the middle of the river, and a windy gorge. The banks have blue anchors at their edges and down their faces, and the rock has one on its top. A beam is laid in either of two ways. A drag from an anchor or a joint draws it, and a finger lands on a joint anywhere within 1.5 squares of it. A tap on a joint arms it and a second tap says where the beam ends; the far end is then armed in its turn, so a chain of taps lays a run of beams, and a tap on the armed joint again, or well past the material's reach, stops the chain. Either way the end follows the hand and snaps to a joint near it or else to the nearest whole square, no further than its material reaches (4.5 squares for wood and road, 8 for rope), which a faint dotted circle round the start shows. The beam shows as a green ghost where it fits or a red one crossed out where it does not, with a dot at its end, and its length and cost stand beside it; the length pops a little and clicks each time it changes, with a firmer click on a joint. With a mouse the armed beam follows the pointer before the second click, and the joint under the pointer glows. A beam cannot go into the ground, through a bank, below the boat's line or over another, and the line under the goal says which. The materials are a picker of three tiles at the top of the field, drawn with the shelf's `bridgetray`. Tapping a beam changes what it is made of, and holding it down for half a second, dragging it well away or right clicking it takes it away. Each beam costs its length in coins, rounded to a whole square, and the total is always shown. Go sends the Pup family's car over: Rufus drives with Pip beside him, and Maple and Dot wait on the far bank and cheer when it arrives. While it crosses every beam glows yellow, orange and then red as it works harder, the bridge creaks, a beam near its strength shakes the bridge a little, and a beam past it snaps with a crack and drops in two pieces into the water with a splash. Go again, or Backspace, puts the bridge back as it was built.

The physics is our own, not planck, so that a beam can measure its pull and snap at a strength. `truss.ts` holds each beam to its length as a stiff spring, solved in 24 small steps a frame; a joint is a pin, so a square of beams folds and a triangle holds, and a rope only pulls. The car is a weight riding along the road beam under it, shared between that beam's two joints. The car stops at a road too steep to climb and falls where there is no road. Strengths are tuned so that every plan holds with a tenth or more to spare, while two road beams with nothing under their middle, and the bridge of squares on level 3, break when the car reaches them.

| Level | Ask | What varies |
|---|---|---|
| 1. The stream | one road from bank to bank | a gap of 4 or 3 |
| 2. A wider stream | two roads, their middle joint held up by a triangle | a gap of 6, held from above, or 8, held from the banks' faces |
| 3. Squares fold | a bridge of squares stands already; add the beams that make triangles | a gap of 6 or 8 |
| 4. The ravine on a budget | cross for 20 coins or less | 20 coins over 10 squares, or 16 over 8 |
| 5. Room for the boat | keep the river clear below the road, with triangles above it | a gap of 9 or 8 |
| 6. Uneven banks | a road that slopes gently from one height to another | down from the high bank, or up from the low one |
| 7. Exactly six beams | cross with 6 beams, no more and no fewer | which face anchor holds the middle |
| 8. The rock in the river | 14 squares, anchored to a rock in the middle | where the rock stands |
| 9. The windy gorge | span the measured gap while a gust blows | 12 squares or 10 |
| 10. Free build | any bridge over 16 squares of river, kept for next time | where the rock stands |

The mathematics is in the targets: lengths read as each beam is drawn and compared against what a material reaches, a total of lengths against a budget (level 4), an exact count of beams (level 7), a span shown with a ruler over the gap (level 9), and the triangle as the shape that does not fold (levels 2 and 3).

How the six ingredients are met. Drawing by degrees: the drag sets a beam's length and its angle, snapped to whole squares. Physics after Go: nothing moves while the child builds, and the truss kit runs the bridge and the car only once Go is pressed. Retries cost nothing: Go or Backspace after a run puts the bridge back as it was built, and Backspace while building takes back the last change. Places, not screens: each level is a stream, a ravine, a river with a boat, uneven banks, a rock and a windy gorge, drawn with the shelf's banks, firs, hedges and clouds. Fading previews: on levels 1 to 4 the beams glow while building with how hard each would work with the car at a quarter, the half and three quarters of the way over, and the joints of a way across are dashed rings on levels 1 and 2 and faint dots on level 3. On the first level the blue anchors breathe and a line under the picker says "Drag from a blue anchor to the other bank" until the first beam is laid. From level 5 the colours come only after Go. Maths in the targets: as above.

The controls are a drag or taps on the field, a tap on a beam or a tile of the picker, and round icon buttons. The arrows, Go (play, and restart once a run has started or ended) and undo always show. Change material (shuffle) shows only while a beam is chosen or a joint is armed, Take the beam away (close) only while a beam is chosen, and Clear bridge (broom, or C) only once a test has ended, beside the restart that builds on the bridge as it stands. With the keys the arrows move a cursor over the squares, Enter starts a beam at a joint and ends it where the cursor is, M changes the material of the beam being drawn or of the beam last laid or tapped, Delete takes that beam away, Backspace undoes and Space is Go and reset. Every level is built by the keys in the tests. Every button is at least 44 pixels.

A run that ends without a win says why: "The bridge broke in the middle. Add a triangle?" (near this bank, in the middle or near the far bank, from where the first beam snapped), a gap in the road, a road too steep, or a crossing that broke the level's rule ("The pups got across, but the bridge cost 22 coins. Can you build one for 20 or less?"). These are the game's `ended`, and pressing Go after one goes back to building with the bridge as it was. The round's card offers Again, and since the game sets `againKeeps`, the page carries the design into the next try through `checkpoint` and `restore`, so Again tests the same bridge rather than the empty banks. Under `prefers-reduced-motion` the game declares `still`, so Go plays the crossing out and the page draws only its end, the anchors do not breathe, and a beam is taken away with the button, a drag or a right click, since a held finger steps nothing. While building, the camera frames the pegs and the joints of the way across with a few squares round them, at a zoom of up to two, so the gap fills the field; after Go it eases out to a zoom of one and follows the car. On a phone held upright `portrait.keep` keeps 24 squares across, which the build's zoom then enlarges, following the armed joint or the middle of the gap while building and the car while it crosses.

The game is not a card (`card: null`): building needs drags between joints a square apart and a Go button, which a card's small field and no buttons cannot give. Free build keeps its bridge with `saves: { level }`, read back through `readDesign`, which lays each kept beam again by the level's own rules and refuses anything that does not start from a joint already standing. Every variation of every level is built through the pad by dragging (a tile of the picker tapped for the material, then a drag), by a chain of taps and by the keys, and gets the pups across, a recorded build by dragging and by taps replays to the same crossing, and of 120 bridges laid at random two crossed, both on the stream's first level. The state is plain data and the same after a trip through JSON. Two additions to the engine came with the easier building: the pad now carries a right click on the field for a touch game as `aside`, for one step, and the page no longer opens the browser's menu over such a field; and a game may set `againKeeps`, which makes the round card's Again start from the design as it stood. The rules version stays `-bridgebuild-1`, since what a beam may be and how the bridge is judged did not change. We have not measured the frame rate on a phone's WebKit; a crossing steps at most a few dozen beams 24 times a frame, and a change while building on the early levels tries the bridge three times over two and a half seconds of its own time to colour it.

## Feed the pup (5 October 2026)

The owner chose Feed the pup from the list of ideas. It is id `feedpup`, in `school/games/feedpup.ts`, with its variations and solver in `feedpup-challenges.ts` and its physics in `engine/motion/tether.ts`. The game we looked at was Cut the Rope, where a sweet hangs on ropes, a swipe cuts a rope, and the sweet swings and falls past air cushions and bubbles to a hungry creature, collecting stars on the way. What we took is the swipe that cuts, the pendulum that decides where the sweet goes, the puffers, the bubbles that float it up until they are popped, and the stars on the way. What we left is the star rating, spikes, the time pressure and the creature's sulk; a wrong round ends with "Again?" and nothing is lost.

The maths is in the stars. Each star carries a number, and the stars the biscuit catches have to make the number on Pip's bowl, so some stars must be missed, and which rope goes first and when it is cut decides which are caught. Later bowls ask for odd stars only, for exactly three stars making 10, or show 6+?=10, where the stars make the missing number. The sum so far stands over the bowl as it grows, such as 2 + 3 = 5. A biscuit that reaches Pip with the wrong stars is turned down ("Pip's bowl says 7, and the stars made 2 + 4 = 6. Again?"), and one that falls past Pip or floats off in a bubble ends the round with "The biscuit fell. Again?".

| Level | Place | Ask | What it adds |
|---|---|---|---|
| 1. The kitchen peg | the kitchen | 3 | one short rope swinging over Pip, cut when the dots go green |
| 2. Two ropes | the kitchen, hooks | 5 | which rope first chooses the swing |
| 3. The washing line | the garden | 7 | three ropes, an order and a moment |
| 4. A bubble in the playground | the playground | 6 | a bubble floats the biscuit up through stars, popped over Pip |
| 5. Bath time | the bath, two bubbles | odd stars making 8 | an even 8 in the easy path |
| 6. The windy hill | the hill, two dandelions | 9 | puffs, a little one and a big one |
| 7. Three stars for ten | the kitchen, a bellows | exactly 3 stars making 10 | 5 + 5 also makes 10 but is two stars |
| 8. The treehouse | the treehouse, a dandelion and a bubble | 6+?=10 | a puff that carries the bubble along |

Each level has four variations: as authored, mirrored, with other numbers on the stars and the bowl, and those mirrored. A rope's length is where the biscuit starts unless a level says otherwise, so every rope starts taut.

How the six ingredients are met. The hand sets things by degrees: the moment of a cut sets where the swing lets go, and a puffer held longer blows harder, from a little puff to a big one. Physics after the action: once a rope is cut, `tether.ts` swings and drops the biscuit, and nothing the child does steers it except another cut, a puff or a pop. Retries cost nothing: the round-end card's Again starts the level over at once. Places, not screens: the kitchen, the garden's washing line, the playground, the bath, the windy hill and the treehouse, each from the shelf's own drawings on squared paper. Fading previews: a dotted fall path shows where the biscuit would go if its last rope were cut now. On the first two levels it runs for 2.5 and 2 seconds, long enough to reach the floor, and ends in a ring where the biscuit would come down, which turns green with green dots while that is Pip's mouth. On the next two it is faint and about half a second long, with no ring, and from the bath on there is none. Maths in the targets: the bowl's number, odd only, three stars exactly and the missing number.

The controls are a tap on a rope or its peg, or a swipe across a rope, to cut it, with a short blue slash left behind; a tap on a bubble to pop it; and a press held on a bellows or a dandelion, longer for a bigger puff. With the keys, left and right (or up and down) choose a rope, a bubble or a puffer in order across the field, shown by a ring, and Space cuts, pops, or held squeezes. The round buttons are the two arrows and a big button with the new scissors icon, each with its words as its name. Tab is not used to choose, although the brief offered it, because taking Tab from the page would trap a keyboard user in the field. The physics is our own rather than `bodies.ts`, since a rope here only needs to hold a length, and a small exact model lets the solver search thousands of rounds in a second.

The rope snaps with a spring: the cut end flies up to its peg, overshoots and hangs there. A star pops bigger and fades with a chime, each star caught a major third above the one before, so a run of them climbs. Pip stands with a happy face, is surprised as the biscuit comes near, reaches up with the mouth wide open (the new `catch` pose) while it falls within reach, and on a win chomps it (the new `chomp` pose, with a munching bob) and then cheers, its tail wagging throughout. A wrong biscuit leaves Pip worried, and a lost one surprised and then sat down and sad. The hum is wind while a puffer blows and panting as the biscuit comes near. Under `prefers-reduced-motion` the game declares `still`: a press plays a quarter of a second, and a fall or a float plays out while it is settling. The field is 30 by 20 squares and fills the room, with the tiles, ground and skirting drawn wider than the view; on a phone held upright `portrait.keep` keeps 18 squares across, following the biscuit. The game is a card (`card: { round: { level: 0 }, keep: 30, minutes: 1 }`), 12 pixels a square in a 360 by 240 card, played by a swipe.

The solver walks each round as a few choices, a rope, a bubble or a puffer with a little or a big squeeze, made at any moment four steps apart up to eight seconds in, one layer of choices at a time, keeping up to 240 rounds a layer spread over what has been cut and caught, and dropping a round as soon as its stars can no longer make the bowl. The moves it finds are played once by the keys and once by a finger (a tap on the rope, a press on the bubble, a held press on the puffer), both win, catch the same stars, and replay to the same round. Random play, acting at random moments on whatever the arrows land on, wins about 41% of rounds on the first level, about 7% on the second and under 3% on the rest, 6.8% over all eight. The test allows under 50% on the first level, under 12% on each other and under 8% over all. The rules version is `-feedpup-2`.

### Making the first level easy to play

The owner played the first level and lost it: the biscuit fell past Pip and the end card covered Pip and the bowl. The causes were in the level and in the end of a round. The rope was 6 squares long from a peg near the top, let go 65 degrees out, so it swung in about 2.8 seconds and crossed the bottom at about 14 squares a second. Pip stood under the far end of the swing, so only a cut in a short moment at that end could win, and the mouth caught 1.4 squares either side and a star 1.35 from its middle. The preview was faint, stopped after 1.6 seconds, and did not say where the biscuit would land. A miss ended the round on the frame the biscuit touched the floor, and the card, which sits low in the middle of the field, sat on Pip.

The first level now hangs a 3 square rope from a peg at (15, 7.5) over Pip, which swings in about 2 seconds. It starts 2.2 squares out, so letting go at once lands just beside the mouth and the ring is not green until the swing has begun. The 3 is on the fall path above Pip and the 2 is off to the side. A level may set `reach`, how far across from the mouth the biscuit is still caught and how near a star it passes to catch it: 1.8 and 1.7 on the first level, 1.7 and 1.55 on the second, 1.55 and 1.45 on the third, and 1.4 and 1.35 from the fourth on. A cut lands in the mouth for about 0.3 seconds of each pass over Pip, twice a swing. Pip leans up to 0.22 radians towards a biscuit coming down near it and stretches up a little, and a biscuit caught at the edge of the reach goes the rest of the way into the mouth.

A tap within a square of a rope, or of its peg, cuts it on that step, and a swipe that ends within half a square of a rope cuts it as well as one that crosses it. Space and the scissors button cut the rope the keys have chosen on the step they are pressed. Each cut plays the snip, leaves a slash across the rope for a fifth of a second, springs the cut end back up to its peg and flicks the piece left on the biscuit back into it. A rope that is taut is drawn with a slight curve so it reads as a rope.

A biscuit that misses hops on the floor and rolls to a stop, and one Pip turns down hops out of the mouth and does the same. Pip watches it land, surprised, and then sits down. Once the round is over the field rises 10 squares over half a second, by growing the frame's world and moving the camera down it, so the floor ends a little above the middle and the card below it leaves Pip, the bowl and the biscuit in sight. The GL view now takes the world's size from every frame rather than only when the field is fitted, which is what lets a world grow. Under reduced motion the field is drawn already risen. Again and the restart button start the level over at once, and the end-to-end test checks that Again is back in play within a second.

`engine/motion/tether.ts` no longer has `fallOf`, since the preview now steps the fall itself to find where it lands and whether Pip catches it. The `dots` and `ring` marks take `tone: "ok"`, drawn in the palette's green.

## Hoops in the yard (5 October 2026)

The owner chose Hoops in the yard from the list of ideas. It is id `hoops`, in `school/games/hoops.ts`, with its variations and solver in `hoops-challenges.ts` and its physics in `engine/motion/hoop.ts`. The games we looked at were arcade basketball, where a ball is flicked at a hoop and the hoop moves on later rounds, and side-on browser basketball games, where a finger pulls back from the ball and a dotted arc shows the throw. What we took is the pull back and let go, the ball that rattles round the rim, the bank shot off the board and the hoop that slides. What we left is the coin slot and the scores into the hundreds; a round that runs out of balls ends with "Another go?" and nothing is lost. A countdown came back on one level, Beat the clock, with a rack of balls beside the drive as the arcade has.

The maths is in where to shoot from. Three spots are chalked on the drive, worth 1 near the hoop, 2 further back and 3 behind the long line, each with its number written in it. The baskets that count add up on a small blackboard hung on the garage, such as 2 + 3 + 2 = 7, under what the level asks. A basket that would take the sum past the target goes in but does not count, and the note says why ("In, but 5 + 3 = 8, past 7, so it does not count. Try for fewer points."), so the child chooses another spot. Later levels ask for a total from two hoops worth 2 and 3, a total from only 2s and 3s while the wind changes, a total from bank shots only, a basket from each of five spots worth 1 to 5 in order, three different ways to make a number (the board starts again after each, and a way already found does not count twice), three of Pip's baskets copied, and a total against the clock.

| Level | Grades | Ask | What it adds |
|---|---|---|---|
| 1. First baskets | 1 to 2 | exactly 3, from spots worth 1 and 2 | a low rim (9 squares), a near 1 spot and the whole arc in green when it will go in |
| 2. Make exactly 7 | 1 to 2 | exactly 7 | the 3 spot, a basket past the target that does not count, and spots chalked again after each basket, some on a kerb, a step or a crate |
| 3. Two hoops | 1 to 2 | exactly 10 | a low hoop worth 2 on its own pole in front of the high one worth 3; the worth is the hoop's, and the spots are plain |
| 4. A gusty day | 2 to 3 | exactly 10 with only 2s and 3s | a wind that changes before every throw, from a little against the hoop to half as much again towards it, shown by the wind sock |
| 5. Hedge and branch | 2 to 3 | exactly 9 | a tall hedge in front of the hoop and a branch overhead from a tree at the far end of the drive, so the arc has to fit between them |
| 6. Off the board | 2 to 3 | exactly 8 from bank shots only | a basket that does not touch the board goes in but does not count |
| 7. Around the world | 2 to 3 | a basket from each of five spots, 1 to 5, in order | a basket moves Charlie on and a miss keeps her there; 15 balls; the sum is 15 |
| 8. Three ways at dusk | 3 to 4 | 6 three different ways | an evening yard with the moon, a few stars and a lit porch lamp |
| 9. The sliding hoop | 3 to 4 | exactly 6 | the hoop slides along a rail on the garage door, and there is no preview |
| 10. Copy Pip | 3 to 4 | copy three of Pip's baskets | Pip chooses a spot and shoots; when Pip scores Charlie steps onto that exact place and must make the same basket, and a miss is a letter of P, I, P |
| 11. Beat the clock | 3 to 4 | exactly 12 in 30 seconds | the clock starts at the first throw, and the next ball comes off a rack at once; a ball in the air at the buzzer still counts |
| Shoot-around | 1 to 4 | none | five spots round the drive, starting at the 2 spot, a basket moving Charlie to the next, with the best run kept in the browser |

Each level has three variations: as written; with every spot a square further back, a lighter wind, the hedge and the branch moved and a slower slide; and with one more to make (or 7 three ways) and the rim half a square higher.

### Every throw set by hand

The owner found that a throw, once found, could be repeated for basket after basket. Four things stop that.

- The aim goes back to the same soft lob (54 degrees, 13 squares a second, which falls well short from every spot) as soon as the ball is back in Charlie's hands, so the keys have to turn and size every throw again, and a finger pulls each one fresh.
- After every basket the spots are chalked again. Each moves to the other side of where it was first chalked, between seven tenths of the level's shift and all of it away (two squares on most levels, two and a half on the gusty day and the sliding hoop, 2.2 on the first level, 1.2 on Around the world), never nearer the hoop than four and a half squares. On every level it also steps to a different height than before (the ground, a kerb, a step or a crate, which lift Charlie by nothing, half a square, a square or a square and a half). A miss leaves the spot where it was, so a near miss can be corrected. The places come from the variation's seed and the number of baskets so far, so the solver and a replay meet the same yard.
- The wind changes between throws on the gusty day.
- A shot depends on distance the way a real one does. A first version forgave a long lob almost anywhere: a throw at up to 80 degrees came down so steeply that one long by two or three squares slid down a soft board into the hoop. The board now gives back 0.8 of the speed into it and the rim 0.65 (from 0.55 each), a shot leaves the hand with a tenth of its speed as backspin at the skin (from a quarter), which no longer pulls a long ball down the board, and the steepest throw is 63 degrees. A long throw now comes back off the board over the rim, a short one clanks off the front, and a clean swish or a soft bank off the painted square still drops in. The spots moved a square further from the hoop (7, 12 and 18 squares) so that the near spot is not a lob under the rim.

The cost is a narrower window. From the 1 spot the widest run of powers that go in is 2.5 squares a second, about 0.4 squares of pull; from the 2 spot 1.3 to 1.4, and from the 3 spot about 1.05, a fifth of a square of pull or one to two taps of the power keys. To keep that reachable by a finger a square of pull now changes the power by six rather than eight. The first two levels keep the whole green arc, so a child sees when a throw will go in.

We measured how often exactly the same keys score again after a basket, with the surest throw from where each level starts, over ten seeds and three repeats each:

| Level | Repeats that scored |
|---|---|
| 1. First baskets | 3 of 30 |
| 2. Make exactly 7 | 6 of 30 |
| 3. Two hoops | 4 of 30 |
| 4. A gusty day | 8 of 30 |
| 5. Hedge and branch | 4 of 30 |
| 6. Off the board | 6 of 30 |
| 7. Around the world | 4 of 30 |
| 8. Three ways at dusk | 6 of 30 |
| 9. The sliding hoop | 0 of 30 |
| 10. Copy Pip | 4 of 30 |
| 11. Beat the clock | 6 of 30 |
| Shoot-around | 0 of 30 |

A test holds every level from the second to about three in ten (at most 34 per cent) and the first to half.

### The physics

`engine/motion/hoop.ts` flies the ball side-on, in squares and seconds with y growing downwards, in eight substeps to each of the game's sixty steps a second, so a ball moving at 40 squares a second goes less than a tenth of a square in a substep and cannot pass through the rim, whose tube and the ball together are more than half a square across. The ball has a radius of 0.5 squares and falls at 30 squares a second each second, with a little air drag and the level's wind. The backboard is a solid box 0.3 squares thick, and the pole under it, a hedge and a branch are boxes too. A court can hold more than one hoop: each scores on its own, and the score says which hoop the ball went through, which Two hoops uses. The rim is two small solid circles, its near and far edges as the side view shows them, 2.1 squares apart, so the opening is about twice the ball's width, as on a real hoop. A contact pushes the ball out along the normal, gives back a share of the speed into the surface (0.65 for the rim, 0.8 for the board, about three quarters for the ground and almost nothing for the hedge) and trades the slip at the contact point between the ball's speed and its spin, as far as friction allows; a hollow ball's spin takes one and a half times the share its body takes. A shot leaves the hand with backspin, a tenth of its speed at the ball's skin, so it softens on the rim and checks on the ground, and a test holds backspin to a shorter run after a bounce and topspin to a longer one. Together these give clean swishes, rattle-ins, bounce-outs off the front of the rim, rolls round it, and bank shots off the board.

The net is a sensor. The ball's middle passing down through the rim's height between the two edges scores, once a shot, and a ball that came up through the opening from under the rim can no longer score. The net is drawn from two strings of four verlet points hung from the rim's edges, held to their lengths and to the width between them, pushed aside by the ball and swayed by the wind; a ball off the rim shakes it. The game passes the foot's swing, stretch and opening to the hoop drawing's `net` part as three numbers to a fiftieth of a square, so the drawing is redrawn only while the net moves. Everything is plain data and the same throw always flies the same.

The preview steps a copy of the ball through the same `stepBall` the shot uses, with the hoop where it will be at each step, so the dots and the throw cannot disagree. It draws a dot every three steps, fading in three parts towards its end, and stops at the first thing the ball would meet, the rim, the board, the pole, the hedge or the ground. Where the level allows it, the dots turn green when the whole shot, flown on past that first touch, would go in.

### How the principles are met

The hand sets things by degrees: the length of the pull sets the power, from 12 to 34 squares a second at six for each square pulled, and its direction sets the angle, from 63 degrees down to 20, both read by `engine/motion/aim.ts` as Slingshot and Curling read theirs. Physics after the action: once the ball is let go nothing steers it. Retries cost nothing: the ball comes back to Charlie's hands within a second of a shot being settled, in or out, and the round-end card's Again starts the level over. Places, not screens: a backyard drive with a chalk court, a white picket fence, shrubs, a garden tree, two houses behind and a garage with the hoop on a pole in front of its door, all on squared paper; the wind sock, the hedge and the garage rail come in on their levels. Fading previews: the arc up to the first thing it meets, green when the shot goes in and counts, on the first two levels, a little over half a second of it on Two hoops, and none from A gusty day on, the Shoot-around included. Where the dots stop, the gauge's green band takes over (whole on Two hoops to Off the board, its middle half on Around the world and at dusk, none from the sliding hoop on), and on every level the last throw stays on the paper and the note says how it missed, so the harder levels are thrown by eye from what the last throw did. Maths in the targets: exact totals with overshoot, two hoops of different worth, a restricted set of values, bank shots only, a sum of 1 to 5 in order, different ways, matching Pip's baskets, and a total against the clock.

### Controls, look and sound

A finger pulls back from the ball over Charlie's head, or from anywhere above the drive, and lets go; a pull from the ball is measured from the ball and any other from where the finger went down, with a thin line from the ball as long as the pull. The aim's arrow is drawn solid in ink and grows with the power, from 1.2 squares at the weakest to six at the strongest, with a short faint tick at 45 degrees from the ball so higher and flatter have something to be read against. A gauge 5.5 squares tall stands beside Charlie on its own card, so it reads over the fence, and fills with the power, with a bar at the power now. A tap on a chalk spot walks Charlie there. With the keys, up and down aim, left and right set the power, Space shoots and N walks to the next spot. The round buttons are the four arrows, the big button with the `launch` icon, and a button with the `locate` icon, named "Walk to the next spot", which `shows` keeps only while a throw is being lined up on a level where the child chooses the spot (not Around the world or Copy Pip). A tap on a spot reaches 1.8 squares either side of it and from just above the ground to three squares below, about 47 pixels wide at the smallest square a phone shows.

### Reading a throw without the dots

The owner found the levels without dots hard, and the arrow no help, so three things now stand in for the dots. The child's last throw stays on the paper as a faint ink line until the spot moves: a miss leaves the spot where it is, so the next throw is a visible correction of the last, and a basket chalks the spot somewhere else, where the old line would mislead, so it goes. It only ever shows what happened, never what will. A miss also says how it went, worked out from the real flight: what the ball met first and where it came down past the rim's height. A ball that came down within the rim's width is called off the front or back rim, one that came down in front is short, or a little short within 2.3 squares of the rim's middle, and one behind is long or a little long; a first touch on the board above the rim is off the back of the board, and one below it is the pole or the board's foot, a throw that came in low, so short. A word goes up over the hoop ("A little long", "Front rim", "Off the board") and the line says what to change. Below grade four a flat throw that came up short adds "Too flat: aim higher" and a lob steeper than about 58 degrees that went long adds "Very high: a bit flatter". The gauge's green band is the run, or runs, of power that go in and count from where Charlie stands at the angle aimed, found by the same flight as the throw: a coarse pass every quarter of a power and the edges then halved down to a fiftieth, kept per level, place, wind and angle to the hundredth of a radian, since no level with a band has a moving hoop. The gauge draws one band, the widest run, since the powers between two runs do not go in, at least a square tall so it reads on a phone, washed solid green with the bar at the power on top. A miss's word stays still for two seconds in the open sky in front of the hoop, its right end 0.8 squares short of the rim, so it never sits on the board, the hoop or the pole. Random play does not see the band, and the repeat and random rates are as before. The branch on Hedge and branch is the shelf's `swingbranch` in its `limb` look, drawn behind the tree's crown so it grows out of it, flared where it leaves the tree and hatched like the trunk, with leaves along it; its underside is where the bough's is, so the ball meets it on the same line.


Charlie holds the ball over her head in the new `shoot` pose while she aims, reaches after it in the new `release` pose until the shot is settled, walks between spots and cheers a basket that counts. Pip stands on the place Pip chose for a turn, on its kerb or crate, jumps when Pip scores, and sits beside Charlie while the child plays. The ball spins as it flies, throws a shadow on the drive that shrinks and fades as it rises, and leaves a faint trail. A basket shows "+1", "+2" or "+3" rising over the rim, "too many" or "not off the board" for a basket that does not count, and "Swish", larger, with more sparkles and a harder sway of the net, for one that touched neither rim nor board. After three baskets in a row the ball glows and throws sparks as it flies, a hot hand that ends at the next miss; under reduced motion neither is drawn. A missed ball bounces back to Charlie as a pass off the drive, and the next ball is in her hands within about seven tenths of a second of a shot being settled (a third of a second off the rack). The sounds are the game's own: a whoosh as the ball goes, a clang for the rim pitched higher and louder the harder it is hit (no more than one every five steps while a ball rolls round), a thud for the board and the pole, a swish of the net, a bounce on the drive as hard as it lands, a rustle for the hedge, the family cheering a basket that counts and a short tune for a win. The hum is wind on the gusty day, as strong as the throw's wind.

The camera frames the shooter and the hoop at a zoom of one and drifts a quarter of the way towards the ball in flight, and once the round is over the yard rises by growing the world to 34 squares and moving the camera down it, so the card leaves Charlie, the hoop and the board in sight; the end-to-end test checks this. The view is 40 by 24 squares and fills the room. On a phone held upright `portrait.keep` shows 28 squares, round a focus that runs from behind the furthest spot to the scoreboard and holds still while the ball flies. The game is a card (`card: { round: { level: 0 }, keep: 30, minutes: 2 }`): the first level's court, hoop and board fit 30 squares at 12 pixels a square in a 360 by 240 card, played by two pulls and a tap. Under `prefers-reduced-motion` a press plays a tenth of a second, and a walk, a flight and the ball's return play out while the game is settling, so a shot is drawn where it came to rest; the trail, the rising numbers and the net's sway are left out. We have not measured the frame rate on a phone; the per-frame work is the preview's flight (at most six seconds of substeps) and the net's redraw while it moves.

### The solver and random play

The solver works out the fewest baskets that make the target from the spots or hoops there are (for three ways, the three smallest different ways), then for each basket waits for Pip's turn or Charlie's walk to a spot chalked again, walks to its spot by the next-spot key or a tap, and flies a spread of angles and powers through the game's own flight from where Charlie stands now, in the wind of that throw, to find for each angle the run of powers that go in as wanted (through the right hoop, or off the board); it aims at the middle of the widest run, from the fresh aim each time. Around the world and Copy Pip take each basket from wherever Charlie is walked to. For the sliding hoop it waits until the hoop is at the point of its slide the throw was found for. It searches angles every 0.025 radians and powers every tenth, and for the steepest throw holds the key past its last step so the aim stops at the limit itself. Every variation of every level is won this way by the keys and by a finger, and the same pads replay to the same yard. Random key presses (an arrow held, Space or the next spot at random moments) win none of 20 rounds on any level. Throws aimed uniformly at random over the whole range, from spots chosen at random, win 3 of 60 rounds on the first level, 1 of 60 on Two hoops and none on the rest. The tests allow three in ten on the first level and one in ten on each other. The rules version is `-hoops-3`.

The shoot-around keeps the best run of baskets in a row through the page's `saves`, `checkpoint` and `restore`, as Pinball garden keeps its best score.

## Charlie's aquarium (5 October 2026)

The owner chose the aquarium from the list of ideas ("like Fishdom: place fish and plants, keep the water balanced; maths: volume, fish per litre, grouping") and asked that its play be more than placing things. It is id `aquarium`, in `school/games/aquarium.ts`, with its variations and pilot in `aquarium-challenges.ts` and three new pieces of the engine: `engine/motion/shoal.ts` (fish that shoal by kind), `engine/motion/net.ts` (a net whose speed decides whether fish dodge it) and `engine/motion/waterquality.ts` (oxygen and cleanness). The game we looked at was Fishdom, where a tank is filled with fish, plants and decorations and kept healthy. What we took is the tank as a living place, the fish that swim in shoals and react to the glass being tapped, decorations and plants, and a tank that looks after its fish only when it is looked after. What we left is the match-three puzzles that earn Fishdom's coins, the shop and the timers; here every action is done with the hands in the tank itself.

Each level is a request: a tank to fill to a line, fish to net and carry into another tank, flakes to toss, plants to place, a dial to set, or a tank to make healthy. The water is real drops from `liquid.ts`: a jug carried over a tank and lowered pours a trickle that grows to a full stream the lower it goes, the drops that reach the surface add their litres, and water poured past the rim spills down the outside with a splash and a line that says so. The jug held down in the water scoops out by degrees, faster the deeper it is, for as long as it is held, so a tank filled too far is put right in a second or two. Fish shoal by kind and drift on a meander that is the same on every replay. A net swept slowly and smoothly is not noticed and a fish in its mouth is caught; a net moved fast startles every fish near it by degrees, and they dart off before it reaches them. A caught fish wriggles in the net, and carried over and dipped into another tank it is let go there. A pinch of flakes is pulled back from anywhere on the field and let go from the tub, flies in an arc, and drifts down through the water while the hungry fish dart to it. Flakes nobody wants settle on the gravel and cloud the water until a snail or the filter clears it. Plants and the filter give oxygen, snails and the filter clean, crowding takes both, and a meter on the cabinet shows the two readings with a line where each becomes fine. A fish whose tank is not right droops (its fins fall, its eyes half close and it swims low and slow) and perks up as soon as the tank is put right: its water fine, warm enough for its kind, nothing in it that chases it, plants for a neon to hide in, and the litres it needs. Nothing dies.

| Level | Place | Request | What varies |
|---|---|---|---|
| 1. Charlie's first fish | the bedroom | fill to the line, net the guppy from its bag into the tank, feed it 2 flakes | the line (6, 5, 7 or 4 litres) and the guppy's colour |
| 2. Neons for a customer | the pet shop | a 12 litre tank, 2 litres a neon: net exactly that many in | 12 and 2, 12 and 3, 10 and 2, 16 and 4 |
| 3. Three quarters full | the classroom | fill to a fraction of the class tank, then net three guppies in | 3/4 of 8, 1/2 of 10, 2/3 of 9, 1/4 of 12 |
| 4. Feeding time | the bedroom | feed 4 goldfish 3 flakes each, 2 flakes a pinch | the fish, the flakes each and the pinch |
| 5. Sort by colour | the pet shop | 12 guppies into three tanks by the tag on each | 12, 15 or 9 fish, and the order of the tags |
| 6. A balanced pond | the garden pond, with frogs | at least 2 plants for every 4 fish, and the oxygen up | 8, 4 or 12 fish |
| 7. Warm water | the aquarium tunnel | set the heater for the tropical neons | 26, 25, 27 or 24 degrees |
| 8. Some fish chase | the aquarium tunnel | move the neons away from the angelfish into the planted tank | 5, 4, 6 or 3 neons |
| 9. Keep it healthy | the classroom | the 12 litre class tank is crowded and cloudy: make both tanks healthy | 8, 7 or 9 guppies |
| 10. Charlie's own tank | the bedroom | fill it, plant it and bring the guppies home healthy, kept for next time | |

How the six ingredients are met. The hand sets things by degrees: how far the jug is lowered sets how fast it pours, and how deep it is held in the water how fast it scoops, how fast the net moves sets how alarmed each fish is, and how far a pinch is pulled back sets how far it flies. Physics after the action: the drops fall and fill, the pinch flies and the flakes drift down, the fish dart and shoal on their own, and the water's readings ease towards where the tank puts them over a few seconds. Retries cost nothing: water can be scooped back out, a fish carried back, a plant picked up again, and Again starts the level over at once. Places, not screens: Charlie's bedroom, the pet shop, the garden pond with frogs on its stones, the public aquarium's tunnel and the school's class tank, each from the shelf's drawings. Fading previews: on the first levels the dotted flight of a pinch shows where it will land and turns green over the water, the litres are written as the tank fills, the pour and the scoop slow to a trickle as the water nears a fill's line, and a ring round the net is green while it is calm enough to catch; later levels show neither the litres nor the ring, and pour at full speed to the end. Maths in the targets: litres read off a scale, a fraction of a tank, a division of litres by litres a fish, a multiplication of fish by flakes and a division by the pinch, grouping by colour, a ratio of plants to fish, degrees on a dial, and fish per litre when a tank is crowded.

The first level follows what Feed the pup and the garden taught: it is forgiving (the line counts within half a litre, and an extra flake only clouds the water), its outcomes are visible (the litres climb beside the tank, the step strip ticks), the contextual Action button says what the hand can do where it is ("Take the jug", "Pour", "Scoop out", "Let go", "Toss", "Plant", "Filter on"), and on the first levels a strip of steps across the top and an arrow from `guide.ts` point at the next thing, the arrow at once on a guided level and after a wait on the others. After a wait the line above the field says what the step to do needs. We left out the garden's speech bubble, since at this field's size it covered a tank on every level.

The controls are presses and drags on the things themselves, with no cursor to steer. Tools rest on a ledge at the top left, and the one the step to do needs glows there, as the arrow points at it. A press on the jug picks it up and the finger carries it: held level above a tank's rim it pours nothing, lowered it tips and pours, slowly just under the carry line and fully at the rim, as the jugs of Measure it out do, and its spout never goes below the rim, so the jug is never drawn in the tank. Held down in the water it scoops instead. When the finger lifts the pour stops at once and the jug goes back to the shelf, so nothing is left lying in a tank. A press on the net picks it up the same way: it follows the finger, sweeps slowly through the water to catch a fish, and lifted over another tank's water lets the fish go there and goes back to the shelf; a net with a fish lifted clear of the water stays where it is, to be carried on with the next press. A press on the food tub starts a pull from the tub, and letting go tosses a pinch; the tub then stays in hand, so the next pinch can be pulled from anywhere, and a tap on the tub puts it back. The things to place lie on a ledge at the top right, and a drag from there to a tank's gravel plants one, as a press on a placed thing picks it up again. A tank with a scale keeps its plants clear of the scale's numbers. The heater's dial on the cabinet turns a degree with a tap on its plus or minus side, and the filter switches with a tap. With the keys, the arrows move the hand (slowly at first and faster the longer they are held, so short presses sweep the net smoothly), aim the food, or turn the dial once it is taken, and Space does what the Action button says: held over a tank with the jug it tips further the longer it is held, and held in the water it scoops. The hand's ring shows only while the keys move it. Plus and minus turn the heater from anywhere, and their round buttons show only on a level with a heater. Escape puts down what is in hand. Every button is at least 44 pixels.

A fill's line is drawn as a band as wide as the litres it counts within, washed once the water is in it, with the litres asked for written beside it when the step names them. Charlie and Pip stand at either end of the cabinet at a size that reads, and cheer for a moment each time a step is done, as well as at the end; Charlie points while the jug pours or scoops, while a fish is in the net and while a pinch flies.

The controls were reworked on 5 October 2026, after the owner found the first version hard to play: the jug poured faster the longer it was held, which ran a tank past its line before a child could stop, a dip of the jug took out only half a litre a tap, and a jug or a net let go of in a tank was left lying there.

Two changes from the brief, and why. The net takes one fish a dip: a net lifted out and dipped again can carry more, up to what the level allows, but a sweep never takes a second fish by accident, so counting a request such as "exactly 6 neons" stays in the child's hands; a finger lifted in the tank the fish came from keeps them in the net unless the net has been out of the water since. And on a feeding request from the fourth level on, more flakes than the fish want ends the round, not won, with the sum it should have been ("Too many flakes: 4 goldfish eat 3 each, which is 12, and 14 went in. Again?"), since otherwise the snail would clear the extra and any number of pinches would win; on the first level an extra pinch only clouds the water. The shoaling in Gone fishing is a lead-and-follow patrol along lanes rather than boids, so it was not moved into `shoal.ts` and fishing's results are unchanged.

Under `prefers-reduced-motion` the game declares `still`: a press pours for a second with the jug in hand and plays a fifth of a second otherwise, and the page draws the water where it settles; the waves, ripples, swaying plants, bobbing diver and bubbles stop, and the fish move only while a press plays. On a phone held upright `portrait.keep` keeps 20 squares across, following the tank in play. The game is a card (`card: { round: { level: 0 }, keep: 30, minutes: 2 }`), whose first level a finger wins in about 15 seconds. The free tank is kept with `saves`, through `checkpoint` and `restore`, which read the litres, the placed things, the filter, the dial and the fish at home back by the level's own rules and refuse anything else.

Every variation of every level is played by a pilot through the pad, once by the keys and once by a finger, and wins; the recorded pads played into a fresh round give the same tank to the step. The pilot watches as a child does: it presses on the jug, carries it over the tank, lowers it and lifts it when the water and the drops still falling reach the line, tipping it gently or holding it in the water to put the level right, sweeps slowly up to a fish, carries it over, tosses as many pinches as the request makes, plants until the meter will settle fine, and turns the dial a degree at a time. Random play for a minute and a half, with fingers down anywhere and arrows and Space at random, won 8 of 600 rounds after the rework of the controls, as before it (0 on most levels, 5 of 60 on the feeding level, 2 of 60 on the pond and 1 of 60 on the warm water); the test allows under 15% on a level and 5% over all. The state is plain data and the same after a trip through JSON. The rules version is `-aquarium-2`. By a finger the pilot wins the first level in about 16 seconds of play, and the end-to-end test wins it with a mouse in about 16 seconds as well. We have not measured the frame rate on a phone's WebKit; a tank steps at most about 15 fish against each other and a pour of up to 420 drops.

## Marble pegs (5 October 2026)

The owner chose Marble pegs from the list of ideas. It is id `pegs`, in `school/games/pegs.ts`, with its variations and solver in `pegs-challenges.ts` and its physics in `engine/motion/pegs.ts`. The games we looked at were Peggle and pachinko, where a launcher at the top of an upright board is aimed and fired, and the ball falls through pegs, lighting each one it strikes, until it drops out of the bottom or into a bucket that slides along it. What we took is the launcher aimed by pointing, the dotted aim to the first peg, pegs that light as they are struck and pop away one after another once the ball has gone, the bucket that gives the ball back, the pegs that pop when the ball is stuck on them, and the slow close look at the last peg. What we left is the coloured peg types and their powers, the score multipliers and the bonus buckets at the end of a level.

The physics is our own, on pinball's sub-step of 240 a second, with the marble's speed capped at 40 squares a second so it moves under a sixth of a square in a sub-step and cannot pass through a peg. The board has round pegs, long pegs (bars with rounded ends), pegs that slide to and fro, a bar that turns, the side walls and the ceiling, and the bucket, whose two rims the marble can bounce off. The marble spins: where it meets a surface, the grip trades its sliding for spin as a solid ball's would, up to three tenths of the push into the surface, so it rolls along a slanted shelf and kicks sideways off a peg it meets spinning. A round peg keeps half the speed into it, a long one 0.42 and a wall a half, and below 0.6 squares a second the marble settles on a surface rather than bouncing. A marble that lands square on the top of a round peg is tipped off the way it leans at 1.2 squares a second, since a perfectly centred marble would otherwise hop there, and the first shot straight down would do just that. Everything that moves is worked out from the board's clock, so the board has no state but the clock and the pegs taken off it, and the same aim fired at the same moment always falls the same way.

The launcher follows the hand. A finger held anywhere on the field turns it towards the finger, and letting go fires; letting go on the launcher itself puts the aim down without firing. A mouse resting on the field turns it too, once the game has started, since the page steps a game only after its first key or press; a click fires. With the keys, left and right turn it half a degree a press, and held for a sixth of a second they turn it a notch a step, three once held two thirds of a second; space fires. The round buttons are the two arrows and Fire, with the `launch` icon, each 44 pixels. Every aim is a whole number of half-degree notches, so a finger and the keys reach the same aim, and the launcher is drawn turning smoothly towards it.

Each peg the marble strikes lights yellow and counts once a shot, however often the marble rattles against it. The chimes of the pegs that count climb a major scale through the shot, a peg that does not count gives a dull tock and lights grey with a line saying why, a peg struck again clacks, and the marble clacks off the walls by its speed. A marble caught by the bucket thunks into it, the bucket glows, and the marble goes back in the tray. Once the shot is over the lit pegs pop away one after another, five steps apart, each pop a little higher than the last and with a burst of sparkles, and the grey pegs go back to plain and stay. A marble that has stopped for a second and a half, or has not gone half a square lower in four seconds, pops the pegs holding it. When the marble is fired the game plays the shot ahead on a copy of the board, which is exact because the physics is, to learn whether and when it meets the target. From 0.3 seconds of board time before that peg to 0.12 after it, the board runs at a quarter speed and the camera closes to 1.8 times on the marble, then eases back out; then the lit pegs pop, Charlie and Pip cheer, and the round's card comes up. Under `prefers-reduced-motion` there is no slow moment and no close look, and a press plays out what it started before the frame is drawn.

The maths is in which pegs count. The header writes the target and the running sum, such as 2 + 1 + 3 + 2 + 2 = 10. On an exact sum, a peg that would take the total past the target lights grey, the total stays where it was, and that marble counts nothing more. We first lit only that peg grey and let the marble go on counting, but with Peggle's rattling shots a marble tops a total up with whatever fits, and random marbles made exactly 10 in about nine rounds out of ten; with the marble spent, the last few points need an aimed shot. A board that can no longer make its target, because no pegs left on it add up to what is missing, ends the round with "9 so far, and no pegs left on the board make 1. Again?", and a tray run dry ends it with "Out of marbles at 8 of 10. Again?". Both are the game's `ended`, not won.

| Level | Place | Ask | Marbles | Aim shown | Random wins |
|---|---|---|---|---|---|
| 1. The garden fence | a garden with a picket fence | 10 or more, from pegs of 1, 2 and 3 | 5 | past three bounces | 100% |
| 2. The sweet jar | a sweet jar | exactly 10, from 3 to 7 | 4 | to the first peg and on, with a ring on it | 48% |
| 3. The seaside | sky, sea and sand, with shells for pegs | 4 even shells | 4 | to the first peg and on, with a ring on it | 22% |
| 4. A starry night | a pale starry sky | every multiple of 3: 3, 6, 9 and 12 | 3 | to the first peg | 20% |
| 5. Clockwork | cogs, with two sliding pegs and a turning bar | 2, 4, 6 and 8 in order | 4 | to the first peg | 16% |
| 6. The slanted shelves | a wall of planks with four slanted shelves | exactly 20, from 4 to 12 | 3 | to the first peg | 17% |
| 7. The brick wall | bricks, with long numbered bricks | every 5 cleared | 5 | a short stub | 21% |
| 8. The fairground | a striped tent with bunting | exactly 100, from 15 to 45 | 3 | a short stub | 26% |
| 9. Free play | plain squared paper | a score, the best kept | 10 | to the first peg and on | |

How the six ingredients are met. The hand sets amounts by degrees: the aim turns half a degree at a time, and a finger points it anywhere across 160 degrees. Physics after release: once the marble is fired nothing steers it, and where it goes is the board's. Retries cost nothing: a peg that does not count stays for the next marble, and the card's Again starts the level over at once. Places, not screens: a garden, a sweet jar, the seaside, a starry night, clockwork, a plank wall, a brick wall and a fairground, with the shelf's trees, sweet jars, lighthouse, palms, lamp posts, clock tower, houses, carousel and balloons standing round the board, and Charlie and Pip watching. Fading previews: the dotted aim is stepped by the same sub-step as the real marble, so it is the marble's own path; it runs past three bounces on the first level, to the first peg and a moment on with a ring round that peg on the next two, to the first peg on levels 4 to 6, and is a short stub on the last two. Maths in the targets: as above.

The board is 22 squares wide and 36 tall with its header, in a view 24 by 38, and fills the room on a desktop with the garden either side. On a phone held upright `portrait.keep` keeps 23 squares across, which is the board, at about 17 pixels a square. The game is not a card (`card: null`): the board has to be seen whole to aim, and a 240 pixel card shows it at under 7 pixels a square.

Each level has four variations (`school/games/pegs-challenges.ts`): as authored, mirrored, with its numbers read from the last peg to the first, and those mirrored. The challenges family `pegs` gives them out without a solver at generation time, as pinball does. The solver tries the launcher at every other notch, plays each shot on a copy of the board until its pegs have popped, and keeps the three best boards for the next marble, judged by how much of the target is met and dropping any that can no longer make it; every variation of every target level is won within two marbles, in about a tenth of a second each. The tests play each win once by the keys and once by a finger held towards each aim and let go on the same step, and both end on the same board; replay the keys to the same state; check that the dotted aim passes through every place the real marble goes before its first peg and names the same peg; play random aims, a marble at a time, 48 rounds a level, and allow over 80% on the first level, at most 55% on the second, 40% on each other, and 30% over all after the first (the table's rates come from 400 rounds a level); and check the state is the same after a trip through JSON. The rules version is `-pegs-1`.

We have not measured the frame rate on a phone's WebKit; a shot steps at most a few dozen pegs four times a step, and the dotted aim steps up to three seconds of board time a frame while the launcher waits. In a headless WebKit run some pegs were drawn without their numbers on the first frames, and Pinball garden's flowers were too in the same run, which points at the sprite worker's fonts on WebKit rather than at this game; a second run drew every number.

## Knock it down (5 October 2026)

The owner asked for a game in the way of Breakout and Arkanoid, where a bat along the foot of the screen sends a ball up into a wall of bricks, and proposed knocking down structures built from the art shelf. It is id `knock`, in `school/games/knock.ts`, with its variations and pilot in `knock-challenges.ts` and its physics in `engine/motion/breakout.ts`. What we took from those games is the bat whose own place under the ball sets the ball's way, so that catching it is also aiming it; a ball that keeps its speed off everything and gets a little quicker through a level; blocks that take one or two hits; and capsules that drop from broken blocks to be caught, here a star, a second ball, a wider tray and a sticky tray that holds the ball until it is served. What we left is the lasers, the enemies, the lives bought with points and the level warp. What we added is that the bricks make a picture standing on something, and a piece that is no longer held up falls.

The physics is our own, on pinball's sub-step of 240 a second. The ball's speed is capped at 24 squares a second, a tenth of a square a sub-step against a radius of 0.45, so it cannot pass through a block a square thick, and a test fires it at the top speed at a block from every angle. The ball keeps its speed off the walls, the ceiling and the blocks, and meets at most one block a sub-step, the one it is deepest into, as a brick breaker breaks one brick a touch. No bounce lets it leave flatter than 0.32 radians off the level, so it never runs back and forth between the walls. Off the tray, where it meets the tray along its length sets its lean, up to 60 degrees off the upright at the very end, and the tray's own speed turns it by up to a further 0.18 radians, so a tray moving as it catches the ball sends it on that way. The ball's speed starts at the level's own, from 10 to 13 squares a second, and rises a fifth of a square a second each catch to the level's most.

A block stands while a chain of blocks touching it side to side or end to end reaches one that is fixed: a rock, a trunk, a mast or a launch pad, drawn hatched and never broken. A wall with a hole in it stands, and a piece cut off from its base, such as the eave of a roof whose top row has gone, comes away whole. A piece that comes away falls under a gravity of 30 squares a second each second, pushed away from where it was cut and turning as it goes; it bounces off the tray harmlessly, breaks up in dust on anything still standing, and leaves the field at the foot. When a round is won, everything still standing comes down the same way.

The tray follows the hand. A finger held anywhere on the field leads it, the tray closing on the finger's place by 16 times the gap a second and never faster than 45 squares a second, so it follows without shaking and never passes the finger; it rides on the tray line well above the finger, so the hand never covers it. A resting mouse leads it too, once the game has started. With the keys, left and right (or A and D) bring it towards 26 squares a second, quickly but not at once, and a fresh press moves it a third of a square at once, so a tap is a fine step; let go, it stops within a few steps. A ball waits on the tray to be served, a third of the way from the middle, and the tray carries it while the child chooses where to serve from; space, the round Serve button with the `launch` icon, or a finger let go serves it. The round buttons are the two arrows and Serve, each 44 pixels.

The maths is in which blocks count, and a block that does not count does not break: the ball bounces off it, it greys for two thirds of a second, and the line above the field says why, such as "6 + 7 would make 13, more than 10, so the 7 stays. Still 6." On a sum, only what the ball breaks counts: a numbered block that falls says "The 4 fell, so it does not count", since a piece coming down on its own would otherwise top up the total. On the other asks a block that falls counts if the ball breaking it would have. The sign over the frame writes the target and the running sum, such as 3 + 2 + 5 = 10, with the balls left in a tray beside it. A round ends not won when the balls run out ("Out of balls at 6 of 10. Again?"), or when the target can no longer be met: no blocks left that add up to what is missing, no stars left that do, a number that fell before its turn, or too few windows left.

| Level | Structure | Ask | Balls | Path shown | Random wins |
|---|---|---|---|---|---|
| 1. The little house | a brick house with two windows and a roof, on a small rock | knock down 8 blocks | 5 | back down to the tray | 75% |
| 2. The town house | a two-storey house with six windows and a door | knock out 4 windows | 4 | to the first thing it meets | 3% |
| 3. The toy tower | numbered toy blocks stacked on a playroom pad | exactly 10, from 1 to 5 | 3 | none | 32% |
| 4. The apple tree | leaves and numbered apples on a trunk | every even apple | 4 | none | 12% |
| 5. The castle | stone walls, towers and 12 windows; the bottom row takes two hits | half of the 12 windows | 4 | none | 10% |
| 6. The snowy fir | numbered snowy branches on a trunk | 2, 4, 6, 8 and 10 in order | 4 | none | 2% |
| 7. The rocket | metal panels that drop numbered stars | catch stars that make exactly 15 | 4 | none | 12% |
| 8. The pirate ship | numbered sails on a mast, a hull that takes two hits | every multiple of 4 | 4 | none | 5% |
| 9. The big house | numbered windows in a two-storey house | exactly 50, from 5 to 30 | 4 | none | 10% |
| 10. Block party | rows of numbered toy blocks | a score, the best kept | 5 | none | |

Three layouts were changed after the pilot played them. The snowman was rebuilt as a fir whose numbered branches all grow from its trunk, because in the snowman the 2 sat inside a ring of numbers that were not yet next and so could not be broken, and a needed number could fall before its turn. The ship's sails were hung in rows with air between them for the same reason. The rocket's stars were made mostly ones, twos and threes, because with larger stars a missed catch too often left no way to make 15. Every numbered block is two squares tall, so its number reads at the size the game is drawn.

How the six ingredients are met. The hand sets amounts by degrees: where the ball meets the tray, from one end to the other, is its lean, and a finger or a held arrow puts the tray anywhere along the foot. Physics after release: once the ball leaves the tray nothing steers it, and what falls is what the structure no longer holds. Retries cost nothing: a block that does not count stays, a lost ball is followed by the next on the tray, and the card's Again starts the level over. Places, not screens: a meadow, a street, a playroom, an orchard, a hillside castle, a snowy wood, space, the sea and plain paper, each in the frame with the shelf's trees, hedge, houses, tower, snowman, moon, rocket, lighthouse and palms standing round it, and Charlie carrying the tray with Pip running alongside. Fading previews: the dotted path is stepped by the same sub-step as the real ball on a copy of the round with the tray taken away, so it is the ball's own way, with a dot where it bounces; it runs back down to the tray's line on the first level, to the first thing the ball meets on the second, and is gone from the toy tower on and in free play, so a level is played by eye once the child has the feel. Maths in the targets: as above.

The frame is 24 squares wide and 37 tall with its sign, the field inside it 22 by 33 with the tray's top 28 squares down, in a view 30 by 41 that fills the room on a desktop with the place either side. On a phone held upright `portrait.keep` keeps 25 squares across, which is the frame. The game is not a card (`card: null`): the ball, the structure and the tray have to be seen together, 33 squares tall, and a 240 pixel card shows them at about 7 pixels a square.

Each level has four variations (`school/games/knock-challenges.ts`): as authored, mirrored, with its numbers and its stars' numbers read from the last block to the first, and those mirrored. The challenges family `knock` gives them out without a solver at generation time, as pinball and Marble pegs do. The pilot plays as a child does. It finds where the ball will next come down by playing the round on with the tray taken away, gets the tray there, and on the ball's last stretch down tries eleven places along the tray on copies of the round for one trip up and back, keeping the one that does most for the target and dropping any that leaves it out of reach. Before a serve it tries each square along the foot the same way. It goes for a helpful gift when it can catch it and still be back under the ball, and when a gift comes down just after the ball it meets the ball with the end of the tray nearest the gift. Every variation of every target level is won by the keys and by a finger held where the tray should be and let go to serve, each within five minutes of play, and the whole suite runs in about six seconds. The tests replay each win to the same round; play random hands, an arrow or none held a fifth of a second at a time and a serve now and then, 40 rounds a level, and allow over 40% on the first level, at most 40% on the toy tower, 20% on the others and 12% over all after the first; check that the dotted path passes through every place the real ball goes before it comes back to the tray; and check the state is the same after a trip through JSON. The rules version is `-knock-1`.

The toy tower is easier at random than the rest, about one round in three, because its blocks are big and close to the tray and only blocks that fit can break, so a ball bouncing about there tops the total up by itself; we raised it, gave it three balls and a smaller tray, and stopped there. We have not measured the frame rate on a phone's WebKit; a step moves a ball four sub-steps among at most seventy blocks, and the dotted path steps up to four seconds of play on a copy of the round each frame while it is shown.

## Bolt's rescue (5 October 2026)

The owner chose a robot rescue platformer, inspired by 3D mascot platformers such as Astro Bot, with our own character. It is id `bolt`, in `school/games/bolt.ts`, with its routes and pilot in `bolt-challenges.ts` and its jets and planets' pull in `engine/motion/jets.ts`. Bolt is a small white robot with a round helmet, a dark visor and two blue eyes. On each planet it finds its lost crew, who follow it in a line once found, and walks them up the ramp of its ship, where Charlie waves from the round window; once the seats are full the ship lifts off. What we took from the genre is the punchy run and jump, a hover held at the top of a jump, a spin that breaks things, one gadget a world, and a world that answers everything Bolt touches. What we left is combat, enemies and lives on the first planets.

The running and jumping are the climb's runner in `engine/motion/walker.ts` over `platforms.ts`, with the same coyote time, jump buffer and cut, and with space and up the same key. After the top of a jump, a jump still held fires two little jets: the fall is braked to a slow sink of under a square a second and the run eases to a drift, for 1.2 seconds of fuel shown as a ring of six segments round Bolt, and a landing fills it again. The jets' blast breaks a cracked tile below. A spin (X or Shift, the down arrow, the Spin button, or a tap on Bolt) breaks crates, which may hold a crew member, knocks cracked walls down, rolls boulders away, wakes sleeping crew, and in the air gives one small lift. A crew member shut in a crate peeks over its lid and the crate rocks every few seconds, since owner play showed a closed crate reads as scenery; and at the ship one short, the line says how many are still in crates or asleep and that a spin next to them lets them out. Each planet's gravity keeps Earth's launch speed, so the same jump goes 6 squares on the moon, 4 on Earth and 2 in the heavy junkyard; the goal line says the height, and a test reads it back.

The gadgets are one to a planet, each with its button shown only there, its key (E or Enter for whichever it is) and a tap on what it works on. The spring gloves take a handle within 15 squares and pull its plank out of the far bank as Bolt walks back, 1.6 squares of plank for each square walked, so how far to walk is the child's to judge. The rocket pack fires once a jump, throwing Bolt along at 14 squares a second for under half a second. The magnet slides a metal block along its rail until it stands beside Bolt, as a step up to a ledge the heavy pull puts out of reach.

A fall into a pit puts Bolt back at the last beacon in about half a second with its crew. The first four planets have no lives; from the sand planet on there are three batteries, and the last one spent ends the round not won: "Out of batteries with 4 of 10 crew aboard. Another go?"

The maths is in the crew. Each crew member wears the number it counts for, mostly 1, some 2 and 5, so the count is counted on. The readout in the corner shows the sum of those found ("2 + 5 + 1 = 8 of 12") and the ship's seats as rows of three, four or five that fill as the crew climb aboard, and the win line names the array ("12 aboard: 3 rows of 4"). Gates open for a number of crew and say how many more ("This gate opens for 6 crew. You have 4: rescue 2 more.").

| Level | Planet | Ask | What it adds |
|---|---|---|---|
| 1. The moon | moon, light pull | 3 crew | a crate to spin open, a ledge the moon's 6-square jump reaches, the whole jump arc |
| 2. The ice planet | Earth's pull, slippery | 5 crew, gate for 3 | a gap only a hover crosses, a sleeping robot to wake |
| 3. The jungle planet | Earth's pull | 6 crew, gate for 4 | a spring pad up into the trees, the spring gloves and the plank, a short arc |
| 4. The lava planet | Earth's pull | 8 crew, gate for 6 | rocks rising and sinking in the lava in a wave, a cracked wall |
| 5. The sand planet | Earth's pull | 2 rows of 5 | dunes that sink while stood on, a cracked tile to blast, batteries |
| 6. The gas giant | Earth's pull | 3 rows of 4 | floating clouds that drift and bob, the rocket pack, no arc |
| 7. The junkyard | twice Earth's pull | 4 rows of 3 | a 2-square jump, the magnet and its blocks |
| 8. The crystal cave | Earth's pull | 3 rows of 5 | a wall, a tile, a boulder, a hover and a crate in one |
| 9. The playground planet | Earth's pull | 10 crew | free play: every crew member ever flown home is counted in the browser |

The previews fade: the dotted arc of a full jump from where Bolt stands, stepped by the same runner, shows whole on the moon, the ice and the playground, as its first rise on the next three, and not at all from the gas giant on.

Each target level has three variations of the numbers on its crew (`BOLT_LEVELS[...].variants`), and the playground planet two. The challenges family `bolt` hands one out only once a route has rescued it by the keys and by a finger with the buttons. The pilot follows a written route of runs, hops held for so long, spins, gadgets, waits and rides, one step at a time through the game, and a tap or a button is recorded between steps as a child's would be. The tests replay every win to the same state, and play random hands (a direction, a jump tapped or held, a spin and the gadget now and then) for a minute and a half, 12 rounds a planet: at most 4 wins on the moon and 2 on the others. Measured over 40 rounds a planet: the moon 7, the ice planet 1, the sand planet 2, and none on the other six. The moon is meant to be easy, and random hands find 86% of its crew. The card plays the moon by a finger alone in about ten seconds, at a keep of 24 squares.

The view is 32 by 20 squares and follows Bolt with a lead the way it runs; once the crew are aboard it moves to the ship and holds it above the round's card while it rises 6 squares on its flame. On a phone held upright `portrait.keep` shows 22 squares round Bolt. Under `prefers-reduced-motion` a press plays a third of a second and the jump, the spin and the lift-off settle before they are drawn, and the shake and dust are left out. We have not measured the frame rate on a phone's WebKit; a step is one runner step, the crew's footprints and at most a few rocks and pieces, and the arc steps up to two seconds of the runner each frame while it is shown. The rules version is `-bolt-1`.

How the six ingredients are met. The hand sets amounts by degrees: how long a jump is held sets its height and then how long the jets burn, and how far Bolt walks back sets how far the plank comes out. Physics after the action: a jump, a hover, a boulder's roll and a piece's tumble play out by their own rules once begun. Retries cost nothing: a fall is back at the beacon in half a second with the crew, and batteries come only from the fifth planet on. Places, not screens: eight planets each with its ground, pull, sky and obstacles. Fading previews: the arc, whole then short then gone. Maths in the targets: crew counted on in ones, twos and fives, gates that open for a number, seats as rows, and a jump read as a height against Earth's.
