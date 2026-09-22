// The fretted instruments' hand: a finger's colour, the tunings and chords a setting may name, a chord
// shape for a tuning, the dots, crosses and rings over the strings, the chord box's frame and size, a
// note's name and the stack of places a tab entry holds, which the fretboard, the chord box, the chord
// change, the strum track, the tab and the lane draw with.
import { plain, letter, type Ctx } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { say } from "../lettering";
import {
    CHORD_WORDS,
    TUNINGS,
    chordOf,
    readPlace,
    stringName,
    type Finger,
    type Place,
    type Shape,
    type TuningName,
} from "../../sound/fretted";
import { gauge } from "./luthier";

export const FINGER_MARK: Record<Finger, Marker> = { 1: "sky", 2: "mint", 3: "berry", 4: "tang" };

export const TUNING_WORDS = ["uke", "guitar"] as const;

export const CHORD_PICK = ["none", ...CHORD_WORDS];

/**
 * A chord's shape, or null. A name one book has and the other does not (an F on the guitar, which
 * needs a barre we do not teach) draws as an empty box with a question mark rather than failing,
 * and test/strings.test.ts refuses any content that writes one.
 */
export const shapeFor = (tuning: TuningName, name: string): Shape | null =>
    !name || name === "none" ? null : chordOf(tuning, name);

/** A finger dot: its colour, and its number on a white patch so print's hatching cannot cross it. */
export function fingerDot<G>(
    c: Ctx<G>,
    g: G,
    x: number,
    y: number,
    d: number,
    finger: Finger | null,
    label = true,
): void {
    const fill = finger
        ? c.pen.fill(FINGER_MARK[finger])
        : { fill: c.t.ink, fillStyle: "solid" as const };
    c.pen.circle(g, x, y, d, "ruler", fill, { strokeWidth: 1.6 });
    if (!finger || !label) return;
    if (c.paper) plain({ ...c, g }, { kind: "circle", cx: x, cy: y, r: d * 0.3, fill: c.t.card });
    letter(
        { ...c, g },
        {
            x,
            y: y + d * 0.2,
            s: String(finger),
            face: "read",
            weight: 700,
            size: Math.round(d * 0.55),
            fill: c.t.ink,
            anchor: "middle",
        },
    );
}

/** The "x" over a string that is not played, and the "o" over one played open. */
export function muteMark<G>(c: Ctx<G>, g: G, x: number, y: number, r: number): void {
    c.pen.line(g, x - r, y - r, x + r, y + r, "pencil", { strokeWidth: 2 });
    c.pen.line(g, x - r, y + r, x + r, y - r, "pencil", { strokeWidth: 2 });
}

export const openMark = <G>(c: Ctx<G>, g: G, x: number, y: number, r: number): void =>
    c.pen.circle(g, x, y, r * 2, "ruler", null, { strokeWidth: 1.8 });

export const BOX_SP = 2;

export const BOX_FW = 2.5;

export const BOX_SIDE = 2;

export const BOX_TOP = 4;

export const chordBoxSize = (
    tuning: TuningName,
    frets: number,
    letters: boolean,
): { w: number; h: number } => {
    const n = TUNINGS[tuning].strings.length;
    return {
        w: BOX_SIDE * 2 + (n - 1) * BOX_SP,
        h: Math.ceil(BOX_TOP + frets * BOX_FW + (letters ? 2 : 1)),
    };
};

/**
 * The frame of a chord box, which the chord change drill draws too: strings down, frets across,
 * the nut heavy at the top. Returns where each string and each fret space is.
 */
export function boxFrame<G>(
    c: Ctx<G>,
    tuning: TuningName,
    frets: number,
    letters: boolean,
): { x: (string: number) => number; y: (fret: number) => number; n: number } {
    const t = TUNINGS[tuning];
    const n = t.strings.length;
    const x = (string: number) => (BOX_SIDE + (n - string) * BOX_SP) * U;
    const y = (fret: number) => (BOX_TOP + fret * BOX_FW) * U;
    c.pen.line(c.g, x(n) - 4, y(0), x(1) + 4, y(0), "ruler", { strokeWidth: 4.5 });
    for (let f = 1; f <= frets; f++)
        c.pen.line(c.g, x(n), y(f), x(1), y(f), "ruler", { strokeWidth: 1.6 });
    for (let string = 1; string <= n; string++) {
        c.pen.line(c.g, x(string), y(0), x(string), y(frets), "ruler", {
            strokeWidth: gauge(t, string),
        });
        if (letters)
            say(
                c,
                x(string),
                y(frets) + 1.3 * U,
                stringName(t, string),
                13,
                "middle",
                c.t["ink-soft"],
            );
    }
    return { x, y, n };
}

export const named = (chord: string): boolean => Boolean(chord) && chord !== "none";

export const stackOf = (s: string): Place[] =>
    s
        .split("_")
        .map(readPlace)
        .filter((q): q is Place => q !== null);
