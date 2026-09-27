// Drawings rasterised off the main thread (.docs/overworld-gpu.md): a drawing's SVG, as the shelf's
// painters make it, is read once into a display list of plain paths, text and groups, and workers
// draw that list with a canvas of their own at whatever size a texture needs. Nothing is serialised,
// parsed as SVG or drawn on the page's thread, which is what made the map stall as it zoomed.
import type { Rect } from "../space";

type Matrix = readonly [number, number, number, number, number, number];

/** A linear gradient, in the drawing's own units, as a canvas draws one. */
export interface Gradient {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stops: readonly { offset: number; colour: string }[];
}
export type Paint = string | Gradient | null;

export type SketchNode =
    | {
          kind: "group";
          children: SketchNode[];
          /** A group's opacity, which the worker composites the group at as SVG does. */
          alpha: number;
          m: Matrix | null;
          /** Which of the drawing's moving parts this is, or -1. */
          part: number;
      }
    | {
          kind: "path";
          d: string;
          fill: Paint;
          evenOdd: boolean;
          stroke: Paint;
          width: number;
          cap: CanvasLineCap;
          join: CanvasLineJoin;
          dash: number[];
          alpha: number;
          m: Matrix | null;
      }
    | {
          kind: "text";
          text: string;
          x: number;
          y: number;
          anchor: CanvasTextAlign;
          font: string;
          spacing: string;
          fill: Paint;
          alpha: number;
          m: Matrix | null;
      };

/** A drawing as the workers draw it: its viewBox, what is in it, and a glow round it, if any. */
export interface Sketch {
    box: Rect;
    root: SketchNode[];
    /** How many moving parts it has, each drawn on its own by `only`. */
    parts: number;
    glow: { colour: string; blur: number }[];
    /** The page's font files for the families it letters in, loaded in the worker before it draws. */
    fonts: { family: string; url: string; weight: string; style: string }[];
}

/** The parts of a drawing that its idle moves, outermost only, in the order `Sketch` numbers them. */
export const movingPartsOf = (svg: SVGSVGElement): Element[] =>
    Array.from(svg.querySelectorAll("[data-part]")).filter(
        (p) => !p.parentElement?.closest("[data-part]"),
    );

const CAPS: readonly CanvasLineCap[] = ["butt", "round", "square"];
const JOINS: readonly CanvasLineJoin[] = ["miter", "round", "bevel"];

const number = (v: string | null, fallback: number): number => {
    const n = v === null ? NaN : parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
};

/** An SVG shape's outline as path data, so the worker draws every shape as a path. */
function outline(el: Element): string | null {
    const a = (name: string) => number(el.getAttribute(name), 0);
    switch (el.tagName) {
        case "path":
            return el.getAttribute("d");
        case "circle":
        case "ellipse": {
            const cx = a("cx"),
                cy = a("cy"),
                rx = el.tagName === "circle" ? a("r") : a("rx"),
                ry = el.tagName === "circle" ? a("r") : a("ry");
            if (rx <= 0 || ry <= 0) return null;
            return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
        }
        case "rect": {
            const x = a("x"),
                y = a("y"),
                w = a("width"),
                h = a("height");
            if (w <= 0 || h <= 0) return null;
            const rx = Math.min(
                    w / 2,
                    number(el.getAttribute("rx"), number(el.getAttribute("ry"), 0)),
                ),
                ry = Math.min(h / 2, number(el.getAttribute("ry"), rx));
            if (!rx && !ry) return `M${x} ${y}h${w}v${h}h${-w}Z`;
            return (
                `M${x + rx} ${y}h${w - 2 * rx}a${rx} ${ry} 0 0 1 ${rx} ${ry}v${h - 2 * ry}` +
                `a${rx} ${ry} 0 0 1 ${-rx} ${ry}h${-(w - 2 * rx)}a${rx} ${ry} 0 0 1 ${-rx} ${-ry}` +
                `v${-(h - 2 * ry)}a${rx} ${ry} 0 0 1 ${rx} ${-ry}Z`
            );
        }
        case "line":
            return `M${a("x1")} ${a("y1")}L${a("x2")} ${a("y2")}`;
        case "polyline":
        case "polygon": {
            const points = (el.getAttribute("points") ?? "").trim();
            if (!points) return null;
            return `M${points}${el.tagName === "polygon" ? "Z" : ""}`;
        }
        default:
            return null;
    }
}

/** What an element's paint says, resolved where the page's styles are needed to say it. */
function paintOf(
    el: Element,
    name: "fill" | "stroke",
    inherited: Paint,
    svg: SVGSVGElement,
): Paint {
    const said =
        el.getAttribute(name) ?? (el instanceof SVGElement ? el.style.getPropertyValue(name) : "");
    if (!said) return inherited;
    if (said === "none" || said === "transparent") return null;
    const url = /url\(\s*["']?#([^"')]+)["']?\s*\)/.exec(said)?.[1];
    if (url) {
        const g = svg.querySelector(`[id="${url}"]`);
        if (!(g instanceof SVGLinearGradientElement)) return inherited;
        const stops = Array.from(g.querySelectorAll("stop")).map((s) => ({
            offset: number(s.getAttribute("offset"), 0),
            colour: s.getAttribute("stop-color") ?? "#000",
        }));
        return {
            x1: number(g.getAttribute("x1"), 0),
            y1: number(g.getAttribute("y1"), 0),
            x2: number(g.getAttribute("x2"), 1),
            y2: number(g.getAttribute("y2"), 0),
            stops,
        };
    }
    if (said.includes("var(") || said === "currentColor") {
        const computed = getComputedStyle(el).getPropertyValue(name);
        return computed && computed !== "none" ? computed : null;
    }
    return said;
}

const transformOf = (el: Element): Matrix | null => {
    if (!(el instanceof SVGGraphicsElement) || !el.transform.baseVal.numberOfItems) return null;
    const m = el.transform.baseVal.consolidate()?.matrix;
    return m ? [m.a, m.b, m.c, m.d, m.e, m.f] : null;
};

const fontCache = new Map<string, Sketch["fonts"]>();
/** The page's @font-face files for a family, which the worker loads itself. */
function fontsFor(family: string): Sketch["fonts"] {
    const had = fontCache.get(family);
    if (had) return had;
    const out: Sketch["fonts"] = [];
    for (const sheet of document.styleSheets) {
        let rules: CSSRuleList;
        try {
            rules = sheet.cssRules;
        } catch {
            continue;
        }
        for (const rule of rules) {
            if (!(rule instanceof CSSFontFaceRule)) continue;
            const named = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
            if (named !== family) continue;
            const src = /url\(["']?([^"')]+)["']?\)/.exec(rule.style.getPropertyValue("src"))?.[1];
            if (!src) continue;
            out.push({
                family,
                url: new URL(src, sheet.href ?? location.href).href,
                weight: rule.style.getPropertyValue("font-weight") || "normal",
                style: rule.style.getPropertyValue("font-style") || "normal",
            });
        }
    }
    fontCache.set(family, out);
    return out;
}

/**
 * A drawing's display list, read from its SVG on the page: the attributes the painters write, the
 * page's computed style only for lettering and for a paint given as a custom property, and each
 * moving part as a numbered group the worker can draw alone or leave out.
 */
export function sketchOf(svg: SVGSVGElement): Sketch {
    const vb = svg.viewBox.baseVal;
    const moving = movingPartsOf(svg);
    const families = new Set<string>();
    interface Inherited {
        fill: Paint;
        stroke: Paint;
        width: number;
        cap: CanvasLineCap;
        join: CanvasLineJoin;
        dash: number[];
        evenOdd: boolean;
    }
    const read = (el: Element, from: Inherited): SketchNode | null => {
        const tag = el.tagName;
        if (tag === "defs" || tag === "style" || tag === "title" || tag === "desc") return null;
        const own = (name: string) => el.getAttribute(name);
        const dash = own("stroke-dasharray");
        const state: Inherited = {
            fill: paintOf(el, "fill", from.fill, svg),
            stroke: paintOf(el, "stroke", from.stroke, svg),
            width: number(own("stroke-width"), from.width),
            cap: CAPS.find((c) => c === own("stroke-linecap")) ?? from.cap,
            join: JOINS.find((j) => j === own("stroke-linejoin")) ?? from.join,
            dash:
                dash === null
                    ? from.dash
                    : dash === "none"
                      ? []
                      : dash
                            .split(/[\s,]+/)
                            .filter(Boolean)
                            .map(Number),
            evenOdd: own("fill-rule") ? own("fill-rule") === "evenodd" : from.evenOdd,
        };
        const alpha = number(own("opacity"), 1);
        const m = transformOf(el);
        if (tag === "g" || tag === "svg" || tag === "a") {
            const part = moving.indexOf(el);
            const children = Array.from(el.children).flatMap((c) => {
                const n = read(c, state);
                return n ? [n] : [];
            });
            // a moving part is drawn at rest: its written transform is where the idle has moved it
            return { kind: "group", children, alpha, m: part >= 0 ? null : m, part };
        }
        if (tag === "text") {
            const cs = getComputedStyle(el);
            for (const f of cs.fontFamily.split(",")) families.add(f.replace(/["']/g, "").trim());
            return {
                kind: "text",
                text: el.textContent ?? "",
                x: number(own("x"), 0),
                y: number(own("y"), 0),
                anchor:
                    own("text-anchor") === "middle"
                        ? "center"
                        : own("text-anchor") === "end"
                          ? "end"
                          : "start",
                font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
                spacing: cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing,
                fill: paintOf(el, "fill", from.fill, svg),
                alpha,
                m,
            };
        }
        const d = outline(el);
        if (!d) return null;
        return { kind: "path", d, ...state, alpha, m };
    };
    const root = Array.from(svg.children).flatMap((c) => {
        const n = read(c, {
            fill: "#000",
            stroke: null,
            width: 1,
            cap: "butt",
            join: "miter",
            dash: [],
            evenOdd: false,
        });
        return n ? [n] : [];
    });
    const glow: Sketch["glow"] = [];
    for (const [, colour = "", blur = "0"] of getComputedStyle(svg).filter.matchAll(
        /drop-shadow\((rgba?\([^)]*\)|#\w+|[a-z]+)?\s*[-\d.]+px\s+[-\d.]+px\s+([\d.]+)px[^)]*\)/g,
    ))
        glow.push({ colour, blur: parseFloat(blur) });
    return {
        box: { x: vb.x, y: vb.y, w: vb.width, h: vb.height },
        root,
        parts: moving.length,
        glow,
        fonts: [...families].flatMap(fontsFor),
    };
}

/** What a worker draws: `box` of the sketch's own units into `w` by `h` pixels. */
export interface RasterJob {
    sketch: Sketch;
    box: Rect;
    w: number;
    h: number;
    /** Only this moving part, at rest; or, with `withoutParts`, everything but the moving parts. */
    only: number | null;
    withoutParts: boolean;
    /** How much a glow's blur is in pixels per CSS pixel of the drawing's box. */
    glowScale: number;
}

/** The pixels a worker drew, straight alpha, row by row from the top. */
export interface Rastered {
    w: number;
    h: number;
    pixels: Uint8ClampedArray;
}

interface Pending {
    job: RasterJob;
    urgent: boolean;
    done: (r: Rastered | null) => void;
}

const WORKERS = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
let pool: { worker: Worker; busy: Pending | null }[] | null = null;
const waiting: Pending[] = [];
let serial = 0;
const inFlight = new Map<number, { pending: Pending; slot: { busy: Pending | null } }>();

const next = (): void => {
    if (!pool) return;
    for (const slot of pool) {
        if (slot.busy) continue;
        // urgent jobs, such as a game's live sprite, go before the queue
        const at = waiting.findIndex((p) => p.urgent);
        const pending = at >= 0 ? waiting.splice(at, 1)[0] : waiting.shift();
        if (!pending) return;
        slot.busy = pending;
        const id = ++serial;
        inFlight.set(id, { pending, slot });
        slot.worker.postMessage({ id, job: pending.job });
    }
};

const start = (): NonNullable<typeof pool> => {
    if (pool) return pool;
    const made = Array.from({ length: WORKERS }, () => {
        const worker = new Worker(new URL("./sprites.worker.ts", import.meta.url), {
            type: "module",
        });
        const slot: { worker: Worker; busy: Pending | null } = { worker, busy: null };
        worker.onmessage = (e: MessageEvent<unknown>) => {
            const data = e.data;
            if (typeof data !== "object" || data === null || !("id" in data)) return;
            const id = typeof data.id === "number" ? data.id : -1;
            const flight = inFlight.get(id);
            if (!flight) return;
            inFlight.delete(id);
            flight.slot.busy = null;
            const pixels = "pixels" in data ? data.pixels : null,
                w = "w" in data ? data.w : null,
                h = "h" in data ? data.h : null;
            flight.pending.done(
                pixels instanceof ArrayBuffer && typeof w === "number" && typeof h === "number"
                    ? { w, h, pixels: new Uint8ClampedArray(pixels) }
                    : null,
            );
            next();
        };
        worker.onerror = () => {
            for (const [id, flight] of inFlight)
                if (flight.slot === slot) {
                    inFlight.delete(id);
                    flight.slot.busy = null;
                    flight.pending.done(null);
                }
            next();
        };
        return slot;
    });
    pool = made;
    return made;
};

/** Draws a sketch off the page's thread; null when the worker could not. `urgent` jobs go first. */
export function rasterize(job: RasterJob, urgent = false): Promise<Rastered | null> {
    start();
    return new Promise((done) => {
        waiting.push({ job, urgent, done });
        next();
    });
}
