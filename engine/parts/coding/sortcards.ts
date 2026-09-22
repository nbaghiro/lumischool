import { letter, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

export const cardAt = (
    cards: readonly number[],
    i: number,
): { x: number; y: number; w: number; h: number } => {
    const h = Math.ceil(Math.max(...cards.map((v) => Math.min(9, Math.max(1, v))), 1) * 0.8 + 7);
    return { x: (0.5 + i * 3) * U, y: 1.2 * U, w: 2.6 * U, h: (h - 2.7) * U };
};

export const sortCards = defineDrawing({
    id: "sortcards",
    family: "coding",
    title: "Cards to sort",
    group: "Structures",
    about: "A row of cards, each a number with a tower as tall as it, for sorting the way a program does: look at two cards side by side and swap them if they are the wrong way round. `compare` rings the pair being looked at, `swap` draws the arrows that change them over, and `done` shades the cards at the end that are already in place.",
    params: { cards: [5, 2, 7, 1, 4], compare: 1, swap: true, done: 0 },
    settings: {
        cards: { kind: "numbers", min: 1, max: 9, most: 8 },
        compare: { kind: "whole", min: 0, max: 7 },
        swap: { kind: "flag" },
        done: { kind: "whole", min: 0, max: 8 },
    },
    takes: [
        {
            label: "Comparing the first two",
            params: { cards: [5, 2, 7, 1, 4], compare: 1, swap: true, done: 0 },
        },
        {
            label: "One pass done",
            params: { cards: [2, 5, 1, 4, 7], compare: 3, swap: false, done: 1 },
        },
    ],
    box: (p) => ({
        w: Math.max(1, p.cards.length) * 3 + 1,
        h: Math.ceil(Math.max(...p.cards.map((v) => Math.min(9, Math.max(1, v))), 1) * 0.8 + 7),
    }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c,
            box = sortCards.box(p),
            base = (box.h - 1.5) * U;
        p.cards.forEach((v, i) => {
            const x = (0.5 + i * 3) * U,
                h = Math.min(9, Math.max(1, v)) * 0.8 * U,
                done = i >= p.cards.length - p.done;
            pen.rect(
                g,
                x + 0.5 * U,
                base - 2.6 * U - h,
                1.6 * U,
                h,
                "pencil",
                pen.fill(done ? "mint" : "sky"),
                { strokeWidth: 1.4 },
            );
            pen.path(
                g,
                roundedRect(x, base - 2.4 * U, 2.6 * U, 2.4 * U, 6),
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.8 },
            );
            num(c, x + 1.3 * U, base - 0.7 * U, String(v), 20);
            a[`card(${i + 1})`] = [x + 1.3 * U, base - 2.6 * U - h, "up"];
        });
        const i = Math.round(p.compare) - 1;
        if (i >= 0 && i + 1 < p.cards.length) {
            const x = (0.5 + i * 3) * U,
                y = 1.4 * U;
            pen.path(
                g,
                `M${x + 1.3 * U} ${y + 1.4 * U}V${y}H${x + 4.3 * U}V${y + 1.4 * U}`,
                "pencil",
                null,
                { strokeWidth: 2.2, stroke: c.paper ? c.t.ink : c.t.pen },
            );
            if (p.swap) {
                pen.arrow(
                    g,
                    [x + 1.3 * U, base + 0.4 * U],
                    [x + 4.3 * U, base + 0.4 * U],
                    c.paper ? c.t.ink : c.t.pen,
                    0.35,
                );
                pen.arrow(
                    g,
                    [x + 4.3 * U, base + 0.6 * U],
                    [x + 1.3 * U, base + 0.6 * U],
                    c.paper ? c.t.ink : c.t.pen,
                    -0.35,
                );
            } else
                letter(c, {
                    x: x + 2.8 * U,
                    y: y - 0.2 * U,
                    s: "?",
                    face: "read",
                    weight: 700,
                    size: 16,
                    fill: c.paper ? c.t.ink : c.t.pen,
                    anchor: "middle",
                });
        }
        return a;
    },
    describe: () =>
        "A row of number cards each with a tower as tall as its number, two of them ringed as the pair being compared, for sorting the way a program does.",
});
