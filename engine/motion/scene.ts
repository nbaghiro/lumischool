// What the engine draws, as data.
//
// A game never touches the page. A turn game gives a scene: shelf drawings named by key and placed
// on a sheet of squares, which the board keeps while a key survives, glides when a place changes and
// draws again when a setting changes. An action game gives a frame: keyed sprites under a camera,
// which the game view draws on the GPU. Both carry marks, which are ink over the
// drawings (a ring round a target, an aim, the dots of a flight, a word), and both are plain data,
// so a test reads them in node and the prover never sees them. See .docs/engine.md.
import type { Cue } from "./cues";
import type { GameEvent } from "./goals";
import type { Pt } from "./geometry";
import type { Spring } from "./spring";

/**
 * One shelf drawing on the sheet of a turn game's scene. The first six fields are the model's board
 * part as it stands in the games' mechanic contract, so a mechanic's board is a scene as it is; the
 * rest are the view's.
 */
export interface Part {
    /** The drawing's id on the shelf. */
    art: string;
    params: Record<string, unknown>;
    /** Shown under the drawing where it needs naming. */
    label?: string;
    /** A teacher's pen on the drawing's own anchors: a loop round a number, a tick, a star. */
    marks?: { mark: "star" | "tick" | "loop"; at: string }[];
    /** A name that outlives one position, so the stage moves the drawing it has rather than drawing a new one. */
    key?: string;
    /** Where the part's top left sits on the sheet, in squares. A part without one is laid in a row. */
    at?: { x: number; y: number };
    /** Drawn this many squares across instead of at its own box, for a piece smaller than its drawing. */
    size?: number;
    /** Higher is drawn over lower. Unset keeps the order of the list. */
    z?: number;
    /** Clockwise radians it is turned by, about `pivot`. */
    angle?: number;
    /** Where it turns, in squares from its top left: a jug about its spout. Its middle when left out. */
    pivot?: Pt;
    /** Squashed by this much and stretched the other way, about its foot: the follow-through of a landing. */
    squash?: number;
    /** Drawn this much bigger or smaller about its foot, for a thing that pops out of a machine or goes into one. */
    scale?: number;
    /** Where a hand holds it, in squares from its top left, so it hangs and sways from there while it is carried. Left out, it does not sway. */
    hold?: Pt;
    /** A part of the drawing, in squares from its top-left corner, drawn instead of the whole. */
    crop?: { x: number; y: number; w: number; h: number };
}

/** A turn game's board: the parts it is made of, on a sheet of squares. */
export interface Scene {
    parts: Part[];
    /** The sheet, in squares. Left out, it is the smallest sheet that holds the parts. */
    size?: { w: number; h: number };
}

export interface ShowOptions {
    /** A spring per numeric setting that is morphed rather than switched. Unlisted settings switch. */
    morph?: Record<string, Spring>;
    /** The spring a moved part glides with. */
    glide?: Spring;
    /** Leave parts that are not in this scene where they are, for a scene given in two passes. */
    keep?: boolean;
    /** Put every part where the scene says at once, with no glide or morph, for the start of a beat. */
    jump?: boolean;
}

/** A drawing on an action game's field. Places are in squares, and x, y is the drawing's centre, or the middle of its foot when it stands. */
export interface Sprite {
    key: string;
    art: string;
    params?: Record<string, unknown>;
    x: number;
    y: number;
    /** Radians, clockwise, about the centre. */
    angle?: number;
    /** Higher is drawn over lower. */
    z?: number;
    /** A part of the drawing, in squares from its top-left corner, drawn instead of the whole. */
    crop?: { x: number; y: number; w: number; h: number };
    /** Drawn at this many squares across instead of the drawing's own box. */
    size?: number;
    flip?: boolean;
    seed?: number;
    /** Faded, for a thing that is there and does not count (a number that is not next). */
    faint?: boolean;
    /**
     * Squashed by this much and stretched the other way, about its base: the follow-through of a
     * landing, sprung back by the game. Nought, or left out, is the drawing's own shape.
     */
    squash?: number;
    /** Stays where it was put: drawn once and never moved, so it costs nothing per frame. */
    still?: boolean;
    /** Placed by the middle of its foot rather than its centre, so a scene stands a drawing on a line without knowing how tall it is. */
    stand?: boolean;
    /**
     * How far off it is, as the share of the camera's travel across that it moves by: a hill at a third
     * moves a third as far as the world does, and a tuft at one and a half passes in front of it. Up and
     * down it moves with the world. One, or left out, is the world.
     */
    depth?: number;
    /** Placed in the view's own squares from its top left, not the world's, and never moved by the camera: the readouts a game keeps in sight. */
    fixed?: boolean;
    /** Drawn this much bigger or smaller about its centre, for a thing that pops in or out. */
    scale?: number;
    /** How much of it shows, from nought to one. */
    alpha?: number;
    /**
     * Drawn again whenever its settings change, rather than drawn once and kept: a needle swinging to
     * its reading, a level rising. It costs a drawing a frame while it moves, so it is for one or two
     * things at a time.
     */
    live?: boolean;
    /** A teacher's pen on the drawing's own anchors, drawn into its look. */
    marks?: Part["marks"];
    /**
     * Glows this many squares round its centre: a halo in the hue of the light, drawn under the
     * sprite so its own light does not tint it.
     */
    glow?: number;
}

/** The colours a light or a stretch of water is drawn in, from the palette. */
export type Hue = "glow" | "tang" | "sky" | "mint" | "berry";

/**
 * Water across the world from `x` for `w` squares, its still surface at `level` and its bed at
 * `bottom`. It is drawn over the world's sprites at or under its depth, so what sinks shows through
 * it, and under the ones above, so what floats sits on it. `surfaceAt` in engine/motion/surface.ts
 * is where the surface is at a place and a moment, the same as it is drawn.
 */
/** A body of drops, drawn as one water: their places as x, y pairs, each drop `r` squares across its middle. */
export interface Pool {
    drops: number[];
    r: number;
    hue?: Hue;
    /** Drawn over the sprites at or under this depth and under the ones above, like a water; 3 when left out. */
    z?: number;
}

export interface Water {
    x: number;
    w: number;
    level: number;
    bottom: number;
    /** How high its waves reach, in squares; 0.12 when left out, and 0 for a still pond. */
    waves?: number;
    /** Squares a second its surface travels to the right, for a river; less than nought runs left. */
    flow?: number;
    /** Rings running out from where something broke the surface, `age` seconds ago, `size` from nought to one and more. */
    ripples?: { x: number; age: number; size?: number }[];
    /** 3 when left out: over the ground and under what stands in it. */
    z?: number;
    hue?: Hue;
}

/** A light in the world, `r` squares round, washing its hue into the paper under it. */
export interface Light {
    x: number;
    y: number;
    r: number;
    /** From nought to one; one when left out. */
    strength?: number;
    hue?: Hue;
    /** Flickers like a flame or a firefly, except under reduced motion. */
    flicker?: boolean;
}

/** An action game's world at one step of its loop, as the field draws it. */
export interface Frame {
    sprites: Sprite[];
    marks: Mark[];
    /** The centre of the view, in squares, and how much of the view a square takes (1 is the page's square). */
    camera: { x: number; y: number; zoom?: number };
    /** How much of the world is in view, in squares. */
    view: { w: number; h: number };
    world: { w: number; h: number };
    /**
     * The game's clock in seconds, which waves and flickers are drawn at, so what a game floats on
     * the water and the water agree. Left out, the view keeps a clock of its own.
     */
    time?: number;
    water?: Water[];
    /** Water as drops, run together where they touch: a pour, a stream down a run. */
    liquid?: Pool[];
    lights?: Light[];
}

/** The small things a burst throws, each a shelf drawing: dust, sparkles, drops of water and bubbles. */
export type BurstKind = "dust" | "sparkle" | "splash" | "bubble";

/**
 * What a step asks of the page besides a new frame: a sound, a puff of dust, a burst of small
 * things thrown round `dir` (radians, straight up when left out), or a shake. None of them carries
 * information, so reduced motion drops all but the sound. An event is what happened, for goals,
 * checkpoints and replay rather than for the eye.
 */
export type Happening =
    | { event: GameEvent }
    /** A sound, as hard as `strength` says from nought to one, `pitch` times higher, and at `pan` from -1 at the left to 1. */
    | { cue: Cue; strength?: number; pitch?: number; pan?: number }
    | { puff: { x: number; y: number; n: number } }
    | { burst: { kind: BurstKind; x: number; y: number; n: number; dir?: number } }
    | { shake: number };

/**
 * Ink over the drawings, in squares. The same marks are drawn over a scene and over a frame, in the
 * pen's colour and dashed rather than coloured where they are a hint, so no hint is colour alone.
 */
export type Mark =
    | { kind: "dots"; pts: Pt[]; faint?: boolean; opacity?: number }
    /**
     * A straight line, or an arc when `bend` lifts its middle by that many squares (a sag when it is
     * less than nought), with a head at `b` when it is an arrow. A rod is drawn heavy and a thin line
     * (a fishing line, a thread) light. A stream is water from a spout or a tap, as wide as `weight`
     * says it is running, from nought to one.
     */
    | {
          kind: "line";
          a: Pt;
          b: Pt;
          bend?: number;
          style?: "ink" | "aim" | "crash" | "rod" | "thin" | "stream";
          head?: boolean;
          weight?: number;
      }
    /** Where a held piece may go: dashed, and solid with a wash when the hand is over it. */
    | {
          kind: "ring";
          x: number;
          y: number;
          r: number;
          on?: boolean;
          /** Drawn whole rather than dashed, for a ring too small for a dash to read, such as a count of pieces. */
          solid?: boolean;
      }
    | { kind: "box"; x: number; y: number; w: number; h: number; on?: boolean }
    | { kind: "word"; x: number; y: number; text: string; size?: number }
    | { kind: "puff"; x: number; y: number; r: number };
