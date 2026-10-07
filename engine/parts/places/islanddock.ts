import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const longOf = (v: number) => Math.max(3, Math.min(12, Math.round(v)));

export const islandDock = defineDrawing<{ long: number }>({
    id: "islanddock",
    family: "places",
    title: "Wooden dock from above",
    group: "Props",
    about: "A wooden dock seen from straight above, running out from a beach into the sea: planks laid across it side by side, round posts at its edges and a bollard at its far end to tie a boat to.",
    params: { long: 6 },
    settings: { long: { kind: "whole", min: 3, max: 12 } },
    takes: [
        { label: "Six squares out", params: { long: 6 } },
        { label: "A short one", params: { long: 3 } },
    ],
    box: (p) => ({ w: 3, h: longOf(p.long) + 1 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const n = longOf(p.long),
            x0 = 0.3 * U,
            x1 = 2.7 * U,
            y0 = 0.2 * U,
            y1 = (n + 0.6) * U;
        pen.rect(g, x0, y0, x1 - x0, y1 - y0, "pencil", pen.fill("tang"), { strokeWidth: 1.6 });
        for (let y = y0 + 0.5 * U; y < y1 - 0.1 * U; y += 0.5 * U)
            pen.line(g, x0, y, x1, y, "ruler", {
                strokeWidth: 0.9,
                roughness: 0.4,
                disableMultiStroke: true,
            });
        for (let k = 0; k <= Math.floor(n / 2); k++) {
            const y = Math.min(y1 - 0.25 * U, y0 + 0.25 * U + k * 2 * U);
            for (const x of [x0, x1])
                pen.circle(g, x, y, 0.42 * U, "pencil", pen.fill("ink-soft", "solid"), {
                    strokeWidth: 1.1,
                });
        }
        pen.circle(g, 1.5 * U, y1 - 0.45 * U, 0.5 * U, "pencil", pen.fill("ink", "solid"), {
            strokeWidth: 1.2,
        });
        a.foot = [1.5 * U, y0, "up"];
        a.end = [1.5 * U, y1, "down"];
        return a;
    },
    describe: (p) =>
        `A wooden dock seen from straight above, ${longOf(p.long)} squares long, planks laid across it, round posts at its edges and a bollard at the far end.`,
    motion: { still: "A dock is built into the beach and does not move." },
});
