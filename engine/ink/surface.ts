import type { TokenName, Tokens } from "../paper";
import type { Pen } from "./pen";

export type Side = "up" | "down" | "left" | "right";

/** A named point on a drawing, in squares from its top-left corner. */
interface Anchor {
    x: number;
    y: number;
    side: Side;
    /** How far a thing dropped here may land from it, in squares. */
    reach?: number;
}

export type Anchors = Record<string, Anchor>;

/** What a drawing's `draw` returns: its anchors in user units, `U` to a square, and a reach in units. */
export type RawAnchors = Record<string, [number, number, Side?, number?]>;

/**
 * One path of a shape the pen drew. rough.js draws a shape as up to three sets (the outline, a
 * solid fill and a sketched fill), and each set is one trace, carrying what rough.js's own SVG
 * renderer gives that set's path.
 */
export interface Trace {
    d: string;
    stroke: string;
    strokeWidth: number;
    fill: string;
    fillRule?: "evenodd";
    dash?: string;
    dashOffset?: number;
}

export type Face = "hand" | "read" | "mono";

/** A number in a turn, or one already written, as a drawing that wrote `x.toFixed(1)` keeps writing it. */
type Written = number | string;

export type Turn =
    | readonly ["translate", Written, Written]
    | readonly ["rotate", Written]
    | readonly ["rotate", Written, Written, Written]
    | readonly ["scale", Written]
    | readonly ["scale", Written, Written]
    | readonly ["matrix", number, number, number, number, number, number];

/**
 * A line of lettering. The face is a name, never a font: the SVG surface writes the page's
 * `var(--f-*)`, and a PDF surface would look the face up by its name.
 */
export interface Lettering {
    x: number;
    y: number;
    s: string;
    face: Face;
    weight: number;
    /** In user units. */
    size: number;
    fill: string;
    anchor: "start" | "middle" | "end";
    italic?: boolean;
    /** Letter spacing, in ems. */
    spacing?: number;
    /** Shantell Sans's informality axis, 0 to 100. */
    informal?: number;
    /** Shantell Sans's bounce axis, 0 to 100. */
    bounce?: number;
    /** A line round each letter, as a letter to trace over is drawn. `width` is in user units. */
    outline?: { stroke: string; width: number; dash?: string };
    turn?: readonly Turn[];
    /** Set along the curve `d` from `offset` per cent of its length, in place of `x`, `y` and `turn`. */
    along?: { d: string; offset: number };
}

/** How a plain shape is painted. `width` is the stroke's, in user units. */
interface Painted {
    fill?: string;
    stroke?: string;
    width?: number;
    dash?: string;
    cap?: "butt" | "round" | "square";
    join?: "miter" | "round" | "bevel";
    opacity?: number;
}

/** A shape drawn exactly, with no hand: the white patch under a number, a marker's wash, a disc. */
export type Plain = Painted &
    (
        | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number }
        | { kind: "circle"; cx: number; cy: number; r: number }
        | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
        | {
              kind: "path";
              d: string;
              /** Moved by this much, as a wash is laid a little off its line. */
              shift?: readonly [number, number];
              /** Turned as a whole, as a shadow is laid at a cut-out's place and size, in place of `shift`. */
              turn?: readonly Turn[];
          }
    );

/** A part of a drawing that may move on its own. `pivot` is in user units; see .docs/animation.md. */
export interface PartOf {
    name: string;
    pivot: readonly [number, number];
    /** -1 for a part drawn mirrored, so a left wing lifts the way a right one does. */
    dir?: number;
    /** How many ways round it looks the same, so a spin can come to rest on any of them. */
    symmetry?: number;
}

export interface GroupOf {
    turn?: readonly Turn[];
    /** The class a guide design's own styles and its motion pick the layer by. */
    layer?: string;
    /** Where the layer's styles turn and grow it from, in user units. */
    origin?: readonly [number, number];
    /** How far a guide's wing flaps under its styles, in degrees. */
    flap?: number;
    /** Hooks a page finds the group by, each written as a `data-` attribute, such as a key it lights. */
    data?: Readonly<Record<string, string>>;
    /** Drawn but not shown until a page shows it, as an instrument's lit key is. */
    hidden?: boolean;
    /** Round ends and joins for every line inside, as the icons are drawn. */
    round?: boolean;
    opacity?: number;
    part?: PartOf;
}

/** What a clip keeps, in user units. */
export type Region =
    | { kind: "rect"; x: number; y: number; w: number; h: number }
    | { kind: "polygon"; points: readonly (readonly [number, number])[] }
    | { kind: "path"; d: string };

/** A fill that is not one colour: a glow fading out from its middle, or a small tile repeated. */
export type Pattern =
    | {
          kind: "radial";
          /** `at` is how far out the stop is, in per cent. */
          stops: readonly { at: number; color: string; opacity: number }[];
      }
    | { kind: "tile"; w: number; h: number; turn?: readonly Turn[]; marks: readonly Plain[] };

/** A named fill printed as a hatch, which the SVG surface defines once in the drawing's own defs. */
export interface Hatch {
    hatch: TokenName;
    ink: string;
}

/**
 * A hand-drawn file's shapes as the file writes them, attribute for attribute in the file's order,
 * with its lines re-inked and its named fills worked out (engine/parts/imported/hand.ts), so a
 * surface writes the file rather than drawing it again.
 */
export interface Imported {
    /** Where the file's view box starts, which the shapes are moved back by. */
    from: readonly [number, number];
    shapes: readonly { tag: string; attrs: readonly (readonly [string, string | Hatch])[] }[];
}

/**
 * Where a drawing's ink goes. `G` is a group on the surface: an SVG element on the SVG surface in
 * `engine/ui/svg.ts`, a list on the recorder.
 */
export interface Surface<G> {
    /** One shape of the pen, as a group of its own in `parent`, its traces in painting order; `opacity` is the group's, as a halo or a beam is laid over the page. */
    shape(parent: G, traces: readonly Trace[], opacity?: number): void;
    /** A filled outline, which is how a stroke with pressure is drawn. */
    outline(parent: G, d: string, fill: string, opacity: number): void;
    letter(parent: G, l: Lettering): void;
    plain(parent: G, p: Plain): void;
    group(parent: G, o: GroupOf): G;
    /** A group in `parent` whose ink is cut to `region`. */
    clip(parent: G, region: Region): G;
    /** Defines `p` in `parent`, and returns the fill that paints with it. */
    pattern(parent: G, p: Pattern): string;
    /** A hand-drawn file, as one mark. */
    imported(parent: G, f: Imported): void;
}

export type Mark =
    | { kind: "shape"; traces: readonly Trace[]; opacity?: number }
    | { kind: "outline"; d: string; fill: string; opacity: number }
    | { kind: "letter"; l: Lettering }
    | { kind: "plain"; p: Plain }
    | { kind: "group"; o: GroupOf; marks: Mark[] }
    | { kind: "clip"; region: Region; marks: Mark[] }
    | { kind: "pattern"; id: string; p: Pattern }
    | { kind: "imported"; f: Imported };

/** A surface that keeps what is drawn onto it, for a test to read. A group is a list of marks. */
export const recorder: Surface<Mark[]> = {
    shape(parent, traces, opacity) {
        parent.push({ kind: "shape", traces, ...(opacity === undefined ? {} : { opacity }) });
    },
    outline(parent, d, fill, opacity) {
        parent.push({ kind: "outline", d, fill, opacity });
    },
    letter(parent, l) {
        parent.push({ kind: "letter", l });
    },
    plain(parent, p) {
        parent.push({ kind: "plain", p });
    },
    group(parent, o) {
        const marks: Mark[] = [];
        parent.push({ kind: "group", o, marks });
        return marks;
    },
    clip(parent, region) {
        const marks: Mark[] = [];
        parent.push({ kind: "clip", region, marks });
        return marks;
    },
    pattern(parent, p) {
        const id = `pattern-${parent.length}`;
        parent.push({ kind: "pattern", id, p });
        return `url(#${id})`;
    },
    imported(parent, f) {
        parent.push({ kind: "imported", f });
    },
};

/**
 * What a drawing draws with: a pen, its group, its colours, and the surface for what is not drawn by
 * hand, which is the pen's own when none is handed, as it is to a drawing the scratchpad still draws.
 */
export interface Ctx<G, P = Pen<G>> {
    pen: P;
    ink?: Surface<G>;
    g: G;
    t: Tokens;
    paper: boolean;
}

const inkOf = <G>(c: Ctx<G>): Surface<G> => c.ink ?? c.pen.ink;

export const letter = <G>(c: Ctx<G>, l: Lettering): void => inkOf(c).letter(c.g, l);

export const plain = <G>(c: Ctx<G>, p: Plain): void => inkOf(c).plain(c.g, p);

/** A group inside the drawing, and the context that draws into it. */
export const group = <G>(c: Ctx<G>, o: GroupOf): Ctx<G> => ({ ...c, g: inkOf(c).group(c.g, o) });

/** The context that draws into a group cut to `region`. */
export const clip = <G>(c: Ctx<G>, region: Region): Ctx<G> => ({
    ...c,
    g: inkOf(c).clip(c.g, region),
});

export const pattern = <G>(c: Ctx<G>, p: Pattern): string => inkOf(c).pattern(c.g, p);

export const imported = <G>(c: Ctx<G>, f: Imported): void => inkOf(c).imported(c.g, f);

/**
 * A part that may move on its own, drawn into like the drawing itself. On paper it is the drawing's
 * own group, so what prints is what printed before the part was named.
 */
export const part = <G>(
    c: Ctx<G>,
    name: string,
    pivot: readonly [number, number],
    o: { dir?: number; symmetry?: number } = {},
): Ctx<G> => (c.paper ? c : group(c, { part: { name, pivot, ...o } }));

/**
 * A drawing. It never knows where it will be placed: it declares its box in squares and draws in
 * user units, and the slot it is drawn into chooses the scale. `C` is the context it draws with.
 */
export interface Visual<P, C> {
    id: string;
    title: string;
    group: "Structures" | "Props" | "Characters" | "Marks" | "Inputs" | "Imported";
    about: string;
    params: P;
    /**
     * What a list setting holds, for the settings whose default is an empty list. An empty default
     * cannot show what its elements are, so a drawing that wants a lesson to write one says here
     * whether they are numbers or words; without it the setting stays the drawing's own.
     */
    lists?: Record<string, "num" | "word">;
    /**
     * The words a setting accepts, for a setting whose value is one of a fixed set of words. Declared,
     * a question may choose the word with a parameter (`kind=k`) and the verifier checks every variant
     * lands on one of them. Undeclared, the setting takes a fixed word only, and a parameter name
     * written there is refused rather than read as a word: that is how a solid once drew "k" as a
     * cube while the answer key said sphere.
     */
    choices?: Record<string, readonly string[]>;
    box(p: P): { w: number; h: number };
    draw(c: C, p: P): RawAnchors;
    /**
     * What a screen reader says: what is seen, never what it means or the answer, in 15 to 30
     * words. Null for a drawing that always sits beside its word, which then names it.
     */
    describe?(p: P): string | null;
}
