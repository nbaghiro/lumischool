import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, soft } from "../lettering";

export const writingFrame = defineDrawing({
    id: "writingframe",
    family: "writing",
    title: "Frame to write in",
    group: "Inputs",
    about: "Boxes across the page with a prompt over each one and ruled lines inside, for a plan or a piece a grown-up marks. It exists so that the page can collect real writing and still look like the rest of the shelf, and so the sheet can say plainly who the marker is.",
    params: { prompts: ["First", "Next", "Last"], lines: 2, width: 34, note: "" },
    settings: {
        prompts: { kind: "words", most: 6 },
        lines: { kind: "whole", min: 1, max: 6 },
        width: { kind: "whole", min: 12, max: 40 },
        note: { kind: "text", most: 40 },
    },
    takes: [
        {
            label: "First, next, last",
            params: { prompts: ["First", "Next", "Last"], lines: 2, width: 34, note: "" },
        },
        {
            label: "Four prompts, one line each",
            params: {
                prompts: ["Who", "Where", "What happened", "How it ended"],
                lines: 1,
                width: 34,
                note: "",
            },
        },
    ],
    box: (p) => ({ w: p.width, h: p.lines * 2 + 5 + (p.note ? 2 : 0) }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const n = Math.max(1, p.prompts.length);
        const cw = (p.width - 1) / n;
        p.prompts.forEach((prompt, i) => {
            const x = (0.5 + i * cw) * U,
                bw = (cw - 0.6) * U;
            cap(c, x + bw / 2, 1.2 * U, prompt, 12);
            pen.path(
                g,
                roundedRect(x, 1.8 * U, bw, (p.lines * 2 + 2) * U, 8),
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.8 },
            );
            for (let k = 0; k < p.lines; k++) {
                const base = (3.8 + k * 2) * U;
                pen.line(g, x + 10, base, x + bw - 10, base, "ruler", {
                    strokeWidth: 1,
                    stroke: c.t["ink-soft"],
                });
            }
            a[`box(${i})`] = [x + bw / 2, 1.8 * U, "up"];
        });
        if (p.note) soft(c, (p.width * U) / 2, (p.lines * 2 + 4.8) * U, p.note, 13);
        return a;
    },
    describe: (p) =>
        `Boxes across the page with a prompt over each one and ruled lines inside to write on${p.note ? ", a note for the marker underneath" : ""}.`,
});
