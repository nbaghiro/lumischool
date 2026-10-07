import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const TONES = ["berry", "sky", "tang", "mint", "glow", "card"] as const;

/** One bow of a kite's tail, tied on its string at the middle of its box. */
export const kiteBow = defineDrawing<{ tone: string }>({
    id: "kitebow",
    family: "sport",
    title: "Kite tail bow",
    group: "Props",
    about: "One bow of a kite's tail: a little strip of cloth pinched in the middle by its knot, so a string of them streams behind a kite.",
    params: { tone: "berry" },
    settings: { tone: { kind: "one of", of: TONES } },
    takes: [
        { label: "A pink bow", params: { tone: "berry" } },
        { label: "A white bow", params: { tone: "card" } },
    ],
    box: () => ({ w: 1, h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            tone = TONES.find((t) => t === p.tone) ?? "berry",
            m = 0.5 * U,
            o = { strokeWidth: 1, roughness: 0.2 };
        pen.polygon(
            g,
            [
                [m, m],
                [0.08 * U, 0.2 * U],
                [0.08 * U, 0.8 * U],
            ],
            "pencil",
            pen.fill(tone, "solid"),
            o,
        );
        pen.polygon(
            g,
            [
                [m, m],
                [0.92 * U, 0.2 * U],
                [0.92 * U, 0.8 * U],
            ],
            "pencil",
            pen.fill(tone, "solid"),
            o,
        );
        pen.circle(g, m, m, 0.2 * U, "ruler", pen.fill("ink-soft", "solid"), {
            strokeWidth: 0.4,
            disableMultiStroke: true,
        });
        return { knot: [m, m, "up"] };
    },
    describe: (p) =>
        `A small ${p.tone === "card" ? "white" : "coloured"} bow from a kite's tail, a strip of cloth pinched in the middle by a dark knot on its string.`,
    motion: { still: "A tail bow streams as the kite flies it." },
});
