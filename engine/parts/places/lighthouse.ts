import { part } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const lighthouse = defineDrawing({
    id: "lighthouse",
    family: "places",
    title: "Lighthouse",
    group: "Props",
    about: "A lighthouse on its rocks, a tapering tower in stripes with a gallery rail and a lamp room whose beam reaches out to both sides. The stripes are drawn even so they can be counted.",
    params: { stripes: 3, beam: 1 },
    settings: {
        stripes: { kind: "whole", min: 1, max: 5 },
        beam: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Three stripes, lit", params: { stripes: 3, beam: 1 } },
        { label: "Four stripes, dark", params: { stripes: 4, beam: 0 } },
    ],
    box: () => ({ w: 9, h: 16 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 4.5 * U,
            base = 14.6 * U,
            top = 4.4 * U,
            n = Math.max(1, Math.min(5, Math.round(p.stripes)));
        const half = (y: number) => 1.1 * U + (1.8 * U - 1.1 * U) * ((y - top) / (base - top));
        const beam = p.beam > 0 ? part(c, "beam", [cx, 2.6 * U]).g : g;
        if (p.beam > 0)
            for (const s of [-1, 1]) {
                pen.polygon(
                    beam,
                    [
                        [cx + s * 0.8 * U, 2.6 * U],
                        [cx + s * 4.4 * U, 1.4 * U],
                        [cx + s * 4.4 * U, 3.8 * U],
                    ],
                    "pencil",
                    pen.fill("glow", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
                    { strokeWidth: 0, stroke: "none" },
                );
            }
        pen.path(
            g,
            `M${cx - 3.8 * U} ${base + 0.9 * U}Q${cx - 3.4 * U} ${base - 0.8 * U} ${cx - 1.6 * U} ${base - 0.4 * U}Q${cx} ${base - 1.1 * U} ${cx + 1.8 * U} ${base - 0.5 * U}Q${cx + 3.6 * U} ${base - 0.7 * U} ${cx + 3.9 * U} ${base + 0.9 * U}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
            { strokeWidth: 1.8 },
        );
        const band = (base - top) / (n * 2);
        for (let i = 0; i < n * 2; i++) {
            const y0 = top + i * band,
                y1 = y0 + band;
            pen.polygon(
                g,
                [
                    [cx - half(y0), y0],
                    [cx + half(y0), y0],
                    [cx + half(y1), y1],
                    [cx - half(y1), y1],
                ],
                "pencil",
                i % 2 ? pen.fill("card") : pen.fill("berry"),
                { strokeWidth: 1.6 },
            );
        }
        pen.rect(g, cx - 0.5 * U, base - 2 * U, 1 * U, 2 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.4,
        });
        pen.rect(
            g,
            cx - 1.6 * U,
            top - 0.4 * U,
            3.2 * U,
            0.4 * U,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.6 },
        );
        for (let k = 0; k <= 4; k++)
            pen.line(
                g,
                cx - 1.5 * U + k * 0.75 * U,
                top - 1.2 * U,
                cx - 1.5 * U + k * 0.75 * U,
                top - 0.4 * U,
                "ruler",
                { strokeWidth: 1.1 },
            );
        pen.line(g, cx - 1.6 * U, top - 1.2 * U, cx + 1.6 * U, top - 1.2 * U, "ruler", {
            strokeWidth: 1.4,
        });
        pen.rect(
            part(c, "lamp", [cx, top - 2 * U]).g,
            cx - 0.9 * U,
            top - 2.8 * U,
            1.8 * U,
            1.6 * U,
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.7 },
        );
        pen.polygon(
            g,
            [
                [cx - 1.2 * U, top - 2.8 * U],
                [cx, top - 3.9 * U],
                [cx + 1.2 * U, top - 2.8 * U],
            ],
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.7 },
        );
        return {
            lamp: [cx, top - 2, "up"],
            door: [cx, base - 2 * U, "down"],
            stripe: [cx + half(top + band), top + band, "right"],
        };
    },
    describe: (p) =>
        `A lighthouse on its rocks, a tapering tower in pink and white stripes with a gallery rail and a red-roofed lamp room${p.beam > 0 ? ", its beam shining to each side" : ""}.`,
    motion: {
        parts: {
            beam: { is: "twinkle", dim: 0.45, amt: -0.04, period: 3.2 },
            lamp: { is: "twinkle", dim: 0.25, amt: -0.08, period: 3.2 },
        },
        react: { kind: "flash", at: "lamp" },
    },
});
