import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, slot } from "../lettering";

/** One written term: a number, an operator, or a box for the unknown. */
const termW = (s: string): number => (s === "?" ? 2.4 : Math.max(1.6, s.length * 1.3));

export const unknownBox = defineDrawing({
    id: "unknown",
    family: "sums",
    title: "An equation with a box",
    group: "Inputs",
    about: "A written equation with an empty box in it, which is the first algebra there is. The box can stand anywhere, so the same drawing asks for a missing part, a missing whole or a missing operator.",
    params: { terms: ["7", "+", "?", "=", "12"], answer: "" },
    settings: { terms: { kind: "words", most: 7 }, answer: { kind: "text", most: 4 } },
    takes: [
        { label: "A missing part", params: { terms: ["7", "+", "?", "=", "12"], answer: "" } },
        { label: "Answered", params: { terms: ["7", "+", "?", "=", "12"], answer: "5" } },
        { label: "A missing operator", params: { terms: ["24", "?", "6", "=", "4"], answer: "" } },
        { label: "The box first", params: { terms: ["?", "-", "9", "=", "16"], answer: "" } },
    ],
    box: (p) => ({ w: Math.ceil(p.terms.reduce((s, t) => s + termW(t) + 0.4, 0)) + 1, h: 5 }),
    draw: (c, p) => {
        const y = 1.4 * U,
            h = 2.4 * U,
            a: RawAnchors = {};
        let x = U / 2;
        p.terms.forEach((t, i) => {
            const w = termW(t) * U;
            if (t === "?") {
                slot(c, x, y, w, h, p.answer || undefined);
                a.box = [x + w / 2, y, "up"];
            } else {
                num(c, x + w / 2, y + h / 2 + 9, t, 28);
            }
            a[`term(${i})`] = [x + w / 2, y + h, "down"];
            x += w + 0.4 * U;
        });
        return a;
    },
    describe: () =>
        "A number sentence written large across the page with one term left as an empty box to write in.",
});
