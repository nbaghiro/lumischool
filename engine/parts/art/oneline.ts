import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { ONE_LINE, ONE_LINE_FIGURES, SQUARE, type Pt } from "./kit";

/** Each figure as a screen reader hears it. */
const FIGURE_WORDS: Record<string, string> = {
    square: "a square",
    house: "a house",
    nikolaus: "a house with a cross in it",
    envelope: "an envelope",
    domino: "two squares side by side",
    window: "a window",
    cross: "a cross",
    bowtie: "a bow",
    star: "a star",
};

export const oneLine = defineDrawing({
    id: "oneline",
    family: "art",
    title: "Draw it in one line",
    group: "Structures",
    about: "Figures made of straight lines, lettered, to be drawn without lifting the pencil and without going over a line twice: a square, a house, the house with a cross in it, an envelope, two squares side by side, a window, a cross, a bow and a star. Some can be drawn so and some cannot, which a child finds by trying with a finger; the rule behind it is Euler's, about how many lines meet at each corner.",
    params: { figures: ["house", "envelope", "square"] },
    settings: {
        figures: { kind: "words", of: ONE_LINE_FIGURES, most: 5 },
    },
    takes: [
        {
            label: "A house, an envelope, a square",
            params: { figures: ["house", "envelope", "square"] },
        },
        { label: "A window, a bow, a star", params: { figures: ["window", "bowtie", "star"] } },
        {
            label: "The house with a cross, two squares, a cross",
            params: { figures: ["nikolaus", "domino", "cross"] },
        },
    ],
    box: (p) => ({ w: Math.max(1, p.figures.length) * 6 + 1, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            k = 0.95 * U;
        p.figures.forEach((name, i) => {
            const f = ONE_LINE[name] ?? SQUARE,
                x0 = (1 + i * 6) * U,
                y0 = 0.4 * U;
            const at = (q: Pt): Pt => [x0 + q[0] * k, y0 + q[1] * k];
            for (const [m, n] of f.lines) {
                const [x1, y1] = at(f.pts[m] ?? [0, 0]),
                    [x2, y2] = at(f.pts[n] ?? [0, 0]);
                pen.line(g, x1, y1, x2, y2, "pencil", { strokeWidth: 2.6, stroke: c.t.ink });
            }
            for (const q of f.pts) {
                const [x, y] = at(q);
                pen.circle(
                    g,
                    x,
                    y,
                    7,
                    "ruler",
                    { fill: c.t.ink, fillStyle: "solid" },
                    { strokeWidth: 0 },
                );
            }
            num(c, x0 + 2 * k, 7.4 * U, "ABCD"[i] ?? "", 16);
            a[`figure(${i})`] = [x0 + 2 * k, y0, "up"];
        });
        return a;
    },
    describe: (p) => {
        const names = p.figures.map((f) => FIGURE_WORDS[f] ?? "a square");
        const list =
            names.length > 1
                ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
                : (names[0] ?? "a square");
        return `Figures made of straight lines with a dot at each corner, lettered A to ${"ABCD"[Math.max(0, Math.min(3, names.length - 1))] ?? "A"}: ${list}.`;
    },
});
