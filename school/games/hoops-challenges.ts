// The variations of Hoops in the yard, and a solver that plays each one to its win through the real
// yard: it works out which baskets add up to what the level asks, walks to each spot by the keys or by
// a tap, finds the throw from where Charlie stands now that drops in most surely (and through the
// right hoop, or off the board, where the level asks) by flying a spread of angles and powers through
// the game's own flight, and lets it go by the keys from the fresh aim or by a finger pulling back.
// The spots move after every basket and the wind changes between throws, so every throw is found
// again. A variation a child is given has been played to its win this way first.
import { aimOfPull, launchOf } from "../../engine/motion/aim";
import type { Pt } from "../../engine/motion/geometry";
import { emptyPad, type Dir, type Pad } from "../../engine/motion/pad";
import {
    HOOP_LEVELS,
    SHOT,
    YARD,
    countsAs,
    flightOf,
    handAt,
    handOf,
    hoopsGame,
    placeOf,
    startHoops,
    type HoopLevel,
    type HoopState,
} from "./hoops";

export interface HoopConfiguration {
    phase: number;
    variant: number;
}

export const HOOP_VARIANTS = 3;

/** A level's numbers in its words changed from `from` to `to`, wherever they stand as a whole number. */
function renumber(L: HoopLevel, from: number, to: number): HoopLevel {
    const re = new RegExp(`\\b${from}\\b`, "g"),
        swap = (t: string) => t.replace(re, String(to));
    return {
        ...L,
        title: swap(L.title),
        goal: swap(L.goal).replace("like 3 + 3", to === 6 ? "like 3 + 3" : "like 3 + 2 + 2"),
        prompt: swap(L.prompt),
    };
}

/**
 * The level as one of its variations lays it out: as written; with every spot a step further back
 * and the wind, the hedge and the branch moved; or with a different number to make and the rim a
 * little higher.
 */
export function vary(L: HoopLevel, variant: number): HoopLevel {
    if (variant === 1)
        return {
            ...L,
            spots: L.spots.map((p) => ({ ...p, x: p.x - 1 })),
            ...(L.wind ? { wind: L.wind * 0.6 } : {}),
            ...(L.hedge ? { hedge: { ...L.hedge, x: L.hedge.x - 0.5 } } : {}),
            ...(L.branch ? { branch: { ...L.branch, x: L.branch.x - 0.5 } } : {}),
            ...(L.slide ? { slide: { ...L.slide, period: 5 } } : {}),
        };
    if (variant === 2) {
        const a = L.ask,
            rim = L.rim + 0.5;
        if (a.kind === "exact")
            return { ...renumber(L, a.total, a.total + 1), rim, ask: { ...a, total: a.total + 1 } };
        if (a.kind === "ways") return { ...renumber(L, a.total, 7), rim, ask: { ...a, total: 7 } };
        return { ...L, rim };
    }
    return L;
}

export function hoopChallenge(seed: number, phase: number): HoopConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < HOOP_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % HOOP_VARIANTS };
}

export function isHoopConfiguration(v: unknown, phase: number): v is HoopConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < HOOP_VARIANTS &&
        HOOP_LEVELS[phase] !== undefined
    );
}

export const hoopLevelOf = (c: HoopConfiguration): HoopLevel => {
    const L = HOOP_LEVELS[c.phase];
    if (!L) throw new Error("No such hoops level");
    return vary(L, c.variant);
};

export const openHoopConfiguration = (c: HoopConfiguration): HoopState =>
    startHoops(hoopLevelOf(c), c.phase);

/** How a shot is played: by held arrows and the big button, or by a finger on the field. */
export type Hands = "keys" | "touch";

/**
 * The fewest baskets from `values` that make `total`, largest first, or null when none do. For an
 * ask of several ways, the `ways` smallest different ones.
 */
export function waysToMake(total: number, values: readonly number[], ways = 1): number[][] {
    const out: number[][] = [];
    const walk = (left: number, most: number, took: number[]) => {
        if (left === 0) {
            out.push(took);
            return;
        }
        for (const v of [...values].sort((a, b) => b - a))
            if (v <= most && v <= left) walk(left - v, v, [...took, v]);
    };
    walk(total, Infinity, []);
    return out.sort((a, b) => a.length - b.length).slice(0, ways);
}

const RATE = hoopsGame.rate;

/** One clean copy of a pad for each step, so a later step cannot change it. */
const step = (s: HoopState, p: Pad) =>
    hoopsGame.step(s, { ...p, holding: [...p.holding], pressed: [...p.pressed] });

const held = (d: Dir): Pad => ({ ...emptyPad(), holding: [d], held: d });
const touching = (at: Pt): Pad => ({ ...emptyPad(), touch: { ...at } });
const lifting = (at: Pt): Pad => ({ ...emptyPad(), lifted: { ...at } });

/** Steps with nothing pressed until it is the child's throw again, from where Charlie stops, or the round is over. */
function settle(s: HoopState): Pad[] {
    const out: Pad[] = [];
    for (let i = 0; i < RATE * 60; i++) {
        if (s.mode === "won" || s.mode === "out") break;
        if (s.mode === "aim" && s.turn === "child") break;
        const p = emptyPad();
        step(s, p);
        out.push(p);
    }
    return out;
}

interface Throw {
    angle: number;
    power: number;
    /** The step the hoop must be at, in its slide, when the ball is let go: -1 for a hoop that keeps still. */
    phase: number;
}

/** What a basket must be: through which hoop (0 the high one, 1 the low one), or any. */
interface Want {
    hoop: number | null;
}

const best = new Map<string, Throw[]>();

/** Whether a flight is the basket wanted: in, counted on this level, and through the right hoop. */
const fits = (L: HoopLevel, f: ReturnType<typeof flightOf>, want: Want) =>
    countsAs(L, f) && (want.hoop === null || f.hoop === want.hoop);

/**
 * The throws from the hand at `from` in `wind` that go in as wanted, the surest first: for each angle
 * the middle of its run of powers that do, ranked by how wide that run is.
 */
function throwsFrom(L: HoopLevel, from: Pt, period: number, wind: number, want: Want): Throw[] {
    const key = JSON.stringify([L.rim, L.hedge, L.branch, L.slide, L.low, L.ask, from, wind, want]);
    const known = best.get(key);
    if (known) return known;
    const found: (Throw & { width: number })[] = [];
    const phases = period ? [0, 0.25, 0.5, 0.75].map((k) => Math.round(k * period)) : [-1];
    for (const phase of phases)
        for (let angle = SHOT.lo; angle <= -0.55; angle += 0.025) {
            let start: number | null = null;
            for (let power = SHOT.min; power <= SHOT.max + 0.3; power += 0.1) {
                const v = { x: Math.cos(angle) * power, y: Math.sin(angle) * power };
                const ok =
                    power <= SHOT.max &&
                    fits(L, flightOf(L, from, v, Math.max(0, phase), wind), want);
                if (ok && start === null) start = power;
                if (!ok && start !== null) {
                    found.push({
                        angle,
                        power: (start + power - 0.1) / 2,
                        phase,
                        width: power - start,
                    });
                    start = null;
                }
            }
        }
    const out = found
        .sort((a, b) => b.width - a.width)
        .map(({ angle, power, phase }) => ({ angle, power, phase }));
    best.set(key, out);
    return out;
}

/** The pads that walk Charlie to spot `i`, by the keys' next-spot button or a tap on it, and wait while she gets there. */
function walkTo(s: HoopState, i: number, hands: Hands): Pad[] {
    const pads: Pad[] = [];
    if (i !== s.spot) {
        if (hands === "keys") {
            const presses = (i - s.spot + s.L.spots.length) % s.L.spots.length;
            for (let k = 0; k < presses; k++) pads.push({ ...emptyPad(), brake: true }, emptyPad());
        } else {
            const at = { x: placeOf(s.L, s.seed, i, s.makes).x, y: YARD.floor + 1.1 };
            pads.push(touching(at), lifting(at));
        }
    }
    for (const p of pads) step(s, p);
    for (let k = 0; k < RATE * 5 && s.mode === "walk"; k++) {
        const p = emptyPad();
        step(s, p);
        pads.push(p);
    }
    return pads;
}

/** The pads that set the aim to `t` from the fresh aim and let it go, waiting for the hoop's slide where it slides. */
function aimPads(s: HoopState, t: Throw, hands: Hands, period: number): Pad[] {
    const pads: Pad[] = [];
    const from = handOf(s);
    const wait = (hold: Pad) => {
        // let go on the step whose number puts the hoop where the throw was found for
        while (period && (s.steps + 1) % period !== t.phase) {
            step(s, hold);
            pads.push(hold);
        }
    };
    if (hands === "keys") {
        // the steepest throw is held past its last step, so the aim stops at the limit itself
        const steps = (t.angle - s.aim.angle) / (SHOT.turn / RATE),
            turns = t.angle <= SHOT.lo + 1e-9 ? Math.floor(steps) - 1 : Math.round(steps),
            ramps = Math.round((t.power - s.aim.power) / (SHOT.ramp / RATE));
        for (let i = 0; i < Math.abs(turns); i++) pads.push(held(turns < 0 ? "up" : "down"));
        for (let i = 0; i < Math.abs(ramps); i++) pads.push(held(ramps < 0 ? "left" : "right"));
        for (const p of pads) step(s, p);
        wait(emptyPad());
        const go = { ...emptyPad(), go: true, tapped: true };
        step(s, go);
        pads.push(go);
        return pads;
    }
    const len = t.power / SHOT.per,
        end = { x: from.x - Math.cos(t.angle) * len, y: from.y - Math.sin(t.angle) * len };
    pads.push(touching(from));
    for (let k = 1; k <= 4; k++)
        pads.push(
            touching({
                x: from.x + ((end.x - from.x) * k) / 4,
                y: from.y + ((end.y - from.y) * k) / 4,
            }),
        );
    for (const p of pads) step(s, p);
    wait(touching(end));
    const off = lifting(end);
    step(s, off);
    pads.push(off);
    return pads;
}

/** What the aim as the keys would leave it lets go as, for checking a throw before taking it. */
function keysAim(s: HoopState, t: Throw): { angle: number; power: number } {
    const c = structuredClone(s);
    aimPads(c, { ...t, phase: -1 }, "keys", 0);
    return { angle: c.aim.angle, power: c.aim.power };
}

/** A step of the plan: the spot to shoot from (or wherever Charlie is), and the basket wanted. */
interface Goal {
    spot: number | null;
    want: Want;
}

/** The progress a basket that counted makes, to tell one that counted from one that did not. */
const progress = (s: HoopState) => s.made.length + s.ways.length * 100 + s.streak;

/** One basket as `g` asks: the walk there and the surest throw that goes in, or null. */
function basket(s: HoopState, g: Goal, hands: Hands): Pad[] | null {
    const period = s.L.slide ? Math.round(s.L.slide.period * RATE) : 0;
    // Pip's throw, or Charlie walking to a spot chalked again, comes first
    const lead = settle(s);
    if (s.mode !== "aim") return null;
    const where =
        g.spot === null || g.spot === s.spot ? s.place : placeOf(s.L, s.seed, g.spot, s.makes);
    for (const t of throwsFrom(s.L, handAt(where), period, s.wind, g.want).slice(0, 12)) {
        const c = structuredClone(s);
        const walk = g.spot === null ? [] : walkTo(c, g.spot, hands);
        if (c.mode !== "aim") return null;
        if (!period) {
            const from = handOf(c),
                len = t.power / SHOT.per;
            const a =
                hands === "keys"
                    ? { ...keysAim(c, t), pulling: false }
                    : aimOfPull({ x: -Math.cos(t.angle) * len, y: -Math.sin(t.angle) * len }, SHOT);
            if (!fits(c.L, flightOf(c.L, from, launchOf(a), c.steps + 1, c.wind), g.want)) continue;
        }
        const before = progress(c);
        const pads = [...walk, ...aimPads(c, t, hands, period), ...settle(c)];
        if (progress(c) !== before || hoopsGame.won(c)) {
            Object.assign(s, c);
            return [...lead, ...pads];
        }
    }
    return null;
}

/** The plan's goals for an ask of a total made from spots or hoops worth `values`. */
function goalsFor(s: HoopState, total: number, ways = 1): Goal[] | null {
    const L = s.L,
        low = L.low;
    const values = low ? [low.n, low.top] : [...new Set(L.spots.map((p) => p.n))];
    const plan = waysToMake(total, values, ways);
    if (plan.length < ways) return null;
    return plan
        .flat()
        .map((n) =>
            low
                ? { spot: null, want: { hoop: n === low.n ? 1 : 0 } }
                : { spot: L.spots.findIndex((p) => p.n === n), want: { hoop: null } },
        );
}

/**
 * The pads that play a variation to its win, basket by basket, by the keys or by a finger, or null
 * when a basket the plan needs cannot be found. On Copy Pip each of Pip's baskets is copied from
 * where Pip stood.
 */
export function hoopWay(c: HoopConfiguration, hands: Hands = "keys"): Pad[] | null {
    const s = openHoopConfiguration(c);
    const a = s.L.ask;
    const pads: Pad[] = [];
    if (a.kind === "free") return null;
    const any: Goal = { spot: null, want: { hoop: null } };
    const goals =
        a.kind === "world"
            ? s.L.spots.map(() => any)
            : a.kind === "copy"
              ? Array.from({ length: a.matches }, () => any)
              : a.kind === "ways"
                ? goalsFor(s, a.total, a.ways)
                : goalsFor(s, a.total);
    if (!goals) return null;
    for (const g of goals) {
        const got = basket(s, g, hands);
        if (!got) return null;
        pads.push(...got);
        if (s.mode === "won") return pads;
    }
    return s.mode === "won" ? pads : null;
}
