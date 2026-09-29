import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, eye } from "./nature";

const ellipse = (cx: number, cy: number, rx: number, ry: number, n = 12): Pt[] =>
    Array.from({ length: n }, (_, i): Pt => {
        const t = (i / n) * Math.PI * 2;
        return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
    });

/**
 * A dipper with its feet at (fx, fy), facing `s`, leant forward by `lean` radians as it walks head
 * down under the water. Its shape is laid out facing right with the feet at the origin.
 */
function dipperAt<G>(c: Ctx<G>, fx: number, fy: number, s: number, lean: number): RawAnchors {
    const { pen, g } = c,
        cos = Math.cos(lean),
        sin = Math.sin(lean),
        on = ([x, y]: Pt): Pt => [fx + s * (x * cos - y * sin), fy + x * sin + y * cos],
        all = (pts: Pt[]): Pt[] => pts.map(on);
    for (const [x0, x1] of [
        [-4, -6],
        [6, 8],
    ] as const) {
        pen.linear(
            g,
            all([
                [x0, -9],
                [x1, 0],
                [x1 + 6, 0],
            ]),
            "pencil",
            {
                strokeWidth: 1.5,
                stroke: c.t["ink-soft"],
            },
        );
    }
    // one flat dark brown, the same on paper as a grey, so the silhouette stays whole and the white
    // bib and the eye read against it; no hatch crosses the bird
    const brown = { fill: c.t["ink-soft"], fillStyle: "solid" as const },
        outline = { strokeWidth: 1.7, disableMultiStroke: true, preserveVertices: true };
    pen.polygon(
        g,
        all([
            [-16, -26],
            [-29, -39],
            [-24, -42],
            [-11, -32],
        ]),
        "ruler",
        brown,
        outline,
    );
    for (const shape of [ellipse(0, -24, 22, 16, 18), ellipse(18, -41, 11, 10, 14)])
        pen.polygon(g, all(shape), "ruler", brown, outline);
    // the neck, filled over the two outlines where the head meets the body
    pen.polygon(g, all(ellipse(12, -33, 7, 6, 10)), "ruler", brown, { stroke: "none" });
    pen.polygon(g, all(ellipse(4, -12, 9, 4, 10)), "ruler", pen.fill("tang"), {
        strokeWidth: 1.1,
        disableMultiStroke: true,
    });
    pen.polygon(
        g,
        all([
            [14, -34],
            [23, -34],
            [25, -27],
            [21, -20],
            [15, -19],
            [12, -27],
        ]),
        "ruler",
        { fill: c.t.card, fillStyle: "solid" },
        { strokeWidth: 1.3, disableMultiStroke: true, preserveVertices: true },
    );
    pen.curve(
        g,
        all([
            [-16, -24],
            [-6, -30],
            [6, -27],
        ]),
        "ruler",
        { strokeWidth: 1.2, stroke: c.t.card },
    );
    pen.polygon(
        g,
        all([
            [27, -44],
            [34, -42.5],
            [27, -40],
        ]),
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 0.8 },
    );
    // a white ring round the eye, since an ink dot is lost on a dark head
    const [ex, ey] = on([21, -44]);
    pen.circle(g, ex, ey, 7, "ruler", { fill: c.t.card, fillStyle: "solid" }, { strokeWidth: 0.6 });
    eye(c, ex, ey, 4);
    const [hx, hy] = on([18, -52]),
        [bx, by] = on([36, -42]);
    return {
        head: [hx, hy, "up"],
        beak: [bx, by, s > 0 ? "right" : "left"],
        feet: [fx, fy, "down"],
    };
}

export const dipper = defineDrawing({
    id: "dipper",
    family: "animals",
    title: "Dipper",
    group: "Characters",
    about: "A dipper, a small round dark brown bird with a white bib and a short cocked tail, that bobs on a stone in a fast stream and walks along the stream bed under the water to feed.",
    params: { under: 0, facing: 1 },
    settings: {
        under: { kind: "whole", min: 0, max: 1 },
        facing: { kind: "one of", of: [1, -1] },
    },
    takes: [
        { label: "On a stone", params: { under: 0, facing: 1 } },
        { label: "Walking under the water", params: { under: 1, facing: -1 } },
        { label: "On a stone, facing left", params: { under: 0, facing: -1 } },
    ],
    box: () => ({ w: 6, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = p.facing < 0 ? -1 : 1,
            wave = (y: number, amp: number): Pt[] => {
                const pts: Pt[] = [];
                for (let i = 0; i <= 12; i++)
                    pts.push([0.1 * U + i * 0.48 * U, y + (i % 2 ? -amp : amp)]);
                return pts;
            };
        if (p.under > 0) {
            const top = 0.7 * U,
                bed = 4.4 * U;
            pen.polygon(
                g,
                [...wave(top, 2.5), [6 * U, bed], [0, bed]],
                "pencil",
                pen.fill("sky", "hachure", { hachureGap: c.paper ? 14 : 10, fillWeight: 0.5 }),
                { stroke: "none" },
            );
            pen.curve(g, wave(top, 2.5), "pencil", { strokeWidth: 1.6 });
            pen.line(g, 0, bed, 6 * U, bed, "pencil", { strokeWidth: 1.8 });
            for (const [x, w] of [
                [0.7, 0.9],
                [4.9, 1.1],
                [5.8, 0.5],
                [1.6, 0.5],
            ] as const)
                pen.ellipse(g, x * U, bed + 0.12 * U, w * U, 0.45 * U, "pencil", pen.fill("card"), {
                    strokeWidth: 1.1,
                });
            const fx = 3 * U - s * 0.5 * U,
                a = dipperAt(c, fx, bed, s, 0.42);
            for (const [dx, dy, r] of [
                [-0.5, 2.2, 0.16],
                [-0.2, 2.8, 0.12],
                [-0.7, 3.2, 0.1],
                [0.1, 3.4, 0.08],
            ] as const)
                pen.circle(
                    g,
                    fx + s * dx * U,
                    bed - dy * U,
                    2 * r * U,
                    "pencil",
                    pen.fill("card"),
                    {
                        strokeWidth: 1,
                    },
                );
            return a;
        }
        const water = 4.2 * U,
            cx = 3 * U;
        pen.path(
            g,
            `M${cx - 1.8 * U} ${water + 0.4 * U}Q${cx - 1.6 * U} ${3.4 * U} ${cx} ${3.35 * U}Q${cx + 1.7 * U} ${3.4 * U} ${cx + 1.9 * U} ${water + 0.4 * U}Z`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.7 },
        );
        pen.path(
            g,
            `M${cx - 1.8 * U} ${water + 0.4 * U}Q${cx - 1.6 * U} ${3.4 * U} ${cx} ${3.35 * U}Q${cx + 1.7 * U} ${3.4 * U} ${cx + 1.9 * U} ${water + 0.4 * U}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
            { stroke: "none" },
        );
        // the stream runs in front of the stone's foot
        const front: Pt[] = [...wave(water, 2), [5.9 * U, 4.9 * U], [0.1 * U, 4.9 * U]];
        pen.polygon(g, front, "pencil", pen.fill("card"), { stroke: "none" });
        pen.polygon(
            g,
            front,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 4, fillWeight: 0.7 }),
            { stroke: "none" },
        );
        pen.curve(g, wave(water, 2), "pencil", { strokeWidth: 1.5 });
        for (const d of [-1, 1])
            pen.arc(
                g,
                cx + d * 2.1 * U,
                water + 0.35 * U,
                0.9 * U,
                0.4 * U,
                Math.PI * 1.05,
                Math.PI * 1.95,
                "pencil",
                { strokeWidth: 1.1 },
            );
        return dipperAt(c, cx - s * 0.2 * U, 3.45 * U, s, 0);
    },
    describe: (p) =>
        p.under > 0
            ? "A small round dark brown bird with a white bib and a cocked tail, walking head down along a stream bed under the water, with bubbles rising."
            : "A small round dark brown bird with a white bib and a short cocked tail, standing on a stone in a stream with the water running past.",
    motion: { body: { is: "bob", lift: 0.03, arc: 0, deg: 0, period: 2.2 } },
});
