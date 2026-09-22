import { svgDrawing } from "./hand";

export const pencil = svgDrawing({
    name: "pencil",
    family: "home",
    title: "Pencil",
    about: "A school pencil with its ferrule and a sharpened tip, drawn ten squares long so it can be measured against the ruler. Anchors at the tip and the eraser. Hand-drawn SVG.",
    describe:
        "A school pencil lying flat and ten squares long, with a rubber in a metal ferrule at one end and a sharpened point at the other.",
    motion: { body: { is: "wiggle", deg: 3, cycles: 4, period: 4.1, pivot: [0.92, 0.51] } },
});
