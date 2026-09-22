# The parent's side

Status: proposed, September 2026. This is the spec for `features/family` and `apps/home` in
[structure.md](structure.md), written against the product in [product.md](product.md) and the sixty
lessons in [curriculum.md](curriculum.md). It is a proposal rather than an agreed plan: the order of
work in the last section is the part we most want argued with.

The owner's question was what core functionality parents need to author curricula or specific
lessons, manage a child's behaviour and performance, and get analytics on activity including the
time taken on each question. This document answers that, and it also disagrees with the shape of
the question in one place. Authoring, behaviour and analytics are three good answers to "what would
a dashboard have", and the parent's week is mostly not spent looking at a dashboard. So we start
from the week.

## The week we are building for

The family is one parent teaching two children at home, one in grade one and one in grade three,
which is the case the product has to be good at rather than the easy case of one child. What that
week contains, in the order it happens:

Sunday evening, the parent prints. Five days for each child, the grown-ups sheets kept separately
so a child does not find the answers, and a guess at whether the week is too much. This is the one
moment in the week when the parent thinks about the whole week, and it takes ten minutes if the
product is good and ninety minutes if it is not.

Monday morning, two children at one table. The grade one child cannot read a story problem alone,
which is a constraint the curriculum already states, so there is a block of the morning where the
adult has to be sitting with her. The grade three child can work alone for twenty minutes but
needs the method explained first. The parent's real problem is not "what should each child do
today", which the product already knows, but "in what order, so that I am never needed in two
places at once". Nothing we have seen in this category solves that, and we can, because a lesson's
sections are declared in the notation and we can tell which of them need an adult.

During the day, marking. Most of this work happens with a pencil on a printed sheet, which means
the evidence does not exist unless the parent puts it there. This is the fact that shapes our whole
analytics story: we will have rich evidence from screen work and thin evidence from paper work, and
paper is the mode we have deliberately made good. So the marking path has to cost under a minute
per sheet, and every number we show has to survive being computed from thin evidence.

The end of a lesson, the one decision that matters. Move on, or stay on this another day. A parent
who gets this wrong in one direction leaves holes, and in the other direction spends three days on
a thing the child already knew and loses the child's goodwill. This is where the product earns its
subscription.

Friday, what actually happened. Two days were lost to a cold and one to a visit, so the week ran
three lessons behind. The plan has to absorb that without the parent re-planning the year by hand,
and without any part of the interface implying that the family failed.

Somewhere in the month, the records. Depending on the state, that is days of instruction, hours by
subject, a portfolio of work samples, a lesson log, or an annual written evaluation. This is real
paperwork, it is a real reason families pick one curriculum over another, and we can produce almost
all of it from evidence we already have. We are also the only part of the family's week that knows
what was taught on which day.

Once or twice a year, somebody else teaches. A grandparent takes a week, or a tutor takes the
fractions unit. What they need is the sheets, the answers, and one page saying where the child is
and what to watch for. Most of that is a print job rather than an account system, which is why it
can come early.

## The functions

Each entry says what it does, what data it needs, what it looks like, and what has to exist in the
core before it can be real. They are grouped by rank, and the ranks are an order of work.

### Rank 1: the day

These four are the product for the parent. If we build only these and build them well, a family can
use lumischool for a year.

**Today.** One card per child: the lesson, its goal in the one sentence the notation already
carries, an estimated length as a range, and two buttons, open it on screen or print it. Below that,
the single most useful sentence we can write about yesterday, and nothing else. Needs the year plan,
the child's position in it, and for the estimate the child's own pace on earlier lessons. Looks like
a card on paper with the lesson's own first drawing on it, so the parent recognises today by its
picture. Core: the plan feature and a place to read a child's position from. It can ship before
there is any evidence store, with the estimate marked as a default rather than as this child's pace.

**Print the week.** Monday to Friday for every child in one action, child sheets in order, grown-ups
sheets collated at the back, with a page count and a warning when a lesson will not fit the paper
size chosen. Needs the week's lessons and the paginator, both of which exist. Looks like a stack of
real sheets, previewed at the size they will print. Core: `kernel/draw` paginates already; doing
this on the server at volume needs `services/jobs` and the PDF surface.

**Mark a sheet.** The grown-ups sheet already lists every question with its answer. Marking is the
inverse of reading it: the parent taps the questions that were wrong, and everything untapped is
right. One tap per mistake, then save. Where a question has a feedback rule that matches what the
child actually wrote, the parent can tap the rule instead of just marking it wrong, which is worth
doing because it turns a mark into a diagnosis. Needs an evidence store that accepts a parent as the
marker, and the item's feedback rules. Looks like the grown-ups sheet with a checkbox column, on
screen, in the same ink as the printed one. Core: the evidence store, and this is the function that
justifies building it first.

**Read the sheet as it was done.** In the journal a past day is the child's own paper, drawn as they
left it: the answers they typed or picked written in, the pieces they placed on a drawing where they
placed them, the hints they opened, and a tick on each question that came back right, with nothing
to answer. A lesson done on paper, or one whose file has changed since it was done, says so rather
than showing answers that are not the child's. It is the same sheet the child sees when they look
back at that day in their own world, drawn by one piece of code: `school/lessons.ts` folds the
lesson's own events into what each question was left at (`leftIn`), and `engine/ui/lesson.tsx` draws
a sheet from that state (`sheetState`), so a parent and a child never read two versions of the same
work. What may be done to a sheet is separate from what it shows: the child's app builds the actions
that check a try and record it, and the journal builds none, so a page that shows a child's work
cannot write against it. The paper is loaded as the journal is scrolled near it and let go of behind,
so a term can be read without the page growing, and each card's measured height is kept, so nothing
moves under the reader as paper lands.

**Move on, or stay another day.** One card per finished lesson with a recommendation, one sentence
of reason that names the evidence, and three buttons: move on, another day, or park it. "Another day"
is not the same page again; it is the same items re-seeded, which we can do because a question
declares its parameter ranges. "Park it" moves the lesson later in the year and does not leave a
mark. The parent's choice is recorded as an override and the override sticks, which the product
document already requires of the scheduler. Needs per-skill evidence and the ability to write a plan
override. Looks like three plain buttons and a sentence, not a score.

We have not measured the thresholds this recommendation would use, so the first version should
recommend "stay" only on the pattern we are most confident about, which is the same feedback rule
matching more than once in one sitting, and otherwise ask the parent.

### Rank 2: the week

**The week strip.** Planned against done, five columns per child, several weeks visible. A cell is
one of: done, done late, skipped, not yet. Needs session records with dates. Looks like the day
cards from the art shelf, with the day the family is on looped in pencil.

**Shift the plan.** One action that moves the rest of the year by a week, and one that drops a
lesson from the plan without deleting it. Prerequisites are recomputed, so the product refuses a
shift that would put a lesson before the thing that opens it and says which. Needs a mutable plan
per child, which does not exist yet: today the year is a constant in the repository. This is the
single largest missing piece in the core for the parent's side.

The plan is `plan-changed` events today (`track`, `shift`, `park`, `set-day`), and the family
calendar prototype settled which operations come next (decided 15 September 2026, to add later):

- `days-off {from, to, note}`, with `kid_id` null for the whole family
- `school-days {weekdays}`, per child
- `terms {terms[]}`
- `move {track, from, to}`, one lesson of one track to another day
- `undo {of}`, naming the event it takes back
- a family day is a `days-off` for everyone plus a `day-added` per child

**The gap ledger.** Every skill that is not secure, each with the number of attempts it rests on and
the number of days those came from, what the matched feedback rules say the mistake is, the lesson
that taught it, and the lesson that will come back to it. Sorted by how much it blocks, not by how
wrong it is. Needs per-skill evidence and the skill graph. Items already declare `skills=[...]`, so
the data model is in place and the roll-up is not written.

**More practice like this.** The first authoring layer, described below. A parent presses it on a
lesson and gets another sheet of the same items at the same skill with different numbers. Needs the
variant selection we already have in the workspace, and nothing else.

### Rank 3: the morning, and the paperwork

**The morning order.** The two or three children's lessons interleaved so that the blocks needing an
adult do not collide. Every lesson is a sequence of sections, and each section's kind tells us
whether the adult has to be there: a `look` section is taught, a `story` section at grade one has to
be read aloud, `practice` and `do` are independent, `remember` is a sentence the child reads. From
that we compute an attention profile per lesson and lay the morning out as a timetable. Needs the
lessons, their sections, and an estimated length per section. Looks like the day timetable from the
art shelf, one column, with each block labelled by child and marked where the adult is needed.

This is the function we think is most likely to be the reason a family with two children stays, and
it is buildable now, because everything it reads is already in the notation.

**Records.** A school year with dates the parent sets, a target for days and for hours by subject
because those numbers differ by state, and then: a day-by-day attendance log, hours by subject,
a lesson log with dates and titles, and a portfolio of the actual sheets as PDFs. Plus one thing we
would not think of from the software side, an "add a day" action with a note, because a museum trip
is instruction the product never saw and the parent's legal record has to include it. Needs sessions
with dates, the print job for the portfolio, and settings for the year. We produce records; we do
not claim compliance and we do not give legal advice, and the interface has to say so without
burying it.

**Settings.** What the parent can set, listed under Behaviour below.

### Rank 4: other people, and looking closer

**The handover pack.** One print job: the sheets for a week, the grown-ups sheets, and one page
saying where the child is, what she is secure on, the one thing to watch for, and how a lesson runs.
No account, no permissions, no login for the grandparent. Needs the print job and the gap ledger.
This is deliberately ranked above the tutor seat, because it is the same need met with a tenth of
the work.

**A tutor seat.** A second grown-up attached to one child for a window of time, who can see that
child's lessons and evidence, mark work, and not change the year or see the family's other children.
Needs accounts, roles and an audit of who marked what. The product document says a tutor is a second
grown-up attached to a child rather than a different system, and this is what that means in the data
model.

**Look closer.** The analytics detail, per question: what was asked, what the child answered, right
or wrong, how many attempts, which feedback rule matched, and how long it took, shown as a
distribution rather than an average. Behind a link from the gap ledger, never on the front page.
Needs the full attempt record.

**Change a question.** The second authoring layer, below.

### Rank 5: authoring proper

**Write a question**, and **reshape a year**. The third and fourth authoring layers. Both need the
verifier reachable from the home app without shipping the verifier to the home app, which is a core
decision rather than a feature, and it is the reason these are last.

## Authoring, in layers

A parent who wants more practice, a parent who wants to change a number, and a parent who wants to
write their own year are three different people, and only the first two are common. We should build
them as four layers with different costs and different relationships to the verifier.

**Layer one, choose a different sheet.** The parent asks for more practice, or fewer questions, or
the easier end of the range. Nothing new is authored: we pick different variants of items that were
already proved at build time, so the verifier has already run and there is nothing to re-prove. This
is the most wanted and the cheapest, and it is the only authoring in rank 2. The one thing it needs
from the core is that a pack carries enough variants to pick from, which argues for keeping more
than the handful a lesson uses.

**Layer two, change the shape of the year.** Reorder, skip, insert a lesson from another grade, set
the pace, mark a unit as done without doing it. Still no notation: the parent is editing a plan
overlay on top of our year, and the base year stays visible underneath so the parent can always ask
what we would have done. Needs the mutable plan from rank 2. Prerequisites are checked and the
product explains a refusal rather than blocking silently.

**Layer three, change a number in a question.** The parent wants the prices in dollars they actually
see, or the names to be their children's names, or the numbers to stay under twenty. Two cases,
and they are not the same. Where the change is inside what the item already declares, a price in a
range the item allows, a role mapped to a different prop, we are still choosing among proved
variants and the answer is safe. Where the change is outside the declared range, we have made new
content and it has to be proved: the answer must evaluate, the drawing must fit, the props must fit
their containers, and no feedback rule may also fire on the correct answer. Those are the verifier's
existing checks and there is no weaker version of them we are willing to ship.

**Layer four, write a question or a year.** A form generated from the vocabulary, the same way the
studio will generate one, producing notation text that goes through the same checker and verifier a
model's output goes through. The parent sees errors with a line and a column, or more likely sees
them rewritten as sentences, and a question that fails is saved as a draft that cannot be printed.

Where the verifier sits is the open decision behind layers three and four. The structure document
gives `apps/home` the run time and data phases only, so the parser, checker and verifier may not be
in the parent's bundle, for the same reason they are not in a child's. The options are a studio
build the parent is sent to, which is honest but makes authoring feel like a different product, or
the verifier as a service that the home app posts notation to and gets a report back from. We prefer
the service, because it is also what content compiles through and because it keeps one gate rather
than two. It needs `services/jobs` and a request budget, since verifying an item means evaluating
every variant or a seeded sample of four hundred.

One rule holds across all four layers: anything a child sees has been proved, whoever wrote it. A
parent's own question is not a lesser class of content with a warning on it. It either passes the
gate or it stays a draft.

## Analytics

### What we record

One row per attempt at one question, which is the grain everything else is computed from:

- which child, which lesson, which section, and the question's position in it
- the item's id and version, and the variant, meaning the values its parameters took
- what the child answered, as given
- right or wrong, and on which attempt
- which feedback rule matched, where one did
- how many hints were opened
- the mode: on screen, or on paper and marked afterwards
- for screen work, the time from the question appearing to the first input, and from the first input
  to the answer being submitted, and whether the page lost focus in between
- who marked it and when: the child's own submission graded by the same rules the verifier used, or
  a grown-up entering a mark from a sheet

And one row per sitting: the child, the lesson, when it started and ended, which grown-up was there
if the parent says, and whether it was finished or stopped.

There is a second grain of evidence arriving alongside this one. The activities work in
`src/play` records a move log per attempt, with the gap before each move and how far from a win the
position was, which is a finer grain than a question and answers a question a worksheet cannot: a
child who gave up two moves from the end and a child who never got past the first move look the
same on paper. The two do not merge. An activity's record rolls up into the same skill ledger
through the same fields, the skills it exercises and whether the attempt succeeded, and the parent's
side should read both through one interface rather than growing a second one.

Two things are worth saying about the shape of an attempt row. The item's version is in the row
because a question can be edited, and evidence about a question that no longer exists is still
evidence about a skill.
And the matched feedback rule is the most valuable field in the row, because the verifier has already
proved that the rule does not fire on a correct answer, so a match is a named mistake rather than a
guess about one. We do not know of another product in this category that can say that, and it comes
free out of a decision we made for a different reason.

### What we can legitimately infer

That a skill is secure, from repeated right-first-time answers across several variants of it and
across more than one day. Variants matter because one variant answered right four times may be a
remembered answer rather than a skill.

That a specific mistake is happening, from the same feedback rule matching more than once. This is
the strongest inference we can make and it is the one that turns into teaching.

That a boundary is the problem rather than the skill, from accuracy dropping as a parameter crosses
a value, which for grade one addition is nearly always crossing ten.

That a skill has gone quiet, from the time since the last evidence, which is what the review
scheduler reads.

Something about fluency, carefully: the median time on a skill the child is already secure on,
compared against that child's own earlier median on the same item. Not against another child, not
against an age, and not on a skill the child is still learning, where a slow answer is a child
thinking and thinking is the point.

### What we refuse to infer

Effort, attention, motivation or engagement from time on task. A child who left the table to find a
pencil looks exactly like a child who thought hard, and no amount of interface confidence makes that
distinguishable. This is the main claim in this section and it is the reason we will not ship a
number called engagement.

Anything from one attempt. One wrong answer is not a gap and we will not draw a conclusion from it,
which means the interface has to be comfortable saying "not enough yet" often.

Anything comparing one child to another, to an age, to a grade level, or to a percentile. We have no
norms, we are not going to invent them, and a family who wanted a percentile is better served by the
standardised test their state may already require.

Timing on paper work. We know the sheet was marked; we do not know how long any question took. A
parent can tell us how long the sitting was and we will record that, attached to the sitting rather
than to the questions.

A predicted score, a grade equivalent, a learning style, or a readiness percentage.

### How the interface shows the uncertainty

Every claim carries what it rests on, in the same line, as a count: "secure, from nine right across
three days" or "not enough to say yet, two attempts". Where the count is below the threshold we do
not show a percentage at all, because a percentage of three attempts reads as more solid than the
sentence it replaces.

Times are shown as a distribution and never as a mean. The dot plot from the art shelf is the right
drawing for this: one dot per question over the number of seconds it took, so the parent sees both
the cluster and the one question that took four minutes. Attempts where the page lost focus, or
where the gap was longer than a few minutes, are drawn in the same plot but marked as away from the
page, because dropping them silently is the same dishonesty as averaging them in. A parent who looks
at that plot learns something true in two seconds; a parent who reads "average 41 seconds" learns
something false.

Trends need enough points to be a trend. Three sittings is not a line and we will not draw one.

### What a parent is shown by default

Three things per child, and this is much less than we could show:

1. Today, and the estimated length as a range.
2. One thing to look at, which is the strongest single signal we have, usually a named mistake from
   a repeated feedback rule and occasionally "nothing, this week went well".
3. The week strip, planned against done.

Everything else is behind one link. The reason is not minimalism for its own sake. A parent who
opens a page with fourteen numbers on it has to decide which of them matters, which is work we are
supposed to be doing for them, and most of those numbers will be computed from too little evidence
to deserve the attention they get.

## Behaviour

The product document rules out points and streaks a child works for instead of working for the
maths, rules out rewards that gate the next lesson, and rules out a hidden algorithm choosing what a
child sees. Inside that, there is a real set of things a parent should be able to set.

What a parent can set, per child: how long a day is, in minutes or in questions; what happens when
that runs out, which is either stop or finish the section; how many questions a practice block gives;
whether hints appear on request or after one wrong answer; whether the child sees right and wrong as
they go or at the end; how much of Monday is review; whether questions are read aloud; whether the
default is paper or screen; and what the child can see of their own record, where our default is the
map and their own finished sheets but not their times.

What the product never does, regardless of settings: gate a lesson on a reward; show a streak that
can break; compare a child to another child or to an average; send a notification designed to pull a
child back to the screen; choose the next lesson by a rule it cannot state in one sentence; show a
countdown timer unless the parent turns one on; or describe a child as behind anywhere in the
interface.

### When a child is struggling

This is a teaching problem before it is a software problem, and the product's job is to hand the
parent the words and the smaller step rather than to solve it. Concretely, the stuck card gives five
things: what the matched feedback rules say the mistake is, in a sentence a parent can repeat; the
earlier lesson that teaches the step underneath it; a short re-seeded practice at the easier end of
the range; two sentences of what to say and one thing to do with an object on the table, which is
content an author writes per skill and not something we generate; and permission to park the lesson
for a week, which shifts the plan and leaves no mark.

The fifth is the one families will use most and the one a product in this category usually will not
offer, because parking a lesson looks like failure in a dashboard. It is not. It is what a good
teacher does.

The words and the object are content we do not have yet. Lessons carry a grown-ups note, which is
the right place for it, and the sixty lessons should be written with the struggling case in mind
rather than only the successful one.

## Privacy

The amended COPPA rule is in force and this is a design constraint on the data model rather than a
page in the settings.

A child does not have an account. A family has an account, held by the parent, and a child is a
record under it. That means a child has no email address, no password of their own by default, and
no way to be contacted. Consent is the parent's account, and there is no flow in which a child
agrees to anything.

What we store: the parent's email and a password hash; a display name and a grade band per child;
the plan and its overrides; evidence rows as described above; marks the parent entered; and work the
parent chose to keep in the portfolio. A grade band rather than a birth date, because the product
needs to know which year to teach and does not need to know how old the child is.

What leaves the device: from the child's build, evidence rows to our own API and nothing else. The
child's build carries no third-party code and talks to no outside host, which is already enforced by
`check:privacy` in the repository rather than promised in a policy.

What we will not collect even though we could: keystrokes inside an answer beyond the answer itself;
audio or camera; screen recordings; timing while the app is in the background; device or advertising
identifiers; location; contacts; and any identifier that would let us recognise the same child on
another site. Several of these would improve the analytics, and the one that would improve it most,
knowing whether the child was at the table, is the one we most clearly should not have.

Retention, which the amended rule requires us to publish and to limit: evidence is kept while the
account is open, because the family needs multi-year records; it is deleted within a stated window
after the account closes; the portfolio is kept only while the parent asks for it. Deletion of a
child's record is immediate on request rather than a soft delete with a recovery window, with one
carve-out the parent chooses: the records export runs before deletion, because a family may be
legally required to hold what we are about to destroy.

Export, because evidence belongs to the family: everything, as data and as the PDFs, in one action,
without asking us.

A tutor seat is scoped to one child for a window of time and never sees the family's other children.
That is a data model constraint, not a UI one.

## What we are not building, and why

No points, streaks, leaderboards or a reward economy. Ruled out by the product document, and the
reason holds: a child who works for the sticker stops when the stickers stop.

No engagement or attention metric. We cannot measure it and the proxy we would use is dishonest.

No predicted score, grade equivalent or percentile. We have no norms.

No reading of a photographed sheet. A parent photographing work for the portfolio is useful and we
should do it; claiming to have marked what we did not see is not, and a wrong mark from an OCR pass
is exactly the failure the product document says loses a family permanently.

No automatic filing of state paperwork, and no legal advice. We produce records. The parent files
them and the interface should be plain that the requirement is theirs to know.

No classes, rosters or assignments. The product document defers these until schools are a real
customer, and the family stays the unit even then.

No messaging between families, and no social layer.

No weekly email digest by default. A weekly summary that arrives whether or not the week went well
becomes a guilt machine, and the families most likely to cancel are the ones having a hard month. It
should exist and it should be off until asked for.

No parent-facing feed of everything the child did. It is technically the most impressive thing we
could build from the attempt rows and it is the least useful thing on this list.

## What has to exist in the core

| Needed by | What is missing | Where it goes |
|---|---|---|
| Mark a sheet, move on, the gap ledger, look closer | the evidence store: attempt rows, sittings, and the roll-ups | `features/play` records, `services/db` holds, `features/family` rolls up |
| Shift the plan, reshape a year, park a lesson | a plan per child that can be changed, instead of a year that is a constant in the repository | `features/plan` |
| Print the week at volume, the portfolio, the handover pack | PDF rendering off the browser | `services/jobs` and a PDF surface |
| More practice, change a number | variants reachable at run time from the pack, rather than only from the verifier | `kernel/pack` |
| Write a question, reshape a year | the verifier reachable as a service, so the home app never contains it | `services/jobs`, with the phase rule intact |
| A tutor seat | accounts, a second grown-up per child, and a record of who marked what | `services/core` |
| Marking anything a child writes rather than picks | the answer model, which the product document already names as the next piece of core work | `kernel` |

The last row is worth pulling out. Until a child can produce an answer rather than pick one, a
written sentence and a formed letter cannot be marked by us at all, the grown-up is the marker, and
the page has to say so. That is already the position the product document takes for the reading and
music strands, and it holds for anything the parent authors in that shape too.

## Order of work

1. Today, print the week, mark a sheet, move on or stay. With the evidence store underneath them,
   because three of the four need it.
2. The week strip, shift the plan, the gap ledger, more practice like this. With the mutable plan
   underneath the second.
3. The morning order, records, settings.
4. The handover pack, look closer, change a number, the tutor seat.
5. Write a question, reshape a year, with the verifier as a service.

The morning order is the one we would consider moving up, because it needs nothing that does not
already exist and it is the clearest thing we have that a family with two children cannot get
elsewhere. It sits in rank 3 only because the four functions above it are the ones a family with one
child cannot do without.

## Open decisions

- Whether the verifier runs as a service or the parent is sent to the studio build for layers three
  and four. We prefer the service and have not costed it.
- Whether evidence is its own feature or lives inside `play`. The structure document already lists
  this as open, and the parent's side is the reason it will not stay inside `play`: the roll-ups are
  read by `family`, by the services and by the review scheduler.
- What the recommendation thresholds should be. Everything numeric in this document is a starting
  point and none of it is measured.
- Whether the estimated length of a lesson is worth showing at all before we have a term of real
  timings, given that a wrong estimate is worse than none.
- How much of the records section can be built without knowing which state the family is in, and
  whether we ever encode a state's requirements or only ever let the parent set the targets.
