import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, say, sayOn } from "../lettering";

/** The head column is four squares, an outcome's column three and a row two. */
const HEAD = 4 * U;
const COL = 3 * U;
const ROW = 2 * U;

/** What a cell writes for its row and its column: nothing, the pair, or the two added or multiplied when both are numbers. */
function cellOf(fill: number, r: string, k: string): string {
    if (fill === 0) return "";
    const x = Number(r),
        y = Number(k);
    const numbers = r !== "" && k !== "" && Number.isFinite(x) && Number.isFinite(y);
    if (fill === 2 && numbers) return String(x + y);
    if (fill === 3 && numbers) return String(x * y);
    return `${r}${k}`;
}

export const outcomesGrid = defineDrawing({
    id: "outcomes",
    family: "data",
    title: "Outcomes grid",
    group: "Structures",
    about: "Every way two things can come out together: the first event's outcomes down the side, the second's along the top and one cell for each pair. The cells can be left empty, hold the pair, or hold the two added or multiplied, and the cells an event asks about can be shaded.",
    params: {
        rows: ["1", "2", "3", "4", "5", "6"],
        cols: ["H", "T"],
        first: "Dice",
        second: "Coin",
        fill: 1,
        mark: [] as number[],
        hide: [] as number[],
    },
    settings: {
        rows: { kind: "words", most: 6 },
        cols: { kind: "words", most: 6 },
        first: { kind: "text", most: 8 },
        second: { kind: "text", most: 12 },
        fill: { kind: "one of", of: [0, 1, 2, 3] },
        mark: { kind: "numbers", min: 0, max: 35, most: 36 },
        hide: { kind: "numbers", min: 0, max: 35, most: 36 },
    },
    takes: [
        {
            label: "A dice and a coin",
            params: {
                rows: ["1", "2", "3", "4", "5", "6"],
                cols: ["H", "T"],
                first: "Dice",
                second: "Coin",
                fill: 1,
                mark: [],
                hide: [],
            },
        },
        {
            label: "Two spinners added",
            params: {
                rows: ["1", "2", "3", "4"],
                cols: ["1", "2", "3", "4"],
                first: "Red",
                second: "Blue",
                fill: 2,
                mark: [3, 6, 9, 12],
                hide: [15],
            },
        },
        {
            label: "Empty to fill in",
            params: {
                rows: ["R", "G", "B"],
                cols: ["R", "G", "B"],
                first: "First",
                second: "Second",
                fill: 0,
                mark: [],
                hide: [],
            },
        },
    ],
    box: (p) => ({
        w: 4 + Math.max(1, p.cols.length) * 3 + 2,
        h: (Math.max(1, p.rows.length) + 1) * 2 + 3,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = U,
            y0 = 2 * U,
            a: RawAnchors = {};
        const marked = new Set(p.mark),
            hidden = new Set(p.hide);
        cap(c, x0 + HEAD + (p.cols.length * COL) / 2, y0 - 10, p.second, 12);
        cap(c, x0 + HEAD / 2, y0 - 10, p.first, 12);
        pen.rect(g, x0, y0, HEAD, ROW, "ruler", null, { strokeWidth: 1.4 });
        pen.line(g, x0, y0, x0 + HEAD, y0 + ROW, "ruler", { strokeWidth: 1.1 });
        p.cols.forEach((k, j) => {
            const x = x0 + HEAD + j * COL;
            pen.rect(g, x, y0, COL, ROW, "ruler", pen.fill("glow"), { strokeWidth: 1.6 });
            sayOn(c, x + COL / 2, y0 + ROW / 2 + 6, k, 16);
            a[`col(${j})`] = [x + COL / 2, y0, "up"];
        });
        p.rows.forEach((r, i) => {
            const y = y0 + (i + 1) * ROW;
            pen.rect(g, x0, y, HEAD, ROW, "ruler", pen.fill("glow"), { strokeWidth: 1.6 });
            sayOn(c, x0 + HEAD / 2, y + ROW / 2 + 6, r, 16);
            a[`row(${i})`] = [x0, y + ROW / 2, "left"];
            p.cols.forEach((k, j) => {
                const x = x0 + HEAD + j * COL,
                    n = i * p.cols.length + j;
                pen.rect(
                    g,
                    x,
                    y,
                    COL,
                    ROW,
                    "ruler",
                    marked.has(n) ? pen.fill("mint", "hachure", { hachureGap: 6 }) : null,
                    { strokeWidth: 1.2 },
                );
                if (hidden.has(n)) num(c, x + COL / 2, y + ROW / 2 + 6, "?", 17, "middle", c.t.pen);
                else {
                    const s = cellOf(p.fill, r, k);
                    if (s && marked.has(n)) sayOn(c, x + COL / 2, y + ROW / 2 + 6, s, 15);
                    else if (s) say(c, x + COL / 2, y + ROW / 2 + 6, s, 15);
                }
                a[`cell(${n})`] = [x + COL / 2, y, "up"];
            });
        });
        pen.rect(g, x0, y0, HEAD + p.cols.length * COL, (p.rows.length + 1) * ROW, "ruler", null, {
            strokeWidth: 2.2,
        });
        return a;
    },
    describe: (p) =>
        `A grid of every pair of outcomes, the first event's outcomes down the left and the second's along the top${p.fill === 0 ? ", the cells left empty" : ", each cell filled in"}${p.mark.length ? " and some shaded" : ""}.`,
    motion: { still: "Its cells are counted to find a chance, so the grid holds still." },
});
