# World journeys

Version 2, 30 September 2026. Replaces the first version of 24 September, which covered grades 1 to 4
as a hand-picked browsing aid beside the year's roll.

A world's journey is the set of lessons of one grade that a child finds in that world. Every world
offers the grades that suit it, and at each of them its journey holds between two and six real
lessons. A child sees their own grade's journey in every world they may go into, except the world of
the term today's lessons are in, which keeps the year's roll. A grown-up can open any world on the
map and switch between the grades it offers. Which lessons a journey holds, and who may go in, is
`school/worlds/journey-lessons.ts`, which the child's map reads; the title and purpose each journey
is shown with are `school/worlds/journeys.ts`, which the map does not carry; the view of a journey is
`journeyViewOf` in `school/worlds/reading.ts`.

## What a journey holds

Nothing in a journey is written by hand. A journey at grade g is derived in this order and cut at six
lessons (`MOST`):

1. For a place a track brings a child to (the old tower, the ferry town, the painter's hut and the
   other track places), the lessons it hosts at grade g, which is the same set `hostedLessons` gives
   the year's roll. The ones the family chose come first: a language lesson in the child's language,
   and the national unit of the family's nation. The history and language places take their
   journeys from their tracks this way.
2. For every world, the lessons of grade g whose topics reach one of the world's landmarks or
   creatures (`reachOf` in `school/worlds/rewards.ts`), or whose pictures draw one of the drawings the
   world offers as a landmark or creature, in the order the year meets them.

Every member is the lesson the child is shown: the corpus the journey is read from carries the
child's language and the family's nation (`corpusFrom` in `school/worlds/lessons.ts`), and a lesson
the child is not shown is never in their journey. A lesson in a journey is the same lesson as on the
year's roll, with the same id, so an answer given in one place is the record everywhere.

The first version's journeys were written by hand, two or three lessons a cell. We dropped the
written lists: with grades 0 to 6 and 41 worlds that is close to three hundred cells to keep in step
with a curriculum that is still growing, and the first version left the history and language places
empty after their lessons landed. A derived journey follows the curriculum. A journey that reads
oddly is corrected by the world's reaches and offered drawings, or by its grade range, not by a list.

A grown-up's map has no child, so it reads variants by a preview (`previewOf`): the family's nation
and their first child's language when they are set, otherwise no national unit and the first
language the pack teaches, which is Spanish today. The site reads the same default.

## Which grades a world offers

A world offers the pack's grades from its lowest to its highest:

- The lowest is 0 for a place a track brings a child to and for the kindergarten world, and 1 for
  every other world, unless the world's entry in `RANGES` says `from`.
- The six worlds of the fifth and sixth years (canal town, the observatory cliffs, the old city, the
  midnight sun, the gorge and the moon), the post office and clockwork island start at grade 3.
- The lamp rocks stop at grade 2, and the garden, which is the kindergarten year, offers grade 0
  only.
- The windmill island and the cloud islands start at grade 1: each hosts one kindergarten lesson and
  nothing else of grade 0 fits them, so a kindergarten journey there would hold one lesson.
- A place a track brings a child to offers a grade only where it hosts a lesson the child is shown. The ferry town therefore offers nothing until a grown-up has
  chosen a language for the child.

## What a child may go into

`reaches` in `journey-lessons.ts` decides, and `mapViewOf` in `school/worlds/view.ts` applies it to a child's
map. A child of grade g may go into:

- a world of the run whose year is g or earlier,
- a world a family may choose for a term of such a year,
- a place a track brings a child to that has lessons at grade g,

each only when its journey at grade g has lessons, and always the world they are standing in. Every
other place is drawn and dimmed, with no way in. The map still pans to the child's own year's land
([overworld.md](overworld.md)), so earlier years' worlds are allowed by the rule but not yet
reachable on the map; that change belongs to the map's own work.

## What the child sees

The world of today's term opens on the year's roll, with today's sheets, as before. Any other world
opens on the child's grade's journey there, with no toggle and no grade switcher. Every lesson in the
journey can be done: a lesson finished shows as the child left it (`pastSheetOf`), today's are the
page's own sheets, and the rest are drawn on the same sheets as they come near
(`todaysSheets(...).draw` in `apps/kids/lesson.tsx`, with a drawer for their own drawings), so an
answer records against the lesson's own id.

A journey awards nothing of its own. A lesson finished there lights reaches and stamps where the
year's record puts it, and the journey's own roll lights its reaches from the same record. It has no
moment and no secret.

## What the grown-up sees

Going into a world from the grown-ups' map opens its journey (`readingOf` in `apps/home/school.ts`,
and `reading` in `apps/site/sample.ts` for the sample). The grade is the one in the address, else the
family's first child's grade, else the world's lowest, always one with lessons, so no world opens on
an empty roll. The grades are a row of chips in one pill (`Seg` with `compact`, in
`engine/ui/fields.tsx`, the same control Explore uses), showing only the grades that have a journey
there. "Original collection" opens the world's whole collection as the year lays it out, and the
neighbouring worlds keep the grade and the mode. Each place on the map keeps its own year, term and
lesson count, with a note naming the grades it has journeys for.

## The audit

`npm run check:journeys` (`tools/scripts/check-journeys.ts`, part of `npm run check`) compiles the
curriculum and reads the journeys under every setting a family can choose: each language and none,
each nation and none. It fails when a world offers a grade whose journey holds fewer than two
lessons, and when a world has no title and purpose or an entry names a world that does not exist. The unit
tests are `school/worlds/__tests__/journeys.test.ts` and `journey-reading.test.ts`; the browser
checks are `tools/e2e/world-journeys.e2e.ts` and `child-journey.e2e.ts`.

## Still open

- The map's pan to the child's own land keeps earlier years' worlds out of reach, though the rule
  allows them.
- Members are chosen by topic and drawing, not read for fit, and we have not reviewed every cell.
- Nothing is saved against a journey's id, so a change to what a journey holds needs no migration.
  `JOURNEY_VERSION` names the rule the ids were made by.
