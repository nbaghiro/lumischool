import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const TONES = ["berry", "sky", "tang", "mint", "glow"] as const;

/** A card hung up for a kite game's target and tally: blank, since the game writes on it. */
export const kiteBoard = defineDrawing<{ tone: string }>({
    id: "kiteboard",
    family: "sport",
    title: "Kite field board",
    group: "Structures",
    about: "A wide white card hung from two little rings, with a coloured band along its top, blank for a game to write its target and its sum on.",
    params: { tone: "berry" },
    settings: { tone: { kind: "one of", of: TONES } },
    takes: [
        { label: "A pink board", params: { tone: "berry" } },
        { label: "A blue board", params: { tone: "sky" } },
    ],
    box: () => ({ w: 15, h: 4 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            tone = TONES.find((t) => t === p.tone) ?? "berry";
        pen.rect(g, 0.2 * U, 0.4 * U, 14.6 * U, 3.4 * U, "pencil", pen.fill("card", "solid"), {
            strokeWidth: 1.4,
            roughness: 0.2,
        });
        pen.rect(g, 0.2 * U, 0.4 * U, 14.6 * U, 0.35 * U, "ruler", pen.fill(tone, "solid"), {
            strokeWidth: 0.8,
        });
        for (const x of [1.4, 13.6])
            pen.circle(g, x * U, 0.4 * U, 0.4 * U, "ruler", null, { strokeWidth: 1.1 });
        return { middle: [7.5 * U, 2.1 * U, "up"] };
    },
    describe: () =>
        "A wide white card hung from two little rings, with a coloured band along its top and room on it for a target and a sum.",
    motion: { still: "A board holds still so what is written on it can be read." },
});
