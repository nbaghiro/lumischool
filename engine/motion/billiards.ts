// Balls on a table, seen from above: they roll and slow on the cloth, knock each other as equal
// weights do, bank off the cushions and the round bumpers, are swept by a turning bar, and drop into
// pockets. There is no spin, so a ball goes where its last knock sent it, which is what a child can
// learn to judge by eye. Plain numbers in squares and seconds, stepped in small fixed steps, so a
// shot played twice ends in the same place. See .docs/game-engine.md.
import type { Pt } from "./geometry";

export interface Ball {
    /** The number on it; nought is the white ball the cue strikes. */
    n: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    potted: boolean;
}

export interface Pocket {
    x: number;
    y: number;
    /** Only balls whose number is even, or odd, go down; the rest rattle out. */
    only?: "even" | "odd";
}

/** A place on the cloth that slows a ball more (soft cloth) or leans it one way (a slope), in squares a second each second. */
export interface Patch {
    x: number;
    y: number;
    w: number;
    h: number;
    drag?: number;
    lean?: Pt;
}

/** A bar turning about its middle, `half` squares each side, at `speed` radians a second from `from`. */
export interface Spinner {
    x: number;
    y: number;
    half: number;
    speed: number;
    from: number;
}

export interface Table {
    /** The cushions, as a closed outline of the cloth; a ball's middle keeps `r` inside it. */
    outline: Pt[];
    pockets: Pocket[];
    bumpers: { x: number; y: number; r: number }[];
    patches: Patch[];
    spinners: Spinner[];
}

export interface Feel {
    /** The balls' radius, in squares. */
    r: number;
    /** How far a pocket reaches: a ball whose middle comes this close drops. */
    mouth: number;
    /** Squares a second each second the cloth takes off a rolling ball. */
    roll: number;
    /** Below this speed a ball stops. */
    rest: number;
    ball: number;
    cushion: number;
    bumper: number;
}

export type Knock =
    | { kind: "clack"; speed: number; x: number; y: number }
    | { kind: "cushion"; speed: number; x: number; y: number }
    | { kind: "bumper"; speed: number; x: number; y: number }
    | { kind: "pot"; n: number; pocket: number; x: number; y: number }
    | { kind: "rattle"; n: number; pocket: number; x: number; y: number };

/** Steps a second the balls are moved in; a fast ball moves less than its own radius in one. */
export const SUB = 240;

const dot = (ax: number, ay: number, bx: number, by: number) => ax * bx + ay * by;

/** The nearest point to `p` on the segment from `a` to `b`. */
function nearest(px: number, py: number, a: Pt, b: Pt): Pt {
    const dx = b.x - a.x,
        dy = b.y - a.y,
        len = dx * dx + dy * dy,
        t = len > 0 ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len)) : 0;
    return { x: a.x + dx * t, y: a.y + dy * t };
}

/** Where a spinner's two ends are at time `t`. */
export function spinnerEnds(s: Spinner, t: number): [Pt, Pt] {
    const a = s.from + s.speed * t,
        c = Math.cos(a) * s.half,
        d = Math.sin(a) * s.half;
    return [
        { x: s.x - c, y: s.y - d },
        { x: s.x + c, y: s.y + d },
    ];
}

/** Whether a ball's middle is in a patch. */
const inPatch = (b: Ball, p: Patch) =>
    b.x >= p.x && b.x <= p.x + p.w && b.y >= p.y && b.y <= p.y + p.h;

/**
 * Pushes a ball out of a surface it overlaps and turns back the part of its speed going into it,
 * relative to how fast the surface itself moves there. Returns the speed it met the surface at.
 */
function bounce(
    b: Ball,
    at: Pt,
    reach: number,
    e: number,
    surface: Pt = { x: 0, y: 0 },
    flip = false,
): number {
    let nx = b.x - at.x,
        ny = b.y - at.y;
    const d = Math.hypot(nx, ny);
    if (d >= reach) return 0;
    if (d < 1e-9) {
        nx = 0;
        ny = -1;
    } else {
        nx /= d;
        ny /= d;
    }
    if (flip) {
        nx = -nx;
        ny = -ny;
    }
    b.x = at.x + nx * reach;
    b.y = at.y + ny * reach;
    const into = dot(b.vx - surface.x, b.vy - surface.y, nx, ny);
    if (into >= 0) return 0;
    b.vx -= (1 + e) * into * nx;
    b.vy -= (1 + e) * into * ny;
    return -into;
}

/** Whether a point is inside the outline, by the even-odd rule. */
function inside(px: number, py: number, outline: Pt[]): boolean {
    let yes = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
        const a = outline[i],
            c = outline[j];
        if (!a || !c) continue;
        if (a.y > py !== c.y > py && px < ((c.x - a.x) * (py - a.y)) / (c.y - a.y) + a.x)
            yes = !yes;
    }
    return yes;
}

/**
 * Moves every ball one small step of `dt` seconds at time `t`, and says what knocked and what
 * dropped. Balls already potted are left where they went down.
 */
export function stepTable(balls: Ball[], table: Table, feel: Feel, t: number, dt: number): Knock[] {
    const out: Knock[] = [];
    const live = balls.filter((b) => !b.potted);
    for (const b of live) {
        const speed = Math.hypot(b.vx, b.vy);
        let lean = { x: 0, y: 0 },
            drag = feel.roll;
        for (const p of table.patches)
            if (inPatch(b, p)) {
                drag += p.drag ?? 0;
                if (p.lean) lean = { x: lean.x + p.lean.x, y: lean.y + p.lean.y };
            }
        const leaning = Math.hypot(lean.x, lean.y) > feel.roll;
        if (speed > 0) {
            const slow = Math.max(0, speed - drag * dt) / speed;
            b.vx *= slow;
            b.vy *= slow;
        }
        // a slope steeper than the cloth holds keeps a ball rolling down it
        if (leaning || speed > 0) {
            b.vx += lean.x * dt;
            b.vy += lean.y * dt;
        }
        if (!leaning && Math.hypot(b.vx, b.vy) < feel.rest) {
            b.vx = 0;
            b.vy = 0;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
    }
    for (let i = 0; i < live.length; i++)
        for (let j = i + 1; j < live.length; j++) {
            const a = live[i],
                c = live[j];
            if (!a || !c) continue;
            let nx = c.x - a.x,
                ny = c.y - a.y;
            const d = Math.hypot(nx, ny);
            if (d >= feel.r * 2 || d < 1e-9) continue;
            nx /= d;
            ny /= d;
            const push = (feel.r * 2 - d) / 2;
            a.x -= nx * push;
            a.y -= ny * push;
            c.x += nx * push;
            c.y += ny * push;
            const closing = dot(a.vx - c.vx, a.vy - c.vy, nx, ny);
            if (closing <= 0) continue;
            const j2 = ((1 + feel.ball) * closing) / 2;
            a.vx -= j2 * nx;
            a.vy -= j2 * ny;
            c.vx += j2 * nx;
            c.vy += j2 * ny;
            out.push({ kind: "clack", speed: closing, x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 });
        }
    for (const b of live) {
        for (const m of table.bumpers) {
            const hit = bounce(b, m, m.r + feel.r, feel.bumper);
            if (hit > 0) out.push({ kind: "bumper", speed: hit, x: b.x, y: b.y });
        }
        for (const s of table.spinners) {
            const [a, c] = spinnerEnds(s, t),
                at = nearest(b.x, b.y, a, c),
                // the bar moves where the ball meets it as fast as it turns times how far out that is
                surface = { x: -s.speed * (at.y - s.y), y: s.speed * (at.x - s.x) };
            const hit = bounce(b, at, feel.r + 0.2, feel.bumper, surface);
            if (hit > 0) out.push({ kind: "bumper", speed: hit, x: b.x, y: b.y });
        }
        for (let i = 0; i < table.outline.length; i++) {
            const a = table.outline[i],
                c = table.outline[(i + 1) % table.outline.length];
            if (!a || !c) continue;
            const at = nearest(b.x, b.y, a, c);
            // a middle that has crossed the cushion is pushed back in, never out
            const hit = bounce(
                b,
                at,
                feel.r,
                feel.cushion,
                undefined,
                !inside(b.x, b.y, table.outline),
            );
            if (hit > 0) out.push({ kind: "cushion", speed: hit, x: b.x, y: b.y });
        }
        table.pockets.forEach((p, k) => {
            if (b.potted || Math.hypot(b.x - p.x, b.y - p.y) >= feel.mouth) return;
            const odd = b.n % 2 === 1;
            if (b.n === 0 || !p.only || (p.only === "odd") === odd) {
                b.potted = true;
                b.vx = 0;
                b.vy = 0;
                out.push({ kind: "pot", n: b.n, pocket: k, x: p.x, y: p.y });
                return;
            }
            // a ball this pocket does not take is turned back out of its mouth
            bounce(b, p, feel.mouth + 0.01, 0.6, undefined);
            out.push({ kind: "rattle", n: b.n, pocket: k, x: p.x, y: p.y });
        });
    }
    return out;
}

/** Whether anything on the table is still moving. */
export const rolling = (balls: readonly Ball[]): boolean =>
    balls.some((b) => !b.potted && (b.vx !== 0 || b.vy !== 0));
