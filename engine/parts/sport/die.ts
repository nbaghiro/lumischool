import { defineDrawing } from "../drawing";
import { drawDie } from "./dice";

export const die = defineDrawing({
    id: "die",
    family: "sport",
    title: "A die",
    group: "Props",
    about: "One die with its pips in the standard patterns, drawn at rest or part way through a roll: tipping over an edge with the face going down and the next face coming up, and turned flat on the table. The faces it passes through are ones a real die shows beside each other.",
    params: { face: 5, roll: 0, turn: 0 },
    settings: {
        face: { kind: "whole", min: 1, max: 6 },
        roll: { kind: "number", min: -4, max: 4, step: 0.1 },
        turn: { kind: "number", min: -180, max: 180, step: 1 },
    },
    takes: [
        { label: "Five, at rest", params: { face: 5, roll: 0, turn: 0 } },
        { label: "Tipping over an edge", params: { face: 3, roll: 0.3, turn: 14 } },
        { label: "Landed turned", params: { face: 6, roll: 0, turn: -24 } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p) => {
        drawDie(c, 20, 20, 34, p.face, p.roll, p.turn);
        return { centre: [20, 20, "up"], top: [20, 5, "up"] };
    },
    describe: (p) =>
        `One white die with rounded corners and black pips in the usual patterns, seen from above ${p.roll - Math.round(p.roll) === 0 ? "at rest on the table" : "tipping over one edge part way through a roll"}${p.turn ? ", turned on the table" : ""}.`,
});
