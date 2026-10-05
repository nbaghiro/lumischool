import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const TONES = ["tang", "mint"] as const;
const toneOf = (v: string): (typeof TONES)[number] => TONES.find((t) => t === v) ?? "tang";

export const pinballBoard = defineDrawing<{ tone: string }>({
    id: "pinballboard",
    family: "sport",
    title: "Pinball scoreboard",
    group: "Props",
    about: "The wooden backbox over a pinball table where the score is written: a long painted frame with a flower at each top corner round a pale panel left empty for the numbers.",
    params: { tone: "tang" },
    settings: { tone: { kind: "one of", of: TONES } },
    takes: [
        { label: "A wooden board", params: { tone: "tang" } },
        { label: "A green board", params: { tone: "mint" } },
    ],
    box: () => ({ w: 20, h: 5 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        pen.rect(g, 0.25 * U, 0.6 * U, 19.5 * U, 4.1 * U, "pencil", pen.fill(toneOf(p.tone)), {
            strokeWidth: 1.6,
            roughness: 0.3,
        });
        pen.rect(g, 0.8 * U, 1.1 * U, 18.4 * U, 3.1 * U, "pencil", pen.fill("card", "solid"), {
            strokeWidth: 1.1,
            roughness: 0.2,
        });
        for (const x of [0.75, 19.25])
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2;
                pen.circle(
                    g,
                    x * U + Math.cos(a) * 0.28 * U,
                    0.6 * U + Math.sin(a) * 0.28 * U,
                    0.3 * U,
                    "pencil",
                    pen.fill("berry", "solid"),
                    {
                        strokeWidth: 0.6,
                        roughness: 0.2,
                    },
                );
            }
        return { panel: [10 * U, 2.65 * U, "up"] };
    },
    describe: () =>
        "A long wooden backbox over a pinball table, a painted frame with a flower at each top corner round a pale panel left empty for numbers.",
    motion: { still: "A scoreboard stands still; the numbers on it are written by the game." },
});
