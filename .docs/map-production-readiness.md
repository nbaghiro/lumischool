# Map rendering: terrain continuity and production readiness

Status: rendering hardening implemented and released to production for testing on the live app.
Physical-device certification has not been done. The original investigation below was audited
against `23f9caa679482878fff7d0c72e5db111f39bf69d`. This extends the contracts in [map-loading-plan.md](map-loading-plan.md)
and [map-smoothness-plan.md](map-smoothness-plan.md).

## Implementation record

- Terrain sources register their logical coverage and conservative 822-unit ink bounds before
  construction. Successful empty drawings count as covered. Missing sources partition only the
  affected area. A ready neighboring region stays detailed during sharpening and new work.
- Preparation and presentation share viewport-capped render density. Backing dimensions round
  down so the four-million-pixel ceiling also holds for oversized CSS viewports.
- Baked and live marks have one spatial owner. Their premultiplied RGBA values interpolate once,
  using two reusable 512-square targets during transitions. Sharpening uses the same two-source
  image operation. Raster terrain LODs retain their previous grid for a 150 ms transition, with
  disjoint crops across different tile grids. Raster-to-vector line changes use the bounded region
  compositor too. Reduced motion uses ready endpoints directly.
- Empty parent tiles no longer get requested every frame. Whole-image pixels remain available
  while a source switches to tiled rendering. A partial set of fine children cannot impersonate
  complete fallback coverage. Terrain requests use a 256-screen-pixel margin instead of tripling
  the viewport around large live landscape sources.
- Raster publication checks request identity, source revision, scene generation and live ownership.
  Allocation/upload succeeds before the incumbent is retired. Failed candidates retain the
  current drawing. Parking invalidates in-flight publication and drops queued decoded output.
- Construction, art uploads (including atlas mipmaps), and terrain uploads use the same document
  scheduler and its 4 ms allowance. A single indivisible upload can exceed that allowance; this
  is a scheduling bound, not a hard CPU-time guarantee.
- GPU cached textures have a shared admission ceiling: 192 MiB for the small-device policy and
  384 MiB otherwise, including atlas allocation and mipmaps. Offscreen eligible resources are
  reclaimed before admission fails. Visible incumbents are protected. Presentation targets and
  geometry are reported separately; they are not counted as free memory or silently included in
  the cached-texture cap. Parking releases framebuffer targets and shrinks the canvas backing.
- Decoded tile storage remains bounded to 24 MiB. Retained raster pixels keep their existing
  48/128 MiB bounds. At most four actual tile-worker decodes run, including abandoned active
  work. Both worker families have 20-second deadlines, error/message-error recovery and fresh
  worker state after replacement. Queued scene raster work is cancellable, and tile priorities
  can decrease when a lease is demoted or released.
- Preparation reports ready, timeout, cancelled or failed. In-place replacements preserve the
  incumbent unless preparation succeeds. Initial roll arrival retains its existing explicit
  progressive-arrival policy. Initial map settlement has a bounded timeout and retry surface.
  Terrain initialization retries three times. Handoff release handles are bound to their owner.
- Unclaimed handoffs dispose their scenes. Small devices release closed roll contexts; desktop
  retains at most one spare roll, with at most 96 MiB of cached textures. Parked scenes no longer
  protect recently visible pixels from that spare limit.
- Deferred roll preparation has its own bounded retry timer: a 160 ms camera-settle notification
  cannot strand work behind the 200 ms drawing quiet period. Canvas and lesson scene resizing
  coalesce into animation frames, preventing WebKit ResizeObserver feedback errors.
- Optional scene-lifetime policy loads separately from the initial page. The site journey observer
  uses viewport-height pixels for its vertical center band; IntersectionObserver percentage
  margins otherwise use width and can collapse that band on wide windows.

### Verification record

The durable coverage, grid-refinement, memory-admission and queue tests live beside `engine/ui/`.
`tools/e2e/map/rendering.e2e.ts` exercises the actual application and a small real-WebGL fixture:
fixed-camera refinement, premultiplied pixel comparisons, allocation refusal, stale handoffs,
worker replacement, failed terrain-index recovery, and 20 map/roll cycles with balanced disposal.
Set `MAP_SOAK=1` on its twenty-visit test to add ten minutes of mixed zooming and attach memory
samples. The existing map resource and navigation suites remain part of verification.

Before the final LOD/budget changes, all six new rendering/recovery checks passed in desktop
Chromium and phone WebKit. They were not run again on the released code, and no memory results have
been measured, so the release relies on `npm run check` and on testing the live app.
The initial application baseline's Vite site-data error disappeared after restarting the local dev
server. Two existing site resource tests now wait for the same client-rendered bar marker used by
the site suite, so scrolling does not race replacement of prerendered DOM.

### Release limits

The resource figures above account for renderer-managed allocations, not browser/driver process
memory, source-object heap, compositor copies or thermal behavior. The cache caps are provisional
policies; physical low-memory iOS and Android testing remains a release gate. Phone-sized WebKit
is not an iPhone memory benchmark. No frame-time percentile or "blazingly fast" claim follows from
these correctness runs, especially while unrelated builds compete for this machine.

The raster-to-vector thin-line boundary now interpolates through the same compositor. Synthetic
transparent-ink tests cover its blend fractions, but those tests do not certify perceptual
equivalence for every real-art mask and zoom. The device/visual matrix at the end remains the
release checklist, not a claim that every listed combination has been exercised.

## Original investigation and plan

## The immediate defect and its cause

Coarse landscape marks can return after detailed landscape is already visible because terrain
visibility follows the scene's workload rather than the availability of replacement terrain.
In `map-scene.ts`, the last argument to `ground.draws` is:

```ts
wanting > 0 || queue.length > 0 || decoding > 0 || fetching > 0
```

In `map-tiles.ts`, that argument drives the global opacity of baked landscape marks:

```ts
const aim = !close ? 1 : !drawing ? 0 : blotted ? BLOTTED : 1;
```

`BLOTTED` is 0.4. Any new work can therefore raise coarse marks from zero to 40% or 100% opacity.
That includes sharpening an existing texture, preparing a different drawing and work outside the
visible landscape. The old detailed texture can still be valid and displayed throughout.
The 150 ms fade softens the symptom but does not correct the decision.

The required invariant is spatial: **once a region has usable detailed terrain, unrelated work
cannot restore coarse marks over it.** New regions may need coarse fallback. A graphics-context
loss really does invalidate GPU coverage. Deliberate zoom-out may choose baked terrain again.
One permanent scene-wide flag cannot distinguish these cases.

## Evidence and limits

The isolated browser fixture mounts the actual `Overworld`, country model, drawings, worker and
terrain assets. It adds a diagnostic zoom hook and records the terrain decision every frame.
Chrome ran at 1440 by 900 CSS pixels with DPR 2. The renderer used effective density 1.75682
because of its four-million-pixel canvas target.

| Experiment | Result | Interpretation |
| --- | --- | --- |
| Fixed zoom 0.12 | Coarse opacity reached zero, then rose again while the camera stayed fixed. | A switch can occur without another user zoom. |
| Fixed zoom 0.16, approached from both directions | Coarse opacity returned to 0.4; the recorded pulses lasted about 0.86 and 0.90 seconds. | Existing fine art does not stop fallback from returning. |
| Four wheel-zoom runs across 0.055 to about 0.126 | 30 sharpening events, four ground-level switches, zero counted redraws, mutations or lost drawings. | Quality changes exist even when the current lost/redrawn checks pass. These counters do not prove pixel continuity. |
| Controlled intervention: ignore only the workload argument after the close threshold | Both 0.16 stops kept coarse opacity at zero. All 161 sharpening events in the full zoom sequence still occurred. | The workload dependency causes the coarse-opacity regression; stopping sharpening is unnecessary to remove it. |
| WebKit repeat at 390 by 844 CSS pixels, DPR 3, effective density 2 | Both original 0.16 stops rose to 0.4; both control stops stayed at zero while art work remained pending. Neither variant reported a page error. | The mechanism also reproduces in phone-sized WebKit, without the desktop density mismatch. This is browser emulation, not physical-device validation. |

The intervention is a causal test, not a shippable fix. It can remove fallback before detail is ready
on a cold or newly exposed region. It does not fix duplicate ink at lower zoom or art compositing.
Both Chrome variants completed 51 samples without a page error. Request/cache timing was not held
identical, so raster totals and scene timing are not an A/B performance benchmark.

The probe scripts behind these results were temporary and are not kept. The important cases now live
in `tools/e2e/map/rendering.e2e.ts`. The ordinary application browser baseline currently
hits a site-data validation error before the map, so fixture results do not certify full product
navigation. Repair that baseline before relying on the application release matrix.
The WebKit repeat supplied the mobile viewport metadata explicitly and recorded the actual host
dimensions.

## Other confirmed mechanisms and remaining risks

| Priority | Finding and source | Confidence and consequence |
| --- | --- | --- |
| P0 | Global workload controls baked marks: `map-scene.ts`, `map-tiles.ts`. | Reproduced and causally isolated. Fine-to-coarse regressions occur during ordinary zoom. |
| P0 | Preparation uses `landscapeZoom(glDensity())` in `map.ts`, while drawing uses viewport-capped density in `map-scene.ts`. | Confirmed code and measured densities. At this desktop size live preparation starts near 0.06844; the terrain base threshold is 0.07791 and its fade threshold is 0.10128. Live art can draw while baked marks remain fully visible. |
| P0 | Detailed landscape and baked marks do not share a single visibility owner. `paintNear` also retains live pieces down to 0.85 times their preparation threshold. | Confirmed code. Preparation, retention and presentation are conflated. The overlap depends on zoom history; simply aligning one threshold is insufficient. |
| P1 | During sharpening, `want` draws the old texture at full opacity and overlays the new texture with increasing opacity. `gl.ts` uses premultiplied source-over blending. | Confirmed compositing mechanism. Matching half-transparent texels can approach 0.75 opacity before returning to 0.5 when the old texture disappears. The actual visual magnitude across production art still needs pixel tests. |
| P1 | Ground LOD swaps the whole visible level when ready or after 1500 ms. Raster thin lines also switch to geometry at the lines level. | Confirmed code and counted level switches. Discrete sharpness changes are expected under this policy. Their perceptual severity varies by camera and region. |
| P1 | Live art changes resolution in powers of two; after 200 ms without camera movement the sharpness threshold tightens from 2.1 to 1.05. | Confirmed and measured sharpening. The resulting refinement is intentional; repeated visible changes and unnecessary work need separate gates. |
| P1 | A source temporarily given up after failures stops contributing to `wanting` in `map-scene.ts`. | Confirmed code. An idle queue also cannot prove that required live terrain exists. Failure must retain fallback instead of being mistaken for successful coverage. |
| P1 | `map-scene.ts` releases or detaches the current texture before replacement upload has succeeded. | Confirmed failure path. If allocation/upload fails, a usable incumbent can be lost. Replacement must be allocated and validated before publishing it and retiring the incumbent. Reproduce with injected upload failure. |
| P1 | Raster publication checks leaf membership, but does not reject a mismatched source version before replacing pixels or accepting empty output. | Confirmed missing publication guard. Mutation/context-recovery races require explicit request and context generations; stale-result corruption has not been reproduced in the zoom fixture. |
| P1 | `prepare(): Promise<void>` resolves on readiness, timeout, supersession, parking and stopping. `handoff.ts` uses a global unversioned claim/release. | Confirmed contract ambiguity. Incorrect early release or a stale completion affecting a later transition is a risk to reproduce, not an observed failure in this zoom experiment. |
| P1 | Terrain initialization catches failure without recovery at the scene boundary. `settled` requires `ground.complete()` when a map view exists. | Confirmed failure path. Exhausting terrain initialization can leave readiness waiting without a successful terrain owner. Inject the failure to establish product behavior. |
| P1 | The tile decode worker has no error/message-error recovery or restart; its waiting entries are removed only by replies. The loader has a 20-second timeout. | Confirmed gap. The caller can time out while decoder bookkeeping persists; a dead decoder can poison later requests. This is not a claim that tile loading has no timeout. |
| P1 | Optional painting has a shared 4 ms allowance, art uploading 6 ms, and terrain uploading 4 ms. Upload/mipmap calls are indivisible. | Confirmed independent allowances. Their sum leaves little of a 16.7 ms frame for other work. It is a scheduling risk, not proof that every frame consumes all allowances. |
| P1 | GPU and CPU limits are distributed across terrain, art, atlas, decoded imagery and retained pixels; they are not one document-level admission limit. | Confirmed architecture. Transition overlap and several scenes need aggregate accounting. Configured maxima are not a measurement of actual memory use. |
| P2 | Tile queue priority is monotonically promoted by `Math.max`; the shared sprite queue has urgency but no scene cancellation API. | Confirmed policies. Abandoned speculative work can keep competing with current demand. Quantify before changing fairness and batching. |
| P1 | Main smoothness flow primarily fails on `lost`; other counters are reported. Continuity screenshots emphasize missing terrain. | Confirmed test gap. Those tests can pass while coarse marks return, ink darkens or LOD jumps. |

## Core fix: coverage controls presentation

Keep the existing WebGL renderer, deterministic terrain generator, tile pyramid, masks and art
assets. Add an explicit contract between the terrain painter, scene and terrain presenter. This
does not require a renderer replacement or pre-rendering the entire country at maximum detail.

### Register expected coverage before painting

Every landscape piece needs a stable terrain identity, logical region, conservative ink bounds,
layer roles and content revision. Register the descriptors before `paintNear` schedules their
creation. A region with no DOM yet must count as pending, not as an empty region that is ready.
Successful empty output must be represented explicitly so genuine empty sea/land does not wait
forever. Failed or cancelled output is never successful emptiness.

Keep content revision separate from GPU-context generation and desired raster scale. A zoom or
density change usually changes desired quality, not the identity of the terrain. A finer raster
being requested must not invalidate the usable raster already published for that region.

Use disjoint presentation regions in world coordinates, reusing existing grid/coverage helpers
where possible. The landscape generator currently uses 2600-unit pieces; the baked pyramid uses
a different grid. Their cells cannot be equated. The exporter allows 800 world units of landscape
overflow, and waves move by 22 units. A region's dependency set must include every source whose
ink or animated extent intersects it, including neighboring pieces.

### Publish usable coverage, independently of ideal quality

The scene reports which expected sources have a valid raster covering the required ink bounds,
for the current content revision and context generation. A retained lower-resolution live raster
is usable coverage even when a sharper one is queued. A texture must actually be live on the GPU;
a queued decode, a DOM node, a request completion or an already-evicted atlas slot is insufficient.

Track three different facts: source construction completed, usable coverage available for the
frame being submitted, and requested sharpness reached. Only usable coverage authorizes removing
the coarse fallback. Required live draws and the terrain fallback decision must be assembled into
the same submitted frame. Do not infer readiness from the previous frame's global queue counts.

### Give each region one representation owner

For a visible region, the selection is one of:

| State | Presentation | Permitted next steps |
| --- | --- | --- |
| Baked | The available baked marks cover the region; live work can prepare invisibly. | Begin promotion when all required live sources are usable. |
| Promoting | Both sources are retained for one bounded transition. | Finish promotion; reverse deliberately if the zoom band changes. Unrelated work has no effect. |
| Live | Live marks own the region. | Sharpen without restoring baked marks; demote for deliberate zoom-out or resource policy only after a fallback is ready. |
| Recovering | Context/resource validity was lost. | Use a valid coarse source or retained screen while rebuilding. Never pretend old GPU handles are usable. |

Do not allow baked marks to remain underneath freely drawn live marks. The presenter must clip
both representations to the same disjoint regions and choose or combine them exactly once.
Live landscape draws need explicit ownership metadata; CSS-class inference and aggregate leaf
counts are not the readiness contract. Generic landmarks, life and world drawings remain separate.

For the first core patch, an atomic region switch is acceptable if comparison tests show no gap,
double ink or changed geometry. That patch removes the reappearance defect but is not the final
smoothness release. The following compositing patch supplies the correct transition. The same
contract must cover waves, pencil marks and coloured marks, preserving their existing order and
reach masks. Inspect coasts and cross-region trees/ranges closely.

### Retain what is being shown

Pin the usable representation while it owns visible coverage and during promotion. Reserve space
for its replacement before starting work. Release the old representation only after the successor
has been submitted. Budget pressure removes optional preparation and offscreen retained art first.
If both representations cannot fit, postpone promotion or choose a complete bounded fallback;
never evict the current representation merely to attempt its replacement.

Apply this as an actual transaction in the art uploader: validate owner, request, content and
context generations; allocate and upload into a candidate; publish the candidate; then retire the
incumbent. On failure, dispose only the candidate and retain current coverage. Successful empty
output needs the same generation checks before it can clear old pixels.

A newly exposed region may show baked terrain while its already-detailed neighbor stays detailed.
Leaving and revisiting a region may require rebuilding it if it was genuinely evicted. A change in
content must prepare coherent replacement sources and masks, without altering the selected world,
camera, flight, reach semantics, focus, reward state or lesson state.

### Use one effective density policy

Compute effective render density from viewport, DPR and the supported pixel budget in one place,
then share it with LOD selection, preparation thresholds, raster targets and diagnostics. Decide
explicitly whether a CSS viewport larger than four million pixels may render below density 1;
the current clamp means four million is not an absolute cap in that case.

Separate preparation from presentation. Preparation starts ahead of the promotion band; retention
continues outside it; visibility follows region ownership. Use hysteresis for deliberate entry and
exit, expressed in projected pixels per world unit. Resize or DPR changes recalculate the target
quality without erasing current usable coverage.

## Correct compositing and stable refinement

For old and new premultiplied pixels, interpolate colour and alpha together, then composite the
result once over the map:

```text
replacement = (1 - t) * oldPremultipliedRGBA + t * newPremultipliedRGBA
```

Drawing the old image at full opacity and fading the new one over it darkens transparent strokes.
Drawing old at `1 - t` and new at `t` with two source-over passes is also wrong: it can thin them.
Add a two-source image operation for matching art bounds. Where terrain represents a group of
draws, first compose that region into bounded local targets, then mix the representations once.
Use the same world mapping, colour treatment, masks and wave phase on both sides. Never allocate
a country-sized transition surface. Account for targets in admission and release them on cancel.
Pool these targets and use them only for active transitions; stable terrain should not acquire an
extra offscreen pass every frame.

Under reduced motion, switch to a ready representation atomically. Do not add a screen-wide fade
for normal zoom. If mixed terrain regions produce seams, fix their dependency bounds, clipping or
sampling; a longer opacity animation does not fix missing coverage.

Retain the useful existing resolution hysteresis and fallback tiling. Request sharper pixels only
when projected error warrants it; coalesce rapidly superseded requests by source and target scale.
Keep a valid old scale until the new one is complete. Refine at most once per selected target scale
and content revision while resident. A single sharpen for an entire arbitrary zoom gesture is not
a sensible universal target: a long zoom can legitimately require several resolutions.

Ground LOD promotion should use the same coverage/presentation contract. The current timeout may
select a target with fallback coverage, but it must not authorize an uncovered view or visible
regression. Preserve `tileCoverage`'s non-overlap property. Test the raster-to-vector line boundary
independently; it is a separate visual transition from landscape marks.

## Implementation order and exit gates

| Phase | Concrete work and main files | Gate before moving on |
| --- | --- | --- |
| 1. Reproducible baseline | Add fixed-camera queue pulses, continuous zoom/reversal and density cases to `tools/e2e/map/`; expose bounded per-scene and per-region decisions through `map-diagnostics.ts`. Record source hash, viewport, density, cache state and layer variants. | The coarse-reappearance assertion fails on the current renderer for the known reason. Obtain working full-application baseline as well as isolated fixture coverage. |
| 2. Terrain ownership | Add region/source metadata in `map.ts` and the existing piece contract; register expected sources in `overworld.tsx`; track usable coverage in `map-scene.ts`; replace the `drawing` boolean in `map-tiles.ts`. Share effective density. Add pin/release rules. | No coarse regression over valid detailed regions under sharpening, offscreen preparation, rapid reversal, new-region pan or injected delay. No holes, duplicate strokes or clipped overflow. Context loss invalidates coverage correctly. |
| 3. Pixel-correct transitions | Add bounded two-source composition in `gl.ts`; apply it to `map-scene.ts` sharpening and region/LOD promotion. Remove obsolete global mark fades. Align wave phase and mask order. | Half-transparent stroke, colour/pencil boundary, coast and overflow pixel tests pass at every transition fraction. No darkening pulse. Reduced-motion path is immediate and complete. |
| 4. Readiness and recovery | Give preparation explicit results such as ready, timed out, cancelled and failed, plus request generation. Bind handoff handles to their owner. Recover terrain initialization and decoder failure; bound retries and pending jobs. | Slow/failed work never impersonates readiness. A stale completion cannot release a newer handoff. Stop/park/context loss settle and dispose work exactly once. Product navigation remains usable after failures. |
| 5. Scheduling and budgets | Share one foreground frame allowance across construction, upload and mipmap work. Add aggregate memory reservations and reasoned priority/cancellation through `scene-work.ts`, `map-scene.ts`, `map-tiles.ts`, `tile-cache.ts`, `sprites.ts` and atlas ownership. | Current visible coverage and input remain responsive under speculative load; reservations balance after repeated cycles; configured limits hold under transition overlap. No duplicate work for identical resident revision/scale. |
| 6. Product and device release | Exercise all entry points and the matrix below; run repository checks, assets/bake checks and physical-device recordings. Preserve the lesson/loading/state guarantees of the existing shared-engine plan. | Publish measured results against declared device budgets, including the affected iPhone. No unresolved P0 defect or untested recovery path is called production-ready. |

Each phase should be a reviewable change with its own regression tests. Phases 4 and 5 can be
investigated alongside terrain work, but their implementation must use the ownership and readiness
contracts established in phase 2. Do not bundle a new scene backend, unrelated art changes or
lesson-state refactoring into the fix.

## Efficiency and resource policy

The current small-device/other-device settings include 64/160 MiB for terrain textures,
96/192 MiB for tiled-scene atlas pages, 48/128 MiB for shared retained raster pixels, and a shared
24 MiB tile decode cache. Standalone texture eviction begins above 24/48 MiB and only selects
offscreen candidates. These are different pools and eviction policies, not a single hard memory
ceiling. Do not present their sum as measured process or GPU memory.

Account separately for source geometry, retained decoded pixels, active decodes, atlas page
allocations, standalone textures, terrain textures, mipmaps, canvas/mask targets, transition
targets and parked scenes. Report totals at document level with per-owner attribution. A shared
resource counts once; an atlas counts allocated pages rather than only occupied cells. Browser
and driver overhead remains outside exact accounting, so retain device-tested headroom.

Use this admission order: missing visible coverage, the selected transition destination, visible
content updates, visible sharpening, near-camera preparation, then speculative warming. Promote
and demote priorities when demand changes. Reserve foreground worker, upload and memory capacity
before admitting speculation. Bounded aging can prevent starvation without letting abandoned
work keep its old priority forever.

Cancel queued obsolete work before it reaches a worker. For work already executing, reject stale
results by owner and generation, dispose transferred bitmaps, release reservations and avoid
uploading them. Add a worker deadline and replacement path for genuinely failed/hung workers;
do not restart healthy shared workers for every camera reversal. A late result may enter a
versioned reusable cache only if it has a bounded owner and valid content key.

Start with a combined optional main-thread allowance of at most 4 ms per 60 Hz frame as a tuning
target, not an observed guarantee. Reserve input/layout time before scheduling more. Split large
uploads or reduce optional target resolution where possible; measure unavoidable calls and their
mipmaps. Increasing worker count or cache sizes is not the first remedy for visible work bursts.

Do not prewarm every world at full detail to conceal the handoff defect. Preserve selected-world
preparation and useful bounded overview assets. Measure how much speculative work is later used.
Pause optional scenes and animations when hidden, parked or backgrounded; resume from retained
state. Verify multiple maps/dialogs and mobile WebViews rather than assuming one scene exists.

Measure CPU work separately from GPU work. The scene still walks its source and reads animations
when constructing frames. Attribute traversal, style/geometry reads, clipping, uploads and draw
submission before deciding whether to retain a compiled display list or add spatial indexing.
If traversal is a dominant cost, cache stable source descriptions and invalidate them by source
revision, while evaluating camera transforms and active animation separately. This is a
profile-dependent optimization, not a demonstrated cause of the coarse-mark regression.

## Tests and proposed release gates

Correctness assertions should run on every change; performance thresholds need a pinned browser,
hardware class, thermal state, viewport, content route and cache/network conditions. The targets
below are proposed acceptance thresholds, not results already achieved.

| Area | Required cases and assertions |
| --- | --- |
| Coverage state | Pure tests for pending, successful empty, ready, sharpening, cancellation, eviction, content revision and context loss. Randomized event ordering must preserve one representation per region and balanced ownership. |
| Coarse return | At fixed near zoom, enqueue unrelated, offscreen and sharpening work after detail is visible. Zero coarse contribution over regions whose live coverage remains valid. Repeat from both zoom directions. |
| Spatial completeness | Pan into uncached neighbors with delayed construction, decode and upload. Test forests, range overflow, coast/island and drifting waves. Every previously covered visible region remains covered; new regions retain a valid fallback. |
| Pixel fidelity | Synthetic half-transparent textures and real cropped art at transition fractions 0, 0.25, 0.5, 0.75 and 1. CPU reference for premultiplied mixing; agreed one-byte rounding tolerance for the synthetic case. No duplicate ink or seam at boundaries. |
| Zoom policy | Slow threshold oscillation, rapid wheel reversal, pinch, long flight, settle/refine, resize and DPR change. Same camera/revision has the same final appearance regardless of approach direction. Retention history may differ, visible styling may not. |
| Handoff | Map to roll, roll to map, same-world repeat, switch world during preparation, close dialog, route away and immediate re-entry. Delayed old completion cannot affect the latest owner. Failure and timeout are distinguishable from ready. |
| Faults | Missing/corrupt tile, failed index, decode worker error/hang, exhausted allocation, context loss/restore, hide/resume and stopped scene receiving results. Bounded retries; no permanent busy loop; no spontaneous document reload. |
| State and access | Selected world, camera, keyboard focus, flight interruption, lock/access treatment, lesson seed, answers, drafts and reward occurrence survive quality/resource changes. Rendering never becomes the owner of learning state. |
| Work reuse | With a declared sufficient budget and no content change, revisiting the same resident region/scale causes no redundant rasterization. Separate necessary first-time/sharpen work from same-version redraws. |
| Timing | Target 95th-percentile input-to-next-rendered-camera update at most 50 ms and no renderer-caused task above 50 ms in a warm interaction. For supported 60 Hz devices, target 95th-percentile frame interval at most 20 ms and 99th at most 33.4 ms over a fixed route. Report distributions, not averages alone. |
| Memory and lifetime | Repeat at least 20 map/roll/return cycles, then a 10-minute mixed interaction. Totals stay within declared budgets; live scene/worker/job/lease counts return to the expected baseline after disposal. Investigate upward trends rather than masking them with a larger cap. |
| Quiet state | Reduced-motion stationary map does no recurring visual work once required content is ready. With motion enabled, only declared visible animations drive frames; background tabs do not keep optional rendering alive. |

Cover desktop Chromium and Firefox, Safari/WebKit, a tablet layout and real iOS/Android hardware.
Include DPR 1/2/3, a large desktop viewport affected by the pixel cap, low-memory policy, cold/warm
caches, throttled network and interrupted requests. Phone-sized Playwright WebKit is useful but
does not establish physical iPhone memory, thermal or GPU behavior.

The product routes are the child's map and world entry/return, the parent's full atlas, public-site
map and preview dialog, selected-world backdrops, and the mobile-hosted versions. Check keyboard
navigation, touch targets, reduced motion, orientation and background/resume on each relevant
surface. Static decorative backdrops should stay static where that is the existing product policy.

Use bounded opt-in diagnostics for region promotion/demotion reasons, fallback area, pending visible
coverage, requested quality, effective density, queue age, stale-result disposal, upload/mipmap
cost and bytes by owner. Distinguish a frame submitted by the renderer from pixels actually
presented by the browser. Frame captures and device recordings supplement state assertions.
Do not collect child names, lesson answers or other private data for graphics diagnostics.

## Completion criteria

The first deliverable is the terrain coverage fix and its failing-before/passing-after regression.
The production-readiness deliverable additionally needs correct alpha transitions, explicit
readiness/failure ownership, bounded aggregate resources and the product/device release matrix.
Passing the existing lost-drawing counter, a successful desktop run or a longer fade is insufficient.
Release evidence must identify the exact build, measured limits and remaining unsupported conditions.

## Validation of this audit

`npm run check` passed on the audit itself on 8 October 2026, before any rendering change. The Chrome
and WebKit experiments above validate the causal diagnosis. They do not amount to a completed
application browser matrix or physical-device certification.
