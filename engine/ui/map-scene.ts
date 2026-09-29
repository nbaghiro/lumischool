// A map's or a roll's drawings on the GPU (.docs/overworld-gpu.md, .docs/world-gpu.md). The painters put
// what they draw into a hidden copy of the world, where the page's stylesheets still apply; each SVG in it is
// read into a display list and drawn by the workers (sprites.ts) into the atlas at the size the camera shows
// it, a large one as tiles, placed by the same positions and transforms, and moved by the same CSS and script
// animations, evaluated here. A drawing's parts that move are drawn on their own. What carries text is moved
// into the visible world instead, over the canvas.
import {
    intersects,
    union,
    paperLayers,
    visibleRect,
    type Camera,
    type MapView,
    type Rect,
    type Size,
} from "../space";
import type { Tokens } from "../paper";
import type { Group } from "./animate";
import {
    bounds,
    IDENTITY,
    glDensity,
    canvasGl,
    multiply,
    PLAIN,
    SPRITE,
    translation,
    type Affine,
    type GlDraw,
    type GlTexture,
    type Tone,
} from "./gl";
import { terrain, type Terrain } from "./map-tiles";
import { atlas, CELL, PAD, type Slot } from "./atlas";
import { movingPartsOf, PARTS, rasterize, sketchOf, warmRasterizers, type Sketch } from "./sprites";
import { mapCount, mapNote } from "./map-diagnostics";
import { smallDevice } from "./device";

const MB = 1024 * 1024;
/** What rasterized drawings may hold on the GPU before the least recently drawn are let go; less on a phone. */
const BUDGET = (smallDevice ? 48 : 96) * MB;
/**
 * What the atlas's pages may hold in a scene that tiles its largest drawings, whose tiles fill them;
 * WebGL's textures are the GPU process's memory, not the page's (.docs/world-gpu.md, "What the phone
 * showed"). A scene without tiles keeps half of `BUDGET`, as the map did when the phone was measured.
 */
const PAGES = (smallDevice ? 96 : 192) * MB;
/** A tile's side in pixels, which with the atlas's padding round it is one cell exactly. */
const TILE = CELL - 2 * PAD;
/** How large on screen a drawing may be before it is drawn as tiles, in pixels. */
const TILED = 1024;
/** How long a source being prepared may take to draw before it is shown as it is, in ms. */
const PREPARING = 1000;
/** How long a tile with nothing drawn in it is kept for as a place in the grid, in ms. */
const FORGOTTEN = 20_000;
/** The largest side a texture is given; a drawing larger than that on screen is drawn a window at a time. */
const LARGEST = 2048;
/** How far past its box a drawing is rasterized, for the strokes and motion that overflow it. */
const OVERFLOW = 0.2;
/** How many drawings are with the workers at once; they draw off the page's thread, so a few at a time. */
const DECODING = 6;
/**
 * And how many pixels they draw between them, so a few large drawings do not hold every worker while
 * many small ones wait; one drawing goes however large it is.
 */
const DECODING_PIXELS = 6 * 1024 * 1024;
/** The most backing pixels the map's canvas has, whatever the window. */
const PIXELS = 4_000_000;
/** What a label holds when it holds only words, so it can move over the canvas whole. */
const INLINE = new Set(["SPAN", "B", "I", "EM", "STRONG", "BR", "SMALL"]);
/** Milliseconds of a frame given to uploading drawings, since the browser draws an svg as it uploads it. */
const UPLOADING = 6;
/** How many times a drawing the workers could not draw is asked for before it is given up on. */
const RETRIES = 4;
/** How long a raster job waits for a frame to want it again before it is dropped, in ms. */
const FORGET_JOB = 250;
/** How long a drawing that arrives late takes to fade in, in ms. */
const ARRIVES = 120;
/** How long after the camera last moved it counts as settled, when the drawings are drawn sharp again. */
const SETTLE = 200;

interface Motion {
    name: string;
    frames: Frame[];
    duration: number;
    delay: number;
    iterations: number;
    alternate: boolean;
    ease: (t: number) => number;
    born: number;
    pausedAt: number | null;
    /** When whether it is paused was last read, which is read twice a second rather than each frame. */
    checked: number;
    paused: boolean;
}
interface Frame {
    at: number;
    /** The transform as parts when it can be held as parts, which interpolate as CSS does. */
    pose: Parts | null;
    m: Affine;
    /** Whether the frame sets a transform at all. */
    moves: boolean;
    opacity: number | null;
    /** The easing to the next frame, when the frame declares its own. */
    ease: ((t: number) => number) | null;
}
interface Parts {
    tx: number;
    ty: number;
    rotate: number;
    sx: number;
    sy: number;
}
interface Info {
    kind: "box" | "svg" | "shade" | "skip";
    hidden: boolean;
    at: Affine;
    origin: [number, number];
    offset: [number, number];
    size: Size;
    opacity: number;
    tone: Tone;
    motion: Motion | null;
}
interface Leaf {
    svg: SVGSVGElement;
    /** A part drawn on its own, or null for the drawing without its moving parts. */
    part: Element | null;
    /** Whether the moving parts were left out of what the texture holds. */
    split: boolean;
    texture: GlTexture | null;
    /** Where it is in the atlas instead, for a drawing small enough to share a page. */
    slot: Slot | null;
    scale: number;
    rect: Rect;
    version: number;
    /** The version the texture was drawn from. */
    rastered: number;
    /** The version the browser could not draw, which is not asked for again. */
    failed: number;
    drawn: number;
    pending: boolean;
    /** For one tile of a drawing too large for one texture, its place in the tiles' grid (`tileKey`). */
    tile?: string;
    /** Drawn and found to hold nothing, as most tiles of a long road do, so it keeps no pixels. */
    empty?: boolean;
    /** The last frame it put pixels on the screen, itself or through a tile standing in for it. */
    shown?: number;
    /** When a tile was last in view, in ms, for letting go of a place in the grid nothing was drawn in. */
    seen?: number;
    /** The last frame it put its own pixels on the screen, rather than a stand-in's. */
    own?: number;
    /** When pixels came for it while it was on the screen with none, which it fades in from, in ms. */
    born?: number;
    /** The markup and part its pixels were drawn from, by which another drawing may share them. */
    drew?: string;
    /** The last frame it was on the screen with nothing to show, which it fades in after. */
    late?: number;
    /** How many times in a row the workers could not draw it, and when it may be asked for again. */
    failures?: number;
    retryAt?: number;
}

const px = (s: string | null | undefined): number | null => {
    if (!s) return null;
    const n = parseFloat(s);
    return Number.isFinite(n) && /px$|^-?[\d.]+$/.test(s.trim()) ? n : null;
};
const angle = (s: string): number => {
    const n = parseFloat(s);
    if (s.endsWith("deg")) return (n * Math.PI) / 180;
    if (s.endsWith("turn")) return n * Math.PI * 2;
    if (s.endsWith("grad")) return (n * Math.PI) / 200;
    return n;
};

/** A transform written with the functions the painters use, as the parts an animation interpolates. */
export function parts(text: string): Parts | Affine | null {
    const p: Parts = { tx: 0, ty: 0, rotate: 0, sx: 1, sy: 1 };
    if (!text || text === "none") return p;
    const matrix = /^matrix\(([^)]+)\)$/.exec(text.trim());
    if (matrix) {
        const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = (matrix[1] ?? "")
            .split(/[\s,]+/)
            .filter(Boolean)
            .map(Number);
        return [a, b, c, d, e, f];
    }
    let m: Affine = IDENTITY;
    let plain = true;
    for (const [, name = "", args = ""] of text.matchAll(/([a-zA-Z]+)\(([^)]*)\)/g)) {
        const v = args.split(/[\s,]+/).filter(Boolean);
        const n = (i: number, d = 0) => (v[i] === undefined ? d : parseFloat(v[i] ?? "0"));
        let step: Affine = IDENTITY,
            turn = 0;
        if (name === "translate") step = translation(n(0), n(1));
        else if (name === "translateX") step = translation(n(0), 0);
        else if (name === "translateY") step = translation(0, n(0));
        else if (name === "rotate") {
            // an svg's attribute turns by degrees about an optional centre
            const r = (turn = angle(/[a-z]$/.test(v[0] ?? "") ? (v[0] ?? "0") : `${v[0] ?? 0}deg`));
            const [cx, cy] = [n(1), n(2)];
            step = multiply(
                multiply(translation(cx, cy), [
                    Math.cos(r),
                    Math.sin(r),
                    -Math.sin(r),
                    Math.cos(r),
                    0,
                    0,
                ]),
                translation(-cx, -cy),
            );
            if (cx || cy) plain = false;
        } else if (name === "scale") step = [n(0, 1), 0, 0, n(1, n(0, 1)), 0, 0];
        else if (name === "scaleX") step = [n(0, 1), 0, 0, 1, 0, 0];
        else if (name === "scaleY") step = [1, 0, 0, n(0, 1), 0, 0];
        else return null;
        if (plain) {
            // translate, then rotate, then scale is what an animation's parts can hold exactly
            if (name.startsWith("translate") && p.rotate === 0 && p.sx === 1 && p.sy === 1) {
                p.tx += step[4];
                p.ty += step[5];
            } else if (name === "rotate" && p.sx === 1 && p.sy === 1) p.rotate += turn;
            else if (name.startsWith("scale")) {
                p.sx *= step[0];
                p.sy *= step[3];
            } else plain = false;
        }
        m = multiply(m, step);
    }
    return plain ? p : m;
}
export const affineOf = (p: Parts | Affine): Affine =>
    "tx" in p
        ? multiply(
              multiply(translation(p.tx, p.ty), [
                  Math.cos(p.rotate),
                  Math.sin(p.rotate),
                  -Math.sin(p.rotate),
                  Math.cos(p.rotate),
                  0,
                  0,
              ]),
              [p.sx, 0, 0, p.sy, 0, 0],
          )
        : p;

export function toneOf(filter: string): Tone {
    if (!filter || filter === "none") return PLAIN;
    const t = { ...PLAIN };
    for (const [, name, arg = "1"] of filter.matchAll(/([a-z-]+)\(([^)]*)\)/g)) {
        const n = arg.trim().endsWith("%") ? parseFloat(arg) / 100 : parseFloat(arg);
        if (name === "grayscale") t.gray = Math.min(1, n);
        else if (name === "saturate") t.saturate *= n;
        else if (name === "contrast") t.contrast *= n;
        else if (name === "brightness") t.brightness *= n;
    }
    return t;
}
const toned = (a: Tone, b: Tone): Tone =>
    a === PLAIN
        ? b
        : b === PLAIN
          ? a
          : {
                gray: Math.max(a.gray, b.gray),
                saturate: a.saturate * b.saturate,
                contrast: a.contrast * b.contrast,
                brightness: a.brightness * b.brightness,
            };

/** CSS's easing by name, and the cubic Béziers the painters name. */
function easing(name: string): (t: number) => number {
    const bezier = (x1: number, y1: number, x2: number, y2: number) => (t: number) => {
        let u = t;
        for (let i = 0; i < 6; i++) {
            const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3 - t;
            const dx =
                3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2) || 1;
            u = Math.min(1, Math.max(0, u - x / dx));
        }
        return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3;
    };
    const b = /cubic-bezier\(([^)]+)\)/.exec(name);
    if (b) {
        const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = (b[1] ?? "").split(",").map(Number);
        return bezier(x1, y1, x2, y2);
    }
    if (name === "ease-in-out") return bezier(0.42, 0, 0.58, 1);
    if (name === "ease-in") return bezier(0.42, 0, 1, 1);
    if (name === "ease-out") return bezier(0, 0, 0.58, 1);
    if (name === "ease") return bezier(0.25, 0.1, 0.25, 1);
    return (t) => t;
}

export const frameOf = (at: number, transform: string, opacity: string, ease: string): Frame => {
    const found = parts(transform) ?? IDENTITY;
    return {
        at,
        pose: "tx" in found ? found : null,
        m: affineOf(found),
        moves: transform !== "",
        opacity: opacity ? parseFloat(opacity) : null,
        ease: ease ? easing(ease) : null,
    };
};

const keyframes = new Map<string, Frame[]>();
/** An animation's keyframes as the page's stylesheets hold them, including the painters' own sheets. */
function framesOf(name: string): Frame[] | null {
    const had = keyframes.get(name);
    if (had) return had;
    for (const sheet of document.styleSheets) {
        let rules: CSSRuleList;
        try {
            rules = sheet.cssRules;
        } catch {
            continue;
        }
        for (const rule of rules) {
            if (!(rule instanceof CSSKeyframesRule) || rule.name !== name) continue;
            const frames: Frame[] = [];
            for (const k of rule.cssRules) {
                if (!(k instanceof CSSKeyframeRule)) continue;
                for (const at of k.keyText.split(",")) {
                    const t = at.trim();
                    frames.push(
                        frameOf(
                            t === "from" ? 0 : t === "to" ? 1 : parseFloat(t) / 100,
                            k.style.getPropertyValue("transform"),
                            k.style.getPropertyValue("opacity"),
                            k.style.getPropertyValue("animation-timing-function"),
                        ),
                    );
                }
            }
            frames.sort((a, b) => a.at - b.at);
            keyframes.set(name, frames);
            return frames;
        }
    }
    return null;
}

const seconds = (s: string): number => (s.endsWith("ms") ? parseFloat(s) / 1000 : parseFloat(s));

/** Where a CSS animation stands at `now`. */
function playOf(m: Motion, now: number): { m: Affine; opacity: number | null } {
    const at = (m.pausedAt ?? now) - m.born;
    let time = at / 1000 - m.delay;
    if (time < 0) time = 0;
    const d = Math.max(1e-6, m.duration);
    let round = Math.floor(time / d),
        u = time / d - round;
    if (round >= m.iterations) {
        round = Math.ceil(m.iterations) - 1;
        u = 1;
    }
    if (m.alternate && round % 2 === 1) u = 1 - u;
    return between(m.frames, u, m.ease);
}

/** The keyframes at a progress through them, eased from each frame to the next. */
export function between(
    frames: readonly Frame[],
    u: number,
    ease: (t: number) => number = (t) => t,
): { m: Affine; opacity: number | null } {
    let a = frames[0],
        b = frames[frames.length - 1];
    for (let i = 0; i < frames.length - 1; i++) {
        const f = frames[i],
            g = frames[i + 1];
        if (f && g && u >= f.at && u <= g.at) {
            a = f;
            b = g;
            break;
        }
    }
    if (!a || !b) return { m: IDENTITY, opacity: null };
    const k = b.at > a.at ? (a.ease ?? ease)((u - a.at) / (b.at - a.at)) : 0;
    const mix = (x: number, y: number) => x + (y - x) * k;
    const opacity =
        a.opacity === null || b.opacity === null
            ? (a.opacity ?? b.opacity)
            : mix(a.opacity, b.opacity);
    if (a.pose && b.pose)
        return {
            m: affineOf({
                tx: mix(a.pose.tx, b.pose.tx),
                ty: mix(a.pose.ty, b.pose.ty),
                rotate: mix(a.pose.rotate, b.pose.rotate),
                sx: mix(a.pose.sx, b.pose.sx),
                sy: mix(a.pose.sy, b.pose.sy),
            }),
            opacity,
        };
    // the script's keyframes are matrices written thirty to a second, close enough to mix directly
    const m: Affine = [
        mix(a.m[0], b.m[0]),
        mix(a.m[1], b.m[1]),
        mix(a.m[2], b.m[2]),
        mix(a.m[3], b.m[3]),
        mix(a.m[4], b.m[4]),
        mix(a.m[5], b.m[5]),
    ];
    return { m, opacity };
}

const scripted = new WeakMap<AnimationEffect, Frame[]>();
/** Where the script's animations of an element stand, the last in effect winning as CSS composes them. */
function scriptOf(
    animations: readonly Animation[],
): { m: Affine | null; opacity: number | null; running: boolean } | null {
    let m: Affine | null = null,
        opacity: number | null = null,
        running = false,
        any = false;
    for (const a of animations) {
        const effect = a.effect;
        if (!(effect instanceof KeyframeEffect)) continue;
        const u = effect.getComputedTiming().progress;
        if (u === null || u === undefined) continue;
        let frames = scripted.get(effect);
        if (!frames) {
            frames = effect
                .getKeyframes()
                .map((k) =>
                    frameOf(
                        k.computedOffset,
                        typeof k.transform === "string" ? k.transform : "",
                        typeof k.opacity === "string" || typeof k.opacity === "number"
                            ? String(k.opacity)
                            : "",
                        k.easing ?? "linear",
                    ),
                );
            scripted.set(effect, frames);
        }
        const at = between(frames, u);
        if (frames.some((f) => f.moves)) m = at.m;
        if (at.opacity !== null) opacity = at.opacity;
        if (a.playState === "running") running = true;
        any = true;
    }
    return any ? { m, opacity, running } : null;
}

/**
 * The store the workers keep pixels in across visits (sprites.worker.ts), named by the renderer's
 * version: this module's own file name in a build, which carries a hash of it and the worker, so
 * pixels one build drew are never shown by another. In development there is no hash, so nothing is
 * kept unless a test asks (`?mapCache`), and a change to how drawings are drawn is always seen.
 */
const keptStore = ((): string | null => {
    if (typeof location === "undefined") return null;
    const built = /-([\w-]{8,})\.js$/.exec(new URL(import.meta.url).pathname)?.[1];
    if (built) return built;
    return new URLSearchParams(location.search).has("mapCache") ? "dev" : null;
})();
/** What the pixels kept in memory may hold, across every scene on the page. */
const KEPT_PIXELS = (smallDevice ? 48 : 128) * MB;
/**
 * Pixels the workers drew, by what they show (a drawing's markup, its part, the scale and the part of
 * it drawn), kept in memory for every scene on the page (.docs/map-smoothness-plan.md, phase 5): a
 * drawing whose pixels a scene let go of on the GPU, or another scene drew, or a lost context took, is
 * uploaded from here again rather than drawn again. Null is a box with nothing in it.
 */
const drawnPixels = new Map<string, { pixels: ImageBitmap | ImageData | null; bytes: number }>();
let drawnBytes = 0;
const keepPixels = (
    key: string,
    pixels: ImageBitmap | ImageData | null,
    bytes: number,
): boolean => {
    if (bytes > KEPT_PIXELS / 8) return false;
    const had = drawnPixels.get(key);
    if (had) {
        if (had.pixels === pixels) return true;
        drawnPixels.delete(key);
        drawnBytes -= had.bytes;
        if (had.pixels instanceof ImageBitmap) had.pixels.close();
    }
    drawnPixels.set(key, { pixels, bytes });
    drawnBytes += bytes;
    for (const [k, v] of drawnPixels) {
        if (drawnBytes <= KEPT_PIXELS) break;
        if (k === key) continue;
        drawnPixels.delete(k);
        drawnBytes -= v.bytes;
        if (v.pixels instanceof ImageBitmap) v.pixels.close();
    }
    return true;
};
/** The pixels kept for `key`, as the most recently wanted. */
const keptPixels = (key: string): { pixels: ImageBitmap | ImageData | null } | undefined => {
    const had = drawnPixels.get(key);
    if (!had) return undefined;
    drawnPixels.delete(key);
    drawnPixels.set(key, had);
    return had;
};

export interface Scene {
    /** The canvas it draws on, which a page that scrolls under it keeps in the window (world.tsx). */
    readonly canvas: HTMLCanvasElement;
    /**
     * Draws for the camera; with `ahead`, where the camera is flying to, the drawings that will be in
     * view there are drawn at that camera's sharpness as the flight begins, so they are there on arrival.
     */
    frame(camera: Camera, size: Size, ahead?: Camera | null): void;
    /** Once a frame has drawn everything the camera sees, at the sharpness it wants. */
    settled(): Promise<void>;
    /**
     * Draws what is in view under `root`, a source to come that the page has not shown yet, as `camera`
     * will show it, without showing it, and settles once it all has pixels or after a second, so the page
     * can swap it in for the source it replaces and nothing is seen being drawn (a roll drawn again).
     */
    prepare(root: Element, camera?: Camera): Promise<void>;
    setReach(reach: MapView["reach"]): void;
    /**
     * Draws from `hidden` from now on, lifting into `overlay` and telling the idles through `see`: what
     * the old source held is taken off the scene with its pixels kept, so a source painted again as it
     * was, or a roll opened again, finds them by their markup rather than drawing them anew.
     */
    rebind(hidden: HTMLElement, overlay: HTMLElement, see?: Group["see"]): void;
    /** Takes the canvas off the page and draws nothing, keeping what it has drawn for `unpark`. */
    park(): void;
    /** Puts the canvas back, in `host` under `under`, to draw again from the next frame. */
    unpark(host: HTMLElement, under: Element): void;
    stop(): void;
}

/**
 * The GPU's picture of one map: a canvas drawing the terrain and everything the painters put into
 * `hidden`, which the page never lays out. What the page draws better is moved into `overlay`.
 */
export function mapScene(o: {
    host: HTMLElement;
    /** What the canvas goes under. */
    under: Element;
    hidden: HTMLElement;
    overlay: HTMLElement;
    /** The map whose terrain is drawn under everything; a scene without one draws the paper's grid under its drawings. */
    view?: MapView;
    tokens: Tokens;
    /** Tells the group the drawings idle on which of them are on screen. */
    see?: Group["see"];
    /** Nothing in the terrain drifts, under reduced motion and on a map drawn still. */
    still: boolean;
    /**
     * Draws a drawing larger than a texture as tiles it keeps, so a pan draws only what comes into view
     * and nothing of it is cut off at a window's edge; without it, as one window round the camera.
     */
    tiles?: boolean;
    /**
     * Attributes the page writes on the source and what in it they reach, as selectors, so a change
     * to one reads again only those rather than everything the scene draws.
     */
    flags?: Readonly<Record<string, string>>;
}): Scene {
    // the workers load their code while the terrain and the first drawings are read
    warmRasterizers();
    const canvas = document.createElement("canvas");
    canvas.className = "map-gl";
    canvas.setAttribute("aria-hidden", "true");
    o.host.insertBefore(canvas, o.under);
    /** The source the scene draws, and the layer over the canvas what it lifts goes into; `rebind` changes them. */
    let src = o.hidden,
        over = o.overlay,
        see = o.see;
    const infos = new Map<Element, Info>();
    const clocks = new WeakMap<Element, Motion>();
    /** By the svg, or by a moving part drawn on its own. */
    const leaves = new Map<Element, Leaf>();
    /** The leaves each drawing has, itself and its parts, so one taken off the scene finds its own. */
    const keysOf = new Map<SVGSVGElement, Set<Element>>();
    const keysFor = (svg: SVGSVGElement): Set<Element> => {
        let had = keysOf.get(svg);
        if (!had) keysOf.set(svg, (had = new Set()));
        return had;
    };
    /** The tiles of drawings drawn as tiles, by `tileKey`, which the camera leaves in place as it moves. */
    const tiles = new Map<string, Leaf>();
    const every = (): Leaf[] => [...leaves.values(), ...tiles.values()];
    /** Every leaf holding pixels the budget may take back: those on the scene, and those taken off it. */
    const kept = (): Leaf[] => [...every(), ...[...retired.values()].map((r) => r.leaf)];
    /**
     * The scale each tiled drawing was last drawn at, which it keeps while the camera moves, by its
     * markup, so a drawing painted again as it was takes up the tiles it had rather than drawing others.
     */
    const tileScales = new Map<number, number>();
    // a drawing painted again as it was, as a world's roll is when its record is read again, is the
    // same markup: it is known by that, and takes over the pixels the drawing it replaces had
    const contents = new WeakMap<SVGSVGElement, string>();
    const contentOf = (svg: SVGSVGElement): string => {
        let c = contents.get(svg);
        if (c === undefined) {
            // what the idle writes (a part's pose, the marks it leaves that it has moved) is not what
            // the drawing is, so it is left out, and a drawing seen moving is known painted again
            const html = svg.outerHTML;
            // and so is how its root is moved, which the scene reads from the style each frame
            const open = html.indexOf(">") + 1;
            const root = html.slice(0, open).replace(/ style="[^"]*"/, (style) =>
                style
                    .replace(
                        /(^|[\s;"])(?:transform-origin|transform|translate|rotate|scale|opacity|will-change):[^;"]*;?/g,
                        "$1",
                    )
                    .replace(/\s{2,}/g, " ")
                    .replace(/[\s;]+"$/, '"'),
            );
            const text = (root + html.slice(open))
                .replace(/ data-anim(?:-moved|-frame)?="[^"]*"/g, "")
                .replace(/<[a-z]+ [^>]*data-(?:anim-)?part="[^>]*>/g, (tag) =>
                    tag.replace(/ (?:transform|style|opacity)="[^"]*"/g, ""),
                );
            // two passes with different offsets, so two drawings would have to agree on both
            let h = 2166136261,
                k = 3323198485;
            for (let i = 0; i < text.length; i++) {
                const ch = text.charCodeAt(i);
                h = Math.imul(h ^ ch, 16777619);
                k = Math.imul(k ^ ch, 16777619) ^ (k >>> 13);
            }
            c = `${(h >>> 0).toString(36)}.${(k >>> 0).toString(36)}.${text.length}`;
            contents.set(svg, c);
        }
        return c;
    };
    const ids = new WeakMap<SVGSVGElement, number>();
    /** The id a drawing had before it last changed, whose tiles stand in while it is drawn again. */
    const previousIds = new WeakMap<SVGSVGElement, number>();
    const byContent = new Map<string, number>();
    let lastId = 0;
    const idOf = (svg: SVGSVGElement): number => {
        let id = ids.get(svg);
        if (id === undefined) {
            const c = contentOf(svg);
            id = byContent.get(c);
            if (id === undefined) byContent.set(c, (id = ++lastId));
            ids.set(svg, id);
        }
        return id;
    };
    /** The pixels of drawings taken off the scene, by their markup, for a moment in case they come back. */
    const retired = new Map<string, { leaf: Leaf; at: number }>();
    const retiredKey = (svg: SVGSVGElement, part: Element | null): string =>
        `${contentOf(svg)}|${part ? partsOf(svg).indexOf(part) : "whole"}`;
    const tileKey = (id: number, scale: number, tx: number, ty: number): string =>
        `${id}|${scale}|${tx}|${ty}`;
    /** The version a new tile of a drawing starts at: the drawing's, as its other tiles have it. */
    const versions = new WeakMap<SVGSVGElement, number>();
    const tileVersion = (svg: SVGSVGElement): number => versions.get(svg) ?? 0;
    const isLive = (leaf: Leaf): boolean =>
        leaf.tile !== undefined
            ? tiles.get(leaf.tile) === leaf
            : leaves.get(leaf.part ?? leaf.svg) === leaf;
    /** The drawings that idle, each with the share of the screen it had when last told. */
    const seenIdling = new Map<SVGSVGElement, number>();
    let bytes = 0;
    /** The instance buffers the batches are written into, kept from frame to frame. */
    const spare: Float32Array[] = [];
    const decoded: {
        leaf: Leaf;
        pixels: ImageData | ImageBitmap;
        /** Whether the memory store holds these pixels, which it lets go of itself. */
        kept: boolean;
        /** Drawn with a cell's padding round it, to go into the atlas. */
        padded: boolean;
        w: number;
        h: number;
        scale: number;
        rect: Rect;
        version: number;
        split: boolean;
    }[] = [];
    const waiters: (() => void)[] = [];
    let drifting: ReturnType<typeof setTimeout> | 0 = 0;
    let wasBusy = false;
    let moved = 0,
        settling: ReturnType<typeof setTimeout> | undefined;
    let ahead: Camera | null = null;
    let preparing: {
        root: Element;
        camera: Camera | null;
        done: () => void;
        until: number;
    } | null = null;
    let camera: Camera | null = null,
        size: Size = { w: 0, h: 0 },
        frames = 0,
        scheduled = 0,
        decoding = 0,
        /** The pixels the drawings with the workers take between them. */
        drawingPixels = 0,
        stopped = false,
        ground: Terrain | null = null;
    interface Job {
        leaf: Leaf;
        scale: number;
        rect: Rect;
        version: number;
        /** How far from the middle of the camera it is, as of the last frame that wanted it. */
        near: number;
        /**
         * What it is for, most needed first: a stand-in the rest wait on, a drawing on the screen with
         * nothing to show, where a flight is going, one on the screen shown by a stand-in, one drawn
         * sharper, and the margin kept ready round the screen.
         */
        tier: number;
        /** When a frame last wanted it, in ms; one the camera has left is dropped. */
        wanted: number;
    }
    const queue: Job[] = [];
    /** The job waiting for each leaf, which each frame that still wants it brings up to date. */
    const queued = new Map<Leaf, Job>();
    /** Puts a job in the queue, or brings the one waiting for its leaf up to date. */
    const request = (job: Job): void => {
        if (job.leaf.retryAt !== undefined && job.wanted < job.leaf.retryAt) return;
        const had = queued.get(job.leaf);
        if (had) {
            Object.assign(had, job);
            return;
        }
        if (job.leaf.pending) return;
        job.leaf.pending = true;
        queued.set(job.leaf, job);
        queue.push(job);
    };
    const wake = (): void => {
        if (!scheduled && !stopped)
            scheduled = requestAnimationFrame(() => {
                scheduled = 0;
                if (camera) draw();
            });
    };
    const forget = (): void => {
        // a lost context took every texture, so every leaf holding pixels, on the scene or taken off
        // it, is asked for them again, and what was shared or recorded as drawn is forgotten
        for (const leaf of kept()) {
            leaf.texture = null;
            leaf.slot = null;
            leaf.pending = false;
        }
        retired.clear();
        sharing.clear();
        holders.clear();
        queue.length = 0;
        queued.clear();
        pages.reset();
        bytes = 0;
        wake();
    };
    const gl = canvasGl(canvas, forget);
    // the colours drawings take from the page are part of what they look like, so pixels kept on the
    // device are kept apart for each palette
    const palette = ((): string => {
        const text = JSON.stringify(o.tokens);
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
        return (h >>> 0).toString(36);
    })();
    // half the budget for the pages the small drawings share, half for the large ones' own textures
    const pages = atlas(gl, o.tiles ? PAGES : BUDGET / 2);
    /** How many leaves share a cell or a texture beyond the one that drew it, for pixels two drawings show. */
    const sharing = new Map<object, number>();
    /** Lets a leaf's pixels go, from its own texture or its cell, once no other leaf shows them. */
    const letGo = (leaf: Leaf): void => {
        if (leaf.texture) {
            const n = sharing.get(leaf.texture) ?? 0;
            if (n) sharing.set(leaf.texture, n - 1);
            else {
                sharing.delete(leaf.texture);
                bytes -= leaf.texture.bytes;
                gl.release(leaf.texture);
            }
            leaf.texture = null;
        }
        if (leaf.slot) {
            const n = sharing.get(leaf.slot) ?? 0;
            if (n) sharing.set(leaf.slot, n - 1);
            else {
                sharing.delete(leaf.slot);
                pages.free(leaf.slot);
            }
            leaf.slot = null;
        }
    };
    /** Whether a leaf has pixels to show, in a live cell or a texture of its own. */
    const hasPixels = (l: Leaf): boolean =>
        (!!l.texture && gl.live(l.texture)) || (!!l.slot && pages.live(l.slot));
    /** Gives `to` the pixels `from` shows, which neither lets go of while the other shows them. */
    const share = (to: Leaf, from: Leaf): void => {
        letGo(to);
        if (from.texture) sharing.set(from.texture, (sharing.get(from.texture) ?? 0) + 1);
        if (from.slot) sharing.set(from.slot, (sharing.get(from.slot) ?? 0) + 1);
        to.texture = from.texture;
        to.slot = from.slot;
        to.scale = from.scale;
        to.rect = from.rect;
        to.split = from.split;
        to.empty = from.empty;
        to.drew = from.drew;
    };
    /** The last leaf to draw each drawing, by its markup and part, for another drawing with the same markup to show. */
    const holders = new Map<string, Leaf>();
    /** A cell for a drawing, freeing the cells drawn longest ago when the pages are full. */
    /** The leaves in cells not drawn in the last frame, worked out once a frame, least recently drawn first. */
    let idleCells: { frame: number; leaves: Leaf[] } | null = null;
    const idleInCells = (): Leaf[] => {
        if (idleCells?.frame !== frames)
            idleCells = {
                frame: frames,
                leaves: kept()
                    .filter((l) => l.slot && l.drawn < frames - 1)
                    .sort((a, b) => a.drawn - b.drawn),
            };
        return idleCells.leaves;
    };
    /**
     * A cell for a drawing. When the pages are full, the least recently drawn cells of its own size go
     * first, since it can take one of those at once; failing that, the page drawn from longest ago is
     * emptied whole, so its shelves can be cut again for this size. This runs as a frame starts, so
     * what the last frame drew is on screen and stays.
     */
    const cell = (w: number, h: number): Slot | null => {
        let slot = pages.place(w, h);
        if (slot) return slot;
        const size = pages.classOf(w, h);
        const idle = idleInCells().filter((l) => !!l.slot);
        for (const leaf of idle) {
            if (!leaf.slot || pages.cellOf(leaf.slot)?.key !== size) continue;
            letGo(leaf);
            slot = pages.place(w, h);
            if (slot) return slot;
        }
        const byPage = new Map<GlTexture, Leaf[]>();
        for (const leaf of idle) {
            const page = leaf.slot ? pages.cellOf(leaf.slot)?.page : undefined;
            if (!page) continue;
            const on = byPage.get(page);
            if (on) on.push(leaf);
            else byPage.set(page, [leaf]);
        }
        const oldest = [...byPage.values()].sort(
            (a, b) => Math.max(...a.map((l) => l.drawn)) - Math.max(...b.map((l) => l.drawn)),
        );
        for (const onPage of oldest) {
            for (const leaf of onPage) letGo(leaf);
            slot = pages.place(w, h);
            if (slot) return slot;
        }
        return null;
    };
    let density = glDensity();
    gl.setDensity(density);
    const starting = new AbortController();
    if (o.view)
        void terrain({
            gl,
            view: o.view,
            tokens: o.tokens,
            wake,
            still: o.still,
            signal: starting.signal,
        })
            .then((t) => {
                if (stopped) t.stop();
                else {
                    ground = t;
                    wake();
                }
            })
            .catch(() => undefined);

    const shade = (() => {
        let texture: GlTexture | null = null;
        return (): GlTexture | null => {
            if (texture && gl.live(texture)) return texture;
            const c = document.createElement("canvas");
            c.width = c.height = 64;
            const g = c.getContext("2d");
            if (!g) return null;
            const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            r.addColorStop(0, `${o.tokens.ink.slice(0, 7)}1f`);
            r.addColorStop(0.7, `${o.tokens.ink.slice(0, 7)}00`);
            g.fillStyle = r;
            g.fillRect(0, 0, 64, 64);
            texture = gl.upload(c, 64, 64);
            return texture;
        };
    })();

    // an element lifted out of a box keeps its place through a twin of each box it was in, whose
    // attributes follow the original's
    const twins = new Map<Element, HTMLElement>();
    const copy = (from: Element, to: HTMLElement): void => {
        for (const a of Array.from(to.attributes))
            if (!from.hasAttribute(a.name)) to.removeAttribute(a.name);
        // the pages' CSP refuses a style attribute written as markup (server/static.ts); cssText is the CSSOM
        for (const a of Array.from(from.attributes))
            if (a.name === "style") to.style.cssText = a.value;
            else to.setAttribute(a.name, a.value);
    };
    const twinOf = (el: Element): HTMLElement => {
        if (el === src) return over;
        const had = twins.get(el);
        if (had) return had;
        const twin = document.createElement(el.tagName);
        copy(el, twin);
        twins.set(el, twin);
        twinOf(el.parentElement ?? src).append(twin);
        return twin;
    };
    const decorated = (el: Element): boolean => {
        if (el.classList.contains("ow-shade")) return false;
        const cs = getComputedStyle(el),
            before = getComputedStyle(el, "::before");
        return (
            cs.backgroundImage !== "none" ||
            !/rgba\(.*, 0\)|transparent/.test(cs.backgroundColor) ||
            !["none", "normal", ""].includes(before.content)
        );
    };
    /** Moves what the page draws better than a texture (words, buttons, CSS's own shapes) into the overlay. */
    const lift = (root: Element): void => {
        const walk = (el: Element): void => {
            if (el instanceof SVGElement || el.tagName === "STYLE") return;
            const text = Array.from(el.childNodes).some(
                (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
            );
            // what holds no drawing goes whole, so its twin is never needed
            const whole =
                !!el.textContent?.trim() &&
                Array.from(el.querySelectorAll("*")).every((d) => INLINE.has(d.tagName));
            if (whole || text || el.tagName === "BUTTON" || decorated(el)) {
                // an animated shape would give the overlay, and with it the scaled world, a layer of
                // its own, sized as if unscaled (view.ts), so it stays here and is not drawn
                if (!(whole || text) && getComputedStyle(el).animationName !== "none") return;
                twinOf(el.parentElement ?? src).append(el);
                return;
            }
            for (const child of Array.from(el.children)) walk(child);
        };
        if (src.contains(root)) walk(root);
    };

    const infoOf = (el: Element): Info => {
        const had = infos.get(el);
        if (had) return had;
        const cs = getComputedStyle(el);
        const svg = el instanceof SVGSVGElement;
        const html = el instanceof HTMLElement;
        const style = html || svg ? el.style : null;
        const kind: Info["kind"] =
            el.tagName === "STYLE" || el.tagName === "SCRIPT"
                ? "skip"
                : svg
                  ? "svg"
                  : el.classList.contains("ow-shade")
                    ? "shade"
                    : html
                      ? "box"
                      : "skip";
        const w = px(style?.width) ?? px(cs.width) ?? (svg ? el.viewBox.baseVal.width : 0),
            h = px(style?.height) ?? px(cs.height) ?? (svg ? el.viewBox.baseVal.height : 0);
        const left = px(style?.left) ?? px(cs.left) ?? 0,
            top = px(style?.top) ?? px(cs.top) ?? 0;
        const origin = (style?.transformOrigin || cs.transformOrigin || "0 0")
            .split(" ")
            .map((v, i) =>
                v.endsWith("%") ? (parseFloat(v) / 100) * (i ? h : w) : parseFloat(v) || 0,
            );
        // CSS applies `translate` before `transform`, as a world's arrival raises its drawings (scenery.ts)
        const moved = style?.translate || (cs.translate === "none" ? "" : cs.translate);
        const shift = moved
            ? `translate(${moved
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((v) => (v === "0" ? "0px" : v))
                  .join(", ")}) `
            : "";
        const written = parts(
            shift + (style?.transform || (cs.transform === "none" ? "" : cs.transform)),
        );
        let motion: Motion | null = null;
        const name = cs.animationName.split(",")[0]?.trim() ?? "none";
        if (name && name !== "none") {
            const f = framesOf(name);
            // a style changed on the element does not start its animation again, as in the page
            const was = clocks.get(el);
            if (f?.length)
                motion = {
                    name,
                    frames: f,
                    duration: seconds(cs.animationDuration.split(",")[0] ?? "0"),
                    delay: seconds(cs.animationDelay.split(",")[0] ?? "0"),
                    iterations:
                        cs.animationIterationCount.split(",")[0]?.trim() === "infinite"
                            ? Infinity
                            : parseFloat(cs.animationIterationCount) || 1,
                    alternate: cs.animationDirection.startsWith("alternate"),
                    ease: easing(
                        cs.animationTimingFunction.split(/,(?![^(]*\))/)[0]?.trim() ?? "ease",
                    ),
                    born: was?.name === name ? was.born : performance.now(),
                    pausedAt: was?.name === name ? was.pausedAt : null,
                    checked: -Infinity,
                    paused: was?.name === name ? was.paused : false,
                };
        }
        if (motion) clocks.set(el, motion);
        const info: Info = {
            kind,
            hidden: cs.display === "none" || cs.visibility === "hidden",
            at: written ? affineOf(written) : IDENTITY,
            origin: [origin[0] ?? 0, origin[1] ?? 0],
            offset: [left, top],
            size: { w, h },
            // an animation that fills backwards leaves its first frame's opacity in the computed style
            opacity: motion?.frames.some((f) => f.opacity !== null)
                ? parseFloat(style?.opacity || "1")
                : parseFloat(cs.opacity) || (cs.opacity === "0" ? 0 : 1),
            tone: toneOf(cs.filter),
            motion,
        };
        infos.set(el, info);
        return info;
    };
    /**
     * An element marked `data-live` is moved by its inline style every frame, as the plane is
     * (flight.ts), so its place and opacity are read from there without styling it again.
     */
    const live = (el: Element): boolean => {
        const info = infos.get(el);
        const style = el instanceof HTMLElement || el instanceof SVGSVGElement ? el.style : null;
        if (!info || !style || (style.display === "none") !== info.hidden) return false;
        const written = parts(style.transform);
        info.at = written ? affineOf(written) : IDENTITY;
        if (style.opacity) info.opacity = parseFloat(style.opacity) || 0;
        return true;
    };
    const forgetInfo = (el: Element): void => {
        infos.delete(el);
        for (const child of el.children)
            if (child instanceof SVGSVGElement) infos.delete(child);
            else if (!(child instanceof SVGElement)) forgetInfo(child);
    };
    const drop = (svg: SVGSVGElement): void => {
        const keys = keysOf.get(svg);
        keysOf.delete(svg);
        for (const key of keys ?? []) {
            const leaf = leaves.get(key);
            if (!leaf || leaf.svg !== svg) continue;
            leaves.delete(key);
            if (leaf.rastered !== leaf.version || !(leaf.texture || leaf.slot || leaf.empty)) {
                letGo(leaf);
                continue;
            }
            const k = retiredKey(svg, leaf.part);
            const had = retired.get(k);
            if (had) letGo(had.leaf);
            retired.set(k, { leaf, at: frames });
        }
        // its tiles are kept by its markup, for a drawing painted again to find; unused, the atlas lets them go
        infos.delete(svg);
        if (seenIdling.delete(svg)) see?.([[svg, null]]);
    };
    /** The parts of a drawing that its idle moves, outermost only. */
    const found = new WeakMap<SVGSVGElement, Element[]>();
    // a drawing that has moved is drawn in its parts for as long as it lives, since an idle that stops
    // puts its parts back at rest, which moves their textures rather than drawing the whole again
    const hasMoved = new WeakSet<SVGSVGElement>();
    const partsOf = (svg: SVGSVGElement): Element[] => {
        let parts = found.get(svg);
        if (!parts) {
            parts = movingPartsOf(svg);
            found.set(svg, parts);
        }
        return parts;
    };
    const movingParts = (svg: SVGSVGElement): Element[] => {
        if (svg.getAttribute("data-anim") === "moves") hasMoved.add(svg);
        else if (!hasMoved.has(svg)) return [];
        return partsOf(svg);
    };
    const touched = (svg: SVGSVGElement, target: Node, attribute: boolean): void => {
        // the idle writes a moving part's own transform, opacity and pivot, which move its texture only
        const part = target instanceof Element ? target.closest(PARTS) : null;
        if (attribute && part === target && movingParts(svg).includes(part)) return;
        const base = leaves.get(svg);
        if (part && base?.split && movingParts(svg).some((p) => p.contains(part))) return;
        found.delete(svg);
        sketches.delete(svg);
        // what it is now is known by its markup now, and what it was stands in until it is drawn again
        contents.delete(svg);
        const was = ids.get(svg);
        if (was !== undefined) previousIds.set(svg, was);
        ids.delete(svg);
        let drawn = false;
        for (const leaf of every())
            if (leaf.svg === svg) {
                if (leaf.rastered >= 0) drawn = true;
                leaf.version++;
            }
        // a drawing is not to change once it has been drawn, apart from its moving parts
        if (drawn) mapCount("art-mutated", 1);
        versions.set(svg, tileVersion(svg) + 1);
    };
    // a drawing is read into its display list once, and again only when it changes
    const grownBy = (r: Rect, by: number): Rect => ({
        x: r.x - by,
        y: r.y - by,
        w: r.w + 2 * by,
        h: r.h + 2 * by,
    });
    const sketches = new WeakMap<SVGSVGElement, Sketch>();
    const sketchFor = (svg: SVGSVGElement): Sketch => {
        const had = sketches.get(svg);
        if (had) return had;
        const made = sketchOf(svg);
        sketches.set(svg, made);
        return made;
    };

    const watching = new MutationObserver((records) => {
        for (const r of records) {
            if (r.type === "childList") {
                for (const n of r.addedNodes)
                    if (n instanceof HTMLElement) lift(n);
                    else if (n.nodeType === Node.TEXT_NODE && r.target instanceof HTMLElement)
                        lift(r.target);
                for (const n of r.removedNodes) {
                    if (!(n instanceof Element) || src.contains(n)) continue;
                    if (n instanceof SVGSVGElement) drop(n);
                    for (const svg of n.querySelectorAll("svg")) drop(svg);
                    forgetInfo(n);
                }
                if (r.removedNodes.length)
                    for (const [el, twin] of twins)
                        if (!src.contains(el)) {
                            twin.remove();
                            twins.delete(el);
                        }
                const owner = r.target instanceof Element ? r.target.closest("svg") : null;
                if (owner) touched(owner, r.target, false);
            } else if (r.target instanceof Element) {
                const owner = r.target instanceof SVGSVGElement ? null : r.target.closest("svg");
                if (owner) touched(owner, r.target, true);
                else if (r.target === src && r.attributeName === "style") {
                    // the zoom's properties, which of what stays here only the guide grows by (overworld.css)
                    for (const layer of src.children)
                        if (layer.matches(".m-tokens")) forgetInfo(layer);
                } else if (
                    r.attributeName === "style" &&
                    r.target.hasAttribute("data-live") &&
                    live(r.target)
                ) {
                    continue;
                } else if (r.target === src && r.attributeName && o.flags?.[r.attributeName]) {
                    for (const el of src.querySelectorAll(o.flags[r.attributeName] ?? "")) {
                        const at = el instanceof SVGElement ? el.closest("svg") : el;
                        if (at) forgetInfo(at);
                    }
                } else {
                    forgetInfo(r.target);
                    const twin = twins.get(r.target);
                    if (twin) copy(r.target, twin);
                }
            }
        }
        wake();
    });
    watching.observe(src, { childList: true, subtree: true, attributes: true });
    lift(src);

    /** Rasterizes the next drawings the camera wants, two at a time, nearest the middle first. */
    const pump = (): void => {
        const now = performance.now();
        // what the camera has left is dropped rather than drawn, so the workers draw what is wanted now
        let left = 0;
        for (const job of queue) {
            if (now - job.wanted > FORGET_JOB) {
                queued.delete(job.leaf);
                job.leaf.pending = false;
            } else queue[left++] = job;
        }
        queue.length = left;
        queue.sort((a, b) => a.tier - b.tier || a.near - b.near);
        while (decoding < DECODING && queue.length) {
            const job = queue.shift();
            if (!job) break;
            const leaf = job.leaf;
            queued.delete(leaf);
            if (!isLive(leaf)) {
                leaf.pending = false;
                continue;
            }
            // a drawing off the page has no computed colours, and would be drawn black
            if (!leaf.svg.isConnected) {
                leaf.pending = false;
                continue;
            }
            const w = Math.max(1, Math.round(job.rect.w * job.scale)),
                h = Math.max(1, Math.round(job.rect.h * job.scale));
            const svg = leaf.svg;
            const vb = svg.viewBox.baseVal;
            const info = infoOf(svg);
            const split = leaf.part ? true : movingParts(svg).length > 0;
            const kx = vb.width && info.size.w ? vb.width / info.size.w : 1,
                ky = vb.height && info.size.h ? vb.height / info.size.h : 1;
            // a drawing that fits a cell is drawn with the cell's padding round it, from the drawing itself
            const pad = w + 2 * PAD <= CELL && h + 2 * PAD <= CELL ? PAD : 0;
            const edge = pad / job.scale;
            const box = {
                x: (vb.width ? vb.x : 0) + (job.rect.x - edge) * kx,
                y: (vb.height ? vb.y : 0) + (job.rect.y - edge) * ky,
                w: (job.rect.w + 2 * edge) * kx,
                h: (job.rect.h + 2 * edge) * ky,
            };
            const only = leaf.part ? partsOf(svg).indexOf(leaf.part) : null;
            const withoutParts = !leaf.part && split;
            const r = job.rect;
            const key = `${contentOf(svg)}|${only ?? (withoutParts ? "base" : "whole")}|${job.scale}|${[r.x, r.y, r.w, r.h].map((n) => Math.round(n * 100) / 100).join(",")}|${pad}`;
            const landed = (pixels: ImageBitmap | ImageData | null, kept: boolean): void => {
                if (stopped) {
                    if (pixels instanceof ImageBitmap && !kept) pixels.close();
                    return;
                }
                if (!pixels) {
                    leaf.pending = false;
                    if (!isLive(leaf)) return;
                    letGo(leaf);
                    leaf.empty = true;
                    leaf.scale = job.scale;
                    leaf.rect = job.rect;
                    leaf.rastered = job.version;
                    leaf.split = split;
                    return;
                }
                decoded.push({
                    pixels,
                    kept,
                    w: w + 2 * pad,
                    h: h + 2 * pad,
                    padded: pad > 0,
                    ...job,
                    split,
                });
            };
            // pixels drawn before, by this scene or another, go to the GPU again without being drawn
            const had = keptPixels(key);
            if (had) {
                mapCount("art-kept", 1);
                landed(had.pixels, true);
                wake();
                continue;
            }
            const pixels = (w + 2 * pad) * (h + 2 * pad);
            if (decoding > 0 && drawingPixels + pixels > DECODING_PIXELS) {
                queue.unshift(job);
                queued.set(leaf, job);
                break;
            }
            drawingPixels += pixels;
            decoding++;
            void rasterize({
                sketch: sketchFor(svg),
                box,
                w: w + 2 * pad,
                h: h + 2 * pad,
                only: only !== null && only >= 0 ? only : null,
                withoutParts,
                glowScale: job.scale,
                ...(keptStore ? { keep: { store: `${keptStore}~${palette}`, key } } : {}),
            })
                .then((drawn) => {
                    if (!drawn) throw new Error("The drawing could not be rasterised");
                    mapCount(drawn.cached ? "art-cached" : "art-rastered", 1);
                    // a box with nothing in it is kept as a mark of that, which costs next to nothing
                    const kept = keepPixels(
                        key,
                        drawn.pixels,
                        drawn.pixels ? drawn.w * drawn.h * 4 : 64,
                    );
                    leaf.failures = 0;
                    landed(drawn.pixels, kept);
                })
                .catch(() => {
                    leaf.pending = false;
                    // a worker short of canvas memory, or a kept copy that would not read, is often
                    // gone a moment later, so a drawing is asked for again before it is given up on
                    leaf.failures = (leaf.failures ?? 0) + 1;
                    if (leaf.failures >= RETRIES) leaf.failed = job.version;
                    else {
                        const wait = 400 * 2 ** leaf.failures;
                        leaf.retryAt = performance.now() + wait;
                        setTimeout(wake, wait + 16);
                    }
                })
                .finally(() => {
                    decoding--;
                    drawingPixels -= pixels;
                    wake();
                    pump();
                });
        }
    };

    /** Uploads what has decoded, nearest first, for as long as the frame allows. */
    const upload = (started: number): void => {
        while (decoded.length) {
            if (performance.now() - started > UPLOADING) {
                wake();
                return;
            }
            const d = decoded.shift();
            if (!d) break;
            const { leaf } = d;
            leaf.pending = false;
            // a bitmap the memory store let go of while it waited is asked for again
            if (d.pixels instanceof ImageBitmap && !d.pixels.width) continue;
            if (stopped || !isLive(leaf)) {
                if (d.pixels instanceof ImageBitmap && !d.kept) d.pixels.close();
                continue;
            }
            // one on the screen that had no pixels, and so was late, fades in rather than appearing
            if (
                !hasPixels(leaf) &&
                !leaf.empty &&
                leaf.late !== undefined &&
                leaf.late >= frames - 1 &&
                leaf.tile === undefined
            )
                leaf.born = performance.now();
            // what the suite counts: pixels replaced while the ones they replace were on the screen
            if (leaf.own !== undefined && leaf.own >= frames - 1 && leaf.rastered >= 0) {
                if (d.scale > leaf.scale * 1.01) mapCount("art-sharpened", 1);
                else if (d.version === leaf.rastered) {
                    mapCount("art-redrawn", 1);
                }
            }
            letGo(leaf);
            leaf.empty = false;
            const slot = d.padded ? cell(d.w, d.h) : null;
            let texture: GlTexture | null = null;
            if (slot && pages.write(slot, d.pixels)) leaf.slot = slot;
            else {
                if (slot) pages.free(slot);
                texture = gl.upload(d.pixels, d.w, d.h);
            }
            // a bitmap the memory store does not hold is let go as soon as the GPU has its pixels
            if (d.pixels instanceof ImageBitmap && !d.kept) d.pixels.close();
            if (!leaf.slot) {
                if (!texture) continue;
                leaf.texture = texture;
                bytes += texture.bytes;
            }
            leaf.scale = d.scale;
            leaf.rect = d.rect;
            leaf.rastered = d.version;
            leaf.split = d.split;
            // the markup its pixels show, which another drawing shares them by only while it still is
            if (leaf.tile === undefined && d.version === leaf.version) {
                leaf.drew = retiredKey(leaf.svg, leaf.part);
                holders.set(leaf.drew, leaf);
            }
        }
        pages.settle();
    };

    /** Lets drawings go, seen longest ago first, until what the GPU holds for them is `to` bytes. */
    const trim = (to: number): void => {
        const held = kept();
        const own = held.filter((l) => l.texture).sort((a, b) => a.drawn - b.drawn);
        for (const leaf of own) {
            if (bytes + pages.bytes() <= to) return;
            letGo(leaf);
        }
        // a page's memory goes only once nothing is in it, so pages go whole, the one seen longest ago first
        const byPage = new Map<GlTexture, { last: number; leaves: Leaf[] }>();
        for (const l of held) {
            if (!l.slot) continue;
            const page = byPage.get(l.slot.page) ?? { last: 0, leaves: [] };
            page.last = Math.max(page.last, l.drawn);
            page.leaves.push(l);
            byPage.set(l.slot.page, page);
        }
        for (const page of [...byPage.values()].sort((a, b) => a.last - b.last)) {
            if (bytes + pages.bytes() <= to) return;
            for (const leaf of page.leaves) letGo(leaf);
        }
    };
    const evict = (now: number): void => {
        // a drawing taken off the scene keeps its pixels until the budget wants them, and goes from
        // the record once they have gone
        for (const [k, r] of retired) if (!hasPixels(r.leaf) && !r.leaf.empty) retired.delete(k);
        // the records of markup seen and the scales drawn at are let go past a size no roll reaches, so
        // a long visit does not grow them for ever; what they named is found again by its markup
        if (byContent.size > 50_000) byContent.clear();
        if (tileScales.size > 50_000) tileScales.clear();
        // and the record of who drew each markup forgets what has no pixels, so it holds no page alive
        if (frames % 60 === 0)
            for (const [k, l] of holders) if (!hasPixels(l) && !l.empty) holders.delete(k);
        for (const [key, t] of tiles)
            if (!t.slot && !t.texture && !t.pending && now - (t.seen ?? 0) > FORGOTTEN)
                tiles.delete(key);
        if (bytes <= BUDGET / 2) return;
        const idle = kept()
            .filter((l) => l.texture && l.drawn < frames)
            .sort((a, b) => a.drawn - b.drawn);
        for (const leaf of idle) {
            if (bytes <= BUDGET * 0.4) break;
            letGo(leaf);
        }
    };

    function draw(): void {
        const current = camera;
        if (!current || stopped) return;
        let cam: Camera = current;
        frames++;
        const now = performance.now();
        upload(now);
        // while the camera moves a drawing keeps the texture it has unless it would look four times as
        // soft, and one new to the camera is drawn at half the sharpness, since each is drawn on the main
        // thread; all of it is drawn sharp once the camera rests
        const still = now - moved > SETTLE;
        const around = (c: Camera): { seen: Rect; margin: Rect } => {
            const v = visibleRect(c, size);
            return {
                seen: v,
                margin: { x: v.x - v.w * 0.25, y: v.y - v.h * 0.25, w: v.w * 1.5, h: v.h * 1.5 },
            };
        };
        let { seen, margin } = around(cam);
        // where a flight is going, drawn ahead at the sharpness it will want there
        const there = ahead ? visibleRect(ahead, size) : null;
        let reach = there ? union([margin, there]) : margin;
        const toThere = ahead ? ahead.z * density : 0;
        /** The pixels to a unit the drawing being visited is drawn at: the camera's, or the flight's end's. */
        let zoomFor = 0;
        const script = new Map<Element, Animation[]>();
        // the source is never laid out, so what plays in it is only what a script plays, which it holds
        for (const a of src.getAnimations({ subtree: true })) {
            const target = a.effect instanceof KeyframeEffect ? a.effect.target : null;
            if (!target) continue;
            const list = script.get(target);
            if (list) list.push(a);
            else script.set(target, [a]);
        }
        const draws: GlDraw[] = [];
        // drawings in one page one after another are one instanced batch
        let batches = 0;
        /** One drawing from its cell, or with `from`, the part of its cell that holds `rect`. */
        const sprite = (
            slot: Slot,
            rect: Rect,
            at: Affine,
            alpha: number,
            tone: Tone,
            from?: Rect,
        ): void => {
            const [u, v, uw, vh] = slot.uv;
            const last = draws.at(-1);
            let batch = last?.kind === "sprites" && last.texture === slot.page ? last : null;
            if (!batch) {
                const instances = (spare[batches] ??= new Float32Array(SPRITE * 64));
                batch = { kind: "sprites", texture: slot.page, instances, count: 0 };
                draws.push(batch);
                batches++;
            }
            if ((batch.count + 1) * SPRITE > batch.instances.length) {
                const grown = new Float32Array(batch.instances.length * 2);
                grown.set(batch.instances);
                batch.instances = spare[batches - 1] = grown;
            }
            const hw = rect.w / 2,
                hh = rect.h / 2,
                cx = rect.x + hw,
                cy = rect.y + hh;
            // written in place, since a frame writes thousands of these
            const f = batch.instances,
                i = batch.count * SPRITE;
            f[i] = at[0] * cx + at[2] * cy + at[4];
            f[i + 1] = at[1] * cx + at[3] * cy + at[5];
            f[i + 2] = at[0] * hw;
            f[i + 3] = at[1] * hw;
            f[i + 4] = at[2] * hh;
            f[i + 5] = at[3] * hh;
            f[i + 6] = from ? u + ((rect.x - from.x) / from.w) * uw : u;
            f[i + 7] = from ? v + ((rect.y - from.y) / from.h) * vh : v;
            f[i + 8] = from ? (rect.w / from.w) * uw : uw;
            f[i + 9] = from ? (rect.h / from.h) * vh : vh;
            f[i + 10] = alpha;
            f[i + 11] = alpha;
            f[i + 12] = alpha;
            f[i + 13] = alpha;
            f[i + 14] = tone.gray;
            f[i + 15] = tone.saturate;
            f[i + 16] = tone.contrast;
            f[i + 17] = tone.brightness;
            f[i + 18] = 0;
            batch.count++;
        };
        let moving = false;
        let toScreen = cam.z * density;
        /** Whether the workers have room to draw what is new to the view at full sharpness while the camera moves. */
        const roomy = queue.length + decoding < DECODING * 2;
        const idling = new Map<SVGSVGElement, { share: number; w: number; h: number }>();
        let wanting = 0;
        // what the page's diagnostics count (?mapDebug): a drawing on the screen last frame with nothing
        // this frame is a flash, and one in view that has never had pixels is late
        let lost = 0,
            late = 0;
        /** Whether what `reckon` is told of is on the screen, not only in the margin kept ready round it. */
        let onScreen = false;
        /** Whether the walk is of a source being prepared, which is drawn to pixels but not shown. */
        let staging = false;
        const reckon = (l: Leaf, drew: boolean): void => {
            if (staging) return;
            if (drew) l.shown = frames;
            else if (!onScreen) return;
            else if (l.shown === frames - 1) lost++;
            else {
                late++;
                l.late = frames;
            }
        };
        const visit = (el: Element, parent: Affine, alpha: number, tone: Tone): void => {
            const info = infoOf(el);
            if (info.hidden || info.kind === "skip") return;
            let local = info.at,
                a = alpha * info.opacity;
            const m = info.motion;
            if (m) {
                if (now - m.checked > 500) {
                    m.checked = now;
                    m.paused = getComputedStyle(el).animationPlayState.startsWith("paused");
                }
                const paused = m.paused;
                if (paused && m.pausedAt === null) m.pausedAt = now;
                else if (!paused && m.pausedAt !== null) {
                    m.born += now - m.pausedAt;
                    m.pausedAt = null;
                }
                const at = playOf(m, now);
                local = at.m;
                if (at.opacity !== null) a = alpha * at.opacity;
                if (!paused) moving = true;
            }
            const played = scriptOf(script.get(el) ?? []);
            if (played) {
                if (played.m) local = played.m;
                if (played.opacity !== null) a = alpha * played.opacity;
                if (played.running) moving = true;
            }
            if (a <= 0) return;
            const [ox, oy] = info.origin;
            const placed = multiply(
                multiply(translation(info.offset[0] + ox, info.offset[1] + oy), local),
                translation(-ox, -oy),
            );
            const at = multiply(parent, placed);
            const t = toned(tone, info.tone);
            if (info.kind === "shade") {
                const texture = shade();
                if (texture)
                    draws.push({
                        kind: "image",
                        texture,
                        rect: { x: 0, y: 0, w: info.size.w, h: info.size.h },
                        at,
                        alpha: a,
                    });
                return;
            }
            if (info.kind === "svg" && el instanceof SVGSVGElement) {
                drawing(el, info, at, a, t);
                return;
            }
            for (const child of el.children) visit(child, at, a, t);
        };
        const leafOf = (key: Element, svg: SVGSVGElement, part: Element | null, whole: Rect) => {
            let l = leaves.get(key);
            const k = l ? "" : retiredKey(svg, part);
            const back = l ? undefined : retired.get(k);
            if (back) {
                retired.delete(k);
                l = back.leaf;
                l.svg = svg;
                l.part = part;
                l.version = 0;
                l.rastered = 0;
                l.pending = false;
                leaves.set(key, l);
                keysFor(svg).add(key);
            }
            if (!l) {
                l = {
                    svg,
                    part,
                    split: false,
                    texture: null,
                    slot: null,
                    scale: 0,
                    rect: whole,
                    version: 0,
                    rastered: -1,
                    failed: -1,
                    drawn: 0,
                    pending: false,
                };
                leaves.set(key, l);
                keysFor(svg).add(key);
                // a drawing with the same markup as one drawn already shows its pixels, as a roll
                // painted again beside the one on screen does before the two are swapped
                const wanted = k || retiredKey(svg, part);
                const from = holders.get(wanted);
                if (
                    from &&
                    from !== l &&
                    from.drew === wanted &&
                    hasPixels(from) &&
                    from.rastered === from.version
                ) {
                    share(l, from);
                    l.rastered = 0;
                }
            }
            l.drawn = frames;
            return l;
        };
        /** Asks for the texture a leaf wants at this camera, and draws the one it has. */
        const want = (
            l: Leaf,
            whole: Rect,
            at: Affine,
            alpha: number,
            tone: Tone,
            split: boolean,
        ): void => {
            const unit = Math.sqrt(Math.abs(at[0] * at[3] - at[1] * at[2])) || 1;
            // drawn at the sharpness it will be seen at, unless the camera is moving and the workers are
            // behind, when a drawing new to the view is drawn at half first; what is ahead of a flight is
            // always drawn at the sharpness it will want on arrival (.docs/map-smoothness-plan.md, phase 3)
            let scale =
                2 ** Math.ceil(Math.log2(Math.max(unit * zoomFor, 1 / 1024))) /
                (still || roomy || zoomFor !== toScreen ? 1 : 2);
            // too large on screen for one texture: a window of it round what the camera sees
            let rect = whole;
            const inverse = invert(at);
            if (Math.max(whole.w, whole.h) * scale > LARGEST) {
                rect = (inverse ? clip(bounds(inverse, margin), whole) : null) ?? whole;
                scale = Math.min(scale, LARGEST / Math.max(rect.w, rect.h, 1));
            }
            const wanted =
                rect !== whole && inverse ? (clip(bounds(inverse, seen), whole) ?? whole) : whole;
            const stale =
                !(hasPixels(l) || l.empty) ||
                l.scale < scale / (still ? 1.05 : 2.1) ||
                l.version !== l.rastered ||
                (!l.part && l.split !== split) ||
                // a drawing drawn sharp keeps its pixels as the camera draws back, down to an eighth,
                // which its mipmaps show well, rather than being drawn again softer; and a source
                // prepared for a camera much further out, as the whole country is, never takes the
                // pixels on the screen for a softer copy
                (still && !staging && l.scale > scale * 8.1) ||
                (!(staging && l.scale > scale * 2) && !contains(l.rect, wanted));
            if (stale && l.failed !== l.version) {
                wanting++;
                const c = bounds(at, rect);
                request({
                    leaf: l,
                    scale,
                    rect,
                    version: l.version,
                    near: Math.hypot(c.x + c.w / 2 - cam.x, c.y + c.h / 2 - cam.y),
                    tier:
                        zoomFor !== toScreen
                            ? 2
                            : !onScreen
                              ? 5
                              : !hasPixels(l) && !l.empty
                                ? 1
                                : l.scale < scale
                                  ? 4
                                  : 3,
                    wanted: now,
                });
            }
            // a drawing that came to the screen with nothing standing in for it fades in
            const fading =
                l.born !== undefined && !o.still ? Math.min(1, (now - l.born) / ARRIVES) : 1;
            if (fading < 1) moving = true;
            else l.born = undefined;
            const shown = alpha * fading;
            if (l.slot && pages.live(l.slot)) sprite(l.slot, l.rect, at, shown, tone);
            else if (l.texture)
                draws.push({
                    kind: "image",
                    texture: l.texture,
                    rect: l.rect,
                    at,
                    alpha: shown,
                    tone,
                });
            if (hasPixels(l) && !staging) l.own = frames;
            reckon(l, !!(l.texture || (l.slot && pages.live(l.slot)) || l.empty));
        };
        /**
         * A drawing too large on screen for one texture, drawn as the tiles of a grid at a scale that
         * are in view: each tile is drawn once at its scale and kept, so a pan draws only the tiles it
         * brings into view and a pan back draws none, as the browser tiles a large layer. A tile not yet
         * drawn at this scale is stood in for by its parent's share or its four children, never both,
         * since the drawings under it are translucent and would show twice.
         */
        const tiled = (
            svg: SVGSVGElement,
            whole: Rect,
            at: Affine,
            alpha: number,
            tone: Tone,
        ): boolean => {
            const unit = Math.sqrt(Math.abs(at[0] * at[3] - at[1] * at[2])) || 1;
            const wanted = 2 ** Math.ceil(Math.log2(Math.max(unit * toScreen, 1 / 1024)));
            if (Math.max(whole.w, whole.h) * wanted <= TILED) return false;
            // while the camera moves a drawing is drawn at a quarter of its sharpness, a sixteenth of
            // the tiles, which the workers keep up with, and keeps the tiles it has unless they are four
            // times too soft or twice too sharp; it takes the scale it wants once the camera rests
            const id = idOf(svg);
            // a drawing that has just changed keeps the scale its tiles were drawn at, so its old
            // tiles stand in rather than tiles of another scale being asked for
            const before = previousIds.get(svg);
            const had =
                tileScales.get(id) ?? (before === undefined ? undefined : tileScales.get(before));
            const scale =
                !still && had !== undefined && had >= wanted / 4 && had <= wanted * 2
                    ? had
                    : still
                      ? wanted
                      : wanted / 4;
            tileScales.set(id, scale);
            const inverse = invert(at);
            const shown = inverse ? clip(bounds(inverse, margin), whole) : null;
            if (!shown) return true;
            const side = TILE / scale;
            const x0 = Math.floor(shown.x / side),
                y0 = Math.floor(shown.y / side),
                x1 = Math.floor((shown.x + shown.w) / side),
                y1 = Math.floor((shown.y + shown.h) / side);
            /** A tile with pixels in a cell, which can stand in cropped, whether or not it is up to date. */
            const inCell = (l: Leaf | undefined): l is Leaf & { slot: Slot } =>
                !!l && !!l.slot && pages.live(l.slot) && l.rastered >= 0;
            /** A tile with something to show: pixels, in a cell or its own texture, or found empty. */
            const holds = (l: Leaf | undefined): boolean =>
                !!l && l.rastered >= 0 && (inCell(l) || !!l.texture || !!l.empty);
            /**
             * A tile drawn at its version. A drawing the painters keep adding to, as a roll's ground is
             * while the pieces near the camera are painted into it, has its tiles behind by a version or
             * two most of the time, and they show as they were until they are drawn again.
             */
            const split = movingParts(svg).length > 0;
            const ready = (l: Leaf): boolean =>
                holds(l) && l.rastered === l.version && (l.empty || l.split === split);
            const put = (l: Leaf, rect: Rect): void => {
                if (!staging) l.own = frames;
                if (l.slot && pages.live(l.slot)) sprite(l.slot, rect, at, alpha, tone);
                else if (l.texture)
                    draws.push({ kind: "image", texture: l.texture, rect, at, alpha, tone });
            };
            const ask = (l: Leaf, near: number, tier = onScreen ? 3 : 5): void => {
                if (l.failed === l.version) return;
                request({
                    leaf: l,
                    scale: l.scale,
                    rect: l.rect,
                    version: l.version,
                    near,
                    tier,
                    wanted: now,
                });
            };
            /** The tile of the grid at `at_` holding a point, made if it is not yet. */
            const tileAt = (at_: number, x: number, y: number): Leaf | null => {
                const side_ = TILE / at_;
                const tx = Math.floor(x / side_),
                    ty = Math.floor(y / side_);
                const rect = clip({ x: tx * side_, y: ty * side_, w: side_, h: side_ }, whole);
                if (!rect) return null;
                const key = tileKey(id, at_, tx, ty);
                let l = tiles.get(key);
                if (!l) {
                    l = {
                        svg,
                        part: null,
                        split: false,
                        texture: null,
                        slot: null,
                        scale: at_,
                        rect,
                        version: tileVersion(svg),
                        rastered: -1,
                        failed: -1,
                        drawn: 0,
                        pending: false,
                        tile: key,
                    };
                    tiles.set(key, l);
                }
                l.svg = svg;
                l.drawn = frames;
                l.seen = now;
                return l;
            };
            for (let ty = y0; ty <= y1; ty++)
                for (let tx = x0; tx <= x1; tx++) {
                    const cx = (tx + 0.5) * side,
                        cy = (ty + 0.5) * side;
                    const l = tileAt(scale, cx, cy);
                    if (!l) continue;
                    const c = bounds(at, l.rect);
                    const near = Math.hypot(c.x + c.w / 2 - cam.x, c.y + c.h / 2 - cam.y);
                    onScreen = intersects(c, seen);
                    if (ready(l)) {
                        put(l, l.rect);
                        reckon(l, true);
                        continue;
                    }
                    ask(l, near);
                    if (l.failed !== l.version) wanting++;
                    // its own pixels from before the drawing changed are the closest there is
                    if (holds(l)) {
                        put(l, l.rect);
                        reckon(l, true);
                        continue;
                    }
                    // or the same tile of the drawing as it was before it changed
                    const was =
                        before === undefined
                            ? undefined
                            : tiles.get(tileKey(before, scale, tx, ty));
                    if (was && holds(was)) {
                        was.drawn = frames;
                        put(was, was.rect);
                        reckon(l, true);
                        continue;
                    }
                    // then the nearest coarser tile that has pixels, its share of it cropped; one three
                    // scales down is asked for first, since it costs one tile and covers sixty-four
                    let covered = false;
                    for (let k = 1; k <= 4 && !covered; k++) {
                        const up = tileAt(scale / 2 ** k, cx, cy);
                        if (up && inCell(up)) {
                            sprite(up.slot, l.rect, at, alpha, tone, up.rect);
                            covered = true;
                        } else if (up && k === 3) ask(up, near, 0);
                    }
                    // or the finer tiles it has from before, one or two scales up
                    for (const k of covered ? [] : [1, 2]) {
                        const n = 2 ** k;
                        const finer: Leaf[] = [];
                        for (let dy = 0; dy < n; dy++)
                            for (let dx = 0; dx < n; dx++) {
                                const f = tiles.get(
                                    tileKey(id, scale * n, tx * n + dx, ty * n + dy),
                                );
                                if (f && holds(f)) {
                                    f.drawn = frames;
                                    finer.push(f);
                                }
                            }
                        if (finer.length) {
                            for (const f of finer) put(f, f.rect);
                            covered = true;
                            break;
                        }
                    }
                    reckon(l, covered);
                }
            return true;
        };
        const drawing = (
            svg: SVGSVGElement,
            info: Info,
            at: Affine,
            alpha: number,
            tone: Tone,
        ): void => {
            const { w, h } = info.size;
            if (w <= 0 || h <= 0) return;
            const whole = {
                x: -w * OVERFLOW,
                y: -h * OVERFLOW,
                w: w * (1 + 2 * OVERFLOW),
                h: h * (1 + 2 * OVERFLOW),
            };
            const onWorld = bounds(at, whole);
            if (!intersects(onWorld, reach)) return;
            const near = intersects(onWorld, margin);
            // a large drawing is left until it is near, rather than tiled for a view the flight may pass
            if (!near && Math.max(onWorld.w, onWorld.h) * toThere > TILED) return;
            zoomFor = near ? toScreen : toThere;
            onScreen = intersects(onWorld, seen);
            const moves = movingParts(svg);
            // a large drawing is tiled whether or not it has parts that move, which are drawn on their
            // own over its tiles as over the drawing drawn whole
            const tiledHere = near && !!o.tiles && tiled(svg, whole, at, alpha, tone);
            if (tiledHere && !moves.length) return;
            if (!tiledHere)
                want(leafOf(svg, svg, null, whole), whole, at, alpha, tone, moves.length > 0);
            if (svg.hasAttribute("data-anim") && !staging) {
                const shown = clip(onWorld, seen);
                if (shown)
                    idling.set(svg, {
                        share: (shown.w * shown.h) / Math.max(1, seen.w * seen.h),
                        w,
                        h,
                    });
            }
            if (!moves.length) return;
            // a part turns in the drawing's own units: into them, by the part, and back to the box
            const vb = svg.viewBox.baseVal;
            const toBox: Affine = vb.width
                ? multiply([w / vb.width, 0, 0, h / vb.height, 0, 0], translation(-vb.x, -vb.y))
                : IDENTITY;
            const fromBox = invert(toBox) ?? IDENTITY;
            const partBoxes = sketchFor(svg).partBoxes;
            // a glow is cast round each part as round the drawing, and a part's box leaves it out
            const glow = Math.max(4, ...sketchFor(svg).glow.map((g) => g.blur * 3));
            for (const [k, part] of moves.entries()) {
                const box = partBoxes[k];
                const room = box
                    ? (clip(grownBy(bounds(toBox, box), glow), whole) ?? whole)
                    : whole;
                const played = scriptOf(script.get(part) ?? []);
                if (played?.running) moving = true;
                const written = parts(part.getAttribute("transform") ?? "");
                const turn = played?.m ?? (written ? affineOf(written) : IDENTITY);
                const own =
                    part instanceof SVGElement && part.style.opacity
                        ? parseFloat(part.style.opacity)
                        : 1;
                const partAt = multiply(at, multiply(toBox, multiply(turn, fromBox)));
                want(
                    leafOf(part, svg, part, room),
                    room,
                    partAt,
                    alpha * (played?.opacity ?? own),
                    tone,
                    true,
                );
            }
        };
        for (const layer of src.children) visit(layer, IDENTITY, 1, PLAIN);
        if (preparing) {
            const kept = draws.length,
                keptBatches = batches,
                last = draws.at(-1),
                keptCount = last?.kind === "sprites" ? last.count : 0,
                wanted = wanting;
            wanting = 0;
            staging = true;
            // the source to come is walked with the camera it will be shown under
            const now = { cam, seen, margin, reach, toScreen };
            cam = preparing.camera ?? cam;
            ({ seen, margin } = around(cam));
            reach = margin;
            toScreen = cam.z * density;
            for (const layer of preparing.root.children) visit(layer, IDENTITY, 1, PLAIN);
            ({ cam, seen, margin, reach, toScreen } = now);
            staging = false;
            const ready = !wanting;
            wanting = wanted;
            draws.length = kept;
            batches = keptBatches;
            if (last?.kind === "sprites") last.count = keptCount;
            if (ready || performance.now() > preparing.until) {
                const { done } = preparing;
                preparing = null;
                done();
            }
        }
        // the terrain goes under everything, and is told whether what is over it is drawn yet this
        // frame, for its marks to stay until it is
        const under = ground?.draws(
            cam,
            size,
            density,
            ahead,
            wanting > 0 || queue.length > 0 || decoding > 0,
        );
        if (under) draws.unshift(...under.draws);
        mapCount("art-lost", lost);
        mapCount("art-late", late);
        const busy = wanting > 0 || queue.length > 0 || decoding > 0 || decoded.length > 0;
        if (!busy && wasBusy) mapNote("art-quiet-at", now);
        wasBusy = busy;
        mapNote("art-busy", busy ? 1 : 0);
        // what a frame of the scene costs the page's thread, in hundredths of a millisecond
        mapCount("scene-cost", Math.round((performance.now() - now) * 100));
        mapCount("scene-frames", 1);
        mapNote("art-wanting", wanting);
        mapNote("scene-leaves", leaves.size);
        mapNote("scene-tiles", tiles.size);
        mapNote("scene-retired", retired.size);
        mapNote("scene-gpu-mb", Math.round((bytes + pages.bytes()) / MB));
        mapNote("kept-mb", Math.round(drawnBytes / MB));
        mapNote("art-queued", queue.length);
        mapNote("art-decoding", decoding + decoded.length);
        mapNote("camera-moved-at", moved);
        gl.draw(cam, size, {
            grid: { colour: o.tokens.grid, layers: paperLayers(cam.z) },
            mask: under?.mask,
            draws,
        });
        // the idles are told what is on screen once the camera rests, since each telling plans them again
        if (see && still) {
            const changes: [SVGSVGElement, { share: number; w: number; h: number } | null][] = [];
            for (const [svg, was] of seenIdling)
                if (!idling.has(svg)) {
                    seenIdling.delete(svg);
                    changes.push([svg, null]);
                } else if (Math.abs((idling.get(svg)?.share ?? 0) - was) < was * 0.5)
                    idling.delete(svg);
            for (const [svg, seenNow] of idling) {
                seenIdling.set(svg, seenNow.share);
                changes.push([svg, seenNow]);
            }
            see(changes);
        }
        pump();
        evict(now);
        if (
            waiters.length &&
            still &&
            !wanting &&
            !queue.length &&
            !decoding &&
            !decoded.length &&
            (o.view ? ground?.complete() : true)
        )
            for (const done of waiters.splice(0)) done();
        if (moving || preparing) wake();
        else if (under?.again != null && !drifting)
            drifting = setTimeout(() => {
                drifting = 0;
                wake();
            }, under.again);
    }

    return {
        canvas,
        frame(cam, vp, to) {
            // a frame the camera is where it was, as when the page repaints the words over it, leaves it settled
            const same =
                !!camera &&
                camera.x === cam.x &&
                camera.y === cam.y &&
                camera.z === cam.z &&
                size.w === vp.w &&
                size.h === vp.h;
            camera = { ...cam };
            ahead = to ?? null;
            if (!same) {
                moved = performance.now();
                clearTimeout(settling);
                settling = setTimeout(wake, SETTLE + 20);
            }
            size = vp;
            // every pass the GPU makes costs by the pixel, so a large window draws a little under twice
            const fits = Math.min(glDensity(), Math.sqrt(PIXELS / Math.max(1, vp.w * vp.h)));
            if (fits !== density) {
                density = Math.max(1, fits);
                gl.setDensity(density);
            }
            // drawn now rather than on the next frame, so the canvas moves in the same frame as the
            // words and buttons over it, which the camera has just moved
            cancelAnimationFrame(scheduled);
            scheduled = 0;
            if (!stopped) draw();
        },
        setReach(reach) {
            ground?.setReach(reach);
        },
        settled() {
            wake();
            return new Promise((done) => waiters.push(done));
        },
        prepare(root, at) {
            preparing?.done();
            return new Promise((done) => {
                preparing = {
                    root,
                    camera: at ?? null,
                    done,
                    until: performance.now() + PREPARING,
                };
                wake();
            });
        },
        rebind(hidden, overlay, told) {
            if (hidden === src) return;
            // what the old source held is taken off the scene with its pixels kept, for what is painted
            // into the new one to find by its markup
            const gone = new Set<SVGSVGElement>();
            for (const svg of keysOf.keys()) if (!hidden.contains(svg)) gone.add(svg);
            for (const svg of gone) drop(svg);
            if (seenIdling.size) see?.([...seenIdling.keys()].map((svg) => [svg, null]));
            seenIdling.clear();
            for (const twin of twins.values()) twin.remove();
            twins.clear();
            infos.clear();
            watching.disconnect();
            src = hidden;
            over = overlay;
            see = told;
            watching.observe(src, { childList: true, subtree: true, attributes: true });
            lift(src);
            wake();
        },
        park() {
            cancelAnimationFrame(scheduled);
            scheduled = 0;
            clearTimeout(settling);
            camera = null;
            canvas.remove();
            for (const job of queue) {
                job.leaf.pending = false;
            }
            queue.length = 0;
            queued.clear();
            // what waits to be shown again keeps what it drew up to half its pages, the most recently seen
            // first, so coming back to it draws nothing; a phone has room on its GPU for one screen, and
            // takes what this one drew from the pixels kept in memory when it comes back
            trim(smallDevice ? 0 : (o.tiles ? PAGES : BUDGET) / 2);
            ground?.park(smallDevice);
        },
        unpark(host, under) {
            host.insertBefore(canvas, under);
        },
        stop() {
            stopped = true;
            starting.abort();
            cancelAnimationFrame(scheduled);
            clearTimeout(settling);
            clearTimeout(drifting);
            for (const d of decoded)
                if (d.pixels instanceof ImageBitmap && !d.kept) d.pixels.close();
            decoded.length = 0;
            watching.disconnect();
            for (const twin of twins.values()) twin.remove();
            twins.clear();
            ground?.stop();
            gl.stop();
            canvas.remove();
            leaves.clear();
            keysOf.clear();
            tiles.clear();
            infos.clear();
            seenIdling.clear();
            queue.length = 0;
            queued.clear();
        },
    };
}

function invert(m: Affine): Affine | null {
    const det = m[0] * m[3] - m[1] * m[2];
    if (!det) return null;
    return [
        m[3] / det,
        -m[1] / det,
        -m[2] / det,
        m[0] / det,
        (m[2] * m[5] - m[3] * m[4]) / det,
        (m[1] * m[4] - m[0] * m[5]) / det,
    ];
}
const clip = (a: Rect, b: Rect): Rect | null => {
    const x = Math.max(a.x, b.x),
        y = Math.max(a.y, b.y),
        r = Math.min(a.x + a.w, b.x + b.w),
        d = Math.min(a.y + a.h, b.y + b.h);
    return r > x && d > y ? { x, y, w: r - x, h: d - y } : null;
};
const contains = (a: Rect, b: Rect): boolean =>
    b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h;
