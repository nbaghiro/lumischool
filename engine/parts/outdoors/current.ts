import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

export const current = defineDrawing({
    id: "current",
    family: "outdoors",
    title: "Current",
    group: "Marks",
    about: "The current on a river's surface, seen from the side: three staggered rows of short streaks with a small head on each, going the way the water flows. The streaks repeat every four squares, so a game can slide the drawing along to show the water moving.",
    params: { length: 16, facing: -1 },
    settings: {
        length: { kind: "whole", min: 4, max: 36 },
        facing: { kind: "one of", of: [-1, 1] },
    },
    takes: [
        { label: "Flowing left", params: { length: 16, facing: -1 } },
        { label: "Flowing right", params: { length: 12, facing: 1 } },
    ],
    box: (p) => ({ w: whole(p.length, 4, 60, 16), h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = whole(p.length, 4, 60, 16) * U,
            dir = Number(p.facing) >= 0 ? 1 : -1;
        for (let row = 0; row < 3; row++) {
            const y = (0.45 + row * 0.55) * U;
            for (let x = (0.4 + row * 1.35) * U; x + 1.3 * U <= w; x += 4 * U) {
                const a = dir > 0 ? x : x + 1.3 * U,
                    b = dir > 0 ? x + 1.3 * U : x;
                pen.path(g, `M${a} ${y}Q${(a + b) / 2} ${y - 3} ${b} ${y}`, "ruler", null, {
                    strokeWidth: 1.5,
                    stroke: c.t.sky,
                    disableMultiStroke: true,
                });
                pen.path(
                    g,
                    `M${b - dir * 5} ${y - 4}L${b} ${y}L${b - dir * 5} ${y + 3}`,
                    "ruler",
                    null,
                    { strokeWidth: 1.4, stroke: c.t.sky, disableMultiStroke: true },
                );
            }
        }
        return { surface: [w / 2, 0.45 * U, "up"] };
    },
    describe: (p) =>
        `Streaks on a river's surface seen from the side, three staggered rows of short blue strokes each with a small arrow head, all pointing ${Number(p.facing) >= 0 ? "right" : "left"} the way the water flows.`,
    motion: {
        still: "A game slides it along the water to show the flow; on the shelf it holds still, since it shows a direction.",
    },
});
