// Steering, the way Reynolds (1999) set it down for flocks: each behaviour is a velocity a mover
// would like to have, and the mover blends them and turns towards the blend as fast as it can. A
// sheep flees a dog and keeps near the others, a fish noses towards a hook, a dog runs to a finger.
// Everything is in squares and seconds and nothing here keeps state, so a flock stepped from the
// same start is the same flock on every replay.
import type { Pt } from "./geometry";

const ZERO: Pt = { x: 0, y: 0 };

/** Clamped to `most` in length. */
export function clampLength(v: Pt, most: number): Pt {
    const d = Math.hypot(v.x, v.y);
    return d <= most || d === 0 ? v : { x: (v.x / d) * most, y: (v.y / d) * most };
}

/** Straight at a point at `speed`, slowing inside `ease` squares so it arrives rather than overshoots. */
export function arrive(at: Pt, to: Pt, speed: number, ease = 0): Pt {
    const dx = to.x - at.x,
        dy = to.y - at.y,
        d = Math.hypot(dx, dy);
    if (d < 1e-9) return ZERO;
    const k = (ease > 0 && d < ease ? (speed * d) / ease : speed) / d;
    return { x: dx * k, y: dy * k };
}

/** Away from a point: nothing at `reach` squares or further, `speed` on top of it, and in between in step with how near it is. */
export function flee(at: Pt, from: Pt, reach: number, speed: number): Pt {
    const dx = at.x - from.x,
        dy = at.y - from.y,
        d = Math.hypot(dx, dy);
    if (d >= reach) return ZERO;
    if (d < 1e-9) return { x: speed, y: 0 };
    const k = (speed * (reach - d)) / reach / d;
    return { x: dx * k, y: dy * k };
}

/** Away from every neighbour nearer than `near`, harder the closer, at most `speed` in all. */
export function separate(at: Pt, others: readonly Pt[], near: number, speed: number): Pt {
    let x = 0,
        y = 0;
    for (const o of others) {
        const push = flee(at, o, near, speed);
        x += push.x;
        y += push.y;
    }
    return clampLength({ x, y }, speed);
}

/** Towards the middle of the neighbours within `reach`, at up to `speed`, and not at all with none in reach. */
export function cohere(at: Pt, others: readonly Pt[], reach: number, speed: number): Pt {
    let x = 0,
        y = 0,
        n = 0;
    for (const o of others) {
        if (Math.hypot(o.x - at.x, o.y - at.y) > reach) continue;
        x += o.x;
        y += o.y;
        n++;
    }
    return n ? arrive(at, { x: x / n, y: y / n }, speed, reach) : ZERO;
}

/** The mean velocity of the neighbours within `reach`, which a mover leans towards to go with them. */
export function align(
    at: Pt,
    others: readonly { x: number; y: number; vx: number; vy: number }[],
    reach: number,
): Pt {
    let x = 0,
        y = 0,
        n = 0;
    for (const o of others) {
        if (Math.hypot(o.x - at.x, o.y - at.y) > reach) continue;
        x += o.vx;
        y += o.vy;
        n++;
    }
    return n ? { x: x / n, y: y / n } : ZERO;
}

/** A heading that drifts by at most `turn` radians a call, from a seeded generator, so a grazing walk replays. */
export const wander = (heading: number, turn: number, rnd: () => number): number =>
    heading + (rnd() * 2 - 1) * turn;

/**
 * One step of turning from velocity `v` towards `want`: the change is at most `most` long, which is
 * how quickly a mover can change what it is doing (its acceleration times the step).
 */
export function towards(v: Pt, want: Pt, most: number): Pt {
    const d = clampLength({ x: want.x - v.x, y: want.y - v.y }, most);
    return { x: v.x + d.x, y: v.y + d.y };
}

/** Behaviours added with their weights, for a mover that wants several things at once. */
export function blend(parts: readonly (readonly [Pt, number])[]): Pt {
    let x = 0,
        y = 0;
    for (const [v, w] of parts) {
        x += v.x * w;
        y += v.y * w;
    }
    return { x, y };
}
