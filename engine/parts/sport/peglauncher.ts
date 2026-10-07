import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const TONES = ["tang", "sky", "berry"] as const;
const toneOf = (v: string): (typeof TONES)[number] => TONES.find((t) => t === v) ?? "tang";

/** Squares from the launcher's pivot, the middle of its box, to its muzzle, for a box two squares across. */
const MUZZLE = 1;

export const pegLauncher = defineDrawing<{ tone: string }>({
    id: "peglauncher",
    family: "sport",
    title: "Marble launcher",
    group: "Props",
    about: "The launcher at the top of a marble peg board: a round brass-bound hub that turns, and a short barrel pointing down out of it that the marble is fired from.",
    params: { tone: "tang" },
    settings: { tone: { kind: "one of", of: TONES } },
    takes: [
        { label: "A wooden launcher", params: { tone: "tang" } },
        { label: "A blue launcher", params: { tone: "sky" } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        // the barrel points down from the hub, its mouth at the foot of the box
        pen.rect(g, 0.62 * U, U, 0.76 * U, 0.92 * U, "pencil", pen.fill("ink-soft", "solid"), {
            strokeWidth: 1.2,
            roughness: 0.2,
        });
        pen.rect(g, 0.52 * U, 1.7 * U, 0.96 * U, 0.22 * U, "ruler", pen.fill("glow", "solid"), {
            strokeWidth: 0.9,
        });
        pen.circle(g, U, U, 1.3 * U, "pencil", pen.fill(toneOf(p.tone), "solid"), {
            strokeWidth: 1.4,
            roughness: 0.2,
        });
        pen.circle(g, U, U, 0.5 * U, "pencil", pen.fill("glow", "solid"), {
            strokeWidth: 0.9,
            roughness: 0.2,
        });
        return { pivot: [U, U, "up"], muzzle: [U, (1 + MUZZLE) * U, "down"] };
    },
    describe: () =>
        "The launcher at the top of a marble peg board, a round hub that turns with a short dark barrel pointing down out of it.",
    motion: { still: "It turns only when the player aims it." },
});
