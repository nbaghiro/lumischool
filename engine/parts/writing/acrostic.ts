import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { patch, say } from "../lettering";
import { writeLine } from "./lines";

const ACRO_ROW = 3;

export const acrostic = defineDrawing({
    id: "acrostic",
    family: "writing",
    title: "A poem down the page",
    group: "Inputs",
    about: "A word written downwards, one big letter to a line, and a line to write on after each letter, so every line of the poem starts with the next letter of the word. The shape is the whole rule, so a child can write a poem before they can say what one is.",
    // Spaced so the setting reads as text rather than as a bare word, which lets a question fill it
    // from a parameter; the spaces are dropped when it is drawn.
    params: { word: "S E A", written: [""], width: 24 },
    settings: {
        word: { kind: "text", most: 8 },
        written: { kind: "words", most: 8 },
        width: { kind: "whole", min: 12, max: 40 },
    },
    takes: [
        { label: "SEA, to write", params: { word: "SEA", written: [""], width: 24 } },
        {
            label: "MOON, half written",
            params: { word: "MOON", written: ["Mice look up", "Over the hill", "", ""], width: 24 },
        },
    ],
    box: (p) => ({ w: p.width, h: Math.max(1, p.word.replace(/\s+/g, "").length) * ACRO_ROW + 1 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            letters = p.word.replace(/\s+/g, "").split("");
        letters.forEach((ch, i) => {
            const y = (0.5 + i * ACRO_ROW) * U;
            pen.path(g, roundedRect(0.5 * U, y, 2.4 * U, 2.4 * U, 6), "ruler", pen.fill("mint"), {
                strokeWidth: 1.8,
            });
            patch(c, 1.7 * U, y + 1.2 * U, 28, 30);
            say(c, 1.7 * U, y + 2 * U, ch.toUpperCase(), 30);
            const line = p.written[i] ?? "";
            const rest = line && line[0]?.toLowerCase() === ch.toLowerCase() ? line.slice(1) : line;
            if (rest) say(c, 3.1 * U, y + 1.9 * U, rest, 19, "start");
            else writeLine(c, 3.3 * U, y + 2.2 * U, (p.width - 3.8) * U);
            a[`line(${i})`] = [3.3 * U, y, "up"];
        });
        return a;
    },
    describe: () =>
        "A word written down the page one big letter to a line, with a ruled line to write on beside each letter, each line of the poem starting with it.",
});
