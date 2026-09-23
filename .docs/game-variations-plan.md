# Generated game challenges and progression

Status: implementation plan, 23 September 2026. No generation or progression phases implemented by
this document. The owner requested plans before assigning parallel execution agents. This is the
execution specification for extending the existing production Games player, not migrating it again.
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

The parent/coordinator is the sole writer for shared integration files: `engine/answer.ts`, API/event
validation, server sync/API and DB migrations, `boundaries.ts`, app routing/navigation, child identity
adapters, and shared doc indexes. Agents send exact additive patches/schema proposals to that owner.
Reserve migration names centrally. No parallel edits to shared files, broad formatting or reverting
other work. Games can progress using an injected recording adapter while integration is pending.

When execution is authorized, the games and painting agents may run concurrently within their owned
files. Serialize expensive checks according to current repository guidance. The coordinator merges
the shared contracts, then runs combined integration checks. An agent is done only when its full
authorized phases meet their gates or a concrete dependency is recorded, not merely when the UI works.

## Execution record

All phases G0–G6 pending. Harbour Cargo model regression suite: five tests passed on 23 September,
including direct dragging/delivery and cancellation recovery; this is not browser sign-off.
Update this section with changed files, checks, known limits and next phase after each delivery.
