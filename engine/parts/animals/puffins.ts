import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** One puffin standing with its feet at (x, foot), facing `s`, and a beakful of fish when `fish`. */
function puffin<G>(c: Ctx<G>, x: number, foot: number, s: number, fish: boolean): number {
    const { pen, g } = c,
        X = (u: number) => x + s * u * U,
        Y = (v: number) => foot - v * U;
    // big orange feet
    for (const dx of [-0.45, 0.2])
        pen.polygon(
            g,
            [
                [X(dx), Y(0.5)],
                [X(dx + 0.6), Y(0.02)],
                [X(dx - 0.25), Y(0.02)],
            ],
            "pencil",
            pen.fill("tang"),
            calm(c, 1.2),
        );
    // the black back and wing, and the white front
    pen.ellipse(g, X(-0.1), Y(1.45), 1.9 * U, 2.55 * U, "pencil", pen.fill("ink"), calm(c, 1.7));
    pen.ellipse(g, X(0.28), Y(1.25), 1.15 * U, 2 * U, "pencil", pen.fill("card"), calm(c, 1.2));
    pen.path(
        g,
        `M${X(-0.3)} ${Y(2.25)}Q${X(-1.1)} ${Y(1.5)} ${X(-0.75)} ${Y(0.55)}Q${X(-0.35)} ${Y(1.2)} ${X(-0.3)} ${Y(2.25)}Z`,
        "pencil",
        pen.fill("ink"),
        { ...calm(c, 1.1), stroke: c.t.card },
    );
    // the head, black above a big pale face, and its eye
    pen.circle(g, X(0.05), Y(2.95), 1.35 * U, "pencil", pen.fill("ink"), calm(c, 1.6));
    pen.path(
        g,
        `M${X(-0.15)} ${Y(2.55)}Q${X(-0.1)} ${Y(3.2)} ${X(0.35)} ${Y(3.3)}Q${X(0.72)} ${Y(3.2)} ${X(0.7)} ${Y(2.75)}Q${X(0.5)} ${Y(2.35)} ${X(-0.15)} ${Y(2.55)}Z`,
        "pencil",
        pen.fill("card"),
        calm(c, 1.1),
    );
    pen.circle(g, X(0.3), Y(2.95), 7, "pencil", pen.fill("ink"), { stroke: "none" });
    pen.line(g, X(0.3), Y(3.12), X(0.3), Y(3.22), "pencil", calm(c, 1));
    // the big beak, striped orange, yellow and dark at its base
    const bx = X(0.66),
        by = Y(2.88);
    pen.path(
        g,
        `M${bx} ${by - 0.5 * U}Q${bx + s * 0.75 * U} ${by - 0.35 * U} ${bx + s * 0.95 * U} ${by + 0.12 * U}Q${bx + s * 0.5 * U} ${by + 0.4 * U} ${bx} ${by + 0.42 * U}Z`,
        "pencil",
        pen.fill("tang"),
        calm(c, 1.5),
    );
    pen.path(
        g,
        `M${bx} ${by - 0.5 * U}Q${bx + s * 0.18 * U} ${by - 0.47 * U} ${bx + s * 0.3 * U} ${by - 0.43 * U}L${bx + s * 0.3 * U} ${by + 0.4 * U}L${bx} ${by + 0.42 * U}Z`,
        "pencil",
        pen.fill("glow"),
        calm(c, 1.1),
    );
    pen.line(
        g,
        bx + s * 0.08 * U,
        by - 0.48 * U,
        bx + s * 0.08 * U,
        by + 0.41 * U,
        "pencil",
        calm(c, 1.8),
    );
    pen.line(
        g,
        bx + s * 0.52 * U,
        by - 0.34 * U,
        bx + s * 0.56 * U,
        by + 0.3 * U,
        "pencil",
        calm(c, 1),
    );
    if (fish) {
        // three small silver fish hanging from the beak, heads in and tails down
        for (const [dx, lean] of [
            [0.3, -0.18],
            [0.52, 0],
            [0.74, 0.18],
        ] as const) {
            const x0 = bx + s * dx * U,
                y0 = by + 0.25 * U,
                x1 = x0 + s * lean * U,
                y1 = y0 + 0.85 * U;
            pen.ellipse(
                g,
                (x0 + x1) / 2,
                (y0 + y1) / 2,
                0.22 * U,
                0.75 * U,
                "pencil",
                pen.fill("sky", "hachure", { hachureGap: 2.5 }),
                calm(c, 1.1),
            );
            pen.polygon(
                g,
                [
                    [x1, y1 - 3],
                    [x1 - 5, y1 + 6],
                    [x1 + 5, y1 + 6],
                ],
                "pencil",
                null,
                calm(c, 1),
            );
        }
    }
    return by;
}

export const puffins = defineDrawing({
    id: "puffins",
    family: "animals",
    title: "Puffins",
    group: "Characters",
    about: "Puffins standing in a row on a rock ledge, with black backs, white fronts and faces, orange feet and big striped orange beaks, one of them with small fish hanging from its beak.",
    params: { count: 3, facing: 1 },
    settings: { count: { kind: "whole", min: 1, max: 3 }, facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "Three on a rock", params: { count: 3, facing: 1 } },
        { label: "Two, facing left", params: { count: 2, facing: -1 } },
    ],
    box: () => ({ w: 10, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(1, Math.min(3, Math.round(p.count))),
            s = p.facing < 0 ? -1 : 1,
            a: RawAnchors = {};
        pen.path(
            g,
            `M${0.1 * U} ${4.95 * U}L${0.25 * U} ${4.15 * U}Q${1.6 * U} ${3.85 * U} ${3.1 * U} ${4 * U}Q${5 * U} ${3.8 * U} ${7 * U} ${3.98 * U}Q${8.8 * U} ${3.85 * U} ${9.85 * U} ${4.2 * U}L${9.9 * U} ${4.95 * U}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
            calm(c, 1.7),
        );
        const cell = 3.1 * U,
            x0 = (10 * U - n * cell) / 2 - s * 0.25 * U;
        for (let k = 0; k < n; k++) {
            const x = x0 + (k + 0.5) * cell,
                foot = 3.98 * U,
                beak = puffin(c, x, foot, s, k === n - 1);
            a[`puffin(${k})`] = [x, foot - 3.55 * U, "up"];
            if (k === n - 1) a.fish = [x + s * 1.2 * U, beak + 0.8 * U, s > 0 ? "right" : "left"];
        }
        a.ledge = [5 * U, 4.2 * U, "down"];
        return a;
    },
    describe: (p) =>
        Math.round(p.count) > 1
            ? "Puffins standing in a row on a rock ledge, with black backs, white fronts and faces, orange feet and big striped orange beaks, one with fish hanging from its beak."
            : "A puffin standing on a rock ledge, with a black back, a white front and face, orange feet and a big striped orange beak with small fish hanging from it.",
    motion: {
        body: { is: "float", lift: 0, dx: 2, deg: 1.5, pivot: [0.5, 1], period: 7.4, units: true },
    },
});
