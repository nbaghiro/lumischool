import { svgDrawing } from "./hand";

export const cat = svgDrawing({
    name: "cat",
    family: "animals",
    title: "Cat, sitting",
    about: "A cat sitting square on with its tail curled round, for a story problem that wants an animal rather than a counter. Anchors at the head, the nose, a front paw and the tail tip. Hand-drawn SVG.",
    describe:
        "A cat sitting square on with its tail curled round beside it, its ears up and its whiskers spread either side of its nose.",
    motion: {
        body: { is: "idle" },
        parts: {
            eyes: { is: "blink", of: [[16, 17, 18, 19, 20, 21]], period: 4.2 },
            tail: {
                is: "wiggle",
                of: [[0, 1]],
                deg: 10,
                period: 5.4,
                cycles: 2,
                pivot: [120, 134],
            },
        },
    },
});
