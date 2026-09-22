import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num } from "../lettering";

export const dotPlot = defineDrawing({
    id: "dotplot",
    family: "data",
    title: "Dot plot",
    group: "Structures",
    about: "One dot per thing, stacked over the value it had, so the shape of the data is the shape of the drawing. Two squares to a value across and one square to a dot up, so both directions can be counted.",
    params: { from: 0, to: 6, counts: [1, 3, 5, 2, 4, 1, 0], label: "goals" },
    settings: {
        from: { kind: "whole", min: 0, max: 20 },
        to: { kind: "whole", min: 1, max: 30 },
        counts: { kind: "numbers", min: 0, max: 12, most: 12 },
        label: { kind: "text", most: 10 },
    },
    takes: [
        {
            label: "Goals in a match",
            params: { from: 0, to: 6, counts: [1, 3, 5, 2, 4, 1, 0], label: "goals" },
        },
        {
            label: "One tall pile",
            params: { from: 1, to: 5, counts: [0, 2, 8, 1, 0], label: "children" },
        },
        {
            label: "Spread out",
            params: { from: 10, to: 15, counts: [2, 2, 3, 2, 1, 2], label: "minutes" },
        },
    ],
    box: (p) => ({ w: (p.to - p.from + 1) * 2 + 4, h: Math.max(...p.counts, 1) + 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = 2 * U,
            x0 = 2 * U,
            a: RawAnchors = {};
        const base = (Math.max(...p.counts, 1) + 2) * U;
        const n = p.to - p.from + 1;
        pen.line(g, x0 - 12, base, x0 + n * s, base, "ruler", { strokeWidth: 2.2 });
        for (let i = 0; i < n; i++) {
            const x = x0 + i * s + s / 2;
            pen.line(g, x, base, x, base + 8, "ruler", { strokeWidth: 1.4 });
            num(c, x, base + 28, p.from + i, 15);
            for (let k = 0; k < (p.counts[i] ?? 0); k++)
                pen.circle(g, x, base - 14 - k * U, 15, "pencil", pen.fill("berry"), {
                    strokeWidth: 1.4,
                });
            a[`value(${p.from + i})`] = [x, base, "down"];
        }
        if (p.label) cap(c, x0 + (n * s) / 2, base + 48, p.label, 12);
        return a;
    },
    describe: () =>
        "A dot plot, a number line with stacks of dots above the values and the unit written under the line.",
});
