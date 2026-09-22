// A carried thing's sway. A jug held by its handle or a ball held from above hangs from the hand as
// a pendulum does: it leans back when the hand sets off, swings past upright when the hand stops,
// and settles. It is stepped from the hand's acceleration across, in squares and seconds, and the
// angle is clockwise radians, as the page turns a drawing, so a hand setting off to the right tips
// the bottom of the thing to the left.

export interface Sway {
    /** Clockwise radians from hanging straight. */
    angle: number;
    /** Radians a second. */
    spin: number;
}

export interface Swing {
    /** Squares from where it is held to where its weight is. A longer thing swings slower. */
    length: number;
    /** Squares a second each second. */
    g: number;
    /** The share of its spin it loses each second. */
    damping: number;
    /** The most it leans either way, in radians, so a flung thing never turns over. */
    most: number;
}

export const HANGING: Sway = { angle: 0, spin: 0 };

/** One step of `dt` seconds with the hand accelerating across at `accel` squares a second each second. */
export function sway(s: Sway, accel: number, dt: number, k: Swing): Sway {
    const turn =
        (-k.g * Math.sin(s.angle) + accel * Math.cos(s.angle)) / k.length - k.damping * s.spin;
    const spin = s.spin + turn * dt;
    const angle = s.angle + spin * dt;
    if (Math.abs(angle) > k.most) return { angle: Math.sign(angle) * k.most, spin: 0 };
    return { angle, spin };
}
