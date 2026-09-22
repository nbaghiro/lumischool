import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { clamp } from "../animals/nature";

export const toadstools = defineDrawing({
    id: "toadstools",
    family: "outdoors",
    title: "Toadstools",
    group: "Props",
    about: "Red toadstools with white spots, a big one and a small one side by side in the grass, with the gills showing under each cap. Pretty to look at and not to eat, and their spots are there to be counted.",
    params: { count: 2, spots: 5 },
    settings: {
        count: { kind: "whole", min: 1, max: 3 },
        spots: { kind: "whole", min: 0, max: 9 },
    },
    takes: [
        { label: "Two, five spots", params: { count: 2, spots: 5 } },
        { label: "Three, seven spots", params: { count: 3, spots: 7 } },
        { label: "One, three spots", params: { count: 1, spots: 3 } },
    ],
    box: (p) => ({ w: clamp(p.count, 1, 3) * 5 + 1, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.count, 1, 3),
            dots = clamp(p.spots, 0, 9),
            base = 6.6 * U,
            a: RawAnchors = {};
        const SIZE = [1, 0.72, 0.86],
            SPOT: [number, number][] = [
                [0, -0.72],
                [-0.55, -0.45],
                [0.55, -0.5],
                [-0.25, -0.25],
                [0.3, -0.2],
                [-0.8, -0.15],
                [0.82, -0.18],
                [0.05, -0.45],
                [-0.45, -0.72],
            ];
        for (let i = 0; i < n; i++) {
            const k = SIZE[i] ?? 1,
                cx = (2.9 + i * 5) * U,
                capY = base - 3.3 * U * k,
                rw = 2.2 * U * k,
                rh = 2.5 * U * k;
            pen.path(
                g,
                `M${cx - 0.5 * U * k} ${base}Q${cx - 0.35 * U * k} ${capY + 1.2 * U * k} ${cx - 0.42 * U * k} ${capY}L${cx + 0.42 * U * k} ${capY}Q${cx + 0.3 * U * k} ${capY + 1.2 * U * k} ${cx + 0.55 * U * k} ${base}Z`,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.5 },
            );
            pen.path(
                g,
                `M${cx - 0.6 * U * k} ${capY + 1 * U * k}Q${cx} ${capY + 1.5 * U * k} ${cx + 0.6 * U * k} ${capY + 1 * U * k}L${cx + 0.45 * U * k} ${capY + 0.8 * U * k}L${cx - 0.45 * U * k} ${capY + 0.8 * U * k}Z`,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.1 },
            );
            pen.ellipse(g, cx, capY, rw * 2, 0.8 * U * k, "pencil", pen.fill("card"), {
                strokeWidth: 1.2,
            });
            for (let q = -4; q <= 4; q++)
                pen.line(
                    g,
                    cx,
                    capY + 0.1 * U * k,
                    cx + (q / 4) * rw * 0.92,
                    capY + 0.05 * U * k,
                    "pencil",
                    { strokeWidth: 0.7, stroke: c.t["ink-soft"] },
                );
            pen.path(
                g,
                `M${cx - rw} ${capY}C${cx - rw} ${capY - rh * 1.25} ${cx + rw} ${capY - rh * 1.25} ${cx + rw} ${capY}Q${cx} ${capY + 0.5 * U * k} ${cx - rw} ${capY}Z`,
                "pencil",
                pen.fill("berry"),
                { strokeWidth: 1.9 },
            );
            for (let q = 0; q < dots; q++)
                pen.circle(
                    g,
                    cx + (SPOT[q] ?? [0, 0])[0] * rw,
                    capY + (SPOT[q] ?? [0, 0])[1] * rh,
                    (0.5 - Math.abs((SPOT[q] ?? [0, 0])[1]) * 0.15) * U * k,
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 0.9 },
                );
            for (const dx of [-0.9, -0.6, 0.7, 1])
                pen.line(
                    g,
                    cx + dx * U * k,
                    base,
                    cx + (dx + 0.12) * U * k,
                    base - 0.6 * U,
                    "pencil",
                    { strokeWidth: 1.1, stroke: c.t.ok },
                );
            a[`cap(${i})`] = [cx, capY - rh * 0.95, "up"];
        }
        pen.line(g, 0.3 * U, base, (n * 5 + 0.7) * U, base, "pencil", { strokeWidth: 1.4 });
        return a;
    },
    describe: () =>
        "Red toadstools with white spots in the grass, side by side and different sizes, each with a white stalk and gills under its cap.",
});
