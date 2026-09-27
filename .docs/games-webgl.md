# The games drawn by the GPU

Status: proposed, 26 September 2026. Nothing here is built. This document studies the WebGL renderer we
added for the overworld (`overworld-gpu.md`), measures what the games' current Field costs, compares it
with a throwaway WebGL sprite batch fed the same frames, and proposes a second rendering backend behind
the games' `Frame`, with the game logic, the controls and the text left as they are.

Since then the recommendation has gone further than this study proposed: the GPU's view is the only
renderer for every game, and the Field and the Stage were deleted in P3 of
[game-engine.md](game-engine.md). A turn game in a browser without WebGL2 is drawn as a still SVG
picture, and an action game there says it needs a newer browser. The figures below are the ones this
study measured against the Field before it was removed.

## Summary

The Field draws every sprite as a DOM element moved by a CSS transform. That is cheap for the games we
have: none of them passes 60 sprites on screen, and the heaviest spends between 3 and 7 per cent of the
main thread on a Mac at normal speed. It stops scaling at a few hundred moving sprites. In a stress page
with the real Field, 300 moving sprites took 14.8 ms of the main thread a frame with the CPU slowed four
times, 600 took 47.6 ms and 1,200 took 90.9 ms; a phone would drop frames from about 200. A WebGL2
instanced sprite batch fed the same frames, drawing from an atlas rasterised by the shelf's own SVG
renderer, held between 0.8 and 2.7 ms of main-thread time a frame at every load up to 1,200 sprites, on
software GL. The GPU renderer is worth building, not because today's games need it, but because the
games we want next (hundreds of marbles, flocks, rain, particles, glow, long trails, zoomable worlds) do.

We recommend a second backend behind `Frame` in `engine/ui/`, sharing the overworld's small WebGL2 core
(`map-gl.ts`) and its lessons (a texture budget, context loss, density capped at three, the DOM kept for
what carries meaning). It is opted into per game, proved first on the marble run, and the Field stays as
the fallback and for any game that does not ask for it.

## What exists

The overworld renderer is three files, built on 26 September 2026.

`engine/ui/map-gl.ts` (318 lines) is the WebGL2 core. It draws textured quads in world units under one
camera: each draw is a texture, the rect its unit square covers, an affine transform, an optional source
rect within the texture, an alpha, a tone (the grey, saturation, contrast and brightness filters the map's
CSS used, applied in the fragment shader) and an optional mask texture sampled in world space
(`map-gl.ts:55-66`, shaders at 70-112). It uploads textures from any `TexImageSource`
(`map-gl.ts:218-237`), keeps a generation number so a lost context invalidates every texture and a restored
one asks the owner to upload again (`map-gl.ts:190-203`), premultiplies alpha, and sizes its canvas to the
view times a density the caller sets (`map-gl.ts:246-252`). It issues one `drawArrays` per quad
(`map-gl.ts:260-306`); it has no instancing and no batching.

`engine/ui/map-scene.ts` (1,265 lines) is the overworld's scene. The map's painters draw into a hidden
container as they always did; the scene reads that container, and for each SVG serialises a standalone
copy (with the fonts it uses inlined, `map-scene.ts:387-523`), decodes it as an image through a blob URL
(`map-scene.ts:873-878`) and uploads it as a texture at the power of two nearest the size the camera shows
it. Rasterising happens off the frame where it can and uploads are held to 6 ms a frame
(`UPLOADING`, `map-scene.ts:35`, `upload` at 891). While the camera moves a drawing keeps a softer texture
and is drawn sharp again 200 ms after it rests (`SETTLE`). Textures live under a 96 MB budget with the
least recently drawn evicted first (`BUDGET`, `map-scene.ts:25`, `evict` at 938), and no texture is larger
than 2,048 pixels a side; a larger drawing is drawn a window at a time (`LARGEST`, 1072). Density is
`devicePixelRatio` clamped to between one and three (`map-scene.ts:608`). CSS animations and the drawings'
idles are evaluated by the scene rather than played by the browser, and a part that moves is its own
texture. Text, buttons and CSS shapes are moved to a DOM overlay over the canvas, so screen readers,
keyboard and 44-pixel targets are unchanged. The poster keeps the SVG painter.

`engine/ui/map-tiles.ts` (752 lines) draws the terrain from a tile pyramid with Canvas2D into textures,
under the tile cache's 24 MB (`tile-cache.ts:235`).

The reason for all of it is in `overworld-gpu.md`: on an iPhone Air, WebKit gave composited layers under a
scaled-down world backing stores of up to 540 MB and killed the page past 2,048 MB. That history matters
for games too, since the Field is the same kind of composited DOM.

For the games, `map-gl.ts` is reusable with changes: its context handling, density, texture lifetime and
tone shader carry over, but it needs an instanced sprite path, a line path and a particle path, since one
draw call per quad is what the map can afford at a few hundred drawings and a game with a thousand motes
cannot. The rasterising path in `map-scene.ts` (serialise, inline fonts, decode, upload under a time
budget, a byte budget with eviction, sharpen after rest) is reusable as a module with changes; it is
written round the painters' hidden container, and the games already have their looks as rendered SVG from
`render()`. The terrain tiles, the painters' container, the CSS animation reader and the overlay of place
names are map-specific.

## What we measured

All figures are from this Mac in Chrome, at a device pixel ratio of two, 26 September 2026. The raw
numbers are in the session scratchpad (`fork-i/bench-games.json`, `stress.json`, `stress-gl.json`).

The real games, played through the app for six seconds each. Headless Chrome caps animation frames at 30
a second, so every game read 33.3 ms a frame and the frame times say nothing; the useful figure is the
share of the main thread in use.

| Game | Sprites on screen | Moving | Elements in the field | Main thread in use | At four times slower |
|---|---|---|---|---|---|
| Rafts, level 6 | 35 | 23 | 1,481 | 3% | 8% |
| Slingshot, level 2 | 43 | 35 | 421 | 5% | 13% |
| Paper plane, level 4 | 60 | 29 | 3,144 | 7% | 23% |
| Marble run, level 6 | 39 | 38 | 571 | 6% | 16% |
| Firefly trail, level 6 | 59 | 20 | 2,020 | 6% | 18% |
| Gone fishing, level 4 | 21 | 13 | 1,029 | 5% | 13% |

None of today's games is near a limit on a Mac. The plane has the most elements (its scenery) and the
most main-thread time. The count of elements, not sprites, is what grows: every sprite is a copy of its
drawing's SVG, so a sheep is a few hundred elements.

The stress page. A throwaway page drew N sprites of eight shelf drawings, all moving and turning every
frame, once through the real `Field` and once through a WebGL2 instanced batch (one draw call, a 2,048
pixel atlas rasterised through `render()` at the on-screen size times the density), with the frame-rate
cap off. The figure is the browser's own main-thread time divided by the frames drawn.

| Moving sprites | Field | Field, four times slower | WebGL batch | WebGL batch, four times slower |
|---|---|---|---|---|
| 50 | 0.3 ms | 1.6 ms | 0.6 ms | noisy |
| 150 | 0.7 ms | 5.1 ms | noisy | 1.5 ms |
| 300 | 1.7 ms | 14.8 ms | 0.8 ms | 0.8 ms |
| 600 | 4.6 ms | 47.6 ms | 1.8 ms | 1.2 ms |
| 1,200 | 18.5 ms | 90.9 ms | 2.7 ms | 1.2 ms |

Three cautions. The WebGL runs used Chrome's software GL, since headless Chrome would not give a GPU
context reliably, and two of them held at 50 frames a second, so their per-frame figure is not meaningful
and is marked noisy; software GL is slower than a real GPU, so the batch's figures are pessimistic. The
batch's own script (filling the instance buffer) was 0.3 ms at 1,200 sprites and 0.7 ms slowed four
times. We did not measure a phone. We could not take crispness screenshots of the stress page: with the
frame-rate cap off the page never idled long enough for a screenshot, so the look is argued from the
overworld's own comparison, below, rather than shown.

## The design

### A second backend behind Frame

The games already describe what they draw as data: a `Frame` of sprites under a camera, marks, and
happenings (`engine/motion/scene.ts`). Nothing in `school/games/` touches the page. So the GPU renderer is
a second implementation of what the Field does, with the same entry points (`fit`, `draw`, `burst`,
`shake`, `toWorld`, `clear`) and the same inputs, and `game-action.ts` chooses one per game. A game opts in
with a field on `ActionGame` (for example `render: "gpu"`), and the page falls back to the Field when
WebGL2 is missing, when a context cannot be made, or when the device reports little memory.

### Looks as textures

A look is what the Field already caches: a drawing, its settings, its seed, its crop and its size. The GPU
backend rasterises the same SVG `render()` makes, through a blob URL and `Image.decode()`, at the look's
on-screen size times the density (clamped to three), and packs it into a shared atlas of 2,048 pixels a
side with a row allocator, as the stress page did. The overworld found that rasterising an SVG with the
browser's own renderer matches the SVG it replaces closely, and the games inherit that, including the
seeded pen's roughness. A look drawn once serves every sprite that uses it, as the Field's copies do.

A zoom that makes a look bigger than it was rasterised for draws it from the softer texture until the
camera rests for 200 ms, then rasterises it again at the new size, as the overworld does. A `live` sprite
(a needle, a level) keeps one texture slot per sprite and redraws into it when its settings change, as the
Field keeps one look per live sprite; a live sprite that changes every frame is limited to the few the
games already have, and a new one that animates continuously should be drawn by a shader instead.

Textures live under a budget: 48 MB for the games' atlases on a phone and 96 MB on a desktop, least
recently used first out, with the atlas pages themselves the unit of eviction. At a density of three a
2,048 pixel page is 16 MB, so a game's working set is a few pages.

### Marks

Lines, dots, rings, boxes, words and puffs are ink over the drawings. We draw lines, dots, rings and boxes
in WebGL as a line batch (quads along each segment with round caps, dashes by a texture coordinate), so a
rope, a sagging fishing line, an aim and the dots of a flight cost one draw call. Words stay in a DOM
overlay over the canvas, in screen space, as the overworld's names do: they are text in the hand font, a
screen reader and a search can read them, and there are few of them. A stream (water from a spout) is a
line whose width follows its weight.

### Particles and bursts

`engine/motion/burst.ts` already keeps motes as plain data in a pool of 64. On the GPU the pool can be
thousands, each mote an instance of the same atlas batch, so rain, splashes, sparkles, dust, falling
leaves and fireflies cost one draw call. The limit becomes what the eye wants, not what the DOM allows.
Reduced motion still throws none.

### Glow, light and night

CLAUDE.md keeps the site light only, with one palette. A night scene in a game is not a dark mode: it is
a picture of night drawn in the palette's own colours on the page's paper. The GPU gives us two things the
Field cannot do cheaply. An additive glow sprite (a soft disc in the palette's `glow` token) under a
firefly, a lantern or a star, blended over the drawing rather than a CSS filter. And a tint pass over a
game's world that dims and cools the colours towards the palette's `ink-soft` for a dusk or a night level,
with the drawings' outlines left in ink so contrast holds. Both are off under reduced motion only in so far
as they animate; a still glow stays.

### Water, wind and rain

Water is a shader over a rectangle: the surface line moved by a sum of two slow waves, ripples as rings
from a point that spread and fade (a cast landing, a stone, a coin), and a shallow refraction of the bed
under it. Wind is a shader offset on the parts a drawing declares as swaying, or a field of streak
particles. Rain is particles. Each takes a handful of uniforms, and each is a still picture under reduced
motion.

### Ropes and trails

A rope is a line strip through the points a simulation gives (the verlet line in `engine/motion/line.ts`,
a planck rope), drawn in the line batch. A trail (the firefly's beads, a flight's dots, a canoe's wake) is
either a strip whose width and alpha fade along it or instances of a bead texture, which is what the
firefly already does with sprites and could do with thousands.

### Zoom and big worlds

The camera is one matrix, so zooming across a world is free, as it is on the map. Sprites off screen are
culled on the CPU from their bounds before the instance buffer is filled. A game whose world is much
larger than the screen (a river run, a long plane course) draws only what the camera sees, and parallax
layers are instances drawn with their own camera offset.

### Accessibility, input and paper

Nothing changes for them. The Field's container stays: the canvas sits in it with `aria-hidden`, the words
overlay sits over the canvas, the game's `say` text, the pad and the controls are the DOM they are, and the
pointer is turned into world squares through the same `toWorld`. Paper output does not draw games.

### Tests that read the DOM

The end-to-end tests find sprites by `[data-key]` and measure their boxes. The GPU backend keeps a hidden
mirror: one empty element per sprite with its `data-key` and an absolutely positioned box matching the
sprite on screen, updated at most every few frames and only when a test flag is set on the page
(`?probe=1`), so the tests keep working and the page pays nothing in normal use. The node tests are
unaffected, since they never draw.

### Reduced motion

The rule is the one the games already keep: time moves only when the child acts, and each act is drawn
once at rest. The GPU backend draws one frame per press and requests no frames otherwise, and particles,
shake, water motion and glow pulses are off.

### When to fall back to the Field

When `getContext("webgl2")` fails, when a context is lost and not restored within a second, when the
device reports less than 4 GB (`navigator.deviceMemory`), and for any game that has not opted in. The
fallback is chosen once per game opening, never mid-play.

## What it unlocks

Marble run: hundreds of marbles, so a level can ask for "72 marbles, split into eight cups of nine", and
water or sand run through the same machine as particles.

Firefly trail: a real night, with the firefly's glow and the seeds' light blended over a dusk-tinted
meadow, a trail hundreds of beads long, and a swarm of other fireflies as scenery.

Gone fishing: water with ripples where the float lands and where a fish takes the bait, rain on some
days, the line drawn as a real strip, and shoals of small fish that scatter.

Down the river: a flowing surface with rapids that show their speed, spray at the rocks, a wake behind
the canoe, and a river many screens long.

Rafts and the slingshot: splashes and dust as hundreds of particles, rather than eight.

Paper plane: clouds the plane passes through, and parallax over far longer courses.

The puppies' building game: dust and splinters when a wall falls, rain in the storm test drawn as rain.

## Plan

Phase 1, proof on one game (about a week). Build `engine/ui/game-gl.ts` over an extended `map-gl.ts` core
with an instanced sprite batch, a line batch and a particle batch; an atlas module that rasterises looks
through `render()` under a budget; the words overlay; the `[data-key]` probe. Opt the marble run in, and
measure it against the Field on the Mac, an iPad and the iPhone Air, for frame times, memory after ten
minutes and a lost and restored context.

Phase 2, opt-in per game (a week or two). Move the games that gain most: the firefly trail with glow and a
night tint, fishing with a water shader and ripples, the river run. Each keeps its tests and its Field
fallback, and each ships only when its end-to-end tests pass on both backends.

Phase 3, the default (a week). Make the GPU backend the default for action games, keep the Field as the
fallback, and delete the Field's per-sprite DOM path only when no game needs it, which may be never, since
the Stage for turn games is a different thing.

## Risks

Software GL in headless Chrome is slow and unreliable, so the end-to-end tests need either a GPU in the
test runner or a rule that the tests run the Field and one smoke test runs the GPU backend. Rasterising an
SVG runs on the main thread, so a game that shows many new looks at once (a new level) must rasterise them
before play starts, behind the ready state the player already has. A context limit per page means the
games and a map must not both hold a context; the player already replaces the map. A shader that looks
right on a Mac may band or blur on a phone's GPU at mediump precision, which the overworld met and solved
with highp for coordinates.

## Decisions for the owner

Whether a night level may tint a game's world, within the palette, given the light-only rule. Whether the
end-to-end tests may run on the Field with one GPU smoke test. Whether the first proof is the marble run
(most bodies) or the firefly trail (most visual gain). Whether to buy the phone time for measurement now,
since the staging service the overworld's phase 8 waits for would serve this too.

## Where it lives

In `engine/ui/`, since only `engine/ui/` touches the page: `game-gl.ts` for the backend (a Field that
draws on a canvas), `gl-atlas.ts` for looks rasterised into atlas pages under a budget, and the shared core
extended in place in `map-gl.ts` (renamed to `gl.ts` if both use it, in the same change). The game logic in
`school/games/` and the data in `engine/motion/scene.ts` do not change, and no import rule in
`boundaries.ts` changes, since `ui` already reaches `motion` and `games`.
