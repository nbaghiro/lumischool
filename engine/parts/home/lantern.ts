import { part } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const lantern = defineDrawing({
    id: "lantern",
    family: "home",
    title: "Lantern",
    group: "Props",
    about: "A lantern with a glass all round and a ring to carry it by, on a post or on its own. Lit, the glass is yellow and a glow is hatched round it; unlit, the glass is clear, so lit and unlit read in pencil as well as in colour.",
    params: { lit: 1, post: 1 },
    settings: { lit: { kind: "whole", min: 0, max: 1 }, post: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Lit, on a post", params: { lit: 1, post: 1 } },
        { label: "Unlit, on its own", params: { lit: 0, post: 0 } },
    ],
    box: (p) => (p.post > 0 ? { w: 4, h: 9 } : { w: 4, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 2 * U,
            top = 0.9 * U,
            lit = p.lit > 0;
        if (p.post > 0) {
            pen.rect(g, cx - 0.2 * U, top + 2.6 * U, 0.4 * U, 5.3 * U, "pencil", pen.fill("tang"), {
                strokeWidth: 1.5,
            });
            pen.line(g, 0.8 * U, 8.8 * U, 3.2 * U, 8.8 * U, "pencil", { strokeWidth: 2 });
        }
        if (lit)
            pen.circle(
                part(c, "glow", [cx, top + 1.5 * U]).g,
                cx,
                top + 1.5 * U,
                3.4 * U,
                "pencil",
                pen.fill("glow", "hachure", { hachureGap: 6, fillWeight: 0.6 }),
                { strokeWidth: 0, stroke: "none" },
            );
        pen.circle(g, cx, top - 0.35 * U, 0.6 * U, "ruler", null, { strokeWidth: 1.4 });
        pen.polygon(
            g,
            [
                [cx - 0.9 * U, top + 0.4 * U],
                [cx, top - 0.05 * U],
                [cx + 0.9 * U, top + 0.4 * U],
            ],
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.4 },
        );
        pen.rect(
            g,
            cx - 0.7 * U,
            top + 0.4 * U,
            1.4 * U,
            2 * U,
            "ruler",
            lit ? pen.fill("glow") : pen.fill("card"),
            { strokeWidth: 1.7 },
        );
        for (const dx of [-0.25, 0.25])
            pen.line(g, cx + dx * U, top + 0.4 * U, cx + dx * U, top + 2.4 * U, "ruler", {
                strokeWidth: 1,
            });
        if (lit)
            pen.path(
                part(c, "flame", [cx, top + 1.9 * U]).g,
                `M${cx} ${top + 1.9 * U}Q${cx - 6} ${top + 1.4 * U} ${cx} ${top + 1 * U}Q${cx + 6} ${top + 1.4 * U} ${cx} ${top + 1.9 * U}Z`,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1 },
            );
        pen.rect(
            g,
            cx - 0.85 * U,
            top + 2.4 * U,
            1.7 * U,
            0.3 * U,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 2.5 }),
            { strokeWidth: 1.3 },
        );
        return { lamp: [cx, top + 1.4 * U, "right"], ring: [cx, top - 0.65 * U, "up"] };
    },
    describe: (p) =>
        `A lantern with glass all round and a ring to carry it by, ${p.lit > 0 ? "lit and glowing yellow" : "its glass clear and unlit"}, ${p.post > 0 ? "on a wooden post" : "standing on its own"}.`,
    motion: {
        parts: {
            glow: { is: "twinkle", dim: 0.35, amt: 0.05, period: 2.6 },
            flame: { is: "twinkle", dim: 0.2, amt: 0.18, period: 1.8 },
        },
    },
});
