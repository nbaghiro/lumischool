# Physics

Status: built in the scratchpad, September 2026. This document covers the physics track: what was
missing and thin in its first fifteen lessons, what the frameworks and the research on children's
ideas ask of physics between five and ten, the principles the track now follows, the core concepts
by grade with the coverage before and after, the twenty three drawings added to the shelf and their
settings, the seven checkers that prove a physics answer from its drawing, the thirty one lessons,
toys the Games tab could build on the same drawings, and the order to build the rest in. It replaces
the physics section of [tracks.md](tracks.md), which now points here.

Built: twenty three drawings on the science shelf, nine in `scratchpad/src/art/physics.ts` and the
rest in four new files by concept, `machines.ts`, `light.ts`, `vibration.ts` and `sky.ts`; seven
checkers in `scratchpad/src/physics/prove.ts`, registered in `src/lang/checkers.ts`; and the track
grown from fifteen lessons on thirty one items to thirty one lessons on a hundred and seventy seven
items. The fifteen lessons kept their ids and were rebuilt to the lesson standard of
[audit.md](audit.md); sixteen were added, three in grade one, three in grade two, four in grade
three and six in grade four. Two existing drawings gained a setting (`held` on the see-saw, `show`
on the magnet) and the circuit was moved onto the helpers the new electrical drawings share, with
its output unchanged.

## What was missing and thin

The fifteen lessons covered forces as arrows, weight on a spring scale, temperature, speed and
distance, floating, a ramp, shadows, one circuit, magnets, the see-saw rule, rates and a fair test.
Measured against the frameworks below, whole strands were absent. There was no sound at all, no
light source, nothing on seeing or reflection, no sun, moon or Earth beyond the shadow of a stick at
different times, no conductors or insulators, no friction on different surfaces, no gravity or air
resistance, no levers, pulleys or gears, no pendulum and nothing on what makes a bulb brighter.
England puts sound, electricity, light, and forces and magnets in its first two years of key stage
two, and the NGSS puts sound, light and the patterns of the sky in grade one, so these are not
extras for the able child.

What was there was thin. The thirty one items drew on fifteen shelf drawings, not counting choice
cards and match lines, and seven lessons drew one picture throughout. The circuit lesson had two
items and one kind of loop, a cell, a bulb and a switch. Magnets were two items, a count and one
pair of poles. Floating was counting which things floated in a picture that showed it. The fair
test lesson came down to a subtraction or continuing a pattern, and no item anywhere asked which
test was fair or which thing had changed.

It was also too easy. The audit graded thirteen of the thirty one items below their grade and found
no reasoning or non-routine item in the subject; none of its fourteen "Try this" blocks asked for
reasoning. Two items could be answered by looking: `physics.seesaw-balanced` drew the plank tilted by
the answer, and `physics.temp-rate` started between the five-degree marks, so its readings could
not be read exactly.

## What current practice asks

We read the England programmes of study for science at key stages one and two in full, and the NGSS
pages for each performance expectation named here. The research on children's ideas was read
through the Institute of Physics' misconceptions collection, published reviews and the abstracts of
the studies they cite; where we only read an abstract, a summary or a title, the source list says
so.

England's national curriculum is statutory and is set by year. Year 1 observes the four seasons and
"how day length varies". Year 3 has light ("they need light in order to see things and that dark is
the absence of light", light "reflected from surfaces", shadows "formed when the light from a light
source is blocked by an opaque object", and "patterns in the way that the size of shadows change")
and forces and magnets ("compare how things move on different surfaces", magnets that "attract or
repel each other and attract some materials and not others", two poles, and to "predict whether two
magnets will attract or repel"). Year 4 has sound (made by "something vibrating", pitch and "features
of the object that produced it", volume and "the strength of the vibrations", and "sounds get fainter
as the distance from the sound source increases") and electricity (a series circuit with cells,
wires, bulbs, switches and buzzers, whether a lamp lights from "whether or not the lamp is part of a
complete loop with a battery", and "common conductors and insulators", with metals as good
conductors). Year 5 has Earth and space (the Earth and planets round the Sun, the Moon round the
Earth, "the Earth's rotation to explain day and night and the apparent movement of the sun") and
forces (gravity, "air resistance, water resistance and friction", and mechanisms, "including levers,
pulleys and gears", that "allow a smaller force to have a greater effect"). Year 6 has light seen
"because they give out or reflect light into the eye" and electricity with brightness associated
with "the number and voltage of cells", and circuit symbols. Working scientifically runs through all
of it: from Year 3, "comparative and fair tests", and using results to "make predictions for new
values".

The NGSS sets performance expectations by grade. Kindergarten compares "different strengths or
different directions of pushes and pulls" (K-PS2-1) and the effect of sunlight on the ground
(K-PS3-1). Grade one has sound from vibrating materials (1-PS4-1), objects seen "only when
illuminated" (1-PS4-2), the effect of materials placed "in the path of a beam of light" (1-PS4-3),
the patterns of the sun, moon and stars (1-ESS1-1) and daylight through the year (1-ESS1-2). Grade
three has balanced and unbalanced forces (3-PS2-1), a pattern of motion used "to predict future
motion", with a pendulum as the example (3-PS2-2), and electric and magnetic forces between objects
"not in contact" (3-PS2-3). Grade four has energy "transferred from place to place by sound, light,
heat, and electric currents" (4-PS3-2), a device "that converts energy from one form to another"
(4-PS3-4), waves described by amplitude (4-PS4-1), and light "reflecting from objects and entering
the eye" (4-PS4-2). Grade five has gravity pulling down (5-PS2-1) and the daily pattern of shadows
and of day and night (5-ESS1-2).

The two agree on the concepts and differ on timing: England reaches circuits and magnets at eight
and brightness at ten, where the NGSS reaches sound and light at six and energy at nine. We placed a
concept at the earlier of the two where a drawing makes it concrete, and at the later where it needs
reasoning a younger child does not have.

The research on children's ideas decides what a question should test. The ideas that recur across
these sources, and that the track now asks about directly, are these:

- A heavier thing falls faster (IOP Spark), and by the same idea a heavier bob swings faster. The
  parachute questions compare toys of the same weight with different canopies, and the pendulum
  questions compare bobs of different weight on the same string, where the answer is "the same".
- The eyes send something out, or light is not part of seeing at all (Osborne and others, 1993; IOP
  Spark). The `seeing` drawing draws the light from the lamp to the ball to the eye, or the wrong
  ways round, and the child picks the one that shows how we see.
- Dark is something rather than no light, and shiny things such as the moon and a mirror give out
  light. England's Year 3 statement answers the first in its own words, and the second has a study
  of its own on the moon, which we know by its title. The light lessons ask whether a girl can see
  in a dark room and where the moon's light comes from, and count the things that could not light a
  dark room by themselves.
- A bulb uses up the current, so the first bulb in a loop is brighter (Shipstone, 1984, through the
  reviews that cite it). Every bulb in a `series` loop is drawn equally bright, and a brightness
  question compares two whole loops.
- The moon's shape is the Earth's shadow on it, the eclipse model, which the research reviewed by
  the Lunar and Planetary Institute, Trundle, Atwood and Christopher's among it, finds to be the
  commonest idea from elementary school to college. The month of moons draws the sunlit part of
  the moon and no shadow, and asks for the next shape and the next full moon by date rather than for
  a reason the drawing cannot show.
- The sun goes round the Earth, or goes behind the hills at night (Vosniadou and Brewer, 1994). The
  globe turns under a sun that stays still, and asks where it is day and where it will be six hours
  later.
- Every metal is magnetic. The coin and the foil let electricity through and are not pulled by a
  magnet, and one question asks for exactly that thing.

## The principles

A drawing is the apparatus, and the answer comes from it. Every new drawing a checker reads decides
what it shows with a function that the checker also calls: `loopGlow` lights the bulbs and says
which loop is brighter, `traceMaze` draws the beam and names the letter it reaches, `moonOn` shades
the moon and names its shape. The verifier then proves the answer for every version of the item, so
a question cannot say one thing while its picture shows another, and a new version can be added by
changing a number.

Nothing is read off. Where the result would give the answer away, the drawing has a setting that
leaves it to be worked out: `show=0` on a loop draws the bulbs waiting with a question mark in
place of the glow, `held=1` props the see-saw level until it is let go, and `show=0` on two magnets
leaves a question mark between them. The seesaw item that was read off the tilt now holds the
plank level in every version.

Predict, then check. A lesson asks for a prediction with the result hidden and then shows the same
apparatus with the result drawn, so the child's idea meets the evidence: which wrapped cup will be
warmer before the thermometers are drawn, whether the boat still floats with one more block, which
of two loops is brighter before either lights.

Fair tests run through the track. Beside the fair test lesson, a question in the ramp, friction,
pendulum, pitch and parachute lessons asks which two tests show whether one thing matters, or
whether a test someone ran was fair, with the answer checked from the settings of the drawings in
it.

A lesson has three bands, as [audit.md](audit.md) sets out: a way in any child can start, a core
of at least ten questions from at least five items in which the unknown moves between positions,
and two starred "Try this" questions, one that needs a reason and one that is not routine. Every
item's first hint asks a question rather than telling, such as "Find the drum whose rice jumps
highest. Is that the quietest or the loudest?", and a second rung, where there is one, narrows it.

Everything prints in black. Colour a question depends on is also a hatch or a label: a lit bulb is
stippled and a dim one hatched, the prism's bands have their letters beside them, the floors have
their names, and the cups' wraps are written under them.

A drawing never moves to a different reading. The wind turbine's blades turn when the shelf moves,
because the number of lamps it lights does not depend on where the blades are; nothing else here
moves, because a swinging pendulum or a jumping grain of rice would change what the picture says.

## The core concepts by grade

Our grade one is a child of six to seven, so it takes England's Year 1 and Year 2 and the NGSS
kindergarten and grade one; grade four takes England's Year 5 and the stretch of Year 6.

Grade one: which way a push or a pull moves something and that a bigger push wins; heavier and
lighter on a spring scale; hot and cold on a thermometer, and that a cup cools; faster and slower
from times and distances; that a sound comes from something shaking, and a harder hit is louder;
that we need light to see, and which things give out light; the length of a day through the year,
and the moon's shape changing through a month.

Grade two: how things move on different floors, measured with a force meter; floating, sinking and
how much a boat can carry; a ball rolling down a ramp, and a fair test of its height; how a shadow's
length changes; sheets that let all, some or none of the light through; that a mirror turns a beam
of light, followed through a maze; the legs of a journey.

Grade three: forces in newtons, balanced and unbalanced; a complete loop with switches, bulbs,
buzzers and motors, and why a loop stays dark; conductors and insulators; magnets, their poles and
the metals they pull; speed from distance and time; the pendulum, whose string decides its swing and
whose bob does not; pitch from the length of what shakes and loudness from how hard.

Grade four: gravity and air resistance on a parachute; loading a boat; how many cells and bulbs
make a loop brighter or dimmer, and energy passed from the wind to a lamp; rates; the see-saw rule;
levers, the wheel and axle, pulleys and gears; day and night from the Earth turning, the moon by
date and the planets in order; how we see, a periscope and the colours in white light.

The coverage, strand by strand, with the items that ask about each before and after:

| Core concept | Where the frameworks put it | Grade here | Before | After |
|---|---|---|---|---|
| Pushes and pulls change how things move | K-PS2-1; Year 3 and 5 notes | 1, 3 | 2 lessons, 4 items | 2 lessons, 12 items |
| Balanced and unbalanced forces | 3-PS2-1 | 1, 3 | 1 item | 5 items, four of them stretch |
| Weight as a force on a spring scale | Year 5 gravity; measuring in newtons | 1 | 1 lesson, 3 items | 1 lesson, 6 items |
| Friction and surfaces | Year 3 and 5 | 2 | 1 item on a rough ramp | 1 lesson, 6 items with a force meter |
| Gravity and air resistance | Year 5; 5-PS2-1 | 4 | none | 1 lesson, 4 items |
| Floating, sinking and loading | named in neither; kept from the first fifteen | 2, 4 | 2 counting items | 2 lessons, 8 items |
| Magnets: poles, attract and repel, magnetic metals | Year 3; 3-PS2-3 | 3 | 1 lesson, 2 items | 1 lesson, 6 items, and the tray |
| Levers, wheels, pulleys and gears | Year 5 | 4 | the see-saw only, 3 items | 3 lessons, 19 items |
| A pattern of motion: the pendulum | 3-PS2-2 | 3 | none | 1 lesson, 6 items |
| Speed, distance and time | 4-PS3-1; maths measurement | 1, 2, 3 | 3 lessons, 6 items | 3 lessons, 18 items |
| A complete loop, switches and components | Year 4 | 3 | 1 lesson, 2 items | 2 lessons, 11 items |
| Conductors and insulators | Year 4 | 3 | none | 1 lesson, 6 items |
| Brightness and the number of cells | Year 6 | 4 | none | 1 lesson, 5 items |
| Energy passed along | 4-PS3-2, 4-PS3-4 | 1, 4 | none | 5 items, still thin |
| Temperature and heat leaving a cup | K-PS3-1, 4-PS3-2; Year 4 | 1, 4 | 3 items | 8 items |
| Light sources, and dark as no light | Year 3; 1-PS4-2 | 1 | none | 1 lesson, 6 items |
| See-through, cloudy and opaque, and shadows | Year 3; 1-PS4-3; 5-ESS1-2 | 2 | 1 lesson, 2 items | 2 lessons, 13 items |
| Reflection, and light in straight lines | Year 3 and 6; 1-PS4-3 | 2, 4 | none | 2 lessons, 10 items |
| How we see | Year 6; 4-PS4-2 | 1, 4 | none | 3 items, and the periscopes |
| Sound comes from shaking | Year 4; 1-PS4-1 | 1 | none | 1 lesson, 6 items |
| Pitch and loudness | Year 4; 4-PS4-1 | 3 | none | 1 lesson, 6 items |
| Sound travels, and fades with distance | Year 4 | | none | none |
| Day and night, and the sun's path | Year 5; 1-ESS1-1; 5-ESS1-2 | 2, 4 | 2 shadow items | the same 2, and 3 on the turning globe |
| Day length through the year | Year 1; 1-ESS1-2 | 1 | none | 3 items |
| The moon's shapes through a month | 1-ESS1-1; Year 5 | 1, 4 | none | 4 items |
| The planets round the Sun | Year 5 | 4 | none | 2 items, thin |
| Fair tests and predictions | Years 3 to 6; 3-PS2-1 | 2, 3, 4 | 1 lesson, no fair-test item | a fair-test item in 5 lessons, and 10 puzzles |

The counts are distinct items placed by the lessons of that strand; a lesson that reaches two strands
is counted in each. Two things in the table are honest gaps rather than choices: nothing asks how
sound travels through a material or fades with distance, and energy has five items across the four
years where the NGSS gives it most of grade four. Both are first in the order of work.

## The drawings and their settings

Every drawing is on the science shelf with a catalogue entry of two to six takes and a line in
`src/art/shelf-groups.ts`. Settings a question varies are numbers, as [tracks.md](tracks.md)
requires; `show` is 1 to draw the result and 0 to leave it to be worked out, and `tag` puts a
letter by a drawing so two of them can be compared.

| Drawing | File | Settings | What it shows, and the rule it is drawn by |
|---|---|---|---|
| `series` | physics.ts | `cells`, `bulbs`, `buzzer`, `motor`, `closed`, `loose`, `show`, `tag` | A series loop of up to four cells and three bulbs, with a buzzer, a motor and a switch, a wire that can come loose, and a question mark where the result is left to work out. It lights when there is a cell, the switch is closed and no wire is loose; each bulb's brightness is the cells shared among the parts, so the bulbs in one loop are always equal |
| `tester` | physics.ts | `thing`, `show`, `tag` | A cell, a bulb and two crocodile clips holding one thing from the tray; the bulb lights when the thing is metal |
| `things` | physics.ts | `things` (names), `letters` | A tray of lettered things, drawn from one table that says what each is made of, whether it conducts, whether a magnet pulls it and whether it gives out light: a nail, a clip, foil, a coin, a ruler, an eraser, a stick, a marble, a candle, a torch, a lamp, the sun, the moon, a mirror |
| `forcemeter` | physics.ts | `reading`, `max`, `surface`, `unit` | A force meter pulling a shoe across ice, wood, carpet or sandpaper, each floor with its own texture and name |
| `parachute` | physics.ts | `canopy`, `weight`, `drag`, `labels`, `unit`, `tag`, `show` | A toy under a canopy with its weight pulling down and the air pushing up, arrows to scale; it speeds up, falls steadily or slows down as the push is less than, equal to or more than the weight |
| `boat` | physics.ts | `cargo`, `side`, `sits`, `arrows` | A boat in a tank with a scale on its side; it sits one square deeper for each block, as the question states, and sinks when the water reaches its side |
| `pendulum` | physics.ts | `length`, `mass`, `swing`, `tag` | A bob on a string drawn at its length, between two dashed places; the shorter string swings faster and the bob's weight does not matter |
| `turbine` | physics.ts | `wind`, `lamps` | A turbine on a hill with a cable to a house; each step of wind lights one more lamp, up to the lamps there are. Its blades are the one moving part |
| `wrapped` | science/wrapped.ts | `wraps` (list), `start`, `minutes`, `show`, `ice`, `room` | Up to four cups of hot water, unwrapped or in paper, bubble wrap, foil, cloth or wool, each with a thermometer; each wrap loses a fixed number of degrees every ten minutes, down to the room. With `ice` each cup holds an ice cube instead, drawn smaller as it melts, and reads 0 until the ice has gone, then rises towards the room: after twenty minutes in a room at 20 the bare cup reads 20, paper 15, foil 10, cloth 5 and wool 0 |
| `falling` | science/falling.ts | `things` (list), `time`, `show`, `names` | Two to four things let go together from a branch, one to a column, with a dashed line at the height they started from; at `time` 1 and 2 each has come down by its own fixed speed, which from fastest to slowest is the stone, the crumpled paper ball, the leaf, the flat sheet, the parachute and the feather, and at 2 the stone is on the ground |
| `stringphone` | science/stringphone.ts | `mode`, `taut`, `pinch`, `rings`, `through` | Two children with a paper cup each and a string between them, which carries the voice only while it is taut and unpinched; with `mode` through it is a fist knocking at one end and an ear at the other, with air, a wooden table or a tank of water between them |
| `orbit` | science/orbit.ts | `moon`, `places`, `arrow`, `person`, `time` | The Earth and the moon's ring round it from high above the north pole, sunlight from the left so the left half of each is lit; the moon stands at one of eight places, `places` letters them A to H, and `person` stands a child on the Earth at noon, dusk, midnight or dawn |
| `lever` | machines.ts | `fulcrum`, `load`, `push`, `unit`, `marks` | A plank on a pivot with a stone at one end and a push at the other, steps marked from the pivot; the push lifts the stone when push times its steps is more than load times its steps |
| `pulley` | machines.ts | `ropes`, `load`, `show`, `unit`, `tag` | One to four ropes holding a load, with the pull the load divided by the ropes |
| `gears` | machines.ts | `a`, `b`, `c`, `turn`, `show` | Two or three meshing gears with their teeth counted; each turns the other way from its neighbour, and B turns a divided by b times for each turn of A |
| `wheelaxle` | machines.ts | `wheel`, `axle`, `load`, `show`, `unit`, `tag` | A wheel and axle hung from a beam with its two radii marked; the pull is the load times the axle's radius over the wheel's |
| `mirrors` | light.ts | `cols`, `rows`, `torch`, `rise`, `fall`, `goals`, `show` | A box of squares with a torch on its left, mirrors in some squares and lettered goals round the edge; the beam turns a right angle at every mirror and leaves by one goal |
| `periscope` | light.ts | `tall`, `flip`, `show`, `tag` | A periscope beside a wall with a bird on the far side; it works when its two mirrors are parallel |
| `prism` | light.ts | `letters`, `blank` | White light split by a prism into seven bands on a screen, each with its letter, one of which can be left blank |
| `seeing` | light.ts | `lamp`, `arrows`, `tag` | A lamp, a ball and a child, with arrows the right way (lamp to ball to eye) or one of the wrong ways, or the lamp off |
| `beam` | light.ts | `sheet`, `show` | A torch shining through clear glass, tracing paper or card onto a wall, with the shadow cone from the sheet's edges |
| `bands` | vibration.ts | `lengths`, `thick`, `pluck`, `loud`, `letters` | Bands stretched along a board, each with its own bridge; a plucked band blurs and sends out rings, more for a hard pluck. With the same thickness, the shorter shaking part is higher |
| `ricedrum` | vibration.ts | `hit`, `tag` | A drum with rice on its skin, just struck; the harder the hit, the higher the rice jumps and the more rings come off it |
| `moonphases` | sky.ts | `from`, `step`, `count`, `blank`, `days` | Moons on days of a month, each lit by the rule for its day, with one box that can be left blank |
| `globe` | sky.ts | `hours`, `turn` | The Earth from above the north pole under a sun that stays still, with children at hours of the day; it is day between six and six |
| `sunpath` | sky.ts | `rise`, `set` | The sun's arc from sunrise to sunset over a house and a tree, with the two times written |

`seesaw` gained `held`, which props the plank level on two supports, and `magnet` gained `show` for
two magnets whose meeting is to be worked out. The planets' names were staggered so eight fit at
the size a lesson uses them. By agreement with the chemistry track, it will reuse `things` and its
checker for questions about materials and draws its own `materials`, and heat as energy leaving a
cup is drawn here, as `wrapped`.

## The checkers

Each checker reads the drawing in the scene and calls the rule the drawing was drawn by, so an
answer the item states has to agree with it, and one it does not state is taken from it. A checker
refuses a version it cannot answer honestly rather than guessing, and the verifier reports that as
an error in the item, which is how a question that could be argued never reaches a child.

| Checker | Drawings | What it answers | What it refuses |
|---|---|---|---|
| `physics.circuit` | `series`, `circuit`, `tester` | whether a loop lights, sounds or turns; why it is dark; the dark one or the brighter one of two; which one change brightens, dims or mends a loop; how many faults it has; which of two lights | a fault question on a loop with none or two faults; brightness in a loop with a buzzer or a motor, where the rule is only roughly true |
| `physics.things` | `things` | how many things conduct, insulate, are metal, magnetic, metal and not magnetic, or give out light; the one thing that does | a tray where none or two things answer an "only" question; a thing the table says nothing about |
| `physics.machine` | `lever`, `pulley`, `wheelaxle`, `gears` | whether a lever lifts, the push that balances it; the pull a pulley or a wheel needs, and the easier of two; which way a gear turns and how many times | a lever that balances when asked whether it lifts; a gear that is not there |
| `physics.light` | `mirrors`, `periscope`, `seeing`, `beam`, `prism` | the goal a beam reaches and how many mirrors it turns at; whether a periscope or a seeing picture works, and which of two; how much light a sheet lets through; the missing colour | a maze whose beam misses every goal |
| `physics.sound` | `bands`, `ricedrum` | the highest and the lowest band; the louder of two drums, or the same | bands of different thickness, or two of one length |
| `physics.sky` | `moonphases`, `globe` | the moon's shape in a box, and whether it is growing; day or night for a child, and six hours later | a day too near the line between two shapes; sunrise and sunset themselves |
| `physics.forces` | `parachute`, `boat`, `pendulum`, `turbine`, `wrapped` | whether a parachute speeds up, falls steadily or slows, and the slower of two; whether a boat sinks, how deep it sits and what it carries; the faster of two pendulums; how many lamps are lit; the warmest and coldest cup, a cup's reading, and, of cups that started with ice, the cup whose ice has melted most | a tie for the warmest cup, and a tie for the ice melted most |

Sixty two items are proved by these checkers. The rest ask for readings, sums and comparisons the
maths checkers already prove, or for a choice whose answer the item states from the same settings.

## The lessons

Units are numbered across the whole track: 1 Forces, 2 Heavy, hot and fast, 3 Water, slopes and
shadows, 4 Circuits and magnets, 5 Measuring motion, 6 Balance and machines, 7 Sound, 8 Light and
seeing, 9 The sun, the moon and the Earth. The first six are the units of the first fifteen, with
the first and sixth renamed for what they now hold.

| # | Grade | Unit | Lesson | New or refreshed | The concept | The thinking asked for |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | Push and pull | refreshed | a push or pull moves a thing its way, and the bigger one wins | two equal pushes from both sides, and how many children even up a tug of war |
| 2 | 1 | 2 | Heavy and light | refreshed | a heavier thing pulls a spring scale further | predict the reading when half the apples go, and work back from a reading to the apples |
| 3 | 1 | 2 | Hot and cold | refreshed | reading a thermometer, and that a hot cup cools | predict which wrapped cup stays warmer, then how many degrees more one lost |
| 4 | 1 | 2 | Fast and slow | refreshed | faster means less time or more distance | same time and further, then a tie from different times and distances |
| 5 | 2 | 3 | Floating and sinking | refreshed | a boat sits deeper as it is loaded | predict whether it floats with one more block, then the most it can carry |
| 6 | 2 | 3 | Rolling down a ramp | refreshed | a higher start rolls further | predict a new height from the pattern, then choose the two tests that are fair |
| 7 | 2 | 3 | Where a shadow comes from | refreshed | a shadow's length follows the light | predict what lifting the lamp does, then a tree's height from its shadow |
| 8 | 2 | 5 | How far, how long | refreshed | adding and comparing the legs of a journey | how much shorter a new road is, and a missing leg |
| 9 | 3 | 4 | A circuit that works | refreshed | a complete loop lights a bulb, sounds a buzzer, turns a motor | spot the loop that stays dark, and whether a bulb is lit when its buzzer sounds |
| 10 | 3 | 4 | Magnets | refreshed | poles, and which things a magnet pulls | the metal a magnet does not pull, and what a row of three magnets does |
| 11 | 3 | 1 | Force in newtons | refreshed | adding forces, and what is left over | the push that balances, and three forces at once |
| 12 | 3 | 5 | Speed from distance and time | refreshed, worked | speed from distance and time | two speeds that are the same, and when two walkers meet |
| 13 | 4 | 6 | The see-saw rule | refreshed | weight times step on each side, with the plank held level | what moving a weight one step does, and on how many steps a weight tips it |
| 14 | 4 | 5 | Reading a rate | refreshed | a rate read from a gauge or a thermometer | whether the fuel left is enough, and when two readings meet |
| 15 | 4 | 6 | A fair test | refreshed, puzzles | changing one thing and keeping the rest | ten puzzles from the whole track, each asking what changed or which test is fair |
| 16 | 1 | 7 | Sounds come from shaking | new | a sound comes from something shaking, and a harder hit is louder | which of identical bands is highest, and three drums ordered quiet to loud |
| 17 | 1 | 8 | Light to see by | new | we need light to see, and some things give it out | where the moon's light comes from, and which things could not light a room |
| 18 | 1 | 9 | The sun and the moon | new | a day's length, and the moon's shape through a month | which is the summer day, and how many more hours of daylight it has |
| 19 | 2 | 1 | Rough and smooth | new | rougher floors need a bigger pull | whether a test of floors is fair, and a reading predicted from the order |
| 20 | 2 | 8 | See-through or not | new | sheets let all, some or none of the light through | what moving the card nearer the torch does, and which sheet made a shadow |
| 21 | 2 | 8 | Mirrors send light back | new | a mirror turns a beam, which goes on in a straight line | beams that turn three and four times |
| 22 | 3 | 4 | What lets electricity through | new | metals conduct and the rest insulate | the thing that conducts and is not magnetic, and which of two testers light |
| 23 | 3 | 4 | A loop with a break in it | new | a loop is dark for a reason: no cell, an open switch, a loose wire | the one change that mends a loop, and how many faults it has |
| 24 | 3 | 5 | Swinging | new | the string decides the swing, the bob does not | a pattern in a table, and which two tests show whether weight matters |
| 25 | 3 | 7 | High and low, loud and soft | new | pitch from length, loudness from how hard | whether Tom's test of length is fair, and three bands ordered low to high |
| 26 | 4 | 1 | Falling and floating | new | air pushes up on a falling thing, and water on a boat | whether a canopy test is fair, and the air's push at a steady speed |
| 27 | 4 | 4 | Brighter and dimmer | new | more cells, brighter; more bulbs, dimmer; energy from wind to lamp | adding a cell and a bulb together, and how many cells make a row of bulbs as bright as one bulb on one cell |
| 28 | 4 | 6 | Levers and wheels | new | a longer arm lets a small push lift a large load | which change lets the same push lift the stone, and the heaviest stone it can hold |
| 29 | 4 | 6 | Pulleys and gears | new | more ropes, less pull; gears turn in turn and at a ratio | which way the third gear turns, and the teeth a gear needs for a given ratio |
| 30 | 4 | 9 | Day, night and the moon | new | the Earth turns under the sun; the moon's month; the planets | the next full moon from a date, and the hours until noon somewhere else |
| 31 | 4 | 8 | How we see | new | light goes from a source to a thing to the eye | the periscope mirror that is the wrong way round, and how many goals one turned mirror reaches |
| 32 | 1 | 1 | What makes it move at home | new, 15 September batch | a hand, the wind, a spring or a fall moves each thing | the thing that moves in two ways, and the pushes in order |
| 33 | 1 | 7 | Near and far: sound gets quieter | new, 15 September batch | a sound is louder close by, read from the rings round a drum | Leo's drum from the rings, and where a listener hears it just as loud |
| 34 | 1 | 9 | Physics puzzles: push, pull and shadow | new, 15 September batch, puzzles | the year's items | ten puzzles at one, two and three stars from the grade one items |
| 35 | 1 | 9 | Physics review: the first year | new, 15 September batch, review | the year's items | a warm-up, six exercises and two puzzles from the grade one lessons |
| 36 | 2 | 4 | A magnet's pull | new, 15 September batch | a magnet pulls iron and steel, not every metal, and through paper and water | the coin that is metal and not pulled, and the steps that fish a clip out of a jug |
| 37 | 2 | 9 | Physics puzzles: floating, slopes and shadows | new, 15 September batch, puzzles | the year's items | ten puzzles at one, two and three stars from the grade two items |
| 38 | 2 | 9 | Physics review: the second year | new, 15 September batch, review | the year's items | a warm-up, eight exercises and two puzzles from the grade two lessons |
| 39 | 3 | 7 | Sound fades with distance | new, 15 September batch | a sound spreads out as it goes, and the meter's reading halves each time the distance doubles | which of two drums measured at different distances is louder, and the furthest place a drum is still heard over a stream |
| 40 | 3 | 9 | Physics puzzles: circuits, magnets and speed | new, 15 September batch, puzzles | the year's items | ten puzzles at one, two and three stars from the grade three items |
| 41 | 3 | 9 | Physics review: the third year | new, 15 September batch, review | the year's items | a warm-up, eight exercises and two puzzles from the grade three lessons |
| 42 | 4 | 9 | Physics review: the fourth year | new, 15 September batch, review | the year's items | a warm-up, nine exercises and two puzzles from the grade four lessons |
| 43 | 1 | 2 | Keeping it cold (17 September 2026) | new | a wrap slows the warmth that reaches the ice, whichever way the warmth is going | which wrap kept the ice coldest, and the fewest fair tests that find the best of five |
| 44 | 3 | 4 | How strong is the magnet? (17 September 2026) | new | a stronger magnet holds a longer chain of clips and pulls from further away | which test was not fair, and the fewest fair tests that order five magnets with one ruler |
| 45 | 4 | 5 | Energy on the track (17 September 2026) | new | a marble let go from higher is going faster at the bottom and pushes the cup further | what two tracks can and cannot show, and a height the table does not name |
| 46 | 2 | 1 | Air pushes back (18 September 2026) | new | everything is pulled down the same, and the air pushes back hardest on the wide light things | which two of four give the longest wait between them, and one sheet of paper in two shapes |
| 47 | 2 | 7 | Sound goes through things (18 September 2026) | new | sound travels through anything that can shake, and best through solid things | why a slack or pinched string carries nothing, and a route with two joins that never crosses air |
| 48 | 4 | 9 | The sun, the Earth and the moon from above (18 September 2026) | new | half of the moon is always lit, and its shape is how much of that half the Earth can see | where the moon must stand to be overhead at a given hour, and a month put in order |

Per grade, that was seven lessons in grade one, seven in grade two, eight in grade three and nine in
grade four. The 15 September batches and the eight lessons written since bring every grade to twelve:
keeping cold in grade one, air pushes back and sound goes through things in grade two, how strong a
magnet in grade three, and energy on the track and the sun, the Earth and the moon from above in grade
four. The grid of twelve a grade is complete. Every lesson has at least ten questions from at least five items, with two stars and
three stars in each "Try this" pair; the fair test lesson keeps its puzzle format, with ten puzzles
at one, two and three stars. Eight lessons still draw one kind of picture throughout, in settings
that change from question to question: for the see-saw, the pendulum, the mirror maze and the loop
that is the apparatus of the lesson, while heavy and light, the ramp, shadows and journeys could each
take a second drawing.

The fifteen keep their ids. Their existing items became the way in and part of the core, new items
were added round them, and every "Try this" was rebuilt as a two star and a three star pair, since
none of the fourteen was a reasoning item; one old item, the ramp prediction, stayed as a two star
question because predicting a new value from a pattern is reasoning at grade two. Hints across the
track were rewritten as questions, fifty six items have a second rung, and every scene was checked
against all of its versions and resized where one did not fit.

## Toys for the Games tab

These are suggestions and none is built. Each uses a drawing above as its board, so the toy and the
lesson show the same thing, and each would have to meet the promise of [activities.md](activities.md)
that aimless play does not win. The first two need no physics library, because the rule the drawing
is drawn by is the whole model.

- A circuit bench: cells, bulbs, a buzzer, a switch and wires laid on squares, with the bulbs lit by
  `loopGlow`. A level asks for three bulbs each as bright as one bulb on one cell, or for the fewest
  parts that leave a bulb dimmer than that, and the games' prover can enumerate the layouts.
- A mirror maze to set: mirrors placed or turned until the beam reaches a letter, traced by
  `traceMaze`, with the prover finding the fewest mirrors a level needs. It is the light maze items
  with the child making the maze.
- A gear box: gears chosen from a tray so the last one turns a set number of times and the right
  way, with `gearTurns` as the model.
- A ramp roller: the `ramp` drawing with a ball stepped by `bodies.ts`, where the child sets the
  height and the floor, marks where the ball will stop and then lets go. planck does not promise the
  same world on every runtime, so a prediction would be marked by band rather than by square.
- A see-saw to level: weights dropped on pegs, the plank tipping on a hinge in `bodies.ts` and
  settling as `settle` in `pieces.ts` does for the balance. The rule is exact, so the prover can
  check every arrangement a level allows.
- A parachute drop: two toys of the same weight side by side with different canopies, drag set as a
  damping on each body, and the second level letting only one thing change at a time.

A boat to load and a pendulum to tune would follow, but planck has no water, and a pendulum's
period goes with the square root of its length, which the items deliberately do not ask; either
would be a rule of our own drawn over the engine.

## The order to build the rest

1. Sound that travels and fades, the string telephone half built on 18 September 2026 as
   `stringphone` and written as the grade two lesson Sound goes through things. Year 4 asks that "vibrations from sounds travel through a medium to
   the ear" and that sounds "get fainter as the distance from the sound source increases", and
   nothing here asks either. A drawing of a drum heard at three distances, with its rings thinning,
   and a string telephone, with a rule for how many rings reach each listener.
2. Energy at grade four. 4-PS3-1 relates speed to energy and 4-PS3-3 asks what happens when things
   collide. A marble released from a height on a track hitting a cup, with how far the cup moves
   following the height, would carry both. Built on 17 September 2026 as `cup`, `pushed` and `length`
   on `ramp`, and written as the grade four lesson Energy on the track at the treetops.
3. Circuit symbols for the Year 6 stretch: a setting on `series` that draws the same loop in
   symbols, and an item matching a picture to its diagram.
4. The Sun, Earth and Moon from above, so grade four can see why the moon's shape changes and meet
   the eclipse idea directly. The month of moons shows the pattern and not its cause. Built on 18
   September 2026 as `orbit`, and written as the grade four lesson The sun, the Earth and the moon
   from above at the cloud islands; the eclipse idea is still to come.
5. Keeping cold, for the idea that wool makes things warm: `wrapped` with ice, a start below the
   room's 20 and readings that rise towards it. Built on 17 September 2026 as `ice` and `room` on `wrapped`, and the physics checker's `melted` names the cup whose ice has melted most. The lesson `physics-keeping-cold` was written on it the same day, as grade one's unit 2 lesson at the reed marsh.
6. Water resistance and streamlining (Year 5): shapes falling through a tall tank.
7. Magnets through materials and a fair test of magnets' strength by a chain of clips, from the
   Year 3 notes. The fair test half was built on 17 September 2026 as `chain` and `reach` on `magnet`,
   and written as the grade three lesson How strong is the magnet? at the windmill island; magnets
   through materials is still to come.
8. Shadows with the same shape as the thing that casts them (Year 6), and a second picture for the
   single-picture lessons named above.
9. The circuit bench and the mirror maze on the Games tab, because their models exist and they need
   no physics library; then the ramp and the see-saw rolled by planck, which is also the audit's
   suggestion for a look section.

## Open questions

The boat's rule, one square deeper for each block, is stated in the question rather than derived
from the water it pushes aside. It is right for grade two; whether grade four should meet
displacement with the tank needs a decision.

The moon's shapes are named new moon, crescent, half moon, gibbous and full moon, in a child's words.
A grown-up may expect "first quarter" for the half moon; the grade one grown-ups' note says so, and
the checker accepts only the words the drawing's table uses.

Grade four now has nine lessons, more than the four a year that [tracks.md](tracks.md) argued for.
The density of a track is the owner's decision, and the new lessons can be moved to a later year
without changing them.

Unit names are declared nowhere in the content. The track file that [tracks.md](tracks.md)
proposes would carry the nine names above.

## Sources

- Department for Education, [National curriculum in England: science programmes of study, key
  stages 1 and 2](https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study),
  2013, statutory from 2014, read in full as the
  [primary PDF](https://assets.publishing.service.gov.uk/media/5a806ebd40f0b62305b8b1fa/PRIMARY_national_curriculum_-_Science.pdf):
  seasonal changes (Year 1), light and forces and magnets (Year 3), sound and electricity (Year 4),
  Earth and space and forces (Year 5), light and electricity (Year 6), and working scientifically.
- NGSS Lead States, Next Generation Science Standards, 2013, read by performance expectation:
  [K-PS2](https://www.nextgenscience.org/dci-arrangement/k-ps2-motion-and-stability-forces-and-interactions),
  [K-PS3](https://www.nextgenscience.org/dci-arrangement/k-ps3-energy),
  [1-PS4](https://www.nextgenscience.org/dci-arrangement/1-ps4-waves-and-their-applications-technologies-information-transfer),
  [1-ESS1](https://www.nextgenscience.org/dci-arrangement/1-ess1-earths-place-universe),
  [3-PS2](https://www.nextgenscience.org/dci-arrangement/3-ps2-motion-and-stability-forces-and-interactions),
  [4-PS3](https://www.nextgenscience.org/dci-arrangement/4-ps3-energy),
  [4-PS4](https://www.nextgenscience.org/dci-arrangement/4-ps4-waves-and-their-applications-technologies-information-transfer)
  and [5-ESS1](https://www.nextgenscience.org/dci-arrangement/5-ess1-earths-place-universe).
- Michael Allen, Misconceptions in Primary Science, third edition, Open University Press, 2020. We
  read the publisher's description, not the book.
- Institute of Physics, [IOPSpark misconceptions collection](https://spark.iop.org/misconceptions),
  including [heavier objects falling faster](https://spark.iop.org/many-students-think-heavier-object-will-fall-faster-lighter-one-same-general-shape-or-size),
  [the moon's phases as the Earth's shadow](https://spark.iop.org/many-students-think-phases-moon-are-caused-earth-casting-shadow-moon)
  and [light as separate from seeing](https://spark.iop.org/some-students-consider-light-separate-seeing).
- J. Osborne, P. Black, J. Meadows and M. Smith, [Young children's (7-11) ideas about light and their
  development](https://www.tandfonline.com/doi/abs/10.1080/0950069930150107), International Journal
  of Science Education 15(1), 1993. Abstract only.
- S. Vosniadou and W. F. Brewer, [Mental models of the day/night cycle](https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog1801_4),
  Cognitive Science 18, 1994. Abstract only.
- [Is the Moon self- or hetero-luminous? An investigation of primary school students' ideas on the
  luminosity of the Moon](https://link.springer.com/article/10.1007/s10763-023-10427-1),
  International Journal of Science and Mathematics Education, 2023. Title only.
- D. M. Shipstone, A study of children's understanding of electricity in simple DC circuits,
  European Journal of Science Education 6(2), 1984, known to us through summaries of the reviews
  that cite it, such as [Tallant's seminar paper](https://mlrg.org/proc3pdfs/Tallant_Electricity.pdf).
- K. C. Trundle, R. K. Atwood and J. E. Christopher, on moon phase conceptions, summarised in the
  [Lunar and Planetary Institute's review](https://www.lpi.usra.edu/education/pre_service_edu/PhasesMisconceptions.shtml).
- The Nuffield SPACE project, [research reports](https://www.stem.org.uk/resources/collection/3324/space-research-reports)
  on primary children's ideas about electricity, light, sound, forces and the Earth in space. We read
  the collection's description, not the reports.
