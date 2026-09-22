import { svgDrawing } from "./hand";

export const hen = svgDrawing({
    name: "hen",
    family: "animals",
    title: "Hen",
    about: "A white hen with a red comb and a raised wing, for problems about eggs, feeding and how many are left in the run. Anchors at the comb, the beak, the wing and a foot. Hand-drawn SVG.",
    describe:
        "A white hen standing side on with a red comb on its head, a beak, one wing raised and its feet on the ground.",
    motion: {
        body: { is: "idle", deg: 3.5 },
        parts: { wing: { is: "sway", of: [[7, 8]], deg: 7, pivot: [62, 76], period: 3.1 } },
    },
});
