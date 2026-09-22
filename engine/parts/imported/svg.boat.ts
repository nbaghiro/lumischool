import { svgDrawing } from "./hand";

export const boat = svgDrawing({
    name: "boat",
    family: "travel",
    title: "Sailing boat",
    about: "A boat with two sails on a line of water, the first hand-drawn file in the folder. Anchors at the mast head and the hull. Hand-drawn SVG.",
    describe:
        "A sailing boat with two sails on a tall mast and a curved hull, sitting on a wavy line of water.",
    motion: {
        body: {
            is: "float",
            lift: 10,
            dx: 0,
            deg: 4,
            pivot: [0.5, 0.84],
            period: 7.4,
            units: true,
        },
        parts: { water: { is: "flow", of: [[4]], dx: 6, period: 3.4 } },
        react: { kind: "gust" },
    },
});
