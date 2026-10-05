// A pinball table's physics: one ball rolling down a tilted table under gravity, walls it banks off,
// round bumpers that kick it away, slingshots that kick from a face, flippers that swing about a pivot
// and hit it with the speed of the point it meets, drop targets that stand until struck, lanes and a
// spinner it rolls over, a saucer that holds it and kicks it out, and a ramp it rides along a path.
// Everything is solved by hand on a fixed sub-step rather than by a physics library: a table needs
// the same run from the same hands every time, so a seeded try replays and a solver can search, and a
// step shorter than the ball's radius at its top speed means it can never pass through a wall. Places
// are in squares with y growing down the table, as the world's are. Pure and serialisable.
import type { Pt } from "./geometry";

/** Sub-steps a second: at the fastest a ball goes it moves well under its radius in one. */
export const SUB = 240;
/** Squares a second no ball goes faster than. */
export const TOP = 42;

/** A straight wall from `a` to `b`. A slingshot's face has a `kick`: squares a second it adds away from itself. */
export interface Wall {
    a: Pt;
    b: Pt;
    /** The share of the speed into it that a ball keeps. */
    e?: number;
    kick?: number;
    id?: string;
}

/** A round thing the ball bounces off: a bumper with a `kick`, or a post with none. A `move` slides it to and fro across the table. */
export interface Post {
    id: string;
    x: number;
    y: number;
    r: number;
    kick?: number;
    move?: { dx: number; period: number };
}

/** A flipper: a tapered bar turning about its pivot from its rest angle to its up angle, in radians clockwise from the right. */
export interface Flipper {
    side: "left" | "right";
    x: number;
    y: number;
    len: number;
    r: number;
    rest: number;
    up: number;
}

/** A drop target: a short wall that stands until the game knocks it down. */
export interface Target {
    id: string;
    a: Pt;
    b: Pt;
}

/** A patch the ball rolls over and is counted entering: a lane, a rollover. */
export interface Sensor {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

/** A line across the table that turns each time the ball crosses it. */
export interface Spinner {
    id: string;
    x: number;
    y: number;
    half: number;
}

/** A cup the ball drops into: it is held there `hold` seconds and kicked out at `out`. */
export interface Saucer {
    id: string;
    x: number;
    y: number;
    r: number;
    hold: number;
    out: Pt;
}

/** A ramp: entered moving up through `entry`, the ball rides `path` over `time` seconds and leaves at `out`. */
export interface Ramp {
    id: string;
    entry: { x: number; y: number; w: number; h: number };
    path: Pt[];
    time: number;
    out: Pt;
}

export interface Table {
    walls: Wall[];
    posts: Post[];
    flippers: Flipper[];
    targets: Target[];
    sensors: Sensor[];
    spinners: Spinner[];
    saucers: Saucer[];
    ramps: Ramp[];
    /** Squares a second each second down the table. */
    gravity: number;
    /** Below this the ball has drained. */
    drain: number;
    /** The ball's radius, in squares. */
    r: number;
}

export interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Where it is: loose on the table, waiting on the plunger, held in a saucer, riding a ramp, or gone down the drain. */
    mode: "free" | "held" | "saucer" | "ramp" | "gone";
    /** Seconds in a saucer or along a ramp, and which one. */
    t: number;
    on: string | null;
}

/** What the table is doing beyond the ball: each flipper's angle and turn, which targets are down, which sensors the ball is over. */
export interface Live {
    angles: number[];
    turning: number[];
    down: string[];
    inside: string[];
    /** Each spinner's turn, in radians, and how fast it is turning. */
    spin: Record<string, { a: number; w: number }>;
    /** Seconds since the table started, which moving posts follow. */
    t: number;
}

export type Hit =
    | { kind: "wall"; speed: number; x: number; y: number; kick: boolean }
    | { kind: "post"; id: string; speed: number; x: number; y: number; kick: boolean }
    | { kind: "flipper"; side: "left" | "right"; speed: number; x: number; y: number }
    | { kind: "target"; id: string; speed: number; x: number; y: number }
    | { kind: "sensor"; id: string; x: number; y: number }
    | { kind: "spinner"; id: string; x: number; y: number }
    | { kind: "saucer"; id: string; x: number; y: number }
    | { kind: "out"; id: string; x: number; y: number }
    | { kind: "ramp"; id: string; x: number; y: number }
    | { kind: "drain"; x: number; y: number };

/** Radians a second a flipper turns going up, and coming back down. */
const FLIP_UP = 16,
    FLIP_DOWN = 11;

export const liveOf = (table: Table): Live => ({
    angles: table.flippers.map((f) => f.rest),
    turning: table.flippers.map(() => 0),
    down: [],
    inside: [],
    spin: Object.fromEntries(table.spinners.map((s) => [s.id, { a: 0, w: 0 }])),
    t: 0,
});

export const postAt = (p: Post, t: number): Pt =>
    p.move
        ? { x: p.x + p.move.dx * Math.sin((t / p.move.period) * Math.PI * 2), y: p.y }
        : { x: p.x, y: p.y };

/** The tip of flipper `f` at angle `a`. */
export const flipperTip = (f: Flipper, a: number): Pt => ({
    x: f.x + Math.cos(a) * f.len,
    y: f.y + Math.sin(a) * f.len,
});

/** The point of segment `a` to `b` nearest `p`. */
export function nearest(p: Pt, a: Pt, b: Pt): Pt {
    const ex = b.x - a.x,
        ey = b.y - a.y,
        l2 = ex * ex + ey * ey;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / l2));
    return { x: a.x + ex * t, y: a.y + ey * t };
}

/**
 * Bounces the ball off a surface touching it at `q` whose own velocity there is `sv`, keeping `e` of
 * the speed into it and adding `kick` away from it. Returns the speed it met the surface at, or -1 when
 * it was not touching or was already leaving.
 */
function bounce(b: Ball, q: Pt, reach: number, e: number, kick: number, sv: Pt): number {
    let nx = b.x - q.x,
        ny = b.y - q.y;
    const d = Math.hypot(nx, ny);
    if (d >= reach) return -1;
    if (d < 1e-9) {
        nx = 0;
        ny = -1;
    } else {
        nx /= d;
        ny /= d;
    }
    // pushed back to the surface, so a ball never rests inside a wall
    b.x = q.x + nx * reach;
    b.y = q.y + ny * reach;
    const rvx = b.vx - sv.x,
        rvy = b.vy - sv.y,
        into = rvx * nx + rvy * ny;
    if (into >= 0) return -1;
    b.vx -= (1 + e) * into * nx;
    b.vy -= (1 + e) * into * ny;
    if (kick > 0) {
        b.vx += nx * kick;
        b.vy += ny * kick;
    }
    return -into;
}

const within = (b: Ball, r: { x: number; y: number; w: number; h: number }) =>
    b.x >= r.x && b.x <= r.x + r.w && b.y >= r.y && b.y <= r.y + r.h;

/** The point a ramp's ride has reached after `t` seconds of its `time`. */
export function rampAt(ramp: Ramp, t: number): Pt {
    const pts = ramp.path,
        segs: number[] = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
            c = pts[i];
        const l = a && c ? Math.hypot(c.x - a.x, c.y - a.y) : 0;
        segs.push(l);
        total += l;
    }
    let left = Math.max(0, Math.min(1, t / ramp.time)) * total;
    for (let i = 0; i < segs.length; i++) {
        const l = segs[i] ?? 0,
            a = pts[i],
            c = pts[i + 1];
        if (!a || !c) break;
        if (left <= l || i === segs.length - 1) {
            const k = l === 0 ? 0 : Math.min(1, left / l);
            return { x: a.x + (c.x - a.x) * k, y: a.y + (c.y - a.y) * k };
        }
        left -= l;
    }
    return pts[pts.length - 1] ?? { x: 0, y: 0 };
}

/**
 * Moves the table on by one sub-step of `dt` seconds with each flipper held up or let fall, and returns
 * what the ball met. The flippers turn first, so a ball resting on one is lifted by it.
 */
export function stepTable(
    b: Ball,
    table: Table,
    live: Live,
    held: { left: boolean; right: boolean },
    dt: number,
): Hit[] {
    const hits: Hit[] = [];
    live.t += dt;
    table.flippers.forEach((f, i) => {
        const a = live.angles[i] ?? f.rest,
            target = held[f.side] ? f.up : f.rest,
            rate = held[f.side] ? FLIP_UP : FLIP_DOWN,
            move = Math.sign(target - a) * Math.min(Math.abs(target - a), rate * dt);
        live.angles[i] = a + move;
        live.turning[i] = move / dt;
    });
    for (const sp of table.spinners) {
        const s = live.spin[sp.id];
        if (!s) continue;
        s.a += s.w * dt;
        s.w *= Math.exp(-1.6 * dt);
    }
    if (b.mode === "gone" || b.mode === "held") return hits;
    if (b.mode === "saucer") {
        const sc = table.saucers.find((s) => s.id === b.on);
        b.t += dt;
        if (sc && b.t >= sc.hold) {
            b.mode = "free";
            b.vx = sc.out.x;
            b.vy = sc.out.y;
            // out past its own rim, so it is not caught again on the way
            b.x = sc.x + Math.sign(sc.out.x) * (sc.r + table.r + 0.05);
            b.y = sc.y + Math.sign(sc.out.y) * (sc.r + table.r + 0.05);
            b.t = 0;
            hits.push({ kind: "out", id: sc.id, x: b.x, y: b.y });
        }
        return hits;
    }
    if (b.mode === "ramp") {
        const rp = table.ramps.find((r) => r.id === b.on);
        b.t += dt;
        if (!rp) b.mode = "free";
        else if (b.t >= rp.time) {
            const end = rampAt(rp, rp.time);
            b.mode = "free";
            b.x = end.x;
            b.y = end.y;
            b.vx = rp.out.x;
            b.vy = rp.out.y;
            b.t = 0;
        } else {
            const p = rampAt(rp, b.t);
            b.x = p.x;
            b.y = p.y;
        }
        return hits;
    }
    const px = b.x,
        py = b.y;
    b.vy += table.gravity * dt;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > TOP) {
        b.vx *= TOP / sp;
        b.vy *= TOP / sp;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const R = table.r,
        still = { x: 0, y: 0 };
    for (const w of table.walls) {
        const q = nearest(b, w.a, w.b),
            hit = bounce(b, q, R, w.e ?? 0.45, w.kick ?? 0, still);
        if (hit > 0)
            hits.push({ kind: "wall", speed: hit, x: q.x, y: q.y, kick: (w.kick ?? 0) > 0 });
    }
    for (const t of table.targets) {
        if (live.down.includes(t.id)) continue;
        const q = nearest(b, t.a, t.b),
            hit = bounce(b, q, R, 0.4, 0, still);
        if (hit > 0) hits.push({ kind: "target", id: t.id, speed: hit, x: q.x, y: q.y });
    }
    for (const p of table.posts) {
        const c = postAt(p, live.t),
            sv = p.move
                ? {
                      x:
                          ((p.move.dx * Math.PI * 2) / p.move.period) *
                          Math.cos((live.t / p.move.period) * Math.PI * 2),
                      y: 0,
                  }
                : still;
        const d = Math.hypot(b.x - c.x, b.y - c.y);
        if (d >= p.r + R) continue;
        const q =
            d < 1e-9
                ? { x: c.x, y: c.y - p.r }
                : { x: c.x + ((b.x - c.x) / d) * p.r, y: c.y + ((b.y - c.y) / d) * p.r };
        const hit = bounce(b, q, R, p.kick ? 0.6 : 0.5, p.kick ?? 0, sv);
        if (hit > 0)
            hits.push({
                kind: "post",
                id: p.id,
                speed: hit,
                x: q.x,
                y: q.y,
                kick: (p.kick ?? 0) > 0,
            });
    }
    table.flippers.forEach((f, i) => {
        const a = live.angles[i] ?? f.rest,
            w = live.turning[i] ?? 0,
            q = nearest(b, f, flipperTip(f, a)),
            along = Math.hypot(q.x - f.x, q.y - f.y) / f.len,
            // the bar tapers from its pivot to its tip
            reach = R + f.r * (1 - 0.35 * along),
            sv = { x: -w * (q.y - f.y), y: w * (q.x - f.x) },
            hit = bounce(b, q, reach, 0.3, 0, sv);
        if (hit > 0) hits.push({ kind: "flipper", side: f.side, speed: hit, x: q.x, y: q.y });
    });
    for (const s of table.sensors) {
        const now = within(b, s),
            was = live.inside.includes(s.id);
        if (now && !was) {
            live.inside.push(s.id);
            hits.push({ kind: "sensor", id: s.id, x: b.x, y: b.y });
        } else if (!now && was) live.inside = live.inside.filter((id) => id !== s.id);
    }
    for (const s of table.spinners) {
        // crossing the spinner's line, going up or down the table
        if ((py - s.y) * (b.y - s.y) <= 0 && py !== b.y && Math.abs(b.x - s.x) <= s.half) {
            const sp = live.spin[s.id];
            if (sp) sp.w = Math.sign(b.vy || 1) * Math.min(40, Math.abs(b.vy) * 2.4);
            hits.push({ kind: "spinner", id: s.id, x: b.x, y: b.y });
        }
    }
    for (const sc of table.saucers)
        if (Math.hypot(b.x - sc.x, b.y - sc.y) < sc.r) {
            b.mode = "saucer";
            b.on = sc.id;
            b.t = 0;
            b.x = sc.x;
            b.y = sc.y;
            b.vx = 0;
            b.vy = 0;
            hits.push({ kind: "saucer", id: sc.id, x: sc.x, y: sc.y });
            return hits;
        }
    for (const rp of table.ramps)
        if (within(b, rp.entry) && b.vy < -4) {
            b.mode = "ramp";
            b.on = rp.id;
            b.t = 0;
            hits.push({ kind: "ramp", id: rp.id, x: b.x, y: b.y });
            return hits;
        }
    if (b.y > table.drain) {
        b.mode = "gone";
        b.vx = 0;
        b.vy = 0;
        hits.push({ kind: "drain", x: px, y: py });
    }
    return hits;
}
