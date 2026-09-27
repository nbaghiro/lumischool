// Things that move by themselves along a path: a log the current carries, a dish slid back and forth
// along a counter, a stone that bobs. Where a mover is is a function of the time alone, so a replay, a
// test and the page agree on it without stepping it, and a rider carried on it moves by its velocity.
import type { Pt } from "./geometry";

export interface Path {
    /** The corners it goes through, in squares. */
    points: Pt[];
    /** Squares a second along the path. */
    speed: number;
    /** Round and round, back to the start from the end; or there and back again. */
    mode: "loop" | "bounce";
    /** Seconds into the path at time nought, so two movers on one path are spaced along it. */
    phase?: number;
}

const legs = (p: Path): { a: Pt; b: Pt; length: number }[] => {
    const out: { a: Pt; b: Pt; length: number }[] = [];
    const pts = p.mode === "loop" ? [...p.points, ...p.points.slice(0, 1)] : p.points;
    for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i],
            b = pts[i + 1];
        if (a && b) out.push({ a, b, length: Math.hypot(b.x - a.x, b.y - a.y) });
    }
    return out;
};

/** How long one way along the path is, in squares. */
export const pathLength = (p: Path): number => legs(p).reduce((d, l) => d + l.length, 0);

/** Where a mover is at time `t`, in seconds, and its velocity then. */
export function moverAt(p: Path, t: number): { at: Pt; v: Pt } {
    const first = p.points[0] ?? { x: 0, y: 0 };
    const all = legs(p),
        total = all.reduce((d, l) => d + l.length, 0);
    if (total <= 0 || p.speed <= 0) return { at: { ...first }, v: { x: 0, y: 0 } };
    const run = (t + (p.phase ?? 0)) * p.speed;
    let along: number,
        dir = 1;
    if (p.mode === "loop") along = ((run % total) + total) % total;
    else {
        const lap = ((run % (2 * total)) + 2 * total) % (2 * total);
        along = lap <= total ? lap : 2 * total - lap;
        dir = lap <= total ? 1 : -1;
    }
    for (const l of all) {
        if (along <= l.length || l === all[all.length - 1]) {
            const k = l.length > 0 ? Math.min(1, along / l.length) : 0;
            const ux = l.length > 0 ? (l.b.x - l.a.x) / l.length : 0,
                uy = l.length > 0 ? (l.b.y - l.a.y) / l.length : 0;
            return {
                at: { x: l.a.x + (l.b.x - l.a.x) * k, y: l.a.y + (l.b.y - l.a.y) * k },
                // adding nought turns a negative zero into zero, so a still axis reads as nought
                v: { x: ux * p.speed * dir + 0, y: uy * p.speed * dir + 0 },
            };
        }
        along -= l.length;
    }
    return { at: { ...first }, v: { x: 0, y: 0 } };
}
