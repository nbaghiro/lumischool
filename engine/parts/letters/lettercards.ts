import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { loop } from "../marks";
import { glyph } from "./glyphs";

export const letterCards = defineDrawing({
    id: "lettercards",
    family: "letters",
    title: "Letter cards",
    group: "Props",
    about: "One letter to a card, to be pushed into order. Cards are what make a word a thing that can be rearranged, which is the whole of blending and segmenting at this age.",
    params: { letters: ["c", "a", "t"], picked: [] as number[], capitals: false },
    settings: {
        letters: { kind: "words", most: 8 },
        picked: { kind: "numbers", min: 0, max: 7, most: 8 },
        capitals: { kind: "flag" },
    },
    takes: [
        { label: "c a t", params: { letters: ["c", "a", "t"], picked: [], capitals: false } },
        {
            label: "One picked",
            params: { letters: ["s", "h", "i", "p"], picked: [0, 1], capitals: false },
        },
        { label: "Capitals", params: { letters: ["A", "B", "C"], picked: [], capitals: true } },
    ],
    box: (p) => ({ w: p.letters.length * 4 + 1, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        p.letters.forEach((ch, i) => {
            const x = U / 2 + i * 4 * U;
            pen.path(g, roundedRect(x, U, 3 * U, 4 * U, 8), "ruler", pen.fill("card"), {
                strokeWidth: 2,
            });
            glyph(c, x + 1.5 * U, 3.7 * U, p.capitals ? ch.toUpperCase() : ch, 42);
            if (p.picked.includes(i)) loop(c, x + 1.5 * U, 3 * U, 3 * U + 10, 4 * U + 10);
            a[`card(${i})`] = [x + 1.5 * U, U, "up"];
        });
        return a;
    },
    describe: () =>
        "Letter cards in a row, one letter to a card, each a small square standing on the line, to be pushed into order and read across.",
});
