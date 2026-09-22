import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const SHAPES: Record<string, (n: number) => [number, number][]> = {
    square: (n) => [
        [0, 0],
        [n, 0],
        [n, n],
        [0, n],
    ],
    rectangle: (n) => [
        [0, n * 0.2],
        [n, n * 0.2],
        [n, n * 0.8],
        [0, n * 0.8],
    ],
    isosceles: (n) => [
        [n / 2, 0],
        [n, n],
        [0, n],
    ],
    ell: (n) => [
        [0, 0],
        [n * 0.55, 0],
        [n * 0.55, n * 0.55],
        [n, n * 0.55],
        [n, n],
        [0, n],
    ],
    hexagon: (n) =>
        Array.from({ length: 6 }, (_, i) => {
            const t = (Math.PI / 3) * i - Math.PI / 2;
            return [n / 2 + (n / 2) * Math.cos(t), n / 2 + (n / 2) * Math.sin(t)] as [
                number,
                number,
            ];
        }),
};

export const mirrorShape = defineDrawing({
    id: "mirror",
    family: "shapes",
    title: "Shape with a mirror line",
    group: "Structures",
    about: "One shape with a dashed line across it, so the child can ask whether the line is a line of symmetry.",
    params: { shape: "rectangle", line: "vertical", size: 6 },
    settings: {
        shape: { kind: "one of", of: ["square", "rectangle", "isosceles", "ell", "hexagon"] },
        line: { kind: "one of", of: ["vertical", "horizontal", "diagonal"] },
        size: { kind: "whole", min: 2, max: 8 },
    },
    takes: [
        {
            label: "A vertical mirror line",
            params: { shape: "rectangle", line: "vertical", size: 6 },
        },
        { label: "A diagonal one", params: { shape: "rectangle", line: "diagonal", size: 6 } },
    ],
    box: (p) => ({ w: p.size + 2, h: p.size + 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = p.size * U,
            ox = U,
            oy = U;
        const make = SHAPES[p.shape];
        if (make)
            pen.polygon(
                g,
                make(n).map(([x, y]) => [ox + x, oy + y] as [number, number]),
                "ruler",
                pen.fill("sky"),
                { strokeWidth: 2.2 },
            );
        else
            pen.circle(g, ox + n / 2, oy + n / 2, n, "ruler", pen.fill("sky"), {
                strokeWidth: 2.2,
            });
        const dash = { strokeWidth: 2, strokeLineDash: [9, 6], stroke: c.t.pen };
        const m = 10;
        if (p.line === "vertical")
            pen.line(g, ox + n / 2, oy - m, ox + n / 2, oy + n + m, "ruler", dash);
        else if (p.line === "horizontal")
            pen.line(g, ox - m, oy + n / 2, ox + n + m, oy + n / 2, "ruler", dash);
        else if (p.line === "diagonal")
            pen.line(g, ox - m, oy - m, ox + n + m, oy + n + m, "ruler", dash);
        return {
            centre: [ox + n / 2, oy + n / 2, "up"],
            top: [ox + n / 2, oy, "up"],
        };
    },
    describe: () =>
        "A shape on the grid with a dashed mirror line drawn across it, for the reflection to be drawn on the other side.",
});
