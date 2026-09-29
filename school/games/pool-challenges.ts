// The variations of Pocket pool, and a solver that plays each one to its win through the real table:
// for every shot it tries the aims a player lines up (the white ball at the place that sends a
// useful ball into a pocket, a little either side, at several strengths), then sweeps the whole
// circle when none of those works, keeping the first strike that pots a ball the target can use. A
// variation a child is given has been played to the end this way first.
import { emptyPad, type Pad } from "../../engine/motion/pad";
import { rolling, type Spinner } from "../../engine/motion/billiards";
import {
    POOL_LEVELS,
    SHOT,
    poolGame,
    reachable,
    startPool,
    type PoolLevel,
    type PoolState,
} from "./pool";

export interface PoolConfiguration {
    phase: number;
    variant: number;
}

export const POOL_VARIANTS = 3;

/** The pockets of an oblong table swapped top for bottom: corners and middles in the table's order. */
const FLIP_POCKET = [3, 4, 5, 0, 1, 2] as const;

/** The level turned upside down, so every shot is the mirror of one the solver found. */
function flipped(L: PoolLevel): PoolLevel {
    const y = (v: number) => L.h - v;
    return {
        ...L,
        cue: { x: L.cue.x, y: y(L.cue.y) },
        balls: L.balls.map((b) => ({ ...b, y: y(b.y) })),
        bumpers: L.bumpers.map((b) => ({ ...b, y: y(b.y) })),
        patches: L.patches.map((p) => ({
            ...p,
            y: L.h - p.y - p.h,
            ...(p.lean ? { lean: { x: p.lean.x, y: -p.lean.y } } : {}),
        })),
        spinners: L.spinners.map((s): Spinner => ({
            ...s,
            y: y(s.y),
            from: -s.from,
            speed: -s.speed,
        })),
        evens: L.evens.map((i) => FLIP_POCKET[i] ?? i),
    };
}

/** The numbers moved round the spots by `k`, so the same table asks for the sum from other places. */
function turned(L: PoolLevel, k: number): PoolLevel {
    const ns = L.balls.map((b) => b.n);
    return { ...L, balls: L.balls.map((b, i) => ({ ...b, n: ns[(i + k) % ns.length] ?? b.n })) };
}

/** A level as one of its variations lays it out. */
export function vary(L: PoolLevel, variant: number): PoolLevel {
    if (variant === 1) return turned(L, 1);
    if (variant === 2) return L.shape === "rect" ? flipped(L) : turned(L, 2);
    return L;
}

export function poolChallenge(seed: number, phase: number): PoolConfiguration {
    const p = Number.isInteger(phase) && phase >= 0 && phase < POOL_LEVELS.length ? phase : 0;
    return { phase: p, variant: (seed >>> 0) % POOL_VARIANTS };
}

export function isPoolConfiguration(v: unknown, phase: number): v is PoolConfiguration {
    if (typeof v !== "object" || v === null || !("phase" in v) || !("variant" in v)) return false;
    return (
        Object.keys(v).length === 2 &&
        v.phase === phase &&
        typeof v.variant === "number" &&
        Number.isInteger(v.variant) &&
        v.variant >= 0 &&
        v.variant < POOL_VARIANTS &&
        POOL_LEVELS[phase] !== undefined
    );
}

export function openPoolConfiguration(c: PoolConfiguration): PoolState {
    const L = POOL_LEVELS[c.phase];
    if (!L) throw new Error("No such pool level");
    return startPool(vary(L, c.variant), c.phase);
}

const RATE = poolGame.rate;
/** What one step of a held arrow does to the aim: radians, and squares a second of strength. */
const TURN = SHOT.turn / RATE,
    RAMP = SHOT.ramp / RATE;

const held = (d: "up" | "down" | "left" | "right"): Pad => ({ ...emptyPad(), holding: [d] });

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** The pads that turn the aim `turns` steps and change the strength `ramps` steps, then strike. */
function strike(turns: number, ramps: number): Pad[] {
    const out: Pad[] = [];
    for (let i = 0; i < Math.abs(turns); i++) out.push(held(turns < 0 ? "left" : "right"));
    for (let i = 0; i < Math.abs(ramps); i++) out.push(held(ramps < 0 ? "down" : "up"));
    out.push({ ...emptyPad(), tapped: true });
    return out;
}

const step = (s: PoolState, p: Pad) =>
    poolGame.step(s, { ...p, holding: [...p.holding], pressed: [...p.pressed] });

/** Steps with nothing pressed until the shot is judged and the table is still, returning the pads it took. */
function settle(s: PoolState): Pad[] {
    const out: Pad[] = [];
    for (let i = 0; i < RATE * 40 && (s.shooting || rolling(s.balls)) && !s.won; i++) {
        const p = emptyPad();
        step(s, p);
        out.push(p);
    }
    return out;
}

/** Whether a ball is one the target can still use. */
function useful(s: PoolState, n: number): boolean {
    const ask = s.L.ask;
    if (ask.kind === "multiple")
        return (ask.start + s.potted.reduce((a, b) => a + b, 0) + n) % ask.of === 0;
    if (ask.even && n % 2 === 1) return false;
    const probe = structuredClone(s);
    probe.potted.push(n);
    const b = probe.balls.find((x) => x.n === n);
    if (b) b.potted = true;
    const total = probe.potted.reduce((a, v) => a + v, 0);
    return total === ask.total || (total < ask.total && reachable(probe));
}

/** Strikes to try from `s`, as steps of the arrows: first at each useful ball towards each pocket that takes it, then round the whole circle. */
function* tries(s: PoolState): Generator<{ turns: number; ramps: number }> {
    const cue = s.balls[0];
    if (!cue) return;
    const r = 0.7,
        powers = [7, 10, 13, 16, 20];
    const rampsTo = (p: number) =>
        Math.round((Math.min(SHOT.max, Math.max(SHOT.min, p)) - s.aim.power) / RAMP);
    for (const b of s.balls) {
        if (b.n === 0 || b.potted || !useful(s, b.n)) continue;
        for (const p of s.table.pockets) {
            if (p.only === "even" && b.n % 2 === 1) continue;
            const dx = p.x - b.x,
                dy = p.y - b.y,
                l = Math.hypot(dx, dy),
                gx = b.x - (dx / l) * r * 2,
                gy = b.y - (dy / l) * r * 2;
            const turns = Math.round(wrap(Math.atan2(gy - cue.y, gx - cue.x) - s.aim.angle) / TURN);
            for (const off of [0, -2, 2, -5, 5])
                for (const power of powers) yield { turns: turns + off, ramps: rampsTo(power) };
        }
    }
    for (let k = 0; k < Math.round((Math.PI * 2) / TURN); k += 3)
        for (const power of [9, 14, 20]) {
            const turns = k <= Math.PI / TURN ? k : k - Math.round((Math.PI * 2) / TURN);
            yield { turns, ramps: rampsTo(power) };
        }
}

/** Strikes from `s` that keep a ball, up to `wide` of them, each with the pads that play it and the table after, found one at a time. */
function* strikes(s: PoolState, wide: number): Generator<{ pads: Pad[]; after: PoolState }> {
    const seen = new Set<string>();
    for (const t of tries(s)) {
        const pads = strike(t.turns, t.ramps),
            after = structuredClone(s),
            before = after.potted.length;
        for (const p of pads) step(after, p);
        pads.push(...settle(after));
        if (!after.won && after.potted.length <= before) continue;
        // two strikes that keep the same balls are one choice
        const key = after.potted.join(",");
        if (seen.has(key)) continue;
        seen.add(key);
        yield { pads, after };
        if (seen.size >= wide) return;
    }
}

function search(s: PoolState, left: number): Pad[] | null {
    if (s.won) return [];
    if (left === 0) return null;
    for (const { pads, after } of strikes(s, 4)) {
        const rest = search(after, left - 1);
        if (rest) return [...pads, ...rest];
    }
    return null;
}

/**
 * The pads that play a variation to its win, shot by shot, or null when no run of strikes among
 * those tried wins it. Every strike is played on a copy of the real table, and a later shot that
 * finds nothing sends the search back to try another strike before it.
 */
export const poolWay = (c: PoolConfiguration, most = 8): Pad[] | null =>
    search(openPoolConfiguration(c), most);
