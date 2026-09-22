import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, ring } from "../animals/nature";

export const iceberg = defineDrawing({
    id: "iceberg",
    family: "outdoors",
    title: "Iceberg",
    group: "Props",
    about: "An iceberg on the sea. Drawn with what is under the water as a dashed outline, it shows how little of an iceberg is above the waterline: about a tenth, which is a fraction and a decimal a child can point to.",
    params: { under: 1 },
    settings: { under: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "With what is under the water", params: { under: 1 } },
        { label: "Only the tip", params: { under: 0 } },
    ],
    box: (p) => (p.under > 0 ? { w: 10, h: 13 } : { w: 10, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            line = 5.4 * U;
        if (p.under > 0) {
            pen.path(
                g,
                ring([
                    [1.4 * U, line + 0.2 * U],
                    [0.4 * U, 8 * U],
                    [1.6 * U, 11 * U],
                    [4.6 * U, 12.6 * U],
                    [7.8 * U, 11.8 * U],
                    [9.6 * U, 9 * U],
                    [9 * U, line + 0.2 * U],
                    [5 * U, line],
                ]),
                "pencil",
                pen.fill("sky", "hachure", { hachureGap: 8, fillWeight: 0.5 }),
                { strokeWidth: 1.4, strokeLineDash: [8, 6], stroke: c.t["ink-soft"] },
            );
        }
        const top: Pt[] = [
            [1.8 * U, line],
            [2.6 * U, 2.4 * U],
            [3.6 * U, 1.6 * U],
            [4.4 * U, 2.6 * U],
            [5.6 * U, 0.6 * U],
            [6.6 * U, 2 * U],
            [7.4 * U, 1.8 * U],
            [8.4 * U, line],
        ];
        pen.polygon(g, top, "pencil", pen.fill("card"), { strokeWidth: 2 });
        pen.polygon(
            g,
            [
                [5.6 * U, 0.6 * U],
                [6.6 * U, 2 * U],
                [7.4 * U, 1.8 * U],
                [8.4 * U, line],
                [6 * U, line],
            ],
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.1 },
        );
        const wave: Pt[] = [];
        for (let x = 0; x <= 10 * U; x += 0.5 * U)
            wave.push([x, line + (Math.round(x / (0.5 * U)) % 2 ? -3 : 3)]);
        pen.curve(g, wave, "pencil", { strokeWidth: 1.7 });
        const a: RawAnchors = {
            tip: [5.6 * U, 0.6 * U, "up"],
            waterline: [9.6 * U, line, "right"],
        };
        if (p.under > 0) a.under = [4.6 * U, 12.6 * U, "down"];
        return a;
    },
    describe: (p) =>
        p.under > 0
            ? "An iceberg on the sea, white above a wavy waterline, with the much larger part under the water drawn as a dashed blue outline."
            : "An iceberg on the sea, a white jagged peak above a wavy waterline with one side shaded blue.",
    motion: { body: { is: "bob", lift: 0.02, arc: 0, deg: 0, period: 5.6 }, weight: "heavy" },
});
