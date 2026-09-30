# Grades five and six

Status: proposed, 28 September 2026, for the owner to approve before any of it is built. The owner
chose the sixth year's three worlds (the midnight sun, the waterfall gorge and the moon) and asked
that moving a child up a grade be part of this plan. Every file and line named below was read on
the day this was written; line numbers drift, so a builder checks each one before changing it.

Progress, 29 September 2026: every step is done. The platform, moving up,
the map and the drawings are built, the 84 lessons of each new grade have landed, and both grades are
offered: the canal town, the observatory and the old city are the fifth year in `DEFAULT_YEARS`, and
the midnight sun, the waterfall gorge and the moon the sixth. The six worlds' reaches are written
against the lessons as built and their `needs` sentences are gone, every world has a themed visit
for grades five and six, and the end-to-end tests cover a child at each grade and a child moved up
into each. Every lesson outside maths now lands in the term its own unit names, so the grade six
chemistry lessons on neutralising and hard water are in the waterfall gorge they were written for,
and every grade five and six lesson lights a landmark of its own term's world. The map tiles were rebuilt at the end into `public/assets/map-tiles/1654e3e9d8a5a0dc/`, the folder already in the tree, and the snapshots drawn again from them. The print check over grades one to six keeps every sitting to five child pages or fewer.

## The short version

Grades five and six are built the way grades one to four were, and the chain that joins a lesson to
the map does not change: the grade on a child's row says which lessons are theirs, a lesson's
unit says which term it falls in (units one to three, four to six, seven to nine), the term says
which world the child walks, and a world's landmarks light when a finished lesson's skills or art
match the world's `reaches`. Each new grade takes the same grid as the first four, 28 lessons a term
and 84 a grade, in the same four formats and to the same difficulty model: a way in, a core, and a
stretch of two questions at two and three stars. On top of it each term takes eight gap lessons for
topics schools teach at these ages that no lesson covered, which makes 36 a term and 108 a grade
(proposed, in "The gap lessons: eight more a term").

The fifth year's three worlds already exist off the run, on the far shore: the canal town
(`canal-town`), the observatory (`star-cliffs`) and the old city (`walled-city`), each with its
chapter, moment and secret, an empty path and a `needs` sentence. The sixth year's three are new:
the midnight sun, the waterfall gorge and the moon, on a third land north of the far shore.

Most of the work is not lessons. We counted nineteen places in the code and tests that assume four
grades, one size budget the extra lessons will break, a map whose tile imagery throws an error if
its bounds change for one child and not another, and no way at all for a child to move from one
grade to the next. The order of work below puts those first, so that the lessons can land in
batches on a platform that already holds them, and a grade becomes visible to families in the one
change that adds its worlds to the run.

## What stays the same

The chain is described in [curriculum.md](curriculum.md) under "The grid", in `school/year.ts` and
in `school/worlds/roll.ts`, and this plan keeps all of it:

- A maths lesson starts a day on the roll, and at most one lesson of another subject joins it
  (`dayGroups` in `roll.ts`). Every other subject hangs off a maths lesson through `hostsOf` in
  `year.ts` and inherits its unit, and so its term. The maths lesson is one of those in the term the
  lesson's own unit names, with a strand's lessons of that term spread along them in order.
- A term is three maths units: `termOf` is `floor(unitIndex / 3) + 1` (`roll.ts:90-96`), and
  `chosen.ts:43` repeats the rule. Grade five and grade six maths must each use units one to nine,
  or lessons fall into a fourth term that has no world and is skipped (`rewards.ts:211`).
- A world never names a lesson. Its `reaches` match `subject:`, `art:` and `skill:` topics, with a
  `skill:` entry matching any longer skill that starts with it (`reachOf`, `rewards.ts:73-83`).
- Stamps, moments, lit landmarks, followers and inked roads are worked out from the record on every
  read and never stored (`rewards.ts:140-268`).
- Track places (the marsh, the park, the painter's hut) host every lesson of their subjects in every
  year (`hostedLessons`, `worlds.ts:214-232`). They will host grade five and six lessons of their
  subjects without any change, which is what "every year" in [overworld.md](overworld.md) means, and
  we propose keeping it.

One part of the chain changed while these grades were built, by the owner's decision of 28 September
2026. `hostOf` used to place a strand lesson by how far it was through its strand across the whole
year and ignored the lesson's own unit, so ten lessons in each of grades five and six landed a term
away from the unit they declare, and the neutralising and hard water lessons, written for the
waterfall gorge, fell in the moon's term where nothing lit for them. The year builder now hangs each
strand lesson off a maths lesson of its own unit's term. The same change moved 125 lessons of grades
one to four between worlds, which [tracks.md](tracks.md) lists under the history strand, where the
decision was first asked for. The `unit=` of every grade one to four lesson outside maths was then set
to the unit of the maths lesson the old rule hung it from, so each of those lessons stands in the term
it already stood in and no family's map moved.

## The grid for grades five and six

The two grades were written to the same counts as the first four, 28 lessons a term. The owner then
decided, on 28 September 2026, to grow them to 36 a term with eight gap lessons a term, which
"The gap lessons: eight more a term" below lists. The first column is the grid every grade shares;
the gap lessons are placed by where the gaps are, so a subject's count in a term now differs from
term to term, and only the total of 36 is fixed:

| Subject | A term, shared grid | Gap lessons, grade 5 | Gap lessons, grade 6 | Grade 5 | Grade 6 | Two grades |
|---|---|---|---|---|---|---|
| Maths | 5 | 5 | 6 | 20 | 21 | 41 |
| Physics | 4 | 4 | 3 | 16 | 15 | 31 |
| Chemistry | 4 | 1 | 3 | 13 | 15 | 28 |
| Reading | 3 | 4 | 5 | 13 | 14 | 27 |
| Writing | 3 | 2 | 1 | 11 | 10 | 21 |
| Coding | 3 | 2 | 2 | 11 | 11 | 22 |
| Art | 2 | 1 | 2 | 7 | 8 | 15 |
| Music | 2 | 2 | 1 | 8 | 7 | 15 |
| Nature | 2 | 3 | 1 | 9 | 7 | 16 |
| All | 28 | 24 | 24 | 108 | 108 | 216 |

That takes the corpus from 336 lessons to 504 with the shared grid, and to 552 with the gap
lessons. Grades one to four stay at 28 a term for now. We considered merging physics and chemistry into one
science strand at these grades, which is how Japan teaches them, and kept them apart: every piece of
code, every checker (`physics.*` and `chem.*`) and every track place already assumes the two, and the
twelve topics a year in each that the grid was built on are there to be had at ten and eleven as
well as at eight and nine.

## What each grade teaches, and against which curricula

Grade one here is US grade one, England Year 2, Singapore Primary 1 and Japan's first grade, so grade
five is US grade five, England Year 6, Singapore Primary 5 and Japan's fifth grade, and grade six is
the last year of primary school in Japan and Singapore and the first of secondary in England. Russian
primary school ends after its fourth grade and children start a little older, so the Russian
textbooks for the fifth and sixth grades (Vilenkin, Nikolsky) are the nearest match by content.

The sequence below takes its content from Japan's course of study (2017), which is the most complete
and most plainly ordered primary sequence of the ones we compared, its representations from
Singapore (the bar model for fraction, ratio and percentage problems), and its non-routine problems
from the Russian tradition of motion, work and part-whole problems drawn as schematics, and from Math
Kangaroo's papers for grades five and six. We have not yet quoted the documents line by line the way
[audit.md](audit.md) does for grades one to four; each batch quotes the standards its lessons meet
before it lands, and the sources section lists the documents to quote from.

Two things change in how a lesson is pitched at these ages, and both follow from the difficulty model
rather than adding to it. The reasoning share rises: audit.md proposes at least 20 per cent of a
grade's question slots at the reasoning level from grade three, and today grades three and four sit
at 12 and 14 per cent because most lessons carry one reasoning question, their two-star try. At
grades five and six we propose a second reasoning question in the core of every maths lesson from
the start, rather than retrofitting it, which is the decision audit.md left open. The reading load
rises too: a grade five question may be a paragraph a child reads alone, and read-aloud stays off by
default above grade two (`apps/kids/teaching.ts:32`).

### Maths, grade five: the canal town, the observatory and the old city

| # | Lesson | Format | Unit | Term and world | The art it leans on | New drawing |
|---|---|---|---|---|---|---|
| 1 | Decimals to thousandths, and multiplying by ten, a hundred and a thousand | teach | 1 | 5.1 canal town | place value chart, decimal square, number line, digit cards | |
| 2 | Multiplying decimals | worked | 1 | 5.1 | grid method, columns, price tag | |
| 3 | Dividing decimals | worked | 2 | 5.1 | bus stop, long division, jug | |
| 4 | Volume of cuboids, in cubic centimetres and cubic metres | teach | 3 | 5.1 | solid, net, jug, the canal lock | cube stack |
| 5 | Rates per unit, and the 24-hour timetable | teach | 3 | 5.1 | departure board, elapsed line, clock, double number line | |
| 6 | Numbers to a billion, and powers of ten | teach | 4 | 5.2 observatory | place value chart, number line, planets | |
| 7 | Multiples and factors: the lowest common multiple and highest common factor | teach | 4 | 5.2 | dot array, Venn, number fan | factor tree |
| 8 | Angles in triangles and quadrilaterals, and bearings | teach | 5 | 5.2 | protractor, angle, compass | angle sum |
| 9 | Circles and the distance round them | teach | 5 | 5.2 | fraction circle, construction | labelled circle |
| 10 | Percentages and pie charts | teach | 6 | 5.2 | percent bar, pie, double number line, ratio bars | |
| 11 | Adding and taking away fractions with different denominators | worked | 7 | 5.3 old city | fraction wall, equivalent bars, mixed number | |
| 12 | Area of triangles, parallelograms and trapezia | teach | 8 | 5.3 | geoboard, grid of squares, L-shape | |
| 13 | Letters for numbers, and the order of operations | teach | 8 | 5.3 | letter, rule machine, balance equation, unknown | |
| 14 | Puzzles in the old city | puzzles | 9 | 5.3 | balance, pyramid, logic grid, matchsticks, bar model | |
| 15 | Year review | review | 9 | 5.3 | drawn from the year above | |

The canal town's `needs` sentence asks for ratio and proportion as well; ratio moves to grade six,
where Japan and Singapore both teach it, and the canal keeps rates per unit, which is where ratio
starts. The observatory's asks for plotting points, which grade four already teaches and grade six
takes into four quadrants. Both sentences are rewritten to the lessons as built, in the same change
that removes them (below).

### Maths, grade six: the midnight sun, the waterfall gorge and the moon

| # | Lesson | Format | Unit | Term and world | The art it leans on | New drawing |
|---|---|---|---|---|---|---|
| 1 | Negative numbers: adding and taking away across zero | teach | 1 | 6.1 midnight sun | thermometer, number line, inequality line | |
| 2 | Multiplying and dividing fractions | worked | 1 | 6.1 | bar model, fraction bar, area grid | |
| 3 | Ratio, and the ratio table | teach | 2 | 6.1 | ratio bars, double number line, table | ratio table |
| 4 | Direct proportion and its graph | teach | 3 | 6.1 | line graph, table, double number line | line graph with any scale |
| 5 | Median, mode, range and the histogram | teach | 3 | 6.1 | dot plot, bar graph, table | |
| 6 | Speed, distance and time, and the distance-time graph | teach | 4 | 6.2 waterfall gorge | line graph, signpost, stopwatch | |
| 7 | Inverse proportion: more pipes, less time | teach | 4 | 6.2 | ratio bars, table, jug | |
| 8 | Volume of prisms and cylinders | teach | 5 | 6.2 | solid, net | cube stack, labelled circle |
| 9 | Percentage change, and a percentage of a percentage | teach | 6 | 6.2 | percent bar, price tag, double number line | |
| 10 | Solving equations with a letter | teach | 6 | 6.2 | balance equation, unknown, letter | |
| 11 | Area of a circle | teach | 7 | 6.3 moon | construction, grid of squares | labelled circle |
| 12 | Scale drawings, enlargement, and the four quadrants | teach | 7 | 6.3 | coordinate grid in four quadrants, reflection grid | scale drawing, moved shape |
| 13 | Counting the ways, and probability | teach | 8 | 6.3 | spinner, bag, probability scale | outcomes grid, probability tree |
| 14 | Puzzles on the moon | puzzles | 9 | 6.3 | balance, pyramid, matchsticks, logic grid | |
| 15 | Year review | review | 9 | 6.3 | drawn from the year above | |

Every unit from one to nine has at least one lesson in each grade, so each grade has exactly three
terms. The puzzle sheets are where the Russian and Kangaroo problems go: two travellers setting out
towards each other, two pipes filling one lock, the ages of three sisters, a cube painted and cut into
smaller cubes, all asked with no method on the page and proved by the verifier as a count, an extreme
or one named part, the way the grade four sheet is.

### Physics

| Grade | Term | Lessons |
|---|---|---|
| 5 | 5.1 canal town | What changes a pendulum's swing, measured as a fair test; floating, upthrust and the water a boat pushes aside; water pushes harder the deeper it is (the lock gates); water resistance and a streamlined shape |
| 5 | 5.2 observatory | The solar system to scale; mass and weight on other planets; the angle a mirror sends light back at; lenses and how a telescope makes far things bigger |
| 5 | 5.3 old city | An electromagnet, and what makes it stronger, as a fair test; circuits drawn in symbols, in series; physics puzzles; physics review: the fifth year |
| 6 | 6.1 midnight sun | The tilted Earth and why the sun does not set; heat moving by conducting and by convection, and keeping warm; pitch and loudness as the shape of a sound wave; balanced and unbalanced forces on a sledge |
| 6 | 6.2 waterfall gorge | Energy stores and transfers at the water wheel; generating electricity with a turbine; storing electricity in cells, and wasting less of it; turning forces, measured on a lever |
| 6 | 6.3 moon | Weight and falling on the moon, where there is no air; the moon's phases and eclipses; physics puzzles; physics review: the sixth year |

### Chemistry

| Grade | Term | Lessons |
|---|---|---|
| 5 | 5.1 canal town | How much dissolves: a saturated solution measured; getting clean water back by distilling; solutions, suspensions and what the canal water holds; rust on the lock gates, and three ways to stop it |
| 5 | 5.2 observatory | Elements, and the first rows of the table they sit in; air as a mixture of gases; heating curves, and the flat part where a state changes; metals and non-metals |
| 5 | 5.3 old city | Stone, brick, mortar and concrete, a new material made by a reaction; the signs that a new substance has formed; chemistry puzzles; chemistry review: the fifth year |
| 6 | 6.1 midnight sun | Density, and why ice floats; salt and the freezing point of water; a gas squashed and cooled; water in the air, dew and frost |
| 6 | 6.2 waterfall gorge | The rock cycle and the gorge's layers; acids and alkalis on a pH scale; neutralising; minerals dissolved in water, and hard water |
| 6 | 6.3 moon | What burning needs, and the candle under the jar (a grown-up lights it); mass is kept in a reaction; chemistry puzzles; chemistry review: the sixth year |

Anything hot, sharp or burning is done by a grown-up, as [chemistry.md](chemistry.md) already
requires, and the grown-ups note on those lessons says so.

### Reading, writing and coding

| Subject | Grade | 5.1 or 6.1 | 5.2 or 6.2 | 5.3 or 6.3 |
|---|---|---|---|---|
| Reading | 5 | Summarising a longer text by its chapters; the canal's history as a timeline and a map; a story's theme | The writer's purpose and point of view; two accounts of one comet compared; similes and metaphors | Old words in old books (the city's library); how a character changes across a story, with evidence; reading puzzles |
| Reading | 6 | Inference across a whole text; an expedition diary; Greek and Latin roots | Claim, reason and evidence in an argument; tables and graphs in a report; a poem's form | The same theme in two stories; paraphrase and summary; reading puzzles |
| Writing | 5 | Paragraphs that start with a topic sentence; clauses with who, which and where; explaining how the lock works | Formal and informal letters; punctuating speech; a short biography of an astronomer | A balanced argument; holding a piece together with pronouns and joining words; writing puzzles |
| Writing | 6 | An expedition diary; colons and semicolons; the passive, and when to use it | A speech that persuades; instructions for the water wheel; a summary in fifty words | A short story with a turn, planned, drafted and revised over sittings; the precise word; writing puzzles |
| Coding | 5 | A list of things a program keeps; a repeat that goes through a list; a running total | Polygons from a turtle, 360 divided by the sides; conditions joined with and and or; random numbers and a fair die | A block of your own with two inputs; searching a list, one by one and by halving (the library); debugging puzzles |
| Coding | 6 | Reading a program written as text; a number that changes in a loop, to simulate cooling; a decision inside a decision | Simulating a tank filling at a rate; two sorts compared by counting their steps; a block that uses itself, drawing a fractal | An orbit simulated step by step; the fewest steps for the same task; coding puzzles |

Coding at grade six reads a program written as text, and every answer is still given with blocks or
as a prediction, because there is no text editor or text runner and building one is a new capability
rather than a lesson. [coding.md](coding.md) owns that decision; this plan does not assume it.

### Art, music and nature

| Subject | Grade | First term | Second term | Third term |
|---|---|---|---|---|
| Art | 5 | One-point perspective along the canal; a print in two colours | Colour that glows against its opposite (Van Gogh's night skies); tone drawn in five steps | Drawing a building in proportion; geometric patterns made with compasses |
| Art | 6 | Colour that changes across a sky (the midnight sun's glow, since the northern lights cannot be seen in an Arctic summer); a figure's proportions and a quick gesture | Water in paint (Hokusai's waterfalls); a landscape that fades into distance | Two-point perspective; a composition of the Earth seen from the moon |
| Music | 5 | Major and minor; syncopation | Intervals, named and heard; the three primary chords | A song's form: verse, chorus, rondo; composing eight bars |
| Music | 6 | Key signatures with sharps and flats; six-eight time | The twelve-bar blues on ukulele or guitar; dynamics and texture read from a score | Reading a lead sheet; a piece played with both hands |
| Nature | 5 | A river from source to mouth; pollination | Animals of the night; a key that sorts living things | The skeleton and muscles; food and digestion |
| Nature | 6 | Animals suited to the cold; populations in a food web over time | The heart, blood and lungs; how a plant moves water | Ecosystems and what people change in them; variation, inheritance and fossils |

Every artist named is in the public domain, as [art.md](art.md) requires, with one exception in
music: `music-twelve-bar-blues` names W. C. Handy's St. Louis Blues (1914), which is public domain
in the United States but, since Handy died in 1958, stays in copyright in the UK and the EU until
1 January 2029. The lesson names the song and quotes none of it; its grown-ups note says so.

## The gap lessons: eight more a term

Status: proposed, 28 September 2026. The owner decided to grow grades five and six from 28 lessons a
term to 36: eight more a term, 24 a grade and 48 in all, spent on the coverage gaps the audits of
these grades found, which are topics schools in Japan, China and Russia teach at these ages and no
lesson of grades one to six covers. Nothing already written is removed. The audits are the findings
files in `.scratchpad/grades56/audit/` (maths-g5.md, maths-g6.md, physics.md, chemistry.md,
language.md, coding.md, art-music-nature.md and subjects.md); every curriculum line below comes from
their mappings and gap lists, and is marked as they mark it. The fixes those files rank in their
section 7 are work on the lessons that exist and are not repeated here.

### How the slots were allocated

A gap earns a slot by how central it is: taught in all three countries first, then in two, then in
one. Within that order the subjects keep roughly the shares they have now, so the new lessons do not
tilt a grade towards one of them. Science was 36 per cent of each grade's lessons and is 35 and 34
per cent after; maths goes from 18 to 19 per cent; reading and writing from 21 to 22. The science
surplus that subjects.md describes is not made worse, and the time the missing school subjects need
is taken up in [history.md](history.md) and in what the site says we do not teach, not here.

Over the two grades the 48 go to maths 11, reading 9, writing 3, physics 7, chemistry 4, nature 4,
coding 4, art 3 and music 3:

- Maths takes eleven for the ten gaps the two maths audits rank first, with data given two lessons
  because Japan and China ask for it in both grades: collecting data and choosing a graph at five,
  grouping into classes and judging a claim at six.
- Reading and writing take twelve. Six are whole books, one a term, since reading a book is the one
  requirement all three countries share that nothing in grades one to six meets. The other six are
  fables and proverbs, myths and legends, poems learned by heart, spelling with a dictation, the
  grammar named, and a report from several sources. A written review ends each book rather than
  taking a slot of its own, which meets the Russian отзыв and the Chinese recommendation six times
  over.
- Science takes fifteen: four in nature, where three topics all three countries teach are missing
  entirely (photosynthesis, the cell, classifying down to microorganisms) and a fourth is taught by
  two (germination); seven in physics and four in chemistry, for the gaps their audits rank in all
  three countries and in two.
- Coding, art and music take ten between them, each on a gap two or three frameworks share:
  flowcharts, events, control with feedback and test cases in coding; real artworks, sculpture, and
  design and folk craft in art; listening to named works, singing, and national and pentatonic music
  in music.

Each lesson was then placed in the term whose world and existing lessons suit it, so that a gap
lesson sits after the lesson it builds on (surface area beside volume, refraction before lenses,
parallel circuits after circuit diagrams, acids on metals after neutralising) and lights a landmark
its world already has where an honest skill name allows it.

Left out, and why: decimal division in full (maths-g5 gap 4) and naming the grammar inside the
relative clause and passive lessons are fixes to g5-03, writing-38 and writing-48 in the audits'
section 7, not new lessons. The triangle inequality, the cone's volume, Roman numerals, number
intervals, the inclined plane, the sun as a star beyond the pole star, a device that heats by a
reaction, plastics, how animals are born and grow, health and diet, the brain and the senses,
handwriting, speaking and listening, drama, the orchestra's instruments, minor key signatures and
ternary form are taught in one country, or cost less as an item in an existing lesson; they stay in
the audits for the next round of fixes.

### The forty-eight, term by term

In the curriculum columns, Q means the audit read the text and R that it is recalled and is quoted
before the lesson lands. Japan is the 2017 Course of Study by grade and code (中 for junior high),
China the 2022 standards by stage and section (第三学段 is grades five and six), and Russia the
federal work programmes by grade and section; "ahead" means our lesson comes before that country's
grade. A landmark marked "exists" is lit by a reach the world already has, through a skill that
starts with the reach's own; the others need a reach added or widened, and all of those land in one
world change with one tile rebuild (see "What it costs").

#### 5.1, the canal town (units one to three)

| Subject | Lesson | Format | Unit | Gap it closes | Japan | China | Russia | Drawings | Landmark |
|---|---|---|---|---|---|---|---|---|---|
| Maths | Nets and surface area: a crate for the market | teach | 3 | Solids, their nets and surface area (all three) | 5 B(2) prisms and cylinders (Q) | 第三学段 图形与几何 1(5) 展开图, 表面积 (Q); 1(6) views from front, side and top (Q) | 5 «Развертки куба и параллелепипеда» (Q) | net, solid, cubestack; net gains lengths on its edges and a cylinder | market-stall, by a new reach `skill:solids` |
| Maths | Land areas: hectares, square kilometres, and a field's area estimated | teach | 3 | Land units and estimating an irregular area (all three) | 6 B(2) およその面積 (Q), a year ahead | 第三学段 1(3) 千米², 公顷, 估计不规则图形的面积 (Q) | 6 «Приближённое измерение площади фигур, в том числе на квадратной сетке» (Q), a year ahead | canalmap, scaleplan, areagrid; new: an outline on squares | signpost, `skill:measure.metric` (exists) |
| Reading | The Wind in the Willows (Kenneth Grahame, 1908) | book | 1 | Whole-book reading, with a review (all three) | (3)オ 日常的に読書に親しみ, C(2)ウ (Q) | 阅读与鉴赏 6 阅读整本书 (Q) | 5 literature, complete works (Q) | contents, storymap, sequence, rowboat, riverreach, badger, rabbits; new: a mole, a water rat and a toad | narrowboat, `skill:reading` (exists) |
| Writing | Spelling the hard endings, and a dictation | teach | 2 | Spelling (all three) | (1)ウ 送り仮名, (1)エ kanji (Q) | 3000 characters read, 2500 written (Q) | 5 Орфография, dictation of 90 to 110 words (Q) | soundboxes, wordbricks, wordsort, writinglines | narrowboat, `skill:writing` (exists) |
| Physics | Things grow when they are heated | teach | 3 | Thermal expansion (two) | 小4 A(2)(ア) (Q), two years before us | 3-4 4.1 ③ 热胀冷缩 (Q), before us | not in grades 5 and 6 (R) | thermometer, bridge, canallock; new: expansion | canal-bridge, by a new reach `skill:physics.heat` |
| Chemistry | Gases dissolved in water: soda water, and the fish in a warm canal | teach | 2 | Gases in solution, and which solutions leave a solid (Japan) | 6 A(2)(イ) (Q), a year ahead | not at 5 and 6 (R) | 8 «Растворимость веществ в воде» (Q), ahead | fizz, bottle, dish, beaker, thermometer, fishshoal | lock, `skill:chemistry.mixtures` (exists) |
| Nature | What a seed needs to grow, as a fair test | teach | 2 | Germination and the food in a seed (two) | 5 B(1)(ア)(イ)(ウ) (Q) | not at 5 and 6 (R) | biology 6 «Прорастание семян. Условия прорастания семян» (Q) | growstages, dish; new: a seed test | heron, `skill:nature` (exists) |
| Music | Listening to Handel's Water Music | teach | 3 | Listening to named works (all three) | 5-6 B 鑑賞 (Q) | 听赏与评述 (Q) | every module of grades 5 to 8 (Q) | staff, notes, tunegrid, timeline; new: a listening map | canal-bridge, `skill:music` (exists) |

#### 5.2, the observatory (units four to six)

| Subject | Lesson | Format | Unit | Gap it closes | Japan | China | Russia | Drawings | Landmark |
|---|---|---|---|---|---|---|---|---|---|
| Maths | Tests of divisibility, and odd and even | teach | 4 | Divisibility (two), odd and even (three) | 5 A(1)ア(ア) 偶数と奇数 (Q) | 第三学段 1(1) 2，3，5的倍数的特征, 奇数、偶数 (Q) | 5 «Признаки делимости на 2, 5, 10, 3, 9» (Q) | hundred, digitcards, factortree | lighthouse, `skill:number.multiples` (exists) |
| Maths | Asking a question with data: collect, sort, and choose the graph | teach | 6 | Collecting data and choosing a graph, and band graphs (all three) | 5 D(1)ア(イ) 帯グラフ, 統計的な問題解決 (Q) | 统计与概率 1(1) 经历数据收集、整理和分析的过程, 1(2) (Q) | 5 «Представление данных в виде таблиц, столбчатых диаграмм» (Q) | tallytable, table, bargraph, linegraph, pie, percentbar; percentbar gains bands of different totals | observatory, its reach widened from `skill:data.pie-charts` to `skill:data` |
| Reading | Alice's Adventures in Wonderland (Lewis Carroll, 1865) | book | 4 | Whole-book reading, with a review (all three) | as above | as above | as above | contents, storymap, rabbits, cards, cake, bottle, toadstools; new: the caterpillar and the Cheshire cat | observatory, `skill:reading` (exists) |
| Writing | Naming the words: noun, verb, adjective, adverb, pronoun, preposition and conjunction | teach | 5 | Grammar with its names (all three) | (1)カ 語句の係り方や語順 (Q) | 阅读与鉴赏 2 (Q, loosely) | 5 Морфология (Q) | wordcards, wordsort, sentence, wordtrain | observatory, `skill:writing` (exists) |
| Physics | Light bends at a surface | teach | 5 | Refraction (all three) | 中1 屈折 (Q), ahead | 5-6 学业要求 折射现象 (Q) | 9 (Q), ahead | lens, prism, seeing; new: refraction | telescope, `skill:physics.light` (exists) |
| Physics | The compass, the Earth's magnetism and the pole star | teach | 4 | The compass and the Earth's magnetism, north by the pole star (two) | 小5 A(3)(ア) an electromagnet's poles swap with the current (Q) | 3-4 3.2 ⑥ 地球有磁场 (Q); 5-6 9.5 ⑥ 利用北极星辨认方向 (Q) | not in grades 5 and 6 (R) | compass, magnet, electromagnet, planets; new: a star map | compass, by a new reach `skill:physics.magnets`; planets, `skill:physics.sky` (exists) |
| Nature | Cells under the microscope | teach | 6 | The cell and the microscope (all three) | 6 B(3) 取扱い 水中の小さな生物を観察し (Q) | 5-6 5.3③ 使用显微镜观察细胞 (Q) | biology 5 «Клетка – наименьшая единица…» (Q) | microscope, magnifier, pond; new: a microscope view | owl, `skill:nature` (exists) |
| Coding | The same steps three ways: in words, as a flowchart and as a program | teach | 5 | Flowcharts and algorithms described in words (China, Russia, CSTA) | no programming subject | 身边的算法 1 流程图 (Q) | 5 optional course «Блок-схемы» (Q) | program, fork, blocks, codepad; new: a flowchart | telescope, `skill:coding` (exists) |

#### 5.3, the old city (units seven to nine)

| Subject | Lesson | Format | Unit | Gap it closes | Japan | China | Russia | Drawings | Landmark |
|---|---|---|---|---|---|---|---|---|---|
| Maths | Fractions, division and decimals | teach | 7 | A fraction as a quotient, and fractions to decimals and back (all three) | 5 A(4)ア(ア)(イ) (Q) | 第三学段 1(2) 小数、分数的转化; 整数除法与分数的关系 (Q) | 5 «Представление десятичной дроби в виде обыкновенной», 6 «Дробное число как результат деления» (Q) | fractionwall, decimalsquare, numberline, barmodel, longdiv | chest, its reach widened from `skill:fractions.add-unlike` to `skill:fractions` |
| Reading | The Secret Garden (Frances Hodgson Burnett, 1911) | book | 7 | Whole-book reading, with a review (all three) | as above | as above | as above | gardengate, robin, flowers, cottage, hedge, chest | library, `skill:reading` (exists) |
| Reading | Fables and proverbs | teach | 8 | Fables, proverbs and sayings (all three) | C(2)イ, (3)ウ 語句の由来 (Q, loosely) | 思辨性阅读与表达 (4) 寓言故事; (2) 成语、谚语 (Q) | 5 «Малые жанры: пословицы, поговорки, загадки», Krylov's fables (Q) | passage, comic, picturecards, fox, rabbits; new: a tortoise | library, `skill:reading` (exists) |
| Physics | Two ways round: parallel circuits | teach | 8 | Parallel circuits (all three) | 小4 A(3) 直列つなぎと並列つなぎ (Q), two years before us | 7-9 ⑭ 串联和并联电路 (Q), ahead | 8 «Последовательное и параллельное соединение» (Q), ahead | series; new: a parallel circuit | lantern, `skill:physics.circuits` (exists) |
| Nature | Sorting living things, down to the smallest | teach | 8 | Broad groups of living things, with microorganisms (all three) | 6 B(3), organisms in water only (Q) | 5-6 5.2 ① microbes, ② 对植物进行分类 (Q) | biology 5 kingdoms, «Бактерии и вирусы как формы жизни» (Q) | carroll, venn, animals, minibeasts, toadstools, and the key nature-29 uses; the microscope view | cat, `skill:nature` (exists) |
| Coding | When something happens: events and messages | teach | 8 | Events and messages between scripts (Russia, CSTA) | no programming subject | not named (Q) | 5 optional course «Параллельные скрипты… Передача сообщений» (Q) | stage, program, blocks, codepad | library, `skill:coding` (exists) |
| Art | Folk patterns, and a design to a brief | teach | 8 | Design for a purpose and traditional crafts (all three) | A 表現 工作 (Q) | 学习任务 3 and 4 (Q) | 5, the folk and decorative module: Khokhloma, Gzhel, embroidery, the emblem (Q) | tilerepeat, radial, stencil, printrow, stamps, weave | temple, `skill:art` (exists) |
| Music | Singing a round in parts | teach | 8 | Singing, including in parts (all three) | 歌唱 (Q) | 独唱与合作演唱 (Q) | throughout (Q) | staff, notes, lane, beattrack | clock-tower, `skill:music` (exists) |

#### 6.1, the midnight sun (units one to three)

| Subject | Lesson | Format | Unit | Gap it closes | Japan | China | Russia | Drawings | Landmark |
|---|---|---|---|---|---|---|---|---|---|
| Maths | Negative numbers: in order, how far from zero, times and divide | teach | 1 | Comparing, the modulus, and multiplying and dividing negatives (Russia 6; Japan and China 7) | 中1 A(1) 四則計算 (Q), a year ahead | 第四学段 1(1) (Q), ahead | 6 «Модуль числа… Арифметические действия с положительными и отрицательными числами» (Q) | numberline, thermometer, inequality | frost-thermometer, `skill:number.negatives` (exists) |
| Maths | Fractions, decimals and mixed numbers in one calculation | worked | 1 | Mixed calculation (all three) | 6 A(1) (Q); CRICED, 2008 translation (Q) | 第三学段 1(4) 混合运算 (Q) | 6 «Арифметические действия и числовые выражения с обыкновенными и десятичными дробями» (Q) | barmodel, fractionwall, mixed, decimalsquare | research-hut, `skill:fractions.multiply` (exists) |
| Reading | The Call of the Wild (Jack London, 1903) | book | 1 | Whole-book reading, with a review (all three) | as above | as above | as above | dog, wolf, sledge, firs, peaks, tent | research-hut, `skill:reading` (exists) |
| Reading | Myths and legends, and the shape of a plot | teach | 2 | Myths and legends, and the plot's parts named (all three) | C(2)イ (Q, loosely) | 思辨性阅读与表达 (4) 寓言故事、成语故事 (Q) | 5 «Мифы народов России и мира»; 6 былины, «экспозиция, завязка… кульминация, развязка» (Q) | storymountain, storymap, comic, passage | research-hut, `skill:reading` (exists) |
| Physics | Heat that crosses empty space | teach | 2 | Radiation, the third way heat moves (all three) | 中3 熱の伝わり方 (Q), ahead | 5-6 学业要求 热传递的方式 (Q) | 8 «теплопроводность, конвекция, излучение» (Q), ahead | heatflow, wrapped, thermometer, midnightsun; heatflow gains cans in the sun | frost-thermometer, `skill:physics.heat` (exists) |
| Physics | Where electricity comes from, and the solar cell | teach | 3 | Energy resources and solar cells (all three) | 小6 A(4)(ア) 光電池 (Q) | 5-6 4.2 ⑤ 太阳能、水能、风能、地热能、化石能 (Q) | 8 «Электростанции на возобновляемых источниках энергии» (Q), ahead | turbine, waterwheel, energyflow, hut; new: a solar panel | research-hut, by a new reach `skill:physics.energy` |
| Coding | A program that watches and switches: sensors, thresholds and feedback | teach | 3 | Control with feedback (China, Japan, England) | 理科 第3の2(2), 手引 A-② (Q) | 过程与控制 1, 3, 4 (Q) | not in grades 5 and 6 | tank, thermometer, lamps, program, tracetable | weather-station, by a new reach `skill:coding` |
| Art | Sculpture in the round and in relief | teach | 3 | Sculpture and three-dimensional work (all three) | A 表現 立体 (Q) | 塑造立体造型作品, 雕塑作品 (Q) | 6 «Виды скульптуры… Круглая скульптура… Виды рельефа» (Q) | solid; new: a sculpture's views, and a relief in section | ice-cliff, `skill:art` (exists) |

#### 6.2, the waterfall gorge (units four to six)

| Subject | Lesson | Format | Unit | Gap it closes | Japan | China | Russia | Drawings | Landmark |
|---|---|---|---|---|---|---|---|---|---|
| Maths | Two travellers, and a boat on the current | worked | 4 | Motion problems: meeting, catching up, with and against a current (Russia; the puzzle sheets' promise above) | 5 C(2) 速さ (Q) | 第三学段 s = vt (Q) | 6 скорость, время, расстояние (Q); meeting problems from Vilenkin 5-6 (R) | current, riverreach, rowboat, ropebridge, doubleline, stopwatch; new: a motion diagram | rope-bridge, `skill:rates.speed` (exists) |
| Maths | Proportion as an equation | worked | 6 | a : b = c : d and the unknown term (China, Russia) | 6 C(2) 等しい比をつくる (Q) | 第三学段 数量关系 (4) 比和比例 (Q) | 6 «пропорция. Применение пропорций при решении задач» (Q) | ratiotable, balanceeq, doubleline, ratio | mill, `skill:algebra.equations` (exists) |
| Reading | Treasure Island (Robert Louis Stevenson, 1883) | book | 4 | Whole-book reading, with a review (all three) | as above | as above | as above | ship, treasuremap, chest, dig, palms, parrot, rowboat | signpost, `skill:reading` (exists) |
| Reading | Poems to learn by heart | teach | 6 | Memorising and reciting, with metre and stanza (all three) | (1)ケ 音読・朗読, (3)ア (Q) | 背诵优秀诗文60篇（段） (Q) | 5 наизусть, at least 5; 6 at least 7, with metre and stanza (Q) | poem, passage, waterfall | signpost, `skill:reading` (exists) |
| Physics | A spring stretches in step with its load | teach | 6 | Elastic force and springs (two) | not at 5 and 6 (R) | 5-6 3.1 ① 弹力, ② 弹簧测力计 (Q) | 7 (Q), ahead | springscale, forcemeter, masses; new: a spring | water-wheel, `subject:physics` (exists) |
| Chemistry | What acids do to metals and to chalk | teach | 5 | Acids that change metals (Japan; England KS3) | 6 A(2)(ウ) (Q) | 7-9 (R) | 8 (R) | testtubes, fizz, rocks, phscale, nails; testtubes gains a metal strip | waterfall, `skill:chemistry.acids` (exists) |
| Chemistry | Layers from rivers and volcanoes, and the Earth inside | teach | 4 | Strata with ash and faults, rocks made of minerals, the crust, mantle and core (two) | 6 B(4) (Q) | 5-6 10.3 ③, 10.4 ④ 岩浆岩、沉积岩和变质岩 (Q) | geography 5 rock kinds (Q); the Earth's inside (R) | strata, volcano, rocks, rockcycle, fossil; strata gains an ash layer and a fault; new: the Earth inside | waterfall, `skill:chemistry.rocks` (exists) |
| Art | Looking at landscapes across nine centuries | teach | 4 | Real artworks and art history (all three) | B 鑑賞(1)ア (Q) | 学业质量 至少6位不同历史时期中外著名的美术家; 山水画 (Q) | 6 landscape: Venetsianov, Savrasov, Shishkin, Levitan (Q) | timeline, layers, perspective; new: studies after works | waterfall, `skill:art` (exists) |

#### 6.3, the moon (units seven to nine)

| Subject | Lesson | Format | Unit | Gap it closes | Japan | China | Russia | Drawings | Landmark |
|---|---|---|---|---|---|---|---|---|---|
| Maths | Symmetric figures: line, point and congruent | teach | 7 | Line and point symmetry, the centre of symmetry, congruence (all three) | 6 B(1) 線対称 点対称 対称の中心 (Q); 5 B(1) 合同 (Q) | 第三学段 图形 2(4) 轴对称图形 (Q) | 6 «Симметрия: центральная, осевая и зеркальная» (Q) | mirror, reflect, moveshape, radial, tessellation, construction; moveshape gains a centre of turn | lander, by a new reach `skill:shapes.symmetry` |
| Maths | Grouping data into classes, and judging a claim | teach | 8 | The statistical cycle: a frequency table with classes, a histogram drawn, a claim judged (Japan, China) | 6 D(1) 度数分布, 批判的に考察 (Q) | 第三学段 1(1) (Q); 第四学段 频数直方图 (Q) | 7 statistics (Q), ahead | tallytable, dotplot, bargraph; bars a child sets | crater, by a new reach `skill:data` |
| Reading | The First Men in the Moon (H. G. Wells, 1901) | book | 7 | Whole-book reading, with a review (all three) | as above | as above | as above | moon, crater, footprints, rocket; new: the sphere they travel in | flag, `subject:reading` (exists) |
| Writing | A report from three sources | teach | 8 | Research from several sources, with notes and a plan (all three) | C(2)ウ 複数の本や新聞などを活用して (Q) | 梳理与探究 3 研究报告; 实用性 (2) 记笔记、列大纲 (Q) | 5 «простой и сложный план текста» (Q) | passage, listpad, loosepages, timeline, table; new: a source card | flag, `subject:writing` (exists) |
| Chemistry | The air the crew breathe and the plants make | teach | 7 | Oxygen and carbon dioxide for life, and carbon dioxide and climate (two) | 6 A(1)(ア) 酸素が使われて二酸化炭素ができる (Q); the plant and body units (R) | 5-6 1.2 ② 空气是一种混合物 (Q) | geography 6 the atmosphere's gases (Q) | candle, flask, particles, linegraph; new: a sealed chamber | lander, by a new reach `skill:chemistry.gases` |
| Nature | Leaves make food in sunlight | teach | 8 | Photosynthesis in words, and the starch test (all three) | 6 B(2)(ア) 日光が当たるとでんぷんができる (Q) | 5-6 6.1① (Q) | biology 6 «Фотосинтез. Лист – орган воздушного питания» (Q) | leafrow, tree, growstages; new: a leaf test | earth, `subject:nature` (exists) |
| Coding | Which inputs would catch the bug: test cases | teach | 8 | Testing with chosen cases (CSTA, Russia) | no programming subject | 学业要求 修改运行 (Q) | 6 optional course «Тестирование игры» (Q) | program, tracetable, fork | lander, `subject:coding` (exists) |
| Music | Five-note tunes from four countries | teach | 7 | National and folk music, and the pentatonic scale (all three) | 我が国の音楽に使われている音階, 共通教材 (Q) | 民族五声调式 (Q) | modules 1 and 2, folk music (Q) | piano, tunegrid, staff, lane; tunegrid gains a scale's notes marked | earth, by a new reach `skill:music` |

A few notes on what the tables leave out:

- Order inside a term follows unit and then file name (`placed` in `school/year.ts`), and a new
  lesson takes the next file number in its subject (g5-16 onwards, physics-73 onwards), so it comes
  last among its subject's lessons of the same unit. That is where each belongs: refraction in unit
  five follows the mirror lesson and comes before lenses in unit six, parallel circuits in unit eight
  follows circuit diagrams, and acids on metals in unit five follows neutralising.
- The music lessons play a work's theme from its score through the sounder and ask about what can be
  proved from the score and a listening map (which section returns, which instrument family has the
  tune, how the tempo changes); the whole piece is listened to elsewhere, since
  [sound.md](sound.md) rules out recordings. The works are Handel's Water Music (1717) and, for the
  five-note tunes, folk songs of Japan, China, Russia and Scotland, all in the public domain.
- The art lesson on landscapes shows each work as a study after it on squared paper (its horizon,
  its vanishing point, its layers and its colour areas named), with the title, the artist, the date
  and where it hangs, so the shelf keeps its one style and a family can find the painting itself:
  Guo Xi's Early Spring (1072), Hokusai's Kirifuri Waterfall (about 1833), a Turner, Shishkin's
  Morning in a Pine Forest (1889) and Levitan.
- The research report is on the first landing on the moon, from three sources: the mission's own
  transcript (a work of the United States government, so in the public domain), a newspaper report
  and an encyclopaedia entry written for the lesson. Its dates are NASA's own
  (https://www.nasa.gov/mission/apollo-11/): launched on 16 July 1969, the Eagle down on the Moon and
  the first steps on 20 July, US time, and splashdown on 24 July; the newspaper written for the lesson
  is dated the morning after the landing, 21 July.
- The grown-ups note on The Call of the Wild says which chapters are hard on the dogs, and the one on
  Treasure Island which chapters have the fighting.

### Whole books in the notation

A book is one lesson on the grid, in a fifth format, `book`. The lesson file names the book
(`book=wind-in-the-willows`) and holds its sittings: one `sitting` section for each part of the
book, naming the chapters it covers and holding that part's questions, laid out and verified as a
lesson's questions are now, in three levels. A book of twelve chapters is read in six to eight
sittings. The last sitting ends with a written review, a paragraph a grown-up marks (see below).

The text lives in a file of its own under `content/curriculum/books/`, one per book, a `volume` in
the notation (the name `book` is a drawing's), with its chapters marked, the edition it was taken
from and why it is in the public domain (the author's death year and the first publication). The lesson file carries only the questions, so the 50,000
byte budget still holds, and the text is loaded when a child opens a chapter, never with the index.
A test fails a book file without that record.

On screen a sitting opens with its chapters as pages of text to read. That view is new: the passage
drawing wraps short passages onto the squares, and a chapter of two to five thousand words needs a
reading page of its own, in the same type on the same paper. On paper the family uses any printed
edition, from a shop or a library, and we do not print the book. A question may cite a line of a
chapter, and then the line is our text's, which the screen shows, and the grown-ups' sheet gives the
line's words beside its number so a grown-up with another edition marks by the words. The planner gives a book lesson one day for each sitting rather than the
three a lesson gets, spread across the term, so a book is read over the term's twelve weeks.

The questions are the ones the reading track already asks, pointed at the book: a part summed up in
one sentence, the order of events, who said a line, which chapter a picture shows, how a character
has changed and the evidence for it, a word's meaning from its sentence, and what the narrator knows
that a character does not. They are proved as reading questions are now, from options and the text,
and a question that asks for a line is proved against the book's own text by `book.line`, which
finds the one line of the chapter that holds the quoted words.

We considered writing each chapter as its own lesson, which needs no new format, and rejected it,
because a book of eight sittings would take eight of a term's slots and a family would see one book
as eight lessons. We also considered letting the family choose the book, with questions general
enough for any book; those questions cannot be proved and would all be marked by a grown-up, so we
propose it as an option beside the six books rather than in place of them.

The six are all in the public domain in the countries we checked: each author died more than seventy
years ago (Grahame in 1932, Carroll in 1898, Burnett in 1924, London in 1916, Stevenson in 1894 and
Wells in 1946) and each book was first published before 1929. They are a proposal, and the owner
chooses. [reading.md](reading.md) holds that every passage is written for its lesson; that stays
true of passages, and a text that is itself the point of a lesson (a book, a fable, a myth, a poem to
learn) is a public-domain work quoted exactly, with its record, or our own translation of one.

### What the platform needs

Each of these is a core addition that any later lesson can use, not a special case for one lesson.

- Books and sittings: the `volume` content kind read by the curriculum's one loader, the `book`
  format with `sitting` sections, a reading page for a long text, and the planner giving a lesson as
  many days as it has sittings. Each sitting prints on its own, held to the five child pages. Built
  28 September 2026, as [reading.md](reading.md), "Whole books", and [notation.md](notation.md), "A
  whole book", describe.
- A paragraph written by the child and marked by a grown-up. The `grown-up` way and the `unmarked`
  answer exist, and the `notice` list the grown-up ticks, recorded as a `responded` event as art
  does, is now on every piece a grown-up looks at or listens to: writing (book reviews and the
  research report), paintings, recitation (`reading.recited`), singing (`music.sung`) and sculpture
  (`art.made`). Built 28 September 2026 ([writing.md](writing.md), "The notice list"). On screen the
  paragraph may be typed; it is kept as the child's own answer and never sent to a model, as
  [ai.md](ai.md) requires.
- A dictation checked word by word: a typed sentence compared with the key word by word, with the
  words that differ as the mistakes, shown to the child and recorded. A grown-up reads the sentence
  aloud from the grown-ups' sheet, and the device's own voice plays it where there is one; on paper
  the grown-up marks it. Built 28 September 2026 ([writing.md](writing.md), "A dictation").
- The microscope view: a round field of view showing onion skin, cheek cells, a leaf's cells, yeast or
  pond life at a stated magnification, with a scale, and a rule in the `nature.*` checker that works
  out a cell's size from the field's width and the number of cells across it.
- A flowchart drawn from the program model in `engine/coding.ts`, so that one program is shown as
  blocks, as text and as a flowchart and the three cannot disagree. A flowchart answered by putting
  its shapes in order uses the `arranged` answer that exists.
- Sensors, messages and feedback in the runner. The track has events at grades one and two; what is
  new is a second script started by a message from the first, and a sensor that reads the simulated
  world each step while an output changes it, so a thermostat's heater warms the hut the program is
  reading.
- A `coding.tests` checker for test cases: it runs the program and a version with a planted bug on the
  inputs the child chose, and the answer is right when some input tells the two apart.
- Bars a child sets on the bar graph, as an `arranged` answer, so a child draws a histogram rather
  than only reading one.
- Studies after artworks: a drawing on the shelf for each public-domain work a lesson looks at,
  carrying its title, artist, date and collection, with the composition's lines and areas named.

### The drawings

Most of what the 48 need is on the shelf. These are new, each with its catalogue entry, shelf
grouping and description in the change that adds it, as the shelf's rules require:

| Drawing | What it draws, and the settings a question varies | Lessons |
|---|---|---|
| Outline on squares | an irregular shape (a lake, a field, an ice floe, a leaf) on squares, its whole and part squares counted by rule, with a scale | land areas |
| Motion diagram | a road or river as a line with two movers, their speeds and start times, the meeting or catching point worked out, and a current's arrow added to or taken from a boat's speed | two travellers |
| Expansion | a bridge's joint, a ball and ring, rails with a gap and a tight lid, the gap set by the temperature | things grow when heated |
| Seed test | dishes of seeds under lettered conditions (water, air, warmth, light), the number sprouted by rule, and a seed cut open to its store | what a seed needs |
| Listening map | a work's sections as a strip of shapes, with letters for the sections that return and a mark for the instrument family that has the tune | Water Music |
| Refraction | a beam going into water or glass and bending towards the upright, the pencil that looks broken, the coin that appears when water is poured in | light bends |
| Star map | the Plough and the pole star through a night, turning round the pole | the compass and the pole star |
| Microscope view | as above | cells, sorting living things |
| Flowchart | as above | three ways, and any later coding lesson |
| Parallel circuit | cells with two or three branches, a bulb and a switch in each, each branch as bright as one bulb on the cells | parallel circuits |
| Solar panel | a panel on the hut with a meter, its output set by its angle to the sun and the light on it | electricity and the solar cell |
| A sculpture's views, and a relief | a solid seen from the front, the side and the top, and a relief cut through as low, high or sunk | sculpture; it also serves the views from three sides that China asks for |
| Spring | a coil on a hook over a ruler, stretching in step with its load up to a limit | springs |
| The Earth inside | the Earth cut open to its crust, mantle, outer and inner core, with depths | layers and the Earth inside |
| Studies after works | as above, one take per work | landscapes |
| Sealed chamber | a sealed jar with a plant and a candle, or the lander's cabin, with the shares of oxygen and carbon dioxide by rule | the air the crew breathe |
| Leaf test | a leaf half covered through a sunny day, and the same leaf after the iodine test, dark where the light fell | leaves make food |
| Source card | who wrote it, when and where, and whether they were there | the report; history uses it too |
| Book characters | a mole, a water rat and a toad; the caterpillar and the Cheshire cat; a tortoise; the moon sphere | the books and the fables |

Eight drawings gain a setting whose default leaves them as they are: `net` (lengths on its edges, and
a cylinder), `percentbar` (several bands of different totals, for Japan's band graphs), `heatflow`
(cans in the sun), `testtubes` (a metal strip giving bubbles), `strata` (an ash layer and a fault),
`moveshape` (a centre of turn other than the origin), `tunegrid` (a scale's notes marked) and
`bargraph` (bars the child sets). Every lesson that already uses one of them is verified again with
its medium baseline unchanged.

### What it costs

- Writing. The 48 lessons are 29 per cent of the 168 the two grades took, and a book's sittings are
  more text than a lesson's questions. About nineteen drawings and eight settings come first, since a
  brief whose drawing is not on the shelf waits. Each batch clears the checks in "Writing the lessons"
  above.
- The worlds. Eleven reaches are added or widened: two at the canal town, two at the observatory, one
  in the old city, two at the midnight sun and four on the moon. They land in one world change, which
  fails the tile test until the tiles are rebuilt (about eight minutes and 31 MB), so they wait for
  the lessons that light them and go in together.
- Print. A lesson prints at most five child sheets, so the 21 new lessons a grade that are not books
  add at most 105 sheets and the three books' sittings about 24 more, which is at most about 30 per
  cent more paper than the 84 lessons a grade print now. The books themselves are not printed.
- A longer year. A term of 36 lessons in twelve weeks is three lessons a week rather than 2.3. At
  today's pace a term would take about fifteen and a half weeks and a year about 46, past the 39
  teaching weeks `defaultTerms` lays out. We propose keeping the twelve-week term, with the pace
  rising at these grades as the lessons get longer, and this needs a decision. Either way the default
  plan in `DEFAULT_TRACKS` cannot hold the new counts at its present paces: physics in grade five (16
  lessons) and physics and chemistry in grade six (15 each) at one day a week would reach their last
  lesson in weeks 48 and 45. The paces are set again from the new counts, at least one track gains a
  day, and the test that no day has more than two subjects is run again. The default year's planned
  lesson-days rise from 234 to about 315, counting a day for each of a book's sittings.
- Checks and budgets. The corpus test that holds each grade to fifteen maths lessons becomes twenty
  at grade five and twenty-one at grade six. The index grows to 552 lessons, about 70,700 bytes
  gzipped at 128 bytes a lesson, inside the 75,000 budget with less room than before. The `WORDS_ONLY`
  ratchet rises for the literature lessons, with the reason written beside it. Whole-corpus
  verification takes about a tenth longer.
- Grades one to four stay at 28 a term for now, so the grid is no longer the same in every grade.
  Nothing in the code assumes it is, since a year is built from whatever lessons its grade has, but
  [curriculum.md](curriculum.md) ("The grid") and the counts in the header of `school/tracks.ts` then
  speak of grades one to four only. Grades one to four have not been audited against Japan, China and
  Russia this way, and two of the gaps found here are taught there before our grade five (parallel
  circuits and thermal expansion at Japan's grade four), so they have gaps of their own.

### Order of work

1. The platform pieces in "What the platform needs", the `notice` list first, since six of the kinds
   of lesson above need it. The books, the notice list and the dictation were built on 28 September
   2026; the rest of that list is separate work.
2. The drawings and settings.
3. The lessons in batches of one subject and one grade, as before: maths first, then the sciences,
   then reading and writing with the books last, since they need the most new platform, then coding,
   art and music. Each batch quotes the lines marked R above before it lands.
4. The reaches, the default paces and the changed counts in the tests, in one change with one tile
   rebuild.

### Decisions for the owner

- The six books, and whether a family may choose its own book beside them.
- A book as one lesson with sittings, as proposed, or a lesson a chapter.
- Public-domain texts quoted exactly in reading, beside the passages written for lessons.
- The pace: three lessons a week in a twelve-week term, as proposed, or a longer term.
- Whether grades one to four get the same audit next.

## The worlds

### The fifth year joins the run

The three worlds are added to `DEFAULT_YEARS` (`school/worlds/worlds.ts:132-137`) as
`5: ["canal-town", "star-cliffs", "walled-city"]`, and each keeps its own `site`. Keeping the site
matters in two ways: `outsideYear` reads only `w.site` (`worlds.ts:183-188`), and `elsewhere` shows a
world with a site as a closed place on a younger child's map, which is how a grade four child sees
the far shore across the sea. A test checks that a world with a term site that is also in
`DEFAULT_YEARS` names the same grade and term in both.

Adding them to the run changes these, all of which are intended:

- `yearOf(5)` stops borrowing grade four's worlds (`worlds.ts:140-146`).
- `schoolRun()` gains three nodes, so the backdrop `countryViewOf` (`view.ts:1036`) changes, and with
  it the map tiles and the country snapshots (see "The map").
- The road from the island to the canal town is drawn by the route that already exists
  (`ROUTES["4.3>5.1"]`, `geography.ts:460`) as a sail, since the canal's `chapter.by` is `"sea"` and a
  change of grade is a sail (`terrain.ts:308`). It is inked on the canal's stamp or the island's
  moment (`rewards.ts:241`).
- The `needs` sentences on the three worlds (`canal.ts:112`, `observatory.ts:100`, `oldcity.ts:95`)
  are deleted, since they describe lessons that now exist.
- `mayStand` (`worlds.ts:204-207`) will let a family put the canal town in any term of any year, and
  a first-year world in a fifth-year term. That is the rule every run world follows today, and we
  keep it.

The fifth-year reaches name skills the new lessons must carry, and several do not match the skill
names grade four uses, so the reaches and the lessons are written against one list. The canal's lock
reaches `skill:capacity` and `art:jug`; the volume lesson carries `volume.cuboids` and uses the jug
and the lock, so the reach gains `skill:volume`. The observatory's planets reach `skill:place-value`,
which the powers of ten lesson carries as `place-value.powers-of-ten`. The old city's temple reaches
`skill:algebra`, and the letters lesson carries `algebra.expressions`. Every reach of every run world
is checked by a new test (see "Tests").

### The sixth year: three new worlds

Each is a full world in the shape of the others (`school/worlds/types.ts`): a light, ground, path,
horizon, landmarks, creatures, weather, a guide, reaches, offers, a chapter with a story, moment,
secret, glimpse and rare sight, a map with its spots and stamp, and a `site` of
`{ kind: "term", grade: 6, term: n }`. They are drawn as concept scenes first, the way the eleven in
[worlds-next.md](worlds-next.md) were, and the owner approves each before its lessons are hosted.

| | The midnight sun | The waterfall gorge | The moon |
|---|---|---|---|
| Term | 6.1 | 6.2 | 6.3 |
| Arrives | by sea, from the old city's harbour across the northern ocean | by path, up from the ice shelf's shore into the hills | by air, the rocket from the launch pad at the top of the sixth year's land |
| The place | An ice shelf in the far north in summer, where the sun goes round the sky and never sets | A deep green gorge with a waterfall, rainbows in its spray and a water wheel below | The moon's grey plain, with the lander and the Earth hanging still, low over the edge |
| Landmarks | the ice cliff, the research hut, a sledge, an iceberg, the weather station | the waterfall, the water wheel, the rope bridge, the mill, the rainbow | the lander, the rocket, a crater, the flag, the Earth |
| Creatures | seals, puffins, a whale, an Arctic fox | a kingfisher, a heron, fish in the pool, a dipper | none, which is the point; the guide is the only one who moves |
| Reaches | the thermometer on the hut for `skill:number.negatives`; the sledge team for `skill:ratio`; the weather station's chart for `skill:data` | the wheel for `skill:rates` and `subject:physics`; the pool for `skill:volume`; the bridge for `skill:speed` | the crater for `skill:circles`; the lander's ladder for `skill:algebra.equations`; the Earth for `skill:probability` and `skill:scale` |
| Moment | The sun touches the sea and rises again without setting. | The wheel turns and the mill's lamps come on. | Back in orbit, the Earth rises over the moon. |
| Secret | An Arctic fox asleep in the lee of the hut | A dipper walking under the water | A footprint that is not the guide's |
| Glimpse | the waterfall gorge, far inland | the rocket on its pad | none: this is the end of the map |

The moon always turns the same face to the Earth, so from the lander on that face the Earth hangs
in almost the same place in the sky all month and never rises. An Earthrise is seen only from a
craft circling the moon, as the crew of Apollo 8 saw it in December 1968, so the moon's moment is
the Earth rising as the lander circles the moon for home, and the lessons set on its ground have the
Earth hanging still. In the same way the northern lights belong to the observatory's winter nights
and not to the midnight sun, whose summer sky never gets dark enough to show them.

The moon is a world like any other on the map. Its term's slot is the launch pad on the sixth year's
land, where the map draws the rocket; the world itself is on the moon, reached by air, the way the
cloud islands are reached by the balloon (`clouds.ts:93`). The island's `promise: true`
(`island.ts:135`), which makes it the faint drawing seen past the map's edge, moves to the moon, so
the moon is what a child sees beyond the last land from their first year.

Many of the drawings are on the shelf already: the rocket, the moon, the iceberg, the seal, the fox,
the puffins, the whale, the sledge, the hut, the tent, the rainbow, the telescope, the planets and the
turbine. The waterfall, the water wheel, the lunar lander, the moon's surface, the Earth seen from
space, the ice cliff and the sun's path at midnight are not, and are drawn first, each with its
catalogue entry, shelf grouping and description in the same change.

### The story's lines that change

- The island's chapter says "The end of the map." (`island.ts:139`), and its hammock is at "the end
  of the whole map" (`island.ts:115-117`). Both are rewritten to the island being the end of the
  first four years, with the far shore seen from its lantern.
- The island gains a glimpse of the canal town, and the canal on its horizon, which
  [story.md](story.md) already describes ("first seen from the lantern at the top of the island",
  `story.md:78`) and the code lacks.
- The old city gains a glimpse of the midnight sun's ice cliff, since its moment is "The library
  opens on a new map." and the next map is the sixth year's.
- A test checks that every glimpse points at a later run world and that the glimpsed drawing stands
  on the horizon, which story.md claims a test does and none now does.
- story.md's open question, "What the map does after the fourth year" (`story.md:151`), is answered
  by this plan, and overworld.md's "How the map grows" and "The eleven" are updated to match.

### Themed visits

`school/worlds/journeys.ts` holds each world's themed visit as a tuple of exactly four grades
(`journeys.ts:25-30`), takes a visit's id and grade from its position (`journeys.ts:488-506`), and
`journeyFor(world, 5)` returns nothing, so a grade five child gets no themed visit
(`apps/kids/inside.tsx:135`, `apps/home/school.ts:239`). The tuple becomes a record keyed by grade,
the ids are written rather than derived from the index, and each world's grade five and six visits
are chosen from the new lessons. The test's `WORLDS.length * 4` and its membership fingerprint
(`journeys.test.ts:23, 32, 67-70`) are updated in the same change.

## The map

### The fifth year's land

The far shore exists (`geography.ts:250-277`) and is already drawn in every map, since its `from: 0`
means every child's map includes it (`terrain.ts:215`). What it lacks is everything that makes a
land a child's own:

- `LAND_AT[5]` (`geography.ts:25-30`). Without it `ownLand` returns null (`overworld.ts:364-376`), a
  grade five child's map frames the whole country, has no title, key, compass or sail, and on a phone
  in portrait the far shore opens as a thin strip about five times as wide as it is tall. The frame
  is about `{ x: -9200, y: -17800, w: 20400, h: 4300 }` for the coast as drawn, and we propose making
  the far shore's coast deeper, north to south, so a child's own land is not a strip.
- `FURNITURE_ON[5]` (`geography.ts:633-638`) and `SAILS[5]` (`geography.ts:645-650`), a jetty on
  the far shore facing 6.1.
- Rivers, lakes, woods, hills, fields, features and sights on the far shore
  (`geography.ts:472-563`), which has none, so a grade five child's paper plane spots nothing
  (`view.ts:896-902`).

The far shore's `from: 0` contradicts the comment on `from` (`geography.ts:9-12`), which says a land
is drawn from the year that reaches it. The comment is what changes, not the value: the tiles bake
every land from `countryViewOf`, so every land must be drawn for every child, including the sixth
year's.

### The sixth year's land, and why the sheet grows for everyone

The map throws "Map imagery does not match this world layout" when a view's country bounds differ
from the bounds the tiles were built with (`engine/ui/map-tiles.ts:319-321`). `SHEET`
(`geography.ts:657`) already contains `SHEET_FIVE`, so the conditional second sheet at
`overworld.ts:308-311` has never changed the bounds. A sixth year must not add a sheet that appears
only for a child who reaches it. Instead:

- `SHEET` grows north for every child, by about 6,000 (to `y: -26400`), and `SHEET_FIVE` and the
  `sheets` condition are deleted, since they do nothing.
- The level spans of the tiles come from the larger of the bounds' width and height
  (`tools/scripts/map-tiles.ts:205-209`). The height is below the width by about 22,000, so growing
  north by 6,000 keeps every span and adds about 6 per cent more tiles. Growing the width would make
  every level coarser, which is why the new land goes north and not east or west.
- The GPU budget per view does not change: 160 MB of textures with the finest level within 60 per
  cent of it (`map-tiles.ts:264-266`), about 96 MB in use ([overworld-gpu.md](overworld-gpu.md)).
  The rebuilt tiles are measured on the iPhone profile in [map-stability-stages.md](map-stability-stages.md)
  before the change lands.

The new land is added with `push` after the seven offshore lands (`geography.ts:407-429`), because a
coast's wobble is seeded by its index (`terrain.ts:214-216`) and inserting a land into the literal
array would move every coast after it. It gets a ninth region (`REGIONS`, `geography.ts:566-623`,
and the test that counts eight, `worlds.test.ts:200`), `LAND_AT[6]`, `FURNITURE_ON[6]`, its rivers,
woods and sights, and slots and alternates 6.1 to 6.3 in `SLOTS` and `ALTS`, each at least 2,400 from
every other stand (`written.test.ts:196-202`). Slots and `DEFAULT_YEARS[6]` land in the same change:
a world with no slot is placed on a row below the sheet (`geography.ts:710`), which changes the bounds
and trips the tile check.

Routes `5.3>6.1`, `6.1>6.2` and `6.2>6.3` are added to `ROUTES` (`geography.ts:447`). Without them a
plain curve is used, which can cut across land. The crossing into 6.1 arrives by sea, since a road,
path or rails way that crosses water is drawn as a bridge (`terrain.ts:292-305`), and the moon
arrives by air. `SAILS[6]` is left out, as the last year has nowhere to sail to.

### Tiles, snapshots and the order they land in

Any edit to a file in `school/worlds/`, to `geography.ts` or to `school/year.ts` fails the tile
test (`tools/scripts/__tests__/map-tile-assets.test.ts:60-66`), because the build lists them as its
sources. A rebuild takes about eight minutes and publishes about 31 MB into a new hash folder under
`public/assets/map-tiles/`, and `npm run map:snapshots` is run after it. The re-export is committed
with the change that caused it. To keep the number of rebuilds small, every map change for both years
lands in one change (the sheet, the lands, the slots, the routes, the far shore's features and the
new worlds' map spots), before any grade is added to the run, and the change that adds a grade to the
run rebuilds once more.

The grown-up's map of the whole country counts 38 places today (`tools/e2e/map.e2e.ts:99`); with the
sixth year's three worlds it counts 41. The run's test of twelve nodes and eleven roads
(`worlds.test.ts:158`) becomes fifteen and fourteen with the fifth year and eighteen and seventeen
with the sixth.

Two pieces of map code have no callers and would mislead anyone extending the map, so they are
deleted in the map change: `paintFuture` and `FuturePlace` (`engine/ui/map.ts:2124-2263`), with the
`"to-come"` place that `placeFrom` still parses (`view.ts:93-105`), and `walkedCrop`
(`engine/space.ts:1330`). `YEARS` in `school/worlds/places.ts:9-14` has no importer either and goes
with them.

## Moving up a year

There is no way today for a child to change grade. There is no route (`server/http.ts` has only
`POST /api/kids` and the record route), no database function that updates `kids.grade`, and no
screen, though [auth.md](auth.md) lists "Change a kid's name, grade or settings" as something a
parent may do (`auth.md:538`). Grades five and six are the first a child reaches by growing up rather
than by being added at that grade, so without this no child who finishes the fourth year can reach
the fifth.

Changing the grade by hand shows why a plain update is not enough:

- The new grade's default plan is dated from the child's original school-year start
  (`planChanges`, `school/family/family.ts:354-362`), so every planned day since that start is filled
  with the first unfinished grade five lesson, and the calendar shows months of missed days.
- The family has one school year: `defaultTerms` gives about 39 weeks from the first start
  (`school/family/calendar.ts:96-104`), and after about 41 weeks `termOf` returns nothing. The weeks
  the year plan dates lessons against keep counting up from the first start (`school/record.ts:363`),
  so in a second year every lesson reads as long overdue.
- The record is safe: events hold lesson ids, not grades, and `childRecord` folds every grade at or
  below the child's (`family.ts:743-745`), so grade one to four progress stays and the map shows the
  earlier years behind the new one.

The design, which follows the rules the product depends on (events are appended and never updated,
progress and plans are worked out from them):

- A `moved-up` event records the new grade and the day it takes effect. The kid's row keeps its
  `grade` column as the current grade, updated in the same transaction as the event is appended,
  through `withFamily`, so every reader that reads the row keeps working and the history of grades is
  in the log.
- The plan is worked out per school year: `planChanges` dates a grade's default plan from the day
  that grade began, which is the kid's start for their first grade and the `moved-up` event's day for
  every later one. Planned days before the move stay planned against the old grade's lessons and are
  never shown as missed in the new one.
- The calendar gains a school year per `moved-up` event: `defaultTerms` is given the year's start,
  and the family's own changes to terms and holidays stay attached to the year they were made in.
  Siblings in different grades already share one calendar, and still do; a sibling who has not moved
  up keeps their own year's weeks.
- `week` (`record.ts:363`) counts from the start of the child's current school year, not their first.
- A route, `POST /api/kids/:kid/move-up`, taken by a parent of that family, refuses a grade that is
  not one higher than the current grade or not offered (see "Which grades are offered"). Moving down
  is the same route with the grade one lower, for a family that moved a child too early; it appends
  the same kind of event, and nothing already finished is lost.
- The home app offers the move when a child has finished the year review of their grade, and a parent
  can make it at any time from the child's settings. It is never automatic.
- On the map, the child's own land becomes the new year's, the road across the sea is inked when the
  new year's first world is stamped, and nothing already walked is redrawn.

Saved term choices made while a grade had no worlds of its own were read against grade four's worlds
(`yearOf` borrowing), and `chosen.ts:111-112` re-reads them by position once the grade's own worlds
exist. No family can have saved one through the product, since the picker has only offered grades
one to four, so we clear any saved choice for grades five and six in the change that adds them to the
run rather than writing a migration for choices nobody made.

## Which grades are offered

A grade is offered to families when its worlds are in the run and its lessons are written, and at no
other time. That one rule is the release switch for each grade: lessons land in batches while the
grade is not offered, nobody can add a child at a half-written grade, and no feature flag is needed.
It replaces every hard-coded list of grades:

- `school/family/privacy.ts:26`, `GRADES = [1, 2, 3, 4]`, which the add-a-child form uses
  (`apps/home/bar.tsx:236, 299`).
- `apps/home/catalogue.ts:9`, the same list, which throws away an Explore filter for any other grade
  (`catalogue.ts:36`).
- `engine/ui/games.tsx:72-78`, the games' grade chips, which offer a grade only when some game level
  covers it. No game level covers grade five or six today, and every band tops out at four
  (`school/games/activities.ts` and `shut-hands.ts:327-333`), so the chips stay at four until games
  are written for these grades, and a grade five child sees every game rather than none. The comment
  that the chips keep to one line (`engine/ui/games.css:90`) is checked at seven chips on a phone.
- `server/auth.ts:732-734`, which accepts grades zero to eight. It accepts only offered grades, so a
  child cannot be set to a grade with no lessons. The database column stays a plain integer
  (`server/db/schema.ts:74`), since the grades offered change with the corpus and a check constraint
  would need a migration for every new grade.

With grades capped at the offered ones, the fallback in `laneOf` (`family.ts:687-698`), which plans a
grade with nothing written for a track from grade one lesson one, is reached only for a track with no
lessons at the child's grade. It falls back to the nearest grade at or below the child's instead, and
the calendar's "Every lesson of this grade is on the calendar." (`apps/home/calendar-planner.tsx:742`)
is shown only when the lessons really are that grade's.

## Other platform changes

- `school/tracks.ts`: `DEFAULT_TRACKS` gains grades five and six (`tracks.ts:38-44`), and
  `defaultTracks` clamps to the highest grade in the table rather than to four (`tracks.ts:50-51`).
  With 36 lessons a term, physics (16 lessons at five, 15 at six) and grade six's chemistry (15) would
  end in weeks 48 and 45 at one day a week, since a lesson takes three planned days, so they run at two
  and every track ends inside the 39 teaching weeks. That is eleven days a week at five and twelve at
  six, which five weekdays cannot hold at two a day, so the weekday test
  (`school/family/__tests__/family.test.ts`) asks that no day hold more than its share rounded up and
  none be empty: two a day to grade four, as before, and three at five and six. Music keeps its turn
  in `TRACK_TURN` and lands on Tuesday.
- `engine/pack.ts` and `tools/__tests__/pack.test.ts:19`: the index is 51,930 bytes gzipped for 336
  lessons, about 155 bytes a lesson, against a budget of 60,000. At 504 lessons it is about 78,000, so
  the budget fails after about fifty more lessons. The index is read whole by every view, including
  the grown-up's map of every year, so splitting it by grade would change every reader. We propose
  measuring what `LessonFacts` (`pack.ts:141-156`) can lose first, and then raising the budget to the
  measured size of 504 lessons with a margin, recorded with its reason in the test.
- `school/assistant/adaptive.ts:5` tells the model the child's workbook is for "children of six", and
  `beadString.fits` catches every counting lesson whatever its grade (`school/adaptive.ts:380-393`).
  The age comes out of the prompt, and the adaptive tutor's grounds are matched by skill only.
- `school/tutoring-materials.ts:15-20` matches teaching material by lesson id or skill, so a grade
  six food web lesson carrying `nature.food-chains` would be shown the grade three frames. Material
  is matched by skill only within the grade it was written for.
- `school/games/dots.ts:72, 86, 115`: the counting helpers clamp to four, and `countFor`, `decoysFor`
  and `round` have no importer in production code. They are deleted.
- `school/family/morning.ts:78-85` already notes that its minute estimates make higher grades'
  lessons shorter than they are. Grade five and six lessons are longer to read, so the estimates are
  measured against the first families at those grades rather than extrapolated.
- `apps/home/school.ts:274` labels themed visits "Year N, term M" where every other surface says
  "Grade N"; it says "Grade".
- Copy: the site says "Ages 5 to 12" (`apps/site/index.html`, `apps/site/page.tsx`,
  `school/worlds/sample.ts`), as the owner decided on 29 September 2026, replacing the "5 to 14" set
  the day before; `CLAUDE.md` and `product.md` say five to twelve too.

## New drawings

The shelf has 632 drawings and most of what grades five and six need. These are missing, and gate
the lessons that use them:

| Drawing | What it draws, and the settings a question varies | Lessons |
|---|---|---|
| Cube stack | a cuboid of unit cubes, `l`, `w`, `h`, with any layer hidden or shown as a count | g5 volume, g6 prisms and cylinders, the painted cube puzzle |
| Labelled circle | centre, radius, diameter and the curve round, any of them hidden, and a sector | g5 circles, g6 circle area, g6 cylinders |
| Angle sum | a triangle or quadrilateral with its angles marked, one unknown, and parallel lines cut by a third | g5 angles |
| Factor tree | a number split into factors down to primes, any branch blank | g5 multiples and factors |
| Ratio table | two or three rows of equivalent ratios, any cell blank | g6 ratio, g6 direct and inverse proportion |
| Line graph with any scale | the existing line graph, which stops at 20 (`engine/parts/data/linegraph.ts`), extended to any step, decimal and negative axes | g6 proportion, speed, temperatures |
| Scale drawing | a plan on squared paper with a scale bar | g6 scale |
| Moved shape | a shape and its image under a translation, reflection or rotation on four quadrants | g6 scale and enlargement |
| Outcomes grid and probability tree | every pair of two events, and a two-stage tree with fractions on its branches | g6 probability |

Each follows the shelf's rules in one change: its file under `engine/parts/<family>/` with at least
two labelled takes whose boxes are whole squares no wider than 36 and no taller than 46, a motion or a
still-reason (a drawing that carries a reading is still), its loader in `CATALOG`, its `GROUPING`
entry with its shelf, ideas and words, and every setting a question varies as a number
(`catalog.test.ts:124-179`, `shelf.test.ts:18-28`, `layout.test.ts:486-513`). Extending the line
graph changes a drawing grade four lessons already use, so every lesson that uses it is reverified and
its medium baseline left unchanged.

The sixth year's worlds need their own drawings, listed under "The sixth year".

## Writing the lessons

Lessons are written in batches of one subject and one grade, in the process that wrote the catalog
([leftover/catalog.md](leftover/catalog.md), section 3, and the rubric in
`.scratchpad/leftover/catalog-balance/standard.md`), and each batch clears these before it lands.
What the tests enforce and what is checked by hand are kept apart, because several rules the catalog
followed live only in scratchpad scripts:

Enforced by `npm run check`:

- The header names `grade`, `unit` and `subject`. Without them `compile.ts:190-192` quietly falls
  back to grade one, no unit and maths.
- No errors and no warnings. The corpus allows exactly two warnings (`corpus.test.ts:17-30`).
- The file is in canonical form (`notation.test.ts:9`).
- Measured difficulty rises from easy to medium to hard, and every level asks something
  (`levels.test.ts:56-78`).
- No scene is wider than 37 squares at any level, none is more than four rows taller than its
  drawing, and wide slack is held by a ratchet (`layout.test.ts:340-472`).
- A lesson's file is at most 50,000 bytes gzipped, and the index within its budget.
- Voice: the guide's lines (hints and feedback) avoid the first person, a guide's name, relational
  phrases, exclamation marks and em-dashes (`school/voice.ts`, `check-voice.ts:24-60`).

Checked by hand, until they are checks:

- A lesson prints to exactly the sheets it lays out, at most five child sheets, and no level more than
  one sheet over medium (the scratchpad's `check:print`).
- No filled-in hint contains the answer for any version.
- The two stretch questions are there, the three-star one is not the practice item again, and the core
  carries a second reasoning question (above).
- Word-only questions: `WORDS_ONLY` is a ratchet at 1,158 (`tools/__tests__/voice.test.ts:53, 93`).
  A grade five or six reading or writing question with nothing drawn to point at raises it, so a
  batch either draws something or raises the ratchet with its reason.
- A second reader goes through every version against the checklist in `leftover/levels.md`.

`npm run levels:baseline` is run as each batch lands, and its diff holds only additions. Whole-corpus
verification grows with the corpus, about one and a half times its current time at 504 lessons; the
suites run in minutes today and we have not measured where they would pass the twenty minutes the
batch notes set.

## Tests

The tests that hold four grades, and what each becomes:

- `engine/notation/__tests__/corpus.test.ts:151-154`: fifteen maths lessons in each grade, over every
  grade in the corpus rather than one to four.
- `engine/notation/__tests__/verify.test.ts:284`: at least three art lessons a grade, likewise.
- `school/worlds/__tests__/worlds.test.ts:158, 193, 200, 506`, `written.test.ts:65, 192, 206-237`,
  `journeys.test.ts:23, 32, 67-70`, `apps/home/__tests__/worlds.test.ts:23` and
  `school/family/__tests__/family.test.ts:255-257, 420`: over the offered grades. `written.test.ts`
  visits the canal town through the path for a year with no lessons, which it will no longer take
  once grade five is written; the test keeps a year with no lessons by using a grade nobody offers.
- `school/games/__tests__/catalogue.test.ts:37`, which holds every game band at four or below, stays
  until a game is written for grade five.
- `tools/e2e/map.e2e.ts:99`: 41 places.

And new ones:

- A world with a term site that is also in the run names the same grade and term in both.
- Every run world has at least one reach that a lesson in its own term matches, by `termOf`, and
  every lesson lands in the term its own unit names. Both are `tools/__tests__/reaches.test.ts`.
- Every glimpse points at a later run world, and the drawing it names is on the horizon.
- Every grade in the run has exactly nine maths units, so exactly three terms.
- Every view's country bounds equal the tiles' bounds, for a child at every offered grade and for a
  grown-up, which is the check that would have caught a conditional sheet.
- A child moved up has no missed days before the move, their earlier progress is unchanged, and the
  calendar's second year starts on the move's day.
- End to end, a child at grade five and one moved up from grade four each open their own year's map,
  journal and calendar.

## Edge cases

1. A child at a grade with no worlds: today `yearOf(5)` borrows grade four's worlds, and the journal
   shows one stretch of the mountains with the "Still to come" card (`apps/kids/views.ts:180-205`).
   With grades offered only once their worlds are in the run, this cannot be reached through the
   product; the server refuses it.
2. A child at grade five whose map opens on the meadow: `journey()` finds no grade five place and
   falls back to index zero (`rewards.ts:229-236`). Fixed by the fifth year being in the run.
3. A partly written grade: lessons land while the grade is not offered, and track places host every
   lesson of their subject in every year, so a grade four child's marsh could show a grade five
   nature lesson as a place ahead. `hostedLessons` takes only lessons of offered grades.
4. A fourth term: a grade whose maths used a tenth unit would put lessons in a term with no world.
   The nine-unit test prevents it.
5. The island's road: a grade four child sees the far shore across the sea with the road not inked,
   and the canal town closed. Inking waits for the canal's stamp or the island's moment, as now.
6. The last year: the moon has no glimpse and no road onward, the sixth year has no sail, and the
   moon's moment is the last on the map. The moon takes the island's `promise`.
7. A family that chose a world for a grade five term before grade five was offered: none can exist
   through the product, and saved choices for grades five and six are cleared when each is added.
8. A family that puts a sixth-year world in a first-year term, or the reverse: allowed, as for every
   run world today, since `mayStand` keeps any of them in any term.
9. A child moved up in the middle of a term: the old grade's planned days before the move stay the old
   grade's, the new grade's plan starts on the move's day, and the new year's first term begins then.
10. A child moved up and then back down: both moves are events, the later one wins, and nothing
    finished in either grade is lost, since progress is folded by lesson.
11. Siblings in different grades: one calendar, as now; each child's weeks count from their own
    current school year.
12. A grade seven or eight child from before the server was capped: none exist, since the form offered
    one to four. The server's cap is changed with a check that no kid row is outside it.
13. A grade five lesson that reuses a grade three skill: it matches the same reaches, which is wanted
    (a lock still lights for capacity), and it no longer draws the grade three teaching frames.
14. A world file edited for a word: the tile test fails until the tiles are rebuilt. Every world change
    for both years is batched into one change for that reason.
15. The grown-up's whole-country map for a family with a child in each of grades one and six: every
    year's land, each child's own land framed on their own map, and one set of bounds.
16. Printing: the "Grade N" strip (`engine/pack.ts:205-211`) and `gradeName` (`school/family/names.ts:21-22`)
    take any number, and nothing in print depends on grade beyond that.
17. Music played to a beat: `check music.rhythm` takes a `grade`, and grades above two get the narrow
    window (`engine/sound/beat.ts:118`), which suits five and six.
18. The weekly letter: it takes the grade and never shows it, and no mail template names a grade, so
    nothing changes; detailed letters stay opt-in as the rules require.

## Order of work

Each step lands green on its own. The tile rebuilds are marked, since each is eight minutes and a
31 MB commit.

1. Platform. Grades offered from the run; the server's cap; `DEFAULT_TRACKS` for five and six and
   music's weekday; `laneOf`'s fallback; the adaptive prompt and teaching material; the index budget;
   themed visits keyed by grade; the dead helpers deleted; the tests that hold four grades changed to
   the offered grades. No grade is offered yet, so nothing a family sees changes.
2. Moving up. The `moved-up` event, the kid row updated with it, plans and calendars per school year,
   the route and the home app's offer. Tested with a grade three child moved to four, since five is
   not yet offered.
3. The map (one tile rebuild). `SHEET` grown north, the far shore deepened and furnished, the sixth
   year's land, region, slots, routes and sails, the three new worlds with empty paths and `needs`
   sentences, the glimpses and the island's lines, `promise` moved to the moon, the dead map code
   deleted, and the bounds test. Measured on the iPhone profile before it lands.
4. Drawings. The maths drawings in the table, then the sixth year's world drawings.
5. Grade five lessons, in batches of one subject: maths first, since every other subject hangs off
   it, then physics, chemistry, reading, writing, coding, art, music, nature. Each batch quotes the
   standards it meets.
6. Grade five offered (one tile rebuild). `DEFAULT_YEARS[5]`, the reaches checked against the lessons,
   the `needs` sentences deleted, the copy, and the end-to-end tests for a grade five child and a
   child moved up.
7. Grade six lessons, in the same order.
8. Grade six offered (one tile rebuild), as for grade five.

## Decisions for the owner

- The second reasoning question in the core of every grade five and six maths lesson, which costs
  sheets; the five-sheet limit holds, so a core question comes out to make room.
- Whether the far shore's coast is reshaped to be deeper, which moves no world but changes the tiles.
- Whether grade six coding waits for a text editor, which [coding.md](coding.md) would plan, or reads
  text and answers in blocks as proposed.
- The index budget: raised to the measured size, or the index split by grade.
- The ages in the copy: 5 to 11 with grade five and 5 to 12 with grade six, as proposed.

## Sources

To be quoted from, batch by batch, in the manner of [audit.md](audit.md):

- Japan, Ministry of Education (MEXT), Course of Study for Elementary Schools (2017): mathematics,
  science, Japanese, arts and crafts, music, and programming education in the elementary school.
- Singapore, Ministry of Education, Primary Mathematics Syllabus (2021), Primary 5 and 6, and the
  Primary Science Syllabus.
- Russia, the Federal State Educational Standard for basic general education, and the fifth and sixth
  grade mathematics textbooks by N. Ya. Vilenkin and by S. M. Nikolsky.
- England, the national curriculum programmes of study for Key Stages 2 and 3.
- US, the Common Core State Standards for Mathematics and for English Language Arts, grades 5 and 6,
  and the Next Generation Science Standards, grade 5 and middle school.
- Math Kangaroo, past papers for levels 5 and 6.
