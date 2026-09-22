// A tuning table: the few numbers that make a game feel the way it does, each with its range, its
// step, its unit and the reason it is that number. A game reads a knob's value as it steps, so the
// review drawer can turn one while the game runs; a test reads the values the game starts with.

interface Knob {
    value: number;
    readonly start: number;
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly unit: string;
    readonly why: string;
}

export type Tuning = Record<string, Knob>;

export const knob = (
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    why: string,
): Knob => ({ value, start: value, min, max, step, unit, why });

const stepAt = (k: Knob, n: number): number => Number((k.min + n * k.step).toFixed(6));

const onStep = (k: Knob, v: number): number => stepAt(k, Math.round((v - k.min) / k.step));

/**
 * Sets a knob to the step nearest `to`, then to the nearest step inside its range, and returns what
 * it was set to. Clamping first would let a range that does not end on a step round past its end.
 */
export function turn(k: Knob, to: number): number {
    const last = Math.floor((k.max - k.min) / k.step + 1e-9);
    k.value = stepAt(k, Math.min(last, Math.max(0, Math.round((to - k.min) / k.step))));
    return k.value;
}

export function resetKnobs(t: Tuning): void {
    for (const k of Object.values(t)) k.value = k.start;
}

/** The knobs that are not where the game starts them. */
export const turned = (t: Tuning): string[] =>
    Object.entries(t)
        .filter(([, k]) => k.value !== k.start)
        .map(([name]) => name);

/** What is wrong with a table: a start outside its range or off its step, or a knob with no reason given. */
export function faults(t: Tuning): string[] {
    const out: string[] = [];
    for (const [name, k] of Object.entries(t)) {
        if (!(k.min <= k.start && k.start <= k.max))
            out.push(`${name} starts outside ${k.min} to ${k.max}`);
        if (k.step <= 0 || Math.abs(onStep(k, k.start) - k.start) > 1e-6)
            out.push(`${name} starts off its step`);
        if (k.why.trim().length < 12) out.push(`${name} does not say why it is ${k.start}`);
        if (!k.unit.trim()) out.push(`${name} has no unit`);
    }
    return out;
}
