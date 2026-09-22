import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const saltPans = defineDrawing({
    id: "saltpans",
    family: "outdoors",
    title: "Salt pans",
    group: "Structures",
    about: "A row of shallow square pans of seawater on flat white ground, seen a little from above, with low walls between them and a crust of salt at their edges. Beside them white heaps of salt stand in a row, and a wooden rake leans on the last heap.",
    params: { pans: 3, heaps: 3 },
    settings: { pans: { kind: "whole", min: 2, max: 4 }, heaps: { kind: "whole", min: 1, max: 4 } },
    takes: [
        { label: "Three pans, three heaps", params: { pans: 3, heaps: 3 } },
        { label: "Four pans, two heaps", params: { pans: 4, heaps: 2 } },
    ],
    box: () => ({ w: 16, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.pans, 2, 4),
            h = clamp(p.heaps, 1, 4),
            a: RawAnchors = {};
        const back = 1.7 * U,
            front = 4.7 * U,
            skew = 1.1 * U,
            x0 = 0.4 * U,
            x1 = 10.2 * U,
            pw = (x1 - x0) / n;
        // the walls: one long low block the pans are dug into, with its front face in shade
        pen.polygon(
            g,
            [
                [x0, front],
                [x0 + skew, back],
                [x1 + skew, back],
                [x1, front],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.8 },
        );
        pen.polygon(
            g,
            [
                [x0, front],
                [x1, front],
                [x1, front + 0.35 * U],
                [x0, front + 0.35 * U],
            ],
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
            { strokeWidth: 1.5 },
        );
        pen.polygon(
            g,
            [
                [x1, front],
                [x1 + skew, back],
                [x1 + skew, back + 0.35 * U],
                [x1, front + 0.35 * U],
            ],
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
            { strokeWidth: 1.2 },
        );
        for (let i = 0; i < n; i++) {
            const l = x0 + i * pw + 0.22 * U,
                r = x0 + (i + 1) * pw - 0.22 * U,
                f = front - 0.2 * U,
                b = back + 0.2 * U;
            // a point on the ground, pushed along as it goes back, the way the pans are seen from above and in front
            const P = (x: number, y: number): [number, number] => [
                x + (skew * (front - y)) / (front - back),
                y,
            ];
            pen.polygon(g, [P(l, f), P(l, b), P(r, b), P(r, f)], "pencil", pen.fill("sky"), {
                strokeWidth: 1.3,
            });
            // salt crusting at the pan's edge, and the light on the water
            for (const [t, y] of [
                [0.2, f - 0.2 * U],
                [0.62, f - 0.25 * U],
                [0.8, b + 0.3 * U],
            ] as const) {
                const [cx, cy] = P(l + (r - l) * t, y);
                pen.ellipse(g, cx, cy, 0.7 * U, 0.2 * U, "pencil", pen.fill("card"), {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
            }
            for (const [t, v, w] of [
                [0.3, 0.45, 0.9],
                [0.45, 0.62, 0.5],
            ] as const) {
                const [gx, gy] = P(l + (r - l) * t, b + (f - b) * v);
                pen.line(g, gx, gy, gx + w * U, gy, "pencil", {
                    strokeWidth: 1.4,
                    stroke: c.t.card,
                });
            }
            a[`pan(${i})`] = [...P((l + r) / 2, b), "up"];
        }
        // the heaps, counted from the left, the back ones first
        const hx = (j: number) => 11.4 * U + j * 1.1 * U,
            tall = [1.9, 1.6, 2.1, 1.7];
        const order = [...Array(h).keys()].sort((u, v) => (u % 2) - (v % 2) || u - v);
        for (const j of order) {
            const x = hx(j),
                foot = j % 2 ? 5.6 * U : 5.15 * U,
                t = (tall[j] ?? 2) * U,
                w = 1.05 * U;
            pen.path(
                g,
                `M${x - w} ${foot}Q${x - 0.75 * w} ${foot - t * 0.75} ${x - 0.15 * w} ${foot - t}Q${x + 0.15 * w} ${foot - t * 1.04} ${x + 0.3 * w} ${foot - t * 0.96}Q${x + 0.8 * w} ${foot - t * 0.7} ${x + w} ${foot}Z`,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.7 },
            );
            pen.path(
                g,
                `M${x + 0.25 * w} ${foot - t * 0.9}Q${x + 0.7 * w} ${foot - t * 0.55} ${x + 0.88 * w} ${foot - 0.06 * U}L${x + 0.35 * w} ${foot - 0.06 * U}Q${x + 0.45 * w} ${foot - t * 0.5} ${x + 0.25 * w} ${foot - t * 0.9}Z`,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 3.5, fillWeight: 0.6 }),
                { stroke: "none" },
            );
            for (const [u, v] of [
                [-0.45, 0.35],
                [-0.1, 0.6],
                [0.1, 0.25],
            ] as const)
                pen.circle(
                    g,
                    x + u * w,
                    foot - v * t,
                    3,
                    "ruler",
                    { fill: c.t["ink-soft"], fillStyle: "solid" },
                    { strokeWidth: 0.4 },
                );
            pen.line(g, x - w * 0.7, foot + 0.05 * U, x + w * 0.9, foot + 0.05 * U, "pencil", {
                strokeWidth: 1.1,
            });
            a[`heap(${j})`] = [x, foot - t, "up"];
        }
        // the rake leaning on the last heap, its head on the ground
        const last = hx(h - 1),
            rx = Math.min(last + 1.25 * U, 15.1 * U),
            ry = 5.6 * U,
            tx = last + 0.2 * U,
            ty = 2.2 * U;
        pen.line(g, rx, ry, tx, ty, "pencil", { strokeWidth: 3.4, stroke: c.t.tang });
        pen.line(g, rx, ry, tx, ty, "pencil", { strokeWidth: 1.1 });
        pen.line(g, rx - 0.6 * U, ry, rx + 0.6 * U, ry - 0.08 * U, "pencil", { strokeWidth: 1.7 });
        for (let t = -0.5; t <= 0.51; t += 0.25)
            pen.line(g, rx + t * U, ry - 0.04 * U, rx + t * U, ry + 0.24 * U, "pencil", {
                strokeWidth: 1.1,
            });
        pen.line(g, 0.2 * U, 5.8 * U, 15.8 * U, 5.8 * U, "pencil", { strokeWidth: 1.8 });
        return a;
    },
    describe: (p) =>
        `Shallow square pans of seawater in a row on flat white ground, ${clamp(p.heaps, 1, 4) > 1 ? "white heaps of salt standing in a row beside them and a wooden rake leaning on one" : "a white heap of salt beside them with a wooden rake leaning on it"}.`,
    motion: {
        still: "The pans are the ground other things stand on, and their heaps are counted.",
    },
});
