import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { COINS, coin, type Coin } from "../props";

const COIN_NAMES = Object.keys(COINS) as Coin[];

export const purse = defineDrawing({
    id: "purse",
    family: "money",
    title: "Purse",
    group: "Props",
    about: "An open purse with what is in it on show. A purse makes the amount someone has into a thing on the page, which is what a word problem needs before it can ask what they can afford.",
    params: { coins: ["quarter", "dime", "dime", "penny"] as Coin[] },
    settings: { coins: { kind: "words", most: 6, of: COIN_NAMES } },
    takes: [
        { label: "45 cents", params: { coins: ["quarter", "dime", "dime"] } },
        {
            label: "A handful",
            params: { coins: ["quarter", "quarter", "dime", "nickel", "penny", "penny"] },
        },
        { label: "Empty", params: { coins: [] } },
    ],
    box: () => ({ w: 10, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x = U,
            y = 2.4 * U,
            w = 8 * U,
            h = 4.4 * U;
        pen.path(
            g,
            `M${x} ${y + 30}Q${x} ${y} ${x + 40} ${y}H${x + w - 40}Q${x + w} ${y} ${x + w} ${y + 30}` +
                `V${y + h - 20}Q${x + w} ${y + h} ${x + w - 24} ${y + h}H${x + 24}Q${x} ${y + h} ${x} ${y + h - 20}Z`,
            "pencil",
            pen.fill("berry", "solid", { hachureGap: 8, fillWeight: 0.6 }),
            { strokeWidth: 2.2 },
        );
        pen.path(
            g,
            `M${x + 6} ${y + 26}Q${x + w / 2} ${y - 14} ${x + w - 6} ${y + 26}`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.8 },
        );
        pen.circle(g, x + w / 2, y + 8, 14, "pencil", pen.fill("glow"), { strokeWidth: 1.4 });
        const a: RawAnchors = { clasp: [x + w / 2, y - 4, "up"] };
        p.coins.forEach((k, i) => {
            const cx = x + 1.4 * U + (i % 3) * 2.2 * U,
                cy = y + 1.7 * U + Math.floor(i / 3) * 1.6 * U;
            coin(c, cx, cy, k, 1.25);
            a[`coin(${i})`] = [cx, cy, "up"];
        });
        return a;
    },
    describe: () =>
        "An open pink purse with a yellow clasp and coins lying inside it, each coin drawn at its real size.",
    reads: true,
});
