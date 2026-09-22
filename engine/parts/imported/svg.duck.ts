import { svgDrawing } from "./hand";

export const duck = svgDrawing({
    name: "duck",
    family: "animals",
    title: "Duck",
    about: "A duck standing side on, drawn as one outline with the head over it, so it reads at the size of a lesson scene. Anchors at the head, the beak, the wing and a foot. Hand-drawn SVG.",
    describe:
        "A duck standing side on, drawn as one rounded outline with its head and beak held up over the body and its feet below.",
    motion: {
        body: { is: "float", lift: 0, dx: 6, deg: 4, pivot: [0.5, 1], period: 7.4, units: true },
        parts: {
            head: {
                is: "sway",
                of: [[7, 8, 9, 10, 11, 12, 13]],
                deg: 6,
                pivot: [132, 60],
                period: 3.7,
                lag: 0.18,
            },
        },
        react: { kind: "dip", deg: 22 },
    },
});
