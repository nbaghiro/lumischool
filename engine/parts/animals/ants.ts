import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { ring, blade, clamp } from "./nature";

export const ants = defineDrawing({
    id: "ants",
    family: "animals",
    title: "Ants",
    group: "Characters",
    about: "A line of ants walking one behind another, each with six legs, two feelers and a body in three parts, most of them carrying a crumb or a bit of leaf home. Six legs to an ant, so a line of ants is counting in sixes.",
    params: { count: 5, carry: 1 },
    settings: {
        count: { kind: "whole", min: 1, max: 10 },
        carry: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Five, carrying", params: { count: 5, carry: 1 } },
        { label: "Three, empty-handed", params: { count: 3, carry: 0 } },
    ],
    box: (p) => ({ w: Math.ceil(clamp(p.count, 1, 10) * 2.4) + 1, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.count, 1, 10),
            base = 2.7 * U,
            dark = pen.fill("ink-soft", "hachure", { hachureGap: 2.2 }),
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const x = (1.5 + i * 2.4) * U,
                y = 1.9 * U;
            for (const [dx, reach] of [
                [-0.25, -0.75],
                [0, -0.1],
                [0.2, 0.55],
            ] as const)
                for (const far of [0, 1]) {
                    const kx = x + dx * U + (far ? 3 : -2),
                        ky = y - 0.35 * U;
                    pen.linear(
                        g,
                        [
                            [x + dx * U, y],
                            [kx + reach * 0.3 * U, ky],
                            [x + (dx + reach) * U + (far ? 4 : 0), base],
                        ],
                        "pencil",
                        { strokeWidth: far ? 0.9 : 1.2, stroke: far ? c.t["ink-soft"] : c.t.ink },
                    );
                }
            pen.ellipse(g, x - 0.72 * U, y + 0.05 * U, 1.05 * U, 0.72 * U, "pencil", dark, {
                strokeWidth: 1.3,
            });
            pen.ellipse(g, x, y - 0.05 * U, 0.62 * U, 0.38 * U, "pencil", dark, {
                strokeWidth: 1.2,
            });
            pen.circle(g, x + 0.55 * U, y - 0.2 * U, 0.52 * U, "pencil", dark, {
                strokeWidth: 1.2,
            });
            pen.linear(
                g,
                [
                    [x + 0.65 * U, y - 0.42 * U],
                    [x + 0.8 * U, y - 0.95 * U],
                    [x + 1.12 * U, y - 0.9 * U],
                ],
                "pencil",
                { strokeWidth: 0.9 },
            );
            pen.linear(
                g,
                [
                    [x + 0.55 * U, y - 0.45 * U],
                    [x + 0.55 * U, y - 1 * U],
                    [x + 0.85 * U, y - 1.12 * U],
                ],
                "pencil",
                { strokeWidth: 0.9 },
            );
            if (p.carry > 0 && i % 3 !== 2) {
                if (i % 2)
                    pen.polygon(
                        g,
                        blade(x + 0.85 * U, y - 0.1 * U, 1 * U, 0.55 * U, -1.1),
                        "pencil",
                        pen.fill("mint"),
                        { strokeWidth: 1 },
                    );
                else
                    pen.path(
                        g,
                        ring([
                            [x + 0.8 * U, y - 0.55 * U],
                            [x + 1.15 * U, y - 0.9 * U],
                            [x + 1.45 * U, y - 0.7 * U],
                            [x + 1.35 * U, y - 0.35 * U],
                            [x + 1 * U, y - 0.3 * U],
                        ]),
                        "pencil",
                        pen.fill("glow"),
                        { strokeWidth: 1 },
                    );
            }
            a[`ant(${i})`] = [x, y - 0.6 * U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A line of ants walking one behind another, each with a body in three parts, legs either side and two feelers${p.carry > 0 ? ", most carrying a crumb or a leaf" : ""}.`,
});
