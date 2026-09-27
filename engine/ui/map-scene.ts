// The map's drawings on the GPU (.docs/overworld-gpu.md). The painters in map.ts put what they draw
// into a hidden copy of the world, where the page's stylesheets still apply; each SVG in it is drawn by
// the browser's own SVG renderer into a texture at the size the camera shows it, placed by the same
// positions and transforms, and moved by the same CSS and script animations, evaluated here. A drawing's
// parts that move are drawn as textures of their own. What carries text is moved into the visible world
// instead, over the canvas.
import {
    intersects,
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
import { movingPartsOf, rasterize, sketchOf, type Sketch } from "./sprites";

/** What rasterized drawings may hold on the GPU before the least recently drawn are let go. */
const BUDGET = 96 * 1024 * 1024;
/** The largest side a texture is given; a drawing larger than that on screen is drawn a window at a time. */
const LARGEST = 2048;
/** How far past its box a drawing is rasterized, for the strokes and motion that overflow it. */
const OVERFLOW = 0.2;
/** How many drawings are with the workers at once; they draw off the page's thread, so a few at a time. */
const DECODING = 6;
/** The most backing pixels the map's canvas has, whatever the window. */
const PIXELS = 4_000_000;
/** What a label holds when it holds only words, so it can move over the canvas whole. */
const INLINE = new Set(["SPAN", "B", "I", "EM", "STRONG", "BR", "SMALL"]);
/** Milliseconds of a frame given to uploading drawings, since the browser draws an svg as it uploads it. */
const UPLOADING = 6;
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

export interface Scene {
    frame(camera: Camera, size: Size): void;
    /** Once a frame has drawn everything the camera sees, at the sharpness it wants. */
    settled(): Promise<void>;
    setReach(reach: MapView["reach"]): void;
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
    view: MapView;
    tokens: Tokens;
    /** Tells the group the drawings idle on which of them are on screen. */
    see?: Group["see"];
    /** Nothing in the terrain drifts, under reduced motion and on a map drawn still. */
    still: boolean;
}): Scene {
    const canvas = document.createElement("canvas");
    canvas.className = "map-gl";
    canvas.setAttribute("aria-hidden", "true");
    o.host.insertBefore(canvas, o.under);
    const infos = new Map<Element, Info>();
    const clocks = new WeakMap<Element, Motion>();
    /** By the svg, or by a moving part drawn on its own. */
    const leaves = new Map<Element, Leaf>();
    /** The drawings that idle, each with the share of the screen it had when last told. */
    const seenIdling = new Map<SVGSVGElement, number>();
    let bytes = 0;
    /** The instance buffers the batches are written into, kept from frame to frame. */
    const spare: Float32Array[] = [];
    const decoded: {
        leaf: Leaf;
        pixels: ImageData;
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
    let moved = 0,
        settling: ReturnType<typeof setTimeout> | undefined;
    let camera: Camera | null = null,
        size: Size = { w: 0, h: 0 },
        frames = 0,
        scheduled = 0,
        decoding = 0,
        stopped = false,
        ground: Terrain | null = null;
    const queue: {
        key: Element;
        scale: number;
        rect: Rect;
        version: number;
        near: number;
    }[] = [];
    const wake = (): void => {
        if (!scheduled && !stopped)
            scheduled = requestAnimationFrame(() => {
                scheduled = 0;
                if (camera) draw();
            });
    };
    const forget = (): void => {
        for (const leaf of leaves.values()) {
            leaf.texture = null;
            leaf.slot = null;
            leaf.pending = false;
        }
        pages.reset();
        bytes = 0;
        wake();
    };
    const gl = canvasGl(canvas, forget);
    // half the budget for the pages the small drawings share, half for the large ones' own textures
    const pages = atlas(gl, BUDGET / 2);
    /** Lets a leaf's pixels go, from its own texture or its cell. */
    const letGo = (leaf: Leaf): void => {
        if (leaf.texture) {
            bytes -= leaf.texture.bytes;
            gl.release(leaf.texture);
            leaf.texture = null;
        }
        if (leaf.slot) {
            pages.free(leaf.slot);
            leaf.slot = null;
        }
    };
    /** A cell for a drawing, freeing the cells drawn longest ago when the pages are full. */
    const cell = (w: number, h: number): Slot | null => {
        let slot = pages.place(w, h);
        if (slot) return slot;
        // this runs as a frame starts, so what the last frame drew is on screen and stays
        const idle = [...leaves.values()]
            .filter((l) => l.slot && l.drawn < frames - 1)
            .sort((a, b) => a.drawn - b.drawn);
        for (const leaf of idle) {
            letGo(leaf);
            slot = pages.place(w, h);
            if (slot) return slot;
        }
        return null;
    };
    let density = glDensity();
    gl.setDensity(density);
    const starting = new AbortController();
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
    const copy = (from: Element, to: Element): void => {
        for (const a of Array.from(to.attributes))
            if (!from.hasAttribute(a.name)) to.removeAttribute(a.name);
        for (const a of Array.from(from.attributes)) to.setAttribute(a.name, a.value);
    };
    const twinOf = (el: Element): HTMLElement => {
        if (el === o.hidden) return o.overlay;
        const had = twins.get(el);
        if (had) return had;
        const twin = document.createElement(el.tagName);
        copy(el, twin);
        twins.set(el, twin);
        twinOf(el.parentElement ?? o.hidden).append(twin);
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
                twinOf(el.parentElement ?? o.hidden).append(el);
                return;
            }
            for (const child of Array.from(el.children)) walk(child);
        };
        if (o.hidden.contains(root)) walk(root);
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
        const written = parts(style?.transform || (cs.transform === "none" ? "" : cs.transform));
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
    const forgetInfo = (el: Element): void => {
        infos.delete(el);
        for (const child of el.children)
            if (child instanceof SVGSVGElement) infos.delete(child);
            else if (!(child instanceof SVGElement)) forgetInfo(child);
    };
    const drop = (svg: SVGSVGElement): void => {
        for (const [key, leaf] of leaves) {
            if (leaf.svg !== svg) continue;
            letGo(leaf);
            leaves.delete(key);
        }
        infos.delete(svg);
        if (seenIdling.delete(svg)) o.see?.([[svg, null]]);
    };
    /** The parts of a drawing that its idle moves, outermost only. */
    const found = new WeakMap<SVGSVGElement, Element[]>();
    const movingParts = (svg: SVGSVGElement): Element[] => {
        if (svg.getAttribute("data-anim") !== "moves") return [];
        let parts = found.get(svg);
        if (!parts) {
            parts = Array.from(svg.querySelectorAll("[data-part]")).filter(
                (p) => !p.parentElement?.closest("[data-part]"),
            );
            found.set(svg, parts);
        }
        return parts;
    };
    const touched = (svg: SVGSVGElement, target: Node): void => {
        // the idle writes a moving part's transform and opacity itself, which moves its texture only
        const part = target instanceof Element ? target.closest("[data-part]") : null;
        const base = leaves.get(svg);
        if (part && base?.split && movingParts(svg).some((p) => p.contains(part))) return;
        found.delete(svg);
        sketches.delete(svg);
        for (const leaf of leaves.values()) if (leaf.svg === svg) leaf.version++;
    };
    // a drawing is read into its display list once, and again only when it changes
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
                    if (!(n instanceof Element) || o.hidden.contains(n)) continue;
                    if (n instanceof SVGSVGElement) drop(n);
                    for (const svg of n.querySelectorAll("svg")) drop(svg);
                    forgetInfo(n);
                }
                if (r.removedNodes.length)
                    for (const [el, twin] of twins)
                        if (!o.hidden.contains(el)) {
                            twin.remove();
                            twins.delete(el);
                        }
                const owner = r.target instanceof Element ? r.target.closest("svg") : null;
                if (owner) touched(owner, r.target);
            } else if (r.target instanceof Element) {
                const owner = r.target instanceof SVGSVGElement ? null : r.target.closest("svg");
                if (owner) touched(owner, r.target);
                else if (r.target === o.hidden && r.attributeName === "style") {
                    // the zoom's properties, which of what stays here only the guide grows by (overworld.css)
                    for (const layer of o.hidden.children)
                        if (layer.matches(".m-tokens")) forgetInfo(layer);
                } else {
                    forgetInfo(r.target);
                    const twin = twins.get(r.target);
                    if (twin) copy(r.target, twin);
                }
            }
        }
        wake();
    });
    watching.observe(o.hidden, { childList: true, subtree: true, attributes: true });
    lift(o.hidden);

    /** Rasterizes the next drawings the camera wants, two at a time, nearest the middle first. */
    const pump = (): void => {
        queue.sort((a, b) => a.near - b.near);
        while (decoding < DECODING && queue.length) {
            const job = queue.shift();
            if (!job) break;
            const leaf = leaves.get(job.key);
            if (!leaf) continue;
            // a drawing off the page has no computed colours, and would be drawn black
            if (!leaf.svg.isConnected) {
                leaf.pending = false;
                continue;
            }
            decoding++;
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
            const only = leaf.part ? movingPartsOf(svg).indexOf(leaf.part) : null;
            void rasterize({
                sketch: sketchFor(svg),
                box,
                w: w + 2 * pad,
                h: h + 2 * pad,
                only: only !== null && only >= 0 ? only : null,
                withoutParts: !leaf.part && split,
                glowScale: job.scale,
            })
                .then((drawn) => {
                    if (!drawn) throw new Error("The drawing could not be rasterised");
                    decoded.push({
                        leaf,
                        pixels: new ImageData(
                            new Uint8ClampedArray(drawn.pixels),
                            drawn.w,
                            drawn.h,
                        ),
                        w: w + 2 * pad,
                        h: h + 2 * pad,
                        padded: pad > 0,
                        ...job,
                        split,
                    });
                })
                .catch(() => {
                    leaf.pending = false;
                    leaf.failed = job.version;
                })
                .finally(() => {
                    decoding--;
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
            if (stopped || leaves.get(leaf.part ?? leaf.svg) !== leaf) continue;
            letGo(leaf);
            const slot = d.padded ? cell(d.w, d.h) : null;
            if (slot && pages.write(slot, d.pixels)) leaf.slot = slot;
            else {
                if (slot) pages.free(slot);
                const texture = gl.upload(d.pixels, d.w, d.h);
                if (!texture) continue;
                leaf.texture = texture;
                bytes += texture.bytes;
            }
            leaf.scale = d.scale;
            leaf.rect = d.rect;
            leaf.rastered = d.version;
            leaf.split = d.split;
        }
        pages.settle();
    };

    const trim = (to: number): void => {
        const idle = [...leaves.values()]
            .filter((l) => l.texture || l.slot)
            .sort((a, b) => a.drawn - b.drawn);
        for (const leaf of idle) {
            if (bytes + pages.bytes() <= to) break;
            letGo(leaf);
        }
    };
    const evict = (): void => {
        if (bytes <= BUDGET / 2) return;
        const idle = [...leaves.values()]
            .filter((l) => l.texture && l.drawn < frames)
            .sort((a, b) => a.drawn - b.drawn);
        for (const leaf of idle) {
            if (bytes <= BUDGET * 0.4) break;
            letGo(leaf);
        }
    };

    function draw(): void {
        const cam = camera;
        if (!cam || stopped) return;
        frames++;
        const now = performance.now();
        upload(now);
        // while the camera moves a drawing keeps the texture it has unless it would look four times as
        // soft, and one new to the camera is drawn at half the sharpness, since each is drawn on the main
        // thread; all of it is drawn sharp once the camera rests
        const still = now - moved > SETTLE;
        const seen = visibleRect(cam, size);
        const margin = {
            x: seen.x - seen.w * 0.25,
            y: seen.y - seen.h * 0.25,
            w: seen.w * 1.5,
            h: seen.h * 1.5,
        };
        const script = new Map<Element, Animation[]>();
        for (const a of document.getAnimations()) {
            const target = a.effect instanceof KeyframeEffect ? a.effect.target : null;
            if (!target || !o.hidden.contains(target)) continue;
            const list = script.get(target);
            if (list) list.push(a);
            else script.set(target, [a]);
        }
        const under = ground?.draws(cam, size, density);
        const draws: GlDraw[] = under ? [...under.draws] : [];
        // drawings in one page one after another are one instanced batch
        let batches = 0;
        const sprite = (slot: Slot, rect: Rect, at: Affine, alpha: number, tone: Tone): void => {
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
            batch.instances.set(
                [
                    at[0] * cx + at[2] * cy + at[4],
                    at[1] * cx + at[3] * cy + at[5],
                    at[0] * hw,
                    at[1] * hw,
                    at[2] * hh,
                    at[3] * hh,
                    ...slot.uv,
                    alpha,
                    alpha,
                    alpha,
                    alpha,
                    tone.gray,
                    tone.saturate,
                    tone.contrast,
                    tone.brightness,
                    0,
                ],
                batch.count * SPRITE,
            );
            batch.count++;
        };
        let moving = false;
        const toScreen = cam.z * density;
        const idling = new Map<SVGSVGElement, { share: number; w: number; h: number }>();
        let wanting = 0;
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
            }
            l.drawn = frames;
            return l;
        };
        /** Asks for the texture a leaf wants at this camera, and draws the one it has. */
        const want = (
            l: Leaf,
            key: Element,
            whole: Rect,
            at: Affine,
            alpha: number,
            tone: Tone,
            split: boolean,
        ): void => {
            const unit = Math.sqrt(Math.abs(at[0] * at[3] - at[1] * at[2])) || 1;
            let scale =
                2 ** Math.ceil(Math.log2(Math.max(unit * toScreen, 1 / 1024))) / (still ? 1 : 2);
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
                !(l.texture || (l.slot && pages.live(l.slot))) ||
                l.scale < scale / (still ? 1.05 : 2.1) ||
                (still && l.scale > scale * 4.1) ||
                !contains(l.rect, wanted) ||
                l.version !== l.rastered ||
                (!l.part && l.split !== split);
            if (stale && l.failed !== l.version) wanting++;
            if (stale && !l.pending && l.failed !== l.version) {
                l.pending = true;
                const c = bounds(at, rect);
                queue.push({
                    key,
                    scale,
                    rect,
                    version: l.version,
                    near: Math.hypot(c.x + c.w / 2 - cam.x, c.y + c.h / 2 - cam.y),
                });
            }
            if (l.slot && pages.live(l.slot)) sprite(l.slot, l.rect, at, alpha, tone);
            else if (l.texture)
                draws.push({ kind: "image", texture: l.texture, rect: l.rect, at, alpha, tone });
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
            if (!intersects(onWorld, margin)) return;
            const moves = movingParts(svg);
            want(leafOf(svg, svg, null, whole), svg, whole, at, alpha, tone, moves.length > 0);
            if (svg.hasAttribute("data-anim")) {
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
            for (const part of moves) {
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
                    leafOf(part, svg, part, whole),
                    part,
                    whole,
                    partAt,
                    alpha * (played?.opacity ?? own),
                    tone,
                    true,
                );
            }
        };
        for (const layer of o.hidden.children) visit(layer, IDENTITY, 1, PLAIN);
        gl.draw(cam, size, {
            grid: { colour: o.tokens.grid, layers: paperLayers(cam.z) },
            mask: under?.mask,
            draws,
        });
        // the idles are told what is on screen once the camera rests, since each telling plans them again
        if (o.see && still) {
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
            o.see(changes);
        }
        pump();
        evict();
        if (
            waiters.length &&
            still &&
            !wanting &&
            !queue.length &&
            !decoding &&
            !decoded.length &&
            ground?.complete()
        )
            for (const done of waiters.splice(0)) done();
        if (moving) wake();
        else if (under?.again != null && !drifting)
            drifting = setTimeout(() => {
                drifting = 0;
                wake();
            }, under.again);
    }

    return {
        frame(cam, vp) {
            camera = { ...cam };
            moved = performance.now();
            clearTimeout(settling);
            settling = setTimeout(wake, SETTLE + 20);
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
        park() {
            cancelAnimationFrame(scheduled);
            scheduled = 0;
            clearTimeout(settling);
            camera = null;
            canvas.remove();
            for (const job of queue) {
                const leaf = leaves.get(job.key);
                if (leaf) leaf.pending = false;
            }
            queue.length = 0;
            // what waits for a world to close keeps a third of its drawings, the most recently seen
            trim(BUDGET / 3);
            ground?.park();
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
            decoded.length = 0;
            watching.disconnect();
            for (const twin of twins.values()) twin.remove();
            twins.clear();
            ground?.stop();
            gl.stop();
            canvas.remove();
            leaves.clear();
            infos.clear();
            seenIdling.clear();
            queue.length = 0;
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
