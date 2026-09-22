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
const at = (x: number, y: number): Pt => [x * U, y * U];

export const gannet = defineDrawing({
    id: "gannet",
    family: "animals",
    title: "Gannet",
    group: "Characters",
    about: "A gannet, a big white seabird with black wing tips and a pale yellow head, either diving straight down into the sea with its wings folded back, or gliding on long straight wings.",
    params: { diving: 1 },
    settings: { diving: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Diving", params: { diving: 1 } },
        { label: "Gliding", params: { diving: 0 } },
    ],
    box: () => ({ w: 6, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        if (p.diving > 0) {
            // the sea it is about to go into, and the splash already rising
            pen.curve(
                g,
                [at(0.3, 6.35), at(1.5, 6.2), at(3, 6.35), at(4.5, 6.2), at(5.7, 6.35)],
                "pencil",
                calm(c, 1.5),
            );
            pen.polygon(
                g,
                [at(0.3, 6.4), at(5.7, 6.4), at(5.7, 6.85), at(0.3, 6.85)],
                "pencil",
                pen.fill("sky", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
                { stroke: "none" },
            );
            for (const [x0, y0, x1, y1] of [
                [2.3, 6.15, 1.4, 5.35],
                [2.7, 6.05, 2.35, 5.2],
                [3.3, 6.05, 3.65, 5.2],
                [3.7, 6.15, 4.6, 5.35],
            ] as const)
                pen.line(g, x0 * U, y0 * U, x1 * U, y1 * U, "pencil", calm(c, 1.3));
            for (const [x, y] of [
                [1.2, 5],
                [4.8, 5.05],
                [2.1, 4.95],
                [3.95, 4.9],
            ] as const)
                pen.circle(g, x * U, y * U, 6, "pencil", pen.fill("sky"), calm(c, 1));
            // the wings folded back along the body into an arrow, their black tips up at the tail
            for (const s of [-1, 1]) {
                const w: Pt[] = [
                    at(3 + s * 0.3, 3.7),
                    at(3 + s * 1.05, 2.9),
                    at(3 + s * 1.55, 0.45),
                    at(3 + s * 0.85, 1.6),
                    at(3 + s * 0.35, 2.4),
                ];
                pen.polygon(g, w, "pencil", pen.fill("card"), calm(c, 1.6));
                pen.polygon(
                    g,
                    [at(3 + s * 1.28, 1.55), at(3 + s * 1.55, 0.45), at(3 + s * 0.85, 1.6)],
                    "pencil",
                    pen.fill("ink"),
                    calm(c, 1.1),
                );
                pen.line(
                    g,
                    (3 + s * 0.45) * U,
                    3.35 * U,
                    (3 + s * 1.05) * U,
                    1.9 * U,
                    "pencil",
                    calm(c, 1),
                );
            }
            // the body, pointed at the tail
            pen.path(
                g,
                `M${3 * U} ${0.7 * U}Q${3.55 * U} ${2.3 * U} ${3.4 * U} ${4 * U}L${2.6 * U} ${4 * U}Q${2.45 * U} ${2.3 * U} ${3 * U} ${0.7 * U}Z`,
                "pencil",
                pen.fill("card"),
                calm(c, 1.7),
            );
            // the pale yellow head going down first, its dark eye stripe and its long beak
            pen.ellipse(
                g,
                3 * U,
                4.35 * U,
                0.85 * U,
                0.95 * U,
                "pencil",
                pen.fill("glow"),
                calm(c, 1.6),
            );
            pen.polygon(
                g,
                [at(2.8, 4.7), at(3.2, 4.7), at(3, 5.7)],
                "pencil",
                pen.fill("card"),
                calm(c, 1.4),
            );
            for (const s of [-1, 1])
                pen.line(
                    g,
                    (3 + s * 0.12) * U,
                    4.55 * U,
                    (3 + s * 0.3) * U,
                    4.25 * U,
                    "pencil",
                    calm(c, 1.3),
                );
            a.beak = [3 * U, 5.7 * U, "down"];
            a.tail = [3 * U, 0.7 * U, "up"];
        } else {
            // gliding towards us on long straight wings, dipped a little at their black tips
            for (const s of [-1, 1]) {
                const edge: Pt[] = [
                    at(3 + s * 0.35, 3.25),
                    at(3 + s * 1.6, 3.05),
                    at(3 + s * 2.75, 3.3),
                    at(3 + s * 1.6, 3.5),
                    at(3 + s * 0.35, 3.75),
                ];
                pen.polygon(g, edge, "pencil", pen.fill("card"), calm(c, 1.6));
                pen.polygon(
                    g,
                    [at(3 + s * 2.1, 3.14), at(3 + s * 2.75, 3.3), at(3 + s * 2.1, 3.45)],
                    "pencil",
                    pen.fill("ink"),
                    calm(c, 1.1),
                );
            }
            pen.polygon(
                g,
                [at(2.8, 3.9), at(3.2, 3.9), at(3, 4.8)],
                "pencil",
                pen.fill("card"),
                calm(c, 1.3),
            );
            pen.ellipse(
                g,
                3 * U,
                3.5 * U,
                0.8 * U,
                1 * U,
                "pencil",
                pen.fill("card"),
                calm(c, 1.7),
            );
            pen.circle(g, 3 * U, 2.95 * U, 0.72 * U, "pencil", pen.fill("glow"), calm(c, 1.5));
            pen.polygon(
                g,
                [at(2.9, 3.1), at(3.1, 3.1), at(3, 3.55)],
                "pencil",
                pen.fill("card"),
                calm(c, 1.1),
            );
            for (const s of [-1, 1])
                pen.circle(g, (3 + s * 0.14) * U, 2.9 * U, 4, "pencil", pen.fill("ink"), {
                    stroke: "none",
                });
            a.wing = [0.25 * U, 3.3 * U, "left"];
            a.head = [3 * U, 2.6 * U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A gannet, a big white seabird with black wing tips and a pale yellow head, ${p.diving > 0 ? "diving straight down towards the sea with its wings folded back" : "gliding towards us on long straight wings dipped a little at their tips"}.`,
    motion: {
        body: { is: "float", lift: 8, dx: 6, deg: 2, pivot: [0.5, 0.5], period: 7.2, units: true },
    },
});
