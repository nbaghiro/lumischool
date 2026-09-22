# Coding interaction migration plan

22 September 2026. Plan based on the current root and scratchpad source and a successful compilation
of all 336 curriculum lessons. Companion: [item inventory](coding-migration-items.csv).

## Outcome and scope

Restore the coding interactions implemented by the scratchpad inside the real child lesson flow
and grown-up lesson preview, while retaining the root's answer recording, hints, resume behavior
and print output. No lesson needs to be copied out of the scratchpad: the curriculum, coding
interpreter, drawings, checkers and compiled scenes already live at root.

The work is a browser interaction migration. Keep all implemented coding extras, including
prediction, Run/Step/Reset, stage events, algorithm toys, build dragging and sound. Do not expand
this task into a new free-play app, custom character editor, coding studio forms or a larger
programming language. Those are separate proposals in `coding.md`.

## Measured scope

The current coding subject has **36 lessons, nine per grade**, using **255 distinct items**:
249 `coding.*` items and six logic items. Every `coding.*` source item is referenced by a lesson;
there is no separate unassigned coding corpus waiting in the scratchpad.

Across the easier, medium and harder levels, and the two additional compiled practice draws:

| Category | Distinct items | Current app state |
|---|---:|---|
| Authored programs to play | 110 | Drawn, but no ordinary scene player |
| Lamps/cards/cups/network controls | 26 | Drawn, but no hands-on controls |
| Coding build tasks | 26 | Working block editor and grading; incomplete interaction parity |
| Other coding-subject items | 93 | No interaction activated by the prototype; keep current behavior |
| Cross-subject build regression | 1 | `writing.cards-to-flag` in `writing-directions-on-a-treasure-map` |

At **medium, primary draw only**, the missing playback and toy controls cover **200 question
appearances and 29 standalone teaching scenes, across 33 coding lessons**. The 200 are 160 runner
questions and 40 toy questions. A repeated item counts once per appearance here. The 29 are 25
runner scenes and four toy scenes. Prototype grid prediction is available on 89 question
appearances, from 59 distinct items. Build tasks add 32 question appearances across 17 lessons,
including the writing lesson.

The CSV lists all 256 distinct items above, their source paths, migration category, scene types,
levels, containing lessons and medium question locations. It is a snapshot of current content,
not a new runtime registry. A lesson's standalone look scene is covered by the lesson table below.

Counts follow the scratchpad's activation rule: `coding.builds` first; otherwise `coding.runs.of`
selects the world, or the first runnable non-listing node; otherwise the first algorithm toy.
`program` and `blocks` alone do not activate. The inventory was calculated from compiled scenes
using root `valuesOf`, `RUNS` and `setupOf`, over every level and stored draw. Prototype
key/print-mode exclusions are presentation policy, not separate item categories.

## What exists and what is missing

The root `ProgramQuestion` in `engine/ui/program.tsx` handles only a `coding.builds` question routed
through `SheetState.program` and `Question.programming` in `engine/ui/lesson.tsx`. It supports
tray taps, selection, moving/nesting/count edits, undo/clear, Run it, grading and restored work.
Its playback redraws the world with `upto` on a fixed timer. `school/lessons.ts` and
`apps/kids/lesson.tsx` own attempts and persisted program answers.

Ordinary coding questions pass through `Strip`/`SceneTile`; look scenes pass through `Block`'s
`scene` case. Neither activates coding. Adding another branch beside `ProgramQuestion` alone
would miss typed questions and introductory scenes.

The prototype's three coding files contain 1,144 lines:

- `lesson.ts` (368): scene selection, controls, prediction, flag/tap buttons, build wiring and four toys.
- `runner.ts` (411): frame playback, timing, sprites, listing highlighting, sound and grid geometry.
- `editor.ts` (365): drawing-based tray/slot controls, gestures, drag/reorder/remove, editing and keyboard.

They import author-time `SceneInstance`, `layout`, `PARTS` and `partParams`. Those dependencies
cannot enter the child app. Rewrite the adapters around compiled `Scene`, `SceneNode`, `boxes`,
`valuesOf`, the root drawing catalogue and `setupOf`. Reuse the root interpreter and editor model.

### Behaviors to restore

| Mechanic | Specific behavior | Root building blocks |
|---|---|---|
| Maze, turtle, stage | Run, Step, Start again; square-by-square movement, turns, turtle trail, bump feedback, live line and final result | `engine/coding.ts`; coding drawing helpers; motion timeline/spring/loop |
| Pixels/lamp rows | Paint rows or individual lights; cap endless lamp playback at the frame that fills the visible row | `pixels.ts`'s `lampRun`; interpreter's frame limit stays unchanged |
| Variable, trace table, fork | Update number history, reveal trace rows, light the chosen branch | Their drawing settings: `upto`, `filled`, `lit` |
| Dance, tune | Highlight beats/notes in order; note/rest/dance durations; optional chime/wood sound | Drawing settings `beat`, `ring`, `upto`; interpreter frames and pitch helpers |
| Prediction | Grid tap or keyboard cursor, committed guess, comparison after playback, reset | `gridAt`, compiled node boxes and interpreter end state |
| Stage events | Flag button and a named character-tap button when a tap script exists | `setupOf(...).event`, parsed scripts, `run(..., { event })` |
| Binary lamps | Toggle each weight, show resulting sum, reset | `lampAt`, lamps drawing |
| Sorting cards | Compare adjacent cards; swap only if out of order; track swaps; reset | `cardAt`, sortcards drawing |
| Cups | Lift, reveal value, indicate the excluded side, count distinct lifts, reset | `cupAt`, cups drawing |
| Sorting network | Advance a bridge, report the comparison, reset | `throughNetwork`, sortnet drawing |
| Build editor | Drag from tray, reorder/drop to remove, nest on drop; Step without submission; reset playback | Existing `engine/ui/blocks.ts`, `codepad` geometry, gesture recogniser |

## Decisions to implement

1. **Playback and assessment remain separate.** A guess, toy action, ordinary Run or Step never
   records an answer, uses a try or marks a question complete. The normal typed/picked Check
   remains authoritative. A build Run it records one attempt on successful playback completion;
   its Step and Reset do not. Cancellation must not submit an attempt.
2. **Prediction is optional, matching the prototype.** Invite it before playback; do not force a
   square guess on every maze question, many of which ask a different thing. It does not prefill
   answer boxes. Keep predictions and toy state local to the current question/variant; they are
   not new persistent evidence. Freeze that run's prediction until it ends.
3. **Preserve the authored question.** Experiments change an overlay/render state, never
   `PackQuestion.scene`, answers or the key. Starting again restores authored settings. A toy
   that helped a child discover the answer still does not change what their Check is judged against.
4. **Use one player for builds and demonstrations.** `program.tsx` keeps the editor and assessment
   callbacks; a shared runner owns playback. Do not leave its timer beside a second playback engine.
5. **Declare presentation permission explicitly.** Live child sheets enable interactions. Completed
   and historical sheets permit replay of authored code or saved build code but no editing or
   submissions. Explore permits non-recording trials, with key display separate from trial state.
   Print and the site's sample remain static by default. This avoids making `key=false` mean
   “interactive” everywhere.
6. **No pack or event schema change is needed initially.** Concrete settings, boxes, checks, saved
   programs and answers already supply the inputs. Do not move verification into the browser or
   mutate lesson seeds/medium baselines to make the UI easier to build.
7. **One active coding playback in the lesson view.** Starting another player stops the previous
   one. Unmount, level/draw changes, leaving the sheet, print and tab hiding stop clocks, gestures
   and owned sounds. Returning does not restart them automatically.
8. **Limit audio migration to what coding uses.** Move the shared chime/wood wave definitions and
   the required wave playback path. Do not require piano/plucked instruments, songs, rhythm practice
   or the whole Music page to ship coding sound. Keep voice names in `engine/sound/voices.ts`.

## Proposed file responsibilities

Names below are proposed new files, not files already present.

| File | Responsibility |
|---|---|
| `engine/ui/coding.ts` | Pure scene interaction resolver, node/listing selection, frame-to-drawing settings, playback lengths/caps and prediction geometry. Testable without DOM. |
| `engine/ui/code-runner.ts` | Browser player over those descriptions; rendering, sprite/timeline lifecycle, Run/Step/Reset and explicit completed/cancelled result. |
| `engine/ui/coding.tsx`, `coding.css` | Shared Solid controls/scene attachment, prediction, stage events and four algorithm toys. No marking policy. |
| `engine/ui/program.tsx`, `program.css` | Existing build UI, using the common runner, plus drawing-based drag interaction and non-submitting Step. |
| `engine/ui/blocks.ts` | Existing edit model; add an atomic move-to-index/depth operation if needed for drops. Do not copy the prototype's second program model. |
| `engine/ui/lesson.tsx` | Pass interaction permissions and check context through look scenes, worked examples, ordinary typed scenes and builds. Keep existing input/hint flow. |
| `engine/ui/scene.ts` | Give rendered nodes stable scene-local identities, so a controller targets a node by id rather than the first drawing of its type/x-coordinate. |
| `engine/sound/wave.ts` | Chime/wood parameters and Fourier data moved from prototype `voice.ts`, with the wave type. |
| `engine/sound/sounder.ts` | Small typed wave cue/output contract and silent/recording outputs, using root `Note` and `WaveName`. Do not advertise unsupported voices. |
| `engine/ui/sound.ts` | Lazy browser audio context, wave playback, opt-in sound state and cancellation of a player's scheduled notes. |
| `apps/kids/lesson.tsx`, `apps/home/explore.tsx` | Supply the appropriate interaction permission; keep server writes in the current child sitting path. |
| `tools/e2e/coding.e2e.ts` | Real-app browser acceptance journeys and static/print regression cases. |

The proposed UI files fit the existing UI reach to scene, parts, coding, motion and sound. The
engine's coding interpreter should not gain UI, scene or drawing dependencies. Update the
structure document as the files land. Shared browser lifecycle belongs in UI, not `school/`.

## Ordered implementation slices

### 0. Establish a reproducible baseline

Use the CSV to select fixtures before editing. Preserve current pack hashes and question keys for
all three levels and alternate draws. Capture a representative static/print scene for each mechanic.
Record the existing unrelated test failures listed below rather than changing curriculum to hide them.

Exit: the coding scope is reproducible from `compileLessons()` and all item ids resolve at root.

### 1. Resolve coding interactions from compiled scenes

Implement `engine/ui/coding.ts` and stable rendered node identities. Prefer the explicit
`check.settings.of` node for a question. A standalone scene can expose its runnable nodes separately;
the square/staircase comparison must not accidentally animate the wrong turtle. A listing is linked
only when it is unambiguous, parses and represents the selected world's program. Leave prose,
partial programs and unrelated listings static.

Use `valuesOf` before `setupOf`: compiled text/options are not the prototype's raw parameter values.
Use existing `scene.boxes`, including x and y. Do not rerun notation layout in the browser. Add
per-scene coverage assertions across levels/draws, not a handwritten list of lesson ids in runtime code.

Exit: resolver tests cover all nine runnable drawing types, all four toys, builds, static listings,
two worlds of the same type, malformed listings, explicit targets and the writing build task.

### 2. Restore visual playback and wire every scene path

Build the common runner and Solid controls. Integrate it into `Block`'s standalone scene path,
ordinary `Strip`/`SceneTile` rendering, worked examples and Explore. Thread the parent `PackItem`
check through `Question` where necessary; the current `q` alone does not contain it.

Keep nine explicit drawing adapters: maze/turtle/stage, pixels, variable, tracetable, dance, tune
and fork. Copy the prototype's semantics rather than assuming every part reacts to `upto`.
Preserve line highlighting, reset, spring motion and step/result words, and retain interpreter
bump/limit handling. Endless lamp rows use `lampRun`; do not animate 2,000 frames or change `done`.

When `SceneTile` replaces its SVG after a hint or answer changes, dispose/rebind the attachment
without duplicating controls or losing text input focus. Preserve tutor rings and answer overlays.
Lazy-load controls with lesson content so site/map first-load budgets stay intact.

Exit: the first grid lesson runs inside the real roll; each of the other eight drawing types has
a real-app smoke case, Run and Step reach the same state, and typed answers still record normally.

### 3. Add prediction, stage events and camera-safe input

Port grid prediction with pointer and keyboard alternatives, explicit flag/tap event selection and
reset semantics. Test the transformed world roll, not just flat Explore: it scales and moves scenes.
Use the geometry from slice 1 for both hit targets and the ring.

Prevent control keys from bubbling into `CanvasView` panning/zoom shortcuts. Its current keyboard
exclusion covers inputs/selects/textareas, not these buttons. Give drags to the interaction through
the existing pointer-claim mechanism or a scoped control handler; empty paper must still pan and
a second finger must not leave an active drag behind. Retain 44 px controls and useful grid access
at phone widths, using the roll's reading zoom and keyboard alternative rather than shrinking targets.

Exit: pointer and keyboard guesses agree; wrong and right predictions change no attempt count;
flag/tap runs differ correctly; arrow keys inside a coding control do not move the country/roll.

### 4. Restore the four algorithm toys

Port lamps, sorting cards, cups and sorting networks into the Solid controller. Keep their small
state transitions testable in the companion `.ts` file. Reuse the drawings' geometry and
`throughNetwork`. Preserve unique lift/swap counts, reset and accessible labels.

Compute announcements from the state actually produced: do not copy the prototype's unconditional
claim that the last network bridge sorted every possible input. Toy changes must leave canonical
question settings and answer keys intact, including when the user opens a hint or prints mid-play.

Exit: one full real lesson from each toy family works; its ordinary Check and reset still work;
no toy tap creates an `answered` event, and print shows the authored question.

### 5. Finish build-editor parity on the shared runner

Replace `ProgramQuestion`'s fixed timer with the shared runner. Keep `Programming.tried`, the
three-try/hint policy, saved `Given.program`, answer replacement and resume behavior unchanged.
Add Step and Reset playback, then drag from tray, reorder, nesting by drop position and drag out
to remove. Keep every tap/button/keyboard alternative. A cancelled drag changes nothing; one drop
is one undo action; `once`, capacity, allowed nesting and number locks come from `blocks.ts`.

Return a distinct cancellation result from the runner. The prototype's `stop()` resolves a run
as if it finished, which must not trigger the real app's submission callback. Guard async drawing
loads as well, so an unmounted or replaced question cannot redraw or submit later.

Exit: wrong Run followed by right Run produces exactly two attempts; Step, Reset, drag and
cancellation produce none. Reopening preserves the final program. The existing build E2E and
the cross-subject writing build both pass with mouse, touch and reduced motion.

### 6. Add coding sound without pulling in the Music app

Extract prototype chime/wood definitions to `engine/sound/wave.ts`, repoint any remaining
scratchpad users and remove the old definition file when its last implementation moves. Port the
wave branch of `sound/web.ts`, its gain/envelope behavior, lazy wake and required cancellation into
the root UI sound adapter. Share the opt-in state rather than creating a second app sound setting.

Schedule tune notes/rests and repeated dance beats from interpreter frames at their actual times.
Preserve optional bump/end cues. Sound is off until requested; unavailable audio leaves a complete
visual lesson. Unmount, Stop, sound-off and hiding the tab cancel future cues owned by that player.
Reduced-motion Run shows the final picture immediately while optional audio keeps normal musical
timing; never collapse a whole tune into simultaneous notes. Step emits only its own frame's cue.

Exit: recording-output tests assert pitches, rests, repeated beats and cue cancellation; browser
checks cover sound-off, explicit activation, unavailable output and navigation during playback.
Manually listen to one tune and dance to check the audible result. No microphone permission is used.

### 7. Verify parity, repoint the prototype, remove coding leftovers

Retire coding playback on the prototype lesson page in favor of links to the real
`/explore/:lesson` trial. Other prototype subjects can keep their page while they migrate.
This avoids maintaining a second player or adding a temporary Solid build pipeline to the
scratchpad, whose Vite config currently has no Solid plugin. The real preview must have the
non-recording trial behavior from slices 2 and 5 before those links replace the old controls.

After the last consumers are repointed, delete `.scratchpad/src/coding/lesson.ts`, `runner.ts`,
`editor.ts` and `src/styles/coding.css`. Remove `wakeCoding` imports/calls and retire
prototype-only event-record debug panels. Do not delete
the remaining music/paint modules as part of coding cleanup.

Exit: no retained code imports the deleted coding files, root builds without `.scratchpad`,
all acceptance cases pass and `coding.md`/the retirement audit describe the resulting state.

## Acceptance matrix

| Case | Real lesson / item | What must be demonstrated |
|---|---|---|
| Ordinary runner + prediction | `coding-following-instructions` / `coding.robot-across` | Look scene and typed question run; prediction comparison; Check remains independent |
| Drawing + two similar targets | `coding-square-rectangle-staircase` | Correct turtle selected; path and target preserved; companion listing never lights incorrectly |
| Events | `coding-two-ways-to-start` | Flag and character tap run their respective scripts |
| Pixels + endless pattern | `coding-colour-by-code`, `coding-a-pattern-that-never-ends` | Correct rows; row-full cap and wording; no 2,000-frame playback |
| Variable/trace/decision | `coding-a-number-that-changes`, `coding-trace-it-in-a-table`, `coding-a-program-that-decides` | `upto`/`filled`/`lit` differ correctly; normal answers remain usable |
| Sound | `coding-a-tune-from-a-program`, `coding-a-dance-in-a-loop` | Notes, rests and beats agree with highlights; silence/reduced motion still usable |
| Toys | `coding-lamps-that-count`, `coding-sorting-cards`, `coding-fewest-lifts`, `coding-a-sorting-network` | Tap/keyboard actions, counts, reset, unchanged grading and print |
| Build + persistence | `coding-following-instructions` / `coding.fewest-blocks` (q10 at medium) | Existing wrong/right/resume flow plus drag/Step/cancel |
| Cross-subject build | `writing-directions-on-a-treasure-map` / `writing.cards-to-flag` | Resolver works by scene/check, not by `subject === coding` |
| Intentionally static listing | `coding-a-block-with-a-number` | Illustrative turtle may play its own supported code; `define square size` listing is not treated as executable |

For every interaction family, test easy/medium/hard and alternate draws through the compiled
resolver. Browser coverage should include narrow/wide viewports, transformed roll, Explore,
historical replay, hints during playback, sound-off, reduced motion, mid-play printing, leaving and
returning, and no extra persistence writes. Use focused representative browser cases rather than
running every variant in a browser.

PDF checks must assert that controls do not print, edited toy/playback state does not leak into
the paper, and page counts match static sheets. Keep canonical SVG separate from transient
playback state or restore it for print; hiding the buttons alone is insufficient.

Run the relevant interpreter, drawing, block-model, lesson, scene, sound and new controller tests;
then `npm run check`, the new coding E2E and existing build-answer E2E. Run build/budget tests with
no scratchpad directory present. Do not weaken boundary or first-view budgets to make the port pass.

## Lessons and medium interaction families

The build column counts distinct build items used in that lesson, not appearances. Items can be
shared between lessons, so this column is not summed to derive the unique-item count.

| Grade | Lesson id | Playback/toys to restore | Existing build items |
|---|---|---|---:|
| 1 | `coding-arrows-to-the-gem` | maze | 2 |
| 1 | `coding-following-instructions` | maze | 1 |
| 1 | `coding-one-step-at-a-time` | maze, stage, turtle | 0 |
| 1 | `coding-saying-it-in-order` | dance, maze | 2 |
| 1 | `coding-a-pattern-that-never-ends` | pixels | 0 |
| 1 | `coding-colour-by-code` | pixels | 0 |
| 1 | `coding-one-card-is-wrong` | maze, turtle | 1 |
| 1 | `coding-a-message-in-flashes` | No prototype interaction | 0 |
| 1 | `coding-when-the-flag-is-tapped` | stage | 0 |
| 2 | `coding-instructions-for-a-snack` | No prototype interaction | 0 |
| 2 | `coding-turning-as-well` | maze, turtle | 2 |
| 2 | `coding-doing-it-again` | maze, stage | 2 |
| 2 | `coding-a-dance-in-a-loop` | dance | 0 |
| 2 | `coding-a-tune-from-a-program` | tune | 0 |
| 2 | `coding-drawing-with-a-program` | turtle | 2 |
| 2 | `coding-finding-the-mistake` | maze, turtle | 1 |
| 2 | `coding-two-ways-to-start` | stage | 0 |
| 2 | `coding-lamps-that-count` | lamps | 0 |
| 3 | `coding-reading-someone-elses` | maze, tracetable | 1 |
| 3 | `coding-repeat-with-a-count` | maze, stage, turtle | 1 |
| 3 | `coding-a-picture-with-a-repeat` | pixels | 0 |
| 3 | `coding-square-rectangle-staircase` | turtle | 1 |
| 3 | `coding-a-program-that-decides` | fork | 0 |
| 3 | `coding-feeling-for-walls` | maze | 1 |
| 3 | `coding-fewest-lifts` | cups | 0 |
| 3 | `coding-sorting-cards` | sortcards | 0 |
| 3 | `thinking-in-words` | No prototype interaction | 0 |
| 4 | `coding-writing-for-someone-else` | turtle | 4 |
| 4 | `coding-a-repeat-inside-a-repeat` | turtle | 0 |
| 4 | `coding-debugging-puzzles` | dance, fork, maze, turtle | 2 |
| 4 | `coding-keep-going-until` | maze | 2 |
| 4 | `coding-a-number-that-changes` | variable | 1 |
| 4 | `coding-trace-it-in-a-table` | tracetable | 0 |
| 4 | `coding-a-sorting-network` | sortnet | 0 |
| 4 | `coding-a-block-of-your-own` | dance, maze | 0 |
| 4 | `coding-a-block-with-a-number` | turtle | 0 |

Three lessons have no prototype interaction to restore: messages in flashes, snack instructions
and thinking in words. Adding an animated lighthouse, an interpreter for recipe prose or logic
manipulatives is new feature work. Likewise, parameterised procedures are still a proposal:
the illustrated square in A block with a number does not mean its parameterised listing can run.

## Evidence and current limits

- Read the full prototype coding runner, lesson wiring and editor; compared the real program UI,
  scene/lesson integration, interpreter/drawing setup, camera input and sound dependencies.
- Compiled all 336 lessons successfully using root `compileLessons()`. Scanned each available
  level, primary questions, two alternate practice draws and standalone scenes. The CSV records
  source ids and primary medium locations; it does not count every possible verifier assignment.
- Ran existing interpreter, block UI model and school lesson suites together: **60 passed, one
  failed**. The failure is `school/__tests__/lessons.test.ts:773`, the guide-card pointing test:
  `pointOf(withScene)` returns `bus` where the test expects null. The coding assertions passed.
- The preceding repository audit also found database RLS migration guard and tutor-tool failures.
  Treat them as baseline issues to resolve before the final all-green gate, not evidence that this
  migration has already passed it.
- This turn produced a plan and inventory only. It did not execute browser parity, audio listening
  or PDF checks, and no app/curriculum/scratchpad implementation was changed.
