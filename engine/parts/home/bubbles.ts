import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const within = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

/** Where each bubble floats, in squares from the top left, and how big it is: the same every time. */
const BUBBLES: [number, number, number][] = [
    [1.7, 3.3, 1.9],
    [3.7, 2.1, 2.3],
    [5.7, 3.4, 1.5],
    [2.3, 1.1, 1.1],
    [5.4, 1.2, 1.6],
    [4.1, 4.2, 0.9],
    [6.5, 2.1, 0.8],
    [0.8, 1.9, 0.7],
];

export const bubbles = defineDrawing({
    id: "bubbles",
    family: "home",
    title: "Bubbles",
    group: "Props",
    about: "Soap bubbles floating, big and small, each with a curl of colour round its edge and a shine on it. They can be counted before they pop, and put in order from the smallest to the biggest.",
    params: { count: 5 },
    settings: { count: { kind: "whole", min: 1, max: 8 } },
    takes: [
        { label: "Five", params: { count: 5 } },
        { label: "Eight", params: { count: 8 } },
        { label: "Two", params: { count: 2 } },
    ],
    box: () => ({ w: 7, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = within(p.count, 1, BUBBLES.length),
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const [x, y, d] = BUBBLES[i] ?? [0, 0, 0],
                cx = x * U,
                cy = y * U,
                r = (d * U) / 2;
            pen.circle(g, cx, cy, r * 2, "pencil", null, {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
            });
            pen.arc(g, cx, cy, r * 1.7, r * 1.7, Math.PI * 0.15, Math.PI * 0.7, "pencil", {
                strokeWidth: 1.6,
                stroke: c.t.sky,
            });
            pen.arc(g, cx, cy, r * 1.6, r * 1.6, Math.PI * 0.72, Math.PI * 1.05, "pencil", {
                strokeWidth: 1.4,
                stroke: c.t.berry,
            });
            pen.arc(
                g,
                cx - r * 0.3,
                cy - r * 0.3,
                r * 0.8,
                r * 0.8,
                Math.PI * 1.1,
                Math.PI * 1.5,
                "pencil",
                { strokeWidth: 1.6, stroke: c.t.card },
            );
            a[`bubble(${i})`] = [cx, cy - r, "up"];
        }
        return a;
    },
    describe: (p) =>
        within(p.count, 1, BUBBLES.length) > 1
            ? "Soap bubbles floating in the air, big and small, each with a curl of colour round its edge and a shine on it."
            : "A soap bubble floating in the air with a curl of colour round its edge and a shine on it.",
    motion: {
        body: { is: "float", lift: 14, dx: 10, deg: 0, period: 7.8, units: true },
        weight: "light",
    },
});
