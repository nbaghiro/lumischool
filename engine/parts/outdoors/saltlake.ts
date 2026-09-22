import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];
const W = 18 * U,
    LINE = 3.5 * U,
    FOOT = 7.8 * U;

/** The far range, as the points of its ridge from one end of the flat to the other. */
const RIDGE: Pt[] = [
    [0.3, 0],
    [1.6, 1.1],
    [2.7, 0.7],
    [4.2, 2.1],
    [5.4, 1.4],
    [6.5, 1.9],
    [7.6, 0.9],
    [9.3, 2.6],
    [10.8, 1.5],
    [12, 2],
    [13.1, 1.1],
    [14.6, 1.8],
    [16.1, 0.8],
    [17.7, 0],
];

/** A puff of cloud: three rounds on a flat base, `k` its size. Mirrored when `m` is -1, and dashed as a reflection. */
function cloud<G>(c: Ctx<G>, x: number, y: number, k: number, m: 1 | -1): void {
    const pts: Pt[] = [];
    for (const [dx, dy, r] of [
        [-0.9, -0.25, 0.55],
        [0, -0.55, 0.75],
        [0.95, -0.2, 0.5],
    ] as const) {
        for (let i = 0; i <= 8; i++) {
            const t = Math.PI + (i / 8) * Math.PI;
            pts.push([
                x + (dx + Math.cos(t) * r) * k * U,
                y + m * (dy + Math.sin(t) * r * 0.9) * k * U,
            ]);
        }
    }
    c.pen.polygon(
        c.g,
        [[x - 1.45 * k * U, y], ...pts.filter((q) => (q[1] - y) * m <= 0), [x + 1.45 * k * U, y]],
        "pencil",
        m > 0 ? c.pen.fill("card") : null,
        { strokeWidth: m > 0 ? 1.4 : 1.1, strokeLineDash: m > 0 ? undefined : [6, 5] },
    );
}

export const saltLake = defineDrawing({
    id: "saltlake",
    family: "outdoors",
    title: "Salt lake",
    group: "Props",
    about: "A wide white salt flat running out to a far range of low mountains under a cloud or two. Dry, its crust is cracked into cells of five and six sides that get smaller towards the mountains. After rain a thin sheet of water lies over it, and the mountains and the clouds stand upside down in it.",
    params: { flooded: 0 },
    settings: { flooded: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Dry and cracked", params: { flooded: 0 } },
        { label: "After rain, a mirror", params: { flooded: 1 } },
    ],
    box: () => ({ w: 18, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            wet = p.flooded > 0,
            a: RawAnchors = {};
        const ridge = RIDGE.map(([x, h]): Pt => [x * U, LINE - h * U]);
        // the mountains, and their shaded sides away from the light
        pen.polygon(
            g,
            ridge,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 7, fillWeight: 0.6 }),
            { strokeWidth: 1.7 },
        );
        for (let i = 1; i < ridge.length - 1; i++) {
            const [x, y] = ridge[i] ?? [0, 0],
                [nx] = ridge[i + 1] ?? [0, 0];
            if (y < LINE - 1.3 * U)
                pen.polygon(
                    g,
                    [
                        [x, y],
                        [x + (nx - x) * 0.55, LINE],
                        [x + 0.25 * U, LINE],
                    ],
                    "pencil",
                    pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
                    { stroke: "none" },
                );
        }
        cloud(c, 3.2 * U, 1.2 * U, 0.8, 1);
        cloud(c, 13.6 * U, 0.95 * U, 0.65, 1);
        pen.line(g, 0.1 * U, LINE, W - 0.1 * U, LINE, "pencil", { strokeWidth: 1.8 });
        if (wet) {
            // the sheet of water, the range and the clouds standing upside down in it, and a ripple or two
            pen.rect(
                g,
                0.1 * U,
                LINE + 2,
                W - 0.2 * U,
                FOOT - LINE - 2,
                "pencil",
                pen.fill("sky", "hachure", { hachureGap: 8, fillWeight: 0.5 }),
                { stroke: "none" },
            );
            pen.polygon(
                g,
                ridge.map(([x, y]): Pt => [x, LINE + (LINE - y) * 0.9]),
                "pencil",
                pen.fill("sky", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
                { strokeWidth: 1.1, strokeLineDash: [7, 5] },
            );
            cloud(c, 3.2 * U, LINE + (LINE - 1.2 * U) * 0.9 + 1.6 * U, 0.8, -1);
            cloud(c, 13.6 * U, LINE + (LINE - 0.95 * U) * 0.9 + 1.6 * U, 0.65, -1);
            for (const [x, y, w] of [
                [1.2, 6.9, 1.6],
                [7.4, 7.3, 2.1],
                [15.2, 7, 1.4],
                [10.6, 6.5, 1],
            ] as const)
                pen.curve(
                    g,
                    [
                        [x * U, y * U],
                        [(x + w / 2) * U, (y - 0.1) * U],
                        [(x + w) * U, y * U],
                    ],
                    "pencil",
                    { strokeWidth: 1.2 },
                );
        } else {
            // the crust as six-sided cells on the flat, seen in perspective: big at the front and smaller and
            // flatter towards the mountains, each cell drawing only its upper three edges so shared edges are drawn once
            const R = 1,
                B = 1.45 * U,
                A = FOOT + 0.9 * U - LINE,
                H = Math.sqrt(3) * R;
            const jit = (q: number, r: number) => 0.13 * Math.sin(q * 12.9898 + r * 78.233);
            const screen = (x: number, z: number): Pt => [W / 2 + (x * B) / z, LINE + A / z];
            const corner = (q: number, r: number, k: number): Pt => {
                const cxw = q * 1.5 * R,
                    czw = 1 + r * H + (q & 1 ? H / 2 : 0),
                    t = (k * Math.PI) / 3,
                    x = cxw + R * Math.cos(t),
                    z = czw - R * Math.sin(t);
                return screen(
                    x + jit(Math.round(x * 2), Math.round(z * 2)),
                    z + jit(Math.round(z * 2), Math.round(x * 2)) * 0.6,
                );
            };
            const inside = ([x, y]: Pt) =>
                x > 0.1 * U && x < W - 0.1 * U && y <= FOOT && y > LINE + 1.05 * U;
            for (let r = 0; r < 4; r++)
                for (let q = -40; q <= 40; q++) {
                    const edge = [
                        corner(q, r, 3),
                        corner(q, r, 2),
                        corner(q, r, 1),
                        corner(q, r, 0),
                    ].filter(inside);
                    if (edge.length < 2) continue;
                    const near = (edge[0]?.[1] ?? LINE) > LINE + 1.6 * U;
                    pen.linear(g, edge, "pencil", {
                        strokeWidth: near ? 1.15 : 0.8,
                        stroke: c.t["ink-soft"],
                        roughness: 0.7,
                    });
                }
            // a few flakes of salt catching the light at the front
            for (const [x, y] of [
                [2.3, 6.6],
                [6.8, 7.2],
                [11.5, 6.4],
                [15.4, 7],
                [9.2, 5.3],
            ] as const)
                pen.line(g, x * U - 6, y * U, x * U + 6, y * U, "pencil", { strokeWidth: 1.1 });
        }
        a.horizon = [W / 2, LINE, "up"];
        a.flat = [W / 2, 6 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A wide white salt flat running out to a far range of low mountains under a cloud or two, ${p.flooded > 0 ? "a sheet of water over it holding the mountains upside down" : "its dry crust cracked into cells, smaller towards the mountains"}.`,
    motion: {
        still: "A flat of salt is the ground itself; if it moved, everything on it would seem to slide.",
    },
});
