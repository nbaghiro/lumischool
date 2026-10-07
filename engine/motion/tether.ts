// A sweet on strings, as a cut-the-rope game hangs one: a weight held by ropes from pegs, each rope
// a length the weight may not go past but may come nearer than, so a rope pulls only when it is
// taut and hangs in a sag when it is not. A swipe across a rope cuts it, a puff of air pushes the
// weight by how hard it was blown and how near it is, and a soap bubble that swallows the weight
// floats it upward until it is popped. Pure and serialisable, so a game keeps all of it in its
// state and a test steps it in node. See .docs/engine.md.
import type { Pt } from "./geometry";

/** The weight: where it is and how fast it goes, in squares and squares a second. */
export interface Bob {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

/** A rope from a peg at `ax`, `ay`, `len` squares long, until it is cut. */
export interface Tether {
    ax: number;
    ay: number;
    len: number;
    cut: boolean;
}

/** A soap bubble `r` squares round: free, holding the weight, or popped. */
export interface Bubble {
    x: number;
    y: number;
    r: number;
    held: boolean;
    popped: boolean;
}

/** A puffer at `x`, `y` that blows along `dir` radians, reaching `reach` squares through a cone `spread` radians either side. */
export interface Puffer {
    x: number;
    y: number;
    dir: number;
    reach: number;
    spread: number;
}

export interface Air {
    /** Squares a second squared, downward. */
    g: number;
    /** The share of its speed the weight keeps losing to the air each second. */
    drag: number;
    /** How hard a bubble lifts the weight it holds upward, as a share of the pull down. */
    lift: number;
    /** The share of its speed a weight in a bubble loses each second, so the bubble rises at a steady pace. */
    float: number;
}

/** Steps the weight once: the air, then each taut rope pulling it back to its length. */
export function stepBob(
    b: Bob,
    ropes: readonly Tether[],
    bubble: Bubble | null,
    air: Air,
    dt: number,
): void {
    // a bubble holding the weight rises rather than falls
    const floating = bubble?.held === true && !bubble.popped;
    b.vy += (floating ? -air.lift : 1) * air.g * dt;
    const keep = Math.max(0, 1 - (floating ? air.float : air.drag) * dt);
    b.vx *= keep;
    b.vy *= keep;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    // several ropes pull against each other, so they are settled together a few times over
    for (let k = 0; k < 4; k++)
        for (const t of ropes) {
            if (t.cut) continue;
            const dx = b.x - t.ax,
                dy = b.y - t.ay,
                d = Math.hypot(dx, dy);
            if (d <= t.len || d === 0) continue;
            const nx = dx / d,
                ny = dy / d;
            b.x = t.ax + nx * t.len;
            b.y = t.ay + ny * t.len;
            const out = b.vx * nx + b.vy * ny;
            if (out > 0) {
                b.vx -= out * nx;
                b.vy -= out * ny;
            }
        }
    if (floating) {
        bubble.x = b.x;
        bubble.y = b.y;
    }
}

/** Whether the segments `a`-`b` and `c`-`d` cross. */
export function crosses(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
    const side = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const d1 = side(c, d, a),
        d2 = side(c, d, b),
        d3 = side(a, b, c),
        d4 = side(a, b, d);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Whether a swipe from `a` to `b` cuts a rope that runs from its peg to the weight. */
export const swipeCuts = (a: Pt, b: Pt, t: Tether, bob: Pt): boolean =>
    !t.cut && crosses(a, b, { x: t.ax, y: t.ay }, bob);

/**
 * The push a puff gives the weight, in squares a second: along the puffer's way, as hard as `blow`
 * says from nought to one, falling away with distance, and nothing outside its cone or reach.
 */
export function puffOn(p: Puffer, bob: Pt, blow: number, most: number): Pt {
    const dx = bob.x - p.x,
        dy = bob.y - p.y,
        d = Math.hypot(dx, dy);
    if (d > p.reach || d === 0) return { x: 0, y: 0 };
    let off = Math.atan2(dy, dx) - p.dir;
    while (off > Math.PI) off -= 2 * Math.PI;
    while (off < -Math.PI) off += 2 * Math.PI;
    if (Math.abs(off) > p.spread) return { x: 0, y: 0 };
    const k = most * (0.35 + 0.65 * Math.max(0, Math.min(1, blow))) * (1 - (0.6 * d) / p.reach);
    return { x: Math.cos(p.dir) * k, y: Math.sin(p.dir) * k };
}

/** How far a rope sags at its middle, in squares: none when it is taut, more the slacker it hangs. */
export function sagOf(t: Tether, bob: Pt): number {
    const d = Math.hypot(bob.x - t.ax, bob.y - t.ay);
    return d >= t.len ? 0 : Math.sqrt(t.len * t.len - d * d) / 2;
}
