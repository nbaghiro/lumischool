import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say, soft } from "../lettering";

type Pt = readonly [number, number];

/** The counting grid, in squares; one square of it is one square of the page. */
const GW = 14,
    GH = 10;

interface Outline {
    name: string;
    /** Points in grid squares, joined by a smooth curve or, for a jagged edge, by straight lines. */
    pts: readonly Pt[];
    smooth: boolean;
}

// every edge was placed so that no square is cut by a sliver under a twentieth of it, or left
// whole but for one, so a child's count and the rule's agree; __tests__/gap-a1.test.ts holds it
const OUTLINES: readonly Outline[] = [
    {
        name: "lake",
        smooth: true,
        pts: [
            [1.9, 3.65],
            [4.05, 1.7],
            [7.6, 1.8],
            [9.85, 1.35],
            [12.1, 2.7],
            [12.3, 5.65],
            [11.1, 7.65],
            [8.3, 8.65],
            [5.7, 8.6],
            [3.55, 8.85],
            [1.5, 6.55],
        ],
    },
    {
        name: "field",
        smooth: false,
        pts: [
            [1.55, 1.3],
            [5.65, 1.05],
            [9.15, 0.55],
            [11.85, 3.25],
            [11, 8],
            [5.6, 8.8],
            [2.35, 6.1],
        ],
    },
    {
        name: "ice floe",
        smooth: false,
        pts: [
            [2.1, 2.3],
            [4.05, 1],
            [5.95, 2.4],
            [8.25, 0.45],
            [11.2, 1.75],
            [11.8, 4.15],
            [10.05, 5.4],
            [11.65, 7.35],
            [9.1, 8.75],
            [6.15, 8],
            [3.75, 8.95],
            [1.2, 7],
            [2.2, 5.15],
        ],
    },
    {
        name: "leaf",
        smooth: true,
        pts: [
            [1.25, 5.1],
            [1.25, 5.1],
            [2.95, 2.3],
            [6.35, 1.35],
            [9.45, 1.4],
            [12.25, 3.55],
            [13.4, 5],
            [13.4, 5],
            [11.8, 6.7],
            [9.75, 8.4],
            [6.5, 8.9],
            [3.1, 7.75],
        ],
    },
];

const outlineOf = (shape: number): Outline =>
    OUTLINES[Math.max(0, Math.min(OUTLINES.length - 1, Math.round(shape)))] ?? {
        name: "lake",
        smooth: true,
        pts: [],
    };

/** The outline as a closed polygon in grid squares: a Catmull-Rom curve through a smooth outline's points. */
function outlinePolygon(shape: number): Pt[] {
    const o = outlineOf(shape),
        n = o.pts.length;
    if (!o.smooth) return [...o.pts];
    const at = (i: number): Pt => o.pts[((i % n) + n) % n] ?? [0, 0];
    const out: Pt[] = [];
    for (let i = 0; i < n; i++) {
        const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
        for (let k = 0; k < 24; k++) {
            const t = k / 24,
                t2 = t * t,
                t3 = t2 * t;
            const f = (a: number, b: number, c: number, d: number): number =>
                0.5 *
                (2 * b +
                    (c - a) * t +
                    (2 * a - 5 * b + 4 * c - d) * t2 +
                    (3 * b - a - 3 * c + d) * t3);
            const q: Pt = [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])],
                last = out[out.length - 1];
            if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) > 1e-9) out.push(q);
        }
    }
    return out;
}

const shoelace = (poly: readonly Pt[]): number =>
    Math.abs(
        poly.reduce((s, [x, y], i) => {
            const [u, v] = poly[(i + 1) % poly.length] ?? [0, 0];
            return s + x * v - u * y;
        }, 0) / 2,
    );

/** The polygon cut to one square of the grid (Sutherland and Hodgman), for the share of it inside. */
function clipToSquare(poly: readonly Pt[], cx: number, cy: number): Pt[] {
    const edges: [(p: Pt) => boolean, (a: Pt, b: Pt) => Pt][] = [
        [(p) => p[0] >= cx, (a, b) => [cx, a[1] + ((b[1] - a[1]) * (cx - a[0])) / (b[0] - a[0])]],
        [
            (p) => p[0] <= cx + 1,
            (a, b) => [cx + 1, a[1] + ((b[1] - a[1]) * (cx + 1 - a[0])) / (b[0] - a[0])],
        ],
        [(p) => p[1] >= cy, (a, b) => [a[0] + ((b[0] - a[0]) * (cy - a[1])) / (b[1] - a[1]), cy]],
        [
            (p) => p[1] <= cy + 1,
            (a, b) => [a[0] + ((b[0] - a[0]) * (cy + 1 - a[1])) / (b[1] - a[1]), cy + 1],
        ],
    ];
    let out: Pt[] = [...poly];
    for (const [inside, cut] of edges) {
        const input = out;
        out = [];
        for (let i = 0; i < input.length; i++) {
            const cur = input[i] ?? [0, 0],
                prev = input[(i + input.length - 1) % input.length] ?? [0, 0];
            if (inside(cur)) {
                if (!inside(prev)) out.push(cut(prev, cur));
                out.push(cur);
            } else if (inside(prev)) out.push(cut(prev, cur));
        }
    }
    return out;
}

/** The share of each square of the grid inside the outline, row by row. */
export function sharesOf(shape: number): number[][] {
    const poly = outlinePolygon(shape);
    return Array.from({ length: GH }, (_, y) =>
        Array.from({ length: GW }, (_, x) => shoelace(clipToSquare(poly, x, y))),
    );
}

const WHOLE = 1 - 1e-9,
    ANY = 1e-9;

/**
 * The rule the lessons count by: a square wholly inside is whole, one the edge crosses is a part, and
 * the area is about the whole squares and half the part ones.
 */
export function squaresOf(shape: number): { whole: number; part: number } {
    const all = sharesOf(shape).flat();
    return {
        whole: all.filter((s) => s >= WHOLE).length,
        part: all.filter((s) => s > ANY && s < WHOLE).length,
    };
}

/** The estimate in squares: every whole square and half of every part one. */
export const estimateSquares = (shape: number): number => {
    const { whole, part } = squaresOf(shape);
    return whole + part / 2;
};

/** The outline's own area in squares, which the estimate is held near. */
export const exactSquares = (shape: number): number => shoelace(outlinePolygon(shape));

/** What one square stands for in square metres, or in square kilometres when the side is in km. */
export const squareArea = (side: number): number => side * side;

/** How one square's area is written: in hectares when a whole number of them, else in square units. */
export function squareWords(side: number, unit: string): string {
    const a = squareArea(side);
    if (unit !== "m") return `${a} ${unit}²`;
    return a % 10000 === 0 ? `${a / 10000} ha` : `${a} m²`;
}

const FILL = ["sky", "mint", "card", "mint"] as const;

export const outlineArea = defineDrawing({
    id: "outlinearea",
    family: "measuring",
    title: "Outline on squares",
    group: "Structures",
    about: "An irregular shape drawn over squares to estimate its area: a lake, a field, an ice floe or a leaf (`shape` 0 to 3), on a grid of 14 by 10 squares. `side` and `unit` say how long a square's side is in real life, written under the grid with what one square's area comes to. With `mark` 1 each whole square gets a dot and each square the edge crosses a ring, and with `show` 1 the counts are written under it. The rule is exact from the outline: whole squares plus half the part squares.",
    params: { shape: 0, side: 100, unit: "m", mark: 0, show: 0 },
    settings: {
        shape: { kind: "whole", min: 0, max: 3 },
        side: { kind: "number", min: 1, max: 1000, step: 1 },
        unit: { kind: "one of", of: ["cm", "m", "km"] },
        mark: { kind: "whole", min: 0, max: 1 },
        show: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "A lake, 1 ha squares",
            params: { shape: 0, side: 100, unit: "m", mark: 0, show: 0 },
        },
        {
            label: "A field, squares marked and counted",
            params: { shape: 1, side: 50, unit: "m", mark: 1, show: 1 },
        },
        {
            label: "An ice floe, marked",
            params: { shape: 2, side: 1, unit: "km", mark: 1, show: 0 },
        },
        {
            label: "A leaf on centimetre squares",
            params: { shape: 3, side: 1, unit: "cm", mark: 0, show: 0 },
        },
    ],
    box: () => ({ w: GW + 2, h: GH + 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = U,
            y0 = U,
            at = ([x, y]: Pt): [number, number] => [x0 + x * U, y0 + y * U],
            shape = Math.max(0, Math.min(3, Math.round(p.shape))),
            marked = Math.round(p.mark) === 1,
            a: RawAnchors = {};
        const poly = outlinePolygon(shape).map(at);
        if (!marked)
            pen.polygon(
                g,
                poly,
                "ruler",
                pen.fill(FILL[shape] ?? "sky", "hachure", { hachureGap: 7 }),
                {
                    stroke: "none",
                },
            );
        for (let i = 0; i <= GW; i++)
            pen.line(g, x0 + i * U, y0, x0 + i * U, y0 + GH * U, "ruler", {
                strokeWidth: i % GW === 0 ? 1.4 : 0.8,
                stroke: c.t["ink-soft"],
                disableMultiStroke: true,
            });
        for (let j = 0; j <= GH; j++)
            pen.line(g, x0, y0 + j * U, x0 + GW * U, y0 + j * U, "ruler", {
                strokeWidth: j % GH === 0 ? 1.4 : 0.8,
                stroke: c.t["ink-soft"],
                disableMultiStroke: true,
            });
        if (marked) {
            sharesOf(shape).forEach((row, y) =>
                row.forEach((s, x) => {
                    const cx = x0 + (x + 0.5) * U,
                        cy = y0 + (y + 0.5) * U;
                    if (s >= WHOLE)
                        pen.circle(
                            g,
                            cx,
                            cy,
                            6,
                            "ruler",
                            { fill: c.t.pen, fillStyle: "solid" },
                            {
                                stroke: "none",
                            },
                        );
                    else if (s > ANY)
                        pen.circle(g, cx, cy, 9, "ruler", null, {
                            strokeWidth: 1.4,
                            stroke: c.t.pen,
                        });
                }),
            );
        }
        pen.polygon(g, poly, "ruler", null, {
            strokeWidth: 2.2,
            disableMultiStroke: true,
            preserveVertices: true,
        });
        if (shape === 3) {
            const base = at([1.25, 5.1]),
                tip = at([13.4, 5]);
            pen.line(g, base[0] - 1.2 * U, base[1] + 0.9 * U, base[0], base[1], "ruler", {
                strokeWidth: 2,
            });
            pen.curve(
                g,
                [base, [(base[0] + tip[0]) / 2, base[1] - 0.35 * U], [tip[0] - 0.6 * U, tip[1]]],
                "ruler",
                { strokeWidth: 1.2, stroke: c.t["ink-soft"] },
            );
        }
        const base = y0 + GH * U,
            side = Math.max(1, p.side),
            unit = p.unit === "km" || p.unit === "cm" ? p.unit : "m";
        // one square's side, drawn as a bar under the grid's first square
        pen.line(g, x0, base + 0.9 * U, x0 + U, base + 0.9 * U, "ruler", { strokeWidth: 2 });
        for (const x of [x0, x0 + U])
            pen.line(g, x, base + 0.65 * U, x, base + 1.15 * U, "ruler", { strokeWidth: 1.6 });
        say(
            c,
            x0 + 1.4 * U,
            base + 1.2 * U,
            `1 square is ${side} ${unit} by ${side} ${unit}, so ${squareWords(side, unit)}`,
            13,
            "start",
        );
        if (Math.round(p.show) === 1) {
            const { whole, part } = squaresOf(shape);
            soft(c, x0, base + 2.5 * U, "whole squares", 13, "start");
            num(c, x0 + 4.8 * U, base + 2.5 * U, whole, 15, "start");
            soft(c, x0 + 7 * U, base + 2.5 * U, "part squares", 13, "start");
            num(c, x0 + 11.4 * U, base + 2.5 * U, part, 15, "start");
        }
        a.shape = [...at([GW / 2, 0]), "up"];
        a.scale = [x0 + 0.5 * U, base + 0.9 * U, "down"];
        a.name = [...at([GW / 2, GH]), "down"];
        return a;
    },
    describe: (p) =>
        `The outline of ${outlineOf(p.shape).name === "ice floe" ? "an" : "a"} ${outlineOf(p.shape).name} drawn over a grid of squares, with a bar under the grid showing how long one square's side is.`,
    reads: true,
    motion: { still: "Its squares are counted, so the outline and the grid hold still." },
});
