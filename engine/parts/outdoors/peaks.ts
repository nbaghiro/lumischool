import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, clamp } from "../animals/nature";

/** One peak: the middle of its foot, its height and width, how far its summit leans, and which ridge carries a shoulder. */
export interface Peak {
    x: number;
    y: number;
    h: number;
    w: number;
    skew: number;
    shoulder: -1 | 0 | 1;
}

/** What each line of a peak is, which is what its weight follows. */
export type PeakRole = "outline" | "ridge" | "snow" | "shade";

export interface PeakMarks {
    lines: { pts: Pt[]; role: PeakRole }[];
    /** The shadow on the snow, the one colour a peak carries. */
    patches: Pt[][];
}

const WEIGHT: Record<PeakRole, number> = { outline: 1.8, ridge: 1.3, snow: 1.3, shade: 0.9 };

const lerp = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];

function inside(poly: Pt[], q: Pt): boolean {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i],
            b = poly[j];
        if (!a || !b) continue;
        if (
            a[1] > q[1] !== b[1] > q[1] &&
            q[0] < ((b[0] - a[0]) * (q[1] - a[1])) / (b[1] - a[1]) + a[0]
        )
            hit = !hit;
    }
    return hit;
}

/** Where a peak's outline crosses the level y, left to right. */
function across(poly: Pt[], y: number): number[] {
    const xs: number[] = [];
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i],
            b = poly[(i + 1) % poly.length];
        if (!a || !b || a[1] === b[1]) continue;
        if (y < Math.min(a[1], b[1]) || y > Math.max(a[1], b[1])) continue;
        xs.push(a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]));
    }
    return xs.sort((p, q) => p - q);
}

/** A lower summit on one ridge, so a peak is not a triangle: a bump out of the ridge and a notch above it. */
function shoulderOf(a: Pt, b: Pt, k: Peak, bumpAt: number, notchAt: number): Pt[] {
    const dx = b[0] - a[0],
        dy = b[1] - a[1],
        len = Math.hypot(dx, dy) || 1;
    const nx = dy / len,
        ny = -dx / len;
    const bump = lerp(a, b, bumpAt),
        notch = lerp(a, b, notchAt);
    return [
        [bump[0] + nx * k.h * 0.075, bump[1] + ny * k.h * 0.075],
        [notch[0] - nx * k.h * 0.012, notch[1] - ny * k.h * 0.012],
    ];
}

const summitOf = (k: Peak): Pt => [k.x + k.skew * k.w, k.y - k.h];

/** A peak's silhouette, from the left of its foot over its summit to the right. */
function outlineOf(k: Peak): Pt[] {
    const L: Pt = [k.x - k.w / 2, k.y],
        R: Pt = [k.x + k.w / 2, k.y],
        S = summitOf(k);
    return [
        L,
        ...(k.shoulder < 0 ? shoulderOf(L, S, k, 0.42, 0.62) : []),
        S,
        ...(k.shoulder > 0 ? shoulderOf(S, R, k, 0.58, 0.38).reverse() : []),
        R,
    ];
}

/** The parts of a line no nearer peak stands in front of, so nothing behind is drawn and no fill is needed to hide it. */
function seen(pts: Pt[], nearer: Pt[][], step: number): Pt[][] {
    const dense: Pt[] = [];
    pts.forEach((q, i) => {
        const next = pts[i + 1];
        if (!next) {
            dense.push(q);
            return;
        }
        const n = Math.max(1, Math.ceil(Math.hypot(next[0] - q[0], next[1] - q[1]) / step));
        for (let j = 0; j < n; j++) dense.push(lerp(q, next, j / n));
    });
    const runs: Pt[][] = [];
    let run: Pt[] = [];
    for (const q of dense) {
        if (nearer.some((p) => inside(p, q))) {
            if (run.length > 1) runs.push(run);
            run = [];
        } else run.push(q);
    }
    if (run.length > 1) runs.push(run);
    return runs.map(straightened);
}

/** A run of samples with the points a straight stretch does not need taken out. */
function straightened(run: Pt[]): Pt[] {
    const out: Pt[] = [];
    run.forEach((q, i) => {
        const a = run[i - 1],
            b = run[i + 1];
        if (!a || !b) {
            out.push(q);
            return;
        }
        const cross = (q[0] - a[0]) * (b[1] - a[1]) - (q[1] - a[1]) * (b[0] - a[0]);
        if (Math.abs(cross) > 0.5) out.push(q);
    });
    return out;
}

/**
 * The marks a range of peaks is drawn with, back to front: each peak's outline, the ridge down from
 * its summit, the zigzag lower edge of its snow, the strokes that shade the side away from the light,
 * which comes from the top left as it does everywhere on the shelf, and the shadow the snow carries on
 * that side. A line a nearer peak stands in front of is left out, so a range needs no fill and the
 * paper and its squares show through the rock. The map's own ranges are drawn from this too
 * (.docs/overworld.md, "Coasts, the sea, and what is on the land"), at the weights its marks use.
 */
export function peakMarks(peaks: Peak[], snow = true): PeakMarks {
    const order = [...peaks].sort((p, q) => p.y - q.y || p.x - q.x);
    const outlines = order.map(outlineOf);
    const lines: PeakMarks["lines"] = [];
    const patches: Pt[][] = [];
    order.forEach((k, i) => {
        const nearer = outlines.slice(i + 1);
        const out = outlines[i] ?? [];
        const step = k.h / 60;
        const add = (pts: Pt[], role: PeakRole) => {
            for (const run of seen(pts, nearer, step)) lines.push({ pts: run, role });
        };
        const S = summitOf(k);
        add(out, "outline");
        const foot: Pt = [S[0] + k.w * 0.06, S[1] + k.h * 0.5];
        const ridgeAt = (y: number): number =>
            S[0] + ((foot[0] - S[0]) * (y - S[1])) / (foot[1] - S[1]);
        add([S, [S[0] - k.w * 0.012, S[1] + k.h * 0.2], foot], "ridge");
        const ys = k.y - k.h * 0.63;
        const xs = across(out, ys),
            xl = xs[0] ?? k.x,
            xr = xs.at(-1) ?? k.x;
        const teeth: Pt[] = [[xl, ys]];
        for (let j = 1; j < 6; j++)
            teeth.push([xl + ((xr - xl) * j) / 6, ys + (j % 2 ? k.h * 0.075 : -k.h * 0.01)]);
        teeth.push([xr, ys]);
        if (snow) {
            add(teeth, "snow");
            // a third of the way from the ridge to the edge, so the lit half of the cap keeps its paper
            const inner = ridgeAt(ys) + (xr - ridgeAt(ys)) * 0.34;
            const shadow: Pt[] = [
                S,
                ...out.filter((q) => q[0] > S[0] && q[1] < ys),
                [xr, ys],
                ...teeth.filter((q) => q[0] > inner).reverse(),
                [inner, ys],
            ];
            if (!shadow.some((q) => nearer.some((p) => inside(p, q)))) patches.push(shadow);
        }
        const top = snow ? ys + k.h * 0.1 : k.y - k.h * 0.8;
        for (let j = 0; j < 5; j++) {
            const y = top + (k.y - top) * (0.06 + j * 0.19);
            const xe = across(out, y).at(-1) ?? xr,
                span = xe - ridgeAt(y);
            if (span < k.w * 0.08) continue;
            const x0 = xe - span * 0.1;
            add(
                [
                    [x0, y],
                    [x0 - span * 0.42, y + k.h * 0.1],
                ],
                "shade",
            );
        }
    });
    return { lines, patches };
}

/** A line of marks as a path, since a peak's corners are corners: a curve through them would round the summits. */
export const peakPath = (pts: Pt[]): string =>
    pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join("");

/**
 * The peaks a range standing from one point to another holds: taller and shorter in turn, every other
 * one a step nearer, each a little broader than it is tall so the feet of one run into the next.
 */
export function rangePeaks(from: Pt, to: Pt, n: number): Peak[] {
    return Array.from({ length: n }, (_, i) => {
        const u = (i + 0.5) / n,
            h = 330 + ((i * 5) % 4) * 55;
        return {
            x: from[0] + (to[0] - from[0]) * u + (i % 2 ? 60 : -40),
            y: from[1] + (to[1] - from[1]) * u + (i % 2 ? 90 : 0),
            h,
            w: h * 1.45,
            skew: (((i * 37) % 5) - 2) * 0.035,
            shoulder: i % 3 === 0 ? -1 : i % 3 === 1 ? 1 : 0,
        };
    });
}

/** Draws a range's marks: the shadow on the snow first, then the lines over it at the weight each role takes. */
function drawPeaks<G>(c: Ctx<G>, marks: PeakMarks, weights = WEIGHT): void {
    for (const pts of marks.patches)
        c.pen.polygon(c.g, pts, "pencil", c.pen.fill("sky"), { stroke: "none", roughness: 0.8 });
    for (const l of marks.lines)
        c.pen.path(c.g, peakPath(l.pts), "pencil", null, {
            strokeWidth: weights[l.role],
            preserveVertices: true,
        });
}

export const peaks = defineDrawing({
    id: "peaks",
    family: "outdoors",
    title: "Mountain peaks",
    group: "Props",
    about: "A range of mountains, tall and short in turn, drawn in pencil with the paper showing through: a ridge down from each summit, the side away from the light shaded, and snow on the tops with a zigzag lower edge and the one blue shadow on it. A horizon for a world high up, and peaks to count or to put in order by height.",
    params: { count: 3, snow: 1 },
    settings: {
        count: { kind: "whole", min: 1, max: 5 },
        snow: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Three peaks in snow", params: { count: 3, snow: 1 } },
        { label: "Five, bare rock", params: { count: 5, snow: 0 } },
    ],
    box: (p) => ({ w: clamp(p.count, 1, 5) * 5 + 4, h: 11 }),
    draw: (c, p) => {
        const n = clamp(p.count, 1, 5),
            base = 10.6 * U,
            a: RawAnchors = {};
        // the short ones stand a step further back, so each tall peak is in front of the ones beside it
        const list: Peak[] = Array.from({ length: n }, (_, i) => {
            const tall = i % 2 === 0;
            return {
                x: (4.4 + i * 5) * U,
                y: base - (tall ? 0 : 0.01),
                h: (tall ? 9.8 : 7) * U,
                w: (tall ? 8.8 : 7.6) * U,
                skew: tall ? (i % 4 ? 0.05 : -0.04) : 0.03,
                shoulder: i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0,
            };
        });
        drawPeaks(c, peakMarks(list, p.snow > 0));
        list.forEach((k, i) => {
            const s = summitOf(k);
            a[`peak(${i})`] = [s[0], s[1], "up"];
        });
        return a;
    },
    describe: (p) =>
        `A range of mountain peaks, tall and short in turn, each shaded on the side away from the light${p.snow > 0 ? ", with snow on the tops" : ", the rock bare"}.`,
    motion: {
        still: "Mountains do not move; the weather over them does, which is a world's to draw.",
    },
});
