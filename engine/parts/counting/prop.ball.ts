import { defineDrawing } from "../drawing";
import { ball } from "../props";

export const ballV = defineDrawing({
    id: "prop.ball",
    family: "counting",
    title: "Ball",
    group: "Props",
    about: "Weight or counter role.",
    params: {},
    settings: {},
    takes: [
        { label: "Take 1", params: {}, seed: 0 },
        { label: "Take 2", params: {}, seed: 2131 },
        { label: "Take 3", params: {}, seed: 4262 },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c) => {
        ball(c, 20, 20, 24);
        return { top: [20, 7, "up"] };
    },
    describe: () =>
        "A round ball drawn in pencil and filled in dark pink, with a small white shine near its top left edge.",
    motion: { body: { is: "hop", lift: 0.16, squash: 0.14, period: 3.2 } },
});
