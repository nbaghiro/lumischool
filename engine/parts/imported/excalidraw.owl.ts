import { excalidrawDrawing } from "./hand";

export const owl = excalidrawDrawing({
    name: "owl",
    family: "animals",
    title: "Owl on a branch",
    about: "An owl on a bare branch, built from circles and triangles in Excalidraw so the sketchy edge comes from its own seeds. Anchors at an eye, the beak, a wing and the branch it sits on.",
    describe:
        "An owl sitting on a bare branch, built from circles and triangles, with two round eyes, a small beak and its wings folded at its sides.",
    motion: { body: { is: "idle", deg: 4, period: 4.4 } },
});
