import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

export const ladybird = defineDrawing<{ n: number; down: boolean }>({
    id: "ladybird",
    family: "sport",
    title: "Ladybird target",
    group: "Props",
    about: "A pinball drop target drawn as a ladybird seen from above, red wing cases with black spots and a number on its back. Knocked down, it tucks flat and goes grey.",
    params: { n: 2, down: false },
    settings: { n: { kind: "whole", min: 0, max: 20 }, down: { kind: "flag" } },
    takes: [
        { label: "Standing, two", params: { n: 2, down: false } },
        { label: "Knocked down, eight", params: { n: 8, down: true } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            flat = p.down;
        pen.circle(g, U, 0.42 * U, 0.6 * U, "pencil", pen.fill("ink-soft", "solid"), {
            strokeWidth: 1,
            roughness: 0.2,
        });
        pen.ellipse(
            g,
            U,
            1.12 * U,
            1.7 * U,
            (flat ? 1.1 : 1.5) * U,
            "pencil",
            flat ? pen.fill("card", "hachure") : pen.fill("berry", "solid"),
            { strokeWidth: 1.4, roughness: 0.3 },
        );
        pen.linear(
            g,
            [
                [U, 0.45 * U],
                [U, (flat ? 1.65 : 1.85) * U],
            ],
            "pencil",
            { strokeWidth: 1, stroke: c.t.ink, roughness: 0.2 },
        );
        for (const [x, y] of [
            [0.48, 0.85],
            [1.52, 0.85],
            [0.48, 1.45],
            [1.52, 1.45],
        ] as const)
            pen.circle(
                g,
                x * U,
                (flat ? 0.4 + y * 0.8 : y) * U,
                0.22 * U,
                "ruler",
                pen.fill("ink-soft"),
                {
                    strokeWidth: 0.4,
                    disableMultiStroke: true,
                },
            );
        const n = Math.max(0, Math.min(20, Math.round(p.n)));
        if (n > 0) num(c, U, 1.32 * U, n, 12, "middle", c.t.card);
        return { middle: [U, U, "up"] };
    },
    describe: (p) =>
        p.down
            ? "A pinball drop target drawn as a ladybird knocked flat, its pale wing cases spotted and its number still showing on its back."
            : "A pinball drop target drawn as a ladybird seen from above, red wing cases with black spots and its number written on its back.",
    motion: { still: "A target stands until the ball knocks it down." },
});
