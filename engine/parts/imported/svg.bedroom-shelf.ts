import { svgDrawing } from "./hand";

export const bedroomShelf = svgDrawing({
    name: "bedroom-shelf",
    family: "home",
    title: "Bedroom shelf",
    about: "A shelf with books leaning at one end and a plant at the other, and a clear middle. The plank is one straight line to stand things on, which is what makes it useful as a setting. Anchors at the shelf, the books, the plant, the boxes and a bracket. Hand-drawn SVG.",
    describe:
        "A shelf on a wall on two brackets, with books leaning at one end, a plant in a pot at the other and boxes between.",
    motion: {
        parts: { plant: { is: "sway", of: [[8, 9, 10]], deg: 4, pivot: [150, 74], period: 4.3 } },
    },
});
