import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";
import { drawProp } from "../props";
import { price } from "./price";

interface Good {
    prop: string;
    cents: number;
    label: string;
}

export const shopShelf = defineDrawing({
    id: "shop",
    family: "money",
    title: "Things for sale",
    group: "Structures",
    about: "Goods on a shelf with a price under each one. Two prices and a coin make a question; three make a two-step one, which is as far as this drawing needs to go.",
    params: {
        items: [
            { prop: "apple", cents: 45, label: "Apple" },
            { prop: "ball", cents: 199, label: "Ball" },
            { prop: "star", cents: 80, label: "Badge" },
        ] as Good[],
    },
    settings: { items: { kind: "fixed" } },
    takes: [
        {
            label: "Three things",
            params: {
                items: [
                    { prop: "apple", cents: 45, label: "Apple" },
                    { prop: "ball", cents: 199, label: "Ball" },
                    { prop: "star", cents: 80, label: "Badge" },
                ],
            },
        },
        {
            label: "Two things",
            params: {
                items: [
                    { prop: "cube", cents: 250, label: "Block" },
                    { prop: "hexagon", cents: 125, label: "Tile" },
                ],
            },
        },
        {
            label: "Four things",
            params: {
                items: [
                    { prop: "apple", cents: 40, label: "Apple" },
                    { prop: "apple", cents: 95, label: "Bag" },
                    { prop: "star", cents: 30, label: "Star" },
                    { prop: "ball", cents: 175, label: "Ball" },
                ],
            },
        },
    ],
    box: (p) => ({ w: p.items.length * 5 + 1, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            shelf = 5.2 * U,
            a: RawAnchors = {};
        pen.rect(
            g,
            U / 2,
            shelf,
            p.items.length * 5 * U,
            0.5 * U,
            "ruler",
            pen.fill("tang", "solid", { hachureGap: 7 }),
            { strokeWidth: 1.8 },
        );
        p.items.forEach((item, i) => {
            const x = U / 2 + i * 5 * U + 2.5 * U;
            drawProp(c, item.prop, x, shelf - 1.6 * U, 60);
            say(c, x, 6.9 * U, item.label, 15);
            num(c, x, 8.2 * U, price(item.cents), 18);
            a[`item(${i})`] = [x, shelf - 3 * U, "up"];
            a[`price(${i})`] = [x, 8.5 * U, "down"];
        });
        return a;
    },
    describe: () => "Goods on a wooden shelf, each with its name and its price written under it.",
});
