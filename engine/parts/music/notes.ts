import { letter, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { isBlack, letterOf, noteOf, readNote, whiteIndex, type Note } from "../../sound/pitch";
import { headOf } from "../../sound/beat";
import { SPACE, names, trebleClef, bassClef, sharpSign } from "./clefs";

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
}

/** The staff's five lines sit at these squares from the top of the box. */
const TOP_LINE = 3;

const BOTTOM_LINE = 7;

/** The note the bottom line carries, which is what a clef is. */
const clefBase: Record<StaffParams["clef"], string> = { treble: "E4", bass: "G2" };

export const staffWidth = (notes: readonly string[], meter = 0): number =>
    5 + Math.max(1, notes.length) * 3 + (meter > 0 ? 2 : 0);

/** Where a note head sits, in user units, counted in half spaces from the bottom line. */
export function staffY(note: Note, clef: StaffParams["clef"]): number {
    const base = whiteIndex(noteOf(clefBase[clef]));
    return (BOTTOM_LINE - (whiteIndex(note) - base) * 0.5) * SPACE;
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
    },
    settings: {
        clef: { kind: "one of", of: ["treble", "bass"] },
        notes: { kind: "words", most: 12 },
        values: { kind: "numbers", min: 0.25, max: 4, most: 12 },
        letters: { kind: "flag" },
        lit: { kind: "words", most: 12 },
        meter: { kind: "whole", min: 0, max: 6 },
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
            },
        },
    ],
    box: (p) => ({ w: staffWidth(p.notes, p.meter ?? 0), h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const meter = Math.max(0, Math.round(p.meter || 0));
        const w = staffWidth(p.notes, meter);
        const shift = meter > 0 ? 2 : 0;
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
        if (meter > 0) {
            // The time signature: how many beats, over the 4 that says a beat is a crotchet.
            for (const [digit, y] of [
                [String(meter), 5 * SPACE - 3],
                [String(4), 7 * SPACE - 3],
            ] as const) {
                letter(c, {
                    x: 4.6 * U,
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
            const x = (4.6 + shift + i * 3) * U;
            const beats = p.values?.[i] ?? 1;
            counted += beats;
            if (meter > 0 && Math.abs(counted % meter) < 1e-9 && i < p.notes.length - 1)
                barAt.push(x + 1.5 * U);
            if (name === "rest") {
                restMark(c, x, beats);
                a[`note(${i})`] = [x, 2.2 * SPACE, "up"];
                return;
            }
            const n = readNote(name);
            if (n === null) return;
            const y = staffY(n, p.clef);
            const { open, flags } = headOf(beats);

            // Ledger lines: a short line through the head for anything off the staff, which is how
            // middle C is written and the reason a child can find it.
            for (let ly = (BOTTOM_LINE + 1) * SPACE; ly <= y + 1; ly += SPACE) {
                pen.line(g, x - 1.25 * U, ly, x + 1.25 * U, ly, "ruler", { strokeWidth: 1.4 });
            }
            for (let ly = (TOP_LINE - 1) * SPACE; ly >= y - 1; ly -= SPACE) {
                pen.line(g, x - 1.25 * U, ly, x + 1.25 * U, ly, "ruler", { strokeWidth: 1.4 });
            }

            if (isBlack(n)) sharpSign(c, x - 1.25 * U, y);
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
                    letterOf(n) + (isBlack(n) ? "#" : ""),
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
        `A five line staff with a ${p.clef} clef and notes on it, each a head on its line or space${p.letters ? " with its letter written under it" : ""}.`,
    reads: true,
});
