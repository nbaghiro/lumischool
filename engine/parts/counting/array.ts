import { type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

interface DotArrayParams {
    rows: number;
    cols: number;
    color: Marker;
}

export const dotArray = defineDrawing<DotArrayParams>({
    id: "array",
    family: "counting",
    title: "Dot array",
    group: "Structures",
    about: "Rows of equal groups, one square apart: 3 rows of 4 is 3 × 4.",
    params: { rows: 3, cols: 4, color: "sky" },
    settings: {
        rows: { kind: "whole", min: 1, max: 10 },
        cols: { kind: "whole", min: 1, max: 12 },
        color: { kind: "one of", of: MARKERS },
    },
    takes: [
        { label: "3 rows of 4", params: { rows: 3, cols: 4, color: "sky" } },
        { label: "2 rows of 6", params: { rows: 2, cols: 6, color: "mint" } },
        { label: "5 rows of 5", params: { rows: 5, cols: 5, color: "berry" } },
        { label: "1 row of 8", params: { rows: 1, cols: 8, color: "tang" } },
    ],
    box: (p) => ({ w: p.cols + 1, h: p.rows + 1 }),
    draw: (c, p) => {
        const a: RawAnchors = {};
        for (let r = 0; r < p.rows; r++) {
            for (let k = 0; k < p.cols; k++)
                c.pen.circle(c.g, 20 + k * 20, 20 + r * 20, 14, "pencil", c.pen.fill(p.color));
            a[`row(${r})`] = [10, 20 + r * 20, "left"];
        }
        return a;
    },
    describe: (p) =>
        `Rows of ${MARKER_WORD[p.color]} dots set out one square apart in a rectangle, every row with the same number of dots.`,
});
