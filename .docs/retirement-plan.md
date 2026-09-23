# Prototype retirement decisions and execution plan

Working plan, 22 September 2026. Product decisions are pending unless explicitly recorded below.
This document coordinates the [inventory](scratchpad-audit.md) and
[coding implementation plan](coding-migration.md); it does not approve every prototype feature.

23 September update: [the current product-gap audit](scratchpad-product-gaps.md) supersedes the
older missing-feature classifications below where work has since moved (Games, flight, letters
and much of the calendar). Pending product choices remain pending; this is not deletion approval.

## End state

The `.scratchpad/` directory is removed. Every retained capability runs through a real app or
maintained root tool. App code, scripts, configuration and current development instructions have
no dependency on prototype pages, paths, assets, servers or browser storage.

Each inventory entry must have a disposition: implemented and verified, already replaced and
verified, preserved as a maintained tool/document/data file, or explicitly retired. An unresolved
entry blocks final deletion. A historical document may describe the migration, but must not
instruct readers to run or open a deleted file.

## Decisions with the owner

The earlier request to continue coding migration establishes its scope. The other rows below
are proposals for discussion, not approved implementation requirements.

| ID | Capability to decide | Status / proposed destination |
|---|---|---|
| C1 | Coding examples, playback, predictions, stage events, algorithm toys, build controls and sound | Previously requested. Finish shared lesson UI; resolver work alone does not complete this. Use the 256-item inventory and include teaching examples and the cross-subject writing build. |
| M1 | Playable piano, glockenspiel, ukulele and guitar; synthesis and transport | Pending. Recommend shared lesson controls plus standalone music activities. Review instrument details before implementation. |
| M2 | Guided songs, rhythm echo, beat keeping and composition | Pending with M1. Preserve retained song source/licence information. Decide saving and progress separately from simply making a practice page. |
| P1 | Digital painting lessons | Pending. Recommend preserving the easel and connecting real lesson submission, replay and grown-up review. |
| P2 | Free painting, tools, gallery and saved artwork | Pending. Recommend a child-accessible painting space; choose storage and gallery behavior during its detailed review. |
| G1 | Playable game sessions and selection | Audited in [games-migration.md](games-migration.md): 17 games, 83 levels, root rules already moved; player, sound, entry points and recording remain. Proposed library of 15 listed games, with See-saw and Cut the cake kept for lessons. Product decisions pending. |
| A1 | Shelf browser, settings/animation inspection and notation editor | Pending. Recommend maintained internal authoring tools. These need not be family-facing features. |
| A2 | Draw/stroke/anchor editor | Pending. Review whether this remains the chosen art-authoring workflow; preserve authored strokes either way. |
| A3 | Make: visual question editing, repairs, try/print, save and give | Pending. Decide parent-facing authoring versus internal-only tooling before building a studio surface. |
| L1 | Three-level comparison and sampling | Pending. Recommend internal review tooling using the root baseline. Preserve the 74 owner review notes independently. |
| H1 | Assistant material selection and proposal workflows | Pending. Review workflows individually. Scripted prototype responses are not a production assistant. Keep existing authored child guidance distinct. |
| W1 | Working ink/highlighter attached to a day's sheet | Pending. Decide usefulness, persistence and print behavior. |
| W2 | Player-controlled map flight | Pending. Decorative flight already in the app does not replace this activity. |
| W3 | Spot-the-difference and treasure-grid activities | Pending. Decide each separately and choose map or games-library placement. |
| W4 | Printable country poster | Pending. Recommend keeping if family map printing remains intended; preserve paper-size and pagination guarantees. |
| W5 | Future-world concept previews | Pending. Compare with migrated definitions; retain selected design work without requiring a prototype gallery. |
| F1 | Weekly family letter | Approved and implemented at `/letters`, with opt-in private-link or detailed weekly email, shared HTML/text designs and durable Resend delivery. See [weekly-letter.md](weekly-letter.md). Production activation and real-inbox rendering review remain separate; the new implementation has no scratchpad dependency. |
| F2 | Preview of proposed plan changes | Pending. Compare individually with current plan/calendar behavior before deciding what is missing. |
| R1 | Alternate parent/site/auth/brand layouts, galleries and iframe launcher | Pending. Recommend retiring superseded presentations after extracting selected assets and unresolved decisions. |
| T1 | Print, art, privacy, visual comparison and usage-analysis tools | Technical review needed. Preserve unique checks in root tools; replace prototype URLs with real routes. |
| D1 | Browser-saved drafts, paintings and strokes | Inspect/export before retirement. Source migration cannot read another origin's local storage automatically. |
| D2 | Leftover briefs, proposals, review notes, screenshots and baselines | Review needed. Folder counts do not establish redundancy. Extract unique work and record a disposition for each work directory. |
| D3 | Generated brand/site outputs, dist, dependencies and duplicate configuration | Remove when retained source/assets have verified replacements and all consumers are gone. |

Discussion rounds: music/painting/games first; authoring/review tools second; world/family/assistant
extras third; then review evidence and retirements. Split any row when its parts warrant different
decisions. Record the owner's answer here rather than treating recommendations as consent.

## Execution sequence

1. Complete the file manifest, including all 32 HTML entry points, source, tests, scripts, assets
   and each leftover work directory. Map every entry to the decisions above; inspect unmatched
   files and unique content inside grouped directories. Exclude reproducible caches only after
   verifying their inputs are preserved. Establish recoverable copies before deletion: this
   checkout currently has no tracked files, so Git history is not a backup.
2. Preserve owner notes, retained authored data, selected evidence and browser-local work.
   Give retained material a maintained destination; an archive outside the repo can preserve
   rejected explorations without leaving an app dependency.
3. Finish the already-requested coding migration in its documented slices: resolution, player,
   predictions/events, toys, build controls, sound and real-app verification. Shared sound work
   can support the later music slice without requiring a standalone music feature first.
4. Implement approved music, painting and games as separate complete flows. Each must have a real
   entry point, usable controls, appropriate answer/save behavior, accessibility and verification.
   Specify exact routes and module ownership after the product choices are made.
5. Implement approved authoring tools. Add studio routing and boundary declarations if required;
   keep notation/compiler code out of child bundles. Migrate retained review data and checks.
6. Implement approved world, family and assistant extras in independently reviewable slices.
7. Move unique test/tool guarantees alongside each owning feature. Delete superseded prototype
   consumers only after their replacements are verified; do not port duplicate implementations.
8. Remove remaining compatibility and references, then verify without the directory before final
   deletion. Reconcile the manifest so no pending or unexplained entry remains.

## Reference cleanup

Database seeds and their worker have been removed; the old audit's subprocess dependency is no longer present. Remaining cleanup includes:

- Remove the local 5173 CORS exception from `server/http.ts`, update origin tests and `.env.example`,
  and change the synthetic browser-test origin to the real app origin.
- Remove the leftover watch exclusion in `vite.config.ts` and obsolete ignore entries in Git,
  formatter and lint configuration once the directory is gone.
- Replace scratchpad-specific negative import fixtures and bundle checks with equivalent general
  checks against code outside permitted root modules. Keep boundary protection while removing
  obsolete path names. Verify the replacement guard with planted invalid imports.
- Remove stale provenance comments and prototype-tool references from engine, school and tools.
- Update `CLAUDE.md`, local setup, architecture and domain documentation to real destinations;
  remove instructions to create prototype pages. Resolve `.docs/leftover/` links individually.
- Review literal paths, aliases, URLs, HTML links, globs, file reads, subprocesses and worker URLs.
  Historical audit mentions are not runtime dependencies; ensure they cannot be mistaken for
  current operating instructions.

## Acceptance before deletion

- Every approved capability has root implementation evidence and real-app acceptance results.
  Every retired capability has a recorded owner decision; unique data has a disposition.
- Root checks pass at the final revision, including type, lint, formatting, boundary, build and
  relevant unit checks. Report actual failures rather than reusing earlier audit results.
- Real-app browser checks cover retained interactions, keyboard/touch, reduced motion, sound
  opt-in and stopping, lesson answers, save/reload and grown-up review where relevant.
- Retained print workflows pass actual PDF checks; visual baselines and art rules use root tools.
- A source copy without the directory installs/builds and runs the relevant checks, seed workflow
  and app journeys. Previous builds reusing node_modules are useful evidence but not a fresh install.
- Final source/config/tooling scan finds no obsolete prototype references. Current docs have no
  operational links to removed pages. Only then delete the directory and repeat the final scan.
