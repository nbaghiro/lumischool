import { plain } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

export const glowBead = defineDrawing<{ tone: Marker }>({
    id: "glowbead",
    family: "counting",
    title: "Glowing bead",
    group: "Props",
    about: "One small round bead that glows, with a shine on it and a soft light round it on screen. A firefly trails a string of them, one bead for each one counted, so a length of string is a number.",
    params: { tone: "glow" },
    settings: { tone: { kind: "one of", of: MARKERS } },
    takes: [
        { label: "Yellow", params: { tone: "glow" } },
        { label: "Orange", params: { tone: "tang" } },
        { label: "Blue", params: { tone: "sky" } },
    ],
    box: () => ({ w: 1, h: 1 }),
    draw: (c, p) => {
        const { pen, g } = c,
            mid = U / 2,
            tone = MARKERS.find((t) => t === p.tone) ?? "glow";
        if (!c.paper)
            plain(c, {
                kind: "circle",
                cx: mid,
                cy: mid,
                r: 0.46 * U,
                fill: c.t[tone],
                opacity: 0.3,
            });
        pen.circle(g, mid, mid, 0.62 * U, "ruler", pen.fill(tone, "solid"), {
            strokeWidth: 1.4,
            disableMultiStroke: true,
            preserveVertices: true,
        });
        if (!c.paper)
            plain(c, {
                kind: "circle",
                cx: mid - 0.1 * U,
                cy: mid - 0.1 * U,
                r: 0.07 * U,
                fill: c.t.card,
            });
        return { centre: [mid, mid, "up"] };
    },
    describe: (p) =>
        `A small round ${MARKER_WORD[p.tone]} bead with a white shine on it, one of the glowing beads a firefly strings behind it as it counts.`,
    motion: {
        still: "A game strings it behind a firefly and moves it there; on the shelf it holds still.",
    },
});
