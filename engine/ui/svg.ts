import rough from "roughjs";
import type { RoughSVG } from "roughjs/bin/svg";
import { Pen, strokeOutline, withSeededRandom, type PenOptions, type Stroke } from "../ink/pen";
import type {
    Anchors,
    GroupOf,
    Ctx as InkCtx,
    Lettering,
    Plain,
    RawAnchors,
    Side,
    Surface,
    Turn,
    Visual as InkVisual,
} from "../ink/surface";
import { HATCH, PRINT, U, type TokenName } from "../paper";
import type { Drawing } from "../parts/drawing";
import { readTokens } from "./read-tokens";

const NS = "http://www.w3.org/2000/svg";

export function el<K extends keyof SVGElementTagNameMap>(
    tag: K,
    attrs: Record<string, string | number> = {},
    parent?: Element,
): SVGElementTagNameMap[K] {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    if (parent) parent.appendChild(e);
    return e;
}

export function text(
    parent: Element,
    x: number,
    y: number,
    s: string,
    style: string,
    anchor: "start" | "middle" | "end" = "middle",
): SVGTextElement {
    const t = el("text", { x, y, "text-anchor": anchor, style }, parent);
    t.textContent = s;
    return t;
}

const turned = (turn: readonly Turn[]): string =>
    turn.map(([name, ...args]) => `${name}(${args.join(" ")})`).join(" ");

// `.08em`, as the shelf's lettering was written, so a moved drawing compares byte for byte
const ems = (n: number): string => `${String(n).replace(/^0(?=\.)/, "")}em`;

function styleOf(l: Lettering): string {
    const font = `font:${l.italic ? "italic " : ""}${l.weight} ${l.size}px var(--f-${l.face})`;
    const spacing = l.spacing === undefined ? "" : `;letter-spacing:${ems(l.spacing)}`;
    const axes = [
        ...(l.informal === undefined ? [] : [`'INFM' ${l.informal}`]),
        ...(l.bounce === undefined ? [] : [`'BNCE' ${l.bounce}`]),
    ];
    const variation = axes.length === 0 ? "" : `;font-variation-settings:${axes.join(",")}`;
    const o = l.outline;
    const dash = o?.dash === undefined ? "" : `;stroke-dasharray:${o.dash}`;
    const outline = o === undefined ? "" : `;stroke:${o.stroke};stroke-width:${o.width}${dash}`;
    return `${font}${spacing}${variation};fill:${l.fill}${outline}`;
}

/** A plain shape's paint, in the order the shelf's drawings wrote it. */
function painted(p: Plain): Record<string, string | number> {
    const a: Record<string, string | number> = {};
    if (p.fill !== undefined) a.fill = p.fill;
    if (p.stroke !== undefined) a.stroke = p.stroke;
    if (p.width !== undefined) a["stroke-width"] = p.width;
    if (p.dash !== undefined) a["stroke-dasharray"] = p.dash;
    if (p.cap !== undefined) a["stroke-linecap"] = p.cap;
    if (p.join !== undefined) a["stroke-linejoin"] = p.join;
    if (p.opacity !== undefined) a.opacity = p.opacity;
    return a;
}

function drawPlain(parent: Element, p: Plain): void {
    switch (p.kind) {
        case "rect": {
            const { x, y, w, h, r } = p;
            el(
                "rect",
                { x, y, width: w, height: h, ...(r === undefined ? {} : { rx: r }), ...painted(p) },
                parent,
            );
            return;
        }
        case "circle":
            el("circle", { cx: p.cx, cy: p.cy, r: p.r, ...painted(p) }, parent);
            return;
        case "ellipse":
            el("ellipse", { cx: p.cx, cy: p.cy, rx: p.rx, ry: p.ry, ...painted(p) }, parent);
            return;
        case "path": {
            const at: Record<string, string | number> = { d: p.d };
            if (p.turn) at.transform = turned(p.turn);
            else if (p.shift) at.transform = turned([["translate", ...p.shift]]);
            el("path", { ...at, ...painted(p) }, parent);
        }
    }
}

function groupAttrs(o: GroupOf): Record<string, string | number> {
    const a: Record<string, string | number> = {};
    if (o.turn) a.transform = turned(o.turn);
    if (o.layer !== undefined) a.class = o.layer;
    const style = [
        ...(o.origin === undefined ? [] : [`transform-origin:${o.origin[0]}px ${o.origin[1]}px`]),
        ...(o.flap === undefined ? [] : [`--flap:${o.flap}deg`]),
    ];
    if (style.length > 0) a.style = style.join(";");
    for (const [k, v] of Object.entries(o.data ?? {})) a[`data-${k}`] = v;
    if (o.hidden) a.visibility = "hidden";
    if (o.round) {
        a["stroke-linecap"] = "round";
        a["stroke-linejoin"] = "round";
    }
    if (o.opacity !== undefined) a.opacity = o.opacity;
    if (o.part) {
        const { name, pivot, dir, symmetry } = o.part;
        a["data-part"] = name;
        a["data-pivot"] = `${pivot[0].toFixed(1)} ${pivot[1].toFixed(1)}`;
        if (dir !== undefined && dir < 0) a["data-dir"] = -1;
        if (symmetry) a["data-symmetry"] = symmetry;
    }
    return a;
}

const renders = new Map<string, number>();

/**
 * The surface as SVG, for one render of the drawing `key`, element for element what the shelf's
 * drawings built for themselves. The ids it mints (for a clip, a pattern, a curve lettering runs
 * along) start from the key and from how many renders of that drawing on the page have minted one,
 * so no two renders share an id, and a drawing's ids never depend on the other drawings rendered
 * before it.
 */
export function svgSurface(key: string): Surface<Element> {
    let base: string | undefined;
    let minted = 0;
    const mint = (): string => {
        if (base === undefined) {
            const safe = key.replace(/[^\w-]/g, "-");
            const n = (renders.get(safe) ?? 0) + 1;
            renders.set(safe, n);
            base = `${safe}-${n}`;
        }
        minted += 1;
        return `${base}-${minted}`;
    };
    return {
        shape(parent, traces, opacity) {
            const g = el("g", opacity === undefined ? {} : { opacity }, parent);
            for (const t of traces) {
                el(
                    "path",
                    {
                        d: t.d,
                        stroke: t.stroke,
                        "stroke-width": t.strokeWidth,
                        fill: t.fill,
                        ...(t.fillRule === undefined ? {} : { "fill-rule": t.fillRule }),
                        ...(t.dash === undefined ? {} : { "stroke-dasharray": t.dash }),
                        ...(t.dashOffset === undefined
                            ? {}
                            : { "stroke-dashoffset": t.dashOffset }),
                    },
                    g,
                );
            }
        },
        outline(parent, d, fill, opacity) {
            el("path", { d, fill, opacity }, parent);
        },
        letter(parent, l) {
            if (l.along) {
                const id = mint();
                el("path", { id, d: l.along.d, fill: "none" }, parent);
                const words = el("text", { style: styleOf(l), "text-anchor": l.anchor }, parent);
                const on = { href: `#${id}`, startOffset: `${l.along.offset}%` };
                el("textPath", on, words).textContent = l.s;
                return;
            }
            const at: Record<string, string | number> = {
                x: l.x,
                y: l.y,
                "text-anchor": l.anchor,
                style: styleOf(l),
            };
            if (l.turn) at.transform = turned(l.turn);
            el("text", at, parent).textContent = l.s;
        },
        plain: drawPlain,
        group: (parent, o) => el("g", groupAttrs(o), parent),
        clip(parent, region) {
            const id = mint();
            const kept = el("clipPath", { id }, parent);
            if (region.kind === "rect") {
                const { x, y, w, h } = region;
                el("rect", { x, y, width: w, height: h }, kept);
            } else if (region.kind === "polygon") {
                el("polygon", { points: region.points.map((q) => q.join(",")).join(" ") }, kept);
            } else el("path", { d: region.d }, kept);
            return el("g", { "clip-path": `url(#${id})` }, parent);
        },
        pattern(parent, p) {
            const id = mint();
            const defs = el("defs", {}, parent);
            if (p.kind === "radial") {
                const glow = el("radialGradient", { id }, defs);
                for (const s of p.stops) {
                    const stop = {
                        offset: `${s.at}%`,
                        "stop-color": s.color,
                        "stop-opacity": s.opacity,
                    };
                    el("stop", stop, glow);
                }
            } else {
                const at: Record<string, string | number> = {
                    id,
                    width: p.w,
                    height: p.h,
                    patternUnits: "userSpaceOnUse",
                };
                if (p.turn) at.patternTransform = turned(p.turn);
                const tile = el("pattern", at, defs);
                for (const m of p.marks) drawPlain(tile, m);
            }
            return `url(#${id})`;
        },
        imported(parent, f) {
            const g = el("g", { transform: `translate(${-f.from[0]} ${-f.from[1]})` }, parent);
            // the hatches go in the drawing's own defs, as they did when the file was drawn in place
            const svg = (parent as SVGElement).ownerSVGElement ?? parent;
            for (const s of f.shapes) {
                const shape = g.appendChild(document.createElementNS(NS, s.tag));
                for (const [k, v] of s.attrs) {
                    shape.setAttribute(
                        k,
                        typeof v === "string" ? v : hatchPattern(svg, v.hatch, v.ink),
                    );
                }
            }
        },
    };
}

/** The pen's shapes as SVG, element for element and attribute for attribute what rough.js builds. */
const surface = svgSurface("svg");

const DRAWS = new Set([
    "line",
    "rectangle",
    "ellipse",
    "circle",
    "linearPath",
    "polygon",
    "arc",
    "curve",
    "path",
]);

/** Every drawing call on the canvas runs seeded from its own options, as the pen's shapes do. */
function seededCalls(rc: RoughSVG): RoughSVG {
    return new Proxy(rc, {
        get(target, key, receiver) {
            const value: unknown = Reflect.get(target, key, receiver);
            if (typeof value !== "function" || typeof key !== "string" || !DRAWS.has(key)) {
                return value;
            }
            return (...args: unknown[]): unknown => {
                const last = args.at(-1);
                const seed =
                    typeof last === "object" &&
                    last !== null &&
                    "seed" in last &&
                    typeof last.seed === "number"
                        ? last.seed
                        : 1;
                return withSeededRandom(seed, (): unknown => Reflect.apply(value, target, args));
            };
        },
    });
}

/**
 * The pen on an SVG. `rc` is rough.js's own SVG renderer beside it, seeded the same way, for the
 * drawings that take a shape's group from rough.js and place it themselves (.docs/structure.md,
 * "How we get there", says which).
 */
export class SvgPen extends Pen<Element> {
    readonly rc: RoughSVG;

    constructor(svg: SVGSVGElement, o: PenOptions) {
        super(surface, o);
        this.rc = seededCalls(rough.svg(svg));
    }
}

/** What a drawing on the shelf draws with: the SVG pen, and the SVG group it draws into. */
export type Ctx = Omit<InkCtx<SVGGElement, SvgPen>, "ink">;
export type Visual<P> = InkVisual<P, Ctx>;

export const defineVisual = <P>(v: Visual<P>): Visual<P> => v;

export interface RenderOptions {
    seed?: number;
    output?: "screen" | "paper";
    roughness?: number;
    /** Element whose CSS custom properties supply the colours (screen output only). */
    host?: Element;
    /** Draw three frames from consecutive seeds and cycle them (hand-drawn "boil"). */
    boil?: boolean;
}

interface Rendered {
    svg: SVGSVGElement;
    anchors: Anchors;
    box: { w: number; h: number };
}

/**
 * A drawing as an SVG: one of the shelf's, or one on the contract in engine/parts, which is also
 * handed the surface. It is named for a screen reader by its own description, or hidden from one
 * when it sits beside the word that names it.
 */
export function render<P>(
    v: Visual<P> | Drawing<P>,
    p: P = v.params,
    o: RenderOptions = {},
): Rendered {
    const box = v.box(p);
    const svg = el("svg", {
        viewBox: `0 0 ${box.w * U} ${box.h * U}`,
        class: "visual",
        "data-visual": v.id,
    });
    svg.style.setProperty("--w", String(box.w));
    svg.style.setProperty("--h", String(box.h));
    const paper = o.output === "paper";
    // what kind of drawing it is, for the page's animation to pick a default by; paper never moves
    if (!paper) svg.setAttribute("data-group", v.group);
    const t = paper ? PRINT : readTokens(o.host);
    const frames = o.boil && !paper ? 3 : 1;
    const wrap = frames > 1 ? el("g", { class: "boil boiling" }, svg) : svg;
    let raw: RawAnchors = {};
    const ink = svgSurface(v.id);
    for (let f = 0; f < frames; f++) {
        const pen = new SvgPen(svg, {
            seed: (o.seed ?? 4127) + f * 7919,
            t,
            paper,
            roughness: o.roughness ?? 1,
        });
        const g = el("g", {}, wrap);
        const a =
            "settings" in v
                ? v.draw({ pen, ink, g, t, paper }, p)
                : v.draw({ pen, g, t, paper }, p);
        if (f === 0) raw = a;
    }
    const anchors: Anchors = {};
    for (const [k, [x, y, side, reach]] of Object.entries(raw)) {
        const reaches = reach === undefined ? {} : { reach: reach / U };
        anchors[k] = { x: x / U, y: y / U, side: side ?? "up", ...reaches };
    }
    const said = v.describe?.(p);
    if (said === null) svg.setAttribute("aria-hidden", "true");
    else if (said !== undefined) {
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", said);
    }
    return { svg, anchors, box };
}

/** Draw anchor markers (for authoring views). Coordinates in squares. */
export function drawAnchors(
    target: SVGSVGElement,
    anchors: Anchors,
    color: string,
    card: string,
): void {
    const g = el("g", { class: "anchors" }, target);
    const off: Record<Side, [number, number, string]> = {
        up: [0, -9, "middle"],
        down: [0, 17, "middle"],
        left: [-9, 3.5, "end"],
        right: [9, 3.5, "start"],
    };
    for (const [name, a] of Object.entries(anchors)) {
        const x = a.x * U;
        const y = a.y * U;
        const [dx, dy, ta] = off[a.side];
        el("circle", { cx: x, cy: y, r: 3.6, fill: card, stroke: color, "stroke-width": 1.5 }, g);
        el(
            "path",
            {
                d: `M${x - 6} ${y}H${x + 6}M${x} ${y - 6}V${y + 6}`,
                stroke: color,
                "stroke-width": 1,
            },
            g,
        );
        const t = el(
            "text",
            {
                x: x + dx,
                y: y + dy,
                "text-anchor": ta,
                fill: color,
                stroke: card,
                "stroke-width": 3,
                "paint-order": "stroke",
                style: "font:500 9.5px var(--f-mono)",
            },
            g,
        );
        t.textContent = name;
    }
}

/** A stroke as one SVG path, returned so a page can take back the stroke still being drawn. */
export function drawStroke(parent: Element, s: Stroke, color: string, scale = U): SVGPathElement {
    const { d, opacity } = strokeOutline(s, scale);
    return el("path", { d, fill: color, opacity }, parent);
}

/** The hatch a named fill becomes on paper, as a pattern in the drawing's own defs. */
function hatchPattern(svg: Element, name: TokenName, ink: string): string {
    const id = `hatch-${name}`;
    if (!svg.querySelector(`#${id}`)) {
        const defs = svg.querySelector("defs") ?? el("defs", {}, svg);
        const h = HATCH[name] ?? {};
        const angle = h.angle ?? -41;
        const p = el(
            "pattern",
            {
                id,
                width: 6,
                height: 6,
                patternUnits: "userSpaceOnUse",
                patternTransform: `rotate(${angle})`,
            },
            defs,
        );
        if (h.style === "dots") el("circle", { cx: 3, cy: 3, r: 1, fill: ink }, p);
        else {
            el("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: ink, "stroke-width": 0.8 }, p);
            if (h.style === "cross-hatch") {
                el("line", { x1: 0, y1: 3, x2: 6, y2: 3, stroke: ink, "stroke-width": 0.8 }, p);
            }
        }
    }
    return `url(#${id})`;
}
