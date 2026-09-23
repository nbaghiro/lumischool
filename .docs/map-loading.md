# Map loading and rendering proposal

Status: proposed architecture, revised after independent review, 23 September 2026. The mobile background mitigation is live in
`95c167d`. The changes below are not implemented. This is a shared-engine design for parent and child maps,
world interiors, lessons and pages before authentication. It preserves the map's artwork,
progress, navigation, flying and lessons while bounding the work a device must hold.

## Findings

The user reports that retaining the opening snapshot stopped the initial mobile crash, but
scrolling to the animated marketing map still crashes. This isolates the full map path as a
trigger; it does not establish whether the process dies from graphics memory, CPU, or another
browser fault. Desktop WebKit is useful coverage but cannot reproduce a phone's memory limits.

A production Chrome run at 390 x 844, device scale 3, visited each marketing section and returned
to the top. These are one-run measurements, not cross-device performance guarantees:

| Position | Mounted live maps | DOM elements | SVG paths |
| --- | ---: | ---: | ---: |
| Opening | 0 | 5,589 | 1,904 |
| Map section | 1 | 11,051 | 4,483 |
| Parent section | 4 | 15,907 | 6,814 |
| Final section | 5 | 18,229 | 7,955 |
| Return to opening | 5 | 18,229 | 7,955 |

One terrain SVG in a small preview card measured about 22,518 x 18,323 CSS pixels after the
camera transform. The journey map measured about 11,970 x 9,740. These are element bounds,
not measured GPU allocations. The main terrain SVG uses nested masks over the whole country;
JavaScript heap measurements alone cannot account for the cost of these rendering surfaces.
The local raw measurement is `/tmp/lumischool-map-depth-profile.log`.

The relevant loading paths are:

- `apps/site/ground.ts`, `apps/home/school.ts`, and `apps/kids/views.ts` request the drawings of
  every world before publishing the map. Geometry depends on loaded drawing implementations
  through `sizeOn`, so splitting files alone does not make map entry selective.
- `school/worlds/art.ts` adds shared map refs to each `refsOf` request. World interiors and
  overview art need separate dependency lists.
- `engine/ui/map.ts` paints broad terrain/coasts/masks first. Some detail is deferred into pieces.
- `engine/ui/overworld.tsx` paints nearby pieces in roughly 10 ms batches, but marks them done
  permanently. It does not evict painted pieces when the camera moves away. Its screen-map
  guard band is at least 600 CSS pixels, which is large beside a 390-pixel viewport.
- `JourneyMap` and `MapPicture` in `apps/site/page.tsx` mount full `Overworld` instances when near
  the viewport. Their near state is one-way. Cards use whole-map views to show one place.
- `engine/ui/drawings.ts` shares imports and retains drawing implementations. Imported JavaScript
  modules cannot be treated as an evictable bitmap cache. Avoid loading unnecessary modules first.

## Work to retain from the other session

The session recorded in `01a0ce7e-868b-7b30-9a66-75c508c222bb` completed its lesson-loading work
and moved on to flight zoom and map controls. Its lesson changes remain in the shared working
copy and must not be overwritten or mistaken for deployed code.

It added destination preparation on intent, shared requests, retryable failed reads, a cache
of at most six unused prepared sheets, a reserved navigation slot, and late-result disposal.
`nearPaper` renders at most two sheets concurrently and releases distant sheets while retaining
measured heights. World entry waits for actual destination sheets instead of landing on empty
paper, with a visible loading/retry state. These are useful foundations, not the cause of the
all-world drawing requirement. The session reported 12 desktop/phone checks and build budgets
passing; that does not constitute real-device memory validation.

Retain those semantics. Add weighted limits and a shared priority policy around them, rather
than replacing the lesson loader with a second cache.

## Recommended architecture

Use the existing camera, world coordinates, deterministic art shelf and gameplay. The firm
requirements are independent geometry metadata, explicit ownership and disposal, viewport/zoom
bounds, and shared resource admission across scenes. They apply equally to the atlas and the
scenery around a world's lesson roll. Both currently retain painted pieces permanently.

The leading backend candidate is a multiresolution tiled illustration for invariant terrain,
with small live interaction layers. Before choosing it, compare bounded SVG tiles against image
tiles for one representative coastal region using the same resource ownership interface. This
is a limited experiment, not two complete rendering systems. SVG tiles must have genuinely local
geometry and masks, not a clipped wrapper around the old country-sized SVG. Start the image
candidate with bounded image elements; add viewport canvas only if measurements justify its
redraw, context-loss and composition complexity. Decide using construction cost, sustained frame
cost, process memory and image quality together, not download bytes alone.

Do not generate a second artistic source or one enormous raster image of the entire country.

| Viewing depth | Load | Render live |
| --- | --- | --- |
| Decorative/card | Responsive build-generated image for its actual composition | Nothing |
| Atlas | Small manifest, coarse visible terrain/landmark tiles, names and positions | Accessible world controls and guide |
| Neighbourhood | Finer visible tiles and nearby landmark images | A bounded number of nearby actors |
| Selected world | That world's entrance dependencies and destination lesson IDs | Selected guide and entrance |
| Reading a lesson | Visible sheets, required lesson art, a small neighbouring buffer | Current lesson interactions |

All 38 names, positions and permissions can remain available immediately as lightweight data.
Learning data and access checks stay in the existing application model. Showing an atlas label
must never require fetching its world's lesson bodies or executing its drawing modules.

### Build-time assets and metadata

Generate a content-hashed manifest from the existing declarations and seeded renderers. Include
world bounds, art dimensions for the actual map recipes/parameters, hit regions, tile bounds,
LOD ranges, asset URLs and world-specific entrance/lesson dependency groups. Validate dimensions
against the existing renderers in build tests; do not hand-maintain duplicate geometry.

Generate invariant terrain/coast/road imagery in small tiles at several zoom levels.
Start with a representative coastal region and the full-atlas coarse level before generating the
whole pyramid. Compare seams, thin pencil marks and maximum permitted zoom at phone DPRs.
Include overlap gutters and crop on composition so filters and strokes do not create seams.
Landmarks may vary by season, world choices, moment before/after state, secrets and lit artwork.
Use finite sprite variants where practical and bounded live artwork where needed; do not bake
those states indiscriminately into the base map. Geometry metadata must cover actual parameter
recipes and before/after bounds. Shared generated assets contain no child data and can be served as immutable files by the
existing deployment. No tile server, new managed service, or Neon schema change is required.

Keep progress and changing state out of a combinatorial set of pre-rendered child maps. Compose
neutral and coloured static layers with the child's reach at viewport/tile scale. Render names,
focus, access state, current location, paths travelled, moments and the plane in bounded overlay
layers. Animated parts should not be baked into static landmarks underneath themselves.
Preserve reach-mask ordering, including unopened island exclusions and known-area feathering.
Use distinct IDs for any remaining inline SVG masks and clips across instances. Keep reward and
moment occurrence in application state; remounting an evicted drawing must not replay an award.

### Runtime ownership and limits

The camera selects a visible tile set plus a small guard band. Use coarse tiles immediately,
replace them with finer tiles as they become ready, and retain the coarse fallback until the
replacement is complete. Reconcile the wanted set as the camera moves; release distant decoded
images, SVG subtrees, animations and observers. A map must have explicit suspend and dispose
operations, not just a hidden CSS class.

Use a viewport-sized rendering surface or bounded tile elements. Avoid full-country filter or
mask surfaces. Rendering resolution follows a pixel budget, not unrestricted devicePixelRatio.
A per-page budget coordinator tracks scene activity, resource pressure and priority across maps,
worlds and lesson preparation; each map having its own LRU is insufficient if a page creates five
maps. Keep tile, art, lesson-body and prepared-sheet caches separate with their own lifetimes.
The coordinator admits work and requests optional eviction; it is not a universal content cache.
A rendered piece returns a disposal handle covering its DOM, animation registrations, observers
and allocated images. Removing a node alone is insufficient.

The priority order is input and the current frame, requested navigation/current lesson, visible
fine detail, predicted nearby tiles, then speculative lessons. Visible work has reserved capacity.
Cancel obsolete fetches where supported; stop queued work and discard late results for operations
such as module imports that cannot actually be cancelled. Deduplicate shared requests without
letting one consumer cancel another consumer's needed result. Bound image decoding separately
from downloads and DOM construction.

Fast panning/flying uses coarser tiles and a small directional buffer. It must not trigger lesson
preparation for every world crossed. Prepare a destination after deliberate selection, a dwell,
or landing intent; upgrade scene detail once movement settles. Preserve hit targets, labels,
keyboard navigation, plane physics and reduced-motion behavior at every quality level.

Start every device with the conservative path. Upgrade optional art density/resolution from
observed frame cost with hysteresis. Screen width, deviceMemory and connection hints are not
reliable standalone measures of capability. A wide old tablet needs the same protections.

### Lesson depth

Keep the other session's separation between lesson metadata, fetched content and measured sheets.
A world entrance needs the destination day, not an entire year of rendered lessons. Retain compact
metadata/heights; bound fetched lesson data and rendered paper separately. Cache keys must include
pack, world, lesson, layout and relevant reading/auth state. Never share private prepared content
across child/family sessions. Invalidate on sign-out, pack change and incompatible layout changes.

Count limits are useful but insufficient: six unusually complex sheets can be much heavier than
six simple ones. Add a measured rendering-cost limit and evict speculative paper before visible
paper. Preparation should not compete with the map during touch movement. In-flight dedup maps must
release settled promises when their result is evicted, or they will retain the same content behind
the bounded cache. Audit source-cache keys against all inputs, including motion/layout modes.

Pin visible/current sheets, focus, active gestures and work awaiting persistence. Before evicting
any stateful lesson, ensure answers and interaction state are restored from the application model.
Under pressure discard speculative work and optional detail first. A required lesson exceeding a
provisional budget gets a foreground reserve or lighter artwork, not lost input or a loading deadlock.

## Delivery order

1. Add ownership/disposal and observable residency to shared atlas and world pieces. Establish a
   baseline through the authenticated child flow: map, pan/flight, world entrance, several lessons,
   scroll away/back, then return to the map. Exercise the equivalent parent flow as well.
2. Extract generated geometry/dependency metadata so map entry no longer waits for all-world
   drawing imports. Keep overview, world entrance and lesson dependencies distinct.
3. Use that main-app vertical slice to compare disposable SVG tiles and image tiles for one
   complex coastal region. Include progress, a dynamic landmark and before/after reward states.
   Test the physical baseline device; select one backend before extending the atlas.
4. Extend the chosen residency/LOD approach to the complete atlas, flying and world interiors.
   Integrate the existing lesson-preparation work with resource admission and protected foreground
   state. Validate bounds across repeated navigation and session changes.
5. Apply the same asset manifests and scene lifetimes to every other surface. Static cards use
   generated images; animated previews request an appropriate bounded scene. Marketing is another
   consumer of this engine, not the reference implementation or a separate mobile architecture.

The marketing crash can receive an independent containment patch while this work proceeds, but
that is not the architectural milestone. Each step is independently reviewable. Preserve pending
auth/game work and coordinate edits to map/flight modules with the still-active session.

## Review provenance

The original lesson-loading session's saved conversation and current code were reviewed. Direct
messaging to that independent conversation was unavailable. A separate review agent in this
thread challenged the proposal and exchanged follow-up questions with the primary agent. The
result above reflects that review; it is not represented as agreement by the original session.

## Acceptance and measurement

Provisional prototype targets, to be calibrated on the user's oldest supported device:

- A decorative map contributes no live map instance, animation loop or lesson prefetch.
- A coarse map and working controls appear before fine art, without waiting for all worlds.
- No lesson-body requests merely from opening or panning the atlas (explicit current-day loading
  in the child app is a separate user task).
- Start with a 16–24 MiB decoded tile budget and at most 2 million backing pixels per active
  map surface. These are owned-resource estimates, not guarantees about browser/GPU memory.
  Reduce resolution/guard bands to fit; do not exceed the cap to satisfy prefetch.
- Schedule optional construction in approximately 4 ms slices; split individual pieces that exceed
  the budget. Aim for sustained 30 fps on the baseline device and 60 fps where available.
- Ten minutes of pan/zoom/flight, repeated world visits, and 20 open/close cycles must settle to a
  stable resource plateau, not retain everything visited. Record active tiles, decoded bytes,
  active scenes, DOM nodes, prepared sheets, pending work and browser process memory where possible.
- On controlled slow-network tests, record cold time to visible map, usable controls and first
  usable lesson separately. Establish numeric latency gates after the prototype baseline; do not
  claim one universal load-time promise for every device/network.
- Test cold/warm cache, network failures, portrait/landscape, background/foreground, lost graphics
  context if canvas is used, no-memory/connection APIs, and reduced motion.
- Use Chrome and WebKit automation plus physical iPhone/Safari and an older Android/tablet.
  CPU throttling and phone viewport emulation do not simulate limited graphics memory.

The current crash remains unconfirmed at the process-allocation level. Safari remote inspection
and device crash/termination reports should distinguish memory pressure from a JavaScript failure.
The structural work above is justified by the measured accumulation regardless of that result.

## External references

MapLibre's [large-data guidance](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/)
illustrates the general use of tiling and zoom-dependent detail. This proposal applies those
principles to our illustration and does not require adopting a geographic mapping library.
WebKit's [canvas debugging guide](https://webkit.org/blog/8452/canvas-debugging/) documents the
canvas dimensions and memory information available in its inspector; SVG/compositor and process
memory still need separate inspection. Historical browser memory limits are not portable budgets.
