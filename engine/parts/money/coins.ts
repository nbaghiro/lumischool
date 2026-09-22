import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { COINS, coin, type Coin } from "../props";

const ORDER: Coin[] = ["quarter", "dime", "nickel", "penny"];

export const coinRow = defineDrawing({
    id: "coins",
    family: "money",
    title: "Coins in a row",
    group: "Props",
    about: "Quarters, dimes, nickels and pennies, largest value first, at their real relative sizes.",
    params: { quarters: 1, dimes: 2, nickels: 0, pennies: 3 },
    settings: {
        quarters: { kind: "whole", min: 0, max: 8 },
        dimes: { kind: "whole", min: 0, max: 8 },
        nickels: { kind: "whole", min: 0, max: 8 },
        pennies: { kind: "whole", min: 0, max: 8 },
    },
    takes: [
        { label: "48 cents", params: { quarters: 1, dimes: 2, nickels: 0, pennies: 3 } },
        { label: "37 cents", params: { quarters: 0, dimes: 3, nickels: 1, pennies: 2 } },
        { label: "Two quarters", params: { quarters: 2, dimes: 0, nickels: 0, pennies: 0 } },
        { label: "Small change", params: { quarters: 0, dimes: 0, nickels: 2, pennies: 4 } },
    ],
    box: (p) => ({ w: (p.quarters + p.dimes + p.nickels + p.pennies) * 2 + 1, h: 3 }),
    draw: (c, p) => {
        const counts: Record<Coin, number> = {
            quarter: p.quarters,
            dime: p.dimes,
            nickel: p.nickels,
            penny: p.pennies,
        };
        const list = ORDER.flatMap((k) => Array<Coin>(Math.max(0, counts[k])).fill(k));
        const a: RawAnchors = {};
        list.forEach((k, i) => {
            const x = 30 + i * 2 * U;
            coin(c, x, 30, k);
            a[`coin(${i})`] = [x, 30 - COINS[k].mm * 0.8, "up"];
        });
        return a;
    },
    describe: () =>
        "Coins laid out in a row at their real sizes, largest first, quarters, dimes, nickels and pennies as there are of each.",
    reads: true,
});
