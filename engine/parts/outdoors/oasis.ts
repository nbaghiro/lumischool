import { type Ctx, type RawAnchors } from "../../ink/surface";
import { rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { blade } from "../animals/nature";

/** A small date palm: a ringed trunk leaning a little, drooping fronds and bunches of dates. */
function datePalm<G>(c: Ctx<G>, x: number, base: number, h: number, lean: number): void {
    const { pen, g } = c,
        tx = x + lean,
        ty = base - h;
    for (let k = 0; k < 6; k++) {
        const t0 = k / 6,
            t1 = (k + 1) / 6,
            bx = (t: number) => x + lean * t * t,
            w0 = 0.34 * U - t0 * 0.1 * U,
            w1 = 0.34 * U - t1 * 0.1 * U;
        pen.polygon(
            g,
            [
                [bx(t0) - w0, base - h * t0],
                [bx(t0) + w0, base - h * t0],
                [bx(t1) + w1, base - h * t1],
                [bx(t1) - w1, base - h * t1],
            ],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.1 },
        );
    }
    for (const [dx, col] of [
        [-0.25, "tang"],
        [0.3, "glow"],
    ] as const)
        for (let k = 0; k < 3; k++)
            pen.circle(
                g,
                tx + dx * U + (k - 1) * 4,
                ty + 0.4 * U + k * 3,
                6,
                "pencil",
                pen.fill(col),
                { strokeWidth: 0.7 },
            );
    for (const ang of [-2.95, -2.45, -1.95, -1.2, -0.7, -0.2, 3.3])
        pen.polygon(
            g,
            blade(tx, ty, (ang < -1.5 && ang > -2.2 ? 1.6 : 2.2) * U, 0.55 * U, ang),
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.2 },
        );
}

export const oasis = defineDrawing({
    id: "oasis",
    family: "outdoors",
    title: "Oasis",
    group: "Props",
    about: "A pool in the desert fed by a spring under the sand, with date palms and reeds round it. When rain comes the pool fills to its old line on the rocks and flowers come up all round it, where the day before there was only sand.",
    params: { water: 1, bloom: 0 },
    settings: {
        water: { kind: "whole", min: 0, max: 1 },
        bloom: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Full", params: { water: 1, bloom: 0 } },
        { label: "Low and dry", params: { water: 0, bloom: 0 } },
        { label: "After the rain, in flower", params: { water: 1, bloom: 1 } },
    ],
    box: () => ({ w: 16, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            full = p.water > 0,
            cx = 8 * U,
            cy = 6.6 * U,
            a: RawAnchors = {};
        datePalm(c, 4 * U, 6 * U, 4.6 * U, -0.5 * U);
        datePalm(c, 11.8 * U, 6.1 * U, 5.2 * U, 0.6 * U);
        datePalm(c, 13.5 * U, 6.2 * U, 3.4 * U, 0.3 * U);
        // the line the water reaches when the pool is full, left on the rocks
        pen.ellipse(
            g,
            cx,
            cy,
            12.4 * U,
            2.7 * U,
            "pencil",
            full ? null : pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
            {
                strokeWidth: 1.3,
                strokeLineDash: full ? undefined : [7, 6],
                stroke: c.t["ink-soft"],
            },
        );
        if (!full)
            for (const [x0, y0, x1, y1] of [
                [3.2, 6.2, 4.1, 6.9],
                [4.1, 6.9, 3.9, 7.5],
                [12.4, 6.1, 11.8, 6.8],
                [11.8, 6.8, 12.6, 7.4],
                [6.2, 7.6, 7, 7.8],
            ] as const)
                pen.line(g, x0 * U, y0 * U, x1 * U, y1 * U, "pencil", { strokeWidth: 1 });
        const pw = full ? 11.6 * U : 6 * U,
            ph = full ? 2.3 * U : 1.1 * U;
        pen.ellipse(g, cx, cy + (full ? 0 : 0.3 * U), pw, ph, "pencil", pen.fill("sky"), {
            strokeWidth: 1.8,
        });
        // the palms in the water, and a ripple
        if (full) {
            for (const x of [4.6, 11])
                pen.curve(
                    g,
                    [
                        [x * U, cy - 0.7 * U],
                        [(x + 0.1) * U, cy - 0.2 * U],
                        [x * U, cy + 0.4 * U],
                    ],
                    "pencil",
                    { strokeWidth: 3, stroke: c.t.mint },
                );
            for (const [x, w] of [
                [7, 1.6],
                [9.6, 1.1],
            ] as const)
                pen.curve(
                    g,
                    [
                        [x * U, cy + 0.2 * U],
                        [(x + w / 2) * U, cy + 0.05 * U],
                        [(x + w) * U, cy + 0.2 * U],
                    ],
                    "pencil",
                    { strokeWidth: 1.2, stroke: c.t.card },
                );
        }
        for (const [x, s] of [
            [2.6, -1],
            [13.3, 1],
            [8.2, 1],
        ] as const) {
            const y = x === 8.2 ? cy - (full ? 1.05 : 0.5) * U : cy - 0.1 * U;
            for (let k = 0; k < 5; k++) {
                const rx = x * U + (k - 2) * 5,
                    h = (1.1 + (k % 3) * 0.35) * U;
                pen.line(g, rx, y, rx + s * k, y - h, "pencil", {
                    strokeWidth: 1.2,
                    stroke: c.t.ok,
                });
                if (k % 2)
                    pen.ellipse(g, rx + s * k, y - h + 5, 6, 12, "pencil", pen.fill("tang"), {
                        strokeWidth: 0.8,
                    });
            }
        }
        for (const [x, y, d] of [
            [1.8, 7.4, 1.2],
            [14.3, 7.2, 1],
            [5.4, 7.9, 0.8],
        ] as const)
            pen.ellipse(
                g,
                x * U,
                y * U,
                d * U * 1.4,
                d * U,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                { strokeWidth: 1.3 },
            );
        if (p.bloom > 0) {
            const r = rng(19),
                COLS = ["berry", "glow", "tang", "card", "berry"] as const;
            for (let k = 0; k < 18; k++) {
                const ang = (k / 18) * Math.PI * 2 + r() * 0.2,
                    rr = 1 + r() * 0.12,
                    x = cx + Math.cos(ang) * 6.9 * U * rr,
                    y = cy + Math.sin(ang) * 1.75 * U * rr + 0.3 * U;
                if (y < cy - 0.6 * U && Math.abs(x - cx) < 5 * U) continue;
                for (let q = 0; q < 5; q++)
                    pen.circle(
                        g,
                        x + Math.cos(q * 1.26) * 4,
                        y + Math.sin(q * 1.26) * 4,
                        5,
                        "pencil",
                        pen.fill(COLS[k % 5]),
                        { strokeWidth: 0.6 },
                    );
                pen.circle(g, x, y, 3, "ruler", pen.fill("glow"), { strokeWidth: 0.5 });
            }
            if (full)
                for (const [x, y] of [
                    [6.2, 6.7],
                    [9.4, 6.9],
                ] as const) {
                    pen.ellipse(g, x * U, y * U, 1 * U, 0.45 * U, "pencil", pen.fill("mint"), {
                        strokeWidth: 1,
                    });
                    pen.circle(g, x * U + 4, y * U - 4, 8, "pencil", pen.fill("berry"), {
                        strokeWidth: 0.8,
                    });
                }
        }
        pen.curve(
            g,
            [
                [0.2 * U, 8.6 * U],
                [4 * U, 8.3 * U],
                [8 * U, 8.55 * U],
                [12 * U, 8.3 * U],
                [15.8 * U, 8.55 * U],
            ],
            "pencil",
            { strokeWidth: 1.4 },
        );
        a.pool = [cx, cy - ph / 2, "up"];
        a.palm = [11.8 * U + 0.6 * U, 0.9 * U, "up"];
        return a;
    },
    describe: (p) =>
        `${p.water > 0 ? "A pool of blue water in the desert with date palms leaning over it, reeds at its edges and rocks round it" : "A dry hollow in the desert with a dashed line where the water reaches when it is full, date palms leaning over it and reeds at its edges"}${p.bloom > 0 ? ", and flowers all round it" : ""}.`,
});
