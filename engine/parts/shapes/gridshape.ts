import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";

type Pt = [number, number];

interface GridShapeParams {
    cols: number;
    rows: number;
    xs: number[];
    ys: number[];
    labels: string[];
    closed: boolean;
    /** False marks the corners only, with no sides drawn between them. */
    join: boolean;
}

/** A corner's place in user units: one grid step is two squares, counted from the top left. */
const at = (x: number, y: number): Pt => [(1.5 + 2 * x) * U, (1.5 + 2 * y) * U];

export const gridShape = defineDrawing<GridShapeParams>({
    id: "gridshape",
    family: "shapes",
    title: "Shape on a grid",
    group: "Structures",
    about: "Straight sides drawn from corner to corner of a dotted grid, each step two squares of the page, with the corners named by letters. Sides that run along the grid or cut it at the same slope can be checked for parallel and perpendicular by counting steps, not by eye.",
    params: {
        cols: 6,
        rows: 4,
        xs: [1, 4, 5, 2],
        ys: [3, 3, 1, 1],
        labels: ["A", "B", "C", "D"],
        closed: true,
        join: true,
    },
    settings: {
        cols: { kind: "whole", min: 2, max: 14 },
        rows: { kind: "whole", min: 2, max: 10 },
        xs: { kind: "numbers", min: 0, max: 14, most: 8 },
        ys: { kind: "numbers", min: 0, max: 10, most: 8 },
        labels: { kind: "words", most: 8 },
        closed: { kind: "flag" },
        join: { kind: "flag" },
    },
    takes: [
        {
            label: "A parallelogram",
            params: {
                cols: 6,
                rows: 4,
                xs: [1, 4, 5, 2],
                ys: [3, 3, 1, 1],
                labels: ["A", "B", "C", "D"],
                closed: true,
                join: true,
            },
        },
        {
            label: "A trapezium",
            params: {
                cols: 7,
                rows: 4,
                xs: [1, 6, 4, 2],
                ys: [3, 3, 1, 1],
                labels: ["P", "Q", "R", "S"],
                closed: true,
                join: true,
            },
        },
        {
            label: "Three corners, not joined",
            params: {
                cols: 5,
                rows: 4,
                xs: [1, 3, 4],
                ys: [3, 1, 3],
                labels: ["A", "B", "C"],
                closed: false,
                join: false,
            },
        },
        {
            label: "Two lines that meet square",
            params: {
                cols: 5,
                rows: 5,
                xs: [1, 4, 4],
                ys: [4, 4, 1],
                labels: ["E", "F", "G"],
                closed: false,
                join: true,
            },
        },
    ],
    box: (p) => ({ w: Math.round(p.cols) * 2 + 3, h: Math.round(p.rows) * 2 + 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cols = Math.round(p.cols),
            rows = Math.round(p.rows),
            a: RawAnchors = {};
        for (let x = 0; x <= cols; x++)
            for (let y = 0; y <= rows; y++) {
                const [px, py] = at(x, y);
                pen.circle(g, px, py, 3, "ruler", null, { strokeWidth: 1.4, stroke: c.t.grid });
            }
        const n = Math.min(p.xs.length, p.ys.length);
        const pts = Array.from({ length: n }, (_, i) => at(p.xs[i] ?? 0, p.ys[i] ?? 0));
        const sides = !p.join ? 0 : p.closed && n > 2 ? n : n - 1;
        for (let i = 0; i < sides; i++) {
            const from = pts[i],
                to = pts[(i + 1) % n];
            if (from && to)
                pen.line(g, from[0], from[1], to[0], to[1], "ruler", { strokeWidth: 2 });
        }
        // A corner's letter sits outside the shape, pushed away from the middle of the corners.
        const cx = pts.reduce((s, q) => s + q[0], 0) / Math.max(1, n),
            cy = pts.reduce((s, q) => s + q[1], 0) / Math.max(1, n);
        pts.forEach(([x, y], i) => {
            pen.circle(g, x, y, 8, "ruler", pen.fill("berry"), { strokeWidth: 1.4 });
            const label = p.labels[i];
            if (label) {
                const dx = x - cx,
                    dy = y - cy,
                    d = Math.hypot(dx, dy) || 1,
                    lx = x + (dx / d) * 18,
                    ly = y + (dy / d) * 18;
                patch(c, lx, ly, 20, 20);
                num(c, lx, ly + 6, label, 15);
            }
            a[`corner(${i})`] = [x, y, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A dotted grid with ${!p.join ? "points" : p.closed ? "a shape" : "lines"} of ${Math.min(p.xs.length, p.ys.length)} corners drawn on it in ink, each corner a dot${p.labels.length ? " named by a letter" : ""}.`,
});
