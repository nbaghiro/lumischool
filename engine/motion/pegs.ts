// A peg board's physics, as in Peggle or pachinko: one marble falling under gravity through round pegs
// and long ones, off the board's walls, past pegs that slide or turn, towards a bucket that slides to
// and fro along the bottom. The marble spins: where it meets a surface, friction trades its sliding for
// spin, so it rolls along a slanted peg and kicks sideways off a peg it meets spinning. Solved by hand on
// pinball's sub-step, as that kit is, so the same aim gives the same fall every time and a preview drawn
// by the same step is the fall. Places are in squares, y growing down. Pure and serialisable.
import type { Pt } from "./geometry";
import { nearest } from "./pinball";

/** Squares a second no marble goes faster than: under the radius in a sub-step, so it never passes through a peg. */
export const TOP = 40;

/**
 * A peg: round, of radius `r` about its middle, or long, a bar `len` squares long at `angle` through its
 * middle with `r` its half thickness. A `move` slides it to and fro; a `spin` turns a long one about its
 * middle, in radians a second. Its place at a time is a sum of these, so the board needs no state of its own.
 */
export interface Peg {
    id: string;
    x: number;
    y: number;
    r: number;
    long?: { len: number; angle: number };
    move?: { dx: number; dy: number; period: number };
    spin?: number;
}

/** A straight wall from `a` to `b`. */
interface Wall {
    a: Pt;
    b: Pt;
}

/** The bucket: its rim's line, how far from the middle its ends are, and how it slides, about `x`. */
interface Bucket {
    x: number;
    y: number;
    half: number;
    rim: number;
    dx: number;
    period: number;
}

export interface Board {
    pegs: Peg[];
    walls: Wall[];
    bucket: Bucket | null;
    /** Squares a second each second down the board. */
    gravity: number;
    /** Below this the marble has gone. */
    drain: number;
    /** The marble's radius. */
    r: number;
}

export interface Marble {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Radians a second, clockwise as drawn, and how far it has turned. */
    w: number;
    a: number;
    mode: "free" | "caught" | "gone";
}

/** What changes on a board as it plays: the clock that moving pegs follow, and the pegs taken off it. */
export interface Live {
    t: number;
    off: Record<string, true>;
}

export type Hit =
    | { kind: "peg"; id: string; speed: number; x: number; y: number }
    | { kind: "wall"; speed: number; x: number; y: number }
    | { kind: "rim"; speed: number; x: number; y: number }
    | { kind: "caught"; x: number; y: number }
    | { kind: "gone"; x: number; y: number };

/** The share of the speed into it a marble keeps off each surface. */
const E = { round: 0.5, long: 0.42, wall: 0.5, rim: 0.4 };
/** Below this speed into a surface, in squares a second, the marble settles on it rather than bouncing. */
const SETTLE = 0.6;
/** How hard a surface grips the marble: the most sideways push, as a share of the push into it. */
const GRIP = 0.3;
/** A solid ball: a push at its edge turns it two and a half times as much as it moves it. */
const TURN = 2.5;
/** How square on top of a round peg, as a share of the reach, counts as balanced, and the squares a second it is tipped off by. */
const TIP = 0.08,
    TIP_SPEED = 1.2;

export const liveOf = (): Live => ({ t: 0, off: {} });

const wave = (period: number, t: number) => Math.sin((t / period) * Math.PI * 2);
const waveRate = (period: number, t: number) =>
    ((Math.PI * 2) / period) * Math.cos((t / period) * Math.PI * 2);

/** A peg's middle at time `t`. */
export const pegAt = (p: Peg, t: number): Pt =>
    p.move
        ? {
              x: p.x + p.move.dx * wave(p.move.period, t),
              y: p.y + p.move.dy * wave(p.move.period, t),
          }
        : { x: p.x, y: p.y };

/** A long peg's angle at time `t`. */
export const angleAt = (p: Peg, t: number): number => (p.long?.angle ?? 0) + (p.spin ?? 0) * t;

/** A long peg's two ends at time `t`. */
export function endsOf(p: Peg, t: number): [Pt, Pt] {
    const c = pegAt(p, t),
        a = angleAt(p, t),
        h = (p.long?.len ?? 0) / 2,
        dx = Math.cos(a) * h,
        dy = Math.sin(a) * h;
    return [
        { x: c.x - dx, y: c.y - dy },
        { x: c.x + dx, y: c.y + dy },
    ];
}

/** The bucket's middle at time `t`. */
export const bucketAt = (b: Bucket, t: number): number => b.x + b.dx * wave(b.period, t);

/**
 * Bounces the marble off a surface it touches at `q`, moving at `sv`, keeping `e` of its speed into it,
 * and lets the surface's grip trade sliding for spin. Returns the speed it met the surface at, or -1.
 */
function meet(m: Marble, q: Pt, reach: number, e: number, sv: Pt, R: number): number {
    let nx = m.x - q.x,
        ny = m.y - q.y;
    const d = Math.hypot(nx, ny);
    if (d >= reach) return -1;
    if (d < 1e-9) {
        nx = 0;
        ny = -1;
    } else {
        nx /= d;
        ny /= d;
    }
    m.x = q.x + nx * reach;
    m.y = q.y + ny * reach;
    const rvx = m.vx - sv.x,
        rvy = m.vy - sv.y,
        into = rvx * nx + rvy * ny;
    if (into >= 0) return -1;
    const push = -(1 + (-into < SETTLE ? 0 : e)) * into;
    m.vx += push * nx;
    m.vy += push * ny;
    // the slip where it touches: the surface's way along, less what the spin carries
    const tx = -ny,
        ty = nx,
        slip = rvx * tx + rvy * ty - m.w * R,
        most = GRIP * push,
        j = Math.max(-most, Math.min(most, slip / (1 + TURN)));
    m.vx -= j * tx;
    m.vy -= j * ty;
    m.w += (TURN * j) / R;
    return -into;
}

/** Moves the marble on by one sub-step of `dt` seconds and returns what it met. */
export function stepBoard(m: Marble, board: Board, live: Live, dt: number): Hit[] {
    const hits: Hit[] = [];
    live.t += dt;
    if (m.mode !== "free") return hits;
    const R = board.r,
        t = live.t,
        py = m.y;
    m.vy += board.gravity * dt;
    const sp = Math.hypot(m.vx, m.vy);
    if (sp > TOP) {
        m.vx *= TOP / sp;
        m.vy *= TOP / sp;
    }
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.w *= Math.exp(-0.4 * dt);
    m.a += m.w * dt;
    const still = { x: 0, y: 0 };
    for (const w of board.walls) {
        const q = nearest(m, w.a, w.b),
            hit = meet(m, q, R, E.wall, still, R);
        if (hit > 0) hits.push({ kind: "wall", speed: hit, x: q.x, y: q.y });
    }
    for (const p of board.pegs) {
        if (live.off[p.id]) continue;
        const c = pegAt(p, t);
        // a cheap test first: nothing on the board is longer than a few squares
        const far = p.long ? p.long.len / 2 + p.r + R : p.r + R;
        if (Math.abs(m.x - c.x) > far || Math.abs(m.y - c.y) > far) continue;
        const mv = p.move
            ? {
                  x: p.move.dx * waveRate(p.move.period, t),
                  y: p.move.dy * waveRate(p.move.period, t),
              }
            : still;
        // the nearest point of a peg's middle line: a round peg's middle, or along a long one
        const q = p.long ? nearest(m, ...endsOf(p, t)) : c;
        const reach = p.r + R,
            w = p.spin ?? 0,
            sv = { x: mv.x - w * (q.y - c.y), y: mv.y + w * (q.x - c.x) },
            hit = meet(m, q, reach, p.long ? E.long : E.round, sv, R);
        if (hit <= 0) continue;
        hits.push({ kind: "peg", id: p.id, speed: hit, x: m.x, y: m.y });
        // no marble balances on a round peg: met square on its top, it tips off the way it leans, right if neither
        if (!p.long && m.y < c.y && Math.abs(m.x - c.x) < TIP * reach)
            m.vx += (m.x < c.x ? -1 : 1) * TIP_SPEED;
    }
    const b = board.bucket;
    if (b) {
        const bx = bucketAt(b, t),
            v = { x: b.dx * waveRate(b.period, t), y: 0 };
        for (const side of [-1, 1]) {
            const q = { x: bx + side * b.half, y: b.y },
                hit = meet(m, q, b.rim + R, E.rim, v, R);
            if (hit > 0) hits.push({ kind: "rim", speed: hit, x: q.x, y: q.y });
        }
        if (py < b.y && m.y >= b.y && m.vy > 0 && Math.abs(m.x - bx) < b.half - b.rim) {
            m.mode = "caught";
            hits.push({ kind: "caught", x: m.x, y: m.y });
            return hits;
        }
    }
    if (m.y > board.drain) {
        m.mode = "gone";
        hits.push({ kind: "gone", x: m.x, y: m.y });
    }
    return hits;
}

/** Whether the marble touches peg `p` now, within `slack` squares. */
export function touching(m: Marble, p: Peg, board: Board, t: number, slack: number): boolean {
    const q = p.long ? nearest(m, ...endsOf(p, t)) : pegAt(p, t);
    return Math.hypot(m.x - q.x, m.y - q.y) < p.r + board.r + slack;
}
