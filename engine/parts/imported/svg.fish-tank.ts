import { svgDrawing } from "./hand";

export const fishTank = svgDrawing({
    name: "fish-tank",
    family: "animals",
    title: "Fish tank",
    about: "Water, gravel, weed and three fish of different sizes, which is a scene that can be counted, sorted or compared. Anchors at the waterline, a fish, the weed and the gravel. Hand-drawn SVG.",
    describe:
        "A fish tank of water with gravel on the bottom, green weed growing up from it and three fish of different sizes swimming inside.",
    motion: {
        parts: {
            fish: {
                is: "drift",
                of: [
                    [7, 8, 9, 10],
                    [11, 12, 13],
                    [14, 15, 16],
                ],
                dx: 9,
                lift: 1,
                period: 6.5,
            },
            bubbles: { is: "flow", of: [[17, 18, 19, 20]], lift: 6, dx: 1.5, period: 2.4 },
            weed: {
                is: "sway",
                of: [
                    [3, 4],
                    [5, 6],
                ],
                deg: 4,
                period: 4.1,
                origin: [0.5, 1],
            },
        },
    },
});
