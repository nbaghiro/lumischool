# Slingshot: physical play and visual refinement

Status: exploration, not implementation approval. Garden mini-golf and Pocket rally are separate
active workstreams. Preserve their shared engine changes when this proposal is implemented.

## Current implementation

`school/games/sling.ts` uses shared rigid bodies, launch trajectories and camera following. It has
dynamic rectangular rods, fixed walls, circular star colliders, a hinged seesaw, one projectile,
automatic reload preserving the damaged world, and complete-win witnesses for six arrangements.
All rods currently share density/friction/restitution. There is no fracture or material damage.
Decorative rods display educational numbers. The previous two shot trails remain visible; the
camera changes framing between aim and flight. These deserve a visual review before adding density.

## Recommended design

Preserve the pull-and-release gesture and unlimited attempts. New mechanisms should be physical
objects on the field, not toolbar modes. Keep a clear skyline, restrained background, generous
space around the sling and target, and a small consistent material palette. Do not add an inventory,
currency, upgrades, mandatory scoring or a power-up toolbar in this slice.

| Addition | Play | Appearance | Shared engine work |
|---|---|---|---|
| Timber and heavy stone | Push supports, tip weight, choose high versus low impact | Warm timber with sparse grain; cool stone with sparse speckles | Named material profiles and bounded contact-impact data |
| Breakable timber braces | Break one load-bearing member to release a structure | A small crack after damage, then two or three matching fragments | Impact-driven damage and bounded fragment replacement |
| Rolling weights | Dislodge a ball that rolls into a second structure | Round stone clearly different from star and projectile | Existing round bodies; course recipes and collision validation |
| Hinged gates and tipping shelves | Strike a lever to open a route or tip a star | Visible pin and pivot, matching existing seesaw | Existing hinges; explicit limits and per-body interaction events |
| Elastic rebound pads | Bank a shot around a wall | A clearly stretched fabric/rubber surface with one accent colour | Surface restitution and stable contact handling |
| Suspended platforms, later | Swing a load or release one support | Sparse ropes with visible attachment points | New distance/rope constraints and controlled release |

Do not equate tinted art with a physical material. Rendering and collision must consume the same
piece description and agree about footprint, fixed/dynamic state and fracture. New art belongs on
the shelf with material parameters, descriptions and anchors; existing sling/ball/star/pivot art
can stay. Primitive engine bodies must not import shelf drawings or Slingshot objectives.

## Three proposed challenge scenes

1. The orchard arch: a stone weight rests above timber supports, with a star on a nearby ledge.
   A low shot tips the arch; a high shot dislodges the weight. Both approaches can succeed.
2. The tipping shelf: one visible pivot holds a star beyond a wall. A bank shot or falling weight
   tips the shelf. This develops the existing seesaw mechanic before introducing ropes.
3. The falling dominoes: a short row of timber pieces bridges two small structures. A well-placed
   hit propagates through the row, with unlimited follow-up shots if the chain stops.

Each should demonstrate one mechanism first, then combine at most two familiar mechanisms. Author
and validate complete successful shot sequences before expanding the variation pool. Check nearby
inputs, pointer and keyboard reach, every objective and remaining-world recovery after misses.

## Visual and interaction pass first

- Hide rod numbers by default; numerical angle/pull annotations belong to optional help, if retained.
- Keep the live aiming arc short, light and clearly distinguished from recent flight history.
- Fade history on a bounded timer; optionally retain one faint previous shot while aiming.
- Keep the impact and remaining targets visible; avoid repeated camera zooms where framing fits.
- Strengthen elastic tension/release and material-specific impact cues without excessive particles.
- Use a restrained star-settling/capture response, a clear loaded ball and minimal completion UI.
- Reduced motion removes shake and animated transitions while retaining understandable outcomes.

## Implementation sequence if approved

1. Capture current desktop/phone baselines; refine framing, trails, rod rendering and shot feedback.
2. Add material profiles plus timber/stone artwork; prove density changes do not invalidate courses.
3. Add bounded timber damage and rolling weights; build the orchard arch and domino scenes.
4. Expand existing hinge mechanics with tipping shelves and rebound courses.
5. Consider ropes only after the earlier scenes meet visual and playability review.

Verification must include stable starts, small/repeated impacts versus real breakage, fragment count
limits, collision/render alignment, no free wins from unstable structures, complete gamepad/keyboard
or pointer-compatible witnesses as applicable, automatic reload, pause during collapse, cancellation,
reduced motion, and repeated play without growing body/listener counts. Physics witnesses provide
sampled evidence, not exhaustive guarantees. Preserve challenge/rules versions when behavior changes.

## Approved initial slice, 24 September

The owner approved visual polish, distinct timber/stone materials and rolling-weight chain reactions. Breakable supports, fragmentation and ropes are explicitly deferred; the broader sequence above remains exploration, not shipped scope.

Implemented material profiles live in `engine/motion/physical-materials.ts`, independent of artwork. Legacy timber values remain unchanged; stone has greater density. The new rolling-stone phase uses three certified ledge lengths and actual stone-to-timber collisions before the star falls. Direct hits remain a legitimate alternative in this open physics toy. Stable starts and neighboring-input complete wins are sampled evidence, not exhaustive proofs. Shelf-registered timber beams and round stones show the difference; rods no longer carry irrelevant numbers. Flight history is capped, expires within 0.8 seconds, and disappears in reduced motion.
