import { svgDrawing } from "./hand";

export const birthdayTable = svgDrawing({
    name: "birthday-table",
    family: "food",
    title: "Birthday table",
    about: "A two tier cake with candles, plates, a cup and a present on a cloth. Candles, plates and slices are all countable, and the cake is a thing to share. Anchors at the candles, the cake, the slice, a plate, the cup, the present and the table. Hand-drawn SVG.",
    describe:
        "A birthday table laid with a cloth, a two tier cake with three candles, two plates, one with a slice, a cup and a wrapped present.",
    motion: {
        parts: {
            flame: {
                is: "twinkle",
                of: [[8], [9], [10]],
                dim: 0.25,
                amt: 0.16,
                period: 1.9,
                origin: [0.5, 1],
            },
        },
    },
});
