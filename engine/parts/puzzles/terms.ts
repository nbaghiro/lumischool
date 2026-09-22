import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

/** The height in squares the tallest term needs: an L's long arm, or the rows of five a plain term is laid in. */
const termsTall = (p: { terms: number; start: number; step: number; shape: string }): number => {
    const n = p.start + (p.terms - 1) * p.step;
    return Math.max(
        8,
        p.shape === "ell" ? Math.ceil(n / 2) + 5 : Math.ceil(Math.ceil(n / 5) * 0.8 + 3.2),
    );
};

export const termSequence = defineDrawing({
    id: "terms",
    family: "puzzles",
    title: "A growing pattern",
    group: "Structures",
    about: "The first few terms of a pattern drawn as squares, with the term number under each. Counting the squares gives the sequence, and seeing what is added each time gives the rule.",
    params: { terms: 4, start: 2, step: 3, shape: "ell" },
    settings: {
        terms: { kind: "whole", min: 1, max: 6 },
        start: { kind: "whole", min: 1, max: 20 },
        step: { kind: "whole", min: 0, max: 10 },
        shape: { kind: "one of", of: ["ell", "square", "dot"] },
    },
    takes: [
        {
            label: "Two, five, eight, eleven",
            params: { terms: 4, start: 2, step: 3, shape: "ell" },
        },
        { label: "Going up in twos", params: { terms: 4, start: 1, step: 2, shape: "ell" } },
        { label: "Dots in rows of five", params: { terms: 5, start: 2, step: 9, shape: "dot" } },
    ],
    box: (p) => ({ w: p.terms * 5 + 1, h: termsTall(p) }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = 0.8 * U,
            a: RawAnchors = {};
        const base = (termsTall(p) - 2.6) * U;
        for (let t = 0; t < p.terms; t++) {
            const n = p.start + t * p.step,
                x0 = (0.8 + t * 5) * U;
            // An L keeps growing along two arms, so the added squares are visible as a step rather than
            // as a taller block. Any other shape is laid in rows of five, four squares wide, so a term of
            // forty-five stays inside its slot; dots are drawn as dots, the rest as squares.
            for (let i = 0; i < n; i++) {
                const ell = p.shape === "ell",
                    up = ell && i >= Math.ceil(n / 2);
                const gx = ell ? (up ? 0 : Math.min(i, Math.ceil(n / 2) - 1)) : i % 5;
                const gy = ell ? (up ? i - Math.ceil(n / 2) + 1 : 0) : Math.floor(i / 5);
                const fill = pen.fill(t % 2 ? "sky" : "mint", "solid", { hachureGap: 5 });
                if (p.shape === "dot")
                    pen.circle(
                        g,
                        x0 + gx * s + s / 2,
                        base - gy * s + s / 2,
                        s * 0.8,
                        "ruler",
                        fill,
                        { strokeWidth: 1.3 },
                    );
                else
                    pen.rect(g, x0 + gx * s, base - gy * s, s, s, "ruler", fill, {
                        strokeWidth: 1.3,
                    });
            }
            num(c, x0 + 1.6 * U, base + 1.6 * U, `term ${t + 1}`, 14);
            num(c, x0 + 1.6 * U, base + 2.6 * U, n, 18);
            a[`term(${t + 1})`] = [x0 + 1.6 * U, base + s, "down"];
        }
        return a;
    },
    describe: () =>
        "The first terms of a growing pattern drawn as squares or dots, side by side, with the term number and the count written under each.",
});
