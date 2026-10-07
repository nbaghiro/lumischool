import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

type Pt = [number, number];

/** A diamond kite with a long tail high over a meadow, numbered balloons round it: the picture a kite game is chosen by. */
export const kiteCover = defineDrawing<{ balloons: number }>({
    id: "kitecover",
    family: "sport",
    title: "Kite over the meadow",
    group: "Props",
    about: "A pink diamond kite with a long tail of bows flying high over a green meadow, its line running down to the corner, with numbered balloons floating round it.",
    params: { balloons: 3 },
    settings: { balloons: { kind: "whole", min: 1, max: 3 } },
    takes: [
        { label: "Three balloons", params: { balloons: 3 } },
        { label: "One balloon", params: { balloons: 1 } },
    ],
    box: () => ({ w: 12, h: 9 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            o = { strokeWidth: 1.4, roughness: 0.25 };
        pen.rect(
            g,
            0.3 * U,
            7.7 * U,
            11.4 * U,
            1.0 * U,
            "pencil",
            pen.fill("mint", "hachure", { hachureGap: 9 }),
            { stroke: "none" },
        );
        pen.line(g, 0.2 * U, 7.6 * U, 11.8 * U, 7.6 * U, "ruler", { strokeWidth: 2 });
        pen.curve(
            g,
            [
                [0.4 * U, 8.6 * U],
                [3.5 * U, 6.4 * U],
                [6.9 * U, 3.0 * U],
            ],
            "pencil",
            {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            },
        );
        const top: Pt = [7.6 * U, 0.4 * U],
            right: Pt = [8.9 * U, 2.0 * U],
            foot: Pt = [7.4 * U, 4.3 * U],
            left: Pt = [6.3 * U, 1.8 * U],
            mid: Pt = [7.55 * U, 2.0 * U];
        pen.polygon(g, [top, right, mid], "pencil", pen.fill("berry", "solid"), o);
        pen.polygon(g, [top, mid, left], "pencil", pen.fill("card", "solid"), o);
        pen.polygon(g, [left, mid, foot], "pencil", pen.fill("berry", "solid"), o);
        pen.polygon(g, [mid, right, foot], "pencil", pen.fill("card", "solid"), o);
        pen.line(g, top[0], top[1], foot[0], foot[1], "ruler", {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
        });
        pen.line(g, left[0], left[1], right[0], right[1], "ruler", {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
        });
        const tail: Pt[] = [
            [7.4, 4.3],
            [8.1, 5.0],
            [8.9, 5.3],
            [9.7, 5.1],
            [10.3, 5.5],
            [10.9, 6.1],
        ];
        pen.curve(
            g,
            tail.map(([x, y]): Pt => [x * U, y * U]),
            "pencil",
            { strokeWidth: 0.9 },
        );
        tail.slice(1).forEach(([x, y], i) =>
            pen.polygon(
                g,
                [
                    [(x - 0.3) * U, (y - 0.2) * U],
                    [(x + 0.3) * U, (y + 0.2) * U],
                    [(x + 0.3) * U, (y - 0.2) * U],
                    [(x - 0.3) * U, (y + 0.2) * U],
                ],
                "pencil",
                pen.fill(i % 2 ? "glow" : "sky", "solid"),
                {
                    strokeWidth: 0.8,
                },
            ),
        );
        const balloons: [number, number, number, "sky" | "glow" | "tang"][] = [
            [3.2, 2.0, 6, "sky"],
            [10.2, 2.4, 4, "glow"],
            [4.6, 4.9, 3, "tang"],
        ];
        balloons
            .slice(0, Math.max(1, Math.min(3, Math.round(p.balloons))))
            .forEach(([x, y, n, tone]) => {
                pen.line(g, x * U, (y + 0.9) * U, (x - 0.1) * U, (y + 1.9) * U, "pencil", {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
                pen.ellipse(
                    g,
                    x * U,
                    y * U,
                    1.5 * U,
                    1.75 * U,
                    "pencil",
                    pen.fill(tone, "solid"),
                    o,
                );
                num(c, x * U, (y + 0.3) * U, n, 16);
            });
        return { kite: [mid[0], mid[1], "up"] };
    },
    describe: (p) =>
        `A pink and white diamond kite with a long tail of bows flying high over a green meadow, its line running to the corner, ${Math.round(p.balloons) > 1 ? "with numbered balloons floating round it" : "with one numbered balloon beside it"}.`,
    motion: { still: "A cover holds still; the kite itself flies in the game." },
});
