import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

export const balloon = defineDrawing({
    id: "balloon",
    family: "travel",
    title: "Hot-air balloon",
    group: "Props",
    about: "A hot-air balloon with its envelope in coloured panels, a burner under it and a basket hung with sandbags. The panels and the bags can be counted, and a balloon rises when a bag is let go, which is where a question about weight can start.",
    params: { panels: 6, bags: 3 },
    settings: {
        panels: { kind: "whole", min: 3, max: 8 },
        bags: { kind: "whole", min: 0, max: 4 },
    },
    takes: [
        { label: "Six panels, three bags", params: { panels: 6, bags: 3 } },
        { label: "Eight panels, one bag", params: { panels: 8, bags: 1 } },
    ],
    box: () => ({ w: 6, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(3, Math.min(8, Math.round(p.panels))),
            bags = Math.max(0, Math.min(4, Math.round(p.bags)));
        const cx = 3 * U,
            top = 0.35 * U,
            r = 2.55 * U,
            cy = top + r,
            neck = 6.1 * U,
            nw = 0.75 * U,
            a: RawAnchors = {};
        // a seam runs from the crown, out round the widest part and in to the neck, as a curve with two handles
        const seam = (t: number, s: number): Pt => {
            const w = t * 2 - 1,
                u = 1 - s,
                k0 = u * u * u,
                k1 = 3 * u * u * s,
                k2 = 3 * u * s * s,
                k3 = s * s * s;
            return [
                k0 * cx + k1 * (cx + w * r * 1.3) + k2 * (cx + w * r * 1.25) + k3 * (cx + w * nw),
                k0 * top + k1 * top + k2 * (cy + 0.9 * r) + k3 * neck,
            ];
        };
        const COLOURS = ["berry", "glow", "sky"] as const;
        for (let i = 0; i < n; i++) {
            const left: Pt[] = [],
                right: Pt[] = [];
            for (let k = 0; k <= 12; k++) {
                left.push(seam(i / n, k / 12));
                right.push(seam((i + 1) / n, k / 12));
            }
            pen.polygon(g, [...left, ...right.reverse()], "pencil", pen.fill(COLOURS[i % 3]), {
                strokeWidth: 1.4,
            });
        }
        for (const s of [-1, 1])
            pen.line(g, cx + s * nw, neck, cx + s * 0.75 * U, 7.35 * U, "pencil", {
                strokeWidth: 1.1,
            });
        pen.rect(g, cx - 0.3 * U, 6.25 * U, 0.6 * U, 0.4 * U, "pencil", pen.fill("ink-soft"), {
            strokeWidth: 1,
        });
        pen.rect(
            g,
            cx - 0.9 * U,
            7.35 * U,
            1.8 * U,
            1.25 * U,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 3.5 }),
            { strokeWidth: 1.8 },
        );
        pen.line(g, cx - 0.9 * U, 7.8 * U, cx + 0.9 * U, 7.8 * U, "pencil", { strokeWidth: 0.9 });
        for (let i = 0; i < bags; i++) {
            const x = cx - 0.9 * U + (i + 0.5) * ((1.8 * U) / Math.max(1, bags)),
                y = 8.6 * U;
            pen.line(g, x, y - 0.1 * U, x, y + 0.05 * U, "pencil", { strokeWidth: 1 });
            pen.ellipse(g, x, y + 0.2 * U, 0.34 * U, 0.32 * U, "pencil", pen.fill("card"), {
                strokeWidth: 1,
            });
            a[`bag(${i})`] = [x, y + 0.3 * U, "down"];
        }
        a.top = [cx, top, "up"];
        a.basket = [cx, 7.35 * U, "left"];
        return a;
    },
    describe: (p) =>
        `A hot-air balloon with its envelope in pink, yellow and blue panels, a burner under the neck and a basket hanging below${p.bags > 0 ? " with sandbags on it" : ""}.`,
});
