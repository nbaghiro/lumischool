import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { loop } from "../marks";

export const digitCards = defineDrawing({
    id: "digitcards",
    family: "place",
    title: "Digit cards",
    group: "Props",
    about: "Loose digits to arrange. With four cards there are twenty-four numbers to make, which is the shortest route to asking for the largest, the smallest, or the one nearest a target.",
    params: { digits: [3, 7, 1, 5], picked: [] as number[] },
    settings: { digits: { kind: "numbers", min: 0, max: 9, most: 6 }, picked: { kind: "fixed" } },
    takes: [
        { label: "Four cards", params: { digits: [3, 7, 1, 5], picked: [] } },
        { label: "Two picked", params: { digits: [8, 0, 4], picked: [0, 2] } },
        { label: "A repeat", params: { digits: [2, 2, 9], picked: [] } },
    ],
    box: (p) => ({ w: p.digits.length * 4 + 1, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        p.digits.forEach((d, i) => {
            const x = U / 2 + i * 4 * U,
                up = p.picked.includes(i) ? -10 : 0;
            pen.path(g, roundedRect(x, U + up, 3 * U, 4 * U, 8), "ruler", pen.fill("card"), {
                strokeWidth: 2,
            });
            num(c, x + 1.5 * U, 3.6 * U + up, d, 40);
            if (p.picked.includes(i)) loop(c, x + 1.5 * U, 3 * U + up, 3 * U + 10, 4 * U + 10);
            a[`card(${i})`] = [x + 1.5 * U, U + up, "up"];
        });
        return a;
    },
    describe: (p) =>
        `Loose white cards in a row on the page, each with one large digit written on it${p.picked.length > 0 ? ", some lifted a little and ringed in pencil" : ", none of them picked out"}.`,
});
