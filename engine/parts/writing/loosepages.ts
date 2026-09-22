import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** Where each page tumbles, in squares: its middle, how far it is turned in degrees, and how it curls. */
const SLOTS: { x: number; y: number; turn: number; curl: 0 | 1 | 2 }[] = [
    { x: 2.0, y: 3.1, turn: -22, curl: 1 },
    { x: 7.9, y: 2.5, turn: 28, curl: 0 },
    { x: 5.0, y: 2.1, turn: 8, curl: 2 },
    { x: 6.3, y: 4.3, turn: -34, curl: 0 },
    { x: 3.6, y: 4.5, turn: 14, curl: 2 },
    { x: 8.6, y: 4.5, turn: -6, curl: 1 },
];

/** A sheet 1.5 by 2 squares: its lines of print, and a turned-over corner, a bowed top or neither. */
function page<G>(c: Ctx<G>, x: number, y: number, turn: number, curl: 0 | 1 | 2): void {
    const { pen, g } = c,
        t = (turn * Math.PI) / 180,
        cos = Math.cos(t),
        sin = Math.sin(t);
    const P = (u: number, v: number): Pt => [
        x + (u * cos - v * sin) * U,
        y + (u * sin + v * cos) * U,
    ];
    const hw = 0.75,
        hh = 1;
    if (curl === 1) {
        // the top edge lifted by the wind, bowing up
        pen.path(
            g,
            `M${P(-hw, -hh).join(" ")}Q${P(0, -hh - 0.45).join(" ")} ${P(hw, -hh).join(" ")}L${P(hw, hh).join(" ")}L${P(-hw, hh).join(" ")}Z`,
            "pencil",
            pen.fill("card"),
            calm(c, 1.5),
        );
    } else {
        const corner = curl === 0 ? [P(hw, -hh + 0.5), P(hw - 0.5, -hh)] : null;
        pen.polygon(
            g,
            corner
                ? [P(-hw, -hh), corner[1] ?? P(0, 0), corner[0] ?? P(0, 0), P(hw, hh), P(-hw, hh)]
                : [P(-hw, -hh), P(hw, -hh), P(hw, hh), P(-hw, hh)],
            "pencil",
            pen.fill("card"),
            calm(c, 1.5),
        );
        // the corner folded over, its back showing
        if (curl === 0)
            pen.polygon(
                g,
                [P(hw - 0.5, -hh), P(hw, -hh + 0.5), P(hw - 0.42, -hh + 0.42)],
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 3, fillWeight: 0.6 }),
                calm(c, 1.2),
            );
    }
    const lines = curl === 2 ? [-0.62, -0.38, -0.14, 0.1, 0.34] : [-0.5, -0.26, -0.02, 0.22, 0.46];
    lines.forEach((v, i) => {
        const short = i === lines.length - 1 ? 0.45 : i === 1 ? 0.15 : 0;
        pen.line(g, ...P(-hw + 0.22, v), ...P(hw - 0.22 - short, v), "ruler", {
            strokeWidth: 0.9,
            stroke: c.t["ink-soft"],
        });
    });
    if (curl === 2)
        pen.polygon(
            g,
            [P(-hw + 0.22, 0.52), P(0.1, 0.52), P(0.1, 0.86), P(-hw + 0.22, 0.86)],
            "ruler",
            pen.fill("sky", "hachure", { hachureGap: 3 }),
            { strokeWidth: 0.9 },
        );
}

export const loosePages = defineDrawing({
    id: "loosepages",
    family: "writing",
    title: "Loose pages",
    group: "Props",
    about: "Sheets of paper tumbling through the air at different angles, each with a few lines of print; one has a small picture, one has a corner folded over and one has its top edge lifted by the wind, with a stroke or two of wind between them.",
    params: { count: 5 },
    settings: { count: { kind: "whole", min: 2, max: 6 } },
    takes: [
        { label: "Five pages", params: { count: 5 } },
        { label: "Three pages", params: { count: 3 } },
    ],
    box: () => ({ w: 10, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            n = Math.max(2, Math.min(SLOTS.length, Math.round(p.count)));
        // the wind carrying them, under the pages
        for (const [x, y, w] of [
            [0.4, 1.2, 2.4],
            [3.4, 5.6, 2.2],
            [6.2, 0.9, 2.0],
        ] as const) {
            pen.curve(
                g,
                [
                    [x * U, y * U],
                    [(x + w * 0.4) * U, (y - 0.25) * U],
                    [(x + w * 0.75) * U, (y + 0.05) * U],
                    [(x + w) * U, (y - 0.15) * U],
                ],
                "pencil",
                { ...calm(c, 1.1), stroke: c.t["ink-soft"] },
            );
        }
        SLOTS.slice(0, n).forEach((s, i) => {
            page(c, s.x * U, s.y * U, s.turn, s.curl);
            a[`page(${i})`] = [s.x * U, s.y * U, "up"];
        });
        return a;
    },
    describe: () =>
        "Sheets of paper tumbling through the air at different angles, each with a few lines of print, one with a corner folded over and one bowed by the wind.",
    motion: {
        body: {
            is: "float",
            lift: 10,
            dx: 10,
            deg: 4,
            pivot: [0.5, 0.5],
            period: 6.8,
            units: true,
        },
    },
});
