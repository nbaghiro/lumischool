// A brick breaker's physics, as in Breakout and Arkanoid: balls that keep their speed off the walls and
// the blocks, a tray along the foot whose own place under the ball sets where the ball goes next, and
// blocks that fall once nothing holds them up. A block is held while a chain of blocks touching side to
// side or end to end reaches one that is fixed, so a wall with a hole in it stands, and a piece cut off
// from its base falls whole. Stepped on pinball's sub-step, so the same hands give the same round and a
// preview drawn by the same step is the ball's way. Places are in squares, y growing down. Pure and
// serialisable.
import { SUB } from "./pinball";

/** Squares a second no ball goes faster than: well under its radius in a sub-step, so it never passes through a block. */
export const TOP = 24;
/** The least angle off the level a ball leaves anything at, in radians, so it never runs flat between the walls. */
export const LEAST = 0.32;
/** The most a ball leaves the tray off the upright, in radians, from its very edge. */
export const TILT = 1.05;
/** How much of the tray's own speed, in squares a second, turns the ball, in radians a square a second, and the most it can. */
const SPIN = 0.012,
    SPIN_MOST = 0.18;
/** The tray catches a ball whose middle is this share of a radius past its end, so a near thing is a catch. */
const REACH = 0.8;

/** A block: its top left, its size, and fixed when nothing breaks it and it holds up what rests on it. */
export interface Box {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    fixed?: true;
}

export interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Radians, how far it has rolled, for its drawing. */
    a: number;
}

/** The tray: its middle, its top's line, half its length, and its speed in squares a second. */
export interface Tray {
    x: number;
    y: number;
    half: number;
    v: number;
}

/** A piece falling free: where its middle is, how it moves, and how far it has turned. */
export interface Fall {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    a: number;
    w: number;
}

export interface Field {
    w: number;
    h: number;
    /** The ball's radius. */
    r: number;
}

export type Strike =
    | { kind: "block"; id: string; speed: number; x: number; y: number }
    | { kind: "wall"; speed: number; x: number; y: number }
    | { kind: "tray"; off: number; x: number; y: number }
    | { kind: "gone"; x: number; y: number };

export const DT = 1 / SUB;

const speedOf = (b: Ball) => Math.hypot(b.vx, b.vy);

/** Turns the ball so it leaves at least `LEAST` off the level, keeping its speed and its way across and up or down. */
export function keepSteep(b: Ball): void {
    const s = speedOf(b);
    if (s < 1e-9) return;
    const least = Math.sin(LEAST) * s;
    if (Math.abs(b.vy) >= least) return;
    b.vy = (b.vy < 0 ? -1 : 1) * least;
    b.vx = (b.vx < 0 ? -1 : 1) * Math.cos(LEAST) * s;
}

/**
 * The ball's way off the tray, as Arkanoid's: where it meets the tray along its length, `off` from -1 at
 * the left end to 1 at the right, sets how far it leans, and the tray's own speed turns it a little more.
 */
export function offTray(off: number, speed: number, trayV: number): { vx: number; vy: number } {
    const spin = Math.max(-SPIN_MOST, Math.min(SPIN_MOST, trayV * SPIN)),
        a = Math.max(-TILT, Math.min(TILT, Math.max(-1, Math.min(1, off)) * TILT + spin));
    return { vx: Math.sin(a) * speed, vy: -Math.cos(a) * speed };
}

/** The point of a box nearest `x`, `y`. */
function nearestIn(b: Box, x: number, y: number): { x: number; y: number } {
    return {
        x: Math.max(b.x, Math.min(b.x + b.w, x)),
        y: Math.max(b.y, Math.min(b.y + b.h, y)),
    };
}

/**
 * Moves a ball on by one sub-step among the boxes still standing and the tray, and returns what it met:
 * at most one block a sub-step, the one it is deepest into, as a brick breaker breaks one brick a touch.
 */
export function stepBall(
    b: Ball,
    field: Field,
    boxes: readonly Box[],
    tray: Tray | null,
    dt: number,
): Strike[] {
    const hits: Strike[] = [],
        R = field.r,
        was = b.y;
    let s = speedOf(b);
    if (s > TOP) {
        b.vx *= TOP / s;
        b.vy *= TOP / s;
        s = TOP;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.a += (b.vx / R) * dt;
    if (b.x < R && b.vx < 0) {
        b.x = R;
        b.vx = -b.vx;
        hits.push({ kind: "wall", speed: Math.abs(b.vx), x: 0, y: b.y });
    } else if (b.x > field.w - R && b.vx > 0) {
        b.x = field.w - R;
        b.vx = -b.vx;
        hits.push({ kind: "wall", speed: Math.abs(b.vx), x: field.w, y: b.y });
    }
    if (b.y < R && b.vy < 0) {
        b.y = R;
        b.vy = -b.vy;
        hits.push({ kind: "wall", speed: Math.abs(b.vy), x: b.x, y: 0 });
    }
    let deepest: { box: Box; depth: number; nx: number; ny: number } | null = null;
    for (const box of boxes) {
        if (
            b.x + R < box.x ||
            b.x - R > box.x + box.w ||
            b.y + R < box.y ||
            b.y - R > box.y + box.h
        )
            continue;
        const q = nearestIn(box, b.x, b.y);
        let nx = b.x - q.x,
            ny = b.y - q.y;
        const d = Math.hypot(nx, ny);
        let depth: number;
        if (d < 1e-9) {
            // the middle is inside: out by the nearest side
            const sides = [
                { n: [-1, 0], k: b.x - box.x },
                { n: [1, 0], k: box.x + box.w - b.x },
                { n: [0, -1], k: b.y - box.y },
                { n: [0, 1], k: box.y + box.h - b.y },
            ].sort((p, o) => p.k - o.k);
            const side = sides[0];
            nx = side?.n[0] ?? 0;
            ny = side?.n[1] ?? -1;
            depth = R + (side?.k ?? 0);
        } else {
            if (d >= R) continue;
            nx /= d;
            ny /= d;
            depth = R - d;
        }
        if (!deepest || depth > deepest.depth) deepest = { box, depth, nx, ny };
    }
    if (deepest) {
        const { box, depth, nx, ny } = deepest,
            into = b.vx * nx + b.vy * ny;
        b.x += nx * depth;
        b.y += ny * depth;
        if (into < 0) {
            b.vx -= 2 * into * nx;
            b.vy -= 2 * into * ny;
            keepSteep(b);
            hits.push({
                kind: "block",
                id: box.id,
                speed: -into,
                x: b.x - nx * R,
                y: b.y - ny * R,
            });
        }
    }
    if (
        tray &&
        b.vy > 0 &&
        b.y + R >= tray.y &&
        was + R <= tray.y + 0.5 &&
        Math.abs(b.x - tray.x) <= tray.half + R * REACH
    ) {
        const off = (b.x - tray.x) / tray.half,
            v = offTray(off, s, tray.v);
        b.vx = v.vx;
        b.vy = v.vy;
        b.y = tray.y - R;
        hits.push({ kind: "tray", off, x: b.x, y: tray.y });
    }
    if (b.y - R > field.h) hits.push({ kind: "gone", x: b.x, y: b.y });
    return hits;
}

/** Whether two boxes touch along a side or an end, by more than a sliver. */
function touches(a: Box, b: Box): boolean {
    const e = 0.05,
        across = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
        down = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return (Math.abs(across) < e && down > e) || (Math.abs(down) < e && across > e);
}

/** The boxes of `standing` that no chain of touching standing boxes joins to a fixed one: they fall. */
export function unheld(standing: readonly Box[]): Box[] {
    const held = new Set<string>(),
        queue = standing.filter((b) => b.fixed);
    for (const b of queue) held.add(b.id);
    while (queue.length) {
        const b = queue.pop();
        if (!b) break;
        for (const o of standing)
            if (!held.has(o.id) && touches(b, o)) {
                held.add(o.id);
                queue.push(o);
            }
    }
    return standing.filter((b) => !held.has(b.id));
}

/** A box let go: it falls from where it stood, pushed away from `from` and turning as it goes. */
export function fallOf(b: Box, from: { x: number; y: number }, turn: number): Fall {
    const x = b.x + b.w / 2,
        y = b.y + b.h / 2;
    return {
        id: b.id,
        x,
        y,
        vx: Math.max(-3, Math.min(3, (x - from.x) * 0.6)),
        vy: -1.5,
        a: 0,
        w: turn,
    };
}

/** Moves a falling piece on by `dt` under `gravity`. */
export function stepFall(f: Fall, gravity: number, dt: number): void {
    f.vy += gravity * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.a += f.w * dt;
}
