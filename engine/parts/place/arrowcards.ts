import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";
import { PLACE_FILL } from "./columns";

/** Digits, largest place first, as the numbers written on the cards: 247 gives 200, 40, 7. */
const cardValues = (value: number): string[] => {
    const s = String(Math.trunc(Math.abs(value)));
    return Array.from(s)
        .map((d, i) => d + "0".repeat(s.length - 1 - i))
        .filter((v) => Number(v) > 0);
};

const cardW = (v: string): number => v.length * 2 + 1;

export const arrowCards = defineDrawing({
    id: "arrowcards",
    family: "place",
    title: "Arrow cards",
    group: "Props",
    about: "The cards a number is built from. Apart they read 200, 40 and 7; pushed together their points line up and the zeros hide, which is the whole trick of place value in one move.",
    params: { value: 247, apart: true },
    settings: { value: { kind: "whole", min: 1, max: 9999 }, apart: { kind: "flag" } },
    takes: [
        { label: "247, apart", params: { value: 247, apart: true } },
        { label: "247, pushed together", params: { value: 247, apart: false } },
        { label: "Four digits", params: { value: 3060, apart: true } },
        { label: "Two digits, together", params: { value: 58, apart: false } },
    ],
    box: (p) => {
        const cards = cardValues(p.value);
        return p.apart
            ? { w: cards.reduce((s, v) => s + cardW(v) + 1, 0) + 1, h: 4 }
            : { w: cardW(cards[0] ?? "0") + 2, h: 4 };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            cards = cardValues(p.value),
            a: RawAnchors = {};
        const h = 2.6 * U,
            y = U;
        const one = (v: string, x: number, i: number) => {
            const w = cardW(v) * U,
                point = U;
            pen.polygon(
                g,
                [
                    [x, y],
                    [x + w - point, y],
                    [x + w, y + h / 2],
                    [x + w - point, y + h],
                    [x, y + h],
                ],
                "ruler",
                pen.fill(PLACE_FILL[v.length - 1] ?? "glow", "solid", { hachureGap: 6 }),
                { strokeWidth: 2 },
            );
            Array.from(v).forEach((d, k) => {
                patch(c, x + (k * 2 + 1) * U, y + h / 2 - 8, 26, 26);
                num(c, x + (k * 2 + 1) * U, y + h / 2 + 10, d, 28);
            });
            a[`card(${i})`] = [x + w / 2, y, "up"];
        };
        if (p.apart) {
            let x = U / 2;
            cards.forEach((v, i) => {
                one(v, x, i);
                x += (cardW(v) + 1) * U;
            });
        } else {
            // Largest first, each smaller card laid on top with its point in the same place.
            const right = (cardW(cards[0] ?? "0") + 1) * U;
            cards.forEach((v, i) => one(v, right - cardW(v) * U, i));
        }
        return a;
    },
    describe: (p) =>
        `Arrow cards, each a coloured card with a pointed end and a number on it${p.apart ? ", laid side by side apart" : ", laid on top of one another with their points lined up"}.`,
    reads: true,
});
