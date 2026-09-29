import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num, patch } from "../lettering";

type Pt = [number, number];

/** The corners in the shape's own units, x to the right and y down from the top of the height. */
function corners(kind: string, base: number, top: number, height: number, shift: number): Pt[] {
    if (kind === "triangle")
        return [
            [0, height],
            [base, height],
            [shift, 0],
        ];
    const across = kind === "parallelogram" ? base : top;
    return [
        [0, height],
        [base, height],
        [shift + across, 0],
        [shift, 0],
    ];
}

/** How far the shape reaches to the right, in its own units. */
const reach = (p: { kind: string; base: number; top: number; shift: number }): number =>
    Math.max(
        p.base,
        p.shift + (p.kind === "triangle" ? 0 : p.kind === "parallelogram" ? p.base : p.top),
    );

export const areaShape = defineDrawing({
    id: "areashape",
    family: "shapes",
    title: "Shape with its base and height",
    group: "Structures",
    about: "A triangle, a parallelogram or a trapezium ruled on the squares, its base along the bottom and its height dashed straight down with a right angle, each written with its length or left as a question. The sloping sides carry no length, so the area has to come from the base and the height.",
    params: { kind: "triangle", base: 8, top: 4, height: 5, shift: 3, cell: 2, ask: 0, unit: "cm" },
    settings: {
        kind: { kind: "one of", of: ["triangle", "parallelogram", "trapezium"] },
        base: { kind: "whole", min: 2, max: 14 },
        top: { kind: "whole", min: 1, max: 14 },
        height: { kind: "whole", min: 2, max: 12 },
        shift: { kind: "whole", min: 0, max: 14 },
        cell: { kind: "one of", of: [1, 2] },
        ask: { kind: "one of", of: [0, 1, 2, 3] },
        unit: { kind: "text", most: 4 },
    },
    takes: [
        {
            label: "A triangle",
            params: {
                kind: "triangle",
                base: 8,
                top: 4,
                height: 5,
                shift: 3,
                cell: 2,
                ask: 0,
                unit: "cm",
            },
        },
        {
            label: "A parallelogram",
            params: {
                kind: "parallelogram",
                base: 7,
                top: 7,
                height: 4,
                shift: 3,
                cell: 2,
                ask: 0,
                unit: "m",
            },
        },
        {
            label: "A trapezium",
            params: {
                kind: "trapezium",
                base: 10,
                top: 5,
                height: 6,
                shift: 2,
                cell: 2,
                ask: 0,
                unit: "m",
            },
        },
        {
            label: "A triangle leaning out, its height asked",
            params: {
                kind: "triangle",
                base: 5,
                top: 1,
                height: 6,
                shift: 9,
                cell: 2,
                ask: 2,
                unit: "cm",
            },
        },
    ],
    box: (p) => ({ w: reach(p) * p.cell + 4, h: p.height * p.cell + 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = p.cell * U,
            ox = U,
            oy = 2 * U,
            unit = p.unit ? ` ${p.unit}` : "";
        const at = ([x, y]: Pt): Pt => [ox + x * s, oy + y * s];
        const pts = corners(p.kind, p.base, p.top, p.height, p.shift).map(at);
        const said = (v: number, which: number): string => (p.ask === which ? "?" : `${v}${unit}`);
        pen.polygon(g, pts, "ruler", pen.fill("mint", "hachure", { hachureGap: 9 }), {
            strokeWidth: 2.4,
        });
        // The height is dropped from the top corner at the left, on to the base or the base carried
        // on, so the dashed line and its right angle sit where a child would rule them.
        const [hx] = at([p.shift, 0]);
        const [, top] = at([0, 0]);
        const [, bottom] = at([0, p.height]);
        const dash = { strokeWidth: 1.8, strokeLineDash: [8, 6], stroke: c.t.pen };
        pen.line(g, hx, top, hx, bottom, "ruler", dash);
        if (p.shift > p.base) pen.line(g, ox + p.base * s, bottom, hx, bottom, "ruler", dash);
        const sq = 0.5 * U,
            side = p.shift > 0 ? -1 : 1;
        pen.linear(
            g,
            [
                [hx + side * sq, bottom],
                [hx + side * sq, bottom - sq],
                [hx, bottom - sq],
            ],
            "ruler",
            { strokeWidth: 1.2 },
        );
        const a: RawAnchors = {};
        const baseSaid = said(p.base, 1);
        num(c, ox + (p.base * s) / 2, bottom + 22, baseSaid, 16);
        a.base = [ox + (p.base * s) / 2, bottom, "down"];
        const heightSaid = said(p.height, 2);
        const hy = (top + bottom) / 2;
        patch(c, hx + 8 + (heightSaid.length * 9) / 2, hy, heightSaid.length * 9 + 8, 18);
        num(c, hx + 8, hy + 5, heightSaid, 16, "start");
        a.height = [hx, hy, "right"];
        if (p.kind === "trapezium") {
            const mid = ox + (p.shift + p.top / 2) * s;
            num(c, mid, top - 8, said(p.top, 3), 16);
            a.top = [mid, top, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A shaded ${p.kind} on squared paper, its height dashed down to the base at a right angle, with the base${p.kind === "trapezium" ? ", height and top" : " and height"} written beside them.`,
    motion: { still: STILL.instrument },
});
