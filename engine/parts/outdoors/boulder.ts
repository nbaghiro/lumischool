import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

export const boulder = defineDrawing({
    id: "boulder",
    family: "outdoors",
    title: "Boulder in a river",
    group: "Props",
    about: "A rounded boulder sticking up out of a river, seen from above, with a pale top where the light falls and a ring of ripples round it where the water parts. Its size in squares is a setting.",
    params: { size: 2 },
    settings: { size: { kind: "whole", min: 1, max: 5 } },
    takes: [
        { label: "Two squares across", params: { size: 2 } },
        { label: "A big one", params: { size: 4 } },
    ],
    box: (p) => {
        const n = whole(p.size, 1, 5, 2);
        return { w: n, h: n };
    },
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            n = whole(p.size, 1, 5, 2) * U,
            m = n / 2;
        pen.ellipse(g, m, m, n * 0.94, n * 0.9, "ruler", null, {
            strokeWidth: 0.9,
            stroke: c.t.sky,
            disableMultiStroke: true,
        });
        const pts: [number, number][] = Array.from({ length: 9 }, (_, i) => {
            const a = (i / 9) * Math.PI * 2,
                r = n * (0.36 + 0.05 * Math.sin(i * 2.3));
            return [m + Math.cos(a) * r, m + Math.sin(a) * r * 0.92];
        });
        pen.polygon(g, pts, "ruler", pen.fill("ink-soft", "hachure", { hachureGap: 4 }), {
            strokeWidth: 1.7,
            disableMultiStroke: true,
            preserveVertices: true,
        });
        pen.ellipse(g, m - n * 0.08, m - n * 0.1, n * 0.36, n * 0.26, "ruler", pen.fill("card"), {
            strokeWidth: 0.9,
            disableMultiStroke: true,
        });
        return { centre: [m, m, "up"] };
    },
    describe: () =>
        "A rounded grey boulder sticking up out of a river, seen from above, with a pale top where the light falls and ripples round it.",
    motion: { still: "A boulder in a river stays where it is while the water goes round it." },
});
