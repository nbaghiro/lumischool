import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";

type Pt = [number, number];

interface Marked {
    pts: Pt[];
    equal: number[][];
    parallel: number[][];
    right: number[];
}

const PARALLELOGRAM: Marked = {
    pts: [
        [1, 4],
        [3, 1],
        [9, 1],
        [7, 4],
    ],
    equal: [
        [0, 2],
        [1, 3],
    ],
    parallel: [
        [0, 2],
        [1, 3],
    ],
    right: [],
};
const SHAPES: Record<string, Marked> = {
    parallelogram: PARALLELOGRAM,
    trapezium: {
        pts: [
            [1, 4],
            [3, 1],
            [7, 1],
            [9, 4],
        ],
        equal: [[1, 3]],
        parallel: [[0, 2]],
        right: [],
    },
    rhombus: {
        pts: [
            [1, 3],
            [4, 1],
            [7, 3],
            [4, 5],
        ],
        equal: [[0, 1, 2, 3]],
        parallel: [
            [0, 2],
            [1, 3],
        ],
        right: [],
    },
    kite: {
        pts: [
            [4, 0],
            [7, 3],
            [4, 6],
            [1, 3],
        ],
        equal: [
            [0, 3],
            [1, 2],
        ],
        parallel: [],
        right: [],
    },
    isosceles: {
        pts: [
            [4, 1],
            [7, 5],
            [1, 5],
        ],
        equal: [[0, 2]],
        parallel: [],
        right: [],
    },
    "right-angled": {
        pts: [
            [1, 1],
            [1, 5],
            [7, 5],
        ],
        equal: [],
        parallel: [],
        right: [0],
    },
};

export const shapeMarks = defineDrawing({
    id: "shapemarks",
    family: "shapes",
    title: "Shape with its marks",
    group: "Structures",
    about: "The conventions written on the shape itself: ticks for sides of equal length, arrows for sides that are parallel, a small square for a right angle. Naming a quadrilateral is reading these off.",
    params: { kind: "parallelogram", labels: true },
    settings: {
        kind: {
            kind: "one of",
            of: ["parallelogram", "trapezium", "rhombus", "kite", "isosceles", "right-angled"],
        },
        labels: { kind: "flag" },
    },
    takes: [
        { label: "Parallelogram", params: { kind: "parallelogram", labels: true } },
        { label: "Trapezium", params: { kind: "trapezium", labels: true } },
        { label: "Rhombus", params: { kind: "rhombus", labels: true } },
        { label: "Kite", params: { kind: "kite", labels: true } },
        { label: "Right-angled triangle", params: { kind: "right-angled", labels: true } },
        { label: "Isosceles, unnamed", params: { kind: "isosceles", labels: false } },
    ],
    box: () => ({ w: 11, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            sh = SHAPES[p.kind] ?? PARALLELOGRAM,
            o = U;
        const pts = sh.pts.map(([x, y]) => [o + x * U, o + (y + 0.5) * U] as Pt);
        pen.polygon(
            g,
            pts,
            "ruler",
            pen.fill("mint", "solid", { hachureGap: 8, fillWeight: 0.6 }),
            { strokeWidth: 2.4 },
        );
        const side = (i: number): [Pt, Pt] => [
            pts[i] ?? [0, 0],
            pts[(i + 1) % pts.length] ?? [0, 0],
        ];
        const mark = (i: number, n: number, kind: "tick" | "arrow") => {
            const [A, B] = side(i),
                t = kind === "tick" ? 0.36 : 0.64;
            const mx = A[0] + (B[0] - A[0]) * t,
                my = A[1] + (B[1] - A[1]) * t;
            const dx = B[0] - A[0],
                dy = B[1] - A[1],
                L = Math.hypot(dx, dy) || 1,
                ux = dx / L,
                uy = dy / L;
            for (let k = 0; k < n; k++) {
                const off = (k - (n - 1) / 2) * 9,
                    px = mx + ux * off,
                    py = my + uy * off;
                if (kind === "tick")
                    pen.line(g, px + uy * 8, py - ux * 8, px - uy * 8, py + ux * 8, "ruler", {
                        strokeWidth: 1.8,
                    });
                else
                    pen.linear(
                        g,
                        [
                            [px - ux * 7 + uy * 7, py - uy * 7 - ux * 7],
                            [px, py],
                            [px - ux * 7 - uy * 7, py - uy * 7 + ux * 7],
                        ],
                        "ruler",
                        { strokeWidth: 1.6 },
                    );
            }
        };
        sh.equal.forEach((group, gi) => group.forEach((i) => mark(i, gi + 1, "tick")));
        sh.parallel.forEach((group, gi) => group.forEach((i) => mark(i, gi + 1, "arrow")));
        for (const i of sh.right) {
            const [A, B] = side(i),
                [, C] = side((i + 1) % pts.length),
                s = 15;
            const u1: Pt = [
                (B[0] - A[0]) / Math.hypot(B[0] - A[0], B[1] - A[1]),
                (B[1] - A[1]) / Math.hypot(B[0] - A[0], B[1] - A[1]),
            ];
            const u2: Pt = [
                (C[0] - B[0]) / Math.hypot(C[0] - B[0], C[1] - B[1]),
                (C[1] - B[1]) / Math.hypot(C[0] - B[0], C[1] - B[1]),
            ];
            pen.linear(
                g,
                [
                    [B[0] - u1[0] * s, B[1] - u1[1] * s],
                    [B[0] - u1[0] * s + u2[0] * s, B[1] - u1[1] * s + u2[1] * s],
                    [B[0] + u2[0] * s, B[1] + u2[1] * s],
                ],
                "ruler",
                { strokeWidth: 1.5 },
            );
        }
        const a: RawAnchors = {};
        pts.forEach((q, i) => {
            a[`corner(${i})`] = [q[0], q[1], "up"];
        });
        if (p.labels) soft(c, 5.5 * U, 8.4 * U, p.kind, 15);
        return a;
    },
    describe: (p) =>
        `A four-sided or three-sided shape with its equal sides ticked, its parallel sides arrowed and its right angles marked${p.labels ? ", and its name written under it" : ""}.`,
});
