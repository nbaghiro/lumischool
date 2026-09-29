import { clip } from "../../ink/surface";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

// on a disc of radius 1, so the Earth can be drawn at any size
const LANDS: Pt[][] = [
    [
        [-1.1, -0.5],
        [-0.7, -0.62],
        [-0.35, -0.78],
        [-0.1, -0.55],
        [-0.3, -0.3],
        [-0.15, 0.05],
        [-0.3, 0.2],
        [-0.25, 0.6],
        [-0.45, 0.45],
        [-0.6, 0.1],
        [-1.1, 0.05],
    ],
    [
        [0.15, -0.35],
        [0.45, -0.55],
        [0.75, -0.45],
        [1.1, -0.2],
        [1.1, 0.3],
        [0.7, 0.3],
        [0.55, 0.62],
        [0.35, 0.4],
        [0.3, 0.05],
    ],
    [
        [-0.05, 0.72],
        [0.25, 0.8],
        [0.15, 1.1],
        [-0.15, 1.05],
    ],
];

const CLOUDS: Pt[][] = [
    [
        [-0.8, -0.1],
        [-0.45, 0.02],
        [-0.1, -0.08],
        [0.2, -0.02],
    ],
    [
        [0.05, 0.42],
        [0.3, 0.5],
        [0.55, 0.44],
    ],
    [
        [-0.35, -0.82],
        [-0.05, -0.74],
        [0.3, -0.8],
    ],
];

/** A closed smooth outline through points, each corner rounded by a curve through the midpoints. */
const blob = (pts: Pt[]): string => {
    const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const last = pts[pts.length - 1],
        first = pts[0];
    if (!last || !first) return "";
    const start = mid(last, first);
    let d = `M${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
    pts.forEach((p, i) => {
        const next = pts[(i + 1) % pts.length] ?? first,
            m = mid(p, next);
        d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
    });
    return `${d}Z`;
};

const upOf = (n: number) => Math.max(0, Math.min(2, Math.round(n)));

const W = 160,
    EDGE = 122,
    SIDE = 140,
    R = 46,
    CX = 80;

export const earth = defineDrawing({
    id: "earth",
    family: "science",
    title: "The Earth from the moon",
    group: "Props",
    about: "The Earth over the curved grey edge of the moon, a blue disc with green land and white swirls of cloud: just its top showing, half above the edge, or clear of it. From a craft circling the moon it rises like this; from the moon's ground it hangs still, low or high by where you stand.",
    params: { up: 1 },
    settings: { up: { kind: "whole", min: 0, max: 2 } },
    takes: [
        { label: "Just over the edge", params: { up: 0 } },
        { label: "Half over the edge", params: { up: 1 } },
        { label: "Clear of the edge", params: { up: 2 } },
    ],
    box: () => ({ w: 8, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            up = upOf(p.up),
            cy = [EDGE + R * 0.55, EDGE, EDGE - R - 8][up] ?? EDGE;
        for (const [x, y] of [
            [16, 20],
            [144, 16],
            [150, 56],
            [12, 80],
            [146, 104],
            [34, 104],
        ] as const) {
            pen.line(g, x - 3, y, x + 3, y, "ruler", { strokeWidth: 1.1 });
            pen.line(g, x, y - 3, x, y + 3, "ruler", { strokeWidth: 1.1 });
        }
        const sky = clip(c, {
            kind: "path",
            d: `M0 0H${W}V${SIDE}Q${CX} ${2 * EDGE - SIDE} 0 ${SIDE}Z`,
        });
        pen.circle(sky.g, CX, cy, R * 2, "pencil", pen.fill("sky"), { strokeWidth: 1.8 });
        const disc = clip(sky, {
            kind: "path",
            d: `M${CX - R} ${cy}A${R} ${R} 0 0 1 ${CX + R} ${cy}A${R} ${R} 0 0 1 ${CX - R} ${cy}Z`,
        });
        const on = (pts: Pt[]): Pt[] => pts.map(([u, v]) => [CX + u * R, cy + v * R]);
        for (const land of LANDS)
            pen.path(disc.g, blob(on(land)), "pencil", pen.fill("mint"), { strokeWidth: 1.2 });
        for (const cloud of CLOUDS)
            pen.curve(disc.g, on(cloud), "pencil", {
                strokeWidth: 3.2,
                stroke: c.t.card,
                disableMultiStroke: true,
            });
        // the night side, so it reads as a lit ball rather than a flat badge
        pen.path(
            disc.g,
            `M${CX} ${cy - R}A${R} ${R} 0 0 1 ${CX} ${cy + R}A${R * 0.5} ${R} 0 0 0 ${CX} ${cy - R}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3.5, fillWeight: 0.7 }),
            { stroke: "none" },
        );
        pen.circle(sky.g, CX, cy, R * 2, "pencil", null, { strokeWidth: 1.8 });
        pen.path(
            g,
            `M0 ${SIDE}Q${CX} ${2 * EDGE - SIDE} ${W} ${SIDE}V${W}H0Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.6 }),
            { stroke: "none" },
        );
        pen.path(g, `M0 ${SIDE}Q${CX} ${2 * EDGE - SIDE} ${W} ${SIDE}`, "pencil", null, {
            strokeWidth: 1.8,
        });
        for (const [x, y, w] of [
            [40, 146, 26],
            [118, 150, 34],
            [82, 136, 16],
        ] as const)
            pen.ellipse(g, x, y, w, w * 0.24, "pencil", pen.fill("card"), { strokeWidth: 1.2 });
        return {
            earth: [CX, Math.max(cy - R, 4), "up"],
            edge: [CX, EDGE, "up"],
        };
    },
    describe: (p) => {
        const up = upOf(p.up);
        const where =
            up === 0 ? "just its top showing over" : up === 1 ? "half showing over" : "clear above";
        return `The Earth seen from the moon, a blue ball with green land and white cloud, ${where} the curved grey edge of the moon's ground.`;
    },
    motion: {
        still: "It shows the Earth at one height over the edge, and a question sets it before and after, so it holds still between them.",
    },
});
