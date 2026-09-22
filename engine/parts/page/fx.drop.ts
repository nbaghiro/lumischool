import { defineDrawing } from "../drawing";

export const drop = defineDrawing({
    id: "fx.drop",
    family: "page",
    title: "Drop of water",
    group: "Marks",
    about: "A drop of water with a glint on it, the size of a square. A handful are thrown up where something meets the water.",
    params: {},
    settings: {},
    takes: [
        { label: "Take 1", params: {}, seed: 0 },
        { label: "Take 2", params: {}, seed: 2131 },
        { label: "Take 3", params: {}, seed: 4262 },
    ],
    box: () => ({ w: 1, h: 1 }),
    draw: (c) => {
        c.pen.path(
            c.g,
            "M10 2Q16 11 16 13.5A6 6 0 0 1 4 13.5Q4 11 10 2Z",
            "ruler",
            c.pen.fill("sky"),
            { strokeWidth: 1.2, roughness: 0.4, disableMultiStroke: true, preserveVertices: true },
        );
        if (!c.paper)
            c.pen.arc(c.g, 8.5, 13, 5, 5, Math.PI * 0.6, Math.PI * 1.1, "ruler", {
                strokeWidth: 1.1,
                stroke: c.t.card,
                disableMultiStroke: true,
            });
        return { centre: [10, 12, "up"] };
    },
    describe: () =>
        "A single drop of water the size of one square, blue with a pointed top and a round bottom, and a small glint of light on it.",
});
