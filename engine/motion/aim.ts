// Aim and let go: the control a putt, a sling, a shove, a hop or a throw shares. A finger drags back
// from the thing to be launched and lets go, or the arrow keys turn the aim and change the power and
// the big button lets go. Either way the game gets a direction and a strength that vary by degrees,
// and a launch the moment it is let go. Squares and radians, y growing downwards, so an angle of
// nought points right and a positive one points down.
import type { Pt } from "./geometry";
import type { Pad } from "./pad";

export interface AimSpec {
    /** The weakest and strongest launch, in squares a second. */
    min: number;
    max: number;
    /** Squares a second of launch for each square the finger pulls back. */
    per: number;
    /** A pull shorter than this, in squares, is a touch and not an aim, and launches nothing. */
    dead: number;
    /** The directions allowed, in radians; a sling cannot fire backwards into its own frame. */
    lo: number;
    hi: number;
    /** Radians a second a held arrow turns the aim, and squares a second each second it changes the power. */
    turn: number;
    ramp: number;
    /** Which arrows turn the aim: left and right for a putt from above, up and down for a throw seen from the side. */
    turns: "across" | "up";
}

export interface Aim {
    angle: number;
    /** Launch speed in squares a second. */
    power: number;
    /** Whether a finger is pulling now, so a game can draw the band and the preview. */
    pulling: boolean;
}

export const aimAt = (angle: number, power: number): Aim => ({ angle, power, pulling: false });

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The launch velocity an aim stands for. */
export const launchOf = (a: Aim): Pt => ({
    x: Math.cos(a.angle) * a.power,
    y: Math.sin(a.angle) * a.power,
});

/** The aim a pull stands for: the other way from the pull, as strong as it is long. */
export function aimOfPull(pull: Pt, s: AimSpec): Aim {
    const angle = clamp(Math.atan2(-pull.y, -pull.x), s.lo, s.hi);
    return { angle, power: clamp(Math.hypot(pull.x, pull.y) * s.per, s.min, s.max), pulling: true };
}

/**
 * One step of the aim from the pad: a pull turns and sizes it, held arrows turn it and change its
 * power, and letting go (a pull released past the dead zone, or the big button) returns the launch.
 * Returns null while nothing is let go.
 */
export function stepAim(a: Aim, pad: Pad, s: AimSpec, dt: number): Pt | null {
    if (pad.released) {
        a.pulling = false;
        if (Math.hypot(pad.released.x, pad.released.y) < s.dead) return null;
        Object.assign(a, aimOfPull(pad.released, s), { pulling: false });
        return launchOf(a);
    }
    if (pad.pull && Math.hypot(pad.pull.x, pad.pull.y) >= s.dead) {
        Object.assign(a, aimOfPull(pad.pull, s));
        return null;
    }
    a.pulling = false;
    const held = new Set([...pad.holding, ...pad.pressed]);
    const [less, more] =
        s.turns === "across" ? (["left", "right"] as const) : (["up", "down"] as const);
    const [weaker, stronger] =
        s.turns === "across" ? (["down", "up"] as const) : (["left", "right"] as const);
    if (held.has(less)) a.angle = clamp(a.angle - s.turn * dt, s.lo, s.hi);
    if (held.has(more)) a.angle = clamp(a.angle + s.turn * dt, s.lo, s.hi);
    if (held.has(weaker)) a.power = clamp(a.power - s.ramp * dt, s.min, s.max);
    if (held.has(stronger)) a.power = clamp(a.power + s.ramp * dt, s.min, s.max);
    return pad.tapped ? launchOf(a) : null;
}

/** How strong an aim is, from nought at the weakest to one at the strongest, for a gauge. */
export const strength = (a: Aim, s: AimSpec): number =>
    s.max > s.min ? (a.power - s.min) / (s.max - s.min) : 1;

/**
 * How near a launch came, in words a child can use: on it, close, or short or long of it by a little
 * or a lot. `off` is signed along the launch, in squares, and `within` is what counts as on it.
 */
export function nearness(
    off: number,
    within: number,
): "on it" | "close" | "a little short" | "short" | "a little long" | "long" {
    const d = Math.abs(off);
    if (d <= within) return "on it";
    if (d <= within * 2.5) return "close";
    if (off < 0) return d <= within * 6 ? "a little short" : "short";
    return d <= within * 6 ? "a little long" : "long";
}
