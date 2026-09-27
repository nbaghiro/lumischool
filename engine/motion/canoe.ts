// A canoe on moving water, seen from above: it glides on through the water after a stroke and slows
// slowly along its length, slides sideways hardly at all, and is carried by the current it sits in. A
// stroke on one side pushes it on and turns its bow away from that side; a stroke made too soon after
// the last one catches water the boat is already moving through and pushes less. Squares, seconds and
// clockwise radians with y growing downwards, so an angle of nought heads right.
import type { Pt } from "./geometry";

export interface Canoe {
    x: number;
    y: number;
    angle: number;
    vx: number;
    vy: number;
    /** Radians a second, clockwise. */
    spin: number;
}

export interface Hull {
    /** How quickly the water slows the canoe along its length, per second. */
    glide: number;
    /** How quickly it slows sideways, per second: much more than along. */
    grip: number;
    /** How quickly a turn dies away, per second. */
    spinDrag: number;
    /** Squares a second one full stroke adds along the hull. */
    push: number;
    /** Radians a second one full stroke turns it by. */
    turn: number;
    /** How much harder the water slows it, per second, while the paddle is held back against it. */
    back: number;
    /** Seconds between strokes for a stroke to have all its push. */
    beat: number;
}

/** The unit vector along the hull, and the one to its right (starboard), which is clockwise of it. */
export const along = (c: Canoe): Pt => ({ x: Math.cos(c.angle), y: Math.sin(c.angle) });
export const starboard = (c: Canoe): Pt => ({ x: -Math.sin(c.angle), y: Math.cos(c.angle) });

/** The share of a stroke's push it has `since` seconds after the last: a quarter at once, all of it a beat later. */
export const rhythm = (since: number, beat: number): number =>
    Math.max(0.25, Math.min(1, since / beat));

/**
 * A stroke of `power` from nought to one on a side (1 the right, -1 the left): it pushes the canoe
 * along its hull, or back for a back stroke, and turns the bow away from the side it was made on.
 */
export function stroke(c: Canoe, side: 1 | -1, power: number, hull: Hull, back = false): void {
    const p = Math.max(0, Math.min(1, power)),
        dir = back ? -1 : 1,
        a = along(c);
    c.vx += a.x * hull.push * p * dir;
    c.vy += a.y * hull.push * p * dir;
    c.spin += -side * hull.turn * p * dir;
}

/** One step of `dt` seconds in water moving at `current`, with the paddle held back by `backing` from nought to one. */
export function canoeStep(c: Canoe, current: Pt, hull: Hull, dt: number, backing = 0): void {
    const a = along(c),
        rx = c.vx - current.x,
        ry = c.vy - current.y;
    let fwd = rx * a.x + ry * a.y;
    let side = -rx * a.y + ry * a.x;
    fwd *= Math.exp(-(hull.glide + Math.max(0, Math.min(1, backing)) * hull.back) * dt);
    side *= Math.exp(-hull.grip * dt);
    c.vx = current.x + fwd * a.x - side * a.y;
    c.vy = current.y + fwd * a.y + side * a.x;
    c.spin *= Math.exp(-hull.spinDrag * dt);
    c.angle = Math.atan2(Math.sin(c.angle + c.spin * dt), Math.cos(c.angle + c.spin * dt));
    c.x += c.vx * dt;
    c.y += c.vy * dt;
}

/**
 * The canoe meets something along `n`, the unit direction from it back towards the canoe, having gone
 * `depth` squares into it: it is put back outside and bounces off by `restitution`, turning a little
 * as a hull does that is struck off its middle. Returns how hard it hit, in squares a second.
 */
export function bounce(c: Canoe, n: Pt, depth: number, restitution: number, at = 0): number {
    c.x += n.x * depth;
    c.y += n.y * depth;
    const vn = c.vx * n.x + c.vy * n.y;
    if (vn >= 0) return 0;
    c.vx -= (1 + restitution) * vn * n.x;
    c.vy -= (1 + restitution) * vn * n.y;
    c.spin += at * -vn * 0.35;
    return -vn;
}
