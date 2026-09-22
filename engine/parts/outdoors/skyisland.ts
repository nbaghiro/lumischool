import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, ring, lumps, clamp } from "../animals/nature";

export const skyIsland = defineDrawing({
    id: "skyisland",
    family: "outdoors",
    title: "Island in the sky",
    group: "Props",
    about: "A small island floating in the sky: grass and flowers on top, trees, and underneath a point of layered rock with roots hanging out of it and a waterfall pouring off its edge into the clouds. The layers of its rock can be counted like a cliff's.",
    params: { trees: 2, falls: 1 },
    settings: {
        trees: { kind: "whole", min: 0, max: 3 },
        falls: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Two trees and a waterfall", params: { trees: 2, falls: 1 } },
        { label: "One tree, no waterfall", params: { trees: 1, falls: 0 } },
        { label: "Bare, with a waterfall", params: { trees: 0, falls: 1 } },
    ],
    box: () => ({ w: 16, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.trees, 0, 3),
            top = 3.7 * U,
            x0 = 1.3 * U,
            x1 = 15.1 * U,
            a: RawAnchors = {};
        // the rock underneath: a round belly with a few points hanging from it, in layers like a cliff's
        const bottom = (x: number): number => {
            const u = (x - x0) / (x1 - x0);
            if (u <= 0 || u >= 1) return top;
            let d = Math.sin(Math.PI * u) ** 0.75 * 4.1 * U;
            for (const [c0, h] of [
                [0.34, 1.3],
                [0.53, 2.3],
                [0.7, 1.1],
            ] as const)
                d += h * U * Math.exp(-(((u - c0) / 0.055) ** 2));
            return top + d + Math.sin(u * 41) * 3;
        };
        const xs: number[] = [];
        for (let x = x0; x <= x1 + 0.1; x += (x1 - x0) / 60) xs.push(x);
        const band = (k: number) => (x: number) =>
            top + 0.25 * U + k * 1.15 * U + Math.sin((x / U) * 0.9 + k * 2) * 0.18 * U;
        pen.polygon(
            g,
            [
                ...xs.map((x) => [x, top] as Pt),
                ...xs
                    .slice()
                    .reverse()
                    .map((x) => [x, bottom(x)] as Pt),
            ],
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 3.8 }),
            { strokeWidth: 1.9 },
        );
        const LAYERS = [
            pen.fill("glow", "hachure", { hachureGap: 4.5 }),
            pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
            pen.fill("tang", "cross-hatch", { hachureGap: 6 }),
        ];
        for (let k = 0; k < 3; k++) {
            const a0 = band(k + 1),
                b0 = band(k + 2),
                live = xs.filter((x) => bottom(x) - a0(x) > 5);
            if (live.length < 3) continue;
            pen.polygon(
                g,
                [
                    ...live.map((x) => [x, a0(x)] as Pt),
                    ...live
                        .slice()
                        .reverse()
                        .map((x) => [x, Math.min(b0(x), bottom(x) - 2)] as Pt),
                ],
                "pencil",
                LAYERS[k],
                { strokeWidth: 1.1 },
            );
        }
        // roots hanging out of it
        for (const [x, len, curl] of [
            [3.4, 1.4, 1],
            [6.1, 1.5, -1],
            [9.7, 1.8, 1],
            [12.6, 1.2, -1],
            [11.2, 1.1, 1],
        ] as const) {
            const y = bottom(x * U) / U - 0.1;
            pen.curve(
                g,
                [
                    [x * U, y * U],
                    [(x + curl * 0.3) * U, (y + len * 0.5) * U],
                    [(x - curl * 0.1) * U, (y + len) * U],
                    [(x + curl * 0.25) * U, (y + len + 0.3) * U],
                ],
                "pencil",
                { strokeWidth: 1.1, stroke: c.t["ink-soft"] },
            );
        }
        if (p.falls > 0) {
            // a stream runs off the edge and falls into the cloud below, breaking into spray
            const fx = 1.9 * U;
            pen.path(
                g,
                `M${fx - 0.35 * U} ${top - 0.1 * U}Q${fx - 0.8 * U} ${top + 0.6 * U} ${fx - 0.6 * U} ${9.2 * U}L${fx + 0.35 * U} ${9.2 * U}Q${fx + 0.2 * U} ${top + 0.6 * U} ${fx + 0.45 * U} ${top - 0.1 * U}Z`,
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 1.2 },
            );
            for (const dx of [-0.25, 0.05, 0.25])
                pen.line(g, fx + dx * U, top + 0.4 * U, fx + (dx - 0.05) * U, 8.8 * U, "pencil", {
                    strokeWidth: 1.2,
                    stroke: c.t.card,
                });
            for (const [dx, dy, d] of [
                [-0.6, 9.6, 1.1],
                [0.3, 9.9, 1.3],
                [1.1, 9.5, 0.9],
                [-0.1, 10.4, 0.8],
            ] as const)
                pen.ellipse(
                    g,
                    fx + dx * U,
                    dy * U,
                    d * U * 1.3,
                    d * U,
                    "doodle",
                    pen.fill("card"),
                    { strokeWidth: 1.1 },
                );
            a.falls = [fx, 10.4 * U, "down"];
        }
        // the grass on top
        pen.ellipse(g, 8.2 * U, top, 14 * U, 1.5 * U, "pencil", pen.fill("mint"), {
            strokeWidth: 1.9,
        });
        for (let x = 1.6 * U; x < 14.8 * U; x += 0.7 * U) {
            const y = top + Math.sqrt(Math.max(0, 1 - ((x - 8.2 * U) / (7 * U)) ** 2)) * 0.75 * U;
            pen.line(g, x, y, x - 3, y - 7, "pencil", { strokeWidth: 1.1, stroke: c.t.ok });
            pen.line(g, x + 3, y, x + 6, y - 6, "pencil", { strokeWidth: 1.1, stroke: c.t.ok });
        }
        const TREES = [4.9, 11.3, 8.4];
        for (let i = 0; i < n; i++) {
            const x = (TREES[i] ?? 0) * U,
                k = i === 2 ? 0.8 : 1;
            pen.rect(
                g,
                x - 0.18 * U,
                top - 1.6 * U * k,
                0.36 * U,
                1.6 * U * k,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.2 },
            );
            pen.path(
                g,
                ring(
                    lumps(
                        x,
                        top - 2.5 * U * k,
                        1.25 * U * k,
                        1.1 * U * k,
                        [1, 0.88, 1.05, 0.9, 1.08, 0.86, 1, 0.92],
                    ),
                ),
                "pencil",
                pen.fill("mint"),
                { strokeWidth: 1.6 },
            );
            a[`tree(${i})`] = [x, top - 3.6 * U * k, "up"];
        }
        for (const [x, col] of [
            [3.1, "berry"],
            [6.6, "glow"],
            [9.8, "berry"],
            [13.1, "glow"],
            [7.6, "card"],
        ] as const)
            pen.circle(g, x * U, top - 0.15 * U, 6, "pencil", pen.fill(col), { strokeWidth: 0.8 });
        a.top = [8.2 * U, top - 0.8 * U, "up"];
        a.point = [x0 + (x1 - x0) * 0.53, bottom(x0 + (x1 - x0) * 0.53), "down"];
        return a;
    },
    describe: (p) =>
        `A small island floating in the sky with ${clamp(p.trees, 0, 3) > 0 ? "grass, flowers and trees" : "grass and flowers"} on top and layered rock underneath coming to a point${p.falls > 0 ? ", a waterfall pouring off its edge" : ", roots hanging out"}.`,
});
