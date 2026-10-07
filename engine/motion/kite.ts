// A kite on a line in a side-on wind, the wind blowing to the right. The kite flies along its nose
// at an airspeed the wind gives it, drifts downwind with the air, and sinks once it flies slower
// than it stalls; the line is a length it may not go past, so a taut line holds it against the wind
// on a circle round the hands and it slides along that circle the way its nose and the wind send it.
// Steering turns the nose, so a held turn loops; let go, the nose comes back upright. The wind is
// strongest low and downwind and dies towards the top of the sky, so a kite left alone rests high
// downwind of the hands, and nearer the ground the wind is weaker. Pulling the line in takes up
// slack and adds airspeed, which is how a flyer keeps a kite up in a lull. Everything is in squares,
// seconds and radians with y growing downwards, and pure, so a game keeps it in its state and a
// test steps it in node. See .docs/engine.md.
import type { Pt } from "./geometry";

export interface Kite {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Where the nose points: radians clockwise from straight up. */
    a: number;
    /** Squares a second through the air, along the nose. */
    u: number;
    /** Squares of line out. */
    line: number;
}

export interface Rig {
    /** Airspeed for each square a second of wind, in the strongest part of the sky. */
    lift: number;
    /** Radians a second the nose turns at full steer and full airspeed. */
    turn: number;
    /** The share of the way back to upright the nose comes each second when not steered. */
    right: number;
    /**
     * How hard the nose leans back upright while it is steered, per second: nought lets a held steer
     * loop, and more holds it to a lean, for a kite that cannot be turned upside down.
     */
    keel: number;
    /** Airspeed below which it sinks, and the fastest it sinks, in squares a second. */
    stall: number;
    sink: number;
    /** How quickly the kite takes up the way the air sends it, per second: lower is heavier. */
    heavy: number;
    /** Squares a second each second a nose-down dive gains. */
    dive: number;
    /** Airspeed the hands add while pulling a taut line in. */
    pull: number;
    /** Squares a second the line comes in and goes out. */
    reelIn: number;
    reelOut: number;
    least: number;
    most: number;
}

/** What the hands do this step: steer from -1 (anticlockwise) to 1, or point the nose at `toward`; pull the line in, hold it, or let it out. */
export interface Hands {
    steer: number;
    toward: Pt | null;
    reel: -1 | 0 | 1;
}

/** The wind aloft where the kite is, and the day's usual wind, in squares a second. */
export interface Air {
    now: number;
    usual: number;
}

/** Where the hands hold the line, and the ground's height, in squares. */
export interface Field {
    hands: Pt;
    ground: number;
}

export const noseOf = (a: number): Pt => ({ x: Math.sin(a), y: -Math.cos(a) });

/** An angle brought into -π to π. */
export const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** The line's angle above the ground downwind of the hands: nought along the ground, a quarter turn straight up. */
export const elevation = (k: Pt, hands: Pt): number => Math.atan2(hands.y - k.y, k.x - hands.x);

/** The share of the wind's push the sky gives a kite at elevation `e`: all of it low downwind, little straight overhead. */
export const powerAt = (e: number): number =>
    Math.max(0.1, Math.min(1, 1.15 * Math.cos(0.95 * e) + 0.12));

/** The wind's share near the ground: half of it at the hands' height, all of it twelve squares up. */
export const nearGround = (height: number): number =>
    0.45 + 0.55 * Math.max(0, Math.min(1, height / 12));

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** How the hands steer this step, from -1 to 1: as held, or turning the nose towards a point. */
export function steerOf(k: Kite, h: Hands): number {
    if (!h.toward) return clamp(h.steer, -1, 1);
    const dx = h.toward.x - k.x,
        dy = h.toward.y - k.y;
    if (Math.hypot(dx, dy) < 1.5) return 0;
    return clamp(wrap(Math.atan2(dx, -dy) - k.a) / 0.5, -1, 1);
}

/** The airspeed the wind gives a kite where it is: the wind there, near the ground or not, through the part of the sky it is in, and less on a slack line. */
export function airspeedFor(k: Kite, air: Air, f: Field, rig: Rig): number {
    const d = Math.hypot(k.x - f.hands.x, k.y - f.hands.y),
        taut = clamp(1 - (k.line - d) / 2, 0.2, 1);
    return rig.lift * air.now * nearGround(f.ground - k.y) * powerAt(elevation(k, f.hands)) * taut;
}

/** One step of `dt` seconds; says whether the line is taut at its end. */
export function stepKite(k: Kite, f: Field, air: Air, h: Hands, rig: Rig, dt: number): boolean {
    if (h.reel === 1) k.line = Math.max(rig.least, k.line - rig.reelIn * dt);
    else if (h.reel === -1) k.line = Math.min(rig.most, k.line + rig.reelOut * dt);
    const steer = steerOf(k, h),
        usual = rig.lift * air.usual * 0.8;
    if (steer !== 0)
        k.a +=
            (steer * rig.turn * (0.4 + 0.6 * clamp(k.u / usual, 0, 1.3)) - rig.keel * wrap(k.a)) *
            dt;
    else k.a -= wrap(k.a) * (1 - Math.exp(-rig.right * dt));
    k.a = wrap(k.a);
    const d0 = Math.hypot(k.x - f.hands.x, k.y - f.hands.y),
        tight = d0 >= k.line - 0.3;
    const want = airspeedFor(k, air, f, rig) + (h.reel === 1 && tight ? rig.pull : 0),
        n = noseOf(k.a);
    k.u += (want - k.u) * (1 - Math.exp(-2.2 * dt)) + (n.y > 0 ? rig.dive * n.y * dt : 0);
    k.u = clamp(k.u, 0, 24);
    // under its stall speed the wings carry it less and less, and what they no longer carry it sinks by
    const carried = clamp(k.u / rig.stall, 0, 1) ** 2,
        wind = air.now * nearGround(f.ground - k.y),
        sink = rig.sink * (1 - carried),
        rise = Math.max(0, air.now - air.usual) * 0.9;
    const vx = n.x * k.u * carried + wind,
        vy = n.y * k.u * carried + sink - rise,
        ease = 1 - Math.exp(-rig.heavy * dt);
    k.vx += (vx - k.vx) * ease;
    k.vy += (vy - k.vy) * ease;
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    const dx = k.x - f.hands.x,
        dy = k.y - f.hands.y,
        d = Math.hypot(dx, dy);
    if (d <= k.line || d < 1e-9) return false;
    const ox = dx / d,
        oy = dy / d;
    k.x = f.hands.x + ox * k.line;
    k.y = f.hands.y + oy * k.line;
    const out = k.vx * ox + k.vy * oy;
    if (out > 0) {
        k.vx -= out * ox;
        k.vy -= out * oy;
    }
    return true;
}

/** Where the tail hangs from: under the kite, turned with it. */
export function tailRoot(k: Kite, below = 1.2): Pt {
    return { x: k.x - Math.sin(k.a) * below, y: k.y + Math.cos(k.a) * below };
}

/**
 * One step of a tail of bows hung from `root`: each bow is blown downwind and falls a little, and is
 * held `seg` squares from the one before, so the tail streams behind wherever the kite goes.
 */
export function stepTail(tail: Pt[], root: Pt, wind: number, dt: number, seg = 0.7): void {
    let prev = root;
    for (const p of tail) {
        p.x += wind * 0.5 * dt;
        p.y += 2.4 * dt;
        const dx = p.x - prev.x,
            dy = p.y - prev.y,
            d = Math.hypot(dx, dy);
        if (d > seg) {
            p.x = prev.x + (dx / d) * seg;
            p.y = prev.y + (dy / d) * seg;
        }
        prev = p;
    }
}

/** How far the line sags below straight at its middle, in squares: a little for its weight, more when it is slack or the wind is light. */
export function sagOf(k: Kite, hands: Pt, air: Air): number {
    const d = Math.hypot(k.x - hands.x, k.y - hands.y),
        slack = Math.max(0, k.line - d),
        light = clamp(1 - air.now / Math.max(0.1, air.usual), 0, 1);
    return Math.min(d * 0.3, d * (0.025 + 0.04 * light) + slack * 1.6);
}

/** A change in the wind that sweeps across from the left: a gust when `amp` is above nought, a lull below. */
export interface Change {
    /** When its front leaves the world's left edge, in seconds. */
    at: number;
    rise: number;
    hold: number;
    fall: number;
    /** The share of the usual wind it adds, or takes away when less than nought. */
    amp: number;
}

/** Squares a second a change's front crosses the world. */
export const FRONT = 14;

const ease = (u: number) => u * u * (3 - 2 * u);

/** A change's strength, from nought to one, `t` seconds after its front left the left edge, at `x`. */
export function changeAt(c: Change, x: number, t: number): number {
    const s = t - c.at - x / FRONT,
        len = c.rise + c.hold + c.fall;
    if (s <= 0 || s >= len) return 0;
    return s < c.rise ? ease(s / c.rise) : s < c.rise + c.hold ? 1 : ease((len - s) / c.fall);
}

/** The wind aloft at `x`, `t` seconds in: the usual wind with every change on it, never quite still. */
export function windAt(usual: number, changes: readonly Change[], x: number, t: number): number {
    let k = 1;
    for (const c of changes) k += c.amp * changeAt(c, x, t);
    return usual * Math.max(0.15, k);
}

/**
 * A day's changes from a seed: a gust or a lull every `every` seconds or so, for `seconds`, with gusts
 * as strong as `gust` and lulls as deep as `lull` (shares of the usual wind). Nothing changes in the
 * first few seconds, so a launch is always in the usual wind.
 */
export function changesOf(
    seed: number,
    o: { every: number; gust: number; lull: number; seconds: number },
): Change[] {
    if (o.every <= 0 || (o.gust <= 0 && o.lull <= 0)) return [];
    let r = seed >>> 0 || 1;
    const rand = () => {
        r ^= r << 13;
        r ^= r >>> 17;
        r ^= r << 5;
        return (r >>> 0) / 4294967296;
    };
    const out: Change[] = [];
    for (let t = 5 + rand() * o.every * 0.5; t < o.seconds; t += o.every * (0.7 + rand() * 0.6)) {
        const lull = o.lull > 0 && (o.gust <= 0 || rand() < 0.4);
        out.push({
            at: Math.round(t * 10) / 10,
            rise: lull ? 1.2 : 0.8,
            hold: Math.round((lull ? 2.4 : 1.4 + rand() * 1.2) * 10) / 10,
            fall: lull ? 1.2 : 1.4,
            amp: lull
                ? -Math.round(o.lull * (0.8 + rand() * 0.2) * 100) / 100
                : Math.round(o.gust * (0.7 + rand() * 0.3) * 100) / 100,
        });
    }
    return out;
}
