// A rope swing: someone holding a rope hung from a branch swings on it as a pendulum, pumps it higher
// by leaning into each swing, lets go and flies on a ballistic arc, and catches the next rope by
// reaching for it. Angles are from straight down, more than nought to the right, in radians, and
// places are in squares with y growing down, as the world's are. Pure and serialisable, so a game
// keeps a Swing and a Flight in its state and a test steps them in node. See .docs/engine.md.
import type { Pt } from "./geometry";

/** A rope held `r` squares below its anchor, at `theta` from straight down, turning at `omega` a second. */
export interface Swing {
    ax: number;
    ay: number;
    r: number;
    theta: number;
    omega: number;
}

/** Someone in the air: where the hands are and how fast they go, in squares and squares a second. */
export interface Flight {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

export const handsOf = (s: Swing): Pt => ({
    x: s.ax + s.r * Math.sin(s.theta),
    y: s.ay + s.r * Math.cos(s.theta),
});

/** The hands' velocity along the swing's arc. */
export const velocityOf = (s: Swing): Pt => ({
    x: s.r * s.omega * Math.cos(s.theta),
    y: -s.r * s.omega * Math.sin(s.theta),
});

/** Energy for each unit of mass, from the bottom of the swing: what decides how high it goes. */
export const energyOf = (s: Swing, g: number): number =>
    0.5 * s.r * s.r * s.omega * s.omega + g * s.r * (1 - Math.cos(s.theta));

/** How far out the swing reaches either way, in radians, for the energy it has; π once it goes over the top. */
export function amplitudeOf(s: Swing, g: number): number {
    const c = 1 - energyOf(s, g) / (g * s.r);
    return c <= -1 ? Math.PI : Math.acos(Math.min(1, c));
}

export interface Push {
    /** Squares a second, each second, added along the way the swing is going while it is pumped. */
    pump: number;
    /** No pumping past this reach either way, in radians. */
    most: number;
    /** The share of its turning a swing loses each second when nobody pumps it. */
    damping: number;
}

/**
 * Moves a swing on by `dt`: gravity pulls it back to the bottom, and pumping adds a push along the way
 * it is going, which is what leaning into a swing does. From rest at the bottom a pump pushes forward.
 */
export function stepSwing(s: Swing, g: number, dt: number, push: Push, pumping: boolean): void {
    let a = (-g / s.r) * Math.sin(s.theta);
    if (pumping && amplitudeOf(s, g) < push.most) {
        const way = Math.abs(s.omega) < 0.05 ? 1 : Math.sign(s.omega);
        a += (way * push.pump) / s.r;
    }
    s.omega = (s.omega + a * dt) * (pumping ? 1 : Math.max(0, 1 - push.damping * dt));
    s.theta += s.omega * dt;
}

/**
 * The share of a step's time a swing moves by, so it lingers a little at each end: nought would stop
 * it, one is real time. At the top it keeps `1 - slow` of the step; at `fast` squares a second or more
 * along the arc it keeps all of it. A swing slowed this way still reaches the same height each side.
 */
export function apexEase(s: Swing, slow: number, fast = 2.5): number {
    const v = Math.abs(s.omega) * s.r;
    return 1 - slow * Math.exp(-((v / fast) ** 2));
}

/** The flight from letting go of a swing now. */
export const letGo = (s: Swing): Flight => {
    const h = handsOf(s),
        v = velocityOf(s);
    return { x: h.x, y: h.y, vx: v.x, vy: v.y };
};

/** Moves a flight on by `dt` under gravity and a wind along the ground, in squares a second each second. */
export function stepFlight(f: Flight, g: number, wind: number, dt: number): void {
    f.vx += wind * dt;
    f.vy += g * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
}

/**
 * The swing hands at `at` moving at `v` would have if they caught a rope anchored at `ax, ay`, `long`
 * squares long and hanging at `theta`, or null when the rope is out of reach. The hands take the rope
 * where they meet it, no nearer the anchor than `nearest`, and keep the part of their speed that goes
 * round it.
 */
export function catchRope(
    at: Pt,
    v: Pt,
    rope: { ax: number; ay: number; long: number; theta: number },
    reach: number,
    nearest: number,
): Swing | null {
    const ux = Math.sin(rope.theta),
        uy = Math.cos(rope.theta);
    const dx = at.x - rope.ax,
        dy = at.y - rope.ay;
    const along = dx * ux + dy * uy,
        across = Math.abs(dx * uy - dy * ux);
    if (along < nearest || along > rope.long || across > reach) return null;
    const r = Math.max(nearest, Math.min(rope.long, Math.hypot(dx, dy)));
    const theta = Math.atan2(dx, dy);
    const omega = (v.x * Math.cos(theta) - v.y * Math.sin(theta)) / r;
    return { ax: rope.ax, ay: rope.ay, r, theta, omega };
}
