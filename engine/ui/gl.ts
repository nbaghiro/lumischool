// The GPU drawing the overworld and the games share (.docs/overworld-gpu.md, .docs/game-engine.md):
// images, strokes and filled shapes in world units under one camera, over the paper's grid, each seen
// through the masks of what the child's map knows and how far its colour has come; and for the games,
// batches of sprites, lines and discs drawn instanced from buffers filled each frame.
import type { Camera, Rect, Size } from "../space";

/** A 2D affine transform as CSS writes one, `matrix(a, b, c, d, e, f)`. */
export type Affine = readonly [number, number, number, number, number, number];

export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

export const multiply = (m: Affine, n: Affine): Affine => [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
];

export const translation = (x: number, y: number): Affine => [1, 0, 0, 1, x, y];

/** Where a rect lands under a transform, as the rect that holds its four corners. */
export function bounds(m: Affine, r: Rect): Rect {
    const xs: number[] = [],
        ys: number[] = [];
    for (const [x, y] of [
        [r.x, r.y],
        [r.x + r.w, r.y],
        [r.x, r.y + r.h],
        [r.x + r.w, r.y + r.h],
    ] as const) {
        xs.push(m[0] * x + m[2] * y + m[4]);
        ys.push(m[1] * x + m[3] * y + m[5]);
    }
    const x = Math.min(...xs),
        y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export interface GlTexture {
    readonly kind: "texture";
    readonly w: number;
    readonly h: number;
    readonly bytes: number;
}
/** Straight segments of strokes, from `strokes()`, drawn a run at a time. */
export interface GlStrokes {
    readonly kind: "strokes";
    readonly count: number;
    readonly bytes: number;
}
/** A polygon, from `shape()`, filled even-odd through the stencil. */
export interface GlShape {
    readonly kind: "shape";
    readonly box: Rect;
    readonly bytes: number;
}
export type GlResource = GlTexture | GlStrokes | GlShape;

/** The CSS filters the map's drawings take, as the shader applies them. */
export interface Tone {
    gray: number;
    saturate: number;
    contrast: number;
    brightness: number;
}

export const PLAIN: Tone = { gray: 0, saturate: 1, contrast: 1, brightness: 1 };

/**
 * What a draw is seen through: what the map knows, how far the colour has come with its hatched rim,
 * what the colour has reached without the rim, or known and not yet reached.
 */
export type MaskChannel = "known" | "colour" | "reached" | "pencil";

/** One style of strokes, with `width` and `dash` in world units as a canvas strokes them. */
export interface GlRun {
    strokes: GlStrokes;
    colour: string;
    width: number;
    dash: readonly number[];
}

/**
 * Sprites in one texture page, as `SPRITE` floats each: the centre's x and y; the two axes its corners
 * reach along, `(ax, ay)` and `(bx, by)`, so that a corner (±1, ±1) lands at centre + a·x + b·y (a turn,
 * a squash and a mirror all go into them); where in the page it is (u, v, width and height, in the
 * page's unit square); the premultiplied colour its texels are multiplied by; its tone (gray,
 * saturate, contrast, brightness), (0, 1, 1, 1) for none; and the mask it is seen through, 0 for none
 * or 1 to 4 for `MaskChannel`'s known, colour, reached and pencil.
 */
export const SPRITE = 19;
/** Filled discs, as `DOT` floats each: centre x and y, radius, and the premultiplied colour. */
export const DOT = 7;
/** Floats in one of a game's line segments: `[ax, ay, bx, by, along, ends]`. */
export const SEGMENT = 6;
/** Floats in one of a water's ripples: `[x, age, size]`, at most `MOST_RIPPLES` of them. */
export const RIPPLES = 3;
const MOST_RIPPLES = 8;

export type GlDraw =
    | {
          kind: "sprites";
          texture: GlTexture;
          instances: Float32Array;
          count: number;
          /** The camera this batch is seen through, when it is not the frame's: a far layer, the fixed one. */
          camera?: Camera;
      }
    | {
          /**
           * Segments of `SEGMENT` floats, drawn straight from a buffer filled for this frame: as `strokes()`
           * takes them, then `ends`, 1 to round the stroke past `a` and 2 past `b`, since rounds that
           * overlap at a join show through a line drawn faint. `round` rounds each dash's ends as well.
           */
          kind: "lines";
          segments: Float32Array;
          count: number;
          colour: string;
          width: number;
          dash: readonly number[];
          round: boolean;
          alpha: number;
          camera?: Camera;
      }
    | { kind: "dots"; discs: Float32Array; count: number; camera?: Camera }
    | {
          /**
           * A game's water from `x0` to `x1`, its surface `surfaceAt` in engine/motion/surface.ts at
           * `time`, filled from `shallow` under the surface to `deep` at `bottom`, with an `edge` along
           * the surface and `light` glints under it. `ripples` holds `RIPPLES` floats each: x, age, size.
           */
          kind: "water";
          x0: number;
          x1: number;
          level: number;
          bottom: number;
          waves: number;
          flow: number;
          time: number;
          ripples: Float32Array;
          count: number;
          shallow: string;
          deep: string;
          edge: string;
          light: string;
          camera?: Camera;
      }
    | {
          /**
           * Lights over what is drawn so far, `DOT` floats each as a light's centre, radius and
           * premultiplied hue by its strength, each washing its hue in by `halo`.
           */
          kind: "shade";
          halo: number;
          lights: Float32Array;
          count: number;
          camera?: Camera;
      }
    | {
          /**
           * Water as drops, `DOT` floats each as a drop's centre, its reach and anything, run together
           * where they are near: the drops' fields are added in a target of their own, and where the
           * sum passes one half the water is filled in `fill`, with an `edge` along its outline.
           */
          kind: "liquid";
          drops: Float32Array;
          count: number;
          fill: string;
          edge: string;
          camera?: Camera;
      }
    | {
          kind: "image";
          texture: GlTexture;
          /** The texture's unit square in world units: `rect` placed by `at`. */
          rect: Rect;
          at: Affine;
          /** The part of the texture drawn, in its own unit square; the whole of it when left out. */
          source?: Rect;
          alpha: number;
          tone?: Tone;
          mask?: MaskChannel;
          /** The texture's shape in `from`, turning to `to` where the colour has reached. */
          tint?: { from: string; to: string };
      }
    | { kind: "fill"; shape: GlShape; colour: string; alpha: number; mask?: MaskChannel }
    | {
          /** Runs drawn opaque together and laid down at `alpha`, as SVG composites a group. */
          kind: "strokes";
          runs: readonly GlRun[];
          alpha: number;
          mask?: MaskChannel;
          /** Strokes fade out from `inner` to nothing at `outer`. */
          fade?: { outer: Rect; inner: Rect };
      };

/** What a mask holds, 1 where it lets a draw through; a disc fades from `soft` of its radius out, or is hard at 1. */
export type MaskShape =
    | { kind: "disc"; x: number; y: number; r: number; soft: number }
    | { kind: "fill"; shape: GlShape }
    | { kind: "cut"; shape: GlShape }
    | {
          kind: "strokes";
          strokes: GlStrokes;
          width: number;
          /** Drawn `f` times their size about (x, y), so strokes made once serve a growing shape. */
          grow?: { f: number; x: number; y: number };
      };

export interface GlMask {
    /** Null where the map knows the whole country. */
    known: readonly MaskShape[] | null;
    colour: readonly MaskShape[];
    reached: readonly MaskShape[];
}

export interface GlFrame {
    /** The paper's squares, each with its spacing in world units and how strongly it shows. */
    grid?: { colour: string; layers: readonly { step: number; alpha: number }[] };
    mask?: GlMask;
    draws: readonly GlDraw[];
}

export type CanvasGl = ReturnType<typeof canvasGl>;

/** Backing pixels per CSS pixel: twice at most, sharp on a phone with half the pixels of three times. */
export const glDensity = (): number =>
    Math.min(2, Math.max(1, (typeof devicePixelRatio === "number" && devicePixelRatio) || 1));

type Quad = readonly [number, number, number, number];
type Writes = readonly [boolean, boolean, boolean, boolean];

const HEADER = `#version 300 es
precision highp float;
`;

// the mask is read where the fragment is on the screen, and is 1 for a draw that asks for none
const MASKED = `
uniform sampler2D mask;
uniform int channel;
uniform vec2 screen;
float masked() {
    if (channel == 0) return 1.0;
    vec4 m = texture(mask, gl_FragCoord.xy / screen);
    return channel == 1 ? m.r : channel == 2 ? m.g : channel == 3 ? m.b : m.r * (1.0 - m.b);
}
`;

const IMAGE_VERTEX = `${HEADER}
layout(location = 0) in vec2 corner;
uniform mat3 place;
uniform vec4 source;
uniform vec4 view;
out vec2 uv;
void main() {
    vec3 w = place * vec3(corner, 1.0);
    uv = source.xy + corner * source.zw;
    gl_Position = vec4(w.xy * view.xy + view.zw, 0.0, 1.0);
}`;

const IMAGE_FRAGMENT = `${HEADER}${MASKED}
uniform sampler2D image;
uniform float alpha;
uniform vec4 tone;
uniform int tinted;
uniform vec3 tint_from;
uniform vec3 tint_to;
in vec2 uv;
out vec4 colour;
void main() {
    vec4 c = texture(image, uv);
    if (tinted == 1) c.rgb = mix(tint_from, tint_to, texture(mask, gl_FragCoord.xy / screen).b) * c.a;
    if (c.a > 0.0 && tone != vec4(0.0, 1.0, 1.0, 1.0)) {
        vec3 rgb = c.rgb / c.a;
        float l = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
        rgb = mix(rgb, vec3(l), tone.x);
        rgb = mix(vec3(l), rgb, tone.y);
        rgb = (rgb - 0.5) * tone.z + 0.5;
        rgb *= tone.w;
        c.rgb = clamp(rgb, 0.0, 1.0) * c.a;
    }
    colour = c * (alpha * masked());
}`;

const FILL_VERTEX = `${HEADER}
layout(location = 0) in vec2 point;
uniform vec4 view;
void main() {
    gl_Position = vec4(point * view.xy + view.zw, 0.0, 1.0);
}`;

const FILL_FRAGMENT = `${HEADER}${MASKED}
uniform vec4 paint;
out vec4 colour;
void main() {
    colour = paint * masked();
}`;

// a segment is drawn as a capsule: its quad reaches past both ends by the half width, and the fragment
// keeps what lies within the half width of the segment, so joins are round; a stroke under a pixel keeps
// a pixel's width and is fainter by how much of the pixel it would have covered
const STROKE_VERTEX = `${HEADER}
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 segment;
layout(location = 2) in float along;
uniform vec4 view;
uniform float half_width;
uniform float pixel;
out vec2 world;
out vec2 a;
out vec2 b;
out float start;
void main() {
    a = segment.xy;
    b = segment.zw;
    start = along;
    vec2 d = b - a;
    float l = length(d);
    vec2 dir = l > 0.0 ? d / l : vec2(1.0, 0.0);
    vec2 normal = vec2(-dir.y, dir.x);
    float reach = max(half_width, 0.5 * pixel) + pixel;
    world = mix(a, b, corner.x) + dir * (corner.x * 2.0 - 1.0) * reach + normal * (corner.y * 2.0 - 1.0) * reach;
    gl_Position = vec4(world * view.xy + view.zw, 0.0, 1.0);
}`;

const STROKE_FRAGMENT = `${HEADER}
uniform vec4 paint;
uniform float half_width;
uniform float pixel;
uniform vec2 dash;
uniform vec4 outer;
uniform vec4 inner;
in vec2 world;
in vec2 a;
in vec2 b;
in float start;
out vec4 colour;
float ramp(float v, float lo, float hi) {
    return hi > lo ? clamp((v - lo) / (hi - lo), 0.0, 1.0) : 1.0;
}
void main() {
    vec2 d = b - a;
    float l2 = dot(d, d);
    float t = l2 > 0.0 ? clamp(dot(world - a, d) / l2, 0.0, 1.0) : 0.0;
    float away = length(world - (a + d * t));
    float half_seen = max(half_width, 0.5 * pixel);
    float coverage = clamp((half_seen - away) / pixel + 0.5, 0.0, 1.0) * (half_width / half_seen);
    if (dash.x > 0.0 && mod(start + t * sqrt(l2), dash.x + dash.y) > dash.x) coverage = 0.0;
    if (outer.z > 0.0) {
        coverage *= ramp(world.x, outer.x, inner.x) * ramp(-world.x, -(outer.x + outer.z), -(inner.x + inner.z));
        coverage *= ramp(world.y, outer.y, inner.y) * ramp(-world.y, -(outer.y + outer.w), -(inner.y + inner.w));
    }
    if (coverage <= 0.0) discard;
    colour = paint * coverage;
}`;

// a game's line: a stroke rounded past its ends only where asked, whose dashes run on through a round,
// so a faint or dashed path of many short segments reads as one line as an SVG path would
const SEGMENT_VERTEX = `${HEADER}
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 segment;
layout(location = 2) in float along;
layout(location = 3) in float ends;
uniform vec4 view;
uniform float half_width;
uniform float pixel;
out vec2 world;
out vec2 a;
out vec2 b;
out float start;
out float caps;
void main() {
    a = segment.xy;
    b = segment.zw;
    start = along;
    caps = ends;
    vec2 d = b - a;
    float l = length(d);
    vec2 dir = l > 0.0 ? d / l : vec2(1.0, 0.0);
    vec2 normal = vec2(-dir.y, dir.x);
    float reach = max(half_width, 0.5 * pixel) + pixel;
    world = mix(a, b, corner.x) + dir * (corner.x * 2.0 - 1.0) * reach + normal * (corner.y * 2.0 - 1.0) * reach;
    gl_Position = vec4(world * view.xy + view.zw, 0.0, 1.0);
}`;

const SEGMENT_FRAGMENT = `${HEADER}
uniform vec4 paint;
uniform float half_width;
uniform float pixel;
uniform vec2 dash;
uniform float round_dash;
in vec2 world;
in vec2 a;
in vec2 b;
in float start;
in float caps;
out vec4 colour;
void main() {
    vec2 d = b - a;
    float l2 = dot(d, d);
    float u = l2 > 0.0 ? dot(world - a, d) / l2 : 0.0;
    if ((u < 0.0 && mod(caps, 2.0) < 0.5) || (u > 1.0 && caps < 1.5)) discard;
    float t = clamp(u, 0.0, 1.0);
    float away = length(world - (a + d * t));
    if (dash.x > 0.0) {
        float period = dash.x + dash.y;
        float p = mod(start + u * sqrt(l2), period);
        if (p > dash.x) {
            if (round_dash < 0.5) discard;
            away = length(vec2(away, min(p - dash.x, period - p)));
        }
    }
    float half_seen = max(half_width, 0.5 * pixel);
    float coverage = clamp((half_seen - away) / pixel + 0.5, 0.0, 1.0) * (half_width / half_seen);
    if (coverage <= 0.0) discard;
    colour = paint * coverage;
}`;

const SCREEN_VERTEX = `${HEADER}
layout(location = 0) in vec2 corner;
void main() {
    gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const COMPOSITE_FRAGMENT = `${HEADER}${MASKED}
uniform sampler2D image;
uniform float alpha;
out vec4 colour;
void main() {
    colour = texture(image, gl_FragCoord.xy / screen) * (alpha * masked());
}`;

// the paper's lines are whole device pixels, placed where the page's paper placed them
const GRID_FRAGMENT = `${HEADER}
uniform vec2 screen;
uniform vec4 paint;
uniform vec4 offset;
uniform vec4 step;
uniform float line;
out vec4 colour;
float on(float at, float origin, float every) {
    return every >= 1.0 && mod(at - origin + 0.5, every) < line ? 1.0 : 0.0;
}
void main() {
    vec2 at = vec2(gl_FragCoord.x - 0.5, screen.y - gl_FragCoord.y - 0.5);
    float fine = max(on(at.x, offset.x, step.x), on(at.y, offset.y, step.x)) * step.z;
    float coarse = max(on(at.x, offset.z, step.y), on(at.y, offset.w, step.y)) * step.w;
    colour = paint * (1.0 - (1.0 - fine) * (1.0 - coarse));
}`;

const DISC_VERTEX = `${HEADER}
layout(location = 0) in vec2 corner;
uniform vec4 disc;
uniform vec4 view;
out vec2 world;
void main() {
    world = disc.xy + (corner * 2.0 - 1.0) * (disc.z + disc.w);
    gl_Position = vec4(world * view.xy + view.zw, 0.0, 1.0);
}`;

const DISC_FRAGMENT = `${HEADER}
uniform vec4 disc;
uniform float soft;
in vec2 world;
out vec4 colour;
void main() {
    float d = distance(world, disc.xy);
    float r = disc.z;
    float v = soft < 1.0
        ? 1.0 - clamp((d - soft * r) / ((1.0 - soft) * r), 0.0, 1.0)
        : clamp((r - d) / disc.w + 0.5, 0.0, 1.0);
    colour = vec4(v);
}`;

const SPRITE_VERTEX = `${HEADER}
layout(location = 0) in vec2 corner;
layout(location = 1) in vec2 centre;
layout(location = 2) in vec4 axes;
layout(location = 3) in vec4 source;
layout(location = 4) in vec4 shade;
layout(location = 5) in vec4 filters;
layout(location = 6) in float masking;
uniform vec4 view;
out vec2 uv;
out vec4 multiply;
out vec4 tone;
flat out int channel;
void main() {
    vec2 p = corner * 2.0 - 1.0;
    vec2 w = centre + axes.xy * p.x + axes.zw * p.y;
    uv = source.xy + corner * source.zw;
    multiply = shade;
    tone = filters;
    channel = int(masking + 0.5);
    gl_Position = vec4(w * view.xy + view.zw, 0.0, 1.0);
}`;

const SPRITE_FRAGMENT = `${HEADER}
uniform sampler2D image;
uniform sampler2D mask;
uniform vec2 screen;
in vec2 uv;
in vec4 multiply;
in vec4 tone;
flat in int channel;
out vec4 colour;
void main() {
    vec4 c = texture(image, uv);
    if (c.a > 0.0 && tone != vec4(0.0, 1.0, 1.0, 1.0)) {
        vec3 rgb = c.rgb / c.a;
        float l = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
        rgb = mix(rgb, vec3(l), tone.x);
        rgb = mix(vec3(l), rgb, tone.y);
        rgb = (rgb - 0.5) * tone.z + 0.5;
        rgb *= tone.w;
        c.rgb = clamp(rgb, 0.0, 1.0) * c.a;
    }
    float m = 1.0;
    if (channel > 0) {
        vec4 k = texture(mask, gl_FragCoord.xy / screen);
        m = channel == 1 ? k.r : channel == 2 ? k.g : channel == 3 ? k.b : k.r * (1.0 - k.b);
    }
    colour = c * multiply * m;
}`;

// a disc's quad reaches a pixel past its radius, so its edge is smoothed over one device pixel
const DOTS_VERTEX = `${HEADER}
layout(location = 0) in vec2 corner;
layout(location = 1) in vec3 disc;
layout(location = 2) in vec4 fill;
uniform vec4 view;
uniform float pixel;
out vec2 world;
out vec3 round;
out vec4 paint;
void main() {
    world = disc.xy + (corner * 2.0 - 1.0) * (disc.z + pixel);
    round = disc;
    paint = fill;
    gl_Position = vec4(world * view.xy + view.zw, 0.0, 1.0);
}`;

const DOTS_FRAGMENT = `${HEADER}
uniform float pixel;
in vec2 world;
in vec3 round;
in vec4 paint;
out vec4 colour;
void main() {
    float coverage = clamp((round.z - distance(world, round.xy)) / pixel + 0.5, 0.0, 1.0);
    if (coverage <= 0.0) discard;
    colour = paint * coverage;
}`;

// the water's surface is `surfaceAt` in engine/motion/surface.ts, which this must keep in step with
const WATER_VERTEX = `${HEADER}
layout(location = 0) in vec2 corner;
uniform vec4 box;
uniform vec4 view;
out vec2 world;
void main() {
    world = mix(box.xy, box.zw, corner);
    gl_Position = vec4(world * view.xy + view.zw, 0.0, 1.0);
}`;

const WATER_FRAGMENT = `${HEADER}
uniform vec4 surface;
uniform float bottom;
uniform float pixel;
uniform int count;
uniform vec3 ripples[${MOST_RIPPLES}];
uniform vec4 shallow;
uniform vec4 deep;
uniform vec4 edge;
uniform vec4 light;
in vec2 world;
out vec4 colour;
const float TAU = 6.2831853;
float lift(float x) {
    float level = surface.x, waves = surface.y, flow = surface.z, t = surface.w;
    float u = x - flow * t;
    float y = level + waves * (0.6 * sin(TAU * u / 5.3 + 1.7 * t)
        + 0.4 * sin(TAU * u / (5.3 * 0.53) - 2.3 * t));
    for (int i = 0; i < ${MOST_RIPPLES}; i++) {
        if (i >= count) break;
        vec3 r = ripples[i];
        float behind = r.y * 3.0 - abs(x - r.x);
        if (behind >= 0.0 && r.y < 2.2) {
            float fade = (1.0 - r.y / 2.2) * (1.0 - r.y / 2.2);
            y -= 0.3 * r.z * fade * sin(behind * TAU / 1.4) * exp(-behind * 0.9);
        }
    }
    return y;
}
void main() {
    float s = lift(world.x);
    float below = world.y - s;
    if (below < -0.1 || world.y > bottom + pixel) discard;
    float body = clamp(below / pixel + 0.5, 0.0, 1.0) * clamp((bottom - world.y) / pixel + 0.5, 0.0, 1.0);
    vec4 c = mix(shallow, deep, clamp(below / max(bottom - s, 0.5), 0.0, 1.0)) * body;
    // glints: two broken lines under the surface, carried along with it
    float along = world.x - surface.z * surface.w * 0.5;
    float g1 = step(fract(along / 1.9), 0.32) * clamp((0.04 - abs(below - 0.42)) / pixel + 0.5, 0.0, 1.0);
    float g2 = step(fract((along + 0.8) / 2.7), 0.22) * clamp((0.035 - abs(below - 1.05)) / pixel + 0.5, 0.0, 1.0);
    c = mix(c, light * body, max(g1, g2) * 0.8);
    float e = clamp((0.05 - abs(below)) / pixel + 0.5, 0.0, 1.0);
    colour = edge * e + c * (1.0 - edge.a * e);
}`;

// a light is a soft disc: its reach in alpha, where lights keep the larger, and its hue by that reach squared in colour, where they add
const LIGHT_FRAGMENT = `${HEADER}
in vec2 world;
in vec3 round;
in vec4 paint;
out vec4 colour;
void main() {
    float f = clamp(1.0 - distance(world, round.xy) / round.z, 0.0, 1.0);
    f = f * f * (3.0 - 2.0 * f);
    colour = vec4(paint.rgb * f * f, paint.a * f);
}`;

// each light's hue washed into the paper under it
const SHADE_FRAGMENT = `${HEADER}
uniform sampler2D lit;
uniform vec2 screen;
uniform float halo;
out vec4 colour;
void main() {
    vec4 l = texture(lit, gl_FragCoord.xy / screen);
    vec3 hue = min(l.rgb * halo, vec3(0.85));
    colour = vec4(hue, max(hue.r, max(hue.g, hue.b)));
}`;

// a drop's field falls from one at its middle to nought at its reach, and the fields add where drops meet
const FIELD_FRAGMENT = `${HEADER}
in vec2 world;
in vec3 round;
in vec4 paint;
out vec4 colour;
void main() {
    float f = clamp(1.0 - distance(world, round.xy) / round.z, 0.0, 1.0);
    colour = vec4(f * f, 0.0, 0.0, 0.0);
}`;

// where the drops' fields add to more than a half is water, with a pen line where the sum crosses it
const POOL_FRAGMENT = `${HEADER}
uniform sampler2D field;
uniform vec2 screen;
uniform vec4 fill;
uniform vec4 edge;
out vec4 colour;
void main() {
    float f = texture(field, gl_FragCoord.xy / screen).r;
    float body = smoothstep(0.46, 0.54, f);
    float line = body * (1.0 - smoothstep(0.54, 0.7, f));
    colour = edge * line + fill * body * (1.0 - edge.a * line);
}`;

const PROGRAMS = {
    sprite: [SPRITE_VERTEX, SPRITE_FRAGMENT],
    dots: [DOTS_VERTEX, DOTS_FRAGMENT],
    image: [IMAGE_VERTEX, IMAGE_FRAGMENT],
    fill: [FILL_VERTEX, FILL_FRAGMENT],
    stroke: [STROKE_VERTEX, STROKE_FRAGMENT],
    segment: [SEGMENT_VERTEX, SEGMENT_FRAGMENT],
    composite: [SCREEN_VERTEX, COMPOSITE_FRAGMENT],
    grid: [SCREEN_VERTEX, GRID_FRAGMENT],
    disc: [DISC_VERTEX, DISC_FRAGMENT],
    water: [WATER_VERTEX, WATER_FRAGMENT],
    light: [DOTS_VERTEX, LIGHT_FRAGMENT],
    shade: [SCREEN_VERTEX, SHADE_FRAGMENT],
    field: [DOTS_VERTEX, FIELD_FRAGMENT],
    pool: [SCREEN_VERTEX, POOL_FRAGMENT],
} as const;
type ProgramName = keyof typeof PROGRAMS;

const CHANNEL: Record<MaskChannel, number> = { known: 1, colour: 2, reached: 3, pencil: 4 };

/** A hex colour, as the map's tokens are written, premultiplied at an alpha. */
export function premultiplied(css: string, alpha: number): Quad {
    const hex = /^#([0-9a-f]{3,8})$/i.exec(css.trim())?.[1] ?? "000";
    const full = hex.length <= 4 ? hex.replace(/./g, (c) => c + c) : hex;
    const n = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255;
    const a = (full.length >= 8 ? n(6) : 1) * alpha;
    return [n(0) * a, n(2) * a, n(4) * a, a];
}

interface Held {
    generation: number;
    texture?: WebGLTexture;
    buffer?: WebGLBuffer;
    vao?: WebGLVertexArrayObject;
    /** How many of a shape's points are its polygon; its box's four follow them. */
    points?: number;
}

/** A buffer filled afresh for each draw, with the vertex array that reads it instanced over the quad. */
interface Batch {
    buffer: WebGLBuffer;
    vao: WebGLVertexArrayObject;
}

interface Target {
    framebuffer: WebGLFramebuffer;
    texture: WebGLTexture;
    stencil: WebGLRenderbuffer | null;
    w: number;
    h: number;
}

/**
 * One canvas's renderer. A lost context drops every resource; `restored` is told once a new context is
 * ready, and whoever holds resources makes them again, since `live` answers false for the old ones.
 */
export function canvasGl(canvas: HTMLCanvasElement, restored: () => void) {
    const gl = canvas.getContext("webgl2", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: true,
        preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error("WebGL2 is unavailable");
    let generation = 0,
        lost = false,
        density = 1;
    const resources = new Map<GlResource, Held>();
    const programs = new Map<
        string,
        { program: WebGLProgram; where: Map<string, WebGLUniformLocation> }
    >();
    let quad: WebGLBuffer | null = null,
        quadVao: WebGLVertexArrayObject | null = null,
        batches: { sprite: Batch; line: Batch; dots: Batch } | null = null,
        maskTarget: Target | null = null,
        groupTarget: Target | null = null,
        lightTarget: Target | null = null,
        fieldTarget: Target | null = null,
        blank: WebGLTexture | null = null;

    const compile = (type: number, text: string): WebGLShader => {
        const shader = gl.createShader(type);
        if (!shader) throw new Error("Could not create a shader");
        gl.shaderSource(shader, text);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            throw new Error(gl.getShaderInfoLog(shader) ?? "The map's shader did not compile");
        return shader;
    };
    const build = (): void => {
        programs.clear();
        for (const [name, [vertex, fragment]] of Object.entries(PROGRAMS)) {
            const program = gl.createProgram();
            gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
            gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS))
                throw new Error(gl.getProgramInfoLog(program) ?? "The map's shader did not link");
            const where = new Map<string, WebGLUniformLocation>();
            const count = Number(gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS));
            for (let i = 0; i < count; i++) {
                const info = gl.getActiveUniform(program, i);
                const at = info && gl.getUniformLocation(program, info.name);
                if (info && at) where.set(info.name, at);
            }
            programs.set(name, { program, where });
        }
        quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
        quadVao = gl.createVertexArray();
        gl.bindVertexArray(quadVao);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        const batch = (attributes: readonly (readonly [number, number])[]): Batch => {
            const buffer = gl.createBuffer();
            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);
            gl.bindBuffer(gl.ARRAY_BUFFER, quad);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            const stride = attributes.reduce((n, [, size]) => n + size, 0) * 4;
            let offset = 0;
            for (const [location, size] of attributes) {
                gl.enableVertexAttribArray(location);
                gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
                gl.vertexAttribDivisor(location, 1);
                offset += size * 4;
            }
            gl.bindVertexArray(null);
            return { buffer, vao };
        };
        batches = {
            sprite: batch([
                [1, 2],
                [2, 4],
                [3, 4],
                [4, 4],
                [5, 4],
                [6, 1],
            ]),
            line: batch([
                [1, 4],
                [2, 1],
                [3, 1],
            ]),
            dots: batch([
                [1, 3],
                [2, 4],
            ]),
        };
        blank = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, blank);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([255, 255, 255, 255]),
        );
        maskTarget = groupTarget = lightTarget = fieldTarget = null;
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        generation++;
    };
    build();

    const onLost = (e: Event): void => {
        e.preventDefault();
        lost = true;
        resources.clear();
    };
    const onRestored = (): void => {
        lost = false;
        build();
        restored();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    const held = (r: GlResource): Held | null => {
        const h = resources.get(r);
        return h && h.generation === generation ? h : null;
    };

    /** A target the size of the canvas, made again when the canvas changes size. */
    const target = (had: Target | null, w: number, h: number, stencil: boolean): Target => {
        if (had && had.w === w && had.h === h) return had;
        if (had) {
            gl.deleteFramebuffer(had.framebuffer);
            gl.deleteTexture(had.texture);
            if (had.stencil) gl.deleteRenderbuffer(had.stencil);
        }
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        let marks: WebGLRenderbuffer | null = null;
        if (stencil) {
            marks = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, marks);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.STENCIL_INDEX8, w, h);
            gl.framebufferRenderbuffer(
                gl.FRAMEBUFFER,
                gl.STENCIL_ATTACHMENT,
                gl.RENDERBUFFER,
                marks,
            );
        }
        return { framebuffer, texture, stencil: marks, w, h };
    };

    const use = (name: ProgramName): ((uniform: string) => WebGLUniformLocation | null) => {
        const p = programs.get(name);
        if (!p) throw new Error(`The map's ${name} program is missing`);
        gl.useProgram(p.program);
        return (uniform) => p.where.get(uniform) ?? null;
    };
    const masking = (
        at: (u: string) => WebGLUniformLocation | null,
        channel: number,
        w: number,
        h: number,
    ): void => {
        gl.uniform1i(at("channel"), channel);
        gl.uniform1i(at("mask"), 1);
        gl.uniform2f(at("screen"), w, h);
    };

    const strokeRun = (
        run: GlRun,
        view: Quad,
        pixel: number,
        fade: { outer: Rect; inner: Rect } | null,
    ): void => {
        const h = held(run.strokes);
        if (!h?.vao) return;
        const at = use("stroke");
        gl.uniform4f(at("view"), ...view);
        gl.uniform4f(at("paint"), ...premultiplied(run.colour, 1));
        gl.uniform1f(at("half_width"), run.width / 2);
        gl.uniform1f(at("pixel"), pixel);
        gl.uniform2f(at("dash"), run.dash[0] ?? 0, run.dash[1] ?? run.dash[0] ?? 0);
        const o = fade?.outer,
            i = fade?.inner;
        gl.uniform4f(at("outer"), o?.x ?? 0, o?.y ?? 0, o?.w ?? 0, o?.h ?? 0);
        gl.uniform4f(at("inner"), i?.x ?? 0, i?.y ?? 0, i?.w ?? 0, i?.h ?? 0);
        gl.bindVertexArray(h.vao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, run.strokes.count);
    };
    /** A game's line segments, from the batch buffer, in one style. */
    const lines = (
        vao: WebGLVertexArrayObject,
        count: number,
        run: Omit<GlRun, "strokes"> & { round: boolean },
        alpha: number,
        view: Quad,
        pixel: number,
    ): void => {
        const at = use("segment");
        gl.uniform4f(at("view"), ...view);
        gl.uniform4f(at("paint"), ...premultiplied(run.colour, alpha));
        gl.uniform1f(at("half_width"), run.width / 2);
        gl.uniform1f(at("pixel"), pixel);
        gl.uniform2f(at("dash"), run.dash[0] ?? 0, run.dash[1] ?? run.dash[0] ?? 0);
        gl.uniform1f(at("round_dash"), run.round ? 1 : 0);
        gl.bindVertexArray(vao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    };

    /**
     * Fills a polygon even-odd: the stencil marks what an odd number of the fan's triangles cover, and
     * a pass over its box paints what is marked and clears the mark behind it.
     */
    const fill = (
        shape: GlShape,
        paint: Quad,
        view: Quad,
        channel: number,
        size: { w: number; h: number },
        writes: Writes,
    ): void => {
        const s = held(shape);
        if (!s?.vao || !s.points) return;
        const at = use("fill");
        gl.uniform4f(at("view"), ...view);
        gl.uniform4f(at("paint"), ...paint);
        masking(at, channel, size.w, size.h);
        gl.bindVertexArray(s.vao);
        gl.enable(gl.STENCIL_TEST);
        gl.colorMask(false, false, false, false);
        gl.stencilFunc(gl.ALWAYS, 0, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, s.points);
        gl.colorMask(...writes);
        gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
        gl.stencilOp(gl.ZERO, gl.ZERO, gl.ZERO);
        gl.drawArrays(gl.TRIANGLE_STRIP, s.points, 4);
        gl.disable(gl.STENCIL_TEST);
    };

    const ALL: Writes = [true, true, true, true];

    return {
        /** Backing pixels per CSS pixel, which the canvas is sized to the view at. */
        setDensity(d: number): void {
            density = d;
        },
        /** An image as a texture, with mipmaps unless it is only ever drawn at the size it was made. */
        upload(source: TexImageSource, w: number, h: number, mipmaps = true): GlTexture | null {
            if (lost || w < 1 || h < 1) return null;
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            try {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
            } catch {
                gl.deleteTexture(texture);
                return null;
            }
            const mip = mipmaps && w > 1 && h > 1;
            if (mip) gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_MIN_FILTER,
                mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            const t: GlTexture = {
                kind: "texture",
                w,
                h,
                bytes: Math.round(w * h * 4 * (mip ? 4 / 3 : 1)),
            };
            resources.set(t, { generation, texture });
            return t;
        },
        /**
         * An empty texture `w` by `h`, for a page that looks are written into one by one; with
         * `mipmaps`, two levels down, as far as a cell's four pixels of padding keep it from its
         * neighbours, made again by `mipmap` once writes are done.
         */
        page(w: number, h: number, mipmaps = false): GlTexture | null {
            if (lost || w < 1 || h < 1) return null;
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            if (mipmaps) {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 2);
                gl.generateMipmap(gl.TEXTURE_2D);
            }
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_MIN_FILTER,
                mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            const t: GlTexture = {
                kind: "texture",
                w,
                h,
                bytes: Math.round(w * h * 4 * (mipmaps ? 21 / 16 : 1)),
            };
            resources.set(t, { generation, texture });
            return t;
        },
        /** Makes a page's mipmaps again after writes into it. */
        mipmap(t: GlTexture): void {
            const h = held(t);
            if (!h?.texture) return;
            gl.bindTexture(gl.TEXTURE_2D, h.texture);
            gl.generateMipmap(gl.TEXTURE_2D);
        },
        /** Writes an image into a page at `x, y`, in pixels; false when the page is gone. */
        write(t: GlTexture, x: number, y: number, source: TexImageSource): boolean {
            const h = held(t);
            if (!h?.texture) return false;
            gl.bindTexture(gl.TEXTURE_2D, h.texture);
            try {
                gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, source);
            } catch {
                return false;
            }
            return true;
        },
        /** Segments as `[ax, ay, bx, by, along]` each, `along` being how far into its dash pattern `a` is. */
        strokes(segments: Float32Array): GlStrokes | null {
            if (lost || segments.length < 5) return null;
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, segments, gl.STATIC_DRAW);
            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);
            gl.bindBuffer(gl.ARRAY_BUFFER, quad);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.enableVertexAttribArray(1);
            gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 20, 0);
            gl.vertexAttribDivisor(1, 1);
            gl.enableVertexAttribArray(2);
            gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 20, 16);
            gl.vertexAttribDivisor(2, 1);
            gl.bindVertexArray(null);
            const s: GlStrokes = {
                kind: "strokes",
                count: Math.floor(segments.length / 5),
                bytes: segments.byteLength,
            };
            resources.set(s, { generation, buffer, vao });
            return s;
        },
        /** A polygon, as its points' `x, y` in turn. */
        shape(points: Float32Array): GlShape | null {
            if (lost || points.length < 6) return null;
            let x0 = Infinity,
                y0 = Infinity,
                x1 = -Infinity,
                y1 = -Infinity;
            for (let i = 0; i + 1 < points.length; i += 2) {
                const x = points[i] ?? 0,
                    y = points[i + 1] ?? 0;
                x0 = Math.min(x0, x);
                y0 = Math.min(y0, y);
                x1 = Math.max(x1, x);
                y1 = Math.max(y1, y);
            }
            const data = new Float32Array(points.length + 8);
            data.set(points);
            data.set([x0, y0, x1, y0, x0, y1, x1, y1], points.length);
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.bindVertexArray(null);
            const s: GlShape = {
                kind: "shape",
                box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
                bytes: data.byteLength,
            };
            resources.set(s, { generation, buffer, vao, points: points.length / 2 });
            return s;
        },
        release(r: GlResource): void {
            const h = held(r);
            resources.delete(r);
            if (!h || lost) return;
            if (h.texture) gl.deleteTexture(h.texture);
            if (h.buffer) gl.deleteBuffer(h.buffer);
            if (h.vao) gl.deleteVertexArray(h.vao);
        },
        live: (r: GlResource): boolean => !lost && !!held(r),

        draw(camera: Camera, size: Size, frame: GlFrame): void {
            if (lost) return;
            const w = Math.max(1, Math.round(size.w * density)),
                h = Math.max(1, Math.round(size.h * density));
            if (canvas.width !== w) canvas.width = w;
            if (canvas.height !== h) canvas.height = h;
            const screen = { w, h };
            const sx = (2 * camera.z) / size.w,
                sy = (-2 * camera.z) / size.h;
            const view: Quad = [sx, sy, -camera.x * sx, -camera.y * sy];
            /** World units a device pixel covers. */
            const pixel = 1 / (camera.z * density);
            gl.viewport(0, 0, w, h);
            gl.enable(gl.BLEND);

            // the masks, into their target: known in red, colour in green and reached in blue, each the union of its shapes
            const mask = frame.mask;
            if (mask) {
                maskTarget = target(maskTarget, w, h, true);
                // no texture a pass draws into may be bound for reading, or WebGL refuses the draw
                for (const unit of [gl.TEXTURE0, gl.TEXTURE1]) {
                    gl.activeTexture(unit);
                    gl.bindTexture(gl.TEXTURE_2D, blank);
                }
                gl.activeTexture(gl.TEXTURE0);
                gl.bindFramebuffer(gl.FRAMEBUFFER, maskTarget.framebuffer);
                gl.colorMask(true, true, true, true);
                gl.clearColor(mask.known ? 0 : 1, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
                gl.blendEquation(gl.MAX);
                gl.blendFunc(gl.ONE, gl.ONE);
                const into = (shapes: readonly MaskShape[], writes: Writes): void => {
                    gl.colorMask(...writes);
                    for (const s of shapes) {
                        if (s.kind === "disc") {
                            const at = use("disc");
                            gl.uniform4f(at("view"), ...view);
                            gl.uniform4f(at("disc"), s.x, s.y, s.r, pixel);
                            gl.uniform1f(at("soft"), s.soft);
                            gl.bindVertexArray(quadVao);
                            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                        } else if (s.kind === "strokes") {
                            const g = s.grow;
                            strokeRun(
                                { strokes: s.strokes, colour: "#fff", width: s.width, dash: [] },
                                g
                                    ? [
                                          view[0] * g.f,
                                          view[1] * g.f,
                                          view[2] + view[0] * g.x * (1 - g.f),
                                          view[3] + view[1] * g.y * (1 - g.f),
                                      ]
                                    : view,
                                g ? pixel / g.f : pixel,
                                null,
                            );
                        } else if (s.kind === "fill")
                            fill(s.shape, [1, 1, 1, 1], view, 0, screen, writes);
                        else {
                            gl.disable(gl.BLEND);
                            fill(s.shape, [0, 0, 0, 0], view, 0, screen, writes);
                            gl.enable(gl.BLEND);
                        }
                    }
                };
                if (mask.known) into(mask.known, [true, false, false, false]);
                into(mask.colour, [false, true, false, false]);
                into(mask.reached, [false, false, true, false]);
                gl.colorMask(true, true, true, true);
                gl.blendEquation(gl.FUNC_ADD);
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, mask && maskTarget ? maskTarget.texture : blank);
            gl.activeTexture(gl.TEXTURE0);
            const channel = (m: MaskChannel | undefined): number => (m && mask ? CHANNEL[m] : 0);

            if (frame.grid) {
                const at = use("grid");
                const [fine, coarse] = frame.grid.layers;
                const every = (s: number | undefined) => (s ?? 0) * camera.z * density;
                const offset = (o: number, s: number) => (s >= 1 ? ((o % s) + s) % s : 0);
                const ox = (size.w / 2 - camera.x * camera.z) * density,
                    oy = (size.h / 2 - camera.y * camera.z) * density;
                const sf = every(fine?.step),
                    sc = every(coarse?.step);
                gl.uniform2f(at("screen"), w, h);
                gl.uniform4f(at("paint"), ...premultiplied(frame.grid.colour, 1));
                gl.uniform4f(
                    at("offset"),
                    offset(ox, sf),
                    offset(oy, sf),
                    offset(ox, sc),
                    offset(oy, sc),
                );
                gl.uniform4f(at("step"), sf, sc, fine?.alpha ?? 0, coarse?.alpha ?? 0);
                gl.uniform1f(at("line"), Math.max(1, Math.round(density)));
                gl.bindVertexArray(quadVao);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }

            const through = (c: Camera | undefined): { view: Quad; pixel: number } =>
                c
                    ? {
                          view: [
                              (2 * c.z) / size.w,
                              (-2 * c.z) / size.h,
                              (-c.x * 2 * c.z) / size.w,
                              (c.y * 2 * c.z) / size.h,
                          ],
                          pixel: 1 / (c.z * density),
                      }
                    : { view, pixel };
            for (const d of frame.draws) {
                if (d.kind === "sprites") {
                    const page = held(d.texture);
                    if (!page?.texture || !batches || d.count < 1) continue;
                    const at = use("sprite");
                    gl.uniform4f(at("view"), ...through(d.camera).view);
                    gl.uniform1i(at("image"), 0);
                    gl.uniform1i(at("mask"), 1);
                    gl.uniform2f(at("screen"), w, h);
                    gl.bindTexture(gl.TEXTURE_2D, page.texture);
                    gl.bindBuffer(gl.ARRAY_BUFFER, batches.sprite.buffer);
                    gl.bufferData(
                        gl.ARRAY_BUFFER,
                        d.instances.subarray(0, d.count * SPRITE),
                        gl.STREAM_DRAW,
                    );
                    gl.bindVertexArray(batches.sprite.vao);
                    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, d.count);
                } else if (d.kind === "lines") {
                    if (!batches || d.count < 1) continue;
                    gl.bindBuffer(gl.ARRAY_BUFFER, batches.line.buffer);
                    gl.bufferData(
                        gl.ARRAY_BUFFER,
                        d.segments.subarray(0, d.count * SEGMENT),
                        gl.STREAM_DRAW,
                    );
                    const seen = through(d.camera);
                    lines(batches.line.vao, d.count, d, d.alpha, seen.view, seen.pixel);
                } else if (d.kind === "dots") {
                    if (!batches || d.count < 1) continue;
                    const seen = through(d.camera);
                    const at = use("dots");
                    gl.uniform4f(at("view"), ...seen.view);
                    gl.uniform1f(at("pixel"), seen.pixel);
                    gl.bindBuffer(gl.ARRAY_BUFFER, batches.dots.buffer);
                    gl.bufferData(
                        gl.ARRAY_BUFFER,
                        d.discs.subarray(0, d.count * DOT),
                        gl.STREAM_DRAW,
                    );
                    gl.bindVertexArray(batches.dots.vao);
                    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, d.count);
                } else if (d.kind === "water") {
                    const seen = through(d.camera);
                    const at = use("water");
                    const top = d.level - d.waves - 1;
                    gl.uniform4f(at("view"), ...seen.view);
                    gl.uniform4f(at("box"), d.x0, top, d.x1, d.bottom + seen.pixel);
                    gl.uniform4f(at("surface"), d.level, d.waves, d.flow, d.time);
                    gl.uniform1f(at("bottom"), d.bottom);
                    gl.uniform1f(at("pixel"), seen.pixel);
                    const n = Math.min(MOST_RIPPLES, d.count);
                    gl.uniform1i(at("count"), n);
                    if (n > 0) gl.uniform3fv(at("ripples[0]"), d.ripples.subarray(0, n * RIPPLES));
                    gl.uniform4f(at("shallow"), ...premultiplied(d.shallow, 0.55));
                    gl.uniform4f(at("deep"), ...premultiplied(d.deep, 0.8));
                    gl.uniform4f(at("edge"), ...premultiplied(d.edge, 1));
                    gl.uniform4f(at("light"), ...premultiplied(d.light, 0.9));
                    gl.bindVertexArray(quadVao);
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                } else if (d.kind === "shade") {
                    if (!batches) continue;
                    // the lights go into a target a quarter the size, drawn smooth, since they are soft
                    const lw = Math.max(1, Math.ceil(w / 4)),
                        lh = Math.max(1, Math.ceil(h / 4));
                    const made = target(lightTarget, lw, lh, false);
                    if (made !== lightTarget) {
                        gl.bindTexture(gl.TEXTURE_2D, made.texture);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                        lightTarget = made;
                    }
                    gl.bindTexture(gl.TEXTURE_2D, blank);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, made.framebuffer);
                    gl.viewport(0, 0, lw, lh);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    if (d.count > 0) {
                        const seen = through(d.camera);
                        const at = use("light");
                        gl.uniform4f(at("view"), ...seen.view);
                        gl.uniform1f(at("pixel"), seen.pixel * 4);
                        gl.blendEquationSeparate(gl.FUNC_ADD, gl.MAX);
                        gl.blendFunc(gl.ONE, gl.ONE);
                        gl.bindBuffer(gl.ARRAY_BUFFER, batches.dots.buffer);
                        gl.bufferData(
                            gl.ARRAY_BUFFER,
                            d.lights.subarray(0, d.count * DOT),
                            gl.STREAM_DRAW,
                        );
                        gl.bindVertexArray(batches.dots.vao);
                        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, d.count);
                        gl.blendEquation(gl.FUNC_ADD);
                        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                    }
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                    gl.viewport(0, 0, w, h);
                    const at = use("shade");
                    gl.uniform1i(at("lit"), 0);
                    gl.uniform2f(at("screen"), w, h);
                    gl.uniform1f(at("halo"), d.halo);
                    gl.bindTexture(gl.TEXTURE_2D, made.texture);
                    gl.bindVertexArray(quadVao);
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                } else if (d.kind === "liquid") {
                    if (!batches || d.count < 1) continue;
                    // the field wants more than a byte a channel, so it is drawn at half size and read smooth
                    const fw = Math.max(1, Math.ceil(w / 2)),
                        fh = Math.max(1, Math.ceil(h / 2));
                    const made = target(fieldTarget, fw, fh, false);
                    if (made !== fieldTarget) {
                        gl.bindTexture(gl.TEXTURE_2D, made.texture);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                        fieldTarget = made;
                    }
                    gl.bindTexture(gl.TEXTURE_2D, blank);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, made.framebuffer);
                    gl.viewport(0, 0, fw, fh);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    const seen = through(d.camera);
                    const fat = use("field");
                    gl.uniform4f(fat("view"), ...seen.view);
                    gl.uniform1f(fat("pixel"), seen.pixel * 2);
                    gl.blendFunc(gl.ONE, gl.ONE);
                    gl.bindBuffer(gl.ARRAY_BUFFER, batches.dots.buffer);
                    gl.bufferData(
                        gl.ARRAY_BUFFER,
                        d.drops.subarray(0, d.count * DOT),
                        gl.STREAM_DRAW,
                    );
                    gl.bindVertexArray(batches.dots.vao);
                    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, d.count);
                    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                    gl.viewport(0, 0, w, h);
                    const at = use("pool");
                    gl.uniform1i(at("field"), 0);
                    gl.uniform2f(at("screen"), w, h);
                    gl.uniform4f(at("fill"), ...premultiplied(d.fill, 0.75));
                    gl.uniform4f(at("edge"), ...premultiplied(d.edge, 1));
                    gl.bindTexture(gl.TEXTURE_2D, made.texture);
                    gl.bindVertexArray(quadVao);
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                } else if (d.kind === "image") {
                    const image = held(d.texture);
                    if (!image?.texture) continue;
                    const at = use("image");
                    const m = d.at,
                        r = d.rect;
                    // the unit square to the rect, then the rect by the transform
                    gl.uniformMatrix3fv(at("place"), false, [
                        m[0] * r.w,
                        m[1] * r.w,
                        0,
                        m[2] * r.h,
                        m[3] * r.h,
                        0,
                        m[0] * r.x + m[2] * r.y + m[4],
                        m[1] * r.x + m[3] * r.y + m[5],
                        1,
                    ]);
                    const s = d.source ?? { x: 0, y: 0, w: 1, h: 1 };
                    gl.uniform4f(at("source"), s.x, s.y, s.w, s.h);
                    gl.uniform4f(at("view"), ...view);
                    gl.uniform1f(at("alpha"), d.alpha);
                    const tone = d.tone ?? PLAIN;
                    gl.uniform4f(
                        at("tone"),
                        tone.gray,
                        tone.saturate,
                        tone.contrast,
                        tone.brightness,
                    );
                    gl.uniform1i(at("image"), 0);
                    masking(at, channel(d.mask), w, h);
                    gl.uniform1i(at("tinted"), d.tint ? 1 : 0);
                    if (d.tint) {
                        const [fr, fg, fb] = premultiplied(d.tint.from, 1),
                            [tr, tg, tb] = premultiplied(d.tint.to, 1);
                        gl.uniform3f(at("tint_from"), fr, fg, fb);
                        gl.uniform3f(at("tint_to"), tr, tg, tb);
                    }
                    gl.bindTexture(gl.TEXTURE_2D, image.texture);
                    gl.bindVertexArray(quadVao);
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                } else if (d.kind === "fill")
                    fill(
                        d.shape,
                        premultiplied(d.colour, d.alpha),
                        view,
                        channel(d.mask),
                        screen,
                        ALL,
                    );
                else {
                    // strokes are drawn opaque into a target of their own, then laid down at the group's alpha
                    groupTarget = target(groupTarget, w, h, false);
                    gl.bindTexture(gl.TEXTURE_2D, blank);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, groupTarget.framebuffer);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    for (const run of d.runs) strokeRun(run, view, pixel, d.fade ?? null);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                    const at = use("composite");
                    masking(at, channel(d.mask), w, h);
                    gl.uniform1i(at("image"), 0);
                    gl.uniform1f(at("alpha"), d.alpha);
                    gl.bindTexture(gl.TEXTURE_2D, groupTarget.texture);
                    gl.bindVertexArray(quadVao);
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                }
            }
            gl.bindVertexArray(null);
        },
        stop(): void {
            canvas.removeEventListener("webglcontextlost", onLost);
            canvas.removeEventListener("webglcontextrestored", onRestored);
            if (!lost) gl.getExtension("WEBGL_lose_context")?.loseContext();
            resources.clear();
            canvas.width = canvas.height = 0;
        },
    };
}
