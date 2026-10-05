import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const TONES = ["sky", "berry", "mint"] as const;
const toneOf = (v: string): (typeof TONES)[number] => TONES.find((t) => t === v) ?? "sky";

export const marble = defineDrawing<{ tone: string }>({
    id: "marble",
    family: "sport",
    title: "Glass marble",
    group: "Props",
    about: "A shiny glass marble as big as its box, with a twist of colour through it and a white glint, as a pinball or a marble in a run.",
    params: { tone: "sky" },
    settings: { tone: { kind: "one of", of: TONES } },
    takes: [
        { label: "A blue marble", params: { tone: "sky" } },
        { label: "A pink marble", params: { tone: "berry" } },
    ],
    box: () => ({ w: 1, h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            m = 0.5 * U;
        pen.circle(g, m, m, 0.88 * U, "pencil", pen.fill("card", "solid"), {
            strokeWidth: 1.2,
            roughness: 0.2,
        });
        pen.path(
            g,
            `M${0.22 * U} ${0.6 * U}Q${0.5 * U} ${0.25 * U} ${0.78 * U} ${0.45 * U}`,
            "pencil",
            null,
            { strokeWidth: 2.2, stroke: c.t[toneOf(p.tone)], roughness: 0.2 },
        );
        pen.circle(g, 0.36 * U, 0.33 * U, 0.16 * U, "ruler", pen.fill("paper"), {
            strokeWidth: 0.3,
            disableMultiStroke: true,
        });
        return { middle: [m, m, "up"] };
    },
    describe: () =>
        "A shiny glass marble as big as its box, with a twist of colour running through it and a small white glint near the top.",
    motion: { still: "A marble moves only when the game rolls it." },
});
