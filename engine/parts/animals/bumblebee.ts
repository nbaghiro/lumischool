import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { blade } from "./nature";

export const bumblebee = defineDrawing({
    id: "bumblebee",
    family: "animals",
    title: "Bumblebee",
    group: "Characters",
    about: "A round furry bumblebee with yellow and black bands, a white tail, clear wings and a basket of pollen on each back leg. It visits flower after flower, and its six legs and four wings can be counted.",
    params: { facing: 1 },
    settings: { facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "Facing right", params: { facing: 1 } },
        { label: "Facing left", params: { facing: -1 } },
    ],
    box: () => ({ w: 7, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = p.facing < 0 ? -1 : 1,
            X = (x: number) => (s > 0 ? x : 7 * U - x),
            dark = pen.fill("ink-soft", "hachure", { hachureGap: 2 });
        for (const [x0, x1, pollen] of [
            [2.4, 2.1, 1],
            [3.6, 3.7, 0],
            [4.5, 4.9, 0],
        ] as const) {
            pen.linear(
                g,
                [
                    [X(x0 * U), 3.9 * U],
                    [X(((x0 + x1) / 2) * U), 4.8 * U],
                    [X(x1 * U), 5.5 * U],
                ],
                "pencil",
                { strokeWidth: 1.3 },
            );
            if (pollen)
                pen.ellipse(
                    g,
                    X(((x0 + x1) / 2) * U),
                    4.75 * U,
                    0.55 * U,
                    0.4 * U,
                    "pencil",
                    pen.fill("tang"),
                    { strokeWidth: 1 },
                );
        }
        for (const [ang, len] of [
            [-2.2, 2.4],
            [-1.7, 2],
        ] as const)
            pen.polygon(
                g,
                blade(X(4 * U), 2.3 * U, len * U, 0.95 * U, s > 0 ? ang : Math.PI - ang),
                "pencil",
                pen.fill("sky", "hachure", { hachureGap: 5, fillWeight: 0.5 }),
                { strokeWidth: 1, stroke: c.t["ink-soft"] },
            );
        pen.ellipse(g, X(2.8 * U), 3.4 * U, 3.5 * U, 2.7 * U, "doodle", pen.fill("glow"), {
            strokeWidth: 1.6,
        });
        for (const x of [2.35, 3.35])
            pen.path(
                g,
                `M${X(x * U)} ${2.15 * U}Q${X((x - 0.35) * U)} ${3.4 * U} ${X(x * U)} ${4.65 * U}L${X((x + 0.45) * U)} ${4.7 * U}Q${X((x + 0.1) * U)} ${3.4 * U} ${X((x + 0.45) * U)} ${2.1 * U}Z`,
                "pencil",
                dark,
                { strokeWidth: 1 },
            );
        pen.ellipse(g, X(1.2 * U), 3.5 * U, 0.9 * U, 1.3 * U, "doodle", pen.fill("card"), {
            strokeWidth: 1.3,
        });
        pen.circle(g, X(4.55 * U), 3 * U, 1.75 * U, "doodle", pen.fill("glow"), {
            strokeWidth: 1.5,
        });
        pen.circle(g, X(5.6 * U), 3.35 * U, 1.2 * U, "pencil", dark, { strokeWidth: 1.4 });
        pen.circle(
            g,
            X(5.85 * U),
            3.2 * U,
            5,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.4 },
        );
        for (const dx of [0, 0.3])
            pen.curve(
                g,
                [
                    [X((5.7 + dx) * U), 2.85 * U],
                    [X((6 + dx) * U), 2.2 * U],
                    [X((6.4 + dx) * U), 2 * U],
                ],
                "pencil",
                { strokeWidth: 1 },
            );
        return {
            head: [X(5.7 * U), 2.1 * U, "up"],
            tail: [X(0.8 * U), 3.5 * U, s > 0 ? "left" : "right"],
        };
    },
    describe: () =>
        "A round furry bumblebee with yellow and black bands, a white tail, clear wings, a black head with feelers and a basket of orange pollen on its back leg.",
});
