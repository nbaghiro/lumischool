import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

/** The underside of the branch down its box, in squares, where a game ties its ropes. */
export const SWINGBRANCH = { under: 3.35 } as const;

function clump<G>(c: Ctx<G>, x: number, y: number, r: number): void {
    const { pen, g } = c;
    const d = `M${x - r} ${y}C${x - r} ${y - r * 0.9} ${x - r * 0.3} ${y - r * 1.2} ${x} ${y - r * 0.9}C${x + r * 0.4} ${y - r * 1.3} ${x + r} ${y - r * 0.8} ${x + r} ${y}Q${x} ${y + r * 0.35} ${x - r} ${y}Z`;
    pen.path(g, d, "pencil", pen.fill("mint", "solid"), { strokeWidth: 1.4 });
}

export const swingBranch = defineDrawing({
    id: "swingbranch",
    family: "outdoors",
    title: "Branch for ropes",
    group: "Props",
    about: "A long thick branch reaching out over water from a tree on the bank, with bark lines along it and clumps of leaves on top, strong enough to tie swinging ropes to its underside.",
    params: { long: 12, leaves: 3 },
    settings: {
        long: { kind: "whole", min: 4, max: 24 },
        leaves: { kind: "whole", min: 0, max: 6 },
    },
    takes: [
        { label: "Twelve squares, three clumps", params: { long: 12, leaves: 3 } },
        { label: "A long bare branch", params: { long: 20, leaves: 0 } },
        { label: "A short leafy one", params: { long: 6, leaves: 4 } },
    ],
    box: (p) => ({ w: whole(p.long, 4, 24, 12), h: 4 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = whole(p.long, 4, 24, 12) * U,
            leaves = whole(p.leaves, 0, 6, 3),
            under = SWINGBRANCH.under * U;
        // thick where it leaves the trunk on the left and thin at the tip, bowing up a little on top,
        // while its underside stays level so every rope is tied at the same height
        const thick = (x: number) => 1.15 * U - (x / w) * 0.8 * U;
        const top = (x: number) => under - thick(x) - Math.sin((Math.PI * x) / w) * 3;
        const n = 12,
            upper: [number, number][] = [],
            lower: [number, number][] = [];
        for (let i = 0; i <= n; i++) {
            const x = (i / n) * (w - 3);
            upper.push([x, top(x)]);
            lower.push([x, under + Math.sin(i * 1.7) * 0.8]);
        }
        const tip: [number, number] = [w - 1, (top(w - 3) + under) / 2];
        pen.polygon(
            g,
            [...upper, tip, ...lower.reverse()],
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 6, hachureAngle: -25, fillWeight: 0.55 }),
            { strokeWidth: 1.7 },
        );
        // bark: short curved strokes along the grain, and a knot
        for (let x = 0.9 * U; x < w - 2 * U; x += 1.7 * U) {
            const y = (top(x) + under) / 2;
            pen.path(g, `M${x} ${y - 2}q${0.5 * U} -3 ${U} 0`, "pencil", null, {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
        }
        pen.ellipse(g, 0.35 * w, (top(0.35 * w) + under) / 2 + 1, 7, 5, "pencil", null, {
            strokeWidth: 1,
        });
        for (let k = 0; k < leaves; k++) {
            const x = ((k + 0.7) / (leaves + 0.4)) * (w - 2 * U) + U;
            const y = top(x) + 1;
            pen.line(g, x - 3, y, x + 4, y - 0.7 * U, "pencil", { strokeWidth: 1.3 });
            clump(c, x + 5, y - 0.55 * U, 0.75 * U);
        }
        return {
            under: [w / 2, under, "down"],
            trunk: [0, (top(0) + under) / 2, "left"],
            tip,
        };
    },
    describe: (p) =>
        `A long brown branch seen from the side, thick at the trunk end and thinner at the tip${whole(p.leaves, 0, 6, 3) ? ", with clumps of green leaves along its top" : ", bare of leaves"}.`,
    motion: {
        still: "Ropes are tied to it and it holds them where a game swings them from, so it stays still.",
    },
});
