import { starPoints } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const starRow = defineDrawing({
    id: "starrow",
    family: "page",
    title: "Stickers on a chart",
    group: "Props",
    about: "A row of sticker slots with some of them filled, which is the counting-on picture a reward chart already is. What is missing to the end of the row is the question.",
    params: { slots: 10, filled: 6 },
    settings: {
        slots: { kind: "whole", min: 1, max: 12 },
        filled: { kind: "whole", min: 0, max: 12 },
    },
    takes: [
        { label: "Six of ten", params: { slots: 10, filled: 6 } },
        { label: "Nearly there", params: { slots: 8, filled: 7 } },
        { label: "None yet", params: { slots: 10, filled: 0 } },
    ],
    box: (p) => ({ w: p.slots * 2 + 2, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 2.4 * U,
            a: RawAnchors = {};
        for (let i = 0; i < p.slots; i++) {
            const x = (i * 2 + 2) * U;
            pen.circle(g, x, y, 1.7 * U, "ruler", null, {
                strokeWidth: 1.2,
                strokeLineDash: [5, 4],
                stroke: c.t["ink-soft"],
            });
            if (i < p.filled)
                pen.polygon(g, starPoints(x, y, 0.85 * U), "doodle", pen.fill("glow"), {
                    strokeWidth: 1.6,
                });
            a[`slot(${i})`] = [x, y - 0.9 * U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A row of round sticker slots drawn with dashed lines, ${p.filled <= 0 ? "all of them still empty" : p.filled >= p.slots ? "all of them filled with yellow stars" : "the first of them filled with yellow stars and the rest empty"}.`,
});
