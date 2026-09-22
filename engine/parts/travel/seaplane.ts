import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const seaplane = defineDrawing({
    id: "seaplane",
    family: "travel",
    title: "Seaplane",
    group: "Structures",
    about: "A small seaplane seen from the side, with a propeller at its nose, a long wing over the cabin on struts, a row of windows, a tail fin and two long floats underneath instead of wheels.",
    params: { facing: -1 },
    settings: { facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "Flying left", params: { facing: -1 } },
        { label: "Flying right", params: { facing: 1 } },
    ],
    box: () => ({ w: 12, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = p.facing < 0 ? -1 : 1,
            a: RawAnchors = {};
        const X = (x: number) => (s > 0 ? x * U : (12 - x) * U),
            at = (x: number, y: number): Pt => [X(x), y * U];

        // the far float, behind
        const float = (dx: number, dy: number): Pt[] => [
            at(3.1 + dx, 4.45 + dy),
            at(9.1 + dx, 4.45 + dy),
            at(9.9 + dx, 4.05 + dy),
            at(9.6 + dx, 4.85 + dy),
            at(3.6 + dx, 5.05 + dy),
        ];
        pen.polygon(
            g,
            float(-0.45, -0.35),
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
            calm(c, 1.3),
        );

        // the tail fin and tailplane
        pen.polygon(
            g,
            [at(1.9, 2.55), at(0.85, 0.75), at(1.55, 0.7), at(3.1, 2.3)],
            "pencil",
            pen.fill("glow"),
            calm(c, 1.6),
        );
        pen.polygon(
            g,
            [at(0.9, 2.55), at(2.6, 2.4), at(2.7, 2.75), at(1, 2.8)],
            "pencil",
            pen.fill("glow"),
            calm(c, 1.3),
        );

        // the fuselage, tapering to the tail, with its windows and a door
        pen.path(
            g,
            `M${X(1.4)} ${2.45 * U}Q${X(4)} ${1.85 * U} ${X(7.6)} ${1.85 * U}Q${X(10.1)} ${1.9 * U} ${X(10.6)} ${2.7 * U}Q${X(10.2)} ${3.55 * U} ${X(7.6)} ${3.55 * U}Q${X(4)} ${3.4 * U} ${X(1.4)} ${2.85 * U}Z`,
            "pencil",
            pen.fill("glow"),
            calm(c, 1.8),
        );
        pen.line(g, X(2.4), 2.75 * U, X(10.1), 2.95 * U, "pencil", calm(c, 1.1));
        for (const x of [6, 7, 8])
            pen.rect(
                g,
                Math.min(X(x), X(x + 0.7)),
                2.05 * U,
                0.7 * U,
                0.55 * U,
                "pencil",
                pen.fill("sky"),
                calm(c, 1.1),
            );
        pen.path(
            g,
            `M${X(8.9)} ${2.05 * U}L${X(9.7)} ${2.1 * U}Q${X(10.1)} ${2.35 * U} ${X(10.15)} ${2.6 * U}L${X(8.9)} ${2.6 * U}Z`,
            "pencil",
            pen.fill("sky"),
            calm(c, 1.1),
        );
        pen.rect(
            g,
            Math.min(X(4.6), X(5.3)),
            2.1 * U,
            0.7 * U,
            1.1 * U,
            "pencil",
            null,
            calm(c, 1.1),
        );

        // the long wing over the cabin, on struts
        pen.polygon(
            g,
            [
                at(3.3, 0.95),
                at(10.2, 0.95),
                at(10.5, 1.25),
                at(10.2, 1.45),
                at(3.3, 1.45),
                at(3.05, 1.2),
            ],
            "pencil",
            pen.fill("card"),
            calm(c, 1.7),
        );
        pen.line(g, X(4.2), 1.45 * U, X(5.6), 2.4 * U, "pencil", calm(c, 1.6));
        pen.line(g, X(9.4), 1.45 * U, X(8.6), 2.1 * U, "pencil", calm(c, 1.6));

        // the propeller, a blur of its blades in front of the nose
        pen.circle(g, X(10.75), 2.7 * U, 0.42 * U, "pencil", pen.fill("ink-soft"), calm(c, 1.3));
        pen.ellipse(
            g,
            X(11.2),
            2.7 * U,
            0.38 * U,
            2.3 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.5 }),
            { ...calm(c, 1.1), stroke: c.t["ink-soft"] },
        );

        // the near float
        pen.polygon(g, float(0, 0), "pencil", pen.fill("card"), calm(c, 1.7));
        pen.line(g, X(3.4), 4.75 * U, X(9.3), 4.62 * U, "pencil", calm(c, 1.1));
        for (const x of [4.8, 8.2])
            pen.linear(
                g,
                [at(x - 0.6, 4.45), at(x, 3.4), at(x + 0.55, 4.45)],
                "pencil",
                calm(c, 1.4),
            );

        a.nose = [X(11.4), 2.7 * U, s > 0 ? "right" : "left"];
        a.wing = [X(6.8), 0.95 * U, "up"];
        a.float = [X(6.4), 5.05 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A small seaplane flying ${p.facing < 0 ? "left" : "right"}, with a propeller at its nose, a long wing over the cabin on struts, a row of windows and two long floats underneath.`,
    motion: {
        body: {
            is: "float",
            lift: 6,
            dx: 8,
            deg: 1.5,
            pivot: [0.5, 0.5],
            period: 8.4,
            units: true,
        },
    },
});
