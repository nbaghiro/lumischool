import { plain, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { STILL, defineDrawing } from "../drawing";

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

interface ReachParams {
    w: number;
    h: number;
    /** The middle of the river, as x, y pairs in squares from the top left, upstream first. */
    points: number[];
    /** Half the river's width at each point, in squares. */
    halves: number[];
    /** At each point, whether the water there runs fast over stones: one, or nought. */
    rapids: number[];
}

export const riverReach = defineDrawing<ReachParams>({
    id: "riverreach",
    family: "outdoors",
    title: "Stretch of river",
    group: "Structures",
    about: "A stretch of river seen from above, winding between grassy banks, narrowing and widening as its middle line and its widths say, with chevrons where it runs fast over stones. A game lays several end to end to make a long river a canoe paddles down.",
    params: {
        w: 24,
        h: 20,
        points: [0, 10, 6, 8, 12, 9, 18, 12, 24, 11],
        halves: [4, 4, 3, 3, 4],
        rapids: [0, 0, 1, 1, 0],
    },
    settings: {
        w: { kind: "whole", min: 4, max: 36 },
        h: { kind: "whole", min: 4, max: 40 },
        points: { kind: "fixed" },
        halves: { kind: "fixed" },
        rapids: { kind: "fixed" },
    },
    takes: [
        {
            label: "A bend with a narrow fast stretch",
            params: {
                w: 24,
                h: 20,
                points: [0, 10, 6, 8, 12, 9, 18, 12, 24, 11],
                halves: [4, 4, 3, 3, 4],
                rapids: [0, 0, 1, 1, 0],
            },
        },
        {
            label: "A wide calm pool",
            params: {
                w: 20,
                h: 20,
                points: [0, 10, 10, 10, 20, 10],
                halves: [5, 7, 7],
                rapids: [0, 0, 0],
            },
        },
    ],
    box: (p) => ({ w: whole(p.w, 4, 36, 24), h: whole(p.h, 4, 40, 20) }),
    draw: (c, p): RawAnchors => {
        const w = whole(p.w, 4, 36, 24) * U,
            h = whole(p.h, 4, 40, 20) * U;
        const mid: [number, number][] = [];
        for (let i = 0; i + 1 < p.points.length; i += 2) {
            const x = p.points[i],
                y = p.points[i + 1];
            if (x !== undefined && y !== undefined) mid.push([x * U, y * U]);
        }
        if (mid.length < 2) return {};
        const inside = (v: number, hi: number) => Math.max(1, Math.min(hi - 1, v));
        // the banks stand straight above and below the middle, so stretches laid end to end meet exactly
        const edge = (side: 1 | -1): [number, number][] =>
            mid.map(([x, y], i) => [
                Math.max(0, Math.min(w, x)),
                inside(y + side * (p.halves[i] ?? 3) * U, h),
            ]);
        const left = edge(-1),
            right = edge(1);
        if (!c.paper) plain(c, { kind: "rect", x: 0, y: 0, w, h, fill: c.t.mint, opacity: 0.16 });
        const water = [...left, ...[...right].reverse()];
        plain(c, {
            kind: "path",
            d: `${water.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("")}Z`,
            fill: c.paper ? c.t.card : c.t.sky,
            opacity: c.paper ? 1 : 0.32,
        });
        for (const bank of [left, right])
            c.pen.path(
                c.g,
                bank.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(""),
                "pencil",
                null,
                { strokeWidth: 1.8, stroke: c.t["ink-soft"], disableMultiStroke: true },
            );
        // the fast water: chevrons pointing downstream, and a few ripples everywhere else
        mid.forEach(([x, y], i) => {
            const after = mid[Math.min(mid.length - 1, i + 1)] ?? [x, y],
                before = mid[Math.max(0, i - 1)] ?? [x, y];
            const a = Math.atan2(after[1] - before[1], after[0] - before[0]);
            const ux = Math.cos(a),
                uy = Math.sin(a);
            const half = (p.halves[i] ?? 3) * U;
            if (p.rapids[i]) {
                for (const k of [-0.45, 0, 0.45]) {
                    const cx = x - uy * k * half,
                        cy = y + ux * k * half;
                    c.pen.linear(
                        c.g,
                        [
                            [cx - ux * 6 - uy * 5, cy - uy * 6 + ux * 5],
                            [cx, cy],
                            [cx - ux * 6 + uy * 5, cy - uy * 6 - ux * 5],
                        ],
                        "ruler",
                        { strokeWidth: 1.2, stroke: c.t["ink-soft"], disableMultiStroke: true },
                    );
                }
            } else if (!c.paper && i % 2 === 1) {
                c.pen.arc(
                    c.g,
                    x + uy * half * 0.35,
                    y - ux * half * 0.35,
                    14,
                    6,
                    Math.PI * 1.1,
                    Math.PI * 1.9,
                    "ruler",
                    {
                        strokeWidth: 0.9,
                        stroke: c.t["ink-soft"],
                        disableMultiStroke: true,
                    },
                );
            }
        });
        const first = mid[0] ?? [0, 0],
            last = mid[mid.length - 1] ?? first;
        return { in: [first[0], first[1], "left"], out: [last[0], last[1], "right"] };
    },
    describe: () =>
        "A stretch of river seen from above, winding between grassy banks and narrowing in places, with chevrons marking where the water runs fast.",
    motion: { still: STILL.setting },
});
