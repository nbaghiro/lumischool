import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, penned } from "../lettering";

/** Where each number comes out of a sorting network: every comparator puts the smaller on its left. */
export function throughNetwork(inputs: readonly number[], pairs: readonly number[]): number[] {
    const out = [...inputs];
    for (let i = 0; i + 1 < pairs.length; i += 2) {
        const l = Math.round(pairs[i] ?? 0) - 1,
            r = Math.round(pairs[i + 1] ?? 0) - 1;
        const lo = Math.min(l, r),
            hi = Math.max(l, r);
        if (lo < 0 || hi >= out.length || lo === hi) continue;
        const a = out[lo] ?? 0,
            b = out[hi] ?? 0;
        if (a > b) [out[lo], out[hi]] = [b, a];
    }
    return out;
}

export const sortNet = defineDrawing({
    id: "sortnet",
    family: "coding",
    title: "A sorting network",
    group: "Structures",
    about: "Lines that run down the page with bridges across them. Numbers start in the circles at the top and walk down their lines; at every bridge the two numbers meet, the smaller goes left and the bigger goes right. Traced to the bottom the numbers come out in order, which is what makes it a program drawn on paper. `outputs` fills the circles at the bottom, which is the answer key.",
    params: {
        inputs: [4, 1, 3, 2],
        pairs: [1, 2, 3, 4, 1, 3, 2, 4, 2, 3],
        outputs: false,
        upto: -1,
    },
    settings: {
        inputs: { kind: "numbers", min: 1, max: 9, most: 6 },
        pairs: { kind: "numbers", min: 1, max: 6, most: 24 },
        outputs: { kind: "flag" },
        upto: { kind: "whole", min: -1, max: 12 },
    },
    takes: [
        {
            label: "Four numbers in",
            params: {
                inputs: [4, 1, 3, 2],
                pairs: [1, 2, 3, 4, 1, 3, 2, 4, 2, 3],
                outputs: false,
                upto: -1,
            },
        },
        {
            label: "Traced to the bottom",
            params: {
                inputs: [7, 3, 9, 5],
                pairs: [1, 2, 3, 4, 1, 3, 2, 4, 2, 3],
                outputs: true,
                upto: -1,
            },
        },
        {
            label: "Three bridges crossed",
            params: {
                inputs: [7, 3, 9, 5],
                pairs: [1, 2, 3, 4, 1, 3, 2, 4, 2, 3],
                outputs: false,
                upto: 3,
            },
        },
    ],
    box: (p) => ({
        w: Math.max(2, p.inputs.length) * 3 + 1,
        h: Math.ceil(p.pairs.length / 2) * 2 + 7,
    }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c,
            n = p.inputs.length,
            stages = Math.ceil(p.pairs.length / 2);
        const x = (i: number) => (2 + i * 3) * U,
            top = 2 * U,
            bottom = (stages * 2 + 5) * U;
        for (let i = 0; i < n; i++)
            pen.line(g, x(i), top + U, x(i), bottom - U, "ruler", {
                strokeWidth: 2,
                stroke: c.t["ink-soft"],
            });
        for (let k = 0; k < stages; k++) {
            const l = Math.round(p.pairs[k * 2] ?? 0) - 1,
                r = Math.round(p.pairs[k * 2 + 1] ?? 0) - 1,
                y = top + (2.5 + k * 2) * U;
            if (l < 0 || r < 0 || l >= n || r >= n) continue;
            pen.line(g, x(l), y, x(r), y, "ruler", { strokeWidth: 3.2 });
            for (const i of [l, r])
                pen.circle(
                    g,
                    x(i),
                    y,
                    9,
                    "ruler",
                    { fill: c.t.ink, fillStyle: "solid" },
                    { strokeWidth: 1 },
                );
        }
        // Part of the way down: the numbers stand on their lines just below the last bridge crossed.
        const k = Math.round(p.upto);
        if (k > 0 && k <= stages) {
            const now = throughNetwork(p.inputs, p.pairs.slice(0, k * 2)),
                y = top + (2.5 + (k - 1) * 2) * U + 1.05 * U;
            const l = Math.round(p.pairs[(k - 1) * 2] ?? 0) - 1,
                r = Math.round(p.pairs[(k - 1) * 2 + 1] ?? 0) - 1;
            if (l >= 0 && r >= 0 && l < n && r < n)
                pen.line(g, x(l), y - 1.05 * U, x(r), y - 1.05 * U, "ruler", {
                    strokeWidth: 5,
                    stroke: c.paper ? c.t.ink : c.t.pen,
                });
            for (let i = 0; i < n; i++) {
                pen.circle(
                    g,
                    x(i),
                    y,
                    1.3 * U,
                    "ruler",
                    pen.fill(i === l || i === r ? "glow" : "card"),
                    { strokeWidth: 1.4 },
                );
                num(c, x(i), y + 5.5, String(now[i]), 15);
            }
        }
        const outs = throughNetwork(p.inputs, p.pairs);
        for (let i = 0; i < n; i++) {
            pen.circle(g, x(i), top, 1.8 * U, "ruler", pen.fill("glow"), { strokeWidth: 1.8 });
            num(c, x(i), top + 6.5, String(p.inputs[i]), 18);
            pen.circle(g, x(i), bottom, 1.8 * U, "ruler", pen.fill("card"), { strokeWidth: 1.8 });
            if (p.outputs || k >= stages) penned(c, x(i), bottom + 7, String(outs[i]), 19);
            a[`in(${i + 1})`] = [x(i), top - 0.9 * U, "up"];
            a[`out(${i + 1})`] = [x(i), bottom - 0.9 * U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `Lines running down the page with bridges across them, numbers in circles at the top ready to walk down, ${p.outputs ? "the circles at the bottom filled in" : "empty circles at the bottom"}.`,
});
