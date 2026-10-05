// A place a runner climbs through, drawn without tiles: ledges it stands on, some of them one-way,
// some moving to and fro and some springing it up again; blocks that are solid all through, and
// whose tops are floors; and ladders. `course` turns a place at a moment into the floors, walls and
// ladders `stepRunner` in walker.ts moves through. Squares and seconds, y growing downwards; pure, so
// a game keeps its place in its level and a test steps it in node.
import type { Course, Surface } from "./walker";

/** How a ledge moves: `dx` and `dy` squares either side of where it is drawn, once to and fro every `period` seconds. */
export interface Swing {
    dx: number;
    dy: number;
    period: number;
    /** Where in its period it starts, from nought to one. */
    phase?: number;
}

export interface Ledge {
    x0: number;
    x1: number;
    /** The height of its top, where the feet stand. */
    y: number;
    oneWay?: boolean;
    move?: Swing;
    /** How high a landing on it springs the runner back up, in squares. */
    spring?: number;
}

/** Something solid from `y0` down to `y1`: the ground, a wall, a shut door. Its top is a floor. */
export interface Block {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
}

/** A ladder from `y0` down to `y1` at `x`. */
export interface Rung {
    x: number;
    y0: number;
    y1: number;
}

export interface Place {
    ledges: readonly Ledge[];
    blocks: readonly Block[];
    ladders: readonly Rung[];
}

/** How far past its ends a ledge still holds the feet, for a figure as wide as a child. */
const FOOT = 0.3;
/** How far either side of a ladder's middle a hand reaches it. */
const REACH = 0.45;

/** Where a ledge is at `t` seconds, and how fast it is going. */
export function ledgeAt(l: Ledge, t: number): Ledge & { vx: number; vy: number } {
    const m = l.move;
    if (!m) return { ...l, vx: 0, vy: 0 };
    const w = (2 * Math.PI) / m.period,
        a = w * t + 2 * Math.PI * (m.phase ?? 0),
        k = Math.sin(a),
        dk = Math.cos(a) * w;
    return {
        ...l,
        x0: l.x0 + m.dx * k,
        x1: l.x1 + m.dx * k,
        y: l.y + m.dy * k,
        vx: m.dx * dk,
        vy: m.dy * dk,
    };
}

const inside = (b: Block, x: number, y: number): boolean =>
    x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;

/** The ledge the feet at (x, y) stand on at `t`, by its place in the list, or -1. */
export function standingOn(p: Place, x: number, y: number, t: number): number {
    return p.ledges.findIndex((l) => {
        const at = ledgeAt(l, t);
        return x >= at.x0 - FOOT && x <= at.x1 + FOOT && Math.abs(at.y - y) < 0.05;
    });
}

/**
 * The floors, walls and ladders of a place at `t` seconds, with `more` solid as well: a shut door, a
 * gate. The highest surface between two heights wins, so a ledge over the ground is stood on first.
 */
export function course(p: Place, t: number, more: readonly Block[] = []): Course {
    const solid = [...p.blocks, ...more];
    const ledges = p.ledges.map((l) => ledgeAt(l, t));
    return {
        floor: (x, from, to) => {
            let best: Surface | null = null;
            for (const l of ledges)
                if (x >= l.x0 - FOOT && x <= l.x1 + FOOT && l.y >= from && l.y <= to)
                    if (!best || l.y < best.y)
                        best = {
                            y: l.y,
                            ...(l.oneWay ? { oneWay: true } : {}),
                            ...(l.vx || l.vy ? { vx: l.vx, vy: l.vy } : {}),
                        };
            for (const b of solid)
                if (x >= b.x0 - FOOT && x <= b.x1 + FOOT && b.y0 >= from && b.y0 <= to)
                    if (!best || b.y0 < best.y) best = { y: b.y0 };
            return best;
        },
        solid: (x, y) => solid.some((b) => inside(b, x, y)),
        ladder: (x, y) =>
            p.ladders.some((r) => Math.abs(r.x - x) <= REACH && y >= r.y0 && y <= r.y1),
    };
}

/** The speed upwards a spring of `height` squares gives under `gravity`, as a negative y speed. */
export const springSpeed = (height: number, gravity: number): number =>
    -Math.sqrt(2 * gravity * height);
