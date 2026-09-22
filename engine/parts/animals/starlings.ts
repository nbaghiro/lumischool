import { part, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];
type Bird = { x: number; y: number; heading: number; edge: boolean; room: number };

const W = 12 * U;
const H = 6 * U;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * A starling seen from below, nose along +x, one unit across the wings: a small head, long wings swept back like
 * a scythe, and a short square tail. Its wings reach well behind its middle, which is what keeps it from reading as a star.
 */
const STARLING: readonly Pt[] = [
    [0.36, 0],
    [0.26, 0.06],
    [0.12, 0.08],
    [0.04, 0.32],
    [-0.2, 0.54],
    [-0.12, 0.09],
    [-0.28, 0.06],
    [-0.42, 0.1],
    [-0.4, 0],
    [-0.42, -0.1],
    [-0.28, -0.06],
    [-0.12, -0.09],
    [-0.2, -0.54],
    [0.04, -0.32],
    [0.12, -0.08],
    [0.26, -0.06],
];

/** The line the flock streams along: a low lens with no swirl, and with all of it a curl like a breaking wave. */
function spine(t: number, swirl: number): Pt {
    const turn = Math.PI * (1 + 1.45 * t);
    const k = 1 - 0.7 * t;
    return [
        lerp(lerp(1.6 * U, 10.4 * U, t), 7 * U + 5.3 * U * k * Math.cos(turn), swirl),
        lerp(
            lerp(3.5 * U, 2.9 * U, t) - 0.6 * U * Math.sin(Math.PI * t),
            3.1 * U + 2.3 * U * k * Math.sin(turn),
            swirl,
        ),
    ];
}

/**
 * The birds. Spots are laid over the whole band round the spine from a fixed sequence and taken
 * nearest the middle of the flock first, each keeping room for itself in proportion to its own size,
 * so a bigger flock grows outwards from a full middle and is as dense at sixty birds as at twenty.
 * The room grows a little towards the edge, so the middle is thickest. A few birds each have room
 * to be counted.
 */
function flock(n: number, swirl: number): { birds: Bird[]; span: number } {
    const few = n <= 16;
    const span = few ? lerp(1.2 * U, 1 * U, (n - 6) / 10) : lerp(0.96 * U, 0.72 * U, (n - 17) / 43);
    const r2 = 1.324717957244746;
    const m = span * 0.6;
    const spots: { x: number; y: number; heading: number; far: number; k: number }[] = [];
    for (let k = 0; k < 6000; k++) {
        const t = (0.5 + k / r2) % 1;
        const o = 2 * ((0.5 + k / (r2 * r2)) % 1) - 1;
        const [sx, sy] = spine(t, swirl);
        const [bx, by] = spine(Math.min(1, t + 0.01), swirl);
        const [ax, ay] = spine(Math.max(0, t - 0.01), swirl);
        const heading = Math.atan2(by - ay, bx - ax);
        const w = lerp(1.9 * U, 1 * U, swirl) * (0.3 + 0.7 * Math.sin(Math.PI * t));
        const x = sx - Math.sin(heading) * o * w;
        const y = sy + Math.cos(heading) * o * w;
        if (x < m || x > W - m || y < m || y > H - m) continue;
        spots.push({ x, y, heading, far: Math.hypot(2 * t - 1, o), k });
    }
    spots.sort((a, b) => a.far - b.far || a.k - b.k);
    // when the band cannot hold every bird at its room, the room eases a little at a time, so the count is always the count
    let birds: Bird[] = [];
    for (let ease = 1; birds.length < n && ease > 0.3; ease *= 0.94) {
        birds = [];
        for (const s of spots) {
            if (birds.length === n) break;
            const room = span * ease * (few ? 1.55 : 1.04 + 0.3 * s.far);
            if (birds.some((b) => Math.hypot(b.x - s.x, b.y - s.y) < Math.min(room, b.room)))
                continue;
            birds.push({
                x: s.x,
                y: s.y,
                heading: s.heading + (((s.k * 0.618) % 1) - 0.5) * 0.6,
                edge: false,
                room,
            });
        }
    }
    // the last birds taken are the flock's edge, which in a big flock is further off
    birds.forEach((b, i) => {
        b.edge = i >= Math.ceil(n * (few ? 0.6 : 0.7));
    });
    return { birds, span };
}

export const starlings = defineDrawing({
    id: "starlings",
    family: "animals",
    title: "Starlings",
    group: "Characters",
    about: "A murmuration of starlings wheeling in the evening sky: many small birds with swept-back wings and short tails, massed into one soft swirling shape that is thickest in the middle. With only a few birds, each one stands apart and can be counted.",
    params: { count: 30, swirl: 0.5 },
    settings: {
        count: { kind: "whole", min: 6, max: 60 },
        swirl: { kind: "number", min: 0, max: 1, step: 0.1 },
    },
    takes: [
        { label: "Eight birds to count", params: { count: 8, swirl: 0.3 } },
        { label: "Thirty, wheeling", params: { count: 30, swirl: 0.7 } },
        { label: "Sixty in a soft cloud", params: { count: 60, swirl: 0 } },
    ],
    box: () => ({ w: 12, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const n = Math.max(6, Math.min(60, Math.round(p.count)));
        const swirl = Math.max(0, Math.min(1, p.swirl));
        const a: RawAnchors = {};
        const { birds, span } = flock(n, swirl);
        const few = n <= 16;
        const [mx, my] = spine(0.5, swirl);
        const edge = part(c, "edge", [mx, my]).g;
        birds.forEach((b, i) => {
            // in a big flock the birds at the edges are further off, so smaller and paler, which softens the shape
            const far = b.edge && !few;
            const size = far ? span * 0.84 : span;
            const tone = far ? c.t["ink-soft"] : c.t.ink;
            const cos = Math.cos(b.heading);
            const sin = Math.sin(b.heading);
            const pts = STARLING.map(([fx, fy]): Pt => [
                b.x + (fx * cos - fy * sin) * size,
                b.y + (fx * sin + fy * cos) * size,
            ]);
            pen.polygon(
                b.edge ? edge : g,
                pts,
                "ruler",
                { fill: tone, fillStyle: "solid" },
                {
                    strokeWidth: 0.8,
                    stroke: tone,
                    preserveVertices: true,
                    disableMultiStroke: true,
                },
            );
            if (few) a[`bird(${i})`] = [b.x, b.y - size * 0.6, "up"];
        });
        a.flock = [
            birds.reduce((sum, b) => sum + b.x, 0) / birds.length,
            Math.max(0, Math.min(...birds.map((b) => b.y)) - span * 0.6),
            "up",
        ];
        return a;
    },
    describe: (p) =>
        Math.round(p.count) <= 16
            ? "A few starlings flying together in the evening sky, small birds with swept-back wings and short tails, each standing apart from the others."
            : "A flock of starlings wheeling in the evening sky, many small birds with swept-back wings and short tails massed into one soft swirling shape, thickest in the middle.",
    motion: {
        body: { is: "float", lift: 6, dx: 14, deg: 2, pivot: [0.5, 0.5], period: 8.2, units: true },
        parts: { edge: { is: "sway", deg: 5, period: 3.8 } },
    },
});
