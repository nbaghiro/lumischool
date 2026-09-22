import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { note } from "../marks";

export const noteCard = defineDrawing({
    id: "note",
    family: "page",
    title: "Teacher's note",
    group: "Marks",
    about: "A taped note in the teacher's pen. In an item it carries `solution`, so it stays on the answer key.",
    params: { lines: ["Start at 0, not", "at the end."], width: 9 },
    settings: { lines: { kind: "words", most: 4 }, width: { kind: "whole", min: 4, max: 16 } },
    takes: [
        { label: "Two lines", params: { lines: ["Start at 0, not", "at the end."], width: 9 } },
        { label: "One line", params: { lines: ["Count on in tens."], width: 8 } },
    ],
    box: (p) => ({ w: p.width, h: p.lines.length + 2 }),
    draw: (c, p) => {
        note(c, 4, U, p.width * U - 8, p.lines);
        return { tape: [(p.width * U) / 2, U - 9, "up"] };
    },
    describe: () =>
        "A small card taped to the page at its top edge, with a note written on it in the teacher's blue handwriting.",
});
