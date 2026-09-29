import { type RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const countOf = (n: number) => Math.max(1, Math.min(6, Math.round(n)));

const MID: Pt = [100, 52],
    STEP: Pt = [27, -11],
    LENGTH = 18,
    ACROSS = 7.4;

/** How wide the sole is at a point along it, from the heel at -1 to the toe at 1: a waist at the arch. */
const widthAt = (u: number) => (u > 0 ? 1 : 0.82) - 0.22 * Math.exp(-(((u + 0.2) / 0.28) ** 2));

export const footprints = defineDrawing({
    id: "footprints",
    family: "outdoors",
    title: "Boot prints",
    group: "Props",
    about: "A line of boot prints pressed into grey dust, walking off at a slant away from you, left and right in turn, each a sole and a separate heel with bars of tread across them. One to six of them.",
    params: { count: 4 },
    settings: { count: { kind: "whole", min: 1, max: 6 } },
    takes: [
        { label: "Four prints", params: { count: 4 } },
        { label: "One print", params: { count: 1 } },
        { label: "Six prints", params: { count: 6 } },
    ],
    box: () => ({ w: 10, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = countOf(p.count),
            a: RawAnchors = {};
        const len = Math.hypot(STEP[0], STEP[1]),
            along: Pt = [STEP[0] / len, STEP[1] / len],
            side: Pt = [-along[1], along[0]];
        for (let i = 0; i < n; i++) {
            const t = i - (n - 1) / 2,
                // prints further off are drawn smaller, which is what makes the line walk away
                s = 1.12 - 0.05 * (i + (6 - n) / 2),
                off = (i % 2 === 0 ? 1 : -1) * 9 * s,
                cx = MID[0] + t * STEP[0] + side[0] * off,
                cy = MID[1] + t * STEP[1] + side[1] * off;
            const at = (u: number, v: number): Pt => [
                cx + along[0] * u * LENGTH * s + side[0] * v * ACROSS * s,
                cy + along[1] * u * LENGTH * s + side[1] * v * ACROSS * s,
            ];
            // a boot print as a child draws one: a solid sole and a separate heel with a gap between,
            // white tread bars across both, so it reads as a boot and not a pebble at question size
            const outline = (from: number, to: number, wide: number): Pt[] => {
                const pts: Pt[] = [];
                for (let k = 0; k < 24; k++) {
                    const th = (k / 24) * Math.PI * 2,
                        u = from + ((Math.cos(th) + 1) / 2) * (to - from);
                    pts.push(at(u, Math.sin(th) * wide * widthAt(u)));
                }
                return pts;
            };
            const print = { fill: c.t["ink-soft"], fillStyle: "solid" as const };
            pen.polygon(g, outline(-0.3, 1, 0.85), "ruler", print, {
                strokeWidth: 1.4,
                disableMultiStroke: true,
                preserveVertices: true,
            });
            pen.polygon(g, outline(-1, -0.55, 0.8), "ruler", print, {
                strokeWidth: 1.4,
                disableMultiStroke: true,
                preserveVertices: true,
            });
            for (const u of [-0.83, -0.67, 0.05, 0.3, 0.55, 0.78]) {
                const w = widthAt(u) * 0.6,
                    [x0, y0] = at(u - 0.04, -w),
                    [xm, ym] = at(u + 0.04, 0),
                    [x1, y1] = at(u - 0.04, w);
                pen.linear(
                    g,
                    [
                        [x0, y0],
                        [xm, ym],
                        [x1, y1],
                    ],
                    "ruler",
                    { strokeWidth: 1.6, stroke: c.t.card, disableMultiStroke: true },
                );
            }
            a[`print(${i})`] = [...at(1, 0), "up"];
        }
        for (const [x, y] of [
            [8, 94],
            [64, 94],
            [162, 88],
            [190, 46],
            [40, 22],
            [128, 10],
        ] as const)
            pen.circle(
                g,
                x,
                y,
                2.4,
                "ruler",
                { fill: c.t["ink-soft"], fillStyle: "solid" },
                {
                    strokeWidth: 0.4,
                },
            );
        return a;
    },
    describe: (p) =>
        countOf(p.count) === 1
            ? "One boot print pressed into grey dust, a sole and a separate heel with bars of tread across them."
            : "A line of boot prints pressed into grey dust, left and right in turn, walking off at a slant, each a sole and heel with bars of tread.",
    motion: {
        still: "Prints pressed into the ground stay where they were made, and they are counted.",
    },
});
