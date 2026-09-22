import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { clamp } from "../animals/nature";

export const comet = defineDrawing({
    id: "comet",
    family: "outdoors",
    title: "Comet",
    group: "Props",
    about: "A comet: a bright head of ice and dust with its tail streaming away behind it in long fine lines. It comes round again, years apart, which is the start of a question about how long.",
    params: { tail: 5 },
    settings: { tail: { kind: "whole", min: 2, max: 7 } },
    takes: [
        { label: "A long tail", params: { tail: 5 } },
        { label: "A short tail", params: { tail: 3 } },
    ],
    box: () => ({ w: 9, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.tail, 2, 7),
            hx = 7.6 * U,
            hy = 2.4 * U;
        for (let i = 0; i < n; i++) {
            const spread = (i - (n - 1) / 2) / Math.max(1, n - 1),
                len = (6.4 - Math.abs(spread) * 2.2) * U;
            pen.curve(
                g,
                [
                    [hx - 0.5 * U, hy + spread * 0.3 * U],
                    [hx - len * 0.5, hy - 0.5 * U + spread * 0.9 * U],
                    [hx - len, hy - 1.3 * U + spread * 1.5 * U],
                ],
                "pencil",
                { strokeWidth: i % 2 ? 1.2 : 2.2, stroke: i % 2 ? c.t["ink-soft"] : c.t.glow },
            );
        }
        pen.circle(g, hx, hy, 1.1 * U, "pencil", pen.fill("glow"), { strokeWidth: 1.6 });
        pen.circle(g, hx + 0.1 * U, hy - 0.05 * U, 0.45 * U, "pencil", pen.fill("card"), {
            strokeWidth: 0.8,
        });
        return {
            head: [hx, hy - 0.6 * U, "up"],
            tail: [hx - 6 * U, hy - 1.3 * U, "left"],
        };
    },
    describe: () =>
        "A comet with a bright yellow head and a tail of long fine lines streaming away behind it across the sky.",
    motion: { body: { is: "drift", dx: 0.04, lift: 0.01, period: 9 } },
});
