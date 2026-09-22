// Note values, bars and tempo.
//
// Durations here are in beats and never in seconds, which is the line
// that keeps this compatible with .docs/activities.md: that document refuses anything timed and
// says the notation should stay unable to express a duration. A beat is not a second. A note value
// is a fact about the music, a tempo is a setting the child controls, and nothing in the product
// is scored on how long the child took.

/** The British names, which are what the existing rhythm bar and the music lesson already use. */
export const VALUES = {
    semibreve: 4,
    minim: 2,
    crotchet: 1,
    quaver: 0.5,
    semiquaver: 0.25,
} as const;
export type ValueName = keyof typeof VALUES;

/** The American names for the same five, accepted on the way in and never printed. */
const ALIASES: Record<string, ValueName> = {
    whole: "semibreve",
    half: "minim",
    quarter: "crotchet",
    eighth: "quaver",
    sixteenth: "semiquaver",
};

/** Beats from a name or a number, so notes=[1, 1, 0.5] and notes=[crotchet] both read. */
export function beatsOf(v: string | number): number {
    if (typeof v === "number") return v;
    const key = v.trim().toLowerCase();
    if (key in VALUES) return VALUES[key as ValueName];
    const alias = ALIASES[key];
    if (alias) return VALUES[alias];
    const n = Number(key);
    if (Number.isFinite(n) && n > 0) return n;
    throw new Error(
        `"${v}" is not a note value: write a number of beats, or one of ${Object.keys(VALUES).join(", ")}.`,
    );
}

/** The name of a length in beats, or the number when it is not one of the five. */
export function valueName(beats: number): string {
    const hit = (Object.keys(VALUES) as ValueName[]).find((k) => VALUES[k] === beats);
    return hit ?? `${beats} beats`;
}

/** How a value is drawn: an open head, a filled head, and whether it carries a flag. */
export const headOf = (beats: number): { open: boolean; flags: number } => ({
    open: beats >= 2,
    flags: beats >= 1 ? 0 : beats >= 0.5 ? 1 : 2,
});

/** Beats in a bar of notes, which is the arithmetic the grade one lesson is about. */
export const barTotal = (values: readonly (string | number)[]): number =>
    values.reduce<number>((t, v) => t + beatsOf(v), 0);

export const barFits = (values: readonly (string | number)[], beats = 4): boolean =>
    Math.abs(barTotal(values) - beats) < 1e-9;

/** What is missing from a bar, which is the answer to the grade one "finish the bar" question. */
export const barMissing = (values: readonly (string | number)[], beats = 4): number =>
    beats - barTotal(values);

/**
 * Where each note starts, in beats from the start of the bar. This is the target a performance is
 * judged against, and it is also where the beat track draws its ticks.
 */
export function onsetsOf(values: readonly (string | number)[]): number[] {
    const out: number[] = [];
    let t = 0;
    for (const v of values) {
        out.push(t);
        t += beatsOf(v);
    }
    return out;
}

/** A steady count, which is what "clap four beats" means. */
export const steady = (beats: number): number[] =>
    Array.from({ length: Math.max(0, beats) }, (_, i) => i);

export const DEFAULT_BPM = 80;
/** Slow enough for a five-year-old to keep up, fast enough that four beats is not a wait. */
export const BPM_RANGE: [number, number] = [50, 140];

export const msPerBeat = (bpm: number): number => 60_000 / Math.max(1, bpm);
export const bpmOf = (ms: number): number => 60_000 / Math.max(1, ms);

/** Beats to milliseconds at a tempo, for scheduling a tune rather than for judging one. */
export const beatsToMs = (beats: number, bpm: number): number => beats * msPerBeat(bpm);

/**
 * How far off a beat a child may be and still be in time, as a fraction of one beat.
 *
 * These numbers are not measured. They come from the general literature on tapping variability,
 * which puts young children well above adults and adults well above what a musician would want,
 * and no child has been measured on this product. They are deliberately generous, and they must be
 * checked against real attempts before they are used to mark anything a parent reads. Until then
 * a rhythm exercise is honest about being judged against a stated tolerance rather than against
 * being right. See the tolerance section of .docs/sound.md.
 */
export const TOLERANCE: Record<"early" | "later", number> = {
    early: 1 / 4,
    later: 1 / 6,
};

/**
 * The floor on the window in milliseconds, which has a firmer basis than the fractions above.
 * Pointer and key events are delivered on the main thread and quantised by the input and frame
 * pipeline, so an onset carries tens of milliseconds of error before the child has done anything.
 * A window tighter than this would be measuring our own latency.
 */
export const ONSET_FLOOR_MS = 60;

/** Grades one and two get the wider window, grades three and four the narrower one. */
export const toleranceFor = (grade: number): number =>
    grade <= 2 ? TOLERANCE.early : TOLERANCE.later;
