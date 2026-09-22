import { part, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, blade, clamp, eye } from "./nature";

/** A rabbit sitting side on, ears up, facing one way or the other. */
function rabbit<G>(c: Ctx<G>, cx: number, base: number, dir: number): void {
    const { pen, g } = c,
        fur = pen.fill("card"),
        X = (n: number) => cx + dir * n;
    pen.circle(g, X(-36), base - 24, 16, "doodle", fur, { strokeWidth: 1.5 });
    pen.ellipse(g, X(-6), base - 26, 58, 44, "pencil", fur, { strokeWidth: 2 });
    pen.curve(
        g,
        [
            [X(-30), base - 10],
            [X(-28), base - 30],
            [X(-8), base - 34],
        ],
        "pencil",
        { strokeWidth: 1.2, stroke: c.t["ink-soft"] },
    );
    for (const [x0, lean] of [
        [10, -0.22],
        [20, 0.18],
    ] as const) {
        const ear: Pt[] = blade(X(x0), base - 56, 42, 13, -Math.PI / 2 + dir * lean);
        pen.polygon(g, ear, "pencil", fur, { strokeWidth: 1.6 });
        pen.line(g, X(x0), base - 60, X(x0 + dir * lean * 30), base - 88, "pencil", {
            strokeWidth: 3,
            stroke: c.t.berry,
        });
    }
    pen.circle(g, X(18), base - 46, 30, "pencil", fur, { strokeWidth: 1.8 });
    eye(c, X(24), base - 49, 5);
    pen.circle(g, X(32), base - 44, 6, "ruler", pen.fill("berry"), { strokeWidth: 0.8 });
    for (const dy of [-3, 3])
        pen.line(g, X(34), base - 43 + dy, X(46), base - 45 + dy * 2, "pencil", {
            strokeWidth: 0.8,
            stroke: c.t["ink-soft"],
        });
    pen.ellipse(g, X(-12), base - 4, 28, 9, "pencil", fur, { strokeWidth: 1.4 });
    pen.ellipse(g, X(12), base - 4, 16, 8, "pencil", fur, { strokeWidth: 1.4 });
}

export const rabbits = defineDrawing({
    id: "rabbits",
    family: "animals",
    title: "Rabbits",
    group: "Characters",
    about: "One rabbit or a row of them sitting on the grass, ears up. Two ears each makes the row a count in twos, and the ears are drawn apart so each one can be touched.",
    params: { count: 1, facing: 1 },
    settings: { count: { kind: "whole", min: 1, max: 6 }, facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "One rabbit", params: { count: 1, facing: 1 } },
        { label: "Three, facing left", params: { count: 3, facing: -1 } },
    ],
    box: (p) => ({ w: clamp(p.count, 1, 6) * 5 + 1, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.count, 1, 6),
            base = 5.4 * U,
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const cx = (3 + i * 5) * U;
            rabbit(part(c, "rabbit", [cx, base]), cx, base, p.facing < 0 ? -1 : 1);
            a[`rabbit(${i})`] = [cx, base - 4.8 * U, "up"];
        }
        pen.line(g, 0.4 * U, base, (n * 5 + 0.6) * U, base, "pencil", { strokeWidth: 2 });
        return a;
    },
    describe: (p) =>
        clamp(p.count, 1, 6) > 1
            ? "Rabbits sitting side by side on a line of grass, each with two long ears up, a round tail, a pink nose and whiskers, all facing the same way."
            : "A rabbit sitting on a line of grass with two long ears up, a round tail, a pink nose and whiskers.",
    motion: { parts: { rabbit: { is: "hop", lift: 16, squash: 0.12, period: 4.4, wave: 0.42 } } },
});
