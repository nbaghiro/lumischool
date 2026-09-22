import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

export const tent = defineDrawing({
    id: "tent",
    family: "outdoors",
    title: "Tent",
    group: "Structures",
    about: "A ridge tent pegged out with guy ropes, its door flap tied back. Lit, there is a lamp inside and the doorway glows, which is the one warm light a world at night or up a mountain can put beside the path.",
    params: { lit: 1 },
    settings: { lit: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Lit", params: { lit: 1 } },
        { label: "Dark", params: { lit: 0 } },
    ],
    box: () => ({ w: 9, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            base = 5.6 * U,
            apex: Pt = [4.5 * U, 1.1 * U];
        for (const [x, y] of [
            [0.2 * U, base],
            [8.8 * U, base],
        ] as const)
            pen.line(g, apex[0], apex[1], x, y, "pencil", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
        pen.polygon(g, [[1 * U, base], apex, [8 * U, base]], "pencil", pen.fill("berry"), {
            strokeWidth: 2.1,
        });
        pen.polygon(
            g,
            [
                [3.3 * U, base],
                [4.5 * U, 2.4 * U],
                [5.7 * U, base],
            ],
            "pencil",
            p.lit > 0 ? pen.fill("glow") : pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
            { strokeWidth: 1.6 },
        );
        pen.polygon(
            g,
            [
                [4.5 * U, 2.4 * U],
                [5.7 * U, base],
                [6.5 * U, base],
                [5.2 * U, 2.6 * U],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.3 },
        );
        if (p.lit > 0) {
            pen.circle(g, 4.3 * U, 4.4 * U, 16, "pencil", pen.fill("tang"), { strokeWidth: 1.3 });
            pen.line(g, 4.3 * U, 3.9 * U, 4.3 * U, 3.4 * U, "pencil", { strokeWidth: 1.1 });
        }
        pen.line(g, apex[0], apex[1], apex[0], apex[1] - 0.8 * U, "ruler", { strokeWidth: 2 });
        pen.line(g, 0, base, 9 * U, base, "pencil", { strokeWidth: 2 });
        return { door: [4.5 * U, 2.4 * U, "up"], top: [apex[0], apex[1] - 0.8 * U, "up"] };
    },
    describe: (p) =>
        `A pink ridge tent pegged out with guy ropes, its door flap tied back${p.lit > 0 ? " and a lamp glowing inside the doorway" : " and the doorway dark"}, on a line of ground.`,
    motion: { body: { is: "breathe", amt: 0.02, period: 4.4 } },
});
