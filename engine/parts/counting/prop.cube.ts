import { defineDrawing } from "../drawing";
import { cube } from "../props";

export const cubeV = defineDrawing({
    id: "prop.cube",
    family: "counting",
    title: "Cube",
    group: "Props",
    about: "Weight role in balance puzzles.",
    params: {},
    settings: {},
    takes: [
        { label: "Take 1", params: {}, seed: 0 },
        { label: "Take 2", params: {}, seed: 2131 },
        { label: "Take 3", params: {}, seed: 4262 },
    ],
    box: () => ({ w: 3, h: 3 }),
    draw: (c) => {
        cube(c, 27, 33);
        return { top: [30, 12, "up"], centre: [27, 33, "right"] };
    },
    describe: () =>
        "A small cube drawn in pencil, with a pale blue front face and a hatched side, sitting squarely on the squared paper.",
    motion: { body: { is: "hop", lift: 0.08, squash: 0.06, period: 4.4 } },
});
