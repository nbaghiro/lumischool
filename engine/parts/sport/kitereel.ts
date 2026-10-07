import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const TONES = ["tang", "sky", "mint", "berry"] as const;

/** A kite's reel seen side on, wound with line, which turns as the line comes in and goes out. */
export const kiteReel = defineDrawing<{ tone: string }>({
    id: "kitereel",
    family: "sport",
    title: "Kite reel",
    group: "Props",
    about: "A round kite reel seen side on: a wooden wheel with four spokes, its rim wound with line and a knob to wind it by.",
    params: { tone: "tang" },
    settings: { tone: { kind: "one of", of: TONES } },
    takes: [
        { label: "A wooden reel", params: { tone: "tang" } },
        { label: "A blue reel", params: { tone: "sky" } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            tone = TONES.find((t) => t === p.tone) ?? "tang",
            m = U;
        pen.circle(g, m, m, 1.8 * U, "pencil", pen.fill(tone, "solid"), {
            strokeWidth: 1.4,
            roughness: 0.25,
        });
        pen.circle(g, m, m, 1.3 * U, "pencil", pen.fill("card", "hachure", { hachureGap: 3 }), {
            strokeWidth: 1,
            roughness: 0.2,
        });
        for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 2;
            pen.line(g, m, m, m + Math.cos(a) * 0.62 * U, m + Math.sin(a) * 0.62 * U, "ruler", {
                strokeWidth: 1.4,
            });
        }
        pen.circle(g, m, m, 0.4 * U, "ruler", pen.fill(tone, "solid"), { strokeWidth: 1 });
        pen.circle(g, m + 0.6 * U, m - 0.6 * U, 0.3 * U, "ruler", pen.fill("ink-soft", "solid"), {
            strokeWidth: 0.6,
        });
        return { middle: [m, m, "up"] };
    },
    describe: (p) =>
        `A round ${p.tone === "tang" ? "wooden" : "coloured"} kite reel seen side on, four spokes in its wheel, its rim wound with line and a small knob to turn it.`,
    motion: { still: "The reel turns only as the line goes in or out." },
});
