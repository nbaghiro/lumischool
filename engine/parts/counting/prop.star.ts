import { defineDrawing } from "../drawing";
import { star } from "../props";

export const starV = defineDrawing({
    id: "prop.star",
    family: "counting",
    title: "Star",
    group: "Props",
    about: "Smallest weight in balance chains.",
    params: {},
    settings: {},
    takes: [
        { label: "Take 1", params: {}, seed: 0 },
        { label: "Take 2", params: {}, seed: 2131 },
        { label: "Take 3", params: {}, seed: 4262 },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c) => {
        star(c, 20, 21, 15);
        return { top: [20, 5, "up"] };
    },
    describe: () =>
        "A five-pointed star drawn in pencil and filled in yellow, standing on its two lower points on the squared paper.",
    motion: { body: { is: "twinkle", dim: 0.25, amt: 0.08, period: 2.4 } },
});
