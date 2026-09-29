import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, penned } from "../lettering";

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

/** π as the lessons take it, so a cylinder's side and area come out as the child works them. */
const PI = 3.14;
const cents = (x: number): number => Math.round(x * 100) / 100;

/** The surface area of a cuboid, l by w by h, and of a cube when all three are the same. */
export const cuboidArea = (l: number, w: number, h: number): number => 2 * (l * w + l * h + w * h);

/** How long the cylinder's rectangle is: the circumference of its end, with π as 3.14. */
export const cylinderSide = (r: number): number => cents(2 * PI * r);

/** The surface area of a closed cylinder: two circles and the rectangle, with π as 3.14. */
export const cylinderArea = (r: number, h: number): number =>
    cents(2 * PI * r * r + 2 * PI * r * h);

/** A closed cuboid's net in length units: the top, front, bottom and back in a column, an end either side of the front. */
function cuboidNet(l: number, w: number, h: number): Net {
    return {
        w: l + 2 * w,
        h: 2 * w + 2 * h,
        faces: [
            rect(w, 0, l, w),
            rect(w, w, l, h),
            rect(w, w + h, l, w),
            rect(w, 2 * w + h, l, h),
            rect(0, w, w, h),
            rect(w + l, w, w, h),
        ],
    };
}

/** The cylinder's end radius and height in squares: one cell of radius, the height in step with `h` over `r` when both are given. */
function cylinderSize(p: { cell: number; r: number; h: number }): { R: number; H: number } {
    const R = p.cell,
        ratio = p.r > 0 && p.h > 0 ? p.h / p.r : 2;
    return { R, H: R * Math.max(1, Math.min(4, ratio)) };
}

const lengthsOf = (p: { solid: string; l: number; w: number; h: number }) => ({
    l: Math.max(1, Math.round(p.l || 4)),
    w: Math.max(1, Math.round(p.w || 3)),
    h: Math.max(1, Math.round(p.h || 2)),
});

type Write = (
    x: number,
    y: number,
    v: number,
    k: number,
    align: "start" | "middle" | "end",
) => void;

/** The cylinder's net: its rectangle, and a circle touching the middle of its top edge and of its bottom edge at a point. */
function cylinder<G>(
    c: Ctx<G>,
    p: { cell: number; r: number; h: number },
    ox: number,
    oy: number,
    named: boolean,
    write: Write,
): RawAnchors {
    const { pen, g } = c,
        { R, H } = cylinderSize(p),
        s = U,
        long = 2 * Math.PI * R * s,
        cx = ox + long / 2,
        top = oy + 2 * R * s,
        foot = top + H * s;
    const face = pen.fill("sky", "solid", { hachureGap: 8, fillWeight: 0.6 });
    pen.rect(g, ox, top, long, H * s, "ruler", face, { strokeWidth: 0 });
    for (const y of [oy + R * s, foot + R * s])
        pen.circle(g, cx, y, 2 * R * s, "ruler", face, { strokeWidth: 2.2 });
    pen.line(g, ox, top, ox, foot, "ruler", { strokeWidth: 2.2 });
    pen.line(g, ox + long, top, ox + long, foot, "ruler", { strokeWidth: 2.2 });
    for (const y of [top, foot]) pen.line(g, ox, y, ox + long, y, "ruler", { strokeWidth: 2.2 });
    const a: RawAnchors = {
        middle: [cx, (top + foot) / 2, "up"],
        top: [cx, oy, "up"],
        side: [ox + long / 2, foot, "down"],
    };
    if (named) {
        const cy = oy + R * s;
        pen.line(g, cx, cy, cx + R * s, cy, "ruler", { strokeWidth: 1.5 });
        pen.circle(
            g,
            cx,
            cy,
            4,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { stroke: "none" },
        );
        write(cx + R * s + 7, cy + 5, Math.round(p.r), 1, "start");
        write(ox - 7, (top + foot) / 2 + 5, Math.round(p.h), 3, "end");
        write(ox + (cx - R * s - ox) / 2, top - 7, cylinderSide(p.r), 4, "middle");
        a.radius = [cx + (R * s) / 2, cy, "up"];
        a.height = [ox, (top + foot) / 2, "left"];
    }
    return a;
}

const edgeKey = (a: Pt, b: Pt): string => {
    const [p, q] = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a];
    return `${p[0]},${p[1]}-${q[0]},${q[1]}`;
};

export const netOfSolid = defineDrawing({
    id: "net",
    family: "shapes",
    title: "Net",
    group: "Structures",
    about: "A solid opened out flat on the squares. The edges that only one face owns are the cut edges and are drawn solid; the ones two faces share are folds, and are dashed. A `cuboid` is drawn to scale, one square to a unit of `l`, `w` and `h`; a `cylinder` is its two circles on a rectangle as long as the circle's circumference, `cell` squares in radius and as tall as `h` over `r` says. When `l` (a cube's or cuboid's edge) or `r` (the cylinder's radius) is set, the edges carry their lengths in `unit`, and `ask` puts a question mark on one of them: 1 the length or the radius, 2 the width, 3 the height, 4 the cylinder's long side. The lessons take π as 3.14.",
    params: { solid: "cube", cell: 2, l: 0, w: 0, h: 0, r: 0, ask: 0, unit: "cm" },
    settings: {
        solid: { kind: "one of", of: ["cube", "box", "pyramid", "prism", "cuboid", "cylinder"] },
        cell: { kind: "one of", of: [1, 2] },
        l: { kind: "whole", min: 0, max: 10 },
        w: { kind: "whole", min: 0, max: 8 },
        h: { kind: "whole", min: 0, max: 10 },
        r: { kind: "whole", min: 0, max: 20 },
        ask: { kind: "whole", min: 0, max: 4 },
        unit: { kind: "one of", of: ["cm", "m"] },
    },
    takes: [
        {
            label: "Cube",
            params: { solid: "cube", cell: 2, l: 0, w: 0, h: 0, r: 0, ask: 0, unit: "cm" },
        },
        {
            label: "Open box",
            params: { solid: "box", cell: 2, l: 0, w: 0, h: 0, r: 0, ask: 0, unit: "cm" },
        },
        {
            label: "Square pyramid",
            params: { solid: "pyramid", cell: 2, l: 0, w: 0, h: 0, r: 0, ask: 0, unit: "cm" },
        },
        {
            label: "Triangular prism",
            params: { solid: "prism", cell: 2, l: 0, w: 0, h: 0, r: 0, ask: 0, unit: "cm" },
        },
        {
            label: "A cube with its edge",
            params: { solid: "cube", cell: 2, l: 5, w: 0, h: 0, r: 0, ask: 0, unit: "cm" },
        },
        {
            label: "A crate, its height asked",
            params: { solid: "cuboid", cell: 1, l: 6, w: 4, h: 3, r: 0, ask: 3, unit: "cm" },
        },
        {
            label: "A cylinder with its radius and height",
            params: { solid: "cylinder", cell: 2, l: 0, w: 0, h: 10, r: 3, ask: 4, unit: "cm" },
        },
        {
            label: "A plain cylinder",
            params: { solid: "cylinder", cell: 1, l: 0, w: 0, h: 0, r: 0, ask: 0, unit: "cm" },
        },
    ],
    box: (p) => {
        const named = (p.solid === "cylinder" ? p.r : p.l) > 0,
            mx = named ? 5 : 2,
            my = named ? 3 : 2;
        if (p.solid === "cuboid") {
            const k = lengthsOf(p),
                n = cuboidNet(k.l, k.w, k.h);
            return { w: n.w + mx, h: n.h + my };
        }
        if (p.solid === "cylinder") {
            const { R, H } = cylinderSize(p);
            return { w: Math.ceil(2 * Math.PI * R) + mx, h: Math.ceil(4 * R + H) + my };
        }
        const n = NETS[p.solid] ?? CUBE;
        return { w: n.w * p.cell + mx, h: n.h * p.cell + my };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            named = (p.solid === "cylinder" ? p.r : p.l) > 0,
            ox = named ? 3.5 * U : U,
            oy = named ? 2 * U : U,
            unit = p.unit === "m" ? "m" : "cm",
            ask = Math.round(p.ask),
            write = (
                x: number,
                y: number,
                v: number,
                k: number,
                align: "start" | "middle" | "end",
            ) =>
                ask === k
                    ? penned(c, x, y + 2, "?", 20, align)
                    : num(c, x, y, `${v} ${unit}`, 14, align);
        if (p.solid === "cylinder") return cylinder(c, p, ox, oy, named, write);
        const cuboid = p.solid === "cuboid",
            len = lengthsOf(p),
            n = cuboid ? cuboidNet(len.l, len.w, len.h) : (NETS[p.solid] ?? CUBE),
            s = cuboid ? U : p.cell * U;
        const at = ([x, y]: Pt): Pt => [ox + x * s, oy + y * s];
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
        const a: RawAnchors = {
            middle: [ox + (n.w * s) / 2, oy + (n.h * s) / 2, "up"],
            top: [ox + (n.w * s) / 2, oy, "up"],
        };
        if (named && cuboid) {
            const [lx, ly] = at([len.w + len.l / 2, 0]),
                [wx, wy] = at([len.w, len.w / 2]),
                [hx, hy] = at([0, len.w + len.h / 2]);
            write(lx, ly - 7, len.l, 1, "middle");
            write(wx - 7, wy + 5, len.w, 2, "end");
            write(hx - 7, hy + 5, len.h, 3, "end");
            a.length = [lx, ly, "up"];
            a.width = [wx, wy, "left"];
            a.height = [hx, hy, "left"];
        } else if (named && p.solid === "cube") {
            const [lx, ly] = at([1.5, 0]);
            write(lx, ly - 7, Math.round(p.l), 1, "middle");
            a.length = [lx, ly, "up"];
        }
        return a;
    },
    describe: (p) =>
        p.solid === "cylinder"
            ? "The net of a cylinder drawn flat on the grid: a rectangle with a circle joined to its top edge and another to its bottom edge."
            : p.solid === "cuboid"
              ? "The net of a closed cuboid drawn flat on the grid: a column of four rectangles with a rectangle joined to each side of the second."
              : "The net of a solid drawn flat on the grid, its faces joined along their edges in the shape they fold up from, each face outlined in ink.",
});
