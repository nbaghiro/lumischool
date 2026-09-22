import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { onCircle, sector, soft } from "../lettering";

const TAU = Math.PI * 2;

/** A count arriving as 0, 2.5 or 200 still has to draw something sane. */
const whole = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, Math.round(v)));

export const pizza = defineDrawing({
    id: "pizza",
    family: "food",
    title: "Pizza",
    group: "Props",
    about: "A pizza cut into equal slices with some of them gone and the board showing through the gap. The cuts are drawn at the ruler level, so what is left can be read off as a fraction of the whole.",
    params: { slices: 8, taken: 3, toppings: true },
    settings: {
        slices: { kind: "whole", min: 2, max: 16 },
        taken: { kind: "whole", min: 0, max: 16 },
        toppings: { kind: "flag" },
    },
    takes: [
        { label: "Three of eight gone", params: { slices: 8, taken: 3, toppings: true } },
        { label: "Whole, cut in six", params: { slices: 6, taken: 0, toppings: true } },
        { label: "Half left", params: { slices: 4, taken: 2, toppings: false } },
        { label: "One slice taken", params: { slices: 8, taken: 1, toppings: true } },
    ],
    box: () => ({ w: 12, h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 6 * U,
            cy = 6.1 * U,
            R = 4.3 * U,
            board = 5.1 * U;
        const n = whole(p.slices, 2, 16),
            gone = whole(p.taken, 0, n);
        const a: RawAnchors = { centre: [cx, cy, "up"], board: [cx, cy - board, "up"] };
        // The board is drawn whole and first, so a slice that has gone leaves a real gap rather than
        // an outline: what is missing is missing, and what is left is the only thing with a fill.
        pen.circle(g, cx, cy, board * 2, "pencil", pen.fill("card"), { strokeWidth: 2.4 });
        pen.circle(g, cx, cy, (board - 8) * 2, "pencil", null, {
            strokeWidth: 1.1,
            stroke: c.t["ink-soft"],
        });
        if (gone < n) {
            const from = (gone / n) * TAU,
                d = sector(cx, cy, R, from, TAU);
            pen.path(g, d, "ruler", pen.fill("tang", "solid", { hachureGap: 7, fillWeight: 0.6 }), {
                strokeWidth: 0,
            });
            pen.path(g, d, "ruler", null, { strokeWidth: 2.2 });
            pen.arc(
                g,
                cx,
                cy,
                (R - 13) * 2,
                (R - 13) * 2,
                from - Math.PI / 2,
                TAU - Math.PI / 2,
                "pencil",
                { strokeWidth: 1.2, stroke: c.t["ink-soft"] },
            );
            // Every cut is a radius of the same circle at the same angle apart, which is the whole claim
            // the drawing makes: the slices are equal, and a child may check that with a ruler.
            for (let i = gone === 0 ? 0 : gone + 1; i < n; i++) {
                const [ex, ey] = onCircle(cx, cy, R, i / n);
                pen.line(g, cx, cy, ex, ey, "ruler", { strokeWidth: 1.6 });
            }
        }
        for (let i = gone; i < n; i++) {
            const mid = (i + 0.5) / n;
            if (p.toppings) {
                for (const [rr, off] of [
                    [0.44, 0],
                    [0.72, -0.22],
                    [0.72, 0.22],
                ] as const) {
                    const [tx, ty] = onCircle(cx, cy, R * rr, mid + off / n);
                    pen.circle(g, tx, ty, 13, "pencil", pen.fill("berry"), { strokeWidth: 1.1 });
                }
            }
            const [mx, my] = onCircle(cx, cy, R * 0.62, mid);
            a[`slice(${i})`] = [mx, my, "up"];
        }
        if (gone > 0) {
            const [gx, gy] = onCircle(cx, cy, R * 0.55, gone / (2 * n));
            a.gap = [gx, gy, "up"];
        }
        soft(c, cx, 12.35 * U, `cut into ${n}`, 14);
        return a;
    },
    describe: (p) => {
        const n = whole(p.slices, 2, 16),
            gone = whole(p.taken, 0, n);
        return `A round pizza on a board seen from above, cut into ${n} equal slices${gone > 0 ? ", with a gap where slices have been taken" : ""}${p.toppings ? ", with round toppings on each slice" : ""}.`;
    },
});
