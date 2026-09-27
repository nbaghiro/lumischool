// The sound train's variations are the words of each level. The solver certifies each one by playing
// it, and the pads it pressed replay to the same win, which is the game's replay witness.
import { configurationKey } from "../../engine/motion/configuration";
import { emptyPad, type Pad } from "../../engine/motion/pad";
import type { SpellVersion } from "./spell";
import { coupled, loose, startTrain, stepTrain, TRAIN_LEVELS, type TrainState } from "./train";

export interface TrainConfiguration {
    phase: number;
    word: SpellVersion;
}

export function trainConfigurations(phase: number): TrainConfiguration[] {
    return (TRAIN_LEVELS[phase]?.words ?? []).map((word) => ({ phase, word }));
}

export function trainChallenge(seed: number, phase: number): TrainConfiguration {
    const pool = trainConfigurations(phase),
        c = pool[(seed >>> 0) % pool.length];
    if (!c) throw new Error("Unknown train level");
    return c;
}

export function isTrainConfiguration(value: unknown, phase: number): value is TrainConfiguration {
    return trainConfigurations(phase).some((c) => configurationKey(c) === configurationKey(value));
}

export const openTrainConfiguration = (c: TrainConfiguration): TrainState =>
    startTrain(c.phase, c.word);

const PER = 1.5;

/** Steps a pad sequence on a state, and says whether the state was won by its end. */
export function replay(s: TrainState, pads: readonly Pad[]): boolean {
    for (const p of pads) stepTrain(s, { ...p, pressed: [...p.pressed], holding: [...p.holding] });
    return s.won;
}

const idle = (): Pad => emptyPad();

/** How a way pushes: a finger pulled back from the wagon, or the keys stepping the push and space. */
export type By = "touch" | "keys";

/** A held key changes the push by this much each step, as `stepTrain` does. */
const KEY_STEP = 4 / 60;

/** The pads of one push of `power`, and then nothing while it settles. */
function pushPads(s: TrainState, power: number, by: By): Pad[] {
    const w = loose(s);
    if (!w) return [];
    if (by === "keys") {
        const n = Math.round((power - s.power) / KEY_STEP),
            key = n > 0 ? ("up" as const) : ("down" as const);
        return [
            ...Array.from({ length: Math.abs(n) }, () => ({ ...idle(), pressed: [key] })),
            { ...idle(), tapped: true },
        ];
    }
    const at = { x: w.x, y: 17.5 },
        to = { x: w.x + power / PER, y: 17.5 };
    return [
        { ...idle(), touch: at },
        { ...idle(), touch: to },
        { ...idle(), lifted: to },
    ];
}

/** Runs the pads and waits for the wagon to rest; returns every pad stepped, and whether it knocked the train. */
function settle(s: TrainState, pads: Pad[]): { pads: Pad[]; knocked: boolean } {
    const out = [...pads];
    let knocked = false;
    const run = (p: Pad) => {
        const hs = stepTrain(s, { ...p, pressed: [...p.pressed], holding: [...p.holding] });
        if (hs.some((h) => "shake" in h)) knocked = true;
    };
    for (const p of pads) run(p);
    for (let i = 0; i < 60 * 15 && Math.abs(loose(s)?.v ?? 0) > 1e-6; i++) {
        out.push(idle());
        run(idle());
    }
    return { pads: out, knocked };
}

type Outcome = "couple" | "short" | "knock";

function tryPush(
    s: TrainState,
    power: number,
    by: By,
): { outcome: Outcome; pads: Pad[]; after: TrainState } {
    const after = structuredClone(s),
        before = coupled(after).length,
        { pads, knocked } = settle(after, pushPads(after, power, by));
    const outcome: Outcome =
        coupled(after).length > before ? "couple" : knocked ? "knock" : "short";
    return { outcome, pads, after };
}

/** The middle of the pushes that couple, given one that does and one short of it and one past it, so a hand a little off still couples. */
function middle(s: TrainState, short: number, couples: number, knocks: number, by: By): number {
    const edge = (fail: number, ok: number) => {
        for (let i = 0; i < 12; i++) {
            const mid = (fail + ok) / 2;
            if (tryPush(s, mid, by).outcome === "couple") ok = mid;
            else fail = mid;
        }
        return ok;
    };
    return (edge(short, couples) + edge(knocks, couples)) / 2;
}

/** Squares between the loose wagon and the back of the train. */
function gapOf(s: TrainState): number {
    const last = coupled(s).at(-1),
        back = s.line.vehicles.find((v) => v.id === (last ? `w:${last}` : "engine")),
        w = loose(s);
    return w && back ? w.x - w.length / 2 - (back.x + back.length / 2) : Infinity;
}

/**
 * A push that leaves the wagon resting two to six squares short of the train, from where a nudge
 * couples across a wide range of pulls. Null when no push rests there, as on a slope.
 */
function shortOf(s: TrainState, by: By): ReturnType<typeof tryPush> | null {
    let lo = 0.5,
        hi = 12;
    for (let b = 0; b < 30; b++) {
        const mid = (lo + hi) / 2,
            t = tryPush(s, mid, by),
            gap = t.outcome === "short" ? gapOf(t.after) : -1;
        if (gap >= 2 && gap <= 6) return t;
        if (gap > 6) lo = mid;
        else hi = mid;
    }
    return null;
}

/**
 * A way to win from `start`: the pads that pick each sound's wagon and push it on. Null when some
 * wagon cannot be coupled in a handful of pushes, which would make the layout unfair. A `sure` way
 * stops each wagon short first and nudges it on, which a hand a few pixels off still repeats.
 */
export function trainWay(
    start: TrainState,
    { sure = false, by = "touch" }: { sure?: boolean; by?: By } = {},
): Pad[] | null {
    let s = structuredClone(start);
    const pads: Pad[] = [];
    for (const sound of s.word.sounds) {
        const i = s.shed.indexOf(sound);
        if (i < 0) return null;
        for (let k = 0; k < s.shed.length && s.chosen !== i; k++) {
            const p = { ...idle(), pressed: ["right" as const] };
            pads.push(p);
            stepTrain(s, p);
        }
        if (s.chosen !== i) return null;
        let done = false;
        const short = sure ? shortOf(s, by) : null;
        if (short) {
            pads.push(...short.pads);
            s = short.after;
        }
        for (let tries = 0; tries < 6 && !done; tries++) {
            let lo = 0.5,
                hi = 12,
                best: ReturnType<typeof tryPush> | null = null;
            for (let b = 0; b < 30; b++) {
                const mid = (lo + hi) / 2,
                    t = tryPush(s, mid, by);
                if (t.outcome === "couple") {
                    best = tryPush(s, middle(s, lo, mid, hi, by), by);
                    break;
                }
                if (t.outcome === "short") {
                    lo = mid;
                    best = t;
                } else hi = mid;
            }
            if (!best) return null;
            pads.push(...best.pads);
            s = best.after;
            done = best.outcome === "couple";
        }
        if (!done) return null;
    }
    return s.won ? pads : null;
}
