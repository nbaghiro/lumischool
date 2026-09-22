import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { loop } from "../marks";

export const dayLoop = defineDrawing({
    id: "dayloop",
    family: "page",
    title: "A day looped",
    group: "Marks",
    about: "The pencil loop the teacher's pen draws round a day, filling its box, so a page can ring the day the family is on. It is the same loop the shelf's calendar rings days with, on its own.",
    params: { width: 5, height: 4 },
    settings: {
        width: { kind: "whole", min: 2, max: 12 },
        height: { kind: "whole", min: 2, max: 16 },
    },
    takes: [
        { label: "A day", params: { width: 5, height: 4 } },
        { label: "A narrow day", params: { width: 3, height: 4 } },
        { label: "A wide day", params: { width: 8, height: 3 } },
        { label: "A phone's day", params: { width: 5, height: 15 } },
    ],
    box: (p) => ({ w: p.width, h: p.height }),
    draw: (c, p) => {
        loop(c, (p.width * U) / 2, (p.height * U) / 2, p.width * U - 16, p.height * U - 16);
        return {};
    },
    describe: () =>
        "A loop drawn round the day in the teacher's blue pen, a little rough, as a hand draws it.",
});
