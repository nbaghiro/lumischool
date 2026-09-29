import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

export const rescueBase = defineDrawing({
    id: "rescuebase",
    family: "places",
    title: "Rescue station",
    group: "Props",
    about: "A low rescue station seen from the front: a wide one-storey building with a green roof, two big garage doors for the rescue vehicles, a round window, a bell under a little roof on top and a flag.",
    params: { doors: 2 },
    settings: { doors: { kind: "whole", min: 1, max: 3 } },
    takes: [
        { label: "Two garage doors", params: { doors: 2 } },
        { label: "Three garage doors", params: { doors: 3 } },
    ],
    box: () => ({ w: 9, h: 6 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            line = { strokeWidth: 1.6 };
        pen.rect(g, 0.4 * U, 2.6 * U, 8.2 * U, 3.3 * U, "pencil", pen.fill("card"), line);
        pen.polygon(
            g,
            [
                [0.1 * U, 2.7 * U],
                [4.5 * U, 1.3 * U],
                [8.9 * U, 2.7 * U],
            ],
            "pencil",
            pen.fill("mint"),
            line,
        );
        // the bell under its little roof, and the flag
        pen.rect(g, 4.1 * U, 0.75 * U, 0.8 * U, 0.75 * U, "ruler", null, {
            strokeWidth: 1.2,
            ...FIRM,
        });
        pen.polygon(
            g,
            [
                [3.9 * U, 0.8 * U],
                [4.5 * U, 0.3 * U],
                [5.1 * U, 0.8 * U],
            ],
            "ruler",
            pen.fill("mint"),
            { strokeWidth: 1.1, ...FIRM },
        );
        pen.path(
            g,
            `M${4.25 * U} ${1.4 * U}Q${4.5 * U} ${0.85 * U} ${4.75 * U} ${1.4 * U}Z`,
            "ruler",
            pen.fill("glow"),
            { strokeWidth: 1, ...FIRM },
        );
        pen.line(g, 7.6 * U, 2.35 * U, 7.6 * U, 0.3 * U, "ruler", { strokeWidth: 1.3, ...FIRM });
        pen.polygon(
            g,
            [
                [7.6 * U, 0.3 * U],
                [8.6 * U, 0.55 * U],
                [7.6 * U, 0.85 * U],
            ],
            "ruler",
            pen.fill("berry"),
            { strokeWidth: 1, ...FIRM },
        );
        pen.circle(g, 4.5 * U, 2.25 * U, 0.6 * U, "ruler", pen.fill("sky"), {
            strokeWidth: 1.1,
            ...FIRM,
        });
        const n = Math.max(1, Math.min(3, Math.round(p.doors))),
            dw = Math.min(2.4, 7.4 / n - 0.3);
        for (let i = 0; i < n; i++) {
            const x = 0.8 * U + (i + 0.5) * ((7.4 * U) / n) - (dw * U) / 2;
            pen.path(
                g,
                `M${x} ${5.9 * U}L${x} ${3.8 * U}Q${x + (dw * U) / 2} ${3.1 * U} ${x + dw * U} ${3.8 * U}L${x + dw * U} ${5.9 * U}`,
                "pencil",
                pen.fill("sky"),
                line,
            );
            for (const y of [4.5, 5.1])
                pen.line(g, x + 0.1 * U, y * U, x + (dw - 0.1) * U, y * U, "ruler", {
                    strokeWidth: 0.9,
                    ...FIRM,
                });
        }
        return { door: [2.5 * U, 5.9 * U, "down"] };
    },
    describe: (p) =>
        `A low rescue station with a green roof, ${Math.max(1, Math.min(3, Math.round(p.doors))) === 1 ? "one big garage door" : `${Math.max(1, Math.min(3, Math.round(p.doors)))} big garage doors`}, a round window, a bell under a little roof and a red flag.`,
});
