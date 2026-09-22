import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

export interface BeatTrackParams {
    beats: number;
    /** Where each note of the bar starts, in beats. */
    target: number[];
    /** Where each tap landed, in beats, on the tempo fitted from the taps themselves. */
    played: number[];
    /** The window, as a fraction of a beat. Drawn, because a tolerance nobody can see is a verdict. */
    tolerance: number;
}

/** Three squares to a beat, which makes a four-beat bar fit a narrow screen. */
const PER_BEAT = 3;

const TRACK_X = 1.5;

const beatTrackWidth = (beats: number): number => Math.max(1, beats) * PER_BEAT + 2 * TRACK_X;

export const beatTrack = defineDrawing({
    id: "beattrack",
    family: "music",
    title: "Beat track",
    group: "Structures",
    about:
        "What a rhythm exercise judged: the bar's beats along a line, where each note should have " +
        "fallen above it, where each tap actually fell below it, and the tolerance drawn as a band. " +
        "This is how a tolerance is made honest, and it is how a child who cannot hear the beat can " +
        "still see what went wrong.",
    params: { beats: 4, target: [0, 1, 2, 3], played: [] as number[], tolerance: 0.25 },
    settings: {
        beats: { kind: "whole", min: 1, max: 8 },
        target: { kind: "numbers", min: 0, max: 8, most: 16 },
        played: { kind: "numbers", min: -1, max: 9, most: 16 },
        tolerance: { kind: "number", min: 0.05, max: 0.5, step: 0.05 },
    },
    takes: [
        {
            label: "A bar to clap",
            params: { beats: 4, target: [0, 1, 2, 3], played: [], tolerance: 0.25 },
        },
        {
            label: "Judged, one tap late",
            params: { beats: 4, target: [0, 1, 2, 3], played: [0, 1.05, 2.4, 3], tolerance: 0.25 },
        },
        {
            label: "Quavers, a tighter window",
            params: { beats: 4, target: [0, 0.5, 1, 2, 3], played: [], tolerance: 1 / 6 },
        },
    ],
    box: (p) => ({ w: beatTrackWidth(p.beats), h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const a: RawAnchors = {};
        const xOf = (b: number) => (TRACK_X + b * PER_BEAT) * U;
        const base = 4 * U;

        const last = Math.max(1, p.beats);

        // Three tiers, read from the top: what should have happened, the bar itself, and what did.
        // A child looking for what went wrong looks down the page rather than along it.
        for (let b = 0; b <= last; b++) {
            if (b < last)
                say(c, xOf(b + 0.5), 0.9 * U, String(b + 1), 15, "middle", c.t["ink-soft"]);
        }

        // The tolerance band, drawn first so everything else sits on top of it, and only once
        // something has been played: before that there is no judgement to show the width of. It hugs
        // the line rather than filling the drawing, because it is the backdrop and not the subject.
        if (p.played?.length) {
            const half = p.tolerance * PER_BEAT * U;
            for (const t of p.target ?? []) {
                pen.rect(g, xOf(t) - half, base - 0.5 * U, half * 2, U, "ruler", pen.fill("glow"), {
                    stroke: "none",
                });
            }
        }

        pen.line(g, xOf(0), base, xOf(last), base, "ruler", { strokeWidth: 1.8 });
        for (let b = 0; b <= last; b++) {
            pen.line(g, xOf(b), base - 0.3 * U, xOf(b), base + 0.3 * U, "ruler", {
                strokeWidth: 1.4,
                stroke: c.t["ink-soft"],
            });
        }

        (p.target ?? []).forEach((t, i) => {
            pen.line(g, xOf(t), base - 2.1 * U, xOf(t), base - 0.35 * U, "ruler", {
                strokeWidth: 2.2,
            });
            pen.circle(
                g,
                xOf(t),
                base - 2.25 * U,
                9,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.8 },
            );
            a[`beat(${i})`] = [xOf(t), base - 2.7 * U, "up"];
        });

        (p.played ?? []).forEach((q, i) => {
            const t = p.target?.[i];
            const inside = t !== undefined && Math.abs(q - t) <= p.tolerance;
            const x = xOf(Math.max(-0.4, Math.min(last + 0.4, q)));
            pen.line(g, x, base + 0.35 * U, x, base + 1.7 * U, "pencil", {
                strokeWidth: 2.6,
                stroke: c.t.pen,
            });
            // A tick for inside and a cross for outside, because nothing may depend on colour alone.
            if (inside) {
                pen.linear(
                    g,
                    [
                        [x - 0.3 * U, base + 2.3 * U],
                        [x - 0.05 * U, base + 2.65 * U],
                        [x + 0.42 * U, base + 2.0 * U],
                    ],
                    "pencil",
                    { strokeWidth: 2.4, stroke: c.t.ok },
                );
            } else {
                for (const s of [-1, 1]) {
                    pen.line(
                        g,
                        x - 0.3 * U,
                        base + 2.1 * U + (s < 0 ? 0 : 0.55 * U),
                        x + 0.3 * U,
                        base + 2.65 * U - (s < 0 ? 0 : 0.55 * U),
                        "pencil",
                        { strokeWidth: 2.4, stroke: c.t.berry },
                    );
                }
            }
            a[`tap(${i})`] = [x, base + 2.9 * U, "down"];
        });

        a.track = [xOf(last / 2), 0.4 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A bar of ${p.beats} beats along a line, a mark above it where each note should fall and one below where each tap fell, the tolerance drawn as a band.`,
    reads: true,
});
