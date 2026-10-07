import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

const TONES = ["glow", "sky", "mint", "berry", "tang"] as const;

/** The five points and five dips of a star round its middle, its points `r` out and its dips `r` times `dip`. */
const points = (cx: number, cy: number, r: number, dip: number): [number, number][] =>
    Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5,
            d = i % 2 ? r * dip : r;
        return [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
    });

export const numberStar = defineDrawing<{ n: number; tone: string }>({
    id: "numberstar",
    family: "travel",
    title: "Number star",
    group: "Props",
    about: "A fat five-pointed star with a number on a round white middle, floating in the sky for a flyer to catch.",
    params: { n: 5, tone: "glow" },
    settings: { n: { kind: "whole", min: 0, max: 99 }, tone: { kind: "one of", of: TONES } },
    takes: [
        { label: "A yellow five", params: { n: 5, tone: "glow" } },
        { label: "A blue twenty", params: { n: 20, tone: "sky" } },
        { label: "A pink three", params: { n: 3, tone: "berry" } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            tone = TONES.find((t) => t === p.tone) ?? "glow",
            cx = U,
            cy = 1.05 * U,
            n = Math.max(0, Math.min(99, Math.round(p.n)));
        pen.polygon(g, points(cx, cy, 0.95 * U, 0.55), "pencil", pen.fill(tone, "solid"), {
            strokeWidth: 1.4,
            roughness: 0.25,
        });
        pen.circle(g, cx, cy, 0.95 * U, "pencil", pen.fill("card", "solid"), {
            strokeWidth: 0.8,
            roughness: 0.2,
        });
        num(c, cx, cy + 0.27 * U, n, n > 9 ? 13 : 15);
        return { middle: [cx, cy, "up"] };
    },
    describe: (p) =>
        `A fat five-pointed star with the number ${Math.max(0, Math.min(99, Math.round(p.n)))} written on its round white middle, floating in the sky to be caught.`,
    motion: { still: "A star in the sky floats only as the game bobs it." },
});
