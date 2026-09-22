import { type Ctx } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

/** Squares from the plank's underside to the ground, which need not be whole. */
const height = (v: unknown) => Math.max(2, Math.min(10, Number(v) || 5));

export const seesawProps = defineDrawing({
    id: "seesawprops",
    family: "science",
    title: "See-saw props",
    group: "Structures",
    about: "Two wooden props standing under the ends of a see-saw plank, each a post with a cap and a foot, `span` squares apart. They hold the plank level while weights are stood on it, and when a question takes them away the plank shows whether it balances.",
    params: { span: 22, tall: 5 },
    settings: {
        span: { kind: "whole", min: 4, max: 34 },
        tall: { kind: "number", min: 2, max: 10, step: 0.5 },
    },
    takes: [
        {
            label: "Under a plank of three steps, four squares apart",
            params: { span: 22, tall: 5 },
        },
        { label: "Under a short plank, and lower", params: { span: 10, tall: 3.5 } },
    ],
    box: (p) => ({ w: whole(p.span, 4, 40, 22) + 2, h: Math.ceil(height(p.tall)) }),
    draw: (c, p) => {
        const { pen, g } = c,
            span = whole(p.span, 4, 40, 22),
            tall = height(p.tall) * U;
        const out: Record<string, [number, number, "up"]> = {};
        for (const [name, x] of [
            ["left", U],
            ["right", (span + 1) * U],
        ] as const) {
            pen.rect(
                g,
                x - 5,
                6,
                10,
                tall - 14,
                "ruler",
                pen.fill("tang", "hachure", { hachureGap: 5, hachureAngle: 80, fillWeight: 0.8 }),
                calm(c, 1.6),
            );
            pen.rect(g, x - 9, 0, 18, 6, "ruler", pen.fill("card"), calm(c, 1.5));
            pen.rect(
                g,
                x - 11,
                tall - 8,
                22,
                8,
                "ruler",
                pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.7 }),
                calm(c, 1.5),
            );
            out[name] = [x, 0, "up"];
        }
        return out;
    },
    describe: () =>
        "Two wooden props standing apart under the ends of a see-saw plank, each a brown post with a white cap on top and a grey foot on the ground.",
    motion: {
        still: "It holds a plank level, and a question takes it away rather than it moving by itself.",
    },
});
