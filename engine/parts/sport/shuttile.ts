import { defineDrawing } from "../drawing";
import { drawTile } from "./dice";

export const shutTile = defineDrawing({
    id: "shuttile",
    family: "sport",
    title: "A number from a shut-the-box",
    group: "Props",
    about: "One hinged wooden number from a shut-the-box. Standing, its number faces the front; pushed down, it lies flat on its face and only its plain back shows. Part way down it is the number tipping over on its hinge.",
    params: { n: 7, down: 0 },
    settings: {
        n: { kind: "whole", min: 1, max: 12 },
        down: { kind: "number", min: 0, max: 1, step: 0.1 },
    },
    takes: [
        { label: "Standing", params: { n: 7, down: 0 } },
        { label: "Tipping down", params: { n: 4, down: 0.5 } },
        { label: "Shut", params: { n: 9, down: 1 } },
    ],
    box: () => ({ w: 3, h: 4 }),
    draw: (c, p) => {
        drawTile(c, 30, 60, p.n, p.down);
        return { hinge: [30, 60, "down"], face: [30, 36, "up"], top: [30, 12, "up"] };
    },
    describe: (p) =>
        `One hinged wooden number from a shut-the-box, ${p.down >= 1 ? "lying flat on its face with only its plain back showing" : p.down > 0 ? "tipping over on its hinge part way down" : "standing upright with its number facing the front"}, on a hinge line at its foot.`,
});
