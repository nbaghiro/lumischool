// Charlie's bridge: lay planks across a stream, then let Charlie walk over.
//
// Charlie and her dog want the picnic on the far bank. The stream is measured by a line along the
// water, stones stand in it at numbers on that line, and planks on the grass have their lengths
// written on them. The child drags a plank over the stream and lets go, and it falls where it was let
// go and settles on whatever is under it: the banks, the stones, another plank. Nothing snaps into
// place. A plank shorter than the gap it is laid over falls in; one that only just reaches rests on
// the edge of a stone; one that sticks out past its stone holds until Charlie walks out along it, and
// her weight tips it. The mathematics is reading the gaps off the line and choosing a plank long
// enough for each, then centimetres and tenths of a metre. Nothing is checked until Charlie walks, a
// wrong bridge is seen to be wrong in the water, and a fall costs nothing: she swims back and the
// plank floats back to the grass. See .docs/games.md.
import { bodies, type Bodies, type Body, type Joint } from "../../engine/motion/bodies";
import { follow, keepInside, type Cam } from "../../engine/motion/camera";
import { objectives as goals, observe, type Objectives } from "../../engine/motion/construction";
import type { Pt } from "../../engine/motion/geometry";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import {
    actor,
    actorSprites,
    land,
    stepActor,
    type Actor,
    type Cycle,
} from "../../engine/motion/actor";
import { bob, stepWalker, walker, type Gait, type Walker } from "../../engine/motion/walker";
import type { ActionGame, ActionLevel, Levels } from "./game";

export interface BridgeLevel extends ActionLevel {
    /** Where the far bank begins, in the level's units from the near bank's edge. */
    far: number;
    /** Where the stones stand, in the same units. */
    stones: number[];
    /** Whether a stone carries its number; without, it is read off the marks along the water. */
    numbers: boolean;
    /** A mark along the water every `tick` units, with its number every `every`. */
    tick: number;
    every: number;
    /** Squares for one unit. */
    per: number;
    /** The unit a length is written in, or nothing for a plain number. */
    unit: "" | "cm" | "m" | "kg";
    /** The planks on the grass, by length. */
    planks: number[];
    /**
     * Two posts with ropes between them, in units, where planks let go are hung end to end instead of
     * falling: planks that add up to the gap make a bridge from post to post, longer ones sag into the
     * water, and shorter ones hang from the near post and reach nowhere.
     */
    rope?: { from: number; to: number };
    /**
     * A lift at `at` units that rises `high` squares to a far bank that high above the near one, hung
     * over a wheel against a basket. The planks list is then sacks, by kilograms: the lift carries
     * Charlie up when the sacks in the basket outweigh her, gently when only a little.
     */
    lift?: { at: number; high: number };
    /** What Charlie wears on this level. */
    outfit: Record<string, string>;
    /** The line over the field until the first plank is picked up. */
    prompt: string;
}

export const BRIDGE_LEVELS: Levels<BridgeLevel> = [
    {
        title: "One stone",
        grades: [1, 1],
        goal: "Lay planks over the stream so Charlie can reach the picnic.",
        prompt: "Drag a plank over the water and let go. Then press Go.",
        far: 10,
        stones: [4],
        numbers: true,
        tick: 1,
        every: 1,
        per: 2,
        unit: "",
        planks: [2, 3, 4, 6, 3],
        outfit: {},
    },
    {
        title: "Two stones",
        grades: [1, 2],
        goal: "Lay planks over the stream so Charlie can reach the picnic.",
        prompt: "A plank has to reach from one stone to the next.",
        far: 12,
        stones: [3, 7],
        numbers: true,
        tick: 1,
        every: 1,
        per: 2,
        unit: "",
        planks: [2, 3, 4, 5, 2],
        outfit: { top: "sky", sleeves: "short", print: "star", wear: "shorts", bottom: "mint" },
    },
    {
        title: "A wider stream",
        grades: [2, 2],
        goal: "Lay planks over the stream so Charlie can reach the picnic.",
        prompt: "How far is it from 6 to 13?",
        far: 20,
        stones: [6, 13],
        numbers: true,
        tick: 1,
        every: 5,
        per: 1.3,
        unit: "",
        planks: [4, 5, 6, 7, 7, 3],
        outfit: {
            hair: "ponytail",
            top: "berry",
            sleeves: "short",
            print: "heart",
            pattern: "stripes",
            bottom: "sky",
        },
    },
    {
        title: "Stones with no numbers",
        grades: [2, 3],
        goal: "Find where each stone stands, then lay planks over the stream.",
        prompt: "Count the marks along the water to find each stone.",
        far: 20,
        stones: [5, 12],
        numbers: false,
        tick: 1,
        every: 5,
        per: 1.3,
        unit: "",
        planks: [4, 5, 6, 7, 8, 3],
        outfit: {
            hair: "bunches",
            top: "glow",
            sleeves: "long",
            print: "flower",
            wear: "trousers",
            bottom: "sky",
            feet: "boots",
        },
    },
    {
        title: "Centimetres",
        grades: [3, 3],
        goal: "The stream is measured in centimetres. Lay planks over it.",
        prompt: "The stones stand at 150 cm and 350 cm.",
        far: 500,
        stones: [150, 350],
        numbers: true,
        tick: 50,
        every: 100,
        per: 0.05,
        unit: "cm",
        planks: [100, 150, 150, 200, 100],
        outfit: {
            hair: "braids",
            top: "mint",
            sleeves: "short",
            print: "bear",
            pattern: "spots",
            bottom: "berry",
        },
    },
    {
        title: "Tenths of a metre",
        grades: [4, 4],
        goal: "The stream is measured in metres and tenths. Lay planks over it.",
        prompt: "The stones stand at 1.5 m and 3.2 m.",
        far: 5,
        stones: [1.5, 3.2],
        numbers: true,
        tick: 0.1,
        every: 1,
        per: 5,
        unit: "m",
        planks: [1.2, 1.5, 1.7, 1.8, 1.4],
        outfit: {
            top: "tang",
            sleeves: "long",
            print: "star",
            wear: "dress",
            pattern: "rainbow",
            feet: "boots",
        },
    },
    {
        title: "A rope bridge",
        grades: [2, 3],
        goal: "Hang planks on the ropes so the rope bridge reaches from one post to the other.",
        prompt: "The posts stand at 4 and 12. Hang planks that add up to the gap between them.",
        far: 16,
        stones: [4, 12],
        numbers: true,
        tick: 1,
        every: 2,
        per: 1.3,
        unit: "",
        planks: [4, 4, 3, 5, 6, 2, 1],
        rope: { from: 4, to: 12 },
        outfit: {
            hair: "ponytail",
            top: "sky",
            sleeves: "long",
            print: "star",
            wear: "trousers",
            bottom: "berry",
            feet: "boots",
        },
    },
    {
        title: "The pulley lift",
        grades: [3, 4],
        goal: "Load the basket so the lift carries Charlie gently up to the picnic.",
        prompt: "Charlie weighs 20 kg. Put more than 20 kg in the basket, but no more than 24 kg.",
        far: 4,
        stones: [],
        numbers: false,
        tick: 1,
        every: 1,
        per: 1.3,
        unit: "kg",
        planks: [5, 8, 6, 3, 9, 4, 7],
        lift: { at: 2, high: 6 },
        outfit: {
            hair: "bunches",
            top: "mint",
            sleeves: "short",
            print: "heart",
            wear: "skirt",
            bottom: "sky",
        },
    },
];

const RATE = 60,
    DT = 1 / RATE;
/** The height the banks' and stones' tops share, the water's surface below it, and the world's height. */
export const DECK = 16;
// the stones' own waterline is three quarters of a square under their tops
const SURFACE = DECK + 0.75;
const H = 26;
const VIEW = { w: 38, h: 22 } as const;
/** Squares a second, each second, that everything falls by. */
const G = 30;
/** How big Charlie is drawn: squares across for each square of her drawing's box. */
const K = 0.62;
const CHARLIE_KG = 20;
/** Kilograms a plank weighs for each square of its length. */
const PLANK_KG = 1.2;
/** How a plank's pieces give: a long plank sags about a third of a square under Charlie and rings down quickly. */
const BEND = { hz: 20, damping: 0.7 } as const;
/** A plank as the plank drawing lays it out at its own size: a board seven tenths of a square deep. */
export const THICK = 0.7;
/** Charlie's weight as the lift's sign gives it, the lift's floor and basket, and a sack, in squares. */
export const LIFT = {
    kg: CHARLIE_KG,
    floor: { w: 3.2, h: THICK },
    basket: { w: 2.4, h: 1.6, off: -2.5 },
    /** How high the wheels hang over the far bank's top. */
    wheels: 6,
    /** Squares a second the lift may be going as it reaches the top without banging. */
    gentle: 3.2,
    /**
     * How fast the lift's floor and basket are slowed, per second: it rises at a speed set by how much
     * the basket outweighs Charlie, about three quarters of a square a second for each kilogram, so
     * four kilograms over is gentle and five bangs.
     */
    drag: 9,
} as const;
const SACK = 1.6;
/** The steppingstone drawing's size here, and half the width of its flat top, in squares. */
const STONE = { size: 3, half: 1.15, w: 3, h: 2, top: 0.55 } as const;

export const BRIDGE = {
    walk: knob(
        3.2,
        1.5,
        5,
        0.1,
        "squares a second",
        "a walk a child can follow with their eyes and not wait for",
    ),
    reach: knob(
        1.5,
        0.5,
        2.5,
        0.1,
        "squares",
        "a stride crosses a gap this wide, so a plank may end a step short of the next",
    ),
    swim: knob(
        2.4,
        1,
        4,
        0.1,
        "squares a second",
        "Charlie swims back quickly enough that a fall never feels like a wait",
    ),
};

const gait = (): Gait => ({
    speed: BRIDGE.walk.value,
    reach: BRIDGE.reach.value,
    // a plank lies on top of a stone or a bank, so stepping onto one is a step up of its depth
    step: THICK + 0.15,
    gravity: 38,
    pace: 0.9,
});

interface Plank {
    n: number;
    /** Where it lies on the grass, the middle of its top edge. */
    home: Pt;
    /**
     * Its pieces once it is out on the stream, near end first, joined so the plank bends under
     * Charlie and springs back; null while it lies on the grass or is held.
     */
    parts: Body[] | null;
    /** Seconds it has been in the water. */
    wet: number;
}

export interface BridgeState {
    L: BridgeLevel;
    level: number;
    x0: number;
    world: { w: number; h: number };
    physics: Bodies;
    planks: Plank[];
    /** The order planks were laid in, so taking back takes the last. */
    laidOrder: number[];
    /** The planks hung on the rope, near post first. */
    rope: number[];
    /** The sacks in the lift's basket, in the order they went in. */
    load: number[];
    /** The lift's floor and basket, their joints, and whether the floor is held at the bottom. */
    lift: {
        floor: Body;
        basket: Body;
        support: Body;
        slide: Joint;
        latch: Joint | null;
        /** How fast the floor was rising the step before, in squares a second. */
        rising: number;
    } | null;
    charlie: Walker;
    /** How Charlie is drawn moving: her pose, a fade from the last one, and a squash when she lands. */
    look: Actor<CharlieAct>;
    /** The body Charlie stands on, if it is one that moves. */
    under: number;
    phase: "stand" | "walk" | "fall" | "swim" | "climb" | "ride" | "picnic";
    dog: Walker;
    held: number;
    /** Where the hand took hold, from the plank's near end. */
    grab: number;
    hand: Pt | null;
    pressAt: Pt | null;
    /** The keys' cursor: which plank is chosen, or where a held plank hangs, in units. */
    cursor: { mode: "pick"; i: number } | { mode: "place"; at: number } | null;
    goals: Objectives;
    said: string;
    saidAt: number;
    touched: boolean;
    steps: number;
    won: boolean;
    falls: number;
    cam: Cam;
}

/** Squares from a level's units, and back. */
export const sq = (s: Pick<BridgeState, "L" | "x0">, u: number): number => s.x0 + u * s.L.per;
const units = (s: BridgeState, x: number): number => (x - s.x0) / s.L.per;
const farX = (s: BridgeState): number => sq(s, s.L.far);
/** How long a plank is along the ground, or how wide a sack is, in squares. */
export const lengthOf = (s: Pick<BridgeState, "L">, i: number): number =>
    s.L.lift ? SACK : (s.L.planks[i] ?? 0) * s.L.per;
const written = (L: BridgeLevel, n: number): string => {
    const v = Math.round(n * 100) / 100;
    return L.unit ? `${v} ${L.unit}` : String(v);
};

function tell(s: BridgeState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

export function startBridge(L: BridgeLevel, level: number): BridgeState {
    // a row of sacks needs the room a pile of long planks would
    const longest = L.lift ? L.planks.length * (SACK + 0.3) : Math.max(...L.planks) * L.per;
    const x0 = Math.round(10 + longest);
    const world = { w: Math.round(x0 + L.far * L.per + 16), h: H };
    // the planks lie stacked on the grass, their right ends together, short of the water
    const pileEnd = x0 - 5;
    const physics = bodies({ gravity: { x: 0, y: G } });
    const far = x0 + L.far * L.per;
    physics.box({ x: x0 / 2, y: DECK + 5, w: x0, h: 10, fixed: true, friction: 0.9 });
    const top = DECK - (L.lift?.high ?? 0);
    physics.box({
        x: (far + world.w) / 2,
        y: (top + DECK + 10) / 2,
        w: world.w - far,
        h: DECK + 10 - top,
        fixed: true,
        friction: 0.9,
    });
    // a stone stands at each bank's edge too, so a plank's end rests there on half a stone as it does mid-stream
    for (const st of L.lift ? [0] : [0, ...L.stones, L.far])
        physics.box({
            x: x0 + st * L.per,
            y: DECK + 1,
            w: STONE.half * 2,
            h: 2,
            fixed: true,
            friction: 0.9,
        });
    const s: BridgeState = {
        L,
        level,
        x0,
        world,
        physics,
        planks: L.planks.map((n, i) => ({
            n,
            // sacks stand in a row on the grass; planks lie stacked
            home: L.lift
                ? { x: pileEnd - 2 - i * (SACK + 0.3), y: DECK - SACK / 2 - THICK / 2 }
                : { x: pileEnd - (n * L.per) / 2, y: DECK - THICK * (i + 1) },
            parts: null,
            wet: 0,
        })),
        laidOrder: [],
        rope: [],
        load: [],
        lift: L.lift ? buildLift(physics, x0 + L.lift.at * L.per, L.lift.high) : null,
        charlie: walker(x0 - 1.2, DECK),
        look: actor<CharlieAct>("wave", "wave"),
        under: -1,
        phase: "stand",
        dog: walker(x0 - 3, DECK),
        held: -1,
        grab: 0,
        hand: null,
        pressAt: null,
        cursor: null,
        goals: goals([
            ...L.stones.map((st, k) => ({
                id: `stone:${k}`,
                label: `Reach the stone at ${written(L, st)}`,
                ...(k ? { after: `stone:${k - 1}` } : {}),
            })),
            {
                id: "picnic",
                label: "Reach the picnic",
                ...(L.stones.length ? { after: `stone:${L.stones.length - 1}` } : {}),
            },
        ]),
        said: "",
        saidAt: -999,
        touched: false,
        steps: 0,
        won: false,
        falls: 0,
        cam: { x: 0, y: 0, zoom: 1 },
    };
    const w = wanted(s);
    s.cam = { ...keepInside(w, VIEW, world, w.zoom), zoom: w.zoom };
    return s;
}

/** The lift's floor over its support stone, its basket over the near bank, and the rope between them over two wheels. */
function buildLift(physics: Bodies, x: number, high: number): NonNullable<BridgeState["lift"]> {
    const f = LIFT.floor,
        b = LIFT.basket,
        wheel = DECK - high - LIFT.wheels;
    const support = physics.box({
        x,
        y: DECK + 1,
        w: STONE.half * 2,
        h: 2,
        fixed: true,
        friction: 0.9,
    });
    const floor = physics.box({
        x,
        y: DECK - f.h / 2,
        w: f.w,
        h: f.h,
        density: 1,
        friction: 0.9,
        damping: { move: LIFT.drag },
    });
    const bx = x + b.off - LIFT.floor.w / 2 - 2.2,
        by = DECK - high - 1 - b.h / 2;
    // the basket weighs what the floor does, so only what is in them tips the pulley
    const basket = physics.box({
        x: bx,
        y: by,
        w: b.w,
        h: b.h,
        density: (f.w * f.h) / (b.w * b.h),
        friction: 0.9,
        damping: { move: LIFT.drag },
    });
    physics.pulley(floor, basket, {
        over: { x, y: wheel },
        overB: { x: bx, y: wheel },
        at: { x, y: DECK - f.h },
        to: { x: bx, y: by - b.h / 2 },
    });
    const slide = physics.slider(null, floor, {
        at: { x, y: DECK - f.h / 2 },
        axis: { x: 0, y: -1 },
        lower: 0,
        upper: high,
    });
    physics.slider(null, basket, {
        at: { x: bx, y: by },
        axis: { x: 0, y: 1 },
        lower: 0,
        upper: high,
    });
    const latch = physics.weld(support, floor, { x, y: DECK });
    return { floor, basket, support, slide, latch, rising: 0 };
}

/** Kilograms in the basket. */
export const loadOf = (s: Pick<BridgeState, "load" | "L">): number =>
    s.load.reduce((sum, i) => sum + (s.L.planks[i] ?? 0), 0);

/** Where the basket hangs now. */
function basketAt(s: BridgeState): { x: number; y: number } | null {
    return s.lift ? s.physics.where(s.lift.basket) : null;
}

/** Puts the lift back at the bottom, held there, with its basket up and its sacks still in it. */
function lowerLift(s: BridgeState): void {
    const L = s.L.lift,
        lift = s.lift;
    if (!L || !lift) return;
    const x = s.x0 + L.at * s.L.per;
    s.physics.moveTo(lift.floor, { x, y: DECK - LIFT.floor.h / 2 });
    s.physics.moveTo(lift.basket, {
        x: x + LIFT.basket.off - LIFT.floor.w / 2 - 2.2,
        y: DECK - L.high - 1 - LIFT.basket.h / 2,
    });
    lift.latch ??= s.physics.weld(lift.support, lift.floor, { x, y: DECK });
    lift.rising = 0;
}

/**
 * Where the camera looks: while the bridge is built, far enough out to see every plank on the grass,
 * the whole stream and the picnic; once Charlie sets off, close in on her.
 */
function wanted(s: BridgeState): Cam {
    if (s.phase !== "stand" || s.won) return { x: s.charlie.x + 6, y: DECK - 4, zoom: 1 };
    const from = Math.min(...s.planks.map((p) => p.home.x - (p.n * s.L.per) / 2)) - 1,
        to = farX(s) + 9;
    const zoom = Math.min(1, VIEW.w / (to - from));
    return { x: (from + to) / 2, y: DECK - 4 / zoom, zoom };
}

/** Where a plank is now: its middle and its turn, on the grass, in the hand or out on the stream. */
export function plankAt(s: BridgeState, i: number): { x: number; y: number; angle: number } | null {
    const p = s.planks[i];
    if (!p) return null;
    if (s.held === i) {
        const n = lengthOf(s, i);
        if (s.hand) return { x: s.hand.x - s.grab + n / 2, y: s.hand.y, angle: -0.03 };
        if (s.cursor?.mode === "place")
            return { x: sq(s, s.cursor.at) + n / 2, y: DECK - 2.4, angle: 0 };
    }
    if (p.parts) return poseOf(s, p.parts);
    const k = s.load.indexOf(i),
        b = basketAt(s);
    // sacks in the basket sit two by two, filling it from the bottom
    if (k >= 0 && b)
        return {
            x: b.x + ((k % 2) - 0.5) * 1.1,
            y: b.y - 0.1 - Math.floor(k / 2) * 1.1,
            angle: 0,
        };
    return { x: p.home.x, y: p.home.y + THICK / 2, angle: 0 };
}

/** How many pieces a plank of `n` squares bends in: about one for every two and a half squares, two to four. */
const piecesIn = (n: number): number => Math.max(2, Math.min(4, Math.round(n / 2.5)));

/** A laid plank's middle and turn, from its near end to its far end however it bends. */
function poseOf(s: BridgeState, parts: Body[]): { x: number; y: number; angle: number } {
    const first = parts[0],
        last = parts[parts.length - 1];
    if (!first || !last) return { x: 0, y: 0, angle: 0 };
    const a = s.physics.where(first),
        b = s.physics.where(last);
    const half = (at: { angle: number }, k: number) => ({
        x: Math.cos(at.angle) * k,
        y: Math.sin(at.angle) * k,
    });
    const seg = partLength(s, parts);
    const ha = half(a, seg / 2),
        hb = half(b, seg / 2);
    const start = { x: a.x - ha.x, y: a.y - ha.y },
        end = { x: b.x + hb.x, y: b.y + hb.y };
    return {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
        angle: Math.atan2(end.y - start.y, end.x - start.x),
    };
}

/** How long each piece of a laid plank is. */
function partLength(s: BridgeState, parts: Body[]): number {
    const i = s.planks.findIndex((p) => p.parts === parts);
    return i >= 0 ? lengthOf(s, i) / parts.length : 0;
}

/** Takes a laid plank's pieces out of the world. */
function unlay(s: BridgeState, p: Plank): void {
    for (const b of p.parts ?? []) s.physics.remove(b);
    p.parts = null;
}

/** The planks a hand or the keys may pick up: not one Charlie is standing on, and not while she walks. */
export function pickable(s: BridgeState): number[] {
    if (s.phase !== "stand" || s.won) return [];
    // while Charlie is on the rope, every plank on it holds
    const onRope = s.rope.includes(s.under);
    return s.planks.flatMap((p, i) =>
        (i === s.under && p.parts) || (onRope && s.rope.includes(i)) ? [] : [i],
    );
}

function lift(s: BridgeState, i: number, nearEnd: number, out: Happening[]): void {
    const p = s.planks[i];
    if (!p) return;
    if (!pickable(s).includes(i)) {
        tell(s, s.phase === "stand" ? "Charlie is standing on that plank." : "Wait for Charlie.");
        out.push({ cue: "nope" });
        return;
    }
    if (s.rope.includes(i)) takeDown(s, i);
    else if (s.load.includes(i)) {
        s.load = s.load.filter((k) => k !== i);
        s.laidOrder = s.laidOrder.filter((k) => k !== i);
    } else if (p.parts) {
        unlay(s, p);
        s.laidOrder = s.laidOrder.filter((k) => k !== i);
    }
    s.held = i;
    s.grab = nearEnd;
    s.touched = true;
    out.push({ cue: "lift" });
}

/** Let the held plank go with its near end over `x`, from `y`: out over the stream it falls and settles, anywhere else it goes back to the grass. */
function letGo(s: BridgeState, x: number, y: number, out: Happening[]): void {
    const i = s.held,
        p = s.planks[i];
    s.held = -1;
    if (!p) return;
    const n = lengthOf(s, i);
    const b = basketAt(s);
    if (s.L.lift) {
        // a sack goes in the basket when it is let go over it, and back to the grass anywhere else
        if (b && Math.abs(x + n / 2 - b.x) < LIFT.basket.w / 2 + 0.8) {
            s.load.push(i);
            s.laidOrder.push(i);
            out.push({ cue: "place" });
        } else out.push({ cue: "back" });
        return;
    }
    // a plank let go over the grass, or above the sky, goes back to the pile
    if (x + n < s.x0 - 1 || y < DECK - 12) {
        out.push({ cue: "back" });
        return;
    }
    const r = s.L.rope,
        near = units(s, x);
    if (r && near >= r.from - 0.5 && near < r.to - 0.5) {
        s.rope.push(i);
        s.laidOrder.push(i);
        hang(s);
        out.push({ cue: "place" });
        return;
    }
    const k = piecesIn(n),
        seg = n / k,
        top = Math.min(y, DECK - THICK / 2 - 0.25);
    const parts = Array.from({ length: k }, (_, j) =>
        s.physics.box({
            x: x + seg * (j + 0.5),
            y: top,
            w: seg,
            h: THICK,
            density: PLANK_KG / THICK,
            friction: 0.9,
        }),
    );
    // the pieces give a little under Charlie's weight and spring straight again
    parts.forEach((b, j) => {
        const before = parts[j - 1];
        if (before) s.physics.weld(before, b, { x: x + seg * j, y: top }, { give: BEND });
    });
    p.parts = parts;
    p.wet = 0;
    s.laidOrder.push(i);
    out.push({ cue: "place" });
}

/** Hangs the rope's planks between its posts again, near post first, after one is added or taken down. */
function hang(s: BridgeState): void {
    const r = s.L.rope;
    if (!r) return;
    for (const i of s.rope) {
        const p = s.planks[i];
        if (p) unlay(s, p);
    }
    const sizes = s.rope.map((i) => lengthOf(s, i));
    if (!sizes.length) return;
    const a = { x: sq(s, r.from), y: DECK - THICK / 2 },
        b = { x: sq(s, r.to), y: a.y },
        total = sizes.reduce((p, q) => p + q, 0),
        // a rope short of the far post by less than a tenth of a unit is tied to it all the same
        reaches = tied(s);
    const links = s.physics.chain({
        from: a,
        to: reaches ? b : { x: a.x + total, y: a.y },
        links: sizes.length,
        sizes,
        width: THICK,
        density: PLANK_KG / THICK,
        ...(reaches ? { b: null } : {}),
    });
    s.rope.forEach((i, k) => {
        const p = s.planks[i],
            link = links[k];
        if (p && link) {
            p.parts = [link];
            p.wet = 0;
        }
    });
}

/** Whether the planks on the rope reach the far post, so the rope is tied to it. */
function tied(s: BridgeState): boolean {
    const r = s.L.rope;
    if (!r || !s.rope.length) return false;
    const total = s.rope.reduce((sum, i) => sum + lengthOf(s, i), 0);
    return total >= sq(s, r.to) - sq(s, r.from) - 0.1 * s.L.per;
}

/** Takes a plank off the rope, and hangs the rest again. */
function takeDown(s: BridgeState, i: number): void {
    const p = s.planks[i];
    if (p) unlay(s, p);
    s.rope = s.rope.filter((k) => k !== i);
    s.laidOrder = s.laidOrder.filter((k) => k !== i);
    hang(s);
}

function hands(s: BridgeState, pad: Pad, out: Happening[]): void {
    const t = pad.touch;
    if (t) {
        const was = s.hand;
        s.hand = { ...t };
        s.cursor = null;
        if (!was) {
            s.pressAt = { ...t };
            const found = pickable(s)
                .map((i) => ({ i, at: plankAt(s, i) }))
                .filter((x): x is { i: number; at: { x: number; y: number; angle: number } } => {
                    if (!x.at) return false;
                    const n = lengthOf(s, x.i),
                        c = Math.cos(x.at.angle),
                        sn = Math.sin(x.at.angle);
                    const dx = (t.x - x.at.x) * c + (t.y - x.at.y) * sn,
                        dy = -(t.x - x.at.x) * sn + (t.y - x.at.y) * c;
                    return Math.abs(dx) <= n / 2 + 0.3 && Math.abs(dy) <= 0.8;
                })
                .sort((p, q) => Math.abs(t.y - p.at.y) - Math.abs(t.y - q.at.y))[0];
            if (found) {
                const n = lengthOf(s, found.i);
                lift(s, found.i, t.x - (found.at.x - n / 2), out);
            }
        }
    }
    if (pad.lifted) {
        const at = pad.lifted;
        if (s.held >= 0) letGo(s, at.x - s.grab, at.y, out);
        else if (s.pressAt && Math.hypot(at.x - s.pressAt.x, at.y - s.pressAt.y) < 0.6) {
            // a tap on Charlie sends her off
            const c = s.charlie;
            if (Math.abs(at.x - c.x) < 1.6 && at.y < c.y + 0.5 && at.y > c.y - 4) go(s, out);
        }
        s.hand = null;
        s.pressAt = null;
    }
}

/** How far one press of an arrow moves a held plank, in units: half a unit, or a tenth where the line is in tenths. */
const nudge = (L: BridgeLevel): number => (L.tick < 1 ? L.tick : L.tick / 2);

function keys(s: BridgeState, pad: Pad, out: Happening[]): void {
    const turns = pad.pressed.filter((d) => d === "left" || d === "right");
    // the big button is always Go, so the keys pick up and put down with the up arrow
    const up = pad.pressed.includes("up"),
        down = pad.pressed.includes("down");
    if ((!turns.length && !up && !down) || pad.touch) return;
    const cur = s.cursor;
    if (cur?.mode === "place") {
        const i = s.held,
            n = s.planks[i]?.n ?? 0;
        if (down) {
            s.held = -1;
            s.cursor = { mode: "pick", i: Math.max(0, pickable(s).indexOf(i)) };
            out.push({ cue: "back" });
            return;
        }
        const step = nudge(s.L);
        for (const d of turns)
            cur.at = Math.max(-n, Math.min(s.L.far, cur.at + (d === "right" ? step : -step)));
        if (up) {
            // from the height a hand lets go at, so a plank laid by the keys lands as one laid by hand
            letGo(s, sq(s, cur.at), DECK - 1, out);
            const after = pickable(s);
            s.cursor = {
                mode: "pick",
                i: after.length ? (after.indexOf(i) + 1) % after.length : 0,
            };
        }
        return;
    }
    const list = pickable(s);
    if (!list.length) return;
    if (!cur) {
        // the first arrow shows the cursor on the first plank without moving it
        s.cursor = { mode: "pick", i: 0 };
        if (!up) return;
    }
    const pick = s.cursor?.mode === "pick" ? s.cursor : { mode: "pick" as const, i: 0 };
    for (const d of turns) pick.i = (pick.i + (d === "right" ? 1 : list.length - 1)) % list.length;
    if (!up) return;
    const i = list[pick.i % list.length];
    if (i === undefined) return;
    const was = plankAt(s, i),
        n = lengthOf(s, i);
    // a plank already out on the stream is picked up where it lies; one from the grass starts at the bank's edge
    const from = s.planks[i]?.parts && was ? units(s, was.x - n / 2) : 0;
    lift(s, i, 0, out);
    if (s.held === i) s.cursor = { mode: "place", at: Math.round(from / nudge(s.L)) * nudge(s.L) };
}

function go(s: BridgeState, out: Happening[]): void {
    if (s.won || s.phase !== "stand" || s.held >= 0) return;
    s.charlie.state = "walk";
    s.phase = "walk";
    s.touched = true;
    out.push({ cue: "lift" });
}

/** The surface under `x`, a little above feet at `y` or below them: a bank, a stone or a plank. */
function surface(s: BridgeState, x: number, y: number): { y: number; body: Body } | null {
    return s.physics.rayDown(x, y - (THICK + 0.3), SURFACE + 0.2);
}

function stepCharlie(s: BridgeState, out: Happening[]): void {
    const c = s.charlie,
        g = gait();
    s.under = -1;
    if (s.phase === "swim") {
        c.x -= BRIDGE.swim.value * DT;
        c.stride += DT * 2;
        if (c.x <= s.x0 + 0.3) {
            s.phase = "climb";
            c.x = s.x0 - 1.2;
            c.y = DECK;
            c.vy = 0;
            c.state = "stand";
            out.push({ cue: "place" }, { burst: { kind: "splash", x: s.x0, y: SURFACE, n: 6 } });
        }
        return;
    }
    if (s.phase === "climb") {
        s.phase = "stand";
        tell(s, "Charlie climbs out. Change the bridge and press Go again.");
        return;
    }
    if (s.phase === "picnic") return;
    const was = c.state,
        falling = c.vy;
    const r = stepWalker(c, (x) => surface(s, x, c.y)?.y ?? null, g, DT);
    if (r === "landed") land(s.look, falling);
    if (r === "fell") {
        s.phase = "fall";
        out.push({ cue: "nope" });
    }
    if (r === "landed") s.phase = "stand";
    if (s.phase === "fall" && c.y >= SURFACE + 0.4) {
        s.phase = "swim";
        s.falls++;
        c.state = "stand";
        c.y = SURFACE + 0.4;
        out.push(
            { cue: "splash" },
            { burst: { kind: "splash", x: c.x, y: SURFACE, n: 14 } },
            { shake: 0.25 },
        );
        tell(s, "Splash. Charlie swims back to the bank.");
        return;
    }
    if (r === "edge" && s.lift && onFloor(s)) {
        s.phase = "stand";
        board(s, out);
        return;
    }
    if (r === "edge") {
        s.phase = "stand";
        out.push({ cue: "bump" });
        const on = surface(s, c.x, c.y),
            onRope = on ? s.rope.some((i) => s.planks[i]?.parts?.includes(on.body)) : false;
        if (!onRope) tell(s, "Charlie stops. It is too far to the next plank.");
        else {
            // stuck on a rope she cannot step off, she slips into the water and swims back
            s.phase = "swim";
            s.falls++;
            c.state = "stand";
            c.y = SURFACE + 0.4;
            out.push({ cue: "splash" }, { burst: { kind: "splash", x: c.x, y: SURFACE, n: 14 } });
            tell(
                s,
                tied(s)
                    ? "The rope bridge sags too low, and Charlie slips into the water. She swims back."
                    : "The rope bridge ends before the far post, and Charlie slips into the water. She swims back.",
            );
            return;
        }
    }
    if (was === "walk" && c.state === "walk") s.phase = "walk";
    // her weight presses on the plank under her feet, so one that sticks out too far tips
    if (c.state !== "fall") {
        const at = surface(s, c.x, c.y);
        const i = at ? s.planks.findIndex((p) => p.parts?.includes(at.body)) : -1;
        if (at && i >= 0) {
            s.under = i;
            s.physics.pushAt(at.body, { x: 0, y: CHARLIE_KG * G }, { x: c.x, y: c.y });
        }
        if (at && s.lift && at.body === s.lift.floor)
            s.physics.push(at.body, { x: 0, y: CHARLIE_KG * G });
    }
    if (c.x >= farX(s) + 5 && !s.won) {
        c.state = "stand";
        s.phase = "picnic";
        s.won = true;
        s.dog.state = "walk";
        out.push({ cue: "win" }, { burst: { kind: "sparkle", x: c.x, y: DECK - 3, n: 12 } });
        tell(s, "Charlie is across. Picnic time.");
    }
}

/** Whether Charlie is standing on the lift's floor. */
function onFloor(s: BridgeState): boolean {
    const at = surface(s, s.charlie.x, s.charlie.y);
    return Boolean(at && s.lift && at.body === s.lift.floor);
}

/** Charlie steps onto the lift: it is let go, and it rises when the basket outweighs her. */
function board(s: BridgeState, out: Happening[]): void {
    const lift = s.lift;
    if (!lift) return;
    if (lift.latch) {
        s.physics.unjoin(lift.latch);
        lift.latch = null;
    }
    const kg = loadOf(s);
    if (kg > LIFT.kg) {
        s.phase = "ride";
        out.push({ cue: "lift" });
        tell(s, `The basket holds ${kg} kg, more than Charlie's ${LIFT.kg} kg. Up she goes.`);
        return;
    }
    out.push({ cue: "bump" });
    tell(
        s,
        kg === LIFT.kg
            ? `The basket holds ${kg} kg, just what Charlie weighs, so the lift hangs still. It needs a little more.`
            : `The lift stays down. The basket holds ${kg} kg, and Charlie weighs ${LIFT.kg} kg.`,
    );
}

/** The lift on its way up: at the top Charlie walks off, unless it arrived too fast and banged. */
function stepLift(s: BridgeState, out: Happening[]): void {
    const lift = s.lift,
        L = s.L.lift;
    if (!lift || !L) return;
    // the sacks are not bodies of their own: their weight pulls the basket down
    s.physics.push(lift.basket, { x: 0, y: loadOf(s) * G });
    // a sack added while Charlie waits on the lift sends it up
    if (s.phase === "stand" && !lift.latch && onFloor(s) && loadOf(s) > LIFT.kg) board(s, out);
    if (s.phase !== "ride") return;
    const up = s.physics.travel(lift.slide);
    if (up < L.high - 0.05) {
        lift.rising = -s.physics.velocity(lift.floor).y;
        return;
    }
    if (lift.rising <= LIFT.gentle) {
        s.phase = "walk";
        s.charlie.state = "walk";
        out.push({ cue: "level" });
        tell(s, "The lift reaches the top, and Charlie steps off.");
        return;
    }
    s.phase = "stand";
    s.falls++;
    s.charlie.x = s.x0 - 1.2;
    s.charlie.y = DECK;
    s.charlie.state = "stand";
    lowerLift(s);
    out.push({ cue: "crash" }, { shake: 0.3 });
    tell(
        s,
        `The basket holds ${loadOf(s)} kg, too heavy against Charlie's ${LIFT.kg} kg, so the lift shoots up and bangs to a stop. She rides it back down. Take something out.`,
    );
}

/** A plank that has gone into the water floats back to the grass after a moment. */
function stepPlanks(s: BridgeState, out: Happening[]): void {
    s.planks.forEach((p, i) => {
        // a rope's planks hang where the rope puts them, in the water or out of it
        if (!p.parts || s.rope.includes(i)) return;
        const at = poseOf(s, p.parts);
        if (at.y < SURFACE + 0.2 && at.x > -5 && at.x < s.world.w + 5) {
            p.wet = 0;
            return;
        }
        if (p.wet === 0)
            out.push({ cue: "splash" }, { burst: { kind: "splash", x: at.x, y: SURFACE, n: 8 } });
        p.wet += DT;
        if (p.wet < 1) return;
        unlay(s, p);
        p.wet = 0;
        s.laidOrder = s.laidOrder.filter((k) => k !== i);
    });
}

function stepDog(s: BridgeState): void {
    const d = s.dog;
    if (!s.won) {
        d.x = s.x0 - 3;
        d.y = DECK;
        return;
    }
    if (d.x < farX(s) + 2)
        stepWalker(d, (x) => surface(s, x, d.y)?.y ?? null, { ...gait(), speed: 5 }, DT);
    else d.state = "stand";
}

function reached(s: BridgeState): Set<string> {
    const out = new Set<string>();
    if (s.phase === "swim" || s.phase === "fall") return out;
    s.L.stones.forEach((st, k) => {
        if (s.charlie.x >= sq(s, st) - STONE.half) out.add(`stone:${k}`);
    });
    if (s.won) out.add("picnic");
    return out;
}

function step(s: BridgeState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    hands(s, pad, out);
    keys(s, pad, out);
    if (pad.tapped) go(s, out);
    stepCharlie(s, out);
    stepLift(s, out);
    stepActor(s.look, actOf(s), CHARLIE_ACTS, DT, s.charlie.stride, s.charlie.facing);
    s.physics.step(DT);
    stepPlanks(s, out);
    stepDog(s);
    const newly = observe(s.goals, reached(s), DT);
    if (newly.length && !s.won) out.push({ cue: "ring" });
    s.cam = follow(s.cam, wanted(s), {
        rate: 2.4,
        zoomRate: 1.6,
        dt: DT,
        view: VIEW,
        world: s.world,
    });
    return out;
}

/** Takes the last plank laid back to the grass. */
function back(s: BridgeState): boolean {
    if (s.phase !== "stand" || s.held >= 0) return false;
    const i = s.laidOrder.at(-1),
        p = i === undefined ? undefined : s.planks[i];
    if (i !== undefined && s.load.includes(i)) {
        s.load = s.load.filter((k) => k !== i);
        s.laidOrder.pop();
        tell(s, "Taken back.");
        return true;
    }
    if (!p?.parts || i === s.under || i === undefined) return false;
    if (s.rope.includes(i)) {
        takeDown(s, i);
        tell(s, "Taken back.");
        return true;
    }
    unlay(s, p);
    s.laidOrder.pop();
    tell(s, "Taken back.");
    return true;
}

/** Whether anything is still moving: a plank settling or sinking, Charlie walking, falling or swimming. */
const busy = (s: BridgeState): boolean =>
    s.phase === "walk" ||
    s.phase === "fall" ||
    s.phase === "swim" ||
    s.phase === "climb" ||
    s.phase === "ride" ||
    (s.won && s.dog.state === "walk") ||
    s.planks.some(
        (p) => p.parts !== null && (p.wet > 0 || p.parts.some((b) => s.physics.moving(b, 0.05))),
    );

const POSE_SIZE: Record<string, number> = { balance: 6, point: 6 };

type CharlieAct = "wave" | "stand" | "walk" | "air" | "balance" | "cheer";
const CHARLIE_ACTS: Record<CharlieAct, Cycle> = {
    wave: { poses: ["wave"] },
    stand: { poses: ["stand"] },
    walk: { poses: ["stand", "walk"], per: 1 },
    air: { poses: ["jump"] },
    balance: { poses: ["balance"] },
    cheer: { poses: ["cheer"] },
};

/** What Charlie is doing, as her drawing shows it: on a plank that has begun to tip she puts her arms out. */
function actOf(s: BridgeState): CharlieAct {
    const parts = s.planks[s.under]?.parts,
        tilted = parts ? Math.abs(poseOf(s, parts).angle) > 0.06 : false;
    return s.phase === "picnic"
        ? "cheer"
        : s.phase === "fall"
          ? "air"
          : s.phase === "swim" || tilted
            ? "balance"
            : s.phase === "walk"
              ? "walk"
              : s.won || s.touched
                ? "stand"
                : "wave";
}

function charlieSprite(s: BridgeState, rest: boolean): Sprite[] {
    const c = s.charlie,
        outfit = s.L.outfit,
        act = s.look.act;
    const mood = act === "air" || act === "balance" ? "surprised" : s.won ? "excited" : "happy";
    const dress = (pose: string, facing: 1 | -1): Sprite => {
        const box = POSE_SIZE[pose] ?? 4;
        return {
            key: "charlie",
            art: "charlie",
            params: { ...outfit, pose, mood },
            size: box * K,
            x: c.x,
            y: c.y + (rest ? 0 : bob(c, 0.18)) + 0.2 * K,
            stand: true,
            ...(facing < 0 ? { flip: true } : {}),
            z: 9,
        };
    };
    if (s.phase === "swim") {
        const box = POSE_SIZE.balance ?? 4;
        return [
            {
                key: "charlie",
                art: "charlie",
                params: { ...outfit, pose: "balance", mood },
                crop: { x: 0, y: 0.5, w: box, h: 2.6 },
                size: box * K,
                x: c.x,
                y: SURFACE - (2.6 * K) / 2 + 0.35,
                z: 9,
            },
        ];
    }
    // at rest a walk is drawn standing, since nothing moves between one drawing and the next
    if (rest && act === "walk") return [dress("stand", s.look.facing)];
    return actorSprites(s.look, CHARLIE_ACTS, dress, c.stride, rest);
}

function frame(s: BridgeState, rest = false): Frame {
    const L = s.L,
        W = s.world,
        far = farX(s),
        top = DECK - (L.lift?.high ?? 0),
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    for (const [k, [x, y, size, puffs]] of (
        [
            [6, 5, 6, 4],
            [20, 3.5, 5, 3],
            [34, 5.5, 7, 5],
            [50, 4, 5, 3],
        ] as const
    ).entries())
        sprites.push({
            key: `cloud:${k}`,
            art: "cloud",
            params: { puffs, rain: 0 },
            seed: 11 + k,
            size,
            x,
            y,
            z: 0,
            depth: 0.5,
            still: true,
        });
    sprites.push(
        {
            key: "tree",
            art: "tree",
            params: { fruit: 4, fallen: 0, item: "apple" },
            seed: 5,
            size: 7,
            x: s.x0 - 3.5,
            y: DECK,
            stand: true,
            z: 1,
            still: true,
        },
        {
            key: "firs",
            art: "firs",
            params: { count: 2, snow: 0 },
            seed: 25,
            size: 5,
            x: W.w - 3,
            y: DECK,
            stand: true,
            z: 1,
            still: true,
        },
        {
            key: "ground:near",
            art: "arcade.ground",
            params: { w: Math.round(s.x0) },
            seed: 61,
            x: s.x0 / 2,
            y: DECK + 1.1,
            z: 2,
            still: true,
        },
        {
            key: "ground:far",
            art: "arcade.ground",
            params: { w: Math.round(W.w - far) },
            seed: 62,
            x: (far + W.w) / 2,
            y: top + 1.1,
            z: 2,
            still: true,
        },
        {
            key: "rug",
            art: "picnicrug",
            params: { w: 6, colour: "berry" },
            size: 6,
            x: far + 6.5,
            y: top + 0.25,
            stand: true,
            z: 3,
            still: true,
        },
        {
            key: "basket",
            art: "basket",
            params: { item: "apple", count: 5, label: "" },
            size: 2,
            x: far + 8.2,
            y: top - 0.2,
            stand: true,
            z: 4,
            still: true,
        },
    );
    const deep = Math.ceil(H - SURFACE + 1);
    for (let x = s.x0; x < far; x += 16) {
        const across = Math.min(16, Math.ceil(far - x));
        sprites.push({
            key: `stream:${x}`,
            art: "sea",
            params: { across, deep, x0: Math.round(x - s.x0), bed: true },
            seed: 70 + Math.round(x),
            x: x + across / 2,
            y: SURFACE - 0.2 + deep / 2,
            z: 3,
            still: true,
        });
    }
    for (const [k, [x, lean]] of (
        [
            [s.x0 - 0.6, 0.2],
            [far + 0.8, -0.15],
        ] as const
    ).entries())
        sprites.push({
            key: `reeds:${k}`,
            art: "reeds",
            params: { stems: 5 + k, lean },
            seed: 80 + k,
            size: 2.6,
            x,
            y: DECK + 0.2,
            stand: true,
            z: 5,
            still: true,
        });
    (L.lift ? [0, L.lift.at] : [0, ...L.stones, L.far]).forEach((st, k) => {
        sprites.push({
            key: `stone:${k}`,
            art: "steppingstone",
            params: { n: L.numbers ? written({ ...L, unit: "" }, st) : "", w: STONE.w, dark: 0 },
            size: STONE.size,
            seed: 40 + k,
            x: sq(s, st),
            y: DECK + (STONE.h - STONE.top) * (STONE.size / STONE.w),
            stand: true,
            z: 4,
            still: true,
        });
    });
    // the line the stream is measured by, just under the surface; a lift's stream is not measured
    const count = L.lift ? -1 : Math.round(L.far / L.tick);
    for (let k = 0; k <= count; k++) {
        const u = k * L.tick,
            x = sq(s, u),
            numbered = Math.abs(u / L.every - Math.round(u / L.every)) < 1e-6;
        marks.push({
            kind: "line",
            a: { x, y: SURFACE + 0.7 },
            b: { x, y: SURFACE + (numbered ? 1.4 : 1.1) },
            style: "thin",
        });
        if (numbered)
            marks.push({
                kind: "word",
                x,
                y: SURFACE + 2.1,
                text: written({ ...L, unit: "" }, u),
                size: 0.6,
            });
    }
    if (!L.lift)
        marks.push({
            kind: "line",
            a: { x: s.x0, y: SURFACE + 0.7 },
            b: { x: far, y: SURFACE + 0.7 },
            style: "thin",
        });
    if (L.unit && !L.lift)
        marks.push({ kind: "word", x: far + 1.4, y: SURFACE + 2.1, text: L.unit, size: 0.55 });
    s.planks.forEach((p, i) => {
        const at = plankAt(s, i);
        if (!at) return;
        if (L.lift) {
            sprites.push({
                key: `sack:${i}`,
                art: "sack",
                params: { label: written(L, p.n) },
                size: SACK,
                x: at.x,
                y: at.y,
                z: s.held === i ? 12 : s.load.includes(i) ? 7 : 5,
            });
            return;
        }
        const n = lengthOf(s, i),
            drawn = Math.max(1, Math.round(n));
        // a laid plank is drawn piece by piece, so it bends where its pieces do
        if (p.parts && s.held !== i) {
            const k = p.parts.length;
            p.parts.forEach((b, j) => {
                const w = s.physics.where(b);
                sprites.push({
                    key: j ? `plank:${i}:${j}` : `plank:${i}`,
                    art: "plank",
                    params: { w: drawn, label: written(L, p.n) },
                    crop: { x: (drawn * j) / k, y: 0, w: drawn / k, h: 1 },
                    size: n / k,
                    x: w.x,
                    y: w.y + p.wet * 1.2,
                    angle: w.angle,
                    alpha: Math.max(0, 1 - p.wet),
                    z: 6,
                });
            });
            return;
        }
        sprites.push({
            key: `plank:${i}`,
            art: "plank",
            params: { w: drawn, label: written(L, p.n) },
            size: n,
            x: at.x,
            y: at.y + p.wet * 1.2,
            angle: at.angle,
            alpha: Math.max(0, 1 - p.wet),
            z: s.held === i ? 12 : 5 - i * 0.01,
        });
    });
    sprites.push(...charlieSprite(s, rest), {
        key: "dog",
        art: "dog",
        params: { facing: 1, ball: 0 },
        // the dog drawing stands on a line of its own ground, which the bank already draws
        crop: { x: 0.8, y: 0.4, w: 7.4, h: 5.2 },
        size: 2.6,
        x: s.dog.x,
        y: s.dog.y + bob(s.dog, 0.15),
        stand: true,
        z: 8,
    });
    if (s.lift && L.lift) liftMarks(s, L.lift.high, top, sprites, marks);
    if (L.rope) {
        const a = sq(s, L.rope.from),
            b = sq(s, L.rope.to),
            post = 2.6,
            rail = 1.6;
        for (const x of [a, b])
            marks.push({ kind: "line", a: { x, y: DECK }, b: { x, y: DECK - post }, style: "rod" });
        // the hand rope runs from the near post over each plank's ends, and on to the far post when it reaches
        const ends = s.rope.flatMap((i) => {
            const link = s.planks[i]?.parts?.[0];
            if (!link) return [];
            const w = s.physics.where(link),
                h = lengthOf(s, i) / 2,
                dx = Math.cos(w.angle) * h,
                dy = Math.sin(w.angle) * h;
            return [{ x: w.x + dx, y: w.y + dy - rail }];
        });
        const line = [
            { x: a, y: DECK - post },
            ...ends,
            ...(tied(s) ? [{ x: b, y: DECK - post }] : []),
        ];
        if (!s.rope.length)
            marks.push({
                kind: "line",
                a: { x: a, y: DECK - post },
                b: { x: b, y: DECK - post },
                bend: -1.2,
                style: "thin",
            });
        line.forEach((p, k) => {
            const q = line[k + 1];
            if (q) marks.push({ kind: "line", a: p, b: q, style: "thin" });
        });
    }
    // a held plank shows where its near end is over the line, so a child can read it before letting go
    if (s.held >= 0) {
        const at = plankAt(s, s.held),
            n = lengthOf(s, s.held);
        if (at) {
            const end = at.x - n / 2;
            marks.push(
                {
                    kind: "line",
                    a: { x: end, y: at.y + 0.5 },
                    b: { x: end, y: SURFACE + 0.7 },
                    style: "aim",
                },
                {
                    kind: "line",
                    a: { x: end + n, y: at.y + 0.5 },
                    b: { x: end + n, y: SURFACE + 0.7 },
                    style: "aim",
                },
            );
        }
    } else if (s.cursor?.mode === "pick") {
        const i = pickable(s)[s.cursor.i];
        const at = i === undefined ? null : plankAt(s, i);
        if (at) marks.push({ kind: "ring", x: at.x, y: at.y, r: 1, on: true });
    }
    return {
        sprites,
        marks,
        camera: rest
            ? (() => {
                  const w = wanted(s);
                  return { ...keepInside(w, VIEW, W, w.zoom), zoom: w.zoom };
              })()
            : s.cam,
        view: VIEW,
        world: W,
    };
}

/** The lift: its floor and basket, the far bank's timber face, and the frame, wheels and ropes over them. */
function liftMarks(
    s: BridgeState,
    high: number,
    top: number,
    sprites: Sprite[],
    marks: Mark[],
): void {
    const lift = s.lift;
    if (!lift) return;
    const floor = s.physics.where(lift.floor),
        basket = s.physics.where(lift.basket),
        far = farX(s),
        wheel = top - LIFT.wheels;
    sprites.push(
        {
            key: "lift:face",
            art: "marblerun",
            params: { part: "wall", w: 3, h: Math.round(high), label: "", colour: "tang" },
            size: 1.6,
            x: far + 0.8,
            y: top + high / 2 + 0.6,
            z: 2,
            still: true,
        },
        {
            key: "lift:floor",
            art: "plank",
            params: { w: 3, label: "" },
            size: LIFT.floor.w,
            x: floor.x,
            y: floor.y,
            z: 6,
        },
        {
            key: "lift:basket",
            art: "basket",
            params: { item: "apple", count: 0, label: "" },
            size: LIFT.basket.w + 0.4,
            x: basket.x,
            y: basket.y + LIFT.basket.h / 2,
            stand: true,
            z: 6,
        },
    );
    const a = { x: floor.x, y: wheel },
        b = { x: basket.x, y: wheel },
        post = far + 0.6;
    marks.push(
        {
            kind: "line",
            a: { x: b.x - 1.4, y: DECK },
            b: { x: b.x - 1.4, y: wheel - 0.9 },
            style: "rod",
        },
        { kind: "line", a: { x: post, y: top }, b: { x: post, y: wheel - 0.9 }, style: "rod" },
        {
            kind: "line",
            a: { x: b.x - 1.4, y: wheel - 0.9 },
            b: { x: post, y: wheel - 0.9 },
            style: "rod",
        },
        { kind: "ring", x: a.x, y: a.y, r: 0.6, solid: true },
        { kind: "ring", x: b.x, y: b.y, r: 0.6, solid: true },
        {
            kind: "line",
            a: { x: a.x + 0.6, y: a.y },
            b: { x: floor.x + 0.6, y: floor.y },
            style: "thin",
        },
        {
            kind: "line",
            a: { x: a.x - 0.6, y: a.y },
            b: { x: b.x + 0.6, y: b.y },
            bend: 0.4,
            style: "thin",
        },
        {
            kind: "line",
            a: { x: b.x - 0.6, y: b.y },
            b: { x: basket.x - 0.6, y: basket.y - LIFT.basket.h / 2 },
            style: "thin",
        },
        { kind: "word", x: floor.x, y: wheel - 2, text: `Charlie ${LIFT.kg} kg`, size: 0.6 },
    );
}

function say(s: BridgeState): string {
    const L = s.L,
        parts: string[] = [];
    if (L.lift) {
        const inBasket = s.load.map((i) => written(L, s.planks[i]?.n ?? 0)),
            grass = s.planks.flatMap((p, i) =>
                s.load.includes(i) || s.held === i ? [] : [written(L, p.n)],
            );
        parts.push(
            `Charlie weighs ${LIFT.kg} kg. The lift carries her up to the high bank when the basket outweighs her.`,
            inBasket.length
                ? `In the basket: ${inBasket.join(", ")}, together ${loadOf(s)} kg.`
                : "The basket is empty.",
        );
        if (grass.length) parts.push(`On the grass: ${grass.join(", ")}.`);
        parts.push(
            s.won
                ? "Charlie is at the picnic."
                : s.phase === "ride"
                  ? "Charlie is riding the lift up."
                  : s.lift && !s.lift.latch
                    ? "Charlie is standing on the lift."
                    : "Charlie is on the near bank.",
        );
        if (s.held >= 0)
            parts.push(`You are holding the ${written(L, s.planks[s.held]?.n ?? 0)} sack.`);
        return parts.join(" ");
    }
    parts.push(
        `The far bank is at ${written(L, L.far)}. ${L.stones.length === 1 ? "A stone stands" : "Stones stand"} at ${L.stones.map((n) => written(L, n)).join(" and ")}.`,
    );
    const across = s.laidOrder.flatMap((i) => {
        const at = plankAt(s, i),
            p = s.planks[i];
        if (!at || !p) return [];
        const from = Math.round(units(s, at.x - lengthOf(s, i) / 2) / nudge(L)) * nudge(L);
        return [`${written(L, p.n)} from ${written(L, from)}`];
    });
    parts.push(across.length ? `Planks laid: ${across.join(", ")}.` : "No plank is laid yet.");
    if (L.rope && s.rope.length) {
        const sizes = s.rope.map((i) => s.planks[i]?.n ?? 0),
            sum = Math.round(sizes.reduce((a, b) => a + b, 0) * 100) / 100;
        parts.push(
            `The rope holds ${sizes.map((n) => written(L, n)).join(" and ")}, together ${written(L, sum)}, ${tied(s) ? "tied to the far post" : "short of the far post"}.`,
        );
    }
    const grass = s.planks.filter((p, i) => !p.parts && s.held !== i).map((p) => p.n);
    if (grass.length) parts.push(`On the grass: ${grass.map((n) => written(L, n)).join(", ")}.`);
    const c = units(s, s.charlie.x);
    parts.push(
        s.won
            ? "Charlie is at the picnic."
            : s.phase === "swim"
              ? "Charlie is swimming back."
              : `Charlie is ${c < 0 ? "on the near bank" : `at ${written(L, Math.round(c * 10) / 10)}`}${s.phase === "walk" ? ", walking" : ""}.`,
    );
    if (s.held >= 0)
        parts.push(`You are holding the ${written(L, s.planks[s.held]?.n ?? 0)} plank.`);
    return parts.join(" ");
}

export const bridgeGame: ActionGame<BridgeState> = {
    id: "bridge",
    title: "Charlie's bridge",
    group: "action",
    quiet: true,
    levels: BRIDGE_LEVELS,
    rate: RATE,
    touch: true,
    cover: { art: "charlie", params: { pose: "balance" } },
    hint: "Drag planks over the stream and let go, then tap Charlie or press Go. With the keys: left and right choose a plank or move it, up picks up and lets go, down puts it back, and space is Go",
    controls: {
        arrows: { left: "Before", right: "After", up: "Pick up / let go", down: "Put back" },
        go: "Go",
    },
    start: (level) => startBridge(BRIDGE_LEVELS[level] ?? BRIDGE_LEVELS[0], level),
    step,
    frame,
    say,
    back,
    note: (s) =>
        !s.touched && !s.won ? s.L.prompt : s.steps - s.saidAt < RATE * 4 || s.won ? s.said : "",
    won: (s) => s.won,
    objectives: (s) => ({ completed: s.goals.done.length, total: s.goals.definitions.length }),
    cancelInput: (s) => {
        if (s.held >= 0) s.held = -1;
        s.hand = null;
        s.pressAt = null;
    },
    tuning: BRIDGE,
    still: {
        press: () => Math.round(RATE * 0.25),
        settling: busy,
    },
};
