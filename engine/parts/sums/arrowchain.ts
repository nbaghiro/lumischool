import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, wide } from "../lettering";

export const arrowChain = defineDrawing({
    id: "arrowchain",
    family: "sums",
    title: "Chain of steps",
    group: "Structures",
    about: "A number and the operations done to it, written over the arrows between the stages. Read left to right it works forwards, read right to left with each step inverted it works back.",
    params: {
        start: "5",
        steps: [
            { op: "+ 3", to: "8" },
            { op: "× 2", to: "16" },
        ] as { op: string; to: string }[],
    },
    settings: { start: { kind: "text", most: 4 }, steps: { kind: "fixed" } },
    takes: [
        {
            label: "Two steps",
            params: {
                start: "5",
                steps: [
                    { op: "+ 3", to: "8" },
                    { op: "\u00d7 2", to: "16" },
                ],
            },
        },
        {
            label: "Ends missing",
            params: {
                start: "12",
                steps: [
                    { op: "\u00f7 3", to: "" },
                    { op: "+ 8", to: "" },
                ],
            },
        },
        {
            label: "Three steps",
            params: {
                start: "2",
                steps: [
                    { op: "\u00d7 10", to: "20" },
                    { op: "- 5", to: "15" },
                    { op: "\u00f7 5", to: "3" },
                ],
            },
        },
    ],
    box: (p) => ({ w: p.steps.length * 6 + 5, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 4 * U,
            a: RawAnchors = {};
        const node = (x: number, v: string, i: number) => {
            if (v) {
                pen.circle(g, x, y, 2.4 * U, "ruler", pen.fill("card"), { strokeWidth: 2 });
                num(c, x + 0, y + 8, v, 22);
            } else
                pen.circle(g, x, y, 2.4 * U, "ruler", null, {
                    strokeWidth: 2,
                    strokeLineDash: [7, 5],
                });
            a[`stage(${i})`] = [x, y - 1.2 * U, "up"];
        };
        node(2 * U, p.start, 0);
        p.steps.forEach((step, i) => {
            const x0 = (2 + i * 6) * U,
                x1 = x0 + 6 * U;
            pen.curve(
                g,
                [
                    [x0 + 1.3 * U, y - 0.6 * U],
                    [(x0 + x1) / 2, y - 2.4 * U],
                    [x1 - 1.3 * U, y - 0.6 * U],
                ],
                "ruler",
                { strokeWidth: 2.2 },
            );
            for (const s of [-0.45, 0.45]) {
                const t = 1.05 + s;
                pen.line(
                    g,
                    x1 - 1.3 * U,
                    y - 0.6 * U,
                    x1 - 1.3 * U - 12 * Math.cos(t),
                    y - 0.6 * U - 12 * Math.sin(t),
                    "ruler",
                    { strokeWidth: 2.2 },
                );
            }
            patch(c, (x0 + x1) / 2, y - 2.9 * U, wide(step.op, 18) + 10, 24);
            num(c, (x0 + x1) / 2, y - 2.7 * U, step.op, 18);
            node(x1, step.to, i + 1);
            a[`step(${i})`] = [(x0 + x1) / 2, y - 3.2 * U, "up"];
        });
        return a;
    },
    describe: () =>
        "A chain of circles joined by curved arrows, a number in each circle or a dashed empty circle, and an operation written over each arrow.",
});
