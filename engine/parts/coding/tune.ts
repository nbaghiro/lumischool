import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U, type TokenName } from "../../paper";
import { defineDrawing } from "../drawing";
import { patch, penned, say } from "../lettering";
import { parse, run, upTo, world } from "../../coding";

const BAR_LETTERS = ["C", "D", "E", "F", "G", "A", "B", "C"];

const BAR_FILL: TokenName[] = ["berry", "tang", "glow", "mint", "sky", "berry", "tang", "glow"];

/** Which bar a note is struck on: its letter, and high C is the last bar. */
function barOf(note: string): number {
    const letter = note[0]?.toUpperCase() ?? "";
    if (letter === "C" && note.endsWith("5")) return 7;
    const i = BAR_LETTERS.indexOf(letter);
    return i < 0 ? -1 : i;
}

export const tune = defineDrawing({
    id: "tune",
    family: "coding",
    title: "A tune as a program",
    group: "Structures",
    about: "Chime bars from C up to high C, each with its letter, and a tune written as a program of play lines, with repeats. The bars the program strikes are numbered in the order they sound, which is the paper form: a child writes the letters in order, or numbers the bars from the code. On screen the same program plays through the sound switch while the bars light in step.",
    params: { code: ["play C", "play E", "play G", "play C5"], upto: -1, numbers: true, ring: 0 },
    settings: {
        code: { kind: "words", most: 12 },
        upto: { kind: "whole", min: -1, max: 16 },
        numbers: { kind: "flag" },
        ring: { kind: "whole", min: 0, max: 16 },
    },
    takes: [
        {
            label: "Up the chord",
            params: {
                code: ["play C", "play E", "play G", "play C5"],
                upto: -1,
                numbers: true,
                ring: 0,
            },
        },
        {
            label: "A repeat that rings",
            params: {
                code: ["repeat 2", "  play G", "  play E"],
                upto: -1,
                numbers: true,
                ring: 3,
            },
        },
    ],
    box: () => ({ w: 26, h: 10 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c;
        const r = run(parse(p.code), world({ cols: 1, rows: 1 })),
            part = upTo(r, p.upto);
        const struck = new Map<number, number[]>();
        let order = 0,
            ringed = -1;
        for (const f of part.frames)
            if (f.kind === "play" && f.note) {
                order++;
                const b = barOf(f.note);
                if (b >= 0) struck.set(b, [...(struck.get(b) ?? []), order]);
                if (order === p.ring) ringed = b;
            }
        pen.line(g, 0.8 * U, 3.2 * U, 25.2 * U, 3.8 * U, "pencil", { strokeWidth: 3 });
        pen.line(g, 0.8 * U, 8.4 * U, 25.2 * U, 7.6 * U, "pencil", { strokeWidth: 3 });
        for (let i = 0; i < 8; i++) {
            const x = (1.4 + i * 3) * U,
                hgt = (7.4 - i * 0.35) * U,
                y = 5.8 * U - hgt / 2 + U * 0.2;
            if (i === ringed)
                pen.path(g, roundedRect(x - 5, y - 5, 2.4 * U + 10, hgt + 10, 9), "pencil", null, {
                    strokeWidth: 3,
                    stroke: c.t.pen,
                });
            pen.path(g, roundedRect(x, y, 2.4 * U, hgt, 6), "pencil", pen.fill(BAR_FILL[i]), {
                strokeWidth: 1.8,
            });
            for (const dy of [0.8 * U, hgt - 0.8 * U])
                pen.circle(g, x + 1.2 * U, y + dy, 7, "ruler", pen.fill("card"), {
                    strokeWidth: 1,
                });
            patch(c, x + 1.2 * U, y + hgt / 2 - 5, 18, 20);
            say(c, x + 1.2 * U, y + hgt / 2 + 2, BAR_LETTERS[i] ?? "", 16);
            const hits = struck.get(i);
            if (hits && p.numbers) penned(c, x + 1.2 * U, y - 0.2 * U, hits.join(", "), 15);
            a[`bar(${i + 1})`] = [x + 1.2 * U, y, "up"];
        }
        return a;
    },
    describe: () =>
        "Chime bars from low to high in a row, each with its letter, and the tune's play lines written as a program beside them.",
});
