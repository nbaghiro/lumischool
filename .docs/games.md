# Games

Status: proposed, September 2026. It is the second document about activities and it does not replace the first. [activities.md](activities.md) owns the model: what a mechanic declares, what an activity declares, what the prover proves, and the promise we make to a parent. This one is a designed set of games to build on top of that model, chosen to spend the art catalogue and to climb from grade one to grade four. Twenty five games, eighteen of them on mechanics we already have and seven on new ones, and no new drawing in any of them.

It asks for four things the model does not have, all of them named in their own sections at the end and none of them large: one change to the contract in `scratchpad/src/play/types.ts`, so that a mechanic's board drawings come from a slot an activity fills rather than from a constant in its code; two additions to the prover; and five settings on drawings that already exist. The contract change turned out to matter more than any single game in the set, which is not how we expected this to come out.

Everything below was written after playing what exists. Six activities on five mechanics are in the page today; every version of each was driven to a win, the balance, the number line and the yard were played move by move with the text form on and moves taken back on the way, and the figures quoted for any of them come from the prover run in the page rather than from this document's guesses. Four more mechanics are being written while this was drafted, so the set avoids them and says where it would otherwise have collided.

## The games on the Games tab

This section lists what is built, and it is kept up to date; the rest of the document is the design it was written as. Every game is on one engine and in one Games tab, `scratchpad/play.html`, grouped by how it plays: puzzles, where the question is what to do next and the moves are a tray of buttons; hands-on games, where the same kind of mechanic has real controls on the board; and action games, which move by themselves. [engine.md](engine.md) says what the engine is and why each game is in its group. The figures are the prover's own for each level, and every level of every puzzle and hands-on game keeps the promise. An action game has no position graph, and is held to named invariants and a seeded replay in `scratchpad/test/games.test.ts`.

| Game (`?g=`) | Group | Mechanic | Levels, with their grades, positions and shortest win |
|---|---|---|---|
| Spell the picture (`spell`) | puzzle | `spell` | 1 three sounds, grades 1 to 2, 259 positions, 3 moves; 2 three sounds, four letters, 1 to 2, 259, 3; 3 four sounds, 1 to 2, 1555, 4; 4 four sounds, and a choice, 1 to 2, 1555, 4 |
| Find the rule (`rule`) | puzzle, on a machine a ball and a card can be put into | `rule` | 1 the first machine, grades 3 to 4, 151 positions, 2 moves; 2 the second machine, 3 to 4, 151, 2; 3 the third machine, 3 to 4, 151, 2; 4 three numbers to feed, 3 to 4, 71, 2; 5 twelve cards that agree, grade 4, 196, 2; 6 twelve cards, and no 1, grade 4, 196, 2 |
| See-saw (`weigh`) | action, full-bleed, off the list | none | 1 seven kilograms, grade 1; 2 ten, in two bags, 1 to 2; 3 both sides, 2; 4 further out, 3; 5 two to balance, 3 to 4; 6 either side, any step, 4 (see "Built since: one direction for every game") |
| Rabbit crossing (`jump`) | action, full-bleed | `jump` | 1 0 to 20, land on 13, grades 1 to 2; 2 -10 to 10, land on -4, 3 to 4; 3 stones that sink, 2 to 3; 4 only some numbers written, 3 to 4; 5 back past nought, grade 4; 6 tens to a hundred, 3 to 4 (see "Land on the number, rebuilt as Rabbit crossing") |
| Penny shove (`pay`) | action, full-bleed | none | 1 ten cents, grade 1; 2 twenty-five cents in three coins, 1 to 2; 3 65 cents in four coins, 1 to 2; 4 change from a dollar, 2 to 3; 5 99 cents, 2 to 3; 6 $1.87 in seven pieces, 3 to 4 |
| Row to the jetty (`straight`) | action, full-bleed | `race` | 1 one hundred metres, grades 1 to 2; 2 fifty metres in fives, 1 to 2; 3 only some numbers, 2 to 3; 4 against the current, 2 to 3; 5 the buoy on 64, 3 to 4; 6 the buoy on 35, against the current, grade 4 (see "Stop on the line, rebuilt as Row to the jetty") |
| Shunting yard (`shunt`) | action, full-bleed | `shunt` | 1 one carriage out of place, grades 1 to 2; 2 standing backwards, 1 to 3; 3 four jumbled, room for three, 2 to 3; 4 four jumbled, room for two, 2 to 4; 5 five carriages, room for two, 3 to 4; 6 six carriages, room for three, 3 to 4 (see "Shunt the carriages, rebuilt as Shunting yard") |
| Cut the cake (`share`) | action, full-bleed, off the list | none | 1 two, grades 1 to 2; 2 three, 2; 3 four, 2 to 3; 4 a quarter has gone, 3; 5 six, 3 to 4; 6 the same as Ann's, 4 |
| Measure it out (`pour`) | hands on, a free drag | `pour` | 1 500 and 300, measure 200, grades 2 to 3, 14 positions, 2 moves; 2 500 and 300, measure 100, 2 to 4, 14, 4; 3 5 and 3, measure 4, 3 to 4, 16, 6; 4 7 and 3, measure 5, 3 to 4, 20, 8; 5 900 and 400, measure 600, 3 to 4, 26, 8; 6 1 litre and 300, measure 100, grade 4, 24, 6 |
| Take the corner (`race`) | hands on, an aim | `race` | 1 the ring, cross the finish, grades 3 to 4, 1470 positions, 15 moves; 2 the ring, stop on the finish, 3 to 4, 1527, 17; 3 the chicane, cross the finish, 3 to 4, 1251, 13; 4 the chicane, stop on the finish, grade 4, 1270, 14 |
| Bead string (`snake`) | action | none | 1 count to ten, grade 1; 2 count in threes, grades 2 to 3 |
| The road (`road`) | action | none | 1 stop on 20, grades 1 to 2; 2 stop on 70, grades 2 to 4 |
| Slingshot (`sling`) | action | none | 1 three stars, grades 1 to 2; 2 over the wall, grades 3 to 4 |
| Shut the box (`shut`) | hands on, a drag | `shut` | two dice: 1 up to 6, grade 1; 2 up to 8, 1 to 2; 3 up to 9, add or times, 2 to 3; 4 up to 9, three ways, 3 to 4; 5 up to 10, three ways, grade 4 (see "Built since: shut the box") |
| Rafts (`herd`) | action, full-bleed | none | 1 five on the raft, grade 1; 2 seven and three, 1 to 2; 3 the same on each, 2 to 3; 4 four to a raft, 3 to 4; 5 five, three and two, 1 to 2; 6 sixes from twenty, 3 to 4 (see "Sheepdog, rebuilt as Rafts") |
| Gone fishing (`fish`) | action, full-bleed | none | 1 two that make ten, grade 1; 2 three that make twenty, 1 to 2; 3 one kilogram, 2 to 3; 4 two and a half kilograms, 3 to 4; 5 three that make fifty, 2 to 3; 6 a kilogram and a half in three, 3 to 4 (see "Gone fishing, rebuilt as Cast") |
| Paper plane (`plane`) | action | none | 1 up to ten, grade 1; 2 tens to a hundred, grade 2; 3 halves, quarters and eighths, grade 3; 4 tenths, grade 4 |

Two of the ten activities in `activities.ts` became one game each way round: the two race activities are two games, Stop on the line on the lanes and Take the corner on the circuit, and the circuit adds two levels of its own that ask for a stop on the finish. The yard adds two levels of its own in the same way. A test checks that every version of every activity is a level of some game, so none was dropped when the tabs became one.

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

Status: built in the scratchpad, September 2026. The penny shove (`play.html?g=pay`), and Cast (`?g=fish`), Rafts (`?g=herd`), Rabbit crossing (`?g=jump`), Row to the jetty (`?g=straight`) and Shunting yard (`?g=shunt`), built after it to the sharper bar, are played on the Games tab, each with `&v=` for the level. The see-saw (`?g=weigh`) and cut the cake (`?g=share`) were built with it and taken off the Games tab's list after the owner played them, for the reason under "The sharper bar"; they still open by their addresses and their activities' links, and their mechanics are being turned into interactive lesson items. The games are `.scratchpad/src/play/seesaw.ts`, `cake.ts`, `shove.ts` and `cast.ts`, the drawings they added are in `.scratchpad/src/art/gamepieces.ts` and `counter.ts`, the engine gained `engine/motion/lever.ts`, `cuts.ts` and `slide.ts`, and the tests are in `.scratchpad/test/games.test.ts`. What the engine and the page gained is in [engine.md](engine.md), under "One direction, drawn full-bleed".

## The owner's verdict

The owner found two games playable, the slingshot and the road, and the rest dull, without a mechanic a child can act on. This part records what we took from playing all seventeen again with real input at 1024 by 768 and 1440 by 900, the direction every game now follows, the games rebuilt to it, and a brief for each of the others.

## What the slingshot does

We played the slingshot until both levels were won, at both sizes, with a mouse dragging the ball. Six things carry it, and none of them is its art, which is squared paper, a strip of grass and some rods.

The verb is direct and physical. One press on the ball and one pull back hold both the angle and the strength, and letting go is the whole decision. The goal can be read before anything is read: stars stand on towers, and a star on the grass is down. What happens has weight. Rods tip and roll, stars fall a different way each time, and the result is never quite the one aimed for, so a near miss is visible and interesting rather than a wrong answer. Control is one finger, and the arrow keys and space do the same. A try costs nothing: when everything has settled the next ball is in the sling, and the dots of the last two flights stay on the paper, so the next shot is a correction of the last one. And the maths sits inside the aim at the second level, where the angle and the pull are written on the arc as it is pulled.

Playing it also shows what it does not have. Its maths is thin, its field is a card of 640 by 350 pixels on a 1024 by 768 tablet with a pad of arrows beside it, and a long line of monospace text explains the keys. The direction below keeps the six things and fixes those three.

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

A game joins the frame by setting `bleed` on its declaration in `.scratchpad/src/play/game.ts`. The page then fits the field to the room, grows the view to show more of the world round what the game asked for, and keeps the camera inside the world. The slingshot joined the frame the same way, with sky laid over each level's play, more on the level shown zoomed out, so a tall window shows sky above the same towers rather than blank page.

## The verdicts

| Game | What the child does before the rebuild | Verdict | Redesign |
|---|---|---|---|
| Slingshot (`sling`) | pulls a ball back and lets go at stars on towers | the bar | keep, and move into the full-bleed frame |
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
