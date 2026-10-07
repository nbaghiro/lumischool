// A hand net swept through water, and how a fish takes it: a net moved slowly and smoothly is not
// noticed, so a fish in its mouth is caught, while a fast, splashy one alarms every fish near it by
// degrees and they dart away before it reaches them. The net's speed is smoothed over a few steps,
// so a jerk is splashy and a steady sweep is calm. Squares and seconds.
import type { Pt } from "./geometry";

export interface NetFeel {
    /** The net's mouth, in squares across its middle. */
    r: number;
    /** Below `calm` a fish ignores the net; at `splashy` and over it is as alarmed as it gets. Squares a second. */
    calm: number;
    splashy: number;
    /** How far a fish notices a splashy net, in squares from its rim. */
    notice: number;
    /** How fast an alarmed fish darts off, in squares a second. */
    dart: number;
    /** How much of each step's speed the smoothed speed takes, from nought to one. */
    follow: number;
}

/** The net's smoothed speed after it moved from `a` to `b` in `dt`. */
export function sweepSpeed(was: number, a: Pt, b: Pt, dt: number, feel: NetFeel): number {
    const now = dt > 0 ? Math.hypot(b.x - a.x, b.y - a.y) / dt : 0;
    return was + (now - was) * feel.follow;
}

/** How splashy a speed is, from nought (calm) to one, for a fish as `shy` as given (one is ordinary). */
export function splash(speed: number, feel: NetFeel, shy = 1): number {
    const calm = feel.calm / Math.max(0.2, shy);
    if (speed <= calm) return 0;
    return Math.min(1, (speed - calm) / Math.max(1e-6, feel.splashy - calm));
}

/** How alarmed a fish at `p` is by a net at `at` moving at `speed`: its splash, fading out past the rim to `notice`. */
export function alarm(p: Pt, at: Pt, speed: number, feel: NetFeel, shy = 1): number {
    const d = Math.hypot(p.x - at.x, p.y - at.y) - feel.r;
    const near = d <= 0 ? 1 : Math.max(0, 1 - d / feel.notice);
    return splash(speed, feel, shy) * near;
}

/** The velocity a fish darts off at: straight away from the net, as fast as it is alarmed. */
export function dartFrom(p: Pt, at: Pt, speed: number, feel: NetFeel, shy = 1): Pt {
    const a = alarm(p, at, speed, feel, shy);
    if (a === 0) return { x: 0, y: 0 };
    const dx = p.x - at.x,
        dy = p.y - at.y,
        d = Math.hypot(dx, dy);
    if (d < 1e-9) return { x: feel.dart * a, y: 0 };
    return { x: (dx / d) * feel.dart * a, y: (dy / d) * feel.dart * a };
}

/** Whether a fish at `p` is in the net's mouth. */
export const inMouth = (p: Pt, at: Pt, feel: NetFeel): boolean =>
    Math.hypot(p.x - at.x, p.y - at.y) <= feel.r;

/**
 * Whether the net takes a fish at `p`: it is in the mouth and the net is going slowly enough not to
 * have startled it, by degrees, so a fish half alarmed is caught only well inside the mouth.
 */
export function catches(p: Pt, at: Pt, speed: number, feel: NetFeel, shy = 1): boolean {
    const a = splash(speed, feel, shy);
    if (a >= 1) return false;
    return Math.hypot(p.x - at.x, p.y - at.y) <= feel.r * (1 - a);
}
