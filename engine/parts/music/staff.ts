import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

/** One note every three squares, with a bar line at each end. */
const rhythmWidth = (notes: number[]): number => notes.length * 3 + 4;

export const rhythmBar = defineDrawing({
    id: "staff",
    family: "music",
    title: "Rhythm bar",
    group: "Structures",
    about: "A bar of notes on one line: a minim is two beats, a crotchet one, a pair of quavers half each.",
    params: { notes: [1, 1, 0.5, 0.5, 2], beats: 0 },
    settings: {
        notes: { kind: "numbers", min: 0.5, max: 4, most: 12 },
        beats: { kind: "whole", min: 0, max: 8 },
    },
    takes: [
        { label: "Four beats", params: { notes: [1, 1, 0.5, 0.5, 2], beats: 0 } },
        { label: "All crotchets", params: { notes: [1, 1, 1, 1], beats: 4 } },
        { label: "Quavers", params: { notes: [0.5, 0.5, 0.5, 0.5, 2], beats: 0 } },
    ],
    box: (p) => ({ w: rhythmWidth(p.notes), h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            base = 3.4 * U,
            a: RawAnchors = {};
        pen.line(g, 1.4 * U, base, (rhythmWidth(p.notes) - 1.4) * U, base, "ruler", {
            strokeWidth: 1.6,
        });
        for (const x of [1.4, rhythmWidth(p.notes) - 1.4])
            pen.line(g, x * U, base - 0.9 * U, x * U, base + 0.9 * U, "ruler", {
                strokeWidth: 2.2,
            });
        if (p.beats) {
            say(c, 0.9 * U, base - 4, String(p.beats), 20, "start");
            say(c, 0.9 * U, base + 16, "4", 20, "start");
        }
        p.notes.forEach((n, i) => {
            const x = (2.6 + i * 3) * U,
                head = n >= 2 ? null : { fill: c.t.ink, fillStyle: "solid" as const };
            pen.ellipse(g, x, base, 26, 19, "pencil", head, { strokeWidth: 1.6 });
            pen.line(g, x + 12, base - 4, x + 12, base - 1.7 * U, "pencil", { strokeWidth: 1.8 });
            if (n < 1)
                pen.curve(
                    g,
                    [
                        [x + 12, base - 1.7 * U],
                        [x + 24, base - 1.3 * U],
                        [x + 20, base - 0.7 * U],
                    ],
                    "pencil",
                    { strokeWidth: 1.8 },
                );
            a[`note(${i})`] = [x, base - 1.9 * U, "up"];
        });
        return a;
    },
    describe: () =>
        "A bar of notes on a single line, each note a head on a stem, quavers joined in pairs, with the count of beats written at the start.",
    reads: true,
});
