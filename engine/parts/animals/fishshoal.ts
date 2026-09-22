import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { clamp, eye } from "./nature";

export const fishShoal = defineDrawing({
    id: "fishshoal",
    family: "animals",
    title: "Shoal of fish",
    group: "Props",
    about: "A shoal of little striped fish all swimming the same way in rows, the way a shoal keeps together. Rows by columns is an array: three rows of five is fifteen fish, however you count them.",
    params: { rows: 3, cols: 5, facing: 1 },
    settings: {
        rows: { kind: "whole", min: 1, max: 5 },
        cols: { kind: "whole", min: 1, max: 8 },
        facing: { kind: "one of", of: [1, -1] },
    },
    takes: [
        { label: "Three rows of five", params: { rows: 3, cols: 5, facing: 1 } },
        { label: "Two rows of four, going left", params: { rows: 2, cols: 4, facing: -1 } },
        { label: "Four rows of six", params: { rows: 4, cols: 6, facing: 1 } },
    ],
    box: (p) => ({ w: clamp(p.cols, 1, 8) * 2 + 1, h: Math.ceil(clamp(p.rows, 1, 5) * 1.5) + 1 }),
    draw: (c, p) => {
        const { pen, g } = c,
            r = clamp(p.rows, 1, 5),
            n = clamp(p.cols, 1, 8),
            s = p.facing < 0 ? -1 : 1,
            a: RawAnchors = {};
        for (let i = 0; i < r; i++)
            for (let j = 0; j < n; j++) {
                const cx = (1.6 + j * 2) * U,
                    cy = (1.2 + i * 1.5) * U,
                    X = (dx: number) => cx + s * dx;
                pen.polygon(
                    g,
                    [
                        [X(-0.55 * U), cy],
                        [X(-1.12 * U), cy - 0.42 * U],
                        [X(-0.98 * U), cy],
                        [X(-1.12 * U), cy + 0.42 * U],
                    ],
                    "ruler",
                    pen.fill("sky"),
                    { strokeWidth: 1.1 },
                );
                pen.ellipse(g, cx, cy, 1.4 * U, 0.74 * U, "ruler", pen.fill("glow"), {
                    strokeWidth: 1.3,
                });
                pen.curve(
                    g,
                    [
                        [X(-0.1 * U), cy - 0.3 * U],
                        [X(-0.02 * U), cy],
                        [X(-0.1 * U), cy + 0.3 * U],
                    ],
                    "ruler",
                    { strokeWidth: 3.2, stroke: c.t.sky },
                );
                pen.polygon(
                    g,
                    [
                        [X(-0.05 * U), cy - 0.34 * U],
                        [X(-0.4 * U), cy - 0.55 * U],
                        [X(-0.3 * U), cy - 0.3 * U],
                    ],
                    "ruler",
                    pen.fill("sky"),
                    { strokeWidth: 0.9 },
                );
                eye(c, X(0.38 * U), cy - 0.06 * U, 3.4);
                a[`fish(${i * n + j})`] = [cx, cy - 0.4 * U, "up"];
            }
        return a;
    },
    describe: () =>
        "A shoal of little yellow fish with blue stripes all swimming the same way, set out in even rows and columns.",
});
