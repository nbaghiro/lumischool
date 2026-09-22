import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { glyph } from "./glyphs";

export const soundBoxes = defineDrawing({
    id: "soundboxes",
    family: "letters",
    title: "Sound boxes",
    group: "Inputs",
    about: "One box per sound, empty to write into or filled in. Three squares to a box, so the boxes line up with the ruled page and a counter can be pushed into each one as the word is said.",
    params: { boxes: 3, filled: [] as string[], counters: false },
    settings: {
        boxes: { kind: "whole", min: 1, max: 8 },
        filled: { kind: "words", most: 8 },
        counters: { kind: "flag" },
    },
    takes: [
        { label: "Three empty boxes", params: { boxes: 3, filled: [], counters: false } },
        { label: "Filled in", params: { boxes: 3, filled: ["sh", "i", "p"], counters: false } },
        { label: "With counters", params: { boxes: 4, filled: [], counters: true } },
    ],
    box: (p) => ({ w: p.boxes * 3 + 1, h: p.counters ? 7 : 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        for (let i = 0; i < p.boxes; i++) {
            const x = U / 2 + i * 3 * U;
            pen.rect(g, x, U, 3 * U, 3 * U, "ruler", null, { strokeWidth: 2 });
            if (p.filled[i]) glyph(c, x + 1.5 * U, 3.2 * U, p.filled[i] ?? "", 30);
            if (p.counters)
                pen.circle(g, x + 1.5 * U, 5.4 * U, 1.6 * U, "pencil", pen.fill("sky"), {
                    strokeWidth: 1.6,
                });
            a[`box(${i})`] = [x + 1.5 * U, U, "up"];
        }
        pen.rect(g, U / 2, U, p.boxes * 3 * U, 3 * U, "ruler", null, { strokeWidth: 2.8 });
        return a;
    },
    describe: (p) =>
        `A row of ${p.boxes} boxes joined side by side, one for each sound in a word, ${p.filled.length ? "the sounds written in them" : "empty to write into"}${p.counters ? ", a counter in each" : ""}.`,
});
