import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { clamp, halo } from "./nature";

export const glowworms = defineDrawing({
    id: "glowworms",
    family: "animals",
    title: "Glow-worms",
    group: "Characters",
    about: "Glow-worms on the roof of a cave, each with its small blue-green light and its threads of silk hanging below it, beaded with sticky drops. In the dark a roof of them looks like a sky full of stars, and their threads can be counted.",
    params: { worms: 6 },
    settings: { worms: { kind: "whole", min: 1, max: 10 } },
    takes: [
        { label: "Six", params: { worms: 6 } },
        { label: "Ten", params: { worms: 10 } },
    ],
    box: () => ({ w: 10, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.worms, 1, 10),
            a: RawAnchors = {};
        pen.path(
            g,
            `M0 0H${10 * U}V${0.8 * U}Q${7.5 * U} ${1.25 * U} ${5 * U} ${0.9 * U}Q${2.5 * U} ${1.2 * U} 0 ${0.85 * U}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.6 },
        );
        for (let i = 0; i < n; i++) {
            const x = ((i + 0.5) * 10 * U) / n,
                y = (1.2 + (i % 3) * 0.12) * U;
            for (const [dx, len] of [
                [-0.18, 2.4 + (i % 2) * 1.6],
                [0.02, 3.2 + ((i + 1) % 3) * 0.7],
                [0.2, 1.8 + (i % 3) * 0.6],
            ] as const) {
                const x0 = x + dx * U,
                    y1 = y + len * U;
                pen.line(g, x0, y, x0 + dx * 4, y1, "ruler", {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
                for (let k = 1; k * 0.5 * U < len * U; k++)
                    pen.circle(
                        g,
                        x0 + (dx * 4 * k * 0.5) / len,
                        y + k * 0.5 * U,
                        3.4,
                        "ruler",
                        pen.fill("card"),
                        { strokeWidth: 0.7, stroke: c.t.sky },
                    );
            }
            halo(c, x, y, 0.75 * U, c.t.mint, 0.45);
            pen.ellipse(g, x, y, 0.62 * U, 0.3 * U, "pencil", pen.fill("mint"), { strokeWidth: 1 });
            a[`worm(${i})`] = [x, y, "up"];
        }
        return a;
    },
    describe: () =>
        "Glow-worms on the roof of a cave, each a small green light with threads of silk hanging below it beaded with drops.",
});
