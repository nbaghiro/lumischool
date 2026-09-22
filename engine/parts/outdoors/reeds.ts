import { type Ctx, type RawAnchors } from "../../ink/surface";
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

export const reeds = defineDrawing({
    id: "reeds",
    family: "outdoors",
    title: "Reeds",
    group: "Structures",
    about: "A clump of reeds at the edge of a stream, tall stems with a brown head on some of them, leaning a little the way the wind goes. The count of stems is a setting.",
    params: { stems: 5, lean: 0.15 },
    settings: {
        stems: { kind: "whole", min: 2, max: 9 },
        lean: { kind: "number", min: -0.5, max: 0.5, step: 0.05 },
    },
    takes: [
        { label: "Five stems", params: { stems: 5, lean: 0.15 } },
        { label: "Nine, leaning the other way", params: { stems: 9, lean: -0.25 } },
    ],
    box: (p) => ({ w: Math.max(2, Math.ceil(whole(p.stems, 2, 9, 5) * 0.5) + 1), h: 4 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            n = whole(p.stems, 2, 9, 5),
            lean = Math.max(-0.5, Math.min(0.5, Number(p.lean) || 0)),
            foot = 3.9 * U;
        const w = Math.max(2, Math.ceil(n * 0.5) + 1) * U;
        for (let i = 0; i < n; i++) {
            const x = 0.5 * U + ((i + 0.5) / n) * (w - U),
                tall = (2.3 + ((i * 7) % 5) * 0.32) * U,
                top = foot - tall,
                tx = x + lean * tall * 0.6;
            pen.path(
                g,
                `M${x} ${foot}Q${x + lean * tall * 0.2} ${foot - tall * 0.55} ${tx} ${top}`,
                "pencil",
                null,
                { strokeWidth: 2.2, stroke: c.t.mint, disableMultiStroke: true },
            );
            if (i % 2 === 0)
                pen.ellipse(
                    g,
                    tx,
                    top + 0.15 * U,
                    0.26 * U,
                    0.75 * U,
                    "pencil",
                    pen.fill("tang", "solid"),
                    calm(c, 1.2),
                );
            else {
                pen.path(
                    g,
                    `M${tx} ${top}Q${tx + 0.3 * U * (lean >= 0 ? 1 : -1)} ${top + 0.45 * U} ${tx + 0.12 * U} ${top + 1.1 * U}`,
                    "pencil",
                    null,
                    { strokeWidth: 1.7, stroke: c.t.mint, disableMultiStroke: true },
                );
                pen.path(
                    g,
                    `M${x + 0.1 * U} ${foot - 0.4 * U}Q${x + 0.55 * U} ${foot - tall * 0.5} ${x + 0.2 * U} ${foot - tall * 0.75}`,
                    "pencil",
                    null,
                    { strokeWidth: 1.5, stroke: c.t.mint, disableMultiStroke: true },
                );
            }
        }
        return { foot: [w / 2, foot, "down"], top: [w / 2, foot - 3.4 * U, "up"] };
    },
    describe: (p) => {
        const lean = Math.max(-0.5, Math.min(0.5, Number(p.lean) || 0));
        return `A clump of tall green reeds at the edge of a stream, ${lean < 0 ? "leaning to the left" : lean > 0 ? "leaning to the right" : "standing straight"}, brown heads on some of the stems and thin leaves on the rest.`;
    },
    motion: { still: "Reeds lean in the wind a world blows; on the shelf they stand still." },
});
