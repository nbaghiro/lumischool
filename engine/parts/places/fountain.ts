import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num, patch } from "../lettering";

/** A value as it is written on the basin, without the float's noise. */
const shown = (v: number): string => String(Number(v.toFixed(2)));

/** The old city's fountain, seen from above (.docs/grades-5-6.md, the old walled city). */
export const fountain = defineDrawing({
    id: "fountain",
    family: "places",
    title: "Fountain in the square",
    group: "Props",
    about: "A round stone fountain in a paved square, seen from above: a rim of stone round a basin of water, and a spout in the middle throwing water out in rings. It is a circle a child can measure: `across` rules a line over the basin through the spout and writes its length, `round` draws the way round the rim in the teacher's pen and writes that, and `ask` puts a question mark on one of them instead, so the square's fountain asks for a diameter from a circumference or the other way.",
    params: { across: 6, round: 0, ask: 0, unit: "m" },
    settings: {
        across: { kind: "number", min: 0, max: 100, step: 0.1 },
        round: { kind: "number", min: 0, max: 400, step: 0.01 },
        ask: { kind: "one of", of: [0, 1, 2] },
        unit: { kind: "text", most: 4 },
    },
    takes: [
        { label: "Six metres across", params: { across: 6, round: 0, ask: 0, unit: "m" } },
        { label: "How far round", params: { across: 8, round: 0, ask: 2, unit: "m" } },
        { label: "How far across", params: { across: 0, round: 31.4, ask: 1, unit: "m" } },
        { label: "Just the fountain", params: { across: 0, round: 0, ask: 0, unit: "m" } },
    ],
    box: () => ({ w: 14, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 7 * U,
            cy = 7.4 * U,
            r = 5.2 * U,
            unit = p.unit ? ` ${p.unit}` : "",
            a: RawAnchors = { centre: [cx, cy, "down"] };
        // the square's paving, a ring of slabs round the rim
        for (let k = 0; k < 16; k++) {
            const t = (k / 16) * Math.PI * 2;
            pen.line(
                g,
                cx + (r + 0.2 * U) * Math.cos(t),
                cy + (r + 0.2 * U) * Math.sin(t),
                cx + (r + 0.9 * U) * Math.cos(t),
                cy + (r + 0.9 * U) * Math.sin(t),
                "pencil",
                { strokeWidth: 0.8, stroke: c.t["ink-soft"] },
            );
        }
        pen.circle(g, cx, cy, (r + 0.9 * U) * 2, "pencil", null, {
            strokeWidth: 0.8,
            stroke: c.t["ink-soft"],
        });
        pen.circle(g, cx, cy, r * 2, "ruler", pen.fill("card"), { strokeWidth: 2.4 });
        pen.circle(
            g,
            cx,
            cy,
            (r - 0.6 * U) * 2,
            "ruler",
            pen.fill("sky", "solid", { hachureGap: 7 }),
            {
                strokeWidth: 1.6,
            },
        );
        // the rings the spout throws, lighter as they spread
        for (const k of [1.4, 2.4, 3.4])
            pen.circle(g, cx, cy, k * U * 2, "pencil", null, {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
        pen.circle(g, cx, cy, 0.9 * U * 2, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
        pen.circle(g, cx, cy, 0.35 * U * 2, "ruler", pen.fill("sky"), { strokeWidth: 1.2 });
        const value = (v: number, which: number): string =>
            p.ask === which ? "?" : v > 0 ? `${shown(v)}${unit}` : "";
        const round = value(p.round, 2);
        if (round) {
            pen.arc(g, cx, cy, r * 2, r * 2, -Math.PI * 0.8, -Math.PI * 0.2, "ruler", {
                strokeWidth: 3.2,
                stroke: c.t.pen,
            });
            patch(c, cx, cy - r - 17, round.length * 9 + 10, 18);
            num(c, cx, cy - r - 10, round, 16);
        }
        a.round = [cx, cy - r, "up"];
        const across = value(p.across, 1);
        if (across) {
            pen.line(g, cx - r, cy, cx + r, cy, "ruler", { strokeWidth: 2 });
            for (const x of [cx - r, cx + r])
                pen.line(g, x, cy - 6, x, cy + 6, "ruler", { strokeWidth: 2 });
            patch(c, cx + r / 2, cy + 14, across.length * 9 + 10, 18);
            num(c, cx + r / 2, cy + 20, across, 16);
            a.across = [cx + r / 2, cy, "down"];
        }
        return a;
    },
    describe: (p) =>
        `A round stone fountain seen from above, water in its basin and a spout in the middle${p.across > 0 || p.ask === 1 ? ", a line ruled across it" : ""}${p.round > 0 || p.ask === 2 ? ", the way round its rim marked" : ""}.`,
    motion: { still: STILL.instrument },
});
