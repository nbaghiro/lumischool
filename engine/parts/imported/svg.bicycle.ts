import { svgDrawing } from "./hand";

export const bicycle = svgDrawing({
    name: "bicycle",
    family: "travel",
    title: "Bicycle with a basket",
    about: "Spoked wheels, mudguards, a chain and a front basket: the example of a drawing that code does badly and a hand does easily. Anchors at the saddle, the handlebar, the basket, a pedal and each wheel. Hand-drawn SVG.",
    describe:
        "A bicycle side on with spoked wheels, mudguards, a chain, a saddle and a basket on the front below the handlebars.",
    motion: {
        parts: {
            wheel: {
                is: "spin",
                of: [
                    [2, 3, 4],
                    [5, 6, 7],
                ],
                rev: 16,
                symmetry: 8,
                origin: [0.5, 0.5],
            },
        },
    },
});
