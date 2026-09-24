# World lesson distribution audit

Audited 24 September 2026 against the local app's `/@site-pack/index.json` and current assignment code. Analysis only; no application changes. Counts can differ for another content pack or a child's filtered plan.

## Main findings

The pack contains **336 unique lessons: 84 each in grades 1–4**. There are **38 worlds**. Twelve default term worlds collectively contain all 336 lessons. Eighteen populated subject worlds expose 287 of those same lessons again, without duplicate membership among the subject collections. These are alternate views of existing lessons, not another 287 lessons. Six worlds have no eligible current curriculum. Two additional worlds are alternative term settings and are incorrectly described as empty by the parent atlas.

The number on a world label is not the size of its mounted journal model. `apps/home/school.ts:worldWritten` calls `journalWritten`, which supplies every day in the year. `worldViewOf` passes every day into `layoutRoll`; the selected world determines the arrival, not a content filter. Direct calls confirmed:

| Opened world | Assigned lessons | Parent roll | Day rows | Roll worlds |
| --- | ---: | ---: | ---: | --- |
| Mountains | 23 | 84 | 46 | Mountains, Open sea, Volcano island |
| Kitchen | 28 | 84 | 46 | Woods, Kitchen, Town |
| Winter fair | Atlas says 0; default visit uses 23 | 84 | 46 | Meadow, Winter fair, Railway |
| Farm | Atlas says 0; default visit uses 34 | 84 | 46 | Farm, Harbour, Railway |
| Book island | 36 | 36 | 36 | Book island |

This is a geometry/model count, not a claim that 84 lesson bodies are fetched or rendered at once. Bodies and prepared sheets are already bounded. Child journals depend on progress and enabled tracks; child subject visits use the child's current year, whereas parent subject visits combine grades.

## Complete inventory

Assigned counts below reproduce the parent atlas rules. Grade columns show membership in each grade. “Choice” rows show zero assigned collection lessons but have working replacement-term entry.

| World | Role | Total | G1 | G2 | G3 | G4 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| The meadow | Default term | 34 | 34 | 0 | 0 | 0 |
| The harbour | Default term | 23 | 23 | 0 | 0 | 0 |
| The railway | Default term | 27 | 27 | 0 | 0 | 0 |
| The woods | Default term | 17 | 0 | 17 | 0 | 0 |
| The kitchen | Default term | 28 | 0 | 28 | 0 | 0 |
| The town | Default term | 39 | 0 | 39 | 0 | 0 |
| The night sky | Default term | 29 | 0 | 0 | 29 | 0 |
| The sports ground | Default term | 22 | 0 | 0 | 22 | 0 |
| The laboratory | Default term | 33 | 0 | 0 | 33 | 0 |
| The mountains | Default term | 23 | 0 | 0 | 0 | 23 |
| The open sea | Default term | 34 | 0 | 0 | 0 | 34 |
| The volcano island | Default term | 27 | 0 | 0 | 0 | 27 |
| The garden | Future grade | 0 | 0 | 0 | 0 | 0 |
| The marsh | Subject collection | 17 | 6 | 7 | 1 | 3 |
| The park | Subject collection | 24 | 6 | 6 | 6 | 6 |
| The canal town | Future grade | 0 | 0 | 0 | 0 | 0 |
| The winter fair | Alternative term | 0 | 0 | 0 | 0 | 0 |
| The farm | Alternative term | 0 | 0 | 0 | 0 | 0 |
| The old tower | Subject collection | 0 | 0 | 0 | 0 | 0 |
| The ferry town | Subject collection | 0 | 0 | 0 | 0 | 0 |
| The painter's hut | Subject collection | 24 | 6 | 6 | 6 | 6 |
| The observatory | Future grade | 0 | 0 | 0 | 0 | 0 |
| The old city | Future grade | 0 | 0 | 0 | 0 | 0 |
| The coral reef | Subject collection | 10 | 1 | 1 | 5 | 3 |
| The crystal caves | Subject collection | 10 | 2 | 4 | 3 | 1 |
| The cloud islands | Subject collection | 7 | 2 | 1 | 2 | 2 |
| The oasis | Subject collection | 9 | 1 | 4 | 2 | 2 |
| The fossil cliffs | Subject collection | 6 | 1 | 3 | 1 | 1 |
| The long grass | Subject collection | 9 | 7 | 2 | 0 | 0 |
| The lamp rocks | Subject collection | 18 | 9 | 9 | 0 | 0 |
| The printing works | Subject collection | 28 | 18 | 9 | 0 | 1 |
| The book island | Subject collection | 36 | 9 | 8 | 10 | 9 |
| The treetops | Subject collection | 15 | 3 | 6 | 3 | 3 |
| The salt flats | Subject collection | 12 | 0 | 5 | 5 | 2 |
| The geyser valley | Subject collection | 14 | 0 | 2 | 4 | 8 |
| The post office | Subject collection | 18 | 0 | 0 | 9 | 9 |
| The windmill island | Subject collection | 13 | 0 | 0 | 7 | 6 |
| The clockwork island | Subject collection | 17 | 0 | 0 | 8 | 9 |

## Why the empty worlds are empty

- **Farm:** already replaces Year 1 term 1 (34 lessons) or Year 2 term 3 (39). Parent entry without a grade chooses Year 1. The atlas incorrectly counts only hosted subject lessons for this alternative world.
- **Winter fair:** already replaces term 2 of Year 1 (23), Year 2 (28), or Year 3 (22). Default parent entry chooses Year 1. Same atlas counting issue.
- **Home garden:** declared for grade 0; current pack starts at grade 1. Real preschool curriculum would be needed to fulfil its declared role. Reusing introductory grade-1 work is technically possible but changes that role and needs an age/skill review.
- **Canal town, Observatory, Old city:** declared grade-5 terms, but the pack stops at grade 4. They need grade-5 curriculum to fulfil those roles, or an explicit redesign as places for existing grades.
- **Old tower:** hosts history, which this pack does not contain. History-related reading alone would not constitute a history curriculum.
- **Ferry town:** language lessons are absent and its declared subject list is empty. Its declaration also records unfinished language/audio/answer support. Filling it with existing English reading would change the intended second-language role.

## Can existing lessons move?

**Usually yes, technically; new bespoke lesson generation is not a general requirement.** A lesson's content lives independently of world artwork. Default world assignment follows grade and term. Subject collections are selected by subject and explicit lesson IDs. The existing Farm/Fair replacement mechanism demonstrates reuse already working.

Worlds add theme, landmarks, creatures, seasons, a guide, and optional lesson-to-landmark connections. `reachesFor` matches lesson art/skills/subjects to a world's declared reaches. An unmatched lesson can render, but loses that contextual connection. Moving lessons therefore needs editorial fit review plus assignment/progression work, not automatic rewriting of lesson content.

Three distinct operations must not be conflated:

1. **Add another route:** host an existing lesson on an appropriate island. Keep the original lesson ID, content, answers and progress. Existing subject islands already do this. This alone does not shorten the original year roll.
2. **Change a world's appearance:** use the Farm/Fair kind of term replacement. Same lessons, another environment. This also does not divide the term into smaller collections.
3. **Redistribute the learning route:** divide an existing term into several world visits while preserving grade, prerequisites, curriculum order, enabled tracks, day IDs, completion and rewards. This requires an explicit assignment model; changing a hosts list does not implement it.

Good immediate reuse candidates are Farm/Fair in their declared terms. Existing music/art/reading/science subject islands already hold appropriate existing content. The six genuinely empty worlds should remain honest about their purpose until their role is intentionally changed or their missing curriculum is authored.

No content should be moved just to reach an equal count. A short lesson and a complex interactive lesson have different costs; grade suitability, prerequisite order and measured rendering cost matter more than equal numbers.

## Why zooming out and fast scrolling feels poor

Confirmed in code:

- The parent year roll includes 84 lessons, even when the entry label names a 17–39 lesson term.
- At far zoom, `world.css` hides lesson contents and shows covers. `lookBackNear` explicitly skips preparing lesson bodies at that level. Sparse paper does not establish missing curriculum.
- Scenery is painted in scheduled slices and distant pieces are evicted. At low zoom a viewport covers a much longer section of the roll; fast movement changes the visible set quickly. The screenshot is consistent with detail awaiting painting, but this audit did not record a new frame/performance trace to establish its exact timing.
- Measured heights trigger whole-roll layout/scenery replacement. Earlier investigation reproduced changed decoration choices and path samples in an unchanged later day when only a preceding lesson grew. Absolute-position texture seeds and global decoration counters must be made local to stable days.

These are rendering and navigation design issues. Spreading the same lessons across more atlas labels does not by itself fix them.

## Recommended order

1. **Stable scenery:** make decoration choice, drawing seeds and path decoration placement depend on stable day/lesson identities and local offsets. Preserve atomic lesson/layout/camera publication and bounded caches. Check unchanged later-day artwork before/after an earlier lesson grows, across multiple themes.
2. **Scope explicit world visits:** build only the chosen world's term for a parent visit, with lightweight previous/next world navigation. Preserve the child's full learning history in its model; use an explicit view projection so annual routes, progress, day identity and rewards are not accidentally truncated. Mountains should display its 23 lessons, not the whole 84-lesson year. Subject collections need grade-aware browsing.
3. **Design the far-zoom view:** use cheap, stable day/chapter cards and coarse scenery; do not expose partially populated detail as the overview. While moving, prioritise input and coarse coverage; refine after settling. Offer reliable navigation to a day and back to its world. Do not fetch every lesson to make the overview look complete.
4. **Fix atlas descriptions:** distinguish alternative settings from missing curriculum; show Farm/Fair's available term choices and lesson counts accurately.
5. **Then consider redistribution:** review existing units for coherent smaller journeys, explicit world assignments and relevant landmark links. Keep canonical lesson IDs and prerequisite sequence. Add new curriculum only where there is an actual curriculum gap, rather than to mask rendering limits.

Validation should cover parent and child explicit visits, sample overlay, cold/warm and slow loading, fast scroll/pinch, lesson height changes above/below the viewport, return navigation, all themes, session/pack changes and the physical iPhone. Phone browser emulation cannot certify the reported device crash is fixed.

## Code references

- `school/worlds/worlds.ts`: default terms, alternative choices, `hostedLessons`, subject ownership rules.
- `school/worlds/written.ts`: atlas counts, `daysWritten`, `journalWritten`, lesson-to-default-world lookup.
- `school/worlds/view.ts`: `journalOf`, track versus year selection, `reachesFor`, `worldViewOf`.
- `school/worlds/roll.ts`: height-dependent rows, whole-stretch path sampling, decoration sequence.
- `engine/ui/scenery.ts`: absolute-position ground seeds, global scenery-index drawing seeds, whole-view painting.
- `engine/ui/world.tsx`: atomic publication, culling, far-zoom preparation policy.
- `engine/ui/world.css`: far-zoom covers/content visibility.
- `apps/home/school.ts`: actual parent entry and lesson reader.

## Implementation after the audit

The counts above remain the audit baseline. Explicit parent and sample visits now project the selected
term into their roll, retaining the original day numbers and lesson IDs. Explicit child term/subject
visits use the same projection; the child's underlying annual journal, progress, rewards and default
annual entry remain unchanged. A term can therefore render only its own days without reassigning any
lesson or recording a new completion.

Parent/sample term reading offers previous/next world navigation with destination preparation on
intent. Parent visits to Farm and Winter Fair also offer a grade/term selector, retained in the URL;
this browses another eligible set of existing lessons without changing the family's plan. The sample
continues to use its existing default grade for these alternatives. Atlas descriptions now distinguish
these choices from missing curriculum and report the eligible term counts.

Loading an earlier lesson no longer advances later-day landmark/creature selection or their drawing
seeds. Path-mark sampling restarts for each day, and ground texture tiles start at day boundaries with
identity/local-offset seeds, including water and weather seeds. Paving, floor tiles and boards also
use each day’s local origin for their row spacing and alternating pattern. The underlying path band is a plain
continuous SVG stroke rather than randomly regenerated art. These changes preserve the previous atomic
publication of sheet positions, camera anchoring and prepared background layers. Local unit regression
cases grow an earlier sheet from 800 to 5,800 units and verify unchanged later-day decoration and path
marking coordinates after translation. They are not a claim that every browser compositor frame or all
animated states have been certified on the physical iPhone.

At the days/far zoom levels, the roll shows inexpensive selectable day cards with actual lesson titles.
Nearby days are grouped when screen spacing would make targets overlap. Lesson bodies are not requested
merely to populate this overview. At the far level decorative texture/art pieces are released while
coarse ground and horizon coverage remain. This preserves the roll's coordinates; it does not compress
long loaded lessons into a separate timeline, so large gaps can still exist between day cards.

The interior model now has a real loading boundary: `school/worlds/reading.ts` owns the reading view
projection and `school/worlds/roll-layout.ts` owns its height-dependent geometry. Atlas/shared journal
metadata stay in `view.ts` and `roll.ts`, and the child-specific world constructor lives in the already
lazy `apps/kids/inside.tsx`. The first-view budget test passes without raising the script limits.

No canonical lessons were moved and no new curriculum was generated. The next editorial step remains
reviewing coherent smaller units and their world connections; the six missing-curriculum destinations
are still described honestly. New geography assignments must preserve prerequisite order and canonical
progress, rather than equalising counts for rendering reasons.
