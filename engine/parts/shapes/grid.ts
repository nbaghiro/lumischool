import { type RawAnchors } from "../../ink/surface";
import { MARKERS, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

interface GridParams {
    rows: number;
    cols: number;
    shade: number;
    color: Marker;
    cell: number;
}

export const gridSquares = defineDrawing<GridParams>({
    id: "grid",
    family: "shapes",
    title: "Grid of squares",
    group: "Structures",
    about: "Rows and columns on the paper grid, the first `shade` squares shaded: arrays, area, fractions.",
    params: { rows: 2, cols: 4, shade: 3, color: "mint", cell: 2 },
    settings: {
        rows: { kind: "whole", min: 1, max: 10 },
        cols: { kind: "whole", min: 1, max: 12 },
        shade: { kind: "whole", min: 0, max: 120 },
        color: { kind: "one of", of: MARKERS },
        cell: { kind: "one of", of: [1, 2] },
    },
    takes: [
        {
            label: "2 by 4, three shaded",
            params: { rows: 2, cols: 4, shade: 3, color: "mint", cell: 2 },
        },
        {
            label: "3 by 3, four shaded",
            params: { rows: 3, cols: 3, shade: 4, color: "sky", cell: 2 },
        },
        {
            label: "2 by 5, all shaded",
            params: { rows: 2, cols: 5, shade: 10, color: "tang", cell: 2 },
        },
        {
            label: "4 by 6, small cells",
            params: { rows: 4, cols: 6, shade: 8, color: "berry", cell: 1 },
        },
    ],
    box: (p) => ({ w: p.cols * p.cell + 2, h: p.rows * p.cell + 2 }),
    draw: (c, p) => {
        const s = p.cell * U,
            a: RawAnchors = {};
        for (let r = 0; r < p.rows; r++)
            for (let k = 0; k < p.cols; k++) {
                const i = r * p.cols + k,
                    x = U + k * s,
                    y = U + r * s;
                c.pen.rect(c.g, x, y, s, s, "ruler", i < p.shade ? c.pen.fill(p.color) : null, {
                    strokeWidth: 1.3,
                });
                a[`cell(${i})`] = [x + s / 2, y, "up"];
            }
        c.pen.rect(c.g, U, U, p.cols * s, p.rows * s, "ruler", null, { strokeWidth: 2.4 });
        return a;
    },
    describe: () =>
        "A grid of squares ruled in ink on the paper grid, the first squares shaded in one colour and the rest left white.",
});
