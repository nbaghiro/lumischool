import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { penned } from "../lettering";

export const wordBoxes = defineDrawing({
    id: "word-input",
    family: "writing",
    title: "Word boxes",
    group: "Inputs",
    about: "One box per letter for a word the child writes, with the answer in the teacher's pen on the key.",
    params: { letters: 3, written: "" },
    settings: { letters: { kind: "whole", min: 1, max: 12 }, written: { kind: "text", most: 12 } },
    takes: [
        { label: "Three letters", params: { letters: 3, written: "" } },
        { label: "Answered", params: { letters: 4, written: "ship" } },
        { label: "A long word", params: { letters: 7, written: "" } },
    ],
    box: (p) => ({ w: p.letters * 2, h: 2 }),
    draw: (c, p) => {
        const a: RawAnchors = {};
        for (let i = 0; i < p.letters; i++) {
            const x = i * 2 * U;
            c.pen.rect(c.g, x + 2, 2, 2 * U - 4, 2 * U - 4, "ruler", null, { strokeWidth: 1.8 });
            if (p.written[i]) penned(c, x + U, U + 9, p.written[i] ?? "", 25);
            a[`letter(${i})`] = [x + U, 0, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A row of ${p.letters} boxes joined side by side, one for each letter of a word to write, the answer in pen on the key.`,
});
