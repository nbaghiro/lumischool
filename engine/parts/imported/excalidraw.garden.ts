import { STILL } from "../drawing";
import { excalidrawDrawing } from "./hand";

export const garden = excalidrawDrawing({
    name: "garden",
    family: "outdoors",
    title: "Garden bed",
    about: "A picket fence, three flowers and a watering can standing in a bed, drawn in Excalidraw. Anchors at the fence, a flower, the bed and the can.",
    describe:
        "A garden bed drawn in a sketchy hand, with a picket fence behind three flowers and a watering can standing in the soil.",
    motion: { still: STILL.setting },
});
