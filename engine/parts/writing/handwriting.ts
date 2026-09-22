import { letter, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** Four squares to a writing row: the top line, the dotted midline and the baseline. */
const rulesHeight = (rows: number): number => rows * 4;

export const writingRules = defineDrawing({
    id: "handwriting",
    family: "writing",
    title: "Handwriting rules",
    group: "Structures",
    about: "Ruled rows with a model letter to trace and then copy, the way a handwriting book is ruled.",
    params: { show: "f", rows: 2, trace: 3, width: 26 },
    settings: {
        show: { kind: "text", most: 12 },
        rows: { kind: "whole", min: 1, max: 6 },
        trace: { kind: "whole", min: 0, max: 6 },
        width: { kind: "whole", min: 12, max: 40 },
    },
    takes: [
        { label: "Two rows of f", params: { show: "f", rows: 2, trace: 3, width: 26 } },
        { label: "A word", params: { show: "and", rows: 2, trace: 2, width: 26 } },
        { label: "One row", params: { show: "a", rows: 1, trace: 4, width: 20 } },
    ],
    box: (p) => ({ w: p.width, h: rulesHeight(p.rows) }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        // The lines are set to the font: the baseline sits 3 squares down, the top line a capital
        // above it and the dotted line at the height of a small letter.
        const size = 3.4 * U,
            step = Math.max(3, Math.ceil(p.show.length * 1.7) + 1);
        for (let r = 0; r < p.rows; r++) {
            const top = (r * 4 + 0.5) * U,
                mid = (r * 4 + 1.3) * U,
                base = (r * 4 + 3) * U;
            pen.line(g, 0, top, p.width * U, top, "ruler", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
            pen.line(g, 0, base, p.width * U, base, "ruler", { strokeWidth: 1.6 });
            pen.line(g, 0, mid, p.width * U, mid, "ruler", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
                strokeLineDash: [4, 7],
            });
            for (let i = 0; i < p.trace; i++) {
                const x = (0.6 + i * step) * U;
                letter(c, {
                    x,
                    y: base,
                    s: p.show,
                    face: "hand",
                    weight: 500,
                    size,
                    anchor: "start",
                    ...(i === 0
                        ? { fill: c.t["ink-soft"] }
                        : {
                              fill: c.t.grid,
                              outline: { stroke: c.t["ink-soft"], width: 1, dash: "3 4" },
                          }),
                });
            }
            a[`row(${r})`] = [(0.6 + p.trace * step) * U, base, "up"];
        }
        return a;
    },
    describe: (p) =>
        `${p.rows} ruled rows the way a handwriting book is ruled, with a model to trace in grey at the start of each row and room to copy it.`,
});
