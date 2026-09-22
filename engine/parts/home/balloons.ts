import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { PARTY } from "../stories/pictures";

type Pt = [number, number];

const within = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const balloons = defineDrawing({
    id: "balloons",
    family: "home",
    title: "Balloons",
    group: "Props",
    about: "Party balloons on strings, gathered at the bottom into one hand's worth, each a different colour with its knot. A bunch to count, share out or let go of one at a time.",
    params: { count: 3 },
    settings: { count: { kind: "whole", min: 1, max: 6 } },
    takes: [
        { label: "Three", params: { count: 3 } },
        { label: "One, let go", params: { count: 1 } },
        { label: "Six", params: { count: 6 } },
    ],
    box: (p) => ({ w: Math.max(3, Math.ceil(within(p.count, 1, 6) * 1.5 + 1)), h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = within(p.count, 1, 6),
            W = Math.max(3, Math.ceil(n * 1.5 + 1)) * U,
            hold: Pt = [W / 2, 6.7 * U],
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const x = W / 2 + (i - (n - 1) / 2) * 1.45 * U,
                y = (1.6 + (i % 2) * 0.7) * U,
                rx = 0.62 * U,
                ry = 0.78 * U;
            pen.curve(
                g,
                [
                    [x, y + ry + 0.2 * U],
                    [x + (i % 2 ? 0.2 : -0.2) * U, (y + hold[1]) / 2],
                    [hold[0] + (x - hold[0]) * 0.15, hold[1] - 0.8 * U],
                    hold,
                ],
                "pencil",
                { strokeWidth: 1, stroke: c.t["ink-soft"] },
            );
            pen.ellipse(g, x, y, rx * 2, ry * 2, "pencil", pen.fill(PARTY[i % PARTY.length]), {
                strokeWidth: 1.6,
            });
            pen.polygon(
                g,
                [
                    [x - 0.14 * U, y + ry + 0.22 * U],
                    [x, y + ry - 0.02 * U],
                    [x + 0.14 * U, y + ry + 0.22 * U],
                ],
                "pencil",
                pen.fill(PARTY[i % PARTY.length]),
                { strokeWidth: 1 },
            );
            pen.arc(
                g,
                x - rx * 0.35,
                y - ry * 0.3,
                rx * 0.7,
                ry * 0.9,
                Math.PI * 1.1,
                Math.PI * 1.45,
                "pencil",
                { strokeWidth: 1.8, stroke: c.t.card },
            );
            a[`balloon(${i})`] = [x, y - ry, "up"];
        }
        a.hand = [hold[0], hold[1], "down"];
        return a;
    },
    describe: (p) =>
        within(p.count, 1, 6) > 1
            ? "Party balloons on strings gathered into one hand's worth at the bottom, each a different colour with a knot under it."
            : "A party balloon on a string held at the bottom, with a knot under it and a shine on its side.",
    motion: {
        body: { is: "float", lift: 12, dx: 6, deg: 4, pivot: [0.5, 1], period: 6.2, units: true },
        weight: "light",
    },
});
