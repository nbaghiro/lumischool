import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { slot, textW } from "./pairs";

/** The left column carries the boxes, the right column the numbers the child writes in them. */
const matchWidths = (left: string[], right: string[]): { lw: number; rw: number; w: number } => {
    const lw = Math.max(7, textW(left) + 3),
        rw = Math.max(6, textW(right) + 3);
    return { lw, rw, w: lw + rw + 2 };
};

export const matchPairs = defineDrawing({
    id: "match",
    family: "letters",
    title: "Match the pairs",
    group: "Structures",
    about: "Two lists to pair up: the child writes the number of the right-hand partner in each box.",
    params: {
        left: ["gato", "perro", "pan"],
        right: ["bread", "cat", "dog"],
        numbers: [] as string[],
    },
    settings: {
        left: { kind: "words", most: 6 },
        right: { kind: "words", most: 6 },
        numbers: { kind: "words", most: 6 },
    },
    takes: [
        {
            label: "Three pairs",
            params: { left: ["gato", "perro", "pan"], right: ["bread", "cat", "dog"], numbers: [] },
        },
        {
            label: "Answered",
            params: { left: ["gato", "perro"], right: ["cat", "dog"], numbers: ["1", "2"] },
        },
    ],
    box: (p) => ({
        w: matchWidths(p.left, p.right).w,
        h: Math.max(p.left.length, p.right.length) * 3,
    }),
    draw: (c, p) => {
        const { lw } = matchWidths(p.left, p.right),
            a: RawAnchors = {};
        p.left.forEach((s, i) => {
            const y = i * 3 * U;
            say(c, 0, y + U + 6, s, 16, "start");
            slot(c, (lw - 2) * U, y + 2, 2 * U - 4, 2 * U - 4, p.numbers[i] ?? "");
            a[`left(${i})`] = [U, y, "up"];
        });
        p.right.forEach((s, i) => {
            const y = i * 3 * U,
                x = (lw + 2) * U;
            c.pen.circle(c.g, x, y + U, 26, "ruler", null, { strokeWidth: 1.4 });
            say(c, x, y + U + 5, String(i + 1), 14);
            say(c, x + 20, y + U + 6, s, 16, "start");
            a[`right(${i})`] = [x, y, "up"];
        });
        return a;
    },
    describe: () =>
        "Two lists of words side by side to pair up, a small box beside each on the left for the number of its partner on the right.",
});
