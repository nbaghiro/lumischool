import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { loop } from "../marks";

export const gattegno = defineDrawing({
    id: "gattegno",
    family: "place",
    title: "Gattegno chart",
    group: "Structures",
    about: "Every number from one row of each: 200 from the hundreds, 40 from the tens, 7 from the ones. Picking down a column is the same as reading a number off a place value chart.",
    params: { rows: 3, pick: [] as number[] },
    settings: { rows: { kind: "whole", min: 1, max: 4 }, pick: { kind: "fixed" } },
    takes: [
        { label: "Three rows, 247 picked", params: { rows: 3, pick: [200, 40, 7] } },
        { label: "Thousands too", params: { rows: 4, pick: [3000, 500, 20] } },
        { label: "Blank", params: { rows: 3, pick: [] } },
        { label: "Tens and ones", params: { rows: 2, pick: [60, 3] } },
    ],
    box: (p) => ({ w: 28, h: p.rows * 2 + 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cw = 3 * U,
            rh = 2 * U,
            x0 = U / 2,
            y0 = U,
            a: RawAnchors = {};
        for (let r = 0; r < p.rows; r++) {
            const unit = 10 ** (p.rows - 1 - r);
            for (let k = 1; k <= 9; k++) {
                const v = k * unit,
                    x = x0 + (k - 1) * cw,
                    y = y0 + r * rh;
                pen.rect(g, x, y, cw, rh, "ruler", null, { strokeWidth: 1.1 });
                num(c, x + cw / 2, y + rh / 2 + 6, v, v >= 1000 ? 15 : 17);
                if (p.pick.includes(v)) loop(c, x + cw / 2, y + rh / 2, cw - 6, rh - 6);
                a[`cell(${v})`] = [x + cw / 2, y, "up"];
            }
            a[`row(${unit})`] = [x0, y0 + r * rh + rh / 2, "left"];
        }
        pen.rect(g, x0, y0, 9 * cw, p.rows * rh, "ruler", null, { strokeWidth: 2.4 });
        return a;
    },
    describe: (p) =>
        `A Gattegno chart, a grid of nine columns with a number in every cell, each row ten times the one below${p.pick.length > 0 ? ", some cells ringed in pencil" : ""}.`,
});
