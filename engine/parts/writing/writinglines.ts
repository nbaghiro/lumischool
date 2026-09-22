import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

export const writingLines = defineDrawing({
    id: "writinglines",
    family: "writing",
    title: "Writing lines",
    group: "Inputs",
    about: "Ruled lines to write an answer on, with a dashed middle line so letter heights have somewhere to sit. Two squares to a line, which is the same rhythm as the rest of the page.",
    params: { lines: 3, width: 20, prompt: "" },
    settings: {
        lines: { kind: "whole", min: 1, max: 8 },
        width: { kind: "whole", min: 8, max: 34 },
        prompt: { kind: "text", most: 30 },
    },
    takes: [
        { label: "Three lines", params: { lines: 3, width: 20, prompt: "" } },
        { label: "With a prompt", params: { lines: 2, width: 18, prompt: "Write the word:" } },
        { label: "One line", params: { lines: 1, width: 14, prompt: "" } },
    ],
    box: (p) => ({ w: p.width, h: p.lines * 3 + (p.prompt ? 3 : 1) }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = U / 2,
            w = (p.width - 1) * U,
            a: RawAnchors = {};
        const top = p.prompt ? 2 * U : U / 2;
        if (p.prompt) say(c, x0, U, p.prompt, 17, "start");
        for (let i = 0; i < p.lines; i++) {
            const base = top + (i + 1) * 3 * U - U;
            pen.line(g, x0, base, x0 + w, base, "ruler", { strokeWidth: 1.8 });
            pen.line(g, x0, base - U, x0 + w, base - U, "ruler", {
                strokeWidth: 0.9,
                strokeLineDash: [6, 6],
                stroke: c.t["ink-soft"],
            });
            pen.line(g, x0, base - 2 * U, x0 + w, base - 2 * U, "ruler", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
            a[`line(${i})`] = [x0, base, "left"];
        }
        return a;
    },
    describe: (p) =>
        `${p.lines} ruled lines to write on, two squares apart, each with a dashed middle line for the height of small letters${p.prompt ? ", a prompt written above them" : ""}.`,
});
