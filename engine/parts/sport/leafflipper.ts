import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const TONES = ["mint", "tang"] as const;
const toneOf = (v: string): (typeof TONES)[number] => TONES.find((t) => t === v) ?? "mint";

/** Where the flipper turns, in squares from its box's top left, and how far its tip is from there. */
export const LEAF = { pivot: 0.5, len: 3.25 } as const;

export const leafFlipper = defineDrawing<{ tone: string }>({
    id: "leafflipper",
    family: "sport",
    title: "Leaf flipper",
    group: "Props",
    about: "A pinball flipper drawn as a long leaf seen from above, wide and round at its bolt and tapering to a round tip, with a vein down its middle. It turns about the bolt.",
    params: { tone: "mint" },
    settings: { tone: { kind: "one of", of: TONES } },
    takes: [
        { label: "A green leaf", params: { tone: "mint" } },
        { label: "An orange leaf", params: { tone: "tang" } },
    ],
    box: () => ({ w: 4, h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            x0 = LEAF.pivot * U,
            x1 = (LEAF.pivot + LEAF.len) * U,
            y = 0.5 * U,
            r0 = 0.42 * U,
            r1 = 0.2 * U;
        pen.path(
            g,
            `M${x0} ${y - r0}L${x1} ${y - r1}A${r1} ${r1} 0 0 1 ${x1} ${y + r1}L${x0} ${y + r0}A${r0} ${r0} 0 0 1 ${x0} ${y - r0}Z`,
            "pencil",
            pen.fill(toneOf(p.tone), "solid"),
            { strokeWidth: 1.5, roughness: 0.3 },
        );
        pen.linear(
            g,
            [
                [x0 + 0.3 * U, y],
                [x1 - 0.15 * U, y],
            ],
            "pencil",
            { strokeWidth: 0.8, stroke: c.t.ink, roughness: 0.3 },
        );
        pen.circle(g, x0, y, 0.34 * U, "ruler", pen.fill("card"), {
            strokeWidth: 0.9,
            disableMultiStroke: true,
        });
        return { pivot: [x0, y, "up"], tip: [x1, y, "up"] };
    },
    describe: () =>
        "A pinball flipper drawn as a long leaf seen from above, round at its bolt and tapering to a round tip, with one vein down its middle.",
    motion: { still: "A flipper turns only when the game swings it about its bolt." },
});
