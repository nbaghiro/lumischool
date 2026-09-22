import { letter, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** Column width in squares: every column is as wide as the longest thing in the table. */
const tableCol = (entries: string[]): number =>
    Math.max(3, Math.ceil(Math.max(0, ...entries.map((s) => s.length)) * 0.55) + 1);

export const dataTable = defineDrawing({
    id: "table",
    family: "data",
    title: "Table",
    group: "Structures",
    about: "Rows of data with a heading row, so a question can ask the child to read a value off it.",
    params: {
        cols: 3,
        head: ["Day", "Books", "Cost"],
        cells: ["Mon", "12", "$4", "Tue", "9", "$3", "Wed", "15", "$5"],
    },
    settings: {
        cols: { kind: "whole", min: 1, max: 6 },
        head: { kind: "words", most: 6 },
        cells: { kind: "words", most: 24 },
    },
    takes: [
        {
            label: "Three columns",
            params: {
                cols: 3,
                head: ["Day", "Books", "Cost"],
                cells: ["Mon", "12", "\u00a34", "Tue", "9", "\u00a33", "Wed", "15", "\u00a35"],
            },
        },
        {
            label: "Two columns",
            params: {
                cols: 2,
                head: ["Class", "Books"],
                cells: ["Red", "24", "Blue", "31", "Green", "18"],
            },
        },
        {
            label: "No heading row",
            params: { cols: 2, head: [], cells: ["Pen", "1.35", "Pad", "2.40"] },
        },
    ],
    box: (p) => ({
        w: p.cols * tableCol([...p.head, ...p.cells]) + 1,
        h: ((p.head.length ? 1 : 0) + Math.ceil(p.cells.length / p.cols)) * 2 + 1,
    }),
    draw: (c, p) => {
        const cw = tableCol([...p.head, ...p.cells]) * U,
            rh = 2 * U,
            a: RawAnchors = {};
        const head = p.head.length ? 1 : 0;
        const rows = head + Math.ceil(p.cells.length / p.cols);
        const cell = (col: number, row: number, s: string, bold: boolean) => {
            const x = U / 2 + col * cw,
                y = U / 2 + row * rh;
            c.pen.rect(c.g, x, y, cw, rh, "ruler", null, { strokeWidth: bold ? 2.2 : 1.3 });
            if (s)
                letter(c, {
                    x: x + cw / 2,
                    y: y + rh / 2 + 6,
                    s,
                    face: "read",
                    weight: bold ? 700 : 600,
                    size: 15,
                    fill: c.t.ink,
                    anchor: "middle",
                });
        };
        p.head.forEach((s, i) => cell(i, 0, s, true));
        p.cells.forEach((s, i) => {
            const col = i % p.cols,
                row = head + Math.floor(i / p.cols);
            cell(col, row, s, false);
            a[`cell(${i})`] = [U / 2 + col * cw + cw / 2, U / 2 + row * rh, "up"];
        });
        for (let r = 0; r < rows; r++) a[`row(${r})`] = [U / 2, U / 2 + r * rh + rh / 2, "left"];
        for (let k = 0; k < p.cols; k++) a[`col(${k})`] = [U / 2 + k * cw + cw / 2, U / 2, "up"];
        return a;
    },
    describe: () =>
        "A table of rows and columns ruled in ink, with a heading row in heavier type and a value written in each cell.",
});
