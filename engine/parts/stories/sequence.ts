import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { slot, textW } from "../letters/pairs";

/** Every row is as wide as the longest thing in it, plus the box at its left. */
const orderWidth = (items: string[]): number => Math.max(10, textW(items) + 4);

export const orderRows = defineDrawing({
    id: "sequence",
    family: "stories",
    title: "Put in order",
    group: "Structures",
    about: "Rows to number in order: each one has a box for its place and then what it says.",
    params: {
        items: ["A flower opens", "The seed is planted", "A shoot comes up"],
        numbers: [] as string[],
    },
    settings: { items: { kind: "words", most: 6 }, numbers: { kind: "words", most: 6 } },
    takes: [
        {
            label: "Three to order",
            params: {
                items: ["A flower opens", "The seed is planted", "A shoot comes up"],
                numbers: [],
            },
        },
        {
            label: "Answered",
            params: {
                items: ["A flower opens", "The seed is planted", "A shoot comes up"],
                numbers: ["3", "1", "2"],
            },
        },
    ],
    box: (p) => ({ w: orderWidth(p.items), h: p.items.length * 3 }),
    draw: (c, p) => {
        const a: RawAnchors = {};
        p.items.forEach((s, i) => {
            const y = i * 3 * U;
            slot(c, 2, y + 2, 2 * U - 4, 2 * U - 4, p.numbers[i] ?? "");
            say(c, 2 * U + 10, y + U + 6, s, 16, "start");
            a[`card(${i})`] = [U, y, "up"];
        });
        return a;
    },
    describe: () =>
        "Short rows to put in order, each with a small box at the left for its number and what it says written beside the box.",
});
