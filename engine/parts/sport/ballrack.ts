import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** How many balls the rack holds along its rail. */
export const RACK_HOLDS = 5;

const count = (v: number) => Math.max(0, Math.min(RACK_HOLDS, Math.round(Number(v) || 0)));

export const ballRack = defineDrawing<{ balls: number }>({
    id: "ballrack",
    family: "sport",
    title: "Ball rack",
    group: "Props",
    about: "A low wire rack that holds basketballs in a row along a sloping rail, so the next ball rolls down to the end ready to be picked up and thrown.",
    params: { balls: 5 },
    settings: { balls: { kind: "whole", min: 0, max: RACK_HOLDS } },
    takes: [
        { label: "Full", params: { balls: 5 } },
        { label: "Two left", params: { balls: 2 } },
        { label: "Empty", params: { balls: 0 } },
    ],
    box: () => ({ w: 6, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            base = 3 * U,
            wire = { strokeWidth: 1.4, roughness: 0.25 },
            rail = (x: number) => 1.6 * U + (x / (6 * U)) * 0.5 * U;
        for (const x of [0.6, 5.4])
            pen.line(g, x * U, rail(x * U), x * U, base - 0.1 * U, "ruler", wire);
        pen.line(g, 0.3 * U, rail(0.3 * U), 5.7 * U, rail(5.7 * U), "ruler", wire);
        pen.line(
            g,
            0.3 * U,
            rail(0.3 * U) + 0.5 * U,
            5.7 * U,
            rail(5.7 * U) + 0.5 * U,
            "ruler",
            wire,
        );
        const n = count(p.balls),
            r = 0.5 * U;
        // the balls roll to the low end, on the right
        for (let k = 0; k < n; k++) {
            const x = 5.1 * U - k * 1.05 * U;
            const y = rail(x) - r + 0.1 * U;
            pen.circle(g, x, y, r * 2, "pencil", pen.fill("tang", "solid"), {
                strokeWidth: 1.3,
                roughness: 0.35,
            });
            pen.line(g, x - r, y, x + r, y, "ruler", { strokeWidth: 0.9, roughness: 0.2 });
            pen.line(g, x, y - r, x, y + r, "ruler", { strokeWidth: 0.9, roughness: 0.2 });
        }
        return { next: [5.1 * U, rail(5.1 * U) - r, "up"] };
    },
    describe: (p) =>
        `A low wire rack beside a basketball drive holding ${count(p.balls) === 0 ? "no balls at all" : `${count(p.balls)} orange basketball${count(p.balls) === 1 ? "" : "s"}`} in a row along its sloping rail, ready to throw.`,
    motion: { still: "The rack stands on the ground; its balls move only when one is taken." },
});
