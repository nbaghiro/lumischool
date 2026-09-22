import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num, say, sayOn, wide } from "../lettering";

/** The card is as tall as its ingredients, and the rows are 1.6 squares apart whatever that is. */
const cardHeight = (n: number): number => 6.4 + (Math.max(1, n) - 1) * 1.6;

export const recipeCard = defineDrawing({
    id: "recipe",
    family: "food",
    title: "Recipe card",
    group: "Structures",
    about: "A recipe with the quantities in a column down the right, so they can be read straight down. Cooking for twice as many people is scaling every number in that column by the same factor.",
    params: {
        title: "Pancakes",
        serves: 4,
        items: [
            { what: "flour", how: "100 g" },
            { what: "milk", how: "200 ml" },
            { what: "eggs", how: "2" },
            { what: "butter", how: "25 g" },
        ],
    },
    settings: {
        title: { kind: "text", most: 12 },
        serves: { kind: "whole", min: 1, max: 12 },
        items: { kind: "fixed" },
    },
    takes: [
        {
            label: "Pancakes for four",
            params: {
                title: "Pancakes",
                serves: 4,
                items: [
                    { what: "flour", how: "100 g" },
                    { what: "milk", how: "200 ml" },
                    { what: "eggs", how: "2" },
                    { what: "butter", how: "25 g" },
                ],
            },
        },
        {
            label: "For two",
            params: {
                title: "Soup",
                serves: 2,
                items: [
                    { what: "carrots", how: "3" },
                    { what: "stock", how: "500 ml" },
                    { what: "butter", how: "10 g" },
                ],
            },
        },
        {
            label: "A longer list",
            params: {
                title: "Buns",
                serves: 6,
                items: [
                    { what: "flour", how: "240 g" },
                    { what: "sugar", how: "120 g" },
                    { what: "butter", how: "120 g" },
                    { what: "eggs", how: "3" },
                    { what: "milk", how: "60 ml" },
                ],
            },
        },
    ],
    box: (p) => ({ w: 15, h: Math.ceil(cardHeight(p.items.length) + 1.6) }),
    draw: (c, p) => {
        const { pen, g } = c,
            cw = 13 * U,
            cx = U;
        const h = cardHeight(p.items.length) * U,
            cy = (Math.ceil(cardHeight(p.items.length) + 1.6) * U - h) / 2;
        pen.path(g, roundedRect(cx, cy, cw, h, 10), "pencil", pen.fill("card"), {
            strokeWidth: 2.2,
        });
        pen.path(
            g,
            `M${cx} ${cy + 2.3 * U}V${cy + 10}Q${cx} ${cy} ${cx + 10} ${cy}H${cx + cw - 10}` +
                `Q${cx + cw} ${cy} ${cx + cw} ${cy + 10}V${cy + 2.3 * U}Z`,
            "pencil",
            pen.fill("glow", "solid", { hachureGap: 7 }),
            { strokeWidth: 1.8 },
        );
        sayOn(c, cx + cw / 2, cy + 1.55 * U, p.title, 19);
        num(c, cx + cw / 2, cy + 3.5 * U, `serves ${p.serves}`, 15);
        pen.line(g, cx + 0.8 * U, cy + 4.1 * U, cx + cw - 0.8 * U, cy + 4.1 * U, "ruler", {
            strokeWidth: 1.2,
            stroke: c.t["ink-soft"],
        });
        const a: RawAnchors = {
            card: [cx + cw / 2, cy, "up"],
            serves: [cx + cw / 2, cy + 3 * U, "up"],
        };
        const qx = cx + cw - 0.9 * U;
        p.items.forEach((item, i) => {
            const y = cy + (5.2 + i * 1.6) * U;
            say(c, cx + 0.9 * U, y, item.what, 15, "start");
            num(c, qx, y, item.how, 15, "end");
            // A leader, so the eye crosses the gap to the right column and the row it started on is the
            // row it lands on. It is dropped when the two words nearly meet.
            const from = cx + 0.9 * U + wide(item.what, 15) + 10,
                to = qx - wide(item.how, 15) - 10;
            if (to - from > 0.6 * U)
                pen.line(g, from, y - 5, to, y - 5, "ruler", {
                    strokeWidth: 0.8,
                    strokeLineDash: [2, 5],
                    stroke: c.t["ink-soft"],
                });
            a[`item(${i})`] = [qx, y - 6, "right"];
        });
        return a;
    },
    describe: (p) =>
        `A recipe card ${p.title ? `headed ${p.title}, ` : ""}saying how many it serves, with a list of ingredients down the left and a quantity beside each one.`,
    motion: { still: STILL.text },
});
