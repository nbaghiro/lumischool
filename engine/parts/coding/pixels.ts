import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { keyOf, parse, run, upTo, world, type Colour, type Run, type World } from "../../coding";
import { paintFill } from "./listing";

export const printerOf = (p: { cols: number; rows: number }): World =>
    world({ cols: p.cols, rows: p.rows, printer: true });

/**
 * How many frames of a lamp's run the row holds, or null when the program lights no lamp. A `light`
 * line lights one square along the row rather than painting a whole row, and a `repeat for ever` only
 * stops at the interpreter's step limit, two thousand frames later, so the lamp's run is the frames up
 * to the one that fills the row. The drawing paints that and the runner plays it, both from here, so
 * what is printed and what a child watches cannot disagree.
 */
export function lampRun(r: Run, cells: number): number | null {
    let lit = 0;
    for (let i = 0; i < r.frames.length; i++) {
        if (r.frames[i]?.kind !== "light") continue;
        if (++lit >= cells) return i + 1;
    }
    return lit > 0 ? r.frames.length : null;
}

const lineText = (code: readonly string[], n: number): string | undefined => code[n - 1]?.trim();

/** A pixel row's runs as written: how many, and of which colour. */
function runsOf(line: string): [number, Colour][] {
    const out: [number, Colour][] = [],
        ws = line.toLowerCase().split(/\s+/);
    for (let i = 0; i < ws.length; i++) {
        const colour = (
            ["red", "blue", "green", "yellow", "orange", "black", "white"] as const
        ).find((k) => k === ws[i + 1]);
        const w = ws[i] ?? "";
        if (/^\d+$/.test(w) && colour) {
            out.push([Number(w), colour]);
            i++;
        }
    }
    return out;
}

export const pixels = defineDrawing({
    id: "pixels",
    family: "coding",
    title: "Pixel art from a program",
    group: "Structures",
    about: "A picture on squared paper made by a program of colours: each line paints one row from the left, \"2 white 3 red 2 white\", and a repeat paints a row again. A program of `light` lines is a lamp instead, lighting one square along the row for each line, so the lamp rocks' programs are watched on the same row they print; an endless repeat fills the row and ends there. The squares are coloured by the same interpreter as every other program, so the picture and its code agree. With `show` off the grid is empty for a child to colour in from the code, which is how it prints; `beside` writes each row's line next to it.",
    params: {
        cols: 7,
        rows: 5,
        code: [
            "2 white 3 red 2 white",
            "1 white 5 red 1 white",
            "7 red",
            "1 white 5 red 1 white",
            "2 white 3 red 2 white",
        ],
        show: true,
        beside: true,
        upto: -1,
    },
    settings: {
        cols: { kind: "whole", min: 1, max: 12 },
        rows: { kind: "whole", min: 1, max: 12 },
        code: { kind: "words", most: 12 },
        show: { kind: "flag" },
        beside: { kind: "flag" },
        upto: { kind: "whole", min: -1, max: 12 },
    },
    takes: [
        {
            label: "A heart, coloured",
            params: {
                cols: 7,
                rows: 6,
                code: [
                    "1 white 2 red 1 white 2 red 1 white",
                    "7 red",
                    "7 red",
                    "1 white 5 red 1 white",
                    "2 white 3 red 2 white",
                    "3 white 1 red 3 white",
                ],
                show: true,
                beside: true,
                upto: -1,
            },
        },
        {
            label: "To colour in",
            params: {
                cols: 7,
                rows: 6,
                code: [
                    "1 white 2 red 1 white 2 red 1 white",
                    "7 red",
                    "7 red",
                    "1 white 5 red 1 white",
                    "2 white 3 red 2 white",
                    "3 white 1 red 3 white",
                ],
                show: false,
                beside: true,
                upto: -1,
            },
        },
        {
            label: "A repeat of rows",
            params: {
                cols: 6,
                rows: 4,
                code: ["repeat 2", "  3 blue 3 yellow", "  3 yellow 3 blue"],
                show: true,
                beside: false,
                upto: -1,
            },
        },
    ],
    box: (p) => {
        const r = run(parse(p.code), printerOf(p));
        const widest = Math.max(
            0,
            ...r.frames
                .filter((f) => f.kind === "row")
                .map((f) => runsOf(lineText(p.code, f.line) ?? "").length),
        );
        return {
            w: p.cols * 2 + 2 + (p.beside ? Math.ceil(widest * 1.8) + 1 : 0),
            h: p.rows * 2 + 2,
        };
    },
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c,
            x0 = U,
            y0 = U,
            s = 2 * U;
        const w = printerOf(p),
            r = run(parse(p.code), w),
            lamp = lampRun(r, p.cols * p.rows),
            part = upTo(r, lamp !== null && p.upto < 0 ? lamp : p.upto);
        for (let row = 1; row <= p.rows; row++)
            for (let col = 1; col <= p.cols; col++) {
                const k = keyOf(w, col, row),
                    colour =
                        lamp !== null
                            ? part.state.lights[(row - 1) * p.cols + (col - 1)]
                            : part.state.painted.get(k);
                const fill = p.show && colour ? paintFill(c, colour) : null;
                pen.rect(g, x0 + (col - 1) * s, y0 + (row - 1) * s, s, s, "ruler", fill, {
                    strokeWidth: 1.2,
                    stroke: c.t["ink-soft"],
                });
                a[`cell(${k})`] = [x0 + (col - 1) * s + U, y0 + (row - 1) * s, "up"];
            }
        pen.rect(g, x0, y0, p.cols * s, p.rows * s, "ruler", null, { strokeWidth: 2 });
        if (p.beside) {
            let row = 0;
            for (const f of r.frames) {
                if (f.kind !== "row") continue;
                row++;
                const t = lineText(p.code, f.line);
                if (!t || row > p.rows) continue;
                let x = x0 + p.cols * s + U;
                const y = y0 + (row - 1) * s + U;
                for (const [n, colour] of runsOf(t)) {
                    num(c, x + 5, y + 6, String(n), 15, "middle");
                    pen.rect(g, x + 13, y - 7, 14, 14, "ruler", paintFill(c, colour), {
                        strokeWidth: 1.3,
                    });
                    x += 36;
                }
            }
        }
        return a;
    },
    describe: (p) =>
        `A picture on squared paper made by a program of colours, each line of the program painting one row from the left${p.beside ? ", the code beside it" : ""}.`,
});
