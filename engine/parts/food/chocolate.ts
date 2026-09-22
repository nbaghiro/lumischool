import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { ghost, soft } from "../lettering";

/** A count arriving as 0, 2.5 or 200 still has to draw something sane. */
const whole = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, Math.round(v)));

export const chocolateBar = defineDrawing({
    id: "chocolate",
    family: "food",
    title: "Chocolate bar",
    group: "Props",
    about: "A bar in its foil, moulded into squares two page squares across, with some broken off one end. The grid is countable both ways, so the same drawing carries an array and a part of a whole.",
    params: { rows: 4, cols: 6, eaten: 5 },
    settings: {
        rows: { kind: "whole", min: 1, max: 14 },
        cols: { kind: "whole", min: 1, max: 14 },
        eaten: { kind: "whole", min: 0, max: 196 },
    },
    takes: [
        { label: "Four by six, five eaten", params: { rows: 4, cols: 6, eaten: 5 } },
        { label: "Whole", params: { rows: 3, cols: 4, eaten: 0 } },
        { label: "Half gone", params: { rows: 2, cols: 6, eaten: 6 } },
        { label: "A big bar", params: { rows: 5, cols: 8, eaten: 11 } },
    ],
    box: (p) => ({ w: whole(p.cols, 1, 14) * 2 + 3, h: whole(p.rows, 1, 14) * 2 + 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            rows = whole(p.rows, 1, 14),
            cols = whole(p.cols, 1, 14);
        const boxW = (cols * 2 + 3) * U,
            barW = cols * 2 * U,
            barH = rows * 2 * U;
        const fx = (boxW - (barW + 1.7 * U)) / 2,
            fy = 0.9 * U,
            fw = barW + 1.7 * U,
            fh = barH + 1.7 * U;
        const x0 = fx + 0.85 * U,
            y0 = fy + 0.85 * U;
        const eaten = whole(p.eaten, 0, rows * cols);
        // Squares go from the far end, a column at a time, because that is how a bar snaps: the last
        // column first and then whatever was taken out of the next one.
        const off = (r: number, k: number) => (cols - 1 - k) * rows + (rows - 1 - r) < eaten;
        const teeth = rows * 2,
            step = fh / teeth;
        let d = `M${fx} ${fy}H${fx + fw}`;
        for (let i = 0; i < teeth; i++) d += `l${i % 2 ? 9 : -9} ${step}`;
        // The foil is left as paper with its folds drawn on: a fill here would be a second hatch in
        // print, and the squares are the thing that has to be counted.
        pen.path(g, `${d}H${fx}Z`, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
        for (const fold of [fy + 0.45 * U, fy + fh - 0.45 * U]) {
            pen.line(g, fx + 8, fold, fx + fw - 8, fold, "pencil", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
        }
        const a: RawAnchors = { bar: [x0 + barW / 2, y0, "up"], foil: [fx, fy + fh / 2, "left"] };
        for (let r = 0; r < rows; r++) {
            for (let k = 0; k < cols; k++) {
                const x = x0 + k * 2 * U,
                    y = y0 + r * 2 * U;
                if (off(r, k)) {
                    // Where a square was, so the ones that have gone can be counted as well as the ones left.
                    ghost(c, roundedRect(x + 3, y + 3, 2 * U - 6, 2 * U - 6, 4), "ruler");
                    continue;
                }
                pen.rect(
                    g,
                    x,
                    y,
                    2 * U,
                    2 * U,
                    "ruler",
                    pen.fill("tang", "solid", { hachureGap: 7, fillWeight: 0.6 }),
                    { strokeWidth: 1.6 },
                );
                pen.rect(g, x + 5, y + 5, 2 * U - 10, 2 * U - 10, "ruler", null, {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
                a[`square(${r},${k})`] = [x + U, y, "up"];
            }
        }
        soft(c, boxW / 2, (rows * 2 + 3.5) * U, `${rows} × ${cols}`, 14);
        return a;
    },
    describe: (p) =>
        `A bar of chocolate in its opened foil, moulded into a grid of squares, ${whole(p.eaten, 0, whole(p.rows, 1, 14) * whole(p.cols, 1, 14)) > 0 ? "with some squares broken off one end and their outlines left where they were" : "with every square still in place"}.`,
});
