import { letter, group, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

interface CountRowParams {
    beats: number;
    /** Beats in a bar: a bar line after each, and the count starts again at 1. */
    meter: number;
    /** The beat lit, from 0, or -1 for none. */
    now: number;
    /** A word or a syllable under each beat, or an empty string. */
    words: string[];
    /** Where the tap for each beat fell, in beats from it (late is positive), or null for no tap. */
    marks: (number | null)[];
    /** The window a tap is on the beat within, as a fraction of a beat. */
    tolerance: number;
}

/** Squares to a beat. */
const COUNT_CELL = 2;

const X0 = 0.5;

const countRowWidth = (beats: number): number => Math.max(1, Math.round(beats)) * COUNT_CELL + 1;

export const countRow = defineDrawing<CountRowParams>({
    id: "countrow",
    family: "music",
    title: "Count",
    group: "Structures",
    about:
        "A row of squares, one for each beat, counting 1 2 3 4 in every bar, with the beat being played " +
        "filled in. Under it, where each tap fell against its beat, drawn as a distance with the window " +
        "as a band, and under that the word sung on each beat.",
    params: { beats: 4, meter: 4, now: -1, words: [], marks: [], tolerance: 0.25 },
    settings: {
        beats: { kind: "whole", min: 1, max: 16 },
        meter: { kind: "whole", min: 1, max: 6 },
        now: { kind: "whole", min: -1, max: 15 },
        words: { kind: "words", most: 16 },
        marks: { kind: "fixed" },
        tolerance: { kind: "number", min: 0.05, max: 0.5, step: 0.05 },
    },
    takes: [
        {
            label: "A bar, beat three sounding",
            params: { beats: 4, meter: 4, now: 2, words: [], marks: [], tolerance: 0.25 },
        },
        {
            label: "The drum's bar, then yours",
            params: {
                beats: 8,
                meter: 4,
                now: 5,
                words: ["drum", "", "", "", "you", "", "", ""],
                marks: [],
                tolerance: 0.25,
            },
        },
        {
            label: "A line kept, the taps drawn",
            params: {
                beats: 8,
                meter: 4,
                now: -1,
                words: ["Twin-", "kle,", "twin-", "kle,", "lit-", "tle", "star,", ""],
                marks: [0.04, -0.12, 0.18, null, 0, 0.38, -0.06, 0.1],
                tolerance: 0.25,
            },
        },
    ],
    box: (p) => ({ w: countRowWidth(p.beats), h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const a: RawAnchors = {};
        const n = Math.max(1, Math.round(p.beats));
        const meter = Math.max(1, Math.round(p.meter));
        const xOf = (i: number) => (X0 + i * COUNT_CELL) * U;
        const lane = 3.7 * U;

        for (let i = 0; i < n; i++) {
            const x = xOf(i);
            const first = i % meter === 0;
            pen.rect(g, x + 3, 0.5 * U, COUNT_CELL * U - 6, 2 * U, "ruler", pen.fill("card"), {
                strokeWidth: first ? 2.2 : 1.3,
            });
            const now = group(c, {
                data: { key: `beat(${i})`, layer: "now" },
                ...(i !== p.now ? { hidden: true } : {}),
            }).g;
            pen.rect(
                now,
                x + 6,
                0.5 * U + 3,
                COUNT_CELL * U - 12,
                2 * U - 6,
                "ruler",
                pen.fill("glow", "solid"),
                { stroke: "none" },
            );
            letter(c, {
                x: x + (COUNT_CELL * U) / 2,
                y: 1.5 * U + (first ? 8.5 : 7),
                s: String((i % meter) + 1),
                face: "read",
                weight: 700,
                size: first ? 24 : 20,
                fill: first ? c.t.ink : c.t["ink-soft"],
                anchor: "middle",
            });
            a[`beat(${i})`] = [x + (COUNT_CELL * U) / 2, 0.5 * U, "up"];
            if (first && i > 0) pen.line(g, x, 0.3 * U, x, 4.7 * U, "ruler", { strokeWidth: 2.2 });
        }

        pen.line(g, xOf(0), lane, xOf(n), lane, "ruler", {
            strokeWidth: 1.1,
            stroke: c.t["ink-soft"],
        });
        const half = Math.max(0, p.tolerance) * COUNT_CELL * U;
        for (let i = 0; i < n; i++) {
            const x = xOf(i);
            const m = p.marks[i];
            if (m !== null && m !== undefined) {
                pen.rect(
                    g,
                    x - half,
                    lane - 0.45 * U,
                    half * 2,
                    0.9 * U,
                    "ruler",
                    pen.fill("glow"),
                    { stroke: "none" },
                );
            }
            pen.line(g, x, lane - 0.4 * U, x, lane + 0.4 * U, "ruler", {
                strokeWidth: 1.6,
                stroke: c.t.ink,
            });
            if (m === null || m === undefined) continue;
            const tx = x + Math.max(-0.5, Math.min(0.5, m)) * COUNT_CELL * U;
            pen.line(g, tx, lane - 0.65 * U, tx, lane + 0.65 * U, "pencil", {
                strokeWidth: 2.6,
                stroke: c.t.pen,
            });
            // A tick inside the window and a cross outside it, so nothing depends on the band's colour.
            const y = lane + 1.1 * U;
            if (Math.abs(m) <= p.tolerance) {
                pen.linear(
                    g,
                    [
                        [tx - 0.25 * U, y],
                        [tx - 0.05 * U, y + 0.28 * U],
                        [tx + 0.33 * U, y - 0.25 * U],
                    ],
                    "pencil",
                    { strokeWidth: 2.2, stroke: c.t.ok },
                );
            } else {
                pen.line(g, tx - 0.22 * U, y - 0.22 * U, tx + 0.22 * U, y + 0.22 * U, "pencil", {
                    strokeWidth: 2.2,
                    stroke: c.t.berry,
                });
                pen.line(g, tx - 0.22 * U, y + 0.22 * U, tx + 0.22 * U, y - 0.22 * U, "pencil", {
                    strokeWidth: 2.2,
                    stroke: c.t.berry,
                });
            }
            a[`tap(${i})`] = [tx, lane + 1.5 * U, "down"];
        }

        for (let i = 0; i < n; i++) {
            const w = p.words[i];
            // A long syllable is set smaller so it keeps to its own beat's two squares.
            if (w)
                letter(c, {
                    x: xOf(i) + (COUNT_CELL * U) / 2,
                    y: 6.35 * U,
                    s: w,
                    face: "read",
                    weight: 600,
                    size: w.length > 5 ? 12 : 16,
                    fill: c.t.ink,
                    anchor: "middle",
                });
        }
        a.row = [xOf(n / 2), 0.4 * U, "up"];
        a.under = [xOf(n / 2), 7 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A row of ${p.beats} squares, one for each beat, counting up to ${p.meter} in every bar, with the word sung on each beat written underneath.`,
    motion: {
        still: "The beat being played is shown by a square filling, which the page does from the music's clock; the drawing itself holds still.",
    },
});
