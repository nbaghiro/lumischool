# Data model

Status: options for comparison, September 2026. This document is deliberately not a decision. It
sets out what the data model has to carry, measures the corpus and the prototype so that the costs
below are counted rather than asserted, and then describes five whole models so that each one can be
read on its own and pictured as a system. The comparison and a recommendation are at the end, and
the recommendation is marked as one. The owner has since decided, and what was decided is under "Decided" below.

It depends on decisions already taken elsewhere and does not reopen them. The notation is the source
of truth for authored content ([notation.md](notation.md), [notation-vs-json.md](notation-vs-json.md),
whose "Decided" section is settled). Content compiles to a pack and a runtime never contains the
compiler ([structure.md](structure.md)). A child has no account, a family does
([product.md](product.md), [parents.md](parents.md)). Paper is an output rather than an export, and
activities never print ([activities.md](activities.md)). The compiled pack format is genuinely open,
and so is everything about state, which is what this document is for.

Two things are being written by other work in parallel and are treated here as requirements rather
than as designs. Tracks are specified in [tracks.md](tracks.md), which landed while this was being
written; the requirements below are taken from it as given and each option says where a track lives
in it. Sound is specified in [sound.md](sound.md), and its `Performance` is one of the answer kinds
every option is judged on.

## Decided

The owner decided in September 2026, after this document was written, and the rest of it is kept as the record of the options. The store that implements the decision is described in [db.md](db.md).

We took the recommendation: Option B, the local-first log, with both amendments from Option C. The log is the source of truth, and it is held in Postgres, where an event is one row of `events` column for column; a page sends the same row less what the server stamps, so moving it is a copy. Content is addressed by the hash of its body, which Postgres generates, with the human name kept beside it. The event union is declared once in `engine/answer.ts`, and an event's type now lives only in the `kind` column, so the payload never repeats it. Progress is folded on read and never stored; measured on the final schema at this document's upper bound (18,000 answered events for a family over four years), reading one child's whole history takes 34 milliseconds and a whole family's 115.

A row has one shape everywhere: the store's properties are the column names in snake_case, an `Envelope` is exactly an events row, and every timestamp is one string format, ISO 8601 in UTC to the millisecond, stored as that string so that Postgres, the wire and a page hold the same value.

Building it changed three things, and each is a reason as much as a result. The first is fewest columns: anything the code or the database can derive is not stored, which removed every `created_at` but the one an expiry needs, removed a role column (a membership with no kid is a parent, one with a kid and a window is a tutor), and made the content hash a generated column. The second is one table for every hashed secret: sessions, children's views and the codes a person is emailed or shown share `keys`, because each is found by a hash, expires by a rule and is counted by the rate limits, and a children's view opened for several children holds one key per child, so every reference to a kid anywhere has a foreign key through `(family_id, kid_id)`. The third is that a removed grown-up's membership is ended rather than deleted, so their name stays readable in the family's history while it grants nothing.

The strongest argument against Option B was that the store does not enforce a tutor's scope, because a log is a file the reader can read. The decision answers it by moving isolation between families into Postgres: row-level security is forced on every table that carries a family, the application connects as a role that cannot bypass it, one function is the only way in, and the policies are generated from one declaration of which family each table's rows belong to, tested against the database. Scope inside a family (a tutor's one child and window) is still a rule in code rather than a policy, and [db.md](db.md) lists whether to move it as an open decision.

Of the open decisions below, three are now settled: a current lesson per track is derived rather than stored; a pack is a content row whose body is its manifest; and retention after a family closes has a rule to measure from (a key's last use) but no column recording the closure, so it stays open. PowerSync was trialled as the sync engine on this store, and the owner decided against it: a replicated local database is more than a child's device needs, and a small sync of our own, built when it is needed, fits the log better. That sync uploads a page's drafts through the one way in, where the event's `id` makes a resend harmless and the server stamps `device` and `seq` under the family's lock, and reads back what a page needs to show. The trial's one change to the model, a single text format for timestamps, stays.

On 14 September 2026 the owner also decided that a child's device keeps no copy of the log. The app is online first: a parent opens a child's view on a browser, the view reads the child's record from the API, and it keeps only the answers it has not sent yet, in a short queue in the browser that empties as they land ([auth.md](auth.md), flows 5 and 8). The options below that keep days of work on a device, Option B's included, are kept as the record of how we got here, and where they describe a device's own log it is that record rather than the design.

## What we measured

The corpus is 205 notation files: 132 items, 72 lessons and one component, 4,811 lines and 148 kB of
text. Verifying it produces 22,337 proved variants, of which the 72 lessons name 369. Written out
with their answers, those variants are 1,748 kB of JSON, against 8 kB for the parameter names and
answer names alone, so whether a pack materialises variants or carries a recipe and re-derives them
is a two-orders-of-magnitude decision rather than a style preference. Across every proved variant
there are 36,128 answer values, and 35,617 of them are integers; the rest are 441 words drawn from
declared option lists, 46 decimals and 24 fractions. A number and a picked option are the whole of
what an answer is today, four more kinds are specified, and every option below is judged first on
what it costs to add the third.

The rest of the numbers this document uses. They were taken on 12 September 2026 while the tracks
and sound work was landing in the same tree, so the part and registry counts in particular were
moving while this was written and should be re-taken rather than quoted:

| What | Measured |
|---|---|
| Content files | 205: 132 items, 72 lessons, 1 component |
| Corpus size | 4,811 lines, 148 kB |
| Registry node types | 249, of which 53 are scene nodes |
| Drawn parts | 207 `defineVisual` declarations under `src/art/`, of which 205 reach the notation's vocabulary through `src/lang/parts.ts` (`PARTS.size === 205`), plus 25 imported art files (17 svg, 4 excalidraw, 4 stroke) |
| Proved variants | 22,337 held in memory; 8 items sampled at 400 because they exceed 10,000; largest single item `multiply.short` at 4,664 |
| Variants a lesson names | 369 across all 72 lessons |
| Answer keys | 160 across 132 items, so the average item has more than one named answer |
| How a child answers | 70 items with `number-input`, 30 with `choice`, 2 with `word-input` (both against a declared option list), 2 with `handwriting` and no answer at all, 10 with a blank inside a template, 19 with the answer written into a drawn node's own blanks |
| Code checkers | 4 items (`matchsticks.one-move` twice, `writing.by-eye` twice) |
| Skills | 99 distinct, declared only as strings inside items; 74 of them are exercised by exactly one item |
| Hints and mistakes | 93 hints, no item with two; 131 feedback rules; 24 items recognising no mistake |
| Places that read a lesson or an item by id | 55 call sites across 24 files |
| Persistence today | none for evidence; `localStorage` and `sessionStorage` hold the theme, the sound switch, the camera, the drawing pad and the map's unlocked list |

Ten things the tree already tells us, which the requirements below are written against:

A lesson's id does not carry its order. `content/lessons/g1-03-making-ten.lumi` holds
`lesson g1-making-ten`, and `src/space/years.ts` sorts by file path with the comment "the file name
carries the order a child meets them (g1-01, g1-02), which the id does not". Any store that is not a
folder loses that ordering unless it is declared.

Versioning is declared and unused. All 204 items and lessons carry `v=1` and nothing has ever been
versioned up. The two other `v=` values in the corpus (`v=600`, `v=800`) are a setting on
`measure.dial`, not versions.

The skill graph does not exist as data. Skills are strings in `skills=[...]` on items. There is no
skill declaration, no prerequisite declaration in any content file, and `LessonDef.needs` in
`src/space/journey.ts` is a field nothing populates. 74 of 99 skills rest on a single item, so the
graph the product document promises is currently thin as well as undeclared.

There are already two different types called `Attempt`. One is a question
(`src/family/evidence.ts`), one is an activity round with a move log
(`src/play/log.ts`, `MOVE_CAP = 120`). [parents.md](parents.md) says the two grains do not merge and
that the parent's side should read both through one interface.

An attempt identifies its variant by the rendered question text. `Attempt.variant` is
`{ ask: string }`, while the verifier's own variant key is
`Object.entries(env).map(([k, v]) => k + "=" + showValue(v)).join(",")`. Those are not the same
thing, and the second is the one that survives a rewording.

A printed sheet has no identity. `printLesson` takes `{ size, output, seed }` and
`src/pages/lessons.ts` passes `seed: 4127`, which is the pen's roughness seed rather than a question
seed. The questions come from the lesson file's own `practice ... seed=`, so every print of a lesson
today is the same sheet, and nothing records that a print happened.

One date does the work of three. `Attempt.on` and `Sitting.on` are single ISO days, but a sheet
printed on Sunday, worked on Tuesday and marked on Friday has three dates and the parent's records
depend on the second.

Progress exists twice. `src/space/journey.ts` has
`Progress = { done: Record<lessonId, Result>, current, week, unlocked }` with
`Result = { stars, on, minutes, right }`, and `src/family/evidence.ts` has `SkillRead`.
`src/family/progress.ts` bridges the second to the first and is described in its own header as the
one exception the structure document allows.

The year is already derived rather than stored. `yearFromContent` builds units from `unit=` on
lessons and strands from `subject=`, and hangs each non-maths strand off a maths lesson by the
arithmetic `maths[p.step * 3 + p.strand]`. [tracks.md](tracks.md) replaces that with a lane per
track, so the arithmetic is a placeholder on its way out, but the derivation itself is the evidence
that deriving the map rather than duplicating it works.

Family scale is small, and it is worth doing the arithmetic before choosing a storage shape for
performance reasons. A real year is on the order of 180 lessons ([product.md](product.md)); the 72
lessons we have average 5.1 questions each, and a full lesson with a practice block of 6 is closer to
8, so roughly 1,500 attempt rows per child per year. Three children over four years is about 18,000
rows, and one activity attempt caps at 120 moves. Recomputing the entire skill ledger for a family
from every row it has ever produced is a few milliseconds of work on any device we care about. No
option below needs a materialised progress cache to be fast. If one keeps a cache, it is for a
reason other than speed, and it should say which.

## What the model has to carry

### 1. Content

The document kinds are `item`, `lesson` and `define` today, with `activity` specified in
[activities.md](activities.md) and `track` specified in [tracks.md](tracks.md). Every option has to
say what is in a pack and what is not, because that is the third of the three rules in
[structure.md](structure.md).

Tracks are a requirement rather than a design decision here, and [tracks.md](tracks.md) has settled
enough of it to be specific about what the data has to do. A track is one subject across grades one
to four, `subject` on a lesson is the track (a level above `subject` was considered and rejected),
and the new work is a `track` root node holding the title, the description, the marker, the unit
names and a `needs` line. Membership is therefore derived from the lessons rather than held in a
join: a lesson's `subject` puts it in a track and its `unit` puts it in a unit of that track. Four
consequences bind every option below. Unit numbers become track-scoped and increase across grades,
while maths keeps per-grade numbers for now, so a unit number is only meaningful as a pair with its
track. Ordering inside a track is the track's own and it is total, and the calendar comes from the
plan rather than from the content, which removes the `week = step * 4` placeholder in
`src/space/years.ts`. A track lesson may depend only on the lesson before it in its own track and on
a maths lesson, which is what makes turning a track off safe. And a track can be off, or paced
differently, per family, which is per-family state on the plan rather than on the content.

The scale that comes with tracks is worth recording, because it changes the year. Seven tracks give
150 lessons across four grades, so a grade is about 38 lessons rather than 15, and a family doing
everything does two lessons in most weeks. That is smaller than the "hundred and eighty lessons" a
year that [product.md](product.md) estimates, so the row counts below, which use 180, are an upper
bound.

Identity has two candidate forms and the choice has consequences in both directions. A human name
(`bonds.make-ten`, `g1-making-ten`) is what an author writes, what a lesson file references, what a
reviewer reads and what 55 call sites in 24 files already use. A content address (the hash of the
canonical text, which [notation.md](notation.md) already stores beside studio-authored content) is
what makes a reference to a past question exact. These are not exclusive: a name can be the
reference and a digest can be the identity of a particular revision of it, which is the shape every
option below adopts in some form.

Versioning has to answer a specific question: what happens to a child who is halfway through a
lesson when a parent or an author edits it. The declared `v=` is not enough on its own, because the
thing evidence points at is not the item but a variant of it, and the variant list is produced by
enumeration. `pick(report.variants, count, seed)` is a seeded shuffle over the verifier's
enumeration order, so widening `let n=1..9` to `1..12` changes which questions the same seed picks,
and re-sampling an item above 10,000 variants changes its list wholesale. The consequence is that
"question 3 of the practice block" is not a stable identity and a stored reference has to be the
variant's own values, not its index.

The relationship between a declared variant and the given instance is therefore the load-bearing
part of the content model. A variant is `{ values: Record<string, string>, env, answers }`, and the
only part of it that identifies the question is `values`. Every option below therefore stores
`values` on the attempt itself, in the verifier's own canonical form, and the options differ only in
whether the item it belongs to is named or addressed.

Art lives beside content and is named from it, never described by it. 207 parts are TypeScript
declarations under `src/art/`, 205 of them are derived into the notation's vocabulary by
`src/lang/parts.ts`, and 25 imported files under `art/` are read for their size and anchors by
`src/lang/assets.ts`. That derivation is worth noting because it was tested while this was being
written: [tracks.md](tracks.md) reports that its fifteen new drawings cost "fifteen files and two
import lines", with no hand-written registry entry, layout case or renderer case. No option changes
this, and every option has to keep the property that a pack names parts and does not carry drawings.

### 2. Play state

An answer is a set of named keys. The specs need six kinds of value behind those keys, and only two
exist:

| Kind | Exists | Where it is needed | What it is |
|---|---|---|---|
| number | yes, 35,687 of 36,128 values (integers, decimals and fractions) | everywhere | an exact rational with a display hint |
| picked option | yes, 441 values | `choice`, `word-input` with `options` | a word from a list the item declares |
| typed word | no, faked by an option list | spelling, second language, [curriculum.md](curriculum.md) | a string, judged against a declared set or by a grown-up |
| produced drawing | no, 2 items collect it and do not mark it | handwriting, reading | strokes, with the grown-up as marker |
| performance | no | [sound.md](sound.md) | `{ instrument, started, struck: Struck[] }` |
| play outcome | no, prototyped separately | [activities.md](activities.md) | an ordered move log, an outcome and a cap flag |

The test every option has to pass is that adding the seventh kind does not migrate every table. The
requirement is not hypothetical: [product.md](product.md), [curriculum.md](curriculum.md),
[activities.md](activities.md) and [sound.md](sound.md) each independently name the answer model as
the next piece of core work.

Per-question timing is a parent requirement and it is asymmetric. Screen work carries the time from
the question appearing to the first input, the time from the first input to submission, and whether
the page lost focus. Paper work carries no per-question timing at all and
[parents.md](parents.md) refuses to invent any. A sitting carries minutes for both. An activity
carries a gap in seconds before every move. So timing is per-kind data rather than a column, and an
option that gives every answer a `seconds` field has already lied about paper.

A sheet is the fourth object beside attempt, answer and sitting, and it is covered in section 6.

### 3. Progress

What a family sees as "done" is a sitting that finished, and `src/family/plan.ts` already refuses to
let one sitting satisfy two planned days, with the comment that flattering the record is "the one
thing a record must not do". Any model has to keep that: a planned day and a sitting are different
objects and the join between them is a decision, not a foreign key.

Mastery without a hidden algorithm means mastery is a pure function of the evidence plus published
thresholds, computed on read, with the sentence that explains it travelling beside it.
`src/family/evidence.ts` already does this: `SkillRead` carries `attempts`, `days`, `variants` and
`rests` ("from nine answers on three days"), and returns `share: null` when there is not enough to
put a number on. THRESHOLDS is one object, every value in it is declared unmeasured, and replacing it
is one edit. The data model's job is to not make that recomputation expensive or ambiguous, and the
arithmetic above says it is neither.

The map and the year derive from progress rather than duplicating it, which
`src/space/years.ts` and `src/family/progress.ts` already demonstrate. The risk each option carries
is a stored `skill_state` row that can disagree with the attempts it came from.

Tracks change the shape of one field and it is the field with the most behind it.
`Progress.current` is a single lesson id today, and [tracks.md](tracks.md) says a child is current in
seven places at once, so it becomes one current lesson per track, read by the next-lesson
calculation, the "you are here" marker and the morning plan. This is an argument for deriving
progress rather than storing it: `progressFrom` already computes `current` as "the first lesson on
the path with no sitting", and computing that per track is the same rule applied seven times, while a
stored `current` per track is seven fields that can each be wrong.

### 4. Family

A household holds one or more adults and one or more children. A child is a record under the
family's account with a display name and a grade band, no birth date, no email and no password
(`src/family/privacy.ts`). Consent is the parent's account and there is no flow in which a child
agrees to anything. A child's device therefore needs an identity that is not a child account, and
the only thing it sends is attempt rows to our own API.

Two children share the catalogue and have separate plans, separate evidence and separate settings.
Family-authored content is scoped to the family and carries provenance
([ai.md](ai.md)). A tutor is a second adult attached to one child for a window of time who never sees
the family's other children, and every mark records who entered it.

COPPA shapes three operations rather than a settings page: immediate deletion of a child's record
rather than a soft delete, a records export that runs before deletion because a family may be
legally required to hold what we are about to destroy, and a published retention window. An option
that makes export and deletion a project rather than an operation has a real cost here.

### 5. Authoring

The four layers in [parents.md](parents.md) put different demands on the store. Layer one, a
different sheet, needs proved variants reachable at run time from the pack and needs nothing written.
Layer two, the shape of the year, needs a plan overlay per child that can be changed, with the base
year still visible underneath. Layer three, a number in a question, splits: inside the declared
ranges it is still layer one, and outside them it is new content that has to be proved. Layer four,
a new question, lesson, activity or year, produces notation text.

So the store has to hold notation text for family-authored content, with the hash of its canonical
form, plus provenance (who wrote it, which family it belongs to), plus a review state. Review state
is not one flag: a question is a draft until the verifier's report has no errors, and an activity is
a draft until the verifier passes and a person has played it. A draft cannot be printed.

The path from notation to a pack a runtime can load is: text, parse, check, verify or prove, write a
pack. `apps/home` may not contain the parser, the checker or the verifier, which is why
[parents.md](parents.md) prefers a verifier service. Whatever the store is, family content enters it
as text and leaves it as pack entries.

### 6. Paper

A printed sheet is a physical artefact with questions that were chosen at print time. It needs an
identity, and the identity has to carry the questions by value, because by the time the sheet comes
back the lesson may have been edited, the plan may have shifted and the item's ranges may have
widened. Printing at least has to record: which child, which lesson, which questions with their
variant values, which paper size, when it was printed, and whether the grown-ups sheet went with it.

Whether results come back to a sheet later is a product decision the data model has to permit. It
should: `src/family/decide.ts` already returns "ask" with the reason "The sitting is recorded but the
sheet is not marked, so we have nothing to read", which is only a sensible sentence if an unmarked
sheet is a thing that exists. Marking is one tap per mistake, so the write is small. The dates are
the difficulty, and a sheet is where the three of them separate cleanly: printed on, worked on, marked
on.

## The axes the options differ on

Four axes, and each option below takes a position on all four rather than varying one at a time.

Where truth lives: on the child's and parent's devices with sync added later, on a server from the
first release, or in files the family holds.

How events are recorded: an append-only log from which everything is derived, current-state rows
updated in place, or a log of record with derived reads kept as a cache.

How much structure is typed: a small closed set of tables and columns, one event row with a payload
whose shape depends on its kind, a document per sitting carrying whatever that lesson needed, or the
notation itself as the storage format for state as well as for content.

How content is identified: human names only, human names with content-addressed revisions, or
content addresses with names as aliases.

A fifth axis follows from the pack rule rather than from storage, and every option has to answer it:
whether a pack materialises proved variants (1,748 kB for the corpus we have) or carries a recipe
(8 kB) and re-derives them on the device. Materialising is what makes layer-one authoring work
offline with no verifier present, and the recipe is what keeps a pack small. The middle position,
which any of the five can take, is to materialise a bounded sample per item and keep the recipe for
the rest; we have not chosen a sample size and the choice is orthogonal to the four axes above.

---

## Option A: typed tables on a server

### The shape of it

One Postgres database, reached only through `services/core`, holding a small closed set of tables.
Every write goes to the server, and the child's device and the parent's device are both clients that
need a network to record anything. Attempts are rows, and progress is a row per child per skill
updated in the same transaction that writes the attempt. Content ids are the human names authors
already write, and a pack is built in CI and served as a versioned file.

This is the model most products in this category have, and it is the one a new engineer can read in
an afternoon. Its virtues are exactness and query power: the gap ledger is a `GROUP BY`, the records
export is a handful of queries, and a tutor's scope is a row in a join table that every read is
filtered by. Its cost is that the shape of a table is a decision made now and paid for at every
change, and that the product is supposed to work on paper in a house whose internet is down, which
this model cannot do without a device queue in front of it.

### The shapes

```ts
interface Household { id: string; created: string; retentionDays: number }
interface Adult { id: string; household: string; email: string; passwordHash: string; role: "parent" | "tutor" }
interface Child { id: string; household: string; displayName: string; gradeBand: number }
interface TutorScope { adult: string; child: string; from: string; to: string }

interface Sitting {
  id: string; child: string; lesson: string; lessonVersion: number;
  startedAt: string; endedAt: string | null; onDay: string;
  mode: "screen" | "paper"; finished: boolean; withGrownUp: boolean; subject: string; minutes: number;
}

interface Attempt {
  id: string; sitting: string; child: string;
  lesson: string; lessonVersion: number; section: string; n: number;
  item: string; itemVersion: number;
  variantKey: string;                // "a=2,b=3", the verifier's own key
  skills: string[];
  answerKind: "number" | "pick" | "word";
  numberGiven: string | null;        // an exact rational as text
  pickGiven: string | null;
  wordGiven: string | null;
  right: boolean; tries: number; matchedRule: number | null; hints: number;
  mode: "screen" | "paper";
  msToFirstInput: number | null; msToAnswer: number | null; leftPage: boolean | null;
  markedBy: "auto" | "grown-up"; markedByAdult: string | null; markedAt: string;
}

interface SkillState {                // updated in place, in the attempt's transaction
  child: string; skill: string;
  attempts: number; days: number; variants: number; rightFirstTime: number;
  reading: "secure" | "growing" | "revisit" | "thin"; lastSeen: string;
}

interface PlanDay { child: string; onDay: string; kind: "lesson" | "again" | "practice" | "off"; lesson: string | null; note: string | null }
interface Sheet { id: string; child: string; lesson: string; printedAt: string; paperSize: "A4" | "Letter"; questions: SheetQuestion[] }
interface SheetQuestion { n: number; item: string; itemVersion: number; variantKey: string }
```

`answerKind` with three nullable columns is the honest version of this option rather than a
strawman. A single `given: string` column would work until the first performance arrives, at which
point it is a JSON blob in a text column and the option has quietly become Option E.

### How the six areas land

| Area | How it lands |
|---|---|
| Content | Not in the database at all for catalogue content: a pack built in CI, keyed by human name, with a pack version an app can refuse. Family content needs three new tables (`FamilyItem`, `FamilyLesson`, `Draft`) holding notation text, its canonical hash and provenance. A `track` document is a pack entry, and membership needs no join because it is the lesson's `subject`. Whether a track is on for this family, and at what pace, is a `TrackSetting` row per child. A child's current lesson per track is derived, unless this option's `SkillState` habit spreads to it, which it should not. |
| Play state | An `Attempt` row with typed columns. A performance and a move log do not fit and get tables of their own (`Performance`, `PerformanceNote`, `ActivityAttempt`, `ActivityMove`), joined back to `Attempt` or standing beside it. |
| Progress | `SkillState` updated in place. Fast to read and capable of disagreeing with the attempts it came from, so it needs a rebuild job and a test that the rebuild matches. |
| Family | Native. `Household`, `Adult`, `Child`, `TutorScope`, with every read filtered by scope. This is the area Option A is best at. |
| Authoring | Drafts are rows with a `state` column. The verifier runs in `services/jobs` and writes the report back, which is the shape [parents.md](parents.md) prefers anyway. |
| Paper | A `Sheet` row with its questions by value, which is the right shape, and marking writes `Attempt` rows that point at the sheet. |

### What it makes easy

Queries across a whole family and across years, which is what records, the gap ledger and "look
closer" all are. Scoping, so a tutor seat is a predicate rather than a design. Deletion of a child,
which is a cascade. Exactness, because there is one copy of everything and no merge to reason about.
Operating it, because it is a shape every hosting provider, backup tool and monitoring dashboard
already understands.

### What it makes hard or impossible

Offline. This is the serious one. Paper is a first-class output and one of its stated reasons is "a
day when the tablet is flat", so a product whose child build cannot record anything without a
network has undercut its own strongest promise. Queuing writes on the device is possible and is the
beginning of Option B without Option B's model.

A new answer kind. Adding the performance is a table, a migration, a change to the read path in
`features/family`, and a change to everything that treats `Attempt` as the grain. We know six kinds
are coming and only two exist, so this cost is scheduled rather than speculative.

Export and deletion at the granularity COPPA asks for. Both are possible and both are work: an
export is a join across every table in the schema (thirteen in the sketch above, more once
performances and activity rounds have theirs) rendered into something a family can read, and it has
to run before deletion.

### What it costs to build now

The largest first build of the five. A schema, a migration tool, `services/db` and `services/core`,
an API surface with a validation schema per request (`check:validation` already requires that), auth
for adults, a device credential for a child, and an integration test tier against a real Postgres,
which `structure.md` already plans for (`*.itest.ts`). It is also the only option that cannot ship a
useful evidence store before the services exist, and [parents.md](parents.md) ranks three of its four
rank-one functions behind the evidence store.

### What it costs to change later

High per change and low in risk. Every change is a migration with a known procedure, and nothing is
ambiguous. Moving away from it later is a rewrite of the read path rather than of the data, because
rows can be replayed into anything.

### Failure cases

| Case | What happens |
|---|---|
| A parent edits a lesson a child is halfway through | The child's remaining questions come from the pack in memory, so the sitting finishes on the old content. Attempts already written keep `itemVersion` and `variantKey`, so evidence survives. The next sitting uses the new content. The gap is that a half-finished sitting has no place to record which pack it was playing, so the honest fix is a `packVersion` column on `Sitting`. |
| Two devices were both offline | Neither recorded anything. When they come back, both replay their queued writes and the server accepts both, so the risk is duplicate attempts rather than a merge conflict. An idempotency key per attempt handles it. Plan edits made on two offline devices are a genuine conflict and last-write-wins silently discards one. |
| A child answers on paper a week after printing | The `Sheet` row holds the questions by value, so marking is exact however much the lesson changed. Three dates are needed: `printedAt` on the sheet, `onDay` on the sitting the parent enters, and `markedAt` on the attempt. This option handles paper better than its reputation suggests, because a sheet is just another table. |
| A game needs to store something no existing kind covers | A new table, a migration, and a change to every read that assumed the attempt grain. This is the case Option A is worst at. |

---

## Option B: a local-first log, sync later

### The shape of it

Truth is an append-only event log on the device, one stream per child per device. Everything a
family sees is a fold over that log: the skill ledger, the week strip, the map, the records. Nothing
is stored in a shape that can disagree with the events, because nothing is stored except events and
the pack. Sync arrives later as a second concern: streams are exchanged, ordered by
`(device, seq)`, and the fold is run again over the union.

The child's app writes events and never reads a derived table. The parent's app reads by folding.
A server, when it exists, is a place streams are copied to and from rather than the authority, which
is also what makes the export in [parents.md](parents.md) one action: the export is the log.

This option is the closest to the product as described. A day is one lesson, a week is five, paper is
normal, the network is optional by construction, and the strongest privacy sentence available is
that the evidence has not left the house yet.

### The shapes

```ts
/** One event. The payload is a tagged union, so a new kind of answer is a new tag. */
type Event =
  | { t: "sitting-began"; sitting: string; child: string; lesson: string; pack: string; mode: Mode; at: string }
  | { t: "sitting-ended"; sitting: string; finished: boolean; minutes: number; withGrownUp: boolean; at: string }
  | { t: "answered"; sitting: string; q: QuestionRef; given: Given; timing: Timing; at: string }
  | { t: "marked"; sheet: string; q: QuestionRef; right: boolean; rule: number | null; by: string; at: string }
  | { t: "hint-opened"; sitting: string; q: QuestionRef; rung: number; at: string }
  | { t: "sheet-printed"; sheet: string; child: string; lesson: string; paper: PaperSize; questions: QuestionRef[]; at: string }
  | { t: "round-played"; round: RoundRef; moves: LoggedMove[]; outcome: Outcome; capped: boolean; at: string }
  | { t: "plan-changed"; child: string; op: PlanOp; at: string }
  | { t: "content-authored"; id: string; text: string; hash: string; by: string; at: string }
  | { t: "day-added"; child: string; onDay: string; subject: string; minutes: number; note: string; at: string };

interface Envelope { device: string; seq: number; event: Event }

/** A question, identified the way the verifier identifies one. */
interface QuestionRef {
  lesson: string; lessonVersion: number; section: string; n: number;
  item: string; itemVersion: number;
  /** The verifier's own key: "a=2,b=3". Not the index in the variant list, which is not stable. */
  variant: string;
}

/** The answer. One tag per kind, and the seventh kind is one more tag. */
type Given =
  | { k: "number"; text: string }                        // an exact rational, as written
  | { k: "pick"; option: string }
  | { k: "word"; text: string }
  | { k: "drawing"; strokes: Stroke[] }
  | { k: "performance"; instrument: string; started: number; struck: Struck[] }
  | { k: "unmarked" };                                   // collected, the grown-up is the marker

/** Timing is per kind too, because paper has none and an activity has a gap per move. */
type Timing =
  | { k: "screen"; toFirstInput: number; toAnswer: number; leftPage: boolean }
  | { k: "paper" };
```

The fold is the whole read model:

```ts
interface View { sittings: Sitting[]; attempts: Attempt[]; sheets: Sheet[]; rounds: Round[]; plan: Plan; authored: Authored[] }
function fold(log: Envelope[]): View;    // pure, deterministic, order is (device, seq) then at
```

### How the six areas land

| Area | How it lands |
|---|---|
| Content | Catalogue content is the pack on the device, keyed by human name, with a `pack` digest recorded on every sitting so an attempt can be resolved against the content that produced it. Family content is a `content-authored` event carrying the notation text and its canonical hash, which is the form [notation.md](notation.md) already specifies for studio content. A `track` document is a pack entry and membership is the lesson's `subject`. Turning a track off or changing its pace is a `plan-changed` event, so it sits with the rest of the plan overlay and is reversible by replaying without it. A child's current lesson per track is folded, never stored, which is what [tracks.md](tracks.md) needs when `Progress.current` becomes one per track. |
| Play state | `Given` is a tagged union. This is the area the option exists for: the performance, the drawing and the move log are tags, not tables. Timing is a union too, so paper cannot accidentally carry a time. |
| Progress | Derived by folding, every time, with the arithmetic above saying that is affordable. Nothing can disagree with the events. Thresholds stay one object and changing them changes every reading at once, which is what we want while none of them is measured. |
| Family | Weaker than Option A. Household, adults, children and tutor scope are themselves events, and scope has to be enforced on the read path rather than by the store, because the log is a file the device can read. A tutor's window becomes "which events may this reader fold", which is real work and is honest. |
| Authoring | Drafts are events with no accepted event yet. The verifier is not on the device, so authoring outside the declared ranges needs the service, and the service's verdict is an event. Layer one works with no network at all, provided the pack carries variants. |
| Paper | A `sheet-printed` event carrying the questions by value, and `marked` events pointing at the sheet. The three dates separate naturally, because each is the `at` of a different event. |

### What it makes easy

Working with no network, which is the product's own claim about a flat tablet and a day on paper.
Export and deletion, because the evidence is one artefact: an export is a copy and a child's deletion
is removing that child's streams and folding again. Adding an answer kind, which is one tag and one
case in the judge. Replay, which [activities.md](activities.md) already relies on
(`apply` is pure, so the move log rebuilds every position) and which turns out to be the same
mechanism the evidence needs. Honesty, because there is no place for a number that was not computed
from something.

### What it makes hard or impossible

Cross-family questions, which we have deliberately refused anyway, and cross-year aggregate queries
for one family, which stay cheap at this scale but need the fold rather than SQL.

Enforcing a tutor's scope. The store does not enforce it, so the reader does, and a reader is code
we write rather than a predicate the database applies. This is the strongest argument against the
option.

Sync, which is deferred rather than solved. Two devices editing a plan offline is a real conflict and
the log does not resolve it by itself. The answer that fits the product is that attempt events
commute (they are facts about different questions, and duplicates are detectable by
`QuestionRef` plus `at`) while plan events do not, so plan events need a rule, and the rule should be
that the last change wins and the parent is shown that a change was overwritten rather than told
nothing.

Log growth. 18,000 attempts for a family over four years is not a problem, but a performance with
its `struck` array and a drawing with its strokes are larger than a number, and the move cap of 120
exists for exactly this reason. A drawing per handwriting question for a year is the case to measure
before shipping the drawing kind.

### What it costs to build now

The smallest first build of the five that is still real. A file per stream, an append, a fold and a
schema check on the event union. There is no schema migration tool, no API and no auth on the first
day, and the parent's side in `src/family/` is already written as pure functions over
`Attempt[]` and `Sitting[]`, which is what the fold produces. `src/play/log.ts` is already an event
log with a cap. The genuinely new work is the event union, the fold, and deciding the ordering rule.

### What it costs to change later

Low for anything additive and high for anything that changes the meaning of an old event, because
old events are on families' devices and cannot be migrated in place. The answer is that the fold
version-checks events and handles every version it has ever written, which is a discipline rather
than a tool, and it is the discipline that goes wrong first when nobody is watching. Moving to a
server later is straightforward, because a server can hold the same streams.

### Failure cases

| Case | What happens |
|---|---|
| A parent edits a lesson a child is halfway through | The sitting records the `pack` digest it started with, so the questions the child is working through are resolvable even after the edit. The edit is a `content-authored` event and a new pack; the next sitting uses it. Evidence from before the edit keeps its `itemVersion` and `variant`, so the skill ledger is unaffected. This is the option that handles this case most cleanly, because "which content was this" is a field on the event rather than an assumption. |
| Two devices were both offline | Attempt events from both are kept and folded; duplicates are detected by `QuestionRef` and dropped. Plan events conflict, the later one wins by the ordering rule, and the parent is told. Two different children on two devices is not a conflict at all, which is the common case for a family with a tablet each. |
| A child answers on paper a week after printing | The `sheet-printed` event holds the questions by value, and `marked` events arrive a week later with their own `at`. The three dates are three events. Nothing has to be reconciled, because the sheet was never a reference to the current state of the lesson. |
| A game needs to store something no existing kind covers | One new tag in `Event` or in `Given`, one case in the fold, one case in the judge, and old logs are unaffected because they never carried it. This is the case Option B is best at. |

---

## Option C: a log of record with projections, server-authoritative

### The shape of it

The same event grain as Option B, held on a server as the record, with derived tables maintained by a
projector as a cache that is always rebuildable. A read goes to a projection; a write goes to the
log. The projector is pure and the projections carry the log position they were built to, so a stale
projection is detectable rather than merely suspected, and rebuilding is a routine operation rather
than an incident.

Content identity is content-addressed with human names as aliases. An item is named
`bonds.make-ten` and revised as `bonds.make-ten@<hash of canonical text>`; a variant is named by the
verifier's own key and referenced as the pair. A pack is named by its own digest and a sitting records
which pack it played. Nothing ambiguous can be stored, which is the main thing this option buys over
Option A.

This is the shape a team would choose if it expected to be answering questions about evidence for
years and wanted to be able to change every derived number without losing anything.

### The shapes

```ts
/** The one table that is the record. Nothing is updated, nothing is deleted except by retention. */
interface LoggedEvent {
  id: bigint;                     // the log position
  household: string;
  child: string | null;
  kind: string;                   // "answered", "marked", "sheet-printed", …
  payload: unknown;               // validated against a schema derived from the kernel's union
  actor: { kind: "child" | "adult" | "system"; id: string };
  occurredAt: string;             // when the thing happened
  recordedAt: string;             // when we heard about it
  origin: { device: string; seq: number };   // for idempotency across an offline queue
}

/** A projection. Every one of these carries where it was built from. */
interface Projection { name: string; household: string; upTo: bigint; builtAt: string }

interface SkillLedgerRow {
  household: string; child: string; skill: string; upTo: bigint;
  attempts: number; days: number; variants: number; rightFirstTime: number;
  reading: Reading; lastSeen: string; rests: string;
}

/** Content, addressed. The name is a pointer; the revision is the truth. */
interface ContentRevision {
  id: string;                     // "bonds.make-ten"
  hash: string;                   // of the canonical notation text
  kind: "item" | "lesson" | "define" | "activity" | "track";
  text: string;                   // the notation, because it is the source of truth
  household: string | null;       // null for catalogue content
  provenance: { by: "author" | "parent" | "model"; adult: string | null; model: string | null; at: string };
  review: { verified: boolean; played: boolean | null; report: Issue[] };
}
interface ContentPointer { id: string; household: string | null; hash: string; publishedAt: string }
interface Pack { digest: string; vocabulary: number; revisions: string[]; builtAt: string }
```

### How the six areas land

| Area | How it lands |
|---|---|
| Content | `ContentRevision` holds the notation text and its hash; `ContentPointer` says which revision a name currently means, per household. A pack is a digest over a set of revisions, and an app refuses a pack whose vocabulary version it does not understand, which `structure.md` lists as open. A `track` is a revision like any other, so a family can have its own track, and the ordering [tracks.md](tracks.md) wants declared in the track is declared there rather than inferred from a filename. Whether a track is on is a plan event. |
| Play state | The payload union is declared once in the kernel and the database schema is generated from it, so a new answer kind is a new payload variant and a projector case. The payload column is opaque to SQL, which is the cost: a query over what a child answered has to go through a projection. |
| Progress | Projections, with `upTo`. Because they are rebuildable, changing a threshold is a rebuild rather than a migration, which matters while every threshold in `THRESHOLDS` is unmeasured. |
| Family | As strong as Option A. Every event carries `household` and `actor`, so scope is a predicate and an audit of who marked what is the `actor` field rather than an extra table. A tutor's window is a scope row consulted on read. |
| Authoring | The strongest of the five. A draft is a revision with `review.verified === false`, publishing is moving a pointer, and rolling back a bad generated question is moving the pointer back. Provenance and deletion are both native, and `ai.md`'s requirement that generated content is attributable and deletable is a field rather than a feature. |
| Paper | A `sheet-printed` event, the questions by value, and a projection of unmarked sheets, which is a query the parent's page wants ("the sitting is recorded but the sheet is not marked"). |

### What it makes easy

Changing our minds about every derived number without losing evidence, which is the single most
likely thing to happen given that [parents.md](parents.md) says none of its thresholds are measured.
Auditing, because who did what is on every row. Exactness about which content a child saw, because
the revision is a hash rather than a version integer that nobody increments (all 204 documents carry
`v=1` today, which is the evidence that an integer nobody has to change does not get changed).
Reprocessing, so a projector bug is a rebuild.

### What it makes hard or impossible

Offline, for the same reason as Option A, unless a device queue is added, which is Option B's log
without Option B's authority. The `origin` field is there so that a queue can be added without
breaking idempotency, and that is a hedge rather than a solution.

Understanding it. This is the option most likely to be built wrongly by someone who has not built one
before: projections drift, the projector becomes the place business logic hides, and "rebuildable"
stops being true the first time a projection is written to directly.

Human-readable content addresses. A hash in a URL, in a log line and in a support conversation is
worse than a name, so the name has to be carried everywhere alongside it, and there are already 56
call sites reading content by name.

### What it costs to build now

The largest of the five, slightly ahead of Option A, because it is Option A plus a projector, a
schema generated from the kernel's union, and the discipline that keeps projections honest. It also
needs a decision the other options can defer: what the retention window does to a log of record,
given that COPPA requires deletion and a log of record is the thing you do not delete from. The
answer is that deletion removes a child's events rather than tombstoning them, and the projections
are rebuilt, which is clean and is the opposite of what event sourcing usually assumes.

### What it costs to change later

The lowest of the five for anything about derived numbers, and the same as Option A for anything
about the shape of an event.

### Failure cases

| Case | What happens |
|---|---|
| A parent edits a lesson a child is halfway through | The edit is a new revision and the pointer moves. The sitting records the pack digest, so the questions in flight are exactly resolvable, and evidence points at the old revision's hash forever. This is the option that answers this question best. |
| Two devices were both offline | Nothing was recorded unless a queue was added. With the queue, `origin` makes replay idempotent and the log accepts both orders, because the log is a record of what happened rather than of what we processed. Plan conflicts still need a rule. |
| A child answers on paper a week after printing | The same as Option B, with the addition that an unmarked sheet is a queryable projection rather than a fold. |
| A game needs to store something no existing kind covers | A payload variant in the kernel, a projector case, and no migration of existing rows, because the payload column is opaque. Cheap, though not as cheap as Option B, because the projections have to learn the new kind before the parent's page can show it. |

---

## Option D: the household folder, in the notation

### The shape of it

A family's data is a folder of files written in the same notation as content. There is no database in
the first build. A household is a directory, a child is a directory under it, and evidence is
appended to a dated file. The folder is what the family exports, what they back up, what they hand to
a tutor, and what they delete.

This is the option that takes "the text is the source of truth" to its conclusion, and it is worth
describing properly rather than dismissing, because several things it makes trivial are things the
other options make into projects. The export in [parents.md](parents.md) is `cp -r`. The deletion is
`rm -r`. The handover pack for a grandparent is a folder and a printer. A tutor scoped to one child
is a directory they were given and nothing else. There is no schema migration because there is no
schema, and a parent who wants to know what we hold about their child can open the file and read it.

```
households/oakley/
  family.lumi                     the adults, the children, the settings
  plan/maya.lumi                  the planned days, and every change to them
  content/shop-change.lumi        a lesson the parent wrote, in the same notation as ours
  children/maya/
    2026-09-14.lumi               one day of evidence
    2026-09-15.lumi
    sheets/2026-09-13-1041.lumi   a printed sheet, with its questions
    portfolio/                    the PDFs the parent kept
```

### The shapes

```
family oakley v=1 {
  adult naib email="naib@example.com" role=parent
  child maya name="Maya" grade=1
  child theo name="Theo" grade=3
  settings maya day=minutes(25) hints=after-one-try marks=at-the-end mode=paper
  tutor kate child=maya from=2026-10-05 to=2026-11-16
}
```

```
day maya 2026-09-14 {
  sitting g1-making-ten from=9:12 to=9:34 mode=paper finished with-grown-up subject=maths
    pack=3f2a91
  answered n=1 item=bonds.make-ten v=1 variant="n=7" given=3 wrong rule=1 marked-by=naib
  answered n=2 item=bonds.make-ten v=1 variant="n=4" given=6 right marked-by=naib
  answered n=3 item=bonds.make-ten v=1 variant="n=9" given=1 right marked-by=naib
  # Maya did this one twice before it went in. Not a gap, she was tired.
  answered n=4 item=bonds.missing-part v=1 variant="n=6" given=4 right tries=2 marked-by=naib
}
```

```
sheet maya 2026-09-13-1041 lesson=g1-making-ten paper=A4 printed=2026-09-13T10:41 {
  question 1 item=bonds.make-ten v=1 variant="n=7"
  question 2 item=bonds.make-ten v=1 variant="n=4"
  question 3 item=bonds.make-ten v=1 variant="n=9"
  question 4 item=bonds.missing-part v=1 variant="n=6"
  grown-ups printed
}
```

The syntax needs nothing new. `day`, `sitting`, `answered`, `sheet`, `question`, `family`, `child`,
`settings` and `tutor` are registry entries, which is the same mechanism that added
`placevalue`, `array` and `dice` in September with no grammar change, and the parser already contains
no vocabulary at all (53 scene node types, none of them in `syntax.ts`).

### How the six areas land

| Area | How it lands |
|---|---|
| Content | Family content is a `.lumi` file in the household folder, which is the same thing it would be anywhere else, so this option removes the seam between catalogue content and family content entirely. Catalogue content stays a compiled pack, because the household folder holds no verifier. A track is a `track` file, and a family can write one, which is the only option where a parent's own track and ours are the same kind of artefact. Which tracks are on sits in `family.lumi` beside the settings. |
| Play state | An `answered` node's settings are open, so a new answer kind is new settings on that node and the checker learns them from the registry. A performance is a list of words (`played=[C4, E4, G4]` at 620ms, 900ms), which is exactly what [sound.md](sound.md) says an answer should look like. A drawing is the one kind that does not fit, because strokes in a text file are unreadable and large, so a drawing is a file beside the day and the day names it. |
| Progress | Derived, by parsing the folder and folding. The checker gives errors with a line and a column, which means a corrupted day file reports where. |
| Family | `family.lumi` holds it, and a tutor is scoped by which directory they were given. This is the weakest area: there is no enforcement, only distribution, and "we gave the tutor a folder" is not an access control model once the folder is on a server. |
| Authoring | Native. There is no difference between a parent editing a question and an author editing one, which is the property [notation.md](notation.md) says it wants, and the verifier service checks both. |
| Paper | Native, and the sheet file is the artefact. A family can look in `sheets/` and see what was printed. |

### What it makes easy

Everything about the family owning its own data. Export, deletion, backup, moving to another
computer, handing a week to a grandparent, and understanding what we hold. Review, because a parent
or a support engineer can read an evidence file and a comment can be written in it, which no other
option allows (the content corpus already carries 75 comment lines and 136 prose blocks across 72
files, and a row in a database has nowhere to put either).

Also, honestly, trust. [product.md](product.md) makes privacy a design constraint rather than a
policy page, and "your child's record is a folder on your computer that you can read" is the
strongest version of that claim available.

### What it makes hard or impossible

Querying. A four-year gap ledger means parsing every day file, and the parse is fast but it is not a
query, so the parent's side becomes a load-everything-and-fold design. At the measured scale that is
fine (18,000 attempts across roughly 2,200 day files, one per child per day worked), and it stops
being fine if the drawing kind arrives.

Concurrency. Two devices appending to the same day file is a text merge, and a text merge of an
evidence file is a class of bug nobody wants. The mitigation is one file per device per day, which
works and is uglier.

Writing at the rate a screen lesson produces. Every answer is a line appended and canonically
formatted, and the formatter is idempotent (two tests hold that), so this is cheap, but it is cheap in
a way we have not measured on a tablet.

And the argument that should decide it, from [notation-vs-json.md](notation-vs-json.md) itself: "The
decision would change if content stopped being hand-written and reviewed. If every item came out of a
studio GUI and nobody opened a file, the text surface would be earning much less." Evidence is
exactly that case. It is machine-written, nobody reviews it, the diffs are appends, and the prose and
comment advantages that pay for the notation in content do not pay here. The one place they do pay is
the parent's own comment on a day, which is a real feature and is not worth the storage format on its
own.

### What it costs to build now

Low, and lower than it looks, because the parser, the checker, the formatter and the registry all
exist. The new work is about ten registry entries, a folder layout, an append that stays canonical,
and a reader that folds. There is no server, no schema and no auth on the first day.

### What it costs to change later

Low to leave, high to keep. Leaving is easy because the folder is a complete record that can be
loaded into anything. Keeping it as the family's data grows, as devices multiply and as drawings and
performances arrive is where the cost sits, and it is a cost that arrives gradually rather than at a
decision point, which is the kind that gets paid without anyone choosing to.

### Failure cases

| Case | What happens |
|---|---|
| A parent edits a lesson a child is halfway through | The lesson is a file in the household folder and the edit is a diff. The sitting recorded `pack=3f2a91`, so what the child was given is resolvable. A parent can also see the diff, which no other option offers. |
| Two devices were both offline | Both appended to their own day file, and the union is the two files. This is the option where offline is not a feature but the normal case. If both wrote the same day file, it is a text merge and we should not allow it. |
| A child answers on paper a week after printing | The sheet file is in `sheets/`, the marking appends `answered` lines to the day the work was done, and the printing date is in the sheet. The parent can read all three. |
| A game needs to store something no existing kind covers | New settings on a node, or a new node type, with no migration and no schema. Cheap. The exception is anything large or binary, which needs a file beside the day rather than a line in it, and that is the shape a drawing takes too. |

---

## Option E: a document per sitting

### The shape of it

The unit of storage is a sitting, and a sitting is one document whose shape depends on what that
lesson kind needed. A page of number questions produces a document with a list of numeric answers. A
music lesson produces one with a performance in it. An activity round produces one with a move log. A
handwriting page produces one with references to the strokes it collected. There is no attempt table
and no answer column: there is a document, and the code that reads it knows what kind it is.

Documents are written in place as the sitting progresses, so a document is the current state of that
sitting rather than a history of it, and progress is computed by reducing over documents. The store
can be a document database or JSONB in Postgres; the model is the same either way.

The attraction is that it matches how the product is used. A sitting is what a family means by "she
did her maths", it is what a records log counts, it is what a portfolio keeps, and it is the thing
whose shape genuinely varies. The attraction is real and the problem is that the parent's side does
not read sittings.

### The shapes

```ts
interface SittingDoc {
  id: string; household: string; child: string;
  lesson: string; lessonVersion: number; pack: string;
  onDay: string; startedAt: string; endedAt: string | null;
  mode: "screen" | "paper"; finished: boolean; withGrownUp: boolean; minutes: number;
  sheet?: string;
  /** The results, in the shape this lesson kind needs. */
  results: Result[];
}

type Result =
  | { kind: "question"; q: QuestionRef; given: Given; right: boolean; tries: number;
      rule: number | null; hints: number; timing: Timing | null; markedBy: string }
  | { kind: "round"; round: RoundRef; moves: LoggedMove[]; outcome: Outcome; capped: boolean }
  | { kind: "performance"; item: string; target: Note[]; played: Performance; verdict: "pass" | "fail" | "collected" }
  | { kind: "collected"; item: string; what: "drawing" | "writing" | "performance"; ref: string; note: string };

interface SheetDoc { id: string; household: string; child: string; lesson: string; printedAt: string; paper: PaperSize; questions: QuestionRef[]; marked: boolean }
interface PlanDoc { household: string; child: string; days: PlannedDay[]; revisions: { at: string; op: PlanOp }[] }
```

### How the six areas land

| Area | How it lands |
|---|---|
| Content | A pack as in the other options, with `pack` recorded on the document. Family content is its own document kind holding notation text, its hash and provenance. A `track` document is a pack entry, membership is the lesson's `subject`, and which tracks are on lives on the `PlanDoc`. |
| Play state | Native and the best fit of the five for the shape a lesson actually produces. A new answer kind is a new `Result` variant and nothing else changes. |
| Progress | Computed by reading every document for a child and reducing, which is a scan rather than a query, and which is affordable at the measured scale (a child-year is about 180 documents). |
| Family | As in Option A if the documents sit in Postgres, weaker if they sit in a document database with no relational scoping. |
| Authoring | Fine, and less clean than Option C, because a draft and a published revision are two documents whose relationship is a field rather than a pointer. |
| Paper | Native. A sheet is a document, and `marked` is a field on it. The unmarked-sheet question is one query. |

### What it makes easy

Writing. A sitting in progress is one document being updated, so the child's app has one thing to
save and one thing to recover after a crash, and a half-finished lesson is a document with fewer
results in it. This is genuinely simpler than any of the log options for the write path.

Varying shape. A lesson kind that produces something strange produces a strange document and nothing
else in the system has to know.

Keeping the portfolio and the record together, because the document is the artefact a parent would
want to look at.

### What it makes hard or impossible

The per-skill grain. The gap ledger, the review scheduler and the headline all read attempts across
sittings, across days and across years: "the same feedback rule matching more than once", "accuracy
dropping as a parameter crosses a value", "secure, from nine right across three days". Those are
queries over answers, not over sittings, so this option needs a derived index over results, at which
point it is Option C with a coarser record and without a log.

Updating in place. A document that is rewritten loses the history of how it got there, which is the
opposite of what `src/play/log.ts` exists to preserve. A child who answered wrong, then right, then
wrong again is a sequence, and `tries` is a count that has already thrown the sequence away. Every
other option can keep the sequence if we later decide we want it, and this one has decided not to.

Merging. Two devices writing the same sitting document produce a lost update, and the sitting is
exactly the object two devices are most likely to touch (a child on the tablet, a parent marking on
the laptop).

### What it costs to build now

Middling. Less than Options A and C, more than B and D. One store, one document schema per kind, and
a validation layer, plus the derived index as soon as the gap ledger is wanted, which
[parents.md](parents.md) ranks in the second group of work.

### What it costs to change later

Low for a new result kind, high for anything that changes what an existing kind means, because
documents were updated in place and there is no log to reprocess from.

### Failure cases

| Case | What happens |
|---|---|
| A parent edits a lesson a child is halfway through | The document holds `pack` and `lessonVersion`, so the results already in it are resolvable, and the remaining questions come from the pack in memory. The awkward case is the parent editing while the document is open on another device, which is a lost update rather than a conflict. |
| Two devices were both offline | The worst of the five. Two versions of one sitting document exist and there is no field-level merge, so one is chosen and the other's results are lost. Splitting the document per device fixes it and removes most of the option's appeal. |
| A child answers on paper a week after printing | The sheet document holds the questions, marking writes a sitting document dated when the work was done, and the sheet is flagged. Clean. |
| A game needs to store something no existing kind covers | One `Result` variant, no migration. This is the case Option E is best at, jointly with Option B. |

---

## The comparison

Requirements down the side, options across. "Yes" means the option gives it without additional
machinery; "with work" means it is reachable and named above; "no" means the option is the wrong
tool.

| Requirement | A tables | B local log | C log and projections | D folder | E documents |
|---|---|---|---|---|---|
| A child can record work with no network | no | yes | with work | yes | with work |
| A seventh answer kind does not migrate anything | no | yes | yes | yes | yes |
| Paper has no per-question timing, by construction | with work | yes | yes | yes | yes |
| A printed sheet holds its questions by value | yes | yes | yes | yes | yes |
| Marking a sheet a week later is exact | yes | yes | yes | yes | yes |
| Evidence survives an edit to the item it came from | yes | yes | yes | yes | yes |
| The content a child was given is exactly identifiable | with work | yes | yes | yes | yes |
| Progress cannot disagree with the evidence | no | yes | with work | yes | with work |
| Changing an unmeasured threshold is cheap | with work | yes | yes | yes | with work |
| The per-skill ledger across years is a query | yes | with work | yes | with work | with work |
| The sequence of tries at one question is recoverable | with work | yes | yes | yes | no |
| Two offline devices do not lose data | with work | yes | with work | yes | no |
| A tutor's scope is enforced by the store | yes | no | yes | no | with work |
| Deleting a child is one operation | yes | yes | yes | yes | yes |
| Exporting everything is one operation | with work | yes | with work | yes | with work |
| Family-authored notation is stored in its own form | with work | yes | yes | yes | with work |
| A draft that cannot be printed is a state, not a flag | with work | with work | yes | with work | with work |
| Provenance and rollback of generated content | with work | with work | yes | with work | with work |
| A current lesson per track is derived rather than stored seven times | no | yes | with work | yes | with work |
| Turning a track off is reversible without losing what was done in it | with work | yes | yes | yes | with work |
| Layer-one authoring works with no verifier present | needs variants in the pack | needs variants in the pack | needs variants in the pack | needs variants in the pack | needs variants in the pack |
| First build cost | highest | lowest | highest | low | middling |
| Cost of the change we know is coming | high | low | low | low | low |

Two rows deserve a note. "Progress cannot disagree with the evidence" is a property of deriving on
read rather than of the store, so C and E can have it by refusing to write a cache, which is what the
measured scale says they should do anyway. And the last row is the answer model, which four documents
independently name as the next core work, so it is the row that should carry the most weight.

## Who each option is right for

Option A is right for a team that expects the shape of the product to stop moving soon, that has
decided the network is always there, and that values an operationally boring system over a cheap
change. It is also the right answer if schools arrive earlier than expected, because rosters,
assignments and reporting are relational problems and `product.md` has deliberately deferred them
rather than ruled them out.

Option B is right for a product whose first claim is that a family can teach a year with a printer
and no reliable internet, that expects the answer model to change several times, and that wants the
evidence to be the family's in a sense stronger than a policy. It is the wrong answer if a tutor seat
or a school is close, because scope enforcement is the thing it does not do.

Option C is right for a team that expects to be arguing about what the evidence means for years, and
that would rather pay a large build cost once than a migration cost per argument. It is the only
option in which changing every derived number in the product is a rebuild rather than a project, and
`parents.md` saying that none of its thresholds are measured is the strongest argument for it.

Option D is right if the trust claim is the product's main differentiator and we are willing to make
the household's data a readable artefact at the cost of query power. It is also the right answer for
a first release that has to exist before any service does, and it is a good thing to build even if it
is not the model, because the folder is what an export produces under every other option.

Option E is right if the sittings turn out to vary more than we expect and the per-skill roll-up
turns out to matter less than `parents.md` assumes. Of the five it is the one whose case rests on a
prediction that the document says is wrong, so it should be chosen only if we think that part of the
parent's spec is mistaken.

## Recommendation

This is a recommendation, and the decision is the owner's.

We recommend Option B, the local-first log, with two amendments borrowed from Option C.

The reasoning, in the order the arguments actually weigh.

The change we know is coming is the answer model, and it is named independently by
[product.md](product.md), [curriculum.md](curriculum.md), [activities.md](activities.md) and
[sound.md](sound.md). Today there are two kinds of answer value in 36,128 measured values, and six
kinds are specified. An option in which a new kind is a tag and a judge case costs roughly nothing
per kind; an option in which it is a table and a migration pays that cost four more times before the
specification is even satisfied. That argument rules out Option A and does not distinguish between
B, C, D and E.

The second argument is offline, and it is not a preference. Paper is a first-class output and one of
its stated reasons is a day when the tablet is flat; the child's build talks to nothing except our
own API for evidence, and `ai.md`'s tier one is defended partly on the grounds that the child's page
behaves the same with the network off. A model in which the child's device cannot record work without
a network contradicts that, and bolting a queue onto Options A, C or E is Option B's log without its
model. This argument selects B or D.

The third argument is the roadmap. [product.md](product.md)'s milestones put accounts, sync and
evidence fourth, after a complete year for one grade, the studio, and a second grade and subject.
A server-authoritative model has to be built before the thing it serves, and the two options that
can ship an evidence store before any service exists are B and D. The parent's side in
`src/family/` is already pure functions over `Attempt[]` and `Sitting[]`, which is what a fold
produces, so B is the option in which the existing prototype becomes the product rather than being
replaced.

The fourth argument separates B from D, and it is D's own source that makes it.
[notation-vs-json.md](notation-vs-json.md) says the decision to use the notation "would change if
content stopped being hand-written and reviewed", and evidence is precisely content that is
machine-written and never reviewed. The notation's advantages (prose without escaping, comments,
small reviewable diffs, precise error positions for a repair loop) all pay for reading and reviewing.
An attempt row is appended by a tablet and read by a fold. The one exception, a parent's comment on a
day, is a feature we should have and is not worth choosing a storage format for. We should still
build the household folder, as the export format and as the handover artefact, because it is the
best answer to the trust claim and every other option needs an export anyway. It should not be the
store.

The two amendments from Option C are where B is weakest, and both are small.

Content and variant identity should be content-addressed with human names as aliases. A sitting
records the pack digest it played, an attempt records the item's canonical hash as well as its name,
and a variant is identified by the verifier's own key (`a=2,b=3`) rather than by its index in a
variant list, because that list is produced by a seeded shuffle over an enumeration whose order
changes when a range changes and changes wholesale when an item crosses the 10,000-variant sampling
threshold. This costs a hash per revision and it removes the entire class of failure where evidence
points at a question that no longer means what it meant.

The event payload union should be declared once in the kernel and validated at the edge, the way the
vocabulary is derived from the parts index rather than maintained beside it. The failure we are
avoiding is the one `notation-vs-json.md` already identified in the drawings, where a part's size was
written twice and drifted. An answer kind declared in the kernel, in the judge, in the fold and in
the parent's read path is the same defect waiting to happen, and one declaration with the rest
derived is the fix that already worked once.

Three things we are not recommending and should say plainly. We are not recommending a materialised
progress cache in the first build, because the arithmetic says a family's whole history folds in
milliseconds and a cache that nobody needs is a cache that can be wrong.
[tracks.md](tracks.md) sharpens this while this was being written: `Progress.current` becomes one
lesson per track, so the cache in question is now seven fields per child that can each be stale
rather than one. We are not recommending
that sync be designed now, only that the log be shaped so it can be (one stream per device, ordering
by `(device, seq)`, attempt events that commute and plan events that need a stated rule and a visible
notice when a change is overwritten). And we are not recommending that a tutor seat be attempted in
this model, because Option B does not enforce scope; when the tutor seat is built, either the
household's log moves to a server, which is C, or the tutor gets a folder, which is D, and that
decision should be taken then with the seat in front of us rather than now.

The number we would most like before this is settled is how large a drawing and a performance are per
question in practice, because the drawing kind is the one thing in the specification that could make
an append-only log on a device the wrong shape, and we have not measured it.

## Open decisions

- Settled on 14 September 2026: a pack carries the variants each lesson names, made concrete and
  laid out, with two more draws of each practice block for another day, one file per lesson
  (`engine/pack.ts`). It does not carry a recipe, which would need the verifier on a child's device.
  The corpus measured 1,748 kB against 8 kB, and lessons name 369 of 22,337 variants.
- What a sheet id is. The options are a random id, a digest of its question list, or the tuple of
  child, lesson and print time. A digest makes two prints of the same sheet the same artefact, which
  is either a feature or a bug depending on whether a parent printing twice means to.
- Whether the sequence of tries at one question is recorded or only counted. `tries` is a count
  today, and nothing in the specs asks for the sequence, but Option E is the only model that forecloses
  it and the cost of keeping it open is nothing.
- How a lesson's position in its track is written down. [tracks.md](tracks.md) settles that the
  ordering is the track's own and total, and that the week comes from the plan, which removes
  `week = step * 4`. What it does not settle is whether the position is a number on the lesson or the
  order of an explicit list in the `track` file. The list is self-documenting and renumbers nothing
  when a lesson is inserted; a number on the lesson keeps a lesson's file self-contained, which is
  the property the corpus has today. This should be decided in `tracks.md` rather than here.
- Whether `Progress.current` per track is derived or stored. This document argues derived, and it is
  the one place where seven fields instead of one makes the difference obvious.
- Whether skills get a declaration of their own. 99 skills exist as strings and 74 of them rest on a
  single item, so the skill graph the product promises is not yet data in any model.
- What retention means for a log. Deleting a child's events and rebuilding is clean under B and C;
  what happens to a sheet that has already been printed is not a data question and should be said out
  loud rather than modelled.
- Whether the household folder is built as the export format in the first release or later. We think
  earlier, because it is also the handover pack and the portfolio's home.
