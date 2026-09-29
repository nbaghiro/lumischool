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
    /** A radial gradient's radius, out from (x1, y1); none for a linear one. */
    r?: number;
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
          /**
           * What the group is seen through, as a `<mask>` of it: the group shows where the mask is
           * drawn, read by its alpha alone, since every mask the painters write is white.
           */
          mask?: SketchNode[];
          /** The shapes of the group's `<clipPath>`, drawn white and applied as a mask is. */
          clip?: SketchNode[];
      }
    | {
          kind: "path";
          d: string;
          /**
           * The path's box in its own units, for a worker drawing one tile of a large drawing to leave
           * out what the tile does not hold; none for a path written in relative steps.
           */
          box?: readonly [number, number, number, number];
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
    /**
     * Each moving part's box at rest in the sketch's units, strokes included, or null where it holds
     * lettering or a path whose box is not known, so a part is drawn over its own box and not the drawing's.
     */
    partBoxes: (Rect | null)[];
    glow: { colour: string; blur: number }[];
    /** The page's font files for the families it letters in, loaded in the worker before it draws. */
    fonts: { family: string; url: string; weight: string; style: string }[];
}

/**
 * What marks a part the idle moves: a drawing's own `data-part`, or the mark the idle gives the parts
 * it gathers or picks itself (animate.ts).
 */
export const PARTS = "[data-part], [data-anim-part]";

/** The parts of a drawing that its idle moves, outermost only, in the order `Sketch` numbers them. */
export const movingPartsOf = (svg: SVGSVGElement): Element[] =>
    Array.from(svg.querySelectorAll(PARTS)).filter((p) => !p.parentElement?.closest(PARTS));

const CAPS: readonly CanvasLineCap[] = ["butt", "round", "square"];
const JOINS: readonly CanvasLineJoin[] = ["miter", "round", "bevel"];

const number = (v: string | null, fallback: number): number => {
    const n = v === null ? NaN : parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
};

/**
 * The box of path data written in absolute commands, as the pen writes it, grown by half the stroke;
 * null for a path with relative steps or arcs, whose box the numbers alone do not give.
 */
function boxOfPath(d: string, stroke: number): readonly [number, number, number, number] | null {
    if (/[a-z]/.test(d.replace(/e[-+]?\d/gi, "")) || /[AHV]/.test(d)) return null;
    const n = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
    if (!n || n.length < 2) return null;
    let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
    for (let i = 0; i + 1 < n.length; i += 2) {
        const x = Number(n[i]),
            y = Number(n[i + 1]);
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
    }
    const pad = stroke / 2 + 1;
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

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

/** A length written as a number or a percentage, as a share when it is one. */
const share = (v: string | null, fallback: number): number =>
    v?.trim().endsWith("%") ? number(v, fallback * 100) / 100 : number(v, fallback);

/** A stop's colour with its opacity in it, from its computed style, which resolves the page's tokens. */
function stopColour(stop: Element): string {
    const cs = getComputedStyle(stop);
    const said = cs.getPropertyValue("stop-color") || stop.getAttribute("stop-color") || "#000";
    const opacity = number(
        cs.getPropertyValue("stop-opacity") || stop.getAttribute("stop-opacity"),
        1,
    );
    const rgb = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?/.exec(said);
    if (!rgb)
        return opacity < 1 ? `color-mix(in srgb, ${said} ${opacity * 100}%, transparent)` : said;
    const a = number(rgb[4] ?? null, 1) * opacity;
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${a})`;
}

/** A shape's box from its own attributes, since a drawing that is never laid out has none measured. */
function boxOf(el: Element): Rect | null {
    const a = (name: string) => number(el.getAttribute(name), 0);
    if (el.tagName === "rect") return { x: a("x"), y: a("y"), w: a("width"), h: a("height") };
    if (el.tagName === "circle")
        return { x: a("cx") - a("r"), y: a("cy") - a("r"), w: 2 * a("r"), h: 2 * a("r") };
    if (el.tagName === "ellipse")
        return { x: a("cx") - a("rx"), y: a("cy") - a("ry"), w: 2 * a("rx"), h: 2 * a("ry") };
    if (!(el instanceof SVGGraphicsElement)) return null;
    try {
        const b = el.getBBox();
        return b.width || b.height ? { x: b.x, y: b.y, w: b.width, h: b.height } : null;
    } catch {
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
        const radial = g instanceof SVGRadialGradientElement;
        // a paint server the workers cannot draw, such as a pattern, is left out rather than drawn black
        if (!radial && !(g instanceof SVGLinearGradientElement)) return null;
        const stops = Array.from(g.querySelectorAll("stop")).map((s) => ({
            offset: share(s.getAttribute("offset"), 0),
            colour: stopColour(s),
        }));
        const at = (name: string, fallback: number) => share(g.getAttribute(name), fallback);
        // a radial gradient runs from its centre (x1, y1) out to r, and ignores x2 and y2
        const x1 = radial ? at("cx", 0.5) : at("x1", 0),
            y1 = radial ? at("cy", 0.5) : at("y1", 0),
            x2 = radial ? x1 : at("x2", 1),
            y2 = radial ? y1 : at("y2", 0),
            r = radial ? at("r", 0.5) : undefined;
        // a gradient's default units are the shape's own box, from 0 to 1 across it
        const box = g.getAttribute("gradientUnits") === "userSpaceOnUse" ? null : boxOf(el);
        return box
            ? {
                  x1: box.x + x1 * box.w,
                  y1: box.y + y1 * box.h,
                  x2: box.x + x2 * box.w,
                  y2: box.y + y2 * box.h,
                  // a box that is not square stretches the circle into an ellipse, drawn here as its mean
                  ...(r === undefined ? {} : { r: (r * (box.w + box.h)) / 2 }),
                  stops,
              }
            : { x1, y1, x2, y2, ...(r === undefined ? {} : { r }), stops };
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
            const shapesOf = (property: string, tag: string): SketchNode[] | undefined => {
                const id = /url\(\s*["']?#([^"')]+)["']?\s*\)/.exec(own(property) ?? "")?.[1];
                const through = id ? svg.querySelector(`[id="${id}"]`) : null;
                return through?.tagName === tag
                    ? Array.from(through.children).flatMap((c) => {
                          const n = read(c, WHITE);
                          return n ? [n] : [];
                      })
                    : undefined;
            };
            const mask = shapesOf("mask", "mask");
            const clip = shapesOf("clip-path", "clipPath");
            // a moving part is drawn at rest: its written transform is where the idle has moved it
            return {
                kind: "group",
                children,
                alpha,
                m: part >= 0 ? null : m,
                part,
                ...(mask ? { mask } : {}),
                ...(clip ? { clip } : {}),
            };
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
        const box = boxOfPath(d, state.width);
        return { kind: "path", d, ...(box ? { box } : {}), ...state, alpha, m };
    };
    const PLAIN: Inherited = {
        fill: "#000",
        stroke: null,
        width: 1,
        cap: "butt",
        join: "miter",
        dash: [],
        evenOdd: false,
    };
    const WHITE: Inherited = { ...PLAIN, fill: "#fff" };
    const root = Array.from(svg.children).flatMap((c) => {
        const n = read(c, PLAIN);
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
        partBoxes: partBoxesOf(root, moving.length),
        glow,
        fonts: [...families].flatMap(fontsFor),
    };
}

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const times = (a: Matrix, b: Matrix): Matrix => [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
];

function partBoxesOf(root: SketchNode[], parts: number): (Rect | null)[] {
    const boxes: ({ x0: number; y0: number; x1: number; y1: number } | null)[] = Array.from(
        { length: parts },
        () => ({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }),
    );
    const walk = (node: SketchNode, m: Matrix, part: number): void => {
        const at = node.m ? times(m, node.m) : m;
        if (node.kind === "group") {
            const within = node.part >= 0 ? node.part : part;
            for (const child of node.children) walk(child, at, within);
            return;
        }
        if (part < 0) return;
        const b = boxes[part];
        if (!b) return;
        if (node.kind === "text" || !node.box) {
            boxes[part] = null;
            return;
        }
        const [x0, y0, x1, y1] = node.box;
        for (const [x, y] of [
            [x0, y0],
            [x1, y0],
            [x0, y1],
            [x1, y1],
        ] as const) {
            const px = at[0] * x + at[2] * y + at[4],
                py = at[1] * x + at[3] * y + at[5];
            b.x0 = Math.min(b.x0, px);
            b.y0 = Math.min(b.y0, py);
            b.x1 = Math.max(b.x1, px);
            b.y1 = Math.max(b.y1, py);
        }
    };
    for (const node of root) walk(node, IDENTITY, -1);
    return boxes.map((b) =>
        b && b.x1 >= b.x0 ? { x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 } : null,
    );
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
    /**
     * Where the pixels are kept on the device across visits (sprites.worker.ts): the store for the
     * renderer's version and the key within it. The worker looks there first and keeps what it draws.
     */
    keep?: { store: string; key: string };
}

/**
 * What the page posts a worker: the job without its sketch, which is posted once and kept by number,
 * since copying a large drawing's display list for each of its tiles cost more than drawing them.
 */
export interface RasterMessage {
    id: number;
    job: Omit<RasterJob, "sketch">;
    sketchId: number;
    /** The sketch itself, the first time this worker is given it. */
    sketch?: Sketch;
    /** Sketches the worker lets go of, as the page's record of what it keeps says. */
    forget: number[];
}

/** How many sketches a worker keeps; the page keeps the same list for each worker, in the same order. */
const KEPT = 64;

/** The pixels a worker drew: its canvas's bitmap, or where a browser cannot send one, straight alpha row by row from the top. */
export interface Rastered {
    w: number;
    h: number;
    /** Null when nothing of the drawing fell in the box, which a tile of a large drawing often is. */
    pixels: ImageBitmap | ImageData | null;
    /** Whether they came from the pixels kept on the device rather than being drawn. */
    cached?: boolean;
}

interface Pending {
    job: RasterJob;
    urgent: boolean;
    done: (r: Rastered | null) => void;
}

const WORKERS = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
interface Slot {
    worker: Worker;
    busy: Pending | null;
    /** The sketches this worker keeps, least recently used first. */
    keeps: Map<number, true>;
}
let pool: Slot[] | null = null;
const sketchIds = new WeakMap<Sketch, number>();
let lastSketch = 0;
const waiting: Pending[] = [];
let serial = 0;
const inFlight = new Map<number, { pending: Pending; slot: Slot }>();

const next = (): void => {
    if (!pool) return;
    for (const slot of pool) {
        if (slot.busy) continue;
        // urgent jobs, such as a game's live sprite, go before the queue, and then one whose sketch this
        // worker already holds, so a large drawing's display list is not sent to every worker
        let at = waiting.findIndex((p) => p.urgent);
        if (at < 0) {
            const held = (p: Pending): boolean => {
                const k = sketchIds.get(p.job.sketch);
                return k !== undefined && slot.keeps.has(k);
            };
            at = waiting.slice(0, WORKERS).findIndex(held);
        }
        const pending = at >= 0 ? waiting.splice(at, 1)[0] : waiting.shift();
        if (!pending) return;
        slot.busy = pending;
        const id = ++serial;
        inFlight.set(id, { pending, slot });
        const { sketch, ...job } = pending.job;
        let sketchId = sketchIds.get(sketch);
        if (sketchId === undefined) sketchIds.set(sketch, (sketchId = ++lastSketch));
        const known = slot.keeps.delete(sketchId);
        slot.keeps.set(sketchId, true);
        const forget: number[] = [];
        for (const kept of slot.keeps.keys()) {
            if (slot.keeps.size - forget.length <= KEPT) break;
            forget.push(kept);
        }
        for (const gone of forget) slot.keeps.delete(gone);
        const message: RasterMessage = { id, job, sketchId, forget, ...(known ? {} : { sketch }) };
        slot.worker.postMessage(message);
    }
};

const start = (): NonNullable<typeof pool> => {
    if (pool) return pool;
    const made = Array.from({ length: WORKERS }, () => {
        const worker = new Worker(new URL("./sprites.worker.ts", import.meta.url), {
            type: "module",
        });
        const slot: Slot = { worker, busy: null, keeps: new Map() };
        worker.onmessage = (e: MessageEvent<unknown>) => {
            const data = e.data;
            if (typeof data !== "object" || data === null || !("id" in data)) return;
            const id = typeof data.id === "number" ? data.id : -1;
            const flight = inFlight.get(id);
            if (!flight) return;
            inFlight.delete(id);
            flight.slot.busy = null;
            const pixels = "pixels" in data ? data.pixels : null,
                bitmap = "bitmap" in data ? data.bitmap : null,
                w = "w" in data ? data.w : null,
                h = "h" in data ? data.h : null;
            const empty = "empty" in data && data.empty === true;
            const cached = "cached" in data && data.cached === true;
            flight.pending.done(
                typeof w === "number" && typeof h === "number"
                    ? bitmap instanceof ImageBitmap
                        ? { w, h, pixels: bitmap, cached }
                        : pixels instanceof ArrayBuffer
                          ? {
                                w,
                                h,
                                pixels: new ImageData(new Uint8ClampedArray(pixels), w, h),
                                cached,
                            }
                          : empty
                            ? { w, h, pixels: null, cached }
                            : null
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

/** Starts the workers, so a scene made now has them ready by the time its first drawings are asked for. */
export function warmRasterizers(): void {
    start();
}

/** Draws a sketch off the page's thread; null when the worker could not. `urgent` jobs go first. */
export function rasterize(job: RasterJob, urgent = false): Promise<Rastered | null> {
    start();
    return new Promise((done) => {
        waiting.push({ job, urgent, done });
        next();
    });
}
