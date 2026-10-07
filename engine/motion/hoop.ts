// A ball thrown at a basket, seen from the side, in squares and seconds with y growing downwards. It
// flies under gravity with a little air drag and a steady wind, and spins as it was let go. The
// backboard, a hedge and a branch are solid boxes, the rim is two small solid circles (its near and far
// edges as the side view shows them), and the floor and a wall behind the hoop are solid too, so a ball
// can rattle in, bounce out off the front of the rim, roll round the far edge or kiss the board in. The
// net is a sensor: the ball's middle passing down between the two edges scores once, through whichever
// hoop of the court it went, and a ball that came up from under a rim can no longer score there. The net is drawn from a few verlet points that the ball
// pushes aside and the wind sways. Every step is cut into substeps short enough that the ball never
// passes through the thin rim. See .docs/games.md.
import type { Pt } from "./geometry";

export interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Radians a second, clockwise on the page: a ball thrown to the right with backspin has less than nought. */
    spin: number;
    /** How far it has turned, in radians, for drawing its seams. */
    turn: number;
}

/** A solid box: the backboard, a hedge, a branch overhead. */
export interface Block {
    x: number;
    y: number;
    w: number;
    h: number;
    /** The share of the speed into it that comes back out. */
    bounce: number;
    /** How hard its face grips the ball's surface, against the ball's slip and spin. */
    grip: number;
    kind: "board" | "hedge" | "branch";
    /** Squares a second it slides across, for a board that moves with its hoop. */
    vx?: number;
}

/** The rim: the middle of its opening, half the distance between its two edges, and the thickness of the tube. */
export interface Rim {
    x: number;
    y: number;
    half: number;
    tube: number;
    vx?: number;
}

export interface Court {
    /** The ball's radius. */
    r: number;
    gravity: number;
    /** The share of its speed the air takes each second. */
    drag: number;
    /** Squares a second each second along x: more than nought blows towards the hoop. */
    wind: number;
    floor: number;
    /** A wall behind the hoop the ball cannot pass, or null. */
    wall: number | null;
    rim: Rim;
    /** More hoops beside the first, each scoring on its own: a low one and a high one. */
    rims?: Rim[];
    blocks: Block[];
    rimBounce: number;
    rimGrip: number;
    floorBounce: number;
    floorGrip: number;
}

export type Contact = "rim" | "board" | "hedge" | "branch" | "floor" | "wall";

export type HoopEvent =
    | { kind: Contact; speed: number; x: number; y: number }
    | { kind: "score"; x: number; y: number; hoop: number };

/** What the nets have seen of one shot: whether it scored and through which hoop, and the hoops the ball came up through from under. */
export interface Sensor {
    scored: boolean;
    /** The hoop it went through, by its place in the court's hoops (the first is 0), or -1. */
    hoop: number;
    under: number[];
}

export const freshSensor = (): Sensor => ({ scored: false, hoop: -1, under: [] });

/** Substeps a step is cut into: at 60 steps a second a ball at 40 squares a second moves under a tenth of a square in each, less than the rim's tube and the ball together. */
export const SUB = 8;

/** A hollow ball's spin takes this share of a grip's push for each share its body takes: a hollow sphere's 3/2 over its mass. */
const SPIN_SHARE = 1.5;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The ball meets a surface whose outward normal is `n` and which moves across at `vx`: the speed
 * into it comes back as `bounce` says, and the grip trades the ball's slip at the contact point
 * between its body and its spin, as far as friction allows. Returns the speed it came in at.
 */
function meet(b: Ball, r: number, nx: number, ny: number, bounce: number, grip: number, vx = 0) {
    const rx = b.vx - vx,
        ry = b.vy;
    const vn = rx * nx + ry * ny;
    if (vn >= 0) return 0;
    const tx = -ny,
        ty = nx;
    // the contact point's slip along the face: the body's speed there and the spin's
    const slip = rx * tx + ry * ty - b.spin * r;
    // a ball barely moving into a face stops bouncing on it, so it can come to rest
    const e = -vn < 0.6 ? 0 : bounce;
    let ox = rx - (1 + e) * vn * nx,
        oy = ry - (1 + e) * vn * ny;
    const most = grip * (1 + e) * -vn,
        j = clamp(-slip / (1 + SPIN_SHARE), -most, most);
    ox += j * tx;
    oy += j * ty;
    b.spin -= (SPIN_SHARE * j) / r;
    b.vx = ox + vx;
    b.vy = oy;
    return -vn;
}

/** Pushes the ball out of one edge of `rim`, the circle of its tube at `cx`, and meets it there. */
function offCircle(b: Ball, c: Court, rim: Rim, cx: number): number {
    const cy = rim.y,
        dx = b.x - cx,
        dy = b.y - cy,
        d = Math.hypot(dx, dy),
        least = c.r + rim.tube;
    if (d >= least || d < 1e-9) return 0;
    const nx = dx / d,
        ny = dy / d;
    b.x = cx + nx * least;
    b.y = cy + ny * least;
    return meet(b, c.r, nx, ny, c.rimBounce, c.rimGrip, rim.vx ?? 0);
}

/** Pushes the ball out of a box from its nearest point, or out of its nearest side when its middle is inside. */
function offBlock(b: Ball, r: number, k: Block): number {
    let px = clamp(b.x, k.x, k.x + k.w),
        py = clamp(b.y, k.y, k.y + k.h);
    const d = Math.hypot(b.x - px, b.y - py);
    if (d >= r) return 0;
    let nx: number, ny: number;
    if (d > 1e-9) {
        nx = (b.x - px) / d;
        ny = (b.y - py) / d;
    } else {
        const gaps = [b.x - k.x, k.x + k.w - b.x, b.y - k.y, k.y + k.h - b.y];
        const side = gaps.indexOf(Math.min(...gaps));
        nx = side === 0 ? -1 : side === 1 ? 1 : 0;
        ny = side === 2 ? -1 : side === 3 ? 1 : 0;
        px = side === 0 ? k.x : side === 1 ? k.x + k.w : b.x;
        py = side === 2 ? k.y : side === 3 ? k.y + k.h : b.y;
    }
    b.x = px + nx * r;
    b.y = py + ny * r;
    return meet(b, r, nx, ny, k.bounce, k.grip, k.vx ?? 0);
}

/** One substep of the ball's flight alone: gravity, drag and wind, then where that takes it. Contacts are the caller's. */
function fly(b: Ball, c: Court, h: number): void {
    b.vx += (c.wind - c.drag * b.vx) * h;
    b.vy += (c.gravity - c.drag * b.vy) * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.turn += b.spin * h;
    b.spin *= 1 - 0.15 * h;
}

/**
 * One step of `dt` seconds, in substeps: the flight, then every contact, then the net's sensor.
 * Returns what the ball met, at the speed it met it, and a score the one time it scores.
 */
export function stepBall(b: Ball, c: Court, sensor: Sensor, dt: number): HoopEvent[] {
    const out: HoopEvent[] = [];
    const h = dt / SUB,
        rims = [c.rim, ...(c.rims ?? [])];
    for (let i = 0; i < SUB; i++) {
        const wasY = b.y;
        fly(b, c, h);
        const hit = (kind: Contact, speed: number) => {
            if (speed > 0) out.push({ kind, speed, x: b.x, y: b.y });
        };
        for (const rim of rims) {
            hit("rim", offCircle(b, c, rim, rim.x - rim.half));
            hit("rim", offCircle(b, c, rim, rim.x + rim.half));
        }
        for (const k of c.blocks) hit(k.kind, offBlock(b, c.r, k));
        if (b.y + c.r > c.floor) {
            b.y = c.floor - c.r;
            hit("floor", meet(b, c.r, 0, -1, c.floorBounce, c.floorGrip));
            // the drive's rub on a rolling ball, so one rolling away slows to a stop
            b.vx *= 1 - 0.8 * h;
        }
        if (c.wall !== null && b.x + c.r > c.wall) {
            b.x = c.wall - c.r;
            hit("wall", meet(b, c.r, -1, 0, 0.5, 0.3));
        }
        rims.forEach((rim, hoop) => {
            const inside = b.x > rim.x - rim.half + rim.tube && b.x < rim.x + rim.half - rim.tube;
            const up = sensor.under.includes(hoop);
            if (!sensor.scored && inside && wasY < rim.y && b.y >= rim.y && !up) {
                sensor.scored = true;
                sensor.hoop = hoop;
                out.push({ kind: "score", x: b.x, y: rim.y, hoop });
            }
            if (inside && wasY > rim.y && b.y <= rim.y && !up) sensor.under.push(hoop);
        });
    }
    return out;
}

/** A net's points as x, y pairs: two strings, from the near edge and the far edge of the rim, `NET_ROWS` points each, the first of each tied to the rim. */
export interface Net {
    pts: number[];
    was: number[];
}

export const NET_ROWS = 4;
/** How deep the net hangs, and how narrow it draws in at its foot, in squares. */
const NET_DEEP = 1.9,
    NET_FOOT = 0.9;

const restAt = (rim: Rim, side: 0 | 1, row: number): Pt => {
    const k = row / (NET_ROWS - 1),
        w = rim.half * 2 + (NET_FOOT - rim.half * 2) * k;
    return { x: rim.x + (side ? 1 : -1) * (w / 2), y: rim.y + NET_DEEP * k };
};

export function netAt(rim: Rim): Net {
    const pts: number[] = [];
    for (const side of [0, 1] as const)
        for (let row = 0; row < NET_ROWS; row++) {
            const p = restAt(rim, side, row);
            pts.push(p.x, p.y);
        }
    return { pts, was: [...pts] };
}

/** The point of the net on `side` at `row`. */
export function netPoint(n: Net, side: 0 | 1, row: number): Pt {
    const i = (side * NET_ROWS + row) * 2;
    return { x: n.pts[i] ?? 0, y: n.pts[i + 1] ?? 0 };
}

const setPt = (a: number[], i: number, x: number, y: number) => {
    a[i] = x;
    a[i + 1] = y;
};

/**
 * One step of the net: each loose point carries on as it was going, with gravity and the wind, the
 * ball pushes aside any point it is on, and the strings and the rows keep their lengths. Returns how
 * hard the ball pushed through it, for a swish.
 */
export function stepNet(n: Net, rim: Rim, ball: Pt | null, r: number, wind: number, dt: number) {
    let push = 0;
    for (const side of [0, 1] as const)
        for (let row = 0; row < NET_ROWS; row++) {
            const i = (side * NET_ROWS + row) * 2;
            const x = n.pts[i] ?? 0,
                y = n.pts[i + 1] ?? 0,
                px = n.was[i] ?? x,
                py = n.was[i + 1] ?? y;
            if (row === 0) {
                const top = restAt(rim, side, 0);
                setPt(n.pts, i, top.x, top.y);
                setPt(n.was, i, top.x, top.y);
                continue;
            }
            // a cord net settles in about a second: most of its last move carries on, the rest is lost
            const keep = 0.9;
            let nx = x + (x - px) * keep + wind * 0.25 * dt * dt,
                ny = y + (y - py) * keep + 12 * dt * dt;
            if (ball) {
                const dx = nx - ball.x,
                    dy = ny - ball.y,
                    d = Math.hypot(dx, dy);
                if (d < r && d > 1e-9) {
                    push = Math.max(push, r - d);
                    nx = ball.x + (dx / d) * r;
                    ny = ball.y + (dy / d) * r;
                }
            }
            setPt(n.was, i, x, y);
            setPt(n.pts, i, nx, ny);
        }
    for (let it = 0; it < 3; it++) {
        for (const side of [0, 1] as const)
            for (let row = 1; row < NET_ROWS; row++) hold(n, rim, side, row, side, row - 1);
        for (let row = 1; row < NET_ROWS; row++) hold(n, rim, 0, row, 1, row);
    }
    return push;
}

/** Keeps two points of the net as far apart as they hang at rest, moving the lower or both. */
function hold(n: Net, rim: Rim, sa: 0 | 1, ra: number, sb: 0 | 1, rb: number): void {
    const a = netPoint(n, sa, ra),
        b = netPoint(n, sb, rb);
    const ra0 = restAt(rim, sa, ra),
        rb0 = restAt(rim, sb, rb);
    const want = Math.hypot(ra0.x - rb0.x, ra0.y - rb0.y),
        dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy);
    if (d < 1e-9) return;
    const k = (d - want) / d;
    const pinned = rb === 0;
    const ia = (sa * NET_ROWS + ra) * 2,
        ib = (sb * NET_ROWS + rb) * 2;
    if (pinned) setPt(n.pts, ia, a.x + dx * k, a.y + dy * k);
    else {
        setPt(n.pts, ia, a.x + dx * k * 0.5, a.y + dy * k * 0.5);
        setPt(n.pts, ib, b.x - dx * k * 0.5, b.y - dy * k * 0.5);
    }
}

/** Sets the net's loose points moving, as a ball off the rim shakes it: `by` squares a step, outwards at the foot. */
export function shakeNet(n: Net, by: number): void {
    for (const side of [0, 1] as const)
        for (let row = 1; row < NET_ROWS; row++) {
            const i = (side * NET_ROWS + row) * 2;
            n.was[i] = (n.was[i] ?? 0) - (side ? 1 : -1) * by * (row / NET_ROWS);
        }
}
