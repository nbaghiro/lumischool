import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

export const reflectGrid = defineDrawing({
    id: "reflect",
    family: "shapes",
    title: "Reflect in the mirror line",
    group: "Structures",
    about: "Half a figure on squares with the mirror line drawn in, and the other half either missing or completed in pen. Counting squares across the line is the method, so the cells stay two squares wide.",
    params: {
        cols: 8,
        rows: 6,
        line: "vertical",
        show: false,
        shape: [
            [1, 1],
            [3, 1],
            [3, 3],
            [2, 3],
            [2, 4],
            [1, 4],
        ] as [number, number][],
    },
    settings: {
        cols: { kind: "whole", min: 2, max: 12 },
        rows: { kind: "whole", min: 2, max: 12 },
        line: { kind: "one of", of: ["vertical", "horizontal"] },
        show: { kind: "flag" },
        shape: { kind: "fixed" },
    },
    takes: [
        {
            label: "Half a figure",
            params: {
                cols: 8,
                rows: 6,
                line: "vertical",
                show: false,
                shape: [
                    [1, 1],
                    [3, 1],
                    [3, 3],
                    [2, 3],
                    [2, 4],
                    [1, 4],
                ],
            },
        },
        {
            label: "Completed in pen",
            params: {
                cols: 8,
                rows: 6,
                line: "vertical",
                show: true,
                shape: [
                    [1, 1],
                    [3, 1],
                    [3, 3],
                    [2, 3],
                    [2, 4],
                    [1, 4],
                ],
            },
        },
        {
            label: "A horizontal mirror",
            params: {
                cols: 6,
                rows: 6,
                line: "horizontal",
                show: true,
                shape: [
                    [1, 0],
                    [4, 0],
                    [4, 2],
                    [2, 2],
                    [2, 3],
                    [1, 3],
                ],
            },
        },
    ],
    box: (p) => ({ w: p.cols * 2 + 2, h: p.rows * 2 + 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = 2 * U,
            o = U;
        const at = ([x, y]: [number, number]): Pt => [o + x * s, o + y * s];
        for (let r = 0; r < p.rows; r++)
            for (let k = 0; k < p.cols; k++) {
                pen.rect(g, o + k * s, o + r * s, s, s, "ruler", null, {
                    strokeWidth: 1.1,
                    stroke: c.t.grid,
                });
            }
        pen.polygon(g, p.shape.map(at), "ruler", pen.fill("sky"), { strokeWidth: 2 });
        const vertical = p.line === "vertical";
        const m = vertical ? p.cols / 2 : p.rows / 2;
        const A: Pt = vertical ? [o + m * s, o - 10] : [o - 10, o + m * s];
        const B: Pt = vertical
            ? [o + m * s, o + p.rows * s + 10]
            : [o + p.cols * s + 10, o + m * s];
        pen.line(g, A[0], A[1], B[0], B[1], "ruler", {
            strokeWidth: 2,
            strokeLineDash: [9, 6],
            stroke: c.t.pen,
        });
        const a: RawAnchors = { mirror: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, "up"] };
        if (p.show) {
            const flip = ([x, y]: [number, number]): [number, number] =>
                vertical ? [2 * m - x, y] : [x, 2 * m - y];
            pen.polygon(
                g,
                p.shape.map((q) => at(flip(q))),
                "ruler",
                pen.fill("sky", "hachure", { hachureGap: 6 }),
                { strokeWidth: 2, stroke: c.t.pen },
            );
            const [ix, iy] = at(flip(p.shape[0] ?? [0, 0]));
            a.image = [ix, iy, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A grid of squares with a blue shape drawn on one side of a dashed mirror line${p.show ? " and its reflection drawn hatched on the other side" : " and the other side left empty"}.`,
});
