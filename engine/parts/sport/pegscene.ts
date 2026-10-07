import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { roundPeg } from "./numberpeg";

/** Where each peg stands in the six-square box, its number, and whether the marble has lit it. */
const PEGS = [
    { x: 1.4, y: 2.6, n: 3, lit: true, tone: "sky" },
    { x: 3, y: 1.9, n: 5, lit: false, tone: "berry" },
    { x: 4.7, y: 2.7, n: 2, lit: false, tone: "mint" },
    { x: 2.3, y: 4.3, n: 4, lit: true, tone: "tang" },
    { x: 4.1, y: 4.6, n: 6, lit: true, tone: "sky" },
] as const;

export const pegScene = defineDrawing<{ marble: boolean }>({
    id: "pegscene",
    family: "sport",
    title: "Marble through the pegs",
    group: "Props",
    about: "A corner of a marble peg board: five numbered round pegs, three of them glowing where a marble has struck them, and the marble bouncing on with a dotted trail behind it.",
    params: { marble: true },
    settings: { marble: { kind: "flag" } },
    takes: [
        { label: "Bouncing through", params: { marble: true } },
        { label: "The pegs alone", params: { marble: false } },
    ],
    box: () => ({ w: 6, h: 6 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        for (const q of PEGS) {
            if (q.lit && !c.paper)
                pen.circle(g, q.x * U, q.y * U, 1.5 * U, "pencil", null, {
                    strokeWidth: 2,
                    stroke: c.t.glow,
                    roughness: 0.3,
                });
            roundPeg(c, q.x * U, q.y * U, 1.18 * U, {
                n: q.n,
                look: "peg",
                tone: q.tone,
                state: q.lit ? "lit" : "plain",
            });
        }
        if (p.marble) {
            const trail = [
                [0.6, 0.4],
                [0.85, 1.0],
                [1.1, 1.55],
                [1.6, 1.35],
                [2.0, 1.45],
                [2.3, 1.8],
                [2.5, 2.4],
                [2.7, 3.0],
            ] as const;
            for (const [x, y] of trail)
                pen.circle(g, x * U, y * U, 0.14 * U, "ruler", pen.fill("ink-soft", "solid"), {
                    strokeWidth: 0.2,
                    disableMultiStroke: true,
                });
            const mx = 3 * U,
                my = 3.55 * U;
            pen.circle(g, mx, my, 0.8 * U, "pencil", pen.fill("card", "solid"), {
                strokeWidth: 1.2,
                roughness: 0.2,
            });
            pen.path(
                g,
                `M${mx - 0.25 * U} ${my + 0.08 * U}Q${mx} ${my - 0.2 * U} ${mx + 0.25 * U} ${my - 0.02 * U}`,
                "pencil",
                null,
                {
                    strokeWidth: 2,
                    stroke: c.t.sky,
                    roughness: 0.2,
                },
            );
        }
        return { marble: [3 * U, 3.55 * U, "up"] };
    },
    describe: (p) =>
        p.marble
            ? "A glass marble bouncing down through five round numbered pegs, three of them glowing yellow where it struck them, with a dotted trail behind."
            : "Five round numbered pegs on a marble board, three of them glowing yellow where a marble has struck them on its way down.",
    motion: { still: "A picture of one moment; nothing in it moves." },
});
