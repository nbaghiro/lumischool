// The hand the nature drawings share, the animals, the outdoors and the bird hide alike: a closed
// outline through a ring of points, lumps round an ellipse, a blade, a point along a direction, a
// clamp, an eye, a tapered stroke, a spline and a halo. Listed as construction in the catalogue suite.
import { plain, type Ctx } from "../../ink/surface";

export type Pt = [number, number];

/** A closed outline drawn smoothly through a ring of points: a crown, a pond, a cloud. */
export function ring(pts: Pt[]): string {
    const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const first = pts[0] ?? [0, 0],
        last = pts[pts.length - 1] ?? first;
    const start = mid(last, first);
    let d = `M${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i] ?? first,
            m = mid(p, pts[(i + 1) % pts.length] ?? first);
        d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
    }
    return `${d}Z`;
}

/** Points round an ellipse, each pushed in or out by a fixed factor, so the wobble never changes. */
export const lumps = (cx: number, cy: number, rx: number, ry: number, mod: number[]): Pt[] =>
    mod.map((m, i) => {
        const t = (i / mod.length) * Math.PI * 2 - Math.PI / 2;
        return [cx + rx * m * Math.cos(t), cy + ry * m * Math.sin(t)] as Pt;
    });

/**
 * A pointed blade growing from (x, y) towards an angle. A leaflet, a fallen leaf, a leaf on a
 * stem, a petal and a wing are all this shape at different sizes, which is why it lives up here.
 */
export function blade(
    x: number,
    y: number,
    len: number,
    wid: number,
    angle: number,
    steps = 8,
): Pt[] {
    const ca = Math.cos(angle),
        sa = Math.sin(angle);
    const at = (t: number, o: number): Pt => [x + t * ca - o * sa, y + t * sa + o * ca];
    const half = (u: number) => (wid / 2) * Math.sin(Math.PI * Math.pow(u, 0.75));
    const out: Pt[] = [];
    for (let i = 0; i <= steps; i++) out.push(at((i / steps) * len, half(i / steps)));
    for (let i = steps - 1; i >= 1; i--) out.push(at((i / steps) * len, -half(i / steps)));
    return out;
}

/** A point a given distance along a direction: a marking on a wing, the cut edge of a lily pad. */
export const along = (x: number, y: number, t: number, a: number): Pt => [
    x + t * Math.cos(a),
    y + t * Math.sin(a),
];

export const clamp = (n: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, Math.round(n)));

export const eye = <G>(c: Ctx<G>, x: number, y: number, d = 5) =>
    c.pen.circle(
        c.g,
        x,
        y,
        d,
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 0.6 },
    );

/** A stroke that thins along a line of points: an arm, a branch, a root, a leg. */
export function tapered(pts: Pt[], w0: number, w1: number): Pt[] {
    const left: Pt[] = [],
        right: Pt[] = [],
        n = pts.length - 1;
    for (let i = 0; i <= n; i++) {
        const q = pts[i] ?? [0, 0],
            a = pts[Math.max(0, i - 1)] ?? q,
            b = pts[Math.min(n, i + 1)] ?? q;
        const dx = b[0] - a[0],
            dy = b[1] - a[1],
            len = Math.hypot(dx, dy) || 1,
            w = (w0 + (w1 - w0) * (i / Math.max(1, n))) / 2;
        left.push([q[0] - (dy / len) * w, q[1] + (dx / len) * w]);
        right.push([q[0] + (dy / len) * w, q[1] - (dx / len) * w]);
    }
    return [...left, ...right.reverse()];
}

/** Points along a smooth line through every given point (Catmull-Rom), `per` to each stretch. */
export function spline(pts: Pt[], per = 6): Pt[] {
    const out: Pt[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i] ?? [0, 0],
            p0 = pts[Math.max(0, i - 1)] ?? p1,
            p2 = pts[i + 1] ?? p1,
            p3 = pts[Math.min(pts.length - 1, i + 2)] ?? p2;
        for (let k = 0; k < per; k++) {
            const t = k / per,
                t2 = t * t,
                t3 = t2 * t;
            const f = (a: number, b: number, c2: number, d: number) =>
                0.5 *
                (2 * b +
                    (-a + c2) * t +
                    (2 * a - 5 * b + 4 * c2 - d) * t2 +
                    (-a + 3 * b - 3 * c2 + d) * t3);
            out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
    }
    const end = pts[pts.length - 1];
    if (end) out.push(end);
    return out;
}

/** A soft light behind a drawing on screen: a crystal lit, a glow-worm. Paper has no light to give. */
export function halo<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    r: number,
    colour: string,
    opacity = 0.32,
): void {
    if (!c.paper) plain(c, { kind: "circle", cx: x, cy: y, r, fill: colour, opacity });
}
