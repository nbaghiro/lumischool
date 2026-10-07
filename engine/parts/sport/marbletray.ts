import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** The most marbles the tray holds. */
const SLOTS = 10;

export const marbleTray = defineDrawing<{ count: number }>({
    id: "marbletray",
    family: "sport",
    title: "Marble tray",
    group: "Props",
    about: "A short wooden tray in a row of ten round dips, holding the marbles a player has left to fire; the empty dips stay as rings.",
    params: { count: 5 },
    settings: { count: { kind: "whole", min: 0, max: SLOTS } },
    takes: [
        { label: "Five left", params: { count: 5 } },
        { label: "Two left", params: { count: 2 } },
    ],
    box: () => ({ w: 6, h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            n = Math.max(0, Math.min(SLOTS, Math.round(p.count)));
        pen.rect(g, 0.1 * U, 0.12 * U, 5.8 * U, 0.76 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.1,
            roughness: 0.25,
        });
        for (let i = 0; i < SLOTS; i++) {
            const x = (0.48 + i * 0.56) * U;
            if (i < n) {
                pen.circle(g, x, 0.5 * U, 0.48 * U, "pencil", pen.fill("card", "solid"), {
                    strokeWidth: 0.8,
                    roughness: 0.2,
                });
                pen.path(
                    g,
                    `M${x - 0.14 * U} ${0.55 * U}Q${x} ${0.36 * U} ${x + 0.14 * U} ${0.48 * U}`,
                    "pencil",
                    null,
                    {
                        strokeWidth: 1.2,
                        stroke: c.t.sky,
                        roughness: 0.2,
                    },
                );
            } else
                pen.circle(g, x, 0.5 * U, 0.36 * U, "pencil", null, {
                    strokeWidth: 0.5,
                    stroke: c.t["ink-soft"],
                    roughness: 0.2,
                });
        }
        return { first: [0.48 * U, 0.5 * U, "up"] };
    },
    describe: () =>
        "A short wooden tray with a row of ten round dips, holding glass marbles waiting to be fired, the empty dips left as rings.",
    motion: { still: "The tray stands still; a marble leaves it when one is fired." },
});
