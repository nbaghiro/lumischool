import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { blade, clamp } from "../animals/nature";

export const palms = defineDrawing({
    id: "palms",
    family: "outdoors",
    title: "Palm trees",
    group: "Props",
    about: "Palm trees with ringed, leaning trunks, a crown of long leaves and coconuts under the leaves. A horizon for an island, and coconuts to count.",
    params: { count: 2, coconuts: 3 },
    settings: {
        count: { kind: "whole", min: 1, max: 4 },
        coconuts: { kind: "whole", min: 0, max: 5 },
    },
    takes: [
        { label: "Two palms, three coconuts", params: { count: 2, coconuts: 3 } },
        { label: "Three palms, five coconuts", params: { count: 3, coconuts: 5 } },
    ],
    box: (p) => ({ w: clamp(p.count, 1, 4) * 5 + 2, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.count, 1, 4),
            nuts = clamp(p.coconuts, 0, 5),
            base = 10.6 * U,
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const bx = (2.6 + i * 5) * U,
                lean = (i % 2 ? -1 : 1) * 0.9 * U,
                tx = bx + lean,
                ty = 3.2 * U;
            const segs = 7;
            for (let k = 0; k < segs; k++) {
                const t0 = k / segs,
                    t1 = (k + 1) / segs,
                    bend = (t: number) => bx + lean * t * t;
                const y0 = base - (base - ty) * t0,
                    y1 = base - (base - ty) * t1,
                    w0 = 13 - 5 * t0,
                    w1 = 13 - 5 * t1;
                pen.polygon(
                    g,
                    [
                        [bend(t0) - w0, y0],
                        [bend(t0) + w0, y0],
                        [bend(t1) + w1, y1],
                        [bend(t1) - w1, y1],
                    ],
                    "pencil",
                    pen.fill("tang"),
                    { strokeWidth: 1.3 },
                );
            }
            for (let k = 0; k < nuts; k++)
                pen.circle(
                    g,
                    tx - 12 + k * 8,
                    ty + 12 + (k % 2) * 6,
                    14,
                    "pencil",
                    pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                    { strokeWidth: 1.2 },
                );
            for (const [ang, len] of [
                [-2.7, 2.9],
                [-2.2, 3.1],
                [-1.7, 2.4],
                [-1.2, 2.6],
                [-0.7, 3.2],
                [-0.25, 2.8],
                [3.4, 2.4],
            ] as const) {
                pen.polygon(g, blade(tx, ty, len * U, 22, ang), "pencil", pen.fill("mint"), {
                    strokeWidth: 1.5,
                });
            }
            a[`palm(${i})`] = [tx, ty - 1.2 * U, "up"];
        }
        pen.line(g, 0.2 * U, base, (n * 5 + 1.8) * U, base, "pencil", { strokeWidth: 2 });
        return a;
    },
    describe: () =>
        "Palm trees with ringed leaning trunks, a crown of long green leaves and coconuts hanging under the leaves, standing on a line of ground.",
});
