import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { asPerson, type CharlieParams } from "../people/charlie";
import { placePerson } from "../people/figure";
import { drawProduce } from "./gardencrop";

const CHARLIE: CharlieParams = {
    pose: "hold",
    mood: "happy",
    dir: -1,
    hair: "bunches",
    top: "mint",
    sleeves: "short",
    print: "flower",
    wear: "shorts",
    bottom: "sky",
    pattern: "plain",
    feet: "boots",
    holding: "",
};

/**
 * Charlie in her wellies tipping a watering can over a bed of sprouting seedlings, the picture the
 * garden game is chosen by.
 */
export const gardenCover = defineDrawing<{ charlie: boolean }>({
    id: "gardencover",
    family: "outdoors",
    title: "Watering the garden",
    group: "Props",
    about: "Charlie in wellies tipping a blue watering can over a little bed of sprouting seedlings, drops falling from the rose onto the soil, the picture of a garden game.",
    params: { charlie: true },
    settings: { charlie: { kind: "flag" } },
    takes: [
        { label: "With Charlie", params: { charlie: true } },
        { label: "Just the bed and the can", params: { charlie: false } },
    ],
    box: () => ({ w: 8, h: 7 }),
    draw: (c, p) => {
        const bedTop = 5.2 * U;
        c.pen.rect(c.g, 0.2 * U, bedTop, 5 * U, 1.5 * U, "pencil", c.pen.fill("tang", "hachure"), {
            strokeWidth: 1.5,
        });
        for (let k = 0; k < 4; k++) {
            const x = (0.9 + k * 1.2) * U,
                base = bedTop + 0.5 * U;
            c.pen.line(c.g, x, base, x, base - 0.6 * U, "pencil", {
                stroke: c.t.ok,
                strokeWidth: 1.3,
            });
            c.pen.ellipse(
                c.g,
                x - 0.28 * U,
                base - 0.65 * U,
                0.55 * U,
                0.3 * U,
                "pencil",
                c.pen.fill("mint", "solid"),
                { strokeWidth: 0.9 },
            );
            c.pen.ellipse(
                c.g,
                x + 0.28 * U,
                base - 0.65 * U,
                0.55 * U,
                0.3 * U,
                "pencil",
                c.pen.fill("mint", "solid"),
                { strokeWidth: 0.9 },
            );
        }
        drawProduce(c, "carrot", 4.6 * U, bedTop + 0.6 * U, 0.35 * U);
        // the can, tipped towards the bed, and its drops falling
        const rose = { x: 3.2 * U, y: 2.6 * U };
        c.pen.path(
            c.g,
            `M${4.4 * U} ${1.9 * U}L${5.9 * U} ${1.5 * U}L${6.3 * U} ${2.9 * U}L${4.9 * U} ${3.4 * U}Z`,
            "pencil",
            c.pen.fill("sky", "solid"),
            { strokeWidth: 1.4 },
        );
        c.pen.line(c.g, 4.6 * U, 3 * U, rose.x + 0.2 * U, rose.y, "pencil", { strokeWidth: 2.2 });
        c.pen.circle(c.g, rose.x, rose.y, 0.6 * U, "pencil", c.pen.fill("card", "solid"), {
            strokeWidth: 1,
        });
        for (const [dx, dy] of [
            [-0.4, 0.8],
            [0, 1.3],
            [0.3, 0.9],
            [-0.2, 1.8],
            [0.2, 2.1],
        ] as const)
            c.pen.circle(
                c.g,
                rose.x + dx * U,
                rose.y + dy * U,
                0.18 * U,
                "pencil",
                c.pen.fill("sky", "solid"),
                { strokeWidth: 0.6 },
            );
        if (p.charlie) placePerson(c, asPerson(CHARLIE), 6.8 * U, 6.8 * U, { size: 0.45 });
        return {};
    },
    describe: (p) =>
        p.charlie
            ? "Charlie in wellies tipping a blue watering can over a small bed of sprouting seedlings, drops falling from the rose onto the soil."
            : "A blue watering can tipped over a small bed of sprouting seedlings, drops falling from its rose onto the soil below.",
});
