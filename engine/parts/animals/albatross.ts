import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const W = 12 * U;
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

// Facing right, the bird glides towards us and banks that way: each wing rises a little from the body to
// the wrist and droops to a fine tip, the one on the side it turns to dipped towards the sea. Each wing
// runs root, wrist, the middle of the hand, tip, in squares, with its half width at each.
const WINGS: readonly [readonly Pt[], readonly Pt[]] = [
    [
        [5.62, 1.52],
        [3.6, 1.02],
        [1.9, 1.08],
        [0.3, 1.42],
    ],
    [
        [6.38, 1.6],
        [8.4, 1.28],
        [10.1, 1.7],
        [11.7, 2.36],
    ],
];
const HALF = [0.27, 0.22, 0.14, 0];

export const albatross = defineDrawing({
    id: "albatross",
    family: "animals",
    title: "Albatross",
    group: "Characters",
    about: "An albatross gliding towards us low over the waves on very long, narrow wings held out nearly straight, dark on top, with a white head and breast, a dark brow and a pale yellow hooked beak. Its wings are many times longer than its body, which is a comparison to make before a measurement.",
    params: { facing: 1, waves: 1 },
    settings: {
        facing: { kind: "one of", of: [1, -1] },
        waves: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Over the waves", params: { facing: 1, waves: 1 } },
        { label: "Facing left, in the sky", params: { facing: -1, waves: 0 } },
    ],
    box: (p) => ({ w: 12, h: p.waves > 0 ? 4 : 3 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const s = p.facing < 0 ? -1 : 1;
        const a: RawAnchors = {};
        const X = (x: number) => (s > 0 ? x : W - x);
        const at = ([x, y]: Pt): Pt => [X(x * U), y * U];
        if (p.waves > 0) {
            const line = 3.45 * U;
            const swell: Pt[] = [];
            for (let x = 0.3 * U; x <= 11.75 * U; x += 0.5 * U)
                swell.push([X(x), line + 0.1 * U * Math.sin(x / (0.9 * U))]);
            const first = nth(swell, 0);
            const last = nth(swell, swell.length - 1);
            const surface = `M${f1(first[0])} ${f1(first[1])}${curveThrough(swell)}`;
            pen.path(
                g,
                `${surface}L${f1(last[0])} ${3.78 * U}L${f1(first[0])} ${3.78 * U}Z`,
                "pencil",
                pen.fill("sky", "hachure", { hachureGap: 6, fillWeight: 0.7 }),
                { stroke: "none" },
            );
            pen.path(g, surface, "pencil", null, calm(c, 1.6));
            for (const x of [1.8, 5.2, 8.6, 10.9]) {
                pen.curve(
                    g,
                    [
                        at([x - 0.55, 3.51]),
                        at([x - 0.1, 3.17]),
                        at([x + 0.2, 3.21]),
                        at([x + 0.14, 3.39]),
                    ],
                    "pencil",
                    calm(c, 1.3),
                );
            }
            a.sea = [X(6 * U), line + 0.1 * U, "down"];
        }
        pen.ellipse(
            g,
            X(6 * U),
            1.8 * U,
            1.05 * U,
            0.95 * U,
            "pencil",
            pen.fill("card"),
            calm(c, 1.7),
        );
        // both wings and the dark back between them are one shape, as they are on the bird
        const edges = (wing: readonly Pt[], side: 1 | -1): Pt[] =>
            wing.map((q, i) => {
                const prev = nth(wing, Math.max(0, i - 1));
                const next = nth(wing, Math.min(wing.length - 1, i + 1));
                const dx = next[0] - prev[0];
                const dy = next[1] - prev[1];
                const L = Math.hypot(dx, dy);
                const nx = dy / L;
                const ny = -dx / L;
                const up = ny < 0 ? 1 : -1;
                const w = (HALF[i] ?? 0) * (side > 0 ? 0.9 : 1.1);
                return at([q[0] + nx * up * side * w, q[1] + ny * up * side * w]);
            });
        const [left, right] = WINGS;
        const trailing = [...edges(left, 1).reverse(), ...edges(right, 1)];
        const leading = [...edges(right, -1).reverse(), ...edges(left, -1)];
        const start = nth(trailing, 0);
        pen.path(
            g,
            `M${f1(start[0])} ${f1(start[1])}${curveThrough(trailing)}${curveThrough(leading)}Z`,
            "pencil",
            pen.fill("ink-soft"),
            calm(c, 1.7),
        );
        pen.circle(g, X(6.2 * U), 2.02 * U, 0.74 * U, "pencil", pen.fill("card"), calm(c, 1.6));
        pen.line(g, ...at([6.12, 1.9]), ...at([6.44, 1.93]), "pencil", {
            ...calm(c, c.paper ? 1.4 : 2.6),
            stroke: c.t["ink-soft"],
        });
        const [ex, ey] = at([6.34, 1.96]);
        pen.circle(
            g,
            ex,
            ey,
            4.4,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.8 },
        );
        pen.polygon(
            g,
            [at([6.4, 2.02]), at([6.96, 2.4]), at([7.02, 2.54]), at([6.88, 2.5]), at([6.36, 2.22])],
            "ruler",
            pen.fill("glow"),
            { strokeWidth: 1.1, preserveVertices: true },
        );
        const [lx, ly] = at(nth(left, 3));
        const [rx, ry] = at(nth(right, 3));
        const [bx, by] = at([7.02, 2.54]);
        const [kx, ky] = at([6, 1.3]);
        a["wing(0)"] = [lx, ly, s > 0 ? "left" : "right"];
        a["wing(1)"] = [rx, ry, s > 0 ? "right" : "left"];
        a.head = [bx, by, "down"];
        a.back = [kx, ky, "up"];
        return a;
    },
    describe: (p) =>
        `An albatross gliding towards us on very long narrow wings held nearly straight, dark above with a white head and a pale hooked beak, ${p.waves > 0 ? "low over the waves" : "in an empty sky"}.`,
    motion: {
        body: { is: "float", lift: 6, dx: 10, deg: 2, pivot: [0.5, 0.5], period: 8.8, units: true },
    },
});
