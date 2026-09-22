// Note names, numbers and frequencies. The canonical form of a pitch is its MIDI integer; a name and
// a frequency are both derived from it. Middle C is C4 is 60, and A4 is 69 at 440 Hz.

/**
 * A pitch as its MIDI number, so middle C is 60 and two notes are equal when their numbers are.
 * We keep the integer rather than the frequency because intervals, scales and transposition are
 * integer arithmetic on it, and because floating point frequencies are never equal.
 */
export type Note = number;

/** Middle C, which is where a child's hand goes first. */
export const MIDDLE_C: Note = 60;
export const A4: Note = 69;
/** Concert pitch. A setting rather than a constant only if we ever teach tuning, which we do not. */
export const CONCERT_A = 440;

/** The range any instrument we draw stays inside. Below C2 a child hears mud, above C7 a whistle. */
export const RANGE: [Note, Note] = [36, 96];

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type Letter = (typeof LETTERS)[number];

/** Semitones above C for each letter, which is the whole of why a piano has black keys. */
const OF_LETTER: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** The letter and accidental each semitone of an octave is spelled with, sharps first. */
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
/** Which semitones of an octave are black keys. */
const BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];

/** Sol-fa, for the lessons that name the degrees of a scale rather than the keys of a piano. */
export const SOLFA = ["do", "re", "mi", "fa", "so", "la", "ti"] as const;

export class PitchError extends Error {}

const pc = (n: Note): number => ((n % 12) + 12) % 12;

export const octaveOf = (n: Note): number => Math.floor(n / 12) - 1;
export const isBlack = (n: Note): boolean => BLACK[pc(n)] ?? false;
export const letterOf = (n: Note): Letter => (SHARP_NAMES[pc(n)] ?? "C").charAt(0) as Letter;

/** The name a person reads: "F#4", "Bb3", "C4". */
export const noteName = (n: Note, style: "sharp" | "flat" = "sharp"): string =>
    `${(style === "flat" ? FLAT_NAMES : SHARP_NAMES)[pc(n)]}${octaveOf(n)}`;

/**
 * The name a content file writes. A "#" starts a comment in the notation, so a sharp is spelled
 * with an s and a flat with an f. See the note on readNote below.
 */
export const noteText = (n: Note, style: "sharp" | "flat" = "sharp"): string =>
    noteName(n, style).replace("#", "s").replace("b", "f");

/** What a screen reader says, and what the guide says out loud. */
export function spokenNote(n: Note): string {
    const name = SHARP_NAMES[pc(n)] ?? "C";
    const said = name.length > 1 ? `${name.charAt(0)} sharp` : name;
    if (n === MIDDLE_C) return "middle C";
    return `${said}, octave ${octaveOf(n)}`;
}

export const frequency = (n: Note, a4 = CONCERT_A): number => a4 * 2 ** ((n - A4) / 12);

/** The nearest note to a frequency, for reading a number a person typed rather than for listening. */
export const nearestNote = (hz: number, a4 = CONCERT_A): Note =>
    Math.round(A4 + 12 * Math.log2(hz / a4));

export const transpose = (n: Note, semitones: number): Note => n + semitones;

const NAME = /^([A-Ga-g])(#{1,2}|s{1,2}|b{1,2}|f{1,2}|sharp|flat|♯|♭)?(-?\d{1,2})$/;

/**
 * Read a note name, or null when it is not one.
 *
 * Accepts every spelling we expect to meet: "F#4" from a person, "Fs4" from a content file, "Gb4"
 * and "Gf4" for the same key, "fsharp4", and the real accidental characters. It insists on an
 * octave, because "F" alone is three different notes on the keyboard we draw.
 */
export function readNote(s: string): Note | null {
    const m = NAME.exec(s.trim());
    if (!m) return null;
    const letter = (m[1] ?? "").toUpperCase() as Letter;
    const acc = (m[2] ?? "").toLowerCase();
    const shift =
        acc === ""
            ? 0
            : acc === "#" || acc === "s" || acc === "sharp" || acc === "♯"
              ? 1
              : acc === "##" || acc === "ss"
                ? 2
                : acc === "b" || acc === "f" || acc === "flat" || acc === "♭"
                  ? -1
                  : acc === "bb" || acc === "ff"
                    ? -2
                    : 0;
    const n = (Number(m[3]) + 1) * 12 + OF_LETTER[letter] + shift;
    return Number.isFinite(n) ? n : null;
}

/**
 * Read a note name or fail with a message that says what to write instead.
 *
 * The bad case we care about is an author writing "F#4" in a content file. The notation treats "#"
 * as the start of a comment, so the lexer hands us a bare "F" and swallows the rest of the line,
 * and the failure that reaches the author would otherwise be about a missing setting several lines
 * further on. So a bare letter is reported as the accidental problem it almost always is.
 */
export function noteOf(s: string): Note {
    const n = readNote(s);
    if (n !== null) return n;
    const bare = /^([A-Ga-g])(#|s|b|f)?$/.exec(s.trim());
    if (bare) {
        const letter = (bare[1] ?? "").toUpperCase();
        throw new PitchError(
            `"${s}" has no octave: write ${letter}4 for the ${letter} above middle C. ` +
                `A sharp is written ${letter}s4 and a flat ${letter}f4, because "#" starts a comment and ` +
                `would swallow the rest of the line.`,
        );
    }
    throw new PitchError(
        `"${s}" is not a note: write a letter, an optional s or f, and an octave, as in C4 or Fs4.`,
    );
}

/** Read a list of note names, so a setting can be a chord or a phrase. */
export const notesOf = (list: readonly string[]): Note[] => list.map(noteOf);

export const inRange = (n: Note, range: [Note, Note] = RANGE): boolean =>
    n >= range[0] && n <= range[1];

/**
 * Where a note sits among the white keys, counted from C0 as 0. This is the number a staff and a
 * keyboard both lay out against: one step in it is one line or space on the staff, and one white
 * key on the piano. A black key takes the index of the white key below it, because that is the
 * letter it is named after and the line it is written on.
 *
 * LETTERS runs C to B, which is already the order a staff climbs in and the order an octave
 * number changes on, so the index is the octave times seven plus the letter.
 */
export const whiteIndex = (n: Note): number => octaveOf(n) * 7 + LETTERS.indexOf(letterOf(n));

/** The white note at a white-key index, which is the inverse of whiteIndex for a white note. */
export function whiteAt(index: number): Note {
    const oct = Math.floor(index / 7);
    const letter = LETTERS[((index % 7) + 7) % 7] ?? "C";
    return (oct + 1) * 12 + OF_LETTER[letter];
}

/** The next white key at or above a note, so a keyboard that is asked to start on a black one does not. */
export const whiteFrom = (n: Note): Note => (isBlack(n) ? n + 1 : n);

/** A run of white keys: what a piano with no black keys is, and the order a lesson names them in. */
export function whiteKeys(from: Note, count: number): Note[] {
    const start = whiteIndex(whiteFrom(from));
    return Array.from({ length: Math.max(0, count) }, (_, i) => whiteAt(start + i));
}

/** Every key, black and white, from one note to another. */
export const chromatic = (from: Note, to: Note): Note[] =>
    Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
