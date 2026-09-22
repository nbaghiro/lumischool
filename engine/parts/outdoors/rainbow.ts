import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { clamp } from "../animals/nature";

const BOW: ("berry" | "tang" | "glow" | "mint" | "sky")[] = [
    "berry",
    "tang",
    "glow",
    "mint",
    "sky",
];

export const rainbow = defineDrawing({
    id: "rainbow",
    family: "outdoors",
    title: "Rainbow",
    group: "Props",
    about: "A rainbow in its bands, the same order every time from the outside in, with a small cloud at each foot. Which colour is next to which is a question with one answer, and so is how many bands there are.",
    params: { bands: 5, clouds: 1 },
    settings: {
        bands: { kind: "whole", min: 2, max: 5 },
        clouds: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Five bands", params: { bands: 5, clouds: 1 } },
        { label: "Three bands, no clouds", params: { bands: 3, clouds: 0 } },
    ],
    box: () => ({ w: 12, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.bands, 2, 5),
            cx = 6 * U,
            cy = 6.6 * U,
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const r = (5.4 - i * 0.55) * U;
            pen.path(
                g,
                `M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}L${cx + r - 0.55 * U} ${cy}A${r - 0.55 * U} ${r - 0.55 * U} 0 0 0 ${cx - r + 0.55 * U} ${cy}Z`,
                "pencil",
                pen.fill(BOW[i]),
                { strokeWidth: 1.2 },
            );
            a[`band(${i})`] = [cx, cy - r + 0.27 * U, "up"];
        }
        if (p.clouds > 0)
            for (const sx of [-1, 1]) {
                const x = cx + sx * 4.9 * U,
                    y = cy - 0.3 * U;
                for (const [dx, dy, d] of [
                    [-0.8, 0.1, 1.1],
                    [0, -0.35, 1.4],
                    [0.8, 0.05, 1.1],
                ] as const)
                    pen.ellipse(
                        g,
                        x + dx * U,
                        y + dy * U,
                        d * U * 1.3,
                        d * U,
                        "doodle",
                        pen.fill("card"),
                        { strokeWidth: 1.4 },
                    );
                pen.line(g, x - 1.5 * U, y + 0.55 * U, x + 1.5 * U, y + 0.55 * U, "pencil", {
                    strokeWidth: 1.2,
                });
            }
        return a;
    },
    describe: (p) =>
        `A rainbow of coloured bands arched over the ground, in the same order from the outside in${p.clouds > 0 ? ", with a small white cloud at each foot" : ""}.`,
    motion: {
        still: "A rainbow holds still; it comes out and fades, which the painter's hut plays as its rare sight.",
    },
});
