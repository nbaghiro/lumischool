import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

/** A strip is as wide as its words at its own size, estimated per character, plus the gap. */
const stripW = (p: { before: string; after: string; blank: number; size: number }): number => {
    const k = p.size / 19;
    return (
        Math.ceil(p.before.length * 0.62 * k) + p.blank + Math.ceil(p.after.length * 0.62 * k) + 3
    );
};

export const sentenceStrip = defineDrawing({
    id: "sentence",
    family: "letters",
    title: "Sentence with a gap",
    group: "Inputs",
    about: "A sentence on a strip with one word missing and a ruled line where it goes. The gap is the same blank a number goes into, so a reading item and a maths item are built the same way.",
    params: { before: "The cat sat on the", blank: 5, after: ".", answer: "", size: 19 },
    settings: {
        before: { kind: "text", most: 40 },
        blank: { kind: "whole", min: 1, max: 12 },
        after: { kind: "text", most: 20 },
        answer: { kind: "text", most: 12 },
        size: { kind: "whole", min: 12, max: 28 },
    },
    takes: [
        {
            label: "A gap at the end",
            params: { before: "The cat sat on the", blank: 5, after: ".", answer: "", size: 19 },
        },
        {
            label: "With the answer",
            params: { before: "The cat sat on the", blank: 5, after: ".", answer: "mat", size: 19 },
        },
        {
            label: "A short one",
            params: { before: "I can", blank: 4, after: "it.", answer: "", size: 19 },
        },
        {
            label: "Large, for grade one",
            params: { before: "The fox is in the box", blank: 0, after: ".", answer: "", size: 24 },
        },
    ],
    box: (p) => ({ w: stripW(p), h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 2.8 * U + (p.size - 19) * 0.3,
            k = p.size / 19;
        const w = stripW(p);
        pen.path(g, roundedRect(U / 2, U, (w - 1) * U, 2.4 * U, 6), "ruler", pen.fill("card"), {
            strokeWidth: 2,
        });
        const startX = U;
        // With no blank the strip is a whole sentence, so it is written as one: the widths below are
        // estimated per character and run long, which put a model sentence's full stop a word's width
        // away from its last word. Punctuation joins with no space; a word joins with one.
        if (p.blank <= 0) {
            const joined =
                /^[.,!?;:]/.test(p.after) || !p.after
                    ? `${p.before}${p.after}`
                    : `${p.before} ${p.after}`;
            say(c, startX, y, joined, p.size, "start");
            return { gap: [startX, y + 8, "down"], strip: [(w * U) / 2, U, "up"] };
        }
        say(c, startX, y, p.before, p.size, "start");
        const gapX = startX + Math.ceil(p.before.length * 0.62 * k) * U + 8;
        pen.line(g, gapX, y + 8, gapX + p.blank * U, y + 8, "ruler", { strokeWidth: 2.4 });
        if (p.answer) say(c, gapX + (p.blank * U) / 2, y, p.answer, p.size, "middle", c.t.pen);
        say(c, gapX + p.blank * U + 6, y, p.after, p.size, "start");
        return {
            gap: [gapX + (p.blank * U) / 2, y + 8, "down"],
            strip: [(w * U) / 2, U, "up"],
        };
    },
    describe: () =>
        "A sentence on a strip with one word missing and a ruled line in the gap where it goes, the rest written either side.",
});
