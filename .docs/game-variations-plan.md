# Generated game challenges and progression

Status: approved and implemented in the production player, 23 September 2026; release verification
is recorded below. This extends the existing Games player rather than migrating it again.
Companion: [painting-integration-plan.md](painting-integration-plan.md), especially shared ownership.

## Product decisions

- Keep named phases for learning mechanics; generate fresh arrangements within each phase.
- A new arrangement is not automatically harder. Children may stay in a phase indefinitely.
- Keep the current compact game chrome, accessible controls, pause menu and shared dropdown.
- After a win, show one primary **Play another** action and secondary **Try again**. Prepare the
  next challenge ahead of time, but do not start it without the child's action.
- Try again retains the exact challenge; Play another chooses a new validated arrangement.
- Advancement is an optional recommendation after evidence across different challenges. Earlier
  phases remain selectable. No timer pressure, lives, streak penalties or compulsory escalation.
- Record progress for an explicitly selected child. Parent/guest experimentation remains unassigned.
- Treat "infinite" as a large, varied, validated supply, not a claim of mathematical infinity.

## Verified starting points

| Code | Present behavior / gap |
|---|---|
| `school/games/catalogue.ts` | 19 listed games at plan time, including cargo and marble workshops; recount before implementation |
| `school/games/game.ts` | Fixed level lists with titles and grade bands; action `start(level, seed?)` exists |
| `engine/ui/game-action.ts` | Starts with `game.start(level)`, without a challenge seed/configuration |
| `engine/ui/game-turn.ts` | Turn runtime keeps an attempt and move history |
| `school/games/prove.ts` | Explores discrete position graphs, solution distances, dead ends and proof bounds |
| `school/games/log.ts`, `engine/answer.ts` | Attempt summaries and `round-played` event exist; not a complete child-linked Games progression flow |
| `engine/motion/verify.ts` | Replay validation for continuous simulations |
| `school/games/__tests__/workshops.test.ts` | Winning replays for every authored workshop level |
| `apps/home/games.tsx` | Mounts the shared library without a selected-child recording adapter |

Recent control work: Slingshot reloads with a bounded settling pause and ready feedback. Harbour
Cargo now supports direct crate dragging, shared primary-action delivery when balanced, and clearer
load/balance feedback. Keep these behaviors under regression coverage while changing challenge setup.

Older inventory documents describe earlier migration states; source code wins where they disagree.
Read `CLAUDE.md`, `structure.md`, `engine.md`, `activities.md` and current checks guidance before editing.

## Shared contracts

Introduce a typed challenge descriptor alongside the existing game contract. Proposed fields:

- `id`, `game`, stable `phaseId`, seed and generator version.
- Rules/physics version, concrete serializable configuration and content hash.
- Difficulty assessment version, band and named dimensions.
- Validation method/version and result, including an internal solution witness where appropriate.

Use explicit types and validators; do not store arbitrary executable objects or closures. A seed
alone cannot preserve a challenge after a generator or physics change. Save concrete configuration;
retain version compatibility or label an old replay unsupported rather than silently replaying it
under different rules. Do not promise bit-identical physics across JavaScript runtimes.

Each game supplies generation, configuration validation, assessment and opening functions. Shared
orchestration owns seed choice, bounded retries, caching, recent-layout deduplication, fallback,
challenge identity and attempt lifecycle. Turn games still construct `Round`; action games open a
state from validated configuration. Preserve existing `?g=...&v=...` links through authored adapters.

Keep generic seed/validation utilities in `engine/motion/`; game recipes, phase definitions and
progression policy in `school/games/`; DOM/player integration in `engine/ui/`. Start with one module
per concept, not a framework of empty directories. Production must not import `.scratchpad`.

## Generation and validation

Pipeline: select phase and target band → generate → validate → assess → accept or retry → fallback.
Fix candidate counts and computation budgets. Expensive simulation/search runs in a worker or an
offline build pool, not on the UI thread. Preload at most a small bounded next-challenge pool.
Fallbacks must themselves carry versions, configuration and validation evidence.

Separate gameplay and decoration seeds. Hash meaningful configuration to avoid superficial
"different" rounds. Bound the recent-history window; allow repeats when a finite content pool is
exhausted rather than inventing invalid material.

| Family | Construction and gate |
|---|---|
| Discrete puzzles: rules, jugs, yard, cornering | Construct from legal states or a solution; run existing proof contract and reject capped/unknown results |
| Spelling | Sample from authored word/picture/phoneme data; validate sound segmentation and distractors; never invent spelling from random letters |
| Dice games | Separate layout validity and fair seeded randomness from an unwarranted promise that every roll is winnable |
| Rabbit/rowing/road/plane/fishing | Generate targets and spacing within control reach; validate transitions, recovery and reaction room with actual input limits |
| Slingshot | Compose stable towers/platforms/walls; replay complete successful shot sequences on the evolving damaged world |
| Marble workshop | Start from a verified working construction and perturb editable pieces; prove restoration uses only available move/rotate controls |
| Cargo | Generate loads with a physically realizable balanced packing; verify pickup, placement, settling and delivery using player controls |
| Other action games | Define explicit per-game invariants and a witness before enabling generation; authored levels remain available meanwhile |

Slingshot pilot stays within the two existing phases first: Three stars and Over the wall. Additional
chain-reaction phases are later content, not a prerequisite. Reject unstable starting structures,
unreachable stars, off-screen targets and sequences relying on unavailable controls. Validate all
stars, not just the first hit. Test nearby angles/powers around successful inputs: a single fragile
success is insufficient evidence of a comfortable introductory challenge. Retest witnesses through
the actual automatic reload transition. Sampled physics validation is evidence, not exhaustive proof.

## Difficulty and progression

Store separate dimensions for reasoning, motor precision and curriculum content. Derive a per-game
band from those dimensions; do not compare a Slingshot number directly with a spelling number.
Examples: distance, obstruction, aiming tolerance and independent targets; or shortest solution,
branching and planning depth. Grade bands remain content suitability, not measurements of ability.

Initial policy: begin with the chosen phase's introductory band; recommend advancement only after
three completed distinct challenges among the last five eligible attempts, with game-specific
assistance/effort checks. This is a configurable starting heuristic requiring review, not validated
educational measurement. Changing one major difficulty dimension at a time makes progression legible.
Let the child choose more of the same or an easier challenge. Do not silently demote after leaving,
undoing, taking time, using reduced motion, or replaying a favorite arrangement.

Keep generated difficulty and observed play separate. Calibration later may improve assessment, but
must not rewrite historical attempt ratings. Report observations, not unsupported mastery claims.

## Attempts and persistence

Record child, challenge, unique attempt id, start/completion, outcome, partial objectives, moves or
shots, retries, assistance, active time excluding pauses, and relevant input/accessibility context.
Keep unfinished/interrupted attempts distinct from failures. Retries reuse challenge id with a new
attempt id. Another layout has a new challenge id. Emit terminal outcomes once, including when the
runtime redraws or a win remains on screen.

Reuse the authenticated event/sync path; do not write directly to storage from game rules. Extend
`round-played` only if its semantics fit action games; otherwise add a narrowly typed event through
the integration owner. Do not manufacture a fake discrete move-distance log for physics games.
Record semantic actions and bounded summaries; full physics input replay is optional, versioned and
bounded. Never upload every render frame. Specify truncation visibly in the stored record.

Use a locally recoverable outbox and idempotent server writes. Test reload, offline retries,
duplicate uploads and child switching. Server authorization determines ownership; guest play must
never be retroactively assigned without an explicit family action. Projections can summarize phase
progress and recent challenges without duplicating the event source of truth.

## Execution phases and completion gates

| Phase | Deliverable | Gate |
|---|---|---|
| G0 | Recount catalogue; map each game's start, win, reset, record and verification paths; finalize contracts | Inventory includes unsupported generators explicitly; agreed shared-file ownership |
| G1 | Descriptor, authored adapters, seed pipeline, bounded validation/fallback and attempt lifecycle | Existing links and all authored game tests unchanged; invalid/unknown configurations rejected |
| G2 | Slingshot generator for both existing phases and next/retry UI | Stable, complete winning witnesses; perturbation checks; pointer/keyboard/reduced-motion regression; no lost star progress between shots |
| G3 | Jugs/Measure it out discrete pilot, adapting existing mechanic and proof bounds | Solvable varied configurations, uncapped proof, meaningful deduplication; same shared player contract as G2 |
| G4 | Child-owned recording, sync and simple phase recommendations | Guest isolation, cross-child isolation, offline/idempotency tests; exact retry and resumable selection |
| G5 | Expand generators across catalogue in bounded batches | Each game has its own parameter bounds, validator, difficulty assessment and fallback before enabled |
| G6 | Parent summaries, calibration review and docs | Factual records, load budgets preserved, release checklist and unsupported cases documented |

G4's event schema is designed in G1 even if UI progression lands later. Keep authored challenges as
the fallback throughout. Do not advertise all-game generation when only pilots have generators.

Validation: sweep a fixed reproducible seed corpus per phase, all boundary parameter combinations,
invalid configurations and validation-timeout paths. Log failing seed/configuration/version for
reproduction. Test generation determinism separately from simulation portability. Browser checks
cover narrow/wide screens, actual input devices, pause, restart, next, victory, route return and
absence of frame stalls. Run repository-required scoped checks and release gates; don't raise budgets.

## Parallel ownership and handoff

Games agent owns `school/games/*`, games tests, `engine/ui/game-*`, `engine/ui/games.*`,
`apps/home/games.tsx`, dedicated game e2e files and this plan. Generic motion changes require an
explicit bounded design and their own tests.

During approved execution the parent delegated integration ownership to the Games coordinator, who
assigned one exclusive persistence agent for shared integration files: `engine/answer.ts`, API/event
validation, server sync/API and DB migrations, `boundaries.ts`, app routing/navigation, child identity
adapters, and shared doc indexes. Agents send exact additive patches/schema proposals to that owner.
Reserve migration names centrally. No parallel edits to shared files, broad formatting or reverting
other work. Games can progress using an injected recording adapter while integration is pending.

When execution is authorized, the games and painting agents may run concurrently within their owned
files. Serialize expensive checks according to current repository guidance. The coordinator merges
the shared contracts, then runs combined integration checks. An agent is done only when its full
authorized phases meet their gates or a concrete dependency is recorded, not merely when the UI works.

## Execution record

G0–G6 implementation is complete, including all 19 catalogue games, shared player flow, persistence
and parent summaries. Browser release verification is recorded separately below.

- G0/G1: all 19 games retain authored links and adapters; typed descriptors include rules,
  generator and difficulty versions, seed, concrete data and stable configuration fingerprint.
  Authored action descriptors also fingerprint deterministic initial data, so changed geometry
  cannot silently reopen under the same title. Expensive validation happens in tests/offline pools.
- G2/G3: Slingshot supplies three arrangements in each phase with complete multi-shot witnesses
  and nearby-aim checks. Measure it out supplies sixteen arrangements per phase with uncapped
  full-graph proofs and legal winning paths.
- G4: parent-only child selection, unassigned Parent practice, scoped reload selection, terminal
  attempts, exact retries, optional suggestions, durable bounded offline queue, family/user-bound
  sync and idempotent uploads. No database schema migration is needed; events use the existing table.
- G5: bounded certified pools per game, with per-family configuration validation and winning
  evidence; see inventory below. Old authored phases remain selectable.
- G6: factual parent completion counts and distinct arrangements, frozen provisional task ratings,
  current-version-only recommendations and this execution record. Calibration remains a future
  product exercise; no ability or mastery claims are made.

Limits: these are finite certified pools, not unlimited distinct layouts. Repeats are permitted
once recent arrangements exhaust a pool. Physics replay evidence is sampled, not exhaustive proof.
Shut the box preserves fair dice; the existence of a winning seeded path does not make every choice
or every future roll winnable. Word pools remain authored. Child-facing access/unlocks are unchanged.
Attempts count discrete input gestures rather than every simulation frame; control-gesture counts
must not be presented as shot counts. Resuming restores the challenge, not an interrupted world's
mid-flight state. Progress recommendations are advisory parent-QA data, not authorization decisions.
The server validates ownership and bounded wire structure; game-specific witness certification
is a build/test responsibility rather than a server-side replay of client-reported results.


### Certified inventory

Counts are concrete arrangements across all existing named phases, excluding authored adapters.
A permutation/target change is included only where its resulting complete game was checked.

| Game | Arrangements | Gate |
|---|---:|---|
| Harbour cargo | 15 | Full pickup, placement, settling and delivery controls |
| Marble workshop | 12 | Editable ramp construction and complete ball route |
| Spell the picture | 12 | Authored picture/phoneme data and full position proof |
| Find the rule | 60 | Full position proof and information audit |
| Rabbit crossing | 28 | Route graph, complete keyboard and pointer hop witnesses |
| Row to the jetty | 18 | Legal timed strokes, glide and gentle arrival |
| Shunting yard | 19 | Full graph plus complete coupling, dragging and lift controls |
| Measure it out | 96 | Full uncapped position proof and legal solution |
| Take the corner | 16 | Reflected tracks with full uncapped position proof |
| Shut the box | 40 | Full seeded position graph and fair-dice audit |
| Slingshot | 6 | Complete multi-shot replay, automatic reload, 162 nearby-input samples |
| See-saw | 18 | Complete bag-placement controls |
| Penny shove | 18 | Complete legal coin throws and target accounting |
| Cut the cake | 18 | Complete cuts through available controls |
| Bead string | 6 | Complete legal direction-input routes |
| The road | 6 | Acceleration, braking and lane-control completion |
| Rafts | 18 | Complete pointer jumps and all target loads |
| Gone fishing | 18 | Complete casts, reels and target weight |
| Paper plane | 12 | Complete climb/dive course, all hoops on the first lap |
| **Total** | **436** | **19 of 19 listed games** |

Action feedback-controller witnesses establish reachability at the actual simulation rate. They do
not measure a child's reaction time; road/plane/rowing still need the owner's comfort and difficulty
review. The three-per-phase pools intentionally stay close to familiar authored mechanics. New
content should extend these recipe pools and their witness tests before increasing variety claims.

### Verification and QA handoff

- `LUMISCHOOL_REQUIRE_DB=1 npm run check`: exit 0, 1,240 tests passed, no skips; database, server,
  engine, school, tools and app suites, production build and child-route exclusion passed.
- Follow-up lint and formatting checks passed after late action-adapter integration.
- Browser checks (24 September): 28 existing Games regressions passed on desktop and phone;
  both new persistence scenarios passed after correcting their accessible-name selectors. Covered
  explicit child selection, offline recovery, one upload per attempt, exact retry, pointer attribution,
  practice isolation, new arrangement, exact descriptor reload and browser-history return.
- Final typecheck, lint, format, suppression guard and boundaries passed after final adapter edits.

Manual QA: open Games directly with no selector or report above the library. Play a phase, compare
**Try again** with **Play another**, and reload a generated arrangement. Pause still offers manual
phase selection and **New arrangement**. Parent play remains unassigned even if an old child
selection is stored on the device. Children do not receive new Games access from this work.

### Product revision, 24 September: keep reporting out of Games

The owner requested removal of the Playing as selector and all report/progress UI. This supersedes
those visible portions of G4/G6 above. `apps/home/games.tsx` now mounts parent practice without an
attempt owner, event fetching or reporting imports. Its storage namespace is always `practice`;
cached child selection is never read. Already-owned offline attempts still flush using their
original family/user/child binding. The shared player retains the injectable `onAttempt` seam for
later explicitly bound child access. The event schema, outbox, integration tests and progress model
remain intact, but no completion summaries or progression recommendations are displayed anywhere.
Play another, Try again and manual phase selection remain.

Browser coverage now seeds an explicitly owned past offline attempt as a test fixture, verifies its
upload, and then proves parent gameplay cannot add child records despite a stale child-selection
key. It also checks absence of the selector, reports and recommendation button, exact retry,
generated reload and history return. Existing server integration tests retain authorization and
idempotency coverage. No hidden production selector or test-only production UI was introduced.

Revision verification: typecheck, lint and diff whitespace check passed; both revised desktop and
phone browser cases passed (11.2 seconds).

### Product revision, 24 September: immediate entry and optional challenge choice

Cards now open the arena immediately. Each game's last phase and concrete arrangement are remembered;
explicit `v` links retain precedence. Action simulations wait for genuine gameplay input, including
on retry/new arrangement/phase change. Merely opening or dismissing help does not start them. The
opening card's Enter event is excluded from the new arena, and focus moves to the play surface.
First-input gating belongs to the shared action runtime, not individual game rules. Attempt active
time starts with semantic gameplay input. The optional pause menu replaces the numbered dropdown
with a two-column collection of named challenge cards; no curriculum labels were invented. Help,
sound and accessibility remain on demand. Reports and automatic advancement remain absent.

Immediate-entry verification: all 43 applicable desktop/phone browser cases passed (the desktop
project skips the touch-only case). The first run found two old tests reading field bounds before
render readiness; after adding that wait, the mouse/phase-card rerun passed all four cases. Full
typecheck, scoped lint, formatting and diff whitespace checks passed. Whole-repository lint also
reported an unrelated `tools/scripts/map-profile.ts:90` console statement; that file was untouched.

### Garden games and material play, 24 September

Garden mini-golf adds three phases with three certified courses each: an open putting green, garden walls and sand. Pull-back aiming covers every direction; keyboard arrows adjust aim/power and Enter or space putts. A rolling ball must settle before another putt, preserving its position. Slow cup capture, rounded wall contacts and sampled surface friction live in the shared rolling core. Complete legal-input witnesses cover all nine courses, with bank-shot, sand, keyboard and reduced-motion checks.

Pocket rally adds three phases with three circuit arrangements each. Steering, acceleration, braking and lateral grip live in the shared vehicle core. The game uses ordered forward checkpoints, no forced timer, grass slowdown and recovery to the last earned checkpoint. Its finite course configurations retain exact retry and same-phase Play another.

Rally also supports reversing: hold Down or the compact Brake / reverse control to stop, then back
up; holding a pointer behind the car does the same. Signed throttle and a separate reverse-speed
limit live in the reusable vehicle core, while braking slows either direction towards rest. Steering
turns naturally in reverse. Backward checkpoint crossings still cannot advance a lap.

These additions preserve unassigned parent practice and the future recording seam; they add no child access, reports or automatic progression. The bounded pools support repeated play, not a claim of infinitely distinct courses.

The catalogue now has 21 games. The additions contribute nine golf arrangements, nine rally arrangements and three rolling-stone Slingshot arrangements: 457 certified arrangements in total. Existing six Slingshot arrangements retain their material values and witnesses, so the existing rules version remains valid. The new Slingshot slice excludes breakage, fragments and ropes.

Verification for the garden/material additions: all 405 school tests passed; all 533 engine tests passed across the initial run and corrected artwork-guard rerun; 55 database, 142 server and 32 app tests passed. App and child-build checks passed. Desktop/phone Games regressions plus golf passed 49 tests with one desktop skip for the touch-only case; Rally passed six and Slingshot six across its initial run and corrected desktop pointer-projection rerun. Actual phone touch completed golf and Rally. Scoped game lint, full typecheck, formatting and whitespace checks passed.

The combined repository check was not globally green: two unrelated map snapshot tooling assertions failed against concurrent map work, and an unrelated new `tools/e2e/world-entry-review.e2e.ts` file introduced global lint findings. Those files were left to their owner. The original three new drawing guard failures (sand bounds and description policy) were fixed, and the complete four-test artwork guard suite then passed.
