import { part, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, clamp, lumps, ring } from "../animals/nature";

const PUFF = [1, 0.82, 1.06, 0.86, 1.02, 0.8, 1.08, 0.84];

function spray<G>(c: Ctx<G>, x: number, y: number, r: number): void {
    c.pen.path(c.g, ring(lumps(x, y, r, r * 0.78, PUFF)), "pencil", c.pen.fill("card"), {
        strokeWidth: 1.3,
    });
}

export const waterfall = defineDrawing({
    id: "waterfall",
    family: "outdoors",
    title: "Waterfall",
    group: "Props",
    about: "A river pouring over a rock lip and down a cliff of layered rock into a pool, in one drop or down ledges in two or three, with spray rising where it lands and, in the sun, a small rainbow in the spray.",
    params: { drops: 2, rainbow: 1 },
    settings: {
        drops: { kind: "whole", min: 1, max: 3 },
        rainbow: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Down two ledges, with a rainbow", params: { drops: 2, rainbow: 1 } },
        { label: "One long drop", params: { drops: 1, rainbow: 0 } },
        { label: "Down three ledges", params: { drops: 3, rainbow: 0 } },
    ],
    box: () => ({ w: 12, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.drops, 1, 3),
            lip = 2.3 * U,
            poolY = 12.1 * U,
            fall = (poolY - lip) / n,
            shift = [0, -0.55 * U, 0.35 * U],
            a: RawAnchors = {};
        const rock: Pt[] = [
            [0.2 * U, 12.6 * U],
            [0.5 * U, 10.2 * U],
            [0.25 * U, 8.4 * U],
            [0.6 * U, 6.2 * U],
            [0.3 * U, 4.4 * U],
            [0.3 * U, 3 * U],
            [1.4 * U, 2.6 * U],
            [2.8 * U, 2.8 * U],
            [4.4 * U, lip],
            [7.6 * U, lip],
            [9 * U, 2.7 * U],
            [10.5 * U, 2.5 * U],
            [11.7 * U, 3 * U],
            [11.6 * U, 5 * U],
            [11.8 * U, 7.2 * U],
            [11.45 * U, 9.4 * U],
            [11.8 * U, 12.6 * U],
        ];
        pen.polygon(
            g,
            rock,
            "pencil",
            // warm sandstone on screen; in print the layers alone say rock, since a hatch would cross them
            c.paper
                ? pen.fill("card")
                : pen.fill("tang", "hachure", { hachureGap: 10, fillWeight: 0.5 }),
            { strokeWidth: 1.8 },
        );
        // grass along the top of both sides, cut back where the river runs over
        for (const side of [
            [
                [0.3, 3],
                [1.4, 2.6],
                [2.8, 2.8],
                [4.3, 2.3],
            ],
            [
                [7.7, 2.3],
                [9, 2.7],
                [10.5, 2.5],
                [11.7, 3],
            ],
        ]) {
            const top = side.map(([x = 0, y = 0]): Pt => [x * U, y * U]);
            pen.polygon(
                g,
                [...top, ...top.map(([x, y]): Pt => [x, y + 0.45 * U]).reverse()],
                "pencil",
                pen.fill("mint"),
                { strokeWidth: 1.3 },
            );
        }
        // rock strata: beds of uneven thickness dipping gently, each bedding line broken and bumpy, and
        // cracks of uneven length at uneven places, so the face reads as rock and never as brickwork
        const beds = [4, 4.75, 6.1, 6.8, 8.35, 9.5, 10.75],
            dip = 0.05,
            cracks = [
                [1.9, 7.4, 9.8],
                [3.1, 10.2],
                [1.4, 4.2, 8.6],
                [2.6, 9.3, 10.6],
                [1.8, 3.6, 8.1],
                [2.9, 9.9],
            ];
        beds.forEach((b, k) => {
            const y = (x: number) => (b + dip * (x - 0.9) + (((k * 7 + x * 3) % 5) - 2) * 0.05) * U;
            // each bedding line runs in two or three pieces with a small gap, as weathered rock does
            const pieces =
                k % 2
                    ? [
                          [0.8, 4.6],
                          [5.1, 11.2],
                      ]
                    : [
                          [0.8, 3.1],
                          [3.5, 8.9],
                          [9.3, 11.2],
                      ];
            for (const [from = 0, to = 0] of pieces) {
                const pts: Pt[] = [];
                for (let x = from; x <= to + 0.01; x += (to - from) / 4) pts.push([x * U, y(x)]);
                pen.curve(g, pts, "pencil", { strokeWidth: 1.1, stroke: c.t["ink-soft"] });
            }
            const next = beds[k + 1];
            if (next === undefined) return;
            (cracks[k] ?? []).forEach((x, j) => {
                const down = (next - b) * (j % 2 ? 0.95 : 0.6);
                pen.linear(
                    g,
                    [
                        [x * U, y(x) + 0.08 * U],
                        [(x + 0.12) * U, y(x) + down * 0.5 * U],
                        [(x + 0.02) * U, y(x) + down * U],
                    ],
                    "pencil",
                    { strokeWidth: 0.9, stroke: c.t["ink-soft"] },
                );
            });
        });
        const at = (i: number) => ({
            x: 6 * U + (shift[i] ?? 0),
            w: 2.3 * U + i * 0.35 * U,
            top: lip + i * fall,
        });
        // the ledges the water lands on, jutting out either side of it
        for (let i = 1; i < n; i++) {
            const { x, w, top } = at(i);
            pen.polygon(
                g,
                [
                    [x - w / 2 - 0.9 * U, top - 0.1 * U],
                    [x + w / 2 + 0.9 * U, top - 0.1 * U],
                    [x + w / 2 + 0.6 * U, top + 0.45 * U],
                    [x - w / 2 - 0.6 * U, top + 0.45 * U],
                ],
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.6 },
            );
        }
        pen.ellipse(g, 6 * U, lip, 3.4 * U, 0.6 * U, "pencil", pen.fill("sky"), {
            strokeWidth: 1.4,
        });
        const bottomOf = (i: number): number =>
            i === n - 1 ? poolY : lip + (i + 1) * fall + 0.2 * U;
        for (let i = 0; i < n; i++) {
            const { x, w, top } = at(i),
                bottom = bottomOf(i),
                spread = 0.12 * U;
            pen.path(
                g,
                `M${x - w / 2} ${top + 0.25 * U}Q${x} ${top - 0.45 * U} ${x + w / 2} ${top + 0.25 * U}L${x + w / 2 + spread} ${bottom}L${x - w / 2 - spread} ${bottom}Z`,
                "pencil",
                pen.fill("sky", "solid", { hachureGap: 8 }),
                { strokeWidth: 1.7 },
            );
        }
        const streaks = part(c, "streaks", [6 * U, lip]).g;
        for (let i = 0; i < n; i++) {
            const { x, w, top } = at(i),
                bottom = bottomOf(i);
            for (const f of [-0.3, 0.02, 0.3])
                pen.line(
                    streaks,
                    x + f * w,
                    top + 0.5 * U,
                    x + f * w * 1.1,
                    bottom - 0.5 * U,
                    "pencil",
                    { strokeWidth: 2, stroke: c.t.card },
                );
        }
        for (let i = 1; i < n; i++) {
            const { x, w, top } = at(i);
            for (const [dx, r] of [
                [-0.36, 0.42],
                [0.02, 0.5],
                [0.38, 0.42],
            ] as const)
                spray(c, x + dx * w, top + 0.1 * U, r * U);
        }
        const foot = at(n - 1);
        pen.ellipse(
            g,
            6 * U,
            12.5 * U,
            10.8 * U,
            2 * U,
            "pencil",
            pen.fill("sky", "solid", { hachureGap: 8 }),
            {
                strokeWidth: 1.8,
            },
        );
        for (const [x, y, w] of [
            [2.4, 12.9, 1.6],
            [9.4, 13, 1.8],
            [4, 13.2, 1],
        ] as const)
            pen.curve(
                g,
                [
                    [(x - w / 2) * U, y * U],
                    [(x - w / 4) * U, (y - 0.12) * U],
                    [(x + w / 4) * U, (y + 0.08) * U],
                    [(x + w / 2) * U, y * U],
                ],
                "pencil",
                { strokeWidth: 1.1 },
            );
        if (p.rainbow > 0) {
            const rx = foot.x + 1.9 * U,
                ry = poolY - 0.1 * U;
            for (const [k, band] of (["berry", "glow", "sky"] as const).entries())
                pen.arc(
                    g,
                    rx,
                    ry,
                    (4.4 - k * 0.7) * U,
                    (4.4 - k * 0.7) * U,
                    Math.PI,
                    Math.PI * 2,
                    "pencil",
                    { strokeWidth: 3.2, stroke: c.t[band] },
                );
        }
        const mist = part(c, "spray", [foot.x, poolY]);
        for (const [dx, dy, r] of [
            [-1.8, -0.2, 0.62],
            [-0.9, -0.7, 0.8],
            [0.1, -0.35, 0.95],
            [1.1, -0.75, 0.78],
            [1.9, -0.2, 0.6],
        ] as const)
            spray(mist, foot.x + dx * U, poolY + dy * U, r * U);
        for (const [x, y, w, h] of [
            [1.3, 12.5, 2.2, 1.3],
            [10.8, 12.6, 2, 1.2],
        ] as const)
            pen.ellipse(
                g,
                x * U,
                y * U,
                w * U,
                h * U,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 3.5, fillWeight: 0.6 }),
                { strokeWidth: 1.6 },
            );
        a.lip = [6 * U, lip - 0.4 * U, "up"];
        a.pool = [6 * U, 13 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A river pouring over a rock lip down a cliff of layered rock${p.drops > 1 ? ", stepping over ledges," : ""} into a pool, with spray at its foot${p.rainbow > 0 ? " and a small rainbow in it" : ""}.`,
    motion: {
        parts: {
            streaks: { is: "flow", dx: 0, lift: -3, period: 1.8 },
            spray: { is: "twinkle", dim: 0.2, amt: -0.05, period: 2.6 },
        },
    },
});
