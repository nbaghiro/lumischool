import { part, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

/** A cake is as wide as its candles, never narrower than nine squares. */
const cakeW = (candles: number): number => Math.max(9, Math.ceil(candles * 1.2) + 3);

export const cake = defineDrawing({
    id: "cake",
    family: "food",
    title: "Cake",
    group: "Props",
    about: "A cake with candles on it, and cut lines across the top when it has been divided. Candles carry an age and therefore an addition; the cuts carry a sharing question. Neither needs a word of setting up.",
    params: { candles: 7, slices: 0 },
    settings: {
        candles: { kind: "whole", min: 0, max: 12 },
        slices: { kind: "whole", min: 0, max: 12 },
    },
    takes: [
        { label: "Seven candles", params: { candles: 7, slices: 0 } },
        { label: "Cut into eight", params: { candles: 0, slices: 8 } },
        { label: "One candle", params: { candles: 1, slices: 0 } },
        { label: "Cut into four, four candles", params: { candles: 4, slices: 4 } },
    ],
    box: (p) => ({ w: cakeW(p.candles), h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = cakeW(p.candles) * U,
            cx = w / 2;
        const top = 4.4 * U,
            bottom = 7.6 * U,
            half = Math.max(3.2, p.candles * 0.58) * U,
            a: RawAnchors = {};
        for (let i = 0; i < p.candles; i++) {
            const x = cx + (i - (p.candles - 1) / 2) * 1.1 * U;
            pen.rect(
                g,
                x - 4,
                top - 1.5 * U,
                8,
                1.5 * U,
                "pencil",
                pen.fill("sky", "solid", { hachureGap: 4 }),
                { strokeWidth: 1.2 },
            );
            pen.path(
                part(c, "flame", [x, top - 1.5 * U]).g,
                `M${x} ${top - 2.2 * U}Q${x + 6} ${top - 1.8 * U} ${x} ${top - 1.5 * U}Q${x - 6} ${top - 1.8 * U} ${x} ${top - 2.2 * U}Z`,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1 },
            );
            a[`candle(${i})`] = [x, top - 2.2 * U, "up"];
        }
        pen.ellipse(
            g,
            cx,
            top,
            half * 2,
            1.4 * U,
            "pencil",
            pen.fill("berry", "solid", { hachureGap: 7 }),
            { strokeWidth: 2 },
        );
        pen.path(
            g,
            `M${cx - half} ${top}V${bottom - 10}Q${cx - half} ${bottom} ${cx - half + 14} ${bottom}` +
                `H${cx + half - 14}Q${cx + half} ${bottom} ${cx + half} ${bottom - 10}V${top}`,
            "pencil",
            pen.fill("glow", "solid", { hachureGap: 9, fillWeight: 0.6 }),
            { strokeWidth: 2.4 },
        );
        pen.line(g, cx - half, top + 0.9 * U, cx + half, top + 0.9 * U, "pencil", {
            strokeWidth: 1.4,
            stroke: c.t["ink-soft"],
        });
        if (p.slices > 1) {
            // Cut lines only. A slice that has gone belongs on a fraction circle, which shows a part of
            // a whole honestly; a side view of a cake with a wedge out of it only reads as a broken cake.
            const ry = 0.7 * U;
            for (let k = 0; k < p.slices; k++) {
                const t = Math.PI / 2 + (k / p.slices) * Math.PI * 2;
                pen.line(g, cx, top, cx + half * Math.cos(t), top + ry * Math.sin(t), "pencil", {
                    strokeWidth: 1.1,
                    stroke: c.t["ink-soft"],
                });
            }
            say(c, cx, 8.6 * U, `cut into ${p.slices}`, 15);
        }
        a.top = [cx, top - 0.7 * U, "up"];
        a.cake = [cx, top, "up"];
        return a;
    },
    describe: (p) =>
        `A round cake seen from the side with pink icing on top and a yellow side${p.candles > 0 ? (p.candles > 1 ? ", candles standing on it in a row" : ", a candle standing on it") : ""}${p.slices > 1 ? ", and cut lines across the top" : ""}.`,
    motion: {
        body: { is: "breathe", amt: 0.025 },
        parts: { flame: { is: "twinkle", dim: 0.25, amt: 0.16, period: 1.9 } },
    },
});
