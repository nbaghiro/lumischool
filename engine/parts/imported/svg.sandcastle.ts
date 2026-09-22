import { svgDrawing } from "./hand";

export const sandcastle = svgDrawing({
    name: "sandcastle",
    family: "outdoors",
    title: "Sandcastle",
    about: "Three crenellated towers with flags and a bucket beside them. The crenellations and the flags are both countable, and the towers give three heights to order. Anchors at the keep, a flag, the door, the bucket and the sand. Hand-drawn SVG.",
    describe:
        "A sandcastle of three crenellated towers of different heights, each with a flag on top, a door at the front and a bucket beside it.",
    motion: {
        parts: {
            flag: {
                is: "sway",
                of: [[1], [3], [5]],
                deg: 9,
                period: 2.2,
                wave: 0.25,
                origin: [0, 0.5],
            },
        },
    },
});
