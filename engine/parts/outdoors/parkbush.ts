import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const whole = (v: number) => Math.max(2, Math.min(6, Math.round(v)));

export const parkBush = defineDrawing<{ w: number }>({
    id: "parkbush",
    family: "outdoors",
    title: "Bush",
    group: "Props",
    about: "A round leafy bush in a park, thick enough for a thrown ball to get caught in it, with a few red berries showing among the leaves.",
    params: { w: 3 },
    settings: { w: { kind: "whole", min: 2, max: 6 } },
    takes: [
        { label: "A small bush", params: { w: 2 } },
        { label: "A wide bush", params: { w: 4 } },
    ],
    box: (p) => ({ w: whole(p.w), h: Math.ceil(whole(p.w) * 0.75) }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = whole(p.w),
            h = Math.ceil(w * 0.75),
            leaf = pen.fill("mint");
        // clumps of leaves a little inside the box, so their rough edges stay within it
        const n = w + 1,
            r = Math.min(0.62, w / (n + 1)) * U;
        for (let i = 0; i < n; i++) {
            const u = (i + 0.5) / n,
                x = (0.18 + u * 0.64) * w * U,
                y = h * U - r - 0.15 * U - Math.sin(u * Math.PI) * (h * U - 2 * r - 0.35 * U);
            pen.circle(g, x, y, r * 2, "pencil", leaf, { strokeWidth: 1.4 });
        }
        pen.ellipse(g, (w / 2) * U, h * U - r - 0.1 * U, w * 0.7 * U, r * 2, "pencil", leaf, {
            strokeWidth: 1.4,
        });
        for (let i = 0; i < w; i++)
            pen.circle(
                g,
                ((i + 0.7) / (w + 0.4)) * w * U,
                h * U - r - (i % 2) * 0.4 * U,
                0.22 * U,
                "ruler",
                pen.fill("berry"),
                { strokeWidth: 0.8 },
            );
        return { top: [(w / 2) * U, 0.2 * U, "up"] };
    },
    describe: () =>
        "A round leafy green bush seen from the side, made of overlapping clumps of leaves, with a few small red berries among them.",
});
