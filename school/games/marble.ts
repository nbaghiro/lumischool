// Marble workshop: build a marble run that sends each hopper's marbles into the cup that wants them.
//
// Hoppers along the top each drop a numbered batch of marbles, and cups along the bottom each want a
// number of marbles. The child takes ramps, a bouncer, a funnel, a see-saw, a splitter that sends
// every other marble the other way and a bucket that tips out a handful at a time from the parts tray,
// drags them anywhere on the workbench and turns them by an end, and a faint path shows where one
// marble from each hopper would go. Pressing Go drops every marble at once, and real physics decides
// where each one lands: marbles knock each other, bounce, tip the see-saw and pile into the cups,
// which count as they fill. The mathematics is in the numbers: which hoppers together make a cup's
// number, and how to share every marble so the cups come out equal. A run that misses costs nothing;
// the machine stays as it was built, ready to change and run again. See .docs/games.md.
import { bodies, type Bodies, type Body, type Joint } from "../../engine/motion/bodies";
import {
    checkpoint,
    edit,
    redo,
    restore,
    undo,
    workshop,
    type Piece,
    type Workshop,
} from "../../engine/motion/construction";
import type { Pt } from "../../engine/motion/geometry";
import {
    calm,
    count,
    drain,
    dropAt,
    liquid,
    places,
    pour,
    solidsOf,
    stepLiquid,
    WATER,
    type Liquid,
} from "../../engine/motion/liquid";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import type { ActionGame, ActionLevel, Levels } from "./game";

type Colour = "sky" | "mint" | "berry" | "tang" | "glow";
export type PartKind =
    "short" | "ramp" | "long" | "bouncer" | "funnel" | "seesaw" | "splitter" | "bucket";

export interface MarbleLevel extends ActionLevel {
    /**
     * Hoppers along the top: where each stands, how many marbles it drops, and their colour. A tank
     * lets out water instead, `n` litres of it, which a cup reads in litres.
     */
    chutes: { x: number; n: number; colour: Colour; water?: true }[];
    /** Cups on the floor: where each stands, how wide it is, and how many marbles it wants. */
    cups: { x: number; w: number; want: number; colour: Colour }[];
    /** Blocks and pegs that are part of the place, which the marbles have to get round. */
    fixed: { part: "wall" | "peg"; x: number; y: number; w?: number; h?: number }[];
    /** The parts in the tray, which the child places. */
    tray: PartKind[];
    prompt: string;
    /** The marbles' radius, in squares, smaller where a level drops a great many. */
    r?: number;
    /** Seconds between the marbles of one batch; left out, the tuned gap. */
    gap?: number;
    /** How many marbles a bucket holds before it tips them out. */
    tip?: number;
    /** How far apart across a hopper's mouth its marbles leave, in squares; left out, all from its middle. */
    spread?: number;
}

export const MARBLE_LEVELS: Levels<MarbleLevel> = [
    {
        title: "Into the cup",
        grades: [1, 1],
        goal: "Build a run that takes all five marbles into the cup that wants 5.",
        prompt: "Drag a ramp from the parts tray under the hopper, then press Go.",
        chutes: [{ x: 6, n: 5, colour: "sky" }],
        cups: [{ x: 27, w: 5, want: 5, colour: "sky" }],
        fixed: [{ part: "wall", x: 17, y: 25, w: 2, h: 6 }],
        tray: ["long", "ramp"],
    },
    {
        title: "Five and three",
        grades: [1, 1],
        goal: "The cup wants 8. Bring the 5 and the 3 together into it.",
        prompt: "Two hoppers, one cup. Which marbles make 8?",
        chutes: [
            { x: 5, n: 5, colour: "sky" },
            { x: 33, n: 3, colour: "berry" },
        ],
        cups: [{ x: 19, w: 5, want: 8, colour: "mint" }],
        fixed: [],
        tray: ["long", "long", "short"],
    },
    {
        title: "Make ten",
        grades: [1, 2],
        goal: "One cup wants 10 and one wants 3. Send each hopper to the right cup.",
        prompt: "Which two hoppers make 10?",
        chutes: [
            { x: 5, n: 6, colour: "sky" },
            { x: 20, n: 4, colour: "berry" },
            { x: 34, n: 3, colour: "tang" },
        ],
        cups: [
            { x: 12, w: 5, want: 10, colour: "mint" },
            { x: 27, w: 5, want: 3, colour: "tang" },
        ],
        fixed: [],
        tray: ["long", "long", "ramp", "short"],
    },
    {
        title: "Over the wall",
        grades: [2, 3],
        goal: "The cup behind the wall wants 12. The bouncer can send marbles over.",
        prompt: "A marble dropped on the bouncer jumps. Aim it over the wall.",
        chutes: [
            { x: 5, n: 7, colour: "sky" },
            { x: 13, n: 5, colour: "glow" },
        ],
        cups: [{ x: 31, w: 5, want: 12, colour: "mint" }],
        fixed: [{ part: "wall", x: 24, y: 22, w: 2, h: 12 }],
        tray: ["bouncer", "long", "ramp", "funnel"],
    },
    {
        title: "Share them out",
        grades: [2, 3],
        goal: "Share all the marbles so both cups get the same.",
        prompt: "Count every marble first. How many should each cup get?",
        chutes: [
            { x: 5, n: 5, colour: "sky" },
            { x: 19, n: 3, colour: "berry" },
            { x: 33, n: 8, colour: "tang" },
        ],
        cups: [
            { x: 11, w: 5, want: 8, colour: "mint" },
            { x: 28, w: 5, want: 8, colour: "mint" },
        ],
        fixed: [{ part: "wall", x: 19.5, y: 25, w: 2, h: 6 }],
        tray: ["long", "long", "ramp", "ramp", "funnel"],
    },
    {
        title: "Twelve and twelve",
        grades: [3, 4],
        goal: "Share 24 marbles into two cups of 12. The see-saw tips under a pile of marbles.",
        prompt: "Plan which hoppers make 12 before you build.",
        chutes: [
            { x: 5, n: 9, colour: "sky" },
            { x: 14, n: 5, colour: "berry" },
            { x: 23, n: 3, colour: "tang" },
            { x: 32, n: 7, colour: "glow" },
        ],
        cups: [
            { x: 8, w: 6, want: 12, colour: "mint" },
            { x: 30, w: 6, want: 12, colour: "mint" },
        ],
        fixed: [
            { part: "wall", x: 19, y: 23, w: 2, h: 10 },
            { part: "peg", x: 10, y: 16 },
        ],
        tray: ["long", "long", "ramp", "ramp", "seesaw", "bouncer"],
    },
    {
        title: "Half each",
        grades: [2, 2],
        goal: "Share the 12 marbles so each cup gets half of them.",
        prompt: "The splitter sends one marble one way and the next marble the other way.",
        chutes: [{ x: 19, n: 12, colour: "sky" }],
        cups: [
            { x: 8, w: 5, want: 6, colour: "mint" },
            { x: 30, w: 5, want: 6, colour: "mint" },
        ],
        fixed: [],
        tray: ["splitter", "long", "long"],
        gap: 0.5,
    },
    {
        title: "Fives in the bucket",
        grades: [2, 3],
        goal: "The cup wants 10 of the 13 marbles. The bucket tips out 5 at a time.",
        prompt: "How many fives are in 13, and how many are left in the bucket?",
        chutes: [{ x: 8, n: 13, colour: "glow" }],
        cups: [{ x: 27, w: 5, want: 10, colour: "tang" }],
        fixed: [],
        tray: ["bucket", "long", "ramp"],
        r: 0.3,
        // a marble a little slower than the bucket tips and swings back, so none arrives mid-swing
        gap: 1.2,
        tip: 5,
        spread: 0.3,
    },
    {
        title: "A hundred marbles",
        grades: [3, 4],
        goal: "One cup wants 70 and one wants 30. Send every hopper to the right cup.",
        prompt: "Which two hoppers make 70?",
        chutes: [
            { x: 4, n: 50, colour: "sky" },
            { x: 17, n: 20, colour: "berry" },
            { x: 30, n: 30, colour: "tang" },
        ],
        cups: [
            { x: 10, w: 8, want: 70, colour: "mint" },
            { x: 30, w: 6, want: 30, colour: "tang" },
        ],
        fixed: [],
        tray: ["short", "short", "ramp"],
        r: 0.22,
        gap: 0.06,
        spread: 0.5,
    },
    {
        title: "A water run",
        grades: [1, 2],
        goal: "The tanks hold 5 litres and 3 litres. Run all the water over the wall into the cup that wants 8.",
        prompt: "Water runs down a ramp like a marble does, and keeps running.",
        chutes: [
            { x: 8, n: 5, colour: "sky", water: true },
            { x: 14, n: 3, colour: "sky", water: true },
        ],
        cups: [{ x: 30, w: 8, want: 8, colour: "sky" }],
        // a board behind the cup, as a real run has, so water that comes off a ramp fast still lands
        fixed: [
            { part: "wall", x: 23, y: 25, w: 2, h: 6 },
            { part: "wall", x: 34.6, y: 21, w: 1, h: 14 },
        ],
        tray: ["long", "long", "ramp"],
    },
];

const RATE = 60,
    DT = 1 / RATE;
/** The workbench is `PLAY` squares wide with the parts tray beside it, and marbles land on the floor. */
export const PLAY = 38;
const W = 48,
    H = 30;
export const FLOOR = 28;
/** Where a hopper's marbles leave it. */
export const DROP = 4;
const CUP_WALL = 2.4;
const R = 0.42;

export const MARBLE = {
    gravity: knob(
        24,
        12,
        45,
        1,
        "squares a second, each second",
        "marbles fall fast enough to feel heavy and slow enough to follow",
    ),
    gap: knob(
        0.3,
        0.15,
        0.6,
        0.05,
        "seconds",
        "marbles from one hopper leave a moment apart, so a batch reads as a stream",
    ),
    bounce: knob(
        0.95,
        0.5,
        1.2,
        0.05,
        "share of a hit",
        "the bouncer sends a marble back up nearly as fast as it came",
    ),
    turn: knob(
        5,
        1,
        15,
        1,
        "degrees",
        "one press of a turn button moves a part a little, so the keys can aim finely",
    ),
};

/** How long each kind of part is, in squares. */
export const LENGTH: Record<PartKind, number> = {
    short: 4,
    ramp: 6,
    long: 9,
    bouncer: 3,
    funnel: 4,
    seesaw: 6,
    splitter: 3,
    bucket: 3,
};

/** The parts that stand level however they are placed, and are never turned. */
const UPRIGHT: ReadonlySet<PartKind> = new Set(["splitter", "bucket"]);
/** The most marbles one run may hold, so a level never asks more of the physics than it can give. */
export const BUDGET = 160;
/** Drops of water to a litre: enough that a stream runs, few enough that a cup of eight litres is under its rim. */
export const PER_LITRE = 8;
/** How many drops a tank lets go of in a step. */
const GUSH = 1;

/** Where each tray part waits, in the tray beside the workbench. */
const slotOf = (i: number): Pt => ({ x: 43, y: 5 + i * 3.4 });

export const placed = (p: Pick<Piece, "x">): boolean => p.x < PLAY;
const KINDS: readonly PartKind[] = [
    "short",
    "ramp",
    "long",
    "bouncer",
    "funnel",
    "seesaw",
    "splitter",
    "bucket",
];
const kindOf = (p: Pick<Piece, "id">): PartKind =>
    KINDS.find((k) => k === p.id.split(":")[0]) ?? "ramp";

/**
 * A part that moves by itself during a run: a splitter's flap, which leans the other way each time a
 * marble has gone past it, or a bucket that tips out what it holds once it holds enough, and swings
 * back.
 */
interface Gadget {
    id: string;
    kind: "splitter" | "bucket";
    body: Body;
    joint: Joint;
    /** Where the flap turns, or the bucket hangs. */
    pivot: Pt;
    /** The way a splitter's flap leans: marbles leave by its lower end. */
    side: 1 | -1;
    phase: "hold" | "tip" | "back";
    /** Seconds in this phase. */
    t: number;
    /** The marbles on or at the flap in the last step. */
    near: Body[];
}

/** How far a splitter's flap and a bucket turn, in radians, and how fast their motors turn them. */
const FLAP = 0.6,
    POUR = 2.2,
    SWING = 9;

export interface MarbleState {
    level: number;
    L: MarbleLevel;
    build: Workshop;
    phase: "build" | "run" | "result" | "won";
    world: Bodies | null;
    marbles: { body: Body; chute: number; out: boolean }[];
    /** The water let out in this run, each drop tagged with its tank, and how many drops each tank has let go. */
    water: Liquid;
    poured: number[];
    seesaws: { id: string; body: Body }[];
    gadgets: Gadget[];
    runTicks: number;
    calm: number;
    resultTicks: number;
    counts: number[];
    selected: string;
    drag: { id: string; mode: "move" | "turn"; dx: number; dy: number } | null;
    hand: Pt | null;
    pose: { id: string; x: number; y: number; angle: number } | null;
    ghost: { key: string; paths: Pt[][] };
    ghostAt: number;
    text: string;
    touched: boolean;
    steps: number;
    runs: number;
}

export function startMarbleLevel(L: MarbleLevel, level: number): MarbleState {
    const pieces: Piece[] = L.tray.map((kind, i) => ({
        id: `${kind}:${i}`,
        ...slotOf(i),
        angle:
            kind === "bouncer" || kind === "funnel" || kind === "seesaw" || UPRIGHT.has(kind)
                ? 0
                : 0.3,
    }));
    const s: MarbleState = {
        level,
        L,
        build: workshop(pieces, { w: W, h: H }),
        phase: "build",
        world: null,
        marbles: [],
        water: liquid(0),
        poured: L.chutes.map(() => 0),
        seesaws: [],
        gadgets: [],
        runTicks: 0,
        calm: 0,
        resultTicks: 0,
        counts: L.cups.map(() => 0),
        selected: pieces[0]?.id ?? "",
        drag: null,
        hand: null,
        pose: null,
        ghost: { key: "", paths: [] },
        ghostAt: -999,
        text: L.prompt,
        touched: false,
        steps: 0,
        runs: 0,
    };
    refreshGhost(s, true);
    return s;
}

/** The design as it stands, with the part a hand is moving at the pose it would be let go at. */
function design(s: MarbleState): Piece[] {
    return s.build.design.pieces.map((p) =>
        s.pose && s.pose.id === p.id ? { ...p, x: s.pose.x, y: s.pose.y, angle: s.pose.angle } : p,
    );
}

const rot = (x: number, y: number, a: number): Pt => ({
    x: x * Math.cos(a) - y * Math.sin(a),
    y: x * Math.sin(a) + y * Math.cos(a),
});

/** The workbench as bodies: the floor, its sides, the place's blocks and pegs, the cups, and every part placed on it. */
function worldOf(
    s: MarbleState,
    pieces: Piece[],
): { world: Bodies; seesaws: MarbleState["seesaws"]; gadgets: Gadget[] } {
    const world = bodies({ gravity: { x: 0, y: MARBLE.gravity.value } });
    world.ground({ y: FLOOR, from: -1, to: PLAY + 1, friction: 0.8 });
    world.box({ x: -0.5, y: H / 2, w: 1, h: H * 2, fixed: true });
    world.box({ x: PLAY + 0.5, y: H / 2, w: 1, h: H * 2, fixed: true });
    for (const f of s.L.fixed) {
        if (f.part === "peg") world.ball({ x: f.x, y: f.y, r: 0.5, fixed: true, restitution: 0.3 });
        else world.box({ x: f.x, y: f.y, w: f.w ?? 2, h: f.h ?? 4, fixed: true, friction: 0.3 });
    }
    for (const c of s.L.cups)
        for (const side of [-1, 1])
            world.box({
                x: c.x + (side * c.w) / 2,
                y: FLOOR - CUP_WALL / 2,
                w: 0.3,
                h: CUP_WALL,
                fixed: true,
                friction: 0.4,
            });
    const seesaws: MarbleState["seesaws"] = [],
        gadgets: Gadget[] = [];
    for (const p of pieces) {
        if (!placed(p)) continue;
        const kind = kindOf(p),
            len = LENGTH[kind];
        if (kind === "splitter") {
            // a short funnel over a flap on a motor: the flap leans one way, and the next marble goes the other
            for (const side of [-1, 1])
                world.box({
                    x: p.x + side * 1.25,
                    y: p.y - 0.5,
                    w: Math.hypot(1, 1),
                    h: 0.25,
                    angle: -side * (Math.PI / 4),
                    fixed: true,
                    friction: 0.1,
                });
            // low enough under the funnel that a marble rolls clear of its sides
            const pivot = { x: p.x, y: p.y + 0.9 };
            const flap = world.box({
                x: pivot.x,
                y: pivot.y,
                w: 1.9,
                h: 0.22,
                // joined level, since a hinge's limits are counted from the angle it is joined at
                density: 2,
                friction: 0.1,
            });
            const joint = world.hinge(null, flap, pivot, {
                lower: -FLAP,
                upper: FLAP,
                motor: { speed: SWING, most: 600 },
            });
            gadgets.push({
                id: p.id,
                kind,
                body: flap,
                joint,
                pivot,
                side: 1,
                phase: "hold",
                t: 0,
                near: [],
            });
            continue;
        }
        if (kind === "bucket") {
            // a pail hung by its rim's middle, held upright by a brake until it is full
            const pivot = { x: p.x, y: p.y - 1.1 };
            const pail = world.compound({
                x: p.x,
                y: p.y,
                parts: [
                    { box: { x: 0, y: 1.0, w: 2.4, h: 0.2 } },
                    { box: { x: -1.1, y: 0, w: 0.2, h: 2.2 } },
                    { box: { x: 1.1, y: 0, w: 0.2, h: 2.2 } },
                ],
                density: 1,
                friction: 0.3,
            });
            const joint = world.hinge(null, pail, pivot, {
                lower: 0,
                upper: POUR,
                motor: { speed: 0, most: 5000 },
            });
            gadgets.push({
                id: p.id,
                kind,
                body: pail,
                joint,
                pivot,
                side: 1,
                phase: "hold",
                t: 0,
                near: [],
            });
            continue;
        }
        if (kind === "bouncer")
            world.box({
                x: p.x,
                y: p.y,
                w: len,
                h: 0.4,
                angle: p.angle,
                fixed: true,
                restitution: MARBLE.bounce.value,
                friction: 0.2,
            });
        else if (kind === "funnel")
            for (const side of [-1, 1]) {
                // each side runs from a top corner down towards a gap a marble and a half wide
                const a = rot(side * 2, -1, p.angle),
                    b = rot(side * 0.65, 1, p.angle);
                world.box({
                    x: p.x + (a.x + b.x) / 2,
                    y: p.y + (a.y + b.y) / 2,
                    w: Math.hypot(b.x - a.x, b.y - a.y),
                    h: 0.3,
                    angle: Math.atan2(b.y - a.y, b.x - a.x),
                    fixed: true,
                    friction: 0.1,
                });
            }
        else if (kind === "seesaw")
            seesaws.push({
                id: p.id,
                body: world.box({
                    x: p.x,
                    y: p.y,
                    w: len,
                    h: 0.35,
                    angle: p.angle,
                    density: 0.5,
                    friction: 0.2,
                    hinge: { at: { x: p.x, y: p.y }, lower: -0.5, upper: 0.5 },
                }),
            });
        else
            world.box({
                x: p.x,
                y: p.y,
                w: len,
                h: 0.4,
                angle: p.angle,
                fixed: true,
                friction: 0.08,
                restitution: 0.1,
            });
    }
    return { world, seesaws, gadgets };
}

/** Moves every gadget on by one step: a splitter's flap turns after each marble, and a full bucket tips. */
function stepGadgets(s: MarbleState, world: Bodies, gadgets: Gadget[], marbles: Body[]): void {
    for (const g of gadgets) {
        g.t += DT;
        if (g.kind === "splitter") {
            // on the splitter: in its funnel or on its flap, and not yet fallen past the flap's end
            const near = marbles.filter((m) => {
                const at = world.where(m);
                return (
                    Math.abs(at.x - g.pivot.x) < 1.1 &&
                    at.y > g.pivot.y - 1.8 &&
                    at.y < g.pivot.y + 0.5
                );
            });
            // a marble that has left the flap sends the next one the other way
            if (g.near.some((m) => !near.includes(m))) {
                g.side = g.side === 1 ? -1 : 1;
                world.drive(g.joint, g.side * SWING);
            }
            g.near = near;
            continue;
        }
        const at = world.where(g.body),
            c = Math.cos(-at.angle),
            sn = Math.sin(-at.angle);
        const inside = marbles.filter((m) => {
            const p = world.where(m),
                dx = p.x - at.x,
                dy = p.y - at.y,
                lx = dx * c - dy * sn,
                ly = dx * sn + dy * c;
            return Math.abs(lx) < 1.05 && ly > -1.2 && ly < 0.95;
        }).length;
        if (g.phase === "hold" && inside >= (s.L.tip ?? 5)) {
            g.phase = "tip";
            g.t = 0;
            world.drive(g.joint, SWING);
        } else if (
            g.phase === "tip" &&
            ((world.travel(g.joint) > POUR - 0.1 && inside === 0) || g.t > 1.5)
        ) {
            g.phase = "back";
            g.t = 0;
            world.drive(g.joint, -SWING);
        } else if (g.phase === "back" && world.travel(g.joint) < 0.03) {
            g.phase = "hold";
            g.t = 0;
            world.drive(g.joint, 0);
        }
    }
}

const radius = (s: MarbleState): number => s.L.r ?? R;

const marbleIn = (world: Bodies, x: number, r = R): Body =>
    // the engine has no rolling friction, so a little damping lets a marble on the floor come to rest
    world.ball({
        x,
        y: DROP,
        r,
        fast: true,
        friction: 0.1,
        restitution: 0.25,
        density: 1,
        damping: { move: 0.05, turn: 1.5 },
    });

/** Which cup a marble at `p` is in, or -1. */
function cupAt(s: MarbleState, p: Pt): number {
    return s.L.cups.findIndex(
        (c) =>
            Math.abs(p.x - c.x) < c.w / 2 - 0.1 &&
            p.y > FLOOR - CUP_WALL - 0.2 &&
            p.y < FLOOR + 0.5,
    );
}

/** Where one marble from each hopper would go through the design as it stands: a faint path to aim by. */
function refreshGhost(s: MarbleState, now = false): void {
    const pieces = design(s);
    const key = JSON.stringify(
        pieces.map((p) => [Math.round(p.x * 10), Math.round(p.y * 10), Math.round(p.angle * 100)]),
    );
    if (key === s.ghost.key || (!now && s.steps - s.ghostAt < 6)) return;
    s.ghostAt = s.steps;
    const paths = s.L.chutes.map((c) => {
        const { world, gadgets } = worldOf(s, pieces);
        const ball = marbleIn(world, c.x, radius(s)),
            path: Pt[] = [];
        for (let t = 0; t < 360; t++) {
            stepGadgets(s, world, gadgets, [ball]);
            world.step(DT);
            const at = world.where(ball);
            if (t % 4 === 0) path.push({ x: at.x, y: at.y });
            if (at.y > H + 2 || (t > 30 && !world.moving(ball, 0.1))) break;
        }
        return path;
    });
    s.ghost = { key, paths };
}

function tell(s: MarbleState, text: string): void {
    s.text = text;
}

function go(s: MarbleState, out: Happening[]): void {
    s.touched = true;
    if (s.phase === "won") return;
    if (s.phase === "run" || s.phase === "result") {
        toBuild(s, "Change the run and press Go again.");
        return;
    }
    const { world, seesaws, gadgets } = worldOf(s, s.build.design.pieces);
    s.world = world;
    s.seesaws = seesaws;
    s.gadgets = gadgets;
    s.marbles = [];
    s.water = liquid(litres(s) * PER_LITRE);
    s.poured = s.L.chutes.map(() => 0);
    s.phase = "run";
    s.runTicks = 0;
    s.calm = 0;
    s.counts = s.L.cups.map(() => 0);
    s.runs++;
    s.drag = null;
    s.pose = null;
    tell(s, "Here they come.");
    out.push({ cue: "lift" });
}

function toBuild(s: MarbleState, text: string): void {
    s.phase = "build";
    s.world = null;
    s.marbles = [];
    s.water = liquid(0);
    s.seesaws = [];
    s.gadgets = [];
    tell(s, text);
}

const total = (s: MarbleState): number => s.L.chutes.reduce((n, c) => n + (c.water ? 0 : c.n), 0);
const litres = (s: MarbleState): number => s.L.chutes.reduce((n, c) => n + (c.water ? c.n : 0), 0);
/** Whether a level's cups are measured in litres. */
const wet = (L: MarbleLevel): boolean => L.chutes.some((c) => c.water);
/**
 * Whether a cup holds what it wants: every marble, or the litres to the nearest half, since a drop or
 * two of a good run splashes wide however the run is built. The reading still says what landed.
 */
const full = (L: MarbleLevel, n: number, want: number): boolean =>
    wet(L) ? Math.abs(n - want) < 0.5 : n === want;
const over = (L: MarbleLevel, n: number, want: number): boolean =>
    wet(L) ? n >= want + 0.5 : n > want;
/** A cup's count as it is written: marbles, or litres to a tenth. */
const amount = (L: MarbleLevel, n: number): string =>
    wet(L) ? `${Math.floor(n * 10 + 1e-9) / 10} litres` : String(n);

/** When each marble leaves its hopper, in steps: hoppers start a little apart, and a batch leaves a marble at a time. */
const leaves = (s: MarbleState, c: number, k: number): number =>
    c * 7 + Math.round(k * (s.L.gap ?? MARBLE.gap.value) * RATE);

function stepRun(s: MarbleState, out: Happening[]): void {
    const world = s.world;
    if (!world) return;
    s.runTicks++;
    s.L.chutes.forEach((c, i) => {
        if (c.water) {
            // a tank opens when its turn comes, as a hopper does, and runs until it is empty
            const all = c.n * PER_LITRE;
            if (s.runTicks - 1 < i * 7) return;
            for (let k = 0; k < GUSH && (s.poured[i] ?? 0) < all; k++) {
                const n = s.poured[i] ?? 0;
                pour(s.water, { x: c.x + ((n % 3) - 1) * 0.3, y: DROP }, { x: 0, y: 2 }, i);
                s.poured[i] = n + 1;
            }
            return;
        }
        for (let k = 0; k < c.n; k++)
            if (leaves(s, i, k) === s.runTicks - 1)
                s.marbles.push({
                    // a mouth that spreads its marbles sends them from three places in turn
                    body: marbleIn(world, c.x + ((k % 3) - 1) * (s.L.spread ?? 0), radius(s)),
                    chute: i,
                    out: false,
                });
    });
    stepGadgets(
        s,
        world,
        s.gadgets,
        s.marbles.flatMap((m) => (m.out ? [] : [m.body])),
    );
    if (count(s.water)) {
        stepLiquid(s.water, DT, WATER, { solids: solidsOf(world) });
        drain(s.water, (d) => d.y > H + 3 || d.x < -3 || d.x > PLAY + 3);
    }
    world.step(DT);
    for (const h of world.hits())
        if (h.speed > 7 && s.runTicks % 3 === 0) {
            const m = s.marbles.find((x) => x.body === h.a || x.body === h.b);
            const at = m ? world.where(m.body) : null;
            out.push({ cue: "bump" });
            if (at) out.push({ burst: { kind: "dust", x: at.x, y: at.y, n: 2 } });
            break;
        }
    const counts = s.L.cups.map(() => 0);
    for (const m of s.marbles) {
        if (m.out) continue;
        const at = world.where(m.body);
        if (at.y > H + 3 || at.x < -3 || at.x > PLAY + 3) {
            m.out = true;
            world.remove(m.body);
            continue;
        }
        const cup = cupAt(s, at);
        if (cup >= 0) counts[cup] = (counts[cup] ?? 0) + 1;
    }
    for (let i = 0; i < count(s.water); i++) {
        const d = dropAt(s.water, i);
        const cup = d ? cupAt(s, d) : -1;
        if (cup >= 0) counts[cup] = (counts[cup] ?? 0) + 1 / PER_LITRE;
    }
    // a cup's litres are whole drops, eighths, and are read to a tenth
    for (let i = 0; i < counts.length; i++)
        counts[i] = Math.round((counts[i] ?? 0) * PER_LITRE) / PER_LITRE;
    counts.forEach((n, i) => {
        const was = s.counts[i] ?? 0,
            cup = s.L.cups[i];
        if (!cup || n <= was) return;
        if (full(s.L, n, cup.want) && !full(s.L, was, cup.want))
            out.push(
                { cue: "ring" },
                { burst: { kind: "sparkle", x: cup.x, y: FLOOR - 3, n: 10 } },
            );
        else if (over(s.L, n, cup.want) && !over(s.L, was, cup.want)) out.push({ cue: "nope" });
        // water lands a drop at a time, so a cup of it sounds once a litre
        else if (!wet(s.L) || Math.floor(n) > Math.floor(was))
            out.push({ cue: "place" }, { burst: { kind: "dust", x: cup.x, y: FLOOR - 1, n: 2 } });
    });
    s.counts = counts;
    const all =
        s.marbles.length === total(s) &&
        s.L.chutes.every((c, i) => !c.water || (s.poured[i] ?? 0) >= c.n * PER_LITRE);
    const still =
        all &&
        calm(s.water, 0.9) &&
        s.marbles.every((m) => m.out || !world.moving(m.body, 0.08)) &&
        s.seesaws.every((q) => !world.moving(q.body, 0.08)) &&
        s.gadgets.every((g) => g.phase === "hold");
    s.calm = still ? s.calm + 1 : 0;
    if (s.calm < 30 && s.runTicks < RATE * 25) return;
    const right = s.L.cups.every((c, i) => full(s.L, s.counts[i] ?? 0, c.want));
    if (right) {
        s.phase = "won";
        tell(
            s,
            `Every cup has what it wants: ${s.L.cups.map((c) => amount(s.L, c.want)).join(" and ")}.`,
        );
        out.push({ cue: "win" });
        return;
    }
    s.phase = "result";
    s.resultTicks = 0;
    const off = s.L.cups.flatMap((c, i) => {
        const n = s.counts[i] ?? 0;
        return full(s.L, n, c.want)
            ? []
            : [`a cup that wants ${amount(s.L, c.want)} has ${amount(s.L, n)}`];
    });
    tell(s, `Not yet: ${off.join(", and ")}. Change the run and try again.`);
}

/** The ends of a placed part, where a hand turns it. */
function endsOf(p: Piece): [Pt, Pt] {
    const h = LENGTH[kindOf(p)] / 2;
    return [
        { x: p.x - Math.cos(p.angle) * h, y: p.y - Math.sin(p.angle) * h },
        { x: p.x + Math.cos(p.angle) * h, y: p.y + Math.sin(p.angle) * h },
    ];
}

/** How far a point is from a placed part, along its length. */
function distanceTo(p: Piece, t: Pt): number {
    const [a, b] = endsOf(p);
    const dx = b.x - a.x,
        dy = b.y - a.y,
        k = Math.max(0, Math.min(1, ((t.x - a.x) * dx + (t.y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(t.x - (a.x + dx * k), t.y - (a.y + dy * k));
}

/** An angle kept between level and upright either way, drawn gently to the nearest 15 degrees within 3. */
export function settleAngle(a: number): number {
    let v = Math.atan2(Math.sin(a), Math.cos(a));
    if (v > Math.PI / 2) v -= Math.PI;
    if (v < -Math.PI / 2) v += Math.PI;
    const step = Math.PI / 12,
        near = Math.round(v / step) * step;
    return Math.abs(v - near) < (3 * Math.PI) / 180 ? near : v;
}

const inBench = (x: number, y: number): Pt => ({
    x: Math.max(1.5, Math.min(PLAY - 1.5, x)),
    y: Math.max(DROP + 1.5, Math.min(FLOOR - 1, y)),
});

function hands(s: MarbleState, pad: Pad): void {
    const t = pad.touch;
    if (t && !s.hand) {
        s.touched = true;
        const pieces = s.build.design.pieces;
        const sel = pieces.find((p) => p.id === s.selected && placed(p));
        const handle = sel
            ? endsOf(sel).find((e) => Math.hypot(e.x - t.x, e.y - t.y) < 1)
            : undefined;
        if (sel && handle && !UPRIGHT.has(kindOf(sel)))
            s.drag = { id: sel.id, mode: "turn", dx: 0, dy: 0 };
        else {
            const onBench = pieces
                .filter((p) => placed(p) && distanceTo(p, t) < 1)
                .sort((a, b) => distanceTo(a, t) - distanceTo(b, t))[0];
            const inTray = pieces.find((p, i) => {
                const slot = slotOf(i);
                return !placed(p) && Math.abs(slot.x - t.x) < 4 && Math.abs(slot.y - t.y) < 1.4;
            });
            const hit = onBench ?? inTray;
            if (hit) {
                s.selected = hit.id;
                s.drag = placed(hit)
                    ? { id: hit.id, mode: "move", dx: t.x - hit.x, dy: t.y - hit.y }
                    : { id: hit.id, mode: "move", dx: 0, dy: 0 };
            }
        }
    }
    s.hand = t ? { ...t } : null;
    const drag = s.drag,
        p = drag ? s.build.design.pieces.find((q) => q.id === drag.id) : undefined;
    const point = pad.lifted ?? t;
    if (drag && p && point) {
        if (drag.mode === "turn")
            s.pose = {
                id: p.id,
                x: p.x,
                y: p.y,
                angle: settleAngle(Math.atan2(point.y - p.y, point.x - p.x)),
            };
        else s.pose = { id: p.id, x: point.x - drag.dx, y: point.y - drag.dy, angle: p.angle };
    }
    if (pad.lifted && drag && p && s.pose) {
        const i = s.build.design.pieces.indexOf(p);
        if (drag.mode === "turn") edit(s.build, { kind: "rotate", id: p.id, angle: s.pose.angle });
        else if (s.pose.x > PLAY - 0.5) {
            // let go over the tray, a part goes back to its place there, keeping its turn for next time
            edit(s.build, { kind: "move", id: p.id, ...slotOf(i) });
        } else edit(s.build, { kind: "move", id: p.id, ...inBench(s.pose.x, s.pose.y) });
        s.drag = null;
        s.pose = null;
        refreshGhost(s, true);
    }
}

export function marbleCommand(s: MarbleState, id: string): void {
    if (id === "go") {
        go(s, []);
        return;
    }
    if (s.phase !== "build") return;
    s.touched = true;
    const pieces = s.build.design.pieces;
    if (id === "undo" || id === "redo") {
        if (id === "undo" ? undo(s.build) : redo(s.build)) refreshGhost(s, true);
        return;
    }
    if (id === "next") {
        s.selected =
            pieces[(pieces.findIndex((p) => p.id === s.selected) + 1) % pieces.length]?.id ?? "";
        return;
    }
    const p = pieces.find((q) => q.id === s.selected);
    if (!p) return;
    if (id === "turn-left" || id === "turn-right") {
        if (!placed(p) || UPRIGHT.has(kindOf(p))) return;
        const by = ((id === "turn-left" ? -1 : 1) * MARBLE.turn.value * Math.PI) / 180;
        edit(s.build, { kind: "rotate", id: p.id, angle: settleAngle(p.angle + by) });
        refreshGhost(s, true);
        return;
    }
    const d =
        id === "left"
            ? { x: -0.5, y: 0 }
            : id === "right"
              ? { x: 0.5, y: 0 }
              : id === "up"
                ? { x: 0, y: -0.5 }
                : id === "down"
                  ? { x: 0, y: 0.5 }
                  : null;
    if (!d) return;
    // the first arrow on a part in the tray puts it in the middle of the workbench
    const to = placed(p) ? inBench(p.x + d.x, p.y + d.y) : inBench(PLAY / 2, 14);
    edit(s.build, { kind: "move", id: p.id, ...to });
    refreshGhost(s, true);
}

function step(s: MarbleState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (pad.tapped) go(s, out);
    if (s.phase === "build") {
        hands(s, pad);
        for (const d of pad.pressed) marbleCommand(s, d);
        if (s.drag) refreshGhost(s);
    } else if (s.phase === "run") stepRun(s, out);
    else if (s.phase === "result") {
        s.world?.step(DT);
        s.resultTicks++;
        if (s.resultTicks > RATE * 2.5 || pad.touch) toBuild(s, s.text);
    } else s.world?.step(DT);
    return out;
}

function frame(s: MarbleState): Frame {
    const sprites: Sprite[] = [],
        marks: Mark[] = [];
    const part = (
        key: string,
        p: Record<string, unknown>,
        x: number,
        y: number,
        size: number,
        angle = 0,
        z = 3,
    ): Sprite => ({
        key,
        art: "marblerun",
        params: { w: 1, h: 1, label: "", colour: "sky", ...p },
        x,
        y,
        size,
        angle,
        z,
    });
    // the field grows past the workbench to fill a wide room, so the floor runs on past both sides
    for (const [key, w, x] of [
        ["floor", PLAY, PLAY / 2],
        ["floor:left", 36, -18],
        ["floor:right", 36, PLAY + 18],
        ["floor:far", 36, PLAY + 54],
    ] as const)
        sprites.push({
            key,
            art: "arcade.ground",
            params: { w },
            seed: 3,
            x,
            y: FLOOR + 1.1,
            z: 1,
            still: true,
        });
    marks.push(
        { kind: "box", x: PLAY + 0.6, y: 1, w: W - PLAY - 1.2, h: FLOOR - 1 },
        { kind: "word", x: 43, y: 2.6, text: "Parts", size: 0.7 },
    );
    s.L.chutes.forEach((c, i) =>
        sprites.push(
            part(
                `chute:${i}`,
                {
                    part: "chute",
                    w: 3,
                    h: 3,
                    label: c.water ? `${c.n} l` : String(c.n),
                    colour: c.colour,
                },
                c.x,
                DROP - 1.6,
                3,
                0,
                5,
            ),
        ),
    );
    s.L.fixed.forEach((f, i) =>
        sprites.push(
            f.part === "peg"
                ? part(`fixed:${i}`, { part: "peg" }, f.x, f.y, 1, 0, 4)
                : part(
                      `fixed:${i}`,
                      { part: "wall", w: f.w ?? 2, h: f.h ?? 4 },
                      f.x,
                      f.y,
                      f.w ?? 2,
                      0,
                      4,
                  ),
        ),
    );
    s.L.cups.forEach((c, i) => {
        sprites.push(
            part(
                `cup:${i}`,
                {
                    part: "cup",
                    w: Math.round(c.w),
                    label: wet(s.L) ? `${c.want} l` : String(c.want),
                    colour: c.colour,
                },
                c.x,
                FLOOR - 1.5,
                c.w,
                0,
                6,
            ),
        );
        if (s.phase !== "build")
            marks.push({
                kind: "word",
                x: c.x,
                y: FLOOR - 4,
                text: `${amount(s.L, s.counts[i] ?? 0)} of ${amount(s.L, c.want)}`,
                size: 0.7,
            });
    });
    const pieces = design(s);
    pieces.forEach((p, i) => {
        const kind = kindOf(p),
            len = LENGTH[kind],
            inTray = !placed(p);
        const at = inTray ? slotOf(i) : p;
        // a long part is drawn smaller in the tray so every part fits beside the workbench
        const size = inTray ? Math.min(len, 7) : len;
        const seesaw = s.seesaws.find((q) => q.id === p.id),
            gadget = s.gadgets.find((g) => g.id === p.id);
        const angle = inTray
            ? 0
            : seesaw && s.world
              ? s.world.where(seesaw.body).angle
              : gadget && s.world
                ? s.world.where(gadget.body).angle
                : p.angle;
        const partName =
            kind === "bouncer"
                ? "bouncer"
                : kind === "funnel"
                  ? "funnel"
                  : kind === "seesaw"
                    ? "seesaw"
                    : kind === "splitter"
                      ? "splitter"
                      : kind === "bucket"
                        ? "bucket"
                        : "ramp";
        const label = kind === "bucket" ? String(s.L.tip ?? 5) : "";
        // a tipping bucket turns about its rim, so it is drawn where its body has swung to
        const pos =
            kind === "bucket" && !inTray && gadget && s.world ? s.world.where(gadget.body) : at;
        // a splitter is drawn as its funnel with the flap under it, which turns on its own
        sprites.push(
            part(
                p.id,
                { part: partName, w: len, label, colour: kind === "bouncer" ? "berry" : "sky" },
                pos.x,
                pos.y,
                size,
                kind === "splitter" ? 0 : angle,
                7,
            ),
        );
        if (kind === "splitter" && !inTray)
            sprites.push(
                part(
                    `${p.id}:flap`,
                    { part: "flap", colour: "tang" },
                    at.x,
                    at.y + 0.9,
                    2,
                    gadget && s.world ? angle : FLAP,
                    8,
                ),
            );
        if (kind === "bucket" && !inTray)
            marks.push({
                kind: "line",
                a: { x: at.x, y: at.y - 1.1 },
                b: { x: at.x, y: at.y - 2.6 },
                style: "rod",
            });
        if (kind === "seesaw" && !inTray)
            sprites.push(part(`${p.id}:stand`, { part: "stand" }, p.x, p.y + 1, 2, 0, 6));
        if (p.id === s.selected && s.phase === "build") {
            marks.push({ kind: "ring", x: at.x, y: at.y, r: 0.7, on: true });
            if (!inTray)
                for (const e of endsOf(p)) marks.push({ kind: "ring", x: e.x, y: e.y, r: 0.55 });
        }
    });
    if (s.phase === "build")
        for (const path of s.ghost.paths)
            if (path.length) marks.push({ kind: "dots", pts: path, faint: true, opacity: 0.45 });
    if (s.world) {
        const world = s.world;
        for (const m of s.marbles) {
            if (m.out) continue;
            const at = world.where(m.body);
            sprites.push(
                part(
                    `marble:${s.runs}:${s.marbles.indexOf(m)}`,
                    { part: "marble", colour: s.L.chutes[m.chute]?.colour ?? "sky" },
                    at.x,
                    at.y,
                    radius(s) * 2,
                    at.angle,
                    8,
                ),
            );
        }
    }
    return {
        sprites,
        marks,
        camera: { x: W / 2, y: H / 2, zoom: 1 },
        view: { w: W, h: H },
        world: { w: W, h: H },
        liquid: count(s.water) ? [{ drops: places(s.water), r: WATER.r, z: 7 }] : [],
    };
}

function say(s: MarbleState): string {
    const L = s.L;
    const hoppers = L.chutes
        .map((c) => `${c.water ? `a tank of ${c.n} litres` : c.n} at ${Math.round(c.x)}`)
        .join(", ");
    const cups = L.cups
        .map(
            (c, i) =>
                `a cup at ${Math.round(c.x)} wants ${amount(L, c.want)}${s.phase !== "build" ? ` and has ${amount(L, s.counts[i] ?? 0)}` : ""}`,
        )
        .join("; ");
    const onBench = s.build.design.pieces
        .filter(placed)
        .map(
            (p) =>
                `${kindOf(p)} at ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, turned ${Math.round((p.angle * 180) / Math.PI)} degrees`,
        );
    return `${s.text} Hoppers drop ${hoppers}. Cups: ${cups}. ${onBench.length ? `On the bench: ${onBench.join("; ")}.` : "Nothing is on the bench yet."} Selected: ${kindOf({ id: s.selected })}.`;
}

export const marbleGame: ActionGame<MarbleState> = {
    id: "marble-workshop",
    title: "Marble workshop",
    group: "action",
    levels: MARBLE_LEVELS,
    rate: RATE,
    touch: true,
    cover: { art: "marblerun", params: { part: "chute", w: 3, h: 3, label: "5", colour: "sky" } },
    hint: "Drag parts from the tray onto the bench, drag a part's end to turn it, then press Go. With the keys: N chooses a part, the arrows move it, Q and E turn it, and space is Go",
    controls: { arrows: { left: "Left", right: "Right", up: "Up", down: "Down" }, go: "Go" },
    commands: [
        { id: "next", label: "Next part", key: "n" },
        { id: "turn-left", label: "Turn left", key: "q" },
        { id: "turn-right", label: "Turn right", key: "e" },
        { id: "undo", label: "Undo", key: "z" },
        { id: "redo", label: "Redo", key: "y" },
    ],
    command: marbleCommand,
    start: (level) => startMarbleLevel(MARBLE_LEVELS[level] ?? MARBLE_LEVELS[0], level),
    step,
    frame,
    say,
    note: (s) => s.text,
    won: (s) => s.phase === "won",
    objectives: (s) => ({
        completed: s.L.cups.filter((c, i) => full(s.L, s.counts[i] ?? 0, c.want)).length,
        total: s.L.cups.length,
    }),
    back: (s) => {
        if (s.phase !== "build" || !undo(s.build)) return false;
        refreshGhost(s, true);
        return true;
    },
    checkpoint: (s) => checkpoint(s.build),
    restore: (s, value) => {
        if (s.phase !== "build" || !restore(s.build, value)) return false;
        refreshGhost(s, true);
        return true;
    },
    cancelInput: (s) => {
        s.drag = null;
        s.pose = null;
        s.hand = null;
    },
    tuning: MARBLE,
    still: {
        press: () => 12,
        settling: (s) => s.phase === "run" || s.phase === "result",
    },
};
