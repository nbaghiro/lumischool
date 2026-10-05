import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { asPerson, type CharlieParams } from "./charlie";
import { placePerson } from "./figure";

const LEAPING: CharlieParams = {
    pose: "jump",
    mood: "excited",
    dir: 1,
    hair: "ponytail",
    top: "glow",
    sleeves: "short",
    print: "star",
    wear: "shorts",
    bottom: "sky",
    pattern: "plain",
    feet: "shoes",
    holding: "",
};

/** Charlie in mid-jump over a rooftop with gold coins in the air: the picture a climbing game is chosen by. */
export const climbCover = defineDrawing<{ coins: number }>({
    id: "climbcover",
    family: "people",
    title: "Charlie climbing",
    group: "Characters",
    about: "Charlie leaping from one red roof towards another with three gold coins in the air ahead of her, the picture of a gentle climbing and jumping game.",
    params: { coins: 3 },
    settings: { coins: { kind: "whole", min: 1, max: 3 } },
    takes: [
        { label: "Charlie leaping over the roofs", params: { coins: 3 } },
        { label: "One coin ahead", params: { coins: 1 } },
    ],
    box: () => ({ w: 8, h: 7 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        const roof = (x0: number, x1: number, y: number) => {
            pen.rect(g, x0, y + 0.8 * U, x1 - x0, 7 * U - y - 0.9 * U, "pencil", pen.fill("card"), {
                strokeWidth: 1.4,
                roughness: 0.3,
            });
            pen.rect(g, x0, y, x1 - x0, 0.8 * U, "pencil", pen.fill("berry", "solid"), {
                strokeWidth: 1.4,
                roughness: 0.3,
            });
        };
        roof(0.15 * U, 3 * U, 4.6 * U);
        roof(5.2 * U, 7.85 * U, 4 * U);
        const n = Math.max(1, Math.min(3, Math.round(Number(p.coins) || 3)));
        for (const [x, y] of (
            [
                [5.3, 0.8],
                [4.2, 1.1],
                [6.4, 1.2],
            ] as const
        ).slice(0, n))
            pen.circle(g, x * U, y * U, 0.7 * U, "pencil", pen.fill("glow", "solid"), {
                strokeWidth: 1.2,
                roughness: 0.25,
            });
        placePerson(c, asPerson(LEAPING), 3.4 * U, 3.9 * U, { size: 0.5 });
        return { charlie: [3.4 * U, 2.4 * U, "up"] };
    },
    describe: () =>
        "Charlie in shorts and a star top leaping between two red roofs, her arms up, with gold coins floating in the air ahead of her.",
    motion: { still: "A cover holds still; the climb itself moves." },
});
