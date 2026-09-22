# Curriculum

Status: agreed plan, September 2026. Sixty lessons, fifteen a grade, grades one to four. It replaces the content written while the engine was being built, which grew by whatever was being tested rather than by a curriculum. Every lesson here is chosen so its questions can be drawn from art that already exists on the shelf, and between them the sixty use all twenty-eight categories.

## How the set is built

Fifteen lessons a grade, in the shape a year actually takes: about twelve that teach or work an example, one puzzle sheet, one review, and the remainder worked examples where the method is the point. The puzzle sheet in each grade is deliberate: it is the page a child does for pleasure, and it is where the reasoning art (balance, matchsticks, pyramids, spinners, function machines) earns its place.

The rule that keeps the set honest is that a lesson is chosen because the picture for it exists and is good, not because the topic appears in a syllabus. Where a topic has no drawing yet, either the drawing gets made first or the topic waits.

Difficulty follows the two books this grows out of: grade one at Level B (Singapore Primary 1 and England Year 2, so bonds to twenty by heart, adding and subtracting within a hundred, equal groups and the two, five and ten tables, halves, quarters and thirds, money, centimetres and kilograms), and grade four at Level B with metric units primary. Grades two and three fill the gap in the same register.

Reading load is a constraint, not a detail: at grade one the child reads short instructions and an adult reads the story problems aloud, so a question that needs a paragraph belongs to a later grade.

## Decisions

**Currency is dollars and cents throughout.** The grade one book uses US coins and the coin art is a penny, a nickel, a dime and a quarter, so the rest follows. The grade four content written during the engine work used pounds and pence and will be rewritten; one travel ticket in the art also says £4.50 and needs changing.

**Reading stays out of the sixty.** Reading and phonics is the largest single category on the shelf, seventeen visuals, and none of the sixty uses it. That art is kept for a short reading strand of its own rather than spending maths slots on it.

**A drawing that carries a reading hides it where the reading is the question** (17 September 2026). The tape measure writes its reading above the arrow, which is what a lesson wants when it is only showing a tape, so `showReading` stays true by default and nothing already written changes. A scene that asks a child to read the tape sets `showReading=false`, so the arrow points and the marks are counted: the item `measure.tape` does, and so do the look scenes of How long, how heavy (grade 1) and Metres and centimetres (grade 2), where a tape reading 65 cm stood above the arrow in the same lesson that then asks what a tape reads.

**The old lessons go.** The set below replaces `content/lessons/` entirely. The new lessons are written alongside the old ones first, so nothing points at a missing lesson while the work is in flight, and the old set is removed in one pass at the end. Several things name lessons by id and are updated in that same pass: the year plan in `src/space/grade1.ts`, three tests, and the marketing pages.

## Grade 1

| # | Lesson | Format | The art it leans on |
|---|---|---|---|
| 1 | Counting to twenty | teach | rekenrek, bead string, ten frame, counter tub |
| 2 | Bonds to ten | teach | number bond, cuisenaire trains, ten frame |
| 3 | Making ten | teach | ten frame, basket of apples, equation |
| 4 | Adding to twenty | teach | number line, bus filling up, rekenrek |
| 5 | Taking away to twenty | worked | bus emptying, bar model, number line |
| 6 | Tens and ones | teach | place value rods, arrow cards, place value chart |
| 7 | Counting in twos, fives and tens | teach | baking tray, coins, number line rope |
| 8 | Equal groups | teach | dot array, train carriages, egg box |
| 9 | Halves and quarters | teach | pizza, chocolate bar, fraction circle, cake |
| 10 | How long, how heavy | teach | ruler, tape measure, dial scale, mass set |
| 11 | Coins and prices | teach | coin row, purse, price tag, shop shelf |
| 12 | O'clock and half past | teach | clock, digital clock, day strip |
| 13 | Tally charts and picture graphs | teach | tally marks, picture graph, birds on a wire, minibeasts |
| 14 | Balance and shape puzzles | puzzles | balance, matchsticks, tangram, pattern blocks, pattern strip |
| 15 | Year review | review | drawn from the year above |

## Grade 2

| # | Lesson | Format | The art it leans on |
|---|---|---|---|
| 1 | Numbers to one hundred | teach | hundred square, place value chart, number ladder |
| 2 | Adding tens and ones | teach | base ten blocks, compare bars |
| 3 | Adding with an exchange | worked | base ten, columns |
| 4 | Taking away with an exchange | worked | base ten, columns |
| 5 | Threes and fours | teach | baking tray, train, dot array |
| 6 | Flat and solid shapes | teach | flat shapes, solids, nets, geoboard, tangram |
| 7 | Sharing equally | teach | plates, children, counter tub |
| 8 | Halves, quarters and thirds | teach | pizza, chocolate bar, fraction wall |
| 9 | Metres and centimetres | teach | tape measure, ruler, long jump |
| 10 | Grams and kilograms | teach | dial scale, spring scale, mass set, ingredient pile |
| 11 | Litres and millilitres | teach | jug, containers, mixing bowl |
| 12 | Making amounts and giving change | teach | purse, till drawer, change line, receipt |
| 13 | Quarter past and quarter to | teach | clock, digital clock, schedule, elapsed line |
| 14 | Sorting and chance puzzles | puzzles | Venn, Carroll, sorting rings, spinner, probability scale |
| 15 | Year review | review | drawn from the year above |

## Grade 3

| # | Lesson | Format | The art it leans on |
|---|---|---|---|
| 1 | Numbers to a thousand, and rounding them | teach | base ten, rounding line, nearest to, number ladder |
| 2 | Adding in columns | worked | columns, base ten |
| 3 | Taking away in columns | worked | columns, base ten |
| 4 | Times tables to twelve | teach | dot array, in-out table, term sequence |
| 5 | Multiplying by ten and a hundred | teach | place value chart, place name, digit cards |
| 6 | Short multiplication | worked | grid method, columns |
| 7 | Dividing with a remainder | worked | bus stop, plates, egg box |
| 8 | Equivalent fractions | teach | fraction wall, equivalent bars, pizza |
| 9 | Tenths | teach | decimal square, number line in tenths, fraction bar |
| 10 | Perimeter and area | teach | grid of squares, rectilinear shape, geoboard |
| 11 | Right angles, lines and symmetry | teach | angle, set square, mirror line, reflection grid, tessellation |
| 12 | Minutes, intervals and timetables | teach | clock, elapsed line, timeline, departure board, stopwatch |
| 13 | Dollars and cents | teach | price tag, receipt, change line, till drawer |
| 14 | Function machine puzzles | puzzles | machine, machine chain, arrow chain, unknown box, balance equation |
| 15 | Year review | review | drawn from the year above |

## Grade 4

| # | Lesson | Format | The art it leans on |
|---|---|---|---|
| 1 | Numbers to a million, and rounding | teach | place value chart, place name, digit cards, rounding line |
| 2 | Negative numbers | teach | number line, thermometer, inequality line |
| 3 | Factors, multiples and primes | teach | dot array, Venn, size order, number fan |
| 4 | Long multiplication | worked | grid method, columns |
| 5 | Long division | worked | bus stop, plates |
| 6 | Adding fractions and mixed numbers | teach | fraction wall, equivalent bars, mixed number, chocolate bar |
| 7 | Decimals: tenths and hundredths | teach | decimal square, number line, percent bar |
| 8 | Percentages | teach | percent bar, pie chart, ratio bars |
| 9 | Money with decimals | teach | receipt, till drawer, price tag, change line |
| 10 | Area and perimeter of compound shapes | teach | rectilinear shape, grid of squares, geoboard |
| 11 | Angles with a protractor | teach | protractor, angle, set square, construction |
| 12 | Coordinates and movement | teach | coordinate grid, reflection grid, map grid, signpost |
| 13 | Line graphs, tables and the mean | teach | line graph, table, dot plot, bar chart, scoreboard |
| 14 | Thinking problems | puzzles | number pyramid, matchsticks, balance, row of heads, dominoes |
| 15 | Year review | review | drawn from the year above |

## Coverage

Every category on the shelf is used by the set except reading and phonics, which is held for its own strand. The warm categories are spread deliberately rather than clustered: journeys appears in grade one adding (a bus filling up) and grade three timetables, the kitchen in fractions at three grades, nature in grade one data, sports in grade two measuring and grade four data, manipulatives across place value and shape, and the world a problem happens in wherever a question needs a setting rather than a diagram.

Where the same art carries different maths across grades, that is the point: a child who learned to read a ten frame in grade one unit two reads the same ten frame in grade four, and the picture costs nothing to learn twice.

## What a lesson has to clear

- Every question passes the verifier: the answer evaluates for every version, the drawing fits its scene, the props fit their containers, and no feedback rule also matches the correct answer.
- The lesson prints to exactly as many pages as it lays out sheets, checked by `npm run check:print`.
- Answers, hints and the notes for the grown-up appear only on the grown-ups sheet.
- The look section shows the idea with a picture before any question is asked, and the remember section states the fact in one line.
- Reading load suits the grade, which at grade one means the child can start without an adult reading the question.

# Beyond maths: forty lessons

Status: agreed plan, September 2026, to be built after the maths sixty. Maths is the starting point and not the product, so the same engine carries four more strands at ten lessons a grade, forty in total. The test each strand has to pass is the one in [product.md](product.md): a subject is in when a lesson costs a drawing and a notation file rather than a new system, and when its questions can be proved before a child sees them.

Twelve of these already exist in some form, written while we were finding out whether the core was general: reading comprehension, phonics and spelling, grammar, handwriting, two science lessons, computing, geography, music, a logic sheet, a second language, and words and pictures. They stay until the planned versions replace them, because they are the evidence that the platform is not a maths product.

## The strands

**Reading and words**, three or four a grade, moving from sounds to sentences to meaning to how a piece of writing is put together. This is the strand with the most art already drawn: letter cards, sound buttons, sound boxes, syllable arcs, word cards, a sentence strip with a gap, an alphabet line, an open book, writing lines and handwriting rules.

**Science**, three a grade, moving from what a child can observe to what they can measure and then to what they can explain. This strand needs the science apparatus art that has not been drawn yet: a magnifier, a beaker with a scale, a magnet, a circuit that is open in one drawing and closed in another, weather symbols, a food chain, the planets, states of matter as particles in jars. Those drawings gate the strand and should be made first.

**Logic and reasoning**, one a grade, plus the puzzle sheets the maths years already carry. Sorting and the odd one out, then sequences and their rules, then deduction, then logic grids and crossing problems.

**Computing**, one a grade and two at grade four, using the robot grid and the program strip: following instructions, then repeating them, then finding the mistake in a program, then writing one that makes a decision. This is the strand the owner expects to grow into real programming exercises at higher grades, and it is the one with the clearest path upward.

**Geography and maps**, one a grade from grade two: a map seen from above, then grid references and routes, then scale and distance.

**Music**, ten lessons across the four grades, so it is a strand of its own rather than two slots. Promoted in September 2026 when sound became a core capability: a playable instrument drawn on the grid is a part like any other, so music stops being a rhythm bar on paper and becomes notes named, beats counted, intervals heard and seen, a staff read, and a short phrase played. The audio core, the accessibility rule and what a music exercise can promise are in [sound.md](sound.md). This takes the set beyond maths from forty to forty eight, since the two music slots in the table below are replaced by the strand.

## The forty

| Grade | Reading and words | Science | Logic | Computing | Maps | Music |
|---|---|---|---|---|---|---|
| 1 | letter sounds; blending sounds into words; words we know by sight; a sentence and a full stop | living or not living; the parts of a plant; the five senses | sorting, and the odd one out | following instructions on a grid | | beats in a bar |
| 2 | syllables; spelling patterns; punctuation; what the passage says | materials and what they are like; push and pull; day and night | sequences, and the rule behind one | repeating instructions | a map from above | reading a rhythm |
| 3 | reading for the answer; naming words, doing words, describing words; putting a story in order | circuits that work and circuits that do not; magnets; solid, liquid and gas | who owns what: deduction from clues | finding the mistake in a program | grid references and routes | |
| 4 | what the passage does not say outright; saying it shorter; joining two sentences | forces you can measure; the planets in order; where the rain comes from | logic grids, and getting everyone across the river | a program that makes a decision; writing one for someone else to follow | scale, and how far that really is | |

Ten a grade in the table, forty, plus the ten-lesson music strand described above, so forty eight in all. Grade four is the grade where computing takes two slots, because that is where it stops being about following instructions and starts being about writing them.

## What this strand set needs before it can be built

The science apparatus art, listed above, which is the only hard dependency. Everything else can be drawn from what is on the shelf today.

Two capabilities from the [subjects study](../scratchpad) also matter here and are not yet in the core: sound, which every language and music strand eventually wants and which has no weaker promise available because there is nothing to verify, and an answer a child produces rather than picks, which is what a written sentence and a formed letter are. Until those exist, the reading and music strands present and collect that work and say plainly on the page that the grown-up is the marker.

## Where it goes next

The owner expects the platform to reach real programming exercises for older children, and physics and chemistry beyond that. Both fit the model: a program is a grid and a strip of instructions, a circuit is a drawing with a state, an experiment is a table and a fair test. Neither is in the forty above, because the forty stop at grade four, and both are the natural continuation of the computing and science strands rather than new systems.

# The grid: 28 lessons a term

Status: agreed, 15 September 2026, and being built in batches of one subject and grade at a time.
The gap list, the lesson standard and the batch notes are in the catalog-balance working notes until
the run is done, and the nature track's lessons are listed in [tracks.md](tracks.md).

The catalog is built to a grid by term rather than to a count by subject. A term is one world and
twelve weeks, and each subject has a fixed number of lessons in every term: maths five, physics and
chemistry four, reading, writing and coding three, and art, music and nature two. That is 28
lessons a term, 84 a grade and 336 over the four grades. Maths keeps its fifteen a grade because it
is the spine and is already built; the two sciences take twelve because the frameworks for these
ages hold about twelve good physics topics and twelve good chemistry topics a year before the
lessons start to pad, which leaves room in each grade for a puzzle sheet and a review in the maths
shape. Coding sits with reading and writing rather than in the last tier, since it is 31 lessons
already and putting it in the last tier would have retired seven of them. A family doing everything
meets two or three lessons a week, each with two more seeded days, which is the pace the roll
already describes. We have not measured how many lessons a week families do; the figure comes from
the docs and the roll. The one notch up, with physics and chemistry at fifteen and every tier one
step wider, is 432 lessons on the same structure, so nothing in this grid is wasted if the second
half is wanted later.

| Subject | A term | A grade | The track | Built on 15 September |
|---|---|---|---|---|
| Maths | 5 | 15 | 60 | 60 |
| Physics | 4 | 12 | 48 | 31, 5 written for grade one, 5 for grade two, 4 for grade three, and 3 for grade four |
| Chemistry | 4 | 12 | 48 | 28, and 20 written since: 6 for grade one, 5 for grade two, 5 for grade three, 4 for grade four |
| Reading | 3 | 9 | 36 | 33, and 3 written since: 1 for grade one, 1 for grade three, 1 for grade four |
| Writing | 3 | 9 | 36 | 30, and 6 written since: 1 for each of grades one to three, 3 for grade four |
| Coding | 3 | 9 | 36 | 31, the thinking lesson moved in, and 4 written (two for grade one, one each for grades two and four) |
| Art | 2 | 6 | 24 | 18, and 6 written since: 1 for grade one, 2 for grade two, 2 for grade three, 1 for grade four |
| Music | 2 | 6 | 24 | 11, and 13 written since: 2 for grade one, 1 for grade two, 4 for grade three, 6 for grade four |
| Nature | 2 | 6 | 24 | 2 moved in, and 6, 5, 5 and 6 written for grades one to four |

Three lessons moved and one was retired to make the subjects whole. The two science lessons and
the geography lesson became nature lessons (plants and animals, and reading a map), the logic
lesson became a coding lesson in the sorting and searching unit with its always, sometimes or never
items moved to the grade three maths puzzle sheet, and materials and forces was retired, since
chemistry and physics already teach its three ideas with drawings. The kindergarten year, a fifth
year and a history track stay outside the grid; they are decisions about the product's ages rather
than about counts, and the garden, the old tower and the far shore keep their `needs` sentences.

Every lesson, new or old, is held to one standard of twelve lines, each scored 0, 1 or 2: one goal,
a look scene, a story and a place, drawn questions, variety of shape, questions that build, a
two-star reason, a three-star non-routine question, hints that ask and feedback that points, a
remember line, a grown-ups note that says what to watch, and three levels that differ. A new lesson
lands at 21 of 24 with no zero, read by a second reader; a lesson under 16, or with a zero on the
look, the reasons or the levels, is raised before its subject grows. New lessons are written with
easy, medium and hard from the start, in the levels notation, and land per subject after that
subject's levels wave, so the medium baseline sees a fixed set. A brief whose drawing is not on the
shelf waits, and its slot is filled by the next brief in the subject's list; the drawings that gate
lessons today are an ice cube in the wrapped cups, falling things, a rain gauge, a marble track, a
string telephone, the Earth and the moon from above, a chromatography strip, a weave grid and the
bar builder.
