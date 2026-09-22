import type { RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";
import { dieFace } from "../props";

export const diceV = defineDrawing({
    id: "prop.dice",
    family: "sport",
    title: "Dice faces",
    group: "Props",
    about: "Subitising: dots in the standard dice patterns.",
    params: { faces: [1, 2, 3, 4, 5, 6] },
    settings: { faces: { kind: "numbers", min: 1, max: 6, most: 6 } },
    takes: [
        { label: "One to six", params: { faces: [1, 2, 3, 4, 5, 6] } },
        { label: "A throw of two", params: { faces: [3, 5] } },
        { label: "Three sixes", params: { faces: [6, 6, 6] } },
    ],
    box: (p) => ({ w: Math.ceil(p.faces.length * 2.5 + 0.5), h: 3 }),
    draw: (c, p) => {
        const a: RawAnchors = {};
        p.faces.forEach((n, i) => {
            dieFace(c, 30 + i * 50, 30, n);
            a[`face(${i})`] = [30 + i * 50, 10, "up"];
        });
        return a;
    },
    describe: () =>
        "A row of dice faces with rounded corners, each face showing its dots in the pattern a dice uses for that number.",
    reads: true,
});
