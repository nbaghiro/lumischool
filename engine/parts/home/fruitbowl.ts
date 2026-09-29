import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const fruitBowl = defineDrawing<{ fruit: number }>({
    id: "fruitbowl",
    family: "home",
    title: "Fruit bowl",
    group: "Props",
    about: "A round bowl of fruit seen from above, as big as its box: a wide rim round a heap of apples and oranges with a curved banana lying across them.",
    params: { fruit: 5 },
    settings: { fruit: { kind: "whole", min: 0, max: 6 } },
    takes: [
        { label: "A full bowl", params: { fruit: 5 } },
        { label: "An empty bowl", params: { fruit: 0 } },
    ],
    box: () => ({ w: 4, h: 4 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            m = 2 * U;
        pen.circle(g, m, m, 3.8 * U, "pencil", pen.fill("sky"), { strokeWidth: 1.8 });
        pen.circle(g, m, m, 2.9 * U, "pencil", pen.fill("card"), { strokeWidth: 1.1 });
        const spots: [number, number, "berry" | "tang" | "mint"][] = [
            [1.45, 1.5, "berry"],
            [2.5, 1.4, "tang"],
            [1.4, 2.5, "tang"],
            [2.55, 2.5, "berry"],
            [2, 2, "mint"],
            [2, 1.1, "mint"],
        ];
        const n = Math.max(0, Math.min(6, Math.round(p.fruit)));
        for (const [x, y, tone] of spots.slice(0, n)) {
            pen.circle(g, x * U, y * U, 0.8 * U, "pencil", pen.fill(tone), { strokeWidth: 1.1 });
            pen.line(g, x * U, (y - 0.4) * U, (x + 0.1) * U, (y - 0.55) * U, "ruler", {
                strokeWidth: 1,
                disableMultiStroke: true,
            });
        }
        if (n > 0)
            pen.path(
                g,
                `M${1.1 * U} ${2.9 * U}Q${2 * U} ${3.4 * U} ${2.9 * U} ${2.6 * U}Q${2 * U} ${3.05 * U} ${1.1 * U} ${2.9 * U}Z`,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1.2 },
            );
        return { middle: [m, m, "up"] };
    },
    describe: (p) =>
        p.fruit > 0
            ? "A round blue bowl seen from above, heaped with red apples and orange oranges, with a curved yellow banana lying across the top of them."
            : "An empty round blue bowl seen from above, a wide rim round a plain white middle waiting to be filled with fruit.",
    motion: { still: "A bowl sits on the table and holds still." },
});
