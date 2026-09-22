import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { letterOf } from "../../sound/pitch";
import {
    TUNINGS,
    chordTitle,
    noteAt,
    placeId,
    readPlace,
    tuningOf,
    type Finger,
    type Place,
    type Shape,
    type TuningName,
} from "../../sound/fretted";
import {
    CHORD_PICK,
    shapeFor,
    fingerDot,
    muteMark,
    openMark,
    chordBoxSize,
    boxFrame,
} from "./fretting";

interface ChordBoxParams {
    tuning: TuningName;
    /** A chord from the book, or "none" to draw `places` instead. */
    chord: string;
    /** Places to draw when there is no chord, as s3f2: a single note as a card, named by its letter. */
    places: string[];
    frets: number;
    /** What the dots carry: the finger to use, or nothing. */
    show: "fingers" | "dots";
    /** Write the chord's name over the box. */
    name: boolean;
    /** Write each string's letter under the box. */
    letters: boolean;
    /** Places ringed. */
    lit: string[];
}

export const chordBox = defineDrawing<ChordBoxParams>({
    id: "chordbox",
    family: "music",
    title: "Chord box",
    group: "Structures",
    about:
        "A chord as a chord book prints it: the neck stood up facing you, the nut at the top, a dot where " +
        "each finger goes with the finger's number in it, a ring over a string played open and a cross " +
        "over one left out. The colours are one to a finger and become four hatches on paper.",
    params: {
        tuning: "uke",
        chord: "C",
        places: [],
        frets: 4,
        show: "fingers",
        name: true,
        letters: true,
        lit: [],
    },
    settings: {
        tuning: { kind: "one of", of: ["uke", "guitar"] },
        chord: { kind: "one of", of: CHORD_PICK },
        places: { kind: "words", most: 6 },
        frets: { kind: "whole", min: 3, max: 5 },
        show: { kind: "one of", of: ["fingers", "dots"] },
        name: { kind: "flag" },
        letters: { kind: "flag" },
        lit: { kind: "words", most: 6 },
    },
    takes: [
        {
            label: "Ukulele C, one finger",
            params: {
                tuning: "uke",
                chord: "C",
                frets: 4,
                show: "fingers",
                name: true,
                letters: true,
                lit: [],
                places: [],
            },
        },
        {
            label: "Ukulele F",
            params: {
                tuning: "uke",
                chord: "F",
                frets: 4,
                show: "fingers",
                name: true,
                letters: true,
                lit: [],
                places: [],
            },
        },
        {
            label: "Guitar C",
            params: {
                tuning: "guitar",
                chord: "C",
                frets: 4,
                show: "fingers",
                name: true,
                letters: true,
                lit: [],
                places: [],
            },
        },
        {
            label: "Guitar G, three strings",
            params: {
                tuning: "guitar",
                chord: "G-easy",
                frets: 4,
                show: "fingers",
                name: true,
                letters: true,
                lit: [],
                places: [],
            },
        },
        {
            label: "One note as a card",
            params: {
                tuning: "uke",
                chord: "none",
                places: ["s3f2"],
                frets: 4,
                show: "fingers",
                name: true,
                letters: true,
                lit: [],
            },
        },
    ],
    box: (p) =>
        chordBoxSize(
            tuningOf(p.tuning).name,
            Math.max(3, Math.min(5, Math.round(p.frets || 4))),
            p.letters !== false,
        ),
    draw: (c, p) => {
        const tuning = tuningOf(p.tuning).name;
        const frets = Math.max(3, Math.min(5, Math.round(p.frets || 4)));
        const t = TUNINGS[tuning];
        // A card for single notes is a shape like any other: its places are the fingers, one to a fret,
        // and every other string is left out.
        const loose = (p.places ?? [])
            .map(readPlace)
            .filter((q): q is Place => q !== null && q.string >= 1 && q.string <= t.strings.length);
        const shape: Shape | null =
            p.chord && p.chord !== "none"
                ? shapeFor(tuning, p.chord)
                : loose.length
                  ? {
                        name: "",
                        tuning,
                        frets: t.strings.map(
                            (_, i) =>
                                loose.find((q) => q.string === t.strings.length - i)?.fret ?? null,
                        ),
                        fingers: t.strings.map((_, i) => {
                            const f =
                                loose.find((q) => q.string === t.strings.length - i)?.fret ?? 0;
                            return f >= 1 && f <= 4 ? (f as Finger) : null;
                        }),
                    }
                  : null;
        const { x, y, n } = boxFrame(c, tuning, frets, p.letters !== false);
        const a: RawAnchors = {};
        const box = chordBoxSize(tuning, frets, p.letters !== false);
        const title =
            p.chord && p.chord !== "none"
                ? shape
                    ? chordTitle(p.chord)
                    : "?"
                : loose.map((q) => letterOf(noteAt(t, q))).join(" ");
        if (p.name !== false && title) num(c, (box.w / 2) * U, 1.7 * U, title, 22);
        const lit = new Set(p.lit ?? []);
        for (let string = 1; string <= n; string++) {
            const fret = shape ? (shape.frets[n - string] ?? null) : 0;
            const finger = shape ? (shape.fingers[n - string] ?? null) : null;
            const markY = y(0) - 0.8 * U;
            if (fret === null) muteMark(c, c.g, x(string), markY, 6);
            else if (fret === 0) openMark(c, c.g, x(string), markY, 6.5);
            else {
                const cy = y(fret - 0.5);
                fingerDot(
                    c,
                    c.g,
                    x(string),
                    cy,
                    1.5 * U,
                    p.show === "dots" ? null : finger,
                    p.show !== "dots",
                );
                a[`dot(${string})`] = [x(string), cy - 0.9 * U, "up"];
            }
            const id = placeId({ string, fret: fret ?? 0 });
            if (lit.has(id)) {
                const cy = fret ? y(fret - 0.5) : markY;
                c.pen.circle(c.g, x(string), cy, 2.3 * U, "doodle", null, {
                    strokeWidth: 2.4,
                    stroke: c.t.pen,
                });
            }
            a[`string(${string})`] = [x(string), y(frets) + 0.2 * U, "down"];
        }
        for (let f = 1; f <= frets; f++) a[`fret(${f})`] = [x(n) - 0.9 * U, y(f - 0.5), "left"];
        a.name = [(box.w / 2) * U, 0.2 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A chord box for the ${p.tuning === "uke" ? "ukulele" : "guitar"}: the neck stood up facing you with the nut at the top, ${p.show === "dots" ? "a dot" : "a numbered dot"} where each finger goes.`,
});
