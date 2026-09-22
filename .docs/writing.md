# Writing

Status: proposed and partly built, September 2026. This document is the plan for the writing
track: what was thin about the first fifteen writing lessons, how writing is taught well to
children of five to ten, the principles the track now follows, a scope and sequence for each grade,
the lesson ideas with the drawings each one needs, how writing is marked, and the order to build the
rest in. It extends the writing table in [tracks.md](tracks.md) and starts from the counts in
[gaps.md](gaps.md). What it describes as built is in `scratchpad/`: fifteen new lessons beside the
first fifteen, thirty nine new items, eleven drawings in `src/art/writing.ts`, and seven drawings
from the reading track used as they are.

## The short version

Writing was the least visual subject we had. [gaps.md](gaps.md) counted pictures in 12 per cent of
its scenes, and 13 of its 15 lessons drew no picture at all; a child was asked to join, punctuate
and cut sentences about dogs, apples and shops that were never drawn. Nobody wrote anything longer
than one sentence, and nobody wrote for a reader. The track now has thirty lessons, eight in each of
grades one to three and six in grade four. Counted the way [gaps.md](gaps.md) counts, 132 of its
148 scenes carry a picture (89 per cent), and every lesson's first section has one. Each new lesson
gives the child something real to write on (a list, a label, a sign, a postcard, a letter, a map, a
story mountain) and pairs questions the machine can prove with one piece of writing a grown-up
reads. The thing that most limits the track now is not art or content: a child cannot yet write on
the screen, so every piece of real writing happens on the printed sheet.

## What was thin

### By the numbers

Before this work the track had 15 lessons and 17 items. By the count in [gaps.md](gaps.md) its
lessons showed 69 scenes, 12 per cent of them with a picture, 88 per cent a written layout (a
sentence strip, a passage in a frame, word cards, a two-column sort) and none that were text alone.
Thirteen lessons drew no picture anywhere, and the only drawings in the two that did were the
hand-drawn duck, boat and garden and the basket and apple tree. Four items were marked by a
grown-up and thirteen by the machine.

### What a child did on screen and on paper

On screen a child could pick an option, write a number, type a word into letter boxes or number
rows into an order. That covered choosing a joining word, an end mark, the misspelled word and the
wrong column in a sort. The four pages that collect real writing (tracing letters, joining a pair,
a sentence about a picture, a three-note plan) showed ruled lines on screen that could not be
written on, with a note saying a grown-up reads this one. The writing itself happened on the
printed sheet, and the grown-ups sheet printed what to look for, which is the `look-for` sentence of
the item's `writing.by-eye` check.

In the event model this is already provided for. A screen sitting records the collected page as an
`answered` event whose `given` is `{ k: "unmarked" }` and whose `right` is `null`, and a grown-up
marking the printed sheet later writes a `marked` event with `right` true or false
(`engine/answer.ts`). The same file specifies a `drawing` answer carrying strokes, which is how a
formed letter or a sentence written on a tablet would arrive, but nothing collects strokes yet, so a
child's handwriting only ever exists on paper.

### What the lessons asked for

- Composition stopped at one sentence in grade one and a three-note plan in grade three. No lesson
  asked for a paragraph, a story, a letter or a set of instructions.
- None of the forms young children actually write in was there: lists, labels and captions, signs,
  instructions and recipes, postcards and letters, descriptions, poems, stories with a shape.
- Sentence work was choosing a joining word. Nothing asked a child to grow a short sentence or to
  join two into one, which are the two sentence exercises with the most evidence behind them.
- Handwriting was a model letter to trace on four lines, with nothing showing where the pencil
  starts or which way it goes.
- Two items could be answered without reading. The mistake item offered the same four words (too,
  dog, we, dont) for every sentence, so three of the four were not in the sentence being checked,
  and the shorter-sentence item offered the short versions of three different sentences, so
  matching the topic was enough. A set of word cards read "the ben ran home", which is not a
  sentence. All three are fixed.

## How writing is taught well at this age

The web search tool had reached its limit for this session, so we read the sources we could fetch
directly (the What Works Clearinghouse practice guide, the national curriculum for England, the
pages of The Writing Revolution, Talk for Writing and the IRIS Center's SRSD module) and name the
rest as the literature we relied on without opening it again. The references are at the end.

### Transcription and composition

The simple view of writing, from Juel and then Berninger and colleagues, splits writing into
transcription (forming letters, spelling, and later typing) and text generation (turning ideas into
words and sentences), both running on executive functions such as planning and reviewing, inside a
small working memory. The not-so-simple view adds that the three compete for that memory. For a
child of five to seven the consequence is direct: forming a letter takes so much attention that
little is left for what the sentence says, so transcription is taught explicitly, briefly and often
until it is automatic, and composition is allowed to run ahead of it by saying sentences aloud,
using pictures and frames, and planning in notes.

For handwriting the practice guide recommends teaching a comfortable grip, showing the most
efficient way to form each letter with numbered arrows for the order and direction of the strokes,
writing letters from memory with the model covered for longer each time, and practising in short
sessions, five to eight of a letter at a time, then using the letters in real writing. The national
curriculum for England groups letters into families formed the same way in year one, starts the
diagonal and horizontal strokes that join letters in year two, and asks for joined writing that is
consistent and legible in years three and four.

For spelling, the guide notes that about 850 words make up 80 per cent of what elementary children
write. It recommends phonics-based spelling to around grade three, spelling by meaningful parts from
grade two, invented spelling that follows the sounds early on, spelling by analogy ("if I can spell
lamp, I can spell stamp") from grade two, and proofreading by reading aloud from grade two.

### Sentences

The guide's table of sentence activities has three: a sentence frame to complete, expanding a short
sentence ("The dog napped" growing into "The lazy, brown dog napped on the couch while I read a
book"), and combining two or more sentences into one. The Writing Revolution builds a method on the
same idea that sentences are the building blocks of writing: a sentence stem finished three ways
with because, but and so; a short kernel sentence expanded by answering who, what, when, where, why
and how; the four kinds of sentence; and fragments turned into sentences. It also holds that
planning and revising are the two most important phases of writing. The national curriculum asks
for the four sentence types and joining with and, or, but, when, if, that and because in year two,
and for a wider range of joining words, expanded noun phrases and a comma after a fronted adverbial
in years three and four.

### Planning and revising

Self-regulated strategy development, from Harris and Graham, teaches a writing strategy in six
stages: build the background knowledge, discuss the strategy, model it aloud, memorise it, write
with support, then write alone. Alongside it the child learns to set a goal, check their writing
against it, talk themselves through the steps and notice when they have done well. Its best
known mnemonics are POW (pick my idea, organise my notes, write and say more), TREE for an opinion
(a topic sentence, reasons, explain each reason, an ending) and "WWW, What = 2, How = 2" for a
story (who, when, where, what the character wants, what happens, how it ends, how the character
feels). The
practice guide's table of strategies adds numbering ideas in the order they will be written for
grades one and two, and the COPS editing check (capitals, overall appearance, punctuation,
spelling). Talk for Writing works through a model text in three phases (imitation, innovation and
independent application) and uses text maps and boxing up to show a piece's shape. A story drawn as
a mountain, with the problem at the top, is a common planning shape in English primary schools.

### Forms and purposes

The guide sorts writing by purpose: to describe (a person, a place, a creature), to narrate (a
story, a recount, a diary), to inform (instructions, a letter, a report) and to persuade (a letter
asking for something, a review, a notice). The forms a child of five to ten meets are lists,
labels and captions, signs, instructions and recipes, recounts such as a postcard, letters,
descriptions, stories, poems and short persuasive notes.

### Purpose and audience

The guide recommends teaching children that writing has different purposes and different readers,
and publishing their writing beyond the classroom. Purcell-Gates, Duke and Martineau found that
second and third graders grew more in writing informational and procedural texts when they read and
wrote real texts for real purposes. A homeschool has the reader at hand, which a classroom has to
invent: a grandparent who receives the postcard, a sibling who follows the directions, a parent who
has to find the creature from its description. The lessons use that wherever they can.

## Principles

1. Every page that asks for writing gives the child a real thing to write on, drawn in the shelf's
   own hand: a list on a notepad, a label on a ship, a sign on a post, a postcard, a letter, a
   treasure map, a story mountain. An empty entry is a ruled line to write on, which is the rule the
   reading track's drawings and ours now share.
2. Every lesson pairs questions the machine can prove with one piece of real writing a grown-up
   reads, so a child always has something checked at once and the writing is never reduced to a
   choice.
3. Handwriting is taught as a movement: where the pencil starts, which way it goes, and which
   family of letters moves the same way, in short bursts, next to a picture whose name starts with
   the letter.
4. Sentences come before pieces. A child builds a sentence from cards, grows a short one, joins two
   into one and chooses the word that says how two halves relate, and the choice form of each of
   those can be proved.
5. A piece is planned on a shape before it is written: three notes, numbered steps, a story
   mountain, a map with numbered stops.
6. Every piece of writing names its reader: Gran, the owl, a friend who has to find the creature,
   someone following the map.
7. Editing is learned on somebody else's writing first. The robot's sentence has the mistakes, so
   the child finds them without the sting of finding their own, and then uses the same three checks
   on their own work.
8. Reading load follows the grade. At grade one the child reads short instructions and a grown-up
   reads the look section aloud.
9. Every example text is our own. Nothing reproduces or paraphrases a published book, poem or song.

## Scope and sequence

The track keeps the five units in [tracks.md](tracks.md) (forming letters, words, sentences that
work, joining and punctuating, shaping a piece) and adds a sixth, writing for someone, for the forms
that have a reader. Order inside a grade is unit first, then file order, which is how
`src/family/tracks.ts` derives a track.

### Grade one

| Strand | What a child learns |
|---|---|
| Transcription | Letters that sit on the line; where each letter starts and which way it goes, by family; writing a word by hearing its sounds in order |
| Sentences | A capital letter and a full stop; a name keeps its capital; a sentence built from picture cards, said aloud before it is written |
| Composition | A sentence about a picture; labels and a caption; a list with a title and one thing to a line |

Lessons: letters on the line, where each letter starts, writing a word you can hear, a capital
letter and a full stop, a sentence from picture cards, a sentence about a picture, labels and a
caption, a list.

### Grade two

| Strand | What a child learns |
|---|---|
| Transcription | Joining a pair of letters, then a whole short word |
| Sentences | Describing words; the question mark and the exclamation mark; joining with and and but; commands |
| Composition | Speech bubbles in a comic; describing a creature so it can be found; instructions for a recipe; a sign that tells people what to do |

Lessons: joining letters, words that describe, describe it so it can be found, signs that tell you
what to do, two sentences joined with and, the question mark and the exclamation mark, speech
bubbles, the recipe the kitchen is cooking.

### Grade three

| Strand | What a child learns |
|---|---|
| Transcription | Words that sound the same and mean different things; checking spelling by reading aloud |
| Sentences | Naming, doing and describing words; commas in a list; capitals, end marks and spelling checked in turn |
| Composition | Planning in three notes; a story mountain; a recount written as a postcard, with time words; a poem down the page |

Lessons: naming, doing and describing words, finding the mistake, fix the robot's sentence, commas
in a list, planning three sentences, a story mountain, a postcard home, a poem down the page.

### Grade four

| Strand | What a child learns |
|---|---|
| Transcription | Joined handwriting at speed (not yet a lesson) |
| Sentences | Because, but and so; growing a sentence with when, where and why; combining two sentences; saying it shorter |
| Composition | Directions someone else can follow; a letter that tells, asks and gives a reason |

Lessons: writing puzzles, growing a sentence, because, but, so, saying it shorter, directions on a
treasure map, a letter to a character.

## The lesson ideas and the drawings each needs

The ideas below are the ones we built. Each names the drawings it uses and where they come from:
the art shelf as it was, the hand-drawn cast in `content/art/`, the reading track's new drawings
(built this month by the reading work, and extended so an empty entry is a line to write on), or new
drawings in `src/art/writing.ts`. How each is marked says which questions the machine proves and
which piece the grown-up reads.

| Grade | Lesson and idea | Drawings | Where they come from | Marked by |
|---|---|---|---|---|
| 1 | Where each letter starts: a large letter with its start dot, numbered strokes and arrows, its family named, copies to trace | `formletter`; cat, kite, owl, duck, hen, sun | new; the cast | Machine: which family a letter belongs to. Grown-up: the traced and written letters |
| 1 | A letter family: c, o, a, d and g from one curl, each in one movement; traced, ordered as a movement, counted, told apart (16 September 2026) | `formletter`, `lettercards`, `handwriting`; the printing works' tray | the shelf | Machine: which letter starts with the curl, the movement's parts in order, the curly letters in a row, the letter started in the wrong place, the tray. Grown-up: the traced letters and a word from the family |
| 1 | Labels and a caption: label a ship and a lighthouse, then caption a picture | `labelled`, `caption`, word cards; ship, lighthouse; rocket, fish tank, bicycle, wheelbarrow | reading; new; the shelf; the cast | Machine: spell the missing label from a word bank, pick the caption that fits. Grown-up: a caption of their own |
| 1 | A list: a picnic list, then a list for the harbour | `listpad`, basket; cup, kite, boat, bicycle | new; the shelf; the cast | Machine: spell the word for the picture on the list. Grown-up: a list of four things |
| 1 | A sentence from picture cards: who is where, built and written | `picturecards`, word cards, sentence strip | reading; the shelf | Machine: in, on or under; three cards into a sentence. Grown-up: a sentence about a card |
| 2 | Speech bubbles: what people say, and the mark that shows how they say it | `comic` | reading | Machine: the end mark of a bubble. Grown-up: fill the empty bubble so the strip makes sense |
| 2 | Describe it so it can be found: four made-up creatures, one description | `creatures`, sentence strip | new; the shelf | Machine: which creature a description picks out, which clue finds the ringed one. Grown-up: two sentences that pick out one creature |
| 2 | Describing a place: the harbour's lighthouse, boat and jetty, a describing word before each thing, sentences that fit the picture (16 September 2026) | `lighthouse`, `jetty`, the boat, kite and sandcastle assets, `match`, `sequence`, `writingframe` | the shelf; the art folder | Machine: the describing word among a name, a doing word and another thing, the word for each thing, a sentence back in order, the sentence that fits the picture, the describing words counted, which of two sentences tells more. Grown-up: two sentences of the child's own with a describing word in each |
| 2 | The recipe the kitchen is cooking: the cake as numbered pictures and as a recipe card | `picsteps`, `howto` | new; reading | Machine: steps in order, the doing word that starts a step. Grown-up: four steps for planting a seed |
| 2 | Signs that tell you what to do: commands on posts, boards and hanging signs in the town | `sign`, houses; shop front, duck, garden, sandcastle, fish tank | reading; the shelf; the cast | Machine: which sentence is a command. Grown-up: a sign of their own |
| 3 | Fix the robot's sentence: capitals, end marks and spelling checked in turn | `fixbot` | new | Machine: what kind of mistake it is, the right word of two that sound the same. Grown-up: the sentence rewritten |
| 3 | A story mountain: opening, build-up, problem, fixing it, ending | `storymountain` | new | Machine: which note belongs at the top. Grown-up: a plan for a story of their own |
| 3 | A postcard home: a recount of the night on the hill | `postcard`, telescope, moon, night sky | reading; the shelf | Machine: sentences in order, the time word that fits. Grown-up: a postcard |
| 3 | A poem down the page: an acrostic of MOON, STAR, KITE or BOAT | `acrostic`, moon; kite, boat | new; the shelf; the cast | Machine: which line comes next. Grown-up: a poem of their own |
| 3 | A cafe menu: headings that group, one dish and its price to a line, a word that sells the dish (16 September 2026) | `sign` as a menu board, `wordsort`, `pricetag`, `writingframe` | the shelf | Machine: the heading among the lines, the dish under the wrong heading, the price written properly, the word that sells, the board read for a count and a total, the commas in a list, which of two boards is easier to read. Grown-up: the child's own menu on the frame |
| 4 | Growing a sentence: when, where and why, and two sentences made into one | `expander`, whale, sentence strip; boat, kite, hen | new; the shelf; the cast | Machine: which words tell where, when or who; which sentence combines two. Grown-up: a kernel grown into one long sentence |
| 4 | Directions on a treasure map: a path drawn from its own turns | `treasuremap`, passage | new; reading | Machine: which way to turn at a landmark, directions in order. Grown-up: directions from the boat to the X |
| 4 | A letter to a character: a letter to the owl or the hedgehog | `letterpage`; owl, hedgehog | new; the cast | Machine: the parts of a letter in order, the sentence that gives a reason. Grown-up: a letter that tells one thing and asks one question |
| 4 | A story from the mountain: five paragraphs from a filled plan, over two sittings (16 September 2026) | `storymountain`, `passage`, `match`, `sequence` | the shelf | Machine: the problem among three sentences, sentences to cards, five parts in order, what each card is for, the note at the top and the fix, a story whose fix comes early. Grown-up: the story from the plan, one paragraph a card, the second sitting carrying on |
| 4 | A notice that persuades: a bold line, the ask, a reason that matters, when and where, a picture (16 September 2026) | `sign` as a notice board, the duck, boat, kite and birthday-table assets, `match`, `writingframe` | the shelf; the art folder | Machine: the ask among the lines, the strongest reason, the line to make bold, the picture that belongs, lines to their jobs, the command, which of two notices persuades. Grown-up: the child's own notice on the frame |
| 4 | A second draft: cut what says itself twice, join what belongs together, fix the capitals, keep the meaning (16 September 2026) | `passage`, `writinglines` | the shelf | Machine: the sentence that says it twice, the extra words, the joining word, the word that lost its capital, the same in fewer words, the draft's word count, which of two drafts kept the meaning. Grown-up: a given first draft rewritten |

The first fifteen lessons now draw what their questions talk about. Letters on the line has the hen
beside the h, and each of its tracing questions shows a cat, duck, hen or kite for its letter. A
capital letter and a full stop has "Kim has a cat" with the cat, and its questions pair each name
with a hen, a duck, a cat or a cup. Joining letters joins un, en, at and up under a sun, a hen, a
cat and a cup, and then the whole word. The question mark lesson opens on a three-panel comic.
Words that describe sorts horn, leg, spotty and stripy under three creatures. Joined with and
shows a duck and a hen. Naming, doing and describing words sorts the words of a caption under the
hand-drawn garden. Commas in a list starts from a packing list on a notepad and a pile of suitcases.
Planning three sentences opens on a story map of a rainy day, and its plan questions show a kite, a
market stall or a birthday table. Finding the mistake and the puzzles put the sentence on the
robot's screen and offer words from the sentence itself. Saying it shorter shows the cat next door,
a shop front and a bookshelf, and each question now offers one shorter sentence that keeps the
meaning and two that lose part of it. Because, but, so finishes "The kite went up" three ways and
draws a kite, a cat or a rocket for each question.

### The new drawings

All eleven are in `src/art/writing.ts`, drawn with the same pen as the rest of the shelf, and shown
on the art shelf in a new Writing category with at least two takes each.

- `formletter`: one lowercase letter drawn large on a four-line guide, with a pink dot where each
  stroke starts, a number for the order of the strokes, chevrons along each stroke for its
  direction, dashed copies to trace, room to write, and the letter's family named beside a small
  picture of its shape (ladder, bridge, curly or zigzag). Stroke data covers all 26 letters.
- `fixbot`: a small robot with a sentence on its screen, broken (a crossed eye and a spark) or
  mended (a smile), with one word loopable for a worked example.
- `creatures`: a line-up of made-up creatures, each with a number of eyes, legs and horns, a plain,
  spotty or stripy coat, a round, tall or long body and a colour, so a description can pick out one.
- `storymountain`: five cards on a hill, from the opening to the ending, with the problem at the
  top.
- `treasuremap`: a path from a landing boat past numbered landmarks to an X, drawn from its own
  list of left and right turns.
- `picsteps`: numbered pictures of the steps of a job (a cake from flour to candles, a seed from an
  empty pot to a flower) with a line under each.
- `acrostic`: a word down the page, one big letter to a line.
- `caption`: a strip of paper taped under a picture.
- `expander`: a kernel sentence with question tabs round it and a line under each question.
- `letterpage`: a letter on notepaper with its greeting, body and sign-off in their places.
- `listpad`: a spiral notepad with a title and a box to tick on each line.

### Ideas we did not build

- A menu for the café in the town, at grade three: a board sign of dishes and prices, asking where
  the commas and capitals go and then for the child's own menu. It needs nothing new.
- A notice that persuades, at grade four: "Keep the pond clean because...", planned with a topic,
  reasons, an explanation and an ending. It needs nothing new beyond a poster-sized sign.
- A story written from the mountain, at grades three and four, over two sittings. It needs a lesson
  format whose sections are days, which [gaps.md](gaps.md) describes as a project across a week.
- Joins drawn with their joining stroke, at grade two: `formletter` taking a pair of letters and
  drawing the diagonal or horizontal join. It needs stroke data for the pairs.
- Dictation, at grades one and two: hear a short sentence, write it. It waits for recorded speech,
  which [sound.md](sound.md) defers.
- A whole comic strip written by the child, at grade three, three empty bubbles and a title. It
  needs nothing new.
- A description of a place in one of the worlds, using the hand-drawn settings (the kitchen
  counter, the bedroom shelf, the birthday table), with the machine question being which sentence
  describes the picture. It needs nothing new.

## How writing is marked

A question the machine marks is proved before a child sees it. It is a pick from options, a
number, a typed word checked against a declared list of accepted spellings, or rows numbered into
an order. The verifier builds every version the question's parameters allow, checks the answer
names exactly one option, that the scene fits, and that no feedback rule also fires on the right
answer. Thirty seven of the track's 56 items are of this kind: which family a letter is in, the
missing label, the caption that fits, in or on or under, the end mark of a bubble, which creature a
description picks out, the order of steps, the doing word, which sentence is a command, the kind of
mistake in the robot's sentence, the right homophone, the problem at the top of the mountain, the
time word, the next line of a poem, which words tell where, which sentence combines two, which way
to turn at the rock, and the parts of a letter in order.

A piece a grown-up marks carries `check writing.by-eye look-for="..."`. The verifier requires the
look-for sentence to say what a good attempt looks like, and the grown-ups sheet prints it where
the answer would be. Nineteen items are of this kind: every traced or joined letter, and every
sentence, caption, list, bubble, description, set of steps, sign, rewritten sentence, plan,
postcard, poem, grown sentence, set of directions and letter. On paper the grown-up marks the
printed sheet and enters it later as a `marked` event. On screen the child's sheet shows the drawing
to write on and says to write the piece on paper for a grown-up to read, and until there is an ink
input the child writes it there. Pressing "I have written it" under the piece records it as
collected, an `answered` event with `given` `{ k: "unmarked" }` and `right` null, which the grown-up
marks later.

What stays with a person is the judgement. [ai.md](ai.md) rules out AI marking of work that is a
judgement, and a written sentence or a formed letter is exactly that. When the ink input exists, a
child's strokes are stored as our own `drawing` answer, shown to the family's grown-up, and never
sent to a model or any other third party.

Two small things would make the grown-up's marking more useful, and neither is built. The first is
a short checklist per piece in place of one sentence (for a postcard: the order, the time words,
the greeting and sign-off), with the unticked item recorded as the `rule` of the `marked` event, so
the parent's page can say "the time words were missing twice" rather than only right or wrong. The
art work has since decided the event, with this proposal in view: a grown-up's response to any piece
marked by eye is a `responded` event carrying the points of the item's `notice` list they saw and a
note, and `marked` stays right or wrong for a question answered on paper ([art.md](art.md), "A
grown-up's view"). For writing that means giving `writing.by-eye` a `notice` list, which is not done. The
second is a checker warning for a trap we met: a parameter whose name is also one of a setting's
listed words is read as the word. The letter-family question named its parameter `x`, x is a
letter, and every version drew an x until the parameter was renamed.

## The journey map

The journey map hangs each strand's lessons off the maths path, and it could not hold a strand of
eight lessons in a grade: a side lesson hung off maths lesson three times its place in the strand,
so every lesson past the fourth piled up on the last maths lesson, and the layout stepped them
sideways until grade one was too wide to fit the screen above the zoom where the map hands over to
the shelf of years. Reading and writing both reached eight grade one lessons at once, and the test
that holds the year above that zoom failed.

A strand now hangs each lesson off the maths lesson as far through the year as it is through its
own strand (`hostOf` in `src/space/years.ts`), and `src/space/layout.ts` places side lessons on a
grid across their row, nearest their own lesson first, a level deeper when a level is full. The grid
may reach up to eight places past the ends of a row, and the reach is chosen for each year as the
one that fits a landscape screen at the largest size. Measured on a 1200 by 800 view with the shelf
at 0.072, every grade now fits at about 0.107 (grade four was 0.076 and grade one 0.067), and with
every track outside maths two, three and five times as long the lowest grade fits at 0.096, 0.088
and 0.0805. Two tests in `test/space.test.ts` hold this: every grade fits above the shelf with a
tenth to spare today and at two and three times the track length, and no two lessons overlap at
those lengths.

## The order to build in

1. The ink input, so a child can write on the screen, and the grown-up's view of what was written.
   It is the same input a drawing lesson needs ([gaps.md](gaps.md), item 15), and it is what turns
   nineteen items from paper-only into screen and paper.
2. A checklist per piece of writing in place of one look-for sentence, as a `notice` list whose
   ticks are recorded in a `responded` event, so a parent sees which part of a piece was missing
   over several weeks.
3. The rest of a year of writing in each grade: the café menu, the persuasive notice, a comic
   written whole, a description of a place, joins with their stroke drawn, and a letter family a
   lesson at grade one. None of these needs a new drawing except the joins.
4. Revising lessons at grades three and four, where a child adds, cuts, moves and swaps words in a
   draft on the robot's screen, and then in their own.
5. A story written from its mountain over two sittings, once a lesson can span days.
6. A review lesson a grade, which no track outside maths has.
7. Reaches from the journal's worlds into the new drawings, so the kitchen's oven stands beside the
   recipe lesson and the island's chest beside the treasure map ([journal.md](journal.md)).

## Open questions

- Whether writing should grow to a full year of lessons in each grade, as reading plans to, and
  what two long tracks do to a family's week.
- Whether a grown-up's mark for a piece of writing should be one tick or a short checklist.
- Whether typing belongs in grade four. The practice guide includes typing and word processing,
  and we have no keyboard input for prose.
- Unit six, writing for someone, is new. [tracks.md](tracks.md) still lists five units and the
  first fifteen lessons, and should either point here or take the new table.

## References

- Graham, S., Bollinger, A., Booth Olson, C., D'Aoust, C., MacArthur, C., McCutchen, D. and
  Olinghouse, N. (2012, revised 2018). [Teaching Elementary School Students to Be Effective
  Writers](https://ies.ed.gov/ncee/wwc/PracticeGuide/17). What Works Clearinghouse practice guide.
  Read for this document: the four recommendations, the tables of strategies, purposes, spelling
  skills and sentence activities, and the handwriting diagram.
- Department for Education (2013). [National curriculum in England: English programmes of
  study](https://www.gov.uk/government/publications/national-curriculum-in-england-english-programmes-of-study).
  Read for the statutory writing requirements in years one to four.
- The Writing Revolution. [The Hochman Method](https://www.thewritingrevolution.org/method/). Read
  for its principles; the named activities come from Hochman, J. C. and Wexler, N. (2017), The
  Writing Revolution, which we did not open again.
- Talk for Writing. [About Talk for Writing](https://www.talk4writing.com/about/). Read for the
  three phases, text maps and boxing up.
- IRIS Center. [SRSD: Using Learning Strategies to Enhance Student
  Learning](https://iris.peabody.vanderbilt.edu/module/srs/). Read for the stages. The mnemonics are
  from Harris, K. R., Graham, S., Mason, L. H. and Friedlander, B. (2008), Powerful Writing
  Strategies for All Students.
- Berninger, V. W., Vaughan, K., Abbott, R. D. and others (2002). Teaching spelling and composition
  alone and together: implications for the simple view of writing. Journal of Educational
  Psychology 94(2). Berninger, V. W. and Winn, W. D. (2006), on the not-so-simple view. Not opened
  for this document.
- Purcell-Gates, V., Duke, N. K. and Martineau, J. A. (2007). Learning to read and write
  genre-specific text: roles of authentic experience and explicit teaching. Reading Research
  Quarterly 42(1). Not opened for this document; the publisher's page refused the request.
