import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

const TONES = ["berry", "sky", "glow", "tang"] as const satisfies readonly Marker[];
const WORD: Record<(typeof TONES)[number], string> = {
    berry: "pink",
    sky: "blue",
    glow: "yellow",
    tang: "orange",
};

/** A butterfly seen from above, its wings open or half shut, for a garden it drifts over. */
export const butterfly = defineDrawing<{ tone: string; open: boolean }>({
    id: "butterfly",
    family: "animals",
    title: "Butterfly",
    group: "Characters",
    about: "A small butterfly seen from above, two rounded pairs of wings in one colour either side of a thin dark body, open flat or half shut as it flaps.",
    params: { tone: "berry", open: true },
    settings: { tone: { kind: "one of", of: TONES }, open: { kind: "flag" } },
    takes: [
        { label: "Pink, wings open", params: { tone: "berry", open: true } },
        { label: "Yellow, wings half shut", params: { tone: "glow", open: false } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p) => {
        const x = U,
            y = U,
            tone: Marker = TONES.find((t) => t === p.tone) ?? "berry",
            k = p.open ? 1 : 0.55;
        for (const side of [-1, 1]) {
            c.pen.ellipse(
                c.g,
                x + side * 0.42 * U * k,
                y - 0.3 * U,
                0.8 * U * k,
                0.9 * U,
                "pencil",
                c.pen.fill(tone, "solid"),
                { strokeWidth: 0.9 },
            );
            c.pen.ellipse(
                c.g,
                x + side * 0.34 * U * k,
                y + 0.4 * U,
                0.6 * U * k,
                0.62 * U,
                "pencil",
                c.pen.fill(tone, "solid"),
                { strokeWidth: 0.9 },
            );
        }
        c.pen.line(c.g, x, y - 0.6 * U, x, y + 0.7 * U, "pencil", { strokeWidth: 1.6 });
        c.pen.line(c.g, x, y - 0.6 * U, x - 0.25 * U, y - 0.9 * U, "pencil", { strokeWidth: 0.7 });
        c.pen.line(c.g, x, y - 0.6 * U, x + 0.25 * U, y - 0.9 * U, "pencil", { strokeWidth: 0.7 });
        return {};
    },
    describe: (p) =>
        `A small ${WORD[TONES.find((t) => t === p.tone) ?? "berry"]} butterfly seen from above, with two pairs of rounded wings ${p.open ? "spread open" : "half shut"} either side of a thin dark body.`,
});
