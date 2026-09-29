import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

/** The colour each number is painted, from one to eight, and again with a white band from nine to fifteen. */
const TONES = ["glow", "sky", "berry", "mint", "tang", "ok", "pen", "ink"] as const;

const numberOf = (n: number): number => Math.max(0, Math.min(15, Math.round(n)));

export const poolBall = defineDrawing<{ n: number }>({
    id: "poolball",
    family: "sport",
    title: "Pool ball",
    group: "Props",
    about: "A pool ball seen from above, as big as the box. The white ball is plain; every other ball is painted a colour, banded with white from nine up, and carries its number in a white spot.",
    params: { n: 3 },
    settings: { n: { kind: "whole", min: 0, max: 15 } },
    takes: [
        { label: "The white ball", params: { n: 0 } },
        { label: "Three", params: { n: 3 } },
        { label: "Eight", params: { n: 8 } },
        { label: "Twelve, banded", params: { n: 12 } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            n = numberOf(p.n),
            r = 0.92 * U;
        if (n === 0) {
            pen.circle(g, U, U, r * 2, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
            pen.circle(g, 0.72 * U, 0.72 * U, 0.3 * U, "ruler", pen.fill("paper"), {
                strokeWidth: 0.6,
                stroke: c.t["ink-soft"],
            });
            return { middle: [U, U, "up"] };
        }
        const tone = TONES[(n - 1) % 8] ?? "glow";
        if (n > 8) {
            pen.circle(g, U, U, r * 2, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
            pen.rect(g, 0.2 * U, 0.55 * U, 1.6 * U, 0.9 * U, "pencil", pen.fill(tone), {
                strokeWidth: 0.8,
                roughness: 0.2,
            });
            pen.circle(g, U, U, r * 2, "pencil", null, { strokeWidth: 1.6 });
        } else pen.circle(g, U, U, r * 2, "pencil", pen.fill(tone), { strokeWidth: 1.6 });
        pen.circle(g, U, U, 1.05 * U, "ruler", pen.fill("card"), {
            strokeWidth: 0.8,
            disableMultiStroke: true,
        });
        num(c, U, 1.3 * U, n, n > 9 ? 13 : 16);
        return { middle: [U, U, "up"] };
    },
    describe: (p) =>
        numberOf(p.n) === 0
            ? "The plain white ball of a pool game seen from above, the one the cue strikes to knock the numbered balls into the pockets."
            : "A painted pool ball seen from above, with its number written in a round white spot in the middle so it can be read wherever it rolls.",
    motion: { still: "A ball moves only when the game rolls it across the table." },
});
