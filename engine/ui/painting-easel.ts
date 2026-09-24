import { paintingValue } from "../painting";
// The painting tool: a sheet of squared or plain paper, ten tools, three sizes, a mirror, a paint
// box and a tray to mix in. Nothing on it needs reading: every tool is a drawing from the shelf, and
// the words are only for a screen reader. It records what the child did, as marks, and the sheet is
// drawn from those marks by surface.ts. The Paint tab mounts it on a whole page, and a lesson lays
// its sheet over the paint sheet a question prints. See .docs/art.md, "The painting tool".
import type { Brush, Given, Mirror, PaintMark, PaintPart } from "../answer";
import { SvgPen as Pen, el, render, type Ctx } from "../ui/svg";
import { PRINT, U } from "../paper";
import { readTokens } from "../ui/read-tokens";
import { MOTIFS, STENCILS, sheetLines } from "../parts/art/kit";
import { artTools } from "../parts/art/arttools";
import { mixingTray } from "../parts/art/mixingtray";
import { paintBox } from "../parts/art/paintbox";
import { isPigment, mix, recipeText, rgbOf, type Pigment } from "../pigment";
import {
    BRUSH,
    CARD as CARD_SIZE,
    Surface,
    copiesOf,
    grainPattern,
    mirrored,
    outline,
    replay,
    trace,
    type Mask,
} from "./painting-surface";

export type Painting = Extract<Given, { k: "painting" }>;
export type Tool = Brush | "fill" | "stamp" | "stencil" | "dropper";
const TOOL_NAMES: readonly Tool[] = [
    "pencil",
    "crayon",
    "marker",
    "water",
    "blend",
    "fill",
    "stamp",
    "stencil",
    "dropper",
    "eraser",
];
/** The tools that act on one tap rather than along a stroke. */
const ONE_TAP: ReadonlySet<Tool> = new Set<Tool>(["fill", "stamp", "stencil", "dropper"]);
const MIRRORS: Mirror[] = ["none", "two", "four", "six"];

/**
 * What the easel was holding when it was put down: the tool, the size, the mirror, the paint on the
 * brush and in each well, and the stamp and stencil chosen, so a reload comes back to the same table.
 */
export interface EaselState {
    tool: Tool;
    step: number;
    mirror: Mirror;
    paint: PaintPart[];
    fromPan: boolean;
    wells: PaintPart[][];
    stamp: string;
    flip: boolean;
    stencil: string;
    hole: boolean;
}

const obj = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
const parts = (v: unknown): PaintPart[] | null =>
    Array.isArray(v) &&
    v.every(
        (p) =>
            obj(p) &&
            typeof p.pigment === "string" &&
            isPigment(p.pigment) &&
            typeof p.parts === "number" &&
            p.parts > 0 &&
            p.parts < 100,
    )
        ? v.map((p) => ({
              pigment: String((p as Record<string, unknown>).pigment),
              parts: Number((p as Record<string, unknown>).parts),
          }))
        : null;

/** A stored easel read back without trusting it: anything that does not look right is left at its start. */
export function readState(v: unknown): EaselState | null {
    if (!obj(v)) return null;
    const tool = TOOL_NAMES.find((t) => t === v.tool),
        mirror = MIRRORS.find((m) => m === v.mirror),
        paint = parts(v.paint);
    const wells = Array.isArray(v.wells) && v.wells.length === 3 ? v.wells.map(parts) : null;
    if (!tool || !mirror || !paint || !wells || wells.some((x) => !x)) return null;
    return {
        tool,
        mirror,
        paint,
        wells: wells.map((x) => x ?? []),
        step: typeof v.step === "number" && v.step >= 0 && v.step <= 2 ? Math.round(v.step) : 1,
        fromPan: v.fromPan === true,
        stamp: typeof v.stamp === "string" && MOTIFS[v.stamp] ? v.stamp : "leaf",
        flip: v.flip === true,
        stencil: typeof v.stencil === "string" && MOTIFS[v.stencil] ? v.stencil : "leaf",
        hole: v.hole === true,
    };
}

export interface EaselOptions {
    /** Where the sheet goes; the sheet fills its width. */
    paper: HTMLElement;
    /** Where the tools go, and where the paints and the tray go. They may be the same element. */
    tools: HTMLElement;
    paints: HTMLElement;
    painting: Painting;
    pots?: readonly Pigment[];
    stamps?: readonly string[];
    stencils?: readonly string[];
    /** Where the easel was left, and where to tell it now, so the tray and the brush survive a reload. */
    state?: EaselState | null;
    rasterScale?: number;
    strokeMode?: () => "free" | "line" | "circle" | "box";
    steady?: () => boolean;
    strokeScale?: number;
    onState?: (s: EaselState) => void;
    /** The lines the sheet was printed with, drawn over the paint, where a fill stops. */
    guide?: { guide: string; outline: string };
    mirror?: Mirror;
    onChange?: (p: Painting) => void;
    /** Said aloud to a screen reader; the page decides where it lives. */
    say?: (text: string) => void;
}

export interface Easel {
    dispose(): void;
    painting(): Painting;
    select(tool: Tool): void;
    colour(paint: PaintPart[]): void;
    symmetry(mirror: Mirror): void;
    /** Starts again from a painting, a new sheet or one taken off the wall. */
    load(p: Painting): void;
    /** The sheet has changed size on the page. */
    resize(): void;
}

const TOOLS: { tool: Tool; icon: string; name: string; key: string }[] = [
    { tool: "pencil", icon: "pencil", name: "Pencil", key: "p" },
    { tool: "crayon", icon: "crayon", name: "Crayon", key: "c" },
    { tool: "marker", icon: "marker", name: "Felt pen", key: "m" },
    { tool: "water", icon: "brush", name: "Paintbrush", key: "b" },
    { tool: "blend", icon: "blender", name: "Blender", key: "l" },
    { tool: "fill", icon: "bucket", name: "Pour paint", key: "f" },
    { tool: "stamp", icon: "stamp", name: "Stamp", key: "s" },
    { tool: "stencil", icon: "stencil", name: "Stencil", key: "t" },
    { tool: "dropper", icon: "dropper", name: "Dropper", key: "d" },
    { tool: "eraser", icon: "eraser", name: "Eraser", key: "e" },
];
const SIZES = ["Small", "Middle", "Big"] as const;
/** How strongly the stroke still being drawn shows, before the finished mark is laid under it. */
const LIVE: Record<Brush, number> = {
    pencil: 0.9,
    crayon: 1,
    marker: 0.86,
    water: 0.42,
    blend: 0.3,
    eraser: 0.85,
};
/** A stamp's and a stencil's size in squares, small to big. */
const STAMP_SIZES = [2, 3.2, 5];
const STENCIL_SIZES = [4, 6.5, 9.5];
/** The card a stencil is cut from, as it lies on the sheet. */
const CARD = "#EFE3C8";

const round2 = (n: number): number => Math.round(n * 100) / 100;
const reduced = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

function button(label: string, cls: string, act: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.setAttribute("aria-label", label);
    b.title = label;
    b.addEventListener("click", act);
    return b;
}

/** A small hand-drawn glyph for a button that is not a tool: the mirror, take back, the paper, washing. */
export function glyph(kind: string, t = readTokens()): SVGSVGElement {
    const svg = el("svg", { viewBox: "0 0 40 40", class: "ez-glyph", "aria-hidden": "true" });
    const pen = new Pen(svg, { seed: 311 + kind.length * 17, t, paper: false, roughness: 1 }),
        g = el("g", {}, svg);
    const ink = { strokeWidth: 2.2 },
        dash = { strokeWidth: 2, strokeLineDash: [4, 4], stroke: t.pen };
    if (kind === "mirror-none") {
        pen.rect(g, 8, 8, 24, 24, "pencil", null, { strokeWidth: 1.6, stroke: t["ink-soft"] });
        pen.line(g, 20, 5, 20, 35, "ruler", { ...dash, stroke: t["ink-soft"] });
    } else if (kind === "mirror-two") {
        pen.path(
            g,
            "M19 20C12 8 4 10 5 17C6 23 13 23 19 21Z",
            "pencil",
            { fill: t.berry, fillStyle: "solid" },
            ink,
        );
        pen.path(
            g,
            "M21 20C28 8 36 10 35 17C34 23 27 23 21 21Z",
            "pencil",
            { fill: t.berry, fillStyle: "solid" },
            ink,
        );
        pen.path(
            g,
            "M19 21C13 23 9 29 12 32C15 34 18 29 19 24Z",
            "pencil",
            { fill: t.sky, fillStyle: "solid" },
            ink,
        );
        pen.path(
            g,
            "M21 21C27 23 31 29 28 32C25 34 22 29 21 24Z",
            "pencil",
            { fill: t.sky, fillStyle: "solid" },
            ink,
        );
        pen.line(g, 20, 4, 20, 36, "ruler", dash);
    } else if (kind === "mirror-four") {
        for (const [x, y] of [
            [13, 13],
            [27, 13],
            [13, 27],
            [27, 27],
        ] as const)
            pen.circle(g, x, y, 11, "pencil", { fill: t.glow, fillStyle: "solid" }, ink);
        pen.line(g, 20, 3, 20, 37, "ruler", dash);
        pen.line(g, 3, 20, 37, 20, "ruler", dash);
    } else if (kind === "mirror-six") {
        for (let k = 0; k < 6; k++) {
            const a = (k * Math.PI) / 3,
                x = 20 + Math.sin(a) * 10,
                y = 20 - Math.cos(a) * 10;
            pen.circle(
                g,
                x,
                y,
                10,
                "pencil",
                { fill: k % 2 ? t.sky : t.berry, fillStyle: "solid" },
                { strokeWidth: 1.8 },
            );
        }
        pen.circle(
            g,
            20,
            20,
            7,
            "pencil",
            { fill: t.glow, fillStyle: "solid" },
            { strokeWidth: 1.6 },
        );
    } else if (kind === "lift") {
        pen.path(g, "M6 30L30 24L34 34L10 38Z", "pencil", { fill: CARD, fillStyle: "solid" }, ink);
        pen.path(g, "M12 26C12 16 18 10 26 8", "pencil", null, { strokeWidth: 2.4 });
        pen.linear(
            g,
            [
                [20, 6],
                [27, 8],
                [24, 15],
            ],
            "pencil",
            { strokeWidth: 2.4 },
        );
    } else if (kind === "undo") {
        pen.path(g, "M12 16C18 9 30 10 32 20C34 30 22 34 14 30", "pencil", null, {
            strokeWidth: 2.6,
        });
        pen.linear(
            g,
            [
                [17, 10],
                [11, 16],
                [18, 21],
            ],
            "pencil",
            { strokeWidth: 2.6 },
        );
    } else if (kind === "squared" || kind === "plain") {
        pen.rect(g, 7, 6, 26, 28, "pencil", { fill: t.card, fillStyle: "solid" }, ink);
        if (kind === "squared")
            for (const k of [13.5, 20, 26.5]) {
                pen.line(g, k, 7, k, 33, "ruler", { strokeWidth: 1, stroke: t["ink-soft"] });
                pen.line(g, 8, k, 32, k, "ruler", { strokeWidth: 1, stroke: t["ink-soft"] });
            }
    } else if (kind === "wash") {
        pen.path(
            g,
            "M20 5C26 14 31 20 31 26C31 32 26 36 20 36C14 36 9 32 9 26C9 20 14 14 20 5Z",
            "pencil",
            { fill: t.sky, fillStyle: "solid" },
            ink,
        );
        pen.path(g, "M14 26C14 29 16 31 18 32", "pencil", null, { strokeWidth: 2, stroke: t.card });
    } else if (kind === "new") {
        pen.path(
            g,
            "M9 5L25 5L32 12L32 35L9 35Z",
            "pencil",
            { fill: t.card, fillStyle: "solid" },
            ink,
        );
        pen.linear(
            g,
            [
                [25, 5],
                [25, 12],
                [32, 12],
            ],
            "pencil",
            { strokeWidth: 1.8 },
        );
        pen.circle(
            g,
            19,
            23,
            9,
            "pencil",
            { fill: t.glow, fillStyle: "solid" },
            { strokeWidth: 1.4 },
        );
    }
    return svg;
}

/**
 * A shape at `px` pixels across as coverage, turned and faced as asked: a print block's shape less
 * its carved lines, or a stencil's whole shape. Turned shapes get a canvas wide enough for the corners.
 */
const masks = new Map<string, Mask>();
export function shapeMask(
    name: string,
    px: number,
    flip: boolean,
    turn: number,
    carve: boolean,
): Mask | null {
    const m = MOTIFS[name];
    if (!m) return null;
    const key = `${name}:${px}:${flip}:${turn.toFixed(3)}:${carve}`,
        had = masks.get(key);
    if (had) return had;
    const size = turn ? Math.ceil(px * 1.42) : px,
        c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) return null;
    const k = px / 100;
    g.translate(size / 2, size / 2);
    g.rotate(turn);
    g.scale(flip ? -k : k, k);
    g.translate(-50, -50);
    g.fillStyle = "#000";
    for (const d of m.fill) g.fill(new Path2D(d));
    if (carve) {
        g.globalCompositeOperation = "destination-out";
        g.lineWidth = m.width;
        g.lineCap = "round";
        g.lineJoin = "round";
        for (const d of m.carve) g.stroke(new Path2D(d));
    }
    const data = g.getImageData(0, 0, size, size).data,
        a = new Float32Array(size * size);
    for (let i = 0; i < a.length; i++) a[i] = paintingValue(data[i * 4 + 3]) / 255;
    const mask = { w: size, h: size, a };
    masks.set(key, mask);
    return mask;
}

/** The sheet's printed outline as coverage at the surface's size, so a fill stops at it. Async: it is an image. */
async function linesMask(
    guide: { guide: string; outline: string },
    w: number,
    h: number,
    W: number,
    H: number,
): Promise<Float32Array | null> {
    if (guide.outline === "none") return null;
    const svg = el("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${w * U} ${h * U}`,
        width: W,
        height: H,
    });
    const pen = new Pen(svg, { seed: 4127, t: PRINT, paper: true, roughness: 1 });
    const ctx: Ctx = { pen, g: el("g", {}, svg), t: PRINT, paper: true };
    sheetLines(ctx, { w, h, guide: guide.guide, outline: guide.outline }, 0, 0);
    const url = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }),
    );
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) return null;
        g.drawImage(img, 0, 0, W, H);
        const d = g.getImageData(0, 0, W, H).data,
            out = new Float32Array(W * H);
        for (let i = 0; i < out.length; i++) out[i] = paintingValue(d[i * 4 + 3]) / 255;
        return out;
    } catch {
        return null;
    } finally {
        URL.revokeObjectURL(url);
    }
}

export function mountEasel(o: EaselOptions): Easel {
    const t = readTokens();
    const pots: Pigment[] = [
        ...(o.pots ?? [
            "yellow",
            "orange",
            "red",
            "pink",
            "blue",
            "sky",
            "green",
            "brown",
            "black",
            "white",
        ]),
    ];
    const stampList = (o.stamps ?? ["leaf", "star", "fish", "flower", "shell", "bird"]).filter(
        (s) => MOTIFS[s],
    );
    const stencilList = (o.stencils ?? STENCILS).filter((s) => MOTIFS[s]);
    const say = o.say ?? (() => {});
    let w = o.painting.w,
        h = o.painting.h,
        paperKind = o.painting.paper;
    let marks: PaintMark[] = [...o.painting.marks];
    const was = o.state ?? null;
    let tool: Tool = was?.tool ?? "water",
        step = was?.step ?? 1,
        mirror: Mirror = o.mirror ?? was?.mirror ?? "none";
    let paint: PaintPart[] =
        was?.paint.filter((p) => pots.includes(p.pigment as Pigment)).length ===
            was?.paint.length && was?.paint.length
            ? was.paint
            : [{ pigment: pots.includes("blue") ? "blue" : (pots[0] ?? "blue"), parts: 1 }];
    /** Whether the brush holds paint just taken from a pan, which a tap on a well adds to that well. */
    let fromPan = was?.fromPan ?? true;
    const wells: PaintPart[][] = was
        ? was.wells.map((x) => x.filter((p) => pots.includes(p.pigment as Pigment)))
        : [[], [], []];
    let well = -1,
        stamp = was && stampList.includes(was.stamp) ? was.stamp : (stampList[0] ?? "leaf"),
        flip = was?.flip ?? false;
    let shape = was && stencilList.includes(was.stencil) ? was.stencil : (stencilList[0] ?? "leaf"),
        hole = was?.hole ?? false;
    /** The brush to go back to after a one-tap tool has done its job. */
    let brush: Brush =
        tool === "fill" ||
        tool === "stamp" ||
        tool === "stencil" ||
        tool === "dropper" ||
        tool === "eraser"
            ? "water"
            : tool;
    let masksId = 0;

    // ---- the sheet
    const sheet = document.createElement("div");
    sheet.className = "ez-sheet";
    sheet.tabIndex = 0;
    sheet.setAttribute("role", "img");
    const paintC = document.createElement("canvas"),
        liveC = document.createElement("canvas");
    paintC.className = "ez-paint";
    liveC.className = "ez-live";
    const lines = el("svg", { class: "ez-lines", "aria-hidden": "true" });
    const card = el("svg", { class: "ez-lines ez-card", "aria-hidden": "true" });
    const cursor = document.createElement("div");
    cursor.className = "ez-cursor";
    cursor.hidden = true;
    sheet.append(paintC, liveC, card, lines, cursor);
    o.paper.appendChild(sheet);
    const paintX = paintC.getContext("2d"),
        liveX = liveC.getContext("2d");
    if (!paintX || !liveX) throw new Error("no 2d canvas");

    let cssSq = 20,
        scale = 20;
    let surface = new Surface({ w, h, scale, shapes: shapeMask });

    const paintHex = (): string =>
        mix(
            paint
                .filter((p) => isPigment(p.pigment))
                .map((p) => ({ pigment: p.pigment as Pigment, parts: p.parts })),
        );
    const recipe = (): string =>
        paint.map((p) => (p.parts > 1 ? `${p.pigment} ${p.parts}` : p.pigment)).join("+");
    const words = (p: PaintPart[]): string =>
        p.length
            ? recipeText(
                  p
                      .filter((x) => isPigment(x.pigment))
                      .map((x) => ({ pigment: x.pigment as Pigment, parts: x.parts })),
              )
            : "nothing";

    function drawLines(): void {
        lines.setAttribute("viewBox", `0 0 ${w * U} ${h * U}`);
        lines.replaceChildren();
        const pen = new Pen(lines, { seed: 4127, t, paper: false, roughness: 1 });
        const ctx: Ctx = { pen, g: el("g", {}, lines), t, paper: false };
        const printed = o.guide ?? { guide: "none", outline: "none" };
        sheetLines(ctx, { w, h, guide: printed.guide, outline: printed.outline }, 0, 0);
        // the mirror the child turned on, drawn faintly unless the sheet already prints it
        const dash = { strokeWidth: 1.6, strokeLineDash: [6, 7], stroke: t["ink-soft"] };
        if (
            (mirror === "two" || mirror === "four") &&
            printed.guide !== "mirror" &&
            printed.guide !== "four"
        )
            pen.line(ctx.g, (w * U) / 2, 0, (w * U) / 2, h * U, "ruler", dash);
        if (mirror === "four" && printed.guide !== "four")
            pen.line(ctx.g, 0, (h * U) / 2, w * U, (h * U) / 2, "ruler", dash);
        // six ways round has no line to mirror in, only the centre everything turns about
        if (mirror === "six") {
            for (let k = 0; k < 6; k++) {
                const a = (k * Math.PI) / 3,
                    cx = (w * U) / 2,
                    cy = (h * U) / 2;
                pen.line(
                    ctx.g,
                    cx + Math.sin(a) * 0.6 * U,
                    cy - Math.cos(a) * 0.6 * U,
                    cx + Math.sin(a) * 1.6 * U,
                    cy - Math.cos(a) * 1.6 * U,
                    "ruler",
                    dash,
                );
            }
            pen.circle(ctx.g, (w * U) / 2, (h * U) / 2, 0.5 * U, "ruler", null, dash);
        }
    }

    /**
     * The stencils lying on the sheet, drawn over the paint: a card with the shape's hole cut in it, or
     * the shape itself lying there, in every place the mirror put it.
     */
    function drawStencil(): void {
        card.setAttribute("viewBox", `0 0 ${w * U} ${h * U}`);
        card.replaceChildren();
        for (const laid of surface.laid) drawOne(laid);
    }
    function drawOne(laid: Extract<PaintMark, { k: "stencil" }>): void {
        const m = MOTIFS[laid.shape];
        if (!m) return;
        const k = (laid.size * U) / 100,
            placed = copiesOf(laid.mirror, w, h).map((c) => {
                const [cx, cy] = c.at(laid.x, laid.y);
                return `translate(${(cx * U).toFixed(1)} ${(cy * U).toFixed(1)}) rotate(${((c.turn * 180) / Math.PI).toFixed(1)}) scale(${c.flip ? -k : k} ${k}) translate(-50 -50)`;
            });
        const shapes = (parent: Element, attrs: Record<string, string | number>) =>
            placed.forEach((tr) => {
                const g = el("g", { transform: tr }, parent);
                for (const d of m.fill)
                    el("path", { d, ...attrs, "vector-effect": "non-scaling-stroke" }, g);
            });
        if (laid.hole) {
            const id = `ez-hole-${++masksId}`,
                defs = el("defs", {}, card),
                mask = el("mask", { id }, defs);
            el("rect", { x: 0, y: 0, width: w * U, height: h * U, fill: "#FFFFFF" }, mask);
            shapes(mask, { fill: "#000000" });
            const side = laid.size * CARD_SIZE * U;
            for (const c of copiesOf(laid.mirror, w, h)) {
                const [cx, cy] = c.at(laid.x, laid.y);
                el(
                    "rect",
                    {
                        x: cx * U - side / 2,
                        y: cy * U - side / 2,
                        width: side,
                        height: side,
                        rx: 6,
                        fill: CARD,
                        opacity: 0.85,
                        stroke: t.ink,
                        "stroke-width": 1.4,
                        mask: `url(#${id})`,
                    },
                    card,
                );
            }
            shapes(card, {
                fill: "none",
                stroke: t.ink,
                "stroke-width": 1.6,
                "stroke-dasharray": "5 4",
            });
        } else {
            shapes(card, { fill: CARD, opacity: 0.9, stroke: t.ink, "stroke-width": 1.8 });
        }
    }

    /** Lays the sheet out at the width its host gives it, and rebuilds the pixels if the scale moved. */
    function layout(force = false): void {
        const width = Math.max(120, o.paper.clientWidth || 600);
        cssSq = width / w;
        sheet.style.width = `${w * cssSq}px`;
        sheet.style.height = `${h * cssSq}px`;
        sheet.style.setProperty("--sq", `${cssSq}px`);
        sheet.classList.toggle("plain", paperKind === "plain");
        const next =
            o.rasterScale ??
            Math.max(8, Math.min(40, Math.round(cssSq * Math.min(2, devicePixelRatio || 1))));
        if (!force && Math.abs(next - scale) / scale < 0.15 && surface.w === w && surface.h === h)
            return;
        scale = next;
        for (const c of [paintC, liveC]) {
            c.width = Math.round(w * scale);
            c.height = Math.round(h * scale);
        }
        surface = replay(marks, { w, h, scale, shapes: shapeMask });
        paintX?.clearRect(0, 0, paintC.width, paintC.height);
        if (paintX) surface.draw(paintX);
        drawStencil();
        const at = surface;
        void linesMask(
            o.guide ?? { guide: "none", outline: "none" },
            w,
            h,
            surface.W,
            surface.H,
        ).then((m) => {
            if (at === surface) surface.lines = m;
        });
    }

    function changed(): void {
        sheet.setAttribute(
            "aria-label",
            `A painting, ${w} by ${h} squares, ${marks.length} ${marks.length === 1 ? "mark" : "marks"}`,
        );
        o.onChange?.(painting());
    }

    function painting(): Painting {
        return { k: "painting", paper: paperKind, w, h, marks: [...marks] };
    }

    /** The stroke just drawn fades while the finished mark shows through; a new stroke ends the fade at once. */
    let settle = 0;
    function settled(): void {
        if (settle) {
            clearTimeout(settle);
            settle = 0;
        }
        liveC.classList.remove("settling");
        liveX?.clearRect(0, 0, liveC.width, liveC.height);
    }
    function fade(): void {
        if (reduced()) {
            settled();
            return;
        }
        if (settle) clearTimeout(settle);
        liveC.classList.add("settling");
        settle = window.setTimeout(settled, 200);
    }

    function put(m: PaintMark): void {
        const r = surface.apply(m, marks.length);
        marks.push(m);
        if (r && paintX) surface.draw(paintX, r);
        if (m.k === "stencil" || m.k === "lift") {
            drawStencil();
            refresh();
        }
        fade();
        changed();
    }

    function undo(): void {
        if (!marks.length) return;
        marks.pop();
        const r = surface.undo();
        if (r && paintX) {
            if (r.w) surface.draw(paintX, r);
        } else layout(true);
        drawStencil();
        refresh();
        say(marks.length ? "Taken back" : "The sheet is empty");
        changed();
    }

    function lift(): void {
        if (!surface.laid.length) return;
        put({ k: "lift" });
        say("Stencil lifted");
    }

    // ---- drawing with a finger, a mouse or a stylus
    let live: number[] | null = null,
        pointer = -1,
        lastPen = -Infinity,
        frame = 0;
    const sizeOf = (): number =>
        tool === "fill" || tool === "stamp" || tool === "stencil" || tool === "dropper"
            ? 1
            : paintingValue(paintingValue(BRUSH[tool]).sizes[step]) * (o.strokeScale ?? 1);
    const at = (e: PointerEvent): [number, number] => {
        const r = sheet.getBoundingClientRect();
        return [(e.clientX - r.left) / cssSq, (e.clientY - r.top) / cssSq];
    };

    function preview(): void {
        frame = 0;
        if (
            !live ||
            !liveX ||
            ONE_TAP.has(tool) ||
            tool === "fill" ||
            tool === "stamp" ||
            tool === "stencil" ||
            tool === "dropper"
        )
            return;
        liveX.clearRect(0, 0, liveC.width, liveC.height);
        const rgb = rgbOf(paintHex());
        liveX.globalAlpha = LIVE[tool];
        liveX.fillStyle =
            tool === "eraser"
                ? t.card
                : tool === "blend"
                  ? "#9AA3AE"
                  : (grainPattern(liveX, tool, rgb, scale) ?? `rgb(${rgb.join(",")})`);
        liveX.beginPath();
        const pts = o.strokeMode?.() === "circle" && live.length > 3 ? live.slice(3) : live;
        for (const f of mirrored(mirror, w, h)) {
            const copy: number[] = [];
            for (let i = 0; i + 2 < pts.length; i += 3) {
                const [x, y] = f(paintingValue(pts[i]), paintingValue(pts[i + 1]));
                copy.push(x, y, paintingValue(pts[i + 2]));
            }
            trace(liveX, outline(tool, sizeOf(), copy, scale, marks.length * 7 + 1, false));
        }
        liveX.fill("nonzero");
        liveX.globalAlpha = 1;
    }

    function begin(x: number, y: number, pressure: number): void {
        settled();
        if (tool === "fill") {
            put({ k: "fill", paint: [...paint], x: round2(x), y: round2(y), mirror });
            say(`Poured ${words(paint)}`);
            return;
        }
        if (tool === "stamp") {
            put({
                k: "stamp",
                stamp,
                paint: [...paint],
                x: round2(x),
                y: round2(y),
                size: paintingValue(STAMP_SIZES[step]),
                flip,
                mirror,
            });
            say(`Printed a ${stamp}`);
            return;
        }
        if (tool === "stencil") {
            put({
                k: "stencil",
                shape,
                x: round2(x),
                y: round2(y),
                size: paintingValue(STENCIL_SIZES[step]),
                hole,
                mirror,
            });
            tool = brush;
            refresh();
            say(`A ${shape} stencil is down. Paint over it, then lift it.`);
            return;
        }
        if (tool === "dropper") {
            const got = surface.paintAtPoint(x, y);
            if (!got) {
                say("There is no paint there");
                return;
            }
            paint = got;
            fromPan = false;
            well = -1;
            tool = brush;
            refresh();
            say(`On the brush: ${words(got)}`);
            return;
        }
        live = [round2(x), round2(y), pressure];
        preview();
    }
    function extend(x: number, y: number, pressure: number): void {
        if (!live) return;
        const mode = o.strokeMode?.() ?? "free";
        if (mode !== "free") {
            const sx = paintingValue(live[0]),
                sy = paintingValue(live[1]);
            const points: number[] = [sx, sy, pressure];
            if (mode === "line") points.push(round2(x), round2(y), pressure);
            if (mode === "box")
                points.push(
                    round2(x),
                    sy,
                    pressure,
                    round2(x),
                    round2(y),
                    pressure,
                    sx,
                    round2(y),
                    pressure,
                    sx,
                    sy,
                    pressure,
                );
            if (mode === "circle") {
                // The first point keeps the drag's anchor; the rest form the ellipse preview.
                const cx = (sx + x) / 2,
                    cy = (sy + y) / 2;
                for (let i = 0; i <= 68; i++) {
                    const a = (i * Math.PI) / 32;
                    points.push(
                        round2(cx + ((x - sx) / 2) * Math.cos(a)),
                        round2(cy + ((y - sy) / 2) * Math.sin(a)),
                        pressure,
                    );
                }
            }
            live = points;
            if (!frame) frame = requestAnimationFrame(preview);
            return;
        }
        const n = live.length;
        if (o.steady?.()) {
            x = paintingValue(live[n - 3]) + (x - paintingValue(live[n - 3])) * 0.65;
            y = paintingValue(live[n - 2]) + (y - paintingValue(live[n - 2])) * 0.65;
        }
        if (Math.hypot(x - paintingValue(live[n - 3]), y - paintingValue(live[n - 2])) < 0.02)
            return;
        live.push(round2(x), round2(y), pressure);
        if (!frame) frame = requestAnimationFrame(preview);
    }
    function end(): void {
        if (
            !live ||
            tool === "fill" ||
            tool === "stamp" ||
            tool === "stencil" ||
            tool === "dropper"
        ) {
            live = null;
            return;
        }
        const points = o.strokeMode?.() === "circle" && live.length > 3 ? live.slice(3) : live,
            b: Brush = tool;
        live = null;
        if (frame) {
            cancelAnimationFrame(frame);
            frame = 0;
        }
        preview();
        put({
            k: "stroke",
            brush: b,
            paint: b === "eraser" || b === "blend" ? [] : [...paint],
            size: sizeOf(),
            mirror,
            points,
        });
    }

    sheet.addEventListener("pointerdown", (e) => {
        if (pointer !== -1) return;
        // a hand resting on the glass while a stylus draws is not a stroke
        if (e.pointerType === "pen") lastPen = e.timeStamp;
        else if (e.pointerType === "touch" && e.timeStamp - lastPen < 1500) return;
        e.preventDefault();
        pointer = e.pointerId;
        try {
            sheet.setPointerCapture(e.pointerId);
        } catch {
            /* a pointer that has already gone */
        }
        sheet.focus({ preventScroll: true });
        cursor.hidden = true;
        const [x, y] = at(e);
        begin(x, y, e.pointerType === "pen" ? Math.max(0.05, e.pressure) : 0);
    });
    sheet.addEventListener("pointermove", (e) => {
        if (e.pointerId !== pointer) return;
        // coalesced moves can come back empty, for a synthetic event or on an older browser
        const moves = e.getCoalescedEvents?.() ?? [];
        for (const ev of moves.length ? moves : [e]) {
            const [x, y] = at(ev);
            extend(x, y, ev.pointerType === "pen" ? Math.max(0.05, ev.pressure) : 0);
        }
    });
    const up = (e: PointerEvent) => {
        if (e.pointerId !== pointer) return;
        pointer = -1;
        end();
    };
    sheet.addEventListener("pointerup", up);
    sheet.addEventListener("pointercancel", up);

    // ---- drawing with the keyboard: a cursor moved by the arrows, Space for the pen, Enter to pour or print
    let kx = w / 2,
        ky = h / 2,
        down = false;
    const showCursor = () => {
        cursor.hidden = false;
        cursor.classList.toggle("down", down);
        cursor.style.left = `${kx * cssSq}px`;
        cursor.style.top = `${ky * cssSq}px`;
    };
    sheet.addEventListener("keydown", (e) => {
        const move: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
        };
        const d = move[e.key];
        if (d) {
            e.preventDefault();
            const stepSq = e.shiftKey ? 2 : 0.5;
            kx = Math.max(0, Math.min(w, kx + d[0] * stepSq));
            ky = Math.max(0, Math.min(h, ky + d[1] * stepSq));
            if (down) extend(kx, ky, 0);
            showCursor();
        } else if (e.key === " ") {
            e.preventDefault();
            if (ONE_TAP.has(tool)) {
                begin(kx, ky, 0);
                return;
            }
            down = !down;
            if (down) begin(kx, ky, 0);
            else end();
            say(down ? "Pen down" : "Pen up");
            showCursor();
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (down) {
                down = false;
                end();
            } else {
                begin(kx, ky, 0);
                end();
            }
            showCursor();
        } else if (e.key === "Escape" && down) {
            down = false;
            end();
            showCursor();
        }
    });
    sheet.addEventListener("focus", () => {
        if (sheet.matches(":focus-visible")) showCursor();
    });
    sheet.addEventListener("blur", () => {
        if (down) {
            down = false;
            end();
        }
        cursor.hidden = true;
    });

    // ---- the tools
    const toolbar = document.createElement("div");
    toolbar.className = "ez-tools";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Tools");
    const toolButtons = TOOLS.map((d) => {
        const b = button(d.name, "ez-btn ez-tool", () => choose(d.tool));
        b.dataset.tool = d.tool;
        b.setAttribute("aria-keyshortcuts", d.key.toUpperCase());
        toolbar.appendChild(b);
        return b;
    });
    const sizes = document.createElement("div");
    sizes.className = "ez-row ez-sizes";
    sizes.setAttribute("role", "group");
    sizes.setAttribute("aria-label", "Size");
    const sizeButtons = SIZES.map((name, i) => {
        const b = button(name, "ez-btn ez-size", () => {
            step = i;
            refresh();
        });
        const dot = document.createElement("span");
        dot.className = "ez-dot";
        dot.style.setProperty("--d", `${8 + i * 8}px`);
        b.appendChild(dot);
        b.setAttribute("aria-keyshortcuts", String(i + 1));
        sizes.appendChild(b);
        return b;
    });
    const stampRow = document.createElement("div");
    stampRow.className = "ez-row ez-stamps";
    stampRow.setAttribute("role", "group");
    stampRow.setAttribute("aria-label", "Stamps");
    const stampButtons = stampList.map((s) => {
        const b = button(`${s} stamp`, "ez-btn ez-stamp", () => {
            if (stamp === s) flip = !flip;
            stamp = s;
            refresh();
        });
        b.dataset.stamp = s;
        stampRow.appendChild(b);
        return b;
    });
    const stencilRow = document.createElement("div");
    stencilRow.className = "ez-row ez-stamps";
    stencilRow.setAttribute("role", "group");
    stencilRow.setAttribute("aria-label", "Stencils");
    // the card or the shape is its own button, so choosing a shape never changes which one is laid
    const holeB = button("Card with the shape cut out", "ez-btn ez-stamp ez-hole", () => {
        hole = !hole;
        refresh();
        say(hole ? `A card with a ${shape} cut out` : `A ${shape} shape`);
    });
    stencilRow.appendChild(holeB);
    const stencilButtons = stencilList.map((s) => {
        const b = button(`${s} stencil`, "ez-btn ez-stamp", () => {
            shape = s;
            refresh();
            say(hole ? `A card with a ${s} cut out` : `A ${s} shape`);
        });
        stencilRow.appendChild(b);
        return b;
    });
    const acts = document.createElement("div");
    acts.className = "ez-row ez-acts";
    const MIRROR_WORDS: Record<Mirror, string> = {
        none: "Mirror, off",
        two: "Mirror, two sides",
        four: "Mirror, four ways",
        six: "Mirror, six times round",
    };
    const mirrorB = button("Mirror", "ez-btn ez-mirror", () => {
        mirror = paintingValue(MIRRORS[(MIRRORS.indexOf(mirror) + 1) % MIRRORS.length]);
        drawLines();
        refresh();
        say(MIRROR_WORDS[mirror]);
    });
    mirrorB.setAttribute("aria-keyshortcuts", "R");
    const undoB = button("Take back", "ez-btn ez-undo", undo);
    undoB.appendChild(glyph("undo", t));
    undoB.setAttribute("aria-keyshortcuts", "Control+Z");
    const paperB = button("Paper", "ez-btn ez-paperkind", () => {
        paperKind = paperKind === "squared" ? "plain" : "squared";
        layout();
        refresh();
        changed();
    });
    const liftB = button("Lift the stencil", "ez-btn ez-lift", lift);
    liftB.appendChild(glyph("lift", t));
    liftB.setAttribute("aria-keyshortcuts", "U");
    acts.append(mirrorB, undoB, paperB, liftB);
    o.tools.append(toolbar, sizes, stampRow, stencilRow, acts);

    // ---- the paints and the tray
    const box = document.createElement("div");
    box.className = "ez-box";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Paints");
    const tray = document.createElement("div");
    tray.className = "ez-tray";
    tray.setAttribute("role", "group");
    tray.setAttribute("aria-label", "Mixing tray");
    const holding = document.createElement("div");
    holding.className = "ez-holding";
    const swatch = document.createElement("span");
    swatch.className = "ez-swatch";
    const wash = button("Wash the tray", "ez-btn ez-wash", () => {
        if (well >= 0) wells[well] = [];
        else
            wells.forEach((x) => {
                x.length = 0;
            });
        well = -1;
        refresh();
        say("Washed");
    });
    wash.appendChild(glyph("wash", t));
    holding.append(swatch, wash);
    o.paints.append(box, tray, holding);
    const per = pots.length > 6 ? 5 : pots.length;

    /** Transparent buttons laid over a drawing's own pans and wells, never smaller than 44 pixels. */
    function hits(
        host: HTMLElement,
        svg: SVGSVGElement,
        spots: { x: number; y: number; label: string; act: () => void; on: boolean }[],
        sq: number,
    ): void {
        host.querySelectorAll(".ez-hit").forEach((n) => n.remove());
        const scaleBy =
            (svg.getBoundingClientRect().width || svg.viewBox.baseVal.width) /
            svg.viewBox.baseVal.width;
        for (const s of spots) {
            const b = button(s.label, "ez-hit", s.act);
            const size = Math.max(44, sq * scaleBy);
            b.style.left = `${s.x * scaleBy - size / 2}px`;
            b.style.top = `${s.y * scaleBy - size / 2}px`;
            b.style.width = b.style.height = `${size}px`;
            b.setAttribute("aria-pressed", String(s.on));
            host.appendChild(b);
        }
    }

    function drawPaints(): void {
        const rb = render(
            paintBox,
            { pans: pots, per, ring: -1, labels: false },
            { host: box, seed: 911 },
        );
        box.querySelector("svg")?.remove();
        box.prepend(rb.svg);
        const chosen = fromPan && paint.length === 1 ? paintingValue(paint[0]).pigment : "";
        hits(
            box,
            rb.svg,
            pots.map((p, i) => {
                const a = rb.anchors[`pan(${i})`];
                return {
                    x: (a?.x ?? 0) * U,
                    y: (a?.y ?? 0) * U,
                    label: `${p} paint`,
                    act: () => pick(p),
                    on: p === chosen,
                };
            }),
            3 * U,
        );
        const rt = render(
            mixingTray,
            {
                wells: wells.map((x) => x.map((p) => `${p.pigment} ${p.parts}`).join("+")),
                ring: well,
                labels: false,
            },
            { host: tray, seed: 913 },
        );
        tray.querySelector("svg")?.remove();
        tray.prepend(rt.svg);
        hits(
            tray,
            rt.svg,
            wells.map((x, i) => {
                const a = rt.anchors[`well(${i})`];
                return {
                    x: (a?.x ?? 0) * U,
                    y: (a?.y ?? 0) * U,
                    label: `Mixing well ${i + 1}: ${words(x)}`,
                    act: () => dip(i),
                    on: i === well,
                };
            }),
            3 * U,
        );
        swatch.style.background = paintHex();
        swatch.setAttribute("aria-label", `On the brush: ${words(paint)}`);
        swatch.setAttribute("role", "img");
    }

    function pick(p: Pigment): void {
        paint = [{ pigment: p, parts: 1 }];
        fromPan = true;
        well = -1;
        if (tool === "eraser" || tool === "blend" || tool === "dropper") tool = brush;
        refresh();
        say(`${p} on the brush`);
    }

    /** A tap on a well: paint just taken from a pan goes in and is stirred; otherwise the brush takes up the well. */
    function dip(i: number): void {
        const x = paintingValue(wells[i]);
        if (fromPan && paint.length === 1) {
            const p = paintingValue(paint[0]),
                had = x.find((q) => q.pigment === p.pigment);
            if (x.reduce((s, q) => s + q.parts, 0) < 12) {
                if (had) had.parts = Math.min(9, had.parts + 1);
                else x.push({ ...p });
            }
            paint = x.map((q) => ({ ...q }));
            fromPan = false;
            say(`In the well: ${words(x)}`);
        } else if (x.length) {
            paint = x.map((q) => ({ ...q }));
            say(`On the brush: ${words(x)}`);
        } else if (paint.length) {
            x.push(...paint.map((q) => ({ ...q })));
            say(`In the well: ${words(x)}`);
        }
        well = i;
        if (tool === "eraser" || tool === "blend" || tool === "dropper") tool = brush;
        refresh();
    }

    function choose(next: Tool): void {
        tool = next;
        if (next === "pencil" || next === "crayon" || next === "marker" || next === "water")
            brush = next;
        refresh();
        say(TOOLS.find((d) => d.tool === next)?.name ?? next);
    }

    function refresh(): void {
        const hex = recipe();
        TOOLS.forEach((d, i) => {
            const b = paintingValue(toolButtons[i]);
            b.setAttribute("aria-pressed", String(d.tool === tool));
            b.replaceChildren(
                render(
                    artTools,
                    {
                        tools: [d.icon],
                        colours: [d.tool === "eraser" ? "white" : hex],
                        layout: "one",
                        ring: -1,
                    },
                    { host: b, seed: 700 + i * 31 },
                ).svg,
            );
        });
        sizeButtons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === step)));
        stampRow.hidden = tool !== "stamp";
        stampButtons.forEach((b, i) => {
            const s = paintingValue(stampList[i]),
                on = s === stamp;
            b.setAttribute("aria-pressed", String(on));
            b.replaceChildren(stampIcon(s, on && flip, paintHex()));
        });
        stencilRow.hidden = tool !== "stencil";
        holeB.setAttribute("aria-pressed", String(hole));
        holeB.replaceChildren(cardIcon());
        stencilButtons.forEach((b, i) => {
            const s = paintingValue(stencilList[i]),
                on = s === shape;
            b.setAttribute("aria-pressed", String(on));
            b.replaceChildren(stencilIcon(s, hole));
        });
        liftB.hidden = !surface.laid.length;
        mirrorB.replaceChildren(glyph(`mirror-${mirror}`, t));
        mirrorB.setAttribute("aria-pressed", String(mirror !== "none"));
        mirrorB.setAttribute("aria-label", MIRROR_WORDS[mirror]);
        paperB.replaceChildren(glyph(paperKind === "squared" ? "squared" : "plain", t));
        paperB.setAttribute(
            "aria-label",
            paperKind === "squared" ? "Squared paper" : "Plain paper",
        );
        sheet.dataset.tool = tool;
        drawPaints();
        o.onState?.({
            tool,
            step,
            mirror,
            paint,
            fromPan,
            wells,
            stamp,
            flip,
            stencil: shape,
            hole,
        });
    }

    /** The button that chooses a card with a hole over the shape itself: a card with a round hole. */
    function cardIcon(): SVGSVGElement {
        const svg = el("svg", { viewBox: "0 0 100 100", class: "ez-glyph", "aria-hidden": "true" });
        el(
            "rect",
            {
                x: 10,
                y: 14,
                width: 80,
                height: 72,
                rx: 8,
                fill: CARD,
                stroke: t.ink,
                "stroke-width": 4,
            },
            svg,
        );
        el(
            "circle",
            {
                cx: 50,
                cy: 50,
                r: 20,
                fill: t.card,
                stroke: t.ink,
                "stroke-width": 3,
                "stroke-dasharray": "6 5",
            },
            svg,
        );
        return svg;
    }

    /** A stencil's button: the shape itself, or the card with the shape cut out of it. */
    function stencilIcon(s: string, cut: boolean): SVGSVGElement {
        const svg = el("svg", { viewBox: "0 0 100 100", class: "ez-glyph", "aria-hidden": "true" }),
            m = MOTIFS[s];
        const g = el("g", { transform: "translate(18 18) scale(0.64)" }, svg);
        if (cut) {
            el(
                "rect",
                {
                    x: 4,
                    y: 4,
                    width: 92,
                    height: 92,
                    rx: 8,
                    fill: CARD,
                    stroke: t.ink,
                    "stroke-width": 3,
                },
                svg,
            );
            for (const d of m?.fill ?? [])
                el(
                    "path",
                    {
                        d,
                        fill: t.card,
                        stroke: t.ink,
                        "stroke-width": 3,
                        "stroke-dasharray": "6 5",
                    },
                    g,
                );
        } else {
            for (const d of m?.fill ?? [])
                el("path", { d, fill: CARD, stroke: t.ink, "stroke-width": 4 }, g);
        }
        return svg;
    }

    function stampIcon(s: string, flipped: boolean, hex: string): SVGSVGElement {
        const svg = el("svg", { viewBox: "0 0 100 100", class: "ez-glyph", "aria-hidden": "true" });
        const g = el("g", { transform: flipped ? "translate(100 0) scale(-1 1)" : "" }, svg),
            m = MOTIFS[s];
        for (const d of m?.fill ?? []) el("path", { d, fill: hex }, g);
        for (const d of m?.carve ?? [])
            el(
                "path",
                {
                    d,
                    fill: "none",
                    stroke: "#FFFFFF",
                    "stroke-width": m?.width ?? 4,
                    "stroke-linecap": "round",
                },
                g,
            );
        return svg;
    }

    // keys for every tool, from anywhere on the easel
    const keys = (e: KeyboardEvent) => {
        if (
            e.altKey ||
            (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))
        )
            return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
            e.preventDefault();
            undo();
            return;
        }
        if (e.ctrlKey || e.metaKey) return;
        const d = TOOLS.find((x) => x.key === e.key.toLowerCase());
        if (d) {
            choose(d.tool);
            return;
        }
        if (["1", "2", "3"].includes(e.key)) {
            step = Number(e.key) - 1;
            refresh();
            return;
        }
        if (e.key.toLowerCase() === "r") mirrorB.click();
        if (e.key.toLowerCase() === "u") lift();
    };
    for (const host of new Set([o.paper, o.tools, o.paints]))
        host.addEventListener("keydown", keys);
    // arrow keys walk along the toolbar, one tab stop for the whole row
    toolbar.addEventListener("keydown", (e) => {
        const i = toolButtons.indexOf(document.activeElement as HTMLButtonElement);
        if (i < 0) return;
        const d =
            e.key === "ArrowRight" || e.key === "ArrowDown"
                ? 1
                : e.key === "ArrowLeft" || e.key === "ArrowUp"
                  ? -1
                  : 0;
        if (!d) return;
        e.preventDefault();
        paintingValue(toolButtons[(i + d + toolButtons.length) % toolButtons.length]).focus();
    });

    const observer = new ResizeObserver(() => {
        layout();
        drawPaints();
        showCursorIfShown();
    });
    observer.observe(o.paper);
    function showCursorIfShown(): void {
        if (!cursor.hidden) showCursor();
    }

    layout(true);
    drawLines();
    refresh();
    changed();

    return {
        dispose() {
            observer.disconnect();
            clearTimeout(settle);
            cancelAnimationFrame(frame);
            for (const host of new Set([o.paper, o.tools, o.paints]))
                host.removeEventListener("keydown", keys);
        },
        painting,
        select: choose,
        colour(next) {
            paint = next.map((p) => ({ ...p }));
            fromPan = false;
            if (tool === "eraser" || tool === "blend" || tool === "dropper") tool = brush;
            refresh();
        },
        symmetry(next) {
            mirror = next;
            drawLines();
            refresh();
        },
        load(p: Painting) {
            w = p.w;
            h = p.h;
            paperKind = p.paper;
            marks = [...p.marks];
            layout(true);
            drawStencil();
            drawLines();
            refresh();
            changed();
        },
        resize() {
            layout();
            drawPaints();
        },
    };
}
