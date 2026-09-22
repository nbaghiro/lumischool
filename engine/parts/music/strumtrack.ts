import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, soft } from "../lettering";
import { chordTitle, counts } from "../../sound/fretted";
import { CHORD_PICK, named } from "./fretting";

interface StrumParams {
    /** One character a half beat: D for down, U for up, a dash where the hand moves and misses. */
    strums: string;
    /** Write 1 & 2 & over the half beats. */
    counts: boolean;
    /** The chord to hold, written over the bar. */
    chord: string;
    /** The half beat to ring, counting from 0, or -1 for none. */
    ring: number;
}

const SLOT = 2;

const strumWidth = (slots: number): number => Math.max(2, slots) * SLOT + 3;

/**
 * The strum track: arrows on the half beats, down on the beat and up on the "and". A down arrow
 * points at the floor because that is where the hand goes, whichever way the neck is drawn, and an
 * up arrow is shorter and lighter because an up strum is. A dash is the hand moving past without
 * touching, which is the rule a teacher gives first: the hand never stops.
 */
export const strumTrack = defineDrawing<StrumParams>({
    id: "strumtrack",
    family: "music",
    title: "Strum track",
    group: "Structures",
    about:
        "A bar of strumming as arrows on its half beats, with 1 & 2 & 3 & 4 & written over them: a long " +
        'arrow down on the beat, a shorter one up on the "and", and a dot where the hand moves past ' +
        "without touching the strings. The chord to hold is written over the bar.",
    params: { strums: "D-D-D-D-", counts: true, chord: "none", ring: -1 },
    settings: {
        strums: { kind: "text", most: 16 },
        counts: { kind: "flag" },
        chord: { kind: "one of", of: CHORD_PICK },
        ring: { kind: "whole", min: -1, max: 7 },
    },
    takes: [
        {
            label: "Four down strums",
            params: { strums: "D-D-D-D-", counts: true, chord: "C", ring: -1 },
        },
        {
            label: "Down, down up, up down up",
            params: { strums: "D-DU-UDU", counts: true, chord: "none", ring: 3 },
        },
        {
            label: "Three in a bar",
            params: { strums: "D-D-D-", counts: true, chord: "none", ring: -1 },
        },
    ],
    box: (p) => ({ w: strumWidth((p.strums || "D-D-D-D-").length), h: named(p.chord) ? 9 : 7 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const slots = Array.from(p.strums || "D-D-D-D-");
        const top = named(p.chord) ? 2 : 0;
        const a: RawAnchors = {};
        const xOf = (i: number) => (1.5 + i * SLOT + SLOT / 2) * U;
        if (named(p.chord))
            num(c, xOf(0) - SLOT * 0.4 * U, 1.5 * U, chordTitle(p.chord), 19, "start");
        const tops = counts(Math.ceil(slots.length / 2));
        slots.forEach((s, i) => {
            const x = xOf(i);
            if (p.counts !== false) {
                if (i % 2) soft(c, x, (top + 1.3) * U, "&", 14);
                else num(c, x, (top + 1.35) * U, tops[i] ?? "", 16);
            }
            const mid = (top + 4.2) * U;
            if (s === "D" || s === "d") {
                pen.line(g, x, mid - 1.8 * U, x, mid + 1.8 * U, "ruler", { strokeWidth: 3 });
                pen.linear(
                    g,
                    [
                        [x - 0.55 * U, mid + 1.1 * U],
                        [x, mid + 1.9 * U],
                        [x + 0.55 * U, mid + 1.1 * U],
                    ],
                    "ruler",
                    { strokeWidth: 3 },
                );
                a[`strum(${i})`] = [x, mid + 2.2 * U, "down"];
            } else if (s === "U" || s === "u") {
                pen.line(g, x, mid + 1.2 * U, x, mid - 1.2 * U, "ruler", { strokeWidth: 1.9 });
                pen.linear(
                    g,
                    [
                        [x - 0.45 * U, mid - 0.55 * U],
                        [x, mid - 1.3 * U],
                        [x + 0.45 * U, mid - 0.55 * U],
                    ],
                    "ruler",
                    { strokeWidth: 1.9 },
                );
                a[`strum(${i})`] = [x, mid + 2.2 * U, "down"];
            } else {
                pen.circle(g, x, mid, 5, "ruler", pen.fill("ink-soft"), { strokeWidth: 0.6 });
            }
            if (i === p.ring)
                pen.ellipse(g, x, mid, 1.8 * U, 4.6 * U, "doodle", null, {
                    strokeWidth: 2.4,
                    stroke: c.t.pen,
                });
        });
        // The bar lines, so a pattern reads as one bar and a track of two reads as two.
        const bars = Math.ceil(slots.length / 8);
        for (let b = 0; b <= bars; b++) {
            const x = (1.5 + Math.min(slots.length, b * 8) * SLOT) * U;
            pen.line(g, x, (top + 2) * U, x, (top + 6.4) * U, "ruler", {
                strokeWidth: 1.4,
                stroke: c.t["ink-soft"],
            });
        }
        a.track = [xOf(0), top * U, "up"];
        return a;
    },
    describe: (p) =>
        `A bar of strumming written as arrows on its half beats, a long arrow down on the beat and a shorter one up between${p.counts ? ", the counts written over them" : ""}.`,
});
