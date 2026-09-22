import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";

/** One stroke to a line, corners kept, the roughness turned down: the shelf's calm level for things. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    clamp(Math.round(Number(v) || d), lo, hi);

/** How far down its box a see-saw plank has its top, the line it turns about and its middle, in squares; a game stands things by these. */
export const PLANK_LINE = { top: 0.62, pivot: 1, middle: 1.5 } as const;

export const seesawPlank = defineDrawing({
    id: "seesawplank",
    family: "science",
    title: "See-saw plank",
    group: "Structures",
    about: "A long wooden plank for a see-saw, with a step marked every few squares out from its bolt both ways and numbered under each one. It is drawn at a game's size with the shelf's own line weights, so the step a bag stands on is read off the number under it.",
    params: { steps: 5, gap: 4, numbers: true },
    settings: {
        steps: { kind: "whole", min: 1, max: 9 },
        gap: { kind: "whole", min: 1, max: 6 },
        numbers: { kind: "flag" },
    },
    takes: [
        {
            label: "Five steps each side, three squares apart",
            params: { steps: 5, gap: 3, numbers: true },
        },
        {
            label: "Three steps, two squares apart, not numbered",
            params: { steps: 3, gap: 2, numbers: false },
        },
    ],
    box: (p) => ({ w: 2 * whole(p.steps, 1, 9, 5) * whole(p.gap, 1, 6, 4) + 2, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = whole(p.steps, 1, 9, 5),
            gap = whole(p.gap, 1, 6, 4);
        const w = (2 * n * gap + 2) * U,
            mid = w / 2,
            top = PLANK_LINE.top * U,
            bot = (2 * PLANK_LINE.pivot - PLANK_LINE.top) * U,
            a: RawAnchors = {};
        pen.rect(
            g,
            U - 4,
            top,
            w - 2 * U + 8,
            bot - top,
            "ruler",
            pen.fill("tang", "hachure", { hachureGap: 6, hachureAngle: -8, fillWeight: 0.8 }),
            calm(c, 1.8),
        );
        for (let k = -n; k <= n; k++) {
            const x = mid + k * gap * U;
            a[`step(${k})`] = [x, top, "up"];
            if (k === 0) continue;
            pen.line(g, x, top + 3, x, bot - 3, "ruler", {
                strokeWidth: 1.6,
                stroke: c.paper ? c.t.ink : c.t.card,
                disableMultiStroke: true,
            });
            if (p.numbers) {
                patch(c, x, bot + 1.25 * U - 6, 22, 19);
                num(c, x, bot + 1.25 * U, Math.abs(k), 16);
            }
        }
        pen.circle(g, mid, (top + bot) / 2, 10, "ruler", pen.fill("card"), calm(c, 1.4));
        a.pivot = [mid, (top + bot) / 2, "down"];
        return a;
    },
    describe: (p) =>
        `A wooden plank for a see-saw seen from the side, a bolt hole at its middle and pale step lines marked at even spaces out from it${p.numbers ? ", each numbered underneath" : ""}.`,
    motion: { still: "Its steps are read off it, and a game turns it by the loads on it." },
});
