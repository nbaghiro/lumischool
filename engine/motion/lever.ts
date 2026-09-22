// A plank on a pivot: the turning effect of the loads along it, the angle it comes to rest at for a
// difference in them, a swing towards that angle, and where a point on the plank is once it has
// turned. Squares, seconds and clockwise radians with y growing downwards, so a plank heavier on the
// right has a positive angle and its right end goes down.
import type { Pt } from "./geometry";

export interface Load {
    mass: number;
    /** Steps out from the pivot, less than nought on the left. */
    at: number;
}

/**
 * The turning effect of every load together, the right side's less the left side's. Whole masses at
 * whole steps give a whole number, so level is a comparison with nought and not a tolerance.
 */
export const turning = (loads: Load[]): number => loads.reduce((t, l) => t + l.mass * l.at, 0);

export interface Lean {
    /** Radians of lean for a difference of one. */
    per: number;
    /** The most it leans either way, where an end meets the ground. */
    most: number;
}

/**
 * The angle a plank rests at for a difference in turning effect. It grows with the square root of
 * the difference, so a difference of one already shows and nearer can be told from further, and it
 * is level only when the difference is nought.
 */
export function lean(difference: number, k: Lean): number {
    if (difference === 0) return 0;
    return Math.sign(difference) * Math.min(k.most, k.per * Math.sqrt(Math.abs(difference)));
}

export interface Tilt {
    angle: number;
    /** Radians a second. */
    spin: number;
}

export interface Springy {
    /** How hard it is pulled towards its resting angle, per second squared for each radian off. */
    stiffness: number;
    /** The share of its spin it loses each second. */
    damping: number;
    /** The stop either way. A swing that reaches it stops there with a little bounce back. */
    most: number;
}

/** One step of `dt` seconds of a plank swinging towards the angle it rests at, so a knock overshoots and settles. */
export function swingTo(t: Tilt, rest: number, dt: number, k: Springy): Tilt {
    const spin = t.spin + (-k.stiffness * (t.angle - rest) - k.damping * t.spin) * dt;
    const angle = t.angle + spin * dt;
    if (Math.abs(angle) > k.most) return { angle: Math.sign(angle) * k.most, spin: -spin * 0.2 };
    return { angle, spin };
}

/** A knock that turns a plank: a load of `mass` landing `at` steps out at `speed` squares a second. */
export const knock = (t: Tilt, mass: number, at: number, speed: number, per: number): Tilt => ({
    angle: t.angle,
    spin: t.spin + per * mass * at * speed,
});

/** Where a point `along` the plank from the pivot and `below` its line is when the plank has turned by `angle`. */
export function onPlank(pivot: Pt, angle: number, along: number, below = 0): Pt {
    const c = Math.cos(angle),
        s = Math.sin(angle);
    return { x: pivot.x + along * c - below * s, y: pivot.y + along * s + below * c };
}
