import { letter, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { LETTERS, noteOf, readNote, whiteIndex, type Letter } from "../../sound/pitch";
import { headOf } from "../../sound/beat";
import { SPACE, names, trebleClef, bassClef, sharpSign, flatSign, naturalSign } from "./clefs";

const KEYS = ["C", "G", "D", "A", "E", "B", "F", "Bf", "Ef", "Af", "Df"] as const;
type Key = (typeof KEYS)[number];

export interface StaffParams {
    clef: "treble" | "bass";
    /** Note names, as C4 or Fs4. A "#" cannot appear in a content file, so a sharp is written s. "rest" is a rest. */
    notes: string[];
    /** Beats per note, in the same units as the rhythm bar. Empty means one beat each; 1.5 and 3 are dotted. */
    values: number[];
    /** Write the letter under each note, which is the reading path for a child who is learning them. */
    letters: boolean;
    lit: string[];
    /** Beats in a bar, which draws the time signature and a bar line after each bar. 0 for neither. */
    meter: number;
    /** The key signature, named by its major key: C has none, G to B are one to five sharps, F to Df one to five flats. */
    key: Key;
    /** The time signature's lower number is 8, so meter counts quavers and six-eight holds three crotchets' worth. */
    quavers: boolean;
    /** Chord symbols written above the notes they start on, as a lead sheet has them; _ where none starts. */
    chords: string[];
    /** Space each note by how long it lasts, three squares a crotchet, so two staves line up beat by beat. */
    spaced: boolean;
}

/**
 * The order sharps and flats are written in a key signature, and the note each sits on in the treble
 * staff; the bass writes the same letters two octaves lower.
 */
const SHARPS = ["F5", "C5", "G5", "D5", "A4", "E5", "B4"];
const FLATS = ["B4", "E5", "A4", "D5", "G4", "C5", "F4"];
const SIGNATURE: Record<Key, number> = {
    C: 0,
    G: 1,
    D: 2,
    A: 3,
    E: 4,
    B: 5,
    F: -1,
    Bf: -2,
    Ef: -3,
    Af: -4,
    Df: -5,
};
const signatureOf = (key: Key | undefined): string[] => {
    const n = SIGNATURE[key ?? "C"];
    return n >= 0 ? SHARPS.slice(0, n) : FLATS.slice(0, -n);
};
/** The alteration a key signature gives a letter, +1 for a sharp and -1 for a flat. */
const keyAlters = (key: Key | undefined, l: Letter): number =>
    signatureOf(key).some((s) => s.startsWith(l)) ? Math.sign(SIGNATURE[key ?? "C"]) : 0;
const signatureWidth = (key: Key | undefined): number => {
    const n = Math.abs(SIGNATURE[key ?? "C"]);
    return n === 0 ? 0 : Math.ceil(n * 0.9) + 1;
};

/**
 * A note as it is written rather than as it sounds: the line or space it sits on, counted as
 * whiteIndex counts, and its sharp or flat. Bf4 sits on B's line with a flat, where the same key read
 * as a number would sit on A's.
 */
function spelled(name: string): { line: number; letter: Letter; alter: number } | null {
    const m = /^([A-G])(s|f|#|b)?(-?\d)$/.exec(name.trim());
    const l = LETTERS.find((x) => x === m?.[1]);
    if (!m || !l) return null;
    const alter = m[2] === "s" || m[2] === "#" ? 1 : m[2] === "f" || m[2] === "b" ? -1 : 0;
    return { line: Number(m[3]) * 7 + LETTERS.indexOf(l), letter: l, alter };
}

const chordText = (s: string): string => s.replace(/^([A-G])s/, "$1#").replace(/^([A-G])f/, "$1b");

/** The staff's five lines sit at these squares from the top of the box. */
const TOP_LINE = 3;

const BOTTOM_LINE = 7;

/** The note the bottom line carries, which is what a clef is. */
const clefBase: Record<StaffParams["clef"], string> = { treble: "E4", bass: "G2" };

const lengthOf = (p: Pick<StaffParams, "notes" | "values">): number =>
    p.notes.reduce((t, _, i) => t + (p.values?.[i] ?? 1), 0);

const staffWidth = (p: StaffParams): number =>
    5 +
    (p.spaced ? Math.max(1, Math.ceil(lengthOf(p) * 3)) : Math.max(1, p.notes.length) * 3) +
    (p.meter > 0 ? 2 : 0) +
    signatureWidth(p.key);

/** Where a written line or space sits, in user units, counted in half spaces from the bottom line. */
function staffY(line: number, clef: StaffParams["clef"]): number {
    const base = whiteIndex(noteOf(clefBase[clef]));
    return (BOTTOM_LINE - (line - base) * 0.5) * SPACE;
}

/**
 * A rest, drawn by hand: a crotchet rest as the zigzag a teacher writes, a minim rest sitting on the
 * middle line and a semibreve rest hanging from the line above it, which is the pair children mix up.
 */
function restMark<G>(c: Ctx<G>, x: number, beats: number): void {
    const s = SPACE;
    if (beats >= 4) {
        c.pen.rect(
            c.g,
            x - 0.55 * s,
            4 * s,
            1.1 * s,
            0.5 * s,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 1 },
        );
    } else if (beats >= 2) {
        c.pen.rect(
            c.g,
            x - 0.55 * s,
            4.5 * s,
            1.1 * s,
            0.5 * s,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 1 },
        );
    } else {
        c.pen.linear(
            c.g,
            [
                [x - 0.25 * s, 3.6 * s],
                [x + 0.35 * s, 4.4 * s],
                [x - 0.3 * s, 5.1 * s],
                [x + 0.3 * s, 5.8 * s],
                [x - 0.2 * s, 5.7 * s],
                [x + 0.1 * s, 6.4 * s],
            ],
            "pencil",
            { strokeWidth: 2.6 },
        );
    }
}

export const staffNotes = defineDrawing<StaffParams>({
    id: "notes",
    family: "music",
    title: "Notes on a staff",
    group: "Structures",
    about:
        "A five line staff with pitched notes on it, which is the drawn half of every pitch exercise: " +
        "the note that sounds is also the note on the page, so the whole of it works with the volume " +
        "at zero. One staff space is one square, so a note's line is a line on the paper underneath.",
    params: {
        clef: "treble",
        notes: ["C4", "E4", "G4"],
        values: [],
        letters: false,
        lit: [],
        meter: 0,
        key: "C",
        quavers: false,
        chords: [],
        spaced: false,
    },
    settings: {
        clef: { kind: "one of", of: ["treble", "bass"] },
        notes: { kind: "words", most: 12 },
        values: { kind: "numbers", min: 0.25, max: 4, most: 12 },
        letters: { kind: "flag" },
        lit: { kind: "words", most: 12 },
        meter: { kind: "whole", min: 0, max: 6 },
        key: { kind: "one of", of: KEYS },
        quavers: { kind: "flag" },
        chords: { kind: "words", most: 12 },
        spaced: { kind: "flag" },
    },
    takes: [
        {
            label: "Middle C",
            params: {
                clef: "treble" as const,
                notes: ["C4"],
                values: [],
                letters: true,
                lit: [],
                meter: 0,
                key: "C" as const,
                quavers: false,
                chords: [],
                spaced: false,
            },
        },
        {
            label: "C major, letters written",
            params: {
                clef: "treble" as const,
                notes: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
                values: [],
                letters: true,
                lit: [],
                meter: 0,
                key: "C" as const,
                quavers: false,
                chords: [],
                spaced: false,
            },
        },
        {
            label: "A sharp in the bar",
            params: {
                clef: "treble" as const,
                notes: ["F4", "Fs4", "G4"],
                values: [1, 1, 2],
                letters: false,
                lit: ["Fs4"],
                meter: 0,
                key: "C" as const,
                quavers: false,
                chords: [],
                spaced: false,
            },
        },
        {
            label: "Bass clef",
            params: {
                clef: "bass" as const,
                notes: ["G2", "B2", "D3"],
                values: [],
                letters: true,
                lit: [],
                meter: 0,
                key: "C" as const,
                quavers: false,
                chords: [],
                spaced: false,
            },
        },
        {
            label: "Three beats in a bar",
            params: {
                clef: "treble" as const,
                notes: ["C4", "E4", "G4", "E4", "C4"],
                values: [1, 1, 1, 3],
                letters: false,
                lit: [],
                meter: 3,
                key: "C" as const,
                quavers: false,
                chords: [],
                spaced: false,
            },
        },
        {
            label: "A rest and a dotted note",
            params: {
                clef: "treble" as const,
                notes: ["G4", "rest", "E4", "D4"],
                values: [1, 1, 1.5, 0.5],
                letters: false,
                lit: [],
                meter: 4,
                key: "C" as const,
                quavers: false,
                chords: [],
                spaced: false,
            },
        },
        {
            label: "Two sharps in the key",
            params: {
                clef: "treble" as const,
                notes: ["D4", "Fs4", "A4", "Cs5", "D5"],
                values: [],
                letters: true,
                lit: [],
                meter: 0,
                key: "D" as const,
                quavers: false,
                chords: [],
                spaced: false,
            },
        },
        {
            label: "Six-eight, with a flat",
            params: {
                clef: "treble" as const,
                notes: ["F4", "A4", "Bf4", "C5", "A4", "F4"],
                values: [1.5, 1, 0.5, 1.5, 1, 0.5],
                letters: false,
                lit: [],
                meter: 6,
                key: "F" as const,
                quavers: true,
                chords: [],
                spaced: false,
            },
        },
        {
            label: "A lead sheet line",
            params: {
                clef: "treble" as const,
                notes: ["G4", "G4", "G4", "A4", "B4", "A4"],
                values: [1, 1, 1, 1, 2, 2],
                letters: false,
                lit: [],
                meter: 4,
                key: "C" as const,
                quavers: false,
                chords: ["C", "_", "_", "_", "G7", "_"],
                spaced: false,
            },
        },
        {
            label: "The left hand, spaced by length",
            params: {
                clef: "bass" as const,
                notes: ["C3", "G2", "C3"],
                values: [4, 2, 2],
                letters: false,
                lit: [],
                meter: 4,
                key: "C" as const,
                quavers: false,
                chords: [],
                spaced: true,
            },
        },
    ],
    box: (p) => ({ w: staffWidth(p), h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const meter = Math.max(0, Math.round(p.meter || 0));
        const bar = p.quavers ? meter / 2 : meter;
        const w = staffWidth(p);
        const sig = signatureWidth(p.key);
        const shift = (meter > 0 ? 2 : 0) + sig;
        const a: RawAnchors = {};
        const lit = new Set(names(p.lit ?? []));

        // Anything a child counts is drawn at the ruler level, and a staff line is counted.
        for (let i = TOP_LINE; i <= BOTTOM_LINE; i++) {
            pen.line(g, 0.6 * U, i * SPACE, (w - 0.6) * U, i * SPACE, "ruler", {
                strokeWidth: 1.4,
            });
        }

        if (p.clef === "treble") trebleClef(c, 2.1 * U, 6 * SPACE);
        else bassClef(c, 2.1 * U, 4 * SPACE);
        const low = p.clef === "treble" ? 0 : 14;
        signatureOf(p.key).forEach((name, i) => {
            const at = spelled(name);
            if (!at) return;
            const x = (4.2 + i * 0.9) * U;
            const y = staffY(at.line - low, p.clef);
            if (SIGNATURE[p.key ?? "C"] > 0) sharpSign(c, x, y);
            else flatSign(c, x, y);
        });
        if (meter > 0) {
            // The time signature: how many beats, over the 4 that counts crotchets or the 8 that
            // counts quavers.
            for (const [digit, y] of [
                [String(meter), 5 * SPACE - 3],
                [p.quavers ? "8" : "4", 7 * SPACE - 3],
            ] as const) {
                letter(c, {
                    x: (4.6 + sig) * U,
                    y,
                    s: digit,
                    face: "read",
                    weight: 800,
                    size: 2.3 * SPACE,
                    fill: c.t.ink,
                    anchor: "middle",
                });
            }
        }

        let counted = 0;
        const barAt: number[] = [];
        (p.notes ?? []).forEach((name, i) => {
            const x = (4.6 + shift + (p.spaced ? counted : i) * 3) * U;
            const beats = p.values?.[i] ?? 1;
            counted += beats;
            if (meter > 0 && Math.abs(counted % bar) < 1e-9 && i < p.notes.length - 1)
                barAt.push(p.spaced ? (3.1 + shift + counted * 3) * U : x + 1.5 * U);
            const chord = p.chords?.[i] ?? "_";
            if (chord !== "_" && chord !== "")
                say(c, x - 0.9 * U, 1.7 * U, chordText(chord), 17, "start", c.t.ink);
            if (name === "rest") {
                restMark(c, x, beats);
                a[`note(${i})`] = [x, 2.2 * SPACE, "up"];
                return;
            }
            const n = readNote(name);
            const at = spelled(name);
            if (n === null || !at) return;
            const y = staffY(at.line, p.clef);
            const { open, flags } = headOf(beats);

            // Ledger lines: a short line through the head for anything off the staff, which is how
            // middle C is written and the reason a child can find it.
            for (let ly = (BOTTOM_LINE + 1) * SPACE; ly <= y + 1; ly += SPACE) {
                pen.line(g, x - 1.25 * U, ly, x + 1.25 * U, ly, "ruler", { strokeWidth: 1.4 });
            }
            for (let ly = (TOP_LINE - 1) * SPACE; ly >= y - 1; ly -= SPACE) {
                pen.line(g, x - 1.25 * U, ly, x + 1.25 * U, ly, "ruler", { strokeWidth: 1.4 });
            }

            if (at.alter !== keyAlters(p.key, at.letter)) {
                const sign = at.alter > 0 ? sharpSign : at.alter < 0 ? flatSign : naturalSign;
                sign(c, x - 1.25 * U, y);
            }
            pen.ellipse(
                g,
                x,
                y,
                1.16 * U,
                0.84 * U,
                "pencil",
                open ? null : { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 1.6 },
            );
            // A dot adds half the note again, so 3 is a dotted minim and 1.5 a dotted crotchet. It sits in
            // a space, so a note on a line has its dot moved up into the space above.
            if (Math.abs(beats - 3) < 1e-9 || Math.abs(beats - 1.5) < 1e-9) {
                const onLine = Math.abs((y / SPACE) % 1) < 1e-6;
                pen.circle(
                    g,
                    x + 0.95 * U,
                    onLine ? y - SPACE / 2 : y,
                    5,
                    "ruler",
                    { fill: c.t.ink, fillStyle: "solid" },
                    { strokeWidth: 0.6 },
                );
            }

            // Stems point away from the middle line, which is the one rule of stem direction a child
            // ever needs.
            const up = y > 5 * SPACE;
            const tipY = up ? y - 3.2 * SPACE : y + 3.2 * SPACE;
            const stemX = up ? x + 0.55 * U : x - 0.55 * U;
            if (beats < 4)
                pen.line(g, stemX, y - (up ? 2 : -2), stemX, tipY, "pencil", { strokeWidth: 1.7 });
            for (let f = 0; f < flags; f++) {
                const fy = tipY + (up ? 1 : -1) * f * 0.5 * SPACE;
                pen.curve(
                    g,
                    [
                        [stemX, fy],
                        [stemX + 0.6 * U, fy + (up ? 0.5 : -0.5) * SPACE],
                        [stemX + 0.42 * U, fy + (up ? 1.1 : -1.1) * SPACE],
                    ],
                    "pencil",
                    { strokeWidth: 1.6 },
                );
            }

            if (lit.has(n)) {
                pen.ellipse(g, x, y, 2.1 * U, 1.7 * U, "doodle", null, {
                    strokeWidth: 2.4,
                    stroke: c.t.pen,
                });
            }
            if (p.letters) {
                say(
                    c,
                    x,
                    10.4 * U,
                    at.letter + (at.alter > 0 ? "#" : at.alter < 0 ? "b" : ""),
                    17,
                    "middle",
                    c.t["ink-soft"],
                );
            }
            a[`note(${i})`] = [x, y - 1.2 * U, "up"];
        });

        for (const x of barAt)
            pen.line(g, x, TOP_LINE * SPACE, x, BOTTOM_LINE * SPACE, "ruler", { strokeWidth: 1.6 });
        if (meter > 0) {
            const end = (w - 0.8) * U;
            pen.line(g, end - 5, TOP_LINE * SPACE, end - 5, BOTTOM_LINE * SPACE, "ruler", {
                strokeWidth: 1.4,
            });
            pen.line(g, end, TOP_LINE * SPACE, end, BOTTOM_LINE * SPACE, "ruler", {
                strokeWidth: 3.4,
            });
        }

        a.staff = [(w / 2) * U, TOP_LINE * SPACE - 0.4 * U, "up"];
        a.under = [(w / 2) * U, 10.6 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A five line staff with a ${p.clef} clef${signatureWidth(p.key) ? ", a key signature" : ""} and notes on it, each a head on its line or space${p.letters ? " with its letter written under it" : p.chords?.some((x) => x !== "_") ? ", chords named above" : ""}.`,
    reads: true,
});
