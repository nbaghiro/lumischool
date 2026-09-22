import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { ring } from "./nature";

export const fennec = defineDrawing({
    id: "fennec",
    family: "animals",
    title: "Fennec fox",
    group: "Characters",
    about: "A fennec fox, the smallest fox there is, sitting with its tail round its feet and ears nearly as long as its body. Big ears let the heat out on a hot day and hear a beetle moving under the sand at night.",
    params: { facing: 1 },
    settings: { facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "Facing right", params: { facing: 1 } },
        { label: "Facing left", params: { facing: -1 } },
    ],
    box: () => ({ w: 6, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = p.facing < 0 ? -1 : 1,
            X = (x: number) => (s > 0 ? x : 6 * U - x),
            sand = pen.fill("glow");
        pen.path(
            g,
            `M${X(3.4 * U)} ${6.7 * U}Q${X(0.4 * U)} ${6.9 * U} ${X(0.6 * U)} ${5.2 * U}Q${X(0.9 * U)} ${4.4 * U} ${X(1.6 * U)} ${4.9 * U}Q${X(1.2 * U)} ${6 * U} ${X(3.4 * U)} ${6.1 * U}Z`,
            "pencil",
            sand,
            { strokeWidth: 1.4 },
        );
        pen.ellipse(
            g,
            X(0.85 * U),
            5 * U,
            0.7 * U,
            0.8 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 2.5 }),
            { strokeWidth: 1 },
        );
        pen.path(
            g,
            ring([
                [X(2.2 * U), 6.6 * U],
                [X(1.9 * U), 5 * U],
                [X(2.6 * U), 3.7 * U],
                [X(3.8 * U), 3.7 * U],
                [X(4.4 * U), 5.1 * U],
                [X(4.2 * U), 6.6 * U],
            ]),
            "pencil",
            sand,
            { strokeWidth: 1.7 },
        );
        pen.path(
            g,
            ring([
                [X(3.1 * U), 6.4 * U],
                [X(3 * U), 5 * U],
                [X(3.6 * U), 4.3 * U],
                [X(4 * U), 5.2 * U],
                [X(3.9 * U), 6.4 * U],
            ]),
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1 },
        );
        for (const dx of [3, 3.8])
            pen.line(g, X(dx * U), 6.7 * U, X((dx + 0.05) * U), 5.8 * U, "pencil", {
                strokeWidth: 1.3,
            });
        // the ears, long and pink inside
        for (const [bx, tx, ty] of [
            [2.6, 1.6, 0.3],
            [3.8, 4.6, 0.2],
        ] as const) {
            pen.polygon(
                g,
                [
                    [X((bx - 0.45) * U), 3 * U],
                    [X(tx * U), ty * U],
                    [X((bx + 0.45) * U), 2.8 * U],
                ],
                "pencil",
                sand,
                { strokeWidth: 1.5 },
            );
            pen.polygon(
                g,
                [
                    [X((bx - 0.2) * U), 2.8 * U],
                    [X((tx + (tx > bx ? -0.1 : 0.1)) * U), (ty + 0.5) * U],
                    [X((bx + 0.22) * U), 2.7 * U],
                ],
                "pencil",
                pen.fill("berry"),
                { strokeWidth: 0.9 },
            );
        }
        pen.path(
            g,
            ring([
                [X(2.3 * U), 2.9 * U],
                [X(3.2 * U), 2.3 * U],
                [X(4.1 * U), 2.8 * U],
                [X(4.5 * U), 3.5 * U],
                [X(3.3 * U), 4.1 * U],
                [X(2.4 * U), 3.6 * U],
            ]),
            "pencil",
            sand,
            { strokeWidth: 1.7 },
        );
        pen.path(
            g,
            `M${X(3.6 * U)} ${3.55 * U}Q${X(4.3 * U)} ${3.5 * U} ${X(4.6 * U)} ${3.45 * U}Q${X(4.2 * U)} ${3.95 * U} ${X(3.5 * U)} ${3.95 * U}Z`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 0.9 },
        );
        pen.circle(
            g,
            X(4.55 * U),
            3.45 * U,
            5,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.5 },
        );
        for (const dx of [2.95, 3.75]) {
            pen.circle(
                g,
                X(dx * U),
                3.05 * U,
                7.5,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.5 },
            );
            pen.circle(
                g,
                X(dx * U) + 1.5,
                3.05 * U - 1.5,
                2.2,
                "ruler",
                { fill: c.t.card, fillStyle: "solid" },
                { strokeWidth: 0 },
            );
        }
        for (const dy of [-0.08, 0.08])
            pen.line(g, X(4.4 * U), (3.6 + dy) * U, X(5.5 * U), (3.5 + dy * 2.5) * U, "pencil", {
                strokeWidth: 0.7,
            });
        return {
            ears: [X(3 * U), 0.2 * U, "up"],
            nose: [X(4.6 * U), 3.45 * U, s > 0 ? "right" : "left"],
        };
    },
    describe: () =>
        "A small sand-coloured fox sitting with its tail curled round its feet, huge ears pink inside, a white chest and dark eyes.",
});
