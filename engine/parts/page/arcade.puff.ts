import { defineDrawing } from "../drawing";

export const puff = defineDrawing({
    id: "arcade.puff",
    family: "page",
    title: "Puff",
    group: "Marks",
    about: "A small cloud of dust, drawn loosely, for a thing that has just landed or been knocked.",
    params: {},
    settings: {},
    takes: [
        { label: "Take 1", params: {}, seed: 0 },
        { label: "Take 2", params: {}, seed: 2131 },
        { label: "Take 3", params: {}, seed: 4262 },
    ],
    box: () => ({ w: 1, h: 1 }),
    draw: (c) => {
        c.pen.circle(c.g, 10, 10, 13, "doodle", c.pen.fill("card"), {
            strokeWidth: 1.3,
            stroke: c.t["ink-soft"],
        });
        return {};
    },
    describe: () =>
        "A small round cloud of dust drawn loosely in a soft grey line, the size of one square, where something has just landed.",
});
