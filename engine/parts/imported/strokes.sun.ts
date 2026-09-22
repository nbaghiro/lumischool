import { strokesDrawing } from "./hand";

export const sun = strokesDrawing({
    name: "sun",
    family: "outdoors",
    title: "Sun",
    about: "A sun laid in with a marker and inked with eight rays, drawn in the drawing pad and exported as it was drawn. Anchors at the centre and the top. Stroke file with pressure.",
    describe:
        "A round sun laid in with a marker and inked round its edge, with eight rays drawn out from it on every side.",
    motion: {
        body: { is: "breathe", amt: 0.03, pivot: [0.5, 0.5] },
        parts: {
            rays: {
                is: "sway",
                of: [[2, 3, 4, 5, 6, 7, 8, 9]],
                deg: 6,
                pivot: [60, 60],
                period: 5.2,
            },
        },
    },
});
