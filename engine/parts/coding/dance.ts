import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";
import { parse, run, world, type Dance } from "../../coding";
import { drawActor } from "./grid";

/** One frame for every beat a dance program dances, so "clap 2" is two frames. */
function danceFrames(code: readonly string[]): { move: Dance; line: number }[] {
    const r = run(parse(code), world({ cols: 1, rows: 1 })),
        out: { move: Dance; line: number }[] = [];
    for (const f of r.frames)
        if (f.kind === "dance" && f.move)
            for (let k = 0; k < (f.times ?? 1); k++) out.push({ move: f.move, line: f.line });
    return out;
}

export const dance = defineDrawing({
    id: "dance",
    family: "coding",
    title: "A dance as a program",
    group: "Structures",
    about: "A dance written as a program and drawn as a strip of frames, one for each move: the robot claps, jumps, spins, waves or stamps, and a repeat dances a move again. The frames come from running `code`, so a repeat of two claps is two clapping frames. `blank` leaves one frame empty for a child to draw the move in, and on screen the robot dances it to the beat.",
    params: {
        code: ["clap 2", "repeat 2", "  jump", "  spin", "bow"],
        blank: 0,
        count: true,
        beat: 0,
    },
    settings: {
        code: { kind: "words", most: 8 },
        blank: { kind: "whole", min: 0, max: 12 },
        count: { kind: "flag" },
        beat: { kind: "whole", min: 0, max: 12 },
    },
    takes: [
        {
            label: "Clap, jump and spin",
            params: {
                code: ["clap 2", "repeat 2", "  jump", "  spin", "bow"],
                blank: 0,
                count: true,
                beat: 0,
            },
        },
        {
            label: "A frame to draw",
            params: { code: ["wave", "stamp", "wave", "stamp"], blank: 3, count: true, beat: 0 },
        },
    ],
    box: (p) => ({
        w: Math.max(1, Math.min(8, danceFrames(p.code).length)) * 4 + 1,
        h: Math.ceil(Math.max(1, danceFrames(p.code).length) / 8) * 6 + 1,
    }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c,
            frames = danceFrames(p.code);
        frames.forEach((f, i) => {
            const x = (0.5 + (i % 8) * 4) * U,
                y = (0.5 + Math.floor(i / 8) * 6) * U;
            pen.path(
                g,
                roundedRect(x, y, 3.6 * U, 5 * U, 6),
                "ruler",
                pen.fill(i + 1 === p.beat ? "glow" : "card"),
                { strokeWidth: i + 1 === p.beat ? 3 : 1.6 },
            );
            if (i + 1 === p.blank) {
                pen.path(
                    g,
                    roundedRect(x + 0.4 * U, y + 0.4 * U, 2.8 * U, 3.2 * U, 5),
                    "ruler",
                    null,
                    { strokeWidth: 1.2, strokeLineDash: [5, 4], stroke: c.t["ink-soft"] },
                );
            } else drawActor(c, "bot", x + 1.8 * U, y + 2.6 * U, f.move, "right");
            if (p.count) soft(c, x + 1.8 * U, y + 4.6 * U, `${i + 1}  ${f.move}`, 12);
            a[`frame(${i + 1})`] = [x + 1.8 * U, y, "up"];
        });
        return a;
    },
    describe: () =>
        "A dance drawn as a strip of frames, a robot in each one clapping, jumping, spinning, waving or stamping, with the count of the beat under it.",
});
