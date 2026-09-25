# Shared map rendering: final execution plan

25 September 2026. **Ready for approval; implementation has not started.**
This is the next renderer migration, not a claim that earlier proposals were fully implemented.
The user's next “go” authorizes execution of these phases. No commit, push or deployment is implied.

## Objective and priority

Preserve the current desktop experience while making parent, child, sample and decorative maps
operate within bounded resources. Smoothness and correctness are joint release gates, not benefits
to trade away for lower memory. Optional detail may resolve progressively; input, camera continuity,
lesson correctness and an already visible scene must survive that process.

The leading representation is generated image tiles for invariant artwork with bounded live layers.
The renderer backend will be selected by a limited comparison, not by assuming images, canvas,
WebGL or a library is inherently safe. New worlds and lessons must increase available content without
requiring a proportionate increase in one page's resident content.

## Evidence and current state

- The user still reports a refresh followed by a crash on physical iPhone 17 Pro Max / Chrome.
  Process memory termination is suspected, not established. Record exact iOS, browser and build.
- Desktop continuity is reported substantially improved. Existing browser checks are regression
  evidence, not proof of physical-device memory safety.
- Current parent, sample and child map entry still asks for drawings across all worlds in
  `apps/home/school.ts`, `apps/site/ground.ts`, and `apps/kids/views.ts`.
- `engine/ui/map.ts` builds terrain before `mapSurface` bounds its displayed window. The wrapper
  limits the visible viewport but retains underlying geometry. Scheduling and DOM eviction alone
  do not establish a graphics-memory cap.
- Existing documents describe investigations and proposals at different dates. Reproduce a current
  baseline rather than treating every historical diagnosis as a current defect.

## Behaviour that must survive

1. Overworld camera framing, manual pan/pinch/wheel, near-me/every-world behaviour, world selection,
   flight steering/speeds/zoom, smooth stopping and landing, and compact accessible controls.
2. Entry and return continuity; real destination lessons and themed loading/retry surfaces; no invented
   substitute lesson. Optional art readiness is distinct from destination lesson readiness.
3. Stable lesson/scenery identities and placement, atomic content/layout publication, anchored reading
   position, deduplicated preparation, bounded preparation and disposal of late results.
4. Manual world zoom remains near two short sheets; scripted entrances retain their wider framing.
   Background mouse dragging suppresses selection, direct lesson text selection works, and Space-drag
   pans. Touch, keyboard, controls, focus and ongoing input remain functional.
5. World-specific original collections, grade journeys, canonical lesson identities and honest content
   gaps. Grade selection uses the shared Select and survives option/source replacement. Preserve the
   restored original lesson header label. Renderer work must not redistribute or rewrite curriculum.
6. Child access restrictions, canonical progress/answers, prerequisites and rewards. Reusing a lesson
   in another setting is not another completion; mounting artwork never emits a reward.
7. Season, family choices, lit artwork, secrets, before/after moments, child reach feathering and
   unopened-island exclusions. Preserve meaningful drawing order and scale-sensitive artwork.
8. Marketing navigation and explicit sample-overlay opening, overlay sizing, and the sample lesson's
   single-instance preparation/framing before reveal. Decorative scenes do not prefetch lesson bodies.

## Architecture boundaries

### Content and generated assets

Existing seeded drawing recipes remain the artistic source. A deterministic build export produces:

- Versioned manifest with coordinate units, bounds, tile grid, detail levels, dimensions, gutters,
  asset URLs, dependency groups and required render variants.
- Independent world metadata: names, geometry, hit regions and dependency identifiers without imports
  of all drawing implementations. Generate/validate dimensions from actual recipes and parameters.
- Coarse complete atlas coverage and finer local imagery. Separate text, dynamic landmarks and
  animated parts rather than accidentally baking duplicates underneath live versions.
- Stable local scenery recipes/assets for lesson worlds; avoid baking a full variable-height roll.

Start with individually served, content-versioned files using existing static delivery. Consider an
archive only if measured file/deployment costs justify it; no new service or schema is assumed.
No private child data goes into shared assets. Retain old asset versions for old live clients during
release overlap. A missing asset leaves usable coarse coverage with bounded retry, not page reload.

Compare 256/512-pixel tile output and suitable lossless/near-lossless encodings using pencil strokes,
hatching, transparent edges and close zoom. Measure transfer, decode and memory together. Build each
tile from bounded source regions; do not allocate one enormous highest-resolution atlas bitmap.
Use identical seeds/world coordinates across levels, overlap gutters and verified composition crops.

### Runtime scenes

Keep one authority for camera coordinates and gesture ownership. A renderer adapter consumes a
camera snapshot and required coverage; it must not run a competing camera or reinterpret flight physics.
Keep labels, hit targets, plane, focus and active lesson components independent of tile residency.

Scene lifecycle: prepare, present, suspend, dispose. Resource lifecycle: queued, loading, decoded,
presentable, retained, released. Every asynchronous result checks its scene/content generation.
Shared fetches use consumer ownership: one departed consumer cannot cancel another's required load.
Imports that cannot be cancelled must be ignored on late completion and avoided when unnecessary.

Use a page-level admission coordinator with separate asset, decoded-art, lesson-body and prepared-sheet
caches. Priorities: input/current frame; requested navigation/current lesson; visible art; directional
nearby coverage; speculative preparation. Bound downloads, decoding and construction independently.
Account for replacement overlap and temporary work, not just the final resident set.

Always pin current input, focus, unsaved state and pending persistence. If a mandatory lesson exceeds
its normal allowance, evict speculation and optional scenery and use a foreground reserve. Never wait
forever for a budget admission that cannot happen. Persisted learning state belongs outside evictable DOM.

### Continuity contract

The last valid visible coverage is retained until replacement coverage can be presented. A replacement
is complete only when its assets are usable and its composition is ready, not merely when fetch ends.
Cold startup may show the designed loading surface before coarse coverage exists; subsequent refinement
must not reveal an accidental blank. Coverage itself is budgeted and can be coarse.

Use stable tile identity, detail-level hysteresis and a small directional buffer. Do not preload the
entire corridor of a long flight. Replace coverage locally and atomically; avoid global opacity pulses,
restarting animation, double-drawing translucent terrain or changing camera position when assets arrive.

Scene handoff follows prepare -> present/move -> commit -> release. At most the outgoing visible
coverage and bounded incoming first frame overlap. Transfer input and focus once. Keep lightweight
return anchors rather than keeping every old scene alive. Coalesce state changes during movement;
apply the latest compatible state without letting an obsolete result replace it.

### Progress and lesson-world composition

Prototype neutral/coloured tile composition at a real reach boundary. Do not place a country-sized mask
over the new tiles. Uniform regions bypass unnecessary masking; boundary regions preserve feathering,
closed-island exclusions and ordering. Account for both colour layers and any intermediate surfaces.

Lesson-world layout remains driven by actual measured content. Use stable row-relative scenery sections
and local path segments so earlier height changes translate later sections without regenerating their
decorations. Reuse static textures/sprites by visual recipe, independent of grade/lesson count. Keep
semantic lesson-specific art attached to the correct canonical lesson. Preserve read anchors during
measurement, rotation, grade changes and returning to a world.

## Execution phases and completion gates

### 0. Freeze a trustworthy baseline and measurement harness

Capture current desktop visuals and camera trajectories for manual selection, flight, landing, entry,
return, lesson preparation/scrolling, grade switches and preview fitting. Preserve all unrelated working
changes; no worktree, stash, reset or broad staging. Inventory all map consumers and their lifetimes.

Extend existing diagnostics with build/content identity, scene identity, camera/transition identity,
coverage gaps, tile states, decoded byte estimates, live art/animation counts, pending jobs and lesson
residency. Use bounded local logs without private lesson answers. Separate actual page reload from scene
remount, browser rendering loss and normal imagery refinement. Use physical device reports/remote
inspection where available; missing browser memory APIs must not prevent testing.

Gate: repeatable flows and saved baselines, with current physical failure documented when reproducible.
Do not run multiple browser benchmarks simultaneously on the same machine.

### 1. Extract metadata and define ownership contracts

Introduce manifest/scene/resource interfaces and generated metadata, preserving the old renderer behind
an adapter. Separate overview, entrance and lesson drawing dependencies. Audit fulfilled promise maps
and cache keys, including pack, source/session, layout and motion inputs. Establish pressure/reserve
accounting and cancellation tests before connecting new assets.

Gate: geometry matches existing recipes; no all-world drawing import is needed just to discover bounds;
permissions and canonical lesson selection are unchanged. No initial bundle-budget increase is accepted
by raising the budget.

### 2. Build one representative asset set and choose the backend

Export a complex coast containing hatching, roads, an island exclusion, a progress edge and a changing
landmark, plus full-atlas coarse coverage and one lesson-world scenery section. Baseline remains available.

Compare bounded image elements under our camera with ONE established image-viewer candidate. Start the
integration assessment with OpenSeadragon; choose OpenLayers instead if its local-coordinate/layer adapter
is materially cleaner. This is a bounded spike, not two complete production engines. Assess whether the
candidate can consume our camera without gesture duplication, preserve accessible overlays and release
resources. If it cannot, document rejection rather than bending the product to its assumptions.

Select by physical stability, worst-frame timings, startup/decode cost, estimated/observable memory,
visual parity and maintenance complexity. If simple image composition is the measured bottleneck,
evaluate a viewport-sized canvas/WebGL adapter using the same assets. Do not assume GPU acceleration
alone fixes memory. Context-loss recovery is mandatory if that backend is selected.

Gate: selected backend and decision record; no seams, progress errors, blank replacement frames or
desktop interaction regressions in the representative case. If the physical device is unavailable,
continue engineering with a provisional backend decision and clearly record the unverified assumption.
Physical validation remains a mandatory final release gate; emulation cannot satisfy it on its behalf.

### 3. Complete the shared atlas

Extend the chosen renderer across all terrain and fixed scenery, with bounded dynamic landmarks and
stable labels/hit targets. Integrate load priorities, pinned coarse coverage, resolution adaptation and
suspend/dispose. Camera movement and flight must use the same coverage service. Add version-safe assets,
bounded retry and a conservative renderer fallback. A fallback cannot reconstruct the known-heavy SVG
atlas on the affected device or enter a reload loop.

Gate: all worlds and supported visual states match; repeated pan/zoom/flight resource use plateaus;
automated visual continuity tests pass at detail boundaries, including delayed and failed tile loads.

### 4. Complete world interiors and scene handoffs

Apply bounded scenery to long original collections and short grade journeys, preserving live lessons.
Integrate entry/return with the shared transition owner and existing destination preparation. Retain the
manual zoom floor and background/text gesture semantics. Tie lesson request priorities to intent and
visible reading, not every crossed world. Pin active lessons and safely release distant prepared content.

Gate: no camera or decoration jumps after preceding sheets load; correct destination, grade and lesson;
no duplicate progress/rewards; focused/unsaved interaction survives supported transitions. Slow-network
loading/retry remains legible, dismissible by navigation and free from stale-result replacement.

### 5. Apply to every consumer and future-world workflow

Migrate parent maps, child maps, sample overlays, marketing journey maps, cards and decorative backgrounds.
Keep the candidate opt-in during development and the current desktop path available for comparison;
enable production defaults only after acceptance. Avoid permanent parallel product implementations.
Static cards use composition-specific images. Animated previews use reversible visibility lifetimes.
Multiple scenes share pressure accounting; focus/active work takes precedence over decorative animation.

Document adding a world: authored recipes -> generated metadata/assets -> state variants -> content
membership -> parity/coverage tests. New grades/lesson memberships reuse visual assets. No renderer import
list, giant atlas rebuild at runtime or per-child tile generation should be needed for content extension.

Gate: every consumer inventoried in phase 0 is migrated or explicitly static; offscreen resources release;
five embedded maps do not each receive an independent full memory allowance.

### 6. Integrated validation and release preparation

Run appropriate unit/browser checks and full repository checks including build budgets. Preserve current
snapshot references until changes are visually reviewed; do not accept blanket regeneration as proof.
Prepare a physical-QA build and concise test instructions. User manual QA is the final release gate.
Commit/push/deploy only through separately authorized release coordination.

Gate: known supported-device failures resolved or explicitly blocking release, desktop parity demonstrated,
and rollback/fallback tested. Do not label physical mobile memory issues solved based on a simulator.

## Acceptance and test matrix

Provisional engineering budgets, calibrated after baseline: 4 ms optional work slices with oversized
tasks subdivided; 16–24 MiB estimated decoded scenery per active page allocation, including replacement
reserve; roughly 2 million backing pixels per active canvas where applicable. These are starting caps,
not measured browser memory limits. Lesson resources have a separate foreground allowance. DPR must not
silently multiply budgets. Aim for 60 fps on the desktop baseline and at least 30 fps sustained on the
physical baseline; also record p95/p99 frame duration and stalls over 100 ms so averages cannot hide jank.

Required behaviour gates:

- Zero unintended coverage holes/whole-scene flashes in recorded refinement and handoff tests. Camera
  trajectories, art positions and lesson anchors remain stable; compare captured pixels as well as DOM.
- No unexpected document reload, crash or unrecoverable blank scene during physical repeated visits.
- Ten minutes of exploration and 20 scene open/close cycles settle to bounded residency; zero owned scene
  jobs/listeners/animations after disposal. Browser memory may not fall immediately; ownership metrics
  and process observations must be distinguished.
- Map controls become usable before fine detail; no speculative lesson bodies merely from atlas pan.
  Record cold/warm time to coarse map, controls and usable lesson separately; freeze numeric latency
  thresholds after measuring phase 0 rather than inventing universal network guarantees.

Matrix: desktop Chrome plus Safari/WebKit coverage; physical iPhone 17 Pro Max / Chrome (reported failure)
and Safari comparison; an older Android and tablet when available. Include portrait/landscape, high DPR,
browser zoom, minimum/maximum map zoom, reduced motion, touch pinch, wheel, keyboard, text selection and
screen-reader/focus flows. Use cold/warm caches, delayed/out-of-order requests, offline/error/retry,
rapid enter/back/grade changes, background/foreground, resize during preparation, multiple visible maps,
pack/session/sign-out changes and stale-deployment asset failures. Inject context loss if using WebGL.

Use existing `map-continuity`, `map-resources`, `map`, `kid-map`, `world-scope`, `world-overview`,
`world-journeys`, `child-journey`, `world-zoom` and `sample-roll` browser suites as foundations. Update
assertions only for approved intended behaviour, never to hide missing scenery or lost interaction.

## Main code ownership

- Build/metadata: `school/worlds/art.ts`, generated metadata module and `tools/scripts` export tooling;
  entry dependencies in `apps/home/school.ts`, `apps/site/ground.ts`, `apps/kids/views.ts`.
- Scene/render adapters: `engine/ui/map.ts`, `map-surfaces.ts`, `overworld.tsx`, `scenery.ts`, `world.tsx`.
- Camera/continuity: `engine/ui/view.ts`, flight modules and a shared transition owner. Keep existing
  physics and user controls unless evidence identifies a required correction.
- Resource coordination: `scene-work.ts`, `paper.ts`, drawing/source caches and new tile ownership code.
- Consumers: parent map, child inside/map, sample overlay, site page/backdrops. Do not mix auth, calendar
  or painting changes into renderer edits.

## References and unresolved decisions

[MapLibre architecture](https://github.com/maplibre/maplibre-gl-js/blob/main/ARCHITECTURE.md),
[tile retention implementation](https://github.com/maplibre/maplibre-gl-js/blob/v5.6.0/src/source/source_cache.ts),
[OpenSeadragon pyramid controls](https://openseadragon.github.io/examples/tilesource-flexible-pyramid/),
[OpenLayers image coordinates](https://openlayers.org/en/latest/examples/static-image.html),
[PMTiles storage](https://docs.protomaps.com/pmtiles/),
[WebGL resource guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices),
[Google fallback behaviour](https://developers.google.com/maps/documentation/javascript/webgl/support).

Still measured decisions: exact physical failure cause; final backend; tile dimensions/encoding/detail
levels; implementation of local progress composition; calibrated budgets and supported-device floor.
These have bounded prototype gates above. Curriculum gaps and content authoring remain separate work.
