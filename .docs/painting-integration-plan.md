# Painting workspace, lessons and picture wall

Status: implementation plan, 23 September 2026. Production integration is not yet implemented.
The owner approved the prototype's direction and requested an execution plan before parallel work.
Companion: [game-variations-plan.md](game-variations-plan.md), including shared-file ownership.

## Product target

One shared painting workspace reached from lessons and free painting, with one private child-owned
picture collection reused as a wall, preview strip and journal artwork. The Painter's Hut is its
natural map home; an always-available child shortcut avoids requiring a particular assigned world.
Defer a new permanent grown-up Painting tab until those entries have been reviewed in the app.

Preserve the approved V2 design:

- One canvas; no separate Draw/Colour/Trace/Draw along tabs.
- Two-row compact dock: tools/context/size/undo above colours/mixing. Picture context belongs in a
  small thumbnail control in the first row, never a third row or a label overlapping the board.
- Materials reveals additional tools, colouring pictures, tracing guides and helpers progressively.
- Colouring and tracing are materials on the current canvas; adding a guide preserves existing work.
- Optional step-by-step drawing belongs inside guide options, not a separate mode.
- Keep the playful pigment mixer with three wells, ingredient drops, undo, wash and favourites.
- Keep 44 px interaction targets, shared icons, pointer/touch/pen support and keyboard alternatives.
- Preserve the paper's aspect ratio, generous drawing space, compact header and app typography.
- Parent responses describe what they notice. No automated judgement of a free painting's quality.
- Keep a real-paper route for lesson work. Private family visibility is the scope, not public sharing.

## Source inventory and migration boundary

| Source | Use |
|---|---|
| `.scratchpad/painting-table-v2.html`, `src/pages/painting-table-v2.ts` | Approved interaction reference, currently device-local and prototype DOM orchestration |
| `.scratchpad/src/styles/painting-table*.css` | Visual reference; extract scoped production styles, avoid global prototype selectors |
| `.scratchpad/src/paint/easel.ts`, `surface.ts`, `mix.ts` | Audit drawing/input/rendering behavior and lift reusable pure logic |
| `.scratchpad/src/paint/picture-ideas.ts` | Authored colouring regions, outlines, tracing and step references |
| `.scratchpad/src/paint/lesson.ts`, `look.ts`, `prove.ts` | Earlier lesson/parent/proof behavior to compare, not assume production-compatible |
| `engine/pigment.ts`, `engine/answer.ts` | Existing pigment model and painting mark/answer types |
| `engine/ui/lesson.tsx` | Painting hand-in currently says to paint on paper |
| `apps/kids/lesson.tsx`, `inside.tsx` | Lesson recording, return context and virtualized historical sheets |
| `apps/home/home.tsx`, `journal.tsx`, `mark.tsx` | Parent child cards, historical sheets and review flow |
| `school/worlds/painter.ts`, `engine/ui/place.tsx` | Existing easel/hut art; live artwork wall and landmark actions still need integration |

Read `CLAUDE.md`, `structure.md`, `art.md`, current API/auth/data-model docs and checks guidance.
`art.md` mixes proposals and prototype status; verify source before claiming functionality exists.
Do not ship the prototype page wrapper, notation imports, local mock identities or scratchpad paths.
Keep V1/V2 available for comparison until production parity is accepted. Removing painting prototypes
does not authorize deletion of the entire scratchpad, which contains other work.

## Product surfaces

### Lesson entry

An art question shows its prompt, a paper preview and Paint/Continue painting. Use paper remains a
quieter alternative. Opening the preview enters the shared workspace with a compact lesson prompt
and Back to lesson. Returning restores the same child, question, sheet and scroll/map context.

Use focused inline activities for small colour/pattern experiments; full pictures open the large
workspace. Do not squeeze the complete dock inside narrow lesson sheets or mount live editors for
every historical question. Completed and off-screen work uses lightweight thumbnails.

The author supplies paper dimensions, starting materials, palette constraints, appropriate helpers
and review criteria through compiled content. Trace/stamp/fill helpers must not bypass a freehand
or observational task. Keep lesson fact-checking separate from human response to the painting.

Pilot the actual “Mixing in parts” lesson (`art-10-mixing-in-proportion.lumi`, `art-three-greens.lumi`):
the child mixes greens, paints the leaves, returns to a visible preview and submits the picture.
A second pilot covers colouring/tracing materials and a paper hand-in. Not every art activity should
be replaced by the full painter; audit authored painting questions before enabling broadly.

### Free painting and map

The easel opens a draft or a new picture. The hut wall opens the child's collection. A compact
paintbox shortcut is available in child navigation even when another world is active. Do not gate
free painting behind art lessons or completion rewards.

The map initially uses bounded static thumbnails in a few frames; opening the wall reveals the full
collection. Add an explicit accessible landmark action seam rather than coordinate-specific hacks.
Coordinate with map resource work so thumbnail textures/listeners are disposed when views leave.

### Picture wall and parents

One reusable collection renderer supports full gallery, compact strip and map frame data. Parent
child cards show roughly three recent completed pictures after immediate lesson information.
Lessons show their own artwork, not the whole collection. The parent journal shows the submitted
version beside the original prompt and authored “look-for” guidance.

Opening a picture provides an accessible title, enlarged image, context and applicable actions.
Free work appears without entering the marking queue. Lesson submission and optional free-work
response remain distinct. Offer print/download from the picture view, keeping the canvas uncluttered.
No public URLs, social feed, ratings or email attachment work in the initial scope.

## Core and UI architecture

Use existing pigment/mark primitives. Introduce a pure painting document/history/rendering core in
`engine/` using repository naming conventions; page-facing Solid components belong in `engine/ui/`.
Keep lesson/art policy in `school/`; route composition belongs in apps. Avoid duplicating painting
logic for free play, lessons, map popup or parent viewer.

Shared concepts:

1. Document and editing operations: strokes, fills, stamps, helpers, undo/redo and serialization.
2. Workspace: canvas, two-row dock, materials, mixer and contextual completion behavior.
3. Read-only artwork preview: same renderer/document, no editor listeners or animation loop.
4. Wall: bounded thumbnail collection, selection and full-view navigation.
5. Lesson adapter: compiled prompt, materials, submission identity and return context.
6. Persistence adapter: child scope, draft save, submission, load and failure status.

The core never imports DOM, auth, server DB or notation. The workspace receives adapters; it must
not discover the selected child from unrelated global UI. Shared dialog/select/icon components
should be reused. Save before transitions; dismissible materials/mixer dialogs restore focus and
respect Escape/outside click without losing a stroke or triggering a canvas gesture underneath.

## Document contract and save lifecycle

Define and validate a versioned artwork document before migrating UI. Include stable artwork id,
paper geometry, paint marks, authored template id/version, region fills, and any visible outline
information required to reproduce the picture. The prototype's `Picture.fills` and template metadata
live outside `Given.painting`; dropping them during migration would lose colouring work.

Keep editor-only guides, selected tools, helper settings and current step separate from final artwork.
Tracing ghosts must not appear in exported pictures. Colouring outlines/fills must appear. Reference
template assets must remain available for old documents or carry a bounded reproducible snapshot.
Thumbnails are derived caches, not the authoritative document. Renderer/export behavior must agree.

Lifecycle: draft → finished free picture or submitted lesson revision. Local recovery is written at
completed editing operations, with debounced durable sync. Never send every pointer movement. A
lesson submission references an immutable revision; later creative work can continue as a copy.
Do not turn a parent's historical review into a moving target. Saving failure must not say “Saved”.

Use bounded IndexedDB/local recovery as appropriate to document size; keep storage child/family
scoped and follow session-close policy. V2 localStorage is not production durability. Optional
prototype import must ask which child owns it; do not silently import shared-browser pictures.

Reuse authenticated APIs/event infrastructure. The integration owner decides the exact event and
snapshot schema, with a single source of truth and server-side ownership checks. Audit actual
request-size limits (currently a 1 MB HTTP body limit was found), stroke/document bounds and image
storage before implementation. Do not simply raise limits or put base64 exports into event records.
Support idempotent saves, offline retry, conflict preservation and clear pending-sync state. Two tabs
editing one revision must preserve both versions or show a recoverable conflict, never silently erase.

Include artwork in family export/deletion and authorized child access. Parent thumbnails must never
leak across child/family boundaries. Deleting a picture follows the app's existing confirmation and
retention semantics. Define those semantics with the integration owner rather than inventing them.

## Execution phases and completion gates

| Phase | Deliverable | Gate |
|---|---|---|
| P0 | Audit prototype features, authored painting items and save contracts; capture V2 comparison screenshots | Feature matrix marks retain/adapt/defer, no accidental scope loss; shared-file contracts reserved |
| P1 | Versioned core/document operations and read-only renderer; extract authored materials | Save/reopen/export agreement; fills/templates retained; undo and deterministic pigment tests |
| P2 | Shared production workspace and recoverable drafts, free-paint entry | V2 visual parity, two-row dock, no clipping; mouse/touch/pen/keyboard and refresh recovery |
| P3 | Lesson adapter and pilot lessons, immutable submission and paper alternative | Exact return context; correct child/question record; parent sees identical submitted image |
| P4 | Private collection, compact parent strip and picture response/viewer | Child isolation, lazy thumbnails, free work excluded from marking queue, download/print |
| P5 | Hut easel/wall actions and persistent child shortcut | Accessible actions, map return preserved, no dependency on assigned world, no resource growth |
| P6 | Expand authored lesson coverage, parity audit, production independence and scoped cleanup | All selected features accepted; imports/assets independent of scratchpad; documented remaining gaps |

Design schemas and authorization in P0/P1 even if persistence UI lands in P2. P2 may use a temporary
injected in-memory adapter for development, but that is not completion of the durability gate.
Map entry should not delay validating the free-paint and lesson flows through ordinary app routes.

Required verification includes tap dots and long strokes; interrupted pointer capture; resize while
drawing; palette/mixer undo; template addition/removal without lost marks; fill boundaries; eraser;
guides excluded from export; colour outlines included; mobile dock height and 44 px targets; dialog
focus; portrait/landscape aspect ratio; reload/offline/multi-tab saves; double submission; cross-child
access; immutable review; export/delete; and repeated workspace/map/lesson navigation without leaks.
Keep large canvases lazy and historical previews lightweight. Compare against approved V2 on desktop,
tablet and phone. Run meaningful model tests, targeted browser checks and repository release gates.

## Parallel ownership and handoff

Painting agent owns newly agreed painting core/UI modules, their tests/styles, dedicated painting
e2e tests, authored material extraction and this plan. It may prepare lesson/map/parent integration
patches, but must reserve existing shared files with the coordinator before applying them.

The coordinator alone edits `engine/answer.ts`, API/event unions and validators, server sync/API,
DB migrations, `boundaries.ts`, app routes/navigation, child-session selection and shared doc indexes.
Also coordinate `engine/ui/lesson.tsx`, kids lesson/inside, home/journal/mark and painter/map files
with their current owners; the workspace already has unrelated work in several of these areas.
Games and painting submit additive schema proposals together so neither overwrites the other's
union, migration or route changes. Use separate child-owned adapters during parallel core work.

Do not run broad formatters over other work, reset files, or delete prototypes as incidental cleanup.
Serialize heavy checks according to current repository guidance. Coordinator checks both features
together after integrating shared changes. Every handoff names files, checks, incomplete gates and
known limitations, and distinguishes prototype functionality from shipped functionality.

## Execution record

All phases P0–P6 pending. V2 is the approved visual reference, not production implementation.
Update this record after each completed phase with evidence and any explicitly deferred feature.
