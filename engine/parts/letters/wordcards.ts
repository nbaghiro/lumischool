import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { loop } from "../marks";

/** A word card is as wide as its word, in whole squares, never narrower than four. */
const wordW = (s: string): number => Math.max(4, Math.ceil(s.length * 1.15) + 1);

export const wordCards = defineDrawing({
    id: "wordcards",
    family: "letters",
    title: "Word cards",
    group: "Props",
    about: "Whole words on cards, for building a sentence or sorting into groups. A card is wider for a longer word, so a row of them already shows which word is the long one.",
    params: { words: ["The", "cat", "sat"], picked: -1 },
    settings: { words: { kind: "words", most: 6 }, picked: { kind: "whole", min: -1, max: 5 } },
    takes: [
        { label: "The cat sat", params: { words: ["The", "cat", "sat"], picked: -1 } },
        { label: "One looped", params: { words: ["big", "bigger", "biggest"], picked: 2 } },
        { label: "Two words", params: { words: ["yes", "no"], picked: -1 } },
    ],
    box: (p) => ({ w: p.words.reduce((s, q) => s + wordW(q) + 1, 0) + 1, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        let x = U / 2;
        p.words.forEach((word, i) => {
            const w = wordW(word) * U;
            pen.path(
                g,
                roundedRect(x, U, w, 2.6 * U, 7),
                "ruler",
                pen.fill(i === p.picked ? "glow" : "card"),
                { strokeWidth: 2 },
            );
            say(c, x + w / 2, 2.9 * U, word, 24);
            if (i === p.picked) loop(c, x + w / 2, 2.3 * U, w + 10, 2.6 * U + 10);
            a[`word(${i})`] = [x + w / 2, U, "up"];
            x += (wordW(word) + 1) * U;
        });
        return a;
    },
    describe: () =>
        "Whole words on cards in a row, a wider card for a longer word, for building a sentence or sorting into groups.",
});
