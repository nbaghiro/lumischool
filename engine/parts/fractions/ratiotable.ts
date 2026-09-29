import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, sayOn, soft } from "../lettering";

/** A value as a cell writes it, without the float's noise. */
const shown = (v: number): string => String(Number(v.toFixed(3)));

/** The label column is five squares, a value's column three and a row two. */
const HEAD = 5 * U;
const COL = 3 * U;
const ROW = 2 * U;

export const ratioTable = defineDrawing({
    id: "ratiotable",
    family: "fractions",
    title: "Ratio table",
    group: "Structures",
    about: "Two or three rows of equivalent ratios, a name at the head of each row and one column for each pair. Any cell can be left as a question, counted along the top row and then the next, and an arrow over each step can say how many times the one before it the top row grew.",
    params: {
        first: [2, 4, 6, 10],
        second: [3, 6, 9, 15],
        third: [] as number[],
        labels: ["Flour", "Sugar"],
        hide: [] as number[],
        arrows: 0,
    },
    settings: {
        first: { kind: "numbers", min: 0, max: 100000, most: 5 },
        second: { kind: "numbers", min: 0, max: 100000, most: 5 },
        third: { kind: "numbers", min: 0, max: 100000, most: 5 },
        labels: { kind: "words", most: 3 },
        hide: { kind: "numbers", min: 0, max: 14, most: 6 },
        arrows: { kind: "one of", of: [0, 1] },
    },
    takes: [
        {
            label: "Two rows",
            params: {
                first: [2, 4, 6, 10],
                second: [3, 6, 9, 15],
                third: [],
                labels: ["Flour", "Sugar"],
                hide: [],
                arrows: 0,
            },
        },
        {
            label: "A cell to find",
            params: {
                first: [1, 3, 6],
                second: [4, 12, 24],
                third: [],
                labels: ["Cups", "People"],
                hide: [5],
                arrows: 1,
            },
        },
        {
            label: "Three rows",
            params: {
                first: [2, 4, 8, 10, 20],
                second: [1, 2, 4, 5, 10],
                third: [3, 6, 12, 15, 30],
                labels: ["Red", "Blue", "Total"],
                hide: [8, 14],
                arrows: 0,
            },
        },
    ],
    box: (p) => {
        const cols = Math.max(1, p.first.length, p.second.length, p.third.length);
        const rows = p.third.length ? 3 : 2;
        return { w: 5 + cols * 3 + 2, h: rows * 2 + 2 + (p.arrows === 1 ? 2 : 0) };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            lists = p.third.length ? [p.first, p.second, p.third] : [p.first, p.second],
            cols = Math.max(1, ...lists.map((r) => r.length)),
            x0 = U,
            y0 = U + (p.arrows === 1 ? 2 * U : 0),
            a: RawAnchors = {};
        const hidden = new Set(p.hide);
        lists.forEach((row, r) => {
            const y = y0 + r * ROW;
            pen.rect(g, x0, y, HEAD, ROW, "ruler", pen.fill("glow"), { strokeWidth: 1.6 });
            sayOn(c, x0 + HEAD / 2, y + ROW / 2 + 6, p.labels[r] ?? "", 15);
            a[`row(${r})`] = [x0, y + ROW / 2, "left"];
            for (let k = 0; k < cols; k++) {
                const x = x0 + HEAD + k * COL,
                    i = r * cols + k,
                    v = row[k];
                pen.rect(g, x, y, COL, ROW, "ruler", null, { strokeWidth: 1.4 });
                if (hidden.has(i)) num(c, x + COL / 2, y + ROW / 2 + 6, "?", 17, "middle", c.t.pen);
                else if (v !== undefined) num(c, x + COL / 2, y + ROW / 2 + 6, shown(v), 16);
                a[`cell(${i})`] = [x + COL / 2, y, "up"];
            }
        });
        pen.rect(g, x0, y0, HEAD + cols * COL, lists.length * ROW, "ruler", null, {
            strokeWidth: 2.2,
        });
        for (let k = 0; k < cols; k++) {
            const x = x0 + HEAD + k * COL + COL / 2;
            a[`col(${k})`] = [x, y0, "up"];
            const was = p.first[k - 1] ?? 0,
                now = p.first[k] ?? 0;
            if (p.arrows !== 1 || k === 0 || !was || !now) continue;
            pen.arrow(g, [x - COL + 8, y0 - 4], [x - 8, y0 - 4], c.t.pen, 0.3);
            soft(c, x - COL / 2, y0 - 22, `×${shown(now / was)}`, 13);
            a[`arrow(${k})`] = [x - COL / 2, y0 - 16, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A ratio table of ${p.third.length ? "three" : "two"} ruled rows, a name at the left of each row and a number in each cell, some cells marked with a question mark.`,
    motion: { still: "Its cells are read against each other, so the table holds still." },
});
