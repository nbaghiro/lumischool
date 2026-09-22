import { getStroke } from "perfect-freehand";
import rough from "roughjs";
import type {
    Drawable,
    OpSetType,
    Options as RoughOptions,
    ResolvedOptions,
} from "roughjs/bin/core";
import {
    HATCH,
    LEVELS,
    U,
    type FillStyle,
    type Level,
    type TokenName,
    type Tokens,
} from "../paper";
import type { Side, Surface, Trace } from "./surface";

export interface PenOptions {
    /** Object seed. Stored with the scene, so screen, replay and print draw the same strokes. */
    seed: number;
    t: Tokens;
    /** Paper output: black on white, colour fills become hatching. */
    paper: boolean;
    /** Multiplier on every level's roughness and bowing. */
    roughness: number;
}

/** rough.js's options, and an opacity for the shape's group, as a guide's halo or beam is laid over the page. */
export type Options = RoughOptions & { opacity?: number };
export type Fill = Options | null;
type Pt = [number, number];

export type Tool = "pencil" | "marker" | "highlighter";

/**
 * A stroke with pressure, as the drawing pad saves it, and the form strokes captured elsewhere
 * (Excalidraw freedraw, tldraw, PencilKit, Grease Pencil) are brought into.
 */
export interface Stroke {
    tool: Tool;
    color: TokenName;
    /** Nib size in user units. */
    size: number;
    /** [x, y, pressure] with x and y in squares, pressure 0..1 (omit to simulate). */
    points: [number, number, number?][];
}

export interface StrokeAsset {
    kind: "strokes";
    name: string;
    box: { w: number; h: number };
    strokes: Stroke[];
    anchors?: Record<string, { x: number; y: number; side?: Side }>;
}

const TOOL: Record<
    Tool,
    { thinning: number; smoothing: number; streamline: number; opacity: number }
> = {
    pencil: { thinning: 0.55, smoothing: 0.5, streamline: 0.45, opacity: 1 },
    marker: { thinning: 0.15, smoothing: 0.6, streamline: 0.5, opacity: 0.95 },
    highlighter: { thinning: 0, smoothing: 0.7, streamline: 0.6, opacity: 0.55 },
};

const mix = (seed: number, n: number): number => ((seed * 9301 + n * 49297) % 233280) + 1;

/**
 * rough.js seeds every stroke from the options it is given, except the dot filler, which calls
 * Math.random, so a dotted fill (the glow on paper) came out different on every render. This runs
 * work with Math.random seeded, the same Lehmer step rough.js uses for its own randomizer.
 */
export function withSeededRandom<T>(seed: number, work: () => T): T {
    const random = Math.random;
    let s = Math.max(1, Math.floor(Math.abs(seed)) % 0x7fffffff);
    Math.random = () => {
        s = Math.imul(48271, s) & 0x7fffffff;
        return s / 0x80000000;
    };
    try {
        return work();
    } finally {
        Math.random = random;
    }
}

const dashes = (
    dash: number[] | undefined,
    offset: number | undefined,
): Pick<Trace, "dash" | "dashOffset"> => ({
    ...(dash ? { dash: dash.join(" ").trim() } : {}),
    ...(offset ? { dashOffset: offset } : {}),
});

const evenOdd = (shape: string): Pick<Trace, "fillRule"> =>
    shape === "curve" || shape === "polygon" ? { fillRule: "evenodd" } : {};

/** Each kind of set as rough.js's own SVG renderer paints it, so a surface gets what it drew. */
const TRACE: Record<OpSetType, (d: string, o: ResolvedOptions, shape: string) => Trace> = {
    path: (d, o) => ({
        d,
        stroke: o.stroke,
        strokeWidth: o.strokeWidth,
        fill: "none",
        ...dashes(o.strokeLineDash, o.strokeLineDashOffset),
    }),
    fillPath: (d, o, shape) => ({
        d,
        stroke: "none",
        strokeWidth: 0,
        fill: o.fill ?? "",
        ...evenOdd(shape),
    }),
    fillSketch: (d, o) => ({
        d,
        stroke: o.fill ?? "",
        strokeWidth: o.fillWeight < 0 ? o.strokeWidth / 2 : o.fillWeight,
        fill: "none",
        ...dashes(o.fillLineDash, o.fillLineDashOffset),
    }),
};

/** Average-of-points quadratic path, as the perfect-freehand README recommends. */
export function outlineToPath(pts: readonly (readonly number[])[]): string {
    if (pts.length < 4) return "";
    const x = (i: number): number => pts[i]?.[0] ?? 0;
    const y = (i: number): number => pts[i]?.[1] ?? 0;
    const mid = (i: number, at: (i: number) => number): string =>
        ((at(i) + at(i + 1)) / 2).toFixed(2);
    let d = `M${x(0).toFixed(2)},${y(0).toFixed(2)} Q${x(1).toFixed(2)},${y(1).toFixed(2)} ${mid(1, x)},${mid(1, y)} T`;
    for (let i = 2; i < pts.length - 1; i++) d += `${mid(i, x)},${mid(i, y)} `;
    return `${d}Z`;
}

/**
 * The outline of a pressure stroke through points already sampled, tapered at both ends, the way a
 * guide's ink is drawn: `size` in user units, `taper` as a multiple of it, and `thinning` how much
 * the pressure narrows it.
 */
export function inkOutline(
    pts: Pt[],
    o: { size: number; thinning?: number; taper?: number },
): string {
    const taper = o.size * (o.taper ?? 2.5);
    const outline = getStroke(pts, {
        size: o.size,
        thinning: o.thinning ?? 0.5,
        smoothing: 0.6,
        streamline: 0.25,
        simulatePressure: true,
        start: { taper },
        end: { taper },
        last: true,
    });
    return outlineToPath(outline);
}

/** The outline perfect-freehand draws round a stroke, as a path, and its tool's opacity. */
export function strokeOutline(s: Stroke, scale = U): { d: string; opacity: number } {
    const k = TOOL[s.tool];
    const hasPressure = s.points.some((p) => p[2] !== undefined);
    const pts = s.points.map(([x, y, p]) => [x * scale, y * scale, p ?? 0.5]);
    const outline = getStroke(pts, {
        size: s.size,
        thinning: k.thinning,
        smoothing: k.smoothing,
        streamline: k.streamline,
        simulatePressure: !hasPressure,
    });
    return { d: outlineToPath(outline), opacity: k.opacity };
}

export function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
    const k = Math.min(r, w / 2, h / 2);
    return (
        `M${x + k} ${y}H${x + w - k}Q${x + w} ${y} ${x + w} ${y + k}V${y + h - k}Q${x + w} ${y + h} ${x + w - k} ${y + h}` +
        `H${x + k}Q${x} ${y + h} ${x} ${y + h - k}V${y + k}Q${x} ${y} ${x + k} ${y}Z`
    );
}

export function starPoints(
    cx: number,
    cy: number,
    r: number,
    points = 5,
    inner = 0.45,
): [number, number][] {
    const out: [number, number][] = [];
    for (let i = 0; i < points * 2; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / points;
        const rr = i % 2 ? r * inner : r;
        out.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    return out;
}

/** Small deterministic PRNG (mulberry32) for layout jitter that must not change between renders. */
export function rng(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * A seeded hand bound to one object's seed, drawing onto a surface. Calls are numbered, so drawing
 * the same object in the same order always gives the same strokes. Fill and outline are separate
 * shapes with one seed, so an outline is identical on screen and on paper even though the fill
 * changes. `G` is a group on the surface.
 */
export class Pen<G> {
    readonly o: PenOptions;
    /** Where it draws, which lettering and plain shapes use too when a drawing is handed no other surface. */
    readonly ink: Surface<G>;
    private readonly gen = rough.generator();
    private n = 0;

    constructor(surface: Surface<G>, o: PenOptions) {
        this.ink = surface;
        this.o = o;
    }

    get t(): Tokens {
        return this.o.t;
    }

    opt(level: Level = "pencil", extra: Options = {}): Options {
        const l = LEVELS[level];
        this.n += 1;
        return {
            seed: mix(this.o.seed, this.n),
            roughness: l.roughness * this.o.roughness,
            bowing: l.bowing * this.o.roughness,
            stroke: this.o.t.ink,
            strokeWidth: 1.8,
            fillWeight: 1.2,
            hachureGap: 4.5,
            ...extra,
        };
    }

    /** A fill named by token. On paper it becomes hatching at that colour's angle. */
    fill(name?: TokenName | "none" | null, style: FillStyle = "solid", extra: Options = {}): Fill {
        if (!name || name === "none") return null;
        if (this.o.paper) {
            if (name === "card" || name === "paper")
                return { fill: this.o.t.card, fillStyle: "solid" };
            const h = HATCH[name] ?? {};
            return {
                fill: this.o.t.ink,
                fillStyle: h.style ?? "hachure",
                hachureAngle: h.angle ?? -41,
                hachureGap: 5,
                fillWeight: h.style === "dots" ? 1.3 : 0.7,
                ...extra,
            };
        }
        return { fill: this.o.t[name], fillStyle: style, ...extra };
    }

    rect(
        p: G,
        x: number,
        y: number,
        w: number,
        h: number,
        level: Level = "pencil",
        fill: Fill = null,
        extra: Options = {},
    ): void {
        this.filled(p, (o) => this.gen.rectangle(x, y, w, h, o), level, fill, extra);
    }

    circle(
        p: G,
        cx: number,
        cy: number,
        d: number,
        level: Level = "pencil",
        fill: Fill = null,
        extra: Options = {},
    ): void {
        this.filled(p, (o) => this.gen.circle(cx, cy, d, o), level, fill, extra);
    }

    ellipse(
        p: G,
        cx: number,
        cy: number,
        w: number,
        h: number,
        level: Level = "pencil",
        fill: Fill = null,
        extra: Options = {},
    ): void {
        this.filled(p, (o) => this.gen.ellipse(cx, cy, w, h, o), level, fill, extra);
    }

    polygon(
        p: G,
        pts: Pt[],
        level: Level = "pencil",
        fill: Fill = null,
        extra: Options = {},
    ): void {
        this.filled(p, (o) => this.gen.polygon(pts, o), level, fill, extra);
    }

    path(p: G, d: string, level: Level = "pencil", fill: Fill = null, extra: Options = {}): void {
        this.filled(p, (o) => this.gen.path(d, o), level, fill, extra);
    }

    line(
        p: G,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        level: Level = "pencil",
        extra: Options = {},
    ): void {
        this.shape(p, this.opt(level, extra), (o) => this.gen.line(x1, y1, x2, y2, o));
    }

    linear(p: G, pts: Pt[], level: Level = "pencil", extra: Options = {}): void {
        this.shape(p, this.opt(level, extra), (o) => this.gen.linearPath(pts, o));
    }

    curve(p: G, pts: Pt[], level: Level = "pencil", extra: Options = {}): void {
        this.shape(p, this.opt(level, extra), (o) => this.gen.curve(pts, o));
    }

    arc(
        p: G,
        cx: number,
        cy: number,
        w: number,
        h: number,
        start: number,
        stop: number,
        level: Level = "pencil",
        extra: Options = {},
    ): void {
        this.shape(p, this.opt(level, extra), (o) =>
            this.gen.arc(cx, cy, w, h, start, stop, false, o),
        );
    }

    /** Pencil arrow from p to q with a slight bend and a two-stroke head. */
    arrow(parent: G, p: Pt, q: Pt, color = this.o.t.pen, bendRatio = 0.16, gap = 5): void {
        const dx = q[0] - p[0];
        const dy = q[1] - p[1];
        const L = Math.hypot(dx, dy) || 1;
        const ux = dx / L;
        const uy = dy / L;
        const p1: Pt = [p[0] + ux * gap, p[1] + uy * gap];
        const q1: Pt = [q[0] - ux * gap, q[1] - uy * gap];
        const bend = bendRatio * L * (dx > 0 ? -1 : 1);
        const c: Pt = [(p1[0] + q1[0]) / 2 - uy * bend, (p1[1] + q1[1]) / 2 + ux * bend];
        this.curve(parent, [p1, c, q1], "pencil", { stroke: color, strokeWidth: 2 });
        const a = Math.atan2(q1[1] - c[1], q1[0] - c[0]);
        for (const s of [-1, 1]) {
            const b = a + Math.PI + s * 0.45;
            const head: Pt = [q1[0] + 11 * Math.cos(b), q1[1] + 11 * Math.sin(b)];
            this.line(parent, q1[0], q1[1], head[0], head[1], "pencil", {
                stroke: color,
                strokeWidth: 2,
            });
        }
    }

    /**
     * A stroke with pressure, in its own colour on screen. On paper a pencil stroke is ink and a
     * marker or a highlighter is a grey, as a colour fill becomes hatching.
     */
    stroke(p: G, s: Stroke): void {
        const { t, paper } = this.o;
        const colour = !paper
            ? t[s.color]
            : s.tool === "highlighter"
              ? "#D6D6D6"
              : s.tool === "marker"
                ? "#C8C8C8"
                : t.ink;
        const { d, opacity } = strokeOutline(s);
        this.ink.outline(p, d, colour, opacity);
    }

    private filled(
        parent: G,
        make: (o: Options) => Drawable,
        level: Level,
        fill: Fill,
        extra: Options,
    ): void {
        const base = this.opt(level, extra);
        if (fill) this.shape(parent, { ...base, ...fill, stroke: "none" }, make);
        this.shape(parent, base, make);
    }

    private shape(parent: G, o: Options, make: (o: Options) => Drawable): void {
        const { opacity, ...rough } = o;
        const drawable = withSeededRandom(o.seed ?? 1, () => make(rough));
        const { options, shape } = drawable;
        const traces = drawable.sets.map((set) =>
            TRACE[set.type](
                this.gen.opsToPath(set, options.fixedDecimalPlaceDigits),
                options,
                shape,
            ),
        );
        this.ink.shape(parent, traces, opacity);
    }
}
