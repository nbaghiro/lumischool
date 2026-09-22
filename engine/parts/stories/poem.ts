import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { numOn, say, wide } from "../lettering";

const GROUPS: Marker[] = ["sky", "berry", "mint", "tang", "glow"];

export const poem = defineDrawing({
    id: "poem",
    family: "stories",
    title: "A poem",
    group: "Structures",
    about: "A short poem set one line to a row, with a lettered tag at the end of each line so lines that rhyme carry the same letter and the same colour, the way a rhyme scheme is written. Dots in the margin can count the beats in each line, and the last word of one line can be left as a gap.",
    params: {
        title: "The kite",
        lines: ["Up goes the kite", "into the blue,", "it pulls on the string", "and I pull too."],
        rhymes: [-1, 0, -1, 0],
        blank: -1,
        beats: [] as number[],
        width: 20,
    },
    settings: {
        title: { kind: "text", most: 30 },
        lines: { kind: "words", most: 8 },
        rhymes: { kind: "numbers", min: -1, max: 7, most: 8 },
        blank: { kind: "whole", min: -1, max: 7 },
        beats: { kind: "numbers", min: 0, max: 8, most: 8 },
        width: { kind: "whole", min: 12, max: 40 },
    },
    takes: [
        {
            label: "Rhymes lettered",
            params: {
                title: "The kite",
                lines: [
                    "Up goes the kite",
                    "into the blue,",
                    "it pulls on the string",
                    "and I pull too.",
                ],
                rhymes: [-1, 0, -1, 0],
                blank: -1,
                beats: [],
                width: 20,
            },
        },
        {
            label: "A rhyme to finish",
            params: {
                title: "Rain",
                lines: [
                    "Tap on the window,",
                    "tap on the door,",
                    "the rain wants to come in",
                    "and dance on the floor.",
                ],
                rhymes: [-1, 0, -1, 0],
                blank: 3,
                beats: [2, 2, 3, 2],
                width: 21,
            },
        },
    ],
    box: (p) => ({ w: p.width, h: Math.max(1, p.lines.length) * 2 + (p.title ? 3 : 1) + 1 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            h = Math.max(1, p.lines.length) * 2 + (p.title ? 3 : 1) + 1;
        pen.path(
            g,
            roundedRect(0.4 * U, 0.4 * U, (p.width - 0.8) * U, (h - 0.8) * U, 10),
            "ruler",
            pen.fill("card"),
            { strokeWidth: 2 },
        );
        const x0 = (p.beats.length ? 2.8 : 1.3) * U,
            y0 = (p.title ? 4 : 2) * U;
        if (p.title) {
            say(c, x0, 2 * U, p.title, 20, "start");
            pen.line(g, x0, 2.5 * U, x0 + wide(p.title, 20) + 6, 2.5 * U, "pencil", {
                strokeWidth: 1.4,
                stroke: c.t["ink-soft"],
            });
        }
        p.lines.forEach((line, i) => {
            const y = y0 + i * 2 * U;
            const beats = Math.max(0, Math.min(6, Math.round(p.beats[i] ?? 0)));
            for (let k = 0; k < beats; k++)
                pen.circle(
                    g,
                    0.9 * U + k * 0.36 * U,
                    y - 0.35 * U,
                    5,
                    "ruler",
                    { fill: c.t.ink, fillStyle: "solid" },
                    { strokeWidth: 0.5 },
                );
            if (i === p.blank) {
                const m = /^(.*?)(\S+?)([.,!?;:]*)$/.exec(line.trim());
                const before = m ? (m[1] ?? "") : "",
                    last = m ? (m[2] ?? "") : line,
                    tail = m ? (m[3] ?? "") : "";
                say(c, x0, y, before, 18, "start");
                const gx = x0 + wide(before, 18) + 4,
                    gw = Math.max(3 * U, wide(last, 18) + 16);
                pen.line(g, gx, y + 5, gx + gw, y + 5, "ruler", { strokeWidth: 2 });
                if (tail) say(c, gx + gw + 3, y, tail, 18, "start");
                a.gap = [gx + gw / 2, y + 5, "down"];
            } else say(c, x0, y, line, 18, "start");
            const group = Math.round(p.rhymes[i] ?? -1);
            if (group >= 0) {
                const tx = (p.width - 1.2) * U,
                    ty = y - 0.35 * U;
                pen.circle(g, tx, ty, 1.2 * U, "ruler", pen.fill(GROUPS[group % GROUPS.length]), {
                    strokeWidth: 1.4,
                });
                numOn(c, tx, ty + 5.5, "ABCDE"[group % 5] ?? "", 14);
            }
            a[`line(${i + 1})`] = [x0, y - 0.9 * U, "up"];
        });
        return a;
    },
    describe: () =>
        "A short poem set one line to a row on a page with a title, a lettered tag at the end of each line for the rhymes.",
});
