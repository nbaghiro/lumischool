// The shape every guide design shares, and how a design becomes a drawing on the shelf. A design
// is a pure drawing function: it gets a guide context, a pose and somewhere to look, and returns
// the anchors a scene attaches arrows and speech to. Designs draw in a 60 by 60 box, which is the
// 3 by 3 squares the notation gives the guide node; the page's renderer (engine/ui/guide.ts)
// decides how big that box is on screen, and the shelf shows the box itself. A guide's idle is its
// family's motion in drawing.ts, on the layers a design tags, played by engine/ui/animate.ts.
import { rng } from "../../ink/pen";
import type { Ctx, RawAnchors, Side } from "../../ink/surface";
import { defineDrawing, type Drawing } from "../drawing";

/**
 * The poses a design has to draw. Point, count and write all aim at something and differ in what
 * they ask for: point says "this part", count says "these, one at a time, in order", and write says
 * "your answer goes here". The three sit next to each other because a design draws them the same
 * way, with a different mark beside the hand.
 */
export const POSES = [
    "idle",
    "point",
    "count",
    "write",
    "cheer",
    "think",
    "retry",
    "rest",
] as const;
export type GuidePose = (typeof POSES)[number];
export const POSE_LABEL: Record<GuidePose, string> = {
    idle: "Idle",
    point: "Point",
    count: "Count along",
    write: "Write here",
    cheer: "Cheer",
    think: "Thinking",
    retry: "Try again",
    rest: "Resting",
};

/** The poses that aim at something, so a design can decide where to look with one test. */
export const AIMING: readonly GuidePose[] = ["point", "count", "write"];
export const aims = (p: GuidePose): boolean => AIMING.includes(p);

export type Pt = [number, number];

/** Size class of one drawing. Small drawings get heavier lines and lose detail, as icons do. */
export type Detail = "tiny" | "inline" | "hero";

/** Idle motions a design supports. Each is a layer the design tags, which the guide family's motion moves. */
export type Motion =
    "bob" | "blink" | "flutter" | "flicker" | "sway" | "squash" | "pulse" | "breathe";

export interface GuideState {
    pose: GuidePose;
    /** What to look or point at, in the guide's own units. May lie outside the 0..60 box. */
    aim?: Pt;
}

export interface GuideCtx<G> extends Ctx<G> {
    detail: Detail;
    /** Turns a line width given in pixels at 60 px into this drawing's units. */
    line: number;
    /** The same for wobble: how far a hand-drawn line may wander. */
    wob: number;
    /** Seeded random numbers for this frame. Inked strokes use them to boil between frames. */
    rand: () => number;
    /** Which boil frame this is (0, 1 or 2). A design can move a part a little between frames. */
    frame: number;
}

/** hand is where an arrow to the target starts; head is where speech attaches. */
export type GuideAnchors = RawAnchors & {
    hand: [number, number, Side];
    head: [number, number, Side];
};

export interface GuideDesign {
    id: string;
    name: string;
    /** The idea in one line. */
    concept: string;
    /** What it is drawn with. */
    construction: string;
    /** How it points and how it shows feeling. */
    acting: string;
    strengths: string[];
    weaknesses: string[];
    motions: Motion[];
    /** How it connects to what it means: an arrow from its hand, or a beam it draws itself. */
    link: "arrow" | "beam";
    /** Fixed, so a drawing only changes when its pose or aim changes. */
    seed: number;
    draw<G>(c: GuideCtx<G>, s: GuideState): GuideAnchors;
}

/** What a guide on the shelf takes: its pose, and a point to aim at when a scene gives one. */
export interface GuideParams {
    pose: GuidePose;
    aim: Pt | undefined;
}

/** The context a design draws with when the shelf or a scene draws it at the box's own size. */
export const guideCtx = <G>(c: Ctx<G>, frame = 0): GuideCtx<G> => ({
    ...c,
    detail: "tiny",
    line: 1,
    wob: 1,
    frame,
    rand: rng(c.pen.o.seed),
});

/** A guide on the shelf, carrying its design, so a page can draw it at any size through engine/ui/guide.ts. */
export type GuideDrawing = Drawing<GuideParams> & { design: GuideDesign };

/**
 * A design as a drawing on the shelf: a 3 by 3 box drawn at the scene's scale, with the design's
 * own anchors, in the poses a lesson asks for. Every guide describes itself the same way, as the
 * character and its pose and never what it points at.
 */
export function guideDrawing(d: GuideDesign, said: (pose: GuidePose) => string): GuideDrawing {
    const drawing = defineDrawing<GuideParams>({
        id: `guide.${d.id}`,
        family: "guide",
        title: d.name,
        group: "Characters",
        about: d.concept,
        params: { pose: "idle", aim: undefined },
        settings: { pose: { kind: "one of", of: POSES }, aim: { kind: "fixed" } },
        takes: [
            { label: "Idle", params: { pose: "idle", aim: undefined } },
            { label: "Pointing", params: { pose: "point", aim: undefined } },
            { label: "Cheering", params: { pose: "cheer", aim: undefined } },
            { label: "Thinking", params: { pose: "think", aim: undefined } },
        ],
        box: () => ({ w: 3, h: 3 }),
        draw: (c, p) => d.draw(guideCtx(c), p),
        describe: (p) => said(p.pose),
    });
    return { ...drawing, design: d };
}
