import { roundedRect } from "../../ink/pen";
import { letter } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { bubbleTail } from "../speech";

export const speechBubble = defineDrawing({
    id: "bubble",
    family: "page",
    title: "Speech bubble",
    group: "Characters",
    about: "What the guide says. The tail points at whatever the scene attaches it to.",
    params: {
        lines: ["Count the empty", "squares."],
        width: 10,
        tail: [40, 130] as [number, number] | null,
    },
    settings: {
        lines: { kind: "words", most: 4 },
        width: { kind: "whole", min: 4, max: 16 },
        tail: { kind: "fixed" },
    },
    takes: [
        {
            label: "Two lines",
            params: { lines: ["Count the empty", "squares."], width: 10, tail: [40, 130] },
        },
        {
            label: "One line, no tail",
            params: { lines: ["Try the next one."], width: 9, tail: null },
        },
        {
            label: "Three lines",
            params: {
                lines: ["Start with the biggest", "coin, then count on", "in ones."],
                width: 13,
                tail: [30, 160],
            },
        },
    ],
    box: (p) => ({ w: p.width, h: p.lines.length * 2 + 2 }),
    draw: (c, p) => {
        const w = p.width * U;
        const h = (p.lines.length * 2 + 2) * U;
        c.pen.path(c.g, roundedRect(2, 2, w - 4, h - 4, 16), "pencil", c.pen.fill("card"), {
            strokeWidth: 1.8,
        });
        p.lines.forEach((line, i) => {
            letter(c, {
                x: 16,
                y: 34 + i * 2 * U,
                s: line,
                face: "read",
                weight: 600,
                size: 17,
                fill: c.t.ink,
                anchor: "start",
            });
        });
        // in a scene the tail is drawn afterwards, once the scene knows where the speaker ended up
        if (p.tail) bubbleTail(c, { x: 0, y: 0, w, h }, p.tail);
        return { tail: [w * 0.25, h, "down"] };
    },
    describe: (p) =>
        `A speech bubble with rounded corners${p.tail ? " and a short tail pointing at the speaker" : ""}, holding what the guide says in the reading face.`,
});
