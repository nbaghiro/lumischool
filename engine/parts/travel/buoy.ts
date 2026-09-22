import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** The water a buoy rides in, drawn under it unless the painter has water of its own. */
function water<G>(c: Ctx<G>, sea: number): void {
    const { pen, g } = c;
    pen.path(
        g,
        `M${0.2 * U} ${sea}L${2.8 * U} ${sea}L${2.8 * U} ${sea + 0.55 * U}L${0.2 * U} ${sea + 0.55 * U}Z`,
        "pencil",
        pen.fill("sky", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
        { stroke: "none" },
    );
    for (let x = 0.2 * U; x + 0.65 * U <= 2.85 * U; x += 0.65 * U)
        pen.curve(
            g,
            [
                [x, sea],
                [x + 0.16 * U, sea - 0.14 * U],
                [x + 0.33 * U, sea],
                [x + 0.49 * U, sea - 0.14 * U],
                [x + 0.65 * U, sea],
            ],
            "pencil",
            calm(c, 1.3),
        );
}

export const buoy = defineDrawing({
    id: "buoy",
    family: "travel",
    title: "Buoy",
    group: "Props",
    about: "A buoy riding at sea, side on: a bell buoy with a round float half under the water, bands round it, three legs holding a bell and a light on its cap, or the marks that buoy a channel, a can for one side of the way and a cone for the other, each with a white band. The bands can be counted.",
    params: { kind: "bell", bands: 2, light: 1, sea: 1 },
    settings: {
        kind: { kind: "one of", of: ["bell", "can", "cone"] },
        bands: { kind: "whole", min: 1, max: 3 },
        light: { kind: "whole", min: 0, max: 1 },
        sea: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "A bell buoy, two bands, lit",
            params: { kind: "bell", bands: 2, light: 1, sea: 1 },
        },
        { label: "Three bands, no light", params: { kind: "bell", bands: 3, light: 0, sea: 1 } },
        {
            label: "A can, for one side of the way",
            params: { kind: "can", bands: 1, light: 0, sea: 1 },
        },
        {
            label: "A cone, for the other side",
            params: { kind: "cone", bands: 1, light: 0, sea: 1 },
        },
    ],
    box: (p) => ({ w: 3, h: p.kind === "bell" ? 4 : 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            cx = 1.5 * U,
            sea = (p.kind === "bell" ? 3.3 : 2.3) * U,
            n = Math.max(1, Math.min(3, Math.round(p.bands)));
        if (p.sea > 0) water(c, sea);
        if (p.kind === "bell") {
            for (const dx of [-0.5, 0, 0.5])
                pen.line(
                    g,
                    cx + dx * U,
                    2.7 * U,
                    cx + dx * 0.45 * U,
                    1.1 * U,
                    "ruler",
                    calm(c, 1.4),
                );
            pen.line(g, cx - 0.5 * U, 1.9 * U, cx + 0.5 * U, 1.9 * U, "ruler", calm(c, 1.1));
            pen.path(
                g,
                `M${cx - 0.28 * U} ${2.1 * U}Q${cx - 0.26 * U} ${1.58 * U} ${cx} ${1.55 * U}Q${cx + 0.26 * U} ${1.58 * U} ${cx + 0.28 * U} ${2.1 * U}Z`,
                "pencil",
                pen.fill("glow"),
                calm(c, 1.2),
            );
            pen.ellipse(
                g,
                cx,
                1.05 * U,
                0.95 * U,
                0.3 * U,
                "pencil",
                pen.fill("ink-soft"),
                calm(c, 1.3),
            );
            if (p.light > 0)
                pen.circle(g, cx, 0.72 * U, 0.42 * U, "ruler", pen.fill("glow"), calm(c, 1.2));
            pen.ellipse(
                g,
                cx,
                3.0 * U,
                1.9 * U,
                1.0 * U,
                "pencil",
                pen.fill("berry"),
                calm(c, 1.7),
            );
            // the bands, white on red, each a stroke round the float between its top and the waterline
            for (let i = 0; i < n; i++) {
                const y = 2.66 * U + ((i + 0.5) / n) * 0.55 * U,
                    half = 0.88 * U * Math.sqrt(Math.max(0, 1 - ((y - 3.0 * U) / (0.5 * U)) ** 2));
                pen.line(g, cx - half, y, cx + half, y, "pencil", {
                    ...calm(c, 3),
                    stroke: c.t.card,
                });
            }
            a.top = [cx, (p.light > 0 ? 0.5 : 0.9) * U, "up"];
        } else if (p.kind === "can") {
            // a can stands flat topped on the water, which is one of the two marks a channel is buoyed with
            const top = 1.05 * U,
                half = 0.62 * U;
            pen.path(
                g,
                `M${cx - half} ${sea - 0.1 * U}L${cx - half} ${top}L${cx + half} ${top}L${cx + half} ${sea - 0.1 * U}Q${cx} ${sea + 0.12 * U} ${cx - half} ${sea - 0.1 * U}Z`,
                "pencil",
                pen.fill("berry"),
                calm(c, 1.6),
            );
            pen.ellipse(g, cx, top, half * 2, 0.34 * U, "pencil", pen.fill("berry"), calm(c, 1.3));
            for (let i = 0; i < n; i++)
                pen.line(
                    g,
                    cx - half * 0.94,
                    top + ((i + 1) / (n + 1)) * (sea - top),
                    cx + half * 0.94,
                    top + ((i + 1) / (n + 1)) * (sea - top),
                    "pencil",
                    { ...calm(c, 3), stroke: c.t.card },
                );
            a.top = [cx, top - 0.1 * U, "up"];
        } else {
            const top = 0.85 * U,
                half = 0.68 * U;
            pen.path(
                g,
                `M${cx - half} ${sea - 0.1 * U}L${cx} ${top}L${cx + half} ${sea - 0.1 * U}Q${cx} ${sea + 0.12 * U} ${cx - half} ${sea - 0.1 * U}Z`,
                "pencil",
                pen.fill("mint"),
                calm(c, 1.6),
            );
            for (let i = 0; i < n; i++) {
                const y = top + ((i + 1) / (n + 1)) * (sea - top),
                    wide = (half * (y - top)) / (sea - top);
                pen.line(g, cx - wide * 0.9, y, cx + wide * 0.9, y, "pencil", {
                    ...calm(c, 3),
                    stroke: c.t.card,
                });
            }
            a.top = [cx, top - 0.1 * U, "up"];
        }
        a.sea = [cx, sea, "down"];
        return a;
    },
    describe: (p) =>
        p.kind === "bell"
            ? `A bell buoy riding at sea, a round red float half under the water with white bands round it, three legs holding a bell${p.light > 0 ? ", and a light on its cap" : ""}.`
            : p.kind === "can"
              ? "A red can buoy riding at sea, flat topped, with a white band round it, marking one side of the way through."
              : "A green cone buoy riding at sea, pointed on top, with a white band round it, marking the other side of the way through.",
    motion: {
        body: { is: "float", lift: 8, dx: 0, deg: 5, pivot: [0.5, 0.85], period: 6.4, units: true },
    },
});
