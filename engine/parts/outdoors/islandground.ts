import { plain, type Ctx } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash, wash } from "./wash";

interface P {
    x: number;
    y: number;
}

/** The treasure island, in squares with y growing downwards: the sea all round it is the rest of the world. */
export const ISLAND = { w: 60, h: 48 } as const;

/** The island's map grid: twelve columns lettered A to L along the top and nine rows numbered down the side. */
export const GRID = { x: 12, y: 9, cell: 3, cols: 12, rows: 9 } as const;

/** Where the sand meets the sea, round the island clockwise from its north-west. */
export const COAST: readonly P[] = [
    { x: 9.6, y: 9 },
    { x: 12.5, y: 6.2 },
    { x: 18, y: 5.2 },
    { x: 25, y: 5.6 },
    { x: 32, y: 4.8 },
    { x: 39, y: 5.2 },
    { x: 45.5, y: 5 },
    { x: 50.5, y: 7 },
    { x: 53.4, y: 11.5 },
    { x: 52.6, y: 17.5 },
    { x: 54, y: 23.5 },
    { x: 53.4, y: 30.5 },
    { x: 51, y: 36 },
    { x: 45.5, y: 39 },
    { x: 38, y: 40 },
    { x: 32.2, y: 40.4 },
    { x: 27, y: 40.4 },
    { x: 21, y: 40 },
    { x: 14.5, y: 39.3 },
    { x: 10.2, y: 37.2 },
    { x: 7.8, y: 32 },
    { x: 7, y: 28.5 },
    { x: 7.4, y: 22.5 },
    { x: 7.6, y: 16 },
    { x: 8.2, y: 11.8 },
];

/** The middle the coast is drawn round, which the shallows and the grass are scaled about. */
const MIDDLE = { x: 30.5, y: 22.6 };
const scaled = (pts: readonly P[], kx: number, ky: number): P[] =>
    pts.map((p) => ({ x: MIDDLE.x + (p.x - MIDDLE.x) * kx, y: MIDDLE.y + (p.y - MIDDLE.y) * ky }));

/** The pale water over sand just off the beach. */
const SHALLOWS = scaled(COAST, 1.08, 1.1);

/** Where the grass starts, a band of beach in from the coast all round. */
export const GRASS: readonly P[] = scaled(COAST, 0.83, 0.8);

/** The thick green north-east of the middle, walked through slowly. */
export const JUNGLE: readonly P[] = [
    { x: 35.4, y: 9.4 },
    { x: 41.5, y: 8.9 },
    { x: 45.8, y: 10.2 },
    { x: 46.2, y: 14.4 },
    { x: 42.2, y: 15.8 },
    { x: 37.2, y: 15.5 },
    { x: 35, y: 13 },
];

export const POND = { x: 18, y: 18, rx: 2.7, ry: 2.3 } as const;

/** Where each landmark stands, by the middle of its foot. */
export const SPOTS = {
    palm: { x: 21.6, y: 25.2 },
    rock: { x: 37.5, y: 25.6 },
    lighthouse: { x: 47, y: 16.8 },
    cave: { x: 28.5, y: 20.7 },
    wreck: { x: 9.4, y: 28.6 },
    parrot: { x: 40.4, y: 31.6 },
} as const;
export type Spot = keyof typeof SPOTS;

/** The jetty out into the sea, walked along: its foot is on the beach. */
export const DOCK = { x: 28.8, y: 39.4, w: 2.8, h: 6 } as const;

/** The ground walked on: the coast, with the jetty let into it. */
export const WALK: readonly P[] = [
    ...COAST.slice(0, 16),
    { x: DOCK.x + DOCK.w, y: 40.4 },
    { x: DOCK.x + DOCK.w, y: DOCK.y + DOCK.h },
    { x: DOCK.x, y: DOCK.y + DOCK.h },
    { x: DOCK.x, y: 40.4 },
    ...COAST.slice(16),
];

/** Whether a point is inside an outline. */
export function within(pts: readonly P[], p: P): boolean {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i],
            b = pts[j];
        if (!a || !b) continue;
        if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
            inside = !inside;
    }
    return inside;
}

const inPond = (p: P): boolean =>
    ((p.x - POND.x) / POND.rx) ** 2 + ((p.y - POND.y) / POND.ry) ** 2 < 1;

/** An outline cut to a box, so what is drawn of it stays inside the box. */
function clip(pts: readonly P[], x0: number, y0: number, x1: number, y1: number): P[] {
    const edges: [(p: P) => boolean, (a: P, b: P) => P][] = [
        [
            (p) => p.x >= x0,
            (a, b) => ({ x: x0, y: a.y + ((b.y - a.y) * (x0 - a.x)) / (b.x - a.x) }),
        ],
        [
            (p) => p.x <= x1,
            (a, b) => ({ x: x1, y: a.y + ((b.y - a.y) * (x1 - a.x)) / (b.x - a.x) }),
        ],
        [
            (p) => p.y >= y0,
            (a, b) => ({ x: a.x + ((b.x - a.x) * (y0 - a.y)) / (b.y - a.y), y: y0 }),
        ],
        [
            (p) => p.y <= y1,
            (a, b) => ({ x: a.x + ((b.x - a.x) * (y1 - a.y)) / (b.y - a.y), y: y1 }),
        ],
    ];
    let out: P[] = [...pts];
    for (const [keep, cross] of edges) {
        const was = out;
        out = [];
        for (let i = 0; i < was.length; i++) {
            const a = was[(i + was.length - 1) % was.length],
                b = was[i];
            if (!a || !b) continue;
            if (keep(b)) {
                if (!keep(a)) out.push(cross(a, b));
                out.push(b);
            } else if (keep(a)) out.push(cross(a, b));
        }
    }
    return out;
}

const area = (pts: readonly P[]): number =>
    pts.reduce((s, a, i) => {
        const b = pts[(i + 1) % pts.length] ?? a;
        return s + a.x * b.y - b.x * a.y;
    }, 0);

/** An outline as a path, turned the way `clockwise` asks, so one laid inside another is a hole in it. */
const pathOf = (pts: readonly P[], clockwise: boolean): string => {
    if (pts.length < 3) return "";
    const turned = area(pts) > 0 === clockwise ? pts : [...pts].reverse();
    return `M${turned.map((p) => `${(p.x * U).toFixed(1)} ${(p.y * U).toFixed(1)}`).join("L")}Z`;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const whole = (v: unknown, lo: number, hi: number, d: number) =>
    clamp(Math.round(Number(v) || d), lo, hi);

/** The pencil's calm line for an edge, one stroke with its corners kept. */
const calm = <G>(c: Ctx<G>, strokeWidth: number, stroke: string) => ({
    strokeWidth,
    stroke,
    roughness: 0.5 * c.pen.o.roughness,
    bowing: 0.6 * c.pen.o.roughness,
    disableMultiStroke: true,
});

export const islandGround = defineDrawing<{
    across: number;
    deep: number;
    x0: number;
    y0: number;
    grid: boolean;
}>({
    id: "islandground",
    family: "outdoors",
    title: "Treasure island",
    group: "Structures",
    about: "The treasure island seen from above, drawn in lengths that meet: a sandy beach all round, grass inside it, a jungle to the north-east, a pond, the pale shallows and the open sea, with the map's grid of squares pegged out faintly over the land.",
    params: { across: 20, deep: 16, x0: 12, y0: 18, grid: true },
    settings: {
        across: { kind: "whole", min: 1, max: 36 },
        deep: { kind: "whole", min: 1, max: 40 },
        x0: { kind: "whole", min: -40, max: 100 },
        y0: { kind: "whole", min: -40, max: 100 },
        grid: { kind: "flag" },
    },
    takes: [
        {
            label: "The palm tree's side",
            params: { across: 20, deep: 16, x0: 6, y0: 16, grid: true },
        },
        {
            label: "The pond and the jungle",
            params: { across: 36, deep: 24, x0: 10, y0: 4, grid: true },
        },
        { label: "The whole island", params: { across: 36, deep: 30, x0: 4, y0: 4, grid: false } },
    ],
    box: (p) => ({ w: whole(p.across, 1, 36, 20), h: whole(p.deep, 1, 40, 16) }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = whole(p.across, 1, 36, 20),
            h = whole(p.deep, 1, 40, 16),
            ox = Math.round(Number(p.x0) || 0),
            oy = Math.round(Number(p.y0) || 0);
        const local = (pts: readonly P[]): P[] => pts.map((q) => ({ x: q.x - ox, y: q.y - oy }));
        const cut = (pts: readonly P[], m = 0) => clip(local(pts), m, m, w - m, h - m);
        const at = (q: P): P => ({ x: q.x + ox, y: q.y + oy });
        const box = `M0 0H${w * U}V${h * U}H0Z`;
        const shallows = cut(SHALLOWS),
            coast = cut(COAST),
            grass = cut(GRASS),
            jungle = cut(JUNGLE);
        // the open sea, then the shallows over the sand under the water, each round a hole for what is inside it
        wash(c, `${box}${pathOf(shallows, false)}`, "sky", 0.3, true);
        if (shallows.length)
            wash(c, `${pathOf(shallows, true)}${pathOf(coast, false)}`, "sky", 0.14, false);
        if (coast.length)
            wash(c, `${pathOf(coast, true)}${pathOf(grass, false)}`, "glow", 0.26, false);
        if (grass.length)
            wash(c, `${pathOf(grass, true)}${pathOf(jungle, false)}`, "mint", 0.22, false);
        if (jungle.length) wash(c, pathOf(jungle, true), "mint", 0.3, false);

        // one small thing at most in each cell of a square, placed by the cell's place on the island, so lengths meet
        for (let j = 0; j < h; j++)
            for (let i = 0; i < w; i++) {
                const gx = ox + i,
                    gy = oy + j,
                    r = hash(gx, gy);
                const q = {
                    x: gx + 0.2 + hash(gx, gy, 1) * 0.6,
                    y: gy + 0.25 + hash(gx, gy, 2) * 0.6,
                };
                const x = (q.x - ox) * U,
                    y = (q.y - oy) * U;
                if (x < 8 || x > w * U - 8 || y < 10 || y > h * U - 6) continue;
                const onCoast = within(COAST, q),
                    onGrass = within(GRASS, q),
                    inJungle = within(JUNGLE, q);
                if (!onCoast) {
                    // a wave's crest out on the open water
                    if (!c.paper && r < 0.07 && !within(SHALLOWS, q))
                        plain(c, {
                            kind: "path",
                            d: `M${x - 7} ${y}Q${x - 3.5} ${y - 3.5} ${x} ${y}T${x + 7} ${y}`,
                            fill: "none",
                            stroke: c.t.sky,
                            width: 1.2,
                            cap: "round",
                            opacity: 0.6,
                        });
                } else if (inJungle) {
                    // a clump of big leaves, the jungle drawn thick
                    if (r < 0.55)
                        for (const [dx, dy, s] of [
                            [-4, 1, 6],
                            [4, 0, 5.5],
                            [0, -4, 6.5],
                        ] as const)
                            pen.ellipse(g, x + dx, y + dy, s * 1.6, s, "ruler", pen.fill("mint"), {
                                strokeWidth: 0.8,
                                stroke: c.t.ok,
                                roughness: 0.4,
                            });
                } else if (onGrass) {
                    if (inPond(q) || (r > 0.3 && r < 0.95)) continue;
                    if (r < 0.22) {
                        const lean = (hash(gx, gy, 3) - 0.5) * 3;
                        for (const [dx, tall] of [
                            [-3, 5],
                            [-0.5, 7],
                            [2, 5.5],
                        ] as const)
                            pen.line(g, x + dx, y, x + dx * 1.3 + lean, y - tall, "pencil", {
                                strokeWidth: 1.1,
                                stroke: c.t.ok,
                                roughness: 0.45,
                                disableMultiStroke: true,
                            });
                    } else if (r < 0.3) {
                        for (const [dx, dy] of [
                            [-2, 0],
                            [2, 0],
                            [0, -2.8],
                        ] as const)
                            pen.circle(g, x + dx, y + dy, 4, "ruler", pen.fill("mint"), {
                                strokeWidth: 0.7,
                                roughness: 0.3,
                            });
                    } else if (r > 0.985)
                        pen.circle(g, x, y, 4.5, "ruler", pen.fill("berry"), {
                            strokeWidth: 0.7,
                            roughness: 0.3,
                        });
                } else if (r < 0.5) {
                    // grains in the sand, and now and then a shell
                    plain(c, {
                        kind: "circle",
                        cx: x,
                        cy: y,
                        r: 1,
                        fill: c.paper ? c.t.ink : c.t["ink-soft"],
                        opacity: 0.3,
                    });
                } else if (r > 0.965)
                    pen.path(
                        g,
                        `M${x - 4} ${y + 2}Q${x} ${y - 6} ${x + 4} ${y + 2}Z`,
                        "ruler",
                        pen.fill(hash(gx, gy, 4) < 0.5 ? "berry" : "tang"),
                        { strokeWidth: 0.8, roughness: 0.3 },
                    );
            }

        // the pond, filled white under its water so it reads as water and not as grass
        const pond = {
            x: (POND.x - ox) * U,
            y: (POND.y - oy) * U,
            rx: POND.rx * U,
            ry: POND.ry * U,
        };
        const m = 0.4 * U;
        if (
            pond.x - pond.rx > m &&
            pond.y - pond.ry > m &&
            pond.x + pond.rx < w * U - m &&
            pond.y + pond.ry < h * U - m
        ) {
            if (!c.paper)
                plain(c, {
                    kind: "ellipse",
                    cx: pond.x,
                    cy: pond.y,
                    rx: pond.rx,
                    ry: pond.ry,
                    fill: c.t.card,
                });
            wash(
                c,
                `M${Array.from({ length: 24 }, (_, k) => `${(pond.x + Math.cos((k / 24) * Math.PI * 2) * pond.rx).toFixed(1)} ${(pond.y + Math.sin((k / 24) * Math.PI * 2) * pond.ry).toFixed(1)}`).join("L")}Z`,
                "sky",
                0.3,
                true,
            );
            pen.ellipse(
                g,
                pond.x,
                pond.y,
                pond.rx * 2,
                pond.ry * 2,
                "pencil",
                null,
                calm(c, 1.4, c.t.sky),
            );
            for (const [dx, dy, s] of [
                [-0.9, 0.6, 0.7],
                [1.1, -0.4, 0.55],
            ] as const)
                pen.path(
                    g,
                    `M${pond.x + dx * U} ${pond.y + dy * U}L${pond.x + (dx + s) * U} ${pond.y + (dy - 0.2) * U}Q${pond.x + (dx + s * 0.6) * U} ${pond.y + (dy + s) * U} ${pond.x + (dx - 0.3) * U} ${pond.y + (dy + 0.5) * U}Z`,
                    "ruler",
                    pen.fill("mint"),
                    { strokeWidth: 0.8, roughness: 0.3 },
                );
        }

        // the coast, a pencil line where the sand meets the water, and the surf just off it
        const inset = 0.25;
        const keep = (q: P) => q.x >= inset && q.y >= inset && q.x <= w - inset && q.y <= h - inset;
        const edge = local(COAST);
        for (let i = 0; i < edge.length; i++) {
            const a = edge[i],
                b = edge[(i + 1) % edge.length];
            if (!a || !b) continue;
            const piece = clip([a, b, b], inset, inset, w - inset, h - inset);
            const first = piece[0],
                last = piece.reduce(
                    (far, q) =>
                        Math.hypot(q.x - (first?.x ?? 0), q.y - (first?.y ?? 0)) >
                        Math.hypot(far.x - (first?.x ?? 0), far.y - (first?.y ?? 0))
                            ? q
                            : far,
                    piece[0] ?? a,
                );
            if (first && Math.hypot(last.x - first.x, last.y - first.y) > 0.05)
                pen.line(
                    g,
                    first.x * U,
                    first.y * U,
                    last.x * U,
                    last.y * U,
                    "pencil",
                    calm(c, 1.5, c.paper ? c.t.ink : c.t["ink-soft"]),
                );
            if (c.paper) continue;
            // the surf: short curls a little way out, every couple of squares along the edge
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            const nx = (b.y - a.y) / len,
                ny = -(b.x - a.x) / len;
            for (let s = 1; s < len - 0.5; s += 2.2) {
                const k = s / len;
                const q = {
                    x: a.x + (b.x - a.x) * k + nx * 0.7,
                    y: a.y + (b.y - a.y) * k + ny * 0.7,
                };
                if (!keep({ x: q.x - 0.6, y: q.y }) || !keep({ x: q.x + 0.6, y: q.y })) continue;
                if (within(COAST, at(q))) continue;
                plain(c, {
                    kind: "path",
                    d: `M${(q.x - 0.5) * U} ${q.y * U}Q${(q.x - 0.25) * U} ${(q.y - 0.22) * U} ${q.x * U} ${q.y * U}T${(q.x + 0.5) * U} ${q.y * U}`,
                    fill: "none",
                    stroke: c.t.card,
                    width: 2.2,
                    cap: "round",
                    opacity: 0.9,
                });
            }
        }

        // the map's grid, pegged out faintly over the island, each square three of the paper's
        if (p.grid) {
            const dash = "5 7";
            const line = (x1: number, y1: number, x2: number, y2: number) => {
                const piece = clip(
                    [
                        { x: x1, y: y1 },
                        { x: x2, y: y2 },
                        { x: x2, y: y2 },
                    ],
                    0.1,
                    0.1,
                    w - 0.1,
                    h - 0.1,
                );
                const a = piece[0],
                    b = piece.find((q) => Math.hypot(q.x - (a?.x ?? 0), q.y - (a?.y ?? 0)) > 0.05);
                if (!a || !b) return;
                plain(c, {
                    kind: "path",
                    d: `M${a.x * U} ${a.y * U}L${b.x * U} ${b.y * U}`,
                    fill: "none",
                    stroke: c.paper ? c.t.ink : c.t["ink-soft"],
                    width: 1.3,
                    dash,
                    opacity: c.paper ? 0.6 : 0.45,
                });
            };
            const gx0 = GRID.x - ox,
                gy0 = GRID.y - oy,
                gx1 = gx0 + GRID.cols * GRID.cell,
                gy1 = gy0 + GRID.rows * GRID.cell;
            for (let k = 0; k <= GRID.cols; k++)
                line(gx0 + k * GRID.cell, gy0, gx0 + k * GRID.cell, gy1);
            for (let k = 0; k <= GRID.rows; k++)
                line(gx0, gy0 + k * GRID.cell, gx1, gy0 + k * GRID.cell);
        }
        return {};
    },
    describe: (p) =>
        `Part of a treasure island seen from above: sandy beach, grass, jungle and a pond, with sea round it${p.grid ? " and faint map squares over the land" : ""}.`,
    motion: {
        still: "The island's ground, its pond and its sea are drawn still; the waves move as sprites.",
    },
});
