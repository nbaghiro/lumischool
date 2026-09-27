import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

interface DishParams {
    /** Across, in squares, from the outside of one rim to the other. */
    w: number;
}

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

export const coinDish = defineDrawing<DishParams>({
    id: "coindish",
    family: "money",
    title: "Coin dish",
    group: "Props",
    about: "A shallow brass dish seen from the side, with a raised rim at each end and a short foot, for coins to be tossed into and counted. Its rims stand up so that a coin that lands between them stays.",
    params: { w: 5 },
    settings: { w: { kind: "whole", min: 3, max: 10 } },
    takes: [
        { label: "A dish five squares across", params: { w: 5 } },
        { label: "A wide dish", params: { w: 8 } },
    ],
    box: (p) => ({ w: Math.round(p.w), h: 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            W = Math.round(p.w) * U;
        const rim = 0.3 * U,
            base = 1.6 * U;
        pen.path(
            g,
            `M${0.1 * U} ${rim}Q${0.4 * U} ${base} ${1.2 * U} ${base}H${W - 1.2 * U}Q${W - 0.4 * U} ${base} ${W - 0.1 * U} ${rim}L${W - 0.45 * U} ${rim}Q${W - 0.8 * U} ${base - 0.35 * U} ${W - 1.4 * U} ${base - 0.35 * U}H${1.4 * U}Q${0.8 * U} ${base - 0.35 * U} ${0.45 * U} ${rim}Z`,
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.8, ...FIRM },
        );
        pen.rect(g, W / 2 - 0.8 * U, base, 1.6 * U, 0.35 * U, "ruler", pen.fill("glow"), {
            strokeWidth: 1.4,
            ...FIRM,
        });
        const a: RawAnchors = {
            left: [0.25 * U, rim, "up"],
            right: [W - 0.25 * U, rim, "up"],
            floor: [W / 2, base - 0.35 * U, "up"],
        };
        return a;
    },
    describe: () =>
        "A shallow brass dish seen from the side, with a raised rim at each end and a short foot under its middle, empty and waiting for coins.",
    motion: {
        still: "A dish holds still on its counter, so a coin that rests in it stays where it landed.",
    },
});
