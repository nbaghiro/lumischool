# Painting workspace, lessons and picture wall

Status: parent-only durable Painting workspace and galleries implemented, 23 September 2026.
The shared production workspace is available at `/painting`; lesson, map-entry and child-access
phases remain pending until the access policy is decided.
Companion: [game-variations-plan.md](game-variations-plan.md), including shared-file ownership.

## Product target

One shared painting workspace reached from lessons and free painting, with one private child-owned
picture collection reused as a wall, preview strip and journal artwork. The Painter's Hut is its
natural map home; an always-available child shortcut avoids requiring a particular assigned world.
Owner update: start with a **Painting tab for signed-in parents** to QA the complete creative
experience. Do not add child routes, lesson entries, map actions or unlocking in this slice. Later,
explore access to both Games and Painting through parent permissions and lesson-completion unlocks.
The earlier always-available child shortcut proposal is therefore pending that product decision.

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
free painting behind art lessons or completion rewards under the original proposal; the owner's
later parent-control/unlocking direction above supersedes this until the access policy is decided.

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

### Parent QA delivery

- `apps/home/painting.tsx`, routes, lazy screen and parent navigation: signed-in-parent gate, no kid
  route. Tutor and signed-out sessions do not mount the workspace. Existing child-mode redirect stays.
- `engine/painting.ts`: versioned document containing paint marks, paper, template, region fills and
  guide state, with bounded validation. No server event/schema changes in this slice.
- `engine/ui/painting.tsx`, `painting-workspace.ts`, `painting-easel.ts`, `painting-surface.ts`,
  `painting-ideas.ts`, `painting.css`: reusable mounted workspace, canvas renderer, six authored
  picture ideas, colouring/tracing/step references, all painting materials, shapes, smoothing,
  symmetry, pigment mixer, two-row dock, private device-local wall and PNG export.
- Save keys are scoped to authenticated family and parent IDs, never implicitly to a child.
  The UI says **Saved on this device**. Conflicting tab saves preserve a recovery copy accessible
  through the picture wall; quota/validation failure does not claim success. This is intentionally
  a QA-stage local save adapter, not cross-device durability or completion of the P2 cloud gate.
- Workspace unmount disconnects resize observers, cancels pending stroke work and closes its dialog.
  Drawing and templates import production modules only; no production dependency on scratchpad.
- Prototype references remain available while parents QA the experience. No prototype import or
  deletion was performed. Existing local prototype pictures are not silently assigned to a parent.

Checks: seven scoped document/painting model tests pass; desktop and 390px browser flows verified
drawing, colour regions, mixer, wall, reload, route return and signed-out denial. Screenshots inspected
at both sizes. Full production typecheck, scoped lint, boundary and suppression checks passed during
this delivery. Final browser/build results are reported in the delivery response.

P0/P1 and P2 have a working parent-QA implementation; shared server durability and full migration
parity remain open gates. P3–P6 remain pending and must follow the revised parent-first rollout.
Next: parent QA refinements, durable persistence, then explicit decisions on child permissions and
unlocking before enabling lessons/map/child entry points. Do not infer unlock rules from this plan.

## Durable editable galleries (approved implementation, 23 September 2026)

### Findings in the current app

The workspace already stores an editable `Picture`, not just an exported image: marks, dimensions,
paper, colouring fills, template identity and guide state survive reopening. `openPicture` restores
these into the same easel. Undo/redo is intentionally session-local today.

Storage is still one localStorage bundle per family/parent, containing separate `current` and `wall`
copies. `keep()` updates the wall on Done or before switching pictures; ordinary autosave only
updates current. The wall can consequently show an older copy of a painting still being edited.
The gallery is a dialog, not a persistent collection screen. There is no server artwork collection,
child ownership or cross-device access. New persistence should replace this duplicate-document
model, rather than synchronize both copies.

### Recommended experience

- Owner correction: Painting opens directly on the large canvas. A compact Pictures control opens
  a dismissible horizontal thumbnail strip on demand, closed by default. New painting and the parent
  owner selector live in this strip. Selecting a picture resumes editing. Most recently edited work
  comes first; unfinished work is included after the first meaningful edit. Untouched sheets do not
  create gallery clutter.
- Each card shows the artwork, its name and a quiet last-edited indicator. Opening it resumes the
  full editable document. A recent picture can carry a Continue painting action.
- The canvas retains its compact header and two-row dock. Pictures opens the thumbnail strip and
  Done saves and opens it too. Dismissing the strip returns to the same mounted canvas. Done does not
  freeze a free painting or imply grading. No separate Save ceremony.
- Rename, Make a copy, Download and Delete live in a picture's overflow menu. Delete requires
  confirmation. A copy gets a new identity and leaves the original intact.
- Parents use a compact child selector in the Painting tab. Selecting Alisa opens Alisa's actual
  collection through the same gallery/workspace, enabling realistic QA before kid routes launch.
  Retain a separate My paintings scope for parent experiments and families without children.
- Parents can view/download child work; editing is an explicit Continue painting action, with
  author attribution on saves. Preserve a recoverable prior revision when another author edits.
- Later, an authorized child enters directly into their own collection, without a family-wide
  picker. This proposal does not enable kid routes or decide lesson-unlock rules.

### Storage and shared contracts

Inject a repository into the workspace (list, load, create, save with expected revision, copy,
delete), instead of giving it a localStorage key. Gallery, parent route and eventual kid route use
the same contract; ownership and auth stay outside drawing mechanics.

Use a dedicated artwork store with family scope, child owner OR parent owner (exactly one), stable
artwork ID, title, schema version, current revision, creation/update times and last editor. Store
bounded versioned document snapshots separately from paginated gallery metadata. Derived previews
are keyed to revision; never load/replay every full-resolution document just to list the wall.
Free-paint autosaves must not become lesson-answer events or enter the marking queue.

Preserve template versions or a bounded reproducible template snapshot; today's template ID alone
is insufficient if its shapes change. Reuse one renderer for the canvas, preview and export.
The server must validate documents independently of UI modules, including supported stamp/shape
IDs, region keys, numeric bounds and serialized byte size. The existing 1 MiB HTTP body limit is
smaller than some documents allowed by the current point-count validator: reconcile these limits
explicitly and test near the boundary before shipping. Do not silently discard marks.

Write local IndexedDB recovery after completed edits; debounce network saves and serialize writes
per painting. Keep editor preferences separately so changing brush size does not create an artwork
revision. Expose Saving, Saved, and Saved on this device / waiting to sync truthfully. Persist queued
changes before navigation; do not rely on an unload-time request. Reload should restore unsynced
work. Switching child/family scope must flush to the original scope and dispose the old editor.

Use operation IDs for idempotent retries and expected revisions for optimistic concurrency. A stale
save preserves a recoverable separate copy rather than overwriting the other device's work. Define
bounded recovery/history retention; reopening needs the editable document, not unlimited history.

Every read/write must enforce family membership and ownership on the server and in the database's
tenant model. Parent access covers children in their family; child access covers only an authorized
child in that session. Do not grant tutors painting access implicitly. Scope local caches by identity
and apply the existing session-close policy. Include documents and derived assets in family export,
child deletion and consent-related cleanup. Gallery previews remain private too.

Offer an explicit import of existing device-local QA pictures: choose My paintings or a child,
deduplicate by import identity, and retain local originals until server acknowledgement. Never
silently assign a parent's old experiments to a child.

### Implementation order and acceptance

1. Finalize owner/revision/document contracts and server validation; add scoped database storage,
   authenticated endpoints and export/deletion integration. Test cross-family and cross-child denial.
2. Replace workspace-local persistence with the repository and recovery queue. Test refresh,
   offline edits, retries, two-tab conflicts, navigation during save and large-document boundaries.
3. Add the reusable gallery and parent child selector. Test New → draw/colour → return → reopen →
   edit → reload on another session; verify the latest preview and original dimensions/template.
4. Add copy/rename/delete/download, explicit local import, lazy previews and phone/tablet QA. Verify
   changing child during a pending save never misattributes work, and parent edits remain attributable.
5. After parent QA and access-policy decisions, expose the same collection in the child app. Lesson
   submissions later reference immutable revisions; continuing a submitted work makes a free-work copy.

The canvas-first correction above supersedes the original gallery-first proposal. Child routes and
lesson-unlock policy remain explicitly deferred. The parent account can test every child collection.

### Durable save implementation notes

The injected workspace repository uses optimistic revisions and operation identities, with a
serialized debounced queue. It records completed document changes in IndexedDB before navigation;
brush choices are separate device preferences. Device recovery is scoped by family, parent, owner
and writing session, keeping concurrent tabs from replacing each other's unsynced copies. The
browser keeps at most 100 queued snapshots across identities; reaching that limit reports a recovery
failure rather than evicting unsynced work. Acknowledged snapshots are removed. Failed local and
server storage prevents the Pictures/Done transition and keeps the current canvas available.

The server accepts editable documents up to 720 KiB and PNG previews up to 64 KiB, within the
existing 1 MiB request limit. Previews are derived at up to 240 pixels on their longest edge and are
reduced further if required. Canvas export and preview use the same composition: colour fills,
paint marks and outlines; tracing guides stay editor-only. Template version one and its motif
geometry are pinned by a regression checksum. Future geometry changes require a new version and
retaining the old renderer. Unknown stamp, stencil and fill-region identities are rejected.

A recovered queue retries its original operation identity, including after a lost acknowledgement.
A stale remote revision makes a separate editable copy and subsequent local edits follow that copy.
The gallery refreshes after acknowledgement, preventing an already-synced item from appearing
permanently as device-only work. Selecting another owner never retargets the mounted editor's saves.

### Durable galleries delivery

- `/painting` opens on the canvas. Its Pictures icon and Done open the compact horizontal filmstrip.
  Escape, outside click and Close dismiss it without replacing the mounted canvas. New painting,
  parent/child selection and picture actions are inside the strip. The header follows canvas width.
- Each meaningful edit saves the editable document; a new untouched sheet never creates a record.
  Stored pictures resume colouring, guides, paper geometry and paint marks. Child pictures open a
  read-only full-size preview with an explicit Continue painting action. Tool undo remains local to
  the current editing session, while saved documents remain fully editable across visits.
- Both the gallery's list/load/save/delete gateway and workspace repository are injected. The parent
  adapter uses authenticated endpoints; future authorized child routes can provide their own adapter.
- `artworks` and `painting_saves` use forced family RLS, scoped child ownership or parent ownership,
  server-side validation and attributed revisions. Lists page through 24 small preview records.
  Stale revisions preserve separate copies. The latest 20 revision receipts per picture are retained;
  older retries safely produce a separate version rather than replacing newer work.
- Rename, copy, PNG download and confirmed deletion are available in picture options. Deletion
  removes document, title, thumbnail and retained snapshots, keeping an identity tombstone to reject
  delayed saves. Child/family deletion cascades; family export includes pictures and retained history.
- Device-only QA pictures and old recovery copies can be explicitly imported into the selected
  collection. Stable import markers prevent duplicate imports; local originals remain intact.
- Parent and child scopes remain private. Tutor and child-session API access is denied in this
  parent-QA rollout; no child unlock or lesson-submission behavior was introduced.

Verification: 18 scoped document, save-queue, renderer and icon tests; three Painting API integration
cases covering ownership, idempotency, conflicts, pagination, retained history, export and deletion;
and database tenant/policy checks passed. Six browser cases passed, covering desktop and phone
pointer input, save/reopen, colouring, mixer, download, child collection management, offline refresh
recovery and simultaneous-tab copies. Desktop/phone canvas and filmstrip screenshots were inspected.
Final release gate passed: `LUMISCHOOL_REQUIRE_DB=1 npm run check` (55 database, 135 server,
512 engine, 346 school, 29 tools and 32 app tests; both build checks and all guards). A targeted
390 px offline-recovery browser rerun also verified that save warnings stay visible on phones.
