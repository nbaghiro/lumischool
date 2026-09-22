import { STILL } from "../drawing";
import { svgDrawing } from "./hand";

export const marketStall = svgDrawing({
    name: "market-stall",
    family: "money",
    title: "Market stall",
    about: "A striped canopy over a trestle with two crates of fruit and a chalk sign left blank, so a question can price it. Anchors at the canopy, the sign, each crate of fruit and the table. Hand-drawn SVG.",
    describe:
        "A market stall with a striped canopy over a trestle table, two crates of fruit on it and a blank chalk sign for a price.",
    motion: { still: STILL.setting },
});
