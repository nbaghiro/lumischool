import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const within = (n: number | undefined, lo: number, hi: number, dflt: number) =>
    Math.max(lo, Math.min(hi, Math.round(n ?? dflt)));
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** A field gate between two posts, hung on the left, with its brace. */
function fieldGate<G>(c: Ctx<G>, x0: number, x1: number, top: number, ground: number): void {
    const { pen, g } = c;
    const grey = pen.fill("ink-soft", "hachure", { hachureGap: 3.5, fillWeight: 0.7 });
    const white = pen.fill("card");
    for (const x of [x0, x1])
        pen.rect(
            g,
            x - 0.18 * U,
            top - 0.35 * U,
            0.36 * U,
            ground - top + 0.35 * U,
            "pencil",
            grey,
            calm(c, 1.7),
        );
    const l = x0 + 0.22 * U;
    const r = x1 - 0.22 * U;
    const low = ground - 0.45 * U;
    for (let k = 1; k < 5; k++) {
        const y = top + ((low - top) * k) / 4;
        pen.rect(g, l, y - 0.08 * U, r - l, 0.16 * U, "pencil", white, calm(c, 1.2));
    }
    pen.polygon(
        g,
        [
            [l + 0.2 * U, low],
            [l + 0.34 * U, low],
            [(l + r) / 2 + 0.1 * U, top + 0.2 * U],
            [(l + r) / 2 - 0.04 * U, top + 0.2 * U],
        ],
        "pencil",
        white,
        calm(c, 1.2),
    );
    pen.rect(g, l, top - 0.02 * U, r - l, 0.24 * U, "pencil", white, calm(c, 1.5));
    for (const x of [l, r - 0.2 * U])
        pen.rect(g, x, top - 0.02 * U, 0.2 * U, low - top + 0.1 * U, "pencil", white, calm(c, 1.4));
    pen.rect(
        g,
        r - 0.02 * U,
        top + 0.45 * U,
        0.26 * U,
        0.14 * U,
        "pencil",
        { fill: c.t.ink, fillStyle: "solid" },
        calm(c, 1),
    );
}

/** The meadow's far edge, and a field boundary anywhere a world needs one. */
export const hedge = defineDrawing({
    id: "hedge",
    family: "outdoors",
    title: "Hedge",
    group: "Props",
    about: "A hawthorn hedge along the edge of a field, grown in rounded clumps with red haws among the leaves, and a white field gate in a gap when it has one. The clumps and the haws can be counted.",
    params: { clumps: 4, berries: 5, gap: 0 },
    settings: {
        clumps: { kind: "whole", min: 2, max: 6 },
        berries: { kind: "whole", min: 0, max: 8 },
        gap: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Four clumps, five haws", params: { clumps: 4, berries: 5, gap: 0 } },
        { label: "Six clumps and a gate, eight haws", params: { clumps: 6, berries: 8, gap: 1 } },
        { label: "Two clumps and a gate, bare", params: { clumps: 2, berries: 0, gap: 1 } },
    ],
    box: () => ({ w: 12, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const n = within(p.clumps, 2, 6, 4);
        const m = within(p.berries, 0, 8, 5);
        const gate = p.gap > 0;
        const W = 12 * U;
        const ground = 3.75 * U;
        const base = 3.35 * U;
        const g0 = 4.75 * U;
        const g1 = 7.25 * U;
        const a: RawAnchors = {};
        // a hedge is a large area, so its hatch on paper is opened to twice the spacing
        const leaves = pen.fill("mint", "solid", { hachureGap: 9 });
        const runs: [number, number, number][] = gate
            ? [
                  [0.3 * U, g0, Math.ceil(n / 2)],
                  [g1, W - 0.3 * U, Math.floor(n / 2)],
              ]
            : [[0.3 * U, W - 0.3 * U, n]];
        const clumps: [number, number][] = [];
        for (const [x0, x1, k] of runs)
            for (let i = 0; i < k; i++)
                clumps.push([x0 + ((x1 - x0) * i) / k, x0 + ((x1 - x0) * (i + 1)) / k]);
        // the haws are shared out along the hedge and kept inside a clump, clear of the lines where two clumps meet
        const per = clumps.map(() => 0);
        for (let k = 0; k < m; k++) {
            const j = Math.floor((k * n) / m);
            per[j] = (per[j] ?? 0) + 1;
        }
        const haws: Pt[] = [];
        clumps.forEach(([l, r], j) => {
            const q = per[j] ?? 0;
            for (let i = 0; i < q; i++)
                haws.push([
                    l + 0.3 * U + ((r - l - 0.6 * U) * (i + 1)) / (q + 1),
                    base - (haws.length % 2 ? 1.55 * U : 0.95 * U),
                ]);
        });
        const tops: number[] = [];
        clumps.forEach(([l, r], j) => {
            const w = r - l;
            const L = l - 0.14 * U;
            const R = r + 0.14 * U;
            const top = base - (j % 2 ? 2.3 * U : 2.6 * U);
            for (const t of [0.3, 0.68])
                pen.line(g, l + w * t, ground, l + w * (t - 0.04), base - 0.5 * U, "pencil", {
                    ...calm(c, 1.2),
                    stroke: c.t["ink-soft"],
                });
            const bumps = Math.max(2, Math.round((R - L - 0.5 * U) / (0.75 * U)));
            const from = L + 0.22 * U;
            const step = (R - L - 0.44 * U) / bumps;
            let d = `M${L} ${base}C${L - 0.22 * U} ${base - 1.1 * U} ${L - 0.1 * U} ${top + 0.45 * U} ${from} ${top + 0.3 * U}`;
            for (let b = 0; b < bumps; b++) {
                const xa = from + b * step;
                const xb = xa + step;
                const end = b === bumps - 1 ? top + 0.3 * U : top + (b % 2 ? 0.05 * U : 0);
                d += `Q${(xa + xb) / 2} ${top - 0.5 * U} ${xb} ${end}`;
            }
            d += `C${R + 0.1 * U} ${top + 0.45 * U} ${R + 0.22 * U} ${base - 1.1 * U} ${R} ${base}Z`;
            pen.path(g, d, "pencil", leaves, {
                ...calm(c, 1.7),
                roughness: 0.9 * c.pen.o.roughness,
            });
            tops.push(top);
            a[`clump(${j})`] = [(l + r) / 2, top - 0.25 * U, "up"];
        });
        // one body along the bottom joins the clumps into a hedge, so only their tops stand apart
        for (const [x0, x1, k] of runs) {
            if (!k) continue;
            // a fill on paper is only its hatch, so the body is laid on white there or the clumps' sides would show through
            if (c.paper)
                pen.rect(
                    g,
                    x0 + 0.05 * U,
                    base - 1.15 * U,
                    x1 - x0 - 0.1 * U,
                    1.15 * U,
                    "pencil",
                    pen.fill("card"),
                    { ...calm(c, 0), stroke: "none" },
                );
            pen.rect(
                g,
                x0 + 0.05 * U,
                base - 1.15 * U,
                x1 - x0 - 0.1 * U,
                1.15 * U,
                "pencil",
                leaves,
                {
                    ...calm(c, 0),
                    stroke: "none",
                },
            );
            pen.line(g, x0 - 0.12 * U, base, x1 + 0.12 * U, base, "pencil", calm(c, 1.7));
        }
        clumps.forEach(([l, r], j) => {
            if (j % 2) return;
            const x = l + (r - l) * 0.6;
            const top = tops[j] ?? base - 2.6 * U;
            pen.linear(
                g,
                [
                    [x - 0.05 * U, top + 0.25 * U],
                    [x + 0.08 * U, top - 0.2 * U],
                    [x + 0.28 * U, top - 0.5 * U],
                ],
                "pencil",
                calm(c, 1.2),
            );
            pen.line(
                g,
                x + 0.1 * U,
                top - 0.24 * U,
                x + 0.34 * U,
                top - 0.3 * U,
                "pencil",
                calm(c, 1),
            );
        });
        haws.forEach(([x, y], k) => {
            if (c.paper)
                pen.circle(g, x, y, 0.5 * U, "ruler", pen.fill("card"), {
                    ...calm(c, 0),
                    stroke: "none",
                });
            pen.circle(g, x, y, 0.44 * U, "ruler", pen.fill("berry"), calm(c, 1.2));
            a[`berry(${k})`] = [x, y - 0.22 * U, "up"];
        });
        if (gate) {
            fieldGate(c, g0, g1, 1.9 * U, ground);
            a.gate = [W / 2, 1.55 * U, "up"];
        }
        for (const x of [1.1, 3.4, 8.6, 10.9]) {
            const at = x * U;
            pen.linear(
                g,
                [
                    [at - 5, ground - 9],
                    [at - 1, ground],
                ],
                "pencil",
                calm(c, 1.1),
            );
            pen.linear(
                g,
                [
                    [at + 4, ground - 11],
                    [at + 1, ground],
                ],
                "pencil",
                calm(c, 1.1),
            );
        }
        pen.line(g, 0.1 * U, ground, W - 0.1 * U, ground, "pencil", { strokeWidth: 1.8 });
        return a;
    },
    describe: (p) =>
        `A hawthorn hedge along the edge of a field, grown in rounded clumps ${within(p.berries, 0, 8, 5) > 0 ? "with red haws among the leaves" : "of green leaves"}${p.gap > 0 ? ", and a white field gate in a gap" : ""}.`,
    motion: {
        still: "A hedge is rooted along the edge of a field, and its haws are counted where they grow.",
    },
});
