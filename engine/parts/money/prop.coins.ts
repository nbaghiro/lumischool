import type { RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";
import { COINS, coin, type Coin } from "../props";

export const coinsV = defineDrawing({
    id: "prop.coins",
    family: "money",
    title: "US coins",
    group: "Props",
    about: "Drawn at real relative sizes, so a dime is smaller than a penny.",
    params: { coins: ["penny", "nickel", "dime", "quarter"] as Coin[] },
    settings: { coins: { kind: "words", of: ["penny", "nickel", "dime", "quarter"], most: 8 } },
    takes: [
        { label: "One of each", params: { coins: ["penny", "nickel", "dime", "quarter"] } },
        { label: "Silver only", params: { coins: ["dime", "nickel", "quarter"] } },
        { label: "A pile of pennies", params: { coins: ["penny", "penny", "penny"] } },
    ],
    box: (p) => ({ w: p.coins.length * 2 + 1, h: 3 }),
    draw: (c, p) => {
        const a: RawAnchors = {};
        p.coins.forEach((k, i) => {
            const x = 30 + i * 40;
            coin(c, x, 30, k);
            a[`coin(${i})`] = [x, 30 - COINS[k].mm * 0.8, "up"];
        });
        return a;
    },
    describe: () =>
        "A row of US coins drawn side by side at their real relative sizes, each coin with its value written in small figures at its centre.",
    reads: true,
});
