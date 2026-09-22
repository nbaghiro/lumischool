import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, ring, blade, along, clamp, eye } from "./nature";

export const seaTurtle = defineDrawing({
    id: "seaturtle",
    family: "animals",
    title: "Sea turtle",
    group: "Characters",
    about: "A green sea turtle swimming, with the plates of its shell in a row down the middle and small ones round the edge, a beak for a mouth and long front flippers it flies through the water with. It swims back to the beach it hatched on to lay its own eggs, which is a life cycle with a journey in it.",
    params: { facing: 1, plates: 5 },
    settings: {
        facing: { kind: "one of", of: [1, -1] },
        plates: { kind: "whole", min: 3, max: 6 },
    },
    takes: [
        { label: "Swimming right", params: { facing: 1, plates: 5 } },
        { label: "Swimming left, four plates", params: { facing: -1, plates: 4 } },
    ],
    box: () => ({ w: 11, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = p.facing < 0 ? -1 : 1,
            n = clamp(p.plates, 3, 6);
        const X = (x: number) => (s > 0 ? x : 11 * U - x),
            A = (ang: number) => (s > 0 ? ang : Math.PI - ang);
        const skin = pen.fill("mint"),
            shade = pen.fill("mint", "hachure", { hachureGap: 3.5 });
        // the far flippers, behind the shell
        pen.polygon(g, blade(X(7.2 * U), 2.9 * U, 2.6 * U, 0.75 * U, A(-2.55)), "pencil", shade, {
            strokeWidth: 1.2,
        });
        pen.polygon(g, blade(X(2.7 * U), 3.8 * U, 1.5 * U, 0.65 * U, A(2.75)), "pencil", skin, {
            strokeWidth: 1.3,
        });
        // the neck and head, reaching forward
        pen.path(
            g,
            `M${X(7.8 * U)} ${2.7 * U}Q${X(8.6 * U)} ${2.55 * U} ${X(9.2 * U)} ${2.6 * U}L${X(9.2 * U)} ${3.6 * U}Q${X(8.5 * U)} ${3.9 * U} ${X(7.9 * U)} ${3.9 * U}Z`,
            "pencil",
            skin,
            { strokeWidth: 1.5 },
        );
        pen.path(
            g,
            ring([
                [X(8.8 * U), 2.55 * U],
                [X(9.9 * U), 2.3 * U],
                [X(10.7 * U), 2.85 * U],
                [X(10.5 * U), 3.5 * U],
                [X(9.6 * U), 3.8 * U],
                [X(8.9 * U), 3.5 * U],
            ]),
            "pencil",
            skin,
            { strokeWidth: 1.7 },
        );
        pen.curve(
            g,
            [
                [X(10.65 * U), 3.2 * U],
                [X(10.1 * U), 3.35 * U],
                [X(9.7 * U), 3.25 * U],
            ],
            "pencil",
            { strokeWidth: 1.2 },
        );
        for (const [dx, dy] of [
            [9.3, 2.95],
            [9.5, 3.4],
            [9.1, 3.25],
        ] as const)
            pen.circle(g, X(dx * U), dy * U, 4, "pencil", pen.fill("card"), { strokeWidth: 0.7 });
        eye(c, X(10.05 * U), 2.78 * U, 4.6);
        // the shell, its plates down the middle and a rim of small ones
        const shell: Pt[] = [
            [X(2 * U), 3.65 * U],
            [X(2.9 * U), 2.2 * U],
            [X(5 * U), 1.35 * U],
            [X(7.1 * U), 1.75 * U],
            [X(8.3 * U), 3.1 * U],
            [X(7.8 * U), 3.95 * U],
            [X(5.2 * U), 4.3 * U],
            [X(2.9 * U), 4.2 * U],
        ];
        pen.path(g, ring(shell), "pencil", pen.fill("tang"), { strokeWidth: 2 });
        for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n,
                x = X((3.1 + t * 4.4) * U),
                y = (3.05 - Math.sin(Math.PI * (0.15 + t * 0.7)) * 0.95) * U,
                r = 0.52 * U;
            const hex: Pt[] = [];
            for (let k = 0; k < 6; k++)
                hex.push([
                    x + Math.cos((k * Math.PI) / 3 + 0.3) * r * 1.05,
                    y + Math.sin((k * Math.PI) / 3 + 0.3) * r * 0.82,
                ]);
            pen.polygon(g, hex, "pencil", pen.fill("glow"), { strokeWidth: 1.2 });
        }
        for (let k = 0; k < 9; k++) {
            const t = k / 8,
                x = X((2.6 + t * 5.3) * U),
                y = (3.95 + Math.sin(Math.PI * t) * 0.3) * U;
            pen.line(g, x, y - 0.32 * U, x + s * 3, y + 0.05 * U, "pencil", { strokeWidth: 1.1 });
        }
        pen.curve(
            g,
            [
                [X(2.3 * U), 4 * U],
                [X(5.2 * U), 4.65 * U],
                [X(7.9 * U), 3.9 * U],
            ],
            "pencil",
            { strokeWidth: 1.2 },
        );
        // the near front flipper, sweeping back like a wing
        pen.polygon(g, blade(X(7.1 * U), 3.9 * U, 3.5 * U, 1.05 * U, A(2.5)), "pencil", skin, {
            strokeWidth: 1.6,
        });
        for (const t of [0.3, 0.5, 0.7]) {
            const [x, y] = along(X(7.1 * U), 3.9 * U, t * 3.5 * U, A(2.5));
            pen.circle(g, x, y, 4.5, "pencil", pen.fill("card"), { strokeWidth: 0.7 });
        }
        return {
            head: [X(10 * U), 2.3 * U, "up"],
            shell: [X(5 * U), 1.35 * U, "up"],
            tail: [X(1.3 * U), 3.8 * U, s > 0 ? "left" : "right"],
        };
    },
    describe: () =>
        "A green sea turtle swimming with a patterned shell of plates, a beaked head reaching forward and long front flippers swept back like wings.",
});
