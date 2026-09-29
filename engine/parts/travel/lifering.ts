import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

export const lifeRing = defineDrawing({
    id: "lifering",
    family: "travel",
    title: "Life ring",
    group: "Props",
    about: "A round life ring for throwing to someone in the water, orange with four white bands and a short tail of rope, drawn flat as it floats or flies.",
    params: { bands: 4 },
    settings: { bands: { kind: "whole", min: 2, max: 6 } },
    takes: [
        { label: "Four bands", params: { bands: 4 } },
        { label: "Six bands", params: { bands: 6 } },
    ],
    box: () => ({ w: 1, h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            cx = 0.5 * U,
            cy = 0.5 * U;
        pen.circle(g, cx, cy, 0.86 * U, "pencil", pen.fill("tang"), { strokeWidth: 1.5 });
        const n = Math.max(2, Math.min(6, Math.round(p.bands)));
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            pen.line(
                g,
                cx + Math.cos(a) * 0.2 * U,
                cy + Math.sin(a) * 0.2 * U,
                cx + Math.cos(a) * 0.42 * U,
                cy + Math.sin(a) * 0.42 * U,
                "ruler",
                { strokeWidth: 3, stroke: c.t.card, ...FIRM },
            );
        }
        pen.circle(g, cx, cy, 0.36 * U, "ruler", pen.fill("paper"), { strokeWidth: 1.2, ...FIRM });
        return { middle: [cx, cy, "up"] };
    },
    describe: (p) =>
        `A round orange life ring with ${Math.max(2, Math.min(6, Math.round(p.bands)))} white bands, the kind thrown on a rope to someone in the water so they can hold on.`,
});
