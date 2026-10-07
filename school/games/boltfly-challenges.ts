// The variations of Bolt's sky flight, and a pilot that flies each one to its win through the game
// itself. The pilot picks what the ask wants next, the nearest first, and flies at it as a child
// would: with a finger held on it, or with the keys, holding the jets while Bolt falls faster than it
// should and resting them when they run hot. What it records is the pads it pressed, and the tests
// play them back through a fresh flight to the same win.
import { emptyPad, type Pad } from "../../engine/motion/pad";
import type { Pt } from "../../engine/motion/geometry";
import {
    BODY,
    FLY_LEVELS,
    RATE,
    W,
    shineAt,
    startFly,
    stepFly,
    yAt,
    type FlyLevel,
    type FlyState,
} from "./boltfly";

export interface FlyConfiguration {
    phase: number;
    variant: number;
}

export const FLY_VARIANTS = 3;

/** A level as a variation lays it out: mirrored side to side, or with its numbers moved round the stars. */
export function vary(L: FlyLevel, variant: number): FlyLevel {
    if (variant === 1) {
        const across = (x: number) => W - x;
        return {
            ...L,
            stars: L.stars.map((sp) => ({ ...sp, x: across(sp.x) })),
            ...(L.crew ? { crew: L.crew.map((c) => ({ ...c, x: across(c.x) })) } : {}),
            ledges: L.ledges.map((l) => ({ ...l, x0: across(l.x1), x1: across(l.x0) })),
            ...(L.hazards
                ? {
                      hazards: L.hazards.map((h) => ({
                          ...h,
                          x: across(h.x),
                          ...(h.speed !== undefined ? { speed: -h.speed } : {}),
                          ...(h.swing !== undefined ? { swing: -h.swing } : {}),
                      })),
                  }
                : {}),
            ...(L.moons ? { moons: L.moons.map((m) => ({ ...m, x: across(m.x) })) } : {}),
            ...(L.currents
                ? {
                      currents: L.currents.map((c) => ({
                          ...c,
                          x: -c.x,
                          ...(c.x0 !== undefined && c.x1 !== undefined
                              ? { x0: across(c.x1), x1: across(c.x0) }
                              : {}),
                      })),
                  }
                : {}),
        };
    }
    if (variant === 2) {
        const ns = L.stars.map((sp) => sp.n);
        return {
            ...L,
            stars: L.stars.map((sp, i) => ({ ...sp, n: ns[(i + 2) % ns.length] ?? sp.n })),
        };
    }
    return L;
}

export function flyChallenge(seed: number, phase: number): FlyConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < FLY_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % FLY_VARIANTS };
}

export function isFlyConfiguration(v: unknown, phase: number): v is FlyConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < FLY_VARIANTS &&
        FLY_LEVELS[phase] !== undefined
    );
}

export function openFlyConfiguration(c: FlyConfiguration): FlyState {
    const L = FLY_LEVELS[c.phase];
    if (!L) throw new Error("No such flight level");
    return startFly(vary(L, c.variant), c.phase);
}

/** Every total from nought to `most` the numbers make, each as often as it likes, since a caught star comes back. */
function makes(ns: readonly number[], most: number): boolean[] {
    const can = Array.from({ length: most + 1 }, (_, i) => i === 0);
    for (let t = 1; t <= most; t++) can[t] = ns.some((n) => n <= t && can[t - n] === true);
    return can;
}

/** Where the pilot wants Bolt's feet now: under what the ask wants next, nearest first, or at a height asked to be held. */
export function aimOf(s: FlyState): Pt | null {
    const L = s.L,
        a = L.ask,
        t = s.steps / RATE,
        at = { x: s.f.x, y: s.f.y - BODY };
    if (a.kind === "hold") return { x: 20, y: yAt(L, a.m) };
    let best: Pt | null = null,
        far = Infinity;
    const consider = (p: Pt) => {
        const d = Math.hypot(p.x - at.x, p.y - at.y);
        if (d < far) {
            far = d;
            best = { x: p.x, y: p.y + BODY };
        }
    };
    if (a.kind === "crew") {
        s.crew.forEach((c, i) => {
            if (!c.got) consider(shineAt(c, t, i + 7));
        });
        return best ? around(s, best) : null;
    }
    const sum = s.counted.reduce((x, y) => x + y, 0),
        can =
            a.kind === "sum"
                ? makes(
                      s.stars.map((p) => p.n),
                      a.total,
                  )
                : [];
    s.stars.forEach((p, i) => {
        if (p.gone !== 0) return;
        const ok =
            a.kind === "count" || a.kind === "free"
                ? true
                : a.kind === "fives"
                  ? p.n % 5 === 0 && !s.counted.includes(p.n)
                  : a.kind === "order"
                    ? p.n === a.seq[s.next]
                    : a.kind === "sum"
                      ? sum + p.n <= a.total && can[a.total - sum - p.n] === true
                      : false;
        if (ok) consider(shineAt(p, t, i));
    });
    return best ? around(s, best) : null;
}

/** The squares the pilot leaves round a thing in the way: Bolt's own size and a little room. */
const ROOM = 1.8;

/**
 * The aim, or a point beside the first thing in the way to it: a star that would push Bolt away, a
 * rock, or a moon. The point is on the side Bolt is already on, far enough out to pass it.
 */
function around(s: FlyState, aim: Pt): Pt {
    const L = s.L,
        t = s.steps / RATE,
        from = { x: s.f.x, y: s.f.y - BODY },
        to = { x: aim.x, y: aim.y - BODY },
        dx = to.x - from.x,
        dy = to.y - from.y,
        len = Math.hypot(dx, dy);
    if (len < 1e-6) return aim;
    const things: { at: Pt; r: number }[] = [
        ...(L.moons ?? []).map((m) => ({ at: { x: m.x, y: yAt(L, m.m) }, r: m.r })),
        ...(L.hazards ?? [])
            .filter((h) => h.kind !== "comet" && !h.swing)
            .map((h) => ({ at: { x: h.x, y: yAt(L, h.m) }, r: 1.3 })),
        ...s.stars.flatMap((p, i) =>
            p.gone === 0 && refuses(s, p.n) ? [{ at: shineAt(p, t, i), r: 1.5 }] : [],
        ),
    ];
    // a ledge between Bolt and a point below it is passed off its nearer end, since it is stood on from above
    for (const l of L.ledges) {
        const top = yAt(L, l.m);
        if (!(from.y < top && to.y > top + 0.5)) continue;
        const x = from.x + ((top - from.y) / (to.y - from.y)) * (to.x - from.x);
        if (x < l.x0 - 1.2 || x > l.x1 + 1.2) continue;
        const end =
            from.x - l.x0 < l.x1 - from.x && l.x0 > 2.5
                ? l.x0 - 2.2
                : l.x1 < W - 2.5
                  ? l.x1 + 2.2
                  : l.x0 - 2.2;
        return { x: end, y: top + 1 + BODY };
    }
    let first: { at: Pt; r: number; along: number } | null = null;
    for (const th of things) {
        const along = ((th.at.x - from.x) * dx + (th.at.y - from.y) * dy) / len;
        if (along <= 0 || along >= len) continue;
        const off = Math.abs((th.at.x - from.x) * dy - (th.at.y - from.y) * dx) / len;
        if (off < th.r + ROOM && (!first || along < first.along)) first = { ...th, along };
    }
    if (!first) return aim;
    const side = (from.x - first.at.x) * dy - (from.y - first.at.y) * dx >= 0 ? 1 : -1,
        nx = (dy / len) * side,
        ny = (-dx / len) * side,
        out = first.r + ROOM + 1.2;
    return {
        x: Math.max(2, Math.min(W - 2, first.at.x + nx * out)),
        y: first.at.y + ny * out + BODY,
    };
}

/** Whether a star would push Bolt away rather than pop: past an exact total, or out of turn. */
function refuses(s: FlyState, n: number): boolean {
    const a = s.L.ask;
    if (a.kind === "sum") return s.counted.reduce((x, y) => x + y, 0) + n > a.total;
    if (a.kind === "order") return n !== a.seq[s.next];
    return false;
}

/** Whether the keys are resting the jets: from too hot until they have cooled well down. */
interface Hand {
    resting: boolean;
}

/** The pad a hand gives this step to fly Bolt to `aim`: a finger held on it, or the keys. */
export function padFor(s: FlyState, aim: Pt, hands: "keys" | "touch", hand: Hand): Pad {
    const pad = emptyPad(),
        f = s.f;
    if (hands === "touch") {
        pad.touch = { x: aim.x, y: aim.y };
        return pad;
    }
    if (f.heat > 0.88 || f.sputter > 0) hand.resting = true;
    else if (f.heat < 0.6) hand.resting = false;
    const holding: Pad["holding"] = [];
    const wantVy = Math.max(-4, Math.min(6, -(f.y - aim.y) * 1.5)),
        wantVx = Math.max(-6, Math.min(6, (aim.x - f.x) * 1.2));
    if (!hand.resting && f.vy > wantVy) holding.push("up");
    if (f.vx < wantVx - 0.6) holding.push("right");
    else if (f.vx > wantVx + 0.6) holding.push("left");
    pad.holding = holding;
    pad.held = holding.at(-1) ?? null;
    return pad;
}

const kept = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

/** The longest a flight may take before the pilot gives up: four minutes of play. */
const LIMIT = RATE * 240;

/** The pads that fly a variation to its win by `hands`, or null when it is not won in four minutes. */
export function flyWay(
    c: FlyConfiguration,
    hands: "keys" | "touch",
    watch?: (s: FlyState) => void,
): Pad[] | null {
    const s = openFlyConfiguration(c),
        pads: Pad[] = [],
        hand: Hand = { resting: false };
    while (!s.won && !s.out && s.steps < LIMIT) {
        const aim = aimOf(s);
        const pad = aim ? padFor(s, aim, hands, hand) : emptyPad();
        pads.push(kept(pad));
        stepFly(s, pad);
        watch?.(s);
    }
    return s.won ? pads : null;
}

/** Whether the pilot wins a variation by the keys and by a finger, for the challenges' certificate; free sky has nothing to win. */
export const flyCertified = (c: FlyConfiguration): boolean =>
    FLY_LEVELS[c.phase]?.ask.kind === "free" ||
    (flyWay(c, "keys") !== null && flyWay(c, "touch") !== null);
