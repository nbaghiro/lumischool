import { type RawAnchors } from "../../ink/surface";
import { U, type TokenName } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";

/** One colour per length, as far as the palette goes. Length is the real signal; colour helps. */
const ROD_FILL: TokenName[] = [
    "card",
    "berry",
    "mint",
    "sky",
    "glow",
    "mint",
    "ink-soft",
    "tang",
    "sky",
    "tang",
];

export const cuisenaire = defineDrawing({
    id: "rods",
    family: "counting",
    title: "Cuisenaire rods",
    group: "Props",
    about: "Rods one square per unit long, laid out as a staircase or as a train against a whole. Length is what carries the number here, so the rods are drawn at the ruler level and sit on the page grid.",
    params: { rods: [1, 2, 3, 4, 5], mode: "stair", numbers: true },
    settings: {
        rods: { kind: "numbers", min: 1, max: 10, most: 10 },
        mode: { kind: "one of", of: ["stair", "train"] },
        numbers: { kind: "flag" },
    },
    takes: [
        {
            label: "A staircase to five",
            params: { rods: [1, 2, 3, 4, 5], mode: "stair", numbers: true },
        },
        {
            label: "A train that makes ten",
            params: { rods: [4, 3, 2, 1], mode: "train", numbers: true },
        },
        {
            label: "No numbers on them",
            params: { rods: [2, 4, 6, 8, 10], mode: "stair", numbers: false },
        },
        { label: "Two that make seven", params: { rods: [3, 4], mode: "train", numbers: true } },
    ],
    box: (p) => ({
        w: (p.mode === "train" ? p.rods.reduce((s, n) => s + n, 0) : Math.max(...p.rods, 1)) + 3,
        h: p.mode === "train" ? 5 : Math.ceil(p.rods.length * 1.5) + 2,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const rod = (n: number, x: number, y: number, i: number) => {
            pen.rect(
                g,
                x,
                y,
                n * U,
                U,
                "ruler",
                pen.fill(ROD_FILL[Math.min(n, 10) - 1] ?? "sky", "solid", { hachureGap: 5 }),
                { strokeWidth: 1.8 },
            );
            if (p.numbers) {
                patch(c, x + (n * U) / 2, y + U / 2 - 4, 22, 17);
                num(c, x + (n * U) / 2, y + U / 2 + 5, n, 14);
            }
            a[`rod(${i})`] = [x + (n * U) / 2, y, "up"];
        };
        if (p.mode === "train") {
            let x = 1.5 * U;
            const total = p.rods.reduce((s, n) => s + n, 0);
            pen.rect(g, 1.5 * U, 1.4 * U, total * U, U, "ruler", null, {
                strokeWidth: 1.2,
                strokeLineDash: [6, 5],
                stroke: c.t["ink-soft"],
            });
            p.rods.forEach((n, i) => {
                rod(n, x, 2.8 * U, i);
                x += n * U;
            });
            num(c, 1.5 * U + (total * U) / 2, 1.9 * U + 6, total, 16);
            a.whole = [1.5 * U + (total * U) / 2, 1.4 * U, "up"];
        } else {
            p.rods.forEach((n, i) => rod(n, 1.5 * U, (1 + i * 1.5) * U, i));
        }
        return a;
    },
    describe: (p) =>
        `Cuisenaire rods, each one square per unit long in its own colour, ${p.mode === "train" ? "laid end to end as a train under a dashed whole" : "laid one above another as a staircase"}${p.numbers ? ", each numbered" : ""}.`,
});
