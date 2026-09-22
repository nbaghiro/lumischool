// Fretted instruments, as data: which strings, where a pitch lives, what a chord shape is, what a
// strum pattern is, and what changes between two chords.
//
// Two conventions are fixed here because every drawing and every sentence depends on them, and
// both are the ones a teacher and a printed chord chart already use. Strings are numbered from the
// thinnest, so string 1 is the guitar's high E and the ukulele's A, the string nearest the floor
// when the instrument is held. Lists of strings are written the other way, from the string nearest
// the player's chin, which is the order a tuning is said in (E A D G B E, G C E A) and the order a
// chord box draws from left to right. So in a list of n strings, index i is string n - i.
//
// Fingers are numbered the guitarist's way, 1 for the index finger to 4 for the little finger,
// which is not the pianist's way: at the keyboard the thumb is 1. A child who does both meets the
// two systems, and .docs/guitar.md says how the lessons handle it.
import { noteName, noteOf, type Note } from "./pitch";

export const TUNING_NAMES = ["uke", "guitar"] as const;
export type TuningName = (typeof TUNING_NAMES)[number];

export interface Tuning {
    name: TuningName;
    /** What a child calls it. */
    title: string;
    /** Open strings from the one nearest the player's chin to the one nearest the floor. */
    strings: Note[];
    /** What they are called, in the same order, which is how a teacher says the tuning. */
    names: string[];
    voice: "uke" | "nylon";
}

export const TUNINGS: Record<TuningName, Tuning> = {
    // Re-entrant: the G string is tuned above the C beside it, so the lowest note is the third
    // string. That is why the four open strings make a chord a child can strum on the first day.
    uke: {
        name: "uke",
        title: "ukulele",
        strings: ["G4", "C4", "E4", "A4"].map(noteOf),
        names: ["G", "C", "E", "A"],
        voice: "uke",
    },
    guitar: {
        name: "guitar",
        title: "guitar",
        strings: ["E2", "A2", "D3", "G3", "B3", "E4"].map(noteOf),
        names: ["E", "A", "D", "G", "B", "E"],
        voice: "nylon",
    },
};

export const tuningOf = (name: string | undefined): Tuning =>
    TUNINGS[
        (TUNING_NAMES as readonly string[]).includes(name ?? "") ? (name as TuningName) : "uke"
    ];

export type Finger = 1 | 2 | 3 | 4;
export const FINGERS: Finger[] = [1, 2, 3, 4];
export const FINGER_NAMES: Record<Finger, string> = {
    1: "pointer finger",
    2: "middle finger",
    3: "ring finger",
    4: "little finger",
};

/** One place a finger can make a note: a string by its number and a fret, 0 for the open string. */
export interface Place {
    string: number;
    fret: number;
    finger?: Finger;
}

export const placeId = (p: Pick<Place, "string" | "fret">): string => `s${p.string}f${p.fret}`;

export function readPlace(id: string): Place | null {
    const m = /^s(\d+)f(\d+)$/.exec(id.trim());
    return m ? { string: Number(m[1]), fret: Number(m[2]) } : null;
}

/** The list index of a string, from its number. */
export const indexOf = (t: Tuning, string: number): number => t.strings.length - string;
export const openOf = (t: Tuning, string: number): Note =>
    t.strings[indexOf(t, string)] ?? t.strings[0] ?? 0;
export const noteAt = (t: Tuning, p: Pick<Place, "string" | "fret">): Note =>
    openOf(t, p.string) + p.fret;
export const stringName = (t: Tuning, string: number): string => t.names[indexOf(t, string)] ?? "";

/** Every place a pitch can be played, up to a fret, lowest fret first. One pitch, several places. */
export function placesOf(t: Tuning, note: Note, frets = 12): Place[] {
    const out: Place[] = [];
    t.strings.forEach((open, i) => {
        const fret = note - open;
        if (fret >= 0 && fret <= frets) out.push({ string: t.strings.length - i, fret });
    });
    return out.sort((a, b) => a.fret - b.fret || a.string - b.string);
}

/** A place in words, for a screen reader and for the line under the instrument. */
export function spokenPlace(t: Tuning, p: Place): string {
    const where = p.fret === 0 ? `string ${p.string}, open` : `string ${p.string}, fret ${p.fret}`;
    return `${noteName(noteAt(t, p))}, ${where}`;
}

/**
 * A chord shape, in the compact form chord books print: one character a string in list order, a
 * digit for the fret, 0 for open and x for a string not played. `fingers` is the same length, a
 * digit for the finger and a dash where no finger goes.
 */
export interface Shape {
    name: string;
    tuning: TuningName;
    frets: (number | null)[];
    fingers: (Finger | null)[];
    /** Easier than the full chord, for small hands: fewer fingers, and fewer strings to strum. */
    easy?: boolean;
}

interface ShapeText {
    shape: string;
    fingers: string;
    easy?: boolean;
}

// Only the shapes the lessons reach. A chord nobody teaches is a fact with nowhere to go.
const UKE: Record<string, ShapeText> = {
    C: { shape: "0003", fingers: "---3" },
    Am: { shape: "2000", fingers: "2---" },
    F: { shape: "2010", fingers: "2-1-" },
    G7: { shape: "0212", fingers: "-213" },
    C7: { shape: "0001", fingers: "---1" },
    A7: { shape: "0100", fingers: "-1--" },
    G: { shape: "0232", fingers: "-132" },
    Em: { shape: "0432", fingers: "-321" },
    Dm: { shape: "2210", fingers: "231-" },
};
const GUITAR: Record<string, ShapeText> = {
    Em: { shape: "022000", fingers: "-23---" },
    E: { shape: "022100", fingers: "-231--" },
    Am: { shape: "x02210", fingers: "x-231-" },
    A: { shape: "x02220", fingers: "x-123-" },
    D: { shape: "xx0232", fingers: "xx-132" },
    G: { shape: "320003", fingers: "21---3" },
    C: { shape: "x32010", fingers: "x32-1-" },
    // The three-string shapes a child of seven starts with: one finger, and only the thin strings.
    "C-easy": { shape: "xxx010", fingers: "xxx-1-", easy: true },
    "G-easy": { shape: "xxx003", fingers: "xxx--3", easy: true },
    "G7-easy": { shape: "xxx001", fingers: "xxx--1", easy: true },
    "Em-easy": { shape: "xxx000", fingers: "xxx---", easy: true },
};
const BOOK: Record<TuningName, Record<string, ShapeText>> = { uke: UKE, guitar: GUITAR };

export const chordNames = (tuning: TuningName): string[] => Object.keys(BOOK[tuning]);

/** Every chord either book has, which is the list of words a drawing's chord setting accepts. */
export const CHORD_WORDS: readonly string[] = [
    ...new Set([...Object.keys(UKE), ...Object.keys(GUITAR)]),
];

export function readShape(tuning: TuningName, name: string, shape: string, fingers: string): Shape {
    const n = TUNINGS[tuning].strings.length;
    const cells = (s: string) => (s.includes("-") && s.length > n ? s.split("-") : Array.from(s));
    const f = cells(shape);
    if (f.length !== n)
        throw new Error(
            `a ${TUNINGS[tuning].title} shape has ${n} strings, and "${shape}" has ${f.length}`,
        );
    const g = Array.from(fingers.padEnd(n, "-"));
    return {
        name,
        tuning,
        frets: f.map((c) => (c === "x" || c === "X" ? null : Number(c))),
        fingers: g.map((c) => (/^[1-4]$/.test(c) ? (Number(c) as Finger) : null)),
    };
}

export function chordOf(tuning: TuningName, name: string): Shape | null {
    const t = BOOK[tuning][name];
    if (!t) return null;
    return { ...readShape(tuning, name, t.shape, t.fingers), easy: t.easy };
}

/** What a chord name is printed as: the easy shapes are the same chord, drawn smaller. */
export const chordTitle = (name: string): string => name.replace(/-easy$/, "");

/** Where the fingers go, by string number, fret and finger. Open and muted strings have no place. */
export function fingersOf(s: Shape): Place[] {
    const n = s.frets.length;
    const out: Place[] = [];
    s.frets.forEach((fret, i) => {
        if (fret === null || fret === 0) return;
        out.push({ string: n - i, fret, finger: s.fingers[i] ?? undefined });
    });
    return out;
}

/** The strings that sound, by number, from the one a down strum meets first. */
export function soundingOf(s: Shape): number[] {
    const n = s.frets.length;
    return s.frets.flatMap((f, i) => (f === null ? [] : [n - i]));
}

/** The pitches a strum of this shape makes, in the order a down strum makes them. */
export function chordNotes(s: Shape): Note[] {
    const t = TUNINGS[s.tuning];
    return soundingOf(s).map((string) =>
        noteAt(t, { string, fret: s.frets[indexOf(t, string)] ?? 0 }),
    );
}

/**
 * Whether a hand can make the shape, which is the check a chord has to pass before a lesson may ask
 * for it: no finger on two strings (we teach no barres), no more than four fingers, a finger
 * everywhere a fret is pressed, and a stretch of no more than three frets from the lowest finger.
 */
export function shapeProblems(s: Shape): string[] {
    const out: string[] = [];
    const placed = fingersOf(s);
    const used = placed.map((p) => p.finger).filter((f): f is Finger => f !== undefined);
    if (new Set(used).size !== used.length) out.push(`${s.name} puts one finger on two strings`);
    if (placed.some((p) => p.finger === undefined))
        out.push(`${s.name} presses a fret with no finger named for it`);
    if (placed.length > 4) out.push(`${s.name} needs ${placed.length} fingers`);
    const frets = placed.map((p) => p.fret);
    if (frets.length && Math.max(...frets) - Math.min(...frets) > 3)
        out.push(`${s.name} stretches across more than four frets`);
    if (!soundingOf(s).length) out.push(`${s.name} sounds no string`);
    return out;
}

export type Move = "stays" | "slides" | "moves" | "lifts" | "lands";

export interface FingerMove {
    finger: Finger;
    kind: Move;
    from?: Place;
    to?: Place;
}

/**
 * What each finger does between two shapes, which is what a chord change drill shows and nothing
 * more. A finger that stays is the anchor a teacher points at; one that slides keeps its string and
 * changes fret, so it can glide rather than lift.
 */
export function changeOf(from: Shape, to: Shape): FingerMove[] {
    const a = new Map(fingersOf(from).flatMap((p) => (p.finger ? [[p.finger, p] as const] : [])));
    const b = new Map(fingersOf(to).flatMap((p) => (p.finger ? [[p.finger, p] as const] : [])));
    const out: FingerMove[] = [];
    for (const finger of FINGERS) {
        const p = a.get(finger),
            q = b.get(finger);
        if (!p && !q) continue;
        if (p && !q) out.push({ finger, kind: "lifts", from: p });
        else if (!p && q) out.push({ finger, kind: "lands", to: q });
        else if (p && q) {
            const kind: Move =
                p.string === q.string && p.fret === q.fret
                    ? "stays"
                    : p.string === q.string
                      ? "slides"
                      : "moves";
            out.push({ finger, kind, from: p, to: q });
        }
    }
    return out;
}

/** How many fingers have to leave the strings to make the change, which is what makes one hard. */
export const lifted = (moves: readonly FingerMove[]): number =>
    moves.filter((m) => m.kind === "moves" || m.kind === "lifts").length;

export type Stroke = "down" | "up";

/**
 * A strum pattern, one character to a half beat: D for down, U for up, and a dash where the hand
 * keeps moving and misses the strings. The hand never stops, which is the rule every teacher gives
 * first: down on the beat, up on the "and", whether or not it touches the strings.
 */
export interface Pattern {
    name: string;
    title: string;
    slots: string;
    beats: number;
}

export const PATTERNS: Record<string, Pattern> = {
    downs: { name: "downs", title: "Four down strums", slots: "D-D-D-D-", beats: 4 },
    "down-up": { name: "down-up", title: "Down and up", slots: "DUDUDUDU", beats: 4 },
    "two-downs-up": {
        name: "two-downs-up",
        title: "Down, down, down up",
        slots: "D-D-D-DU",
        beats: 4,
    },
    island: { name: "island", title: "Down, down up, up down up", slots: "D-DU-UDU", beats: 4 },
    waltz: { name: "waltz", title: "Three down strums", slots: "D-D-D-", beats: 3 },
};

export interface Strum {
    at: number;
    stroke: Stroke;
}

/** Where each strum of a pattern falls, in beats, and which way it goes. */
export function strumsOf(slots: string): Strum[] {
    return Array.from(slots).flatMap((c, i): Strum[] =>
        c === "D" || c === "d"
            ? [{ at: i / 2, stroke: "down" }]
            : c === "U" || c === "u"
              ? [{ at: i / 2, stroke: "up" }]
              : [],
    );
}

/** "1 & 2 & 3 & 4 &", which is how the pattern is counted out loud. */
export const counts = (beats: number): string[] =>
    Array.from({ length: beats * 2 }, (_, i) => (i % 2 ? "&" : String(i / 2 + 1)));

/**
 * The order the strings are met in by a stroke, by number. A down strum starts at the string
 * nearest the chin, which is the highest number; an up strum comes back the other way.
 */
export const strokeOrder = (strings: readonly number[], stroke: Stroke): number[] =>
    [...strings].sort((a, b) => (stroke === "down" ? b - a : a - b));

/**
 * When each string sounds in a strum, in milliseconds after the first. A real strum takes a few
 * tens of milliseconds to cross the strings and an up strum is quicker and lighter.
 */
export function strumSpread(count: number, stroke: Stroke): number[] {
    const step = stroke === "down" ? 14 : 10;
    return Array.from({ length: count }, (_, i) => i * step);
}
