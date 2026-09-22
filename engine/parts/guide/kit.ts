// Shared parts for the guide designs: a pen that keeps its line weight when the drawing is scaled,
// geometry for aiming a limb or a glance, inked strokes, eyes with a blink frame, and the small
// marks that carry feeling (sparkles, thought dots, the "go again" loop, sleep zeds). Every mark
// goes onto the surface, so a design draws the same on a page and in a test.
import {
    Pen,
    inkOutline,
    starPoints,
    type Fill,
    type Options,
    type PenOptions,
} from "../../ink/pen";
import { group, pattern, plain, type GroupOf, type Surface } from "../../ink/surface";
import type { FillStyle, Level, TokenName } from "../../paper";
import type { GuideCtx, Pt } from "./design";

/**
 * The same seeded pen, with widths, hatch gaps and wobble divided by the display scale. A guide
 * drawn four times larger is then the same character drawn with the same pencil, not a zoom.
 */
export class GuidePen<G> extends Pen<G> {
    private readonly lineK: number;
    private readonly wobK: number;

    constructor(surface: Surface<G>, o: PenOptions, lineK: number, wobK: number) {
        super(surface, o);
        this.lineK = lineK;
        this.wobK = wobK;
    }
    override opt(level: Level = "pencil", extra: Options = {}): Options {
        const b = super.opt(level, extra);
        return {
            ...b,
            strokeWidth: (b.strokeWidth ?? 1.8) * this.lineK,
            fillWeight: (b.fillWeight ?? 1.2) * this.lineK,
            hachureGap: (b.hachureGap ?? 4.5) * this.lineK,
            maxRandomnessOffset: (b.maxRandomnessOffset ?? 2) * this.wobK,
            ...(b.strokeLineDash
                ? { strokeLineDash: b.strokeLineDash.map((v) => v * this.lineK) }
                : {}),
        };
    }
    override fill(
        name?: TokenName | "none" | null,
        style: FillStyle = "solid",
        extra: Options = {},
    ): Fill {
        const f = super.fill(name, style, extra);
        if (!f) return f;
        // A gap tuned for a marker wash on screen hatches almost solid in print, so paper keeps a floor.
        const gap = this.o.paper ? Math.max(f.hachureGap ?? 5, 5) : (f.hachureGap ?? 4.5);
        const weight = this.o.paper ? Math.min(f.fillWeight ?? 0.7, 0.8) : (f.fillWeight ?? 1.2);
        return { ...f, hachureGap: gap * this.lineK, fillWeight: weight * this.lineK };
    }
}

/**
 * Options for a feature small enough that the usual wobble would turn it into a scribble: one
 * stroke instead of two, and a third of the usual wander. Mouths, brows, pupils and hands use it.
 */
export const fine = (extra: Options = {}): Options => ({
    disableMultiStroke: true,
    maxRandomnessOffset: 0.65,
    ...extra,
});

export const polar = (p: Pt, a: number, r: number): Pt => [
    p[0] + r * Math.cos(a),
    p[1] + r * Math.sin(a),
];
export const angleTo = (p: Pt, q: Pt): number => Math.atan2(q[1] - p[1], q[0] - p[0]);
export const mix = (a: Pt, b: Pt, t: number): Pt => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
];
export const dist = (a: Pt, b: Pt): number => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function rotate(p: Pt, o: Pt, a: number): Pt {
    const dx = p[0] - o[0],
        dy = p[1] - o[1],
        c = Math.cos(a),
        s = Math.sin(a);
    return [o[0] + dx * c - dy * s, o[1] + dx * s + dy * c];
}

/** Shortest signed difference between two angles. */
export const angleDiff = (a: number, b: number): number =>
    Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Keep an angle inside [lo, hi], measured the short way round from the middle of the range. */
export function clampAngle(a: number, lo: number, hi: number): number {
    const mid = (lo + hi) / 2,
        half = (hi - lo) / 2,
        d = angleDiff(a, mid);
    return mid + Math.max(-half, Math.min(half, d));
}

/** Blend from one angle toward another by t, the short way round. */
export const towardAngle = (from: number, to: number, t: number): number =>
    from + angleDiff(to, from) * t;

/** How far a pupil moves to look at the aim. Nearby targets move it as far as distant ones. */
export function gaze(eye: Pt, aim: Pt | undefined, r: number, rest: Pt = [0, 0]): Pt {
    if (!aim) return rest;
    const dx = aim[0] - eye[0],
        dy = aim[1] - eye[1],
        L = Math.hypot(dx, dy);
    if (L < 0.5) return rest;
    return [(dx / L) * r, (dy / L) * r];
}

/** A layer of the drawing: a motion class with where it turns and grows from, a turn, or an opacity. */
export const layer = <G>(c: GuideCtx<G>, o: GroupOf = {}): GuideCtx<G> => ({
    ...c,
    g: group(c, o).g,
});

/** A Catmull-Rom curve through the points, sampled densely enough for perfect-freehand. */
export function spline(pts: Pt[], closed = false, steps = 6): Pt[] {
    const n = pts.length;
    if (n < 2) return pts;
    const at = (i: number): Pt =>
        (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]) ?? [0, 0];
    const out: Pt[] = [];
    for (let i = 0; i < (closed ? n : n - 1); i++) {
        const p0 = at(i - 1),
            p1 = at(i),
            p2 = at(i + 1),
            p3 = at(i + 2);
        for (let s = 0; s < steps; s++) {
            const t = s / steps,
                t2 = t * t,
                t3 = t2 * t;
            out.push([
                0.5 *
                    (2 * p1[0] +
                        (-p0[0] + p2[0]) * t +
                        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
                        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 *
                    (2 * p1[1] +
                        (-p0[1] + p2[1]) * t +
                        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
                        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
            ]);
        }
    }
    out.push((closed ? out[0] : pts[n - 1]) ?? [0, 0]);
    return out;
}

/** Move points by a small seeded amount. Called once per boil frame, this is what makes ink boil. */
export const jitter = <G>(c: GuideCtx<G>, pts: Pt[], amp = 0.5): Pt[] =>
    pts.map(
        ([x, y]) =>
            [x + (c.rand() - 0.5) * 2 * amp * c.wob, y + (c.rand() - 0.5) * 2 * amp * c.wob] as Pt,
    );

export interface InkOptions {
    color?: string;
    closed?: boolean;
    /** Tapered ends, as a multiple of the width. 0 keeps the line full width to its ends. */
    taper?: number;
    thinning?: number;
}

/** A pressure stroke through the points, the way a pen with a soft nib draws it. */
export function ink<G>(c: GuideCtx<G>, pts: Pt[], width = 2, o: InkOptions = {}): void {
    const closed = o.closed ?? false;
    const path = spline(pts, closed, 6);
    if (closed) path.push(...spline(pts, true, 6).slice(0, 3));
    const d = inkOutline(path, { size: width * c.line, thinning: o.thinning, taper: o.taper });
    plain(c, { kind: "path", d, fill: o.color ?? c.t.ink });
}

/** A filled shape with a hand-drawn edge, from a closed curve through the points. */
export function blob<G>(c: GuideCtx<G>, pts: Pt[], color: string, opacity = 1): void {
    const path = spline(pts, true, 8);
    const d = `M${path.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}Z`;
    plain(c, { kind: "path", d, fill: color, opacity });
}

/** A limb from shoulder to hand, bent a little so it does not read as a stick. */
export function limb<G>(c: GuideCtx<G>, from: Pt, to: Pt, width = 1.6, bend = 0.16): void {
    const m = mix(from, to, 0.5),
        dx = to[0] - from[0],
        dy = to[1] - from[1];
    c.pen.curve(c.g, [from, [m[0] - dy * bend, m[1] + dx * bend], to], "pencil", {
        strokeWidth: width,
    });
}

/** A round hand at the end of a limb. */
export function hand<G>(c: GuideCtx<G>, p: Pt, d = 4.4): void {
    c.pen.circle(c.g, p[0], p[1], d, "pencil", c.pen.fill("card"), fine({ strokeWidth: 1.3 }));
}

export type EyeMood = "open" | "happy" | "sleep";

/**
 * Open eyes and, behind them, the same eyes closed. CSS swaps the two for a moment, which is how
 * a hand-drawn blink works: a replacement drawing, not a squashed one.
 */
export function blinking<G>(
    c: GuideCtx<G>,
    open: (c: GuideCtx<G>) => void,
    shut: (c: GuideCtx<G>) => void,
): void {
    open(layer(c, { layer: "g-open" }));
    // Hidden by the attribute as well as by CSS, so a guide drawn outside this page still looks right.
    shut(layer(c, { layer: "g-shut", opacity: 0 }));
}

/** Solid eyes that look along `look`. Happy and sleeping eyes are arcs instead. */
export function inkEyes<G>(
    c: GuideCtx<G>,
    eyes: Pt[],
    d: number,
    look: Pt = [0, 0],
    mood: EyeMood = "open",
): void {
    const dark = c.t.ink;
    if (mood === "happy") {
        for (const [x, y] of eyes)
            c.pen.arc(
                c.g,
                x,
                y + d * 0.35,
                d * 1.4,
                d * 1.3,
                Math.PI + 0.3,
                2 * Math.PI - 0.3,
                "pencil",
                fine({ strokeWidth: 1.5 }),
            );
        return;
    }
    if (mood === "sleep") {
        for (const [x, y] of eyes)
            c.pen.arc(
                c.g,
                x,
                y - d * 0.15,
                d * 1.35,
                d,
                0.3,
                Math.PI - 0.3,
                "pencil",
                fine({ strokeWidth: 1.5 }),
            );
        return;
    }
    blinking(
        c,
        (o) => {
            for (const [x, y] of eyes) {
                const p: Pt = [x + look[0], y + look[1]];
                o.pen.circle(
                    o.g,
                    p[0],
                    p[1],
                    d,
                    "ruler",
                    { fill: dark, fillStyle: "solid" },
                    fine({ strokeWidth: 0.6 }),
                );
                if (o.detail !== "tiny" && !o.paper && light(o.t.paper)) {
                    plain(o, {
                        kind: "circle",
                        cx: p[0] - d * 0.19,
                        cy: p[1] - d * 0.21,
                        r: d * 0.17,
                        fill: o.t.card,
                    });
                }
            }
        },
        (s) => {
            for (const [x, y] of eyes)
                s.pen.line(
                    s.g,
                    x - d * 0.65,
                    y + d * 0.1,
                    x + d * 0.65,
                    y + d * 0.1,
                    "pencil",
                    fine({ strokeWidth: 1.4 }),
                );
        },
    );
}

/** True for a light theme. Catchlights only help when the drawing is dark on light paper. */
export function light(color: string): boolean {
    const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
    if (!m?.[1]) return true;
    const n = parseInt(m[1], 16);
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.5;
}

export type MouthKind = "smile" | "grin" | "flat" | "small";

export function mouth<G>(c: GuideCtx<G>, x: number, y: number, kind: MouthKind, w = 7): void {
    if (kind === "grin") {
        c.pen.path(
            c.g,
            `M${x - w / 2} ${y - 1}Q${x} ${y + w * 0.85} ${x + w / 2} ${y - 1}Z`,
            "pencil",
            { fill: c.t.ink, fillStyle: "solid" },
            fine({ strokeWidth: 1.2 }),
        );
    } else if (kind === "flat") {
        c.pen.line(
            c.g,
            x - w * 0.35,
            y + 0.4,
            x + w * 0.35,
            y - 0.4,
            "pencil",
            fine({ strokeWidth: 1.4 }),
        );
    } else {
        const s = kind === "small" ? 0.6 : 1;
        c.pen.arc(
            c.g,
            x,
            y - w * 0.25 * s,
            w * s,
            w * 0.6 * s,
            0.35,
            Math.PI - 0.35,
            "pencil",
            fine({ strokeWidth: 1.4 }),
        );
    }
}

/** Raised brows. They are what turns "try again" from telling off into encouragement. */
export function brows<G>(c: GuideCtx<G>, eyes: Pt[], d: number, lift: number[], arch = 0.45): void {
    eyes.forEach(([x, y], i) => {
        const h = lift[i] ?? lift[0] ?? 0;
        if (h <= 0) return;
        c.pen.arc(
            c.g,
            x,
            y - d * 0.9 - h,
            d * 1.7,
            d * 1.1 * arch * 2,
            Math.PI + 0.2,
            2 * Math.PI - 0.2,
            "pencil",
            fine({ strokeWidth: 1.2 }),
        );
    });
}

/** A soft glow. Screen only: on paper there is nothing behind the ink for it to sit on. */
export function halo<G>(c: GuideCtx<G>, at: Pt, d: number, opacity = 0.42): void {
    if (c.paper) return;
    const fill = pattern(c, {
        kind: "radial",
        stops: [
            { at: 0, color: c.t.glow, opacity },
            { at: 45, color: c.t.glow, opacity: opacity * 0.55 },
            { at: 100, color: c.t.glow, opacity: 0 },
        ],
    });
    plain(c, { kind: "circle", cx: at[0], cy: at[1], r: d / 2, fill });
}

/** A white patch under a face that sits on a hatched fill, so print does not swallow it. */
export function clearFace<G>(c: GuideCtx<G>, at: Pt, w: number, h: number): void {
    if (!c.paper) return;
    plain(c, { kind: "ellipse", cx: at[0], cy: at[1], rx: w / 2, ry: h / 2, fill: c.t.card });
}

export function sparkle<G>(c: GuideCtx<G>, x: number, y: number, r = 5): void {
    c.pen.polygon(c.g, starPoints(x, y, r, 4, 0.36), "pencil", c.pen.fill("glow"), {
        strokeWidth: 1.1,
    });
}

/** Sleep zeds, drifting up when motion is on. */
export function zeds<G>(c: GuideCtx<G>, x: number, y: number, s = 6): void {
    const z = layer(c, { layer: "g-z" });
    const col = c.detail === "tiny" ? c.t.ink : c.t["ink-soft"];
    const one = (px: number, py: number, ps: number) =>
        z.pen.linear(
            z.g,
            [
                [px, py],
                [px + ps, py],
                [px, py + ps],
                [px + ps, py + ps],
            ],
            "pencil",
            { stroke: col, strokeWidth: 1.3 },
        );
    one(x, y, s);
    one(x + s * 1.35, y - s * 1.4, s * 0.68);
}

/** Three dots going up, for thinking. */
export function thought<G>(c: GuideCtx<G>, x: number, y: number): void {
    const col = c.t["ink-soft"];
    const dots: [number, number, number][] = [
        [0, 0, 2.4],
        [4, -4.2, 3.2],
        [9.2, -9, 4.2],
    ];
    dots.forEach(([dx, dy, d]) =>
        c.pen.circle(
            c.g,
            x + dx,
            y + dy,
            d,
            "pencil",
            { fill: col, fillStyle: "solid" },
            { strokeWidth: 0.7, stroke: col },
        ),
    );
}

/** The "go again" loop, in the teacher's ballpoint, the same ink as the marks on a page. */
export function again<G>(c: GuideCtx<G>, cx: number, cy: number, r = 6): void {
    const col = c.t.pen,
        a0 = -Math.PI / 2 + 0.55,
        a1 = a0 + Math.PI * 1.5;
    c.pen.arc(c.g, cx, cy, r * 2, r * 2, a0, a1, "pencil", { stroke: col, strokeWidth: 1.5 });
    const e = polar([cx, cy], a1, r),
        dir = a1 + Math.PI / 2;
    for (const s of [-1, 1]) {
        const h = polar(e, dir + Math.PI + s * 0.55, r * 0.75);
        c.pen.line(c.g, e[0], e[1], h[0], h[1], "pencil", { stroke: col, strokeWidth: 1.5 });
    }
}

/** Speed lines under something that just jumped. */
export function hop<G>(c: GuideCtx<G>, x: number, y: number, w = 14): void {
    const col = c.t["ink-soft"];
    for (const dx of [-w / 2, 0, w / 2])
        c.pen.line(c.g, x + dx, y, x + dx * 1.15, y + 4.5, "pencil", {
            stroke: col,
            strokeWidth: 1.2,
        });
}

/**
 * Tally ticks leading away from the hand toward what is being counted, in the teacher's ballpoint.
 * They start at the hand rather than at the target, so they are not clipped when the guide is
 * three squares wide in a lesson and the target is across the page.
 */
export function tapMarks<G>(c: GuideCtx<G>, from: Pt, aim: Pt | undefined, n = 3): void {
    const a = aim ? angleTo(from, aim) : 0;
    const col = c.t.pen,
        nx = -Math.sin(a),
        ny = Math.cos(a);
    // The ticks sit in the gap between the hand and the target, so they stay in the gap when the
    // target is close (the hand design reaches nearly all the way to it) as well as when it is far.
    const gap = aim ? dist(from, aim) : 40;
    const step = Math.max(3.2, Math.min(5.2, gap / 4.5));
    const start = Math.max(3.8, Math.min(6.5, gap * 0.24));
    for (let i = 0; i < n; i++) {
        const p = polar(from, a, start + i * step),
            r = 2.3 + i * 0.5;
        c.pen.line(
            c.g,
            p[0] - nx * r,
            p[1] - ny * r,
            p[0] + nx * r,
            p[1] + ny * r,
            "pencil",
            fine({ stroke: col, strokeWidth: 1.2 + i * 0.2 }),
        );
    }
}

/**
 * A nib at the hand and the line it writes on, for the pose that means "your answer goes here".
 * On paper this is the mark the arrow to the writing line replaces.
 */
export function writeMarks<G>(c: GuideCtx<G>, from: Pt, aim: Pt | undefined): void {
    const a = aim ? angleTo(from, aim) : 0;
    const col = c.t.pen;
    // A nib along the reach, and under it the line it writes on. The line stays level whatever the
    // direction of the reach, because a writing line on a page is level.
    const tip = polar(from, a, 9);
    c.pen.polygon(
        c.g,
        [polar(from, a - 0.5, 5.5), tip, polar(from, a + 0.5, 5.5)],
        "pencil",
        { fill: col, fillStyle: "solid" },
        fine({ stroke: col, strokeWidth: 0.9 }),
    );
    c.pen.line(
        c.g,
        ...polar(from, a, 4.5),
        ...polar(from, a, 8),
        "pencil",
        fine({ stroke: c.t.card, strokeWidth: 0.8 }),
    );
    const dir = aim && aim[0] < from[0] ? -1 : 1;
    const y = tip[1] + 5.5;
    c.pen.line(
        c.g,
        tip[0] - dir * 3,
        y,
        tip[0] + dir * 14,
        y,
        "pencil",
        fine({ stroke: col, strokeWidth: 1.6 }),
    );
    c.pen.line(
        c.g,
        tip[0] + dir * 14,
        y,
        tip[0] + dir * 12,
        y - 2.4,
        "pencil",
        fine({ stroke: col, strokeWidth: 1.2 }),
    );
}

/** Two small arcs beside a waving hand. */
export function waveMarks<G>(c: GuideCtx<G>, p: Pt, a: number): void {
    const col = c.t["ink-soft"];
    for (const r of [5.5, 8.5])
        c.pen.arc(c.g, p[0], p[1], r * 2, r * 2, a - 0.5, a + 0.5, "pencil", {
            stroke: col,
            strokeWidth: 1.1,
        });
}

/** Mirror a drawing that has a front and a back, so it faces the other way. */
export const MIRROR = [["matrix", -1, 0, 0, 1, 60, 0]] as const;
export const mirrorPt = (p: Pt): Pt => [60 - p[0], p[1]];
