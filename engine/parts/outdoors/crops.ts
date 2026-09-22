import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { blade, clamp } from "../animals/nature";

/** One plant of a crop at a stage: sown, a shoot, leafy, ripe, cut. */
function cropAt<G>(c: Ctx<G>, x: number, base: number, stage: number, k: number): void {
    const { pen, g } = c,
        green = { strokeWidth: 1.4, stroke: c.t.ok };
    if (stage <= 0) {
        pen.arc(g, x, base, 0.9 * U * k, 0.5 * U * k, Math.PI, Math.PI * 2, "pencil", {
            strokeWidth: 1.3,
        });
        pen.circle(g, x, base - 0.12 * U * k, 4 * k, "ruler", pen.fill("tang"), {
            strokeWidth: 0.7,
        });
        return;
    }
    const h = ([0, 0.7, 1.5, 2.4, 0.4][Math.min(4, stage)] ?? 0) * U * k;
    if (stage === 4) {
        for (const dx of [-0.2, 0, 0.2])
            pen.line(g, x + dx * U * k, base, x + dx * U * k * 1.3, base - h, "pencil", {
                strokeWidth: 1.3,
                stroke: c.t.tang,
            });
        return;
    }
    pen.line(g, x, base, x + 1, base - h, "pencil", green);
    const leaves = stage === 1 ? 1 : 2;
    for (let i = 0; i < leaves; i++)
        for (const sd of [-1, 1]) {
            const y = base - h * (0.35 + i * 0.3);
            pen.polygon(
                g,
                blade(
                    x,
                    y,
                    (stage === 1 ? 0.45 : 0.7) * U * k,
                    0.28 * U * k,
                    -Math.PI / 2 + sd * 0.95,
                    6,
                ),
                "pencil",
                pen.fill("mint"),
                { strokeWidth: 1 },
            );
        }
    if (stage === 3) {
        // an ear of grain at the top, its kernels in two rows
        for (let j = 0; j < 4; j++)
            for (const sd of [-1, 1])
                pen.ellipse(
                    g,
                    x + sd * 0.12 * U * k,
                    base - h - j * 0.2 * U * k,
                    0.22 * U * k,
                    0.3 * U * k,
                    "pencil",
                    pen.fill("glow"),
                    { strokeWidth: 0.9 },
                );
        pen.line(g, x, base - h - 0.7 * U * k, x + 0.1 * U * k, base - h - 1.1 * U * k, "pencil", {
            strokeWidth: 0.8,
        });
    }
}

export const crops = defineDrawing({
    id: "crops",
    family: "outdoors",
    title: "A field of crops",
    group: "Props",
    about: "A field of plants in rows, all at one stage of their year: sown in the furrows, up as shoots, leafy, ripe with ears of grain, or cut to stubble. Rows by plants is an array to count, and the stages are the seasons of a crop.",
    params: { stage: 2, rows: 3, plants: 6 },
    settings: {
        stage: { kind: "whole", min: 0, max: 4 },
        rows: { kind: "whole", min: 1, max: 4 },
        plants: { kind: "whole", min: 2, max: 10 },
    },
    takes: [
        { label: "Sown", params: { stage: 0, rows: 3, plants: 6 } },
        { label: "Shoots", params: { stage: 1, rows: 3, plants: 6 } },
        { label: "Ripe", params: { stage: 3, rows: 2, plants: 6 } },
        { label: "Cut", params: { stage: 4, rows: 3, plants: 4 } },
    ],
    box: (p) => ({
        w: Math.ceil(clamp(p.plants, 2, 10) * 1.5 + 1),
        h: Math.ceil(clamp(p.rows, 1, 4) * 1.4 + 3),
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            stage = clamp(p.stage, 0, 4),
            rows = clamp(p.rows, 1, 4),
            n = clamp(p.plants, 2, 10);
        const W = Math.ceil(n * 1.5 + 1) * U,
            H = Math.ceil(rows * 1.4 + 3) * U,
            a: RawAnchors = {};
        for (let r = 0; r < rows; r++) {
            // the back row is smaller and higher, as a field goes away from you
            const k = 0.7 + (0.3 * (r + 1)) / rows,
                base = H - 0.4 * U - (rows - 1 - r) * 1.4 * U;
            pen.line(g, 0.3 * U, base, W - 0.3 * U, base, "pencil", {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
            });
            for (let i = 0; i < n; i++) {
                const x = (1.25 + i * 1.5) * U + (r % 2) * 0.2 * U;
                cropAt(c, x, base, stage, k);
                a[`plant(${r * n + i})`] = [x, base, "down"];
            }
        }
        return a;
    },
    describe: () =>
        "A field of plants set out in rows on lines of soil, the back rows smaller as the field goes away, all at one stage of growth.",
});
