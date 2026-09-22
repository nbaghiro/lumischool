import { plain, type Ctx } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** One stroke to a line, corners kept, the roughness turned down: the shelf's calm level for things. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** A cover wider than a few squares opens its hatch on paper, so it prints light rather than grey. */
const WIDE = { hachureGap: 8.5, fillWeight: 0.6 } as const;

export const pegBoard = defineDrawing({
    id: "pegboard",
    family: "data",
    title: "Peg board",
    group: "Structures",
    about: "A wooden board of pegs standing up on the page, with a rail across the top for a dropper and a row of glass tubes at the bottom, each marked every ball's height so the balls in it can be read as a bar. The pegs, the half pegs on the walls and the tubes are placed where a game says.",
    params: {
        w: 8,
        h: 12,
        pegs: [
            [3, 3],
            [5, 3],
            [4, 4.8],
            [3, 6.6],
            [5, 6.6],
        ] as number[][],
        bumps: [
            [1.3, 4.8],
            [6.7, 4.8],
        ] as number[][],
        walls: [1, 3, 5, 7] as number[],
        mouth: 8.2,
        floor: 11.5,
        rail: 1.3,
    },
    settings: {
        w: { kind: "whole", min: 4, max: 36 },
        h: { kind: "whole", min: 4, max: 46 },
        pegs: { kind: "fixed" },
        bumps: { kind: "fixed" },
        walls: { kind: "numbers", min: 0, max: 36, most: 12 },
        mouth: { kind: "number", min: 0, max: 46, step: 0.1 },
        floor: { kind: "number", min: 0, max: 46, step: 0.1 },
        rail: { kind: "number", min: 0, max: 46, step: 0.1 },
    },
    takes: [
        {
            label: "Three tubes, pegs in columns",
            params: {
                w: 8,
                h: 22,
                pegs: [
                    [3, 4.2],
                    [5, 4.2],
                    [3, 6],
                    [5, 6],
                    [3, 7.8],
                    [5, 7.8],
                ],
                bumps: [],
                walls: [1, 3, 5, 7],
                mouth: 9.4,
                floor: 18.3,
                rail: 1.3,
            },
        },
        {
            label: "Four tubes, pegs staggered",
            params: {
                w: 10,
                h: 22,
                pegs: [
                    [3, 4.2],
                    [5, 4.2],
                    [7, 4.2],
                    [4, 6],
                    [6, 6],
                    [3, 7.8],
                    [5, 7.8],
                    [7, 7.8],
                    [4, 9.6],
                    [6, 9.6],
                ],
                bumps: [
                    [1.3, 6],
                    [8.7, 6],
                    [1.3, 9.6],
                    [8.7, 9.6],
                ],
                walls: [1, 3, 5, 7, 9],
                mouth: 11.2,
                floor: 18.9,
                rail: 1.3,
            },
        },
    ],
    box: (p) => ({ w: Math.max(4, Math.round(p.w)), h: Math.max(4, Math.round(p.h)) }),
    draw: (c, p) => {
        const { pen, g } = c,
            S = (v: number) => v * U;
        const left = p.walls[0] ?? 1,
            right = p.walls[p.walls.length - 1] ?? p.w - 1,
            ball = 1.2;
        // The tubes are glass, a faint wash, and each is marked every ball's height from its floor.
        for (let i = 0; i + 1 < p.walls.length; i++) {
            const a = (p.walls[i] ?? 0) + 0.3,
                b = (p.walls[i + 1] ?? 0) - 0.3;
            pen.rect(
                g,
                S(a),
                S(p.mouth),
                S(b - a),
                S(p.floor - p.mouth),
                "ruler",
                pen.fill("sky", "hachure", { ...WIDE, hachureGap: 9, hachureAngle: 60 }),
                { stroke: "none" },
            );
            for (let k = 1; p.floor - k * ball > p.mouth + 0.3; k++) {
                const y = S(p.floor - k * ball);
                pen.line(g, S(a), y, S(a) + (k % 5 === 0 ? 9 : 5), y, "ruler", {
                    strokeWidth: k % 5 === 0 ? 1.4 : 1,
                    stroke: c.t["ink-soft"],
                    disableMultiStroke: true,
                });
            }
        }
        const wood = pen.fill("tang", "hachure", {
            hachureGap: 5,
            fillWeight: 0.8,
            hachureAngle: 80,
        });
        for (const [i, x] of p.walls.entries()) {
            const outer = i === 0 || i === p.walls.length - 1;
            const top = outer ? 0.4 : p.mouth;
            pen.rect(
                g,
                S(x - 0.3),
                S(top),
                S(0.6),
                S(p.floor - top),
                "ruler",
                outer ? wood : pen.fill("card"),
                calm(c, 1.7),
            );
            if (!outer)
                pen.circle(g, S(x), S(p.mouth), S(0.6), "ruler", pen.fill("card"), calm(c, 1.5));
        }
        pen.rect(
            g,
            S(left - 0.5),
            S(p.floor),
            S(right - left + 1),
            S(0.55),
            "ruler",
            wood,
            calm(c, 1.8),
        );
        pen.line(g, S(left + 0.3), S(p.rail), S(right - 0.3), S(p.rail), "ruler", {
            strokeWidth: 2.4,
            disableMultiStroke: true,
        });
        for (const [x, y] of p.pegs) {
            if (x === undefined || y === undefined) continue;
            pen.circle(
                g,
                S(x),
                S(y),
                S(0.4),
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                calm(c, 1),
            );
            if (!c.paper)
                plain(c, {
                    kind: "circle",
                    cx: S(x) - 1.4,
                    cy: S(y) - 1.4,
                    r: 1.2,
                    fill: c.t.card,
                });
        }
        for (const [x, y] of p.bumps) {
            if (x === undefined || y === undefined) continue;
            const s = x < p.w / 2 ? 1 : -1,
                r = S(0.45);
            pen.path(
                g,
                `M${S(x)} ${S(y) - r}A${r} ${r} 0 0 ${s > 0 ? 1 : 0} ${S(x)} ${S(y) + r}Z`,
                "ruler",
                pen.fill("card"),
                calm(c, 1.4),
            );
        }
        return {
            rail: [S((left + right) / 2), S(p.rail), "up"],
            floor: [S((left + right) / 2), S(p.floor), "down"],
        };
    },
    describe: () =>
        "A wooden board of pegs standing on the page, a rail across the top, and a row of glass tubes along the bottom marked at every ball's height.",
});
