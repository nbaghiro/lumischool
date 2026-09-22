import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, soft } from "../lettering";
import { COINS, coin, type Coin } from "../props";

const SLOTS = [20, 10, 5, 1];

const WELLS: Coin[] = ["quarter", "dime", "nickel", "penny"];

export const tillDrawer = defineDrawing({
    id: "till",
    family: "money",
    title: "Till drawer",
    group: "Structures",
    about: "The open drawer seen from above: four slots for notes and four wells for coins, each labelled. Sorting money into it is the same act as sorting a pile into hundreds, tens and ones.",
    params: { counts: [1, 2, 0, 3], coins: [4, 3, 0, 6] },
    settings: {
        counts: { kind: "numbers", min: 0, max: 9, most: 4 },
        coins: { kind: "numbers", min: 0, max: 20, most: 4 },
    },
    takes: [
        { label: "A working till", params: { counts: [1, 2, 0, 3], coins: [4, 3, 0, 6] } },
        { label: "Nearly empty", params: { counts: [0, 0, 1, 2], coins: [1, 0, 2, 0] } },
        { label: "Full", params: { counts: [3, 3, 3, 3], coins: [5, 5, 5, 5] } },
    ],
    box: () => ({ w: 18, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        pen.path(
            g,
            roundedRect(U / 2, U / 2, 17 * U, 10 * U, 10),
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 9 }),
            { strokeWidth: 2.4 },
        );
        SLOTS.forEach((value, i) => {
            const x = U + i * 4.2 * U;
            pen.path(g, roundedRect(x, 1.2 * U, 3.8 * U, 5.4 * U, 6), "ruler", pen.fill("card"), {
                strokeWidth: 1.6,
            });
            soft(c, x + 1.9 * U, 2 * U, `$${value}`, 14);
            // Notes lie on top of each other with only a strip of each one showing, the way they do in
            // a real drawer, so the number has to live in that strip rather than in the middle.
            const n = Math.min(p.counts[i] ?? 0, 3);
            for (let k = 0; k < n; k++) {
                const ny = 2.6 * U + k * 0.8 * U;
                pen.rect(
                    g,
                    x + 0.4 * U,
                    ny,
                    3 * U,
                    2.6 * U,
                    "ruler",
                    pen.fill("mint", "solid", { hachureGap: 9, fillWeight: 0.5 }),
                    { strokeWidth: 1.3 },
                );
                patch(c, x + 1.9 * U, ny + 8, 26, 16);
                num(c, x + 1.9 * U, ny + 13, value, 13);
            }
            a[`slot($${value})`] = [x + 1.9 * U, 1.2 * U, "up"];
        });
        WELLS.forEach((k, i) => {
            const x = U + i * 4.2 * U,
                y = 7.4 * U;
            pen.path(g, roundedRect(x, y, 3.8 * U, 2.8 * U, 8), "ruler", pen.fill("card"), {
                strokeWidth: 1.6,
            });
            const n = p.coins[i] ?? 0,
                shown = Math.min(n, 3);
            for (let q = 0; q < shown; q++)
                coin(c, x + (1.9 - (shown - 1) * 0.5 + q) * U, y + 1.1 * U, k, 0.95);
            if (n > 0) num(c, x + 1.9 * U, y + 2.5 * U, `\u00d7 ${n}`, 13);
            else soft(c, x + 1.9 * U, y + 1.7 * U, COINS[k].cents + "¢", 13);
            a[`well(${k})`] = [x + 1.9 * U, y, "up"];
        });
        return a;
    },
    describe: () =>
        "An open till drawer seen from above with four labelled slots for notes along the top and four wells for coins below, each holding some.",
});
