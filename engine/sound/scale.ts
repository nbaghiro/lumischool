// Intervals, scales and keys.
//
// All of it is integer arithmetic on MIDI numbers, which is the reason
// pitch.ts keeps the integer rather than the frequency. Two names exist for most of what is in
// here, a musician's and a child's, because a grade two lesson says "a step" and a grade four
// lesson says "a major second", and they are the same fact.
import { SOLFA, isBlack, letterOf, noteName, whiteIndex, type Letter, type Note } from "./pitch";

export const SEMITONE = 1;
export const TONE = 2;
export const OCTAVE = 12;

/** What a musician calls each distance in semitones, up to an octave. */
export const INTERVALS = [
    "unison",
    "minor second",
    "major second",
    "minor third",
    "major third",
    "perfect fourth",
    "tritone",
    "perfect fifth",
    "minor sixth",
    "major sixth",
    "minor seventh",
    "major seventh",
    "octave",
] as const;

/** The short form, for a label that has to fit on a drawing. */
export const INTERVAL_SHORT = [
    "1",
    "m2",
    "M2",
    "m3",
    "M3",
    "P4",
    "TT",
    "P5",
    "m6",
    "M6",
    "m7",
    "M7",
    "8",
] as const;

export const semitonesBetween = (a: Note, b: Note): number => Math.abs(b - a);

/** The interval's name, or the number of semitones when it is more than an octave. */
export function intervalName(semitones: number): string {
    const d = Math.abs(semitones);
    const named = INTERVALS[d];
    if (named !== undefined) return named;
    if (d % OCTAVE === 0) return `${d / OCTAVE} octaves`;
    return `${d} semitones`;
}

/**
 * How many white keys apart two notes are, which is what a child counts before they know the
 * names. Zero is the same key, one is next door.
 */
export const stepsBetween = (a: Note, b: Note): number => Math.abs(whiteIndex(b) - whiteIndex(a));

/**
 * The grade two vocabulary. Next door is a step, one key skipped is a skip, and anything wider is
 * a leap. This is about the keys and the lines, not about semitones, which is why it counts white
 * keys: C to D and E to F are both one step even though one is a tone and the other a semitone,
 * and that is exactly the fact the grade three lesson on the black keys goes on to teach.
 */
export function stepName(a: Note, b: Note): string {
    const d = stepsBetween(a, b);
    if (d === 0) return "the same note";
    if (d === 1) return "a step";
    if (d === 2) return "a skip";
    return "a leap";
}

export const higher = (a: Note, b: Note): Note => (b > a ? b : a);
export const sortPitches = (notes: readonly Note[]): Note[] => [...notes].sort((x, y) => x - y);

export const SCALE_NAMES = ["major", "minor", "pentatonic", "chromatic", "whole-tone"] as const;
export type ScaleName = (typeof SCALE_NAMES)[number];

/** Semitones above the tonic, one octave of each. */
export const SCALES: Record<ScaleName, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonic: [0, 2, 4, 7, 9],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    "whole-tone": [0, 2, 4, 6, 8, 10],
};

/** The notes of a scale, one or more octaves of it, ending on the tonic again. */
export function scaleNotes(tonic: Note, name: ScaleName = "major", octaves = 1): Note[] {
    const steps = SCALES[name];
    const out: Note[] = [];
    for (let o = 0; o < Math.max(1, octaves); o++)
        for (const s of steps) out.push(tonic + s + o * OCTAVE);
    out.push(tonic + Math.max(1, octaves) * OCTAVE);
    return out;
}

/**
 * A scale as the pattern of gaps between its notes, in the words a grade four lesson uses. The
 * major scale is tone tone semitone tone tone tone semitone, and seeing that it is the same
 * pattern from any starting note is the whole point of the lesson.
 */
export function gapPattern(name: ScaleName = "major"): string[] {
    const steps = [...SCALES[name], OCTAVE];
    return steps.slice(1).map((s, i) => {
        const d = s - (steps[i] ?? 0);
        return d === 1 ? "semitone" : d === 2 ? "tone" : `${d} semitones`;
    });
}

export const inScale = (n: Note, tonic: Note, name: ScaleName = "major"): boolean =>
    SCALES[name].includes((((n - tonic) % OCTAVE) + OCTAVE) % OCTAVE);

/** Which degree of the scale a note is, counting the tonic as 1, or null when it is not in it. */
export function degreeOf(n: Note, tonic: Note, name: ScaleName = "major"): number | null {
    const i = SCALES[name].indexOf((((n - tonic) % OCTAVE) + OCTAVE) % OCTAVE);
    return i < 0 ? null : i + 1;
}

/** The sol-fa syllable for a note in a major key, or null when it is not in that key. */
export function solfaOf(n: Note, tonic: Note): string | null {
    const d = degreeOf(n, tonic, "major");
    return d === null ? null : (SOLFA[d - 1] ?? null);
}

/**
 * The sharps or flats in a major key, as the letters they fall on. Only the keys the curriculum
 * reaches are listed, because a key signature nobody teaches is a fact with nowhere to go: C has
 * none, G has one sharp, D two, F one flat.
 */
export const KEY_SIGNATURES: Record<string, { sharps: Letter[]; flats: Letter[] }> = {
    C: { sharps: [], flats: [] },
    G: { sharps: ["F"], flats: [] },
    D: { sharps: ["F", "C"], flats: [] },
    A: { sharps: ["F", "C", "G"], flats: [] },
    F: { sharps: [], flats: ["B"] },
};

/** The key signature of a major key, by its tonic. Null for a key we do not teach. */
export function keySignature(tonic: Note): { sharps: Letter[]; flats: Letter[] } | null {
    if (isBlack(tonic)) return null;
    return KEY_SIGNATURES[letterOf(tonic)] ?? null;
}

/**
 * The notes a key signature raises or lowers, in every octave the range covers. This is what a
 * keyboard uses to mark the black keys a key needs, so a child playing G major can see that the F
 * they want is the black one.
 */
export function alteredIn(tonic: Note, from: Note, to: Note): Note[] {
    const sig = keySignature(tonic);
    if (!sig) return [];
    const out: Note[] = [];
    for (let n = from; n <= to; n++) {
        if (!isBlack(n)) continue;
        // A sharp is named after the white key below it and a flat after the one above, so F# and Gb
        // are the same key reached from either side.
        if (sig.sharps.includes(letterOf(n)) || sig.flats.includes(letterOf(n + 1))) out.push(n);
    }
    return out;
}

/** A short description of two notes for a page that has to say what it is showing. */
export const describePair = (a: Note, b: Note): string =>
    `${noteName(a)} to ${noteName(b)}: ${stepName(a, b)}, ${intervalName(semitonesBetween(a, b))}`;
