// Measure it out, played with the hands: the jugs on the kitchen counter are picked up by their
// handles and tipped. The further a jug is tipped the faster it pours, a gentle tilt dribbling and a
// steep one gushing, and it stops as soon as it is set level or let go. Poured into another jug it
// stops by itself when that jug reaches its brim, so the puzzle's exact amounts can still be made;
// tipped again over a full jug it spills, and the spill is lost. A jug set down under the tap fills
// while the tap is held, and one tipped over the flowers is emptied. The first two levels' jugs are
// marked, so an amount can be poured by eye and checked on the scale; the rest are the classic puzzle,
// with only the brim marked, so the amount has to be made from what the jugs hold. The puzzle itself
// is pour.ts, and its prover still shows every level can be won with whole pours. See .docs/games.md.
//
// The water is counted exactly, jug by jug, and what leaves a jug falls as drops of a particle liquid
// that each carry their share of it: a jug reads, and is drawn holding, what has landed in it, so its
// scale rises as the stream arrives and the puzzle's amounts stay exact.
import { submerged } from "../../engine/motion/float";
import type { Pt } from "../../engine/motion/geometry";
import {
    count,
    drain,
    liquid,
    places,
    pour,
    STREAM,
    stepLiquid,
    WATER,
    type Liquid,
} from "../../engine/motion/liquid";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Pool, Sprite } from "../../engine/motion/scene";
import { RIPPLE, rippleAt } from "../../engine/motion/surface";
import { knob } from "../../engine/motion/tune";
import { pourRate, transfer, type Pouring } from "../../engine/motion/vessel";
import type { ActionGame, ActionLevel, Levels } from "./game";
import type { PourVersion } from "./pour";

const LETTERS = "ABCD";
const RATE = 60,
    DT = 1 / RATE;
/**
 * The jug drawing's box, and places on it in its own squares (engine/parts/measuring/jug.ts): the lip
 * of its spout, the middle of its mouth, its handle, the middle of the box and the line it stands on.
 */
const SPOUT: Pt = { x: 1.9, y: 1.8 };
const MOUTH: Pt = { x: 5.5, y: 2 };
const HANDLE: Pt = { x: 9.6, y: 4.4 };
const MIDDLE: Pt = { x: 5.5, y: 6 };
const FOOT = 10.4;
/** Half the width of a jug's mouth, where a stream still goes in. */
const RIM = 3.2;
/**
 * The inside of the jug drawing, in its own squares, and how far up it its scale runs from the bottom
 * to the brim: engine/parts/measuring/jug.ts draws its walls, and its scale at 16 pixels under the rim.
 */
const INSIDE: readonly Pt[] = [
    { x: 3, y: 2 },
    { x: 8, y: 2 },
    { x: 7.6, y: 10 },
    { x: 3.4, y: 10 },
];
const BOTTOM = 10,
    SCALE = 7.2;
/** Squares between the dots that fill a jug's water, and between those along its surface. */
const GRAIN = 0.3,
    SKIN = 0.12;
/** The most drops falling at once, across every stream. */
const MOST_DROPS = 420;
/** How a jug's surface swings back to level when it is jolted: its stiffness a second squared, and its damping a second. */
const SLOSH = { k: 55, damping: 3.2, most: 0.35 };
/**
 * In each drawing's own squares: the tap's spout; how far down the worktop drawing its surface is and
 * how tall it is (engine/parts/food/worktop.ts); the flowers' box, and how tall the order card is.
 */
const TAP_SPOUT: Pt = { x: 4.65, y: 3.1 };
const TAP = { w: 6, h: 7 };
const WORKTOP = { top: 4.5, h: 13 };
const FLOWERS = { w: 5, h: 10, ground: 9 };
/** Squares of counter drawn past each end of the kitchen, more than the widest room shows. */
const REACH = 40;
/** Squares of sky over the counter, room to lift a jug and tip it over the others. */
const WALL = 21;
const GAP = 1.5;
/** The height a carried jug's handle is held at: its foot clears the other jugs' rims. */
export const CARRY = WALL + MOUTH.y - (FOOT - HANDLE.y) - 0.6;
/** The most a jug tips, in radians. */
const MOST_TILT = 1.9;

export const POUR = {
    tilt: knob(
        0.36,
        0.2,
        0.6,
        0.02,
        "radians a square",
        "a hand lowered a square below the carry line tips the jug this far, so a full tip is five squares",
    ),
    gush: knob(
        0.45,
        0.2,
        0.8,
        0.05,
        "of a jug a second",
        "the fastest pour empties a jug in about two seconds: quick enough to feel, slow enough to stop",
    ),
    tap: knob(
        0.3,
        0.1,
        0.6,
        0.05,
        "of the biggest jug a second",
        "the tap fills the biggest jug in about three seconds, so its scale can be watched as it rises",
    ),
    keys: knob(
        1.2,
        0.5,
        2.5,
        0.1,
        "radians a second",
        "a held arrow tips a jug to a steady pour in about a second",
    ),
};

const pouring = (): Pouring => ({ full: 0.25, empty: 1.5, span: 0.5, most: POUR.gush.value });

export interface PourLevel extends ActionLevel {
    v: PourVersion;
    /** Whether the jugs carry their scales, so an amount can be read off them; otherwise only the brim. */
    marked: boolean;
    prompt: string;
}

/** The activity's six versions (pour.measure-it-out in activities.ts), which the prover checks for every level. */
const V: [PourVersion, ...PourVersion[]] = [
    {
        jugs: [
            { max: 500, step: 100 },
            { max: 300, step: 100 },
        ],
        target: 200,
        unit: "ml",
    },
    {
        jugs: [
            { max: 500, step: 100 },
            { max: 300, step: 100 },
        ],
        target: 100,
        unit: "ml",
    },
    {
        jugs: [
            { max: 5, step: 1 },
            { max: 3, step: 1 },
        ],
        target: 4,
        unit: "l",
    },
    {
        jugs: [
            { max: 7, step: 1 },
            { max: 3, step: 1 },
        ],
        target: 5,
        unit: "l",
    },
    {
        jugs: [
            { max: 900, step: 100 },
            { max: 400, step: 100 },
        ],
        target: 600,
        unit: "ml",
    },
    {
        jugs: [
            { max: 1000, step: 100 },
            { max: 300, step: 100 },
        ],
        target: 100,
        unit: "ml",
    },
];
const version = (i: number): PourVersion => V[i] ?? V[0];

export const POUR_LEVELS: Levels<PourLevel> = [
    {
        title: "500 and 300, measure 200",
        grades: [2, 3],
        goal: "Get exactly 200 ml standing in one jug.",
        prompt: "Pick up a jug by its handle, lower your hand to tip it, and read the scale.",
        v: version(0),
        marked: true,
    },
    {
        title: "500 and 300, measure 100",
        grades: [2, 4],
        goal: "Get exactly 100 ml standing in one jug.",
        prompt: "A pour into a jug stops by itself at the brim.",
        v: version(1),
        marked: true,
    },
    {
        title: "5 and 3, measure 4",
        grades: [3, 4],
        goal: "Get exactly 4 litres in one jug. These jugs are marked only at the brim.",
        prompt: "No marks now, only the brim. Four litres has to be made from five and three.",
        v: version(2),
        marked: false,
    },
    {
        title: "7 and 3, measure 5",
        grades: [3, 4],
        goal: "Get exactly 5 litres in one jug, marked only at the brim.",
        prompt: "A jug of seven and a jug of three, and only their brims to go by.",
        v: version(3),
        marked: false,
    },
    {
        title: "900 and 400, measure 600",
        grades: [3, 4],
        goal: "Get exactly 600 ml in one jug, marked only at the brim.",
        prompt: "The jugs hold 900 ml and 400 ml. Six hundred has to be made.",
        v: version(4),
        marked: false,
    },
    {
        title: "1 litre and 300, measure 100",
        grades: [4, 4],
        goal: "Get exactly 100 ml in one jug, marked only at the brim.",
        prompt: "A litre jug and a 300 ml jug, for an order of only 100 ml.",
        v: version(5),
        marked: false,
    },
];

interface Kitchen {
    /** Where a jug stands under the tap, and where each jug stands at home: the tops of their boxes. */
    fill: Pt;
    home: (i: number) => Pt;
    tap: Pt;
    plant: Pt;
    worktop: Pt;
    length: number;
    sink: number;
    order: Pt;
    size: { w: number; h: number };
}

/** The tap over the sink at the left, the jugs along the worktop, the flowers at the right, and the order taped up over them. */
function kitchenOf(n: number): Kitchen {
    const fill = { x: 1, y: WALL };
    const plantX = 13.5 + n * (11 + GAP) + 1;
    // room past the flowers for a jug held out over them to tip
    const length = Math.min(64, Math.ceil(plantX + 6.5 + 11)),
        surface = WALL + FOOT;
    return {
        fill,
        home: (i) => ({ x: 13.5 + i * (11 + GAP), y: WALL }),
        tap: { x: fill.x + MOUTH.x - TAP_SPOUT.x, y: WALL + MOUTH.y - 0.9 - TAP_SPOUT.y },
        plant: { x: plantX, y: surface - FLOWERS.ground },
        worktop: { x: 0, y: surface - WORKTOP.top },
        length,
        sink: fill.x + MOUTH.x,
        order: { x: length - 12.5, y: 2 },
        size: { w: length, h: Math.ceil(surface - WORKTOP.top + WORKTOP.h) },
    };
}

/** Where a jug is: its handle, in the world, and how far it is turned (less than nought tips its spout down). */
interface Pose {
    x: number;
    y: number;
    angle: number;
}

/** A jug's water surface as it swings: its tilt from level in radians and how fast it turns, and the rings where drops land. */
interface Slosh {
    a: number;
    v: number;
    /** The middle of the jug and how fast it moved in the last step, and its turn, to feel a jolt by. */
    x: number;
    vx: number;
    angle: number;
    waves: { x: number; age: number; size: number }[];
}

interface Jug {
    max: number;
    /** What is in it, landed or still falling into it: the amount the puzzle counts. */
    level: number;
    place: "home" | "tap" | "held";
    pose: Pose;
    /** A pour from this jug stopped at another's brim, until it is set level again. */
    stopped: boolean;
    /** How far, from nought to one, a set-down jug has glided back to its place. */
    back: number;
    from: Pose;
    slosh: Slosh;
}

export interface PourState {
    level: number;
    L: PourLevel;
    jugs: Jug[];
    held: number;
    /** Where the hand holds the carried jug, or null when the keys carry it. */
    hand: Pt | null;
    /** From the hand to the carried jug's handle, and whether the jug has been lifted clear of the rims yet: it tips only after. */
    grip: Pt;
    clear: boolean;
    tapHeld: boolean;
    /** The keys: which jug is chosen, and for a jug the keys carry, which place it hangs over and how far it is tipped. */
    cursor: number;
    keyAt: number;
    keyTilt: number;
    running: boolean;
    /** The falling drops, tagged with the jug each is falling into (-1 for none), and what each carries. */
    drops: Liquid;
    carry: number[];
    /** How many drops a stream has yet to let go of, carried from step to step so a thin stream still drips. */
    thread: number[];
    calm: number;
    said: string;
    saidAt: number;
    touched: boolean;
    steps: number;
    won: boolean;
    spilt: number;
}

/** A point in a jug's own squares, in the world, for a jug held at `pose`. */
function worldOf(pose: Pose, q: Pt): Pt {
    const c = Math.cos(pose.angle),
        s = Math.sin(pose.angle);
    const dx = q.x - HANDLE.x,
        dy = q.y - HANDLE.y;
    return { x: pose.x + dx * c - dy * s, y: pose.y + dx * s + dy * c };
}

const restAt = (top: Pt): Pose => ({ x: top.x + HANDLE.x, y: top.y + HANDLE.y, angle: 0 });

export function startPour(L: PourLevel, level: number): PourState {
    const k = kitchenOf(L.v.jugs.length);
    return {
        level,
        L,
        jugs: L.v.jugs.map((j, i) => {
            const pose = restAt(k.home(i));
            return {
                max: j.max,
                level: 0,
                place: "home",
                pose,
                stopped: false,
                back: 1,
                from: pose,
                slosh: {
                    a: 0,
                    v: 0,
                    x: pose.x,
                    vx: 0,
                    angle: 0,
                    waves: [],
                },
            };
        }),
        held: -1,
        hand: null,
        grip: { x: 0, y: 0 },
        clear: false,
        tapHeld: false,
        cursor: -1,
        keyAt: 0,
        keyTilt: 0,
        running: false,
        drops: liquid(MOST_DROPS),
        carry: [],
        thread: [0, 0],
        calm: 0,
        said: "",
        saidAt: -999,
        touched: false,
        steps: 0,
        won: false,
        spilt: 0,
    };
}

function tell(s: PourState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

const kitchen = (s: PourState): Kitchen => kitchenOf(s.jugs.length);

/** The middle of a jug's drawing, where a hand takes hold of it, and the middle of the tap. */
export const middleOf = (s: PourState, i: number): Pt | null => {
    const j = s.jugs[i];
    return j ? worldOf(j.pose, MIDDLE) : null;
};
export const tapAt = (s: PourState): Pt => {
    const k = kitchen(s);
    return { x: k.tap.x + TAP.w / 2, y: k.tap.y + TAP.h / 2 };
};
/** Where a carried jug's handle is held to set it down under the tap. */
export const fillAt = (s: PourState): number => kitchen(s).fill.x + HANDLE.x;
const unit = (s: PourState): string => s.L.v.unit;
const amount = (s: PourState, n: number): string => {
    const q = unit(s) === "l" ? 0.1 : 10;
    return `${Math.round(n / q) * q} ${unit(s)}`;
};

/** How near the target a jug must stand to count: a fiftieth of the smaller jug. */
export const toleranceOf = (L: PourLevel): number => 0.02 * Math.min(...L.v.jugs.map((j) => j.max));

/**
 * The places the keys may carry a jug to, left to right: under the tap, over each other jug's mouth,
 * and over the flowers. For a pour, the handle is held where the jug's spout is over the place.
 */
export function keyPlaces(s: PourState, i: number): { id: string; x: number }[] {
    const k = kitchen(s);
    const reach = SPOUT.x - HANDLE.x;
    const places = [{ id: "tap", x: k.fill.x + HANDLE.x }];
    s.jugs.forEach((_, j) => {
        if (j !== i) places.push({ id: `jug:${j}`, x: k.home(j).x + MOUTH.x - reach });
    });
    places.push({ id: "flowers", x: k.plant.x + FLOWERS.w / 2 - reach });
    return places.sort((a, b) => a.x - b.x);
}

function pickUp(s: PourState, i: number, out: Happening[]): void {
    const j = s.jugs[i];
    if (!j || s.held >= 0) return;
    j.place = "held";
    j.stopped = false;
    s.held = i;
    s.touched = true;
    out.push({ cue: "lift" });
}

/** Sets the held jug down: under the tap if it is let go there and the tap is free, and otherwise back in its place. */
function setDown(s: PourState, atTap: boolean, out: Happening[]): void {
    const j = s.jugs[s.held];
    if (!j) return;
    const k = kitchen(s);
    const tapFree = !s.jugs.some((o, n) => n !== s.held && o.place === "tap");
    j.place = atTap && tapFree ? "tap" : "home";
    j.from = { ...j.pose };
    j.back = 0;
    j.pose = restAt(j.place === "tap" ? k.fill : k.home(s.held));
    j.stopped = false;
    s.held = -1;
    s.keyTilt = 0;
    out.push({ cue: "place" });
}

/** How high a tipped jug's spout is held: over the other jugs' rims, so what it pours goes in. */
const SPOUT_Y = WALL - 0.5;

/**
 * A carried jug whose handle is held over `x`, tipped by `tilt` about its spout, as a pour turns on
 * the lip: the spout stays where it was over the place, and the jug is lifted as it tips so its spout
 * stays over the rims.
 */
function tipped(x: number, tilt: number): Pose {
    const off = worldOf({ x: 0, y: 0, angle: -tilt }, SPOUT);
    const spout = x + SPOUT.x - HANDLE.x;
    return { x: spout - off.x, y: Math.min(CARRY, SPOUT_Y - off.y), angle: -tilt };
}

/**
 * The pose of the jug a hand carries, by where its handle would be: level until it has been lifted
 * clear of the rims, and after that tipped by how far the hand is lowered below the carry line.
 */
function heldPose(s: PourState, hand: Pt): Pose {
    const h = { x: hand.x + s.grip.x, y: hand.y + s.grip.y };
    if (h.y <= CARRY) s.clear = true;
    if (h.y <= CARRY || !s.clear) return { x: h.x, y: h.y, angle: 0 };
    return tipped(h.x, Math.min(MOST_TILT, (h.y - CARRY) * POUR.tilt.value));
}

function hands(s: PourState, pad: Pad, out: Happening[]): void {
    const t = pad.touch,
        k = kitchen(s);
    if (t) {
        const began = !s.hand && !s.tapHeld;
        if (began) {
            s.cursor = -1;
            const onTap =
                t.x >= k.tap.x - 0.5 &&
                t.x <= k.tap.x + TAP.w + 0.5 &&
                t.y >= k.tap.y - 0.5 &&
                t.y <= k.tap.y + TAP.h + 0.5;
            // the tap hangs over a jug standing under it, so a press on the tap is for the tap
            const i = onTap
                ? -1
                : s.jugs.findIndex((j) => {
                      if (j.place === "held") return false;
                      const m = worldOf(j.pose, MIDDLE);
                      return Math.abs(t.x - m.x) <= 5.8 && Math.abs(t.y - m.y) <= 6.2;
                  });
            if (onTap) {
                s.tapHeld = true;
                s.touched = true;
            } else if (i >= 0) {
                pickUp(s, i, out);
                const pose = s.jugs[i]?.pose ?? { x: t.x, y: t.y };
                s.grip = { x: pose.x - t.x, y: pose.y - t.y };
                s.clear = false;
                s.hand = { ...t };
            }
        } else if (s.hand) s.hand = { ...t };
        const j = s.jugs[s.held];
        if (j && s.hand) j.pose = heldPose(s, s.hand);
    }
    if (pad.lifted) {
        if (s.held >= 0 && s.hand)
            setDown(s, Math.abs(pad.lifted.x + s.grip.x - fillAt(s)) < 4, out);
        s.hand = null;
        s.tapHeld = false;
    }
}

function keys(s: PourState, pad: Pad, out: Happening[]): void {
    if (pad.touch || s.hand) return;
    const turns = pad.pressed.filter((d) => d === "left" || d === "right");
    const up = pad.pressed.includes("up");
    const j = s.jugs[s.held];
    if (j) {
        const places = keyPlaces(s, s.held);
        for (const d of turns)
            s.keyAt = (s.keyAt + (d === "right" ? 1 : places.length - 1)) % places.length;
        const tipping = pad.holding.includes("down") || pad.pressed.includes("down");
        s.keyTilt = tipping
            ? Math.min(MOST_TILT, s.keyTilt + POUR.keys.value * DT)
            : Math.max(0, s.keyTilt - 2 * POUR.keys.value * DT);
        const place = places[s.keyAt];
        j.pose = tipped(place?.x ?? j.pose.x, s.keyTilt);
        if (up && s.keyTilt === 0) setDown(s, place?.id === "tap", out);
        return;
    }
    if (!turns.length && !up) return;
    s.touched = true;
    if (s.cursor < 0) {
        s.cursor = 0;
        if (!up) return;
    }
    for (const d of turns)
        s.cursor = (s.cursor + (d === "right" ? 1 : s.jugs.length - 1)) % s.jugs.length;
    if (up) {
        const i = s.cursor;
        pickUp(s, i, out);
        const places = keyPlaces(s, i);
        const here = s.jugs[i]?.pose.x ?? 0;
        s.keyAt = places.reduce(
            (best, p, n) =>
                Math.abs(p.x - here) < Math.abs((places[best]?.x ?? 0) - here) ? n : best,
            0,
        );
        s.keyTilt = 0;
    }
}

/** What falls under `x`, from `y` down: a jug's mouth, the flowers, or the counter and the sink. */
function under(s: PourState, x: number, y: number, not: number): { jug: number; to: Pt } {
    const k = kitchen(s);
    let best = -1,
        top = Infinity;
    s.jugs.forEach((j, n) => {
        if (n === not) return;
        const m = worldOf(j.pose, MOUTH);
        if (Math.abs(x - m.x) <= RIM && m.y > y && m.y < top) {
            best = n;
            top = m.y;
        }
    });
    if (best >= 0) return { jug: best, to: { x, y: top } };
    const flowers = x >= k.plant.x && x <= k.plant.x + FLOWERS.w;
    return { jug: -1, to: { x, y: flowers ? k.plant.y + 2 : WALL + FOOT } };
}

/** What is still falling into jug `i`. */
function falling(s: PourState, i: number): number {
    let n = 0;
    for (let k = 0; k < s.carry.length; k++) if (s.drops.tags[k] === i) n += s.carry[k] ?? 0;
    return n;
}

/** What jug `i` holds that has landed, which its scale reads and its water is drawn at. */
export const landed = (s: PourState, i: number): number =>
    Math.max(0, (s.jugs[i]?.level ?? 0) - falling(s, i));

/** The area of a jug's inside under its scale's reading of `level` of `max`, in its own squares. */
const areaAt = (level: number, max: number): number =>
    submerged(INSIDE, BOTTOM - (SCALE * Math.max(0, Math.min(level, max))) / max).area;

/**
 * Where the water in a jug held at `pose` stands, across the world, for `level` of `max` in it: the
 * surface stays level however the jug is turned, at the height that leaves as much water under it as
 * the scale says. Null for an empty jug.
 */
function surfaceOf(pose: Pose, level: number, max: number): number | null {
    if (level <= 0) return null;
    const poly = INSIDE.map((q) => worldOf(pose, q));
    const want = areaAt(level, max);
    let lo = Math.min(...poly.map((p) => p.y)),
        hi = Math.max(...poly.map((p) => p.y));
    for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2;
        if (submerged(poly, mid).area > want) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}

/**
 * Lets water go from `from` at `v`, falling into jug `into` (or nothing, at -1): `amount` of it, in as
 * many drops as the stream is thick. A thin stream lets a drop go only every few steps, and each drop
 * carries its share, so nothing is lost between them.
 */
function stream(
    s: PourState,
    which: number,
    from: Pt,
    v: Pt,
    into: number,
    amount: number,
    weight: number,
): void {
    const t = (s.thread[which] ?? 0) + 0.35 + 2.4 * weight;
    const n = Math.max(amount > 0 ? 1 : 0, Math.floor(t));
    s.thread[which] = t - Math.floor(t);
    // a stream wavers a little as it leaves, the same way every time
    const waver = 0.35 * Math.sin(s.steps * 0.45 + which * 2.1);
    for (let k = 0; k < n; k++) {
        const across = n > 1 ? (k / (n - 1) - 0.5) * 0.22 : 0;
        // past the most drops a share is not let go, and lands at once, since the jug already counts it
        if (pour(s.drops, { x: from.x + across, y: from.y }, { x: v.x + waver, y: v.y }, into))
            s.carry.push(amount / n);
    }
}

/** Moves the falling drops on, and lets each one that reaches a jug's water, the counter or the flowers go. */
function fall(s: PourState, out: Happening[]): void {
    if (count(s.drops) === 0) return;
    stepLiquid(s.drops, DT, STREAM);
    const k = kitchen(s);
    const surfaces = s.jugs.map((j, i) => surfaceOf(j.pose, landed(s, i), j.max));
    const carry: number[] = [];
    let splashed = false;
    drain(s.drops, (d, n) => {
        const c = s.carry[n] ?? 0;
        const j = s.jugs[d.tag];
        if (j) {
            const mouth = worldOf(j.pose, MOUTH);
            const top = surfaces[d.tag] ?? worldOf(j.pose, { x: MIDDLE.x, y: BOTTOM }).y;
            if (Math.abs(d.x - mouth.x) <= RIM + 0.6 && d.y >= top - 0.05) {
                const sl = j.slosh;
                sl.waves = [
                    { x: d.x - worldOf(j.pose, MIDDLE).x, age: 0, size: Math.min(1, d.vy / 18) },
                    ...sl.waves,
                ].slice(0, 6);
                if (!splashed && s.steps % 7 === 0) {
                    splashed = true;
                    out.push({
                        burst: { kind: "splash", x: d.x, y: top, n: 1, dir: -Math.PI / 2 },
                    });
                }
                return true;
            }
        }
        const flowers = d.x >= k.plant.x && d.x <= k.plant.x + FLOWERS.w;
        const floor = flowers ? k.plant.y + 2 : WALL + FOOT;
        if (d.y >= floor || d.y > k.size.h + 2) {
            if (!splashed && s.steps % 9 === 0) {
                splashed = true;
                out.push({ burst: { kind: "splash", x: d.x, y: floor, n: 2 } });
            }
            return true;
        }
        carry.push(c);
        return false;
    });
    s.carry = carry;
}

/** The way out of a tipped jug's spout, a little down from its lip. */
const spoutWay = (pose: Pose): Pt => {
    const c = Math.cos(pose.angle),
        sn = Math.sin(pose.angle);
    return { x: -1 * c - 0.4 * sn, y: -1 * sn + 0.4 * c };
};

function flow(s: PourState, out: Happening[]): boolean {
    let moving = false;
    const k = kitchen(s);
    s.running = s.tapHeld || s.running;
    if (s.running) {
        const spout = { x: k.tap.x + TAP_SPOUT.x, y: k.tap.y + TAP_SPOUT.y };
        const got = under(s, spout.x, spout.y, -1),
            j = s.jugs[got.jug];
        const rate = POUR.tap.value * Math.max(...s.jugs.map((o) => o.max));
        let added = 0;
        if (j) {
            const was = j.level;
            j.level = Math.min(j.max, j.level + rate * DT);
            added = j.level - was;
            if (was < j.max && j.level === j.max) {
                out.push({ cue: "level" });
                tell(s, `Jug ${LETTERS[got.jug]} is full to the brim.`);
            }
        }
        stream(s, 0, spout, { x: 0, y: 2 }, added > 0 ? got.jug : -1, added, 0.8);
        moving = true;
    }
    const i = s.held,
        g = s.jugs[i];
    if (g && g.place === "held") {
        const tilt = -g.pose.angle;
        let rate = pourRate(tilt, g.level, g.max, pouring());
        if (g.stopped && rate > 0) rate = 0;
        else if (g.stopped) g.stopped = false;
        if (rate > 0) {
            const spout = worldOf(g.pose, SPOUT);
            const got = under(s, spout.x, spout.y, i),
                t = s.jugs[got.jug];
            const want = rate * DT;
            let into = -1,
                amount = 0;
            if (t) {
                const room = t.max - t.level;
                const r = transfer(g.level, room, want);
                if (room > 0 && r.moved >= room) {
                    // it reaches the brim this step: the pour stops here, before a drop is spilt
                    g.level -= r.moved;
                    t.level = t.max;
                    g.stopped = true;
                    out.push({ cue: "level" });
                    tell(s, `Jug ${LETTERS[got.jug]} is full, so the pour stops.`);
                } else {
                    g.level -= r.moved + r.spilt;
                    t.level += r.moved;
                    s.spilt += r.spilt;
                }
                into = r.moved > 0 ? got.jug : -1;
                amount = r.moved;
            } else {
                const r = transfer(g.level, 0, want);
                g.level -= r.spilt;
            }
            if (g.level < 1e-9) g.level = 0;
            const way = spoutWay(g.pose),
                speed = 1.2 + 2.5 * Math.min(1, rate / (0.35 * g.max));
            stream(
                s,
                1,
                spout,
                { x: way.x * speed, y: way.y * speed },
                into,
                amount,
                Math.min(1, rate / (0.35 * g.max)),
            );
            moving = true;
        }
    }
    fall(s, out);
    return moving || count(s.drops) > 0;
}

/** Swings each jug's surface back to level, jolted by how the jug is carried, and runs out its rings. */
function slosh(s: PourState): void {
    for (const j of s.jugs) {
        const sl = j.slosh,
            pose = drawnPose(j),
            mid = worldOf(pose, MIDDLE);
        const vx = (mid.x - sl.x) / DT,
            ax = (vx - sl.vx) / DT;
        // a jug moved one way leaves its water behind, which stands higher at the back
        const lean = Math.max(-SLOSH.most, Math.min(SLOSH.most, ax / WATER.gravity));
        sl.v += (SLOSH.k * (lean - sl.a) - SLOSH.damping * sl.v) * DT;
        sl.v -= ((pose.angle - sl.angle) / DT) * 0.02;
        sl.a = Math.max(-SLOSH.most, Math.min(SLOSH.most, sl.a + sl.v * DT));
        if (Math.abs(sl.a) < 1e-5 && Math.abs(sl.v) < 1e-4) sl.a = sl.v = 0;
        sl.x = mid.x;
        sl.vx = vx;
        sl.angle = pose.angle;
        sl.waves = sl.waves
            .map((w) => ({ ...w, age: w.age + DT }))
            .filter((w) => w.age < RIPPLE.life);
    }
}

function step(s: PourState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (!s.won) {
        hands(s, pad, out);
        keys(s, pad, out);
    }
    s.running = !s.won && (s.tapHeld || pad.go);
    for (const j of s.jugs)
        if (j.back < 1) {
            j.back = Math.min(1, j.back + DT / 0.25);
        }
    const moving = !s.won && flow(s, out);
    slosh(s);
    const tol = toleranceOf(s.L);
    const made = s.jugs.findIndex(
        (j) => j.place !== "held" && Math.abs(j.level - s.L.v.target) <= tol,
    );
    s.calm = moving || s.held >= 0 || made < 0 ? 0 : s.calm + DT;
    if (!s.won && s.calm >= 0.5) {
        s.won = true;
        const j = s.jugs[made];
        if (j) j.level = s.L.v.target;
        const at = j ? worldOf(j.pose, MOUTH) : { x: 0, y: 0 };
        tell(s, `That is exactly ${amount(s, s.L.v.target)} in jug ${LETTERS[made]}.`);
        out.push({ cue: "win" }, { burst: { kind: "sparkle", x: at.x, y: at.y - 1, n: 14 } });
    }
    return out;
}

/** A jug as it is drawn: gliding back to its place after it is set down. */
function drawnPose(j: Jug): Pose {
    if (j.back >= 1) return j.pose;
    const e = 1 - (1 - j.back) ** 3;
    return {
        x: j.from.x + (j.pose.x - j.from.x) * e,
        y: j.from.y + (j.pose.y - j.from.y) * e,
        angle: j.from.angle + (j.pose.angle - j.from.angle) * e,
    };
}

/** Whether a point in a jug's own squares is inside it, `inset` from its walls. */
function within(q: Pt, inset: number): boolean {
    if (q.y < 2 || q.y > BOTTOM - inset) return false;
    const t = (q.y - 2) / (BOTTOM - 2);
    return q.x >= 3 + 0.4 * t + inset && q.x <= 8 - 0.4 * t - inset;
}

/** From the world into a jug's own squares, for a jug held at `pose`. */
function localOf(pose: Pose, p: Pt): Pt {
    const c = Math.cos(pose.angle),
        sn = Math.sin(pose.angle);
    const dx = p.x - pose.x,
        dy = p.y - pose.y;
    return { x: HANDLE.x + dx * c + dy * sn, y: HANDLE.y - dx * sn + dy * c };
}

/**
 * A jug's water as drops for the view to run together: dots through the inside of the jug under its
 * surface, and a closer row along the surface, which tilts and rings as the water sloshes. At rest the
 * surface stands level and still.
 */
function waterIn(j: Jug, pose: Pose, level: number, rest: boolean): number[] {
    const top = surfaceOf(pose, level, j.max);
    if (top === null) return [];
    const mid = worldOf(pose, MIDDLE);
    const sl = j.slosh;
    const at = (x: number): number => {
        if (rest) return top;
        let y = top + Math.tan(sl.a) * (x - mid.x);
        for (const w of sl.waves) y += rippleAt(w, x - mid.x) * 0.5;
        return y;
    };
    const out: number[] = [];
    for (let y = 2 + GRAIN / 2; y < BOTTOM; y += GRAIN)
        for (let x = 3 + GRAIN / 2; x < 8; x += GRAIN) {
            const q = { x, y };
            if (!within(q, 0.12)) continue;
            const p = worldOf(pose, q);
            if (p.y > at(p.x) + 0.1) out.push(p.x, p.y);
        }
    const poly = INSIDE.map((q) => worldOf(pose, q));
    const x0 = Math.min(...poly.map((p) => p.x)),
        x1 = Math.max(...poly.map((p) => p.x));
    for (let x = x0; x <= x1; x += SKIN) {
        const p = { x, y: at(x) + 0.1 };
        if (within(localOf(pose, p), 0.12)) out.push(p.x, p.y);
    }
    return out;
}

function frame(s: PourState, rest = false): Frame {
    const k = kitchen(s),
        v = s.L.v,
        sprites: Sprite[] = [],
        marks: Mark[] = [],
        liquid: Pool[] = [];
    // the field grows past the kitchen to fill a wide room, so the counter runs on beyond both ends
    for (const [side, x] of [
        ["left", -REACH / 2],
        ["right", k.length + REACH / 2],
    ] as const)
        sprites.push({
            key: `worktop:${side}`,
            art: "worktop",
            params: { w: REACH, sink: -1 },
            x,
            y: k.worktop.y + WORKTOP.h / 2,
            z: 1,
            still: true,
        });
    sprites.push(
        {
            key: "worktop",
            art: "worktop",
            params: { w: k.length, sink: k.sink },
            x: k.worktop.x + k.length / 2,
            y: k.worktop.y + WORKTOP.h / 2,
            z: 1,
            still: true,
        },
        {
            key: "tap",
            art: "tap",
            // the stream is the falling drops, not the drawing's own
            params: { running: false },
            x: k.tap.x + TAP.w / 2,
            y: k.tap.y + TAP.h / 2,
            z: 5,
        },
        {
            key: "plant",
            art: "flowers",
            params: { count: 1, petals: 5 },
            x: k.plant.x + FLOWERS.w / 2,
            y: k.plant.y + FLOWERS.h / 2,
            z: 6,
            still: true,
        },
        {
            key: "order",
            art: "pinned",
            params: {
                hold: "tape",
                lines: ["We need exactly", `${v.target} ${v.unit}`],
                width: 11,
            },
            x: k.order.x + 5.5,
            y: k.order.y + 4.5,
            z: 4,
        },
    );
    s.jugs.forEach((j, i) => {
        const pose = drawnPose(j),
            mid = worldOf(pose, MIDDLE);
        const step = s.L.marked ? (v.jugs[i]?.step ?? j.max) : j.max;
        const z = j.place === "held" ? 30 : 20 + i;
        sprites.push({
            key: `jug:${i}`,
            art: "jug",
            params: { max: j.max, step, level: 0, unit: v.unit },
            x: mid.x,
            y: mid.y,
            angle: pose.angle,
            z,
        });
        const drops = waterIn(j, pose, landed(s, i), rest);
        if (drops.length) liquid.push({ drops, r: WATER.r, z: z - 0.5 });
        const foot = worldOf(pose, { x: MIDDLE.x, y: FOOT + 1 });
        marks.push({ kind: "word", x: foot.x, y: foot.y, text: LETTERS[i] ?? "", size: 0.9 });
    });
    if (count(s.drops)) liquid.push({ drops: places(s.drops), r: WATER.r, z: 35 });
    if (s.cursor >= 0 && s.held < 0) {
        const j = s.jugs[s.cursor];
        if (j) {
            const m = worldOf(j.pose, MIDDLE);
            marks.push({ kind: "ring", x: m.x, y: m.y, r: 6.5, on: true });
        }
    }
    return {
        sprites,
        marks,
        camera: { x: k.size.w / 2, y: k.size.h / 2 },
        view: k.size,
        world: k.size,
        liquid,
    };
}

function say(s: PourState): string {
    const jugs = s.jugs
        .map(
            (j, i) =>
                `Jug ${LETTERS[i]}, which holds ${j.max} ${unit(s)}, ${landed(s, i) > 0 ? `has about ${amount(s, landed(s, i))} in it` : "is empty"}${j.place === "held" ? " and is in your hand" : j.place === "tap" ? " and stands under the tap" : ""}.`,
        )
        .join(" ");
    return `${jugs} You need ${s.L.v.target} ${unit(s)} in one jug.${s.running ? " The tap is running." : ""}`;
}

export const pourGame: ActionGame<PourState> = {
    portrait: { hint: true },
    id: "pour",
    title: "Measure it out",
    group: "action",
    levels: POUR_LEVELS,
    rate: RATE,
    touch: true,
    plays: { activity: "pour.measure-it-out", levels: [0, 1, 2, 3, 4, 5] },
    cover: { art: "jug", params: { max: 1000, step: 200, level: 350, unit: "ml" } },
    hint: "Pick a jug up by its handle and lower your hand to tip it. Set a jug down under the tap and hold the tap to fill it. With the keys: left and right choose, up picks up and puts down, hold down to tip, and hold space for the tap",
    controls: {
        arrows: { left: "Before", right: "After", up: "Pick up / put down", down: "Tip" },
        go: "Tap",
    },
    start: (level) => startPour(POUR_LEVELS[level] ?? POUR_LEVELS[0], level),
    step,
    frame,
    say,
    note: (s) =>
        !s.touched && !s.won ? s.L.prompt : s.steps - s.saidAt < RATE * 4 || s.won ? s.said : "",
    won: (s) => s.won,
    objectives: (s) => ({ completed: s.won ? 1 : 0, total: 1 }),
    cancelInput: (s) => {
        if (s.held >= 0 && s.hand) setDown(s, false, []);
        s.hand = null;
        s.tapHeld = false;
    },
    tuning: POUR,
    still: {
        press: () => Math.round(RATE * 0.25),
        settling: (s) => s.jugs.some((j) => j.back < 1) || count(s.drops) > 0,
    },
};
