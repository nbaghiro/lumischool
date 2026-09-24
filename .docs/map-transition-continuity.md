# Map transition continuity investigation

24 September 2026. Root-cause investigation and proposed shared design; no transition redesign implemented in this document. Lesson-world stability/scope work is being implemented separately at the user's request.

## What is established

The existing fixes solved specific defects: camera clipping/promotion reduced recorded terrain dropout, prepared world replacements prevent an empty background swap, and atomic lesson/layout/camera publication prevents post-landing sheet jumps. Those protections do not establish continuous coverage across scene navigation.

Code review of the current tree establishes:

- `Overworld.drain` and `drawNow` refuse model swaps during flight or flight loading. Manual camera animation does not have the same barrier.
- Clicking an atlas node calls `CanvasView.flyTo`, which uses a distance-dependent flight curve. This can cross multiple detail thresholds. The paper-plane mode has a smaller zoom range.
- `paintNear` removes distant or below-threshold pieces before queued replacements finish. There is no coarse-coverage readiness contract for the transition corridor.
- Atlas `drawNow` stages base painting, then stops the old map and installs the replacement before its deferred pieces have painted. `ready` is set before `firstFrame` completes. World interiors have a stronger staged visible-piece swap, but it is not shared by the atlas.
- Atlas entry (`goIn`) fades its host to zero before invoking route navigation. Parent `apps/home/map.tsx` and sample `engine/ui/overlay.tsx` use mutually exclusive scene branches, destroying the outgoing scene.
- Returning creates a new Overworld. `rise` starts the fade and camera movement immediately, while nearby pieces are still queued. Opacity is driven by its own ticker; camera set schedules work through CanvasView's frame loop. There is no single owner publishing scene readiness, camera and opacity together.
- `mapSurface.frame` changes its SVG viewport, root transform, dimensions and mask bounds after its guard band or zoom threshold is crossed. This remains a potential compositor invalidation source, not proof of another browser dropout by itself.

## Local browser observation

A fresh desktop Chrome run of the sample overlay selected Mountains, entered it, waited for the lesson, then returned with Escape. Instrumentation sampled DOM identity, opacity and art counts in requestAnimationFrame. Output is `/tmp/map-transition-audit.json`, summary `/tmp/map-transition-audit.log`.

| State | Active atlas identity | Interior present | Atlas ready | Atlas opacity | Atlas `.j-art` nodes |
| --- | ---: | --- | --- | ---: | ---: |
| Before entry | 1 | No | Yes | 1 | 37 |
| In world | None | Yes | N/A | N/A | N/A |
| First sampled return frame | 2 | No | Yes | 0 | 5 |

Six sampled frames had an atlas below 0.1 opacity and no world interior. This is consistent with the intended fades exposing the background rather than overlapping prepared scenes. DOM sampling is not a screenshot/compositor trace and does not prove that all reported manual-navigation flashes share this cause. The fresh map identity and readiness mismatch are directly observed.

The pointer-based return exposed a separate confirmed lifecycle bug. A static layout correction calls `CanvasView.shift`, which schedules a frame. World marks itself moving on every frame, but CanvasView only settled completed animation/glide or explicit input debounce. After neighbouring lessons finished loading, the world could remain moving indefinitely and keep Back to the map transparent and noninteractive even after pointer movement. CanvasView now settles idle presentation frames, while respecting active animations, glides, pointers and wheel debounce. The same normal-hover/click probe now succeeds; dedicated desktop Chrome and phone WebKit regressions pass. This fixes the stuck control, not the separate scene handoff gap.

A separate headed Chrome screencast visited six distant atlas destinations (Volcano island, Meadow, Mountains, Coral reef, Kitchen, Crystal caves). The existing terrain-colour and corner-coverage detector passed in an 18-second case. This run did not reproduce compositor terrain dropout during selection; it does not detect every small detail pop or establish that the user’s intermittent case is fixed. Log: `/tmp/map-selection-probe.log`. The temporary probe was removed after use.

## Required shared contract

**Never relinquish the last complete visible scene until the next scene has usable coarse coverage for its first camera.** Readiness must mean renderable coverage, not module import, base DOM creation, or all optional details loaded.

One scene-transition owner should coordinate explicit phases:

1. **Present:** one complete active scene owns input and focus.
2. **Prepare:** destination metadata, coarse visible scenery and destination lesson loading surface prepare under a bounded transition reserve. The outgoing scene remains visible. Actual destination lesson readiness follows the existing lesson-entry policy.
3. **Move:** a single frame transaction publishes camera, coverage, overlays and any crossfade. Current coverage remains pinned. Optional fine details load without invalidating that frame.
4. **Commit:** route/scene state, focus and accessibility transfer to the destination once its first visible frame is ready; retain browser-history intent without destroying the visible scene prematurely.
5. **Release:** dispose outgoing scene work, DOM, observers, animations and graphical resources after handoff. Retain only lightweight camera/focus/navigation state.

This does not require keeping every map mounted or retaining an entire year of lessons. At most the outgoing visible scene and bounded incoming first-frame resources overlap. If that reserve cannot admit fine artwork, the incoming coarse scene and local loading UI must still be usable.

## Camera and residency

- Use one camera/frame timeline for manual selection, fit/near-me, entry, return and paper-plane motion. Physics can remain mode-specific; presentation and lifecycle must be shared.
- Defer model replacement while any camera transition is in progress, not only during flight. Coalesce changes and prepare the latest compatible result.
- Maintain cheap coarse coverage at every supported zoom. Fine details are optional residents; removing them must reveal valid coarse artwork, not empty paper.
- Use hysteresis and directional preparation for rapid movement. Do not pre-render the entire union of a very long journey. A distant jump can traverse coarse detail and refine only the destination.
- Separate immutable terrain, live progress/landmarks, controls and lesson paper. Updating progress or a lesson's measured height must not recreate unchanged terrain.
- Reconcile day-local artwork from the parallel work with these ownership contracts; stable seeds alone do not eliminate lifecycle/repaint gaps.

## Decide the rendering backend from evidence

Do not add more blanket `will-change`, larger retention margins or delays without a reproducer. Existing bounded SVG surfaces remain useful containment, but their repeated mask/viewBox changes are not a final guarantee of compositor stability.

Compare one fixed viewport or truly local SVG terrain region with bounded prerendered image tiles, using the same real coastal art, progress masks and camera transitions. Measure presented frames, construction time, decoded memory estimates and physical-device behaviour. Select one backend for invariant terrain; keep artwork source, gameplay and accessible world targets unchanged. A clipped country-sized SVG or giant country bitmap does not satisfy bounded rendering.

## Proof required before saying fixed

Capture presented frames as well as DOM/model events. Cover distant node selection, near-me/every-world, manual pinch and wheel, drag/inertia, entry, return button, Escape, browser Back/Forward and rapid reversal. Include cold/warm cache, slow/failed lesson reads, progress updates, resize, hidden-tab resume and reduced motion.

Assertions must distinguish:

- intentional prepared-scene transition;
- a visible frame without coarse coverage;
- detached/replaced visible terrain;
- detail appearing late;
- camera or lesson anchor discontinuity;
- compositor dropout despite valid DOM.

Measure bounded residency over repeated round trips, not only a single smooth trip. Run desktop Chrome/WebKit automation and the affected physical iPhone 17 Pro Max using Chrome. A browser/device can still fail externally; the enforceable app guarantee is that its state machine never intentionally presents an unready or uncovered scene. Do not promise absolute impossibility of every flash without physical-device evidence.

## Implementation order

1. Add frame/readiness/scene-generation diagnostics and regression reproductions for manual selection and round-trip navigation.
2. Establish coarse coverage and prepared publication in both atlas and interior, using one lifecycle interface.
3. Replace surface-specific fade/unmount sequences with the shared handoff owner across parent, child and sample overlay.
4. Unify camera publication and transition-aware residency; preserve interrupted navigation and focus semantics.
5. Run the bounded terrain backend experiment only for remaining compositor instability or resource cost, then migrate if measurements support it.
6. Validate repeated transitions on the affected phone before declaring the crash or all visual discontinuities resolved.
