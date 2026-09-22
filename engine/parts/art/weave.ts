import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

/** The strips that run down and the ones woven across, always these two, so a pattern is read by over and under alone. */
const WARP: Marker = "tang";
const WEFT: Marker = "sky";
const PITCH = 1.5 * U;
const STRIP = 1 * U;
const LEFT = 2 * U;
const TOP = 1.5 * U;

/**
 * Whether row `r` (from 1) goes over the strip in column `j` (from 1): `step` strips over, then `step`
 * under, starting over unless the row's start is 1; a float row goes over every one, and the wrong
 * row is flipped at its one column.
 */
export function weftOver(
    p: { start: readonly number[]; step: number; wrong: number; wrongat: number; float: number },
    r: number,
    j: number,
): boolean {
    if (r === p.float) return true;
    const step = p.step > 1 ? 2 : 1,
        first = (p.start[r - 1] ?? 0) === 0,
        over = Math.floor((j - 1) / step) % 2 === 0 ? first : !first;
    return r === p.wrong && j === p.wrongat ? !over : over;
}

export const weave = defineDrawing({
    id: "weave",
    family: "art",
    title: "Weaving: over and under",
    group: "Structures",
    about: "Orange paper strips running down and blue strips woven across them in numbered rows; on paper the strips across are white and the ones down are hatched. Each row goes over `step` strips and under `step`, starting over unless its entry in `start` is 1. `wrong` names a row that breaks its pattern at one crossing, the column `wrongat`; `float` names a row that goes over every strip and so is not woven in; `blank` names a row left as an empty strip to weave or colour in. A row of 0 in any of the three means none.",
    params: {
        cols: 6,
        rows: 4,
        start: [0, 1, 0, 1],
        step: 1,
        wrong: 0,
        wrongat: 1,
        blank: 0,
        float: 0,
    },
    settings: {
        cols: { kind: "whole", min: 4, max: 8 },
        rows: { kind: "whole", min: 1, max: 6 },
        start: { kind: "numbers", min: 0, max: 1, most: 6 },
        step: { kind: "whole", min: 1, max: 2 },
        wrong: { kind: "whole", min: 0, max: 6 },
        wrongat: { kind: "whole", min: 1, max: 8 },
        blank: { kind: "whole", min: 0, max: 6 },
        float: { kind: "whole", min: 0, max: 6 },
    },
    takes: [
        {
            label: "Over one, under one",
            params: {
                cols: 6,
                rows: 4,
                start: [0, 1, 0, 1],
                step: 1,
                wrong: 0,
                wrongat: 1,
                blank: 0,
                float: 0,
            },
        },
        {
            label: "One row goes wrong",
            params: {
                cols: 8,
                rows: 5,
                start: [0, 1, 0, 1, 0],
                step: 1,
                wrong: 3,
                wrongat: 5,
                blank: 0,
                float: 0,
            },
        },
        {
            label: "Over two, under two, the last row to do",
            params: {
                cols: 8,
                rows: 4,
                start: [0, 1, 0, 1],
                step: 2,
                wrong: 0,
                wrongat: 1,
                blank: 4,
                float: 0,
            },
        },
        {
            label: "A row that floats",
            params: {
                cols: 5,
                rows: 3,
                start: [0, 1, 0],
                step: 1,
                wrong: 0,
                wrongat: 1,
                blank: 0,
                float: 2,
            },
        },
    ],
    box: (p) => ({
        w: Math.ceil(Math.max(4, Math.min(8, Math.round(p.cols))) * 1.5) + 3,
        h: Math.ceil(Math.max(1, Math.min(6, Math.round(p.rows))) * 1.5) + 3,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            cols = Math.max(4, Math.min(8, Math.round(p.cols))),
            rows = Math.max(1, Math.min(6, Math.round(p.rows))),
            bottom = TOP + rows * PITCH + 0.5 * U,
            colX = (j: number) => LEFT + (j - 1) * PITCH + (PITCH - STRIP) / 2,
            rowY = (r: number) => TOP + 0.5 * U + (r - 1) * PITCH + (PITCH - STRIP) / 2,
            warpFill = pen.fill(
                WARP,
                "hachure",
                c.paper ? { hachureGap: 7, fillWeight: 0.6 } : { hachureGap: 5 },
            ),
            weftFill = pen.fill(c.paper ? "card" : WEFT, "solid");
        const warp = (j: number, y0: number, y1: number) => {
            // paper-white underneath, so a strip drawn over a row hides the row rather than tinting it
            pen.rect(g, colX(j), y0, STRIP, y1 - y0, "ruler", pen.fill("card"), { strokeWidth: 0 });
            pen.rect(g, colX(j), y0, STRIP, y1 - y0, "ruler", warpFill, { strokeWidth: 1.4 });
        };
        for (let j = 1; j <= cols; j++) warp(j, TOP - 0.6 * U, bottom + 0.6 * U);
        const right = LEFT + cols * PITCH;
        for (let r = 1; r <= rows; r++) {
            const y = rowY(r);
            num(c, LEFT - 0.6 * U, y + STRIP / 2 + 5, r, 14, "end");
            a[`row(${r})`] = [LEFT - 0.2 * U, y + STRIP / 2, "left"];
            if (r === p.blank) {
                pen.rect(
                    g,
                    LEFT - 0.2 * U,
                    y,
                    right - LEFT + 0.4 * U,
                    STRIP,
                    "ruler",
                    pen.fill("card"),
                    {
                        strokeWidth: 1.2,
                        strokeLineDash: [5, 4],
                    },
                );
                continue;
            }
            pen.rect(g, LEFT - 0.2 * U, y, right - LEFT + 0.4 * U, STRIP, "ruler", weftFill, {
                strokeWidth: 1.4,
            });
            // where the row goes under, the strip running down is drawn again on top of it
            for (let j = 1; j <= cols; j++)
                if (!weftOver(p, r, j)) warp(j, y - 0.12 * U, y + STRIP + 0.12 * U);
        }
        for (let j = 1; j <= cols; j++)
            a[`strip(${j})`] = [colX(j) + STRIP / 2, TOP - 0.6 * U, "up"];
        return a;
    },
    describe: () =>
        "Orange paper strips running down with blue strips woven across them in numbered rows, each row going over and under the strips it crosses.",
});
