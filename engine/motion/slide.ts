// A thing sent sliding across a table and slowed to rest, the way the physics world slows a body
// with damping. It says how far a thing sent at a speed slides before it stops, and the speed that
// sends it a given distance, so a game can draw where a shove will stop before it is made. Squares
// and seconds.
import type { Pt } from "./geometry";

/**
 * How far a thing sent at `speed` slides before it stops. A world stepped at a fixed `dt` keeps
 * 1 / (1 + dt * damping) of the speed each step, and the steps sum to speed / damping whatever the
 * step, which is also the smooth answer.
 */
export const slideDistance = (speed: number, damping: number): number =>
    damping > 0 ? speed / damping : Infinity;

/** The speed that slides a thing `distance` before it stops. */
export const speedFor = (distance: number, damping: number): number => distance * damping;

/** Where a thing sent from `from` at velocity `v` is after `t` seconds, and its velocity then. */
export function slideAt(from: Pt, v: Pt, damping: number, t: number): { at: Pt; v: Pt } {
    const keep = Math.exp(-damping * t);
    const gone = damping > 0 ? (1 - keep) / damping : t;
    return {
        at: { x: from.x + v.x * gone, y: from.y + v.y * gone },
        v: { x: v.x * keep, y: v.y * keep },
    };
}
