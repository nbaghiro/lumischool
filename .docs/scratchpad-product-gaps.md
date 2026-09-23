# Useful scratchpad functionality without a product home

Source audit, 23 September 2026, after the Games, weekly-letter and calendar work.
This updates the feature conclusions of [scratchpad-audit.md](scratchpad-audit.md) and the
pending decisions in [retirement-plan.md](retirement-plan.md). It does not approve every prototype.

## Scope and confidence

Inventoried all 33 top-level HTML entry points and the live source groups: 245 files across pages,
styles, sound, paint, coding, world, family, AI, brand and adapters; 31 scratchpad test suites.
Inspected the feature implementations below against current root UI, models, routes and their
consumers. “Missing” means no equivalent product interaction was found, not that the underlying
math, drawing or data type is absent.

This was a source audit, not a fresh browser/audio/print certification of the legacy pages.
Some prototype imports and API assumptions are stale. An implemented prototype is material to
recover, not necessarily a page that still runs unchanged. The leftover work directories were
inventoried as preservation material; their backups and screenshots were not exhaustively compared.
Browser-local saved work was not inspected. Production deployment parity was not tested.

## Main finding

Painting is not the last large feature. Music is another substantial creative area, and coding
still has interactive teaching functionality outside the app. Three small world games, sheet
annotation and printable map keepsakes also remain. Authoring tools form a separate internal/adult
product decision; they should not automatically become child-facing map features.

## Child and family experiences

| ID | Experience and concrete product value | What is actually implemented in the prototype | Current app gap | Suggested home / priority |
|---|---|---|---|---|
| P1 | Free painting: make something for its own sake | Pencil, crayon, marker, water brush, blending, fill, stamps, stencils, colour pickup and erasing; three sizes; pigment mixing wells; two/four/six-way symmetry; plain or squared paper; undo; pointer and keyboard input | Root has pigment mixing and painting art/data shapes, but no mounted easel. No Paint route or child painting entry | Painter's hut → a shared full painting workspace. High priority |
| P2 | An artwork wall: revisit and continue pictures | Current painting, tool state and up to 12 wall pictures kept in browser storage; selecting a picture reopens it | No equivalent child artwork library, durable family storage or cross-device access | Inside Painting first. Hanging personal pictures on the map is an additional design, not something already implemented by this wall |
| P3 | Painting as an actual lesson answer, with thoughtful adult review | Easel fitted over a lesson's paint sheet, with authored outlines/guides/palette restrictions; replay mark by mark; colour recipes and tools used; authored things to notice and an adult response | Real lesson UI explicitly says “Paint this one on paper.” Prototype adult response renders example event JSON with placeholder answer identity; it is not durable family review | Shared easel in art lessons; artwork and review in the child's records. High priority with P1 |
| M1 | Playable instruments | Piano, glockenspiel and hand drum; ukulele/guitar fretboard and strumming experiments; pointer/touch and keyboard interaction, lit notes and synthesized sound | Root sound folder has pitch/beat/fretted theory, voices and judging; instrument drawings exist. No equivalent instrument/practice screen or shared browser music player | Bandstand/park → Music. High priority |
| M2 | Learn and play songs | Listen and take a turn, guided notes, visual highlighting, tempo/count-in/looping controls; fretted melody/chord exercises. Five library songs, including Twinkle and Ode to Joy, with source metadata | No song library or guided-playing flow in the app. Existing music theory lessons do not provide this | Music, with links from relevant lessons |
| M3 | Rhythm games | Echo the drum: listen to a bar and play it back. Keep the beat: tap along with a song and see where taps land; tempo and practice modes | These are separate from the migrated action/turn game catalogue | Music activities, optionally also discoverable from Games. High value |
| M4 | Make a tune | Pentatonic tune grid, playable glockenspiel, looping playback, tempo, optional drone and locally saved tune | No composition interaction or tune library in the app; prototype saves a tune on the device, not a family song collection | Music's creative workspace |
| C1 | Runnable coding examples and prediction | Run, Step and reset authored examples; highlight program lines; predict a maze/turtle endpoint; tap/flag stage events; sound for noisy program worlds | Root has the interpreter, scene resolver and a working program-building answer UI. In lesson.tsx the resolver is consumed only for mode “build”; “run” and “toy” are not mounted | Existing coding lesson sheets. High priority to finish the earlier migration |
| C2 | Algorithm toys | Toggle lamps/binary values; compare and swap sorting cards; run a sorting network; lift cups to search for a target | Their drawings and some pure logic exist at root, but the prototype's interactive controls remain in coding/lesson.ts | Coding lessons; consider standalone challenges only after the lesson interactions work |
| W1 | Join the dots in the sky | World-themed dot pictures, number sequences chosen using grade/skills, decoys, pointer targeting and button alternatives | school/games/dots.ts and the artwork are already root modules. Their playable world UI remains in world-try.ts; no corresponding Games catalogue entry found | Optional activity in a world's sky; shared Games player if it fits |
| W2 | Spot the difference | Compare a world's scene with a changed copy: counts, clock hours, flipped or missing objects; acknowledge correct discoveries | Both world/spot.ts and the playable comparison panel remain in the prototype | A small activity within each world; a Games entry is also plausible |
| W3 | Find the square / treasure hunt | Grid over the explored map, clues using steps, compass directions or letter-number coordinates; move and dig; wrong guesses lose nothing | Generator in world/squares.ts and map overlay in world-try.ts have no root product counterpart | Directly on the country map. Particularly strong fit |
| W4 | Pencil and highlighter on lesson sheets | Pressure-aware strokes attached to a day's first sheet, including margin working; undo; pen/finger/pan arbitration; locally stored strokes; printable overlay | Root ink/rendering primitives exist, but no equivalent working-ink layer in the actual child sheet/roll UI was found | Shared lesson surface. Useful for maths working, circling, annotation and handwriting practice |
| W5 | Printable personal country poster | Map of the child's travelled country, title/date/key, progress text and paper-size composition; A3, A4, Tabloid and Letter paths | Map rendering and lesson printing exist, but no equivalent dedicated country-poster product flow found | Parent Map → Print keepsake. Smaller, self-contained migration |

Painting and music should share their workspace between free play and lessons. Rebuilding the same
tool separately in a map popup, a Games tab and a lesson would create three incomplete versions.

## Adult and internal tools worth deciding separately

| ID | Capability | Useful parts to retain | Recommended disposition |
|---|---|---|---|
| A1 | Make your own question/lesson | Start from a picture, existing lesson, blank page or prompt; edit visual parameters and wording; verifier findings and repairs; try/print; drafts and proposed assignment | Strong potential parent feature, but starts as a maintained internal authoring tool. Prototype mixes local/sample flows with old content APIs; do not claim its save/give path is production-ready |
| A2 | Art shelf and notation workbench | Search drawings by subject/usage, inspect settings/takes/anchors/animation, inspect lesson/world use; edit notation and see validation/rendering | Preserve as internal studio/tools. Runtime catalogue and compiler already exist; the missing part is the workbench |
| A3 | Draw / asset authoring | Pressure strokes, pencil/marker/highlighter, named anchors, export into the existing stroke-asset format | Keep internally if still the chosen art workflow. This is an asset authoring pad, distinct from a child's painting app |
| A4 | Difficulty review | Easier/as-written/harder side by side; compare measures; flag close levels; 74 owner review notes | Preserve review data and a maintained review tool. Existing lesson level selection and baseline generation are not equivalent |
| A5 | Adult assistant proposal flows | More-practice/custom-content proposals with verification, goal-to-plan suggestions and evidence-backed records | Optional product exploration. Scripted chooser/writer calls demonstrate the workflow; they are not a finished conversational assistant. Weekly letters and authored child help already cover part of the value |

## Important things that have moved since the old audit

- **Games:** real /games route, shared player and original catalogue, plus the two workshops. Do not
  remigrate play.html, engine.html or arcade.html as separate products.
- **Map flight:** engine/ui/flight.ts is dynamically mounted by Overworld.startFly, with map controls
  and the child's fly permission. It is actual controllable flight, not merely decorative animation.
- **Weekly letters/email:** /letters and the root mail implementation exist. Keep delivery/design
  follow-up separate from a claim that the letter is still trapped in the prototype.
- **Calendar:** /calendar now loads calendar-planner.tsx, with routines, subjects/pace, lesson
  placement, For later, school days/breaks and undo/redo. The new scratchpad planner is not an
  entirely missing product. Its remaining proposals need individual comparison, especially its
  sample year/term/world editor; source overlap alone does not certify full parity.
- **Core world artwork, map, lessons, sheets, auth, brand and guides:** their real implementations
  are at root. A missing gallery of their design alternatives is not a missing child feature.
- **Future worlds:** the prototype's future.ts explicitly references root world definitions.
  Preserve unresolved product decisions and content needs, not necessarily the preview gallery.

There is still a separate **integration gap** for games: the library is a grown-up-app route.
A child-map doorway and lesson-to-game return/progress contract are further product work, even
though the games themselves now run in the app. Do not call this another unmigrated game engine.

## Evidence map

Paths relative to repository root:

- Painting: .scratchpad/src/pages/paint.ts; src/paint/{easel,surface,lesson,look}.ts under
  .scratchpad; engine/pigment.ts; engine/answer.ts; engine/ui/lesson.tsx (ON_PAPER.painting).
- Music: .scratchpad/src/pages/music-{home,play,song,strings,glock,echo,keep,compose}.ts;
  .scratchpad/src/sound/; engine/sound/; engine/parts/music/.
- Coding: .scratchpad/src/coding/{lesson,runner,editor}.ts; engine/ui/coding.ts;
  engine/ui/program.tsx; engine/ui/lesson.tsx (programOn rejects non-build modes).
- Map games: .scratchpad/src/pages/world-try.ts; .scratchpad/src/world/{spot,squares}.ts;
  school/games/dots.ts; school/games/catalogue.ts.
- Working ink: .scratchpad/src/world/working.ts; .scratchpad/src/pages/world-{canvas,page}.ts.
- Poster: .scratchpad/src/pages/world-poster.ts and .scratchpad/scripts/check-print.mjs.
- Authoring: .scratchpad/src/pages/{make,make-draft,make-check,finder,part-form,lang,shelf,draw,levels}.ts;
  .scratchpad/src/pages/levels-owner.json; .scratchpad/src/ai/ and pages/assistant.ts.
- Current entry points: apps/home/routes.ts; apps/home/main.tsx; apps/kids/inside.tsx;
  engine/ui/overworld.tsx; school/worlds/view.ts.

## All 33 entry points: disposition

| Entry points | What to extract / compare |
|---|---|
| paint.html | P1–P3 |
| music.html | M1–M4; preserve song attribution |
| lessons.html | C1–C2, digital paint mounting, retained music/print contracts; ordinary lesson viewing is already replaced |
| world.html | W1–W5; controllable flight and core maps are already moved |
| play.html, engine.html, arcade.html | Replaced gameplay; keep any still-useful developer performance/review checks separately |
| make.html, lang.html, index.html, draw.html, levels.html | A1–A4 |
| assistant.html | A5; distinguish scripted demonstrations from production features |
| planner.html, calendar.html, grownups.html, signin.html | Current app largely replaces them; review remaining planner proposals individually |
| parents-a.html, parents-b.html, parents-c.html, parents-v.html | Superseded design alternatives; weekly letter already moved |
| site.html, site-l.html, site-try.html | Superseded public-site alternatives and sample slice |
| auth.html, brand.html, guides.html, backdrops.html | Design/review galleries; retained systems already live at root |
| experience.html, proposals.html, map-art.html, sketch.html, tmp.html | Launcher, proposals and art/architecture experiments; preserve selected decisions, not automatic app features |

## Recommended decision and implementation order

1. **Approve Painting as one feature family:** free canvas, saved artwork, lesson answers and parent
   review. First choose whether saved art is per child across devices and whether map display is
   part of the first release. The prototype's local wall is not that storage system.
2. **Approve Music as one feature family:** instruments, guided songs, the two rhythm games and
   composing. Reuse one opt-in sound/transport layer and keep visible feedback when muted.
3. **Finish existing coding lesson interactions:** run/step, predictions, events, algorithm toys and
   sound. Use the existing coding migration inventory as a starting list, then verify actual UI.
4. **Select the map activity set:** recommend keeping all three small activities, with optional entry
   and no assumed progress/reward writes. Their actual app persistence policy still needs deciding.
5. **Choose annotation and poster scope:** daily-sheet ink and printable map are useful independent
   slices; annotation needs a durable anchor/save contract before shipping.
6. **Choose internal tooling and any parent authoring offer:** do not make studio infrastructure a
   prerequisite for the creative child experiences unless their authoring needs it.
7. **Retire alternatives only after preserving unique material.** No deletion is authorized by this
   inventory. Update the decision ledger when the owner chooses what to keep.

Before deleting anything, preserve browser-local paintings, tunes, drafts, strokes and sheet ink
from the prototype origin; moving code does not move its localStorage. Also preserve the 74 level
review notes, song source metadata and selected proposal/leftover evidence. Reconcile unique
painting, sound, world-game, authoring and PDF/art/privacy/visual tests with their real destinations.
