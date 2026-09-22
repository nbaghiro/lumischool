import { type RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";

export const fractionBar = defineDrawing({
    id: "fraction.bar",
    family: "fractions",
    title: "Fraction bar",
    group: "Structures",
    about: "A 10-square bar cut into n equal parts.",
    params: { n: 3, k: 2 },
    settings: { n: { kind: "whole", min: 1, max: 12 }, k: { kind: "whole", min: 0, max: 12 } },
    takes: [
        { label: "Two thirds", params: { n: 3, k: 2 } },
        { label: "A quarter", params: { n: 4, k: 1 } },
        { label: "Three fifths", params: { n: 5, k: 3 } },
        { label: "A half", params: { n: 2, k: 1 } },
    ],
    box: () => ({ w: 12, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = 200 / p.n,
            a: RawAnchors = {};
        for (let i = 0; i < p.n; i++) {
            pen.rect(g, 20 + i * w, 12, w, 36, "ruler", i < p.k ? pen.fill("mint") : null, {
                strokeWidth: 1.8,
            });
            a[`part(${i})`] = [20 + i * w + w / 2, 48, "down"];
        }
        return a;
    },
    describe: () =>
        "A long bar cut into equal parts, some of them shaded green from the left and the rest left white.",
});
