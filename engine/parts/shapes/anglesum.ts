import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { numOn } from "../lettering";

type Pt = [number, number];

const RAD = Math.PI / 180;
const W = 18;
const H = 13;

/**
 * The angles at each corner, going round from the bottom left. The last is worked out from the
 * others, so the angles always make 180 or 360 whatever a lesson writes; given ones that leave no
 * room for it are shared out again in the same proportion.
 */
function cornerAngles(kind: string, a: number, b: number, c: number): number[] {
    const n = kind === "quad" ? 4 : 3;
    const total = (n - 2) * 180;
    const given = (n === 4 ? [a, b, c] : [a, b]).map((v) => Math.max(1, v));
    const sum = given.reduce((t, v) => t + v, 0);
    const room = n === 4 ? 30 : 10;
    const fitted = sum > total - room ? given.map((v) => (v * (total - room)) / sum) : given;
    return [...fitted, total - fitted.reduce((t, v) => t + v, 0)];
}

/** The corners of a polygon with these angles, in unit lengths, going round anticlockwise from (0, 0) along the x axis. */
function corners(angles: number[]): Pt[] {
    const [a = 60, b = 60, c = 60] = angles;
    if (angles.length === 3) {
        const side = Math.sin(b * RAD) / Math.sin((180 - a - b) * RAD);
        return [
            [0, 0],
            [1, 0],
            [side * Math.cos(a * RAD), side * Math.sin(a * RAD)],
        ];
    }
    // Headings round the four sides; the top's length is chosen to keep the other two sides nearest
    // each other and to it, and the two unknown sides then close the shape.
    const u = (deg: number): Pt => [Math.cos(deg * RAD), Math.sin(deg * RAD)];
    const bc = u(180 - b),
        cd = u(360 - b - c),
        ad = u(a);
    let best: Pt[] = [];
    let spread = Infinity;
    for (let top = 0.2; top <= 1.6; top += 0.05) {
        const rx = -1 - top * cd[0],
            ry = -top * cd[1];
        const det = bc[0] * -ad[1] - -ad[0] * bc[1];
        if (Math.abs(det) < 1e-6) {
            // a and b make 180, so the two sides from the base are parallel and differ by a fixed length
            const k = -cd[1] / (ad[0] * cd[1] - ad[1] * cd[0]);
            const s3 = Math.max(0.8, 0.3 - k);
            return [
                [0, 0],
                [1, 0],
                [1 + (s3 + k) * ad[0], (s3 + k) * ad[1]],
                [s3 * ad[0], s3 * ad[1]],
            ];
        }
        const s1 = (rx * -ad[1] - -ad[0] * ry) / det;
        const s3 = (bc[0] * ry - bc[1] * rx) / det;
        if (s1 < 0.25 || s3 < 0.25) continue;
        const sides = [1, s1, top, s3];
        const ratio = Math.max(...sides) / Math.min(...sides);
        if (ratio < spread) {
            spread = ratio;
            const C: Pt = [1 + s1 * bc[0], s1 * bc[1]];
            best = [[0, 0], [1, 0], C, [s3 * ad[0], s3 * ad[1]]];
        }
    }
    return best.length
        ? best
        : [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
          ];
}

/** The arc across a corner, as a start and a stop in the screen's turning, clockwise from three o'clock. */
function across(v: Pt, p: Pt, q: Pt): [number, number] {
    const tp = Math.atan2(p[1] - v[1], p[0] - v[0]);
    const tq = Math.atan2(q[1] - v[1], q[0] - v[0]);
    const d = (((tq - tp) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return d < Math.PI ? [tp, tp + d] : [tq, tq + 2 * Math.PI - d];
}

export const angleSum = defineDrawing({
    id: "anglesum",
    family: "shapes",
    title: "Angle sum",
    group: "Structures",
    about: "A triangle or a quadrilateral with every angle marked and one of them a question, or two parallel lines cut by a third with two of its eight angles marked. The last corner is worked out from the others, so the angles always make 180 or 360; the third line crosses at `a`, held between 30 and 150 degrees.",
    params: { kind: "triangle", a: 60, b: 70, c: 90, ask: 2, give: 0 },
    settings: {
        kind: { kind: "one of", of: ["triangle", "quad", "parallel"] },
        a: { kind: "whole", min: 1, max: 179 },
        b: { kind: "whole", min: 1, max: 179 },
        c: { kind: "whole", min: 1, max: 179 },
        ask: { kind: "whole", min: -1, max: 7 },
        give: { kind: "whole", min: -1, max: 7 },
    },
    takes: [
        { label: "A triangle", params: { kind: "triangle", a: 60, b: 70, c: 90, ask: 2, give: 0 } },
        {
            label: "A right-angled triangle",
            params: { kind: "triangle", a: 90, b: 35, c: 90, ask: 2, give: 0 },
        },
        {
            label: "A quadrilateral",
            params: { kind: "quad", a: 80, b: 100, c: 75, ask: 3, give: 0 },
        },
        {
            label: "No two sides parallel",
            params: { kind: "quad", a: 65, b: 120, c: 70, ask: 1, give: 0 },
        },
        {
            label: "Parallel lines",
            params: { kind: "parallel", a: 60, b: 0, c: 0, ask: 6, give: 0 },
        },
    ],
    box: () => ({ w: W, h: H }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const mark = (v: Pt, from: number, to: number, said: string, i: number) => {
            const size = to - from;
            if (Math.abs(size - Math.PI / 2) < 0.01) {
                const s = 15,
                    u: Pt = [Math.cos(from), Math.sin(from)],
                    w: Pt = [Math.cos(to), Math.sin(to)];
                pen.linear(
                    g,
                    [
                        [v[0] + u[0] * s, v[1] + u[1] * s],
                        [v[0] + (u[0] + w[0]) * s, v[1] + (u[1] + w[1]) * s],
                        [v[0] + w[0] * s, v[1] + w[1] * s],
                    ],
                    "ruler",
                    { strokeWidth: 1.5 },
                );
            } else {
                const r = size < 0.8 ? 30 : 22;
                pen.arc(g, v[0], v[1], r * 2, r * 2, from, to, "ruler", { strokeWidth: 1.5 });
            }
            const mid = (from + to) / 2,
                out = size < 0.8 ? 50 : 40;
            const x = v[0] + Math.cos(mid) * out,
                y = v[1] + Math.sin(mid) * out;
            if (said) numOn(c, x, y + 6, said, 15);
            a[`angle(${i})`] = [x, y, "up"];
        };
        if (p.kind === "parallel") {
            const deg = Math.max(30, Math.min(150, p.a)),
                t = deg * RAD,
                y1 = 4 * U,
                y2 = 9.5 * U,
                x0 = U,
                x1 = (W - 1) * U;
            const dx = (y2 - y1) / Math.tan(t);
            const X: Pt[] = [
                [(W / 2) * U + dx / 2, y1],
                [(W / 2) * U - dx / 2, y2],
            ];
            for (const [i, y] of [y1, y2].entries()) {
                pen.line(g, x0, y, x1, y, "ruler", { strokeWidth: 2.2 });
                // the arrows that say the two lines are parallel
                const ax = x1 - 2.5 * U;
                pen.linear(
                    g,
                    [
                        [ax - 6, y - 6],
                        [ax + 2, y],
                        [ax - 6, y + 6],
                    ],
                    "ruler",
                    { strokeWidth: 1.6 },
                );
                a[`line(${i})`] = [x0 + U, y, "up"];
            }
            const reach = Math.min(
                3 * U,
                (2.6 * U) / Math.sin(t),
                ((W / 2) * U - 12 - Math.abs(dx) / 2) / Math.max(0.01, Math.abs(Math.cos(t))),
            );
            const [top, bottom] = X;
            if (top && bottom) {
                pen.line(
                    g,
                    top[0] + Math.cos(t) * reach,
                    top[1] - Math.sin(t) * reach,
                    bottom[0] - Math.cos(t) * reach,
                    bottom[1] + Math.sin(t) * reach,
                    "ruler",
                    { strokeWidth: 2.2 },
                );
            }
            // four angles at each crossing: above right, above left, below left, below right
            const spans: [number, number][] = [
                [-t, 0],
                [-Math.PI, -t],
                [Math.PI - t, Math.PI],
                [0, Math.PI - t],
            ];
            const sizes = [deg, 180 - deg, deg, 180 - deg];
            for (let i = 0; i < 8; i++) {
                const v = X[i < 4 ? 0 : 1] ?? [0, 0];
                const [from, to] = spans[i % 4] ?? [0, 0];
                if (i === p.ask || i === p.give)
                    mark(v, from, to, i === p.ask ? "?" : `${sizes[i % 4] ?? 0}°`, i);
                else {
                    const mid = (from + to) / 2;
                    a[`angle(${i})`] = [v[0] + Math.cos(mid) * 40, v[1] + Math.sin(mid) * 40, "up"];
                }
            }
            X.forEach((v, i) => {
                a[`vertex(${i})`] = [v[0], v[1], "up"];
            });
            return a;
        }
        const angles = cornerAngles(p.kind, p.a, p.b, p.c);
        const shape = corners(angles);
        const xs = shape.map((q) => q[0]),
            ys = shape.map((q) => q[1]);
        const minX = Math.min(...xs),
            maxX = Math.max(...xs),
            minY = Math.min(...ys),
            maxY = Math.max(...ys);
        const fit = Math.min(
            ((W - 5) * U) / (maxX - minX || 1),
            ((H - 5) * U) / (maxY - minY || 1),
        );
        const offX = (W * U - (maxX - minX) * fit) / 2,
            offY = (H * U + (maxY - minY) * fit) / 2;
        const pts = shape.map(([x, y]): Pt => [offX + (x - minX) * fit, offY - (y - minY) * fit]);
        pen.polygon(g, pts, "ruler", pen.fill("sky", "hachure", { hachureGap: 8 }), {
            strokeWidth: 2.2,
        });
        pts.forEach((v, i) => {
            const prev = pts[(i + pts.length - 1) % pts.length] ?? v,
                next = pts[(i + 1) % pts.length] ?? v;
            const [from, to] = across(v, prev, next);
            const size = Math.round(angles[i] ?? 0);
            mark(v, from, to, i === p.ask ? "?" : `${size}°`, i);
            a[`vertex(${i})`] = [v[0], v[1], "up"];
        });
        return a;
    },
    describe: (p) =>
        p.kind === "parallel"
            ? "Two parallel lines ruled in ink with arrows on them, cut across by a third line, with angles marked by arcs where it crosses them."
            : `A ${p.kind === "quad" ? "four" : "three"}-sided shape ruled in ink with an arc at each corner, a number of degrees or a question mark written by each arc.`,
    motion: { still: STILL.instrument },
});
