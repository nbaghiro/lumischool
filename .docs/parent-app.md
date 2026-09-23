# The parent's app

Status: three options for comparison, September 2026. This is a decision document rather than a
plan. [parents.md](parents.md) already says what functions the parent's side needs and in what
order we would build them; what it does not say is what the product is, and that is the question
here. The three options are built as working pages (`parents-a.html`, `parents-b.html`,
`parents-c.html`) so they can be clicked between rather than only read about. The reference page
`parents.html`, the one-page essay of the parent's side that came before them, was removed on
15 September 2026, since the Parents tab had superseded it. A second pass the same month took the
structure these three settled and gave it four visual directions, built as modules of one page that
the Parents tab now opens; they are described in the last section, with the one we recommend.

The owner asked for three options with their trade-offs rather than one recommendation, so this
document does not make a recommendation about which to build. It does take a position on two
smaller things: which jobs the parent's side has, and what each option needs from the data model
decision in [data-model.md](data-model.md).

## The jobs, in the order a family meets them

The parent's side has to answer ten jobs and no single screen answers more than two of them well,
so the decision that shapes everything else is which job the home surface takes. These are numbered
because the options below refer to them.

1. **Understand what the platform can do.** Before buying, and again every time a parent wants more
   than they are getting. This is the job [parents.md](parents.md) does not have, because it was
   written about a family already using the product.
2. **Set the year up.** Which tracks, which grade band per child, how long a day is, paper or
   screen. Once, and then rarely.
3. **Plan a week and print it.** Sunday evening. Ten minutes if the product is good and ninety if
   it is not, and paper is a first-class output rather than a fallback.
4. **Teach this morning.** Two children, one adult, in an order that never needs the adult in two
   places at once.
5. **Mark what came back**, including work done on paper that the app never saw, possibly a week
   after it was printed.
6. **Decide at the end of a lesson.** Move on, another day, or park it.
7. **See where a child is**, across seven tracks rather than one subject, without it becoming a
   dashboard of numbers nobody asked for.
8. **Change the plan when a week goes wrong.** A cold, a visit, three lessons behind, and no part of
   the interface implying the family failed.
9. **Author or request content.** More practice, a changed number, a whole strand, by hand or with
   AI, through the one gate in [ai.md](ai.md).
10. **Produce the records** a state or district may ask for.

Two jobs from [parents.md](parents.md) are deliberately absent from all three options and are not
ranked here: a tutor seat, which needs accounts and an audit of who marked what, and the handover
pack, which is a print job rather than a screen.

Job 4 and job 7 look similar and are not. "What should each child do today" is a question the
product can already answer from the plan; "in what order, so that I am never needed in two places
at once" is a scheduling problem with one adult as the resource, and it is the one thing in this
whole document that a family with two children cannot get elsewhere. Job 7 is a different question
again, because with seven tracks a child is current in seven places at once and "where are we" stops
having one answer.

## The axes the options differ on

Styling is not one of them. All three are in the same design language, borrowed from the marketing
direction in `site-l.*` rather than imported from it: the same six type steps, hairlines instead of
boxes, colour arriving as broad quiet fields, mono labels only where they carry information, and
every artifact on the page drawn by the real renderer rather than pictured. What differs:

| | A, the morning table | B, the shelf | C, seven lanes |
|---|---|---|---|
| The home surface is | today's teaching order | the catalogue of what exists | one child's position in each track |
| Several children are | one combined timeline, adult as the resource | side-by-side columns in a week tray | a switcher, with a strip for the collision |
| Authoring lives | in a drawer called Make | inline on the lesson being changed | nowhere; it is the job this option buries |
| The product | pushes a briefing | waits to be browsed | pushes one child's state |
| The showcase lives | in the foot of every screen | on the home surface, permanently | in the empty lane |
| Planning is | a week strip you shift | a tray you pull into | a pace you set per lane |

## What we explored and did not propose

Five more were sketched and rejected, each for one reason.

A **week board**, seven track rows crossed with five day columns, cards moved between cells. The
best idea in it is that a plan change is a drag rather than a form, and that survives in option C as
setting a lane's pace. The objection is arithmetic: seven tracks by five days by two children is
seventy cells, which is a spreadsheet on a laptop and unusable on a phone.

A **paper tray**, where the home surface is the print queue and marking is the work coming back.
Printing is a first-class output and this is a real screen, but it is an output, and a home surface
built on the printer cannot hold the morning: a parent at nine with two children waiting is not
thinking about paper.

A **record book**, leading with days of instruction and hours by subject. Records are a monthly job
and a home surface that opens on compliance makes the product feel like paperwork rather than
teaching. Option C gets most of its value for free, because a lane is a subject and hours by subject
is the lanes added up.

A **request desk**, where the home surface is a conversation and AI drafts what the parent asks for.
The objection is in [ai.md](ai.md) rather than in taste: a request that writes notation has to pass
parse, check and verify, the repair loop is capped at five attempts, and a flow that can fail with
nothing shipped is a queue rather than an answer. It belongs behind a noun rather than on the home
surface, and it survives there as the Make view in A and as the inline gate in B.

A **single child-centred dashboard** with a switcher and one progress figure per subject. This is
what the category does and it is what [parents.md](parents.md) argues against: a page with fourteen
numbers on it makes the parent decide which of them matters, which is work we are supposed to be
doing for them, and most of those numbers would be computed from too little evidence to deserve the
attention they get. Option C is the version of this idea that we think is defensible, because a lane
is a position rather than a percentage.

---

## Option A: the morning table

The argument is that the parent's product is a morning rather than a dashboard, and that the
scheduling problem is the product. The home surface is today, laid out as one timetable with a lane
per child and the adult's own rail down the middle showing where they are committed and where they
are free, with the waits drawn in where a child had to wait.

**Information architecture.** Six nouns in the bar: This morning, Mark, The week, Each child, Make,
Records. The home surface serves jobs 4 and 6. One click away: 5 (mark), 3 (the week and printing),
7 (each child's tracks), 8 (shift the plan). Deliberately buried: 9 (authoring, behind Make), 10
(records), and 1 (the showcase, which is one band in the foot of every screen and not a surface).

**The screens.**

*This morning* opens with one sentence that is a fact ("Start at 9:00 with Maya. You are needed for
43 of the next 56 minutes.") and the timetable beside it. Below that, a band of four counted figures,
then one card per child carrying the lesson's own first drawing so a parent recognises today by its
picture, then one thing to look at per child from the strongest signal we have, then the move-on
decision per child with the re-seeded practice preview behind "another day".

*Mark* is the queue of paper sheets, unmarked first and oldest first inside that, and then the real
grown-ups sheet beside a marking column. Tapping a question marks it wrong; tapping one of the
question's own feedback sentences marks it wrong with a named mistake, which costs the same and
records a diagnosis instead of a wrong answer. Look closer sits at the foot of this screen rather
than on its own, with the per-question table and the dot plot of times.

*The week* is five columns and one row per track, with print and a one-button shift. *Each child* is
the seven tracks as strips plus the gap ledger. *Make* is the four authoring layers from
[parents.md](parents.md), with the real gate run in the browser. *Records* is days, hours by subject
and the days added by hand.

**What a parent does first on a Monday.** They read one sentence and start teaching. There is no
choice to make on the home surface, which is the whole argument for this option.

**Two children and seven tracks.** Two children are one morning rather than two columns of numbers.
Seven tracks arrive as the fact that a day now holds more than one lesson per child: the sample
family meets maths, reading and writing on the Monday the page opens on, which is six sheets across
two children and two collisions the scheduler had to resolve. The timetable absorbs that without
changing shape, which is the strongest evidence we have for this option.

**What it needs from the data model.** The least of the three. Sittings with dates, attempt rows,
one plan per child that can be shifted, and a sheet with an identity. It can ship before any
service exists, because everything on the home surface is computed from the plan and the lessons.

**What it can show truthfully today.** The morning order is real: it is computed from the declared
sections of the real lessons, and the attention profile per section is a curriculum fact rather than
a guess. The sheets are the real print output. The readings, the named mistakes and the move-on
recommendation are computed from evidence in the shape we plan to keep. What is not real, and is
labelled where it appears: the minute estimates, which come from a table and not from measurement,
the sheet queue, because a printed sheet has no identity today and nothing records that a print
happened, and the notation in the Make view, which comes from the scripted writer in
`src/ai/model.ts` rather than from a model, although the gate it goes through is the real one.

**What it costs to build.** The most of the three in interface work, because the timetable is a
bespoke drawing with a scale, and the marking screen is a second bespoke one. The module is the
largest of the three at 1,241 lines and 13 kB gzipped.

**What it makes hard later.** Three things. A family with one child gets a timetable with one lane,
which is a worse version of a list. A family with four children gets four lanes on a laptop and
loses the drawing on a phone. And the home surface has no room to grow: everything that arrives
later arrives as another noun in the bar, and a bar with ten nouns in it is a menu.

## Option B: the shelf

The argument is that a family who chose to teach at home chose the choosing, and that what turns a
curious parent into a confident one is seeing what is actually there. The home surface is everything
that exists, filterable, with each lesson openable as the real page a child would work on beside the
real sheet with the answers on it. A week is a tray a parent pulls into.

**Information architecture.** Four nouns: The shelf, Next week, Today, Each child, plus a lesson
view reached by opening a lesson. The home surface serves jobs 1 and 9 and most of 3. One click
away: 4 (today, sequenced out of the tray), 7 (each child, as the input to the shelf rather than a
destination). Deliberately buried: 5 and 6 (marking and the decision, which live inside a lesson),
10 (records, which this option does not build at all).

**The screens.**

*The shelf* opens on one whole A4 page at the width of its column, with three scenes from three
tracks under the words to make the breadth claim with drawings rather than a sentence, and four
counted figures. Then a filter row, and then one band per track in the track's own marker colour,
each holding six real lesson tiles with "see all fifteen" behind a button. The filter that makes
this useful rather than decorative is "how much of you it needs", which is read off the lesson's
own sections: a taught section needs the adult, a story problem at grade one has to be read aloud,
and practice is work a child does alone.

*A lesson, open* is the screen this option exists for: the child's page and the grown-ups sheet,
both whole and both drawn by the paginator that prints them, with how it runs section by section,
every question with its answer and the mistake sentences its author declared, and then the four ways
to change it. The first two changes need no model. The last runs the real gate.

*The tray* is two columns, one per child, with four figures counted off what is in it. The figure
that matters is how many of the minutes are the adult's, because a week that needs the adult for
four hours is a week that will not happen. *Today* takes the tray's first lessons and sequences
them, which is the same scheduler as option A at a tenth of the fidelity.

**What a parent does first on a Monday.** They navigate. This is the option's cost and it is real:
the order for the morning is a click away rather than free.

**Two children and seven tracks.** Two children are two columns in the tray, which is the right
shape for the act this design is built on, putting a lesson into one child's week. Seven tracks are
the organising fact of the home surface: a band a track, a marker a track, and a track that is off
still appears on the shelf, because a track a parent cannot see is a track they cannot choose.

**What it needs from the data model.** Almost nothing about evidence, and a lot about content. It
needs the pack to carry enough proved variants to pick from at run time, it needs family-authored
notation stored as text with its canonical hash and a review state, and it needs a draft that cannot
be printed to be a state rather than a flag. It is the option most sensitive to the authoring half
of the model and least sensitive to the evidence half.

**What it can show truthfully today.** More than the other two, because most of what it shows is
content rather than evidence. Every tile is a scene drawn by the renderer the child's own page uses,
every opened lesson is two real A4 sheets, every count is counted off the corpus as the page loads,
and the gate's three verdicts are the verdicts the gate returned in the browser, over notation from
the scripted writer rather than from a model, which the page says. The suggested week is computed
from where each child is. What is invented is only the evidence behind "where each child
is", and the tray's page counts assume a print job that does not exist.

**What it costs to build.** The least of the three, at 971 lines and 9 kB gzipped, because the shelf
is a grid of tiles and the lesson view is two calls into the existing paginator. It is also the one
whose cost is mostly already paid: the renderer, the paginator and the corpus all exist.

**What it makes hard later.** Marking. A parent who has to find a lesson in order to mark it will
not mark paper, and paper is the mode we deliberately made good, so the evidence store fills up with
screen work and the analytics story quietly becomes the thing we said it would not be. This is the
strongest argument against the option and we do not have an answer to it inside the option's own
shape.

## Option C: seven lanes

The argument is that the fact the parent's side has to be organised around is the one
[tracks.md](tracks.md) states and nothing in the product has absorbed: a child is current in seven
places at once. The home surface is one child, with a lane per track drawn as a rail of ticks, one a
lesson, with the grade bands marked underneath and the lesson the child is on flagged. The plan is
changed by setting a lane's pace or turning a lane off.

**Information architecture.** Three nouns and a child switcher in the masthead: The lanes, This
week, Records, plus a lane view reached by clicking a lane. The home surface serves jobs 7 and 8.
One click away: 3 and 4 (the week, both children), 6 (the decision, per lane), 10 (records). Buried:
5 (marking, inside a lane), 9 (authoring, which this option does not build), 1 (the showcase, which
is the empty lane and is therefore on the home surface without being a surface).

**The screens.**

*The lanes* opens on a sentence with a number in it ("Maya is in 5 places at once"), the one thing
to look at, and an aside carrying today's figures for both children. Then one row per lane: the
track's name and marker, the rail, the reading with the lesson the child is on, and a segmented
control reading off, 1, 2, 3, 5 a week. Below the open lanes, the ones that are not open, each
carrying three real drawings from its own lessons and one button to open it at one a week.

*A lane* is the same rail at twice the size, then the whole track lesson by lesson grouped by grade
band, then the lesson the child is next on as a real sheet with how much of it needs the adult, then
the move-on decision, then only that track's skills, never averaged against another track's.

*This week* is the one screen that keeps both children, because a week is about the adult's time and
the adult has two children. *Records* is the lanes added up, which is the shape most districts ask
for the numbers in.

**What a parent does first on a Monday.** They look at the aside, see that today is 56 minutes with
43 of them theirs, and click through to the week. This is two steps where option A is none.

**Two children and seven tracks.** Seven tracks are the whole design. Two children are a switcher,
and the switcher has a cost that this option pays explicitly rather than hiding: with one child on
screen the other child's claim on the adult is invisible, so the collision count is stated in an
aside on the home surface and the week view keeps both children stacked. We think that is the right
trade and we are not confident about it.

**What it needs from the data model.** The most of the three, and one requirement that is close to
decisive: one current lesson per track, derived rather than stored. See below.

**What it can show truthfully today.** The lane is real: the positions are computed, the grade bands
are counted, and the case the design most needed to handle came out of the existing sample without
being arranged for. Maya's maths lane shows nine of fifteen done with the sixth undone, because the
sample family lost a week to a cold and carried on, so the first lesson not done sits behind the
furthest lesson done. The lane says both, because saying only the first understates the year and
saying only the furthest hides the gap. The empty lanes carry real drawings from the real lessons.
What is invented is the evidence, and the pace per lane, which is a setting no family has ever set.

**What it costs to build.** The middle of the three at 802 lines and 8 kB gzipped, and the lane is
one component drawn at two sizes rather than two components. The cost that is not in the page is in
`src/space`: the lane needs the four changes [tracks.md](tracks.md) lists, of which `Progress.current`
becoming one per track is the one with the most behind it.

**What it makes hard later.** The morning, and marking. Both are one level deeper than they should
be for a product a parent opens at nine, and the fix for either would mean adding a fourth noun that
competes with the lanes for the home surface. It also makes authoring awkward: a parent changing a
question is not standing in front of a lane, so option B's inline placing is not available and
option A's drawer is a fourth noun.

---

## What each needs from the data model decision

[data-model.md](data-model.md) sets out five options (A, typed tables on a server; B, a local-first
log; C, a log of record with projections; D, the household folder in the notation; E, a document per
sitting) and recommends B with two amendments borrowed from C. What each of the three parent options
needs:

| | A, the morning table | B, the shelf | C, seven lanes |
|---|---|---|---|
| Works under data model A | yes | yes | poorly |
| Works under B | yes | yes | yes |
| Works under C | yes | yes | with work |
| Works under D | yes | yes | yes |
| Works under E | with work | yes | poorly |

**A current lesson per track only works cleanly under B or D.** This is the one place where a parent
option depends on the data model decision rather than merely benefiting from it. Option C draws
seven positions per child on its home surface, and the data model document's own comparison scores
"a current lesson per track is derived rather than stored seven times" as yes for B and D, with work
for C and E, and no for A. Under data model A the habit of the `SkillState` table is to store the
roll-up, and seven stored positions are seven fields that can each be stale on their own; the lane
that is wrong is then the lane a parent trusted. Parent option C should not be chosen alongside data
model A without someone owning that rule explicitly.

**Marking paper a week after printing bites option A hardest**, because option A's second screen is
a queue of unmarked sheets and the queue cannot exist until a sheet has an identity that carries its
questions by value. All five data models handle this, so this is a sequencing constraint rather than
a choice: option A's Mark screen is blocked on `Sheet` and its three dates (printed on, worked on,
marked on) whichever model wins. Under B those three dates are three events and nothing has to be
reconciled; under E the sheet document is flagged and the sitting is dated when the work was done.
Options B and C do not need this until later, because neither makes marking a destination.

**Per-question timing bites nobody hard, and it rules out one shape.** Timing is per-kind data
rather than a column: screen work carries a time to first input, a time to answer and whether the
page lost focus, and paper work carries no per-question timing at all. All three parent options show
times as a distribution with the away-from-the-page attempts drawn and marked rather than dropped,
and all three have paper answers in the same table reading "on paper" rather than zero. That works
under any of the five as long as timing is a tagged union. A model that gives every answer a
`seconds` field has already lied about paper, and it would be option A's Look closer screen that
showed the lie first.

Two smaller dependencies. All three read the plan as a per-child overlay that can be changed with
the base year visible underneath, so all three need the mutable plan that does not exist today;
option C needs it per lane rather than per child, which is a finer grain and the one place option C
asks more of `features/plan` than the others. And all three read the two grains of evidence, a
question attempt and an activity round, through one interface, which is what
[parents.md](parents.md) asks for; none of them grows a second surface for activities.

## What we changed under the pages

Three files in `src/family`, all additive, plus one two-line change to an existing function.

`src/family/tracks.ts` is new and holds the seven tracks derived from the corpus rather than listed,
one current lesson per track computed rather than stored, and the check that no track lesson waits
on a lesson in a different track, which is the rule that makes turning a track off safe. It also
holds the title, description and marker per track, which are the three fields the `track` root node
proposed in [tracks.md](tracks.md) will own.

`src/family/sample-tracks.ts` is new and invents evidence for the tracks beyond maths. It reads the
real items off the workspace rather than copying a table by hand, so the questions, the skills and
the mistake sentences come out of `content/` at run time and stay in step with it. The existing
maths evidence in `src/family/sample.ts` is untouched, because the cases it was built to show (a week
lost to a cold, a sitting started and not finished, a day done late, two named mistakes) are the
cases these pages have to handle and a generated replacement would have lost them.

`src/family/morning.ts` gained one optional field on `Learner`: the rest of a child's lessons for
the day. With one subject a child does one lesson a day; with seven tracks a grade is about
thirty-eight lessons rather than fifteen, so a day holds two lessons on most days and the scheduler
has to sequence both of them against the same adult.

The pages themselves are `parents-a/b/c.html`, three modules and three stylesheets under `src/pages`
and `src/styles`, plus `parents-kit.ts` and `parents-kit.css` holding what all three share: the
family they are built against, the helpers that put a real drawing or a real printed sheet on a
page, and a switcher that appears on localhost only. They carry their own chrome rather than the
scratchpad's top bar, so they are not in `PAGES` and the page test does not require them to be.

## Explore

Explore is the grown-ups' catalogue of every lesson in the family's pack, at `/explore`, reached from
the grown-ups' bar on every screen. A grown-up
narrows it by grade, by subject and by the words of a lesson's title or goal, and the address keeps
what it was narrowed to, so the way back from a lesson returns to the same list. Each lesson opens
at `/explore/<lesson>` on the sheet a child would have, with the answers filled in and, for a piece a
grown-up reads, what to look for. It can be read at any level the lesson declares. The level is named
on the grown-up's card and never on the sheet, since a child who sees the word easier reads it as a
verdict. Reading records nothing, and printing prints the sheet alone, with or without the answers.
Print on a child's card on the home is the one way in that records: it writes `sheet-printed` for
that child with the sheet's questions, so what comes back can be marked, and opens the lesson here,
which prints the child's sheet without the answers.

It is `apps/home/explore.tsx`, with the filtering and the order in `apps/home/catalogue.ts`, the
sheet in `engine/ui/lesson.tsx` read with `{ sheets: "look", key }`, and the pack read through
`engine/ui/api.ts` (`pack`, `packLesson` and `packScene`). `tools/e2e/explore.e2e.ts` checks it.

## The calendar and the plan

Calendar now combines day planning and subject routines in one parent page. The separate Change
the plan navigation entry is gone; existing `/plan` links open Calendar's Subjects & pace view.
The production page is `apps/home/calendar-planner.tsx`, using the app's postcards, lesson
illustrations, subject markers, shared editing cards and real family log. The scratchpad remains
an independent sample.

The week opens first, with a child filter, date navigation and a selected day's detail beside it.
On phones the days stack and the detail follows them. The month also selects days for editing;
the year retains term dates, attendance and world choices. Subjects & pace shows each child's
subject progress and routine. Find lessons searches the real catalogue by grade and subject,
with previews and additions to a chosen child and day.

Parents can add multiple sessions without replacing existing lessons, including lessons from
another grade or a subject outside the usual routine. Each placed session has its own identity,
date, duration, note and order. Moving a sticker adds it to the destination without swapping away
another session. Move / edit also offers practice, removal and For later. The day detail can
reorder unfinished sessions, copy a day, or move the week's unfinished sessions forward. Completed
or started work stays in the record and cannot be moved or removed. One completed sitting cannot
complete two copies of the same lesson on a day.

A routine chooses weekdays, one to three sessions per chosen day, and an effective date. An empty
weekday selection pauses it. The preview uses the same adaptive curriculum projection as the
calendar. Individually placed sessions survive later routine changes. School days, days off,
family activities and term dates use the existing shared cards. Making a day off parks its
unfinished individually placed sessions in For later; generated sessions follow the day-off rule.
World choices still use `Worlds` in `apps/home/plan.tsx` and the existing eligibility fold.

Changes append `plan-changed` events through the existing parent-authorized API. `session` is a
snapshot of one placement, while `routine` changes the recurring projection from its effective
date. Both are scoped to one child. Batch changes share a timestamp so the history can undo the
whole action. The immediate confirmation offers undo and redo; the history remains available
across reloads. Children consume the same fold, including additional subjects and practice.

The fold lives in `school/family/family.ts` and `school/family/calendar.ts`; `engine/answer.ts`
validates the operations. `school/family/__tests__/sessions.test.ts` covers placements, routines,
completion protection and child isolation. `tools/e2e/calendar.e2e.ts` checks saved additions,
removal, undo, routine changes, the legacy route and responsive layouts against the real API.

## The map, for grown-ups

Built 21 September 2026 from the owner's ask that a grown-up explore the whole overworld and every
world in it with nothing locked, in the map-only view the child has. The bar has a Map place, at
`/map`. It is the school as written, read from the family's pack and from no child's record, so it
works with no child added: the whole country with every world of every year and every place off the
run drawn and open, the years lettered, pan and zoom as far as the sea reaches, and nobody standing on
it, each place's note saying its year and term and how many lessons it holds. Going into a world opens
its roll as written: every day of its year, numbered rather than dated, each sheet drawn as the roll
comes near it at the level the lesson is written, with the answers and the notes for grown-ups, and
nothing lit or inked, since nothing was done. The way back is the roll's own, to the map at the same
place, and the bar is there throughout. Where the grown-up is goes in the address (`/map`,
`/map?world=<id>`, `/map?lesson=<id>`), so back and a shared link both work.

The same map and roll open over a page as a look, in a dialog with the address after the `#`, focus
held inside and given back on close, and nothing recorded. Explore's lesson page has "See it as a
child sees it", which opens the lesson at the level the card has chosen, in its world, with nothing
filled in, and "Open on the map", which goes to the screen with the camera on that sheet; the site's
opening has "See the map", which opens the sample child's map with every world open. The calendar's
lesson card and the journal are still to come as callers, as is a child's own map on the grown-ups'
screen, which the view already allows.

It is `apps/home/map.tsx` with `apps/home/school.ts` building the views from the pack
(`school/worlds/written.ts` for the school as written, which lays a written year out as done for the
roll's geometry and takes back what done would mean), `engine/ui/reading.tsx` for a world's roll
with its sheets drawn as they come near, `engine/ui/overlay.tsx` with `hash.ts` for the look over a
page, and `engine/ui/paper.ts` for the paper near the camera. `tools/e2e/map.e2e.ts` checks the
screen, the lesson page's look and the site's. Two things this work changed underneath: a map that is
a screen, the child's and the grown-up's alike, takes the cover floor and the fence that keep the sea
at every edge of any window, and a stopped canvas view no longer fires the settle it was waiting on,
which had the map going in again after every way out. The world's trail as a place is not drawn for
a written year yet, so the grown-up's way in is map to roll and back.

## Where it is now

What the app builds is a composition of the three options rather than one of them: the home at `/` is
option A's surface, a hello card and a card for each child with today's lessons, the week, where the
child is on their map, what came back and the one thing to look at; a child's journal opens inside
that card as option B's shelf; and the calendar's week is option C's lanes, a day across and a child
down. The morning's order sits under the children's cards, and its lengths are the family's own: each
child's finished sittings say how long their lessons take, by subject once there are five of them and
by their lessons at large once there are eight, and the table of guesses in `school/family/morning.ts`
holds only until then. The card says which of the two it is showing, and names the children whose
lengths are still a guess. The start is the family's own too, the middle of the times their school
days have actually begun, and a grown-up can set it by hand on their own device. Everything on these
screens reads the family's own log through the routes in [api.md](api.md), and nothing on them is
counted or scored in anything a child sees.

The screens are `apps/home/`: `home.tsx` with the cards and the morning, `mark.tsx` for marking a
sheet that came back, `journal.tsx` for a child's roll, `explore.tsx`, `calendar.tsx` and `plan.tsx`,
with `grown.ts` and `where.ts` holding what they work out and `engine/ui/grown.ts` the reads only they
make. `tools/e2e/grown-ups.e2e.ts` covers all five at a laptop's, an iPad's and a phone's size.

What is designed here and not built: Friday's letters, the week spread, and "what else there is".
A child's worlds are chosen in Calendar's Subjects & pace view, and the child's map, the home's card and roll, and the
calendar's year all read the same fold of the family's choice from the child's record rather than
anything in the kid's settings. The calendar's year names each child's world rather than drawing it, and the year is folded in
the browser from the events themselves rather than on the way out, which [api.md](api.md) says when to
change.

## Open questions

- Which option to build. This document does not answer it.
- Whether the three can be composed rather than chosen between. The obvious composition is option
  A's home surface with option B's shelf behind one of its nouns and option C's lane behind "each
  child", and we have not costed it or checked whether the result has an argument of its own.
- Seven tracks and five markers do not divide. Two tracks share a colour in these pages, which is
  a shortage rather than an assignment, and a sixth and seventh marker or a second axis such as a
  hatch is a decision somebody has to take before all seven tracks are built.
- Whether the estimated length of a lesson should be shown at all before we have a term of real
  timings. All three options show it and all three label it as an estimate, which is the weakest of
  the three possible answers. A family with a term behind them now answers it for themselves: the
  morning's order reads their own finished sittings and shows those, and the estimate stands only for
  a child who has not sat down enough times yet.
- Whether marking belongs on the home surface. Option A says yes at one click, options B and C say
  no at two, and this is the disagreement between them we are least able to settle from the desk.
- Whether a family with one child gets a worse product from option A than from the other two. The
  timetable is the argument for A and it has nothing to draw with one child.

---

## The visual directions

Status: four directions built for comparison, September 2026, with a recommendation. The three
options above settled the structure well and read as competent tools: type, tables and hairlines,
with the art arriving as thumbnails. The owner asked for the parent's side to meet the bar the art
shelf, the marketing site and the journal set, and to use our drawings to make the page a pleasure to
open, with a full-bleed journal for the grown-up as one candidate. Each direction below serves all
of the jobs listed at the top of this document, and each differs in what its first screen is for and
in the visual idea it is built on, rather than in its colours. We recommend the first, the journal for
grown-ups, as what the Parents tab opens, for the reasons at the end of this section.

### What the four keep in common

They are built against the same invented family as options A, B and C, and they read it through the
same functions: the morning order from `src/family/morning.ts`, the readings from
`src/family/evidence.ts`, the week from `src/family/plan.ts`, and two new pure modules described
below. The lessons, the questions, the drawings, the worlds and the printed sheets are the real ones.
A skill is never named by its id; it is named by the lesson it was taught in, and a mistake is named
by the sentence its author wrote for it, because that is the sentence a parent repeats at the table.
Nothing on a page explains the design to the person reading it.

What is invented is said where it appears, in words a parent would use. Marks carry "made-up marks,
for this preview", every length carries "our guess until we have timed a few mornings", and anything
that is not built says so on the control that would do it. Each page says in one sentence that the
family is made up, rather than carrying a banner that is read once and then ignored.

All four are light only and take every colour from the tokens in `src/styles/base.css`, mixed against
paper or card where a tint is needed; paper surfaces keep their white squared-paper tokens. Each has
one or two movements and each movement has a job: a sheet lifted off the roll or taken down from the
fridge travels from where it was, so closing it is not a search; a star is pressed on with the
engine's swing spring when a sheet is marked right; a planner page turns in the direction you went.
The springs are the engine's closed forms from `src/engine/spring.ts`, sampled into keyframes, and the
page turn uses the engine's ease. Under `prefers-reduced-motion` every one of them is a cut, and the
journal's creatures stand still, which the world model already enforces.

A star has one rule, in `src/family/week.ts`: a sheet that came back finished, marked, and with every
answer right first time. Stars are named and never counted. No page shows a number of stars, and none
of them stands between a child and a lesson, which keeps them on the right side of the list of what
the product never does.

### The journal, for grown-ups

Each child's roll, edge to edge, in the child's own world, with the grown-up's notes in the margin
and the grown-up's controls floating over it. On a wide screen the two rolls stand side by side, the
harbour for Maya and the sports ground turning into the laboratory for Theo, each opening with its
world's name written across its sky; each roll is given enough of its own past for the two todays to
land level, so a glance across the page is one morning. On a phone it is one child at a time.

Its first screen serves teaching this morning and marking what came back. The page opens at today:
each child's sheets for the day as a pile, the top one showing its first page, the child's guide
standing on the path pointing at it, and between the two worlds a card with the morning's order for
one adult and two children. Above today is last week, a day at a time, with a note stuck on each day
saying how each sheet went and, where it came up, the author's sentence for the mistake. Opening a
day lifts its sheets off the roll to be read at full size beside a card for the grown-up; a paper
sheet that has not been marked opens beside the grown-ups' sheet with a box to tap for each question.
The week, where each child is, what to ask for, the records and what else there is are panels
behind five labels in the floating bar.

It borrows the most of the four, and all of it from the journal: the roll's geometry from
`src/world/roll.ts`, the stretch, scenery and tape painters from `engine/ui/scenery.ts`, the guides, the
family's saved choice of worlds, and the rule that a world reaches into a lesson, so the harbour's
market stall stands beside Maya's coins lesson with its line. What differs is only what a day holds:
on the child's roll a day is its sheets one under another, and here it is a pile, because a parent
reading a week wants the days rather than every page. The grown-up's note is the journal's date tag
grown into a card. It costs 1,112 lines and 10 kB gzipped, plus a 3 kB module shared with the others
that is the only place the parent's pages import from `src/world`.

What it makes hard: four children cannot stand side by side at any common width, and three only from
1,350 pixels, so a larger family on a laptop gets one roll at a time and loses the one-morning glance;
the world is busy for a parent who wants the facts first, which is the other side of it being the most
beautiful of the four; and it is the direction most exposed to changes in `src/world`, which is still
being extended.

#### Every world, and one, two or three children

We checked every world in this direction in September 2026, the twelve of the run and the eleven
round it, each put in front of both sample children with `?world=` (a world by its id or its name, or
`?world=maya:marsh,theo:canal-town` for one each, from the term each child is in today; nothing is
kept). Every world drew its own sky, horizon, name, gate, guide's line, ground, path, landmarks,
creatures and date tags, and none fell back to another world's scene or lost its line. What was thin
was the page around them. It styled the world's drawings from a copy of the journal's rules made when
only the older creatures moved, so the twelve worlds whose drawings move as the drawings declare, the
harbour and the eleven, stood still here, the marsh's reflections were drawn at full strength instead
of faintly, and nothing settled or paused off screen. The page now loads `journal.css`, the roll's own
stylesheet, and keeps in `parents-journal.css` only what is the grown-up's, so the world here is the
child's world, with its drawings, its motion and its guide, and a world added or changed later reaches
this page without anyone copying a rule. Each roll is a stage in that stylesheet's sense: the world
settles when a day's pile is under the middle of the screen and covers a quarter of it, or when a day
is lifted off the roll to be read, which is the journal's own test, and anything off the screen is
paused.

A family of three now stands side by side while each column is at least 450 pixels wide, which is from
1,350 pixels, and the first button says "Everyone" rather than "Both"; narrower than that, and for two
children below 900 pixels, the page shows one child at a time, and a family of one has nothing to
choose between, so the buttons are not shown. Three worlds leave no seam for the morning card, so the
first child's today carries the whole morning under their pile and each of the others carries their own
part of it. On a phone the roll keeps enough of the world either side to show the gate each world is
arrived at, and a card a drawing says is left off where there is no room for it beside the sheet,
rather than cut in half at the edge of the screen. Every control on the page is 44 pixels.

The roll also reaches back to the first day of the term, from a button above it, so the grown-up's
journal can read from the world's arrival down to this morning, the way the child's journal reads as a
page ([journal.md](journal.md), "The journal as a page"). It paints the whole term at once when asked,
which took 0.4 seconds for the two sample children and 1.1 seconds for the demo family of three in the
development server; we have not needed to paint it as it scrolls into view. The two stay separate pages: this one is the
grown-up's week for every child, with the notes, the marking and the morning, and the child's page is
one child's journal as the child sees it.

### The fridge

Where a family already puts a child's work. Last week's sheets are pinned to the fridge door as the
pages they were, a printed sheet in pencil grey as it came out of the printer and a screen sheet in
colour inside a photograph's white border, each under a magnet, a strip of tape or one of the shelf's
own drawings used as a magnet. A sheet that came back right carries a star; a sheet where a named
mistake came up carries a note in the grown-up's hand with the author's sentence. Each child's half
of the door is headed by their name in alphabet magnets. The freezer door holds the morning on a
sticky note and a postcard from each child's world; beside the fridge, on the tiled wall, are the week
on a pad, a list of things to ask for, the kitchen calendar with the days taught shaded, and a leaflet
of the subjects the family has not started.

Its first screen serves marking what came back and seeing where each child is. Paper that has come
back and not been marked hangs in a clip at the top of each child's half, and marking it is taking it
down, tapping what was wrong on the grown-ups' sheet and putting it back up, where it lands among the
week's work with its star if it earned one. On a phone the freezer door comes first, so the first
screen there is the morning. It borrows the shelf's page furniture (the stickers, the card held down
by tape or a clip), the shelf's props as magnets, its calendar and step drawings, and the world
pictures. It costs 559 lines and 6 kB gzipped.

Its weakness is the morning and the plan. A parent at nine needs the order of the day, and on the
fridge that is a note; a parent on Sunday needs to change the week, and on the fridge that is a pad
with two buttons.

### The planner

A planner book open on the desk at this week. Monday to Wednesday on the left page and Thursday and
Friday on the right, each child's lessons stuck on the day they fall on as die-cut stickers of the
lesson's own first drawing, with a strip of the track's colour across the top, and a tick or a star
from the shelf's stickers on each one that was done. A lesson not done yet can be dragged to another
day; a week that went wrong is one button that lays a strip of tape across the rest of it and moves
everything on a week, with nothing lost. The corner of the page curls, and turning it goes to the
week before or after. Tabs down the edge open each child's pages, which are a tracker with a row a
subject and a box a lesson, the notes of what to ask for, the term with its calendars and hours, and
the inside cover, which says what the planner holds and what lumischool never does.

Its first screen serves planning the week and printing it, and changing it when the week goes wrong.
Teaching this morning is today's box, which opens a day page with the morning drawn as an hour
schedule; marking is a paperclip on the sticker of a sheet that came back and was not marked. It
borrows the least from the journal and the most from the shelf: the stickers, the calendar month and
the first drawing of every lesson. It costs 647 lines and 7 kB gzipped.

Its weakness is that it is a tool for Sunday. On a weekday morning it asks a parent to find today on
a spread, and the evidence is a sticker per lesson, which is right for a planner and thin for a
parent asking how a subject is going.

### The letter

The week told as a short letter from each child's guide, dated the Friday, with the child's sheets set
into it as photographs in corner mounts. Two envelopes stand at the top, each stamped with a picture
of the world the child was in that week and postmarked with the date; the open one's letter is below
it, headed by that world's horizon with the guide standing on it, set in the reading face at a size a
phone reads comfortably, and signed in the hand ("the paper bird, at the harbour"). Beside it are the
enclosures a letter from a school would carry: Monday morning's order, the sheets waiting to be
marked, where the child is in each subject, the week for the records as a slip, next week with one
button to move it, and a list of things to ask for. Earlier letters are in a box below, one a week
back to the start of term, each from the world that week was in.

Its first screen serves seeing where each child is, at the end of the week, and it is the only one of
the four that is better on a phone than on a desk. The letter is written by `src/family/letter.ts` from
the same facts every other page reads, and it prints as a letter and nothing else, which is real in
this preview. It borrows the world pictures and the guides, and the site's habit of letting a few
drawings carry a page of type. It costs 407 lines and 6 kB gzipped, plus the 160 line letter module.

Its weakness is that it cannot be the home surface. It tells, and a parent at nine needs to act.

### What we explored and did not build

The kitchen table was the brief's own suggestion for the morning: the hand-drawn counter or birthday
table as the surface, each child's sheets laid where they will sit and the guide at the end of the
table. Its first screen would serve the same job as the journal's and as option A's, and our settings
are drawn side on at fourteen squares wide, so a table that holds six sheets at a readable size would
be a new top-down drawing rather than a use of the ones we have. The best of it, the morning as
things set down in turn, is the journal's morning card.

A map of worlds for grown-ups, the child's map with a token for each child, would serve seeing where
each child is. We did not build it because the map is the child's and shows a year at a time, and a
parent's question is about this week; it also turns a place into a progress bar. A departure board
for the morning, trains leaving at 9:00 and 9:06, is option A's timetable in costume. A garden with a
plant for each subject was rejected on principle: a plant that grows with lessons done is a reward,
and a lost week would have to wilt it, which the list of what the product never does rules out. A
scrapbook of kept sheets is a monthly records job and weak as a home surface; the fridge and the
letter's box of earlier letters carry what was good in it. A desk with an in-tray of paper to mark is
the paper tray rejected in the first pass, and the fridge's clip is the part of it worth keeping.

### How they compare

| | The journal | The fridge | The planner | The letter |
|---|---|---|---|---|
| The first screen serves | teaching this morning, marking | marking, where each child is | planning and printing, repairing the week | where each child is, at the end of the week |
| Built on | the child's roll and worlds | the family's fridge door | a planner book | a letter from the guide |
| Borrows most from | the journal | the shelf's page furniture | the shelf's stickers and calendar | the worlds and the guides |
| Moves | a day lifted off the roll, a star pressed on | a sheet taken down and put back, a star | a page turned | a letter out of its envelope |
| Weakest at | a large family, a parent who wants facts first | the morning and the plan | a weekday morning | anything that has to be done now |
| Best on | a laptop | a laptop or a tablet | a laptop | a phone, and on paper |

### Trying them

The Parents tab opens `parents-v.html`, which mounts one direction at a time, chosen by `?v=` on the
URL: `journal`, `fridge`, `planner` or `letter`. Each is a module with its own stylesheet, loaded by a
dynamic import only when it is asked for, so trying one costs nothing for the others and the page never
carries all four. Options A, B and C are whole pages with their own shells, so `?v=a`, `?v=b` and
`?v=c` send the browser to their own pages rather than copying three shells into a second place,
where the first edit to one of them would break the copy.

On localhost a small picker floats at the bottom left of every one of them: the three options by
letter, the four directions by word, the name of the one being looked at and which job its first
screen serves, and the square brackets to step through them. It is the kit's switcher extended rather
than a second one; its list lives in `src/pages/parents-variations.ts`, which the host page reads
before it loads anything heavy. On a real host the picker is never built.

### Which the Parents tab opens

The Parents tab opens the journal for grown-ups. The reference page, a description of the parent's
side in the order of a morning that the nav listed as "Parents reference", was removed on 15 September
2026, since the tab is where someone goes to see the parent's product and the journal is our
recommendation for it.

We recommend the journal as the home surface for three reasons. It serves the job a family meets every
day, the morning and what came back, on its first screen. It makes the parent's side and the child's
one product rather than two: the parent opens the same world, the same guide and the same sheets their
child does, with their own layer over it, and nothing about the parent's side needs a theme of its own.
And it is where the drawings do the most work, because every drawing on it belongs to a lesson, a day or
a world rather than decorating a panel. We would build it with two things taken from the others: the
letter as the Friday companion, sent to a phone and printed for a grandparent, and the planner's week
spread as what the journal's "This week" panel becomes, because planning is the one job the journal
does worst and the planner does best. The fridge's way of marking, taking a sheet down and putting it
back with its star, is already the journal's marking in another material.

### What changed under the pages

`parents-v.html` and `src/pages/parents-v.ts` are the host page. `src/pages/parents-variations.ts` is the
list the host, the picker and this document agree on. The four directions are
`src/pages/parents-journal.ts`, `parents-fridge.ts`, `parents-planner.ts` and `parents-letter.ts`, each
with a stylesheet of the same name under `src/styles`. `src/pages/parents-worlds.ts` is the one place
the parent's pages touch `src/world`, so that when an export there moves, one file follows it; it also
draws a world as a small picture of its own horizon, from the world's data, for the postcards, stamps,
letterheads and panels, reads `?world=` so any world can be reviewed in these pages, and passes the
journal's settle test and the water's easing from `engine/motion/world.ts` through to the journal.

`src/pages/parents-kit.ts` gained a section read only by the four: what a day holds for a child across
every track, what came back and what is waiting, where each child is and the one thing to look at, the
week as planned, the records, what can be asked for with the fresh questions it would use, the
platform's breadth, and a small store that keeps marks made on the page for the life of the page, so a
sheet marked in one view has its star in another. It also gained the motion helpers that sample the
engine's springs, and the extended switcher. Options A, B and C are unchanged apart from the switcher
they already called.

Two pure modules are new in `src/family`, and no existing function changed. `week.ts` groups the
evidence by the sheet, which is the thing a family pins up, sticks in a planner or tucks into a letter:
one sitting and what was marked on it, the star rule, what is waiting to be marked, and a day's plan set
against what came back that day, with a lesson done on a day it was not planned for kept rather than
dropped. `letter.ts` writes the week as a letter from those facts and refuses what the rest of the
product refuses: it never says a child is behind, never counts stars, says a short week as a number of
days rather than a verdict, and leaves out a mistake that came up only once. Both have tests, in
`test/week.test.ts` and `test/letter.test.ts`.

### Open questions for the visual directions

- Whether a parent at nine wants the child's world at all, or wants the facts first with the world a
  step away. We think the world earns its place because every drawing on the page belongs to a lesson or
  a day, and we have not put it in front of a parent.
- How the journal holds four children, and three on a laptop narrower than 1,350 pixels. One roll at a
  time works and loses the morning glance; the morning card could carry the glance on its own, and we
  have not drawn it.
- Whether the letter is weekly, as built, or daily. A daily letter would repeat itself most days; a
  weekly one is what a grandparent would want, and it cannot answer a question about Tuesday.
- Whether stars belong on the parent's side. They are a fact about a sheet and never a count, and a
  family will still count them.
- Whether dragging a lesson to another day in the planner is a plan change the data model records as an
  event, as [data-model.md](data-model.md) asks of plan changes, and what the child's device shows when
  the parent's device moved a lesson it had already printed.
- Whether a world picture on a stamp or a letterhead should be the world as the family changed it, as
  built, or always the world as it comes, so that two families' letters from the harbour look alike.
