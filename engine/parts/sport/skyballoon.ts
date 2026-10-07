import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

const TONES = ["berry", "sky", "tang", "mint", "glow"] as const;

/** A balloon with a number on it, floating on its string: the body in the top two squares. */
export const skyBalloon = defineDrawing<{ n: number; tone: string }>({
    id: "skyballoon",
    family: "sport",
    title: "Number balloon",
    group: "Props",
    about: "A round party balloon with a big number on it, its knot at the bottom and a curly string hanging below, floating on its own.",
    params: { n: 6, tone: "berry" },
    settings: { n: { kind: "whole", min: 0, max: 99 }, tone: { kind: "one of", of: TONES } },
    takes: [
        { label: "A pink six", params: { n: 6, tone: "berry" } },
        { label: "A blue twelve", params: { n: 12, tone: "sky" } },
        { label: "A yellow three", params: { n: 3, tone: "glow" } },
    ],
    box: () => ({ w: 2, h: 3 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            tone = TONES.find((t) => t === p.tone) ?? "berry",
            cx = U,
            cy = 1.05 * U;
        pen.curve(
            g,
            [
                [cx, 2.0 * U],
                [cx - 0.2 * U, 2.35 * U],
                [cx + 0.15 * U, 2.65 * U],
                [cx - 0.05 * U, 2.95 * U],
            ],
            "pencil",
            { strokeWidth: 1, stroke: c.t["ink-soft"] },
        );
        pen.ellipse(g, cx, cy, 1.75 * U, 1.95 * U, "pencil", pen.fill(tone, "solid"), {
            strokeWidth: 1.5,
            roughness: 0.25,
        });
        pen.polygon(
            g,
            [
                [cx - 0.16 * U, 2.1 * U],
                [cx, 1.96 * U],
                [cx + 0.16 * U, 2.1 * U],
            ],
            "pencil",
            pen.fill(tone, "solid"),
            { strokeWidth: 1 },
        );
        pen.arc(
            g,
            cx - 0.42 * U,
            cy - 0.45 * U,
            0.5 * U,
            0.6 * U,
            Math.PI,
            Math.PI * 1.5,
            "pencil",
            {
                strokeWidth: 2,
                stroke: c.t.card,
                roughness: 0.2,
            },
        );
        const n = Math.max(0, Math.min(99, Math.round(p.n)));
        num(c, cx, cy + 0.32 * U, n, n > 9 ? 15 : 18);
        return { middle: [cx, cy, "up"], knot: [cx, 2.05 * U, "down"] };
    },
    describe: (p) =>
        `A round coloured balloon with the number ${Math.max(0, Math.min(99, Math.round(p.n)))} on it, a little knot at its bottom and a curly string hanging down.`,
    motion: { still: "A balloon in the sky drifts as the game floats it." },
});
