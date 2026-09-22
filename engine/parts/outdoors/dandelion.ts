import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, blade, along, clamp } from "../animals/nature";

/** One dandelion seed on its parachute, from its seed along its stalk to the tuft at the top. */
function seedAt<G>(c: Ctx<G>, x: number, y: number, len: number, ang: number): void {
    const { pen, g } = c,
        [tx, ty] = along(x, y, len, ang);
    pen.line(g, x, y, tx, ty, "pencil", { strokeWidth: 0.8, stroke: c.t["ink-soft"] });
    pen.ellipse(g, ...along(x, y, 3, ang), 5, 3, "pencil", pen.fill("tang"), { strokeWidth: 0.5 });
    for (let k = -3; k <= 3; k++)
        pen.line(g, tx, ty, ...along(tx, ty, 0.42 * U, ang + k * 0.36), "pencil", {
            strokeWidth: 0.6,
            stroke: c.t["ink-soft"],
        });
}

export const dandelion = defineDrawing({
    id: "dandelion",
    family: "outdoors",
    title: "Dandelion",
    group: "Props",
    about: "A dandelion as a yellow flower, or gone to seed as a round clock of seeds, each on its own small parachute, some of them blowing away on the wind. The seeds left on the clock can be counted before a puff and after one.",
    params: { seeds: 16, blown: 0, flower: 0 },
    settings: {
        seeds: { kind: "whole", min: 3, max: 28 },
        blown: { kind: "whole", min: 0, max: 1 },
        flower: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "A clock of sixteen seeds", params: { seeds: 16, blown: 0, flower: 0 } },
        { label: "Blowing away", params: { seeds: 9, blown: 1, flower: 0 } },
        { label: "In flower", params: { seeds: 16, blown: 0, flower: 1 } },
    ],
    box: () => ({ w: 10, h: 16 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.seeds, 3, 28),
            hx = 3.8 * U,
            hy = 3.6 * U,
            a: RawAnchors = {};
        pen.curve(
            g,
            [
                [4.3 * U, 15.7 * U],
                [4.6 * U, 11 * U],
                [3.9 * U, 7 * U],
                [hx, hy + 0.3 * U],
            ],
            "pencil",
            { strokeWidth: 3, stroke: c.t.mint },
        );
        pen.curve(
            g,
            [
                [4.3 * U, 15.7 * U],
                [4.6 * U, 11 * U],
                [3.9 * U, 7 * U],
                [hx, hy + 0.3 * U],
            ],
            "pencil",
            { strokeWidth: 1 },
        );
        // toothed leaves at the foot, which is what the name means
        for (const [ang, len] of [
            [-2.7, 3.4],
            [-0.45, 3.1],
            [-2.2, 2.6],
        ] as const) {
            const pts = blade(4.3 * U, 15.6 * U, len * U, 0.9 * U, ang, 10).map((q, i): Pt =>
                i % 2 ? [q[0] + Math.cos(ang - 1.57) * 3, q[1] + Math.sin(ang - 1.57) * 3] : q,
            );
            pen.polygon(g, pts, "pencil", pen.fill("mint"), { strokeWidth: 1.2 });
        }
        if (p.flower > 0) {
            for (const [r, k, col] of [
                [1.6, 16, "glow"],
                [1.15, 12, "tang"],
                [0.7, 9, "glow"],
            ] as const)
                for (let i = 0; i < k; i++)
                    pen.polygon(
                        g,
                        blade(hx, hy, r * U, 0.32 * U, (i / k) * Math.PI * 2 + r),
                        "pencil",
                        pen.fill(col),
                        { strokeWidth: 0.9 },
                    );
            a.head = [hx, hy - 1.6 * U, "up"];
            return a;
        }
        for (let i = 0; i < n; i++) seedAt(c, hx, hy, 1.9 * U, (i / n) * Math.PI * 2 - Math.PI / 2);
        pen.circle(g, hx, hy, 0.5 * U, "pencil", pen.fill("tang", "hachure", { hachureGap: 2.5 }), {
            strokeWidth: 1.1,
        });
        if (p.blown > 0) {
            // some are away already, carried off on the wind
            for (const [x, y, ang] of [
                [6.6, 2.6, -1.1],
                [7.8, 1.4, -0.7],
                [8.9, 3.3, -1.3],
                [7.2, 4.4, -0.9],
                [9.2, 0.9, -0.5],
                [6.2, 0.9, -1.4],
            ] as const)
                seedAt(c, x * U, y * U + 0.9 * U, 1.3 * U, ang);
            pen.curve(
                g,
                [
                    [5.4 * U, 5.2 * U],
                    [7 * U, 4.8 * U],
                    [8.2 * U, 5.1 * U],
                ],
                "pencil",
                { strokeWidth: 1, stroke: c.t.sky, strokeLineDash: [5, 5] },
            );
        }
        a.head = [hx, hy - 2.4 * U, "up"];
        return a;
    },
    describe: (p) =>
        p.flower > 0
            ? "A dandelion in flower, a yellow head of many petals on a tall green stalk with toothed leaves at its foot."
            : `A dandelion gone to seed, a round clock of seeds on parachutes on a tall green stalk with toothed leaves${p.blown > 0 ? ", some seeds blowing away on the wind" : " at its foot"}.`,
});
