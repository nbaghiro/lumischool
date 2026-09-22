import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { numOn, sayOn } from "../lettering";

type Pt = [number, number];

/** A Catmull-Rom curve through the towns, sampled, so the road bends instead of kinking at a dot. */
function along(pts: Pt[], steps: number): Pt[] {
    const P = (i: number): Pt => pts[Math.max(0, Math.min(pts.length - 1, i))] ?? [0, 0];
    const spline = (a: number, b: number, d: number, e: number, t: number): number =>
        0.5 *
        (2 * b +
            (d - a) * t +
            (2 * a - 5 * b + 4 * d - e) * t * t +
            (3 * b - a - 3 * d + e) * t * t * t);
    const out: Pt[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
        const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
        for (let k = 0; k < steps; k++) {
            const t = k / steps;
            out.push([
                spline(p0[0], p1[0], p2[0], p3[0], t),
                spline(p0[1], p1[1], p2[1], p3[1], t),
            ]);
        }
    }
    out.push(P(pts.length - 1));
    return out;
}

/** Every leg is drawn the same length, eight squares, narrowing only so a long road fits a page. */
const legW = (stops: number): number => Math.min(8, 32 / Math.max(1, stops - 1));

export const roadDistances = defineDrawing({
    id: "roaddistances",
    family: "travel",
    title: "Road distances",
    group: "Structures",
    about: "A winding road with the towns dotted along it and the length of each leg written on it. The legs are the same width whatever they are worth, so the distances have to be added and not measured.",
    params: { stops: ["Ash", "Bray", "Cole"], legs: [12, 18], unit: "km" },
    settings: {
        stops: { kind: "words", most: 6 },
        legs: { kind: "numbers", min: 1, max: 999, most: 5 },
        unit: { kind: "text", most: 4 },
    },
    takes: [
        {
            label: "Three stops",
            params: { stops: ["Ash", "Bray", "Cole"], legs: [12, 18], unit: "km" },
        },
        {
            label: "Four stops, in miles",
            params: { stops: ["Ash", "Bray", "Cole", "Dell"], legs: [8, 11, 6], unit: "mi" },
        },
    ],
    box: (p) => ({
        w: Math.ceil(Math.max(1, p.stops.length - 1) * legW(p.stops.length)) + 4,
        h: 10,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            n = p.stops.length,
            step = legW(n);
        const at = (i: number): Pt => [(2 + i * step) * U, (i % 2 ? 3.6 : 6.3) * U];
        const ends: Pt[] = [
            [at(0)[0] - U, at(0)[1] + 0.25 * U],
            ...p.stops.map((_, i) => at(i)),
            [at(n - 1)[0] + U, at(n - 1)[1] + (n % 2 ? 0.25 : -0.25) * U],
        ];
        const road = along(ends, 12),
            half = 0.45 * U,
            r1 = (v: number) => Math.round(v * 10) / 10;
        const left: string[] = [],
            right: string[] = [];
        road.forEach((q, i) => {
            const pv = road[Math.max(0, i - 1)] ?? q,
                nx = road[Math.min(road.length - 1, i + 1)] ?? q;
            const dx = nx[0] - pv[0],
                dy = nx[1] - pv[1],
                L = Math.hypot(dx, dy) || 1;
            left.push(`${r1(q[0] - (dy / L) * half)} ${r1(q[1] + (dx / L) * half)}`);
            right.unshift(`${r1(q[0] + (dy / L) * half)} ${r1(q[1] - (dx / L) * half)}`);
        });
        pen.path(
            g,
            `M${left.join("L")}L${right.join("L")}Z`,
            "pencil",
            pen.fill("grid", "solid", { hachureGap: 11, fillWeight: 0.5 }),
            { strokeWidth: 1.8 },
        );
        pen.linear(g, road, "pencil", {
            strokeWidth: 1.2,
            strokeLineDash: [8, 7],
            stroke: c.t["ink-soft"],
        });
        for (let i = 0; i + 1 < n; i++) {
            const [ax, ay] = at(i),
                [bx, by] = at(i + 1),
                L = Math.hypot(bx - ax, by - ay) || 1;
            const s = by < ay ? 1 : -1,
                nx = (-(by - ay) / L) * s,
                ny = ((bx - ax) / L) * s;
            const mx = (ax + bx) / 2 + nx * 1.9 * U,
                my = (ay + by) / 2 + ny * 1.9 * U;
            numOn(c, mx, my + 5, `${p.legs[i] ?? 0} ${p.unit}`, 17);
            a[`leg(${i})`] = [mx, my - 12, "up"];
        }
        p.stops.forEach((s, i) => {
            const [sx, sy] = at(i),
                up = i % 2 === 1;
            pen.circle(g, sx, sy, 0.85 * U, "ruler", pen.fill("berry"), { strokeWidth: 1.8 });
            sayOn(c, sx, up ? sy - 1.15 * U : sy + 1.5 * U, s, 16);
            a[`stop(${i})`] = [sx, up ? sy - 0.4 * U : sy + 0.4 * U, up ? "up" : "down"];
        });
        return a;
    },
    describe: () =>
        "A winding grey road with towns dotted along it, each town named, and the length of each leg written on the road between them.",
    reads: true,
});
