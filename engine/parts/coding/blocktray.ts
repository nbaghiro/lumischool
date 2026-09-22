import { letter, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import {
    kindOfLine,
    labelWidth,
    BLOCK_H,
    blockPath,
    cPath,
    blockBody,
    blockLabel,
} from "./listing";

/** One place in a tray: as wide as its widest block, plus the letter. */
const trayCell = (code: readonly string[], words: boolean): number =>
    Math.max(5, ...code.map((l) => Math.ceil((labelWidth(l, words) + 44) / U))) + 2;

export const blockTray = defineDrawing({
    id: "blocktray",
    family: "coding",
    title: "Blocks to choose from",
    group: "Structures",
    about: "The blocks a child may use, laid out like a tray, each with a letter so a printed question can ask which one goes in the gap. On screen the same blocks are the ones the child drags into a program.",
    params: { code: ["right 1", "down 1", "repeat 2"], letters: true, words: true, per: 3 },
    settings: {
        code: { kind: "words", most: 12 },
        letters: { kind: "flag" },
        words: { kind: "flag" },
        per: { kind: "whole", min: 1, max: 6 },
    },
    takes: [
        {
            label: "Four arrows, lettered",
            params: {
                code: ["right 1", "down 1", "left 1", "up 1"],
                letters: true,
                words: true,
                per: 2,
            },
        },
        {
            label: "Forward, turns and a repeat",
            params: {
                code: ["forward 1", "turn left", "turn right", "repeat 2"],
                letters: false,
                words: true,
                per: 2,
            },
        },
    ],
    box: (p) => {
        const per = Math.max(1, Math.round(p.per)),
            cw = trayCell(p.code, p.words);
        return {
            w: Math.max(1, Math.min(per, p.code.length)) * cw + 1,
            h: Math.ceil(p.code.length / per) * 3 + 1,
        };
    },
    draw: (c, p) => {
        const a: RawAnchors = {},
            per = Math.max(1, Math.round(p.per)),
            cw = trayCell(p.code, p.words);
        p.code.forEach((line, i) => {
            const x = (0.5 + (i % per) * cw + (p.letters ? 1.4 : 0)) * U,
                y = (0.5 + Math.floor(i / per) * 3) * U;
            const w = Math.max(4, Math.ceil((labelWidth(line, p.words) + 44) / U)) * U,
                k = kindOfLine(line);
            if (p.letters) {
                c.pen.circle(c.g, x - 0.8 * U, y + U, 1.2 * U, "ruler", c.pen.fill("card"), {
                    strokeWidth: 1.4,
                });
                letter(c, {
                    x: x - 0.8 * U,
                    y: y + U + 5,
                    s: "ABCDEFGHIJ"[i] ?? "?",
                    face: "read",
                    weight: 700,
                    size: 14,
                    fill: c.t.ink,
                    anchor: "middle",
                });
            }
            const d =
                k === "control"
                    ? cPath(
                          x,
                          y,
                          w,
                          U,
                          y + BLOCK_H * U,
                          y + BLOCK_H * U + 0.6 * U,
                          Math.min(w, 5 * U),
                          0.6 * U,
                      )
                    : blockPath(x, y, w, BLOCK_H * U, { notch: true, tab: true });
            blockBody(c, d, k, x, y, BLOCK_H * U);
            blockLabel(c, x, y, line, p.words);
            a[`block(${i})`] = [x + w / 2, y, "up"];
        });
        return a;
    },
    describe: (p) =>
        `The blocks a child may use laid out in a tray in rows, each a coloured block ${p.letters ? "with its picture and its letter beside it" : "with its picture on it"}.`,
});
