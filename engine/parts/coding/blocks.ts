import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";
import { lineOf, type Line } from "../../coding";
import {
    type Kind,
    kindOfLine,
    arrowIcon,
    bug,
    labelWidth,
    BLOCK_H,
    blockPath,
    cPath,
    blockBody,
    blockLabel,
} from "./listing";

interface BlockRow {
    line: Line;
    kind: Kind;
    /** Squares in from the left, one for each C the block sits inside. */
    indent: number;
    /** Top of the row, in squares. */
    y: number;
    w: number;
    /** For the head of a C: where its mouth ends, and the rows of an otherwise. */
    shape: "block" | "hat" | "c-head" | "c-else" | "c-foot" | "blank";
}

/** Where each block goes: hats hang their scripts, C blocks hold the lines further in than them. */
function layBlocks(
    code: readonly string[],
    words: boolean,
    blank: number,
): { rows: BlockRow[]; w: number; h: number } {
    const lines = code.map((t, i) => lineOf(t, i + 1));
    const rows: BlockRow[] = [];
    let y = 0;
    const widthOf = (l: Line, k: Kind) =>
        Math.max(
            k === "control" || k === "event" || k === "proc" ? 5 : 4,
            Math.ceil((labelWidth(l.text, words) + 44) / U),
        );
    // A stack of open Cs: the depth they were written at, and how far in their contents are drawn.
    const open: { depth: number; indent: number; head: BlockRow; kind: Kind; held: number }[] = [];
    const close = (depth: number) => {
        while (open.length && (open[open.length - 1]?.depth ?? 0) >= depth) {
            const c = open.pop();
            if (!c) break;
            // an empty mouth keeps a square of room, so it reads as a place a block can go
            if (!c.held) y += 1;
            rows.push({
                line: c.head.line,
                kind: c.kind,
                indent: c.indent,
                y,
                w: Math.max(4, Math.min(c.head.w, 6)),
                shape: "c-foot",
            });
            y += 1;
        }
    };
    for (const l of lines) {
        const k = l.n === blank ? "blank" : kindOfLine(l.text);
        if (k === "else") {
            // otherwise belongs to the if written at its own depth
            close(l.depth + 1);
            const c = open[open.length - 1];
            if (c && c.depth === l.depth) {
                if (!c.held) y += 1;
                c.held = 0;
                rows.push({
                    line: l,
                    kind: "else",
                    indent: c.indent,
                    y,
                    w: Math.max(5, widthOf(l, k)),
                    shape: "c-else",
                });
                y += BLOCK_H;
                continue;
            }
        }
        close(l.depth);
        const last = open[open.length - 1];
        if (last) last.held++;
        const indent = last ? last.indent + 1 : 0;
        const w = widthOf(l, k);
        if (k === "event" || (k === "proc" && /^(define|to)\b/i.test(l.text.trim()))) {
            rows.push({ line: l, kind: k, indent: 0, y, w, shape: "hat" });
            y += BLOCK_H + 0.4;
            continue;
        }
        const row: BlockRow = {
            line: l,
            kind: k,
            indent,
            y,
            w,
            shape: k === "blank" ? "blank" : k === "control" ? "c-head" : "block",
        };
        rows.push(row);
        y += BLOCK_H;
        if (k === "control") open.push({ depth: l.depth, indent, head: row, kind: k, held: 0 });
    }
    close(-1);
    const w = Math.max(4, ...rows.map((r) => r.indent + r.w));
    return { rows, w, h: y };
}

export const blocks = defineDrawing({
    id: "blocks",
    family: "coding",
    title: "A program in blocks",
    group: "Structures",
    about: "A program as blocks that click together: moves in blue, the pen and paint in pink, sounds and dances in green, repeats and ifs in orange that hold the blocks inside them, and a when block on top that says what starts it. `run` rings the block running now, `wrong` marks the one with the bug, and `blank` leaves one empty for a child to fill in on paper. With `words` off, a block is only its picture and its number, for a child who cannot read yet.",
    params: {
        code: ["when the flag is tapped", "repeat 3", "  right 2", "  up 1", "paint red"],
        words: true,
        numbers: false,
        run: 0,
        wrong: 0,
        blank: 0,
    },
    settings: {
        code: { kind: "words", most: 12 },
        words: { kind: "flag" },
        numbers: { kind: "flag" },
        run: { kind: "whole", min: 0, max: 12 },
        wrong: { kind: "whole", min: 0, max: 12 },
        blank: { kind: "whole", min: 0, max: 12 },
    },
    takes: [
        {
            label: "A flag, a repeat and paint",
            params: {
                code: ["when the flag is tapped", "repeat 3", "  right 2", "  up 1", "paint red"],
                words: true,
                numbers: false,
                run: 0,
                wrong: 0,
                blank: 0,
            },
        },
        {
            label: "Pictures and numbers only",
            params: {
                code: ["right 2", "down 1", "right 1", "up 2"],
                words: false,
                numbers: false,
                run: 0,
                wrong: 0,
                blank: 0,
            },
        },
        {
            label: "Running line 3",
            params: {
                code: ["right 2", "down 1", "right 1", "up 2"],
                words: true,
                numbers: true,
                run: 3,
                wrong: 0,
                blank: 0,
            },
        },
        {
            label: "If and otherwise, one wrong",
            params: {
                code: [
                    "repeat until at flag",
                    "  if wall ahead",
                    "    turn right",
                    "  otherwise",
                    "    forward 1",
                ],
                words: true,
                numbers: true,
                run: 0,
                wrong: 3,
                blank: 0,
            },
        },
        {
            label: "A gap to fill",
            params: {
                code: ["repeat 4", "  forward 3", "  turn right"],
                words: true,
                numbers: true,
                run: 0,
                wrong: 0,
                blank: 3,
            },
        },
    ],
    box: (p) => {
        const l = layBlocks(p.code, p.words, p.blank);
        return { w: Math.ceil(l.w + (p.numbers ? 2 : 0) + 1.5), h: Math.ceil(l.h + 1) };
    },
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c;
        const lay = layBlocks(p.code, p.words, p.blank),
            ox = (p.numbers ? 2 : 0.5) * U,
            oy = 0.5 * U;
        const heads = new Map<number, { row: BlockRow; elses: BlockRow[]; foot?: BlockRow }>();
        const stack: BlockRow[] = [];
        for (const r of lay.rows) {
            if (r.shape === "c-head") {
                heads.set(r.line.n, { row: r, elses: [] });
                stack.push(r);
            } else if (r.shape === "c-else") {
                const top = stack[stack.length - 1];
                if (top) heads.get(top.line.n)?.elses.push(r);
            } else if (r.shape === "c-foot") {
                const top = stack.pop();
                if (top) {
                    const h = heads.get(top.line.n);
                    if (h) h.foot = r;
                }
            }
        }
        // Cs first, outermost first, so the blocks inside them are drawn on top of their mouths.
        for (const { row, elses, foot } of [...heads.values()].sort(
            (x, y) => x.row.indent - y.row.indent,
        )) {
            if (!foot) continue;
            const x = ox + row.indent * U,
                y = oy + row.y * U,
                arm = U;
            const mouthTop = y + BLOCK_H * U,
                mouthBottom = oy + foot.y * U;
            const elseRows = elses.map(
                (e) =>
                    [oy + e.y * U, oy + (e.y + BLOCK_H) * U, e.w * U] as [number, number, number],
            );
            blockBody(
                c,
                cPath(x, y, row.w * U, arm, mouthTop, mouthBottom, foot.w * U, U, elseRows),
                "control",
                x,
                y,
                (foot.y + 1 - row.y) * U,
            );
            blockLabel(c, x, y, row.line.text, p.words);
            for (const e of elses) blockLabel(c, x, oy + e.y * U, e.line.text, p.words);
        }
        for (const r of lay.rows) {
            const x = ox + r.indent * U,
                y = oy + r.y * U,
                h = BLOCK_H * U;
            if (r.shape === "block" || r.shape === "blank") {
                blockBody(
                    c,
                    blockPath(x, y, r.w * U, h, { notch: true, tab: true }),
                    r.kind,
                    x,
                    y,
                    h,
                    r.shape === "blank",
                );
                if (r.shape === "block") blockLabel(c, x, y, r.line.text, p.words);
            } else if (r.shape === "hat") {
                blockBody(
                    c,
                    blockPath(x, y, r.w * U, h + 4, { notch: false, tab: true, hat: true }),
                    r.kind,
                    x,
                    y + 4,
                    h,
                );
                blockLabel(c, x, y + 4, r.line.text, p.words);
            }
            if (r.shape !== "c-foot") {
                a[`line(${r.line.n})`] = [x + (r.w * U) / 2, y, "up"];
                if (p.numbers) soft(c, ox - 0.7 * U, y + h / 2 + 5, String(r.line.n), 13, "end");
            }
            if (r.shape !== "c-foot" && r.line.n === p.run) {
                pen.path(g, roundedRect(x - 4, y - 3, r.w * U + 8, h + 6, 9), "pencil", null, {
                    strokeWidth: 3,
                    stroke: c.paper ? c.t.ink : c.t.pen,
                });
                arrowIcon(
                    c,
                    x - (p.numbers ? 1.8 * U : 0.2 * U) - 6,
                    y + h / 2,
                    0,
                    12,
                    2.4,
                    c.paper ? c.t.ink : c.t.pen,
                );
            }
            if (r.shape !== "c-foot" && r.line.n === p.wrong) {
                const ux = x + 30,
                    uw = r.w * U - 40,
                    uy = y + h - 5;
                const zig: [number, number][] = [];
                for (let k = 0; k <= Math.floor(uw / 6); k++)
                    zig.push([ux + k * 6, uy + (k % 2 ? 3 : -1)]);
                pen.linear(g, zig, "pencil", {
                    stroke: c.paper ? c.t.ink : "#C2185B",
                    strokeWidth: 1.8,
                });
                bug(c, x + r.w * U + 14, y + h / 2);
            }
        }
        a.program = [ox + (lay.w * U) / 2, oy, "up"];
        return a;
    },
    describe: () =>
        "A program as coloured blocks that click together in a column, a when block on top, the moves, the pen, the sounds and the repeats each in their own colour.",
});
