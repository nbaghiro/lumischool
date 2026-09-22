# Authoring

Status: proposed, September 2026, prototyped in `scratchpad/make.html` ("Make your own" in the
scratchpad's top bar). This is the design for a parent making their own question, written against
the four authoring layers in [parents.md](parents.md), the line [ai.md](ai.md) draws around what a
model may do, the notation in [notation.md](notation.md), and the `content` row and events in
[data-model.md](data-model.md) and [db.md](db.md). It is where `apps/studio` in
[structure.md](structure.md) ("authoring, for us and later for parents") starts to take a shape.

## Summary

A parent makes a question on the child's own page. The middle of the screen is the white squared
paper the lessons are drawn on, with the question drawn on it by the real renderer; the parent drags
drawings from the shelf into whole squares, types the question where it prints, and says what the
answer is as a sum of the numbers in the question. Beside the page, the checker's findings are
written in the teacher's pen, each next to the part of the question it is about and each with one
change that deals with it where there is one. Under the page, every version the numbers allow is
drawn in a row, which is how "checked for every number it can take" becomes something a parent can
see rather than something we say.

The notation stays the source of truth. Every control edits the notation's syntax tree and writes it
back through the canonical formatter, so what is saved is the text an author would have typed. A
parent never has to see it, and can open it beside the page if they want to.

We compared four directions before settling on this one: the page as the editor, a
one-step-at-a-time wizard, the notation with a form beside it, and asking the assistant first. The
page won because it is the product's strongest idea, the page that prints is the page on the screen,
and because a checker's finding reads best next to the thing it is about. The wizard's order
survives as the six steps across the top, and the other two survive as ways in.

## Who makes things, and what they make

The parent we design for is not a programmer. They are teaching one or two children at the kitchen
table, the work for tomorrow is on their mind, and the time they have for making something is ten
minutes on a Sunday evening or after the children are in bed. They read the product on a laptop or a
tablet, and on a phone in a queue. They will not learn a vocabulary to make one question, and they
will not keep going past a screen that tells them they are wrong without saying what to do.

What they want to make, in the order we expect it to be common:

- A variation of a question their child already has: the same question with different numbers, their
  children's names, a different picture, or numbers kept under twenty.
- A question about their child's own life: the rabbits in the garden, the pocket money, the bus to
  the grandparents'.
- A sheet on this week's topic, several questions on one page, printed for the morning.
- A picture story: a few pictures with a line of words under each and no answer to check.

The first two are questions, one `item` in the notation. The third is a lesson that practises
several items. The fourth is a lesson whose sections are pictures and words. The prototype builds
the first two fully and gives each question a one-question sheet for printing and giving; it does
not build a sheet of several questions or a picture story yet, and the section on what we do not
build says so.

Our own authors write in the notation, in the editor at `lang.html`, and will keep doing so. This
page is for parents. It could serve a tutor in the same way, since [product.md](product.md) makes a
tutor a second grown-up rather than a different system.

## Where a parent starts

There are four ways in, and all four land on the same page.

From a lesson they have. The parent picks a grade and a subject, then a lesson, and sees its
questions drawn as the child would see them. "Make my version" copies one question into the family's
own content under a new id, titled as their version, and the original is untouched.

From a picture. The parent searches the shelf ("rabbits", "a pizza", "halves") and picks a drawing.
The question starts with that drawing on the page, and where the drawing counts something (a row of
rabbits, a tray of buns) its count is already a number that changes, with the question words "How
many rabbits are there?" and the answer already written. The shelf's own detail view has a button
that starts here.

From a blank page. Squared paper with the question's words and a box to answer in. The checker's
first finding is that there is no answer yet, which is also the first thing to do.

From a sentence. The parent writes what they want in their own words ("three rabbits for Maya, and
two more are born"). This is the one way in with a model behind it, and it follows [ai.md](ai.md)
exactly: the children's names are taken out of the sentence before it leaves the page, the model
writes notation over parts that exist, the gate checks it, and the result opens on the page marked
as a draft from a sentence until the parent has read it. The banner says what left the page, with
the name taken out. The model never writes anything a child reads without a parent having read it
first, and it never writes a drawing. In the prototype there is no model: a short script stands in
for one, the way the assistant page's does, and everything after it is real. A sentence the script
cannot draft is turned into a search of the shelf with the same words.

A starting point places its drawing without knowing how tall it is, so the page lays itself out once
when it opens. After that nothing moves unless the parent moves it.

## The directions we compared

We sketched four and built one.

| | The page is the editor | One step at a time | Notation and a form | Ask for it |
|---|---|---|---|---|
| What the parent looks at | the child's page, with the checker's notes beside it | one question at a time: which picture, which numbers, which answer | the text, a form built from the registry, a preview | a sentence, then a finished draft |
| Where the checker speaks | next to the drawing, the number or the mistake it is about | at the end, as a list | as errors with a line and a column | after the draft, as a list |
| Changing something late | move it or change it on the page | walk back through the steps | edit the line | ask again, or edit the draft by hand |
| On a tablet | works, with the panel under the page | works well | three panes do not fit | works |
| What it needs from us | an editor over the tree and a reading of the checker | forms and an order | little beyond the notation editor | a model, a gate, and still an editor for the draft |

One step at a time is the easiest to learn and the gentlest on a phone. We rejected it as the whole
design because the parent cannot see the question while they make it, and because a change late in
the sequence (a bigger number) undoes an earlier step (the picture no longer fits), which sends a
tired person back through screens they thought were finished. Its order is kept as the six steps
across the top of the page, which a first-time parent can follow and anyone else can ignore.

The notation with a form beside it covers every node type and every setting without translating
anything, which makes it the right tool for us. To a parent it is a program, three panes do not fit
on a tablet, and its errors point at lines rather than at things. It is kept as the notation drawer
on the page, shown on request.

Asking for it first is the quickest start. It is not a direction on its own, because whatever the
model drafts still has to be read and usually changed, and that needs an editor. It is one of the
four ways in.

The page as the editor is the most work to build, since it needs an editor over the syntax tree and
a reading of every checker message. It is the one that keeps the product's promise visible while a
parent makes something: the page on the screen is the page that prints, and each finding sits next
to the thing it is about.

## The page

Across the top: the title (editable in place), who it is for, the checker's verdict, and Undo, Redo,
Notation and Save.

Under that, six steps as tabs: Picture, Numbers, Question, Answer, Hints and mistakes, Check. Each
carries a mark: a tick when it is done, a dot when it still needs something, an exclamation mark
when the checker has something to change there, a question mark when it has a note to read. Hints
and mistakes carry no mark until there is one, because a question does not need them to be correct.

The middle is the page: the question drawn on squared paper at the width of a printed page, with a
dashed line where the page ends and a dashed outline round the part the question takes up. The
outline is sized by the page from the widest and tallest version of the question, so a parent never
meets "does not fit" for an edge they cannot see; only a picture wider than a printed page is left
for the checker to report. Above the page: Edit, Try it as the child, and On paper, and which
version is on the page, with the buttons to step through them. Below it, every version.

Beside the page, the panel for the step or the drawing chosen. On a narrower screen the panel moves
under the page.

## Placing drawings

A drawing comes from the shelf, through the same search the shelf page uses, filtered to the
drawings that can go on a page from here. It lands under whatever is already there.

On the page each drawing has a handle. Dragging moves it in whole squares, with the drawing itself
moving under the pointer, and it cannot be dropped past the page's edge. Choosing one opens its
settings in the panel. With the keyboard, Tab reaches each drawing, the arrow keys move it a square
and Shift with an arrow moves it five, Delete takes it out (Undo puts it back), and Enter goes to
its settings. The panel has the same four moves as 44 px buttons, for a finger that finds dragging
hard.

Moving a drawing that was placed against another one ("to the right of the question") places it
where it is dropped instead, and anything placed against a drawing that is taken out is left where
it stood. Tidy the page lays everything out again: the drawings in a row across the top, the
question under them, and the box to answer in beside it if it fits.

A drawing's settings are read from the registry, and each kind of setting has its own control, the
same controls the shelf uses to try a drawing out:

- a number is a stepper, with a menu that lets it change with the question instead of staying the
  same; once it changes, it shows as "changes with rabbits, 2 to 4" with a button to keep it still
- a setting that takes one of a set of words is a row of buttons, or a list when there are many
- a yes or no is a switch, and a direction a drawing faces is Right or Left
- a list is edited in place, one small box to an entry, with a button to take each one out and one
  to add another
- a setting the notation cannot write yet (a list of objects) says so rather than showing a control
  that would not work

## The numbers that change

Each changing number has a name, a lowest and a highest value, and a line saying where it is used:
in which drawing, in the question's words, in the answer, in a mistake or a hint. A parent adds one
by saying what it is the number of ("rabbits"), which becomes its name. Renaming one renames it
everywhere it is used; taking one out leaves its lowest value behind wherever it was.

Versions the checker has been told to leave out are listed in words ("only where rabbits + born is
not rabbits × born") with a button to put them back. A parent does not write these by hand. They
arrive as the fix for a finding, which is the only place they make sense.

## The question and how the child answers

The question's words are typed where they are, in a box in which each number appears as a chip. The
row of chips under the box drops a number into the sentence where the cursor is, so a parent writes
"Pip has [rabbits] rabbits" without ever typing a brace; the braces are what is saved. A switch says
whether the words are read aloud to the child, which is on by default for grades one and two.

The child answers by writing a number, picking one of some choices, or writing a word. A choice
takes a list of options and which one is right. A word takes the spellings that count.

## The answer

For a number, the answer is a sum of the numbers in the question, typed with the names and the four
signs as buttons. It shows × and ÷ and saves `*` and `/`. Under it, the page works the sum out for
the version on the page ("in the version on the page, rabbits 3 and born 2, that comes to 5"), so a
parent can check the sum means what they think before the checker has said anything.

## Hints and mistakes

Hints are up to three, which is the ladder [ai.md](ai.md) asks for, each with the question's numbers
as chips.

A mistake is an answer the parent expects and what the guide says back. It is written as "if she
writes" followed by a sum (rabbits, rabbits × born, the answer and one more), with the line the
guide says and the drawing it points at. The page offers the common ones for the numbers in the
question as buttons: she writes one of the numbers, she adds them, she takes one from the other, she
counts one too many. Under each mistake, once it is checked, a line says it never matches a right
answer, or the checker's note says when it does.

The quickest way to find a mistake worth writing is to try the question. In Try it as the child a
real box sits over the drawn one; the parent writes an answer and presses Check it, and the guide
answers with the mistake's line and lights the drawing it points at. An answer no mistake matches
gets the guide saying so, and the page works out which of the usual slips would give that answer in
this version ("she took born from rabbits") and offers to add it, with the cursor waiting in the box
for what the guide should say. This is the deterministic half of the flow [ai.md](ai.md) describes
for an answer no rule recognises, done at the parent's desk rather than the next day.

## Seeing it on paper

On paper shows the question as it prints, through the paginator the lessons print through: the
child's sheet with four versions of the question numbered in the margin, and the grown-ups' sheet
beside it with the answer to every version, the hints, and a line saying who made it and that the
checker tried every version. The grown-ups' sheet never prints on the child's pages. A draft shows
how it would print with a line saying it cannot be printed until the checker passes it.

## How checking is shown

The checker is the same `Workspace` the editor, the tests and the build use, run on every change
against the question and the components it may use. The page adds nothing to what it decides. What
the page adds is the reading.

The verdict is one of three, matching the three the gate in [ai.md](ai.md) returns:

- "Checked: all 14 versions work" when there is nothing to say
- "1 note to read, then it is ready" when the checker has only warnings, which are the findings that
  need a person (a mistake that also matches a right answer in some versions, an answer below zero)
- "2 things to change before Maya can have it" when there is an error, and then it stays a draft

Every message the checker writes is matched to the part of the question on the line it points at (a
drawing, a number, the answer, one of the mistakes), said in the parent's words, placed next to that
part, and given one change that deals with it where there is an obvious one. The versions a message
lists ("a = 2, b = 2; and 6 more") are said as "when rabbits is 2 and born is 2, and in 6 other
versions". Some of what the reading does:

| The checker writes | The parent reads | The change offered |
|---|---|---|
| this rule is also true for the correct answer, so it cannot tell the mistake apart | This mistake is also the right answer when rabbits is 2 and born is 2. She would be told she is wrong when she is right. | Leave those versions out |
| the same, in every version | This mistake is the right answer itself, in every version. | Take this mistake out |
| "answer" takes an answer, but there is no answer | There is a box to answer in, but no answer yet. | Write the answer |
| pic and ask overlap | The rabbits and the question sit on top of each other. | Tidy the page |
| answer is negative | The answer comes out below zero. For a young child that usually means the numbers are the wrong way round. | Leave those versions out |
| unknown name "n" | "n" is not one of the numbers in this question. | none: the line points at the mistake it is in |

A message the reading does not recognise is shown as the checker wrote it, next to the part it
points at, and never dropped. We would rather a parent read an awkward sentence than miss a finding.

The Check step says what the checker did, in five lines (built every version, worked out every
answer, drew each one and made sure it fits and nothing overlaps, made sure no mistake matches a
right answer, made sure every number used is one the question has), and what it cannot check:
whether the words make sense or are kind, whether this is the right question for today, whether the
picture helps. [ai.md](ai.md) asks us to report what the verifier did not check, because a parent
reading "checked" will otherwise hear more than we mean.

The versions under the page are the other half of the promise. Every version the numbers allow is
drawn small with its numbers and its answer, the one on the page ringed; above twelve the row stops
and says how many more there are. A question with more versions than the checker lists (over ten
thousand) says it tried a sample and how large.

## The notation's role

The notation is the source of truth underneath, and the page is a way of writing it. The page holds
one thing, the question's notation text. Each control is an edit to the text's syntax tree (set this
setting, move this drawing to these squares, replace the list of mistakes), the tree is written back
through the canonical formatter, and the checker reads the result. So what is saved is canonical
notation, a change made with a control is a small diff in it, and opening one of our own questions
to change it needs no conversion.

A parent sees it only on request. The Notation button opens it in a drawer beside the page, with the
lines the checker has something to say about marked, and a sentence saying this is what is saved and
that nobody needs to touch it. "Change the text itself" turns it into a text box, and a change there
is applied as soon as the text reads; until then the page says which line does not read and changes
nothing.

We considered hiding it entirely. That would make the source of truth invisible to the parents who
would trust the page more for seeing it, and it would leave no way round a control we have not
built. We considered showing it beside the page all the time. That is the notation editor with a
nicer preview, and it tells every parent that making a question means reading code.

A few things in the notation have no control yet: code checkers, components, roles, the layouts that
are answers in their own right (the number wall, the bus stop). A question that uses them opens and
is checked, and those parts are changed in the drawer.

## Easier and harder

Added 15 September 2026. Every lesson in the catalog has three levels, easy, medium and hard, and
the page in this design has no control for them yet: a parent's question is as written, which is
medium. This section is for the lessons we write ourselves, in the notation of
[notation.md](notation.md)'s Levels section, and for the studio when levels reach it.

A lesson is written at medium first and finished there: the goal, the sections, the seeds, the
grown-ups note. The two other levels are then written into the same file without changing what it
asks as written. The author decides, item by item, what makes one version harder than another, and
says it in a difficulty line, an expression in the item's parameters that gives each version a
number, larger for harder: `difficulty (10 - n)` for the ten frame, where fewer counters leave more
squares to fill; `difficulty (a * b)` where a bigger product is more to work out; a hand ranking
with `if` where the versions are written stories, with the reason beside it as a comment. Where the
versions have an honest order the item gets a band at each level, a `let` inside `level easy` or
`level hard` that narrows the range to that end of it; where they have none (versions that shuffle
the same cards, stories of the same weight) the item keeps no difficulty line and counts for
nothing, and the level is made elsewhere in the lesson.

At the lesson, easy works one example in the teacher's pen before the first practice, a `worked`
block inside `level easy`, using one of medium's own versions with `level=medium` on the block;
drops the stretch that is not needed with `easy-count=0`; pins the shows at their plainer versions
with `easy-a=6`; and asks a practice block a second time where the plainer versions bear it. Hard
pins the shows at their harder versions, moves a seed with `hard-seed=` where medium's own seed
already lands on the hardest versions, and trades one practice question for a second reasoning
question where the two-star item has a spare version with a different answer. Each level gets one
grown-ups sentence that says what it changes, in the same voice as the lesson's note, and nothing on
the child's pages says which level it is.

Two checks hold this in place. The first holds medium: a test records every question each lesson
asks as written and every item's versions, and a level that changes either fails it; a deliberate
change to medium reruns `npm run levels:baseline` with the reason in the notes, and a medium seed is
never moved to make a level, since that changes what every child at medium has been asked. The
second holds the order: the verifier requires difficulty to rise from easy through medium to hard,
item by item where an item has bands and lesson by lesson on the measure the notation doc gives,
where a fall is an error, a rise of 0.05 or less is a warning, and the suite holds the list of
warnings so a new one fails it. Each level prints as its own lesson, at most one child's sheet over
the lesson as written, and a second reader reads every level as it prints and reports what must
change before it lands.

The honest-but-close rule. A level is sometimes not honestly different from medium: the item's
versions have no order, medium's own draw already sits at the end of the band, a band has two
versions under a count of two, or the harder question of a pair has the same answer. The author
then writes the best honest version, which keeps the order above the warning, and lists the lesson
for the owner on the review page, in `levels-owner.json` beside `src/pages/levels.ts`, with the
reason in one sentence. The review page marks any lesson whose two levels measure less than 0.15
apart, so the owner reads those beside the listed ones and decides whether a level stays as it is,
gets a new item, or is left as medium. The alternative, a level that is different for the measure's
sake (a seed that moves medium, a pin outside the band, a difficulty line that ranks versions by
nothing the child would feel), is not written.

## Saving, giving and the journal

Save works whatever the verdict. A question with something to change is saved as a draft, and a
draft cannot be printed or given; [parents.md](parents.md) makes that a rule for every layer, and
there is no weaker class of content with a warning on it.

Saving writes what [data-model.md](data-model.md) and [db.md](db.md) already specify: one
`content` row for the family, whose body is the notation and whose hash Postgres generates; a
`content-authored` event with the id, the kind and the hash, and `model` null for a question made by
hand or the model's name for one drafted from a sentence; and the verifier's `content-verified`
event with the number of errors. A draft is a revision with no clean `content-verified` event. The
save dialog shows exactly these rows under "What is stored".

Giving it to a child is a choice of child, day, and whether it comes after the day's lesson or as a
sheet on its own. It is a `plan-changed` event with a `set-day` operation naming the question's
one-question sheet, so the plan picks it up the way it picks up any other change. The dialog draws
the child's journal for that day with the question on its sheet, taped in the way the journal tapes
a sheet, marked "made at home by" the parent, and the grown-ups' sheet says the same, which is the
provenance [ai.md](ai.md) requires on the page and on the grown-ups' sheet.

What a family makes stays in the family. It is never offered to another family without a person we
employ reviewing it, it is deletable, and a lesson that used it falls back to the catalogue.

## Access and devices

Every control is at least 44 px. Every drawing on the page is a keyboard handle, the steps are
reachable with Tab, Undo and Redo answer to the usual keys outside a text box, and focus stays on
the control that was used after the page redraws. The verdict, a move and a fix are announced to a
screen reader as they happen. The guide's idle motion and the pulse on a drawing the guide points at
stop under reduced motion, and nothing else on the page moves.

On a tablet the page works as it does on a laptop, with the panel under the page instead of beside
it and the squares a little smaller. A drawing is a large target even when a square is not, and the
move buttons are there for a finger that finds dragging hard.

On a phone the page is for looking, trying and giving, not for making. A printed page is 36 squares
wide, and at phone width a square is about ten pixels, well under what a finger can put a drawing
into, while the panel of settings cannot sit anywhere near the page it changes. A parent on a phone
can open a question, step through its versions, try it as the child, see it on paper, and give it to
a child; the page says why the rest waits for a bigger screen. Editing words on a phone (a hint, a
mistake's line) would be possible, and we have left it out until someone asks for it.

## Finding a drawing

Placing a drawing starts with finding one, and the shelf had been arranged by the file each drawing
is drawn in. The shelf page is now arranged the way a parent looks: twenty-five shelves in four runs
(things, maths, subjects, the page), so a pizza is on Food and the kitchen and also on Fractions.
The search reads names, titles and descriptions, what a drawing can show ("halves", "counting in
twos"), the words its settings take, the subjects and lessons that use it, and the worlds of the
journal it stands in, and it leaves out a word that matches nothing rather than finding nothing. The
authoring page's picker is the same search.

The grouping is a layer over the art rather than a re-filing of it: one declaration in
`src/art/shelf-groups.ts`, keyed by drawing id, which the shelf reads. A test fails when a drawing
on the shelf has no line there, so a drawing added to an art file is caught rather than lost at the
bottom of the page.

## What we do not build

- No drawing made by a model, and no drawing made on this page. Every drawing comes from the shelf,
  and a request for art we do not have is answered with the shelf.
- No model at the child's side, and no model-written word reaching a child that a parent has not
  read. The sentence start is the only place a model is involved.
- No question shared with another family without our review.
- No marking of answers that are judgements. A written sentence or a formed letter is marked by the
  grown-up, as everywhere else.
- No making on a phone.
- Not yet: a sheet of several questions, a picture story, and the answer layouts with blanks of
  their own (the number wall, the bus stop, the grid method) from the picker. Each is a lesson or a
  node the page can hold, and none is built.

## The prototype

`scratchpad/make.html`, in the "used by" group of the top bar as "Make your own". What is real: the
drawings and the settings they take, the checker, the renderer, the paginator that prints the
sheets, the guide, and the notation that is saved. What stands in: the store is the browser's local
storage, the sentence start is a script rather than a model, and the family is the sample family of
the parent pages (Maya in grade one, Theo in grade three, and Sam who makes things).

The files, in `scratchpad/src/pages/`:

- `make-draft.ts`: the question as notation text and the edits a parent makes to it, through the
  syntax tree and the formatter
- `make-check.ts`: the checker run on the question, its messages read in the parent's words with the
  fix for each, the answers a child's slip would give, and the page sized to its widest version
- `make.ts`: the page
- `part-form.ts`: the controls for a drawing's settings, shared with the shelf
- `finder.ts` and `../art/shelf-groups.ts`: the shelf's search and its grouping

`test/make.test.ts` makes a question one control at a time and checks the text stays canonical, the
findings land on the part they are about, and every fix it offers leaves a question the checker
passes. `test/shelf.test.ts` holds the grouping to the art.

## Open questions

- Where the checker runs for a parent in the product. [parents.md](parents.md) prefers the verifier
  as a service the home app posts notation to; the prototype runs it in the browser, which is
  quicker to answer on every change and is not allowed in `apps/home` as
  [structure.md](structure.md) draws it. A service answering in the time a drag takes has not been
  measured.
- Whether a drawing whose setting takes one of a few words should declare them. The animals in a
  field take sheep, ducks or cows, but the drawing does not say so, so the page offers a text box
  where a row of three buttons would be kinder. Declaring `choices` on the drawing would fix it and
  also let a changing word pick one.
- Whether parents name the numbers that change or we do. The prototype asks what each is the number
  of and uses that word; we have not watched a parent do it.
- Whether a family's own questions should ever reach the catalogue, which [ai.md](ai.md) also leaves
  open.
