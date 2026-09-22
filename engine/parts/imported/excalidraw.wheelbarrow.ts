import { excalidrawDrawing } from "./hand";

export const wheelbarrow = excalidrawDrawing({
    name: "wheelbarrow",
    family: "outdoors",
    title: "Wheelbarrow",
    about: "A wheelbarrow with three things in it, drawn in Excalidraw, for taking a load somewhere and finding what is left. Anchors at the tub, the wheel and the handle.",
    describe:
        "A wheelbarrow drawn in a sketchy hand, with a deep tub holding three things, one wheel at the front and two handles at the back.",
    motion: { body: { is: "float", deg: 2, lift: 0.02, period: 6.8, pivot: [0.5, 0.95] } },
});
