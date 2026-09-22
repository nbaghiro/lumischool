import { svgDrawing } from "./hand";

export const treehouse = svgDrawing({
    name: "treehouse",
    family: "outdoors",
    title: "Treehouse",
    about: "A hut in a tree with a ladder and a rope swing, the trunk running up behind it into the leaves. A place for a problem about going up, coming down and how many rungs. Anchors at the leaves, the roof, the window, the door, the platform, the ladder and the swing. Hand-drawn SVG.",
    describe:
        "A treehouse, a small hut with a roof, window and door on a platform in a leafy tree, with a ladder up to it and a rope swing.",
    motion: {
        parts: {
            swing: { is: "sway", of: [[18, 19]], deg: 7, pivot: [158, 148], period: 3.6 },
            leaves: { is: "sway", of: [[2, 3, 4]], deg: 1.6, period: 4.6, origin: [0.5, 1] },
        },
    },
});
