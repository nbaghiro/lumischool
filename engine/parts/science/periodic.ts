import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, soft, wide } from "../lettering";
import { lightFill } from "./apparatus";
import { ELEMENTS, lastOf, rowOf } from "./substances";

const CELL = 2.5;
const SHADES = ["none", "metal", "gas"] as const;

export const periodic = defineDrawing({
    id: "periodic",
    family: "science",
    title: "The first rows of the periodic table",
    group: "Structures",
    about: "The elements in order of atomic number, in the short table of eight columns: hydrogen and helium on the first row, lithium to neon on the second, sodium to argon on the third, and potassium and calcium starting the fourth. Each cell has its number and its symbol, drawn from the table of elements a checker marks by. One cell can be left blank with a question mark, one can be ringed, and the metals or the gases at 20 °C can be shaded with a key.",
    params: { rows: 3, blank: 0, mark: 0, shade: "none" },
    settings: {
        rows: { kind: "whole", min: 1, max: 4 },
        blank: { kind: "whole", min: 0, max: 20 },
        mark: { kind: "whole", min: 0, max: 20 },
        shade: { kind: "one of", of: SHADES },
    },
    takes: [
        { label: "Three rows", params: { rows: 3, blank: 0, mark: 0, shade: "none" } },
        { label: "The metals shaded", params: { rows: 4, blank: 0, mark: 0, shade: "metal" } },
        {
            label: "Oxygen ringed, one blank",
            params: { rows: 3, blank: 12, mark: 8, shade: "none" },
        },
        { label: "The gases shaded", params: { rows: 3, blank: 0, mark: 0, shade: "gas" } },
    ],
    box: (p) => ({
        w: 8 * CELL + 1,
        h: Math.ceil(Math.max(1, Math.min(4, p.rows)) * CELL + 1 + (p.shade !== "none" ? 2 : 0)),
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            rows = Math.max(1, Math.min(4, Math.round(p.rows))),
            last = lastOf(rows),
            s = CELL * U;
        for (const e of ELEMENTS) {
            if (e.n > last) continue;
            const x = U / 2 + e.col * s,
                y = U / 2 + (rowOf(e.n) - 1) * s,
                blank = e.n === p.blank,
                shaded =
                    !blank &&
                    p.shade !== "none" &&
                    (p.shade === "metal" ? e.kind === "metal" : e.state === "gas");
            pen.rect(g, x, y, s, s, "ruler", shaded ? lightFill(c, "tang") : null, {
                strokeWidth: 1.4,
            });
            if (blank) {
                num(c, x + s / 2, y + s / 2 + 7, "?", 20, "middle", c.t["ink-soft"]);
            } else {
                // each patch sized to its glyphs and inside the cell, so no patch breaks a border
                const numW = wide(String(e.n), 11) + 6;
                patch(c, x + 6 + numW / 2 - 3, y + 9.5, numW, 13);
                patch(c, x + s / 2, y + s / 2 + 5, wide(e.symbol, 18) + 8, 21);
                soft(c, x + 6, y + 14, String(e.n), 11, "start");
                num(c, x + s / 2, y + s / 2 + 11, e.symbol, 18);
            }
            if (e.n === p.mark)
                pen.rect(g, x - 3, y - 3, s + 6, s + 6, "pencil", null, {
                    strokeWidth: 2.6,
                    stroke: c.t.pen,
                });
            a[`cell(${e.n})`] = [x + s / 2, y, "up"];
        }
        if (p.shade !== "none") {
            const y = U / 2 + rows * s + 0.5 * U;
            pen.rect(g, U / 2, y, 1.2 * U, 1.2 * U, "ruler", lightFill(c, "tang"), {
                strokeWidth: 1.2,
            });
            soft(
                c,
                2.2 * U,
                y + 0.85 * U,
                p.shade === "metal" ? "shaded: a metal" : "shaded: a gas at 20 °C",
                12,
                "start",
            );
        }
        a.table = [U / 2 + 4 * s, U / 2, "up"];
        return a;
    },
    describe: (p) =>
        `A grid of ${lastOf(p.rows)} numbered cells in the short periodic table, each with its symbol${p.blank > 0 ? ", one cell left blank with a question mark" : ""}${p.mark > 0 ? ", one cell ringed" : ""}${p.shade !== "none" ? `, the ${p.shade === "metal" ? "metals" : "gases"} hatched, with a key` : ""}.`,
    motion: {
        still: "A chart a question reads a number or a symbol off holds still, so every cell can be read.",
    },
    reads: true,
});
