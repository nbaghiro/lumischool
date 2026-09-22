import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { clamp, eye } from "./nature";

export const heron = defineDrawing({
    id: "heron",
    family: "animals",
    title: "Heron",
    group: "Characters",
    about: "A grey heron standing still on its long legs in shallow water, its neck folded back and its beak like a dagger, with bulrushes beside it. The bird that waits: its legs are longer than its body, which is a comparison to make before a measurement.",
    params: { facing: 1, reeds: 3 },
    settings: { facing: { kind: "one of", of: [1, -1] }, reeds: { kind: "whole", min: 0, max: 5 } },
    takes: [
        { label: "Facing right", params: { facing: 1, reeds: 3 } },
        { label: "Facing left, in the reeds", params: { facing: -1, reeds: 5 } },
    ],
    box: () => ({ w: 6, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = p.facing < 0 ? -1 : 1,
            n = clamp(p.reeds, 0, 5),
            water = 7.3 * U,
            body = 3.9 * U;
        const X = (x: number) => (s > 0 ? x : 6 * U - x);
        const grey = pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
            white = pen.fill("card");
        for (let i = 0; i < n; i++) {
            const x = X((0.5 + i * 0.45) * U),
                h = (3.2 + (i % 2) * 1.1) * U;
            pen.line(g, x, water, x + s * 0.1 * U, water - h, "pencil", {
                strokeWidth: 1.3,
                stroke: c.t["ink-soft"],
            });
            pen.ellipse(
                g,
                x + s * 0.1 * U,
                water - h + 0.4 * U,
                0.3 * U,
                0.8 * U,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1 },
            );
        }
        for (const dx of [2.6, 3.3])
            pen.line(g, X(dx * U), body + 0.6 * U, X((dx + 0.05) * U), water, "pencil", {
                strokeWidth: 1.7,
                stroke: c.t.tang,
            });
        pen.ellipse(g, X(3 * U), body, 2.6 * U, 1.3 * U, "pencil", white, { strokeWidth: 1.8 });
        pen.polygon(
            g,
            [
                [X(1.7 * U), body - 0.1 * U],
                [X(3.6 * U), body - 0.5 * U],
                [X(3.4 * U), body + 0.5 * U],
                [X(1.2 * U), body + 0.6 * U],
            ],
            "pencil",
            grey,
            { strokeWidth: 1.5 },
        );
        // the neck folds back into an S and comes forward again to the head
        pen.curve(
            g,
            [
                [X(3.7 * U), body - 0.4 * U],
                [X(4.1 * U), body - 1.3 * U],
                [X(3.5 * U), body - 2 * U],
                [X(3.9 * U), 1.45 * U],
            ],
            "pencil",
            { strokeWidth: 5.5 },
        );
        pen.curve(
            g,
            [
                [X(3.7 * U), body - 0.4 * U],
                [X(4.1 * U), body - 1.3 * U],
                [X(3.5 * U), body - 2 * U],
                [X(3.9 * U), 1.45 * U],
            ],
            "pencil",
            { strokeWidth: 3, stroke: c.t.card },
        );
        pen.circle(g, X(4 * U), 1.3 * U, 0.75 * U, "pencil", white, { strokeWidth: 1.5 });
        pen.polygon(
            g,
            [
                [X(4.3 * U), 1.2 * U],
                [X(5.8 * U), 1.4 * U],
                [X(4.3 * U), 1.55 * U],
            ],
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.1 },
        );
        pen.line(g, X(3.8 * U), 1.05 * U, X(2.9 * U), 0.8 * U, "pencil", { strokeWidth: 2 });
        eye(c, X(4.15 * U), 1.22 * U, 4);
        for (let x = 0.3 * U; x < 5.8 * U; x += 1.3 * U)
            pen.curve(
                g,
                [
                    [x, water],
                    [x + 0.32 * U, water - 0.18 * U],
                    [x + 0.64 * U, water],
                ],
                "pencil",
                { strokeWidth: 1.2 },
            );
        return {
            beak: [X(5.8 * U), 1.4 * U, s > 0 ? "right" : "left"],
            head: [X(4 * U), 0.9 * U, "up"],
            feet: [X(3 * U), water, "down"],
        };
    },
    describe: (p) =>
        `A grey heron standing on long legs in shallow water with its neck folded back and a dagger of a yellow beak${clamp(p.reeds, 0, 5) > 0 ? ", with bulrushes beside it" : ""}.`,
    motion: {
        body: { is: "float", lift: 0, dx: 3, deg: 2, pivot: [0.5, 1], period: 8.4, units: true },
    },
});
