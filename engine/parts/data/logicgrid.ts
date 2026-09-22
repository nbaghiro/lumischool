import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, wide } from "../lettering";

/**
 * Who owns what, as a grid: people down the side, things across the top, and a box where each pair
 * meets. `marks` runs along the rows, 0 blank, 1 a tick and 2 a cross, so a question can show the
 * crosses its clues have already ruled out and ask for the tick that is left.
 */
export const logicGrid = defineDrawing({
    id: "logicgrid",
    family: "data",
    title: "Logic grid",
    group: "Structures",
    about: "People down the side and things across the top, with a box where each pair meets for a tick or a cross. A clue that rules a pair out is a cross, and once every other box in a row is crossed the last one has to be the tick, which is the step every who-owns-what puzzle is made of.",
    params: {
        rows: ["Ann", "Ben", "Cal"],
        cols: ["cat", "dog", "fish"],
        marks: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    settings: {
        rows: { kind: "words", most: 4 },
        cols: { kind: "words", most: 4 },
        marks: { kind: "numbers", min: -1, max: 1, most: 16 },
    },
    takes: [
        {
            label: "Blank, three by three",
            params: {
                rows: ["Ann", "Ben", "Cal"],
                cols: ["cat", "dog", "fish"],
                marks: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            },
        },
        {
            label: "Two clues crossed out",
            params: {
                rows: ["Ann", "Ben", "Cal"],
                cols: ["cat", "dog", "fish"],
                marks: [2, 0, 0, 0, 2, 0, 0, 0, 0],
            },
        },
        {
            label: "Solved",
            params: {
                rows: ["Ann", "Ben", "Cal"],
                cols: ["cat", "dog", "fish"],
                marks: [2, 1, 2, 1, 2, 2, 2, 2, 1],
            },
        },
        {
            label: "Four by four",
            params: {
                rows: ["Ivy", "Max", "Noor", "Sol"],
                cols: ["kite", "ball", "drum", "book"],
                marks: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            },
        },
    ],
    box: (p) => {
        const lw = Math.max(
            3,
            Math.ceil(
                wide(
                    p.rows.reduce((a, b) => (b.length > a.length ? b : a), ""),
                    16,
                ) / U,
            ) + 2,
        );
        const cw = Math.max(
            3,
            Math.ceil(
                wide(
                    p.cols.reduce((a, b) => (b.length > a.length ? b : a), ""),
                    16,
                ) / U,
            ) + 1,
        );
        return { w: lw + p.cols.length * cw + 1, h: Math.ceil(2.6 + p.rows.length * 2.2 + 0.6) };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const lw =
            Math.max(
                3,
                Math.ceil(
                    wide(
                        p.rows.reduce((x, y) => (y.length > x.length ? y : x), ""),
                        16,
                    ) / U,
                ) + 2,
            ) * U;
        const cw =
            Math.max(
                3,
                Math.ceil(
                    wide(
                        p.cols.reduce((x, y) => (y.length > x.length ? y : x), ""),
                        16,
                    ) / U,
                ) + 1,
            ) * U;
        const rh = 2.2 * U,
            x0 = lw,
            y0 = 2.6 * U,
            nc = p.cols.length,
            nr = p.rows.length;
        p.cols.forEach((s, k) => {
            say(c, x0 + k * cw + cw / 2, y0 - 0.6 * U, s, 16);
            a[`col(${k})`] = [x0 + k * cw + cw / 2, y0, "up"];
        });
        p.rows.forEach((s, r) => {
            say(c, x0 - 0.5 * U, y0 + r * rh + rh / 2 + 6, s, 16, "end");
            a[`row(${r})`] = [x0, y0 + r * rh + rh / 2, "left"];
        });
        for (let k = 1; k < nc; k++)
            pen.line(g, x0 + k * cw, y0, x0 + k * cw, y0 + nr * rh, "ruler", { strokeWidth: 1.4 });
        for (let r = 1; r < nr; r++)
            pen.line(g, x0, y0 + r * rh, x0 + nc * cw, y0 + r * rh, "ruler", { strokeWidth: 1.4 });
        pen.rect(g, x0, y0, nc * cw, nr * rh, "ruler", null, { strokeWidth: 2.4 });
        for (let r = 0; r < nr; r++)
            for (let k = 0; k < nc; k++) {
                const i = r * nc + k,
                    x = x0 + k * cw + cw / 2,
                    y = y0 + r * rh + rh / 2,
                    m = p.marks[i] ?? 0;
                if (m === 1)
                    pen.linear(
                        g,
                        [
                            [x - 0.45 * U, y],
                            [x - 0.1 * U, y + 0.4 * U],
                            [x + 0.55 * U, y - 0.5 * U],
                        ],
                        "pencil",
                        { stroke: c.t.ink, strokeWidth: 2.6 },
                    );
                if (m === 2) {
                    pen.line(g, x - 0.4 * U, y - 0.4 * U, x + 0.4 * U, y + 0.4 * U, "pencil", {
                        stroke: c.t.ink,
                        strokeWidth: 2.2,
                    });
                    pen.line(g, x + 0.4 * U, y - 0.4 * U, x - 0.4 * U, y + 0.4 * U, "pencil", {
                        stroke: c.t.ink,
                        strokeWidth: 2.2,
                    });
                }
                a[`cell(${i})`] = [x, y, "up"];
            }
        return a;
    },
    describe: () =>
        "A logic grid, a table with names down the side and choices along the top, with ticks and crosses in some of the cells.",
});
