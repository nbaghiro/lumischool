# Audit

Status: measured on 13 September 2026, while the art lessons were still being written. This document measures three things across the whole corpus and proposes what to do about them: how the drawings on the art shelf are used by the lessons, which platform capabilities each subject uses and could reuse, and how hard every item is against published benchmarks. It then sets out one difficulty model for every lesson, reports a pilot that raised grade one maths to that model, ranks new drawings by what they would unlock, and gives an order of work. It replaces the numbers in [gaps.md](gaps.md), which now points here and says which of its findings still hold.

Every number was counted by a script rather than estimated. The scripts load the content the way the tests do (`new Workspace(content())` from `test/helpers.ts`, with `test/art-loader.mjs` registered so the catalogue loads outside the bundler), instantiate every question every lesson shows, and walk every scene. They were kept outside the repository, in the session's work folder. Where a sentence is a judgement rather than a count, it says so. The corpus moved while we measured: the art lessons arrived during the audit and the pilot changed grade one maths, so the art numbers below are the state after both, and the difficulty numbers are the state before the pilot, with the pilot's own before and after given separately.

## The short version

- The shelf holds 397 drawings, 372 drawn in code and 25 hand-drawn. 262 of them appear in at least one lesson and 135 in none. Leaving out page furniture (the spare guide designs, stickers, badges and braces) and the pieces the games are built from, 113 drawings a lesson could be about are unused, and 57 of those already stand in a journal world.
- 202 pictures are in use, and 156 of them (77 per cent) are used by one subject only. Only 46 cross a subject boundary, and 15 of those are hand-drawn files, almost all shared between reading and writing.
- A few drawings carry whole subjects. Coding puts the block program in 16 of its 31 lessons and the maze in 11, and 46 pairs of coding lessons share at least three fifths of their pictures. The beaker is in 7 of 15 chemistry lessons. The chord box and the neck are in 5 of 11 music lessons, and 32 of the 35 music items have one version. The hand-drawn cat, hen, duck and kite are in 19, 18, 16 and 16 lessons.
- We graded all 376 items that existed before the pilot on a five-level scale: recall, one step, several steps, reasoning, and non-routine. 29 per cent are recall, 44 per cent one step, 22 per cent several steps, 3 per cent reasoning and 2 per cent non-routine. 63 per cent sit below the grade they are taught at, 107 would be routine for a five-year-old, and 105 can be answered without the skill they claim to teach.
- Before the pilot, 16 of 200 lessons contained a single reasoning or non-routine item. The "Try this" sections held 198 blocks, and 38 of them were the same item as the practice above them. Reading, physics, chemistry, music and science had no reasoning or non-routine item at all.
- The benchmarks agree on what is missing. Common Core, the England curriculum and the 2025 England review, Singapore's framework, NRICH, Beast Academy and Math Kangaroo all ask for problems with the unknown in every position, non-routine problems, more than one method, and explaining. The content level is mostly right; the cognitive demand is what is low.
- The model we propose gives every lesson three bands: a way in any child can start, the grade's core work, and a stretch of one reasoning question and one non-routine question, with hints that ask rather than tell. It fits the notation's existing sections. It needs four small checks from the verifier and one change to how hints are shown.
- The pilot raised grade one maths to the model: 43 new items, 3 new drawings, all 15 lessons rewritten, every item verified. Question slots at the reasoning and non-routine levels went from 2 of 78 to 26 of 103, and slots below grade from 43 to 23.
- Two defects surfaced. The bus drawing seats one person a window, and the two grade one bus items asked about more people than it could draw in 42 of their 60 versions, so the picture and the answer key disagreed; the pilot fixed both. And the graders found wrong or arguable facts and keys in chemistry, physics, science and writing items, listed under the difficulty findings.
- Section 8 reports the work that followed: every lesson outside physics, art and chemistry now has at least ten questions from at least five items, question slots went from 754 to 1,711 across 170 lessons, and the share at the reasoning and non-routine levels went from 6 to 22 per cent. The reasoning targets proposed in section 4 are not yet met, which needs a decision.

## 1. Art against lessons

### How it was counted

A drawing counts as used by a lesson when a scene the lesson draws itself places it, or when the lesson uses an item that places it in any version. Components are expanded, props drawn inside a balance, a pattern, a choice or a picture graph count as used, a hand-drawn file counts when an `art` node names it, and the teacher's tick, loop and highlighter count as the pen marks. This agrees with the shelf's own finder (`src/pages/finder.ts`) on every drawing, and counts five more as used that the finder misses: the four props drawn only inside balances and patterns, and the pen marks.

For load, every scene a child sees was instantiated: the lesson's own scenes and one scene per question for the versions the lesson actually shows, 1,134 scenes in all. Each drawing was classed as a picture, a written layout, page furniture or a game piece. A written layout is a drawing that is mostly letters, digits or boxes to write in, following the line [gaps.md](gaps.md) drew and extended to the drawings added since: passages, sentence strips, word cards, column sums, the bus stop, program listings, the staff and the tab, tables, recipes and the like. The line is a judgement.

### The numbers

| Measure | Now | In gaps.md |
|---|---|---|
| Drawings on the shelf | 397 (372 code, 25 hand-drawn) | 267 |
| Pictures, written layouts, page furniture, game pieces | 304, 65, 20, 8 | not split |
| Used by at least one lesson | 262 | 170 |
| Unused | 135: 102 pictures, 11 layouts, 14 page furniture, 8 game pieces | 97 |
| Unused drawings that stand in a journal world | 57 | 51 |
| Lessons and items | 212 and 452 | 142 and 239 |
| Items in no lesson | 2 (`coding.which-line-moves`, `reading.passage-count`) | 1 |
| Scenes a child sees | 1,134, of which 904 (80 per cent) have a picture, 193 only a written layout, 37 only text | 744, 65 per cent with a picture |
| Pictures in use | 202 | not counted |
| Scenes that the ten most used pictures appear in | 234 (21 per cent); the twenty most used, 359 (32 per cent) | not counted |
| Pictures used by one subject only | 156 of 202 (77 per cent) | not counted |

Lessons by subject and grade:

| Subject | Grade 1 | Grade 2 | Grade 3 | Grade 4 | All |
|---|---|---|---|---|---|
| Maths | 15 | 15 | 15 | 15 | 60 |
| Reading | 8 | 9 | 8 | 8 | 33 |
| Coding | 7 | 8 | 8 | 8 | 31 |
| Writing | 8 | 8 | 8 | 6 | 30 |
| Physics | 4 | 4 | 4 | 3 | 15 |
| Chemistry | 3 | 4 | 4 | 4 | 15 |
| Art | 3 | 3 | 3 | 3 | 12 |
| Music | 4 | 5 | 2 | | 11 |
| Science | | 2 | | | 2 |
| Geography, language, logic | | | 1 each | | 3 |

The load is spread thin and narrow at once. The most used picture of all, the coding block program, is in 64 scenes; the next are the maze (42), the thermometer (25), the turtle (25), the beaker (24) and the hand-drawn cat (23). The ten most used pictures account for a fifth of all scenes, which is not concentrated by itself. What is concentrated is subject by subject, below.

Two changes during the audit moved these numbers. Before the art lessons and the pilot, at ten in the morning, the shelf held 391 drawings and 148 were unused. The art lessons took 12 of the 14 painting drawings into use, one of them (a row of prints) drawn during the audit. The pilot took four unused drawings into use (the crabs, the flowers, the station and the clock tower), used rabbits, houses and the tree in maths for the first time, and added three drawings, all used. Two more drawings arrived from other agents in the same hour, an envelope and a family tablet, and are not yet used.

### The unused drawings, and a subject each would fit

A setting that is a list of objects still has no spelling in the notation (the frozen drawings of [gaps.md](gaps.md) item 8), so several of these can only be drawn with their default contents until that is fixed; they are marked frozen.

| Category | Unused | Where each fits |
|---|---|---|
| Time and the calendar | calendar, year wheel | maths grade 2, days of the week and months; science grade 1, seasons (the calendar's shading is frozen) |
| Place value | abacus, Gattegno chart, place name | maths grades 2 to 4: reading an abacus, times and divided by ten on the Gattegno chart (frozen picks), the value of a ringed digit |
| Geometry | coordinate grid, shape marks | maths grade 4 coordinates and geography grid references (points frozen); maths grades 3 and 4, naming a quadrilateral from its marks |
| Money | notes and coins | maths grades 3 and 4, totals with notes |
| Sorting and chance | Carroll diagram, sorting rings, probability scale, bag, tally table | maths grade 2 sorting and grade 3 chance, and a logic track; all five frozen |
| The world a problem happens in | boxes, sticker row, envelope, family tablet | maths grade 3 division with a remainder (the picture the division lessons lack); maths grade 1 bonds to ten; writing a letter; the tablet is for the parents' pages rather than a lesson |
| Music | beat track, note lane, guitar | the beat track is drawn at run time from a performance; the lane and the guitar belong to the guitar lessons the music work is redrawing now |
| Manipulatives | pattern blocks, tangram, dominoes, playing cards | maths grade 2 thirds and sixths, and art pattern and tessellation; maths grades 1 and 2 shape; adding and logic (dominoes and cards frozen) |
| Function machines | machine chain, in and out table, unknown box, arrow chain, letter | maths grades 3 and 4 function machines and thinking problems (three frozen) |
| Comparing and ordering | compare, sign chain, order track | maths grade 1 bigger and smaller; grades 2 and 3 ordering (two frozen) |
| The kitchen | recipe card | reading a recipe, and maths grade 4 scaling (items frozen) |
| Sports and scores | race circuit, race car, target, team shirts, podium, medals | physics speed; maths grade 2 adding a target's score (frozen); grade 3 arrays; grade 1 first, second and third |
| Nature through the year | season trees, leaves, how a plant grows | a nature track: the seasons in order, sorting leaves by their edge, seed to flower in order (replacing the pots that draw nothing) |
| Journeys | sidings, carriage, engine, ticket, map with a scale | coding and maths ordering (last in, first out), reading grade 1 blending (a carriage per sound), maths grade 3 time and money, geography grade 4 scale |
| The worlds' places and creatures | 33 of 47, including the fox, gull, mice, firs, lighthouse, grandstand, peaks, eagle, tent, compass, iceberg, volcano, palms, temple, lantern, bridge, heron, canal lock and narrowboat | maths counting and arrays at grades 1 to 3 (grandstand, mice, fox), grade 4 decimals and remainders (iceberg, tent), coding repeats and counters (lighthouse, lantern), geography (compass, map key and title, jetty), science and nature (firs, heron, bird hide, windsock, cloud) |
| The eleven worlds round the run | all 27, including the frog life cycle, planets, chime bars, drum, rainbow, swing, carousel, snowman, sledge, crops and tractor | science: the frog life cycle, the planets in order (a grade 4 topic [curriculum.md](curriculum.md) plans), the rainbow's order, a swing as a pendulum, a snowman melting; music: chime bars and the drum for rhythm; maths: turns on the carousel, arrays of crops |
| Painting | palette, art tools | the art lessons being written now |
| Hand-drawn | house, bunting, kitchen counter | writing a description; maths grade 1 patterns; maths grade 2 capacity (needs parts placed on a setting, [gaps.md](gaps.md) item 6) |
| Page furniture and games | 6 guide designs, 8 stickers and marks, 8 game pieces | not lesson subjects; the guide designs are alternatives to the firefly, and the game pieces belong to the Games tab |

### Where one drawing carries a subject

Measured over the scenes each subject shows. "Drawn scenes" means scenes with a picture or a written layout; "look alike" means two lessons of the same subject whose sets of pictures overlap by at least three fifths.

| Subject | Lessons | Scenes with a picture | Distinct pictures | Most used drawing | Lessons where one drawing takes half the pictures | Pairs that look alike |
|---|---|---|---|---|---|---|
| Maths | 60 | 76% | 108 | column sums, 9% of drawn scenes, 8 lessons | 31 | 3 |
| Reading | 33 | 74% | 38 | passage, 22%, 10 lessons; hen in 9 | 17 | 4 |
| Coding | 31 | 90% | 14 | block program, 44%, 16 lessons; maze 29%, 11 lessons | 27 | 46 |
| Writing | 30 | 86% | 33 | sentence strip, 23%, 11 lessons; cat in 10 | 12 | 3 |
| Physics | 15 | 96% | 18 | forces, stopwatch and road distances, 12% each | 14 | 1 |
| Chemistry | 15 | 69% | 12 | beaker, 33%, 7 lessons | 10 | 2 |
| Art | 12 | 100% | 15 | painting sheet in all 12 (it is the surface an art lesson paints on), paint pots 21% | 8 | 3 |
| Music | 11 | 53% | 6 | chord box, 29%, 5 lessons; the neck in 5 | 5 | 10 |
| Science | 2 | 46% | 1 | the labelled parts diagram, 67% | 1 | 0 |
| Geography, language, logic | 1 each | 100%, 50%, 0% | 2, 3, 0 | | | |

Maths is the one subject whose pictures are spread: its most used picture is in 4 per cent of its scenes, and three pairs of lessons look alike, each a grade three lesson and its grade four sequel. That a maths lesson leans on one manipulative is teaching rather than repetition, which is why 31 of 60 still count as one drawing taking half the pictures.

The subjects where a drawing makes the lessons look alike are these. Coding: the block program and the maze are in 46 look-alike pairs, and the turtle, pixels, stage, dance and tune worlds together take a small share, so the eleven maze lessons read as one lesson repeated. Chemistry: the beaker is the picture of half the track. Music: every ukulele and guitar lesson shows a chord box beside a neck, and ten pairs look alike. Reading and writing: the four hand-drawn animals and objects that open grade one literacy recur through grade four, and the passage and the sentence strip together are about a third of each subject's drawn scenes. Science: one of two lessons is the labelled diagram three times.

### Drawings one subject uses that another could borrow

Of the 202 pictures in use, maths alone uses 84, writing 14, coding 12, art 12, physics 11, reading 11, chemistry 6 and music 6. The borrowings worth making, each a judgement about where a picture would carry a question another subject needs:

| Drawing, and the one subject that uses it | Who could borrow it, for what |
|---|---|
| see-saw, ramp, tank, shadows, fuel gauge (physics) | maths grade 4 multiplication (weight times step), measurement (how far it rolled), capacity; a quarter full is a fraction |
| road distances (physics) | maths grades 2 and 3, adding the legs of a journey; geography routes |
| beaker, spoons, jar of sweets (chemistry) | maths capacity read between marks, fractions of a spoonful, estimating a count |
| maze and turtle (coding) | maths position and direction, angles and perimeter (the turtle already proves shapes and turns with `coding.runs`); geography routes; writing directions on the treasure map |
| pixels (coding) | art colouring by rule, proved by `coding.runs painted`; maths area |
| lamps, sorting cards, sorting network, cups (coding) | maths doubling and ordering, and a logic track (fewest lifts is a search puzzle) |
| tune, dance (coding) | music counting beats and repeats |
| keyboard (music) | maths patterns (black keys in twos and threes) |
| face, street, moorings, dog, ship, windmill, cottage (reading) | writing (describe a feeling, a place), geography (a street plan), maths counting |
| suitcases, moon, telescope, treasure map, market stall, birthday table, bedroom shelf, fish tank (writing) | maths weight order, halves, angles, coordinates, money, sharing, position words and comparing |
| venn, balance, heads, number pyramid, matchsticks, tessellation, reflection grid, geoboard (maths) | a logic track (the one logic lesson draws nothing), art symmetry and pattern, physics balance |
| birds, minibeasts, tree, animals (maths) | science and a nature track: counting legs, sorting living things |
| paint pots, colour wheel, tint ladder (art) | maths ratio (one part blue to two parts yellow), chemistry mixtures, physics light and colour |

### Defects found while measuring

- The bus drawing seats at most one person a window. `add.bus-on` drew a five-window bus for up to nine people and `sub.bus-off` a six-window bus for up to twelve, and neither says the number in its text, so in 20 of 35 and 22 of 25 versions the child counted fewer people than the answer key assumed; the grade one lesson's worked example (ten people) and try (twelve) were among them, and the adding lesson's look scene drew five people for "six people are on the bus". The pilot gave both items and the look scene a window for everyone. The verifier cannot catch this, because a derived drawing does not say what its settings can hold; see the needs of the model below.
- The basket's label is written across the drawing and clipped at its nine squares, so the grade one making-ten look scene read "ie three that are missin". The pilot's new look scene no longer uses the label, and the basket itself still clips a long label.
- `columns`, the column sum, is drawn by the scene renderer and is not a catalogued drawing, so the shelf does not show the layout that eight maths lessons lean on most.
- The lesson page's subject list did not include `art` until the art work added it during the audit; it is there now.

## 2. Subject by subject

The capabilities, as the prototype has them: scenes of drawings on the grid; parameters and variants with `where` lines and the verifier; code checkers (`coding.runs`, `coding.builds`, `music.plays`, `music.chord`, `music.rhythm`, `matchsticks.one-move`, `writing.by-eye`, and the art work's `paint.mixes`, `paint.mirror` and `art.by-eye`); answer kinds (number, pick, typed word, program, performance, marked by a grown-up); hints and feedback rules; print with a grown-ups sheet; the games and their prover on the Games tab; the program interpreter; the playable instruments; the journal worlds and their reaches; and the animation module. Three facts about them matter for every subject. A lesson cannot name a game: the only link is the journal's rule matching a game's paper companion or skill, and nine of the ten companions do not exist. The lessons page draws the instruments but does not play them. And although an item may have any number of hints, before the pilot no item had more than one, and none of the 291 feedback rules was nested.

### Maths

| Uses today | Could reuse, and from where |
|---|---|
| 108 distinct pictures; parameters on 146 of 148 items (median 22 versions); feedback on 143 items and hints on 125; number and pick answers; `matchsticks.one-move` on two puzzles; puzzle and review formats; every journal world reaches maths lessons | the turtle and `coding.runs shape` for angles and perimeter; the games (weigh, jump, pay, shut, share, pour) once a lesson can name one; a checker that accepts any answer meeting a rule, for "find two numbers that"; animation in look sections (the cup lifting) |

Visually thin where the written methods are: nine lessons (the exchange, column, times ten, short multiplication and division lessons) still draw no picture, the finding [gaps.md](gaps.md) item 4 made. Drawings most needed: cube buildings for spatial reasoning, which the corpus has none of; a number balance with pegs; stepping stones for number paths; dominoes and cards with settings.

### Reading

| Uses today | Could reuse, and from where |
|---|---|
| 38 distinct pictures, the cast and the story shelf; parameters (median 4 versions); pick and typed-word answers; one hint on every item; feedback on 23 of 52; four worlds reach reading lessons | the spell game (`src/play/spell.ts`), once its skills are renamed to `reading.phonics`; the journal worlds as the place a passage happens (the harbour, the sea); a grown-up mark for reading aloud; the maths sequence and match layouts for evidence questions ("which sentence tells you") |

Visually thin at the text itself: 15 of 33 lessons draw one picture throughout, and the passage and sentence strip are a third of the drawn scenes. Drawings most needed: clue pictures (a scene after something happened) so inference can be asked at grade one before the reading load allows it in text; a character seen in several settings for story questions.

### Writing

| Uses today | Could reuse, and from where |
|---|---|
| 33 distinct pictures including six hand-drawn settings; 19 items marked by a grown-up with `writing.by-eye`; typed words and picks; sequence layouts for plans | the ink the journal already records (`src/world/working.ts`) as a handwriting answer; the maze and `coding.runs` to check written directions; the journal worlds, which reach no writing lesson at all; a checklist mark instead of one look-for sentence |

Visually thin: the sentence strip is in 11 of 30 lessons and the cat in 10. Drawings most needed: before-and-after picture pairs for recounts, and settings that parts can stand on, so a description question can point at what is in the room.

### Coding

| Uses today | Could reuse, and from where |
|---|---|
| the interpreter through `coding.runs` (42 items) and `coding.builds` (8); program answers; the runner and the block editor, which are the only answers the lessons page takes today; three worlds reach coding | the games' prover for search and sorting puzzles (`src/play/prove.ts`); the maths drawings as worlds to program (the hundred square, the number line); music through the tune drawing |

Visually thin in variety rather than amount: 90 per cent of scenes have a picture but there are only 14 distinct ones. Drawings most needed: new worlds beyond the maze (a garden robot watering rows, a traffic light for events and conditions).

### Physics

| Uses today | Could reuse, and from where |
|---|---|
| 18 distinct pictures, the apparatus; parameters (median 12 versions); feedback on 28 of 31 items; numbers and picks; eight worlds reach physics | planck bodies from the engine (`src/engine/bodies.ts`, as the slingshot uses them) to roll the ramp or tip the see-saw in a look section; the race and road games for speed per turn; the weigh game's pattern for "sit further out"; a checker that accepts a reading within a range |

Visually thin: seven lessons draw one picture throughout. Drawings most needed: a lever with a load and a pulley, a light source with a mirror, a vibrating drum for sound.

### Chemistry

| Uses today | Could reuse, and from where |
|---|---|
| 12 distinct pictures; numbers and picks; tables; six worlds reach chemistry | the pour game (`src/play/pour.ts`) for measuring a liquid; the paint mixing model (`src/paint/mix.ts`) for mixtures; the match layout for sorting materials by property |

Visually thin: the beaker is half the track and two lessons draw no picture. Drawings most needed: a heating curve (a thermometer in a beaker over time), a filter paper with what it caught.

### Music

| Uses today | Could reuse, and from where |
|---|---|
| the keyboard and the neck as inputs; 10 items played and judged by `music.plays` and `music.chord`; one hint on nearly every item; the park world | parameters and variants (32 of 35 items have one version); `music.rhythm`, built and tested and used by no item; the guided playing on `music.html` (`src/sound/lesson.ts`) inside a lesson; the tune drawing and `coding.runs` for counting beats |

Visually thin: 53 per cent of scenes have a picture and six pictures carry the subject. Drawings most needed: the chime bars and drum already on the shelf for rhythm, and a staff with the notes a child has just played.

### Art

| Uses today | Could reuse, and from where |
|---|---|
| the 13 painting drawings; `paint.mixes` and `paint.mirror` proving colour and symmetry; `art.by-eye` for work a grown-up marks; the painter's hut world | the maths reflection grid, tessellation, pattern blocks and tangram for provable symmetry and pattern; the coding pixels with `coding.runs painted` for colouring by rule |

The art lessons were being written while we measured, so this row describes them as they stood; [art.md](art.md) is their design.

### Science, geography, language and logic

Each has one or two lessons. Science's two lessons (both grade two) repeat the labelled plant diagram and draw nothing in one of them. Geography has one grade three lesson on the island grid. The Spanish lesson uses three hand-drawn pictures. The logic lesson draws nothing in any of its five scenes, while the maths shelf holds every drawing a logic track needs except a logic grid. The largest reuse available to all four is the shelf itself: 57 unused drawings already stand in the worlds, most of them nature, maps and places.

## 3. Difficulty, measured

### The scale

We graded what the child has to do on the page, for a typical version, on five levels:

- Recall or read off (R): the answer is visible in the drawing, is one memorised fact, or is found by counting up to about ten things one by one.
- One step (S): one operation, comparison or inference on information that is given.
- Several steps (M): two or more steps chained, or one step on a representation that has to be decoded first, with a method the lesson has taught.
- Reasoning (Y): choosing a strategy, reasoning about a structure (the inverse, equivalence, a balance, a rule), predicting, justifying, or finding and correcting an error, where running a practised procedure is not enough.
- Non-routine (N): no method taught for it, more than one path or answer, a constraint to satisfy, a pattern to generalise, or something to make that meets constraints.

The scale is Webb's Depth of Knowledge split where it matters for young children: R and S are Webb's level 1, M is level 2, Y is level 3 ("requires reasoning, planning, using evidence"), and N is level 3 to 4. It also maps onto Smith and Stein's levels of cognitive demand: R is memorisation, S and M are procedures without connections, Y is procedures with connections and N is doing mathematics, which has no "predictable, well-rehearsed approach or pathway". We split Webb's level 1 because at five to seven the difference between reading a number off a picture and doing one operation on it is most of what the owner has noticed.

Each item also got three flags: whether it sits below the grade it is taught at against the benchmarks (a child at that grade would find it routine and could have done it a year earlier), whether it would be routine for a five-year-old in kindergarten, and whether it can be answered without the skill it claims to teach (the drawing shows the answer, only one option is plausible, or the question answers itself). The rubric and every grade are kept with the scripts. Seven graders worked from the same rubric, one per group of subjects, and we read every grade one maths grade against the items ourselves; they agreed with our own reading, and the grade one maths grades are the ones the pilot was measured against.

### The spread

Items are counted at the lowest grade a lesson uses them at. The art items arrived after the grading and are reported separately at the end of this section.

| Subject | Grade | Items | R | S | M | Y | N | Below grade | Routine at five | Answer given away |
|---|---|---|---|---|---|---|---|---|---|---|
| Maths | 1 | 37 | 11 | 21 | 3 | 1 | 1 | 51% | 14 | 12 |
| Maths | 2 | 21 | 9 | 7 | 4 | 1 | 0 | 62% | 4 | 10 |
| Maths | 3 | 27 | 5 | 10 | 12 | 0 | 0 | 33% | 0 | 4 |
| Maths | 4 | 21 | 3 | 8 | 6 | 3 | 1 | 38% | 1 | 4 |
| Reading | 1 | 11 | 2 | 8 | 1 | 0 | 0 | 27% | 3 | 2 |
| Reading | 2 | 16 | 4 | 12 | 0 | 0 | 0 | 100% | 6 | 8 |
| Reading | 3 | 12 | 1 | 9 | 2 | 0 | 0 | 67% | 1 | 4 |
| Reading | 4 | 13 | 1 | 9 | 3 | 0 | 0 | 100% | 1 | 2 |
| Writing | 1 | 16 | 7 | 6 | 3 | 0 | 0 | 69% | 8 | 4 |
| Writing | 2 | 14 | 2 | 8 | 2 | 1 | 1 | 79% | 2 | 5 |
| Writing | 3 | 14 | 2 | 5 | 2 | 2 | 3 | 79% | 3 | 3 |
| Writing | 4 | 12 | 0 | 7 | 3 | 0 | 2 | 75% | 0 | 3 |
| Coding | 1 | 12 | 1 | 6 | 3 | 1 | 1 | 50% | 6 | 1 |
| Coding | 2 | 15 | 4 | 6 | 5 | 0 | 0 | 53% | 4 | 6 |
| Coding | 3 | 16 | 1 | 5 | 10 | 0 | 0 | 63% | 2 | 3 |
| Coding | 4 | 15 | 3 | 5 | 6 | 1 | 0 | 60% | 3 | 6 |
| Physics | 1 | 8 | 3 | 5 | 0 | 0 | 0 | 75% | 6 | 2 |
| Physics | 2 | 8 | 2 | 4 | 2 | 0 | 0 | 50% | 2 | 0 |
| Physics | 3 | 8 | 5 | 2 | 1 | 0 | 0 | 88% | 4 | 5 |
| Physics | 4 | 7 | 1 | 0 | 6 | 0 | 0 | 43% | 1 | 1 |
| Chemistry | 1 | 7 | 4 | 3 | 0 | 0 | 0 | 57% | 4 | 2 |
| Chemistry | 2 | 6 | 3 | 2 | 1 | 0 | 0 | 67% | 2 | 0 |
| Chemistry | 3 | 8 | 1 | 4 | 3 | 0 | 0 | 75% | 1 | 2 |
| Chemistry | 4 | 4 | 1 | 2 | 1 | 0 | 0 | 100% | 2 | 3 |
| Music | 1 | 12 | 11 | 0 | 1 | 0 | 0 | 83% | 10 | 5 |
| Music | 2 | 15 | 7 | 5 | 3 | 0 | 0 | 47% | 5 | 3 |
| Music | 3 | 8 | 5 | 2 | 1 | 0 | 0 | 88% | 4 | 3 |
| Science | 2 | 6 | 4 | 2 | 0 | 0 | 0 | 100% | 6 | 1 |
| Geography, language, logic | 3 | 5 | 4 | 1 | 0 | 0 | 0 | 40% | 1 | 0 |
| All | | 376 | 108 (29%) | 165 (44%) | 84 (22%) | 10 (3%) | 9 (2%) | 63% | 107 | 105 |

By grade across subjects, recall falls from 38 per cent of grade one items to 13 per cent of grade four items and several steps rises from 11 to 35 per cent, which is the right direction; reasoning and non-routine together stay between 3 and 10 per cent at every grade.

What the "Try this" and puzzle sections held, before the pilot:

| Subject | Lessons | Lessons with any Y or N item | Try blocks | Try blocks that repeat the practice item | Levels of the try blocks |
|---|---|---|---|---|---|
| Maths | 60 | 5 | 61 | 29 | R 15, S 24, M 22 |
| Reading | 33 | 0 | 37 | 7 | R 5, S 30, M 2 |
| Coding | 31 | 3 | 25 | 1 | R 3, S 7, M 13, Y 1, N 1 |
| Writing | 30 | 8 | 30 | 0 | R 6, S 9, M 7, Y 2, N 6 |
| Physics | 15 | 0 | 14 | 0 | R 5, S 5, M 4 |
| Chemistry | 15 | 0 | 15 | 0 | R 7, S 7, M 1 |
| Music | 11 | 0 | 11 | 0 | R 6, M 5 |
| Science, geography, language, logic | 5 | 0 | 5 | 1 | R 4, S 1 |
| All | 200 | 16 | 198 | 38 | |

The section exists in almost every lesson and is mostly not a stretch: in maths, half the try blocks show the same item as the practice with different numbers, and not one of the 61 is a reasoning or non-routine question. The maths puzzle sections are better (five Y and two N among 22), which is where the grade one balance chain and matchsticks live.

### Against the benchmarks

The grade mapping used is US grade 1 = England Year 2 = Singapore Primary 1, and so on up; [curriculum.md](curriculum.md) already sets grade one maths at "Level B", Singapore P1 and England Year 2. Common Core quotations come from the CCSSO-hosted standards, because thecorestandards.org refused every request.

Maths content is mostly at level and occasionally ahead: grade three multiplication and division and grade four long multiplication, remainders, factors and fractions match Common Core, England Years 4 and 5 and Singapore P3 and P4. What is below is the demand. Common Core 1.OA.A.1 asks for word problems "with unknowns in all positions" and its situation table calls the start-unknown and harder compare wordings "more difficult"; before the pilot every grade one adding and taking-away item had the result unknown. 1.OA.D.8 asks for the unknown in "8 + ? = 11" and "5 = ? - 3"; the grade one bonds items asked the first form only, and the most used of them had a ten frame whose empty cells showed the answer. England's aims are fluency, reasoning and problem solving "to a variety of routine and non-routine problems", and the 2025 Curriculum and Assessment Review found "insufficient time for more challenging, non-routine problem solving" and recommended that "stretch and challenge for all pupils, including the highest attainers, should come primarily through reasoning and problem solving"; the government's response commits to non-routine problem solving in the revised curriculum from 2028. Singapore's framework puts "complex and non-routine tasks" and heuristics (draw a diagram, guess and check, work backwards, look for patterns) at the centre. Against the programmes thinking-heavy families choose, the gap is wider: Math Kangaroo's grade 1 and 2 paper opens with 3-point items that are already visual reasoning (which monsters belong to one family) and ends with 5-point items such as "Stella has twice as many brothers as Albert, how many sisters does Stella have"; Beast Academy's level 1 and 2 books teach guess and check and working backwards as chapters; NRICH's tasks for ages five to seven ("find all the numbers that can be made by adding the dots on two dice") are built so "everyone can get started, and everyone can get stuck". Only 7 of 106 maths items reached that register, 4 of them at grade four.

Reading content is at level for decoding at grade one and below from grade two. Common Core RL.3.1 asks the child to answer "referring explicitly to the text as the basis for the answers" and RL.4.1 to "refer to details and examples... when drawing inferences"; England Years 3 and 4 ask for "inferring characters' feelings, thoughts and motives from their actions, and justifying inferences with evidence". No reading item asks for evidence, an interpretive answer or a reason, and 40 of 52 are below their grade. The thinking-heavy equivalents (Junior Great Books' interpretive questions with "more than one plausible answer based on the text", the Question-Answer Relationships' "think and search" and "author and you") are absent. Text length sits well under the 420L to 820L band of grades two and three; we did not measure Lexile, which is a judgement from the passages' three to five sentences.

Writing is below level for grades one to four on 42 of 56 items, but it has the most non-routine work of any subject (6 items, all composing to constraints, marked by a grown-up), which shows the grown-up mark is how the platform stretches what cannot be proved.

Coding content matches CSTA 1A and 1B (sequences, loops, debugging, conditionals, variables) and England key stages 1 and 2. The demand is tracing: 24 of 58 items are several steps and only three are reasoning or non-routine. CSTA 1B-AP-08 asks the child to "compare and refine multiple algorithms for the same task", and Bebras for ages six to ten sets the same task at three tiers; no coding item asks for the better of two programs or the fewest blocks except `coding.build-arrows`.

Physics and chemistry are below level on 38 of 56 items and have no reasoning item. NGSS 3-PS2-1 asks the child to "plan and conduct an investigation" and England Years 3 and 4 to set up "comparative and fair tests" and "make predictions for new values"; the fair-test lessons in both subjects come down to a subtraction or continuing a pattern, and no item asks which test is fair or which thing changed.

Music at grade one is almost all recall: 11 of 12 items press a key that is lit and labelled or name a lit string. ABRSM's Initial grade already asks for clapping back rhythms, singing back phrases and saying whether a piece is loud or quiet; the US arts standards ask a grade one child to "read and perform rhythmic patterns". 32 of 35 music items have one version, so a child who repeats a lesson meets the same questions.

Science's six items are kindergarten content (finding the flower, sorting push from pull), geography's one item asks for a hill or a river, and logic's one item asks whether "a dog is brown" is always, sometimes or never true.

The features the enrichment programmes share are the ones the model below builds in: a low entry point with a high ceiling (NRICH, Math Kangaroo's 3, 4 and 5-point bands, Bebras's tiers), problems where no method is signalled, more than one valid method ("a specific strategy is not required, and alternate methods are quite possible", as Singapore Math Inc. puts it for its challenging word problems), and explaining or justifying. On hints, the evidence favours asking the child to do the next step over telling them (Razzaq and Heffernan's scaffolding study), fading worked steps (Renkl, Atkinson and Grosse) and prompts that help a child monitor their own work (the IES practice guide, strong evidence). We found no published figure for what share of items should sit at the higher levels, so the targets below are our proposal and need a decision.

### Items too simple for their grade

235 of 376 items are below their grade. The 107 that would be routine for a five-year-old, by subject:

- Maths (19): `time.o-clock-or-half`, `groups.dice-total`, `count.beadstring`, `measure.dial`, `time.digital-reads`, `groups.eggbox`, `fraction.pizza-quarters`, `count.rekenrek`, `count.tray-twos`, `count.washing-line`, `bonds.make-ten`, `numberline.jumps`, `pattern.next` and `measure.ruler` at grade one; `graph.bars`, `measure.jug`, `shapes.name-solid` and `measure.spring` at grade two; `puzzle.row` at grade four.
- Music (19): `music.play-middle-c`, `play-left-hand`, `play-with-fingers`, `ringed-finger`, `uke-c-finger`, `uke-c-fret`, `uke-c-string`, `uke-play-open`, `uke-string-letter` and `uke-string-number` at grade one; `play-skips`, `uke-count-strums`, `uke-count-ups`, `uke-f-fingers` and `uke-finger-stays` at grade two; `play-landmark`, `guitar-em-fingers`, `tab-fret` and `tab-string` at grade three.
- Coding (15): `coding.line-total`, `order-morning`, `order-toast`, `pixel-row`, `robot-across` and `stage-where` at grade one; `bug-sides`, `dance-count`, `dance-missing` and `draws-what` at grade two; `decision` and `pixel-rows` at grade three; `define-count`, `net-bridge` and `write-for-someone` at grade four; and the orphan `which-line-moves`.
- Physics (13): `heavier-pull`, `jump-distance`, `push-or-pull`, `spring-newtons`, `warmer-of-two` and `which-way` at grade one; `float-or-sink` and `how-many-float` at grade two; `distance-from-rate`, `does-it-light`, `magnet-count` and `poles` at grade three; `seesaw-balanced` at grade four.
- Writing (13): `how-many-tall`, `label-the-lighthouse`, `letter-on-the-line`, `needs-a-capital`, `trace-and-write`, `which-caption`, `which-word-fits` and `words-in-order` at grade one; `bossy-word` and `recipe-order` at grade two; `acrostic-line`, `recount-order` and `time-word` at grade three.
- Reading (11): `first-sound`, `rhyme-finish` and `rhyme-odd` at grade one; `beats-column`, `feeling-word`, `letters-not-sounds`, `most-beats`, `syllable-train` and `wrong-column-ay` at grade two; `passage-line` at grade three; `poem-rhyme` at grade four.
- Chemistry (9): `beaker-level`, `material-match`, `property-match` and `sort-count` at grade one; `dissolve-table` and `dissolved-yet` at grade two; `filter-residue` at grade three; `mixture-count` and `warmer-jar` at grade four.
- Science (6): all six, at grade two. Geography (1): `island-parts`.

### The ten items most in need of raising

Chosen for how far below their grade they sit, where they are placed (a stretch slot, or the only item of a lesson) and how often they are shown:

1. `physics.seesaw-balanced`, the main grade four practice on the see-saw rule: the plank is drawn level or tilted by the answer, so it is read off. Hold the plank level on a support in every version so balance has to be worked out from weight times step.
2. `chem.mixture-count`, the hardest puzzle of the grade four separating lesson: the child counts three to six dots. Ask what fraction of the particles are the darker kind, or how many more light than dark.
3. `puzzle.row`, a grade four puzzle: the child counts from the back of a drawn line to the child in the hat. Draw no line and ask for its length from two positions ("fifth from the front and eighth from the back"), which is a Math Kangaroo staple.
4. `coding.bug-direction`, a grade four three-star puzzle: the wrong line is the only one whose number differs. Make the bug a direction in a rectangle, so nothing stands out and the drawing has to be compared with the target.
5. `reading.poem-rhyme` at grade four: a rhyme pick where the answer shares its spelling with the target. Ask for the poem's rhyme pattern, or a rhyme spelled differently.
6. `reading.fact-or-opinion` at grade four: every opinion contains "best" or "better". Use statements without signal words and ask which of three reasons shows one is an opinion.
7. `writing.time-word` at grade three: the question says whether the event came first, in the middle or at the end. Remove all the time words from a recount and give a bank of four.
8. `music.play-middle-c` at grade one: the key is lit and labelled. Show two octaves with no letters so middle C is found by the black keys.
9. `logic.always-sometimes`, the only logic item: its claims are everyday facts. Use number and shape claims where a counterexample takes work ("a multiple of 2 is a multiple of 4").
10. `bonds.make-ten`, the owner's example: before the pilot it filled five grade one question slots, and the ten frame's empty cells show the answer. The pilot keeps it as the first question of making ten and the review's warm-up, and puts the unknown under a cup and past ten everywhere else.

Close behind are `fractions.equivalent` (grade three, three slots: the second bar is already shaded with the answer), `chance.fair-spinner` (grade two: the answer is yes in every version) and `graph.bars` (grade two: pick the tallest bar).

### Wrong or arguable facts and keys the graders found

- Chemistry: sugar is given a melting point of 95 degrees in `chem.melting-point` and `chem.point-gap` (it melts and breaks down at about 186 °C); `chem.flame-boil` shows water at 120 degrees in an open beaker; `chem.water-state` counts water at exactly 100 degrees only as steam; in three of the four versions of `chem.sort-count` some cards sit in the wrong column and the child is asked to count them where they are; `chem.property-match` always has the answer 1, 2, 3, 4 in order; `chem.dissolve-table` can say "1 grains"; `chem.wrong-column` has variants where a spoon or a door can reasonably be wood or metal.
- Physics: `physics.temp-rate` starts at temperatures between the five-degree marks, so they cannot be read exactly.
- Science: `science.push-or-pull` has a version (closing a door) that can be a pull, and one that answers itself.
- Maths: `money.total` asks in pounds where the curriculum decided on dollars; `angles.name` has 89 and 90 degree versions that cannot be told apart by eye; `fractions.add-related` keys only the simplified sum.
- Writing: `writing.puzzle-sort` marks "shining" wrong as a doing word; `writing.join-with-and` accepts only "but" where "and" is also grammatical; two music titles ("E minor with two fingers", "Next door on the staff") give their answers away.

### The art items

The 34 art items arrived after the grading and were graded separately, against the US National Core Arts Standards and England's art and design curriculum, as they stood while the art lessons were still being written. Grade one has 2 recall, 5 one-step, 1 several-step and 1 non-routine item; grade two 1, 5, 0 and 1; grade three 4, 3, 0 and 2; grade four 2, 6, 0 and 1. No art item asks for a reason. 23 are below their grade, 19 would be routine at five and 13 give their answer away: `art.more-yellow` answers itself in its options, `art.opposite-colour` is read straight across a labelled wheel, `art.two-to-one` asks only for the secondary colour's name (and two of its four versions are the same), `art.which-is-warm` is the odd one out beside a blue and a green, and `art.paint-for-far` says far hills look pale and offers one option with white in it. The five non-routine items are the painting tasks a grown-up marks (three greens, three layers, painting in dots, painting with three colours, a sky), which again is where the grown-up mark is used. The art track was still being written when we measured, so these grades are a snapshot for its authors rather than a finding about a finished track.

## 4. The model: a way in, the core, and a stretch

Every lesson has three bands of questions, and every child starts in the first. The way in is one or two questions any child can begin, one step with the drawing doing half the work, which is where recall is allowed. The core is the grade's benchmark work, with the unknown moved through every position and more than one step where the benchmark asks for it. The stretch is two "Try this" questions, one that needs a reason (choose a strategy, work backwards, find the mistake, compare without totalling) and one that is non-routine (no method on the page, several ways in, a constraint, or all the ways), and both are proved by the verifier or marked by a grown-up against a stated look-for. Every question past the way in has a hint ladder of two or three rungs that asks rather than tells: the first points at the drawing or asks a question, the second offers a strategy or a first step, and none gives the answer; the grown-ups sheet prints them all. Stretch questions prefer more than one path, such as a sum triangle where either box next to the empty circle gives the answer and the third checks it. A child who finds the core easy is offered the three-star question straight away, and a child who gets stuck there has not failed the lesson, which the grown-ups note says in so many words.

The targets, as shares of a grade's question slots, are our proposal and need a decision, since no benchmark states them:

| Grade | Recall | One step and several steps | Reasoning | Non-routine | Also |
|---|---|---|---|---|---|
| 1 | at most 15% | about 60% | at least 12% | at least 8% | every lesson has a Y or an N; every unit has an N |
| 2 | at most 10% | about 60% | at least 15% | at least 10% | as grade 1 |
| 3 and 4 | at most 5% | about 55% | at least 20% | at least 10% | every stretch question has more than one path, or a reason to give |

### Mapped onto the notation

The model needs no new syntax. The way in and the core are the `do` section of a teach lesson, `exercises` of a worked one, and `warm-up` and `exercises` of a review. The stretch is two `try` sections with `stars=2` and `stars=3` in teach and worked lessons, and `puzzle` sections with stars in puzzle sheets and reviews; the lesson page already labels them "Try this ★★☆" and "Try this ★★★". An item written as a stretch carries `stars=2` or `stars=3` on its own line, which the registry already allows. A hint ladder is several `hint` lines in order, which the notation already parses and the assistant already gives one at a time, capped at three (`LIMITS.hintsPerQuestion` in `src/ai/child.ts`). Open questions with many right answers are made provable by asking for a count ("how many different ways"), an extreme ("the most one cup can hide") or one named part ("what goes in circle A"), which is how every pilot item is written.

### What it needs from the notation and the verifier

These are proposed, not built, and each is small:

1. A warning when a filled-in hint contains the answer for some version, since a hint that tells is the one thing the ladder must not do.
2. A warning when a teach or worked lesson has no `try` section with `stars` of 2 or more, and when a try block shows the same item as the practice above it. Before the pilot every one of the 187 teach and worked lessons outside art would have had the first warning and 38 try blocks the second; after it, 174 lessons still would.
3. A checker that accepts any answer meeting a rule over a stated range, and lists the solutions as its proof (`check maths.meets rule=(...) over=(...)`), so an item can ask for "two numbers that make 10 and are 4 apart" and accept either order.
4. A declared capacity on drawings whose settings bound one another (a bus seats `windows` people, a tray holds `rows × cols` buns), checked for every version. This is what would have caught the bus.
5. On screen, hints revealed one rung at a time; today the lessons page and the print put every hint on the answer key and the grown-ups sheet at once.
6. A general grown-up mark with a look-for sentence for any subject, since `writing.by-eye` and `art.by-eye` are the same idea under two names and maths and science have none; "say how you know" belongs to the reasoning band in every subject.

## 5. The pilot: grade one maths

Grade one maths was chosen because no other agent was editing it and because it is where the owner noticed questions too simple for grade one. The pilot kept every existing item and lesson id, rewrote all fifteen lessons to the model, added 43 items and three drawings, and fixed the bus.

What changed, lesson by lesson, in the stretch sections:

| Lesson | Try this ★★ | Try this ★★★ |
|---|---|---|
| Counting to twenty | beads to put across to make a total | every way to split n beads over two wires |
| Bonds to ten | three parts of ten, unknown in the middle | two cups hide ten, one hides d more than the other |
| Making ten | a level scale: 7 + 5 = 8 + ? | the most one of three cups can hide |
| Adding to twenty | how many were on the bus at first; the missing corner of a sum triangle | three corners from three sums |
| Taking away to twenty | how many got off | back through two stops to the start |
| Tens and ones | a number from its range and its digit sum | the biggest number two cards make under a limit |
| Counting in twos, fives and tens | from ears to rabbits | sheep and ducks from heads and legs |
| Equal groups | how many towers from a number of cubes | make three towers level |
| Halves and quarters | how many candles there were before half went out; the shaded fraction (kept) | what is left after half the pizza and some slices |
| How long, how heavy | the shortest from two clues; the dial (kept) | a ribbon cut into two with a known difference |
| Coins and prices | the fewest coins for an amount | every way to pay with dimes and nickels |
| O'clock and half past | when a film of an hour and a half ends | half hours until the train |
| Tally charts and picture graphs | which fruit has most after three more choose one | the row that came off the chart |
| Balance and shape puzzles | kept its four puzzles, added the 14th shape of a repeating pattern and the sum triangle from its sums | |
| Year review | a sum triangle as the two-star puzzle | the balance chain as the three-star puzzle |

The core gained the question kinds the benchmarks ask for: hidden parts that cannot be counted (under a cup), bridging ten (fill the first frame, then add what is left), change-unknown and compare stories, regrouping more than nine ones, counting back from twenty in fives, skip counting on ears, petals and a crab's ten limbs, windows along a street, change from two quarters, and reading a tally against twenty. The way in kept the old items, one a lesson: the ten frame, the beads, the ruler, the clock face.

### Before and after, measured

| | Before | After |
|---|---|---|
| Items grade one maths uses | 37 | 80 |
| Question slots across the 15 lessons | 78 | 103 |
| Recall | 19 (24%) | 13 (13%) |
| One step | 50 (64%) | 46 (45%) |
| Several steps | 7 (9%) | 18 (17%) |
| Reasoning | 1 (1%) | 15 (15%) |
| Non-routine | 1 (1%) | 11 (11%) |
| Slots below grade | 43 (55%) | 23 (22%) |
| Slots routine at five | 28 (36%) | 16 (16%) |
| Slots whose answer is given away | 26 (33%) | 18 (17%) |
| Items with a hint ladder of two rungs or more | 0 | 42 |
| Lessons with a reasoning or non-routine question | 2 | 15 |
| World reaches into grade one lessons | 6 | 6 |

The new items were graded by us on the same rubric; the before column is the graders'. The recall slots that remain are the way in, one a lesson, as the model allows. The items the pilot kept still have their one hint each, because the assistant's tests and the family sample read them as they are; giving them second rungs is the next step. Every one of the 43 items passes the verifier over every version with no warnings, no scene is wider than the printed sheet or more than eight squares wider than its drawing, and all fifteen lessons print to exactly the sheets they lay out. Most lessons are longer on paper: making ten grew from three printed sheets to five and adding to twenty from four to five, and equal groups and halves and quarters print six, each counting the grown-ups sheet. We judged that acceptable for the stretch it buys, and it is the first thing to watch if families find the sittings long.

### Three lessons before and after

Making ten. Before: three versions of the ten frame with its empty cells to count, the apples story, and a number bond asking the same thing again as a "Try this", five one-step questions in all, three of them given away by the frame. After: the look scene adds a lifted cup and the apple tree as two more pictures of seven and three; the ten frame stays as question one; two cups hide the part that cannot be counted; two questions fill the first frame and add what is left (8 + 5 is 10 and 3, the strategy the Common Core names); the apples story stays; the ★★ is a level scale, 7 + 5 = 8 + ?, where comparing eight with seven is quicker than totalling; the ★★★ asks for the most one of three cups can hide when ten counters are shared and no two cups are the same.

Adding to twenty. Before: three versions of people getting on the bus, drawn with too few windows, and a jump on a number line that lands on the answer. After: one bus question and the number line as the way in, two change-unknown bus questions, and in the stretch a start-unknown bus whose picture shows the end of the story, a sum triangle with one corner to find, and a sum triangle with only its sums.

Counting in twos, fives and tens. Before: buns in twos twice, the washing line twice and the buns again as a "Try this". After: the buns and the washing line once each, rabbits' ears in twos, petals in fives, a crab's eight legs and two claws as ten, and in the stretch the count run backwards from ears to rabbits and the sheep and ducks problem, which every child can start by guessing.

The screenshots of all three, on screen and printed, before and after, are kept with the scripts, with the whole of grade one before the change.

### The three new drawings

- Counters under a cup (`undercup`): counters on a mat, some hidden under upside-down cups, with an "in all" tag, and lifted to show what was hidden. It turns a bond into a question that cannot be counted, and at grade two carries missing addends to a hundred.
- Sum triangle (`sumtriangle`): three corners and the three sums of each pair, with any one cell or all the corners hidden. The drawing works the sums out itself, so a question cannot disagree with it; at later grades the same drawing takes two- and three-digit numbers and decimals to hundredths.
- Cube towers (`towers`): interlocking cubes in towers with a top and a side, lettered, and a dashed level to make them equal. It carries comparing, equal groups, fair shares and, at grade four, the mean.

Each has three takes on the shelf, a line in `shelf-groups.ts`, an id without a dot, and is placed by the notation like any other drawing.

## 6. New art, ranked

Ranked by what each unlocks across subjects and grades against what it costs, with beauty as a judgement from the shelf's existing style. The first three are built.

1. Counters under a cup, built. Bonds, missing parts, doubles, subtraction as a hidden part; maths grades one and two, and logic.
2. Sum triangle, built. Addition and subtraction reasoning, then two-digit sums and decimals at grade four, and a first taste of simultaneous clues; maths at every grade, logic.
3. Cube towers, built. Counting and comparing, equal groups, fair shares and the mean; maths, and physics stacking.
4. A logic grid: three children, three pets, ticks and crosses. The logic track has one lesson and no drawing, and the grid is the drawing every deduction puzzle from grade two upward uses. A checker that solves the grid and proves the clues give one answer is small.
5. Cube buildings seen from a corner, with hidden cubes and the views from the front and the top. Spatial reasoning is missing from the corpus entirely and is a Math Kangaroo staple from grade one; it also gives grade four volume and art a drawing of three dimensions.
6. A clue picture: a kitchen after the cake was made, muddy footprints to a door, a spilled jug. Inference from a picture lets grade one reading ask "what happened just before" before the reading load allows it in text, and gives writing a recount prompt.
7. Stepping stones across a river, each stone a number: find the path that makes a total, odd and even paths, the fewest stones. Maths addition at grades one to three, coding routes, and it is a picture a child would stop at.
8. A number balance with pegs one to ten on each arm. The equals sign at grades one and two, missing addends, and the see-saw rule at grade four physics on the same drawing.
9. An illustrated island map with a lettered grid, a key and a compass rose. Geography grid references and directions, maths coordinates, coding routes, writing directions.
10. A weather station: rain gauge, wind vane, thermometer and a week's chart. Science data, maths scales read between marks and line graphs, geography.
11. A pond food chain, the pond in section with arrows from what is eaten to what eats it. The nature track and reading a labelled diagram.
12. A garden bed on a grid with rows of plants. Arrays, area and perimeter (the fence), fractions of a bed, and growth over weeks.

Before drawing any of these, the unused drawings already on the shelf are the cheapest to use: the grandstand, lighthouse, whale, iceberg, volcano, frog life cycle, planets, chime bars and drum are drawn and in no lesson.

## 7. Order of work

1. Fix the wrong facts and keys first: the chemistry facts and keys, the physics readings between marks, the science and writing variants that can be argued, `money.total`'s pounds, and the basket's clipped label. Add the drawing capacity declaration to the verifier with it, since the bus showed the class of defect. Content edits and one small check.
2. Add the verifier's warnings for the model (a hint that gives the answer, a lesson with no stretch, a try that repeats the practice) and reveal hints one rung at a time on screen. Then the build reports a lesson with no stretch, rather than relying on this document.
3. Raise maths grades two to four the way the pilot raised grade one, reusing its patterns and its three drawings: the sum triangle with two-digit numbers, the cup hiding a part of a hundred, towers for the mean, start-unknown and compare stories in every grade, and a non-routine question in every unit. Replace the fifteen weakest maths items first, beginning with `puzzle.row`, `fractions.equivalent`, `chance.fair-spinner`, `graph.bars` and the rounding items whose lines show the answer.
4. Reading: an evidence question in every lesson from grade two ("which sentence tells you"), inference without signal words, the clue picture at grade one, and longer passages at grades three and four. This is the largest gap against the benchmarks after maths, and it needs no capability.
5. Physics and chemistry: a fair-test question in every fair-test lesson (which test is fair, which thing changed), predictions from a rule, readings between marks, and the see-saw held level; then the ramp and see-saw rolled by the engine's physics in a look section.
6. Coding: debugging where the bug does not stand out, the better of two programs, and fewest-block builds; then new worlds so the maze and the block program stop carrying the track.
7. Music: parameters for the 32 single-version items, labels that come off as notes are learned, and the `music.rhythm` checker used at last.
8. Writing: revising a sentence for a reader with a reason, joining with a conjunction chosen for meaning, and a checklist mark in place of one look-for sentence.
9. Build the logic grid and a logic track from it and the maths puzzle drawings; fold science into a nature track on the unused nature drawings; start geography on the island map.
10. Art, once its lessons are finished: grade them, and give each a prediction question (which mix is warmer and why) and a make-to-constraints question marked by a grown-up.

The capabilities the model would use most, in order: the `play` block that lets a lesson name a game ([activities.md](activities.md)), the checker that accepts any answer meeting a rule, and a lesson-level `let` so a story can carry its numbers from section to section ([gaps.md](gaps.md) item 13).

## 8. Raising the count

Status: done on 13 September 2026, after the pilot, while physics, art and chemistry were being rewritten by their own agents; those three subjects are not in these numbers. The before column is the corpus as it stood when this work started, so grade one maths is counted after the pilot, not before it.

We raised every lesson in maths, reading, writing, coding, music, science, geography, Spanish and logic to at least ten questions drawn from at least five items, and followed the model in section 4 as we did it: a way in any child can start, a core whose unknown moves position, and two stretch questions at two and three stars. Question slots across the 170 lessons went from 754 to 1,711, and the share at the reasoning and non-routine levels went from 6 per cent to 22 per cent. We graded every new item on the audit's five-level rubric so the columns can be compared, with one caveat: the before grades are the audit's graders' and the after grades for new items are ours, and a second grader has not checked them.

### How it was done

We worked one subject at a time in the order the brief set, maths first, and within a subject one grade at a time, applying lesson by lesson so the corpus stayed green for the other agents building against it. The work added 868 items. Every one has parameters and passes the verifier over every version it allows; 864 have more than one version, and the four that do not are played music questions, because `music.plays` and `music.rhythm` cannot yet take a setting that changes from one version to the next. Every new item has two or three hints that ask rather than tell, 315 carry two or three stars, 82 are proved by a code checker (`coding.runs`, `coding.builds`, `music.plays`, `music.chord` or `music.rhythm`), and 59 are marked by a grown-up against a stated look-for, mostly the three-star writing and reading questions whose answers cannot be proved. The pilot's grade one lessons were topped up rather than rewritten: every existing block stayed where it was.

A staging script, kept outside the repository with the audit's scripts, checked each lesson before it was applied: its question and item counts, its stretch sections, every scene against the sheet's 37 squares and against its own drawings, the printed length simulated the way `printLesson` lays it out, and any hint whose filled-in text contained the answer. After each subject a second pass read every new item version by version for the defects the verifier cannot see, and changed 29 reading items, 22 writing items, 23 maths items, 9 coding items and 10 music items; what it found is listed below.

### The counts

"Reasoning and non-routine" is the share of question slots at those two levels. "Below grade" counts the distinct items a subject's lessons use that the rubric places below the grade they are taught at.

| Subject | Lessons | Questions before | Questions after | Smallest lesson after | Reasoning and non-routine | Items below grade |
|---|---|---|---|---|---|---|
| Maths | 60 | 320 | 607 | 10 questions, 6 items | 10% → 22% | 49 of 149 (33%) → 47 of 432 (11%) |
| Reading | 33 | 132 | 333 | 10 questions, 5 items | 0% → 22% | 40 of 52 (77%) → 42 of 234 (18%) |
| Writing | 30 | 119 | 300 | 10 questions, 6 items | 8% → 22% | 42 of 56 (75%) → 43 of 212 (20%) |
| Coding | 31 | 117 | 310 | 10 questions, 6 items | 7% → 23% | 33 of 58 (57%) → 43 of 217 (20%) |
| Music | 11 | 38 | 111 | 10 questions, 8 items | 0% → 20% | 24 of 35 (69%) → 27 of 99 (27%) |
| Science | 2 | 11 | 20 | 10 questions, 7 items | 0% → 20% | 6 of 6 → 6 of 15 |
| Geography, Spanish, logic | 1 each | 17 | 30 | 10 questions, 6 items | 0% → 30% | 3 of 6 → 2 of 21 |
| All | 170 | 754 | 1,711 | 10 questions, 5 items | 6% → 22% | 196 of 361 (54%) → 209 of 1,229 (17%) |

By question slot rather than by item, 55 per cent of what a child answered sat below grade before and 15 per cent does now. The number of items below grade barely moved because the old items were kept: most of them are now the way in, one question a lesson, which the model allows.

### The spread by grade, against the targets

Shares of each grade's question slots across the nine subjects, before and after, with the targets section 4 proposed.

| Grade | Questions | Recall | One step and several steps | Reasoning | Non-routine | Below grade |
|---|---|---|---|---|---|---|
| 1 | 207 → 420 | 23% → 10% (at most 15%) | 61% → 70% (about 60%) | 9% → 11% (at least 12%) | 7% → 10% (at least 8%) | 37% → 20% |
| 2 | 197 → 473 | 35% → 6% (at most 10%) | 63% → 74% (about 60%) | 1% → 10% (at least 15%) | 1% → 10% (at least 10%) | 67% → 14% |
| 3 | 189 → 445 | 18% → 5% (at most 5%) | 79% → 74% (about 55%) | 2% → 12% (at least 20%) | 2% → 10% (at least 10%) | 57% → 13% |
| 4 | 161 → 373 | 15% → 2% (at most 5%) | 80% → 73% (about 55%) | 2% → 14% (at least 20%) | 2% → 11% (at least 10%) | 60% → 14% |

The recall and non-routine targets are met at every grade. The reasoning targets are not, and the reason is structural rather than a shortfall in any one subject: most lessons carry exactly one reasoning question, their two-star try, so a lesson of ten questions sits near 10 per cent. Reaching 15 per cent at grade two and 20 per cent at grades three and four needs a second reasoning question in the core of most lessons, which would take most of them past five printed sheets unless a core question comes out to make room. This needs a decision. Grade one maths is the one place a share fell: the pilot had put 26 of its 102 slots at the two upper levels, and the top-up added core work, so the same stretch questions are now 21 per cent of 150.

By subject and grade, before and after, as shares of question slots:

| Subject, grade | Questions | Recall | One step | Several steps | Reasoning | Non-routine | Below grade |
|---|---|---|---|---|---|---|---|
| Maths 1 | 102 → 150 | 13 → 9 | 44 → 47 | 18 → 24 | 15 → 13 | 11 → 8 | 22 → 15 |
| Maths 2 | 72 → 153 | 39 → 5 | 38 → 40 | 22 → 35 | 1 → 10 | 0 → 10 | 54 → 8 |
| Maths 3 | 72 → 153 | 15 → 3 | 40 → 21 | 44 → 54 | 0 → 11 | 0 → 10 | 35 → 5 |
| Maths 4 | 74 → 151 | 18 → 3 | 34 → 27 | 43 → 45 | 4 → 13 | 1 → 12 | 34 → 11 |
| Reading 1 | 34 → 80 | 18 → 6 | 74 → 51 | 9 → 22 | 0 → 10 | 0 → 10 | 26 → 16 |
| Reading 2 | 33 → 90 | 27 → 4 | 73 → 50 | 0 → 26 | 0 → 10 | 0 → 10 | 100 → 22 |
| Reading 3 | 31 → 81 | 3 → 1 | 90 → 43 | 6 → 36 | 0 → 10 | 0 → 10 | 61 → 11 |
| Reading 4 | 34 → 82 | 6 → 0 | 71 → 35 | 24 → 37 | 0 → 18 | 0 → 10 | 100 → 20 |
| Writing 1 | 32 → 80 | 50 → 9 | 41 → 56 | 9 → 15 | 0 → 10 | 0 → 10 | 69 → 26 |
| Writing 2 | 33 → 80 | 18 → 4 | 70 → 55 | 6 → 21 | 3 → 10 | 3 → 10 | 73 → 12 |
| Writing 3 | 30 → 80 | 10 → 1 | 63 → 35 | 7 → 39 | 10 → 14 | 10 → 11 | 87 → 14 |
| Writing 4 | 24 → 60 | 0 → 0 | 71 → 35 | 21 → 42 | 0 → 12 | 8 → 12 | 83 → 15 |
| Coding 1 | 26 → 70 | 4 → 1 | 46 → 29 | 23 → 44 | 12 → 13 | 15 → 13 | 46 → 19 |
| Coding 2 | 31 → 80 | 32 → 5 | 45 → 26 | 23 → 49 | 0 → 10 | 0 → 10 | 58 → 11 |
| Coding 3 | 31 → 80 | 3 → 2 | 35 → 18 | 61 → 60 | 0 → 10 | 0 → 10 | 65 → 28 |
| Coding 4 | 29 → 80 | 31 → 4 | 24 → 20 | 41 → 51 | 3 → 15 | 0 → 10 | 59 → 14 |
| Music 1 | 13 → 40 | 92 → 35 | 0 → 40 | 8 → 5 | 0 → 10 | 0 → 10 | 85 → 35 |
| Music 2 | 17 → 50 | 41 → 16 | 41 → 40 | 18 → 24 | 0 → 10 | 0 → 10 | 41 → 16 |
| Music 3 | 8 → 21 | 62 → 19 | 25 → 33 | 12 → 29 | 0 → 10 | 0 → 10 | 88 → 33 |
| Science 2 | 11 → 20 | 82 → 15 | 18 → 55 | 0 → 10 | 0 → 10 | 0 → 10 | 100 → 35 |
| Geography 3 | 6 → 10 | 100 → 20 | 0 → 10 | 0 → 50 | 0 → 10 | 0 → 10 | 100 → 20 |
| Spanish 3 | 7 → 10 | 100 → 60 | 0 → 20 | 0 → 0 | 0 → 10 | 0 → 10 | 0 → 0 |
| Logic 3 | 4 → 10 | 0 → 0 | 100 → 0 | 0 → 50 | 0 → 40 | 0 → 10 | 100 → 0 |

Music at grade one and Spanish are still mostly recall. Naming a key or a word is what those lessons teach, and we judged it acceptable as long as every lesson also has its two stretch questions, but it is the weakest part of the spread and the first place a second reasoning question would help.

### What was added, subject by subject

Maths gained 283 items. Grades two to four were raised the way the pilot raised grade one, reusing its sum triangle, cups and towers: the unknown moved into every position of the adding, taking-away, times and division lessons, start-unknown and compare stories came into every grade, measures are read between marks, and each lesson ends with a reasoning question (a level scale, a mistake in someone's working, which of two is bigger without working both out) and a non-routine one (every way to pay, the biggest product from four cards, every rectangle of a given perimeter). Grade one kept every pilot block and gained two to four questions a lesson. The written-method lessons that drew no picture now have one in most questions, borrowing boxes, crops, a ferry, a library, road distances and the fuel gauge from physics.

Reading gained 182 items. Every lesson from grade two has an evidence question, answered by picking the sentence or giving a line number proved against the passage's line breaks for every version, so the key cannot depend on how a passage wraps. Inference is asked without signal words, points of view are compared at grade four, and grade one asks what happened from a street or an animal the child reads clues on.

Writing gained 156 items. The majority are proved by the machine: a word typed into boxes, a pick, an ordering or a pairing. Joining words are chosen for meaning, revisions are chosen for a named reader with a reason, and the three-star questions are pieces written to constraints and marked by a grown-up against a look-for. The treasure map directions are proved by `coding.builds`, as the audit suggested.

Coding gained 159 items. Bugs no longer stand out, programs are compared for the same task, builds ask for the fewest blocks and are proved by `coding.builds`, and every repeat, decision and variable is asked from both sides (predict what it does, and set it so it does a thing). The block program and the maze now carry only the lessons that need them; the turtle, pixels, stage, dance, tune, lamps, sorting network, trace table and the maths hundred square and number line take the rest.

Music gained 64 items. The keyboard's letters come off as notes are learned, middle C is found by the black keys, strum and clap questions use `music.rhythm` for the first time, and the unused chime bars and note lane carry counting and pitch questions that the keyboard cannot, since a keyboard in a scene is always an answer.

The one-off subjects gained 24 items. Science uses the frog life cycle, how a plant grows and the minibeasts, and asks which test is fair and which question a test can answer. Geography reads grid references both ways and measures a route against the map's scale. Spanish teaches its new words in the look before asking them. Logic has number and shape claims that need a counterexample, and who-owns-what puzzles on the new logic grid, each proved to have one answer by listing every assignment.

### The audit's findings, and what we found on the way

Of the ten items most in need of raising, seven were ours and are raised: `puzzle.row` (no line is drawn, and the length comes from two positions), `coding.bug-direction` (one direction wrong round a rectangle, so nothing stands out), `reading.poem-rhyme` (the rhyme pattern, with rhymes spelled differently), `reading.fact-or-opinion` (no signal words, and a new item asks which reason shows an opinion), `writing.time-word` (the time words removed and a bank of four given), `music.play-middle-c` (no letters, found by the black keys) and `logic.always-sometimes` (number and shape claims). The pilot had already raised `bonds.make-ten`, and `physics.seesaw-balanced` and `chem.mixture-count` belong to the physics and chemistry agents. The three close behind are raised too: the second bar of `fractions.equivalent` is cut but not shaded, `chance.fair-spinner` has a shaded share that varies, and `graph.bars` asks for a difference.

Of the wrong or arguable facts and keys, the ones outside physics and chemistry are fixed: `money.total` and `decimal.times-ten` ask in dollars, `angles.name` no longer has an 89 degree version, `fractions.add-related` keeps only versions with one right answer, `writing.puzzle-sort` no longer has "shining", `writing.join-with-and` offers one word that fits the meaning and one that does not, the music titles no longer give their answers, and `science.push-or-pull` has lost the door and the sock. The chemistry facts, sugar's melting point, the boiling beaker and the sorting cards, are with the chemistry agent.

The review passes found defects of their own, in new items and a few old ones:

- A word-input's `options` are every answer that counts as right, and eleven items listed every version's answer there, so each version accepted the others' words: three new reading items, `reading.first-sound`, `reading.missing-word`, `reading.most-beats`, two new writing items, `writing.puzzle-sort`, `writing.needs-a-capital` and `writing.word-class-column`. Each now lists only its own version's spellings.
- A blank written inside an equation is one digit square, so a two- or three-digit answer does not fit on paper. Thirteen new items had one: twelve now use a number box and one keeps its answer to a single digit. Seven older items still have one, including the pilot's `add.bridge-ten` and `time.film-ends`; an eighth, `decimal.times-ten`, moved to a number box when its pounds were changed.
- Distractors that were also right, and orders that could go two ways, in about thirty reading and writing items: a sentence that also showed the feeling, a plant's steps that could swap, a comma another convention allows.
- Pictures that disagreed with their text in six maths items, of the bus's kind: a jar that always drew twenty sweets beside a question about any number, an array that stayed 3 by 4 whatever the question said.
- A wrong key in `coding.pixel-repeat-count`, whose text counted the blue squares one way and whose program painted them another, and two build tasks a child could finish without the repeat they were about.
- The right option in the same place in most versions of five items, and hints that gave the answer in about a dozen, now balanced and rewritten.

### Printed length

146 of the 170 lessons print five child sheets and 24 print four, each with its grown-ups sheet; none prints more than five, and no answer is cut off the grown-ups sheet, which we checked by simulating its layout for every lesson. Every lesson prints exactly the sheets it lays out. Most lessons now sit at the five-sheet limit, so the first thing to watch is whether families find the sittings long; a lesson that has to grow further should be split into two sittings at its try sections rather than given a sixth sheet.

### The new drawing

The logic grid (`logicgrid`, on the charts, sorting and chance shelf and also under puzzles) draws people down the side and things across the top, with a tick or a cross where each pair meets, set by `rows`, `cols` and `marks`. It has four takes on the shelf and is used by the logic lesson.

### What is left

- The reasoning targets, above, need a decision about a second reasoning question per lesson and the sheets it would cost.
- The equation blank holds one digit. Either the renderer sizes a blank for its answer, or the seven older items move to number boxes.
- Checker settings that change from version to version would let the played and clapped music questions vary, and a keyboard that can be shown without being the answer would let staff reading use it.
- Several drawings would let the audit's remaining raises be written: a protractor with degree ticks or neither arm on zero, an L-shape that can hide a side, a change line and a percent bar that can hide their labels, a number line labelled in fractions, a ruler in millimetres, a caption strip that wraps, a codepad that can lock a tray block's number, and the clue picture ranked sixth above.
- A few puzzle types now appear at more than one grade (paying with quarters, dimes and nickels at grades two to four; the sum triangle from its sums at three and four). The keys are right, but a child meets the same puzzle twice.
- `src/family/sample.ts` still names items for the grade three review that the review no longer uses, and a fresh demo seed will show different answers from before.
- The grades for the new items are ours alone.

## Sources

- Common Core State Standards for Mathematics, CCSSO: https://learning.ccsso.org/wp-content/uploads/2022/11/Math_Standards1.pdf
- Common Core State Standards for English Language Arts, CCSSO: https://learning.ccsso.org/wp-content/uploads/2022/11/ELA_Standards1.pdf, and Appendix A's text complexity bands: https://www.nysed.gov/sites/default/files/programs/standards-instruction/appendix-a-supplemental-research-common-core-state-standards-ela-literacy.pdf
- National curriculum in England: mathematics, https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study/national-curriculum-in-england-mathematics-programmes-of-study; English, https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study/national-curriculum-in-england-english-programmes-of-study; science, https://www.gov.uk/government/publications/national-curriculum-in-england-science-programmes-of-study/national-curriculum-in-england-science-programmes-of-study; computing, https://www.gov.uk/government/publications/national-curriculum-in-england-computing-programmes-of-study/national-curriculum-in-england-computing-programmes-of-study; geography, https://www.gov.uk/government/publications/national-curriculum-in-england-geography-programmes-of-study/national-curriculum-in-england-geography-programmes-of-study
- Curriculum and Assessment Review, final report (November 2025): https://assets.publishing.service.gov.uk/media/690b96bbc22e4ed8b051854d/Curriculum_and_Assessment_Review_final_report_-_Building_a_world-class_curriculum_for_all.pdf, and the government response: https://assets.publishing.service.gov.uk/media/690b2a4a14b040dfe82922ea/Government_response_to_the_Curriculum_and_Assessment_Review.pdf
- Singapore 2021 Primary Mathematics Syllabus, updated October 2025: https://www.moe.gov.sg/api/media/92bff26d-b2b4-4535-b868-b8415c744b91/2021-Primary-Mathematics-Syllabus-P1-to-P6-Updated-October-2025.pdf; the 2013 syllabus for the concrete, pictorial, abstract approach and the heuristics: https://web.archive.org/web/20210929034241/https://www.moe.gov.sg/-/media/files/primary/mathematics_syllabus_primary_1_to_6.pdf; Achieve's comparison with the Common Core: http://www.achieve.org/files/CCSSandSingapore.pdf; AIR (2005): https://files.eric.ed.gov/fulltext/ED491632.pdf
- NRICH, low threshold high ceiling: https://nrich.maths.org/articles/low-threshold-high-ceiling-introduction; rich tasks: https://nrich.maths.org/articles/what-are-rich-tasks-and-why-do-they-matter; Two Dice: https://nrich.maths.org/problems/two-dice; Number Differences: https://nrich.maths.org/problems/number-differences; Magic Vs: https://nrich.maths.org/problems/magic-vs
- Beast Academy: https://beastacademy.com/, level placement: https://help.beastacademy.com/a/1861864, book 2B: https://beastacademy.com/books/2B
- Math Kangaroo USA, format and scoring: https://mathkangaroo.org/mks/practice/free-question-samples/; 2026 sample questions: https://mathkangaroo.org/mks/wp-content/uploads/2026/04/2026-MK-Sample-Questions.pdf
- Webb's Depth of Knowledge by subject: http://ossucurr.pbworks.com/w/file/fetch/49691156/norm%20web%20dok%20by%20subject%20area.pdf; Smith and Stein's task analysis guide: https://mcp-coaching.osu.edu/files/2015/11/3-5-3-Smith_Stein_2011_Task_analysis_guide.pdf
- NCTM, Principles to Actions: https://www.nctm.org/uploadedFiles/Standards_and_Positions/PtAExecutiveSummary.pdf; Razzaq and Heffernan (2006): http://web.cs.wpi.edu/Research/trg/public/project/papers/its06/razzaq.pdf; Renkl, Atkinson and Grosse (2004): https://eric.ed.gov/?id=EJ732331; IES practice guide on problem solving: https://ies.ed.gov/ncee/wwc/Docs/PracticeGuide/MPS_PG_043012.pdf
- Junior Great Books, shared inquiry: https://www.greatbooks.org/nonprofit-organization/what-is-shared-inquiry/; Question-Answer Relationships: https://www.readingquest.org/qar.html
- NGSS 3-PS2-1: https://www.nextgenscience.org/pe/3-ps2-1-motion-and-stability-forces-and-interactions, and the practices in Appendix F: https://www.nextgenscience.org/sites/default/files/Appendix%20F%20%20Science%20and%20Engineering%20Practices%20in%20the%20NGSS%20-%20FINAL%20060513.pdf
- CSTA K-12 standards (2017): https://csteachers.org/wp-content/uploads/2025/03/csta-k-12-computer-science-standards-revised.pdf, and the 2026 PK-12 standards: https://csteachers.org/wp-content/uploads/2026/07/2026-CSTA-PK%E2%80%9312-Computer-Science-Standards.pdf; Bebras UK age groups: https://www.bebras.uk/index.php?action=content&id=121
- ABRSM piano syllabus 2025 and 2026: https://www.abrsm.org/sites/default/files/2024-06/Piano%202025%20&%202026%20Prac%20syllabus%2020240524_access.pdf; National Core Arts Standards, music: https://www.nationalartsstandards.org/sites/default/files/Music%20at%20a%20Glance%20rev%2012-1-16.pdf
