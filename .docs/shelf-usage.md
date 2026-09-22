# Where every drawing on the shelf is actually used

Measured on 18 September 2026 at 01:14, against the corpus and the worlds as they stood at that
minute. Both were moving while the count ran, so this is a snapshot and not a standing number: see
"What moved under the measurement" at the end.

This replaces the art half of [audit.md](audit.md), which counted the shelf against lessons alone on
13 September and recorded world use only as a property of the drawings it had already called unused.
The question the owner asked is the one the shelf page cannot answer today: the page marks a drawing
"No lesson yet" and says nothing about whether a world or the map draws it every day.

## How it was counted

Every number here comes from `.scratchpad/scripts/usage-audit.ts`, which loads the same modules the
pages and the tests load and writes one JSON record per drawing. It is not an estimate and no figure
in this document is a judgement unless it says so.

The shelf is the union of three lists, which is what `test/shelf.test.ts` already holds the page to:
the catalogue's entries, the notation's parts, and the hand-drawn files in `content/art/`. A drawing
is counted once under its shelf id, and a hand-drawn file under the id the shelf gives it
(`svg.cat`, `strokes.hills`).

A drawing counts as used where something that a person sees draws it:

- In a lesson or an item, when a scene places it. The corpus is parsed rather than verified, the way
  `src/pages/finder.ts` parses it, and a component or an item a lesson uses is expanded, so a
  drawing reached through `use` or through a shared item counts for the lesson that reaches it. We
  count lessons and items, not references: a drawing placed eight times in one lesson is one lesson.
- In a world or on the map, when a world's declaration names it (its horizon, its sky, its gate, its
  landmarks, its creatures, its guide, the reaches that put it beside a lesson, what a grown-up may
  choose instead, its place on the map, and its chapter's moment, secret, glimpse and rare sight), or
  when the country names it (`FEATURES` and `SIGHTS` in `geography.ts`, the life and the guide's
  rides in `life.ts`, and `MAP_REFS` in `worlds/art.ts`, which is the map's own title, key, compass,
  lamps, bridges and riders). A world names a drawing by its id in `school/worlds/art.ts`, so each
  name is resolved through that table to the shelf's own id before it is counted.
- In a game, when a game in `src/play/` names it.
- In the apps, the site or the brand, when a screen names it, either by importing the drawing or by
  naming its id as data.

Two distinctions matter and were made by hand after the first pass:

- A drawing drawn only inside another drawing is not used in its own right. The coordinate grid is
  the only one on the shelf in that position: `plotpoint` delegates its box and its drawing to
  `coordGrid`, and a grade four lesson draws `plotpoint`, so the grid does reach a child.
- The shelf's own bookkeeping is not a use. The catalogue, the grouping, the notation's registry and
  parts list, the animation table and `moved.ts`, which is the shim that keeps the scratchpad's old
  names working, were all left out. Counting them would have made every drawing on the shelf used.

## What the shelf holds and where it is drawn

587 drawings, of which 562 are catalogued and 25 are hand-drawn files.

| Where it is drawn | Drawings |
|---|---|
| In at least one lesson | 390 |
| In a world or on the map | 218 |
| In a game | 123 |
| In the apps' own screens | 17 |
| In the site or the brand | 9 |
| In another prototype page | 29 |
| **Used somewhere** | **538** |
| **Used nowhere** | **49** |

The columns overlap, since a drawing can be in a lesson and in a world and in a game. 227 drawings
are used in lessons and nowhere else, and 125 are used both in a lesson and in a world.

Across the 332 lessons and 2,230 items in the corpus, the 390 used drawings hold 1,967
drawing-to-lesson pairs between them.

## The owner's first question: what "No lesson yet" hides

197 drawings are marked "No lesson yet" on the shelf page. Of those:

- **93 are drawn in a world or on the map.** 76 of them are drawn there and nowhere else, so for
  those 76 the shelf's only indicator is wrong about the only place they appear.
- 62 are drawn in a game, 46 of them in a game and nowhere else.
- 4 are drawn in the apps' own screens, and 8 in another prototype page.
- 49 are drawn nowhere at all.

So three quarters of what the page calls "No lesson yet" is in front of a child somewhere, and the
largest single group is the worlds. The 93 by shelf family:

| Shelf family | Drawings with no lesson that a world or the map draws |
|---|---|
| Outdoors and nature (21) | ammonite, comet, firs, fossil, geyser, giantflower, hedge, iceberg, log, palms, peaks, rainbow, saltlake, saltpans, shootingstar, skyisland, snowman, stile, strata, treeplatform, volcano |
| Getting about and maps (16) | airship, balloon, buoy, cablecar, divingbell, mailboat, maptitle, narrowboat, railsignal, ropebridge, seaplane, shipwheel, sidings, sledge, tractor, yachts |
| Animals (15) | albatross, badger, dolphins, eagle, flamingos, gannet, goat, manta, owlflying, parakeets, puffins, robin, starfish, starlings, swallows |
| Buildings and places (15) | bookhouse, bridge, citywalls, greatclock, hall, hut, lamppost, lampstation, observatory, printingpress, temple, tower, well, world.door, world.window |
| Sport and games (7) | goalposts, grandstand, medalrow, podium, runners, target, teamgrid |
| Notes, stickers and answer boxes (6) | guide.bird, guide.dot, guide.glow, guide.hand, guide.snail, guide.stub |
| At home and at play (3) | easel, strokes.bunting, tablet |
| Science (2) | microscope, weatherstation |
| Stories and things to read (2) | postmark, seaserpent |
| People and feelings (2) | skater, umbrellas |
| Writing (1) | loosepages |
| Food and the kitchen (1) | oven |
| Art and painting (1) | palette |
| Time and the calendar (1) | sundial |

The six guides are the alternatives to the firefly, and every one of them is offered by at least one
world for a grown-up to choose, so none is idle.

## The 49 drawn nowhere

Grouped by the family the shelf files them under.

| Shelf family | Drawings |
|---|---|
| Charts, sorting and chance (9) | bag, balldropper, carroll, pegboard, probscale, rings, spinner, tallytable, tubelid |
| Notes, stickers and answer boxes (5) | badge, brace, callout, marks, ribbon |
| Music (5) | countrow, glockenspiel, guitar, handdrum, tunegrid |
| Science (4) | crane, cranehook, moonground, plank |
| Time and the calendar (3) | calendar, timeline, yearwheel |
| Shapes, angles and space (3) | coords, patternblocks, shapemarks |
| Getting about and maps (3) | landingpad, rocket, ticket |
| Sums and missing numbers (2) | arrowchain, letter |
| Sport and games (2) | cards, dominoes |
| At home and at play (2) | envelope, exercisebook |
| Buildings and places (2) | excalidraw.house, sheeppen |
| The apps' own drawings (2) | icon, newbook |
| Counting and number (2) | ordertrack, signchain |
| Tens and ones (1) | gattegno |
| Measuring (1) | heightmast |
| Outdoors and nature (1) | meadow |
| Food and the kitchen (1) | recipe |
| Puzzles and patterns (1) | tangram |

`coords` is the one that is drawn inside another drawing rather than on its own: `plotpoint` draws
it, and `g4-12-coordinates` draws `plotpoint`. It is listed here because nothing names the grid
itself, but a child does see it.

Only one of the 25 hand-drawn files is unused, `excalidraw.house`, which is one of the twelve the
owner decided on 16 September to drop.

### Against the decision of 16 September

The decision recorded in `.docs/leftover/art-shelf.md` keeps the rocket, the peg board and the crane
as covers of the removed games, and drops twelve others. The measurement agrees with it exactly and
adds nothing to it:

- All twelve of the drop list (`marks`, `landingpad`, `moonground`, `heightmast`, `tubelid`,
  `balldropper`, `cranehook`, `plank`, `badge`, `ribbon`, `brace`, `excalidraw.house`) are in the 49.
  Nothing has picked any of them up since, so the prepared cleanup is still correct as written.
- The three kept as covers, `rocket`, `pegboard` and `crane`, are also in the 49, which is what the
  decision expects: they are kept because the owner wants them on the shelf, not because anything
  draws them.
- The remaining 34 of the 49 are outside the decision and are what the plan in the next section has
  to find homes for.

## How this differs from the September audit, and why

[audit.md](audit.md) counted 397 drawings and 135 unused on 13 September. Those numbers cannot be
compared straight across, because the shelf has grown from 397 to 587 since (the eleven worlds round
the run, the nine places further off and the six concept worlds each brought drawings with them), and
because the definition changed: audit.md counted a drawing used only when a lesson placed it, and
recorded world use as a property of the unused.

The definition is where the difference sits. Under audit.md's definition this pass would report 197
unused rather than 49, and the 148 drawings in the gap are the ones a world, the map, a game or an
app draws and no lesson does.

The last broad-definition count we have is `.scratchpad/leftover/parts-move/unused.md`, which
re-checked 49 ids by hand on 14 September and found fourteen of them used, a false-unused rate of
29 per cent. Every one of those fourteen comes out used here as well, which is the main check we have
that the resolution in this pass is right. Finding them took four corrections to the first script,
each worth recording because the same traps will catch the next person:

- A world names its guide by the guide's own name, with no entry in `worlds/art.ts`, so the six
  alternative guides looked unused until the names were mapped to `guide.<name>`.
- An entry in `worlds/art.ts` marked `from: "world"` is painted by the world's own painter, but two
  of them, the door and the window, still name a shelf drawing in `ref`.
- `art: "rocket"` means different drawings in different files. In a world and on the map it is the id
  in `worlds/art.ts`, which resolves to the hand-drawn `svg.rocket`; in a game or a page it is the
  shelf's own id. Crediting both made the coded `rocket` look used when it is the duplicate the
  16 September decision kept only as a cover.
- The map draws its own title, key and compass through `drawingOf("maptitle")` rather than as data,
  and the apps draw the postcard's stamp and postmark as a component's `id`. Neither looks like a
  reference to a scan that only knows about `art:`.

## A plan for the 49

Every drawing nothing draws gets one honest home: a lesson that would use it, a place in the product
or on the map, or a recommendation to retire it. The batches are ordered so the cheap work can be
done without waiting for the expensive work, and each says what it costs.

The lessons are not written here. This is the plan the catalogue stream would execute, and the
question wordings below are what each question would ask, not final copy.

### What decides whether a lesson is cheap

A drawing the notation can place with all its settings writable takes a lesson and nothing else. A
drawing with a setting the notation cannot spell keeps that setting at its own value, so every
question built on it would show the same contents: the same three dominoes, the same bag of
counters, the same recipe. That is item 8 of [gaps.md](gaps.md), still open, and it costs a change
per drawing (a list of objects replaced by parallel lists of numbers or words) rather than a change
to the notation. Which settings are frozen was read off `PARTS` in `src/lang/parts.ts` at the time of
the measurement, not assumed.

### Batch 1: the drawings the owner has already decided on (15)

Decided on 16 September and prepared, so there is no new thinking in this batch.

- Drop the twelve: `marks`, `landingpad`, `moonground`, `heightmast`, `tubelid`, `balldropper`,
  `cranehook`, `plank`, `badge`, `ribbon`, `brace`, `excalidraw.house`. The cleanup written in
  `.docs/leftover/art-shelf.md` runs as it stands; this pass confirms that nothing has picked any of
  them up since it was written.
- Keep `rocket`, `pegboard` and `crane` as covers of the removed games. They should carry a word on
  their shelf lines saying they are covers, so the next usage pass does not raise them again as
  unused. That is the only change this batch asks for beyond the prepared cleanup.

Cost: mechanical. No lesson writing.

### Batch 2: a lesson each, and nothing else (11)

Every setting these need is already writable, so each is one lesson and no code.

| Drawing | Subject and grade | What the question would ask |
|---|---|---|
| `tangram` | Maths, grade 2, flat shapes | Which two pieces make the middle-sized triangle, and what fraction of the whole square one small triangle is |
| `patternblocks` | Maths, grade 2, halves, quarters and thirds | How many blue rhombuses cover the yellow hexagon, so what fraction of it one rhombus is |
| `shapemarks` | Maths, grade 4, naming shapes | Which of four quadrilaterals is the rhombus, read off the ticks, the arrows and the right-angle square rather than told |
| `ticket` | Maths, grade 3, time and money | The train leaves at 09:15 and takes 40 minutes, so when does it arrive, and what do two tickets cost |
| `yearwheel` | Nature or maths, grade 1, months and seasons | October is marked: which season is it in, and how many months until March |
| `calendar` | Maths, grade 2, the calendar | March has 31 days and the 1st is a Wednesday, so what date is the third Monday |
| `signchain` | Maths, grade 2, comparing | Put the right sign in each box between 4, 7 and 2, where getting the first right does not settle the second |
| `ordertrack` | Maths, grade 2, ordering | Put 36, 12 and 51 on the track, smallest first, with the arrow saying which way it runs |
| `exercisebook` | Maths, grade 1, counting and sorting | Four books in three colours: how many are not yellow |
| `glockenspiel` | Music, grade 1, high and low | Play the eight bars and say which one sounds highest, then find it on the row |
| `guitar` | No new lesson | The two guitar lessons that exist draw the lane and the strings and never the instrument. One look picture in each is a two-line edit |

`calendar` and `ordertrack` are here rather than in batch 3 on purpose: their frozen settings
(`shade` and `ring`, `filled`) are the marks a child makes, so a question wants them empty anyway. A
question about a shaded run of dates would still wait for batch 3.

Cost: ten lessons to write and one edit to two existing lessons. No code.

### Batch 3: a lesson each, once the frozen setting opens (13)

Each of these needs its list-of-objects setting opened first, one change per drawing, and then a
lesson. `bag` is the hardest case: it has no writable setting at all today, so nothing about it can
vary until `fills` opens.

| Drawing | Frozen | Subject and grade | What the question would ask |
|---|---|---|---|
| `bag` | `fills` | Maths, grade 2, chance | Three red and five blue in the bag: which colour are you more likely to pull out |
| `carroll` | `cells` | Maths, grade 2, sorting | Which cell the big red circle goes in, where both headings have to be read |
| `rings` | `items` | Maths, grade 1, sorting | Which one thing belongs in neither hoop, which is the case a table hides |
| `probscale` | `marks` | Maths, grade 2, chance | Peg "it will snow in July" on the scale, and agree the word with the fraction above it |
| `tallytable` | `rows` | Maths, grade 2, tallies and graphs | Read the tally and write the number, with one column left blank |
| `spinner` | `wedges` | Maths, grade 2, chance | A spinner where red is half and blue a quarter, which is the question the existing `chance.fair-spinner` item cannot ask, since it draws a dial of equal parts |
| `cards` | `cards` | Maths, grade 2, adding to twenty | Turn over two cards and say what they make |
| `dominoes` | `tiles` | Maths, grade 1, adding | How many spots on a domino with three at one end and four at the other, then the same tile turned round |
| `arrowchain` | `steps` | Maths, grade 3, function machines | Start at 5, add 3, double it: what comes out, and then what went in to give 16 |
| `letter` | `letters` | Maths, grade 4, a letter for a number | With a as 4, what 3a + 2 comes to |
| `gattegno` | `pick` | Maths, grade 3, place value | Pick 200, 40 and 7 down the columns and say what number that makes |
| `recipe` | `items` | Maths, grade 3, scaling | Pancakes for four use 100 g of flour, so how much for eight |
| `timeline` | `events` | Maths or history, grade 4, reading a scale | How many years between the ship sailing and the landing, read off a line whose steps are twenty years |

`timeline` has a second home whichever way this goes: the fossil cliffs' wants list in
[worlds-next.md](worlds-next.md) asks for a timeline on the cliff, and that needs no setting opened
because a world can draw it with its own contents.

Cost: thirteen settings changes, then thirteen lessons. This is the expensive batch, and it is the
one that also unfreezes seventeen drawings that are already used and show the same contents in every
question, so it buys more than these thirteen.

### Batch 4: the product, not a question (4)

These were each drawn for a screen that exists and does not draw them. None of them belongs in a
lesson, and giving them one would be dishonest about what they are for.

| Drawing | Where it belongs |
|---|---|
| `envelope` | The sign-in screen that says a code has been sent. Its `code` setting holds up to eight digits in boxes, which is that screen and nothing else |
| `newbook` | The two empty states its own description names: a family with no child added, and a journal before the first lesson |
| `icon` | The apps' controls. Ten icons drawn as one set to sit beside a word, where the apps draw their controls another way today |
| `callout` | The hint or the watch-out on a lesson page. It is the last of the page furniture once batch 1 drops the rosette, the ribbon and the brace, so if the lesson page does not take it in this pass, it should go with them |

Cost: three small changes in the apps and one decision on the callout. No lesson writing. These are
not ours to land: they belong to whoever holds the apps.

### Batch 5: a place in a world (1)

`sheeppen` is a pen of hurdles with a gate that swings shut and a board on the gatepost for a number.
The meadow's own wants list asks for "a field gate that swings open", and the valley farm already
stands hens, pigs and cows. An entry in `school/worlds/art.ts` and a line in one of those two worlds
is the whole of it. This belongs to the map lead rather than to us, and it is a proposal, not a
change we would make.

Cost: one world entry.

### Batch 6: three lines, then the music drawings can be placed at all (3)

`countrow`, `handdrum` and `tunegrid` are not unused because nobody wanted them. They cannot be
placed by the notation at all, because `src/art/countrow.ts`, `handdrum.ts` and `tunegrid.ts` are not
in the `MODULES` list in `src/lang/parts.ts`, and only what is in that list becomes a part. Three
import lines and three entries fix it. After that:

| Drawing | Subject and grade | What the question would ask |
|---|---|---|
| `countrow` | Music, grade 1, the beat | Count one to four along the row: which beat the clap falls on |
| `handdrum` | Music, grade 1, rhythm | Tap the pattern on the drum, played on screen rather than written |
| `tunegrid` | Music, grade 2, writing a tune down | Which square a note goes in for the tune just played |

Music has eleven lessons against the ten its own plan calls for in each of four grades, so these
three have somewhere obvious to go once they are placeable.

Cost: three lines of plumbing, then three music lessons.

### Batch 7: retire (1)

`meadow` is grass seen from above, described in its own file as "ground to stand things on, with
nothing in it to count". The world painter already paints a meadow ground, the games already use
`arcade.ground`, and the notation cannot place it because the playfield file it lives in is not a
parts module. It duplicates two things that are used and is wanted by neither.

Cost: one deletion, the same shape as the twelve in batch 1.

### Not in a batch: `coords`

The coordinate grid is drawn on a child's page already, through `plotpoint`, which delegates its box
and its drawing to it and which `g4-12-coordinates` uses. It needs no home. What it needs is a line
on its shelf entry saying it is drawn through `plotpoint`, so it is not raised as unused again. When
the route and grid-reference lessons of item 10 in [gaps.md](gaps.md) are written, they would use it
directly once `points` opens, which is batch 3 work.

### The shape of the work

| Batch | Drawings | Lessons to write | Code | Whose |
|---|---|---|---|---|
| 1, already decided | 15 | none | the prepared cleanup, plus a word on three shelf lines | the shelf |
| 2, a lesson each | 11 | 10 new, 1 edit | none | the catalogue |
| 3, after the frozen settings open | 13 | 13 | 13 settings changes | the shelf, then the catalogue |
| 4, the product | 4 | none | 3 app changes, 1 decision | the apps |
| 5, a world | 1 | none | one world entry | the map |
| 6, music | 3 | 3 | 3 lines in one file | the shelf, then the catalogue |
| 7, retire | 1 | none | one deletion | the shelf |

Batches 1, 6 and 7 are cheap and touch one file each. Batch 2 is the largest run of honest lesson
work available with no code behind it. Batch 3 is the only one that needs a change to the drawings
themselves, and it is worth more than the thirteen it unblocks, since the same change frees the
seventeen used drawings that show the same contents in every question today.

## What moved under the measurement

Two other leads were working while this ran, and the numbers moved:

- The corpus went from 331 lessons and 2,223 items to 332 and 2,230 during the run, as the catalogue
  batch lead landed lessons. A drawing that a lesson landed after 01:14 will read as unused here.
- The shelf went from 586 drawings to 587 in the same window. The shelf page's own header was showing
  586 when this work started.
- The map lead was rewriting `school/worlds/geography.ts` and the country's layout. The file was read
  at 01:14 and not from any earlier cache, but a landmark added to the country after that is not
  counted.

Re-running `.scratchpad/scripts/usage-audit.ts` costs a few seconds and needs no lock, so the count
can be refreshed before any decision is taken on it. It was re-run at 01:40 to see what the drift
looks like in practice: in twenty-six minutes the shelf went from 587 drawings to 588, nothing that
was unused became used, and the one new drawing, `weave` in `engine/parts/art/weave.ts`, is unused.
It is not in the plan above, and a drawing that arrives after a count is the plan's normal state
rather than a fault in it. The counts in this document are the 01:14 ones throughout, so that every
number in it belongs to the same minute.
