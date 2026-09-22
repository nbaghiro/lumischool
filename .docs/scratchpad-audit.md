# Scratchpad retirement audit

Audited 22 September 2026 against the files on disk. This is a current-state audit, not a claim
that every prototype is a product requirement. No application code or scratchpad files were changed.

## Conclusion

The three real apps already build without `.scratchpad/`. The remaining work is preserving or
deliberately retiring prototype capabilities, tests, review data and tools. Deleting the directory
today would not break the verified app build, but would throw away substantial unfinished work.

The older statements in `CLAUDE.md` and parts of `structure.md` that the apps require
`scratchpad:art` are obsolete. The seam, its declaration and its Vite alias have gone. The later
entries in `structure.md` record this correctly. The boundary guard now refuses scratchpad imports,
including aliases, direct paths and worker URLs.

There is also a version-control caveat: `git ls-files` returned zero files in this checkout.
The real app files are currently untracked; the scratchpad is ignored. Thus neither the root
implementation nor the ignored prototypes should be treated as recoverable from this repository's
Git history. A future clean checkout requires adding the intended root files, separately from this audit.

## Repository map

| Area | Current responsibility and connections |
|---|---|
| `apps/site/` | Public Solid app. `/` when signed out, `/home` for everyone. Uses build-generated site data, a visitor pack and the sample child from `school/worlds/sample.ts`. |
| `apps/home/` | Grown-up Solid app: family dashboard, sign-in, onboarding, Explore and lesson previews, map, calendar, plan, printing/marking, account and local outbox. `routes.ts` declares the screens; `main.tsx` loads them. |
| `apps/kids/` | Child selection/session, country map, a world's place, lesson roll and grown-up exit. `child.tsx` coordinates the view; `inside.tsx` loads the place/roll and past sheets; `lesson.tsx` manages lesson sittings and queued events. |
| `apps/studio/` | Planned only. No directory, entry point or route. `boundaries.ts` reserves an app row, but no `school/studio` module row exists. |
| `engine/` | Reusable machinery: paper, rational numbers/expressions, events/answers, scenes, packs, geometry, ink, drawings, movement, sound theory/judging, coding interpreter, pigment mixing, arrangements and notation. |
| `engine/parts/` | Root catalogue and drawing families, imported art readers, settings, descriptions, motion and shelf metadata. The scratchpad's remaining catalogue adapts this root catalogue. |
| `engine/notation/` | Author-time parsing, vocabulary, instantiation, verification, subject checkers and compilation. The child app consumes compiled packs rather than loading this module. |
| `engine/ui/` | Shared Solid views and browser adapters: SVG/scene rendering, lesson sheets, arrangement/program controls, country/place/roll painters, cameras, tutor, API clients and child event queue. |
| `school/` | Product rules: lessons, year/tracks, games, worlds, record folds, family plans/calendar/access, guide language and the limited assistant envelope. Pure product rules are separate from page rendering. |
| `server/` | Node HTTP/API, auth, sync, content/pack access, email, Gemini adapter and database access. Seven database tables; events underpin derived progress and plans. |
| `content/` | Curriculum source and hand-drawn art. Present at root: 336 lesson files, 2,258 item files, one component file; art has 17 SVG, three Excalidraw and four stroke files. |
| `tools/` | Pack/art/brand compilation, site first-view generation, guards, snapshots, development runner and Playwright journeys. |

The main paths through the system are:

1. `content/curriculum` → notation/verifier/compiler → `tools/pack.ts` → pack files →
   `server/pack.ts` → app lesson views and `school/lessons.ts`.
2. Child answers and adult actions → typed events → API/sync → database → record/family/year
   folds → today's work, calendar, progress and world rewards.
3. `content/art` and coded drawings → `engine/parts` catalogue → UI drawing loaders/renderers →
   sheets, maps, games and site. No scratchpad adapter is required on this path.

`boundaries.ts` declares permitted imports and phases. Vite builds three HTML entries and uses
`server/pages.ts` to choose their paths. Production static serving and site prerendering remain
separate product/deployment work in the existing plan; scratchpad deletion does not provide them.

## What remains, by capability

| Capability | What is already in the root | What remains in the scratchpad | Retirement disposition |
|---|---|---|---|
| Games | `school/games/`: catalogue, mechanics, rule/action models, bindings, proof and logs; `engine/motion/`; `engine/ui/stage.ts` | `pages/play.ts`, `play-turn.ts`, `play-action.ts`, `play-inventory.ts`: actual game selection/session UI, device input, action loop coordination, gamepad handling, reduced-motion stepping and review controls | Build the child's game screen with the existing model. Move useful browser controllers into `engine/ui`; keep developer inventory in studio. Mechanics alone do not give the app playable games. |
| Music | Pitch, scales, key mappings, beats, fretted geometry, voice data and pure performance judge in `engine/sound/`; music drawings and notation checkers | 25 files in `src/sound/`; `music-home.ts`, `music-play.ts`, `music-song.ts`, `music-strings.ts`, `music-glock.ts`, `music-echo.ts`, `music-keep.ts`, `music-compose.ts` and supporting pages | Preserve synthesis, sound switch, playable instruments, transport, song arrangement/library, guided playing, rhythm echo, beat keeping and composition. Add real app surfaces and lesson integration. `music.html` currently enters through `music-home.ts`, not the older `music.ts` showcase. |
| Painting | `engine/pigment.ts`, painting drawings, notation checks and painting event shapes | `paint/surface.ts`, `easel.ts`, `lesson.ts`, `look.ts`, `pages/paint.ts`: brushes, fill, texture/replay, stamps, mirrors, tools, wall/storage, lesson mounting and grown-up response UI | Move the easel and renderer, connect to real sheets and records, preserve model tests. The real sheet currently says to paint on paper; accepting a painting event shape is not a working digital painting flow. |
| Authoring | Notation/compiler/verifier, catalogue and content APIs | `make.ts`, `make-draft.ts`, `make-check.ts`, `part-form.ts`, `finder.ts`, `lang.ts`, `draw.ts`, `shelf*.ts`: visual question editing, findings/fixes, trial/print, save/give, notation editor, art browsing and stroke/anchor authoring | Build `apps/studio` and its product logic. Add its actual build entry/routing and module boundary before moving screens. Keep parsing/verification out of home and kids bundles. |
| Levels review | Level model, measurement, verification, medium baseline and generator in root notation/tests/tools; Explore can select a level | `pages/levels.ts` and `levels-owner.json`: three-level comparison, review sampling, gap warnings and **74 owner notes** | Preserve the notes and rebuild the review surface in studio. The page still globs the deleted `.scratchpad/test/levels-baseline.json`, so its `KNOWN` set silently becomes empty. Repoint the review to the root baseline as part of migration. |
| Assistant | Root authored tutor/guidance and local voice UI; `school/assistant/envelope.ts`; `server/gemini.ts` | Nine `src/ai/` files and `pages/assistant.ts`: material selection, closed request routing/validation, privacy envelopes, traces, generation/repair gate, plan/record proposal checks and scripted scenarios | Choose which workflows to ship, then port the needed policy and checks. The prototype's model and Make-from-a-sentence flow are scripted stand-ins, not evidence of a working production AI assistant. Do not overwrite the real tutor with the older demo policy. |
| Coding interactions | Interpreter, drawings/checkers, `engine/ui/program.tsx` and `blocks.ts`; real `coding.builds` block editing, stepped playback and checking | `coding/lesson.ts`, `runner.ts`, `editor.ts`: broader scene activation, prediction taps, runnable authored examples, sound for tune/dance/stage, interactive lamps/cards/cups/sort networks | Compare interaction types, not just interpreter files. Retire duplicate editor behavior; port the additional controls if retained. The root sheet's `programOn` path is for build tasks, not all prototype coding scenes. |
| World extras | World definitions, geography, rewards, map/place/roll, ambient motion, snapshots, sample child and plane game model | `world/working.ts` (ink attached to a day's sheet), `fly.ts` (player-controlled map plane), `spot.ts` (spot the difference), `squares.ts` (map treasure hunt), `world-poster.ts` and prototype canvas/page UI | Decide separately for each. The root's decorative paper plane is not the prototype's controllable flight. Static geometry/art having moved does not preserve these interactions. Preserve poster print behavior if it remains a product requirement. |
| Grown-up extras | Family dashboard, journal, plan/world choice, calendar, printing/marking, track changes, parking and shifting all have real implementations | `family/letter.ts` and `pages/parents-letter.ts` (weekly letter); fridge and other design variants; `family/changes.ts` previews and sample family/evidence machinery | The old family directory is not all missing business logic. Compare any desired letter/proposal-preview behavior individually; retire sample fixtures and rejected layouts after that. Calendar actions already exist in `school/family/calendar.ts`. |
| Brand and alternatives | Selected brand drawings/exporter and app identity | Alternate logo ideas and presentation pages, alternative sign-in/parent/site layouts, architecture sketches and prototype navigation | Archive a decision or reference image only if useful; do not recreate every design exploration as a production screen. |

Some prototype comments propose new destinations such as `school/music/`. They are not existing
approved boundary rows. Reconcile the split with `structure.md` when implementing it: sound
mechanics in the engine, teaching policy in school, browser/hardware work in UI, and screens in apps.

## All remaining HTML entry points

There are 32 HTML files directly under `.scratchpad/`. Their presence is not proof that all their
features still run correctly after the recent moves.

| Pages | Disposition |
|---|---|
| `index.html`, `lang.html`, `draw.html`, `make.html`, `levels.html` | Missing studio/developer surfaces; preserve the distinct workflows and review data. |
| `play.html`, `music.html`, `paint.html` | Missing playable app surfaces and browser controllers. |
| `assistant.html` | Scripted assistant laboratory; port selected policies/workflows, not a claim of production service parity. |
| `lessons.html` | Root Explore and child sheets replace the core reader, but this page still hosts music, painting and broader coding interactions and print checks. Delete after those are migrated or retired. |
| `world.html` | Core world views exist in the root; inventory the working ink, flight, mini-games, poster and developer previews before retirement. |
| `grownups.html`, `calendar.html`, `signin.html` | Principal product replacements exist in `apps/home`. Useful only for remaining parity comparisons. |
| `parents-a.html`, `parents-b.html`, `parents-c.html`, `parents-v.html` | Design alternatives; review the weekly letter and selected interactions, then retire alternatives. |
| `site.html`, `site-l.html`, `site-try.html` | Public-site alternatives and an experimental prebuilt sample slice; the selected app is `apps/site`. |
| `auth.html`, `brand.html`, `guides.html`, `backdrops.html` | Design/review galleries. Core authentication, chosen brand, guides and backdrops are already in the root. |
| `experience.html` | Prototype navigation/iframe composition. It links real screens as well as prototypes; it is not the product app shell. |
| `proposals.html` | Reads proposals/mockups from `leftover/plan-page` and `leftover/tutor`. Preserve unresolved decisions, not the gallery itself. |
| `engine.html`, `arcade.html` | Older demo entry files; the common engine/game model has moved. Do not count them as separate required products. |
| `map-art.html`, `sketch.html`, `tmp.html` | Map/art and architecture experiments. Extract any still-selected changes; otherwise retire. |

## Tests, tooling and data that deletion would lose

The live scratchpad source has 243 files: 101 page files, 63 stylesheets, 25 sound files,
16 family files, 11 world files, nine AI files, five brand files, four paint files,
three coding files, three art adapters, two core files and the old lesson renderer.
There are 30 `*.test.ts` suites, 13 script files, and 249 generated `public/site-try` files.

Preserve or explicitly replace:

- Sound/instrument tests: `sound`, `strings`, `mallets`, `percussion`, `songs`, `transport`,
  `echo`, `keep`, `compose`. Root sound theory/judge tests do not replace these browser-adapter,
  synthesis and practice-model contracts.
- Authoring tests: `make.test.ts` tests canonical draft edits, findings and repairs through
  `make-draft.ts` and `make-check.ts`. `ai.test.ts` covers the separate prototype policies.
- Painting tests: `paint.test.ts` still imports the prototype surface dynamically; it is not
  redundant merely because the pigment and answer shape moved.
- World extra and family tests: `worlds-play`, `letter`, `changes`; decide which behaviors remain.
  Reconcile the rest (`next`, `overworld`, `view`, `world`, `family`, `harlow`, `calendar`,
  catalogue/shelf/animation/brand/engine/lesson/arrangement/page suites) assertion by assertion
  against root coverage and retained features. Matching test filenames do not establish parity.
- `scripts/check-print.mjs`: actual PDF page counts for lessons/levels and one-page map posters
  at A3, A4, Tabloid and Letter. Root Explore E2E checks print media, but that is not the same
  as checking PDF pagination across the corpus. Move this validation to real routes.
- `scripts/check-art.mjs`: validates root `content/art` file conventions. Port its unique checks
  into root tooling/tests; `tools/scripts/art.ts` and `engine/parts/imported/hand.ts` still refer to it.
- `scripts/check-privacy.mjs`: capture/speech-recognition API restrictions. Reconcile its coverage
  with root privacy/boundary checks before bringing sound and assistant code across.
- `golden.mjs`, `golden-ab.mjs` and `scripts/golden/`: drawing comparison harnesses. Root map
  snapshots do not automatically replace per-drawing/take screen/paper comparisons. Keep the
  useful harness/baselines if that guarantee is retained; discard move-specific backups afterwards.
- `usage-audit.ts` / `usage-check.ts`: developer art-usage analysis. Decide whether to retain as root tools.
- `levels-owner.json`: the 74 outstanding review explanations are separate from the migrated
  medium baseline and are not consumed by any real app.
- `sound/songs.ts`: authored song data and source/licence notes, separate from curriculum `.lumi`
  files. Preserve with the music move.
- Browser-local work: Make, Paint and Draw use local storage on the prototype origin. Moving files
  to port 8500 does not transfer saved drafts, paintings or strokes from port 5173. Provide an
  export/import path for anything the owner wants to retain before taking the pages down.

`leftover/` contains 23,597 files, about 413 MiB, across 22 work directories. These include backups,
logs, screenshots, scripts, mockups, proposals and baseline evidence. It is not runtime source,
but not all of it is disposable cache either. The design documents under `.docs/leftover/` refer
to it extensively. Inspect unresolved briefs/results, carry their decisions and necessary evidence
into maintained docs/tools, then archive or delete the working material. This audit inventoried
those directories and references; it did not certify every one of the 23,597 artifacts as redundant.

The generated `public/site-try` slice and `dist/`, plus scratchpad dependencies and duplicate
configuration, can go with their retired consumers. They are not substitutes for retaining source.

## Remaining compatibility cleanup

After the prototype API consumers have gone:

1. Remove `LOCAL.scratchpad` and its inclusion in local allowed origins from `server/http.ts`.
   Update `server/__tests__/config.test.ts`, `.env.example` and the local/API docs together.
2. Remove the scratchpad-leftover watch exclusion from root `vite.config.ts`.
3. Correct `CLAUDE.md`: the introductory dependency claim, art seam description, old suppression
   baseline explanation, new-prototype guidance and scratchpad command instructions are stale.
   Correct current instructions in `structure.md` and `local.md`; mark old migration narratives
   as historical rather than treating every past path as an active dependency.
4. Update maintained art-tool comments and unresolved `.docs/leftover/` links to their new homes.
5. Keep the negative scratchpad import/build tests. They prevent regression and do not require the
   directory. Keeping `.scratchpad/` ignored is also harmless protection against reintroducing it.

## Recommended migration order and deletion gate

1. Preserve unique review notes, song data, selected proposals and any browser-local work.
   Establish a durable version-control/archive baseline before relying on deletion being recoverable.
2. Build the studio entry and port the shelf, levels review, notation and Make workflows, with
   drawing-pad support if it is still the chosen art-authoring tool. Move their unique tests.
3. Finish the music and painting vertical slices, including UI, lesson answers/replay, storage and
   grown-up review. Compare the extra coding interactions alongside the sound move.
4. Build the Games screen on the existing root mechanics. Decide the map mini-games, flight,
   working ink and poster independently rather than hiding them in a generic “worlds migrated” claim.
5. Resolve assistant and weekly-letter scope. Preserve selected features and explicitly retire the
   others. The old alternatives need no production clones.
6. Port the retained print/art/privacy/visual checks to real routes/modules. Remove old page
   renderers/adapters only after their last retained consumer moves.
7. Remove compatibility configuration and stale instructions. In a copy with no scratchpad,
   require the full root check plus real-app E2E for auth, teaching, print/mark, studio and the
   newly migrated interactive flows. Resolve the existing database guard failure first.
8. Delete `.scratchpad/` once every row above is migrated, archived or deliberately retired.
   Search root source/config/scripts for path imports, file reads, URLs and subprocess calls again.

Steps 2 through 5 are feature work, not prerequisites for the already-passing current app build.
The deletion gate is preservation of the chosen product, not the survival of every prototype page.

The coding row has a detailed follow-up: [coding migration plan](coding-migration.md), with all
36 lessons mapped and a [256-item inventory](coding-migration-items.csv), including the writing
lesson that shares the build UI.

## Verification performed

- Root typecheck, lint, format, suppression guard, boundary guard and voice guard passed.
  The boundary guard checked 1,096 files and 5,706 imports.
- Copied root source/config/content to a new temporary directory, excluding `.scratchpad`, `.git`
  and `dist`; reused installed dependencies through a `node_modules` symlink. In that copy,
  `typecheck`, `check:build` and `check:kids-build` all passed. The child guard inspected 747 chunks.
  This verifies source/build independence; it is not a fresh dependency install or browser parity test.
- `test:apps`: 38 passed, zero failed.
- `test:tools`: 26 passed, one failed, two skipped. The site/build budget and scratchpad-exclusion tests passed,
  but the suite failed at `tools/__tests__/voice.test.ts:46`: `art-mixing-the-secondaries q1`
  has no part for the tutor's Where? action to ring. Resolve this existing failure before requiring
  an all-green retirement gate.
- The full `npm run check` stopped at `check:db`: all seven tables were reported as having RLS
  enabled but not forced and having no policy, 14 findings. This guard reads the migration SQL;
  it is not a database connection failure. Later suites in that chain were not run by that command.
- No scratchpad browser journeys, audio/hardware checks or full PDF corpus run were performed.
  Remaining prototype behavior is classified from source and existing tests, not certified by a
  complete manual run of every page.
