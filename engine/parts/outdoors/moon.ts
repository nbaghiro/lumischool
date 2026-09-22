import { type Ctx } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** The lit part of the moon as a true fraction of the disc: a half is a straight terminator. */
export function moon<G>(c: Ctx<G>, cx: number, cy: number, r: number, phase: number): void {
    const { pen, g } = c,
        f = Math.min(1, Math.max(0, phase));
    pen.circle(g, cx, cy, r * 2, "ruler", null, {
        strokeWidth: 1.4,
        strokeLineDash: [6, 5],
        stroke: c.t["ink-soft"],
    });
    if (f <= 0.02) return;
    if (f >= 0.98) {
        pen.circle(g, cx, cy, r * 2, "ruler", pen.fill("glow"), { strokeWidth: 1.8 });
        return;
    }
    const k = r * Math.abs(2 * f - 1);
    const back =
        k < 0.6
            ? `L${cx} ${cy - r}`
            : `A${k.toFixed(2)} ${r} 0 0 ${f > 0.5 ? 1 : 0} ${cx} ${cy - r}`;
    pen.path(
        g,
        `M${cx} ${cy - r}A${r} ${r} 0 0 1 ${cx} ${cy + r}${back}Z`,
        "ruler",
        pen.fill("glow"),
        { strokeWidth: 1.8 },
    );
}

export const moonV = defineDrawing({
    id: "moon",
    family: "outdoors",
    title: "Moon",
    group: "Props",
    about: "The moon with its lit part drawn as a true fraction of the disc, and the dark part as a dashed outline, so a half moon is a half and a crescent is less than a quarter.",
    params: { phase: 0.5 },
    settings: { phase: { kind: "number", min: 0, max: 1, step: 0.05 } },
    takes: [
        { label: "Half", params: { phase: 0.5 } },
        { label: "A crescent", params: { phase: 0.2 } },
        { label: "Full", params: { phase: 1 } },
    ],
    box: () => ({ w: 5, h: 5 }),
    draw: (c, p) => {
        moon(c, 2.5 * U, 2.5 * U, 2 * U, p.phase);
        return { moon: [2.5 * U, 0.5 * U, "up"] };
    },
    describe: () =>
        "The moon drawn as a disc, its lit part filled in yellow and the rest of it shown as a dashed outline.",
    motion: { still: "Its phase is read as a share of the disc." },
    reads: true,
});
