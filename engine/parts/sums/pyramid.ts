import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { slot } from "./blank";

export const numberPyramid = defineDrawing({
    id: "pyramid",
    family: "sums",
    title: "Number pyramid",
    group: "Structures",
    about: "A wall of bricks where each brick is the sum of the two under it. Empty bricks are boxes to fill in.",
    params: {
        rows: 3,
        cells: ["3", "5", "2", "", "", ""],
        blank: [false, false, false, true, true, true],
    },
    settings: {
        rows: { kind: "whole", min: 2, max: 5 },
        cells: { kind: "words", most: 15 },
        blank: { kind: "fixed" },
    },
    takes: [
        {
            label: "Three rows, bottom given",
            params: {
                rows: 3,
                cells: ["3", "5", "2", "", "", ""],
                blank: [false, false, false, true, true, true],
            },
        },
        {
            label: "Top given",
            params: {
                rows: 3,
                cells: ["", "", "", "", "", "23"],
                blank: [true, true, true, true, true, false],
            },
        },
    ],
    box: (p) => ({ w: p.rows * 4 + 1, h: p.rows * 2 + 1 }),
    draw: (c, p) => {
        const a: RawAnchors = {};
        let i = 0;
        for (let r = 0; r < p.rows; r++) {
            const count = p.rows - r,
                y = (p.rows - 1 - r) * 2 * U + U / 2;
            for (let k = 0; k < count; k++, i++) {
                const x = (r * 2 + k * 4) * U + U / 2;
                if (p.blank[i]) slot(c, x, y, 4 * U, 2 * U, p.cells[i] || undefined);
                else {
                    c.pen.rect(c.g, x, y, 4 * U, 2 * U, "ruler", null, { strokeWidth: 1.4 });
                    say(c, x + 2 * U, y + U + 7, p.cells[i] ?? "", 18);
                }
                a[`brick(${i})`] = [x + 2 * U, y, "up"];
            }
        }
        return a;
    },
    describe: () =>
        "A number pyramid, rows of boxes each one shorter than the row below, with numbers in some boxes and the rest left blank to fill in.",
});
