import type { Ctx, RawAnchors } from "../ink/surface";
import { rigid, type Animation } from "../motion/animation";
import type { Key } from "../sound/keys";
import type { VoiceName } from "../sound/voices";

/** Every drawing's family is the shelf it is found on, and a folder of engine/parts. */
export const FAMILIES = [
    "animals",
    "people",
    "food",
    "home",
    "outdoors",
    "places",
    "travel",
    "sport",
    "counting",
    "place",
    "sums",
    "puzzles",
    "fractions",
    "shapes",
    "measuring",
    "money",
    "time",
    "data",
    "letters",
    "stories",
    "writing",
    "art",
    "music",
    "science",
    "coding",
    "page",
    "apps",
    "guide",
] as const;
export type Family = (typeof FAMILIES)[number];

/** The families whose paper is a reading: a count, a length, a time, a price, a share. Kept in step with the Maths band in shelf.ts. */
export const MATHS: ReadonlySet<Family> = new Set([
    "counting",
    "place",
    "sums",
    "puzzles",
    "fractions",
    "shapes",
    "measuring",
    "money",
    "time",
    "data",
]);

/**
 * Settings whose name says they hold a reading. A drawing's description never changes with one, and
 * a drawing with one that moves declares `reads` or is still.
 */
export const READING_WORDS: readonly string[] = [
    "h",
    "m",
    "hour",
    "minute",
    "time",
    "seconds",
    "sweep",
    "value",
    "level",
    "reading",
    "needle",
    "tilt",
    "deg",
    "now",
    "was",
    "price",
    "total",
    "home",
    "away",
    "scores",
    "percent",
    "lands",
    "phase",
    "height",
    "shots",
];

type Fixed = { kind: "fixed" };

/**
 * What a lesson may write for one setting, and the range the verifier holds every variant to. A
 * setting is `fixed` when the notation has no spelling for it (a list of objects), so the drawing
 * keeps its own value.
 */
type SettingFor<V> = [V] extends [boolean]
    ? { kind: "flag" }
    : [V] extends [number]
      ? | { kind: "whole"; min: number; max: number }
        | { kind: "number"; min: number; max: number; step: number }
        | { kind: "one of"; of: readonly V[] }
        | Fixed
      : [V] extends [string]
        ? { kind: "one of"; of: readonly V[] } | { kind: "text"; most: number } | Fixed
        : [V] extends [readonly number[]]
          ? { kind: "numbers"; min: number; max: number; most: number } | Fixed
          : [V] extends [readonly string[]]
            ? { kind: "words"; of?: readonly V[number][]; most: number } | Fixed
            : Fixed;

export type Settings<P> = { [K in keyof P]-?: SettingFor<P[K]> };

/** One drawing of it on the shelf, and a fixture for its tests: settings, a label, a seed offset. */
export interface Take<P> {
    label: string;
    params: P;
    seed?: number;
}

/** In whole squares. One square is 20 user units and 5 mm. */
export interface Box {
    w: number;
    h: number;
}

export interface Drawing<P> {
    id: string;
    family: Family;
    title: string;
    group: "Structures" | "Props" | "Characters" | "Marks" | "Inputs" | "Imported";
    about: string;
    params: P;
    settings: Settings<P>;
    takes: readonly Take<P>[];
    box(p: P): Box;
    /** Draws in user units onto any surface and returns its anchors; it never knows where it is placed. */
    draw<G>(c: Ctx<G>, p: P): RawAnchors;
    /**
     * What a screen reader says: what is seen, never what it means or the answer, in 15 to 30
     * words. Null for a drawing that always sits beside its word, which then names it.
     */
    describe(p: P): string | null;
    /** How it moves, when not as its family does; see .docs/animation.md. */
    motion?: Animation;
    /** It carries a value a lesson may ask about, so it moves only by travel, if at all. */
    reads?: true;
}

/** A drawing's settings type is read from its `params` alone, so a take cannot widen a word to a string. */
export const defineDrawing = <P>(d: Drawing<NoInfer<P>> & { params: P }): Drawing<P> => d;

/**
 * The contract's one extension: an instrument is a drawing that is played. It declares where each
 * key is (its note, its anchor, its hit rectangle, in user units) and the voice it plays with, so
 * the mount that lights a key and sounds its note reads both off the declaration rather than off
 * the shape of the drawing. The catalogue lists it as a drawing.
 */
export interface Instrument<P> extends Drawing<P> {
    keys(p: P): Key[];
    voice: VoiceName;
}

export const defineInstrument = <P>(d: Instrument<NoInfer<P>> & { params: P }): Instrument<P> => d;

/** Whether a catalogued drawing is an instrument, which the parts' suites check further. */
export const isInstrument = <P>(d: Drawing<P>): d is Instrument<P> => "keys" in d && "voice" in d;

/** What a drawing is, from its group: a thing, paper (a chart, a frame, a mark), or a place a child writes or taps. */
export type Kind = "thing" | "paper" | "input";

export const kindOf = (group: string | undefined): Kind =>
    group === "Inputs" ? "input" : group === "Structures" || group === "Marks" ? "paper" : "thing";

/** Why a family's drawings, or a drawing that declares it, hold still. */
export const STILL = {
    input: "A place the child writes or taps. Nothing moves under a pencil.",
    letters: "Letters and words hold still to be read.",
    text: "It is read line by line, and words that move are harder to read.",
    writing: "It is written on, and a page holds still under the pencil.",
    music: "Notes are read in order along the staff, and hold still as text does.",
    building:
        "A building stands still. Where one has a part that moves (sails, a lamp, smoke), that part moves instead.",
    instrument: "An instrument holds still while its reading is taken.",
    control: "A control and the apps' own pictures hold still: they answer a press, not the clock.",
    compared: "A colour, a pattern or a mirror a question asks about holds still to be compared.",
    setting:
        "A setting is the ground other drawings stand on; if it moved, everything on it would seem to slide.",
    clues: "A picture a reading question is checked against, so its clues hold still.",
} as const;

const bob = (lift: number): Animation => ({ body: { is: "bob", lift } });
const stir: Animation = { body: { is: "stir" } };

/**
 * How a family's drawings move when they declare nothing: a thing the way that kind of thing moves,
 * paper with a stir now and then. Beside the contract rather than in catalog.ts, so working out one
 * drawing's motion never loads the catalogue.
 */
export const DEFAULTS: Record<Family, { thing: Animation; paper: Animation }> = {
    animals: { thing: { body: { is: "idle" } }, paper: stir },
    people: { thing: { body: { is: "idle" } }, paper: stir },
    food: { thing: { body: { is: "breathe", amt: 0.035 } }, paper: stir },
    home: { thing: { body: { is: "sway", deg: 2.6, bend: true } }, paper: stir },
    outdoors: { thing: { body: { is: "sway", deg: 3.2, period: 4.3, bend: true } }, paper: stir },
    places: { thing: { still: STILL.building }, paper: { still: STILL.building } },
    travel: { thing: { body: { is: "float", deg: 1.6, lift: 0.03, period: 6.4 } }, paper: stir },
    sport: { thing: { body: { is: "bob" } }, paper: stir },
    counting: { thing: bob(0.035), paper: stir },
    place: { thing: bob(0.035), paper: stir },
    sums: { thing: bob(0.035), paper: stir },
    puzzles: { thing: bob(0.035), paper: stir },
    fractions: { thing: bob(0.035), paper: stir },
    shapes: { thing: bob(0.035), paper: stir },
    measuring: { thing: bob(0.03), paper: { still: STILL.instrument } },
    money: { thing: bob(0.035), paper: stir },
    time: { thing: bob(0.03), paper: stir },
    data: { thing: bob(0.035), paper: stir },
    letters: { thing: { still: STILL.letters }, paper: { still: STILL.letters } },
    stories: { thing: stir, paper: { still: STILL.text } },
    writing: { thing: { body: { is: "idle" } }, paper: { still: STILL.writing } },
    // the paints and the tools stir and dip without turning, since a colour in a well or a dot may be asked about
    art: { thing: { body: { is: "stir", deg: 0 } }, paper: { still: STILL.compared } },
    music: { thing: stir, paper: { still: STILL.music } },
    science: { thing: { body: { is: "breathe", amt: 0.03 } }, paper: stir },
    coding: { thing: { body: { is: "bob" } }, paper: stir },
    page: { thing: bob(0.035), paper: stir },
    apps: { thing: { still: STILL.control }, paper: { still: STILL.control } },
    // the layers each guide design already tags for its own styles, so a design moves only what it drew
    guide: {
        thing: {
            parts: {
                breathe: { is: "breathe", pick: ".g-breathe", amt: 0.03, period: 4.4 },
                bob: { is: "bob", pick: ".g-bob", lift: 1.8, arc: 0, deg: 0, period: 2.8 },
                squash: { is: "breathe", pick: ".g-squash", amt: -0.05, period: 2.6 },
                sway: { is: "sway", pick: ".g-sway", deg: 2.2, period: 6.8 },
                flutter: {
                    is: "flap",
                    pick: ".g-flutter",
                    deg: 9,
                    beat: 0.2,
                    burst: 2,
                    period: 2.6,
                },
                flicker: { is: "twinkle", pick: ".g-flicker", dim: 0.26, amt: 0, period: 1.9 },
                pulse: { is: "twinkle", pick: ".g-pulse", dim: 0, amt: -0.07, period: 2.4 },
                blink: { is: "blink", pick: ".g-open", period: 5.4 },
                zed: { is: "flow", pick: ".g-z", dx: 1.6, lift: 2.6, period: 3.2 },
            },
        },
        paper: { still: STILL.control },
    },
};

const moves = (a: Animation): boolean =>
    a.body !== undefined || Object.keys(a.parts ?? {}).length > 0;

export interface Resolved {
    anim: Animation;
    from: "drawing" | "family";
    reads: boolean;
    /** Why it is still, or null when it moves. */
    still: string | null;
}

/** How a drawing moves, every rule applied: its own declaration or its family's, then the reading rule. */
export function motionOf<P>(d: Drawing<P>): Resolved {
    const kind = kindOf(d.group);
    const reads = d.reads === true || (kind === "paper" && MATHS.has(d.family));
    const declared =
        d.motion ?? (kind === "input" ? { still: STILL.input } : DEFAULTS[d.family][kind]);
    const anim = reads && moves(declared) ? rigid(declared) : declared;
    const why =
        anim.still ??
        (reads
            ? "It carries a reading, and its motion was all turning or growing."
            : "It declares no motion.");
    return {
        anim,
        from: d.motion ? "drawing" : "family",
        reads,
        still: moves(anim) ? null : why,
    };
}
