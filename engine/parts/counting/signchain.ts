import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, slot } from "../lettering";
import { sign } from "./sign";

export const signChain = defineDrawing({
    id: "signchain",
    family: "counting",
    title: "A chain of signs",
    group: "Inputs",
    about: "Three or four numbers in a row with a box for the sign between each pair. A chain is harder than a pair, because one sign being right does not make the next one right.",
    params: { values: ["4", "7", "2"], signs: [] as string[] },
    settings: { values: { kind: "words", most: 5 }, signs: { kind: "fixed" } },
    takes: [
        { label: "Three numbers", params: { values: ["4", "7", "2"], signs: [] } },
        { label: "Filled in", params: { values: ["4", "7", "2"], signs: ["<", ">"] } },
        { label: "Four numbers", params: { values: ["18", "9", "23", "23"], signs: [] } },
    ],
    box: (p) => ({ w: p.values.length * 4 + (p.values.length - 1) * 3 + 1, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 2.5 * U,
            a: RawAnchors = {};
        let x = U / 2;
        p.values.forEach((v, i) => {
            pen.path(g, roundedRect(x, U, 4 * U, 3 * U, 7), "ruler", pen.fill("card"), {
                strokeWidth: 1.8,
            });
            num(c, x + 2 * U, y + 0.5 * U, v, 26);
            a[`value(${i})`] = [x + 2 * U, U, "up"];
            x += 4 * U;
            if (i < p.values.length - 1) {
                if (p.signs[i]) sign(c, x + 1.5 * U, y, p.signs[i], 0.8 * U);
                else slot(c, x + 0.5 * U, 1.4 * U, 2 * U, 2.2 * U);
                a[`sign(${i})`] = [x + 1.5 * U, 1.4 * U, "up"];
                x += 3 * U;
            }
        });
        return a;
    },
    describe: () =>
        "A row of numbers on white cards with a box between each pair for a sign, some boxes empty and some with a sign in them.",
});
