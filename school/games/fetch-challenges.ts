// The variations of Fetch with the pups: each level's numbers moved along the path, and a solver that
// finds a keyboard throw for every ask by playing it through the real park, so a variation a child is
// given has been played to the end first. A throw starts from the same place every time (the pups are
// put back on their seats), so each ask is searched on its own and the whole plan is replayed after.
import { emptyPad, type Pad } from "../../engine/motion/pad";
import {
    FETCH_LEVELS,
    FIRST_AIM,
    fetchGame,
    startFetch,
    type Ask,
    type FetchLevel,
    type FetchState,
} from "./fetch";

export interface FetchConfiguration {
    phase: number;
    variant: number;
}

/** How far each variation moves a level's numbers along the path, in metres. */
const SHIFTS = [0, 1, -1, 2] as const;

const shifted = (a: Ask, by: number): Ask =>
    a.kind === "pup"
        ? { ...a }
        : a.kind === "past"
          ? { ...a, by: a.by + by }
          : { ...a, at: a.at + by };

/** A level with its numbers moved for a variation. */
export function vary(L: FetchLevel, variant: number): FetchLevel {
    const by = SHIFTS[variant] ?? 0;
    return { ...L, seats: { ...L.seats }, asks: L.asks.map((a) => shifted(a, by)) };
}

export function fetchChallenge(seed: number, phase: number): FetchConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < FETCH_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % SHIFTS.length };
}

export function isFetchConfiguration(v: unknown, phase: number): v is FetchConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < SHIFTS.length &&
        FETCH_LEVELS[phase] !== undefined
    );
}

export function openFetchConfiguration(c: FetchConfiguration): FetchState {
    const L = FETCH_LEVELS[c.phase];
    if (!L) throw new Error("No such fetch level");
    return startFetch(vary(L, c.variant), c.phase);
}

const RATE = fetchGame.rate;
/** One held key's worth of aim a step: radians and squares a second, as engine/motion/aim.ts moves them. */
const TURN = 1.2 / RATE,
    RAMP = 10 / RATE;

const held = (d: "up" | "down" | "left" | "right"): Pad => ({ ...emptyPad(), holding: [d] });

/** The pads that swap to `toy`, turn the aim to `angle` and `power` from where it is, and throw. */
function throwPads(s: FetchState, toy: number, angle: number, power: number): Pad[] {
    const out: Pad[] = [];
    const at = s.L.toys.indexOf(s.toy),
        swaps = (toy - at + s.L.toys.length) % s.L.toys.length;
    for (let i = 0; i < swaps; i++) out.push({ ...emptyPad(), brake: true }, emptyPad());
    const turns = Math.round((angle - s.aim.angle) / TURN),
        ramps = Math.round((power - s.aim.power) / RAMP);
    for (let i = 0; i < Math.abs(turns); i++) out.push(held(turns < 0 ? "up" : "down"));
    for (let i = 0; i < Math.abs(ramps); i++) out.push(held(ramps < 0 ? "left" : "right"));
    out.push({ ...emptyPad(), tapped: true });
    return out;
}

const play = (s: FetchState, pads: readonly Pad[]) => {
    for (const p of pads)
        fetchGame.step(s, { ...p, holding: [...p.holding], pressed: [...p.pressed] });
};

/** Steps with nothing pressed until the pups are back on their seats, or the level is won. */
function settle(s: FetchState, out: Pad[]): void {
    for (let i = 0; i < RATE * 30 && (s.phase !== "ready" || i === 0) && !s.won; i++) {
        const p = emptyPad();
        fetchGame.step(s, p);
        out.push(p);
    }
}

/** Aims tried for an ask, coarse first: every fifth key step of the angle and every sixth of the power. */
function* aims(): Generator<{ angle: number; power: number }> {
    for (let k = 0; k <= 70; k += 5)
        for (const sign of k ? [-1, 1] : [1]) {
            const angle = FIRST_AIM.angle + sign * k * TURN;
            if (angle < -1.44 || angle > 0.05) continue;
            for (let j = -48; j <= 72; j += 6) yield { angle, power: FIRST_AIM.power + j * RAMP };
        }
}

/** Whether a throw from a fresh park at ask `k` does what it asks. */
function works(
    c: FetchConfiguration,
    k: number,
    toy: number,
    angle: number,
    power: number,
): boolean {
    const s = openFetchConfiguration(c);
    s.ask = k;
    play(s, throwPads(s, toy, angle, power));
    for (let i = 0; i < RATE * 20 && !s.decided; i++) fetchGame.step(s, emptyPad());
    return s.good;
}

/**
 * The pads that play a variation to its win, ask by ask, or null when some ask has no throw among
 * those tried. Each throw is found on a fresh park and then played in turn from the one before.
 */
export function fetchWay(c: FetchConfiguration): Pad[] | null {
    const s = openFetchConfiguration(c),
        pads: Pad[] = [];
    for (let k = 0; k < s.L.asks.length; k++) {
        let found: Pad[] | null = null;
        const toys = s.L.toys.map((_, i) => i);
        // a ball never stops on a slope, so for a stop the things that stay are tried first
        if (s.L.asks[k]?.kind === "stop") toys.reverse();
        search: for (const toy of toys)
            for (const a of aims())
                if (works(c, k, toy, a.angle, a.power)) {
                    found = throwPads(s, toy, a.angle, a.power);
                    break search;
                }
        if (!found) return null;
        play(s, found);
        pads.push(...found);
        const before = s.ask;
        settle(s, pads);
        if (s.ask !== before + 1) return null;
    }
    return s.won ? pads : null;
}
