# Shared map, world and lesson loading: execution plan

Status: final implementation specification, awaiting the user's explicit go. Reconciled with
HEAD `e42d1bf` and the local working tree on 23 September 2026 by the original map/lesson-loading
session. The user's acceptance of the design priorities is not authorization to implement yet.
Application code has not been changed for this review. This plan supersedes the execution details
of [the handoff proposal](map-loading.md), retaining that document as background evidence.
Implementation, committing, pushing and deployment remain separately authorized actions.

Read this document in three passes: [baseline and priorities](#current-baseline-and-nonnegotiable-priorities),
[architecture contracts](#contracts-and-ownership), then [ordered work packages](#ordered-work-packages).
The budget, failure matrix and product acceptance sections are part of the specification, not
optional follow-up work. No single phase counts as completion of the shared-engine redesign.

## Current baseline and nonnegotiable priorities

Verified in local history and source during the final preparation:

| Baseline | What to retain |
| --- | --- |
| `95c167d` | Static decorative backdrops on phones. This is containment, not the shared-engine solution. |
| `cc63a91` | Actual destination lesson preparation, readiness-aware entry, retry, bounded concurrent sheet work, late-result disposal, and the current snapshot checker adaptation for static mobile backdrops. |
| `515708e` | Flight zoom bounds, pinch/wheel discrimination, compact controls, smooth landing, removed name chip and scope control derived from camera scale. |
| `e42d1bf` | Initial shared-engine proposal and execution plan. The second product review and this final reconciliation extend it. |

These commits are observed locally; this review does not independently certify their production
deployment status. Active unrelated working-tree changes include authentication, child-tab
routing, account screens and username migrations. `apps/kids/child.tsx` is a shared touchpoint;
its current local diff changes the surrounding child navigation, not the preparation algorithm.
Re-read that file and coordinate before editing it. Do not revert, stash, reset or stage other
sessions' changes. No application changes are authorized during this planning stage.

Rechecked now: all 12 tests in `engine/ui/__tests__/paper.test.ts` and
`engine/motion/__tests__/plane.test.ts` pass. Previous desktop/phone loading and flight results
remain historical evidence, not a fresh full-tree certification. No full repository check or
physical-device performance test was rerun for this documentation update. The earlier mobile
snapshot-test mismatch has been addressed in source; preserve that adaptation and verify it
during execution instead of listing it as an outstanding fix. The earlier content-pack watcher
timeout likewise needs a new baseline run before being described as a current failure.

Execution priorities, in order:

1. Correct learning, access and private-state isolation. No changed questions, dropped drafts,
   duplicate answers/sittings, substituted lessons or rewards caused by rendering.
2. Responsive input and continuous context. Preserve the selected world, plane, reading anchor,
   focus and user interruption of automatic movement.
3. A beautiful, coherent view at every supported quality level. No blank paper, flashing map,
   visibly shifting art, misleading locked treatment or half-built question.
4. Bounded resources across the entire page, including required foreground reserves and safe
   cleanup. Degrade optional graphics before the first three priorities.
5. Useful preparation and faster entry, measured against bytes/work spent. Prefetch volume is
   not itself success.

If a proposed shortcut compromises an earlier priority, stop and revise it rather than treating
the phase as complete. Device support is an explicit tested envelope, not a promise for arbitrary
hardware or unbounded future content. Exact devices remain an open release input.

## Decision

Keep the existing world model, coordinates, camera, deterministic drawings, flight physics,
permissions and lesson semantics. Replace unbounded visual residency and eager dependencies
with selective loading, explicit resource ownership and a document-wide admission policy.
Child and parent learning flows are the reference implementation. Pre-auth pages, marketing,
calendar pictures, journals and previews are consumers of the same contracts.

Commit to these contracts before selecting a terrain backend. The leading candidate is small,
multiresolution images for invariant terrain, with bounded live SVG for stateful artwork and
HTML for controls. Compare it against genuinely local, disposable SVG tiles on one coastal
region. Do not build two full engines, replace artwork, or adopt a mapping framework. A canvas
terrain backend, worker pipeline, new service, database schema or service worker is not assumed.

The work is successful when a child can keep flying, reading and answering on a constrained
device without resources growing with everywhere they have visited. Faster marketing is a
consequence, not the acceptance criterion.

## Evidence and limits of the analysis

Confirmed from the current source:

| Finding | Code and implication |
| --- | --- |
| Atlas construction waits for all-world art | `apps/kids/views.ts:loadChild`, `apps/home/school.ts:schoolOf`, `apps/site/ground.ts:mapOf`, `apps/site/school.ts:schoolOf` load all worlds before supplying real dimensions. A read-only enumeration found 38 worlds and 210 unique drawing refs; even `refsOf([])` includes 37 shared refs. These are dependency counts, not measured download sizes. |
| Layout and motion metadata depend on implementations | `school/worlds/art.ts:sizeOn`, `engine/ui/drawings.ts:sizeFrom/declaredOf`, and `school/worlds/view.ts` read dimensions and declared motion. Extracting dimensions alone would leave the motion dependency. |
| Atlas and interiors retain visited detail | `engine/ui/overworld.tsx:paintNear` and `engine/ui/world.tsx:paintNear` permanently mark pieces done. World entry/redraw also has synchronous `paintNear(true)` paths. A 10 ms loop cannot interrupt one expensive `paint()` call. |
| Camera lifetime is incomplete | `engine/ui/view.ts` constructs an unowned ResizeObserver and host listeners. `stop()` stops camera motion and a settle timer; it is not a destructor and does not cancel the pending frame or release the paper canvas. This is a cleanup gap, not proof that every instance leaks forever. |
| Moving scenery needs its own teardown | `engine/ui/map.ts:runLife` returns only `rebuild`, owns an anonymous wake listener and ResizeObserver, and can queue a rebuild. Whole-map `stop()` is insufficient for per-piece eviction. |
| Animation disposal and visual settling differ | `engine/ui/animate.ts` has per-drawing `Playing.stop()` that releases registrations; group stop settles asynchronously. Pieces must own handles rather than assume removing DOM or asking a group to settle releases resources immediately. |
| Layout updates rebuild world scenery | `World.draw` removes and reconstructs painted scenery when the view changes, including changes driven by sheet measurements. Bounded residency must also reconcile layout revisions incrementally. |
| More than rendered lesson paper is retained | Successful promises remain in child `lessonReads`, parent/site lesson caches, and the drawing loader. Child past-sheet `read`, parent `Journal.read/made/slots`, and `Reading.made` also retain content or card elements. Evicting the visible sheet alone does not remove these references. |
| Other production readers need migration | `apps/home/journal.tsx` has its own batch loader and late-result handling; `engine/ui/place.tsx` also paints permanent pieces and traverses a term's sheets. Migrating only `Reading` would miss live product paths. |
| Decorative mounting is one-way | `JourneyMap`, `MapPicture`, `Near` and `whenNear` mount/draw on approach without a residency policy for leaving. The existing phone snapshot mitigation addresses only some backdrops. |
| Source identity and recovery need work | `schoolOnce(pack, still)` caches by pack only; start date and motion affect the constructed model. `engine/ui/art.tsx:onDemand` can reload automatically on an import failure, which is unsafe to assume during unsaved interaction. |

The supplied production profile was inspected, including its script and raw log. It records five
mounted atlas instances, 18,229 document elements and 7,955 SVG paths after visiting sections;
these remain on returning to the top. The large transformed terrain bounds are real element
bounds, not measured compositor allocations. This is supplied single-run evidence, not a new
physical-device measurement by this session.

The user reports that keeping the opening mobile snapshot prevents the initial crash while
later full-map sections still crash. A full-map path is implicated; OS memory termination,
graphics pressure and the precise crash mechanism remain hypotheses. Record the affected
device, OS, browser and crash/console evidence before claiming a cause or a supported-device
performance guarantee. Desktop WebKit and throttled Chromium cannot answer that question.

## Contracts and ownership

### Model and dependency metadata

`school/worlds/*` continues to decide geography, family choices, places, lesson membership,
progress, seasons and access. Rendering quality never changes those decisions. All 38 world
names, hit regions, navigation relationships and access states are usable without loading their
lesson bodies or drawing implementations.

Build tooling derives a versioned manifest from the existing declarations and seeded art:

- Core geography, local bounds, hit regions, static layer recipes and spatial lookup data.
- Drawing dimensions for the recipes actually used, including moment before/after params,
  transforms, stroke/filter overhang and maximum animation extent. Include small motion/float
  descriptors needed by layout without importing the implementation.
- Separate dependencies for atlas terrain, atlas landmarks, a particular world's entrance,
  world scenery, flight and a lesson's scenes. `refsOf` must stop attaching all map art to an
  interior request.
- Tile/variant bounds, gutters, scale ranges, pixel dimensions, URLs, hashes, estimated decoded
  cost and compatibility version. Keep the coarse manifest small; fetch detail manifests by region.

Do not precompute every family's full map. Family choices are finite validated selections today,
but combining them, seasons and progress still produces too many full-map variants. Compose
recipes at runtime from generated primitive metadata. Any future parameter outside generated
coverage needs an explicit small dimension function or a build error, not silently zero size or
a fallback that imports every drawing. Differential build tests validate metadata against the
existing implementation and check dependency closure, including optional art and motion parts.

Initial touchpoints: `school/worlds/art.ts`, `view.ts`, `roll.ts`, `overworld.ts`, `terrain.ts`,
`engine/space.ts`, `engine/parts/catalog.ts`, and build tooling beside the existing snapshot tools.
Generated data must be browser-safe and not import Node, the notation compiler or the corpus.
Keep generated images near the existing generated snapshot assets; finalize filenames with the
backend experiment. Emit the coarse manifest before constructing application map views.

### Scene and piece ownership

Introduce a shared scene-residency contract in `engine/ui/`, used by Overworld, World and Place.
The pure selection calculations can use `engine/space.ts`. A scene owns its camera, paper
surface, visible piece leases, background tasks and listeners. Each piece has a stable key,
bounds including overhang, visual revision, detail tier, cost estimate and dependency list.
Acquiring it returns an owned handle, not just `paint(): void`.

An owned handle releases DOM/Solid roots, animation registrations, timers, observers, listeners,
image references, any image bitmaps/object URLs, and pending callbacks. All release methods are
idempotent. Shared assets are reference-counted separately from per-instance nodes. A late
completion can only attach if both its scene generation and visual revision still match.

Scene states are active, suspended and disposed. Suspension stops optional work and clocks,
releases fine scenery, and preserves a lightweight camera/navigation snapshot plus application
state. Disposal releases everything owned by that instance. It must not flush, discard or own
the child's pending answer queue. `CanvasView.stop()` remains the operation used during normal
camera movement; add a separate destructor so existing `set()` calls cannot tear down input.

Audit `view.ts`, `map.ts`, `scenery.ts`, `animate.ts`, `flight.ts`, `world.tsx`, `place.tsx`,
`viewport.tsx` and overlay/backdrop mount paths. Include map-life rebuilds, world moment timers,
CSS/Web Animations, media-query callbacks, focus/reveal listeners, detached measurement roots,
and pending animation frames. A removed piece cannot later append to its former scene.

Use a small enter/leave hysteresis band, initially about 0.25 viewport per side, with a bounded
directional addition while moving. A CSS-pixel margin is converted through the camera, then
admission caps the resulting set. Do not retain a minimum 600-pixel ring regardless of device.
Visible labels and hit targets are independent of scenery residency. A focused or manipulated
control stays mounted; do not move focus merely because its picture is evicted.

### Page resource policy

Add one document-wide coordinator, with owners registered by scenes/readers. It schedules and
accounts for work; it does not become a universal cache or a new application state store.
Each tab has its own coordinator. We cannot claim a shared hard browser-process cap across tabs.

Priority order:

1. Input, flight simulation, answer state and persistence dispatch. These do not wait for a
   decorative render queue or an idle callback.
2. Explicit navigation, visible/current lesson content and coarse visible map coverage.
3. Visible detail and essential world entrance art.
4. Predicted adjacent terrain.
5. Speculative destination lessons and other optional preparation.

One focused interactive scene gets primary detail capacity. Other simultaneously visible
journals/previews share the remaining budget at lower detail. An overlay suspends the background
scene even if IntersectionObserver still calls it visible. At most the outgoing and incoming
scene overlap during a transition, within the same ledger; preferably retain only the outgoing
coarse image while handing capacity to the destination. Scrolling past a preview releases it.
It can remount at its previous state. No permanent live map for a static card.

Separate pools remain for small metadata, fetched lesson bodies, prepared sheets, terrain/image
assets and live artwork. Count pending and decoding allocations before admitting replacements;
an old tile, new tile and decode temporary must not each assume the whole budget is theirs.
Track pinned and evictable allocations separately. Share an immutable resource between consumers
without double-counting its owned bytes or letting one consumer abort another's request.

Keep demand and speculative queues bounded. Start with four network requests total, at most two
speculative, one image decode and one main-thread construction task at a time. Existing sheet
loaders may keep two in flight, but share the global admission policy and reserve a demand slot.
Downloads, imports, decode and DOM construction are different stages with different limits.
Use AbortController where the existing fetch API can accept it; module imports cannot be
cancelled or unloaded, so deprioritize before importing and discard obsolete consumers afterward.
Settled dedup promises leave the in-flight map; the owning cache alone retains the result.

Optional work yields after approximately 4 ms. A large synchronous renderer must be split or
pre-rendered; wrapping it in a Promise does not make it interruptible. Flight simulation and
camera input retain their present semantics. Coarse coverage survives rapid movement while
detail catches up. Checkpoint scheduling after each unit rather than letting an old queue
finish before a newly selected lesson can start. Protect low-priority visible work from indefinite
starvation after motion settles.

### Terrain, progress and world interiors

Tile local geometry at construction time. Repeating a country-sized path and mask under a small
clip is disallowed for either candidate. Preserve global seeds and stroke continuity so adjacent
tiles do not invent different coastlines. Include gutters for stroke/filter reach; compose only
the intended tile interior. Avoid per-frame country-sized mask/filter surfaces.

Only truly invariant layers belong in shared base tiles. Some routes, highlighter paths and
world placements depend on the family's choices or progress; establish invariance by tracing
their inputs before baking them. Dynamic roads are bounded vector segments or state-derived
local layers. Labels remain crisp HTML/SVG rather than raster text at unsuitable scales.

Represent colour reach locally in the same order as the existing painter: neutral base,
colour/reach, unopened-island exclusions and feathering, then the appropriate roads, places,
landmarks, names and guide. Prototype that full composition, not only an attractive coastline.
Use finite seasonal/state variants where manageable. Family-selected ground, weather, creatures,
lit art, secret state and moment params remain model-driven. Static and animated parts must not
be drawn twice. All SVG IDs are namespaced by instance/piece/generation.

For world interiors use bounded strips or local pieces of horizon, ground, path and scenery.
Do not assume pre-rendering a whole lesson roll is possible: its geometry depends on measured
sheet heights, dates, term selections and progress. Reuse invariant motifs and the selected
terrain strategy where appropriate, retaining local SVG where it is cheaper and correct.
World selection/layout stays an independent calculation; only affected pieces reconcile when
measurements change. Preserve the current day/question anchor. Batch height updates and avoid
reconstructing an entire world for each completed sheet measurement.

Virtualize the card shells, date flags, tape and scenery as well as lesson paper. Retain compact
positions/heights; do not keep every visited card root in `made`. Preserve semantic reading
order and keyboard access to nonresident rows through lightweight navigation metadata.

Progress is never authored by a tile. Reward events remain in the existing record model.
Separate rendered state from animation occurrence: within a scene visit, remounting an evicted
moment restores its correct pose without replay. Preserve the current intentional replay-on-a-
fresh-visit-that-day behavior unless the user separately changes it. Track occurrence by visit,
event identity and landmark, not merely by DOM existence. Pressure/hidden-tab suspension can
settle a celebration to its correct final state; it cannot grant or revoke learning progress.

### Lesson data, preparation and active work

Retain `landingRow`, real destination lessons, readiness-aware entrance, preparation on intent,
loading/retry treatment, height reuse and late-result disposal from the existing work.
No representative substitute lessons or delayed replacement with different curriculum content.

Opening or panning an atlas alone must not fetch lesson bodies. Deliberate world selection,
keyboard focus/dwell, a first-click zoom, landing intent or an explicit lesson deep link can
request the actual destination. Simply flying over a world cannot. Automatic child current-day
loading is a separately admitted task, as is an actually visible lesson preview. Decorative map
cards never prepare lessons. Initial marketing map position alone is not navigation intent.
Retune the current 120/160 ms preparation delays under the shared scheduler rather than relying
on delay alone for protection.

Bound lesson JSON and event/readback snapshots independently of prepared DOM. Scope private
state to family, child, session/auth generation, pack version and record revision. Public,
content-hashed immutable bytes may be shared; private reading/prepared state may not. Sheet keys
include lesson occurrence/day when relevant, lesson version, level, reading/answer mode, layout
width, renderer/font version and relevant answer revision. A source-level invariant may supply
part of that identity, but document and test it. Do not put raw private content in public asset
manifests or diagnostics. Audit `schoolOnce` for motion, date and pack identity, or make those
inputs view-time state instead of caching an incorrectly specialized model.

Retain active pack metadata and only a small bounded set of inactive source models. Region detail
metadata can be fetched again; source maps and cached promises must not retain every previous
pack/session merely because their entries are described as metadata. Separate retryable failures
from a stable, version-specific absence; retry after a new pack version rather than poisoning
an identifier across versions.

Integrate `nearPaper` and `preparedPaper`; do not create a competing renderer cache. Replace
parent Journal's unbounded batch behavior with the same ownership/admission guarantees while
retaining its answers, marking and readback behavior. Audit child `Loaded.lessons/lessonReads`,
past-sheet `read`, parent/site `lessonOf`, `readingShelf` sources, `Reading.made`, Journal card
maps and `Place.sheetsNow`. Count JSON bytes, rendered nodes and measured construction cost;
no single node count claims to be heap or GPU memory.

Visible paper, focused input, pointer capture, active audio/recording/game state and pending
state persistence are protected. Verify where each answer widget keeps intermediate state,
including text composition, drawing strokes and unsubmitted values. Do not assume the saved
answer event log reconstructs all of it. Move minimal reconstructible draft state into the
existing session model where needed; keep that widget pinned until such a contract exists.
Commit completed local edits to the existing queue before teardown. Do not wait indefinitely
for a server acknowledgement to free artwork when safe local persistence already owns the data.
If only the memory queue is available, forbid automatic reload and preserve the session state.
Authentication revocation follows the existing security flow; the renderer cannot override it.

For an oversized foreground lesson: first evict speculation and decorative scenes, then reduce
nonsemantic detail and resolution. Never hide objects that define a question, answer or count.
Reserve enough foreground capacity for the largest supported lesson established by corpus tests.
If it still cannot fit, virtualize complete question sections with state restoration and stable
heights; keep an indivisible interactive scene intact. Authoring/build validation must flag an
indivisible scene exceeding the supported envelope. Unexpected unsupported content gets a
recoverable, named error and a safe route back, not an infinite loading state or data loss.
Supporting arbitrary unbounded custom content on arbitrary hardware is not a promise of this plan.

## Backend experiment and decision gate

Use the same input scene, camera trace and resource contract for both candidates:

- One complex coastal region, including an island boundary, fine shore strokes, a route,
  feathered reach transition and a dynamic landmark with before/after bounds.
- Coarse full-atlas coverage, then that region at near-world and maximum supported zoom.
- Child progressed/locked state and parent fully visible state; one family substitution and
  seasonal change. Include low zoom, high DPR and transition between detail levels.
- One bounded world-interior strip beside a real complex lesson to expose competition for
  resources. This is not a second whole-world renderer implementation.

Candidate A uses real local SVG geometry/masks, disposal handles and LOD. Candidate B uses
bounded image elements with measured decode admission and the same live overlays. Start tile
edges at 256 or 512 physical pixels; test rather than equating world units with backing pixels.
Keep the coarse fallback until its replacement coverage is ready, but reserve overlap memory
before decoding; under pressure drop optional fine tiles before attempting replacement.

Choose the simplest candidate that passes correctness, physical-device stability, image quality
and sustained interaction gates. Record cold construction, p95 frame/input delay, decoded owned
bytes, DOM/paths, peak transition cost, browser/process memory where available, network bytes,
decode time and build-asset growth. Smaller download size alone does not decide. If SVG passes
with lower total complexity, select it. If images materially improve stability, select them.
If neither passes, keep the bounded coarse fallback and investigate the measured bottleneck;
only then justify a viewport canvas or worker experiment in a plan amendment. Do not commit to
an unmeasured backend simply to finish a phase.

## Implementation phases and exit gates

| Phase | Work and primary touchpoints | Required exit evidence |
| --- | --- | --- |
| 0. Baseline and observability | Read-only device reproduction; add opt-in counters/timings and repeatable traces in `tools/e2e`/`tools/scripts`; inventory all scene/canvas/reader consumers. | Authenticated child and parent baseline, slow-network waterfall, declared ownership table, physical-device reproduction notes, identified heaviest lessons. No claim of memory diagnosis without evidence. |
| 1. Ownership and conservative admission | `view.ts` destructor; disposable pieces in `map.ts`, `scenery.ts`, `place.tsx`; immediate animation release; coordinator; reversible visibility/suspension. Keep old rendering behind the contract temporarily. | Close-before-ready, suspend/resume, repeated pan and return tests show owned handles, observers and queues return to expected counts. Old broad terrain is explicitly still a known surface risk. |
| 2. Independent metadata and selective dependencies | Generated metadata/tool validation; split `refsOf`; migrate child/home/site builders and parent `rollFor`; make world/card geometry usable without art imports. | Atlas opens with correct 38 controls and geography before all-world imports; network/import assertions; matching layout/motion metadata and existing bundle budgets. |
| 3. Backend experiment | Region and progress composition described above; prototype same bounded interior strip; calibrate ledger on affected physical device. Depends on phases 1 and 2. | Written backend decision with side-by-side correctness, performance, memory evidence and selected provisional-to-release budgets. Failure keeps rollout blocked, not a silent backend switch. |
| 4. Main-product vertical slice | Child atlas -> pan/pinch/fly -> selected world -> actual lessons -> away/back -> atlas. Integrate weighted paper/body caches, protected draft state and incremental layout. Then parent map and journal equivalent. | End-to-end state correctness, bounded resource plateau, smooth slow-load entrance, landing and focus restoration on physical baseline plus browser automation. |
| 5. Full geography and all readers | Remaining atlas regions, world strips, Place, all 38 worlds and valid family variants; multiple parent journals, overlays and layout extremes. | No legacy unbounded interactive renderer in a migrated surface; fixture sweep and dependency closure; worst-case lesson/graphics contention passes. |
| 6. Every other surface and release preparation | Backdrop, JourneyMap, MapPicture, Near, home/calendar world previews and pre-auth pages use shared manifests/lifetimes; static compositions for decorative cards. | Entire-page scroll plateau, overlay handoff, no decorative lesson requests, existing static-mobile snapshot behavior preserved, stale-asset recovery verified. |
| 7. Release candidate | Full checks, build budgets, devices/networks, ten-minute traces, release/rollback instructions coordinated with deployment session. | User manual QA and separate release authorization. Remove experimental backend code after the decision; retain a bounded coarse fallback, not the crash-prone legacy engine. |

Phase 0 also identifies a dependency that may move earlier: any active lesson whose unsaved state
cannot safely survive eviction must be pinned from phase 1, before weighted eviction is enabled.
Corpus state-safety work cannot be deferred until after eviction ships. Conversely, uniform
state restoration for every widget is unnecessary if a widget stays safely pinned within a
tested foreground reserve. Each phase should be reviewable as its own change; do not broad-stage
unrelated auth/game/flight work. No worktree, stash or reset is part of this plan.

## Ordered work packages

The phase table is the overview; this is the implementation checklist. All packages below are
pending. Paths for new modules are proposed homes, not files already implemented. Prefer extending
the existing owner when it cleanly holds the concept; do not create a framework merely to match
a filename. Pure residency/admission rules can live in `engine/space-residency.ts`; DOM and
document lifecycle adapters belong in `engine/ui/residency.ts`. School-specific dependencies
remain in `school/worlds/`. Test files follow the existing `__tests__` convention.

### Phase 0: establish a reproducible baseline

- **0A. Freeze the comparison inputs.** Record commit, local relevant diff, pack version,
  viewport/DPR, motion preference, network conditions and exact child/parent fixture. Reuse
  `tools/e2e/steps.ts` rather than inventing another sign-in flow. Keep traces free of secrets
  and child names. Capture cold and warm runs separately; do not compare a cold candidate to
  a warm baseline or mix concurrent deployment changes into the result.
- **0B. Inventory every scene owner.** Trace Overworld, World, Place, Reading, parent Journal,
  backdrop and Near consumers, including parent home/calendar pictures and full-screen overlays.
  List each resource's creator, lifetime and current cleanup operation. Include hidden measuring
  roots and HTML card shells, not just SVG or canvas elements.
- **0C. Inventory protected state.** Trace `apps/kids/lesson.tsx:sheetFor/todaysSheets`, the
  answer widgets in `engine/ui/lesson.tsx`, child persistence and parent marking/readback. Classify
  each widget as reconstructible or pinned. Audit `apps/home/explore.tsx`'s print-specific route
  and existing calendar printing before shared virtualization changes. Identify the heaviest
  semantic scene and a multi-sheet day with independently delayed lessons.
- **0D. Add opt-in observations.** Instrument the named resource counts and milestones without
  changing rendering policy. Add a repeatable script for child/parent navigation and page-depth
  traces. Capture live masks/surface bounds separately from heap or owned-byte estimates.

Exit artifacts: fixture manifest, resource ownership table, baseline traces, state-safety matrix,
and initial visual references. Measurements may proceed without the affected device, but label
the physical comparison missing. This is the first implementation package after go.

### Phase 1: make release and admission real

- **1A. Separate stop from destruction.** Extend `CanvasView` with idempotent disposal of RAF,
  settle timer, ResizeObserver, named handlers, pointer state and canvas storage. Migrate its
  owners' cleanup calls; preserve `stop()` for normal camera control. Add a destroyed guard so
  later resize/set/request callbacks cannot recreate work.
- **1B. Make pieces owned.** Adapt `MapPiece`, scenery `Piece`, `WorldPainted` and Place to
  acquisition handles. Each drawing must release animation handles directly; change `runLife`
  to expose teardown of its observer, wake listener and rebuild RAF. Track moment/arrival
  timers. Start with one piece type and prove create/release/recreate before broad migration.
- **1C. Add the ledger and demand queues.** Implement estimate/reserve/start/settle/release,
  idempotent cancellation and priority promotion. Keep input outside queues. Add accounting
  assertions for negative counters, double releases, abandoned reservations and missing owners.
  Initially record estimates conservatively before enforcing weighted paper eviction.
- **1D. Reconcile wanted pieces.** Introduce stable keys, visual revisions, spatial lookup and
  bounded guard bands. Replace permanent done flags with absent/queued/resident state. A retained
  piece updates only if its inputs change. Distinguish suspended and disposed scenes. Keep unsafe
  lesson widgets pinned and do not enable aggressive lesson virtualization in this package.

Exit: component and unit tests demonstrate no late reattachment, balanced leases and correct
recreation after leaving/returning. The old broad terrain can still be expensive at this point;
these tests do not qualify the whole map as phone-safe yet.

### Phase 2: publish models without loading every drawing

- **2A. Generate metadata.** Build a tool beside `tools/scripts/map-snapshots.ts` that reads the
  canonical world/art declarations and emits schema/hash-versioned recipe metadata. Cover default
  params, supported overrides, before/after extents, animation overhang and required motion
  descriptors. Validate against the original drawing implementation in tooling, not at startup.
- **2B. Split dependencies.** Replace blanket `refsOf` usage with explicit atlas, entrance,
  interior, flight and lesson groups. Keep `engine/ui/drawings.ts` as the selective implementation
  loader; do not assume deleting its Maps unloads JavaScript. Preserve build separation from the
  notation compiler and server modules.
- **2C. Migrate builders.** Update child `loadChild/mapOf/worldOf`, home `schoolOf/schoolOnce`
  and `rollFor`, and site `mapOf/schoolOf` to use metadata dimensions. Move motion/date inputs
  into correct cache identities or view-time derivation. Keep current-day data loading separate
  from publishing the atlas model.

Exit: identical layout/hit regions and access state, correct family substitutions, and recorded
imports showing coarse atlas entry no longer awaits the 210-ref group. Metadata bytes receive
their own measured budget; existing JavaScript budgets stay enforced.

### Phase 3: select the backend and quality contract

- **3A. Build the two small candidates.** Use the same bounded-piece interface, coast, progress
  state, dynamic landmark, interior strip and scripted camera path. Share coordinate conversion
  and test data. Keep the prototype scope to the agreed region plus coarse atlas coverage.
- **3B. Test every intermediate view.** Compare artwork at the same camera during initial
  coverage, LOD replacement and settled detail. Test low/high DPR, full zoom range, locked islands,
  feathering, family changes and actual text/line sharpness. Include decode overlap in the ledger.
- **3C. Record the decision.** Select the candidate only after correctness, stability, frame cost
  and image quality are acceptable. Calibrate resource tiers and load-time gates from the traces.
  Write the chosen encoding, tile edge/gutter rules, maximum surface policy and measured limits
  into this document. Delete the losing prototype before extending the full atlas.

Stop rule: without physical evidence, selection may be provisional for engineering continuation,
but mobile stability and public rollout remain blocked. A new worker/canvas architecture, changed
support envelope or weakened product guarantee requires a plan amendment, not an implicit scope
expansion. Routine tile sizes and measured tuning stay within this approved experiment.

### Phase 4: finish the main-app journey and lesson ownership

- **4A. Integrate bounded atlas and flight.** Connect camera coverage to the chosen renderer;
  preserve existing near-world return, first-click focus, second-click entry, scope toggle,
  flight zoom/pinch and smooth landing. Start the plane and its controls only after required art
  is ready. Freeze/resume hidden-tab flight without time jumps. Keep lesson speculation driven
  by intent, not flyover.
- **4B. Specify one arrival target.** Extend the existing `landingRow` contract with an arrival
  descriptor: world/occurrence, intended lesson or question anchor, required content, sibling
  content and navigation generation. Child resumed work retains precedence where appropriate;
  explicit deep links retain their requested destination. A single shared resolver supplies
  preparation and camera entry, avoiding separate competing definitions.
- **4C. Refine readiness.** The target's coherent lesson gates entry; siblings do not gate it.
  Extend `PaperStatus` and card state to distinguish destination preparation, target failure and
  sibling retry. Once entry finishes or the person interrupts it, later completion cannot replay
  navigation. Maintain stable dimensions and actual lesson titles in unfinished sibling cards.
- **4D. Bound bodies and papers.** Extend `nearPaper/preparedPaper` with coordinator admission,
  weight estimates, occurrence/layout/source identity, pressure eviction and late-result guards.
  Integrate child `lessons/lessonReads/read`, home/site lesson caches, `readingShelf`, and parent
  Journal's separate loader. Release settled in-flight promises. Keep measured heights scoped
  to the layout/font version. Private event snapshots are never global public cache entries.
- **4E. Enforce exclusive ownership of DOM.** Share raw bytes and immutable assets across
  readers, but transfer a prepared sheet root to exactly one reader. Two simultaneous foreground
  claims cannot receive the same DOM/Solid owner. The second claimant either renders its own root
  from shared data or waits on its own admitted job. Add a concurrent-claim regression: the current
  prepared-paper test proves one speculative-to-reader transfer, not multi-reader exclusivity.
- **4F. Reconcile interiors incrementally.** Replace whole-scene redraw on each height update
  with affected-piece reconciliation and stable reading anchors. Virtualize ground, scenery,
  date/tape/card wrappers as well as paper. A card root receives explicit cleanup; dropping it
  from a Map is not enough. Prove saved/pinned state, reader navigation and print independence
  before enabling more aggressive eviction.

Exit: authenticated child and parent flows preserve questions, sitting/event identity, drafts,
answers, masks and navigation through slow/failed loads, rotation and repeated visits. Run with
pressure forced low enough to exercise the fallback/reserve path, not only happy-path cache hits.

### Phase 5: cover the full product's interactive content

- **5A. Expand art coverage.** Migrate the remaining terrain and all world-interior recipes,
  including night/weather/season cases, dynamic landmarks, moment/secret state and valid custom
  family choices. Check metadata coverage before removing any legacy dependency path.
- **5B. Finish alternate readers.** Apply the same leases and admission to `engine/ui/place.tsx`,
  parent Journal, multiple visible child journals and lesson previews. Make focus/explicit reader
  navigation independent of scenery. Preserve marking, answer-key visibility and permission rules.
- **5C. Exercise worst cases.** Stress repeated occurrences, long histories, maximum supported
  scenes and overlapping map/lesson loads. Check pool pressure, source-key completeness and every
  abort boundary. Revisit old layouts after rotation and old worlds after a record refresh.

Exit: every interactive map/reader uses the shared lifecycle; no full-country SVG or unbounded
visited-piece path remains as an unnoticed fallback. Any intentionally retained renderer must
have a bounded contract and a test demonstrating it.

### Phase 6: migrate secondary surfaces and safe recovery

- **6A. Decorative compositions.** Generate actual card/backdrop compositions from the same art
  manifests. Migrate site JourneyMap/MapPicture, MapBackdrop and home/calendar pictures. A required
  live preview requests a scene lease; static cards create no live scene or lesson request.
- **6B. Reversible visibility.** Extend Near/viewport consumers with explicit lifetime policy
  without breaking their non-map users. Leaving a section can release its drawing and entering
  can recreate it. A covered scene yields to a modal even if geometrically visible. Keep focus
  and page scroll stable through swaps.
- **6C. Recover by resource kind.** Art failures retain coarse coverage; semantic lesson failures
  expose retry/back; stale manifest/import failures do not reload unsaved work. Coordinate changes
  to `onDemand`, auth generation and deployment cache policy with their current owners. Preserve
  existing security behavior and do not add a new persistence system.

Exit: full-page scroll/return and nested overlay traces plateau; intentional mobile snapshots
remain static; stale deployment assets and offline/reconnect paths behave as specified.

### Phase 7: evidence, handoff and release readiness

- **7A. Revalidate the integrated tree.** Run formatting, types, lint, guards, model tests, build
  budgets, snapshot comparisons and the browser matrix. Record unrelated failures honestly and
  reconcile them with the owning session instead of waiving them silently.
- **7B. Validate physical devices.** Use ten-minute movement/reading traces and twenty reopen
  cycles; test rotation/backgrounding, VoiceOver/TalkBack and cold/warm network conditions. Capture
  both timing and owned resources, with process/graphics evidence where tools permit.
- **7C. Prepare manual QA and release notes.** Give the user child, parent, multi-map and failure
  routes, selected backend/budgets, visual recordings and known limitations. Document compatible
  asset publish/retention and rollback requirements. No commit, push or deployment follows merely
  from reaching this gate; obtain the relevant authorization.

### Interface and test obligations across packages

| Contract | Owner and invariant | New proof required |
| --- | --- | --- |
| Scene lease | UI coordinator; active/suspended/disposed with generation and explicit foreground priority | Suspend twice, close before ready, bfcache return and modal handoff cannot double-register. |
| Piece handle | Atlas/world/Place painter; stable key, revision, local bounds and full disposal | Re-entering a piece reproduces the same artwork/state and does not replay its visit's event. |
| Resource reservation | Admission policy; pending plus resident cost, consumer references and promotion | Cancellation/failure releases capacity; one consumer cannot cancel another's required work. |
| Generated manifest | Build tool and school geometry; schema/hash, recipes, dimensions and dependency closure | Missing/unsupported recipe fails validation; old/new versions cannot be silently combined. |
| Arrival descriptor | Shared destination resolver; real world/day/lesson/question and navigation generation | Delayed sibling does not block target; old completion cannot move a newer camera or route. |
| Prepared sheet claim | Paper cache/reader; exclusive DOM ownership, compatible layout and source identity | Concurrent reader claims, resize during transfer and sign-out during drawing release correctly. |
| Draft/state protection | Existing application session, not renderer cache | Eviction/rotation produces no different question values, lost input or duplicate events. |
| Quality tier | Renderer; complete recognizable composition with fixed semantic layers | Tiers preserve names, hit targets, locks, counted art and final progress appearance. |

Extend the existing suites rather than only adding isolated new tests. `paper.test.ts` covers
five current cache behaviors; `plane.test.ts` covers seven physics/landing behaviors.
`map.e2e.ts` already covers entry, return, scope, flight, loading, retry and close races;
`kid-map.e2e.ts` covers subject-world entry and locked feedback. Add the new residency, drafts,
concurrent readers and partial-day cases beside these. Use `map-snapshots.test.ts` for appearance
and retain the now-correct mobile snapshot path. `first-view.test.ts` builds the app itself;
measure new metadata/tile assets separately so moving bytes out of JavaScript cannot hide a
startup regression.

Available browser projects are `desktop`, `phone`, `ipad` and `phone-webkit` in
`tools/e2e/playwright.config.ts`. Run focused suites per package, then the relevant full matrix
at integration gates. Repository checks use `npm run check`; browser tests use `npm run test:e2e`
against the local 8500 app. Build-budget tests use the existing Node resolver. Do not execute
database resets or change shared dev-server state as an incidental part of this work.

Each completed package must report changed behavior, files, tests/measurements, remaining risks
and its next dependency. The user reviews the final integrated experience at the end; routine
implementation choices need not trigger repeated permission requests after go. A failed safety,
semantic or physical rollout gate remains explicit and cannot be hidden by moving to the next phase.

## Provisional budgets and observability

These are starting experiment settings, not established phone memory limits or final latency promises:

| Resource or outcome | Starting policy / gate |
| --- | --- |
| Graphical residency | Start at 16 MiB owned decoded terrain, allow up to 24 MiB only inside a provisional 32 MiB document-wide owned graphics ledger. Count every grid canvas, tile, retained fallback and decode reservation; do not multiply this allowance by number of maps. Lower optional image quality if protected foreground graphics need that capacity. |
| Canvas backing | At most 2 million backing pixels per surface, also subject to the aggregate ledger. Cap the existing grid canvas, not just a future terrain surface. Actual compositing allocations can be larger and must be measured separately. |
| Initial resolution | Conservative raster tier with effective DPR around 1 to 1.5, then upgrade within budget using frame/decode observations and hysteresis. Preserve text/input at normal browser resolution. Width and deviceMemory are hints, never admission exemptions. |
| Speculative paper | Keep the existing maximum six unused sheets as an outer ceiling; initially admit at most two and only below measured node/construction-cost limits. Zero while input, foreground loading or resource pressure needs capacity. Determine numeric weighted thresholds from heavy-lesson fixtures in phase 0. |
| Lesson bodies | Start with 8 MiB serialized-size estimate for unpinned bodies per private source and a 16 MiB document cap across such sources. Pin current demand separately and measure real heap; these estimates do not include parser/object overhead or the required application record. |
| Scheduling | Optional slices about 4 ms; no synchronous whole-viewport arrival paint. Investigate any construction unit above 8 ms on the baseline device and split/pre-render it. |
| Interaction | Target p95 frame interval <=33.3 ms during controlled sustained flight/pan on baseline hardware; target 60 fps on capable hardware. Target p95 camera/input response <=100 ms and zero dropped answers. Disclose device/trace and measure long tasks separately. |
| Residency | After 20 open/close cycles and ten minutes of exploration, inactive scene handles, listeners, animation registrations and queued tasks return to baseline. After initial module warmup, live counts/owned bytes plateau within caps; no visit-by-visit growth. Investigate a >10% rise across the last five identical cycles, allowing documented baseline noise. |
| Loading | Record navigation-to-coarse-map, controls-ready, intended-sheet-ready and interactive-lesson-ready separately, cold and warm. Phase 3 must set numerical network/device gates from baseline and candidate measurements before rollout. No arbitrary universal seconds claim now. |

The 32 MiB ledger does not include all JavaScript/DOM/browser memory and cannot guarantee that a
phone will not terminate the process. Mandatory lesson reserves are sized from the supported
corpus, and must fit the selected device envelope. If these starter budgets fail, lower optional
resources or narrow the supported content envelope explicitly; do not silently raise all caps.

Expose opt-in diagnostics: scene IDs/state/generation, visible/wanted/resident pieces by LOD,
cost by pool, pinned reasons, pending/active requests and decodes, stale results discarded,
paper/card counts, observers/listeners/animation handles, layout rebuild count, construction and
decode time, frame gaps, fallback decisions and retries. Use browser traces/process tools where
available; heap alone cannot prove graphic reclamation. Do not send lesson answers or child names
in diagnostics. Use local structured traces first; new telemetry infrastructure is not required.
JavaScript modules are not evictable: record their cumulative first-load cost separately from
resident graphics. A finite module warmup is not a reason to accept unbounded card/DOM retention.

## Failure, race and interaction checklist

| Case | Required behavior and test |
| --- | --- |
| Cold startup / no metadata cache | Show stable paper/loading treatment and navigation shell; publish correct hit regions once metadata is valid, then coarse coverage. Do not await fine art or every world. Direct lesson links prioritize that real lesson. |
| Pan, pinch, flight, zoom extremes | Existing camera/zoom limits and flight physics stay; names, locked feedback and controls work at every LOD. Coarse tiles cover fast movement. No lesson warming merely from crossed worlds. Landing remains gradual; changing quality never resets plane/camera state. |
| Rapid A -> B -> back / close during decode | Generation and consumer leases decide attachment; obsolete completions release immediately. Navigation promotion wins over queued speculation; old error/success cannot change current readiness. |
| Multiple maps / modal overlay | One global ledger; explicit foreground owner rather than visibility alone. Keep focusable controls usable in visible lower-detail scenes. Suspend covered backgrounds and restore their camera on close. |
| Hidden tab, pagehide/pageshow and bfcache | Pause optional queues and simulation clocks, release captures/held keys, preserve drafts and plane state. Resume with bounded delta time and revalidate scene/session, not a giant physics catch-up or a second scene registration. No replayed award. |
| Rotation, resize, font readiness, browser zoom | New layout generation with anchored day/question, bounded old/new overlap and correct measurements. Preserve selected world, flight scale intent and focus. Recompute pixel budgets from viewport and DPR; a width change cannot allocate an unbounded surface. |
| Reduced motion or preference change | Static poses and immediate camera transitions as today, no ambient loop required for readiness. Update motion specialization safely instead of reusing a cache built for the wrong preference. |
| Slow, failed or offline data | Keep correct coarse scene or illustrated entrance with matching loading/retry UI. Retry failed resources independently. Cached public art can remain; unavailable/private lesson data cannot be invented. Offline uncached lesson entry offers retry/back, without falsely marking completion. |
| Decode failure / optional asset missing | Retain coarser coverage; retry with bounded attempts/backoff, then stay coarse. Failed speculation does not show an intrusive error. Mandatory semantic lesson art failure is explicit; no wrong empty question. |
| Cancellation and shared requests | One consumer releasing cannot cancel another's active demand. Remove settled in-flight promises and stale queue entries. Late import/decode/measurement cannot retain a disposed owner or publish into the wrong layout. |
| Pack, session, child, record change | Versioned keys and generation invalidation; private caches cleared/replaced at session boundaries. Finish or preserve active drafts according to existing auth policy. Do not render old child answers, old grade membership or stale lock states. |
| New deployment / stale chunks | Match renderer-manifest compatibility and content hashes. Retain old static assets during a defined deployment grace window where supported. Failed optional tiles stay coarse. Import/version failure offers safe retry/update; no automatic reload while drafts or unsent memory-only work exist. Coordinate `onDemand` behavior with the deployment/auth session. |
| Rewards, seasons, secrets, family tweaks | Differential model/visual fixtures cover before/after poses, bounds and mask order. Eviction is not a new visit or reward event. Actual permitted lesson collection remains unchanged, including subject worlds. |
| Input and accessibility | Pin focus, active gestures, composition, drafts and pending save state. Roving focus/reading order comes from metadata, not tile existence. Keep 44 px controls, accessible world names/locks, live-region announcements and dialog return focus; avoid repeated loading announcements per tile. |
| Oversized lesson / sustained pressure | Evict speculation and optional detail first, reserve demand capacity, then safe question-level virtualization or recoverable unsupported-content error. No indefinite admission wait, semantically reduced question or discarded input. |
| Unsupported APIs / storage unavailable | Conservative defaults without memory/network/idle APIs. Use the existing timing fallback; fetch/decode failure remains retryable. Memory-only draft persistence forbids unsafe automatic reload. |
| Canvas context loss, if canvas backend is selected | Recreate a bounded surface from model/asset cache and retain a coarse fallback while doing so; test restore failure. This is a conditional requirement, not a reason to choose canvas. |

## Test and device matrix

Unit/property tests cover deterministic metadata and recipe bounds, spatial selection at tile
boundaries, hysteresis, global admission, ref-counting, priority promotion, pinned reserves,
shared cancellation, idempotent disposal, late results, cache identity/invalidation and event
occurrence. Keep protocol state machines testable without DOM. Content tests cover every world,
all supported recipe variants, subject-world collections, retired-choice fallback, current/past
lessons and the largest indivisible scenes. Test font/layout variants and partial answer restore.

Browser tests cover the complete child and parent journeys, not just marketing screenshots.
Include Place, two or three visible parent journals, an overlay over a map, scroll away/back,
twenty reopen cycles, sign-out/child switching, packet reordering, failed reads, offline recovery,
closed-world keyboard entry, reduced motion, touch pinch, mouse/trackpad, flight at both zoom
limits, keyboard landing, resize mid-entry, unmount during decode and missing old deployment assets.
Assert no unexpected all-world drawing imports or lesson requests from passive map exploration.
Visual fixtures inspect coast seams, neutral/coloured reach and island exclusions, seasons,
dynamic/static part separation, night worlds, text sharpness and illustration placement at
DPR 1/2/3. A raster pixel diff alone cannot prove lesson/access correctness.

| Device / browser | Network/cache | Purpose |
| --- | --- | --- |
| User's affected physical device, details pending | Cold and warm; normal Wi-Fi and repeatable constrained network | Mandatory crash reproduction and release gate; remote console/process evidence where available. |
| Oldest supported physical iPhone/iPad with Safari | Cold/warm, offline then reconnect, rotation, app switching | Memory/compositor behavior and touch lifecycle. Exact supported OS to be agreed from device inventory. |
| Older physical Android phone/tablet with Chrome | Same traces; wide tablet as well as small phone | Low-power performance; proves screen-width heuristics are not the policy. |
| Desktop Chromium and WebKit automation | Normal; e.g. 1.5 Mbps / 150 ms RTT controlled profile, failed and delayed responses | Repeatable correctness, timings and lifecycle assertions. The network profile is a lab condition, not a device simulation. |
| Current desktop and phone | Normal/high DPR; keyboard, mouse and trackpad | Quality ceiling and assurance that conservative startup upgrades smoothly. |

If the physical baseline device is unavailable, implementation and automated verification may
proceed after plan approval, but the mobile stability claim and general rollout gate remain open.
Do not substitute desktop WebKit or forced garbage collection for that evidence.

## Migration and release

Keep the currently deployed snapshot containment. A separate marketing containment patch can
ship through the deployment session without being presented as the shared architecture fix.
This plan does not authorize that deployment. Coordinate renderer and loader files before either
session starts implementation; preserve the current lesson, auth, games and flight changes.

Introduce contracts compatibly, migrate one main-app slice, choose the backend, then expand.
Use an internal build/test switch for side-by-side comparison, with the existing engine only
as an explicitly unsafe reference during development. Public fallback is the new bounded coarse
mode, not automatic reactivation of full-country SVG. Avoid an ever-growing collection of
runtime switches and remove the losing prototype after the decision.

Build assets and manifests together with hashes and schema/renderer versions; validate every
reference and snapshot during CI. Coordinate atomic publish order, old-asset retention and
rollback with the deployment session. A rollback pairs compatible code and assets. No reload
loop on version mismatch. Document server cache headers/grace requirements without adding a
tile service or changing database storage. No personal data enters generated shared assets.

Before release: run repository checks, build/bundle budgets, focused lifecycle and state tests,
visual comparisons and physical-device traces. Preserve the corrected static-mobile snapshot
checks and extend them for the selected renderer. Track unrelated failures separately; do not label a full check green
if it is not. Supply the user with the same child/parent QA routes, known limitations, selected
budget measurements and rollback instructions. Committing, pushing and deployment require their
own authorization.

## Product acceptance: requirements from the second review

The user accepted these priorities for execution. They are required behavior and supplement the
phase exit gates above; they do not claim that unmeasured budgets or browser behavior are settled.
The final preparation request still requires waiting for an explicit go before implementation.

### What does the child see while quality changes?

Coarse mode must be a deliberately composed version of the same illustrated world, not a blurred
screenshot or an empty sea with buttons. Keep the continent silhouettes, distinctive world
landmarks, names, correct progress treatment and guide readable at their intended viewing scale.
Reduce minor texture and optional ambient density before compromising those recognition cues.
World identity and meaningful learning artwork are not optional detail.

Do not use dimming for missing art: dimming already communicates access/progress. Keep labels and
hit targets in the same positions through every detail tier. Loading has its own treatment.
Use identical seeds, colours, geometry and compositing order across tiers; a remount must not
make a tree move or a coast change shape. Sharpness changes must not resemble a world changing.

Replace coverage in small coherent groups only when ready. Test direct swaps first; use a short
local opacity transition only where it visibly improves the result and fits overlap memory.
No full-map flash, repeated shimmer, animation on every arriving tile, or country-wide crossfade.
Reduced motion uses immediate coherent swaps. During sustained movement keep a stable detail
tier; upgrade after settling with hysteresis, not on each frame or minor load fluctuation.

Prototype screenshots and motion recordings must compare the coarse view, intermediate view and
final view at the same camera. Beauty is a release gate alongside memory and timing: readable
pencil lines, consistent water, no visible seams, no duplicate animated parts, no flickering
progress boundaries and no moving labels. Review these on a physical screen, not only pixel diffs.

### Are we waiting for too much before entering a world?

The current `entryLessons` / `waiting` path can gate entry on every lesson in a destination day.
Retain actual destination selection, but refine the readiness boundary in phase 4. Resolve a
stable arrival target first: requested lesson, resumed question, or the journal's actual current
lesson. Its required semantic content and interactive controls get priority over sibling sheets
and scenery. An unrelated slow lesson in the same day should not prevent that target being used.

If sibling sheets are visible alongside the target, give each an honest, stable loading card
with its actual lesson title and an independent retry state. Never show blank paper, substitute
content or expose a half-built interactive question. A target that cannot yet be made coherent
still waits at the illustrated entrance. The precise readiness unit must be tested with wide
multi-sheet days, phone layouts and lessons containing an indivisible interactive scene.

Once the person moves or starts reading, delayed content must not take the camera back to its
original destination. Keep the existing user-interruption rule and the current question/day
anchor. A later retry should fill its own place rather than replay entry. Distinguish preparing,
ready and failed for the required destination from incidental background failures.

Starting Fly also needs a coherent readiness boundary: acknowledge the action immediately, but
do not begin invisible plane simulation while its drawing is still loading. Repeated activation
must share one start operation. Ready controls and a visible plane begin together, retaining the
existing smooth camera transition. Late failure leaves the map usable and retryable.

### Can unloading change the lesson or create another sitting?

State restoration must preserve question instantiation/seeds, sitting identity, question order,
answer attempts, hints and intermediate drafts, not merely the last submitted answer. Preparing
a lesson in the background must not start a sitting, emit completion, or consume a reward.
Moving between atlas and world cannot create a second action handler or submit an answer twice.

Add a fixture that partially answers, opens a hint and leaves an unfinished input, then rotates,
scrolls away/back and returns through the map. Compare the restored question values and event
stream, as well as what is visible. Include repeated lesson occurrences on different dates.
If a widget lacks a safe restore contract, keep it pinned; do not replace it with a nominally
equivalent fresh component. Preserve active sound and game state only according to that widget's
existing interaction policy, with an explicit suspend/resume contract.

### Does virtualization remain a complete accessible reading experience?

Keyboard focus is not the same as a screen reader's reading position. Do not rely on focus
pinning alone or attempt to detect assistive technology. Provide explicit, lightweight day and
lesson navigation that can materialize a requested section and move focus only after it is
ready. Do not expose fake empty interactive cards as if their full content existed.

Keep the currently presented reading section mounted across ordinary background reclamation;
use explicit section transitions where necessary rather than evicting content solely because
it falls outside a visual IntersectionObserver region. Test VoiceOver and TalkBack navigation,
headings, live announcements, restored focus, text enlargement and touch targets on real devices.
This must be settled before enabling aggressive lesson DOM virtualization, and may require a
bounded sequential reading presentation that uses the same lesson/state model.

Printing must continue to render the requested complete lesson from the canonical data, not
from whatever viewport pieces happen to be resident. Keep print rendering an explicit task
with its own teardown and the existing physical sizing/answer-key rules. Do not unvirtualize
an entire year's roll merely because a browser print event fired. Audit existing print routes
before changing shared lesson components and include a print regression fixture.

### Will loading policy consume bandwidth or oscillate?

Measure preparation usefulness: demand cache hits, speculative bytes, work discarded before use
and time saved on real navigation. A system that eagerly prepares many destinations but rarely
uses them is not successful because it reports a high cache-hit count elsewhere. Limit a dwell
prediction to a small destination set and stop it on input/pressure. Never queue an unbounded
chain of worlds. Follow save-data hints conservatively, without claiming they identify device
capability or that cached pages provide full offline operation.

Separate the detail-retention hysteresis from cancellation: a tiny camera movement should not
repeatedly abort and refetch the same shared request. Retain useful near-boundary work briefly
only within the budget, and promote an existing request when it becomes demanded. Retry failures
with bounded backoff and explicit demand retry; background failures cannot form a request storm.

### Can the coordinator itself become a source of lag or deadlocks?

Keep three concrete contracts: resource leases, scene ownership and priority admission. Do not
build a general-purpose job framework or duplicate browser caching. The coordinator never
serializes input or waits for optional work before admitting demand. Cost estimates must be
reserved before construction and reconciled afterward; an underestimated piece triggers detail
reduction and diagnostics, not silent continued over-admission.

Bound the coordinator's own bookkeeping and selection work. Use a spatial index or region/strip
lookup for visible pieces rather than scanning all world scenery every flight frame. Refresh
the wanted set only when coverage, LOD or scene revision changes; the plane/camera may still
update every frame. Keep dependency loading and layout out of the flight simulation loop.

Specify a safe order for resource acquisition so a scene cannot hold its last decode slot while
waiting for a construction slot that depends on it freeing memory. Work must release reservations
on failure, cancellation and timeouts. Mandatory demand cannot sit forever behind a budget:
reduce optional allocations, enter the defined foreground path, or report an actionable failure.
Test that path rather than assuming every required scene is below a nominal cap.

### What happens if the physical device still fails?

Use quality levels with explicit visual contracts: coarse but complete, normal, and enhanced
optional detail. Start conservatively and use performance observations for upgrades. Do not
infer memory headroom from smooth frames alone, and do not promise to catch an OS termination
after it has killed the page. A recoverable allocation/decode failure can downgrade within the
current session; an unexplained process termination still needs physical-device investigation.

The bounded coarse mode retains navigation, permissions, lessons, accessible names and flight.
It is not a dead-end screenshot for an interactive child map. Keep the last known correct view
while optional resources fail, provide retry/back for required failures, and avoid changing a
child's world or lesson to escape a rendering problem. No new automatic reload or crash-loop
recovery behavior is assumed without a separate state-safety review.

### What changes in execution order?

Phase 0 now explicitly inventories lesson readiness dependencies, screen-reader behavior,
print routes and sitting/seed restoration. Phase 1 pins unsafe-to-restore state before any
eviction. Phase 3 adds visual-quality and request-efficiency comparisons to backend selection.
Phase 4 proves partial-day loading, meaningful entry cancellation and accessible section
navigation before expanding to all content. Numeric resource limits remain provisional.

## Remaining decisions and approval

The plan fixes the ownership, data, state and admission contracts. Still open by design are:
the affected and oldest supported devices; SVG versus image terrain after the small experiment;
release-calibrated weighted paper limits, graphical caps and load-time gates; exact bounded
variant/tile encoding; and the deployment asset-retention window. None require a new service
or database change on current evidence.

The largest risks are reproducing the present mask/art composition without oversized surfaces,
keeping active lesson widget state safe during virtualization, accounting for decode overlap,
and avoiding a new import dependency on the critical path. The experiment and phase exits are
designed to expose these before a whole-product rollout. They are not a promise that every
browser fault or unsupported future lesson has already been solved.

Await the user's confirmation of this plan before changing application code.
