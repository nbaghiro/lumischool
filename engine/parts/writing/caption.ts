import { plain, group } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { writeLine } from "./lines";

export const caption = defineDrawing({
    id: "caption",
    family: "writing",
    title: "Caption strip",
    group: "Inputs",
    about: "A strip of paper taped under a picture, with the caption written on it or a line to write one. Placed under any drawing in a scene, it turns a picture into something that has been written about.",
    params: { text: "", width: 14 },
    settings: { text: { kind: "text", most: 60 }, width: { kind: "whole", min: 8, max: 30 } },
    takes: [
        { label: "Empty", params: { text: "", width: 14 } },
        { label: "Written", params: { text: "The boat is in the harbour.", width: 17 } },
    ],
    box: (p) => ({ w: p.width, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = p.width * U;
        pen.path(
            g,
            roundedRect(0.3 * U, 0.4 * U, w - 0.6 * U, 2.2 * U, 4),
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.6 },
        );
        for (const x of [0.2 * U, w - 1.6 * U]) {
            const tape = group(c, { turn: [["rotate", x < w / 2 ? -8 : 8, x + 0.7 * U, 0.5 * U]] });
            plain(tape, {
                kind: "rect",
                x,
                y: 0.15 * U,
                w: 1.4 * U,
                h: 0.7 * U,
                fill: c.paper ? "#E6E6E6" : "#F1E3AFCC",
            });
        }
        if (p.text) say(c, w / 2, 2.05 * U, p.text, 17);
        else writeLine(c, 1 * U, 2.1 * U, w - 2 * U);
        return { strip: [w / 2, 0.4 * U, "up"] };
    },
    describe: (p) =>
        `A strip of paper taped at both corners under a picture, ${p.text ? "with a caption written along it" : "with a ruled line to write a caption on"}.`,
});
