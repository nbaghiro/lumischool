import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

export const snailTarget = defineDrawing<{ n: number }>({
    id: "snailtarget",
    family: "sport",
    title: "Snail target",
    group: "Props",
    about: "A garden snail seen from above that slides to and fro on a pinball table: a round spiral shell with a number on it and a soft body with two feelers.",
    params: { n: 5 },
    settings: { n: { kind: "whole", min: 0, max: 20 } },
    takes: [
        { label: "Worth five", params: { n: 5 } },
        { label: "Worth ten", params: { n: 10 } },
    ],
    box: () => ({ w: 3, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        pen.ellipse(g, 1.6 * U, 1.35 * U, 2.6 * U, 0.9 * U, "pencil", pen.fill("glow", "solid"), {
            strokeWidth: 1.2,
            roughness: 0.3,
        });
        for (const dx of [0.2, 0.5])
            pen.linear(
                g,
                [
                    [2.55 * U, 1.2 * U],
                    [(2.7 + dx * 0.2) * U, (0.45 + dx * 0.3) * U],
                ],
                "pencil",
                { strokeWidth: 1, stroke: c.t.ink, roughness: 0.2 },
            );
        pen.circle(g, 1.3 * U, 0.98 * U, 1.7 * U, "pencil", pen.fill("tang", "solid"), {
            strokeWidth: 1.4,
            roughness: 0.3,
        });
        pen.path(
            g,
            `M${1.3 * U} ${0.98 * U}m${-0.3 * U} 0a${0.3 * U} ${0.3 * U} 0 1 1 ${0.6 * U} 0a${0.55 * U} ${0.55 * U} 0 1 1 ${-1.0 * U} ${0.1 * U}`,
            "pencil",
            null,
            { strokeWidth: 0.9, stroke: c.t.ink, roughness: 0.2 },
        );
        const n = Math.max(0, Math.min(20, Math.round(p.n)));
        if (n > 0) num(c, 1.3 * U, 1.18 * U, n, 12, "middle", c.t.card);
        return { shell: [1.3 * U, 0.98 * U, "up"] };
    },
    describe: () =>
        "A garden snail seen from above on a pinball table, a round orange spiral shell with its number on it and a pale body with two feelers.",
    motion: { still: "The snail moves only as the game slides it across the table." },
});
