import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { ghost, patch, say } from "../lettering";

/** A letter cell on a ladder rung, in squares. */
const RUNG_CELL = 1.6;

export const wordLadder = defineDrawing({
    id: "wordladder",
    family: "letters",
    title: "Word ladder",
    group: "Structures",
    about: "A ladder with a word on every rung, climbing from the bottom, where each word changes one letter of the word below it and the letter that changed is lit. A rung can be left empty, so the child works out the word that fits between its neighbours.",
    params: { words: ["cat", "cut", "cup"], blank: -1, changes: 1 },
    settings: {
        words: { kind: "words", most: 8 },
        blank: { kind: "whole", min: -1, max: 7 },
        changes: { kind: "whole", min: 1, max: 3 },
    },
    takes: [
        { label: "cat to cup", params: { words: ["cat", "cut", "cup"], blank: -1, changes: 1 } },
        {
            label: "A rung to fill",
            params: { words: ["hen", "pen", "pin", "pig"], blank: 2, changes: 1 },
        },
        {
            label: "Four letters",
            params: { words: ["cold", "cord", "card", "hard", "harm"], blank: -1, changes: 1 },
        },
    ],
    box: (p) => ({
        w: Math.ceil(Math.max(3, ...p.words.map((w) => w.length)) * RUNG_CELL + 3.6),
        h: Math.max(1, p.words.length) * 3 + 2,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(1, p.words.length),
            a: RawAnchors = {};
        const most = Math.max(3, ...p.words.map((w) => w.length)),
            W = Math.ceil(most * RUNG_CELL + 3.6) * U,
            H = (n * 3 + 2) * U;
        const left = 0.9 * U,
            right = W - 0.9 * U;
        for (const x of [left, right])
            pen.line(g, x, 0.4 * U, x, H - 0.3 * U, "pencil", {
                strokeWidth: 3.2,
                stroke: c.t.ink,
            });
        p.words.forEach((word, i) => {
            const rung = H - 1.2 * U - i * 3 * U,
                below = p.words[i - 1] ?? "";
            pen.line(g, left, rung, right, rung, "pencil", { strokeWidth: 2.6 });
            const x0 = (W - word.length * RUNG_CELL * U) / 2,
                top = rung - 2.1 * U,
                cell = RUNG_CELL * U;
            Array.from(word).forEach((ch, k) => {
                const lit =
                    p.changes > 0 &&
                    i > 0 &&
                    i !== p.blank &&
                    below[k] !== undefined &&
                    below[k] !== ch;
                if (i === p.blank)
                    ghost(c, roundedRect(x0 + k * cell + 2, top, cell - 4, 1.8 * U, 5), "ruler");
                else {
                    pen.path(
                        g,
                        roundedRect(x0 + k * cell + 2, top, cell - 4, 1.8 * U, 5),
                        "ruler",
                        pen.fill(lit ? "glow" : "card"),
                        { strokeWidth: 1.6 },
                    );
                    if (lit) patch(c, x0 + (k + 0.5) * cell, top + 0.9 * U, cell - 12, 22);
                    say(c, x0 + (k + 0.5) * cell, top + 1.35 * U, ch, 24);
                }
            });
            a[`rung(${i})`] = [W / 2, top, "up"];
        });
        return a;
    },
    describe: () =>
        "A ladder standing up the page with a word on every rung, climbing from the bottom, the letter that changed on each rung lit in colour.",
});
