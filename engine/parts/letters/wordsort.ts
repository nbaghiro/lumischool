import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { patch, say } from "../lettering";

/** A word on a card, as wide as the word, the same shape the word cards use. */
function card<G>(c: Ctx<G>, x: number, y: number, w: number, s: string, ringed: boolean): void {
    const { pen, g } = c;
    pen.path(g, roundedRect(x, y, w, 1.8 * U, 6), "ruler", pen.fill(ringed ? "glow" : "card"), {
        strokeWidth: 1.8,
    });
    patch(c, x + w / 2, y + 0.9 * U, w - 6, 20);
    say(c, x + w / 2, y + 1.2 * U, s, 18);
}

const colW = (words: string[], heads: string[]): number =>
    Math.max(6, Math.ceil(Math.max(0, ...[...words, ...heads].map((s) => s.length)) * 0.62) + 2);

/** Rows in the fullest column, which is what sets the height of every column. */
const sortRows = (heads: string[], into: number[]): number =>
    Math.max(1, ...heads.map((_, k) => into.filter((x) => x === k).length));

export const wordSort = defineDrawing({
    id: "wordsort",
    family: "letters",
    title: "Sorting words into columns",
    group: "Structures",
    about: "Headed columns with words already dropped into them, one of which can be in the wrong place. Sorting is how spelling patterns and word classes are actually taught, and putting the sort on the page turns it into a question with one right answer.",
    params: {
        heads: ["ai", "ay"],
        words: ["rain", "day", "tail", "play"],
        into: [0, 1, 0, 0],
        ring: -1,
    },
    settings: {
        heads: { kind: "words", most: 4 },
        words: { kind: "words", most: 12 },
        into: { kind: "numbers", min: 0, max: 3, most: 12 },
        ring: { kind: "whole", min: -1, max: 11 },
    },
    takes: [
        {
            label: "ai and ay",
            params: {
                heads: ["ai", "ay"],
                words: ["rain", "day", "tail", "play"],
                into: [0, 1, 0, 1],
                ring: -1,
            },
        },
        {
            label: "One ringed",
            params: {
                heads: ["1 beat", "2 beats"],
                words: ["cat", "rabbit", "dog"],
                into: [0, 1, 1],
                ring: 2,
            },
        },
    ],
    box: (p) => ({
        w: p.heads.length * (colW(p.words, p.heads) + 1) + 1,
        h: sortRows(p.heads, p.into) * 3 + 4,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const w = colW(p.words, p.heads),
            used = Array.from({ length: p.heads.length }, () => 0);
        const h = sortRows(p.heads, p.into) * 3 + 4;
        p.heads.forEach((head, k) => {
            const x = (0.5 + k * (w + 1)) * U;
            pen.rect(g, x, 0.6 * U, w * U, (h - 1.6) * U, "ruler", null, {
                strokeWidth: 1.6,
                stroke: c.t["ink-soft"],
            });
            pen.rect(
                g,
                x,
                0.6 * U,
                w * U,
                1.8 * U,
                "ruler",
                pen.fill("mint", "solid", { hachureGap: 6 }),
                { strokeWidth: 1.8 },
            );
            patch(c, x + (w * U) / 2, 1.5 * U, w * U - 8, 22);
            say(c, x + (w * U) / 2, 1.9 * U, head, 19);
            a[`head(${k})`] = [x + (w * U) / 2, 0.6 * U, "up"];
        });
        p.words.forEach((word, i) => {
            const k = Math.max(0, Math.min(p.heads.length - 1, p.into[i] ?? 0));
            const x = (0.5 + k * (w + 1)) * U + 0.4 * U;
            const y = (3 + (used[k] ?? 0) * 3) * U;
            card(c, x, y, w * U - 0.8 * U, word, i === p.ring);
            a[`word(${i})`] = [x + (w * U - 0.8 * U) / 2, y, "up"];
            used[k] = (used[k] ?? 0) + 1;
        });
        return a;
    },
    describe: () =>
        "Headed columns side by side with words dropped into them under the heads, each word in its own place in the column.",
});
