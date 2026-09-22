import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";

type Pt = [number, number];

export interface Plot {
    x: number;
    y: number;
    label: string;
}

export const coordGrid = defineDrawing({
    id: "coords",
    family: "shapes",
    title: "Coordinate grid",
    group: "Structures",
    about: "One unit to two squares, so a plotted point always lands on a crossing of the ruled page. Four quadrants or only the first; points can be joined, which turns plotting into drawing a shape.",
    params: { max: 6, quadrants: 1, points: [] as Plot[], join: false },
    settings: {
        max: { kind: "whole", min: 1, max: 12 },
        quadrants: { kind: "one of", of: [1, 4] },
        points: { kind: "fixed" },
        join: { kind: "flag" },
    },
    takes: [
        {
            label: "First quadrant, two points",
            params: {
                max: 6,
                quadrants: 1,
                points: [
                    { x: 2, y: 5, label: "A" },
                    { x: 5, y: 1, label: "B" },
                ],
                join: false,
            },
        },
        {
            label: "Four quadrants",
            params: {
                max: 4,
                quadrants: 4,
                points: [
                    { x: -3, y: 2, label: "P" },
                    { x: 2, y: -3, label: "Q" },
                ],
                join: false,
            },
        },
        {
            label: "Joined into a shape",
            params: {
                max: 6,
                quadrants: 1,
                points: [
                    { x: 1, y: 1, label: "" },
                    { x: 5, y: 1, label: "" },
                    { x: 5, y: 4, label: "" },
                    { x: 1, y: 4, label: "" },
                ],
                join: true,
            },
        },
        { label: "Empty grid", params: { max: 5, quadrants: 1, points: [], join: false } },
    ],
    box: (p) => ({
        w: (p.quadrants === 4 ? p.max * 4 : p.max * 2) + 4,
        h: (p.quadrants === 4 ? p.max * 4 : p.max * 2) + 4,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            four = p.quadrants === 4,
            lo = four ? -p.max : 0,
            s = 2 * U;
        const ox = (four ? p.max * 2 : 2.5) * U,
            oy = ((four ? p.max * 2 : p.max * 2) + 1.5) * U;
        const X = (v: number) => ox + v * s,
            Y = (v: number) => oy - v * s,
            a: RawAnchors = {};
        for (let v = lo; v <= p.max; v++) {
            pen.line(g, X(v), Y(p.max), X(v), Y(lo), "ruler", {
                strokeWidth: 1.1,
                stroke: c.t.grid,
            });
            pen.line(g, X(lo), Y(v), X(p.max), Y(v), "ruler", {
                strokeWidth: 1.1,
                stroke: c.t.grid,
            });
        }
        pen.line(g, X(lo) - 12, Y(0), X(p.max) + 16, Y(0), "ruler", { strokeWidth: 2 });
        pen.line(g, X(0), Y(lo) + 12, X(0), Y(p.max) - 16, "ruler", { strokeWidth: 2 });
        for (let v = lo; v <= p.max; v++) {
            if (v === 0) continue;
            pen.line(g, X(v), Y(0) - 5, X(v), Y(0) + 5, "ruler", { strokeWidth: 1.2 });
            pen.line(g, X(0) - 5, Y(v), X(0) + 5, Y(v), "ruler", { strokeWidth: 1.2 });
            num(c, X(v), Y(0) + 22, v, 12, "middle", c.t["ink-soft"]);
            num(c, X(0) - 12, Y(v) + 5, v, 12, "end", c.t["ink-soft"]);
        }
        num(c, X(p.max) + 14, Y(0) - 10, "x", 15);
        num(c, X(0) - 14, Y(p.max) - 12, "y", 15);
        if (p.join && p.points.length > 1) {
            pen.polygon(
                g,
                p.points.map((q) => [X(q.x), Y(q.y)] as Pt),
                "ruler",
                pen.fill("mint", "hachure", { hachureGap: 7 }),
                { strokeWidth: 2 },
            );
        }
        p.points.forEach((q, i) => {
            pen.circle(g, X(q.x), Y(q.y), 12, "ruler", pen.fill("berry"), { strokeWidth: 1.6 });
            if (q.label) {
                patch(c, X(q.x) + 20, Y(q.y) - 18, 26, 20);
                num(c, X(q.x) + 20, Y(q.y) - 12, q.label, 15);
            }
            a[`point(${i})`] = [X(q.x), Y(q.y) - 10, "up"];
        });
        a.origin = [X(0), Y(0), "down"];
        return a;
    },
    describe: (p) =>
        `A coordinate grid ruled in ink with numbered axes, one unit to two squares${p.points.length > 0 ? ", with points marked on it as dots" : ", with nothing plotted on it"}${p.join ? ", joined in order" : ""}.`,
});
