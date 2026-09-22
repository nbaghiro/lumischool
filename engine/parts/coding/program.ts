import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { cap, soft } from "../lettering";
import { highlight, loop } from "../marks";
import { lineOf, type Line } from "../../coding";
import { code, KIND_FILL, kindOfLine, arrowIcon, bug } from "./listing";

/** How far in a line of a listing is written, in squares, for its depth. */
const STEP_IN = 1.6;

const progWidth = (lines: Line[], title: string): number =>
    Math.max(
        12,
        Math.ceil(
            Math.max(
                title.length * 0.42 + 3,
                ...lines.map((l) => 4 + l.depth * STEP_IN + l.text.length * 0.5),
            ) + 1.5,
        ),
    );

export const program = defineDrawing({
    id: "program",
    family: "coding",
    title: "A program",
    group: "Structures",
    about: "A program written out as numbered lines, the way a child reads it aloud, with the lines a repeat or an if holds set further in and bracketed. A coloured chip at the start of each line says what kind of block it is, so the listing and the blocks read as the same program. `run` points at the line running now, `wrong` marks the line with the bug, `blank` leaves a line empty to write in, and `mark` loops a line in the teacher's pen.",
    params: {
        code: ["repeat 4", "  forward 3", "  turn right"],
        title: "",
        mark: 0,
        run: 0,
        wrong: 0,
        blank: 0,
    },
    settings: {
        code: { kind: "words", most: 12 },
        title: { kind: "text", most: 30 },
        mark: { kind: "whole", min: 0, max: 12 },
        run: { kind: "whole", min: 0, max: 12 },
        wrong: { kind: "whole", min: 0, max: 12 },
        blank: { kind: "whole", min: 0, max: 12 },
    },
    takes: [
        {
            label: "Three steps",
            params: {
                code: ["right 3", "down 2", "right 1"],
                title: "",
                mark: 0,
                run: 0,
                wrong: 0,
                blank: 0,
            },
        },
        {
            label: "A repeat, running",
            params: {
                code: ["repeat 3", "  right 2", "  up 2"],
                title: "climb",
                mark: 0,
                run: 2,
                wrong: 0,
                blank: 0,
            },
        },
        {
            label: "If and otherwise",
            params: {
                code: ["if the number is more than 5", "  say shout", "otherwise", "  say whisper"],
                title: "what to do",
                mark: 0,
                run: 0,
                wrong: 0,
                blank: 0,
            },
        },
        {
            label: "The line with the bug",
            params: {
                code: ["right 4", "up 4", "left 3", "down 4"],
                title: "draw a square",
                mark: 0,
                run: 0,
                wrong: 3,
                blank: 0,
            },
        },
        {
            label: "A name that changes",
            params: {
                code: ["set n to 4", "add 3 to n", "add 3 to n"],
                title: "",
                mark: 2,
                run: 0,
                wrong: 0,
                blank: 0,
            },
        },
    ],
    box: (p) => {
        const lines = p.code.map((t, i) => lineOf(t, i + 1));
        return { w: progWidth(lines, p.title) + 2, h: lines.length * 2 + (p.title ? 3 : 1) + 1 };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const lines = p.code.map((t, i) => lineOf(t, i + 1));
        const w = progWidth(lines, p.title),
            h = lines.length * 2 + (p.title ? 3 : 1) + 1;
        pen.path(
            g,
            roundedRect(0.4 * U, 0.4 * U, (w + 1.2) * U, (h - 0.8) * U, 10),
            "ruler",
            pen.fill("card"),
            { strokeWidth: 2.2 },
        );
        let top = 1.1 * U;
        if (p.title) {
            cap(c, 1.4 * U, 1.9 * U, p.title, 12, "start");
            pen.line(g, 1.2 * U, 2.5 * U, (w + 0.2) * U, 2.5 * U, "ruler", {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
            });
            top = 3.1 * U;
        }
        const rowY = (i: number) => top + i * 2 * U;
        const textX = (l: Line) => (4 + l.depth * STEP_IN) * U;
        // brackets down the side of what a repeat, an if or a define holds
        lines.forEach((l, i) => {
            const k = kindOfLine(l.text);
            if (!(k === "control" || k === "else" || /^(define|to)\b/i.test(l.text))) return;
            let j = i + 1;
            while ((lines[j]?.depth ?? -1) > l.depth) j++;
            if (j === i + 1) return;
            const bx = textX(l) + 0.35 * U,
                y0 = rowY(i) + 1.7 * U,
                y1 = rowY(j - 1) + 1.5 * U;
            pen.path(g, `M${bx + 0.5 * U} ${y0}H${bx}V${y1}H${bx + 0.5 * U}`, "ruler", null, {
                strokeWidth: 2.2,
                stroke: c.t["ink-soft"],
            });
        });
        lines.forEach((l, i) => {
            const y = rowY(i),
                mid = y + U,
                x = textX(l);
            if (l.n === p.run) {
                highlight(
                    { ...c, t: { ...c.t, glow: c.t.glow } },
                    3.4 * U,
                    mid - 1,
                    (w + 0.6) * U,
                    mid - 1,
                    26,
                );
                arrowIcon(c, 0.95 * U, mid, 0, 12, 2.4, c.paper ? c.t.ink : c.t.pen);
            }
            soft(c, 2.1 * U, mid + 5, String(l.n), 13, "end");
            const k = kindOfLine(l.text);
            if (l.n === p.blank) {
                pen.path(
                    g,
                    roundedRect(
                        x - 0.3 * U,
                        y + 0.3 * U,
                        Math.max(6 * U, (w - x / U) * U),
                        1.5 * U,
                        5,
                    ),
                    "ruler",
                    null,
                    { strokeWidth: 1.5, strokeLineDash: [6, 5], stroke: c.t["ink-soft"] },
                );
            } else {
                if (k !== "blank")
                    pen.rect(
                        g,
                        2.6 * U,
                        mid - 5,
                        10,
                        10,
                        "ruler",
                        k === "vars" ? pen.fill("card") : pen.fill(KIND_FILL[k]),
                        { strokeWidth: 1.1 },
                    );
                code(c, x, mid + 5.5, l.text, 16);
            }
            if (l.n === p.wrong) {
                const uw = Math.max(3 * U, l.text.length * 9.6),
                    uy = mid + 9;
                const zig: [number, number][] = [];
                for (let k2 = 0; k2 <= Math.floor(uw / 6); k2++)
                    zig.push([x + k2 * 6, uy + (k2 % 2 ? 3 : -1)]);
                pen.linear(g, zig, "pencil", {
                    stroke: c.paper ? c.t.ink : "#C2185B",
                    strokeWidth: 1.8,
                });
                bug(c, Math.min((w + 0.2) * U, x + uw + 16), mid);
            }
            if (l.n === p.mark) loop(c, (w / 2 + 2) * U, mid, (w - 1.4) * U, 1.9 * U);
            a[`line(${l.n})`] = [x, y + 0.2 * U, "up"];
        });
        a.listing = [((w + 2) * U) / 2, 0.4 * U, "up"];
        return a;
    },
    describe: () =>
        "A program written out as numbered lines down a card, a coloured chip at the start of each line for the kind of block it is.",
    motion: { still: STILL.text },
});
