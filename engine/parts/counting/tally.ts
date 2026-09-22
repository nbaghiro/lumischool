import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** Width in squares: a five is four uprights and a stroke across, then the odd ones. */
const tallyWidth = (count: number): number => {
    const fives = Math.floor(count / 5),
        rest = count % 5;
    return fives * 3 + (rest ? rest * 0.6 + 0.4 : 0);
};

export const tallyMarks = defineDrawing({
    id: "tally",
    family: "counting",
    title: "Tally marks",
    group: "Structures",
    about: "Counted in fives: four uprights and one stroke across, then the odd ones.",
    params: { count: 13 },
    settings: { count: { kind: "whole", min: 0, max: 40 } },
    takes: [
        { label: "13", params: { count: 13 } },
        { label: "5", params: { count: 5 } },
        { label: "7", params: { count: 7 } },
        { label: "19", params: { count: 19 } },
    ],
    box: (p) => ({ w: Math.ceil(tallyWidth(p.count)) + 1, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            fives = Math.floor(p.count / 5),
            rest = p.count % 5;
        const upright = (x: number) => pen.line(g, x, 14, x, 52, "pencil", { strokeWidth: 2.4 });
        for (let f = 0; f < fives; f++) {
            const x0 = 12 + f * 3 * U;
            for (let i = 0; i < 4; i++) upright(x0 + i * 12);
            pen.line(g, x0 - 4, 50, x0 + 40, 16, "pencil", { strokeWidth: 2.4 });
        }
        for (let i = 0; i < rest; i++) upright(12 + fives * 3 * U + i * 12);
        return { end: [12 + tallyWidth(p.count) * U, 14, "up"] };
    },
    describe: () =>
        "Tally marks in ink, strokes in groups of five with the fifth struck through the other four, and the last group unfinished.",
});
