import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const rekenrek = defineDrawing({
    id: "rekenrek",
    family: "counting",
    title: "Rekenrek",
    group: "Structures",
    about: "Two rows of ten beads, five of one colour and five of another, pushed to the left as they are counted. The break at five is what makes seven readable as five and two without counting on.",
    params: { top: 7, bottom: 3 },
    settings: {
        top: { kind: "whole", min: 0, max: 10 },
        bottom: { kind: "whole", min: 0, max: 10 },
    },
    takes: [
        { label: "Seven and three", params: { top: 7, bottom: 3 } },
        { label: "Both rows full", params: { top: 10, bottom: 10 } },
        { label: "Five and five", params: { top: 5, bottom: 5 } },
        { label: "Nothing pushed", params: { top: 0, bottom: 0 } },
    ],
    box: () => ({ w: 15, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = U,
            w = 13 * U,
            a: RawAnchors = {};
        pen.rect(
            g,
            U / 2,
            U,
            14 * U,
            5.6 * U,
            "ruler",
            pen.fill("tang", "solid", { hachureGap: 11, fillWeight: 0.5 }),
            { strokeWidth: 2.4 },
        );
        ([p.top, p.bottom] as const).forEach((count, row) => {
            const y = (2.4 + row * 2.4) * U;
            pen.line(g, x0, y, x0 + w, y, "ruler", { strokeWidth: 1.4, stroke: c.t.ink });
            for (let i = 0; i < 10; i++) {
                // Pushed beads bunch at the left, the rest wait at the right: that gap is the whole tool.
                const pushed = i < count;
                const x = pushed
                    ? x0 + 0.7 * U + i * 1.02 * U
                    : x0 + w - 0.7 * U - (9 - i) * 1.02 * U;
                pen.circle(g, x, y, 0.92 * U, "ruler", pen.fill(i < 5 ? "berry" : "card"), {
                    strokeWidth: 1.5,
                });
                a[`bead(${row},${i})`] = [x, y - 0.6 * U, "up"];
            }
            a[`row(${row})`] = [x0, y, "left"];
        });
        return a;
    },
    describe: () =>
        "A rekenrek, an orange frame with two rows of ten beads, five pink and five white on each row, some pushed to the left.",
});
