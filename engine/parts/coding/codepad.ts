import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, penned, soft } from "../lettering";
import { highlight } from "../marks";
import { lineOf } from "../../coding";
import {
    kindOfLine,
    labelWidth,
    BLOCK_H,
    blockPath,
    cPath,
    blockBody,
    blockLabel,
} from "./listing";

const padSlotW = (tray: readonly string[], words: boolean): number =>
    Math.max(9, ...tray.map((l) => Math.ceil((labelWidth(l, words) + 44) / U) + 3));

const padWidth = (tray: readonly string[], words: boolean): number =>
    Math.max(padSlotW(tray, words) + 3, 16);

/** The squares a pad's tray takes above its slots: its label, and two and a half a row of blocks. */
const padTrayH = (rows: number): number => (rows ? Math.ceil(rows * 2.5 + 1.6) : 0);

/** Where each block of a pad's tray sits, wrapping inside the pad's width, in squares. */
function padTray(
    tray: readonly string[],
    words: boolean,
): { at: [number, number][]; rows: number } {
    const maxX = padWidth(tray, words) - 0.5,
        at: [number, number][] = [];
    let x = 0.5,
        row = 0;
    for (const line of tray) {
        const w = Math.max(4, Math.ceil((labelWidth(line, words) + 44) / U));
        if (x + w > maxX && x > 0.5) {
            x = 0.5;
            row++;
        }
        at.push([x, row]);
        x += w + 0.6;
    }
    return { at, rows: tray.length ? row + 1 : 0 };
}

/** Where a pad's tray blocks and slots are, in the drawing's own units, so an editor can lay its hands on them. */
export function padLayout(p: { tray: readonly string[]; words: boolean; lines: number }): {
    tray: { x: number; y: number; w: number; h: number }[];
    slots: { x: number; y: number; w: number; h: number }[];
} {
    const t = padTray(p.tray, p.words),
        slotW = padSlotW(p.tray, p.words);
    const tray = p.tray.map((line, i) => {
        const [tx, tr] = t.at[i] ?? [0, 0];
        return {
            x: tx * U,
            y: (1.6 + tr * 2.5) * U,
            w: Math.max(4, Math.ceil((labelWidth(line, p.words) + 44) / U)) * U,
            h: BLOCK_H * U,
        };
    });
    const top = (0.5 + padTrayH(t.rows)) * U;
    const slots = Array.from({ length: Math.max(1, Math.round(p.lines)) }, (_, i) => ({
        x: 2 * U,
        y: top + i * 2 * U,
        w: slotW * U,
        h: 2 * U,
    }));
    return { tray, slots };
}

/** A key written on one line, "right 2, repeat 3 (up 1, right 1)", back into lines with their depth. */
export function linesFromKey(s: string): { text: string; depth: number }[] {
    const out: { text: string; depth: number }[] = [];
    let depth = 0,
        word = "";
    const flush = () => {
        if (word.trim()) out.push({ text: word.trim(), depth });
        word = "";
    };
    for (const ch of s) {
        if (ch === "(") {
            flush();
            depth++;
        } else if (ch === ")") {
            flush();
            depth = Math.max(0, depth - 1);
        } else if (ch === ",") flush();
        else word += ch;
    }
    flush();
    return out;
}

export const codePad = defineDrawing({
    id: "codepad",
    family: "coding",
    title: "Where a program is written",
    group: "Inputs",
    about: "Empty slots, one for each block of a program a child writes to solve a puzzle, numbered down the side, with the blocks they may use along the top. On paper the child draws or writes a block in each slot; on screen the slots become the place the blocks are dragged to. `style=lines` gives ruled lines instead, for a child who writes a program out in words, and `once` makes the tray a set of cards to put in order, each used once as it is. The answer key writes a program that works into the slots in the teacher's pen.",
    params: {
        lines: 5,
        tray: ["right 1", "down 1", "left 1", "up 1"],
        style: "blocks",
        words: true,
        once: false,
        written: "",
        key: [] as string[],
        placed: [] as string[],
        sel: 0,
        used: [] as number[],
        run: 0,
    },
    settings: {
        lines: { kind: "whole", min: 1, max: 12 },
        tray: { kind: "words", most: 12 },
        style: { kind: "one of", of: ["blocks", "lines"] },
        words: { kind: "flag" },
        once: { kind: "flag" },
        written: { kind: "text", most: 200 },
        key: { kind: "words", most: 12 },
        placed: { kind: "words", most: 12 },
        sel: { kind: "whole", min: 0, max: 12 },
        used: { kind: "numbers", min: 0, max: 12, most: 12 },
        run: { kind: "whole", min: 0, max: 12 },
    },
    takes: [
        {
            label: "Five slots and four arrows",
            params: {
                lines: 5,
                tray: ["right 1", "down 1", "left 1", "up 1"],
                style: "blocks",
                words: true,
                once: false,
                written: "",
                key: [],
                placed: [],
                sel: 0,
                used: [],
                run: 0,
            },
        },
        {
            label: "Answered in pen",
            params: {
                lines: 4,
                tray: ["forward 1", "turn right", "repeat 2"],
                style: "blocks",
                words: true,
                once: false,
                written: "repeat 4 (forward 2, turn right)",
                key: [],
                placed: [],
                sel: 0,
                used: [],
                run: 0,
            },
        },
        {
            label: "Placed on screen, one chosen",
            params: {
                lines: 4,
                tray: ["forward 1", "turn right", "repeat 2"],
                style: "blocks",
                words: true,
                once: false,
                written: "",
                key: [],
                placed: ["repeat 4", "  forward 2", "  turn right"],
                sel: 2,
                used: [],
                run: 3,
            },
        },
        {
            label: "Lines to write on",
            params: {
                lines: 4,
                tray: [],
                style: "lines",
                words: true,
                once: false,
                written: "",
                key: [],
                placed: [],
                sel: 0,
                used: [],
                run: 0,
            },
        },
    ],
    box: (p) => {
        const t = padTray(p.tray, p.words);
        return {
            w: padWidth(p.tray, p.words),
            h: padTrayH(t.rows) + Math.max(1, Math.round(p.lines)) * 2 + 1,
        };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const slotW = padSlotW(p.tray, p.words),
            n = Math.max(1, Math.round(p.lines)),
            t = padTray(p.tray, p.words);
        let y = 0.5 * U;
        if (t.rows) {
            cap(c, 0.5 * U, y + 0.6 * U, "blocks to use", 11, "start");
            p.tray.forEach((line, i) => {
                const [tx, tr] = t.at[i] ?? [0, 0],
                    x = tx * U,
                    ty = y + 1.1 * U + tr * 2.5 * U;
                const w = Math.max(4, Math.ceil((labelWidth(line, p.words) + 44) / U)) * U,
                    k = kindOfLine(line);
                const d =
                    k === "control"
                        ? cPath(
                              x,
                              ty,
                              w,
                              U,
                              ty + BLOCK_H * U,
                              ty + BLOCK_H * U + 0.3 * U,
                              Math.min(w, 4 * U),
                              0.3 * U,
                          )
                        : blockPath(x, ty, w, BLOCK_H * U, { notch: true, tab: true });
                const usedUp = p.used.includes(i);
                blockBody(c, d, k, x, ty, BLOCK_H * U, usedUp);
                if (!usedUp) blockLabel(c, x, ty, line, p.words);
            });
            y += padTrayH(t.rows) * U;
        }
        const written = linesFromKey(p.written);
        const placed = p.placed.map((t2, i) => lineOf(t2, i + 1));
        for (let i = 0; i < n; i++) {
            const sy = y + i * 2 * U,
                x = 2 * U;
            soft(c, 1.5 * U, sy + U + 5, String(i + 1), 13, "end");
            const here = placed[i];
            if (i + 1 === p.run)
                highlight(c, x - 0.2 * U, sy + U, x + (slotW + 0.2) * U, sy + U, 36);
            if (here && here.text) {
                // a block the child has put here, set in by its depth, with a bar down the side of what a
                // repeat or an if holds, which is how a C block reads when each block has a slot of its own
                const bx = x + here.depth * U,
                    bw = Math.max(4, Math.ceil((labelWidth(here.text, p.words) + 44) / U)) * U,
                    k = kindOfLine(here.text);
                blockBody(
                    c,
                    blockPath(bx, sy + 0.1 * U, bw, 1.8 * U, { notch: true, tab: true }),
                    k,
                    bx,
                    sy + 0.1 * U,
                    1.8 * U,
                );
                blockLabel(c, bx, sy - 0.1 * U, here.text, p.words);
                let j = i + 1;
                while ((placed[j]?.depth ?? -1) > here.depth) j++;
                if (j > i + 1 && (k === "control" || k === "else"))
                    pen.rect(
                        g,
                        bx + 0.15 * U,
                        sy + 1.9 * U,
                        0.55 * U,
                        (j - i - 1) * 2 * U,
                        "ruler",
                        pen.fill("tang"),
                        { strokeWidth: 1 },
                    );
            } else if (p.style === "lines")
                pen.line(g, x, sy + 1.7 * U, x + slotW * U, sy + 1.7 * U, "ruler", {
                    strokeWidth: 1.3,
                    stroke: c.t["ink-soft"],
                });
            else
                pen.path(
                    g,
                    blockPath(x, sy + 0.15 * U, slotW * U, 1.7 * U, {
                        notch: i > 0,
                        tab: i < n - 1,
                    }),
                    "ruler",
                    null,
                    { strokeWidth: 1.4, strokeLineDash: [6, 5], stroke: c.t["ink-soft"] },
                );
            if (i + 1 === p.sel)
                pen.path(
                    g,
                    roundedRect(x - 0.35 * U, sy - 0.15 * U, (slotW + 0.7) * U, 2.3 * U, 9),
                    "pencil",
                    null,
                    { strokeWidth: 3, stroke: c.t.pen },
                );
            const wl = written[i];
            if (wl && !(here && here.text))
                penned(c, x + 0.6 * U + wl.depth * U, sy + 1.35 * U, wl.text, 17, "start");
            a[`slot(${i + 1})`] = [x + (slotW * U) / 2, sy, "up"];
        }
        return a;
    },
    describe: (p) =>
        `${p.style === "lines" ? "Ruled lines" : "Empty slots"} numbered down a pad, one for each block of a program to write, with the blocks a child may use along the top.`,
});
