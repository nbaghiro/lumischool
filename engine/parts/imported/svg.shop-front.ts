import { STILL } from "../drawing";
import { svgDrawing } from "./hand";

export const shopFront = svgDrawing({
    name: "shop-front",
    family: "places",
    title: "Shop front",
    about: "A striped awning, a window with three things on a shelf, a door and a step: the place a money problem happens in. Anchors at the awning, the sign, the window, the shelf, the door, the flower box and the step. Hand-drawn SVG.",
    describe:
        "A shop front with a striped awning over a window of three things on a shelf, a door with a step, a sign and a flower box.",
    motion: { still: STILL.setting },
});
