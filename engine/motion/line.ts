// A line that hangs and pulls like a line: a fishing line from a rod's tip to a float, a rope from a
// crane to its hook. It is a chain of points a set length apart, stepped by where each was and is
// (Verlet), pulled down by gravity and slowed a little by the air or the water, with both ends held
// where the game says they are. Slack, it sags; paid out shorter than the gap between its ends, it is
// taut, and how taut is how far the ends are apart over its length. Squares and seconds, y down.
import type { Pt } from "./geometry";

export interface Line {
    pts: Pt[];
    /** Where each point was a step ago. */
    was: Pt[];
    /** The line's whole length, in squares; the points are spaced evenly along it. */
    length: number;
}

/** A line of `n` points laid straight from `a` to `b`, `length` long. */
export function line(a: Pt, b: Pt, length: number, n = 12): Line {
    const pts = Array.from({ length: n }, (_, i) => ({
        x: a.x + ((b.x - a.x) * i) / (n - 1),
        y: a.y + ((b.y - a.y) * i) / (n - 1),
    }));
    return { pts, was: pts.map((p) => ({ ...p })), length };
}

/**
 * One step of `dt` seconds with the ends held at `a` and `b`: each point carries on as it was going,
 * less `drag` of it each second, falls by `g`, and then the spacing is put right `iterations` times,
 * which only ever pulls points closer, so a slack line sags and hangs rather than stretching.
 */
export function stepLine(
    l: Line,
    a: Pt,
    b: Pt,
    o: { g: number; dt: number; drag?: number; iterations?: number },
): void {
    const keep = Math.max(0, 1 - (o.drag ?? 1.5) * o.dt),
        n = l.pts.length;
    for (let i = 1; i < n - 1; i++) {
        const p = l.pts[i],
            w = l.was[i];
        if (!p || !w) continue;
        const vx = (p.x - w.x) * keep,
            vy = (p.y - w.y) * keep;
        l.was[i] = { ...p };
        l.pts[i] = { x: p.x + vx, y: p.y + vy + o.g * o.dt * o.dt };
    }
    const first = l.pts[0],
        last = l.pts[n - 1];
    if (first) l.was[0] = { ...first };
    if (last) l.was[n - 1] = { ...last };
    l.pts[0] = { ...a };
    l.pts[n - 1] = { ...b };
    const seg = l.length / (n - 1);
    for (let k = 0; k < (o.iterations ?? 12); k++)
        for (let i = 0; i + 1 < n; i++) {
            const p = l.pts[i],
                q = l.pts[i + 1];
            if (!p || !q) continue;
            const dx = q.x - p.x,
                dy = q.y - p.y,
                d = Math.hypot(dx, dy);
            if (d <= seg || d < 1e-9) continue;
            const over = (d - seg) / d;
            // the held ends do not move; a point between two free ones takes half of the correction
            const pa = i === 0 ? 0 : i + 1 === n - 1 ? 1 : 0.5,
                qa = i + 1 === n - 1 ? 0 : i === 0 ? 1 : 0.5;
            l.pts[i] = { x: p.x + dx * over * pa, y: p.y + dy * over * pa };
            l.pts[i + 1] = { x: q.x - dx * over * qa, y: q.y - dy * over * qa };
        }
}

/**
 * How taut a line is, from nought when its ends are no further apart than half its length to one
 * when they are as far apart as it is long, and more than one when they are pulled further.
 */
export function taut(l: Line): number {
    const a = l.pts[0],
        b = l.pts[l.pts.length - 1];
    if (!a || !b || l.length <= 0) return 0;
    return Math.max(0, (Math.hypot(b.x - a.x, b.y - a.y) / l.length - 0.5) * 2);
}
