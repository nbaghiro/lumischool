import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { glyph, CELL, letters } from "./glyphs";

export const soundButtons = defineDrawing({
    id: "soundbuttons",
    family: "letters",
    title: "Sound buttons",
    group: "Structures",
    about: "A dot under a single letter and a bar under a digraph, so the word says how many sounds it has. Counting the buttons is the same act as counting counters in a ten frame.",
    params: { graphemes: ["sh", "i", "p"], count: true },
    settings: { graphemes: { kind: "words", most: 8 }, count: { kind: "flag" } },
    takes: [
        { label: "sh-i-p", params: { graphemes: ["sh", "i", "p"], count: true } },
        { label: "c-a-t", params: { graphemes: ["c", "a", "t"], count: true } },
        { label: "ch-ai-r", params: { graphemes: ["ch", "ai", "r"], count: true } },
        { label: "No count", params: { graphemes: ["th", "i", "n", "k"], count: false } },
    ],
    box: (p) => ({ w: Math.ceil(p.graphemes.join("").length * CELL) + 2, h: p.count ? 7 : 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            word = p.graphemes.join(""),
            x0 = U;
        const L = letters(word, x0),
            y = 3.4 * U,
            a: RawAnchors = {};
        Array.from(word).forEach((ch, i) => glyph(c, L.at(i), y, ch, 34));
        let i = 0;
        p.graphemes.forEach((gr, k) => {
            const from = L.at(i) - 0.5 * CELL * U,
                to = L.at(i + gr.length - 1) + 0.5 * CELL * U;
            const mid = (from + to) / 2,
                by = y + 0.9 * U;
            if (gr.length > 1)
                pen.line(g, from + 6, by, to - 6, by, "ruler", {
                    strokeWidth: 3.4,
                    stroke: c.t.pen,
                });
            else
                pen.circle(g, mid, by, 11, "ruler", pen.fill("sky"), {
                    strokeWidth: 1.6,
                    stroke: c.t.pen,
                });
            a[`sound(${k})`] = [mid, by + 10, "down"];
            i += gr.length;
        });
        if (p.count)
            num(
                c,
                x0 + L.width / 2,
                6.3 * U,
                `${p.graphemes.length} sound${p.graphemes.length === 1 ? "" : "s"}`,
                16,
            );
        a.word = [x0 + L.width / 2, y - 1.2 * U, "up"];
        return a;
    },
    describe: () =>
        "A word written large with a dot under each single letter and a bar under each pair that makes one sound, to count the sounds.",
});
