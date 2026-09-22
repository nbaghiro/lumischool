import { part } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, blade, eye } from "./nature";

export const fox = defineDrawing({
    id: "fox",
    family: "animals",
    title: "Fox",
    group: "Characters",
    about: "A fox standing side on with its brush out behind it and a white tip to its tail. A woodland creature for a world, and a shape a child knows from a picture book.",
    params: { facing: 1 },
    settings: { facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "Facing right", params: { facing: 1 } },
        { label: "Facing left", params: { facing: -1 } },
    ],
    box: () => ({ w: 9, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            dir = p.facing < 0 ? -1 : 1,
            cx = 4.9 * U,
            base = 5.5 * U;
        const X = (n: number) => cx + dir * n,
            coat = pen.fill("tang"),
            dark = pen.fill("ink-soft", "hachure", { hachureGap: 3.5 });
        const tail: Pt[] = blade(X(-30), base - 44, 58, 26, dir > 0 ? Math.PI + 0.42 : -0.42);
        const brush = part(c, "tail", [X(-26), base - 42], { dir }).g;
        pen.polygon(brush, tail, "pencil", coat, { strokeWidth: 1.8 });
        const tip = blade(X(-70), base - 61, 18, 16, dir > 0 ? Math.PI + 0.42 : -0.42);
        pen.polygon(brush, tip, "pencil", pen.fill("card"), { strokeWidth: 1.4 });
        for (const [x0, w] of [
            [-26, 7],
            [-14, 7],
            [14, 7],
            [24, 7],
        ] as const) {
            pen.rect(g, X(x0) - w / 2, base - 30, w, 26, "pencil", coat, { strokeWidth: 1.4 });
            pen.rect(g, X(x0) - w / 2 - 1, base - 8, w + 3, 8, "pencil", dark, {
                strokeWidth: 1.2,
            });
        }
        pen.ellipse(g, X(-2), base - 40, 76, 32, "pencil", coat, { strokeWidth: 2 });
        const head: Pt[] = [
            [X(24), base - 64],
            [X(40), base - 60],
            [X(62), base - 46],
            [X(40), base - 38],
            [X(26), base - 42],
        ];
        pen.polygon(g, head, "pencil", coat, { strokeWidth: 1.9 });
        pen.polygon(
            g,
            [
                [X(40), base - 50],
                [X(62), base - 46],
                [X(40), base - 38],
                [X(30), base - 43],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.2 },
        );
        for (const x0 of [26, 36])
            pen.polygon(
                g,
                [
                    [X(x0), base - 60],
                    [X(x0 + 3), base - 80],
                    [X(x0 + 10), base - 62],
                ],
                "pencil",
                coat,
                { strokeWidth: 1.5 },
            );
        pen.circle(
            g,
            X(62),
            base - 46,
            6,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.6 },
        );
        eye(c, X(40), base - 55, 5);
        return {
            head: [X(40), base - 80, "up"],
            tail: [X(-76), base - 64, dir > 0 ? "left" : "right"],
        };
    },
    describe: () =>
        "A fox standing side on with an orange coat, a white chest and chin, dark feet, pointed ears and a bushy tail with a white tip.",
    motion: {
        body: { is: "idle", deg: 2 },
        parts: { tail: { is: "wiggle", deg: 9, period: 4.8, cycles: 2 } },
    },
});
