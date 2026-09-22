import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

interface Net {
    w: number;
    h: number;
    faces: Pt[][];
}

const rect = (x: number, y: number, w = 1, h = 1): Pt[] => [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
];

const CUBE: Net = {
    w: 4,
    h: 3,
    faces: [rect(1, 0), rect(0, 1), rect(1, 1), rect(2, 1), rect(3, 1), rect(1, 2)],
};
const NETS: Record<string, Net> = {
    cube: CUBE,
    box: { w: 3, h: 3, faces: [rect(1, 0), rect(0, 1), rect(1, 1), rect(2, 1), rect(1, 2)] },
    pyramid: {
        w: 3,
        h: 3,
        faces: [
            rect(1, 1),
            [
                [1, 1],
                [2, 1],
                [1.5, 0.15],
            ],
            [
                [1, 2],
                [2, 2],
                [1.5, 2.85],
            ],
            [
                [1, 1],
                [1, 2],
                [0.15, 1.5],
            ],
            [
                [2, 1],
                [2, 2],
                [2.85, 1.5],
            ],
        ],
    },
    prism: {
        w: 5,
        h: 4,
        faces: [
            rect(1, 0, 3, 1),
            rect(1, 1, 3, 1),
            rect(1, 2, 3, 1),
            [
                [1, 1],
                [1, 2],
                [0, 1.5],
            ],
            [
                [4, 1],
                [4, 2],
                [5, 1.5],
            ],
        ],
    },
};

const edgeKey = (a: Pt, b: Pt): string => {
    const [p, q] = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a];
    return `${p[0]},${p[1]}-${q[0]},${q[1]}`;
};

export const netOfSolid = defineDrawing({
    id: "net",
    family: "shapes",
    title: "Net",
    group: "Structures",
    about: "A solid opened out flat on the squares. The edges that only one face owns are the cut edges and are drawn solid; the ones two faces share are folds, and are dashed.",
    params: { solid: "cube", cell: 2 },
    settings: {
        solid: { kind: "one of", of: ["cube", "box", "pyramid", "prism"] },
        cell: { kind: "one of", of: [1, 2] },
    },
    takes: [
        { label: "Cube", params: { solid: "cube", cell: 2 } },
        { label: "Open box", params: { solid: "box", cell: 2 } },
        { label: "Square pyramid", params: { solid: "pyramid", cell: 2 } },
        { label: "Triangular prism", params: { solid: "prism", cell: 2 } },
    ],
    box: (p) => {
        const n = NETS[p.solid] ?? CUBE;
        return { w: n.w * p.cell + 2, h: n.h * p.cell + 2 };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            n = NETS[p.solid] ?? CUBE,
            s = p.cell * U,
            o = U;
        const at = ([x, y]: Pt): Pt => [o + x * s, o + y * s];
        const seen = new Map<string, number>();
        for (const face of n.faces) {
            for (let i = 0; i < face.length; i++) {
                const k = edgeKey(face[i] ?? [0, 0], face[(i + 1) % face.length] ?? [0, 0]);
                seen.set(k, (seen.get(k) ?? 0) + 1);
            }
        }
        for (const face of n.faces) {
            pen.polygon(
                g,
                face.map(at),
                "ruler",
                pen.fill("sky", "solid", { hachureGap: 8, fillWeight: 0.6 }),
                { strokeWidth: 0 },
            );
        }
        const drawn = new Set<string>();
        for (const face of n.faces) {
            for (let i = 0; i < face.length; i++) {
                const A = face[i] ?? [0, 0],
                    B = face[(i + 1) % face.length] ?? [0, 0],
                    k = edgeKey(A, B);
                if (drawn.has(k)) continue;
                drawn.add(k);
                const fold = (seen.get(k) ?? 1) > 1,
                    [ax, ay] = at(A),
                    [bx, by] = at(B);
                pen.line(
                    g,
                    ax,
                    ay,
                    bx,
                    by,
                    "ruler",
                    fold
                        ? { strokeWidth: 1.3, strokeLineDash: [7, 6], stroke: c.t["ink-soft"] }
                        : { strokeWidth: 2.2 },
                );
            }
        }
        return {
            middle: [o + (n.w * s) / 2, o + (n.h * s) / 2, "up"],
            top: [o + (n.w * s) / 2, o, "up"],
        };
    },
    describe: () =>
        "The net of a solid drawn flat on the grid, its faces joined along their edges in the shape they fold up from, each face outlined in ink.",
});
