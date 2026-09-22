import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** A soft puff of steam: a lumpy round drawn smoothly, `r` its radius. */
function puff<G>(c: Ctx<G>, x: number, y: number, r: number, lines = 1.3): void {
    const pts: [number, number][] = [];
    for (let k = 0; k < 9; k++) {
        const t = (k / 9) * Math.PI * 2,
            m = k % 2 ? 0.8 : 1.08;
        pts.push([x + Math.cos(t) * r * m, y + Math.sin(t) * r * m * 0.8]);
    }
    const mid = (p: [number, number], q: [number, number]) =>
            `${((p[0] + q[0]) / 2).toFixed(1)} ${((p[1] + q[1]) / 2).toFixed(1)}`,
        last = pts[8] ?? [x, y];
    let d = `M${mid(last, pts[0] ?? last)}`;
    pts.forEach((p, k) => {
        d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${mid(p, pts[(k + 1) % 9] ?? p)}`;
    });
    c.pen.path(c.g, `${d}Z`, "pencil", c.pen.fill("card"), { strokeWidth: lines });
}

/** One geyser standing on the ground at (cx, base), `k` its size against the full drawing. */
function geyserAt<G>(
    c: Ctx<G>,
    cx: number,
    base: number,
    k: number,
    up: boolean,
): { top: number; pool: number } {
    const { pen, g } = c,
        s = k * U,
        rim = base - 3.1 * s;
    // the mound of rock the hot water has built, a low cone with the pool at its top
    pen.path(
        g,
        `M${cx - 4.5 * s} ${base}C${cx - 3.3 * s} ${base - 0.4 * s} ${cx - 2.7 * s} ${rim + 0.5 * s} ${cx - 2 * s} ${rim}L${cx + 2 * s} ${rim}C${cx + 2.7 * s} ${rim + 0.5 * s} ${cx + 3.3 * s} ${base - 0.4 * s} ${cx + 4.5 * s} ${base}Z`,
        "pencil",
        pen.fill("card"),
        { strokeWidth: 1.8 },
    );
    // the mineral lips round its slope, scalloped where the water spills over, each with its band of colour
    for (const [j, [h, w]] of (
        [
            [0.5, 3.95],
            [1.9, 2.8],
        ] as const
    ).entries()) {
        const y = base - h * s,
            top: [number, number][] = [];
        for (let n = 0; n <= 10; n++)
            top.push([
                cx - w * s + (n / 10) * 2 * w * s,
                y + (n % 2 ? 0.18 * s : -0.02 * s) + (n % 3 === 0 ? 0.06 * s : 0),
            ]);
        const low = top
            .map(([x, yy]): [number, number] => [cx + (x - cx) * 1.06, yy + (j ? 0.5 : 0.38) * s])
            .reverse();
        pen.polygon(
            g,
            [...top, ...low],
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: j ? 3.5 : 4.5, fillWeight: 0.7 }),
            { stroke: "none" },
        );
        pen.curve(g, top, "pencil", { strokeWidth: 1.2 });
    }
    const pool = rim;
    pen.ellipse(g, cx, pool, 4 * s, 0.95 * s, "pencil", pen.fill("sky"), { strokeWidth: 1.6 });
    pen.ellipse(
        g,
        cx,
        pool + 0.05 * s,
        1.3 * s,
        0.36 * s,
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 2.5 }),
        { strokeWidth: 1.1 },
    );
    const top = base - 12.6 * s;
    if (!up) {
        // quiet: the pool bubbles, and steam lifts off it in puffs that drift and get smaller
        for (const [dx, dy, d] of [
            [-0.95, 0.12, 0.34],
            [0.8, -0.05, 0.28],
            [0.35, 0.22, 0.2],
        ] as const)
            pen.circle(g, cx + dx * s, pool + dy * s, d * s, "pencil", pen.fill("card"), {
                strokeWidth: 0.9,
            });
        for (const [dx, dy, r] of [
            [-0.2, 1.3, 0.95],
            [0.5, 2.9, 0.78],
            [1.2, 4.3, 0.58],
            [1.7, 5.4, 0.4],
        ] as const)
            puff(c, cx + dx * s, pool - dy * s, r * s, 1.3);
        return { top: pool - 5.8 * s, pool };
    }
    // going up: a column of water and steam out of the pool, widening as it climbs, with a plume at its head
    const col: [number, number][] = [
        [cx - 0.55 * s, pool],
        [cx - 0.65 * s, pool - 3 * s],
        [cx - 0.95 * s, pool - 6 * s],
        [cx - 1.3 * s, top + 1.6 * s],
        [cx + 1.3 * s, top + 1.6 * s],
        [cx + 0.95 * s, pool - 6 * s],
        [cx + 0.65 * s, pool - 3 * s],
        [cx + 0.55 * s, pool],
    ];
    pen.polygon(g, col, "pencil", pen.fill("sky", "hachure", { hachureGap: 4, fillWeight: 0.7 }), {
        strokeWidth: 1.7,
    });
    for (const dx of [-0.35, 0.05, 0.4])
        pen.curve(
            g,
            [
                [cx + dx * s, pool - 0.6 * s],
                [cx + dx * 1.6 * s, pool - 4 * s],
                [cx + dx * 2.4 * s, top + 2.4 * s],
            ],
            "pencil",
            { strokeWidth: 1.4, stroke: c.t.card },
        );
    for (const [dx, dy, r] of [
        [-1.3, 1.9, 0.85],
        [1.35, 1.8, 0.9],
        [-0.6, 2.7, 0.75],
        [0.75, 2.75, 0.7],
        [0, 1.1, 1.15],
    ] as const)
        puff(c, cx + dx * s, top + dy * s, r * s, 1.5);
    // drops falling back either side, and the splash round the pool
    for (const [dx, dy] of [
        [-2.1, 4.2],
        [-2.6, 6.2],
        [-2, 7.9],
        [2.2, 3.9],
        [2.7, 5.8],
        [2.1, 7.7],
    ] as const) {
        const x = cx + dx * s,
            y = top + dy * s;
        pen.path(
            g,
            `M${x} ${y - 0.3 * s}Q${x + 0.16 * s} ${y + 0.02 * s} ${x} ${y + 0.12 * s}Q${x - 0.16 * s} ${y + 0.02 * s} ${x} ${y - 0.3 * s}Z`,
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 0.9 },
        );
    }
    for (const d of [-1, 1])
        pen.arc(
            g,
            cx + d * 1.3 * s,
            pool - 0.1 * s,
            1.4 * s,
            1.1 * s,
            d < 0 ? Math.PI * 1.1 : Math.PI * 1.45,
            d < 0 ? Math.PI * 1.55 : Math.PI * 1.9,
            "pencil",
            { strokeWidth: 1.2 },
        );
    return { top, pool };
}

export const geyser = defineDrawing({
    id: "geyser",
    family: "outdoors",
    title: "Geyser",
    group: "Props",
    about: "A low cone of rock with scalloped mineral lips round its slope and a hot blue pool at its top. Quiet, the pool bubbles and a little steam rises off it; going up, a tall column of water and steam bursts out of the pool to a cloud of steam, and drops fall back round it. Two can stand side by side, far off.",
    params: { up: 0, count: 1 },
    settings: { up: { kind: "whole", min: 0, max: 1 }, count: { kind: "whole", min: 1, max: 2 } },
    takes: [
        { label: "Quiet, steaming", params: { up: 0, count: 1 } },
        { label: "Going up", params: { up: 1, count: 1 } },
        { label: "Two far off, going up", params: { up: 1, count: 2 } },
    ],
    box: () => ({ w: 10, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            up = p.up > 0,
            base = 13.5 * U,
            a: RawAnchors = {};
        if (p.count > 1) {
            for (const [i, cx] of [2.6 * U, 7.4 * U].entries()) {
                const at = geyserAt(c, cx, base, 0.56, up);
                a[`top(${i})`] = [cx, at.top, "up"];
            }
        } else {
            const at = geyserAt(c, 5 * U, base, 1, up);
            a.top = [5 * U, at.top, "up"];
            a.pool = [5 * U, at.pool, "up"];
        }
        pen.line(g, 0.2 * U, base, 9.8 * U, base, "pencil", { strokeWidth: 2 });
        return a;
    },
    describe: (p) => describeGeyser(p),
    motion: { still: "It is drawn quiet or going up as its moment says, and holds still between." },
});

/** One cone or two far off, quiet or going up, in the words that fit each. */
function describeGeyser(p: { up: number; count: number }): string {
    if (p.count > 1)
        return p.up > 0
            ? "Two low cones of rock far off, each with scalloped mineral lips round its slope and a column of water and steam bursting out of its pool."
            : "Two low cones of rock far off, each with scalloped mineral lips round its slope and a hot blue pool at its top, bubbling, with steam rising off it.";
    return p.up > 0
        ? "A low cone of rock with scalloped mineral lips round its slope, a tall column of water and steam bursting out of the pool at its top."
        : "A low cone of rock with scalloped mineral lips round its slope and a hot blue pool at its top, bubbling, with a little steam rising off it in puffs.";
}
