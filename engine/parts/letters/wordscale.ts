import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { MARKERS, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { ghost, say, soft } from "../lettering";

interface WordScaleParams {
    words: string[];
    blank: number;
    low: string;
    high: string;
    color: Marker;
}

export const wordScale = defineDrawing<WordScaleParams>({
    id: "wordscale",
    family: "letters",
    title: "Shades of meaning",
    group: "Structures",
    about: "Words that mean nearly the same thing set in order along a wedge that grows from a little to a lot: cool, warm, hot, boiling. One card can be left empty, so the child places a word by how strong it is, which is what choosing the right word means.",
    params: {
        words: ["cool", "warm", "hot", "boiling"],
        blank: -1,
        low: "a little",
        high: "a lot",
        color: "tang",
    },
    settings: {
        words: { kind: "words", most: 6 },
        blank: { kind: "whole", min: -1, max: 5 },
        low: { kind: "text", most: 12 },
        high: { kind: "text", most: 12 },
        color: { kind: "one of", of: MARKERS },
    },
    takes: [
        {
            label: "Cool to boiling",
            params: {
                words: ["cool", "warm", "hot", "boiling"],
                blank: -1,
                low: "a little",
                high: "a lot",
                color: "tang",
            },
        },
        {
            label: "A word to place",
            params: {
                words: ["tiny", "small", "big", "huge"],
                blank: 1,
                low: "smallest",
                high: "biggest",
                color: "sky",
            },
        },
    ],
    box: (p) => {
        const cw = Math.max(4, Math.ceil(Math.max(0, ...p.words.map((w) => w.length)) * 0.62) + 2);
        return { w: Math.max(1, p.words.length) * (cw + 1) + 1, h: 7 };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const cw = Math.max(4, Math.ceil(Math.max(0, ...p.words.map((w) => w.length)) * 0.62) + 2),
            W = (Math.max(1, p.words.length) * (cw + 1) + 1) * U;
        pen.polygon(
            g,
            [
                [0.5 * U, 4.55 * U],
                [W - 0.5 * U, 3.7 * U],
                [W - 0.5 * U, 5.5 * U],
                [0.5 * U, 4.75 * U],
            ],
            "pencil",
            pen.fill(p.color),
            { strokeWidth: 1.8 },
        );
        p.words.forEach((word, i) => {
            const x = (1 + i * (cw + 1)) * U,
                mid = x + (cw * U) / 2;
            pen.line(g, mid, 2.7 * U, mid, 3.9 * U, "ruler", {
                strokeWidth: 1.2,
                strokeLineDash: [4, 4],
                stroke: c.t["ink-soft"],
            });
            if (i === p.blank) ghost(c, roundedRect(x, 0.4 * U, cw * U, 2.3 * U, 7), "ruler");
            else {
                pen.path(
                    g,
                    roundedRect(x, 0.4 * U, cw * U, 2.3 * U, 7),
                    "ruler",
                    pen.fill("card"),
                    { strokeWidth: 1.8 },
                );
                say(c, mid, 2 * U, word, 20);
            }
            a[`word(${i})`] = [mid, 0.4 * U, "up"];
        });
        soft(c, 0.5 * U, 6.5 * U, p.low, 13, "start");
        soft(c, W - 0.5 * U, 6.5 * U, p.high, 13, "end");
        return a;
    },
    describe: () =>
        "Words of nearly the same meaning on cards along a wedge that grows from thin to thick, a little written at one end and a lot at the other.",
});
