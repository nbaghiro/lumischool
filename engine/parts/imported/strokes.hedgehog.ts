import { strokesDrawing } from "./hand";

export const hedgehog = strokesDrawing({
    name: "hedgehog",
    family: "animals",
    title: "Hedgehog",
    about: "A hedgehog whose spines are tapered pen strokes, which is the one thing a stroke does better than any shape drawn in code. Anchors at the nose, the back and a foot. Stroke file with pressure.",
    describe:
        "A hedgehog standing side on, its back covered in spines drawn as tapered pen strokes, with a pointed nose and small feet underneath.",
    motion: { body: { is: "wiggle", deg: 2.5, cycles: 4, period: 3.6, pivot: [0.5, 1] } },
});
