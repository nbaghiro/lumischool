import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { MIDDLE_C, isBlack, letterOf, readNote, whiteIndex, type Note } from "../../sound/pitch";
import { names, trebleClef, bassClef, sharpSign } from "./clefs";

interface GrandParams {
    /** Note names. Middle C and above go on the treble staff, below it on the bass. "rest" is a gap. */
    notes: string[];
    letters: boolean;
    lit: string[];
    /** Mark the three landmark notes every early method reads from: bass F, middle C and treble G. */
    landmarks: boolean;
}

/**
 * Where a note sits on the grand staff, in squares from the top. The two staves are one square to
 * a space like the single staff, and middle C is exactly half way between them on its own short
 * line, which is the fact a child reads the whole of the grand staff from.
 */
const grandY = (note: Note): number => 8 - (whiteIndex(note) - whiteIndex(MIDDLE_C)) * 0.5;

const grandWidth = (notes: readonly string[]): number => 6 + Math.max(1, notes.length) * 3;

export const grandStaff = defineDrawing<GrandParams>({
    id: "grandstaff",
    family: "music",
    title: "Grand staff",
    group: "Structures",
    about:
        "The two staves a piano is read from, braced together: the treble for the right hand, the bass " +
        "for the left, and middle C on its own short line exactly half way between them. The three " +
        "landmark notes every early method reads from, bass F, middle C and treble G, can be marked.",
    params: { notes: ["F3", "C4", "G4"], letters: false, lit: [], landmarks: false },
    settings: {
        notes: { kind: "words", most: 12 },
        letters: { kind: "flag" },
        lit: { kind: "words", most: 12 },
        landmarks: { kind: "flag" },
    },
    takes: [
        {
            label: "The three landmarks",
            params: { notes: ["F3", "C4", "G4"], letters: true, lit: [], landmarks: true },
        },
        {
            label: "Steps up from middle C",
            params: {
                notes: ["C4", "D4", "E4", "F4", "G4"],
                letters: false,
                lit: ["C4"],
                landmarks: false,
            },
        },
        {
            label: "Left hand, bass C to G",
            params: {
                notes: ["C3", "D3", "E3", "F3", "G3"],
                letters: true,
                lit: [],
                landmarks: false,
            },
        },
    ],
    box: (p) => ({ w: grandWidth(p.notes), h: 16 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const w = grandWidth(p.notes);
        const a: RawAnchors = {};
        const lit = new Set(names(p.lit ?? []));
        const left = 1.4 * U,
            right = (w - 0.4) * U;
        for (const y of [3, 4, 5, 6, 7, 9, 10, 11, 12, 13])
            pen.line(g, left, y * U, right, y * U, "ruler", { strokeWidth: 1.4 });
        pen.line(g, left, 3 * U, left, 13 * U, "ruler", { strokeWidth: 2 });
        // The brace, as two curves meeting at the middle: it says the two staves are one instrument.
        pen.curve(
            g,
            [
                [left - 4, 3 * U],
                [left - 14, 4.4 * U],
                [left - 8, 7 * U],
                [left - 18, 8 * U],
            ],
            "pencil",
            { strokeWidth: 2.4 },
        );
        pen.curve(
            g,
            [
                [left - 18, 8 * U],
                [left - 8, 9 * U],
                [left - 14, 11.6 * U],
                [left - 4, 13 * U],
            ],
            "pencil",
            { strokeWidth: 2.4 },
        );
        trebleClef(c, 2.9 * U, 6 * U);
        bassClef(c, 2.9 * U, 10 * U);

        if (p.landmarks) {
            // A soft band on the two lines the clefs are named for, and on middle C's line, each with
            // its letter, so the three landmarks are found before anything is counted.
            for (const [y, letter] of [
                [10, "F"],
                [8, "C"],
                [6, "G"],
            ] as const) {
                pen.rect(
                    g,
                    4.6 * U,
                    y * U - 0.3 * U,
                    (w - 5.2) * U,
                    0.6 * U,
                    "ruler",
                    pen.fill("glow"),
                    { stroke: "none" },
                );
                say(c, 4.2 * U, y * U + 5, letter, 13, "middle", c.t["ink-soft"]);
            }
        }

        (p.notes ?? []).forEach((name, i) => {
            const x = (6 + i * 3) * U;
            const n = readNote(name);
            if (n === null) return;
            const ys = grandY(n);
            const y = ys * U;
            // Ledger lines: middle C's own, and any above the treble or below the bass.
            if (Math.abs(ys - 8) < 1e-9)
                pen.line(g, x - 1.25 * U, 8 * U, x + 1.25 * U, 8 * U, "ruler", {
                    strokeWidth: 1.4,
                });
            for (let ly = 2; ly >= ys - 1e-9; ly--)
                pen.line(g, x - 1.25 * U, ly * U, x + 1.25 * U, ly * U, "ruler", {
                    strokeWidth: 1.4,
                });
            for (let ly = 14; ly <= ys + 1e-9; ly++)
                pen.line(g, x - 1.25 * U, ly * U, x + 1.25 * U, ly * U, "ruler", {
                    strokeWidth: 1.4,
                });
            if (isBlack(n)) sharpSign(c, x - 1.25 * U, y);
            pen.ellipse(
                g,
                x,
                y,
                1.16 * U,
                0.84 * U,
                "pencil",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 1.6 },
            );
            // Stems point away from the middle line of the staff the note is on.
            const middle = ys <= 8 ? 5 : 11;
            const up = ys > middle;
            const stemX = up ? x + 0.55 * U : x - 0.55 * U;
            pen.line(g, stemX, y + (up ? -2 : 2), stemX, y + (up ? -3.2 : 3.2) * U, "pencil", {
                strokeWidth: 1.7,
            });
            if (lit.has(n))
                pen.ellipse(g, x, y, 2.1 * U, 1.7 * U, "doodle", null, {
                    strokeWidth: 2.4,
                    stroke: c.t.pen,
                });
            if (p.letters)
                say(
                    c,
                    x,
                    15.4 * U,
                    letterOf(n) + (isBlack(n) ? "#" : ""),
                    16,
                    "middle",
                    c.t["ink-soft"],
                );
            a[`note(${i})`] = [x, y - 1.2 * U, "up"];
        });
        a.treble = [(w / 2) * U, 2.6 * U, "up"];
        a.middle = [(w / 2) * U, 8 * U, "right"];
        a.bass = [(w / 2) * U, 13.4 * U, "down"];
        return a;
    },
    describe: (p) =>
        `The two staves a piano is read from, braced together, the treble above the bass, with notes on them${p.landmarks ? " and the three landmark notes marked" : ""}.`,
});
