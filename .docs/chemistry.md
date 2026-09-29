# Chemistry

Status: built in `scratchpad/` in September 2026, replacing the chemistry part of [tracks.md](tracks.md), which now points here. This document is the chemistry track: what a child of five to ten should meet in chemistry, with sources, what the first fifteen lessons had and what they lacked, the facts they had wrong and how each was fixed, the core concepts for each grade, the drawings the track is drawn with and the settings a lesson varies, the checkers that prove its answers, the lessons, the order to build the rest in, and what is unfinished.

What is built is in `scratchpad/`: thirty drawings in `src/art/chemistry.ts` (four from the first track, one of them extended, and twenty six new), seven checkers in `src/chemistry/prove.ts`, the tables both of them read, the rules pinned in `test/chemistry.test.ts`, and twenty eight lessons with 186 items in `content/`.

## The short version

- The first fifteen lessons covered materials, the three states, dissolving, measuring, filtering, heating and evaporating, and left out most of what England's Years 2 to 5 and the NGSS for grades 2 and 5 ask for: the uses of materials, changing a thing's shape, changes that can and cannot be undone, changes that make a new material, acids and alkalis, the water cycle with evaporation and condensation, rocks, soil and fossils, sieving and magnets, and conservation of mass.
- They averaged four questions each from two items. The audit found 72 per cent of the chemistry items below their grade, none asking for a reason, and six wrong or arguable facts and keys. Every lesson now has at least ten questions from at least five items, a way in, a core with the unknown moved about, and two stretch questions, one needing a reason and one non-routine.
- Every wrong fact the audit listed is fixed, and checking every item against a named source found four more: water vapour taught as something that only exists above 100 degrees, melting explained as particles getting more room, a closed jar of gas drawn more spread out when it is warmer, and dissolving times that fell in an invented straight line.
- The track is drawn with thirty drawings. The owner asked for particles, atoms, explosions and tubes; the explosions are drawn as the safe and joyful reactions a child can watch (fizz, foam, pops and a balloon filling), and a grown-up does anything hot.
- Where a picture carries a fact (what a thing is made of, whether a change can be undone, which state, what an indicator colour means, which way separates a mixture, how many atoms a model holds) the rule is a table in `src/art/chemistry.ts`, the drawing draws from it and a checker marks from it, so a picture and its answer key cannot disagree. Colours that carry meaning are mixed by the paint model in `src/paint/mix.ts`, and a test holds the indicator chart to it by name.
- Atoms and molecules are a grade four stretch lesson only: England meets them at Key Stage 3 and the NGSS at middle school.

## 1. What a child of five to ten should meet

We map US grade 1 to England Year 2 and grade 4 to Year 5, which is how [curriculum.md](curriculum.md) already sets the maths, and which the ages bear out: Year 2 is six to seven and grade 1 starts at six.

### England, Key Stages 1 and 2

Year 1, everyday materials: children should "distinguish between an object and the material from which it is made", "identify and name a variety of everyday materials, including wood, plastic, glass, metal, water, and rock", and describe and group them by "simple physical properties". The notes list pairs such as hard and soft, stretchy and stiff, shiny and dull, absorbent and not absorbent, opaque and transparent.

Year 2, uses of everyday materials: "identify and compare the suitability of a variety of everyday materials, including wood, metal, plastic, glass, brick, rock, paper and cardboard for particular uses", and find out how the shapes of solid objects "can be changed by squashing, bending, twisting and stretching".

Year 3, rocks: "compare and group together different kinds of rocks on the basis of their appearance and simple physical properties", "describe in simple terms how fossils are formed when things that have lived are trapped within rock", and "recognise that soils are made from rocks and organic matter".

Year 4, states of matter: group materials as solids, liquids or gases; "observe that some materials change state when they are heated or cooled, and measure or research the temperature at which this happens in degrees Celsius"; "identify the part played by evaporation and condensation in the water cycle and associate the rate of evaporation with temperature". The notes describe the states as "solids hold their shape; liquids form a pool not a pile; gases escape from an unsealed container", and ask teachers to avoid baking and burning here because they are chemical changes.

Year 5, properties and changes of materials: group materials by "hardness, solubility, transparency, conductivity (electrical and thermal), and response to magnets"; "describe how to recover a substance from a solution"; separate mixtures "through filtering, sieving and evaporating"; "demonstrate that dissolving, mixing and changes of state are reversible changes"; and "explain that some changes result in the formation of new materials, and that this kind of change is not usually reversible, including changes associated with burning and the action of acid on bicarbonate of soda". The notes add "recognising that melting and dissolving are different processes".

Nothing in Key Stages 1 and 2 mentions atoms or particles. Key Stage 3 (ages eleven to fourteen) is where "a simple (Dalton) atomic model", "differences between atoms, elements and compounds" and "chemical symbols and formulae" first appear.

### The NGSS, kindergarten to grade 5

The physical science of matter appears at grades 2 and 5. At grade 2: classify materials "by their observable properties" (2-PS1-1), choose materials "best suited for an intended purpose" (2-PS1-2), see that an object made of small pieces can be taken apart and made into a new object (2-PS1-3), and argue that "some changes caused by heating or cooling can be reversed and some cannot" (2-PS1-4), with water and butter as the reversible examples and cooking an egg and heating paper as the irreversible ones. At grade 5: model that "matter is made of particles too small to be seen" (5-PS1-1, whose boundary leaves out "defining the unseen particles"), show that "the total weight of matter is conserved" through heating, cooling and mixing (5-PS1-2), identify materials by their properties including "response to magnetic forces, and solubility" (5-PS1-3), and find out whether mixing substances "results in new substances" (5-PS1-4).

The Earth science parts that belong here are fossils in rock layers (4-ESS1-1, and 3-LS4-1 for fossils as evidence), weathering and erosion (4-ESS2-1), and where water is found and that it can be solid or liquid (2-ESS2-3). The NGSS names the water cycle itself only at middle school (MS-ESS2-4), so at grade 3 we follow England, which puts evaporation and condensation in it at Year 4.

Atoms first appear at middle school: MS-PS1-1 asks for models of "the atomic composition of simple molecules". That, and England's Key Stage 3, is why atoms and molecules are one stretch lesson at grade four here, with the model's colours said to be only a key and water drawn bent, as it is.

### What young children think

These are the ideas the lessons are built to meet, each documented:

| What children often think | Where it is documented | Where the track meets it |
|---|---|---|
| Melting and dissolving are the same thing | RSC, "Beyond appearances: students' ideas about changes of state" | grade 2, mixing and stirring, two-star question |
| A dissolved solid has gone and weighs nothing | RSC, "Mass and dissolving" | grade 2, the three-star question on the weight of sweet water; grade 3 filtering |
| The water in an evaporating dish soaked in or was taken by the sun | RSC review of the SPACE findings | grade 3, evaporating, where the water went and where the salt went |
| Bubbles in boiling water are air | AAAS Project 2061, AMM051 | grade 3, heating (grown-ups note) |
| The steam you can see is the gas | Ohio State, Beyond Penguins | grade 1 and grade 3 say steam is water; the visible cloud is droplets (grown-ups notes) |
| Drops on the outside of a cold glass came through the glass | Science Learning Hub | grade 3, the water cycle, with the `condense` drawing |
| A gas, or anything invisible, weighs nothing | RSC, "States of matter: beyond appearances" | grade 4, new materials, a sealed and an open flask |
| The particles of a solid do not move | AAAS Project 2061, AMM032 | grade 4 particles, where a solid's particles are drawn jiggling |
| Particles get bigger when heated | Ohio State; RSC review | grade 4 particles, the two-star question |
| Burning makes things disappear, and air has little to do with it | Science Learning Hub, fire | grade 4, new materials: the candle burning down, and the candle under a jar going out with wax left |
| Rust was under the surface all along, or makes the nail lighter | RSC, "Open system chemical events" | grade 4 rusting, the three-star question |
| A powder that pours is not a solid | ERIC ED291557 (about 20 per cent of kindergarten children put powders with the solids) | grade 1, looking closely |
| Water gets hotter the longer or harder it boils | RSC, "Boiling point: a surprising measurement" | grade 3, heating, a bigger flame on the heating curve |

One more point from the same sources: "a chemical change is irreversible" is itself listed as a misconception (AAAS SCM036), so the lessons say, with England's wording, that a change which makes a new material is "not usually reversible".

### Safety

We show what a grown-up does and what a child watches. The NSTA's elementary guidance says children "should not handle heat sources or heated materials", that a candle is used only if necessary and handled by an adult, that household chemicals such as baking soda count as chemicals and need splash goggles, and that nothing is tasted; its guide for teaching at home says not to "depict tasting any non-food substance". The RSC's red cabbage practical says to wear eye protection throughout and not to drink the indicator. So the drawings never show a child holding a flame, the burner and the candle are for watching, the `safety` drawing puts the kit in the look sections of the heating lesson (goggles, and an oven glove for the grown-up) and the red cabbage lesson (goggles, an apron and a tray), washing soda is marked as a grown-up's, and no lesson asks a child to taste anything, including the sugar and salt.

## 2. What the fifteen lessons had, and what was missing, thin or wrong

### Coverage, before and after

| Concept | Before | After |
|---|---|---|
| Object and material, naming materials | thin: two word-card items, one with arguable cards | grade 1, two lessons, things drawn in their material |
| Properties of materials | thin: one sort and two matches | grade 1, one lesson |
| Choosing a material for a job | missing | grade 1, new lesson |
| Squashing, bending, twisting, stretching | missing | grade 1, new lesson |
| Solids, liquids and gases, and the particle picture | present | grades 2 and 4, with how the particles move |
| Powders are solids | missing | grade 1, new lesson |
| Melting and freezing, with melting points | present, with a wrong fact | grades 1, 2 and 4, facts checked against a table |
| Boiling and the heating curve | thin | grade 3, with a heating curve drawing |
| Evaporating and condensing | thin: evaporation by boiling only | grade 3, evaporation at any temperature and condensation |
| The water cycle | missing | grade 3, new lesson |
| Dissolving, and what affects it | present | grades 2 and 4 |
| Separating by filtering and evaporating | present | grades 3 and 4 |
| Separating by sieving and with a magnet | missing | grade 3, new lesson |
| Growing crystals | missing | grade 3, new lesson |
| Changes that can and cannot be undone | missing | grade 2, new lesson |
| Changes that make a new material: burning, rusting, baking, fizzing | missing | grade 4, two new lessons |
| Conservation of mass | missing | grades 2, 3 and 4, mostly as stretch questions |
| Acids and alkalis with red cabbage | missing | grade 4, new lesson |
| Rocks, soils and fossils | missing | grade 2, two new lessons |
| Atoms and molecules | missing | grade 4, a stretch lesson |
| A fair test | thin: a subtraction and a pattern | grade 4 dissolving and rusting, which test is fair and which thing changed |

### Too easy

The audit graded the 25 chemistry items: 9 recall, 11 one step, 5 several steps, and no reasoning or non-routine item, with 72 per cent below their grade, 9 routine for a five-year-old and 7 whose answer the drawing or the question gave away. The worst were `chem.mixture-count` (counting three to six dots at grade four), `chem.sort-count` (counting cards where they sat, some in the wrong column), `chem.filter-residue` and `chem.warmer-jar`. Every lesson averaged four questions from two items, and the only stretch was one puzzle sheet. Every one of those items is rewritten, raised, or kept only as a lesson's way in.

### Wrong facts fixed

| What was wrong | Where | What we did | Source |
|---|---|---|---|
| Sugar melts at 95 degrees | `chem.melting-point`, `chem.point-gap`, lesson 12's table | Sugar is gone from every table: it breaks down at about 186 degrees rather than melting cleanly. The tables use chocolate, candle wax, butter and elements with sourced points, and every table of melting points is checked row by row against `SUBSTANCES` by the verifier | PubChem, sucrose (185.5 °C, decomposes); Lee, Thomas and Schmidt, J. Agric. Food Chem. 2011 |
| Water shown at 120 degrees in an open beaker | `chem.flame-boil` | The question is now how long the water has been heated; the temperature stops at 100 however long the flame is on | PubChem, water (99.974 °C at 760 mmHg); RSC, "Boiling point" |
| Water at exactly 100 counted only as steam, and at 0 only as ice | `chem.water-state` | `chem.state` refuses any temperature less than five degrees from a melting or boiling point, where the answer can be two things | PubChem, water |
| Cards in the wrong column counted where they sat | `chem.sort-count` | Rewritten: things are drawn in their material and the count comes from the table | the audit |
| Matching answers always 1, 2, 3, 4 | `chem.property-match` | Rewritten as opposites (England's Year 1 pairs), shuffled four ways, none of them 1, 2, 3, 4 or a turn of it; the first rewrite turned the order, so one version was still in order | England, Year 1 notes |
| "1 grains" | `chem.dissolve-table` | The number of grains is never one | the audit |
| A spoon or a door can be wood or metal | `chem.wrong-column` | The words are things that are only ever one material: a nail, a key, a log, a twig | the audit |
| A plastic ruler sorted as stiff | `chem.property-sort` | A brick and a stone instead | our own check |
| "Above 100 it is steam", so water vapour only exists when boiling | lesson 3's look section and its remember line | A puddle dries without boiling; evaporation happens at any temperature and faster when warm | RSC, "The water cycle: that's chemistry"; USGS, evaporation |
| Melting as particles getting "enough room" | lesson 5 | Heating gives the particles enough energy to break out of their rows; ice is the counterexample, since it takes more room than the water it melts into | RSC review |
| A closed jar of gas drawn more spread out when warmer | `chem.warmer-jar`, lesson 13 | In a closed jar the spacing stays the same and the particles move faster; the jar now shows longer motion marks | RSC review; Ohio State |
| Dissolving times falling in a straight line, to be continued | `chem.dissolve-fair-test` | The fair-test questions ask which one thing changed, which test is fair, and whether a time is more or less | NGSS 3-PS2-1 and the practices; the audit |
| Room at 60 or 80 degrees | `chem.melting-point`, and the title of `chem.room-temp` | The thing sits in a water bath at that temperature | our own check |

The values in `SUBSTANCES`, with their sources: water 0 and 100 (PubChem); butter, melted by 37, softening from about 15, our judgement for the lower end (University of Guelph, Dairy Science and Technology); chocolate 30 to 36, with cocoa butter's eating form at 33.8 (RSC, "The science of melting chocolate"); paraffin candle wax 46 to 68 (CDC NIOSH); table salt 801 and 1465 (PubChem); iron 1538 and 2861, gold 1064 and 2856, aluminium 660 and 2519, lead 327 and 1749, mercury −39 and 357, oxygen −219 and −183, nitrogen −210 and −196 (RSC periodic table); ethanol −114 and 78 (PubChem).

## 3. The core concepts, by grade

| Grade | England | NGSS | What the child does |
|---|---|---|---|
| 1 | Years 1 and 2 | 2-PS1-1, 2-PS1-2 | name what a thing is made of; describe it by its properties; choose a material for a job and say why; squash, bend, twist and stretch and say whether it goes back; ice, water and steam, and how fast ice melts; a powder is a solid |
| 2 | Years 3 and 4 | 2-PS1-4, 3-LS4-1, 4-ESS1-1 | solids, liquids and gases as particles; melting and freezing points; dissolving and what cannot be seen; changes that can and cannot be undone; rocks by their properties; soil in layers; how a fossil forms |
| 3 | Years 4 and 5 | 5-PS1-1, 5-ESS2 | reading a liquid between marks; filtering; heating and the flat part of the heating curve; evaporating to get a solid back; condensation and the water cycle; sieve, filter or magnet; growing crystals |
| 4 | Year 5, Key Stage 3 for the stretch | 5-PS1-2, 5-PS1-3, 5-PS1-4, MS-PS1-1 for the stretch | melting and boiling points with negative numbers; particles moving faster when hotter; fair tests; separating puzzles; new materials and conservation of mass; rusting as a fair test; acids and alkalis with red cabbage; atoms and molecules |

## 4. The drawings

Every drawing is on the science shelf, in `src/art/catalog.ts` with at least two takes and a line in `src/art/shelf-groups.ts`, and every one that carries a value is in `READS` in `src/art/animation.ts`, so it moves only as one piece. On paper each marker colour becomes its own hatch; big areas of yellow and orange use a hatch spread twice as far (`lightFill`), so a sea floor or a raincoat does not print as a dark block. A colour mixed by the paint model prints as its family's hatch through `paintFill` in `src/art/painting.ts`, and where colour is the answer the drawing writes the colour's name as well, because print has no colour.

| Drawing | What it shows | Settings a lesson varies, each drawn exactly |
|---|---|---|
| `beaker` | a beaker with a scale, a level, grains on the floor and a rod (from the first track) | `max`, `step`, `level`, `solid`, `rod` |
| `particles` | a jar of particles packed, loose or spread, now with how they move | `spread` (0 solid, 1 liquid, 2 gas), `count`, `second` for a mixture, `moving` (0 still, 1 moving, 2 hotter and faster) |
| `funnel`, `flame` | filter paper with residue, and a burner (from the first track; the burner's "off" no longer sits on its tripod) | `residue`, `level`, `drops`; `height`, `on`, `stand`, `holds` |
| `materials` | everyday things drawn in their material: wood has a grain, metal a shine, glass shows through | `things` (21 kinds, keyed to `OBJECTS`), `letters`, `names` |
| `squash` | before, while squashed, bent, twisted or stretched, and after letting go | `thing` (7), `action` (4), `after` (0 hides the answer) |
| `magnifier` | a heap on a saucer and a lens showing salt as cubes, sugar as slanted blocks, sand, flour and rice | `kind`, `count` (grains in the lens) |
| `icemelt` | the same ice cube every few minutes, in the freezer, on the table or in the sun | `every`, `count`, `place`, `blank`; how much is left comes from `iceLeft` |
| `beforeafter` | before and after a change, with what made it on the arrow | `change` (12, keyed to `CHANGES`), `show` |
| `rocks` | granite, basalt, pumice, sandstone, chalk, limestone, marble and slate, with a water or vinegar drop test | `rocks`, `test` (0, water, vinegar) |
| `soiljar` | soil shaken in water and settled, biggest pieces at the bottom | `stones`, `sand`, `silt`, `clay` in whole squares, `bits` |
| `fossilsteps` | four pictures of a fossil forming, in any order | `order`, `blank` |
| `watercycle` | the sea, sun, clouds, rain and a river, numbered where each stage happens, with a key | `blank`, `key`, `plain` |
| `condense` | drops on a cold glass, and drops under a lid over hot water | `kind`, `drops` |
| `sieve` | a sieve over a bowl, with what is too big to pass left in it | `mixture` (keyed to `MIXABLES`), `holes`, `shaken` |
| `mixture` | things mixed dry, or in water, where each sinks, floats or dissolves out of sight | `things`, `water` |
| `crystalstring` | crystals growing on a string in a jar as the water evaporates | `days`, `crystals`, `kind` |
| `cylinder` | a measuring cylinder read at the bottom of the curve | `max`, `step`, `minor`, `level` |
| `dish` | a dish of salty water drying on a windowsill, leaving a crust | `left` (in quarters), `day` |
| `heatcurve` | temperature against minutes, with the flat part while it melts or boils | `temps`, `every`, `min`, `max`, `step` |
| `testtubes` | test tubes in a rack, each with its own level, colour and bubbles | `fills`, `paints` (paint box mixes), `fizz`, `bungs` |
| `cabbage` | kitchen liquids with red cabbage juice in, and the colour chart | `liquids` (keyed to `LIQUIDS`), `chart`, `show`, `names` |
| `fizz` | vinegar and baking soda, from the spoon to foam over the top with bubbles popping | `stage`, `spoons` (the foam grows with them) |
| `flask` | a conical or round flask, any colour, bubbles, a stopper or a balloon filling with gas | `shape`, `fill`, `paint`, `bubbles`, `balloon` |
| `nails` | iron nails in jars of water, salty water, dry air, water under oil, and painted | `jars` (keyed to `RUST`), `days` |
| `candle` | a candle beside a centimetre ruler, burnt down from where it started, or out under a jar | `start`, `burnt`, `lit`, `jar` |
| `molecule` | ball-and-stick water, oxygen, hydrogen, nitrogen, carbon dioxide and methane, with a key | `kind`, `count` |
| `atombox` | a closed box of molecules of one or two kinds | `a`, `na`, `b`, `nb` |
| `dropper` | a dropper letting drops fall into a dish | `drops`, `paint` |
| `safety` | goggles, an apron, an oven glove and a tray | `kit` |
| `periodic` | the first rows of the periodic table in the short form of eight columns, each cell with its atomic number and symbol, drawn from `ELEMENTS` | `rows` (1 to 4), `blank` (a cell left with a question mark), `mark` (a ringed cell), `shade` (none, the metals, or the gases at 20 °C, with a key) |
| `phscale` | the pH scale from 0 to 14 in universal indicator's colours, with lettered pointers at each liquid's pH from `LIQUIDS`, the same table the cabbage cups read | `liquids` (keyed to `LIQUIDS`), `letters`, `names` (a key underneath) |
| `syringe` | a capped syringe on its side, marked in millilitres, its plunger's seal at the reading, holding air drawn as a fixed number of particles or water | `max`, `step`, `level`, `capped`, `water`, `particles` |
| `rockcycle` | igneous rock, sediment, sedimentary rock, metamorphic rock and magma joined by numbered arrows from `ROCK_CYCLE`, with a key naming what happens along each | `arrows` (the loop is 1 to 5; 6 and 7 are shortcuts), `blank` (an arrow's name as a question mark), `hide` (a box's name hidden), `start` and `end` (boxes badged S and E), `key` |

Four drawings were already on the shelf and are used as they are: the thermometer, the table, the `strata`, `fossil` and `ammonite` drawings from the next worlds, and the physics `things` tray with its checker for conductors and magnets. The physics track draws heat moving through wrapped cups (`wrapped`), and chemistry points to it rather than drawing a second one.

The indicator's colours are mixes from the paint box: red for pH 1 to 3, purple for 4 to 6 (pink and sky), blue for 7 and 8 (blue and sky), green for 9 to 11 and yellow for 12 to 14. The bands follow the RSC's chart and its teacher notes, which have lemon juice and vinegar turning it red, bicarbonate blue and washing soda green or yellow; where yellow begins is our own reading of the two (section 8). A test mixes each band's recipe with `mix` and holds it to its name with `nameOf`, clear of the line between two names, so the purple a question asks about is the purple every screen shows. Toast browning, melted chocolate and rust are mixed the same way.

## 5. The checkers

Each checker reads the drawing named by `of` and the table it is drawn from, works the answer out for every variant, and refuses a variant whose question has no single answer. An answer the item states must agree; one it leaves out is taken from the checker.

| Checker | Reads | Works out |
|---|---|---|
| `chem.materials` | `materials`, `squash`, `safety` | a thing's material (`made(B)`), how many have a property (`count(hard)`), the one that does (`only(see-through)`), the one other thing of the same material (`same(A)`), the odd one out (`odd`), how many share a material (`made-count(metal)`), the one thing meeting every clue (`fits(waterproof not-see-through bendy)`), pairs (`pairs(bendy)`, `same-pairs`), whether a thing springs back (`back`), what keeps the eyes safe (`keeps(eyes)`) |
| `chem.change` | `beforeafter`, `candle`, `nails`, `icemelt`, `fizz`, `flask` | whether a change can be undone (`undo`) and makes a new material (`new`); centimetres burnt and left; the rustiest nail, how many rusted, whether one rusts; the first minute with no ice and what a hidden saucer holds; which of two jars or flasks made more gas (`more`) |
| `chem.state` | `particles`, `thermometer`, `watercycle`, `heatcurve` | solid, liquid or gas from a jar; which of two jars is hotter; ice, water or steam from a thermometer, and the state of anything in `SUBSTANCES`; the one thing in a table in a given state (`which(liquid)`); the blank stage of the water cycle; where a heating curve stays flat and for how long; and `table=` checks a table's rows against the melting points |
| `chem.indicator` | `cabbage`, `phscale` | the colour a cup turns, whether that colour says acid, acid or alkali (refusing blue, which spans 7 and 8), and the one cup or how many cups show each; of the pH scale, a liquid's pH where it sits on a whole number, acid, neutral or alkali, how many are each, the strongest acid or alkali, and the one nearest 7 |
| `chem.separate` | `sieve`, `mixture` | what stays in a sieve and what falls through, whether a sieve separates the mixture, what filter paper keeps, and the one way that gets a part out on its own (`get(sand)`): a magnet for what is magnetic, a filter for what has not dissolved, evaporating for what has when it is the only solid, a sieve only when dry |
| `chem.rocks` | `rocks`, `soiljar`, `fossilsteps`, `rockcycle` | how many rocks soak up water, fizz, float or can be scratched, the one that does, the one meeting every clue, a rock's kind, the thickest layer of soil, which picture shows a step of a fossil forming and what the blank one should show; of the rock cycle, what happens along an arrow, the blank arrow's name, the hidden box, and the fewest drawn arrows from one box to another |
| `chem.atoms` | `molecule`, `atombox` | atoms, atoms of one element, molecules, kinds of atom and of molecule, pure or a mixture, element or compound, and the molecule's name |
| `chem.elements` | `periodic` | an element named by number, symbol, `blank` or `mark`: its symbol, name, number, row, state at 20 °C and kind (metal or non-metal, refusing the metalloids boron and silicon); and `count(metal)`, `count(not-metal)` or `count(gas 2)`, the drawn cells of a kind or state, in one row if given |

The tables are `ROCK_STAGES` and `ROCK_CYCLE` for the rock cycle, `OBJECTS` and `PROPERTIES` (what a thing is made of and what it is like), `SHAPES`, `CHANGES`, `ROCKS`, `MIXABLES`, `RUST`, `LIQUIDS` and `INDICATOR`, `MOLECULES`, `ATOMS` and `ELEMENTS` in `src/art/chemistry.ts`, and `SUBSTANCES` in `src/chemistry/prove.ts`. A property the table leaves open (whether a plastic spoon floats depends on the plastic) is never asked, and a question that would need it is refused by the verifier rather than guessed. The `things` tray and `physics.things` answer the conductor and magnet questions, and the two tables do not overlap, so they cannot disagree.

## 6. The lessons

Units are numbered across the whole track: 1 Materials, 2 States of matter, 3 Dissolving and measuring, 4 Separating, 5 Heating, 6 Changes, 7 Acids and alkalis, 8 The water cycle, 9 Rocks and soil, 10 Atoms and molecules. The first five are the units of the first fifteen lessons. The number is the lesson's place in `content/lessons/`, where the fifteen refreshed lessons are 1 to 15 and the thirteen new ones 16 to 28. A child meets them in the order the table lists them, since the year plan in `src/space/years.ts` sorts a grade's lessons by unit and then by file.

| # | Grade | Unit | Lesson | New or refreshed | The concept | The thinking its stretch asks for |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | What things are made of | refreshed | a thing and the material it is made of are two different answers | one spoon of another material shows a rule about every spoon is wrong; three wooden things make three pairs, not two |
| 2 | 1 | 1 | Hard, soft, bendy, see-through | refreshed | describing a thing by its properties, and the rule behind a sort | work out someone else's sorting rule by trying each rule on every thing; count every pair that shares a property |
| 26 | 1 | 1 | The right material for the job | new | choosing a material by what it is like | a job that needs two properties at once; three clues, where each wrong thing fails a different one |
| 27 | 1 | 1 | Squash, bend, twist and stretch | new | what was done to a thing, and whether it goes back to its shape | why a material was chosen, which depends on whether the job needs the shape to come back; the rule used on things the lesson did not show |
| 3 | 1 | 2 | Water, ice and steam | refreshed | ice, water and steam by temperature, and how fast ice melts | why one ice cube melted faster, from where it was; two cubes melting at different speeds carried on to the same moment |
| 28 | 1 | 2 | Looking closely | new | salt, sugar, sand, flour and rice under a lens, and why a powder is a solid | whether pouring makes a thing a liquid, where the answer changes with the claim; a grain found by crossing out, with no picture of the answer |
| 4 | 2 | 2 | Solid, liquid and gas | refreshed | the three states by how their particles sit and move | why a state behaves as it does, in terms of its particles; a share of the particles when the count is not given and heating makes and loses none |
| 5 | 2 | 2 | Melting and freezing | refreshed | melting points, and the flat part of a heating graph | why the line stays flat while a thing melts; a temperature that fits two melting points at once, with no method given |
| 6 | 2 | 3 | Mixing and stirring | refreshed | a solid stirred into water sinks, floats or dissolves | tell melting from dissolving and say why; what sweet water weighs when the sugar cannot be seen |
| 7 | 2 | 3 | Does it dissolve? | refreshed | deciding from what is left in the glass whether a solid dissolved | how to get a solid back, which depends on whether it dissolved; the first spoon that stays as grains |
| 16 | 2 | 6 | Changes you can undo | new | changes that can be undone and changes that cannot | the reason, from three kinds of change; two changes that both make a gas, only one of them a new material |
| 17 | 2 | 9 | Rocks and what they are like | new | testing rocks with water and vinegar, and grouping them by what the tests show | why a rock suits a job, or does not; two clues that each fit two rocks, put together to find the one |
| 18 | 2 | 9 | Soil, and how a fossil forms | new | soil settling in layers, and the steps of a fossil forming | why each part of the soil settles where it does; what a jar shows at a time between two settling times |
| 8 | 3 | 3 | Measuring a liquid | refreshed | reading a beaker and a measuring cylinder between the numbered marks | which mistake made a wrong reading, reasoned back from the difference; the fewest pours of 50 and 20 millilitres to reach an amount |
| 9 | 3 | 4 | Getting it back: filtering | refreshed | what filter paper keeps back, and choosing filtering or evaporating | why one thing goes through the paper and another does not; sand and salt apart, in the only order that works |
| 11 | 3 | 4 | Evaporating to get the salt back | refreshed | the water evaporates and the salt stays | which piece of evidence answers a wrong idea; two amounts in one story, where only the water changes |
| 20 | 3 | 4 | Sieve, filter or magnet | new | choosing a way to separate by the difference between the parts | why each way works; three mixtures checked against three tools |
| 21 | 3 | 4 | Growing crystals | new | crystals grow as the water evaporates | which jar grows more, and why; when a small crystal growing fast catches up with a big one growing slowly |
| 10 | 3 | 5 | Heating with a flame | refreshed | a steady rise, and water staying at 100 degrees while it boils | which graph had the bigger flame when both stop at 100; how long one pan boils while the other has not started |
| 19 | 3 | 8 | Evaporating, condensing and the water cycle | new | the stages of the water cycle, and where condensation comes from | the reason behind something seen, matched to its stage; the cycle worked round from somewhere other than the sea |
| 13 | 4 | 2 | Particles, closer and further apart | refreshed | particles move faster when hotter, and heating never changes how many there are | check someone else's model, one version of which is right; a share of dark particles, where each one added also grows the total |
| 14 | 4 | 3 | A fair test: how fast it dissolves | refreshed | the one thing a test changes, and reading and predicting from results | whether a test can show what its maker says; a temperature nobody tried, answered with a range |
| 15 | 4 | 4 | Separating puzzles | refreshed | the way that gets each part of a mixture out on its own | whether a sieve with holes of that size works, and why each way works; pebbles, sand and salt in the only order, and salt that weighs what went in |
| 12 | 4 | 5 | Melting points and boiling points | refreshed | the state of anything in a table at any temperature, below zero included | a range of temperatures rather than one number; two temperatures tested against two rows at once, where in one version neither works |
| 22 | 4 | 6 | Changes that make something new | new | the signs of a new material, burning needing air, and nothing being lost | why an open cup gets lighter and a flask with a balloon does not; when the fizz stops, however much baking soda goes in |
| 23 | 4 | 6 | Rusting: a fair test | new | what rust needs, read from a test with jars | the fair comparison, the pair that differs in one thing only; what the rust weighs, since oxygen from the air joins the iron |
| 24 | 4 | 7 | Acid or alkali: the red cabbage test | new | what red cabbage juice shows about a kitchen liquid | what a colour can show, since blue covers 7 and 8; the colour walked along the chart as an alkali is added to an acid |
| 25 | 4 | 10 | Atoms and molecules | new | atoms, molecules, elements, compounds and mixtures | sort a box into element, compound or mixture, where air is the surprise; how many water molecules a set of atoms can build |
| 29 | 1 | 1 | Does it soak up water? | new, 15 September batch | threads, paper and card soak water up; metal, glass, plastic and rubber keep it out, even when soft | what goes wrong when a material is given the wrong job; two layers for a dry seat, one to keep the wet out and one to sit on |
| 30 | 1 | 1 | Same shape, different material | new, 15 September batch | the shape stays the same and what a thing can do comes from its material | the one test that tells two look-alikes apart; a material for a hot soup spoon against two rules |
| 31 | 1 | 2 | Where does the puddle go? | new, 15 September batch | water leaves into the air, faster when warm and windy, and what was dissolved in it stays | which of two puddles dries first and why; the two things that dry washing fastest |
| 32 | 1 | 2 | Air is everywhere | new, 15 September batch | an empty jar is full of air, which takes up room and can be caught, squashed and let out | whether a squeezed balloon holds less air; the steps that catch a bottle's air in a cup under water |
| 33 | 1 | 9 | Chemistry puzzles: materials and water | new, 15 September batch, puzzles | the year's items | ten puzzles at one, two and three stars from the grade one items |
| 34 | 1 | 9 | Chemistry review: the first year | new, 15 September batch, review | the year's items | a warm-up, eight exercises and two puzzles from the grade one lessons |
| 35 | 2 | 6 | Baking: a change you cannot undo | new, 15 September batch | melting, freezing and dissolving can be undone; cooking makes something new and cannot | whether chocolate melted and set again is the same chocolate, against a fried egg; the first step in a recipe that cannot be undone, or none |
| 36 | 2 | 9 | Soil: sand, clay and what drains | new, 15 September batch | a drainage test on three soils: sand lets water through, clay holds it, garden soil does some of each | what was not kept the same when one sand gave two results; two soils mixed half and half to hit a target |
| 37 | 2 | 2 | Which melts first? | new, 15 September batch | the warmer the place, the faster ice melts, and not at all in the freezer | a big cube and a small one, which is gone first and why; where to keep a lolly, cold and out of the sun at once |
| 38 | 2 | 9 | Chemistry puzzles: states, mixing and rocks | new, 15 September batch, puzzles | the year's items | ten puzzles at one, two and three stars from the grade two items |
| 39 | 2 | 9 | Chemistry review: the second year | new, 15 September batch, review | the year's items | a warm-up, nine exercises and two puzzles from the grade two lessons |
| 40 | 3 | 3 | Stirring, warming and dissolving | new, 16 September batch | stirring and warm water each make sugar dissolve sooner, read from a table of four cups' times; a fair comparison changes one thing | two rows that changed two things, and why they cannot show what one does; the fastest plan from three helps |
| 41 | 3 | 4 | Hot water holds more | new, 16 September batch, changed from salt to alum 28 September | hot water dissolves far more alum than cold, read from a table of spoons against temperature; as it cools the extra comes out as crystals on a string | two beakers with the same alum and one with grains left, what differed; the start that grows the biggest crystal |
| 42 | 3 | 9 | Chemistry puzzles: separating, heating and the water cycle | new, 16 September batch, puzzles | the year's items | ten puzzles at one, two and three stars from the grade three items |
| 43 | 3 | 9 | Chemistry review: the third year | new, 16 September batch, review | the year's items | a warm-up, nine exercises and two puzzles from the grade three lessons |
| 44 | 4 | 1 | Materials tested four ways | new, 16 September batch | one table of four tests (hard, see-through, conducts, magnetic) answers a job's question: which columns must say yes | the one test that parts two look-alike materials; the best material when none passes all three wants, the one that fails only the want the job can work around |
| 45 | 4 | 9 | Weathering and erosion | new, 16 September batch | ice, roots and rain break rock where it stands; the river and the waves carry the pieces and wear them round; the bottom layer is oldest | why beach pebbles are round when hill stones are sharp; the cliff in a hundred years from two clues |
| 46 | 4 | 6 | Burning: a change that cannot be undone | new, 16 September batch | a flame needs air and uses it up, and turns the wax into gases, water and soot; the new things have gone, so burning goes one way | what the relit candle shows; the jar and the candle that burn for exactly so many seconds from two rates |
| 47 | 4 | 9 | Chemistry review: the fourth year | new, 16 September batch, review | the year's items | a warm-up, ten exercises and two puzzles from the grade four lessons |
| 33 | 3 | 4 | Colours come apart (18 September 2026) | new, in `chemistry-33-colours-come-apart.lumi`, which shares its number with the first year's puzzles | an ink is often a mixture, and water climbing paper leaves its colours in bands at different heights | which band proves two look-alike strips came from different pens, and which of four pens wrote a note |

The twenty eight lessons ask 290 questions from 186 items: 62 at grade one, 73 at grade two, 73 at grade three and 82 at grade four. Every lesson asks ten or eleven questions from six to eight items, every item is used by a lesson, and the verifier proves every version of every checked question with no errors or warnings. The first fifteen averaged four questions from two items.

### The fifth year

The fifth year's twelve lessons (September 2026) follow the plan in [grades-5-6.md](grades-5-6.md): the canal town in the first term, the observatory on the star cliffs in the second and the old walled city in the third. They meet Japan's fifth-year science (how much dissolves, and that it depends on the water's amount and temperature), England's Year 5 and Key Stage 3 (solutions, separating by distilling, the periodic table, the composition of the atmosphere, energy at changes of state, metals and non-metals, thermal decomposition) and the NGSS standards 5-PS1-2 (mass kept when things dissolve or react) and MS-PS1-2 (signs of a reaction). The audit of 28 September is in `.scratchpad/grades56/audit/chemistry.md`, and the fixes it led to are listed at its end.

| # | Unit | Lesson | The concept | The thinking its stretch asks for |
|---|---|---|---|---|
| 48 | 1 | How much dissolves | saturation, grams in 100 ml, scaling with the water, solubility against temperature | whether cooling or drying gets sugar or salt back; two saturated beakers poured together |
| 49 | 2 | Getting clean water back | distilling: the steam's heating curve, the rate clean water collects, the salt left | why the tube is kept cold; the fewest sun stills for a day's water |
| 50 | 2 | What the canal water holds | solution against suspension, what filter paper keeps, settling layers, oxygen dissolved less in warm water | whether clear filtered water holds nothing; the fewest litres of warm water holding the oxygen of cold |
| 51 | 3 | Rust on the lock gates | what rust needs, the fair pair of jars, salt making rust faster, paint, grease and zinc, rust weighing 10/7 of the iron | why only the painted strap rusted in its scratch; paint against galvanising over 30 years |
| 52 | 4 | Elements and the table they sit in | an element as one kind of atom, atomic number, rows of 2, 8 and 8; element, compound and mixture | what makes a substance an element; an element found from clues |
| 53 | 5 | Air is a mixture | 78 and 21 per cent, breathed air, air parted by boiling points, air's weight | why air is a mixture and not a compound; the box of molecules nearest to air |
| 54 | 5 | Heating curves | flat parts at changes of state, cooling curves, pure water against wax | where the heat goes on the flat part; the minutes from ice to boiling with no picture |
| 55 | 6 | Metals and non-metals | the properties of metals, the table shaded, a magnet as no metal test, melting points | why a pencil's lead conducts; a sample found from three tests |
| 56 | 7 | Stone, brick, mortar and concrete | limestone to quicklime and gas, slaked lime, mortar taking carbon dioxide back, concrete by volume | why mortar gets heavier as it sets; whole batches of concrete from the yard's heaps |
| 57 | 8 | The signs of a new substance | a gas, a colour, a temperature change, a new solid; a sign is evidence, not proof | the one example that breaks a rule with always in it; grams of gas from weighed jugs |
| 58 | 9 | Chemistry puzzles: the fifth year | the year's items | ten puzzles at one, two and three stars |
| 59 | 9 | Chemistry review: the fifth year | the year's items | a warm-up, twelve exercises and two puzzles |

The numbers these lessons rest on, with their sources. Solubility in 100 g of water, rounded to whole grams: salt 35.7, 35.9, 36.4 and 37.0 g at 0, 20, 40 and 60 °C, sugar 179, 204, 238, 287 and 362 g at 0 to 80 °C, and baking soda 6.9, 9.6, 12.7 and 16.4 g (PubChem and the CRC Handbook's aqueous solubility table; the audit checked them against memory, not a page). Distilling: salt boils at 1465 °C and melts at 801 °C (PubChem), and a lab still drips about 3 to 6 ml a minute, a working figure from school practicals rather than a published one. Dissolved oxygen in fresh water at saturation, 14.6, 11.3, 9.1 and 7.6 mg a litre at 0, 10, 20 and 30 °C (USGS DOTABLES). Rust: dry iron oxide holds 111.7 g of iron in 159.7 g, which is 7 g of iron to 10 g of oxide (formula masses); salt spray speeds rusting, and the table of steel lost a year, 20, 40 and 160 thousandths of a millimetre inland, in a town and by the sea, sits inside the ISO 9223 bands for carbon steel's first year (C2 up to 25, C3 25 to 50, C5 80 to 200), which we have from secondary summaries and not the standard itself; galvanising protects by corroding first (Galvanizers Association, RSC). The periodic table's numbers, states and kinds come from the RSC periodic table through `ELEMENTS`. The Sun is 73.8 per cent hydrogen and 24.9 per cent helium by mass (Asplund and others, Annual Review of Astronomy and Astrophysics, 2009), which the lesson rounds to 74 and 25, leaving about 1 g in 100 g for everything else; these are the Sun's surface abundances, which is what its light shows. Dry air is 78.08 per cent nitrogen and 20.95 per cent oxygen (NOAA, the Met Office), breathed-out air about 16 per cent oxygen and 4 per cent carbon dioxide (BBC Bitesize, RSC), nitrogen boils at -196 °C and oxygen at -183 °C (RSC), and a cubic metre of dry air at 20 °C weighs about 1.2 kg (1.204 kg in engineering tables). Heating curves: water's heat capacity is 4.18 J a gram and degree and ice's about 2.1, and melting a gram of ice takes 334 J, so ice warms about twice as fast as water on one flame and melting takes as long as warming the water 80 degrees; boiling a gram takes 2260 J, over five times the warm from 0 to 100, which is why no curve shows the ice warming and the boil together; candle wax softens between about 46 and 68 °C (CDC NIOSH, paraffin wax). Metals' melting and boiling points are the RSC's through `SUBSTANCES`; UK 1p and 2p coins have been copper-plated steel since 1992 and Canadian coins plated steel since 2000 (the Royal Mint, the Royal Canadian Mint; recalled), which is why the magnet question names a brass coin. The lime cycle: calcium carbonate (100.09) gives calcium oxide (56.08) and carbon dioxide (44.01), and calcium oxide and water (18) give calcium hydroxide (74), from formula masses; limestone gives off its carbon dioxide at about 900 °C, clay is fired to brick at about 1000 °C (900 to 1150 in practice) and a cement kiln reaches about 1450 °C (rounded figures from the British Geological Survey's and cement makers' descriptions, recalled); carbonating lime mortar needs a little water and takes months, so the question keeps its slaked lime thin and damp. Concrete of 1 cement, 2 sand and 3 gravel is a common general-purpose mix by volume. The signs: 84 g of baking soda gives 44 g of carbon dioxide (formula masses), kitchen vinegar is about 5 g of acetic acid in 100 ml, so 21 g of soda needs 300 ml of vinegar, and every jug in the lessons holds at least 400 ml for each 21 g; vinegar and baking soda cool by a few degrees, up to about 6 for kitchen amounts; an air-activated iron hand warmer reaches about 50 to 60 °C (makers' figures, recalled). A balloon or bag that swells on the scales pushes aside about 1.2 g of air for each litre, so kitchen scales read a few grams light, and no question uses one to show that mass is kept.

Grade three's "Hot water holds more" uses alum rather than salt for the same reason the fifth year's table shows: 100 g of water holds about 36 g of salt at 10 °C and 37 g at 60 °C, which a spoon cannot see, but 8.5 g of potash alum at 10 °C, 12 g at 20 °C, 25 g at 40 °C and 58.5 g at 60 °C (Wikipedia, Potassium alum, from the CRC Handbook). At about 4 g a teaspoon that is 2, 3, 6 and 14 spoons in a cup of 100 ml, the table the lesson reads. The crystal jar is drawn with salt's cubes, since the shelf has no alum take; alum usually grows eight-sided crystals.

### The sixth year

The sixth year's twelve lessons (28 September 2026) follow the plan in [grades-5-6.md](grades-5-6.md): the midnight sun's ice shelf in the first term, the waterfall gorge in the second and the moon in the third. They meet Japan's sixth-year science (combustion, aqueous solutions, acids and bases), England's Key Stage 3 (particles and gas pressure, the rock cycle, the pH scale and neutralising, conservation of mass) and the NGSS middle-school standards MS-PS1-2 (properties before and after a reaction) and MS-PS1-5 (conservation of mass). Every question works with a measured quantity: grams per cubic centimetre, degrees Celsius below zero, millilitres of air, grams of water vapour in a cubic metre, pH numbers, milligrams in a litre and grams in and out.

| # | Unit | Lesson | The concept | The thinking its stretch asks for |
|---|---|---|---|---|
| 60 | 1 | Density, and why ice floats | density as grams in each cubic centimetre, from a mass and a volume found by displacement; less than water's 1 g/cm³ floats | why ice floats or a full bottle splits in the frost; a metal named from its mass and the water it pushes aside |
| 61 | 1 | Salt and the freezing point of water | salt lowers the freezing point, read from a brine table and its graph; the sea freezes at about -2 °C | why salt melts ice, or fails below -21 °C; two salty jugs poured together |
| 62 | 2 | A gas squashed and cooled | a trapped gas squashed into less room pushes harder, half the room twice the push, and takes less room when cooled | what the particles are doing; how far to push one syringe to be as crowded as another |
| 63 | 3 | Water in the air, dew and frost | the most water vapour air holds at each temperature; the dew point, and frost below 0 °C | why the hut's window mists inside, or frost grows on the runners; the most water on the windows by morning, which can be none |
| 64 | 4 | The rock cycle and the gorge's layers | the three kinds of rock and what turns one into another; lower layers are older | why granite's crystals are big and basalt's tiny, or how limestone became marble; the fewest arrows round the cycle |
| 65 | 5 | Acids and alkalis on a pH scale | acid, neutral or alkali and how strong, from a liquid's place on the scale; which liquid a colour could be, and which two could be mixed to reach 7 | what a colour can and cannot prove, and why lemon juice in water turns orange; each step ten times as acidic |
| 66 | 5 | Neutralising | a measured amount of alkali or carbonate neutralises an acid and makes a salt and water; the pH jumps through 7 | why a little at a time; which runs out first, the vinegar or the soda |
| 67 | 6 | Minerals dissolved in water, and hard water | milligrams of minerals in a litre, the hardness scale, limescale and stalactites | why limestone country has hard water; the fewest litres of rain that make well water soft |
| 68 | 7 | What burning needs, and the candle under the jar | fuel, heat and oxygen; air is 21 per cent oxygen and a candle under a jar goes out at about 16 per cent; nothing burns on the moon, and a crew breathes 840 g of oxygen a day | why a rocket carries oxygen, or why no candles in the cabin; the fewest whole tanks for a stay |
| 69 | 8 | Mass is kept in a reaction | grams in equal grams out when everything is counted; lighter means a gas left, heavier means oxygen joined | where the astronauts' extra grams of carbon dioxide come from; the gases from a given amount of wax |
| 70 | 9 | Chemistry puzzles: the sixth year | the year's items | ten puzzles at one, two and three stars |
| 71 | 9 | Chemistry review: the sixth year | the year's items | a warm-up, ten exercises and two puzzles |

The numbers these lessons rest on, with their sources: densities of ice 0.92 g/cm³, water 1, sea water about 1.03, aluminium 2.70, iron 7.87, copper 8.96, lead 11.3 (RSC periodic table), granite about 2.7 and basalt about 3.0 (BGS), cork 0.24 and paraffin wax about 0.9 (CDC NIOSH); about nine tenths of an iceberg under the sea (USGS; 0.917 / 1.025 is 0.89); the freezing points of salt water from a published sodium chloride brine table (per cent by weight against °C, rounded to whole degrees for 5 to 30 g of salt in 100 g of water, with the lowest, -21.1 °C, at 23.3 per cent), and sea water at about 35 g of salt a litre (NOAA) freezing at about -1.9 °C; a syringe of 100 ml of air at 20 °C worked out at other temperatures by Charles's law and rounded to whole millilitres (-20 °C 86, 0 °C 93, 40 °C 107, 60 °C 114, 80 °C 120), and half the room giving twice the push at one temperature (Boyle's law), from about 100 kPa at sea level; the most water vapour a cubic metre of air holds, rounded to whole grams from HyperPhysics's saturated vapour density table (-10 °C 2.36, 0 °C 4.85, 5 °C 6.8, 10 °C 9.4, 15 °C 12.83, 20 °C 17.3, 25 °C 23, 30 °C 30.4); pH values added to `LIQUIDS` of orange juice about 3.5 (published range 3.3 to 4.2), rain 5.6 (USGS), sea water 8.1 (NOAA), milk of magnesia 10.5 and limewater 12.4 (PubChem), and each step on the scale ten times as acidic (USGS); 7 g of baking soda for 100 ml of vinegar with 5 g of acetic acid in it, and the pH meter's curve for 20 ml of 0.1 M hydrochloric acid and sodium hydroxide, both worked out from formula masses and concentrations; the USGS hardness scale, which counts only calcium and magnesium, as calcium carbonate (0 to 60 mg a litre soft, 61 to 120 moderately hard, 121 to 180 hard, over 180 very hard); stalactites growing on average about 0.13 mm a year, a figure we have from Wikipedia's summary, whose primary study we have not read (the USGS lists one, "The rate of growth of stalactites"); a candle under a jar going out while the air still holds about 16 per cent oxygen (RSC and Science Learning Hub candle notes, recalled), and a tea light burning about 3 g of wax an hour (makers' burn times, recalled), which at 3.45 g of oxygen for each gram of wax is about 2 ml of oxygen a second; air 21 per cent oxygen (NOAA, the Met Office); a crew member using about 0.84 kg of oxygen and breathing out about 1.00 kg of carbon dioxide a day (NASA's life-support baseline); 3 g of magnesium burning to about 5 g of magnesium oxide (formula masses 24.3 and 40.3); and paraffin wax, taken as C25H52, using about 3.4 g of oxygen for each gram and making about 3.1 g of carbon dioxide and 1.3 g of water; 30 g of wax needs about 103 g of oxygen, the oxygen in some 350 litres of air, so the moon lessons burn wax and magnesium in the base's sealed test chamber, fed with oxygen and kept apart from the crew's cabin, where lesson 68 teaches that no flame is allowed. Universal indicator's colour bands in lesson 65 (red 0 to 2, orange 3 to 4, yellow 5 to 6, green 7, blue 8 to 10, purple 11 to 14) are a typical chart's; brands differ by a step at the edges, so no liquid a question asks about sits on an edge. The soap drops in the hard-water lesson are one child's results, not published figures, and the grown-ups note says so.

What remains open: the syringe's cooling table assumes a plunger that slides freely, which a real one does not quite do; the pH values are typical ones from ranges; and the rock cycle is drawn with five boxes and seven arrows, where a full diagram would add melting from sedimentary rock and uplift.

Every lesson is a teach or worked lesson with a way in, a core and a `try` section at two stars and at three, except "Separating puzzles", a puzzle sheet whose puzzles run from one star to three. The way in is one item, asked once or twice, where the drawing does half the work. Every question past it has a ladder of two or three hints that asks rather than tells, and every way-in item has a second rung as well. Sixteen hints that stated a rule outright, or named the answer in some versions (`chem.gas-limit` asked "After 3 spoons, is there any vinegar left for the next one?" where the answer was 3), were rewritten as questions. A script fills every hint for every version and looks for the answer in it; what it still finds are the options' own words, such as "element" and "compound", which a hint about telling them apart has to use.

`test/chemistry.test.ts` holds every chemistry lesson to this floor: ten questions, five items, a two and a three star question, and a hint ladder on every question past the first. It also checks the one table of melting and boiling points drawn in a lesson rather than in an item against `SUBSTANCES`; the tables inside items are checked by `chem.state table=`.

### The gap lessons

Four lessons, chemistry-72 to chemistry-75, close the gaps the grade five and six audit ranked in
its section 4, as [grades-5-6.md](grades-5-6.md), "The gap lessons: eight more a term", places them:
gases dissolved in water and which solutions leave a solid (5.1, unit 2), what acids do to metals
and to chalk (6.2, unit 5), layers from rivers and volcanoes and the Earth inside (6.2, unit 4), and
the air a crew breathes and plants make (6.3, unit 7). Each grown-ups note quotes the curriculum line
it meets. The checkers gained questions for the new drawings: `chem.change` answers `bubbles`,
`fizziest` and `still` for metal strips in `testtubes`, from `METALS_IN_ACID`, and `oxygen`,
`carbon` and `relights` for `chamber`, from `airAfter`; `chem.rocks` answers `broken` and `fault` for
the fault and the ash band on `strata`, and `layer`, `thick` and `depth` for `earthinside`.

The numbers these lessons rest on, with their sources. The most carbon dioxide a litre of water holds
with the gas at one atmosphere, rounded to tenths of a gram, is 3.3, 2.3, 1.7, 1.3, 1.0 and 0.8 g at
0, 10, 20, 30, 40 and 50 °C, from 0.3346, 0.2318, 0.1688, 0.1257, 0.0973 and 0.0761 g in 100 ml
(Wikipedia, "Carbon dioxide (data page)"); soda water is water with carbon dioxide dissolved under
pressure (Wikipedia, "Carbonated water", recalled); dissolved oxygen is the fifth year's USGS DOTABLES
table, and the fishes' need of 7 to 14 mg a litre is the question's own number. In dilute acid
magnesium reacts fast, zinc and iron more slowly and copper not at all, giving hydrogen and a salt
(RSC, "Microscale reactions of metals with acids" and "Reactions of metals with acids producing
salts"); the 10, 6, 3 and 0 bubbles are the test tubes' own readings. An acid on chalk, limestone or
marble gives carbon dioxide (RSC, recalled), and acid rain slowly wears limestone and marble (US EPA,
"Effects of acid rain", recalled). Granite is mostly quartz, feldspar and mica (Wikipedia, "Granite"),
and its feldspar weathers faster than its quartz, which is hard and unreactive, so sand is mostly
quartz (Wikipedia, "Sand"). Layers get younger upwards, a fault is younger than the layers it breaks,
and an ash band marks one moment (superposition and cross-cutting relationships, British Geological
Survey, recalled). The Earth's layers are the depths in `engine/parts/science/earthinside.ts` (IUGG,
PREM and USGS). A candle under a jar goes out at about 16 per cent oxygen, as in the sixth year, and
Priestley found in 1771 that a sprig of mint restored air a candle had used up (Wikipedia, "Joseph
Priestley", recalled); the jar's and the cabin's rates of 0.5, 0.25 and 0.1 points an hour are the
chamber drawing's model, and the lessons call them these readings. The soap drops in chemistry-67
are likewise one child's readings, which the question says, since we found no published table that
counts drops of soap against hardness. Carbon dioxide at Mauna Loa, as
annual means, was 316.91, 325.68, 338.76, 354.45, 369.71, 390.10 and 414.21 parts per million in
1960 to 2020 by decade, and 427.35 in 2025 (NOAA Global Monitoring Laboratory); burning fossil fuels
adds carbon dioxide, which warms the climate (IPCC AR6 WG1, Summary for Policymakers, A.1, recalled).

## 7. Order to build the rest

1. Give the chemistry drawings their movements for look sections: the fizz foaming up, the ice shrinking, particles jiggling faster, crystals growing. Each carries a reading, so each needs a declaration of its own that moves the whole drawing or a part marked free, through the tests in [animation.md](animation.md).
2. Build the "Get it back" pouring game in [games.md](games.md) on the beaker, funnel, cylinder and dish, with evaporating as a move, since four grade three lessons now separate mixtures on those drawings; and a sieve toy on the engine's bodies, where things smaller than the holes fall through when it is shaken.
3. A particle toy on the Games tab: a jar whose particles jiggle, slide and fly as a warmth slider moves, stopping at each change of state, which is the one idea in the track that is better felt than read.
4. A colour toy on the paint model: drops of cabbage juice into cups of kitchen liquids, predicting each colour before it appears.
5. Materials at grade four: hardness, transparency, thermal and electrical conductivity and magnetism together, reusing the physics `things` tray and `wrapped`, which would complete England's Year 5 list.
6. Weathering and erosion (4-ESS2-1) on the `rocks` and `strata` drawings, and the rock cycle, which England leaves to Key Stage 3.
7. A general grown-up mark for "say how you know", which [audit.md](audit.md) asks for, so the two-star questions could collect the child's own reason as well as the chosen one.

## 8. What is unfinished

- The chemistry drawings do not move yet, and none of the games or toys in section 7 is built, so the look sections are still pictures and separating a mixture is only asked about, not played.
- Two parts of the frameworks have no lesson: England's Year 5 list of properties taken together (hardness, transparency, conductivity and response to magnets, which the physics track covers one at a time), and weathering and erosion (4-ESS2-1). The rock cycle is left to Key Stage 3, as England leaves it.
- We have not graded the chemistry items again on the scale in [audit.md](audit.md) since the rewrite, so the shares of recall, one-step, reasoning and non-routine questions at each grade are not measured. That every two-star question needs a reason and every three-star one is non-routine rests on our own reading of each item, not on a second grader's.
- A two-star question collects a reason the child picks from three or four, not one the child says in their own words. That waits for the general grown-up mark in section 7.
- The verifier does not warn when a hint gives the answer away, which [audit.md](audit.md) proposes in section 4. The check we ran on chemistry's hints is a script outside the repository, so a new hint that tells is not caught.
- Unit names are declared nowhere in the content; the ten in section 6 live only in this document.
- The test tubes, the dropper and the safety kit are drawn only in look sections (new materials, the red cabbage test, and heating), so no question reads them, and `keeps` in `chem.materials` is asked by no item.

These need a decision:

- Grade four has eight chemistry lessons and grade one six, more than the four a year that [tracks.md](tracks.md) describes for a fifteen lesson track, and its table of lessons per grade still shows chemistry's first fifteen. The density of a track is the owner's decision, and a lesson can move to another grade or unit by changing its `grade` and `unit` without changing anything else in it.
- Atoms and molecules are taught at grade four as a stretch lesson, a year or more before England (Key Stage 3) and the NGSS (middle school) meet them. The lesson says the model's colours are only a key and draws water bent. Whether it stays in the year plan or becomes an extra a family chooses is open.
- The indicator chart draws yellow for pH 12 to 14. The RSC's chart ends at green at 12 and its notes give "green/yellow" for 10 to 12, so where yellow begins is our reading of the two rather than a value either states. No liquid in the lessons is that alkaline, so no answer depends on it, but the chart a child sees does.

## Sources

- National curriculum in England, science programmes of study: https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study/national-curriculum-in-england-science-programmes-of-study; year groups and ages: https://www.gov.uk/national-curriculum; US ages by grade, NCES: https://nces.ed.gov/programs/digest/d19/figures/fig_01.asp
- NGSS: 2-PS1 https://www.nextgenscience.org/dci-arrangement/2-ps1-matter-and-its-interactions; 5-PS1-1 https://www.nextgenscience.org/pe/5-ps1-1-matter-and-its-interactions; 5-PS1-2 https://www.nextgenscience.org/pe/5-ps1-2-matter-and-its-interactions; 5-PS1-3 https://www.nextgenscience.org/pe/5-ps1-3-matter-and-its-interactions; 5-PS1-4 https://www.nextgenscience.org/pe/5-ps1-4-matter-and-its-interactions; 4-ESS1-1 https://www.nextgenscience.org/pe/4-ess1-1-earths-place-universe; 4-ESS2-1 https://www.nextgenscience.org/pe/4-ess2-1-earths-systems; 2-ESS2 https://www.nextgenscience.org/dci-arrangement/2-ess2-earths-systems; MS-ESS2-4 https://www.nextgenscience.org/pe/ms-ess2-4-earths-systems; 3-LS4-1 https://www.nextgenscience.org/pe/3-ls4-1-biological-evolution-unity-and-diversity; MS-PS1-1 https://www.nextgenscience.org/pe/ms-ps1-1-matter-and-its-interactions
- Children's ideas: RSC, changes of state https://edu.rsc.org/changes-of-state/students-ideas-about-changes-of-state-beyond-appearances/4017768.article; mass and dissolving https://edu.rsc.org/solutions/mass-and-dissolving-chemical-misconceptions-ii-11-14-years/1084.article; states of matter https://edu.rsc.org/states-of-matter/states-of-matter-beyond-appearances/4017762.article; open system chemical events https://edu.rsc.org/resources/students-ideas-about-open-system-chemical-events-beyond-appearances/4017791.article; elements, compounds and mixtures https://edu.rsc.org/elements-compounds-and-mixtures/students-ideas-about-the-differences-between-elements-compounds-and-mixtures-beyond-appearances/4017771.article; boiling point https://edu.rsc.org/changes-of-state/boiling-point-a-surprising-measurement-stretch-and-challenge-11-14-years/618.article; AAAS Project 2061 misconceptions (archived) https://web.archive.org/web/2023/https://assessment.aaas.org/topics/1/AM/97 and https://web.archive.org/web/2023/https://assessment.aaas.org/topics/1/SC/102; Ohio State, Beyond Penguins https://beyondpenguins.ehe.osu.edu/issue/water-ice-and-snow/common-misconceptions-about-states-and-changes-of-matter-and-the-water-cycle; Science Learning Hub, water's states https://www.sciencelearn.org.nz/resources/616-alternative-conceptions-about-water-s-states-of-matter and fire https://www.sciencelearn.org.nz/resources/796-alternative-conceptions-about-fire; powders and young children https://eric.ed.gov/?id=ED291557
- Fifth year: dissolved oxygen, USGS DOTABLES https://water.usgs.gov/water-resources/software/DOTABLES/; the Sun's composition, Asplund, Grevesse, Sauval and Scott, Annu. Rev. Astron. Astrophys. 47 (2009) 481, https://doi.org/10.1146/annurev.astro.46.060407.145222; potassium alum https://en.wikipedia.org/wiki/Potassium_alum; granite and its melt https://en.wikipedia.org/wiki/Granite; RSC periodic table https://www.rsc.org/periodic-table; paraffin wax, CDC NIOSH https://www.cdc.gov/niosh/npg/npgd0477.html
- Gap lessons: carbon dioxide in water https://en.wikipedia.org/wiki/Carbon_dioxide_(data_page); Mauna Loa annual means https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt; metals and acids, RSC https://edu.rsc.org/experiments/microscale-reactions-of-metals-with-acids/509.article and https://edu.rsc.org/experiments/reactions-of-metals-with-acids-producing-salts/446.article; granite https://en.wikipedia.org/wiki/Granite; sand https://en.wikipedia.org/wiki/Sand
- Sixth year: sodium chloride brine table https://www.brinemaker.com/wp-content/uploads/SodiumChlorideTable.pdf; saturated vapour density, HyperPhysics https://hyperphysics.gsu.edu/hbase/Kinetic/watvap.html; pH and water, USGS https://www.usgs.gov/special-topics/water-science-school/science/ph-and-water; water hardness, USGS https://www.usgs.gov/special-topics/water-science-school/science/hardness-water; stalactite growth https://en.wikipedia.org/wiki/Stalactite and USGS https://www.usgs.gov/publications/rate-growth-stalactites; crew oxygen and carbon dioxide, NASA life-support baseline via https://en.wikipedia.org/wiki/Life-support_system; icebergs, USGS https://usgs.gov/media/images/ninety-percent-iceberg-below-waterline and Ohio State, Beyond Penguins https://beyondpenguins.ehe.osu.edu/issue/icebergs-and-glaciers/all-about-icebergs
- Facts: PubChem, water https://pubchem.ncbi.nlm.nih.gov/compound/962, sucrose https://pubchem.ncbi.nlm.nih.gov/compound/5988, sodium chloride https://pubchem.ncbi.nlm.nih.gov/compound/5234, ethanol https://pubchem.ncbi.nlm.nih.gov/compound/702, sodium bicarbonate https://pubchem.ncbi.nlm.nih.gov/compound/516892, sodium carbonate https://pubchem.ncbi.nlm.nih.gov/compound/10340; sucrose decomposition, J. Agric. Food Chem. https://doi.org/10.1021/jf1042344; RSC periodic table https://www.rsc.org/periodic-table/element/26/iron; milk fat, University of Guelph https://books.lib.uoguelph.ca/dairyscienceandtechnologyebook/chapter/milk-lipids-chemical-properties-physical-properties-structure-and-fat-globules-functional-properties/; chocolate, RSC https://edu.rsc.org/changes-of-state/the-science-of-melting-chocolate/4013276.article; paraffin wax, CDC NIOSH https://www.cdc.gov/niosh/npg/npgd0477.html; boiling at altitude, NIST https://webbook.nist.gov/chemistry/fluid/ and Colorado State Extension https://extension.colostate.edu/resource/high-altitude-hard-cooked-eggs/; pH values, USGS https://www.usgs.gov/special-topics/water-science-school/science/ph-and-water; red cabbage, RSC chart https://edu.rsc.org/download?ac=512305, notes https://edu.rsc.org/download?ac=512306, and at home https://edu.rsc.org/primary-science/red-cabbage-rainbows/4011608.article; rusting, RSC https://edu.rsc.org/experiments/what-causes-iron-to-rust/434.article and conservation of mass https://edu.rsc.org/cpd/how-to-teach-conservation-of-mass/4011856.article; candles, National Candle Association https://candles.org/candle-science/ and the candle under a jar https://www.sciencelearn.org.nz/resources/776-the-great-candle-experiment; rocks, British Geological Survey https://www.bgs.ac.uk/discovering-geology/rocks-and-minerals/ and https://www.bgs.ac.uk/discovering-geology/rocks-and-minerals/rock-rumble/; limestone fizzing https://www.sciencelearn.org.nz/resources/462-limestone-a-fizzy-rock-introduction; RSC rocks and soils https://edu.rsc.org/primary-science/rocks-and-soils-thats-chemistry/1795.article; fossils, BGS https://www.bgs.ac.uk/discovering-geology/fossils-and-geological-time/fossils/; soil https://www.sciencelearn.org.nz/resources/1861-soil-introduction and the jar test, Colorado State https://cmg.extension.colostate.edu/Gardennotes/214.pdf; the water cycle, Met Office https://www.metoffice.gov.uk/weather/learn-about/weather/how-weather-works/water-cycle, USGS condensation https://www.usgs.gov/water-science-school/science/condensation-and-water-cycle and evaporation https://www.usgs.gov/special-topics/water-science-school/science/evaporation-and-water-cycle, RSC https://edu.rsc.org/primary-science/the-water-cycle-thats-chemistry/1802.article; crystals https://www.sciencelearn.org.nz/resources/674-growing-crystals; yeast, RSC https://edu.rsc.org/experiments/yeast-and-the-expansion-of-bread-dough/1748.article; molecules and model colours, PubChem https://pubchem.ncbi.nlm.nih.gov/periodic-table/
- Safety: NSTA, safety in elementary science https://static.nsta.org/pdfs/SafetyInElementaryScience.pdf; NSTA, teaching at home https://static.nsta.org/pdfs/Safer%20Remote%20Instruction%20and%20Parent%20Teaching%20Guide%20for%20Elementary%20School_final.pdf; RSC red cabbage practical https://edu.rsc.org/experiments/making-a-ph-indicator-using-red-cabbage/422.article; RSC, goggles and spectacles https://edu.rsc.org/endpoint/do-you-know-your-safety-spectacles-from-your-goggles/4021475.article
