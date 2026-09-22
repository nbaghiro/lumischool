import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { sayOn, soft } from "../lettering";
import { BAR, ROW_FILL } from "./bar";

const NAMES: Record<number, string> = {
    1: "one",
    2: "halves",
    3: "thirds",
    4: "quarters",
    5: "fifths",
    6: "sixths",
    8: "eighths",
    10: "tenths",
    12: "twelfths",
};

export const fractionWall = defineDrawing({
    id: "fractionwall",
    family: "fractions",
    title: "Fraction wall",
    group: "Structures",
    about: "Every row is the same whole cut a different number of ways, so two thirds and four sixths line up with nothing to work out. The bar is twelve squares, which halves, thirds, quarters and sixths all divide exactly.",
    params: { rows: [1, 2, 3, 4, 6, 8], shade: [0, 0] as [number, number] },
    settings: { rows: { kind: "numbers", min: 1, max: 12, most: 8 }, shade: { kind: "fixed" } },
    takes: [
        { label: "Six rows", params: { rows: [1, 2, 3, 4, 6, 8], shade: [0, 0] } },
        { label: "Three quarters shaded", params: { rows: [1, 2, 4, 8], shade: [4, 3] } },
        { label: "Down to twelfths", params: { rows: [1, 2, 3, 4, 6, 12], shade: [6, 4] } },
        { label: "Halves and thirds only", params: { rows: [1, 2, 3], shade: [3, 2] } },
    ],
    box: (p) => ({ w: BAR + 6, h: p.rows.length * 2 + 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = 5 * U,
            w = BAR * U,
            a: RawAnchors = {};
        p.rows.forEach((n, r) => {
            const y = U + r * 2 * U,
                cw = w / n;
            soft(c, x0 - 10, y + 1.3 * U, NAMES[n] ?? `${n}ths`, 14, "end");
            for (let k = 0; k < n; k++) {
                const on = p.shade[0] === n && k < p.shade[1];
                pen.rect(
                    g,
                    x0 + k * cw,
                    y,
                    cw,
                    2 * U,
                    "ruler",
                    on ? pen.fill(ROW_FILL[r % ROW_FILL.length], "solid", { hachureGap: 6 }) : null,
                    { strokeWidth: 1.4 },
                );
                // A twelfth is a narrow cell, so the name only goes in where it fits.
                if (cw > 1.3 * U)
                    sayOn(
                        c,
                        x0 + k * cw + cw / 2,
                        y + 1.35 * U,
                        n === 1 ? "1" : `1/${n}`,
                        cw > 2 * U ? 15 : 12,
                    );
                a[`cell(${n},${k})`] = [x0 + k * cw + cw / 2, y, "up"];
            }
            a[`row(${n})`] = [x0, y + U, "left"];
        });
        pen.rect(g, x0, U, w, p.rows.length * 2 * U, "ruler", null, { strokeWidth: 2.4 });
        return a;
    },
    describe: () =>
        "A fraction wall: rows of the same length each cut into a different number of equal cells, named at the left, some cells shaded.",
});
