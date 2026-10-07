// A shoal in a box of water: fish that keep apart, keep together and swim the way their own kind
// swims (Reynolds' boids, from the behaviours in steer.ts), turn back before the glass, and wander
// on a heading worked out from the clock and their place in the shoal rather than from chance, so a
// tank stepped from the same start is the same tank. Squares and seconds, y down.
import type { Pt } from "./geometry";
import { align, blend, clampLength, cohere, separate, towards } from "./steer";

export interface Swimmer {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Fish of one kind shoal together; the others are only kept clear of. */
    kind: number | string;
}

/** The water a shoal swims in: its left, top, right and bottom, in squares. */
export interface Bounds {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

export interface ShoalFeel {
    /** How far a fish sees its own kind, and how near any fish may come before it is kept clear of. */
    reach: number;
    apart: number;
    /** The pace a fish settles at, and the fastest it goes, in squares a second. */
    cruise: number;
    most: number;
    /** How quickly a fish can change its velocity, in squares a second each second. */
    turn: number;
    /** How near the glass a fish turns back, in squares. */
    margin: number;
    /** How much each wish counts in the blend. */
    weights: { apart: number; together: number; along: number; wall: number; wander: number };
}

const ZERO: Pt = { x: 0, y: 0 };

/** Back from the glass: nothing further than `margin` from it, and harder the nearer. */
export function wallsOf(p: Pt, b: Bounds, margin: number, speed: number): Pt {
    const push = (d: number) => (d >= margin ? 0 : (speed * (margin - Math.max(0, d))) / margin);
    return {
        x: push(p.x - b.x0) - push(b.x1 - p.x),
        y: push(p.y - b.y0) - push(b.y1 - p.y),
    };
}

/**
 * A heading that drifts with the clock, different for each fish by `n`: a sum of two slow waves, so
 * a fish meanders without ever drawing on chance.
 */
export function meander(n: number, t: number, speed: number): Pt {
    const a = 1.7 * Math.sin(0.37 * t + n * 2.39) + 0.9 * Math.sin(0.83 * t + n * 1.31);
    return { x: Math.cos(a) * speed, y: Math.sin(a) * speed * 0.45 };
}

/**
 * The velocity fish `i` would like, from its shoal-mates of the same kind, everyone near it, the
 * glass and its meander, plus whatever else the game wants of it (`extra`, a velocity of its own:
 * food to dart to, a net to flee).
 */
export function shoalWant(
    all: readonly Swimmer[],
    i: number,
    b: Bounds,
    feel: ShoalFeel,
    t: number,
    extra: Pt = ZERO,
): Pt {
    const me = all[i];
    if (!me) return ZERO;
    const mates: Swimmer[] = [],
        near: Pt[] = [];
    for (const [j, o] of all.entries()) {
        if (j === i) continue;
        if (Math.abs(o.x - me.x) > feel.reach || Math.abs(o.y - me.y) > feel.reach) continue;
        near.push(o);
        if (o.kind === me.kind) mates.push(o);
    }
    const w = feel.weights;
    const want = blend([
        [separate(me, near, feel.apart, feel.most * 0.5), w.apart],
        [cohere(me, mates, feel.reach, feel.cruise), w.together],
        [align(me, mates, feel.reach), w.along],
        [wallsOf(me, b, feel.margin, feel.most), w.wall],
        [meander(i, t, feel.cruise), mates.length ? w.wander * 0.5 : w.wander],
        [extra, 1],
    ]);
    return clampLength(want, feel.most);
}

/** Turns a fish towards `want` as fast as it can, moves it on and keeps it inside the water. */
export function swim(f: Swimmer, want: Pt, b: Bounds, feel: ShoalFeel, dt: number): void {
    const v = clampLength(towards({ x: f.vx, y: f.vy }, want, feel.turn * dt), feel.most);
    f.vx = v.x;
    f.vy = v.y;
    f.x = Math.max(b.x0, Math.min(b.x1, f.x + f.vx * dt));
    f.y = Math.max(b.y0, Math.min(b.y1, f.y + f.vy * dt));
    if (f.x === b.x0 || f.x === b.x1) f.vx *= -0.3;
    if (f.y === b.y0 || f.y === b.y1) f.vy *= -0.3;
}

/** How tightly a kind keeps together: the mean distance from each fish to the middle of its kind. */
export function spreadOf(all: readonly Swimmer[], kind: number): number {
    const own = all.filter((f) => f.kind === kind);
    if (own.length < 2) return 0;
    const mx = own.reduce((a, f) => a + f.x, 0) / own.length,
        my = own.reduce((a, f) => a + f.y, 0) / own.length;
    return own.reduce((a, f) => a + Math.hypot(f.x - mx, f.y - my), 0) / own.length;
}
