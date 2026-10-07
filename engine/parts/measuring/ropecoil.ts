import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const ropeCoil = defineDrawing<{ knots: number }>({
    id: "ropecoil",
    family: "measuring",
    title: "Measuring rope",
    group: "Props",
    about: "A coil of rope seen from above with a knot tied in it at every square of its length and a loose end hanging free, the old way of measuring out a distance by counting knots.",
    params: { knots: 6 },
    settings: { knots: { kind: "whole", min: 3, max: 10 } },
    takes: [
        { label: "Six knots", params: { knots: 6 } },
        { label: "Ten knots", params: { knots: 10 } },
    ],
    box: () => ({ w: 3, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const n = Math.max(3, Math.min(10, Math.round(p.knots)));
        const cx = 1.4 * U,
            cy = 1.4 * U;
        for (const r of [1.1, 0.8, 0.5])
            pen.circle(g, cx, cy, r * 2 * U, "pencil", null, {
                strokeWidth: 2.6,
                stroke: c.paper ? c.t.ink : c.t.tang,
                roughness: 0.5,
            });
        for (let k = 0; k < n; k++) {
            const t = (k / n) * Math.PI * 2,
                r = [1.1, 0.8, 0.5][k % 3] ?? 0.8;
            pen.circle(
                g,
                cx + Math.cos(t) * r * U,
                cy + Math.sin(t) * r * U,
                0.26 * U,
                "ruler",
                pen.fill("ink-soft", "solid"),
                {
                    strokeWidth: 0.8,
                },
            );
        }
        pen.path(
            g,
            `M${cx + 1.1 * U} ${cy}Q${cx + 1.4 * U} ${cy + 0.6 * U} ${cx + 1.2 * U} ${cy + 1.3 * U}`,
            "pencil",
            null,
            {
                strokeWidth: 2.6,
                stroke: c.paper ? c.t.ink : c.t.tang,
            },
        );
        a.end = [cx + 1.2 * U, cy + 1.3 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A coil of rope seen from above with ${Math.max(3, Math.min(10, Math.round(p.knots)))} knots tied along it, one at every square, for measuring a distance by counting knots.`,
});
