// Food in a wood, seen from the side: nuts that hang from a branch until it is shaken hard enough to
// loosen them, then fall, bounce, roll to rest and float off on water; and how a load carried in the
// cheeks slows a runner and shortens its jump. A shake builds by degrees while it is held and dies
// away when it is let go, and each nut holds on with a grip of its own, so short shakes drop the
// loosest nuts close by and a long hard one drops many and throws them wide. Squares and seconds, y
// growing downwards; pure and serialisable, so a game keeps its nuts in its state.
import type { Moves } from "./walker";

export interface Nut {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Hanging from a branch, in the air, at rest, carried off by water, or gone from the world. */
    at: "hang" | "air" | "rest" | "float" | "gone";
    /** How much shaking it takes to come loose, in the units of `Shake.energy`. */
    grip: number;
    /** The branch it hangs from, by its place in the game's list. */
    branch: number;
    /** Which way and how far it is thrown when it comes loose, from -1 to 1. */
    lean: number;
    /** Clockwise radians it has turned, for the drawing. */
    turn: number;
    /** Seconds since it last changed where it is. */
    age: number;
}

/** One branch's shaking: how hard it is shaking now, from nought to one, and how much it has shaken in all. */
export interface Shake {
    strength: number;
    energy: number;
}

/** A root or a stone a falling nut glances off. */
export interface Bump {
    x: number;
    y: number;
    r: number;
}

/** What a nut falls through: the tops it stops on, the solid it cannot enter, roots, water and wind. */
export interface Wood {
    /** The highest top between `from` and `to` (from above to below) at `x`, or null. */
    floor(x: number, from: number, to: number): number | null;
    solid(x: number, y: number): boolean;
    bumps: readonly Bump[];
    /** Water a nut floats away on: across from `x0` to `x1`, its surface at `level`. */
    water: readonly { x0: number; x1: number; level: number }[];
    /** Squares a second the air moves to the right. */
    wind: number;
}

export const FORAGE = {
    gravity: 30,
    /** How quickly a held shake builds and a let-go one dies, in strength a second. */
    rise: 1.25,
    fall: 4,
    /** The share of its speed a nut keeps from a bounce, and below what speed it stops bouncing. */
    bounce: 0.35,
    settle: 1.6,
    /** Speed a second a rolling nut loses on the ground. */
    roll: 7,
    /** How far a shake at full strength throws a nut sideways, and up, in squares a second. */
    throw: 3.6,
    toss: 2.4,
    radius: 0.25,
    /** Seconds a nut floats before it is out of sight. */
    floats: 1.6,
} as const;

/** The share of a cheekful's slowing a load is, where `most` is a full load. */
export const share = (load: number, most: number): number =>
    Math.max(0, Math.min(1, most > 0 ? load / most : 0));

/** A runner's moves with a load in its cheeks: a full load runs about a third slower and jumps 40% lower. */
export function laden(m: Moves, load: number, most: number): Moves {
    const k = share(load, most);
    return {
        ...m,
        speed: m.speed * (1 - 0.32 * k),
        accel: m.accel * (1 - 0.2 * k),
        airAccel: m.airAccel * (1 - 0.2 * k),
        jump: m.jump * (1 - 0.4 * k),
        climb: m.climb * (1 - 0.3 * k),
    };
}

/** How far a run-up jump carries on level ground, start to landing, at a load. */
export function reach(m: Moves, load: number, most: number): number {
    const l = laden(m, load, most);
    return l.speed * 2 * Math.sqrt((2 * l.jump) / l.gravity);
}

/** A held shake builds towards full, and a let-go one dies away; every moment it shakes adds to what it has shaken. */
export function stepShake(sh: Shake, shaking: boolean, dt: number): void {
    sh.strength = shaking
        ? Math.min(1, sh.strength + FORAGE.rise * dt)
        : Math.max(0, sh.strength - FORAGE.fall * dt);
    if (shaking) sh.energy += sh.strength * dt;
}

/** The nuts on `branch` that the shaking so far has loosened: they leave it thrown by the shake's strength. */
export function loosen(nuts: Nut[], branch: number, sh: Shake): Nut[] {
    const out: Nut[] = [];
    for (const n of nuts) {
        if (n.at !== "hang" || n.branch !== branch || sh.energy < n.grip) continue;
        n.at = "air";
        n.age = 0;
        n.vx = n.lean * FORAGE.throw * sh.strength;
        n.vy = -FORAGE.toss * sh.strength * Math.abs(n.lean);
        out.push(n);
    }
    return out;
}

/** What happened to a nut in a step, for its sound. */
export type NutEvent = "bounced" | "rested" | "splashed" | "glanced";

/** One step of `dt` seconds for every nut that is moving. */
export function stepNuts(nuts: Nut[], w: Wood, dt: number): { nut: number; e: NutEvent }[] {
    const out: { nut: number; e: NutEvent }[] = [];
    nuts.forEach((n, i) => {
        n.age += dt;
        if (n.at === "hang" || n.at === "gone") return;
        if (n.at === "float") {
            if (n.age > FORAGE.floats) n.at = "gone";
            return;
        }
        if (n.at === "rest") {
            // a nut left over nothing, its ground gone or never there, falls again
            if (w.floor(n.x, n.y - 0.05, n.y + 0.05) === null) {
                n.at = "air";
                n.age = 0;
            } else if (n.vx !== 0) {
                const nx = n.x + n.vx * dt;
                if (w.solid(nx + Math.sign(n.vx) * FORAGE.radius, n.y - 0.1)) n.vx = 0;
                else n.x = nx;
                n.turn += (n.vx * dt) / FORAGE.radius;
                n.vx = Math.sign(n.vx) * Math.max(0, Math.abs(n.vx) - FORAGE.roll * dt);
                if (w.floor(n.x, n.y - 0.05, n.y + 0.05) === null) {
                    n.at = "air";
                    n.age = 0;
                }
            }
            return;
        }
        n.vx += (w.wind - n.vx) * 0.8 * dt;
        n.vy += FORAGE.gravity * dt;
        const nx = n.x + n.vx * dt,
            ny = n.y + n.vy * dt;
        n.turn += n.vx * dt * 2;
        for (const b of w.bumps) {
            const dx = nx - b.x,
                dy = ny - b.y,
                d = Math.hypot(dx, dy),
                least = b.r + FORAGE.radius;
            if (d >= least || d === 0) continue;
            const ux = dx / d,
                uy = dy / d,
                into = n.vx * ux + n.vy * uy;
            if (into < 0) {
                n.vx -= 1.5 * into * ux;
                n.vy -= 1.5 * into * uy;
                out.push({ nut: i, e: "glanced" });
            }
            n.x = b.x + ux * least;
            n.y = b.y + uy * least;
            return;
        }
        if (w.solid(nx + Math.sign(n.vx) * FORAGE.radius, ny - FORAGE.radius)) n.vx = -n.vx * 0.4;
        else n.x = nx;
        const pond = w.water.find((p) => n.x >= p.x0 && n.x <= p.x1);
        if (pond && ny >= pond.level && n.vy > 0) {
            n.at = "float";
            n.age = 0;
            n.y = pond.level - 0.1;
            n.vx = 0;
            n.vy = 0;
            out.push({ nut: i, e: "splashed" });
            return;
        }
        const top = n.vy > 0 ? w.floor(n.x, n.y - 1e-6, ny) : null;
        if (top === null) {
            n.y = ny;
            return;
        }
        n.y = top;
        if (n.vy > FORAGE.settle) {
            n.vy = -n.vy * FORAGE.bounce;
            n.vx *= 0.7;
            out.push({ nut: i, e: "bounced" });
        } else {
            n.vy = 0;
            n.at = "rest";
            n.age = 0;
            out.push({ nut: i, e: "rested" });
        }
    });
    return out;
}
