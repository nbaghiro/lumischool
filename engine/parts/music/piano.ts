import { letter, group, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineInstrument } from "../drawing";
import { say } from "../lettering";
import {
    MIDDLE_C,
    letterOf,
    noteOf,
    noteText,
    spokenNote,
    whiteKeys,
    type Note,
} from "../../sound/pitch";
import { solfaOf } from "../../sound/scale";
import { type Key } from "../../sound/keys";
import { names } from "./clefs";

/** A group the mount can find and show or hide. Hidden groups still print nothing. */
const layer = <G>(
    c: Ctx<G>,
    key: string,
    kind: "face" | "down" | "lit" | "focus",
    shown: boolean,
): G =>
    group(c, { data: { key, layer: kind }, ...(kind !== "face" && !shown ? { hidden: true } : {}) })
        .g;

export interface PianoParams {
    /** The lowest note. A black one is rounded up to the white key above it. */
    from: string;
    /** How many white keys. Eight is an octave, C to C, and is the default for a reason below. */
    whites: number;
    /** Squares per white key. Three is the lesson default, five is life size on paper. */
    wide: number;
    labels: "letters" | "solfa" | "numbers" | "none";
    /** Keys drawn pressed, for a chord in a worked example or on an answer key. */
    down: string[];
    /** Keys drawn with a ring round them, which is how "play this one" is said without colour. */
    lit: string[];
    /**
     * The finger for each white key from `from`, 1 for the thumb to 5 for the little finger, 0 for a
     * key no finger is given. Written in a row over the keyboard, the way a method book prints it.
     */
    fingers: number[];
}

/** One square of case above the keys, which is where the keyboard stops being a row of rectangles. */
const CASE = 1;

/** A black key is drawn at this fraction of a white key's width, and of its length. */
const BLACK_W = 0.58;

const BLACK_H = 0.62;

interface Laid {
    note: Note;
    raised: boolean;
    /** Where it is drawn, in user units. */
    draw: { x: number; y: number; w: number; h: number };
    /**
     * Where a finger has to land. Wider than the drawing for a black key, filling the gap between
     * the white keys either side, which is what every keyboard app does and what a finger does
     * anyway.
     */
    hit: { x: number; y: number; w: number; h: number };
}

interface Shape {
    wide: number;
    whites: Note[];
    /** Every key, in pitch order, which is the order the letter map and the arrow keys use. */
    laid: Laid[];
    box: { w: number; h: number };
    /** Whether black keys are drawn at this size. */
    raised: boolean;
    keyTop: number;
    whiteH: number;
    /** Squares above the case for the finger numbers, when there are any. */
    over: number;
}

/**
 * The geometry, worked out once and read by both `box`, `draw` and `keys`, so the hit rectangle a
 * finger lands in and the rectangle that was drawn can never disagree.
 *
 * Black keys are drawn only from three squares per white key up. At two squares a black key is
 * 24 px wide, which no child can hit, so at that size the keyboard is white keys only, which is
 * also all a grade one lesson wants.
 */
export function keyboardShape(p: PianoParams): Shape {
    const wide = Math.max(1, Math.round(p.wide || 3));
    const count = Math.max(1, Math.min(24, Math.round(p.whites || 8)));
    const whites = whiteKeys(noteOf(p.from || "C4"), count);
    const raised = wide >= 3;
    const ww = wide * U;
    const over = (p.fingers ?? []).some((f) => f > 0) ? 2 : 0;
    const keyTop = (over + CASE) * U;
    const whiteH = wide * 3 * U;
    const laid: Laid[] = whites.map((note, i) => ({
        note,
        raised: false,
        draw: { x: i * ww, y: keyTop, w: ww, h: whiteH },
        hit: { x: i * ww, y: keyTop, w: ww, h: whiteH },
    }));
    if (raised) {
        whites.forEach((note, i) => {
            // A black key sits where two white keys are a tone apart, which is the whole reason there
            // are five of them and not seven.
            const next = whites[i + 1];
            if (next === undefined || next - note !== 2) return;
            const cx = (i + 1) * ww;
            const bw = BLACK_W * ww;
            const bh = whiteH * BLACK_H;
            laid.push({
                note: note + 1,
                raised: true,
                draw: { x: cx - bw / 2, y: keyTop, w: bw, h: bh },
                hit: { x: cx - ww / 2, y: keyTop, w: ww, h: bh },
            });
        });
    }
    laid.sort((a, b) => a.note - b.note);
    return {
        wide,
        whites,
        laid,
        box: { w: count * wide, h: wide * 3 + CASE + over },
        raised,
        keyTop,
        whiteH,
        over,
    };
}

/** What is written on a white key. */
function capOf(p: PianoParams, n: Note, i: number, tonic: Note): string {
    if (p.labels === "none") return "";
    if (p.labels === "numbers") return String(i + 1);
    if (p.labels === "solfa") return solfaOf(n, tonic) ?? "";
    return letterOf(n);
}

/**
 * The focus ring, drawn by the part so that it scales with the drawing and works in both themes.
 * A ring rather than a colour, and separate from the lit overlay because the two can be true at
 * once: a lesson can ask for a key the child has not moved to yet.
 */
function focusRing<G>(
    c: Ctx<G>,
    id: string,
    box: { x: number; y: number; w: number; h: number },
): void {
    const g = layer(c, id, "focus", false);
    c.pen.rect(g, box.x + 3, box.y + 3, box.w - 6, box.h - 6, "ruler", null, {
        strokeWidth: 1.8,
        stroke: c.t.pen,
        strokeLineDash: [5, 4],
    });
}

export const pianoKeys = defineInstrument<PianoParams>({
    id: "piano",
    family: "music",
    title: "Piano keyboard",
    group: "Inputs",
    about:
        "A keyboard that is played: press a key with a finger, a mouse or a number key and it lights " +
        "and sounds. The white keys carry their letters and middle C is ringed, so the whole of it " +
        "works with the volume at zero. Three squares to a white key is the lesson size; five is the " +
        "width of a real one, so a printed keyboard can have real fingers put on it.",
    // A piano sounds like a piano. The struck-string voice is declared in src/sound/strike.ts.
    voice: "piano",
    params: { from: "C4", whites: 8, wide: 3, labels: "letters", down: [], lit: [], fingers: [] },
    settings: {
        from: { kind: "text", most: 3 },
        whites: { kind: "whole", min: 1, max: 15 },
        wide: { kind: "whole", min: 1, max: 5 },
        labels: { kind: "one of", of: ["letters", "solfa", "numbers", "none"] },
        down: { kind: "words", most: 10 },
        lit: { kind: "words", most: 10 },
        fingers: { kind: "numbers", min: 1, max: 5, most: 10 },
    },
    takes: [
        {
            label: "An octave, lesson size",
            params: {
                from: "C4",
                whites: 8,
                wide: 3,
                labels: "letters",
                down: [],
                lit: [],
                fingers: [],
            },
        },
        {
            label: "One key to play",
            params: {
                from: "C4",
                whites: 8,
                wide: 3,
                labels: "letters",
                down: [],
                lit: ["C4"],
                fingers: [],
            },
        },
        {
            label: "A chord held down",
            params: {
                from: "C4",
                whites: 8,
                wide: 3,
                labels: "none",
                down: ["C4", "E4", "G4"],
                lit: [],
                fingers: [],
            },
        },
        // Five squares is the width of a real key, and five keys is as much of one as a 36 square
        // page holds: a printed octave at life size is 40 squares and does not fit.
        {
            label: "Life size, C to G",
            params: {
                from: "C4",
                whites: 5,
                wide: 5,
                labels: "letters",
                down: [],
                lit: [],
                fingers: [],
            },
        },
        {
            label: "Five keys, solfa",
            params: {
                from: "C4",
                whites: 5,
                wide: 3,
                labels: "solfa",
                down: [],
                lit: [],
                fingers: [],
            },
        },
        {
            label: "Too small to play",
            params: {
                from: "C4",
                whites: 8,
                wide: 2,
                labels: "none",
                down: [],
                lit: [],
                fingers: [],
            },
        },
        {
            label: "Right hand in C position",
            params: {
                from: "C4",
                whites: 8,
                wide: 3,
                labels: "letters",
                down: [],
                lit: [],
                fingers: [1, 2, 3, 4, 5],
            },
        },
        {
            label: "Left hand in C position",
            params: {
                from: "C3",
                whites: 8,
                wide: 3,
                labels: "letters",
                down: [],
                lit: [],
                fingers: [5, 4, 3, 2, 1],
            },
        },
    ],
    box: (p) => keyboardShape(p).box,

    keys(p) {
        const s = keyboardShape(p);
        const whiteAt = s.whites;
        return s.laid.map((k): Key => {
            const i = whiteAt.indexOf(k.note);
            return {
                id: noteText(k.note),
                note: k.note,
                anchor: `key(${noteText(k.note)})`,
                label: k.raised ? "" : capOf(p, k.note, i < 0 ? 0 : i, whiteAt[0] ?? k.note),
                spoken: spokenNote(k.note),
                raised: k.raised,
                hit: k.hit,
            };
        });
    },

    draw: (c, p) => {
        const { pen, g } = c;
        const s = keyboardShape(p);
        const down = new Set(names(p.down ?? []));
        const lit = new Set(names(p.lit ?? []));
        const a: RawAnchors = {};
        const W = s.box.w * U;
        const size = Math.max(9, s.wide * 5.4);

        // The finger numbers, each over its key in a ring, so the hand's shape is on the page before
        // a key is pressed.
        (p.fingers ?? []).forEach((f, i) => {
            if (!(f > 0) || i >= s.whites.length) return;
            const x = (i + 0.5) * s.wide * U;
            pen.circle(g, x, 0.95 * U, 1.5 * U, "ruler", null, { strokeWidth: 1.5 });
            say(c, x, 0.95 * U + 6, String(f), 17);
        });

        // The case: a strip above the keys, so the keyboard has a back rather than floating.
        pen.rect(
            g,
            0,
            s.over * U,
            W,
            CASE * U + 4,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: c.paper ? 7 : 3.5 }),
            { strokeWidth: 1.6 },
        );

        const whiteKeysLaid = s.laid.filter((k) => !k.raised);
        const blackKeysLaid = s.laid.filter((k) => k.raised);

        // White keys first, then black on top, which is both the drawing order and the order a
        // pointer has to be tested against.
        for (const k of whiteKeysLaid) {
            const id = noteText(k.note);
            const i = s.whites.indexOf(k.note);
            const face = layer(c, id, "face", true);
            pen.rect(face, k.draw.x, k.draw.y, k.draw.w, k.draw.h, "ruler", pen.fill("card"), {
                strokeWidth: 1.7,
            });

            const cap = capOf(p, k.note, i, s.whites[0] ?? k.note);
            const capY = k.draw.y + k.draw.h - size * 0.75;
            if (cap) {
                letter(
                    { ...c, g: face },
                    {
                        x: k.draw.x + k.draw.w / 2,
                        y: capY,
                        s: cap,
                        face: "read",
                        weight: 600,
                        size,
                        fill: c.t["ink-soft"],
                        anchor: "middle",
                    },
                );
            }
            // Middle C is ringed, because a child's first question at a keyboard is where to put their
            // hand, and a ring answers it without colour and without sound.
            if (k.note === MIDDLE_C && cap && !lit.has(k.note)) {
                pen.ellipse(
                    face,
                    k.draw.x + k.draw.w / 2,
                    capY - size * 0.32,
                    size * 1.6,
                    size * 1.4,
                    "doodle",
                    null,
                    { strokeWidth: 1.5, stroke: c.t.pen },
                );
            }

            const wash = layer(c, id, "down", down.has(k.note));
            const bandTop = k.draw.y + s.whiteH * BLACK_H + 0.25 * U;
            const bandH = Math.max(0.7 * U, capY - size - bandTop);
            pen.rect(
                wash,
                k.draw.x + 0.22 * k.draw.w,
                bandTop,
                k.draw.w * 0.56,
                bandH,
                "ruler",
                pen.fill("glow"),
                { strokeWidth: 1.4 },
            );

            const ring = layer(c, id, "lit", lit.has(k.note));
            pen.ellipse(
                ring,
                k.draw.x + k.draw.w / 2,
                k.draw.y + k.draw.h * 0.72,
                k.draw.w * 0.78,
                k.draw.h * 0.22,
                "doodle",
                null,
                { strokeWidth: 2.6, stroke: c.t.pen },
            );

            focusRing(c, id, k.draw);
            a[`key(${id})`] = [k.draw.x + k.draw.w / 2, 0, "up"];
        }

        for (const k of blackKeysLaid) {
            const id = noteText(k.note);
            const face = layer(c, id, "face", true);
            pen.rect(face, k.draw.x, k.draw.y, k.draw.w, k.draw.h, "ruler", pen.fill("ink"), {
                strokeWidth: 1.6,
            });

            // A black key is dark, so its pressed mark is a light bar near the bottom of it rather
            // than a fill, which in ink would be hatching on top of hatching.
            const wash = layer(c, id, "down", down.has(k.note));
            pen.rect(
                wash,
                k.draw.x + 0.18 * k.draw.w,
                k.draw.y + k.draw.h * 0.62,
                k.draw.w * 0.64,
                k.draw.h * 0.24,
                "ruler",
                { fill: c.t.card, fillStyle: "solid" },
                { strokeWidth: 1.4, stroke: c.t.card },
            );

            const ring = layer(c, id, "lit", lit.has(k.note));
            pen.ellipse(
                ring,
                k.draw.x + k.draw.w / 2,
                k.draw.y + k.draw.h * 0.78,
                k.draw.w * 1.1,
                k.draw.h * 0.26,
                "doodle",
                null,
                { strokeWidth: 2.4, stroke: c.t.pen },
            );

            focusRing(c, id, k.draw);
            a[`key(${id})`] = [k.draw.x + k.draw.w / 2, 0, "up"];
        }

        const home = s.laid.find((k) => k.note === MIDDLE_C) ?? s.laid[0];
        if (!home) return a;
        a.home = [home.draw.x + home.draw.w / 2, 0, "up"];
        a.top = [W / 2, 0, "up"];
        a.under = [W / 2, s.box.h * U, "down"];
        return a;
    },
    describe: (p) =>
        `A piano keyboard of ${p.whites} white keys with the black keys between them, ${p.labels === "none" ? "unlettered" : "each white key lettered at its foot"}, middle C ringed when it is there.`,
    reads: true,
});
