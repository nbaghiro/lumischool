import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const beehive = defineDrawing<{ bees: number }>({
    id: "beehive",
    family: "sport",
    title: "Beehive kicker",
    group: "Props",
    about: "A round straw beehive on a pinball table that catches the ball in its doorway and kicks it back out: coiled straw bands, a dark doorway and a few bees about it.",
    params: { bees: 2 },
    settings: { bees: { kind: "whole", min: 0, max: 3 } },
    takes: [
        { label: "Two bees", params: { bees: 2 } },
        { label: "No bees", params: { bees: 0 } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        for (const [y, w] of [
            [1.55, 1.7],
            [1.15, 1.55],
            [0.78, 1.25],
            [0.46, 0.8],
        ] as const)
            pen.ellipse(g, U, y * U, w * U, 0.48 * U, "pencil", pen.fill("glow", "solid"), {
                strokeWidth: 1.1,
                roughness: 0.3,
            });
        pen.ellipse(g, U, 1.55 * U, 0.6 * U, 0.34 * U, "pencil", pen.fill("ink-soft", "solid"), {
            strokeWidth: 0.8,
            roughness: 0.2,
        });
        const at = [
            [0.3, 0.35],
            [1.7, 0.55],
            [1.6, 1.1],
        ] as const;
        for (let i = 0; i < Math.max(0, Math.min(3, Math.round(p.bees))); i++) {
            const b = at[i];
            if (!b) continue;
            pen.ellipse(
                g,
                b[0] * U,
                b[1] * U,
                0.32 * U,
                0.22 * U,
                "pencil",
                pen.fill("tang", "solid"),
                {
                    strokeWidth: 0.7,
                    roughness: 0.2,
                },
            );
        }
        return { door: [U, 1.55 * U, "down"] };
    },
    describe: () =>
        "A round straw beehive on a pinball table made of coiled bands, with a dark doorway that catches the ball and a few bees buzzing about it.",
    motion: { still: "The hive is fixed to the table and only kicks when the game says." },
});
