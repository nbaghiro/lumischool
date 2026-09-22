import { starPoints } from "../../ink/pen";
import { part, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const W = 8 * U;
/** Facing right, the star falls to the right at about twenty degrees: its head, and the far end of its trail. */
const HEAD: Pt = [6.5 * U, 2.8 * U];
const END: Pt = [0.3 * U, 0.62 * U];

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const nth = (pts: readonly Pt[], i: number): Pt => pts[i] ?? [0, 0];
const f1 = (n: number) => n.toFixed(1);

/** A smooth line on from the first point through every other (Catmull-Rom as cubic curves), without the move to its start. */
function curveThrough(pts: readonly Pt[]): string {
    let d = "";
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = nth(pts, Math.max(0, i - 1));
        const p1 = nth(pts, i);
        const p2 = nth(pts, i + 1);
        const p3 = nth(pts, Math.min(pts.length - 1, i + 2));
        d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d;
}

export const shootingStar = defineDrawing({
    id: "shootingstar",
    family: "outdoors",
    title: "Shooting star",
    group: "Props",
    about: "A shooting star crossing the night sky: a five-pointed star with a long trail of light tapering away behind it at a slant, and small four-pointed sparkles beside the trail. The sparkles can be counted.",
    params: { sparkles: 3, facing: 1 },
    settings: {
        sparkles: { kind: "whole", min: 2, max: 6 },
        facing: { kind: "one of", of: [1, -1] },
    },
    takes: [
        { label: "Three sparkles", params: { sparkles: 3, facing: 1 } },
        { label: "Six sparkles, falling left", params: { sparkles: 6, facing: -1 } },
        { label: "Two sparkles", params: { sparkles: 2, facing: 1 } },
    ],
    box: () => ({ w: 8, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const s = p.facing < 0 ? -1 : 1;
        const n = Math.max(2, Math.min(6, Math.round(p.sparkles)));
        const a: RawAnchors = {};
        const X = (x: number) => (s > 0 ? x : W - x);
        const len = Math.hypot(END[0] - HEAD[0], END[1] - HEAD[1]);
        const ux = (END[0] - HEAD[0]) / len;
        const uy = (END[1] - HEAD[1]) / len;
        const nx = -uy;
        const ny = ux;
        // `off` is measured from the middle of the trail, upwards and away from the fall; the trail bows a little that way
        const along = (t: number, off: number): Pt => {
            const bow = 0.2 * U * Math.sin(Math.PI * t) + off;
            return [X(HEAD[0] + ux * len * t + nx * bow), HEAD[1] + uy * len * t + ny * bow];
        };
        const half = (t: number) => 0.62 * U * Math.pow(1 - t, 0.8);
        const ts = Array.from({ length: 13 }, (_, i) => i / 12);
        const upper = ts.map((t) => along(t, half(t)));
        const lower = ts.map((t) => along(t, -half(t))).reverse();
        const start = nth(upper, 0);
        pen.path(
            g,
            `M${f1(start[0])} ${f1(start[1])}${curveThrough(upper)}${curveThrough(lower)}Z`,
            "pencil",
            pen.fill("glow"),
            calm(c, 1.7),
        );
        pen.curve(
            g,
            [0.1, 0.32, 0.56].map((t) => along(t, 0.04 * U)),
            "pencil",
            { ...calm(c, 2.4), stroke: c.t.card },
        );
        for (let i = 0; i < n; i++) {
            // alternate sides, ending below the trail, where there is room near its thin end
            const t = 0.26 + ((i + 0.5) * 0.54) / n;
            const side = (n - 1 - i) % 2 ? 1 : -1;
            const [x, y] = along(t, side * (half(t) + 0.5 * U));
            pen.polygon(g, starPoints(x, y, 0.34 * U, 4, 0.36), "ruler", pen.fill("glow"), {
                strokeWidth: 1.2,
                preserveVertices: true,
            });
            a[`sparkle(${i})`] = [x, y - 0.45 * U, "up"];
        }
        // one point of the star leads the way it falls
        const hx = X(HEAD[0]);
        const hy = HEAD[1];
        const tilt = s * 0.653;
        const points = starPoints(0, 0, 0.82 * U, 5, 0.46).map(([x, y]): Pt => [
            hx + x * Math.cos(tilt) - y * Math.sin(tilt),
            hy + x * Math.sin(tilt) + y * Math.cos(tilt),
        ]);
        pen.polygon(part(c, "star", [hx, hy]).g, points, "ruler", pen.fill("glow"), {
            strokeWidth: 1.8,
            preserveVertices: true,
        });
        a.star = [hx, hy - 0.95 * U, "up"];
        a.tail = [X(END[0]), END[1], s > 0 ? "left" : "right"];
        return a;
    },
    describe: () =>
        "A shooting star crossing the night sky, a five-pointed star with a long trail of light tapering away behind it at a slant, with small sparkles beside the trail.",
    motion: { parts: { star: { is: "twinkle", dim: 0.2, amt: 0.08, period: 2.6 } } },
});
