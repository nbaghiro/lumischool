# Games: current state and proposed app integration

Audited 23 September 2026 from the current source. This is an implementation proposal, not approval
to change game selection, learning requirements or progress policy. No game code was changed.

## Finding

The rules have already moved. `.scratchpad/src/play/` no longer exists; `school/games/` owns the
catalogue, mechanics, activities, action simulations, hand bindings, scenery, proof and attempt
summaries. `engine/motion/` owns reusable motion and physics, and `engine/ui/stage.ts` owns the
board/field renderers. The app does not yet expose a playable game screen.

The remaining migration is the browser player, product entry points, sound output and recording.
Copying the catalogue into another location would duplicate working code without completing it.
Backup copies in `.scratchpad/leftover/` are historical material, not additional live games.

## Actual playable catalogue

The executable `GAMES` catalogue has 17 entries and 83 levels: two puzzles, three hands-on games,
and twelve action games. Fifteen are listed (71 levels); two are deliberately unlisted (12 levels).
Names and counts below come from the code, not the older proposals in games.md.

| Stable ID | Current title | Runtime | Levels | Product role / recommendation |
|---|---|---|---:|---|
| spell | Spell the picture | Turn puzzle | 4 | Keep: sound-box spelling puzzle |
| rule | Find the rule | Turn puzzle with hand controls | 6 | Keep: experiment with inputs and identify a rule |
| jump | Rabbit crossing | Action | 6 | Keep: aim successive hops across numbered stones |
| straight | Row to the jetty | Action | 6 | Keep: rowing rhythm, distance and stopping |
| shunt | Shunting yard | Action over shunt rules | 6 | Keep: engine, hooks, lift and ordering puzzle |
| pour | Measure it out | Hands-on turn | 6 | Keep: jug measurement puzzle |
| race | Take the corner | Hands-on turn | 4 | Keep existing game; proposed pull-the-car redesign is separate |
| shut | Shut the box | Hands-on turn | 5 | Keep: dice and number combinations; cup/throw redesign is separate |
| sling | Slingshot | Action | 2 | Keep: aim and topple targets with physics |
| weigh | See-saw | Action | 6 | Already hidden; recommend lesson activity, not general picker |
| pay | Penny shove | Action | 6 | Keep: slide coins to make an amount, including collisions |
| share | Cut the cake | Action | 6 | Already hidden; recommend lesson activity, not general picker |
| snake | Bead string | Action | 2 | Preserve current version; stronger redesign remains undecided |
| road | The road | Action | 2 | Preserve current version; delivery-round proposal is not implemented |
| herd | Rafts | Action | 6 | Keep: launch sheep, balance rafts and form groups |
| fish | Gone fishing | Action | 6 | Keep: casting, fish selection and quantities; docs also call it Cast |
| plane | Paper plane | Action | 4 | Keep as standalone game; distinct from controlling flight on the world map |

`activities.ts` separately holds ten authored activities with 37 parameter versions across nine
classic mechanic kinds. Shut-the-box adds its own mechanic/activity configuration. These are not
another ten standalone games. `levelOf()` maps activity versions to the current catalogue, including
replacement action games. Existing tests verify every listed activity version resolves.

Stable IDs matter: `jump` now opens Rabbit crossing, `pay` Penny shove, and `herd` Rafts. Migration
must preserve those mappings even if route names or display titles change.

## What is genuinely reusable

### Turn rules and activities

`school/games/games.ts` separates `Mechanic<V,S,M>` from `Activity<V>`. A mechanic declares accepted
parameters, initial state, legal moves, a pure state transition, win condition, state key, verbal
descriptions, board parts and move buttons. Activity versions provide parameters, grade bands,
skills and a paper counterpart. `bind()` presents them as a common `Round`.

The prover explores the finite position graph and checks declared solution, branching, recovery
and luck/patience constraints. It also supplies distance-to-win and a suggested next move. This is
substantial reusable machinery, not a separate handcrafted player for each puzzle.

`hands.ts` and `pieces.ts` handle free drags, rail/path drags, aiming and target acceptance. The
hand bindings choose legal move indices from the same round that button controls use. Tests verify
that physical controls neither invent illegal moves nor omit moves the mechanic offers.

Changing a parameter set is cheap; changing the picture is not always data-only. Several mechanics
have fixed `contract.draws` and empty art slots. For example, `jump` always draws a number line,
`pour` draws jugs, and `shunt` draws the siding. Existing slots in other mechanics cover particular
props or landmarks. A future thermometer version of a number-line game needs an explicit drawing
adapter and review. Do not promise arbitrary reskins or generated games from the current contract.

### Action games

`game.ts` supplies the common action contract: levels, start, fixed-rate step, scene frame, spoken
state, win state, controls, optional undo/pull controls, tuning and reduced-motion stepping.

The shared engine already supplies input pads, fixed loops, gestures, geometry, camera following,
flight, gliding, rowing strokes, steering, springs, timelines, seeded spawning, visual bursts and
Planck-backed bodies. Rabbit crossing, fishing and rafts share projectile functions; slingshot,
penny shove and rafts share physics bodies. The shunting yard additionally reuses the discrete
shunt mechanic underneath its physical presentation.

Their rules remain game-specific. Raft loading, coin collisions and hooking carriages are not
parameter variants of one universal mechanic. Action games are checked through invariants and
seeded replay tests, not exhaustively proved like the turn graph. Both approaches should remain.

### Rendering and sharing between apps

Games return art IDs, parameters, scenes and frames. They do not import scratchpad drawings or DOM
code. Root Stage and Field already render these outputs. A shared player in `engine/ui/` can serve
the child's game, a parent preview and internal review with different host callbacks.

Sharing a link to a game/level is straightforward. Sharing a child's saved replay is a different
feature requiring access control. The prototype's replay URL is a turn-game move-index sequence;
it is not a universal action replay or a durable, versioned replay format. There is no multiplayer
system in this implementation.

## What still lives in scratchpad

| File / area | Behavior to retain or replace |
|---|---|
| `src/pages/play.ts` (395 lines) | Picker, level selection, shell, guide cues, sound mapping, resizing, route parsing, runtime switching and developer review |
| `src/pages/play-turn.ts` (589 lines) | Turn runtime, undo/history, hinting, tray/keyboard controls, hands, move/gesture traces, proof and replay |
| `src/pages/play-action.ts` (313 lines) | Fixed-step browser loop, keyboard/touch input, action controls, text state, reduced-motion stepping and cleanup |
| `src/styles/play.css` (358 lines), `play.html` | Full-field layout, accessible controls, responsive player and picker |
| `src/pages/play-inventory.ts` (85 lines) | Developer descriptions; transfer useful review information, not a second hand-maintained production catalogue |
| `src/sound/switch.ts`, `web.ts`, supporting sounder/voice/types | Opt-in device audio and browser synthesis; root `engine/sound/` currently supplies music data/logic, not this browser output layer |
| `src/world/view.ts:extraFor()` | Recommends an activity beside a day using paper-item match, then skill overlap and grade compatibility |
| World-page/canvas and grown-up explore/child pages | Links and embedded previews of games; replace with real app entry points |

The prototype builds one eager map of the entire art shelf and imports the complete game catalogue.
The production player should lazy-load its runtime, selected game and required art so a child opening
ordinary lessons does not load all game simulations and physics. Avoid a second complete catalogue;
separate lightweight metadata from implementation loading within the existing game module.

The shell uses global element lookup and global state. Migrate to a component-owned host with
explicit refs and lifecycle cleanup, not an iframe or a renamed play.html. Keep sound, guide and
host navigation behind callbacks; proof/tuning/frame statistics belong to internal review.

## Recording and lesson integration gaps

The turn player creates an in-memory attempt and updates it while playing. It does not submit it.
Leaving marks some attempts as `gave up` in memory and then discards them. The action player has
no equivalent persisted attempt summary. These are not currently recorded child learning sessions.

`engine/answer.ts` already declares and validates `round-played`, including a round ID, activity
hash, move records, outcome and capped flag; family access classifies it as work. This is useful
plumbing, but not a complete feature. There is no game producer wired to the kid queue, no compiled
activity identity/version delivery, and no game-specific parent summary in the record fold.

Proposed semantics: one bounded summary per round, through the existing child queue and event
store, with a stable round ID and content/rules identity. A retry must not add another round. Label
navigation away as unfinished rather than implying failure. Do not infer mastery from a game win
or from move speed. Do not record pointer frames as ordinary progress events.

For turn games, adapt the existing event after reviewing its outcome vocabulary and immutable
activity identity. For action games, define a small discriminated result appropriate to their
invariants; do not manufacture distance-to-win or a turn move log. Exact schema belongs in the
recording implementation slice. Parent preview must never write to a child's record.

The scratchpad recommendation uses `WorkspaceCorpus`, which must be replaced by the real pack
and lesson/skill metadata. Its first-match choice is a starting point, not a finished recommendation
policy: choose a compatible level, avoid always suggesting version zero, and preserve all activities
when multiple games share a mechanic. Initial launch can use reviewed explicit lesson links.

## Proposed execution order

1. **Set product scope and routes.** Keep the 15 listed games; retain See-saw and Cut the cake for
   lessons/parent previews. Use a child-accessible Games library and optional game cards beside
   relevant lessons, without completion locks. Keep world mini-games as a separate decision. Proposed
   paths: `/kids/games`, `/kids/games/<id>?level=1` and a parent preview route. Update the actual kids
   state machine, server page recognition and routing; a new URL alone cannot bypass child selection.
2. **Build the shared player with three pilots.** Port turn and action browser adapters into
   `engine/ui/` under a Solid host. Pilot Find the rule (puzzle and physical controls), Measure it out
   (drag/gesture binding) and Rabbit crossing (action). Share opt-in audio with the music migration.
   Verify keyboard, touch, text output, reduced motion, resizing, exit, restart and listener/loop cleanup.
3. **Expose the full catalogue.** Lazy-load all retained games and art, add grade-aware level choices,
   and verify the remaining control families: coin physics, dice, continuous steering, rowing, lift
   controls and plane flight. Preserve hidden-game deep links and all activity-version mappings.
   Review the picker on a real phone/tablet as well as in browser automation.
4. **Connect sessions and teaching.** Implement versioned identities, bounded turn/action summaries,
   queue delivery and deduplication; add parent review. Add reviewed lesson recommendations and a
   reliable return to the lesson. Prove parent preview has no recording side effects. Keep optional
   practice separate from completing a required lesson.
5. **Move review tools and retire the prototype player.** Put retained proof, tuning and replay
   inspection in the studio or local review tooling. Replace every live play.html link. Remove the
   migrated scratchpad player files and only the now-unreferenced helpers; audio files are shared
   with music, and world-try.ts serves other games, so neither is wholesale deletion material.

Each slice should leave a working reviewable app surface. Redesigns mentioned in games.md, broader
skinning adapters, activity notation and user-authored games are separate extensions, not prerequisites
for bringing the current games into the app.

## Adjacent games requiring a separate disposition

Join-the-dots already has root rules in `school/games/dots.ts`, but its interaction is in the
scratchpad world's `world-try.ts`. Spot-the-difference and treasure-grid/find-the-square additionally
retain rules in `src/world/spot.ts` and `squares.ts`. They are not in the 17-game catalogue. Decide
whether they live on the map or in the Games library before retiring that page.

Map-controlled flight and the four-level Paper plane game are distinct experiences despite shared
engine primitives. Integrating one does not establish parity for the other.

## Evidence and acceptance

Ran `node --import ./tools/scripts/resolve.ts --test school/games/__tests__/*.test.ts`: **153 passed,
zero failed or skipped**. This audit checked source contracts, catalogue coverage and existing logic
tests; it did not replay every level through a browser or establish touch-device usability.

Migration acceptance: all 83 retained levels reachable in their agreed contexts; every activity
version resolves; keyboard and physical controls preserve legal moves; action invariants and seeded
tests pass; sound opt-in and reduced motion work; leaving or switching a child stops old input/audio;
parent preview records nothing; offline retries do not duplicate summaries; no production import,
iframe, asset or navigation link reaches scratchpad. Whole-folder deletion still requires the other
retirement decisions, not just the game player.
