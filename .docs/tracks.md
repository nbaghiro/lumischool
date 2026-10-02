# Tracks

Status: design proposed and five tracks built, September 2026. This document defines a track, says
how tracks coexist with grades and units, lists what the data and the map need from them, and sets
out the track list with the fifteen lessons each one ends with. It is written alongside
[curriculum.md](curriculum.md) rather than replacing it: the owner reconciles the two.

Built: physics, chemistry, reading, writing and coding, fifteen lessons each, seventy five lessons
and a hundred and seventeen items, on sixteen new drawings. Coding was since rebuilt and grown to
thirty one lessons on seventeen drawings of its own, with a program model, a runner and a block
editor, which [coding.md](coding.md) describes. Physics was since grown to thirty one lessons on
twenty three more drawings, which [physics.md](physics.md) describes. Chemistry was since grown to
twenty eight lessons on thirty drawings, which [chemistry.md](chemistry.md) describes. Music belongs
to the sound work. Nature, the first of the three tracks proposed at the end of the track list, was
agreed on 15 September 2026 and its first grade is built; the other two wait on a decision.
What the tracks need from the map, from the year model and from `Progress` is stated below and is
not built, because `space/` is being reworked at the same time.

## What a track is

A track is one subject, from the first lesson a child meets in it to the last, across grades one to
four. It is the answer to "where is my child in physics", which is a question nothing in the
product can answer today, because the only thing we can currently say is "where is my child in
grade two".

The three words are easy to confuse, so they are worth pinning down.

A grade is a year of the child's life. It is a horizontal slice through every track: grade two is
everything a child meets in their second year, in maths and in physics and in reading. It is the
unit a family buys, plans and prints a week from, and it is the unit the map draws.

A track is a vertical column. It is one subject in the order that subject has to be learned, and it
crosses all four grades. It is the unit a child progresses along and the unit a parent turns on or
off.

A unit is a topic inside a track: two to five lessons that share one idea. "Electricity and
magnets" is a unit of the physics track, and it happens to sit inside grade three. A unit belongs
to a track first and lands in a grade second.

So a grade and a track are two axes of the same set of lessons, and a lesson sits at one point on
each. A lesson already declares `grade`, `unit` and `subject`, which is enough to place it on both
axes; what is missing is anything that describes the column itself.

### Maths is one track of sixty

Maths is one track, not four. A track is a subject across the four years, and "grade two maths" is
not a subject; it is a year of one. A child's place in maths is one place, and their place in the
track is what review and prerequisites are computed from.

The alternative is to make a track a fixed size, fifteen lessons, and then maths becomes four
tracks of fifteen. We reject it for two reasons. It would mean a child is current in four maths
tracks at once, which is not true of them, and it would make the word "track" mean "a term's worth
of one subject", which is a unit of packaging rather than a unit of learning.

That leaves the two shapes coexisting, and the honest statement is that a track's density is a
property of the track:

| Track | Built on 15 September 2026 | Target | Per grade |
|---|---|---|---|
| Maths | 60 | 60 | 15 |
| Physics | 48 | 48 | 12 |
| Chemistry | 48 | 48 | 12 |
| Reading | 36 | 36 | 9 |
| Writing | 36 | 36 | 9 |
| Coding | 36 | 36 | 9 |
| Art | 24 | 24 | 6 |
| Music | 24 | 24 | 6 |
| Nature | 24 | 24 | 6 |

The targets are the grid agreed on 15 September 2026 and set out in [curriculum.md](curriculum.md)
("The grid: 28 lessons a term"): a fixed number of lessons per subject in every term, 28 a term and
336 in all, which the batches now being written fill in.

Maths is dense because it is the spine of the year and because arithmetic does not wait: a child
who skips a fortnight of it loses ground. Physics was planned at four lessons a year because four
good physics lessons a year is what a seven-year-old can actually absorb alongside everything else,
and because we would rather have fifteen lessons that each need a drawing worth looking at than
sixty that do not. It has since grown to between seven and nine a year to reach the strands the
frameworks put in these years, and [physics.md](physics.md) leaves the density to the owner.

A consequence worth stating: a year is no longer fifteen lessons plus some extras. Grade two is
fifteen maths lessons and about twenty-three others, so a family doing everything is doing two
lessons in most weeks. That is a scheduling fact the parent has to be able to see and change, and
it is the main reason a track needs to be switchable.

### What a family sees when they open a track they have not started

The same promise the year makes in [product.md](product.md), applied to a column instead of a row:
the whole track is visible from the start, including the parts that are locked.

Concretely, a track that has not been started shows a picture from its own art, a paragraph saying
what the track is for and what it assumes, all fifteen lessons grouped into their units with the
grade each one sits in marked on it, the first lesson open and the rest locked behind the one
before, and a plain statement of size, which for a fifteen lesson track is about four lessons a
year. A parent deciding whether to start chemistry this year is deciding about a commitment of
four lessons, and they should be able to see that before they start rather than after.

What a track must not show is a lock it cannot explain. Where physics grade three assumes the
grams and kilograms lesson from maths grade two, the lock says so and a grown-up can open it
anyway, which is the rule the year already follows.

## How a track appears in the year, on the map and to a parent

Another agent is reworking the map, so this section states what a track needs from the map rather
than proposing a map.

A track needs a lane of its own. Today a lesson outside maths is placed by hanging it off a maths
lesson as a `branch`, with an `aside` label, and the offsets in `years.ts` exist to stop two
subjects leaving from the same lesson. With one or two strands that works. With seven tracks, every
third maths lesson carries two or three asides, and the drawing becomes a maths path wearing a
fringe. A track is not an aside from maths; it is a peer of maths that happens to be shorter.

A track needs one marker that is stable across all four grades. A child should recognise physics by
its colour in grade one and in grade four, which means a marker is a property of the track and not
computed from a unit number, as it is today.

A track needs a collapsed form. Sixty lessons already crowd the map, and the fix cannot be to draw
a hundred and fifty. The map already has levels of detail, so what a track needs is to exist as one
object at the far zoom: a named lane with a count and a position along it, which opens into its
lessons when the family zooms into it or picks it.

A track needs a view along itself, not only across the year. "Fifteen lessons, four grade bands,
you are on the fifth" is a different picture from a year map and it is the one a parent asks for
when they ask how physics is going.

A track needs to be able to be off. A family not doing chemistry this year should see a map without
chemistry, and nothing in another track may become locked because of it. This falls out of the rule
that a track only ever depends on maths and on itself, which is stated below.

A track must not need a week number to be placed. Today a non-maths lesson gets `week = step * 4`,
which is a placeholder that says "spread these out". Ordering inside a track is the track's own and
it is total; which week a family does lesson four in is the family's. The map should place a track
lesson from its position in the track, and the calendar should come from the plan, not from the
content.

For a parent, the week does not change shape. Monday still prints as a page or two. What changes is
that the weekly note has a line per active track rather than one line, and that the place a parent
goes to change the plan is the track list: turn chemistry off, move physics to once a month, bring
reading forward.

## What the data needs

### The track is the subject, and it gets a file

`subject` on a lesson is the track. We considered putting a `track` above `subject`, so that several
subjects could sit in one track, and rejected it because nothing we plan to build needs it: physics
is both the subject and the track, and an extra level would exist only to be filled in with the
same word twice.

What is missing is a declaration of the track itself. Today a unit's name is derived in
`space/years.ts` by taking the title of the first maths lesson in the unit, which works only
because maths units are contiguous runs of maths lessons. A track needs somewhere to say its title,
its one-line description, its marker, and the name of each of its units. That is a new root node in
the notation beside `item`, `lesson` and `define`:

```
track physics v=1 marker=sky {
  title "Physics"
  about "Forces, heat, light and motion, measured with the instruments on the shelf."
  needs maths
  unit 1 "Push and pull"
  unit 2 "Heavy, hot and fast"
  unit 3 "Water and light"
  unit 4 "Circuits and magnets"
  unit 5 "Measuring motion"
  unit 6 "Balance and moments"
  cover physics.push-pull
}
```

Nothing in this document depends on that file existing, because every lesson still declares its own
grade, unit and subject, and a track can be derived from its lessons in the meantime with unit
names missing. The tracks below are built without it, and the file is the next piece of core work
rather than a prerequisite.

### Unit numbers become track-scoped

A unit number has to be unique within a track and increase across grades, because "physics unit 1"
must mean one thing whether it is read in grade one or grade three. The tracks below are numbered
that way: physics units run 1 to 9 across all four grades.

Maths keeps per-grade unit numbers for now, because sixty lessons carry them, three tests name them
and the map draws rows from them. It is an inconsistency and it should be resolved by giving maths
continuous unit numbers too, but that is a change to content the owner owns and it is not a
prerequisite for anything here.

### What has to change in the year model

The year is still derived from content by grade, and that stays right: a year is the slice. Four
things in `space/` need to change, and none of them are in this work's scope.

`Progress.current` is a single lesson id. With seven tracks a child is current in seven places at
once, so it becomes one current lesson per track. This is the change with the most behind it: the
next-lesson calculation, the "you are here" marker and the morning plan all read it. The worlds
now take the lessons the plan's days put the child on, one for each track that is on, for the "you
are here" marker and the roll's today (`now` in `school/worlds/rewards.ts`, 17 September 2026);
`Progress.current` itself is still the maths path's next lesson.

`Year.units` holds maths units only, and unit titles are inferred from the first lesson in the
unit. Units become a property of a track, and their titles come from the track rather than from a
lesson.

`hostsOf` and the `branch` and `aside` fields exist to hang a strand off the maths path. They are
replaced by a lane per track. A track lesson keeps a position in its track and loses its pretend
attachment to a maths lesson.

Prerequisites need one rule so that turning a track off is safe: a track lesson may depend on the
lesson before it in its own track and on a maths lesson, and on nothing else. Physics may wait for
maths grade two grams and kilograms; chemistry may not wait for physics. Without that rule, a
family that turns one track off silently locks another.

### Registry

`lesson.subject` gains `physics`, `chemistry` and `coding`. Those are additive entries in
`lang/registry.ts`. `coding` is added rather than reusing the existing `computing`, because the
track is about writing and reading programs, which is narrower than the school subject called
computing, and because a name a child would use is better than a curriculum word.

## The track list

Ten tracks are given: maths, coding, physics, chemistry, reading, writing, music, nature, history
and language. Two more are proposed, and each of them is proposed on the same test: the art is already drawn, the
engine needs nothing new, and a child would choose it.

**Maths**, sixty lessons, built. The spine. Nothing here changes it.

**Physics**, thirty one lessons, built and described in [physics.md](physics.md). The shelf carried
it almost entirely from the start, which is why it went first: the
balance and the masses are weight, the spring scale and the dial are force, the thermometer is
heat, the race track and the road distances are speed and distance, the fuel gauge is a rate, the
day and night sky is the moon, and the pond and the seasons are the observation a grade one lesson
starts from. What it lacked was the apparatus that shows a force rather than measuring one, which
was seven drawings listed below; twenty three more were drawn when the track grew, for sound,
light, the sky, circuits and machines.

**Chemistry**, twenty eight lessons, built and described in [chemistry.md](chemistry.md). It
started as fifteen lessons on a beaker, particles in a jar, a filter funnel and a burner, and was
rebuilt on thirty drawings to cover what England's Years 2 to 5 and the NGSS for grades 2 and 5
ask for: materials and their uses, the three states, dissolving and separating, changes that can
and cannot be undone, acids and alkalis, the water cycle, rocks and soils, and atoms as a grade
four stretch.

**Reading**, fifteen lessons. The largest single category on the shelf, seventeen drawings, is
reading and phonics, and none of the maths sixty uses it. The track exists partly to spend that
art. The reason the reading lessons we have today feel thin is not the art, it is that a passage is
currently set as plain wrapped text with a choice under it, which looks like a form; the track adds
one drawing, a page of prose with ruled and numbered lines, so a reading question looks like
reading.

**Writing**, fifteen lessons. Writing is the track where we have to be honest about the answer
model: a sentence a child writes is judged by a grown-up, not by us. So the track is built around
the parts of writing that are decidable, which is more of it than it first appears: which word is
in the wrong column, which mark ends this sentence, which of two sentences joins with "but", where
the comma goes, what order the three sentences go in. The pages that collect real writing say
plainly on them that the grown-up is the marker, which is the rule in
[product.md](product.md).

**Coding**, thirty six lessons, built and described in [coding.md](coding.md). The clearest path
upward in the whole set. It started as fifteen lessons about reading programs, and was rebuilt so a
child runs, arranges and writes programs on screen and on paper, with events, decisions, names, a
block of one's own, and programs that make a picture, a dance or a tune.

**Music**, ten lessons, specified in [sound.md](sound.md) and owned by the sound work. Listed here
only so the shape of the set is complete.

**Nature**, twenty-four lessons planned and eight built, agreed on 15 September 2026 from the
proposal that stood here and described under "Nature" below. The nature category is the second
largest drawing set we have and was almost unused: one tree through four seasons, leaves,
minibeasts, birds on a wire, a pond, how a plant grows, a labelled plant and a labelled fish. Add
the animals, the tree and the flowers from the story set and a child can be asked to count, sort,
order, label and follow a life cycle, and the first six lessons needed no new drawing, only a
setting on two of them.

**History**, forty eight lessons planned in [history.md](history.md): a world strand the same for
every family, and one national unit a grade for the country the family chooses. It is a track from
30 September 2026, hosted at the old tower, at one day a week from grade one.

**Language**, a second language, hosted at the ferry town, at one day a week from grade one. The
language is chosen per child by a grown-up on the child's card: Spanish is written first, then
French and Japanese. A child with no language chosen is offered no language lesson, and the ferry
town says that a grown-up chooses the language first. Each language lesson is written once, as a
concept, and filled from the chosen language's phrasebook, so a lesson is offered in every language
whose phrasebook holds its phrases ([notation.md](notation.md), "Phrasebooks and language
variants"); [language-coverage.md](language-coverage.md) lists which lessons each language has.

The track has fifty lessons: six a grade at grades one and two, nine at grades three and four and
ten at grades five and six, in the order a primary foreign-language course takes it: greetings and
names, numbers, colours, family and animals, food and the market, the town and directions, time, days
and months, weather and seasons, describing people and things, and then opinions with reasons,
questions, and a short text read and written by grade six. The fourteen added on 1 October fill what
England's key stage 2, Japan's course of study and CEFR A1 and A2 expect and the first thirty-six did
not have: school things, shapes and clothes at grade three; the timetable, wild animals and how one
travels at grade four; what one can do, a day by the clock, a clothes shop and where one wants to go
at grade five; and jobs, the doctor, a holiday told in the past and plans for next year at grade
six. Grades one to three mark a typed word without minding its accents and grades four to six with
them; a dictation always minds them. Each lesson's grown-ups note quotes the line it meets in
England's key stage 2 languages programme, Japan's foreign language activities (grades 3 and 4) or
foreign languages (grades 5 and 6), and the Council of Europe's CEFR A1 or A2 descriptors. A spoken
answer is marked by a grown-up against a notice list (`reading.recited`), a written text by
`writing.by-eye`, and a heard sentence by the dictation checker, where the grown-up reads the phrase
from the grown-ups' sheet and the device's own voice is a second channel ([sound.md](sound.md)).
Spanish is written for all fifty lessons, in Castilian as it is spoken in Spain; French and
Japanese have no phrasebook yet. The fourteen lessons of 1 October are shared whole, their two-star
questions included, so a phrasebook alone offers them in another language. Of the first thirty-six,
thirty-two are shared concepts with Spanish written only
for their two-star question where it asks why Spanish builds a phrase its way, and four (a colour
with its noun, telling the time, a friend's character, and the present tense) are written wholly
for Spanish, since how a language does these is its own.

### The default week

`DEFAULT_TRACKS` in `school/tracks.ts` is the week a child starts from at each grade. From grade one
it adds history and a language at one day a week each to the paces above. A language plans nothing
until one is chosen, since its lane is empty until then. The kindergarten year, grade 0, has its own
light week: every track one day each, two subjects a day.

Each track leans towards its own part of the week (`TRACK_TURN`), so the default spreads rather than
piling onto Wednesday; the rule the tests hold is that no weekday of any grade's default is empty or
holds more than its share rounded up. History leans to Friday and a language to Monday. No single
turn per track keeps that rule at every grade once ten tracks are on, so `TRACK_TURN_AT` turns a track
its own way at one grade: nature at the kindergarten year, which would otherwise share maths's
Wednesday and leave Friday empty, and language at grade six, which would otherwise make Monday a
fourth subject.

### Proposed, for approval

**Maps and journeys**, fifteen lessons. The map grid, the map with a scale, the road distances, the
signpost, the ticket, the departure board, the train and the coordinate grid are all drawn. The
argument against it is that half of it is maths in a hat: scale is multiplication, a timetable is
elapsed time. The argument for it is that the other half is not, and that a map from above, a
route, a grid reference and a direction are a real skill a child enjoys. We would build it after
nature.

**Puzzles and thinking**, fifteen lessons. Matchsticks, the number pyramid, the balance, the Venn
and Carroll diagrams, sorting rings, the spinner, dominoes, playing cards, a row of heads and the
function machine are all drawn, and a code-checked puzzle already proves it is solvable before it
ships. This is the track a child does for pleasure, which is worth having as its own thing rather
than as one sheet a year inside maths. The argument against is overlap with the maths puzzle
sheets, and the answer is that the maths puzzle sheet stays where it is and this track takes the
logic, deduction and crossing problems that maths has no room for.

### Considered and not proposed

Time and money as their own tracks. Both are drawn well and both are maths. Moving them out would
weaken the maths track without making a new one.

Art and pattern. This was turned down because almost every answer would be a judgement rather than
a fact. That stays true of a free painting, but more of art can be proved than we thought: what two
paints make, a tint or a shade, which half finishes a mirror, which way a print faces, which layer
of a landscape is furthest away. Art now has eighteen lessons, four or five in each grade, each with
ten or more questions in the three bands of [audit.md](audit.md), where the machine proves those
questions with a paint model that mixes as pigment does and a grown-up responds to a painting or two
a lesson, made with the painting tool or with real paint. It is counted as a subject
with lessons rather than one of the seven tracks until that is decided; [art.md](art.md) has the
plan, the tool and the lessons.

The human body, and weather as its own track. Neither has the art. Weather is partly covered by
physics, where the rain comes from, and by nature, the seasons.

## Content plan for the worlds that wait for lessons

Thirty-eight worlds stand on the map. Five of them have no lessons of their own yet (the garden, the
old tower, the canal town, the observatory and the old city), and the places off the run hold only
the lessons the corpus already has. This section is the plan for each, so that no world is filled
with invented lessons before the real ones are written. We wrote no sample lessons in this pass, for
the reasons given under each heading.

What each place off the run holds today, by subject or by lesson id in its `site.hosts`:

| Place | What its lessons are | Lessons now |
|---|---|---|
| The marsh | science, and floating, heat, water and ice | 6 |
| The park | music | 24 |
| The ferry town | a second language | 50 |
| The painter's hut | art | 24 |
| The old tower | history | 0 |
| The coral reef | sea life and arrays | 6 |
| The crystal caves | sound, light and crystals | 8 |
| The cloud islands | weather and the sky | 6 |
| The long grass | small things up close | 4 |
| The fossil cliffs | rocks and deep time | 4 |
| The oasis | water and the sun | 6 |
| The lamp rocks | coding, first steps | 18 |
| The clockwork island | coding, loops and decisions | 17 |
| The book island | reading and stories, and the thinking lesson | 36 |
| The printing works | first writing, and what things are made of | 23 |
| The post office | letters, postcards and poems | 18 |
| The windmill island | electricity, magnets and machines | 10 |
| The treetops | forces and motion | 13 |
| The salt flats | dissolving and separating | 8 |
| The geyser valley | heat, changes and acids | 8 |

No lesson is held by two places. The shadow lesson moved from the marsh to the oasis when the oasis
was built, since the oasis is where shadows tell the time.

Every lesson outside maths now has a place. The nine places further off took the 135 that had none:
the coding lessons of the first two years and of the last two, every reading lesson but the one on
signs, which stays at the oasis, the writing lessons of the first two years and of the last two, the
physics lessons split between forces and motion and electricity and machines, and the chemistry
lessons split between materials, dissolving and heat. Each place splits a track where the lessons
change kind, so a child in the first years reaches a moment without waiting for the fourth. The
lessons each place still wants are in its `needs`.

### History, for the old tower

A history strand of twelve lessons, three a year from the second year to the fourth and three for a
fifth: putting events in order on a timeline, then and now in two pictures of one street, reading an
old map with its compass and grid, reading an old letter and its date, and how a place changed, told
through the tower's courses of stone laid in the order things happened. The sequence strip, the grid
map, the compass, the sign and the tower are drawn; a page of old handwriting is not.

We did not write sample lessons, because a strand of its own cannot be added without moving lessons
that are already in a term. The year builder spreads a grade's tracks through its units, and a
simulation that added one or two history lessons to each of grades 2 to 4 moved these, whichever
number we tried:

- Grade 2: music-piano-loud-soft from term 2 to 3, physics-floating-and-sinking from 2 to 1,
  physics-where-a-shadow-comes-from from 3 to 2, writing-words-that-describe from 2 to 1, and
  writing-question-and-exclamation from 3 to 2.
- Grade 3: physics-magnets from 2 to 1, physics-a-loop-with-a-break from 3 to 2,
  writing-fix-the-robots-sentence from 1 to 2, and writing-planning-three-sentences from 2 to 3.
- Grade 4: physics-levers-and-wheels from 2 to 3, reading-puzzles from 2 to 1, and
  reading-what-it-does-not-say from 3 to 2.

This needs a decision: either those moves are accepted, and each world's reaches are checked again
against the terms the lessons land in (the reach test does that), or the year builder keeps a term's
existing lessons where they are when a strand is added, which is a change to `src/space/years.ts`.

Decided, 28 September 2026: the owner chose to fix this in the year builder. The moves above came
from the old rule in `hostOf`, which placed each strand lesson by how far it was through its strand
across the whole year and ignored the unit the lesson declares, so a lesson's term shifted whenever
its strand grew or a strand was added. `hostsOf` in `school/year.ts` now hangs a strand lesson off a
maths lesson of the term its own unit names (units one to three, four to six, seven to nine), with
that term's lessons of the strand spread along the term's maths lessons in order and a small offset
per strand, kept inside the term. A lesson with no unit keeps the old spread. Adding a strand now
moves no lesson between terms, since each lesson's term comes from its own unit; it can only change
which maths lesson in the term a lesson sits beside.

Measured before the change, the lessons outside maths that landed in a term other than their unit's
were 34 of 69 in grade one, 37 in grade two, 27 in grade three, 27 in grade four and 10 in each of
grades five and six. All of them now land in their own term, and the grades one to four moved these
many between worlds:

- Grade 1: 14 from the harbour to the meadow, 8 from the railway to the meadow, 9 from the railway to
  the harbour, and 3 from the harbour to the railway.
- Grade 2: 17 from the kitchen to the woods, 3 from the town to the woods, and 17 from the town to
  the kitchen.
- Grade 3: 5 from the sports ground to the night sky, 13 from the laboratory to the sports ground, 7
  from the night sky to the sports ground, and 2 from the laboratory to the night sky.
- Grade 4: 7 from the open sea to the mountains, 12 from the volcano island to the open sea, 4 from
  the mountains to the open sea, and 4 from the open sea to the volcano island.

The units then written into the first four grades leaned early, so under the new rule their terms
came out uneven: grade one held 49, 11 and 9 lessons a term outside maths (it was 27, 19 and 23),
grade two 33, 23 and 13, grade three 23, 33 and 13, and grade four 21, 33 and 15, while grades five
and six hold 23 a term. The `unit=` of every grade one to four lesson outside maths was then set to
the unit of the maths lesson the old rule hung it from, so each stands in the term it already stood in,
the moves listed above are undone and no family's map moved. `tools/__tests__/reaches.test.ts` holds every lesson to its own term and every run
world of grades one to six to at least one landmark lit by a lesson of its own term.

### A kindergarten year, for the garden and the long grass

The owner decided on 30 September 2026 to build the kindergarten year and offer grade 0. The
garden is the year's one world, `0: ["home-garden"]` in `DEFAULT_YEARS`, so the year has one term
(`termsAt` in `school/year.ts`) and every unit of its lessons stands in the garden. It opens the run
on the map at slot 0.1, on the first year's land, and a child moves up from it to grade one as from
any grade. Like every grade it is offered only once it has lessons, so grade 0 appears in the
add-a-child form, as "Kindergarten", when the kindergarten lessons land.

The year has seventy-five lessons, `lessons/k-01` to `k-75` with ids `k-<slug>`, a small version
of the later grades in shape, weighted the way an early-years year is: maths 11, reading 9, writing
7, nature 7, music 6, art 6, coding 6, physics 6, chemistry 6, history 6 and a second language 5.
Every subject is a strand that returns through the year, and each lesson after a strand's first is
a step on from an earlier one, which its grown-ups note names. The plan and the inventory of what
the first fifty taught, which the last twenty-five were chosen against, are in the batch's
`PLAN.md` under `.scratchpad/grades56/kindergarten/`.

- Maths: dots at a glance, counting to five, a ten frame, more, fewer and the same, number bonds to
  five, a bead string, shapes and colours, in, on, under and next to, sorting into rings,
  repeating patterns, measuring with cubes and hands.
- Reading: first sounds, who is in the story, a picture story in order, sound buttons, reading
  little words, a book of facts, rhymes, beginning, middle and end, listening for first sounds with
  more letters.
- Writing: zigzags and waves, the first strokes, ladder letters, writing a list, labels and the
  first letter of my name, a caption for a picture, the letters that start with a c.
- Nature: minibeasts, the weather and the seasons, animals and their babies, growing things, where
  animals live, my body and senses, looking after living things.
- Music: tap, shake and blow, clapping a steady beat, loud and quiet and high and low, fast and
  slow, clapping names, echoes.
- Art: printing patterns, mixing colours, rough and smooth in collage, a picture that tells a
  feeling, the same on both sides, drawing what you see.
- Coding: before and after, following arrow blocks, planning the path, finding the mistake, a
  repeat, if it rains.
- Physics: push and pull with floating and sinking, hot and cold, light and shadow, magnets, what
  the wind moves, rolling down a ramp.
- Chemistry: what it is made of, wet and dry, dissolving and sieving, what melts, squash, bend and
  stretch, cooking changes things.
- History: homes then and now, my family (`familytree`), how people travelled long ago, a special
  day we remember, lights long ago, then and now (`toys`, `thenandnow`).
- Language, through the phrasebook: hello and four colours, one to five, food words, family and
  animals, weather words.

A grown-up reads every question aloud, so the child answers by pointing, saying a number, picking a
picture or a letter, or writing a single letter or a three-letter label; the one exception is
reading little words, where reading the word is the child's job. Each lesson has easy, medium and
hard levels, and its grown-ups note quotes one early-years line: England's early learning goals,
Japan's 幼稚園教育要領, or China's 3-6岁儿童学习与发展指南, with any line not fetched from its source
marked as recalled. The lessons sit in units 1 to 9, seven to nine a unit, so the one term
alternates subjects and each strand comes back through the year: art in units 2, 4, 5, 7, 8 and 9,
chemistry in 1, 2, 4, 6, 7 and 8, coding in 2, 4, 5, 6, 8 and 9, history in 2, 3, 5, 7, 8 and 9,
music in 1, 3, 5, 6, 8 and 9, physics in 1, 2, 3, 5, 6 and 7, and the language in 3, 5, 6, 8 and 9.
Maths has a lesson in every unit, and the other strands hang off it.

The default week (`DEFAULT_TRACKS[0]` in `school/tracks.ts`) turns every track on at one day a
week, two subjects a day, and art is not planned, as at every grade. The garden's reaches light a
landmark for each subject, ordered so each lesson lights its own subject's. The long grass holds
the counting, number bond and measuring lessons, minibeasts and growing things; book island the
nine reading lessons; the printing works the seven writing lessons and the three materials lessons;
lamp rocks the six coding lessons; the cloud islands the weather and the wind; the treetops push
and pull and the ramp; the windmill island magnets; the crystal caves light and shadow; the salt
flats dissolving and sieving; the geyser valley hot and cold, what melts and cooking. Art, music,
history and the language reach the painter's hut, the park, the old tower and the ferry town through
the subjects those places host, and the other nature lessons reach the marsh.

### A fifth year, for the canal town, the observatory and the old city

The far shore's three worlds are the fifth year's terms. The canal town's term is ratio and
proportion (a lock's levels), volume and capacity, decimals to thousandths, timetables and reading a
real map. The observatory's is very large numbers and distances, the planets in order, angles and
bearings, light and shadow, and plotting points. The old city's is early algebra, the area and volume
of buildings, reading longer texts, and the history of a city, which the history strand would lead
into. The crystal caves and the fossil cliffs would take the very large numbers of years that
stalactites and rocks need. A fifth year is outside the product's ages today, which is the owner's
decision, so this stays a plan.

### Nature, weather, music and a second language

- The nature track proposed above is what the marsh is waiting for: living things, habitats, life
  cycles, the seasons, food chains and a tally of what is seen. The reef would take habitats and food
  chains in the sea, and the long grass minibeasts and their homes.
- A weather strand, inside nature or physics, is what the cloud islands are for: a thermometer read
  outside, rain measured in a gauge, the seasons and the weather on a chart. The rain gauge is the
  islands' want and is not drawn.
- Music for the fourth year, which [sound.md](sound.md) plans, would put the park's path into every
  year.
- The ferry town held the one Spanish lesson there was. Spanish was removed from the lessons on
  15 September 2026 pending a UI of its own for languages. That UI is the language picker on a
  child's card (30 September 2026), and the ferry town now hosts the language track's fifty
  lessons, whose skills light its market stall, clock tower, square, shop front and houses.

## Physics

The physics track is described in full in [physics.md](physics.md), which replaces the fifteen lesson
plan that stood here. In short: nine units numbered across the four grades (1 Forces, 2 Heavy, hot
and fast, 3 Water, slopes and shadows, 4 Circuits and magnets, 5 Measuring motion, 6 Balance and
machines, 7 Sound, 8 Light and seeing, 9 The sun, the moon and the Earth), thirty one lessons, seven
in grades one and two, eight in grade three and nine in grade four, and a hundred and seventy seven
items. The fifteen lessons planned here kept their ids and were rebuilt to the lesson standard of
[audit.md](audit.md); sixteen were added, for sound, light and seeing, the sun and the moon,
friction, conductors, faults in a loop, the pendulum, falling, brightness, and levers, pulleys and
gears.

The seven drawings this plan asked for, `forces`, `tank`, `ramp`, `shadows`, `circuit`, `magnet` and
`seesaw`, were drawn for the first fifteen and are still used. Twenty three more were added with
seven checkers that prove a physics answer from its drawing, and physics.md lists them with their
settings.

## Chemistry

Chemistry grew from fifteen lessons to twenty eight, and the 15 and 16 September batches add six at grade
one, five at grade two, four at grade three and four at grade four (rows 29 to 47); it is described in
[chemistry.md](chemistry.md): the research it was built from, the facts the first fifteen had wrong
and the source for each fix, the thirty drawings in `src/art/chemistry.ts`, the seven checkers in
`src/chemistry/prove.ts`, and the order to build the rest in. Every lesson has at least ten
questions from at least five items, a way in, a core and two stretch questions.

Units: 1 What things are made of, 2 Solid, liquid and gas, 3 Mixing and dissolving, 4 Getting it
back, 5 Heating and cooling, 6 Changes, 7 Acids and alkalis, 8 Water on the move, 9 Rocks and
soils, 10 Atoms and molecules.

| # | Grade | Unit | Lesson | Format | The art it leans on |
|---|---|---|---|---|---|
| 1 | 1 | 1 | What things are made of | teach | materials, wordsort |
| 2 | 1 | 1 | Hard, soft, bendy, see-through | teach | materials, wordsort |
| 3 | 1 | 1 | The right material for the job | teach | materials |
| 4 | 1 | 1 | Squash, bend, twist and stretch | teach | squash, wordsort |
| 5 | 1 | 2 | Water, ice and steam | teach | beforeafter, icemelt, thermometer |
| 6 | 1 | 2 | Looking closely | teach | magnifier, wordsort |
| 7 | 2 | 2 | Solid, liquid and gas | teach | particles |
| 8 | 2 | 2 | Melting and freezing | teach | beforeafter, heatcurve, particles, table, thermometer |
| 9 | 2 | 3 | Mixing and stirring | teach | beaker, beforeafter, mixture, spoons |
| 10 | 2 | 3 | Does it dissolve? | worked | beaker, mixture, table |
| 11 | 2 | 6 | Changes you can undo | teach | beforeafter, wordsort |
| 12 | 2 | 9 | Rocks and what they are like | teach | rocks, wordsort |
| 13 | 2 | 9 | Soil, and how a fossil forms | teach | fossilsteps, soiljar |
| 14 | 3 | 3 | Measuring a liquid | teach | beaker, cylinder |
| 15 | 3 | 4 | Getting it back: filtering | teach | beaker, funnel, mixture |
| 16 | 3 | 4 | Evaporating to get the salt back | worked | beaker, dish, flame, mixture |
| 17 | 3 | 4 | Sieve, filter or magnet | teach | mixture, sieve |
| 18 | 3 | 4 | Growing crystals | teach | crystalstring, magnifier |
| 19 | 3 | 5 | Heating with a flame | teach | flame, heatcurve, thermometer |
| 20 | 3 | 8 | Evaporating, condensing and the water cycle | teach | condense, mixture, watercycle |
| 21 | 4 | 2 | Particles, closer and further apart | teach | particles |
| 22 | 4 | 3 | A fair test: how fast it dissolves | worked | table |
| 23 | 4 | 4 | Separating puzzles | puzzles | dish, mixture, particles, sieve |
| 24 | 4 | 5 | Melting points and boiling points | teach | particles, table, thermometer |
| 25 | 4 | 6 | Changes that make something new | teach | beforeafter, candle, fizz, flask |
| 26 | 4 | 6 | Rusting: a fair test | worked | nails |
| 27 | 4 | 7 | Acid or alkali: the red cabbage test | teach | cabbage |
| 28 | 4 | 10 | Atoms and molecules | teach | atombox, molecule |
| 29 | 1 | 1 | Does it soak up water? | teach | materials, beaker, wordsort |
| 30 | 1 | 1 | Same shape, different material | teach | materials, match |
| 31 | 1 | 2 | Where does the puddle go? | teach | dish, thermometer, windsock |
| 32 | 1 | 2 | Air is everywhere | teach | flask, beaker, bubbles, balloons, materials |
| 33 | 1 | 9 | Chemistry puzzles: materials and water | puzzles | the year's items |
| 34 | 1 | 9 | Chemistry review: the first year | review | the year's items |
| 35 | 2 | 6 | Baking: a change you cannot undo | teach | beforeafter, wordsort |
| 36 | 2 | 9 | Soil: sand, clay and what drains | teach | beaker, funnel, soiljar, table |
| 37 | 2 | 2 | Which melts first? | teach | icemelt, thermometer |
| 38 | 2 | 9 | Chemistry puzzles: states, mixing and rocks | puzzles | the year's items |
| 39 | 2 | 9 | Chemistry review: the second year | review | the year's items |
| 40 | 3 | 3 | Stirring, warming and dissolving | teach | beaker, table |
| 41 | 3 | 4 | Hot water holds more | teach | beaker, crystalstring, table |
| 42 | 3 | 9 | Chemistry puzzles: separating, heating and the water cycle | puzzles | the year's items |
| 43 | 3 | 9 | Chemistry review: the third year | review | the year's items |
| 44 | 4 | 1 | Materials tested four ways | teach | materials, table, things |
| 45 | 4 | 9 | Weathering and erosion | teach | rocks, soiljar, table |
| 46 | 4 | 6 | Burning: a change that cannot be undone | teach | candle, beforeafter, table |
| 47 | 4 | 9 | Chemistry review: the fourth year | review | the year's items |

The four drawings chemistry started with (the beaker, particles in a jar, the filter funnel and the
burner) are still on the shelf; the beaker is no longer half the track, and the particles jar now
shows how its particles move.

## Nature

Nature is the eighth track, agreed on 15 September 2026, and the first written with three levels
from the start. Its units run across the grades: 1 Living or not, 2 Growing, 3 The year outside, 4
Small creatures, 5 Habitats, 6 Food chains, 7 Maps, 8 Weather, 9 Puzzles. Two lessons moved in from
the one-lesson subjects and keep their ids: the science lesson on plants and animals (grade two,
unit 2), which is rebuilt to one goal in the grade two batch, and the geography lesson on reading a
map (grade three, unit 7), whose scale and distance thread becomes the grade four lesson. The other
science lesson, materials and forces, was retired, since chemistry and physics already teach its
three ideas with drawings; its items stay on file. Each grade gets six lessons, one of them a puzzle
sheet drawn from the year's items.

The marsh hosts the track by subject, and the long grass, the reef and the cloud islands name the
lessons that belong to them; a lesson a place names is that place's alone, which `hostedLessons`
now enforces. The first six, all at grade one:

| # | Grade | Unit | Lesson | Format | Where | The art it leans on |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | Living, or not? | teach | the long grass | the static animals and things, toadstools, minibeasts, ants, coins |
| 2 | 1 | 2 | From seed to flower | teach | the long grass | growstages, the lettered plant, the sun, a rain cloud |
| 3 | 1 | 3 | The tree through the year | teach | the marsh | seasontrees |
| 4 | 1 | 4 | Legs and wings | teach | the long grass | minibeasts, ants, bumblebee, cobweb |
| 5 | 1 | 5 | Who lives in the pond? | teach | the marsh | pond, heron, kingfisher, dragonfly, birdrow |
| 6 | 1 | 9 | Nature puzzles: the long grass | puzzles | the long grass | the year's items |

Two drawings gained a `names` setting for this track, the seasons tree and the growing bean: as
drawn for the worlds every tree was captioned with its season and every stage of the bean with its
name, which answered the which-season and the ordering questions on the page.

Grade two, the second batch, rebuilt the moved science lesson to one goal and added five:

| # | Grade | Unit | Lesson | Format | Where | The art it leans on |
|---|---|---|---|---|---|---|
| 7 | 2 | 2 | Plants and animals (`science-living-things`) | teach | the marsh | the lettered plant and fish, the pond, wordsort |
| 8 | 2 | 2 | A life cycle in order | teach | the marsh | frogcycle, growstages, the pond |
| 9 | 2 | 5 | Where does it live? | teach | the marsh | pond, cobweb, seasontrees, minibeasts, the owl, hedgehog and duck |
| 10 | 2 | 7 | A map from above | teach | the marsh | gridmap, the island diagram, treasuremap, compass |
| 11 | 2 | 4 | Leaves and seeds | teach | the long grass | leafrow, dandelion |
| 12 | 2 | 9 | Nature puzzles: the pond | puzzles | the marsh | the year's items |

There is no butterfly life cycle on the shelf, so the two cycles compared are the frog and the
bean, and there is no hedge, so the homes are the pond, the tree, the web, the flowers and the
leaves.

Grades three and four, the third and fourth batches, rebuilt the moved geography lesson to one
goal and added nine:

| # | Grade | Unit | Lesson | Format | Where | The art it leans on |
|---|---|---|---|---|---|---|
| 13 | 3 | 7 | Grid references and routes (`geography-maps`) | teach | the marsh | gridmap, the road distances, compass, the bird hide |
| 14 | 3 | 6 | Food chains | teach | the coral reef | the reef's creatures over a written chain |
| 15 | 3 | 5 | By the sea | teach | the coral reef | seal, gull, crabs, sea turtle |
| 16 | 3 | 2 | What a plant needs | teach | the marsh | crops trays, a table, a bar chart |
| 17 | 3 | 9 | Nature puzzles: the reef | puzzles | the coral reef | the year's items |
| 18 | 4 | 7 | Scale and distance | teach | the marsh | mapscale, the road distances |
| 19 | 4 | 6 | Food webs | teach | the coral reef | two chains written under the creatures |
| 20 | 4 | 2 | Life cycles compared | teach | the marsh | frogcycle, growstages, the hen |
| 21 | 4 | 5 | Suited to the place | teach | the oasis | camel, fennec fox, seal, gull |
| 22 | 4 | 4 | Sorting animals | teach | the marsh | wordsort, the drawn animals, bats |
| 23 | 4 | 9 | Nature puzzles: the oasis | puzzles | the oasis | the year's items |

No food chain, puffin, gannet, butterfly, egg or chick is drawn, so the chains are written with
arrows under the reef's creatures, the shore's creatures are the seal, the gull, the crab and the
sea turtle, and the butterfly's cycle is written out. The rain gauge the grade three weather
lesson needs is not drawn, so that brief waits and grade three stands at five.

Facts in the grade five and six lessons that were checked after the audit of September 2026, with
where they come from:

- A river's mean velocity usually rises downstream, where the channel is deeper and smoother; the
  hill stream only looks faster because it is steep and rough (the Bradshaw model), so nature-26
  says the outside of a bend and a river in flood wear away the most, not that the river is fastest
  in the hills. Floods and their warning come from Japan's grade five science, B(3)(ウ).
- Squash plants have separate male and female flowers, and only a female flower can become a
  squash, so the bag test in nature-27 names both.
- Moths fly less on cold nights and bats hunt less with them; the moth-trap and bat-detector counts
  in nature-28 are invented to show that pattern and are not a survey.
- How far the wolves returned to Yellowstone caused the willows and beavers to return is still
  argued over (National Park Service, "The big scientific debate: trophic cascades"; Hobbs and
  others, Ecological Monographs, 2024), so nature-36 asks the child to reason inside that
  explanation rather than state it as fact.
- Peas pollinate themselves, so the seeds of one pea plant grow into near copies and their spread of
  heights shows mostly where each grew; nature-37 measures sunflowers from one head pollinated from
  many plants instead.
- Water takes heat from a body many times faster than air at the same temperature; the often quoted
  twenty-five times is the ratio of their conductivities, not a measured rate of loss, so nature-32
  does not give a number.

Four lessons were added on 29 September 2026 for the gaps the audit of grades five and six found
(`.docs/grades-5-6.md`, "The gap lessons"), each on a drawing made for it:

| # | Grade | Unit | Lesson | Format | Where | The art it leans on |
|---|---|---|---|---|---|---|
| 38 | 5 | 2 | What a seed needs to grow, as a fair test | teach | the canal town | seedtest, narrowboat, heron |
| 39 | 5 | 6 | Cells under the microscope | teach | the observatory | microview, microscope, telescope, owl |
| 40 | 5 | 8 | Sorting living things, down to the smallest | teach | the old city | venn, table, microview, clocktower, whale, fish, frog |
| 41 | 6 | 8 | Leaves make food in sunlight | teach | the moon | leaftest, pondweed, tree, earth, moon, lander |

Two checkers in `engine/notation/nature.ts` prove their questions from the drawing's own rule, so
the picture and the key cannot disagree. `nature.cells` reads the microscope view: the field's width
at the magnification drawn, the cells across it, a cell's length as the width over that count, the
cells across at another magnification, and how many whole cells fit in a length. `nature.seeds` reads
the seed test: how many seeds a dish sprouted, how many dishes sprouted, the one condition two dishes
differ in, and the letter of a part of the split bean.

The facts in these four lessons, and where they come from:

- A seed germinates with water, air and a suitable temperature, and grows on the food stored in it,
  which is starch (Japan's course of study, grade five, B(1)(ア)(イ) and 内容の取扱い(3)ア, quoted in the
  audit). Cress and beans do not need light to sprout; some seeds do, such as the lettuce 'Grand
  Rapids' (Borthwick and others, "A reversible photoreaction controlling seed germination", PNAS,
  1952), which the grown-ups note mentions. Boiled water under oil keeps air from the seeds, the
  school method for the air dish.
- A school microscope's total magnification is the eyepiece's times the objective's, and its field of
  view is the eyepiece's field number (18 mm for a × 10 eyepiece) divided by the objective's power,
  which gives the widths the microscope view is drawn with (`FIELD_UM`). The cell sizes are the
  drawing's typical values (`SPECIMENS`); the questions ask for a size worked out from the view, not
  one to remember.
- Living things sorted into broad groups, with microorganisms, follow England's year six programme
  of study and China's grades five and six science, 5.2①. The five groups of animals with a backbone,
  told by skin, breathing, eggs and milk, are the usual school grouping, and Russia's grade five
  biology names classes among its taxa (quoted in the audit). Some pond algae, such as
  Chlamydomonas, are single green cells that make their own food, which puts the fountain's green
  water in the Venn's overlap.
- Yeast is a single-celled fungus that gives off carbon dioxide as it feeds on sugar, and boiling
  kills it; the balloon test is the school version. The mould days on the library's bread are
  invented to show that damp and warmth speed mould, and are not a measurement.
- Some bacteria in warm food can divide every 20 minutes (Escherichia coli in rich medium at 37 °C:
  Sezonov, Joseleau-Petit and D'Ari, "Escherichia coli physiology in Luria-Bertani broth", Journal of
  Bacteriology, 2007); the story uses that rate for a germ in warm food.
- Starch forms in a leaf where sunlight falls on it (Japan, grade six, B(2)(ア)), iodine turns starch
  blue-black, a plant kept in the dark uses up its starch first, and the white part of a variegated
  leaf makes none, as in the Nuffield Foundation's Practical Biology experiments on testing leaves for
  starch.
- Van Helmont's willow grew from 5 pounds to 169 pounds 3 ounces in five years while its 200 pounds
  of dried soil lost about 2 ounces (Ortus Medicinae, 1648); the lesson rounds these to 2 kg, 77 kg,
  91 kg and less than 0.1 kg.
- The pondweed bubble counts are invented to show that the rate falls as the lamp moves away, and are
  not a measurement.
- A day on the moon, from one sunrise to the next, lasts about 29.5 of our days, about half of it in
  sunlight (NASA, "Moon: facts"); the lesson rounds it to 30 days, 15 of light and 15 of dark.

Sixteen lessons were added on 1 October 2026 to bring grades three and four to ten nature lessons
each and grades five and six to twelve (`.scratchpad/grades56/GROW.md`, batch C; the plan with the
gap each fills is `.scratchpad/grades56/grow-c/PLAN.md`):

| # | Grade | Unit | Lesson | Format | The art it leans on |
|---|---|---|---|---|---|
| 42 | 3 | 1 | An insect's body in three parts | teach | the insect diagram, minibeasts, bee, dragonfly, ants, tent |
| 43 | 3 | 4 | Plant eaters, meat eaters and eaters of both | teach | rabbit, fox, badger, heron, venn, tally table |
| 44 | 3 | 6 | Where small creatures choose to live | teach | log, nettle, minibeasts, bar graph, tables |
| 45 | 3 | 8 | Skeletons inside, outside, or none | teach | fish, crab, octopus, frog, sea turtle, minibeasts |
| 46 | 4 | 1 | Living things through the year | teach | line graph, swallows, hedgehog, robin, seasons tree |
| 47 | 4 | 3 | Temperature through a day | teach | line graphs, cloud, thermometer, weather station |
| 48 | 4 | 7 | New land, new life | teach | volcano island, gull, seal, timeline, dandelion |
| 49 | 4 | 8 | Zones of life from the pole to the equator | teach | iceberg, firs, camel, parrot, tables, rain gauge |
| 50 | 5 | 3 | New plants without seeds | teach | the strawberry runner diagram, narrowboat, flowers |
| 51 | 5 | 5 | Clouds and the weather to come | teach | sky, weather forecast row, line graph, observatory |
| 52 | 5 | 9 | How a baby grows, in an egg and in the womb | teach | the womb diagram, fish, hen, calendar, tables |
| 53 | 6 | 2 | Climate graphs and the world's biomes | teach | line and bar graphs, midnight sun, hut |
| 54 | 6 | 3 | Counting a colony from a sample | teach | puffins, array, hut, ice cliff, tables |
| 55 | 6 | 4 | Yeast at the mill: a living thing too small to see | teach | water wheel, test tubes, microscope view, flasks |
| 56 | 6 | 5 | Food as fuel and building blocks | teach | rope bridge, plate, tables, chest diagram, runners |
| 57 | 6 | 7 | Nerves, the brain and a quick catch | teach | the nerves diagram, lander, tables |

Four lettered diagrams joined the `parts` drawing for them: an insect from above (head, thorax,
abdomen, feeler), a strawberry plant with a runner, a baby in the womb (placenta, cord, the water,
the womb's wall) and a body with its brain, spinal cord and nerves. The app had drawn `parts` through
a case of its own that let only the fish and the island through, so a skeleton or a gut showed as the
plant; that case is gone and the shelf's own declaration draws every diagram.

The facts in these lessons, and where they come from:

- An insect's body is in three parts, with the legs and any wings on the thorax (Wikipedia, "Insect
  morphology"); a spider has two parts and eight legs (Encyclopaedia Britannica, "Spider").
- The fox "will happily munch on small mammals, birds, frogs, worms as well as berries and fruit" and
  the badger feeds "on small mammals, birds' eggs, worms, fruit and plants" (The Wildlife Trusts).
- A turtle's shell is "constructed of modified bony elements such as the ribs" (Wikipedia, "Turtle
  shell").
- The warmest part of the day "usually occurs several hours following noon" (US National Weather
  Service, Cleveland office, "The seasons").
- Surtsey's dates, its first plant in 1965, birds nesting three years after the eruptions ended,
  seals from 1983, gulls from 1984, and 69 plant species found by 2008, about 30 established
  (Wikipedia, "Surtsey").
- Runners, offsets and cuttings make copies "identical to the parent plant", while plants from seed
  "may not be 'true to type'" (RHS, "How plants reproduce").
- The Japan Meteorological Agency's cloud bands, a tenth or less clear, two to eight tenths fair, nine
  tenths or more cloudy, and its description of the westerlies.
- The medaka's heart beats at about fifty hours, its organs are ready by the seventh or eighth day
  and it hatches on the eleventh at about 25 °C (Encyclopaedia Britannica's film "Embryonic
  development of medaka fish"); pregnancy "normally lasts from 37 weeks to 42 weeks from the first
  day of your last period" (NHS).
- Yeast "feeds on sugar and produces carbon dioxide (CO2) plus ethanol" (Science World,
  "Yeast-inflated balloons").
- The ruler times are worked from a falling ruler on Earth, t = √(2d ÷ 9.81).
- Survey counts, climate values, zone temperatures and rainfall, food-table figures, snack and label
  figures, catches and sample counts are rounded typical values or invented to show a pattern, and
  each grown-ups note says which.

## Reading: the fifteen

Units: 1 Sounds and letters, 2 Whole words, 3 Sentences, 4 What the passage says, 5 Reading
between the lines.

| # | Grade | Unit | Lesson | Format | The art it leans on |
|---|---|---|---|---|---|
| 1 | 1 | 1 | Letter sounds | teach | letter cards, sound buttons, alphabet line |
| 2 | 1 | 1 | Blending sounds into a word | teach | sound boxes, sound buttons, letter cards |
| 3 | 1 | 2 | Words we know by sight | teach | word cards, sentence strip |
| 4 | 1 | 3 | A sentence and a full stop | teach | sentence strip, word cards, guide and bubble |
| 5 | 2 | 1 | Two letters, one sound | teach | sound buttons, **wordsort** (new) |
| 6 | 2 | 2 | Clapping the beats in a word | teach | syllable arcs, word cards |
| 7 | 2 | 4 | What the page says | teach | **passage** (new), open book |
| 8 | 2 | 4 | Who is in the story | teach | **passage**, children, bus, match |
| 9 | 3 | 4 | Finding the answer in the passage | teach | **passage**, open book |
| 10 | 3 | 4 | Putting the story in order | teach | **passage**, sequence, steps |
| 11 | 3 | 2 | What the word means here | teach | **passage**, word cards, choice |
| 12 | 3 | 5 | The title, and what it tells you | teach | open book, **passage**, choice |
| 13 | 4 | 5 | What the passage does not say outright | teach | **passage**, choice |
| 14 | 4 | 5 | Fact and opinion | teach | **passage**, sorting rings, choice |
| 15 | 4 | 3 | Reading puzzles: the missing word | puzzles | sentence strip, **passage**, word cards |

New drawings reading needs: `passage`, a page of prose with ruled and numbered lines and a title,
so a comprehension question sits on something worth looking at and a question can point at a line
(7, 8, 9, 10, 11, 12, 13, 14, 15); `wordsort`, two or three headed columns with word cards in them
(5, and shared with writing).

## Writing: the fifteen

Units: 1 Forming letters, 2 Words, 3 Sentences that work, 4 Joining and punctuating, 5 Shaping a
piece.

| # | Grade | Unit | Lesson | Format | The art it leans on |
|---|---|---|---|---|---|
| 1 | 1 | 1 | Letters that sit on the line | teach | handwriting rules, writing lines |
| 2 | 1 | 3 | A capital letter and a full stop | teach | sentence strip, word cards, choice |
| 3 | 1 | 2 | Writing a word you can hear | teach | sound boxes, word boxes |
| 4 | 1 | 5 | Writing a sentence about a picture | teach | basket, tree, writing lines |
| 5 | 2 | 1 | Joining letters | teach | handwriting rules |
| 6 | 2 | 4 | The question mark and the exclamation mark | teach | sentence strip, bubble, choice |
| 7 | 2 | 2 | Words that describe | teach | **wordsort**, word cards |
| 8 | 2 | 4 | Two sentences joined with "and" | teach | sentence strip, word cards |
| 9 | 3 | 2 | Naming words, doing words, describing words | teach | **wordsort**, word cards |
| 10 | 3 | 4 | Commas in a list | teach | sentence strip, word cards |
| 11 | 3 | 5 | Planning three sentences | teach | steps, sequence, writing lines |
| 12 | 3 | 3 | Finding the mistake in a sentence | worked | word cards, choice |
| 13 | 4 | 5 | Saying it shorter | teach | **passage**, writing lines, choice |
| 14 | 4 | 4 | Because, but, so | teach | sentence strip, word cards, choice |
| 15 | 4 | 3 | Writing puzzles | puzzles | **wordsort**, sentence strip, match |

Writing needs no drawing of its own beyond the two reading adds. Four of its lessons collect
writing that we do not mark, and those pages say so.

## Coding

The coding track is described in full in [coding.md](coding.md), which replaces the fifteen lesson
plan that stood here. In short: nine units numbered across the four grades (1 Following and giving
instructions, 2 Repeating, 3 Making things with a program, 4 Finding the mistake, 5 Deciding, 6 When
something happens, 7 Names that hold numbers, 8 Sorting, searching and binary, 9 Blocks of your
own), thirty six lessons, nine in each grade (grade three's ninth is the thinking lesson moved in
from logic), and two hundred and forty nine items. The fifteen lessons planned here kept their ids
and were rewritten on the new blocks; sixteen were added.

The two drawings this plan asked for, `program` and `turtle`, were rebuilt on one program model, and
fifteen more were added beside them: blocks, a tray, a pad to build in, a maze, pixels, a stage, a
dance, a tune, a variable, a fork, a trace table, lamps, sorting cards, a sorting network and cups.
The robot grid, `codegrid`, was retired in favour of the maze. Every answer about what a program does
is now worked out by running it, and every build task is proved possible, for every variant, by the
checkers in `scratchpad/src/coding/prove.ts`.

A drawing whose own setting is named like a placement key loses that setting without a word.
`instantiate` skips `at`, `right-of`, `left-of`, `below`, `above` and `gap` before it reads a
node's settings, so a part that calls one of its own settings `at` never receives it: the drawing
falls back to its default and the lesson looks like it worked. Five parts on the shelf are affected,
`inequality` and `racetrack` and `steps` and `ticket` with `at`, and `sentence` with `gap`, and all
five are worth renaming in the drawings, because the failure is silent and the author has no way to
see it. It cost two items in coding a wrong threshold before it was found.

Three parts on the shelf turned out not to be writable from a lesson and the plan had to give them
up. The sorting rings and the Carroll diagram keep their own contents, because a list of objects
has no spelling in the notation, so neither can carry a sort a question is about; `wordsort` does
that job instead. The inequality line names its value `at`, which is also the notation's placement
key, so the drawing's own setting shadows the placement and the node cannot be put anywhere. All
three are worth fixing in the drawings rather than working around, and the first two now can be:
a drawing may declare what an empty list setting holds, so a rings or a Carroll diagram that took
its contents as two lists of words would be writable.

## What a track lesson has to clear

The same bar as the maths sixty, in [curriculum.md](curriculum.md), plus two rules that only matter
once a subject is not maths.

A drawn question beats a written one wherever a drawing is possible. The failure mode of a
non-maths lesson is a page of prose with a radio button under it, and it is the reason the twelve
lessons we have today read as proof of concept rather than as content.

Where the answer is a judgement, the page says the grown-up is the marker, and the lesson still
carries provable questions around it so the child is not left with nothing that can be checked.

Reading load follows the grade as it does in maths: at grade one the child reads short instructions
and an adult reads the story problems aloud.

## Fifteen new drawings, in the order they are needed

| Drawing | Track | Gates |
|---|---|---|
| `forces` | physics | 3 lessons |
| `tank` | physics | 1 |
| `ramp` | physics | 2 |
| `shadows` | physics | 1 |
| `circuit` | physics | 1 |
| `magnet` | physics | 1 |
| `seesaw` | physics | 1 |
| `beaker` | chemistry | 10 |
| `particles` | chemistry | 4 |
| `funnel` | chemistry | 3 |
| `flame` | chemistry | 2 |
| `passage` | reading, writing | 10 |
| `wordsort` | reading, writing | 4 |
| `program` | coding | 12 |
| `turtle` | coding | 6 |

Every one of them is a part in the sense `lang/parts.ts` means it: an id, settings read off the
drawing's own defaults, a box in squares and a draw function. None of them needs a hand-written
registry entry, a layout case or a renderer case, because the derived path covers a part whose
settings are numbers, words, text and lists of those. That is the test of whether the shelf
generalises, and it is worth saying that it passed: the fifteen drawings cost fifteen files and two
import lines. A sixteenth, `writingframe`, was added while building: boxes with a prompt over each
one for a plan or a piece a grown-up marks, so that a page can collect real writing and still look
like the rest of the shelf.

## What building the first two tracks taught

Four things came out of physics and chemistry that were not obvious from the outside, and they are
recorded here because they change how a part should be drawn rather than how a lesson is written.

A setting a question needs to vary has to be a number. The notation can put a parameter in any
setting whose kind is an expression, and a setting whose default is a word or a boolean is not one,
so `closed=true` cannot become `closed=c`. Four settings were rewritten as numbers for this reason:
the circuit's switch, the ramp's surface, whether two magnets face like poles, and the state of the
particles in a jar. The rule for a new drawing is that anything a question could ask about is a
number, and only presentation flags stay words.

A part derived from the shelf offers no named anchors to the checker, so feedback can point at the
node or at one of the nine box anchors and nothing else. The anchors a drawing returns are real and
the renderer uses them, but they are only known once it has been drawn, and the verifier runs
before that. Pointing at `f.push` is an error where pointing at `f` is not.

A scene has to be sized to its drawing, not given room. A scene wider than its contents is scaled
down inside a question card, so the drawing ends up small and the page reads as a form with a
picture on it, which is exactly the failure this track set was meant to avoid. Every scene here is
now the smallest box that holds every variant of its item.

A printed sheet is 42 squares across and a scene is placed at column five, so a scene wider than 37
is clipped by the page rather than scaled to fit. Eleven look scenes were restructured from one
wide row into a column of two rows for this. It is worth saying that thirty one scenes in the maths
sixty are between 38 and 50 squares wide and are clipped in print today, which nothing in the
guards catches, because `check:print` counts pages rather than looking at them. The cheap fix is a
check that no scene exceeds the printable width; we have not written it, because it belongs with
the print guard rather than with a track.

## Open questions

Whether maths should move to continuous unit numbers, which would make the two shapes consistent at
the cost of rewriting sixty files and three tests.

Whether a track file is a new root node in the notation or a field on a lesson repeated in every
lesson of the track. The first is cleaner and is what is sketched above; the second needs no
parser vocabulary at all.

How a family's plan spreads a track across a year, which is the scheduler's question rather than
the content's, and which this document deliberately leaves to it.

Whether the three proposed tracks are built, and in what order.
