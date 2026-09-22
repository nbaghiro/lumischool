// What a performance can be checked against, two of the three tiers in .docs/sound.md. A pitch check
// is exact, because a pitch is an integer and an order is a sequence. A rhythm check is against a
// declared tolerance, and what it reports is a distance in beats rather than a verdict, so the beat
// track can draw how far off each tap was. The third tier, making something up, is not checked.
import { ONSET_FLOOR_MS, msPerBeat } from "./beat";
import { noteName, type Note } from "./pitch";

// `Struck` and `Performance` are the `performance` answer's shape in engine/answer.ts, declared again
// here because `sound` reaches only `numbers`.
export interface Struck {
    note: Note;
    /**
     * Milliseconds on the performance.now() clock, taken from the event rather than from the
     * handler, because the event's timestamp is set closer to the hardware than the moment our code
     * runs.
     */
    at: number;
    /** When it was let go. Absent while it is still held. */
    off?: number;
    how: "pointer" | "key" | "focus" | "code";
    /** Where on a fretted instrument it was played, as "s2f3", because one pitch has several places. */
    place?: string;
}

/** What a child played, as data an exercise can check and a record can replay. */
export interface Performance {
    /** The instrument's id, so a check knows what was there to play. */
    instrument: string;
    /** The clock reading the onsets are counted from. */
    started: number;
    struck: Struck[];
}

export const emptyPerformance = (instrument: string, started = 0): Performance => ({
    instrument,
    started,
    struck: [],
});

/** The pitches that were played, in the order they started. */
export const pitches = (p: Performance): Note[] =>
    [...p.struck].sort((a, b) => a.at - b.at).map((s) => s.note);

/** The same, with a repeat of the note just played collapsed, for "play C then D then E". */
export function distinctRun(p: Performance): Note[] {
    const out: Note[] = [];
    for (const n of pitches(p)) if (out.at(-1) !== n) out.push(n);
    return out;
}

/** When each note started, in milliseconds from the start of the performance. */
export const onsets = (p: Performance): number[] =>
    [...p.struck].sort((a, b) => a.at - b.at).map((s) => s.at - p.started);

interface PitchWant {
    notes: Note[];
    /** Whether the order matters. "Play C, D, E" does; "play the notes of C major" does not. */
    ordered?: boolean;
    /** Whether the octave matters. A grade one lesson about note names says no. */
    anyOctave?: boolean;
    /** Whether anything else played counts against it. A first attempt usually should not. */
    exact?: boolean;
    /**
     * Whether a note played again straight after itself is a second note. Off, "play C, then D"
     * forgives a key pressed twice; on, a melody that repeats a note, as most songs do, is compared
     * press for press, since collapsing the repeats would mark a correct "C C G G" wrong.
     */
    repeats?: boolean;
}

export interface Verdict {
    ok: boolean;
    /** One sentence, in the words a child reads, saying what happened. */
    because: string;
    /** What was wanted and still missing, for the guide to point at. */
    missing: Note[];
    /** What was played that was not wanted. */
    extra: Note[];
}

const list = (ns: readonly Note[]): string => ns.map((n) => noteName(n)).join(", ");
const pcOf = (n: Note): number => ((n % 12) + 12) % 12;

/**
 * The first tier. Every part of this is a comparison of integers, which is why it needs no
 * tolerance and why the verifier can prove an item that uses it.
 */
export function judgePitches(p: Performance, want: PitchWant): Verdict {
    const wanted = want.notes;
    const played = want.ordered && !want.repeats ? distinctRun(p) : pitches(p);
    const same = (a: Note, b: Note): boolean => (want.anyOctave ? pcOf(a) === pcOf(b) : a === b);

    if (played.length === 0) {
        return { ok: false, because: "Nothing was played yet.", missing: [...wanted], extra: [] };
    }

    if (want.ordered) {
        const mismatch = (): { at: number; want: Note; got: Note | undefined } | undefined => {
            for (const [i, n] of wanted.entries()) {
                const got = played[i];
                if (got === undefined || !same(n, got)) return { at: i, want: n, got };
            }
            return undefined;
        };
        const miss = mismatch();
        const ok = miss === undefined && played.length === wanted.length;
        const over = played.length - wanted.length;
        const because = ok
            ? `That is ${list(wanted)}, in order.`
            : miss === undefined
              ? `That is the right start, and there ${over === 1 ? "is one note" : `are ${over} notes`} too many.`
              : miss.got === undefined
                ? `${list(wanted.slice(miss.at))} still to play.`
                : `The ${ordinal(miss.at + 1)} note should be ${noteName(miss.want)}, and ${noteName(miss.got)} was played.`;
        const at = miss?.at ?? -1;
        return {
            ok,
            because,
            missing: wanted.filter((_, i) => i >= Math.max(0, at)),
            extra: played.slice(wanted.length),
        };
    }

    const missing = wanted.filter((n) => !played.some((q) => same(n, q)));
    const extra = played.filter((n) => !wanted.some((q) => same(n, q)));
    const ok = missing.length === 0 && (!want.exact || extra.length === 0);
    const one = wanted.length === 1 ? wanted[0] : undefined;
    const last = played.at(-1);
    return {
        ok,
        because: ok
            ? one === undefined
                ? `That is all of ${list(wanted)}.`
                : `That is ${noteName(one)}.`
            : missing.length
              ? one !== undefined && missing.length === 1 && last !== undefined
                  ? `That is ${noteName(last)}. ${noteName(one)} is ${direction(last, one)}.`
                  : `Still to find: ${list(missing)}.`
              : `${list(extra)} ${extra.length === 1 ? "was" : "were"} played as well.`,
        missing,
        extra,
    };
}

const ordinal = (n: number): string =>
    ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"][n - 1] ??
    `${n}th`;

/**
 * Which way to move, which is the one piece of feedback that works without hearing and without
 * reading: the guide points left or right along the keys the child can see.
 */
export const direction = (from: Note, to: Note): string =>
    to === from
        ? "the one you played"
        : to > from
          ? `${to - from} to the right`
          : `${from - to} to the left`;

interface RhythmWant {
    /** Where each note starts, in beats from the start of the bar. */
    target: number[];
    /** Allowed error as a fraction of one beat. See TOLERANCE in beat.ts, and the hedge on it. */
    tolerance: number;
    /** Only used to report a tempo back; the judgement fits its own. */
    bpm?: number;
}

export interface RhythmVerdict {
    ok: boolean;
    because: string;
    /** The tempo fitted from what was played, in milliseconds per beat. 0 when there was none. */
    msPerBeat: number;
    /** Where each tap landed, in beats, on that fitted tempo. This is what the beat track draws. */
    played: number[];
    /** How far each tap was from where it should have been, in beats. Late is positive. */
    off: number[];
    /** The worst of those, which is the number the tolerance is compared against. */
    worst: number;
    tolerance: number;
    /** The window that was actually applied, in milliseconds, after the floor. */
    windowMs: number;
}

/**
 * Fit one number, milliseconds per beat, across every onset, anchored on the first tap. Fitting the
 * tempo rather than imposing it is the important half of the judgement: a child who plays the
 * rhythm correctly and slowly is playing it correctly. What is judged is the pattern of gaps.
 */
export function fitBeat(onsetsMs: readonly number[], target: readonly number[]): number {
    const n = Math.min(onsetsMs.length, target.length);
    const t0 = target[0];
    const o0 = onsetsMs[0];
    if (n < 2 || t0 === undefined || o0 === undefined) return 0;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
        const t = (target[i] ?? t0) - t0;
        num += t * ((onsetsMs[i] ?? o0) - o0);
        den += t * t;
    }
    return den === 0 ? 0 : num / den;
}

/** The second tier. A tolerance, declared, with what it let through drawn rather than asserted. */
export function judgeRhythm(p: Performance, want: RhythmWant): RhythmVerdict {
    const taps = onsets(p);
    const target = want.target;
    const none = {
        msPerBeat: 0,
        played: [] as number[],
        off: [] as number[],
        worst: 0,
        tolerance: want.tolerance,
        windowMs: 0,
    };

    const t0 = taps[0];
    if (t0 === undefined) return { ok: false, because: "Nothing was played yet.", ...none };
    // A count that does not match is reported as a count. "You played five and the bar has four" is
    // better feedback than a complaint about timing, and it is the commonest mistake by a long way.
    if (taps.length !== target.length) {
        return {
            ok: false,
            because: `The bar has ${target.length} note${target.length === 1 ? "" : "s"}, and ${taps.length} ${taps.length === 1 ? "was" : "were"} played.`,
            ...none,
        };
    }
    // Two onsets fix a tempo and leave nothing to be wrong about, so a bar of one or two notes is
    // judged on its count and nothing else: there is no rhythm in two taps, only a speed, and we do
    // not judge a child's speed.
    if (target.length <= 2) {
        return {
            ok: true,
            because: `${target.length} note${target.length === 1 ? "" : "s"}, so there is no rhythm to keep yet.`,
            ...none,
        };
    }

    const ms = fitBeat(taps, target);
    if (ms <= 0) {
        return {
            ok: false,
            because: "Every note landed at once, so there is no rhythm to read.",
            ...none,
        };
    }

    const b0 = target[0] ?? 0;
    const played = taps.map((t) => (t - t0) / ms + b0);
    const off = played.map((b, i) => b - (target[i] ?? b));
    const windowMs = Math.max(want.tolerance * ms, ONSET_FLOOR_MS);
    const tol = windowMs / ms;
    const worst = Math.max(...off.map(Math.abs));
    const ok = worst <= tol;
    const i = off.findIndex((d) => Math.abs(d) > tol);
    const by = off[i] ?? 0;
    return {
        ok,
        because: ok
            ? `In time, at about ${Math.round(60_000 / ms)} beats a minute.`
            : `The ${ordinal(i + 1)} note came ${by > 0 ? "late" : "early"}, by about ${Math.round(Math.abs(by) * 100) / 100} of a beat.`,
        msPerBeat: ms,
        played,
        off,
        worst,
        tolerance: tol,
        windowMs,
    };
}

/**
 * A performance nobody played, at an exact tempo. This is what makes the rhythm tier gateable: the
 * verifier cannot prove that a tolerance is the right tolerance, but it can prove that the check is
 * well formed, by asserting that a perfect performance passes and that a named wrong one fails.
 */
interface Golden {
    bpm?: number;
    instrument?: string;
    /** Drop the onset at this index, which is a beat missed. */
    skip?: number;
    /** Add a second tap just after the one at this index, which is a note doubled. */
    double?: number;
    /** Move one onset by this many beats, which is the case that tests the tolerance itself. */
    late?: { index: number; beats: number };
}

export function goldenPerformance(target: readonly number[], o: Golden = {}): Performance {
    const ms = msPerBeat(o.bpm ?? 80);
    let beats = [...target];
    if (o.skip !== undefined) beats = beats.filter((_, i) => i !== o.skip);
    const doubled = o.double === undefined ? undefined : beats[o.double];
    if (o.double !== undefined && doubled !== undefined) {
        beats = [...beats.slice(0, o.double + 1), doubled + 0.05, ...beats.slice(o.double + 1)];
    }
    const late = o.late;
    if (late && beats[late.index] !== undefined) {
        beats = beats.map((b, i) => (i === late.index ? b + late.beats : b));
    }
    return {
        instrument: o.instrument ?? "golden",
        started: 0,
        struck: beats.map((b) => ({ note: 60, at: b * ms, how: "code" as const })),
    };
}

/**
 * What the gate runs, and what each has to come back as. Two of the failures are a count and the
 * others are timings, on purpose: a check that only ever rejects the wrong number of notes has not
 * been shown to apply its tolerance at all. The timing cases are only added for a bar of three
 * notes or more, because two onsets fix a tempo and leave nothing to be wrong about. The late note
 * is the last one, so that moving it can never reorder the taps, and it is moved well past the
 * window because the fit absorbs part of any single displacement.
 */
export function goldens(
    target: readonly number[],
    tolerance: number,
    bpm = 80,
): { name: string; want: boolean; p: Performance }[] {
    const mid = Math.max(1, target.length - 2);
    const out = [
        { name: "exactly in time", want: true, p: goldenPerformance(target, { bpm }) },
        { name: "at half speed", want: true, p: goldenPerformance(target, { bpm: bpm / 2 }) },
        { name: "a beat missed", want: false, p: goldenPerformance(target, { bpm, skip: mid }) },
        { name: "a note doubled", want: false, p: goldenPerformance(target, { bpm, double: 0 }) },
    ];
    if (target.length < 3) return out;
    out.push({
        name: "the last note well late",
        want: false,
        p: goldenPerformance(target, {
            bpm,
            late: { index: target.length - 1, beats: tolerance * 5 },
        }),
    });
    return out;
}

/** A steady count of the same number of notes: the bar clapped with every note the same length. */
export const steadyLike = (target: readonly number[]): number[] => {
    const first = target[0];
    const last = target.at(-1);
    if (first === undefined || last === undefined) return [];
    const step = (last - first) / Math.max(1, target.length - 1);
    return target.map((_, i) => first + i * step);
};

/**
 * Whether this bar, at this tolerance, can tell a child who read the note values from a child who
 * clapped every note the same length. A diagnostic for an author rather than a pass or a fail: on a
 * bar whose note values are only mildly uneven, a steady clap lands inside the window everywhere,
 * so the exercise marks a child correct for not having read the rhythm at all. That is a bar that
 * does not teach what it claims to, and the gate reports it so an author picks a different bar.
 */
export function teachesRhythm(target: readonly number[], tolerance: number, bpm = 80): boolean {
    if (target.length < 3) return false;
    const even = steadyLike(target);
    if (even.every((b, i) => Math.abs(b - (target[i] ?? b)) < 1e-9)) return false;
    return !judgeRhythm(goldenPerformance(even, { bpm }), { target: [...target], tolerance }).ok;
}

/**
 * A bar played against a beat the page kept, rather than one fitted from the taps. Where a child
 * plays along with the transport the tempo is known, so a steady clap of an uneven bar is wrong by
 * its distance from the beat, which a fitted tempo would partly absorb. `taps` and `target` are in
 * beats from the start of the bar.
 */
export function judgeOnBeat(
    taps: readonly number[],
    want: { target: readonly number[]; tolerance: number; msPerBeat: number },
): RhythmVerdict {
    const ms = Math.max(1, want.msPerBeat);
    const window = Math.max(want.tolerance, ONSET_FLOOR_MS / ms);
    const base = {
        msPerBeat: ms,
        played: [...taps],
        off: [] as number[],
        worst: 0,
        tolerance: window,
        windowMs: window * ms,
    };
    const n = want.target.length;
    if (taps.length === 0) return { ok: false, because: "Nothing was played yet.", ...base };
    if (taps.length !== n) {
        return {
            ok: false,
            because: `The bar has ${n} note${n === 1 ? "" : "s"}, and ${taps.length} ${taps.length === 1 ? "was" : "were"} played.`,
            ...base,
        };
    }
    const off = taps.map((t, i) => t - (want.target[i] ?? 0));
    const worst = Math.max(...off.map(Math.abs));
    const i = off.findIndex((d) => Math.abs(d) > window);
    const by = off[i] ?? 0;
    return {
        ...base,
        ok: i < 0,
        because:
            i < 0
                ? "In time with the beat."
                : `The ${ordinal(i + 1)} note came ${by > 0 ? "late" : "early"}, by about ${Math.round(Math.abs(by) * 100) / 100} of a beat.`,
        off,
        worst,
    };
}
