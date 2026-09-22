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

export const carrot = defineDrawing({
    id: "carrot",
    family: "food",
    title: "Carrot",
    group: "Props",
    about: "A carrot standing on the ground with its leaves up, the thing a rabbit crosses a stream for. It can lie flat instead.",
    params: { flat: 0 },
    settings: { flat: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Standing", params: { flat: 0 } },
        { label: "Lying flat", params: { flat: 1 } },
    ],
    box: (p) => (Number(p.flat) > 0 ? { w: 3, h: 2 } : { w: 2, h: 3 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            flat = Number(p.flat) > 0;
        const root = pen.fill("tang", "solid"),
            leaf = pen.fill("mint", "solid");
        if (flat) {
            pen.path(
                g,
                `M${0.75 * U} ${1.15 * U}Q${1.7 * U} ${0.7 * U} ${2.8 * U} ${1.05 * U}Q${1.7 * U} ${1.55 * U} ${0.75 * U} ${1.15 * U}Z`,
                "pencil",
                root,
                calm(c, 1.8),
            );
            for (const dx of [1.3, 1.9])
                pen.line(g, dx * U, 0.95 * U, dx * U + 2, 1.35 * U, "ruler", {
                    strokeWidth: 1,
                    stroke: c.t["ink-soft"],
                    disableMultiStroke: true,
                });
            for (const [tx, ty] of [
                [0.15, 0.55],
                [0.1, 1.1],
                [0.3, 1.65],
            ] as const) {
                pen.path(
                    g,
                    `M${0.8 * U} ${1.15 * U}Q${(0.8 * U + tx * U) / 2} ${(1.15 * U + ty * U) / 2 - 3} ${tx * U} ${ty * U}Q${(0.8 * U + tx * U) / 2} ${(1.15 * U + ty * U) / 2 + 3} ${0.8 * U} ${1.15 * U}Z`,
                    "pencil",
                    leaf,
                    calm(c, 1.4),
                );
            }
            return { top: [1.7 * U, 0.7 * U, "up"], foot: [1.7 * U, 1.55 * U, "down"] };
        }
        pen.path(
            g,
            `M${0.55 * U} ${1.1 * U}Q${U} ${0.82 * U} ${1.45 * U} ${1.1 * U}Q${1.4 * U} ${2.2 * U} ${U} ${2.88 * U}Q${0.6 * U} ${2.2 * U} ${0.55 * U} ${1.1 * U}Z`,
            "pencil",
            root,
            calm(c, 1.9),
        );
        for (const dy of [1.55, 2, 2.4])
            pen.line(
                g,
                0.72 * U + (dy - 1.55) * 3,
                dy * U,
                1.28 * U - (dy - 1.55) * 3,
                dy * U - 3,
                "ruler",
                { strokeWidth: 1, stroke: c.t["ink-soft"], disableMultiStroke: true },
            );
        for (const [tx, ty] of [
            [0.3, 0.35],
            [1, 0.12],
            [1.7, 0.35],
        ] as const) {
            pen.path(
                g,
                `M${U} ${1.05 * U}Q${(U + tx * U) / 2 - 3} ${(1.05 * U + ty * U) / 2} ${tx * U} ${ty * U}Q${(U + tx * U) / 2 + 3} ${(1.05 * U + ty * U) / 2} ${U} ${1.05 * U}Z`,
                "pencil",
                leaf,
                calm(c, 1.5),
            );
        }
        return { top: [U, 0.12 * U, "up"], foot: [U, 2.88 * U, "down"] };
    },
    describe: (p) =>
        Number(p.flat) > 0
            ? "An orange carrot lying flat on the ground seen from the side, its green leaves fanned out at one end and its point at the other."
            : "An orange carrot standing on its point with its green leaves up, seen from the side, lines across it where it is ridged.",
    motion: { still: "A carrot lies where it is put until something eats it." },
});
