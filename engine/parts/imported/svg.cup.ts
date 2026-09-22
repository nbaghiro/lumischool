import { svgDrawing } from "./hand";

export const cup = svgDrawing({
    name: "cup",
    family: "food",
    title: "Mug",
    about: "A mug with steam coming off it, for capacity, for how many are on the counter, and as something to put on a table. Anchors at the rim and the handle. Hand-drawn SVG.",
    describe:
        "A mug seen from the side, its handle out to one side and two wisps of steam rising from the top of it.",
    motion: {
        parts: {
            steam: { is: "flow", of: [[3]], lift: 7, dx: 2.5, period: 2.7, origin: [0.5, 1] },
        },
    },
});
