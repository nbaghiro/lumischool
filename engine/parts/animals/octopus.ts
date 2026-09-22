import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, ring, clamp, eye, tapered, spline } from "./nature";

const scaled = (pts: [number, number][], x0 = 0, y0 = 0, k = U): Pt[] =>
    pts.map(([x, y]) => [x0 + x * k, y0 + y * k]);

export const octopus = defineDrawing({
    id: "octopus",
    family: "animals",
    title: "Octopus",
    group: "Characters",
    about: "An octopus sitting on the sea floor with its eight arms curling out round it, suckers along each arm and big eyes under a round head. Eight arms, two eyes and three hearts: a creature made for counting, and one that can change its colour to match the rock.",
    params: { spots: 4 },
    settings: { spots: { kind: "whole", min: 0, max: 8 } },
    takes: [
        { label: "Four spots", params: { spots: 4 } },
        { label: "Seven spots", params: { spots: 7 } },
    ],
    box: () => ({ w: 10, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.spots, 0, 8),
            a: RawAnchors = {};
        const ARMS: [number, number][][] = [
            [
                [4, 3.9],
                [2.7, 4.5],
                [1.3, 4.3],
                [0.6, 3.5],
                [1, 3],
            ],
            [
                [6, 3.9],
                [7.4, 4.3],
                [8.8, 4],
                [9.4, 3.2],
                [9, 2.7],
            ],
            [
                [4.2, 4.2],
                [3.1, 5.5],
                [1.7, 6.5],
                [1.1, 6],
                [1.4, 5.5],
            ],
            [
                [5.8, 4.2],
                [7, 5.4],
                [8.4, 6.2],
                [9, 5.6],
                [8.6, 5.2],
            ],
            [
                [4.5, 4.4],
                [4, 6.1],
                [3.3, 7.3],
                [2.6, 7.1],
                [2.9, 6.7],
            ],
            [
                [5.5, 4.4],
                [6.2, 6.1],
                [7, 7.2],
                [7.6, 6.9],
                [7.3, 6.5],
            ],
            [
                [4.8, 4.5],
                [4.7, 6.3],
                [4.5, 7.5],
                [4, 7.6],
            ],
            [
                [5.2, 4.5],
                [5.4, 6.4],
                [5.7, 7.5],
                [6.2, 7.5],
            ],
        ];
        for (const [i, arm] of ARMS.entries()) {
            const line = spline(scaled(arm), 5);
            pen.polygon(g, tapered(line, 0.8 * U, 0.14 * U), "pencil", pen.fill("berry"), {
                strokeWidth: 1.4,
            });
            // suckers along the underside of the arms that face the child
            if (i >= 2)
                for (let k = 3; k < line.length - 5; k += 3)
                    pen.circle(
                        g,
                        (line[k] ?? [0, 0])[0],
                        (line[k] ?? [0, 0])[1] + 2,
                        5 - k * 0.12,
                        "ruler",
                        pen.fill("card"),
                        { strokeWidth: 0.7 },
                    );
            a[`arm(${i})`] = [
                (line[line.length - 1] ?? [0, 0])[0],
                (line[line.length - 1] ?? [0, 0])[1],
                "down",
            ];
        }
        const cx = 5 * U,
            cy = 2.3 * U;
        pen.path(
            g,
            ring([
                [cx, cy - 2.1 * U],
                [cx + 1.5 * U, cy - 1.5 * U],
                [cx + 1.85 * U, cy + 0.2 * U],
                [cx + 1.3 * U, cy + 1.75 * U],
                [cx, cy + 2.05 * U],
                [cx - 1.3 * U, cy + 1.75 * U],
                [cx - 1.85 * U, cy + 0.2 * U],
                [cx - 1.5 * U, cy - 1.5 * U],
            ]),
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 2 },
        );
        const SPOTS: [number, number][] = [
            [-0.7, -1.2],
            [0.5, -1.45],
            [0.95, -0.55],
            [-1.05, -0.3],
            [0.15, -0.6],
            [-0.35, 0.3],
            [1.2, 0.35],
            [-0.05, -1.75],
        ];
        for (let i = 0; i < n; i++)
            pen.circle(
                g,
                cx + (SPOTS[i] ?? [0, 0])[0] * U,
                cy + (SPOTS[i] ?? [0, 0])[1] * U,
                0.34 * U,
                "ruler",
                pen.fill("tang"),
                { strokeWidth: 0.9 },
            );
        for (const sx of [-1, 1]) {
            pen.ellipse(
                g,
                cx + sx * 0.72 * U,
                cy + 1.05 * U,
                0.82 * U,
                0.9 * U,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.4 },
            );
            eye(c, cx + sx * 0.66 * U, cy + 1.15 * U, 6.5);
        }
        pen.arc(g, cx, cy + 1.55 * U, 0.5 * U, 0.3 * U, 0.3, Math.PI - 0.3, "pencil", {
            strokeWidth: 1.2,
        });
        a.head = [cx, cy - 2.1 * U, "up"];
        return a;
    },
    describe: (p) =>
        `An octopus sitting on the sea floor with its arms curling out round it, suckers along the arms, big eyes and a round pink head${clamp(p.spots, 0, 8) > 0 ? " with orange spots" : ""}.`,
});
