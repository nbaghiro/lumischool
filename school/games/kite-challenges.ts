// The variations of Kite flying, and a pilot that flies each one to its win through the game itself.
// A kite cannot be told where to be: the pilot picks the balloon the ask wants next, lets the line out
// or pulls it in to that balloon's distance, and steers the nose at it, pulling the line in when the
// wind drops, as a child would with the keys or with a finger in the sky. What it records is the pads
// it pressed, and the tests play them back through a fresh kite to the same win.
import { emptyPad, type Pad } from "../../engine/motion/pad";
import { wrap } from "../../engine/motion/kite";
import type { Pt } from "../../engine/motion/geometry";
import {
    GROUND,
    HANDS,
    KITE_LEVELS,
    RATE,
    heightOf,
    puffAt,
    rigOf,
    startKite,
    stepKiteGame,
    type KiteLevel,
    type KiteState,
} from "./kite";

export interface KiteConfiguration {
    phase: number;
    variant: number;
}

export const KITE_VARIANTS = 3;

/** A level as a variation lays it out: the numbers moved round the balloons, another day's wind, and other doubles. */
export function vary(L: KiteLevel, variant: number): KiteLevel {
    if (variant === 0) return L;
    const ns = L.spots.map((sp) => sp.n),
        k = variant * 2;
    const of = L.doubles?.[variant];
    return {
        ...L,
        spots: L.spots.map((sp, i) => ({ ...sp, n: ns[(i + k) % ns.length] ?? sp.n })),
        ...(of && L.ask.kind === "double" ? { ask: { kind: "double", of } } : {}),
    };
}

export function kiteChallenge(seed: number, phase: number): KiteConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < KITE_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % KITE_VARIANTS };
}

export function isKiteConfiguration(v: unknown, phase: number): v is KiteConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < KITE_VARIANTS &&
        KITE_LEVELS[phase] !== undefined
    );
}

export function openKiteConfiguration(c: KiteConfiguration): KiteState {
    const L = KITE_LEVELS[c.phase];
    if (!L) throw new Error("No such kite level");
    return startKite(vary(L, c.variant), c.phase, c.variant + 1);
}

/** Every total from nought to `most` the numbers make, each number as often as it likes, since a popped balloon comes back. */
function makes(ns: readonly number[], most: number): boolean[] {
    const can = Array.from({ length: most + 1 }, (_, i) => i === 0);
    for (let t = 1; t <= most; t++) can[t] = ns.some((n) => n <= t && can[t - n] === true);
    return can;
}

/** Where the pilot wants the kite now: the balloon the ask wants next, nearest first, or a point high enough on a height level. */
export function aimOf(s: KiteState): Pt | null {
    const L = s.L,
        a = L.ask,
        t = s.steps / RATE,
        k = s.kite;
    if (a.kind === "height") {
        const r = (a.m + 4 - (GROUND - HANDS.y)) / Math.sin((64 * Math.PI) / 180);
        return {
            x: HANDS.x + r * Math.cos((64 * Math.PI) / 180),
            y: HANDS.y - r * Math.sin((64 * Math.PI) / 180),
        };
    }
    const sum = s.counted.reduce((x, y) => x + y, 0),
        ns = s.puffs.map((p) => p.n),
        can = a.kind === "sum" ? makes(ns, a.total) : [];
    let best: Pt | null = null,
        far = Infinity;
    s.puffs.forEach((p, i) => {
        if (p.gone > 0) return;
        const ok =
            a.kind === "count" || a.kind === "free"
                ? true
                : a.kind === "even"
                  ? p.n % 2 === 0 && !s.counted.includes(p.n)
                  : a.kind === "order"
                    ? p.n === a.seq[s.next]
                    : a.kind === "double"
                      ? p.n === (a.of[s.next] ?? -1) * 2
                      : a.kind === "sum"
                        ? sum + p.n <= a.total && can[a.total - sum - p.n] === true
                        : false;
        if (!ok) return;
        const at = puffAt(p, t, i),
            d = Math.hypot(at.x - k.x, at.y - k.y);
        if (d < far) {
            far = d;
            best = at;
        }
    });
    return best;
}

/** The lean upwind, in radians, that holds a kite high on a short line: the sky's strength wanes overhead, so it must be leaned there and held. */
const LEAN = -0.5;

/** The pad a hand gives this step to fly the kite at `aim`: the keys, or a finger in the sky with the pull button in a lull. */
export function padFor(s: KiteState, aim: Pt, hands: "keys" | "touch"): Pad {
    const pad = emptyPad(),
        k = s.kite,
        rig = rigOf(s.L),
        high = s.L.ask.kind === "height";
    // in a lull the kite flies slower than it stalls: pull the line in while there is line to pull
    const lull = k.u < rig.stall * 1.05 && k.line > rig.least + 2 && heightOf(k) > 2;
    if (hands === "touch") {
        // for a height, the finger goes high above the kite and a little upwind, past the line's reach
        pad.touch = high
            ? { x: k.x + Math.sin(LEAN) * 8, y: k.y - Math.cos(LEAN) * 8 }
            : { x: aim.x, y: aim.y };
        if (lull) pad.go = true;
        return pad;
    }
    const want = high ? rig.most + 1 : Math.hypot(aim.x - HANDS.x, aim.y - HANDS.y) + 0.3;
    const holding: Pad["holding"] = [];
    if (lull || k.line > want + 0.7) holding.push("down");
    else if (k.line < want - 0.7) holding.push("up");
    if (high) {
        if (k.a > LEAN) holding.push("left");
    } else {
        const diff = wrap(Math.atan2(aim.x - k.x, -(aim.y - k.y)) - k.a);
        if (Math.hypot(aim.x - k.x, aim.y - k.y) > 1.2 && Math.abs(diff) > 0.2)
            holding.push(diff > 0 ? "right" : "left");
    }
    pad.holding = holding;
    pad.held = holding.at(-1) ?? null;
    return pad;
}

const kept = (p: Pad): Pad => ({ ...p, pressed: [...p.pressed], holding: [...p.holding] });

/** The longest a flight may take before the pilot gives up: four minutes of play. */
const LIMIT = RATE * 240;

/** The pads that fly a variation to its win by `hands`, or null when it is not won in four minutes. */
export function kiteWay(
    c: KiteConfiguration,
    hands: "keys" | "touch",
    watch?: (s: KiteState) => void,
): Pad[] | null {
    const s = openKiteConfiguration(c),
        pads: Pad[] = [];
    while (!s.won && !s.out && s.steps < LIMIT) {
        const aim = aimOf(s);
        const pad = aim ? padFor(s, aim, hands) : emptyPad();
        pads.push(kept(pad));
        stepKiteGame(s, pad);
        watch?.(s);
    }
    return s.won ? pads : null;
}

/** Whether the pilot wins a variation by the keys and by a finger, for the challenges' certificate; free sky has nothing to win. */
export const kiteCertified = (c: KiteConfiguration): boolean =>
    KITE_LEVELS[c.phase]?.ask.kind === "free" ||
    (kiteWay(c, "keys") !== null && kiteWay(c, "touch") !== null);
