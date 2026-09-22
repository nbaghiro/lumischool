import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

export const flowerRow = defineDrawing({
    id: "flowers",
    family: "outdoors",
    title: "Flowers",
    group: "Props",
    about: "Flowers with the same number of petals each, in a row. Petals are the easiest equal groups there are: counting them in fives is the same act as reading a times table off.",
    params: { count: 3, petals: 5 },
    settings: {
        count: { kind: "whole", min: 1, max: 6 },
        petals: { kind: "whole", min: 3, max: 10 },
    },
    takes: [
        { label: "Three flowers, five petals", params: { count: 3, petals: 5 } },
        { label: "Four with six petals", params: { count: 4, petals: 6 } },
        { label: "One flower", params: { count: 1, petals: 8 } },
    ],
    box: (p) => ({ w: p.count * 4 + 1, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            ground = 9 * U,
            a: RawAnchors = {};
        const fills: Marker[] = ["berry", "sky", "tang", "mint"];
        for (let i = 0; i < p.count; i++) {
            const cx = 2.5 * U + i * 4 * U,
                cy = 3 * U;
            pen.curve(
                g,
                [
                    [cx, cy + 1.1 * U],
                    [cx + (i % 2 ? 10 : -10), (cy + ground) / 2],
                    [cx, ground],
                ],
                "pencil",
                { strokeWidth: 2.4, stroke: c.t.ok },
            );
            for (const s of [-1, 1]) {
                pen.ellipse(
                    g,
                    cx + s * 0.9 * U,
                    (cy + ground) / 2 + 8,
                    1.4 * U,
                    0.7 * U,
                    "pencil",
                    pen.fill("mint", "solid", { hachureGap: 5 }),
                    { strokeWidth: 1.4 },
                );
            }
            for (let k = 0; k < p.petals; k++) {
                const t = (k / p.petals) * Math.PI * 2 - Math.PI / 2;
                pen.ellipse(
                    g,
                    cx + 1.05 * U * Math.cos(t),
                    cy + 1.05 * U * Math.sin(t),
                    1.3 * U,
                    1.1 * U,
                    "pencil",
                    pen.fill(fills[i % fills.length]),
                    { strokeWidth: 1.4 },
                );
            }
            pen.circle(g, cx, cy, 1.1 * U, "pencil", pen.fill("glow"), { strokeWidth: 1.6 });
            a[`flower(${i})`] = [cx, cy - 1.8 * U, "up"];
        }
        pen.line(g, 0.4 * U, ground, (p.count * 4 + 0.6) * U, ground, "pencil", {
            strokeWidth: 2.2,
        });
        return a;
    },
    describe: (p) =>
        p.count > 1
            ? "Flowers in a row on green stems with leaves, each with the same number of petals round a yellow middle."
            : "A single flower on a green stem with two leaves, its petals spread round a yellow middle.",
});
