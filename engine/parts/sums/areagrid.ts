import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { slot } from "./blank";

export const areaGrid = defineDrawing({
    id: "areagrid",
    family: "sums",
    title: "Grid method",
    group: "Structures",
    about: "Long multiplication as partial products: each part of one number times each part of the other.",
    params: { cols: [40, 7], rows: [30, 2], cells: ["", "", "", ""], total: "" },
    settings: {
        cols: { kind: "numbers", min: 1, max: 99, most: 3 },
        rows: { kind: "numbers", min: 1, max: 99, most: 3 },
        cells: { kind: "words", most: 9 },
        total: { kind: "text", most: 6 },
    },
    takes: [
        {
            label: "Two digits by two",
            params: { cols: [40, 7], rows: [30, 2], cells: ["", "", "", ""], total: "" },
        },
        {
            label: "Filled in",
            params: {
                cols: [20, 4],
                rows: [10, 7],
                cells: ["200", "40", "140", "28"],
                total: "408",
            },
        },
    ],
    box: (p) => ({ w: 4 + p.cols.length * 5 + 7, h: 2 + p.rows.length * 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            hw = 4 * U,
            cw = 5 * U,
            hh = 2 * U,
            rh = 3 * U,
            a: RawAnchors = {};
        pen.rect(g, 0, 0, hw, hh, "ruler", pen.fill("glow"), { strokeWidth: 1.6 });
        say(c, hw / 2, hh / 2 + 6, "×", 20);
        p.cols.forEach((v, i) => {
            pen.rect(g, hw + i * cw, 0, cw, hh, "ruler", pen.fill("glow"), { strokeWidth: 1.6 });
            say(c, hw + i * cw + cw / 2, hh / 2 + 6, String(v), 18);
        });
        p.rows.forEach((v, r) => {
            pen.rect(g, 0, hh + r * rh, hw, rh, "ruler", pen.fill("glow"), { strokeWidth: 1.6 });
            say(c, hw / 2, hh + r * rh + rh / 2 + 6, String(v), 18);
            p.cols.forEach((_, i) => {
                const k = r * p.cols.length + i,
                    x = hw + i * cw,
                    y = hh + r * rh;
                slot(c, x, y, cw, rh, p.cells[k] || undefined);
                a[`cell(${k})`] = [x + cw / 2, y, "up"];
            });
        });
        const tx = hw + p.cols.length * cw + U;
        say(c, tx, hh + rh / 2 + 6, "=", 20, "start");
        slot(c, tx + U, hh + rh / 2 - U, 4.4 * U, 2 * U, p.total || undefined);
        a.total = [tx + U + 2.2 * U, hh + rh / 2 - U, "up"];
        return a;
    },
    describe: () =>
        "An area grid for multiplying, a rectangle split into parts with the numbers along its top and side and a box in each part to fill in.",
});
