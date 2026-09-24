# Mobile map stability and visual continuity

Status: implementation and validation in progress, 24 September 2026. Extends
[the shared-engine execution plan](map-loading-plan.md). The user reports continuing crashes
on iPhone 17 Pro Max in Chrome and intermittent flashes during flight after the residency changes.
Neither process termination from memory pressure nor the flash's cause has been established.
Exact iOS/Chrome versions and whether a flash resets flight remain to be recorded.

## Baseline before this implementation

- `engine/ui/map.ts:paintTerrain` still creates a country-sized SVG and broad nested masks.
  Paper-canvas limits do not bound those surfaces or browser-owned compositing allocations.
- `apps/site/page.tsx:JourneyMap` and `MapPicture` still retain full scenes after first approach.
- `engine/ui/overworld.tsx:drawNow` stops flight, releases pieces and clears the world before
  awaiting construction. A `props.view` identity change schedules this path. This can produce
  a discontinuity, but its occurrence during the reported flight is not yet measured.
- `paintNear` has separate spatial admission/release margins, but a single `minZ` threshold
  for admission and eviction. Zoom near a threshold can repeatedly recreate details. Piece
  bounds also need comparison with actual art, shadows and movement, rather than assumed bounds.
- `engine/ui/art.tsx:onDemand` now avoids reloads after `beforeunload`, but still reloads an
  active page after any rejected load. That is a possible true reload path, not proof of this report.
- `CanvasView.sizePaper` reallocates grid canvases when scene membership or dimensions change.
  Clearing and repainting is synchronous; measure whether it contributes to visible discontinuity.

## Product invariants

The selected world, camera, flight state, focused control, lesson seed, answers and pending
persistence are independent of artwork residency. No quality change may reset them. Keep
permissions and hit targets available regardless of illustration detail. Preserve the existing
art source, reach-mask ordering, seasons and rewards; recreated art must not replay rewards.

Normal pan, zoom, flight and background preparation must never clear the visible scene or
silently reload the document. Keep a complete coarse view while finer artwork is unavailable.
Memory pressure reduces optional detail before responsiveness or learning correctness.
Browser/OS process termination cannot be ruled out absolutely; recovery must preserve durable
learning state, and acceptance requires evidence on the actual affected device.

## Stage 1: classify both failures

Add opt-in, bounded diagnostics with document/scene generation IDs, reload reasons, view-update
reasons, camera and flight lifecycle events, piece admission/eviction, graphics estimates and
frame gaps. Record explicit reload intent before requesting it. A small local breadcrumb buffer
may survive reload; include no lesson answers, names or other private content. Avoid per-frame
storage writes and unbounded logs. Cross-check with device inspection/termination reports.

Replay fixed routes: stationary map; identical coastal flight at several speeds; repeated zoom
across detail thresholds; rotation; hide/resume; world entry/return; marketing scroll down/back.
Distinguish document reload, scene reconstruction, detail popping, grid replacement and compositor
failure. Frame captures must supplement counters because DOM stability does not prove pixel stability.

Gate: identify which event accompanies each reproduction, or retain it explicitly as unresolved.
Do not claim the flash or crash fixed merely because one route passes.

## Stage 2: controlled layer isolation

Provide diagnostic variants for static terrain with live controls, ambient animation disabled,
broad masks bypassed, and one scene versus several scenes. Change one variable at a time on the
same route. These variants diagnose the failure and are not permanent feature removals.

Gate: identify the smallest problematic configuration and choose the next rendering experiment
from the evidence. Do not broaden all optimization work before this result is reviewed.

## Stage 3: continuous scene updates and safe recovery

Keep scene identity stable for camera/flight movement. Apply progress and other model changes
incrementally; distinguish a meaningful layout revision from a fresh object with unchanged data.
Coalesce superseded queued draws, use revision checks for asynchronous results, and dispose stale
results. For necessary replacement, prepare within a reserved budget and swap only when ready.
Never retain two complete high-detail scenes to hide a transition; a coarse fallback is the bridge.

Add separate zoom entry/exit thresholds and validate conservative piece bounds, including animated
extent. Pin visible and interactive layers. Adapt a bounded look-ahead buffer to flight direction
and speed without fetching lessons for every place crossed. Retain deterministic seeds and
stable layer ordering when pieces return. Prevent canvas allocation churn during gestures.

Replace blanket active-page reload recovery with classified failure handling: retry recoverable
requests, keep the current scene and expose a quiet retry state, and offer an explicit refresh
for unrecoverable deployment changes after protecting unsaved work. Keep the navigation-abort fix.

Gate: forced slow loads, stale results, repeated threshold crossings and model updates produce no
empty scene, camera reset, flight restart or automatic document reload.

## Stage 4: bounded terrain and scene ownership

Compare local disposable SVG tiles and generated image tiles for one complex coastal region,
including reach masks, an island, a changing landmark and progress transition. A clipped wrapper
around the existing country SVG is not the bounded implementation. Measure surface dimensions,
construction, decoding, frame cost and image fidelity on the phone before choosing the backend.

Use the selected backend across atlas and world interiors, retaining coarse coverage until fine
coverage is complete. Bound resident resources and overlap across the document, not per map alone.
Start with the provisional budgets in the shared-engine plan and calibrate against device evidence.
Keep decoding, optional construction and speculative lessons behind input and foreground lessons.

Marketing scenes get reversible visibility lifetimes, with lightweight images for decorative cards.
Unmounted scenes retain small camera/selection state and can reconstruct without a blank entrance.
This work applies to parent, child, marketing, preview and pre-auth surfaces through shared contracts.

Gate: resources plateau over repeated exploration; no full-country masked surface remains; the
affected device survives both the single active scene and multiple-surface journeys.

## Stage 5: cross-surface acceptance and release

Run the original repro and a ten-minute journey on the user's iPhone in Chrome, Safari for
comparison, an older phone/tablet and desktop. Include slow/offline networks, cold/warm caches,
rotation, background/foreground, reduced motion, failed assets and session changes. Exercise
twenty overlay cycles and repeated lesson edits/return without lost work or replayed rewards.

Record controls-ready, first usable lesson, frame-time percentiles, long gaps, active scene and
piece counts, owned graphics estimates and process memory when available. Target at least 30 fps
on the agreed baseline, with separately measured stalls; averages alone cannot hide flashes.
Automated tests must preserve centering, flight controls, access, real lesson content and focus.

Each stage ships as a separately reviewable local/test build with a short phone QA route and a
results record before progressing. Keep changes reversible. Do not silently fall back to the
known crash-prone renderer. No new service, database schema or replacement art source is assumed.

## Implementation record — 24 September

The working tree contains a shared stability implementation, not a completed replacement tile engine.
No application changes were committed or deployed by this session. Concurrent authentication and
game changes remain owned by their sessions.

### Implemented

- `map-surfaces.ts` gives atlas terrain and world stretches explicit, viewport-bounded SVG roots
  and mask regions, with unique definition IDs. A small guard band (at most 96 CSS pixels per
  side, also limited to one eighth of either viewport dimension) reuses the painted window during
  movement. The window renews before exposing an uncovered edge or exceeding 10% scale drift.
  CSS surface width/height stay below 1.375 times the viewport dimensions. This is a bound on
  owned geometry/surface dimensions, **not** a measured GPU-memory guarantee.
- The actual child route, `Place`, uses the same stretch ownership and a viewport-sized known-land
  fade instead of a mask spanning the entire lesson trail. Scenery remounts use deterministic
  seeds and do not replay celebrations within the same visit.
- Atlas place/road compositions now release their appended roots and animation registrations.
  Both world paths release stretch pieces as well as ordinary drawings. Current reach-mask rims
  replace previous rims rather than accumulating hundreds of old frontier states.
- `scene-work.ts` shares a roughly 4 ms optional scenery allowance across scenes, schedules on
  animation frames, and cancels queued work when its scene leaves. A returning scene goes behind
  already waiting scenes. World arrival no longer bypasses batching to paint all nearby decoration
  synchronously. A single indivisible drawing can still exceed the allowance; this is not a hard
  frame-time guarantee or a replacement for future smaller rendering units.
- Atlas model updates are fingerprinted, coalesced and revision checked. Replacement construction
  keeps the existing scene visible. Both flight startup and active flight defer replacement;
  the landing drains the latest pending model. Equivalent models do not reconstruct the scene.
  Panning does not rewrite inherited zoom variables on every frame; tiny spring tails are rounded
  for those visual style variables only, preserving the camera's precise position and zoom.
- Failed dynamic imports no longer automatically reload the document. Map/world requests expose
  retry states, failed module requests can be retried, and stale async results are discarded.
  This preserves unsent work; it does not promise that a removed deployment asset can be recovered
  without an explicit page refresh.
- Marketing journeys, map cards, opening backdrops and lesson-roll previews have reversible
  visibility lifetimes. They unmount outside a small approach margin and while hidden. Snapshot
  fallbacks remain for the existing decorative mobile opening. Preview roll ownership releases
  measurements on leaving, stale completion, replacement, partial failure and unmount.
- Lesson body caches are scoped to their source and bounded by count and estimated JSON weight.
  In-flight promises leave the dedup table after settlement, so eviction actually releases cache
  references. Oversized requested lessons are delivered without being retained as speculative
  cache entries. Parent school models distinguish motion mode and pack identity. Unclaimed
  prepared sheets have both count and DOM-weight limits; active lesson roots and answers are not
  put into this eviction policy.
- Flight keeps fields/sights as lightweight gameplay metadata while distant visual fields, sights,
  stars and clouds are excluded from rendering. Flight physics, landing choices, steering, zoom
  range and controls are unchanged. The experimental ambient-motion suspension was removed;
  production still retains its ambient animation behavior.
- Zero-sized/tiny viewport framing cannot produce a negative zoom.

### Diagnostics and reproducible checks

`?mapDebug=1` loads optional diagnostics on demand, outside the initial map bundle. It records a
bounded 96-event history, scene/model/flight events, camera frame gaps with JavaScript work time,
owned canvas pixels and SVG surface dimensions. Storage writes are throttled to at most once per
five seconds of events, plus page hide. No child names, lesson bodies or answers are included.
“Copy map report” includes the current report and the previous document's stored report; clipboard
copy needs HTTPS or localhost. Close an open native dialog to reach that diagnostic button. A
process kill may lose the last five seconds; storage may also be unavailable.

`tools/scripts/map-profile.ts` runs marketing traversal, 20 overlay open/close cycles and a chosen
flight duration. It writes JSON and a screenshot to the OS temporary directory. Examples:

```
node --import ./tools/scripts/resolve.ts tools/scripts/map-profile.ts --webkit --seconds=600
node --import ./tools/scripts/resolve.ts tools/scripts/map-profile.ts --seconds=30 --quick
```

`--headed` opens a visible browser. `--layer=no-masks`, `no-motion`, `terrain`, `no-filters`,
`no-terrain`, `no-art`, `no-grid`, and `plane-only` are diagnostic isolation cases. `no-motion`
now disables ambient motion while preserving continuous flight; an earlier comparison also disabled
continuous flight and is **invalid as evidence about ambient-animation cost**. `--promote` and
`--layer=raster-window` are limited compositor/image experiments. The raster window is a frozen
harbour terrain image, not a working tile renderer or a visual-equivalence acceptance test.

### Evidence and remaining gates

- All 48 desktop and phone-WebKit map/child/resource browser cases passed in
  `/tmp/map-stability-complete-e2e.log`. They cover real lessons, subject worlds, locked places,
  navigation, retries, cancellation, flight zoom, scene continuity, bounds, repeated disposal,
  marketing release and both motion preferences.
- The 30 targeted pure tests passed for geometry, weighted preparation, body-cache ownership and
  the shared scene queue. All 29 tooling checks passed, including startup budgets and snapshot
  fidelity, without raising a budget or replacing reference images to conceal a difference.
- A ten-minute WebKit run completed 20 open/close cycles with no page error and one unchanged
  document identity. Each overlay closure returned to zero live maps and zero owned paper pixels;
  returning to the marketing opening also returned to zero. During flight, map DOM varied with
  location (3,274–6,699 nodes) instead of retaining every visited place. This run preceded the
  final guard-band/scheduler refinements and must not be represented as final-device certification.
- A 30-second Chrome run at 430×932 and DPR 3 recorded 3,423 RAF frames, p95 interval 10 ms,
  three gaps above 50 ms and a 158 ms maximum. This is a local machine/browser result.
- **Continuous flight in local WebKit remains below the performance target.** Several short runs
  produced roughly 3–10 fps, with frame-gap p95 above the histogram's 250 ms ceiling. JavaScript
  flight work was around 0.13–0.19 ms and sampled camera work rounded below 1 ms. A blank WebKit
  control produced 174 frames over three seconds. A headed run was also slow. Isolating terrain,
  art, paper, filters, ambient motion, compositor promotion and one frozen terrain image has not
  established a production rendering solution that meets the target. Do not call this solved.
- These are browser observations, not an iPhone crash log or a measurement of WebKit/GPU process
  allocation. The user's physical iPhone 17 Pro Max / Chrome remains the crash acceptance device.

The original backend gate remains open: a bounded SVG viewport still retains canonical global
path geometry. It is **not** the genuinely local SVG-tile or multiresolution image-tile renderer
specified in the broader plan. The limited image experiment does not justify claiming that gate
passed. Generated dimension/dependency metadata, removal of all-world drawing imports, a full
resource admission ledger, calibrated decoded-image budgets and the remaining stateful journal
migration are also not implemented by this stability pass. The plan is not complete until those
applicable gates and physical-device acceptance have been satisfied.

### Final local validation for this pass

`LUMISCHOOL_REQUIRE_DB=1 npm run check` completed with exit 0 on the final shared tree;
log: `/tmp/lumischool-map-stability-verified-check.log`. This includes typechecking, lint,
formatting, boundary checks, database/server/engine/school/tool/app tests and both production
build guards. The final focused flight recheck passed 10/10 desktop/phone-WebKit cases in
`/tmp/map-stability-final-flight.log`. No budgets were raised, no authentication/game files were
changed by this session, and nothing was committed, pushed or deployed.

For the physical acceptance pass, use the build containing these changes and append
`?mapDebug=1` to `/home` or `/map`. Exercise marketing scroll down/back, the sample overlay,
child and parent world entry/return, slow and fast flight, pinch/zoom limits, landing, rotation,
and background/resume. After a crash/reload, copy the report before another long session replaces
the previous-document report. The report distinguishes a new document from a scene replacement;
it does not diagnose an OS termination reason. Device crash/termination evidence is still needed
if the process is killed. A simulator or the local browser runs are not substitutes for that gate.

## Reproduced camera flash, 24 September follow-up

A visible Chrome run at 1978 × 1140, DPR 2 reproduced the reported blank frames
when alternating steering and flight zoom. Straight flight alone did not reproduce it.
CDP screencast frames show the coloured map and labels disappearing while the grid,
plane and controls remain. The baseline recording had 16 blank frames in 758 frames.
This is a presented-frame failure; checking connected DOM nodes alone missed it.

Controlled comparisons on the same route:

- Paint containment on the host: 8 blank frames in 781 frames.
- Promoting the host: 21 blank frames in 780 frames.
- Retaining the transformed camera layer: 0 blank frames in 1728 frames.
- Retaining that layer with a local viewport clip: 0 blank frames in 1577 frames.
- Shared `CanvasView` implementation, with no injected styles: 0 in 1579 frames.

The fix retains the camera layer with `will-change: transform` and clips its contents
to the visible world rectangle plus a 96 CSS-pixel margin on each side. The camera
updates the clip together with its transform, including during resize and zoom. This
applies to Overworld, World and Place; disposal still removes the entire layer, and
scenery eviction remains enabled. No new full-map bitmap or second scene is retained.
These comparisons support camera-layer compositing as the source of the reproduced
flash; they do not prove the cause of the physical iPhone crash.

`tools/e2e/map-continuity.e2e.ts` captures presented Chrome frames during steering and
zoom and detects loss of the land/sea colour wash. It decodes the frames after capture,
so inspection does not compete with animation. The resource test also checks that the
camera clip remains viewport-sized through flight zoom and rotation. Compositor layer
bounds are not GPU allocation measurements: physical-device memory acceptance and the
remaining terrain backend work are still open.

The regression test was also run with the fix disabled: visible Chrome detected six
blank frames and failed, while the same case passed headless. The test therefore
explicitly uses a visible Chrome window (a display is required) rather than claiming
headless coverage of this compositor failure. With the fix enabled it passes.

Validation for this follow-up: 48 map/lesson/resource cases passed across desktop Chrome
and phone-sized WebKit, plus the visible-Chrome frame regression case. Type checking,
lint, app tests, startup budgets and both build checks passed. The single regenerated
country-harbour-centered snapshot was visually reviewed and its comparison passes.
The full check is not green: a concurrent change to `apps/site/page.tsx` introduced
`phoneOpening` (6000 units, vertical anchor 0.68) while the mobile marketing comparison
still uses `OPENING.narrow` (4600 units). The saved comparison images show that framing
mismatch; it is preserved for the marketing work's owner, not hidden by raising a tolerance.

## Manual zoom follow-up

Close manual zoom around the crystal caves exposed a remaining terrain dropout. Visible
Chrome capture reproduced two frames where the terrain vanished while the landmarks and
description remained. Promoting the terrain in addition to the whole camera layer did not
solve it; that comparison recorded eleven failing frames. These results identify a rendering
layer interaction, not the precise internal browser failure or the physical phone crash cause.

The atlas now retains only its bounded terrain SVG, with `will-change: transform`, and
overrides the camera container's promotion to `auto`. The local camera clip and terrain
viewport/mask bounds remain. World and Place keep their existing camera-layer behavior.
No art, permission, camera range, progress or input behavior changes.

The presented-frame regression now covers flight, repeated 2x manual zoom around the
crystal caves (the approximate screenshot scale difference), and a closer manual-zoom
stress case. Each passed twice with the revised layer ownership. Manual cases additionally
inspect four corner regions for partial rectangular loss of terrain, rather than relying
only on the average colour of the entire viewport. Frame totals and detected dropout
indices are attached to each test. Visible Chrome remains necessary for this regression.

Validation: the three presented-frame cases passed again with corner inspection enabled
(the close case needed a retry after an unrelated sign-in-code timeout before map entry).
Ten Chrome/phone-sized WebKit checks passed for gestures, terrain eviction and reconstruction,
surface bounds during flight/resizing, and flight/landing with normal and reduced motion.
Type checking, lint and formatting of the map changes passed. The full repository check
stopped at formatting of concurrently edited `school/games/sling.ts` and
`school/games/sling-challenges.ts`; those files were not changed for this fix.
