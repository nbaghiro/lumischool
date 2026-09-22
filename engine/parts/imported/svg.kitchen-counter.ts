import { STILL } from "../drawing";
import { svgDrawing } from "./hand";

export const kitchenCounter = svgDrawing({
    name: "kitchen-counter",
    family: "food",
    title: "Kitchen counter",
    about: "Tiled splashback, wooden worktop and two cupboards, with a kettle at one end and a jar at the other. The middle of the worktop is deliberately empty, so a scene can stand its own objects on it. Anchors at the counter, the kettle, the jar, a cupboard and a handle. Hand-drawn SVG.",
    describe:
        "A kitchen counter with a tiled splashback, a wooden worktop over two cupboards, a kettle at one end, a jar at the other and space between.",
    motion: { still: STILL.setting },
});
