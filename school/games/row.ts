// Down the river: paddle a canoe down a winding river, through the gates that keep a count, and pull
// in to the bank beside a number.
//
// The river winds between its banks and runs faster where it narrows, over the rapids and between the
// rocks, and slack behind each rock. The canoe glides after every stroke and is carried by the water it
// sits in. A stroke on one side pushes it on and turns its bow away from that side, harder the longer
// the drag or the key is held, and a stroke made too soon after the last catches moving water and
// pushes less, so paddling well has a rhythm. Rocks and drifting logs knock the canoe about and never
// end the run. Across the river stand pairs of gates with numbers on them, and the canoe has to pass
// through the one that comes next in a count: ones, twos, fives, tens, threes, tenths. A gate out of
// the count is not wrong for long: the river carries the canoe back above it to try again. The count
// ends at a pool, where posts along the bank mark a number line, and the canoe has to come to rest
// against the bank with its bow beside the number that comes next, which on the later levels is read
// off a line with only its ends written. See .docs/games.md.
import { done, feed, progress, track, type GameEvent, type Track } from "../../engine/motion/goals";
import { follow, keepInside, lead, type Cam } from "../../engine/motion/camera";
import {
    along,
    bounce,
    canoeStep,
    rhythm,
    starboard,
    stroke,
    type Canoe,
    type Hull,
} from "../../engine/motion/canoe";
import type { Pt } from "../../engine/motion/geometry";
import { moverAt, type Path } from "../../engine/motion/mover";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import type { ActionGame, ActionLevel, Levels } from "./game";

export interface RiverLevel extends ActionLevel {
    /** Squares of river from the start to the pool. */
    length: number;
    /** Half the river's width, in squares, where nothing narrows it. */
    half: number;
    /** The bends: how far the river swings either way, how long a swing is, and where it starts. */
    bends: [number, number, number][];
    /** Where the river narrows into rapids: where, to what half width, over how long. */
    narrows: { at: number; half: number; len: number }[];
    /** Squares a second the river runs where nothing narrows it. */
    current: number;
    /** Rocks: where along the river, how far from the middle as a share of the half width, and their size in squares. */
    rocks: { at: number; off: number; size: number }[];
    /** Logs drifting from bank to bank across the river: where, how fast, and how far along they start, in seconds. */
    logs: { at: number; speed: number; phase: number }[];
    /** The count the gates keep, one pair of gates for each number. */
    count: number[];
    /** The number on the other gate of each pair. */
    decoys: number[];
    /** Which gate of each pair has the count's number: -1 the left of the river going down it, 1 the right. */
    sides: (1 | -1)[];
    /** The posts along the pool's bank: the first one's number, the step, the squares between, how many, and which carry their number. */
    line: {
        from: number;
        step: number;
        gap: number;
        posts: number;
        labels: "all" | "every" | "ends";
        every?: number;
    };
    /** The number the canoe's bow has to come to rest beside: the next in the count. */
    dock: number;
    prompt: string;
    done: string;
}

export const RIVER_LEVELS: Levels<RiverLevel> = [
    {
        title: "Count to five",
        grades: [1, 1],
        goal: "Paddle through the gates in order, 1, 2, 3, 4, then stop with the front of the canoe beside 5.",
        prompt: "Drag back beside the canoe to paddle. Go through gate 1 first.",
        done: "The canoe is resting beside 5.",
        length: 90,
        half: 5.5,
        bends: [[3, 60, 0]],
        narrows: [],
        current: 1,
        rocks: [],
        logs: [],
        count: [1, 2, 3, 4],
        decoys: [3, 4, 1, 6],
        sides: [1, -1, 1, -1],
        line: { from: 0, step: 1, gap: 2.4, posts: 10, labels: "all" },
        dock: 5,
    },
    {
        title: "Count in twos",
        grades: [1, 2],
        goal: "Go through the gates counting in twos, then stop with the front of the canoe beside 10.",
        prompt: "Count in twos: 2, 4, 6. Steer round the rocks.",
        done: "The canoe is resting beside 10.",
        length: 105,
        half: 5.5,
        bends: [
            [4, 70, 0.6],
            [1.5, 23, 1.2],
        ],
        narrows: [],
        current: 1.2,
        rocks: [
            { at: 30, off: 0.4, size: 2 },
            { at: 55, off: -0.35, size: 2 },
            { at: 80, off: 0.3, size: 2 },
        ],
        logs: [],
        count: [2, 4, 6, 8],
        decoys: [3, 5, 9, 12],
        sides: [-1, -1, 1, -1],
        line: { from: 4, step: 1, gap: 1.6, posts: 13, labels: "every", every: 2 },
        dock: 10,
    },
    {
        title: "Count in fives",
        grades: [2, 2],
        goal: "Go through the gates counting in fives, then stop with the front of the canoe beside 25.",
        prompt: "Count in fives. The river runs fast where it narrows.",
        done: "The canoe is resting beside 25.",
        length: 115,
        half: 5.5,
        bends: [
            [4.5, 80, 1.6],
            [1.5, 27, 0.3],
        ],
        narrows: [{ at: 62, half: 3.4, len: 16 }],
        current: 1.3,
        rocks: [
            { at: 26, off: -0.4, size: 2 },
            { at: 48, off: 0.4, size: 2 },
            { at: 88, off: -0.3, size: 2 },
            { at: 109, off: 0.4, size: 1 },
        ],
        logs: [],
        count: [5, 10, 15, 20],
        decoys: [6, 12, 25, 19],
        sides: [1, -1, -1, 1],
        line: { from: 15, step: 1, gap: 1.2, posts: 16, labels: "every", every: 5 },
        dock: 25,
    },
    {
        title: "Tens, and only the ends written",
        grades: [2, 3],
        goal: "Go through the gates counting in tens, then stop beside 50 on a line with only 0 and 100 written.",
        prompt: "Count in tens. At the pool only 0 and 100 are written on the bank.",
        done: "The canoe is resting beside 50.",
        length: 115,
        half: 5.5,
        bends: [
            [4, 75, 2.4],
            [2, 31, 0.9],
        ],
        narrows: [{ at: 70, half: 3.5, len: 14 }],
        current: 1.4,
        rocks: [
            { at: 24, off: 0.45, size: 2 },
            { at: 44, off: -0.45, size: 2 },
            { at: 92, off: 0.35, size: 2 },
        ],
        logs: [{ at: 55, speed: 1.6, phase: 0 }],
        count: [10, 20, 30, 40],
        decoys: [15, 25, 35, 60],
        sides: [-1, 1, 1, -1],
        line: { from: 0, step: 5, gap: 1.1, posts: 21, labels: "ends" },
        dock: 50,
    },
    {
        title: "Count in threes",
        grades: [3, 3],
        goal: "Go through the gates counting in threes, then stop with the front of the canoe beside 18.",
        prompt: "Count in threes. Logs drift across the river.",
        done: "The canoe is resting beside 18.",
        length: 130,
        half: 5.5,
        bends: [
            [4.5, 85, 0.2],
            [2, 29, 2.2],
        ],
        narrows: [
            { at: 40, half: 3.6, len: 12 },
            { at: 96, half: 3.4, len: 12 },
        ],
        current: 1.4,
        rocks: [
            { at: 22, off: -0.4, size: 2 },
            { at: 58, off: 0.4, size: 2 },
            { at: 76, off: -0.35, size: 2 },
            { at: 112, off: 0.35, size: 2 },
        ],
        logs: [
            { at: 54, speed: 1.4, phase: 0 },
            { at: 84, speed: 1.8, phase: 1.5 },
        ],
        count: [3, 6, 9, 12, 15],
        decoys: [4, 8, 10, 14, 16],
        sides: [1, 1, -1, 1, -1],
        line: { from: 10, step: 1, gap: 1.2, posts: 16, labels: "every", every: 5 },
        dock: 18,
    },
    {
        title: "Counting in tenths",
        grades: [4, 4],
        goal: "Go through the gates counting on by 0.3, then stop beside 1.5 on a line marked in tenths.",
        prompt: "Count on by 0.3: 0.3, 0.6, 0.9. The line at the pool is in tenths.",
        done: "The canoe is resting beside 1.5.",
        length: 130,
        half: 5.5,
        bends: [
            [5, 90, 1.1],
            [2, 33, 0.4],
        ],
        narrows: [
            { at: 36, half: 3.5, len: 14 },
            { at: 92, half: 3.3, len: 14 },
        ],
        current: 1.5,
        rocks: [
            { at: 20, off: 0.4, size: 2 },
            { at: 54, off: -0.4, size: 2 },
            { at: 72, off: 0.4, size: 2 },
            { at: 110, off: -0.35, size: 2 },
        ],
        logs: [
            { at: 64, speed: 1.6, phase: 0.8 },
            { at: 100, speed: 2, phase: 0 },
        ],
        count: [0.3, 0.6, 0.9, 1.2],
        decoys: [0.4, 0.8, 1, 1.3],
        sides: [-1, 1, -1, 1],
        line: { from: 0, step: 0.1, gap: 0.9, posts: 21, labels: "every", every: 1 },
        dock: 1.5,
    },
];

const RATE = 60,
    DT = 1 / RATE;
/** The world's height, and where the river's middle runs when it does not bend. */
const H = 30;
const MID = 15;
/** Squares of wide calm pool after the river, where the line of posts is. */
const POOL = 34;
/** How much the river widens at the pool, and how much it slows there. */
const POOL_HALF = 8;
const VIEW = { w: 36, h: 22 } as const;
/** The canoe as it is drawn here: its length in squares, and the points along it that meet things, with their size. */
const HULL = { length: 3.6, reach: 1.25, r: 0.48 } as const;
/** How near the bank the canoe's middle has to be to count as pulled in beside it: about a paddle's reach. */
const ALONGSIDE = HULL.r + 1.7;
/** The squares from the pool's start to its first post. */
const LINE_IN = 5;

export const ROW = {
    push: knob(
        2.3,
        1,
        4,
        0.1,
        "squares a second",
        "one full stroke gets the canoe moving at a walk; a few carry it past the current",
    ),
    turn: knob(
        1.35,
        0.5,
        2.5,
        0.05,
        "radians a second",
        "one full stroke on a side turns the bow about a quarter of the way round",
    ),
    glide: knob(
        0.55,
        0.2,
        1.2,
        0.05,
        "each second",
        "a canoe carries on well after a stroke but still comes to rest in a few seconds",
    ),
    beat: knob(
        0.6,
        0.3,
        1.2,
        0.05,
        "seconds",
        "strokes a little over half a second apart have all their push, which gives paddling a rhythm",
    ),
    charge: knob(
        0.45,
        0.2,
        1,
        0.05,
        "seconds",
        "a key held this long, or a drag four squares long, makes a full stroke",
    ),
    back: knob(
        2.2,
        1,
        4,
        0.1,
        "each second",
        "holding the paddle back stops the canoe within about a length",
    ),
};

const hull = (): Hull => ({
    glide: ROW.glide.value,
    grip: 4.5,
    spinDrag: 2.6,
    push: ROW.push.value,
    turn: ROW.turn.value,
    back: ROW.back.value,
    beat: ROW.beat.value,
});

export interface RiverState {
    level: number;
    L: RiverLevel;
    world: { w: number; h: number };
    boat: Canoe;
    t: number;
    steps: number;
    /** Which gate of the count comes next, and the checkpoints passed. */
    next: number;
    /** The count's gates in order and then the number on the line, fed by the events a step emits. */
    goal: Track;
    /** Time the last stroke was made, and on which side, for the rhythm and the paddle. */
    lastStroke: number;
    side: 1 | -1;
    /** A key or the big button held to wind up a stroke, and for how long. */
    charge: { key: "up" | "left" | "right" | "go"; t: number } | null;
    goWas: boolean;
    /** A finger down in the water: where it went down, where it is now, and for how long. */
    drag: { from: Pt; to: Pt; t: number } | null;
    backing: boolean;
    /** After a gate out of the count: seconds until the river has carried the canoe back above it. */
    carried: number;
    calm: number;
    /** Whether the last rest by the bank has been told, so it is said once until the canoe moves again. */
    toldRest: boolean;
    wake: (Pt & { t: number })[];
    /** Rings spreading from where a paddle went in, `t` seconds ago. */
    rings: (Pt & { t: number; size: number })[];
    said: string;
    saidAt: number;
    touched: boolean;
    bumps: number;
    strokes: number;
    won: boolean;
    cam: Cam;
}

/** The river's middle at `x`. The bends fade out before the pool, which lies level. */
export function middle(L: RiverLevel, x: number): number {
    const fade = Math.max(0, Math.min(1, (L.length - 6 - x) / 12));
    return (
        MID +
        fade *
            L.bends.reduce(
                (y, [amp, wave, phase]) => y + amp * Math.sin((2 * Math.PI * x) / wave + phase),
                0,
            )
    );
}

/** Half the river's width at `x`: narrower through rapids and wide in the pool. */
export function halfAt(L: RiverLevel, x: number): number {
    let half = L.half;
    for (const n of L.narrows) {
        const d = Math.abs(x - n.at);
        if (d < n.len / 2 + 4) {
            const k = d <= n.len / 2 ? 1 : 0.5 + 0.5 * Math.cos(((d - n.len / 2) / 4) * Math.PI);
            half = Math.min(half, L.half + (n.half - L.half) * k);
        }
    }
    const pool = Math.max(0, Math.min(1, (x - L.length + 4) / 8));
    return half + (POOL_HALF - half) * pool;
}

/** Where a rock stands. */
const rockAt = (L: RiverLevel, r: RiverLevel["rocks"][number]): Pt => ({
    x: r.at,
    y: middle(L, r.at) + r.off * halfAt(L, r.at),
});
const rockRadius = (size: number) => size * 0.42;

/** A log's way across the river, bank to bank, lying along the stream. */
function logPath(L: RiverLevel, g: RiverLevel["logs"][number]): Path {
    const y = middle(L, g.at),
        h = halfAt(L, g.at) - 1.4;
    return {
        points: [
            { x: g.at, y: y - h },
            { x: g.at, y: y + h },
        ],
        speed: g.speed,
        mode: "bounce",
        phase: g.phase,
    };
}
const LOG = 3.4;

/** The water's velocity at a point: along the river, faster where it narrows and in its middle, slack behind a rock, and nearly still in the pool. */
export function currentAt(L: RiverLevel, p: Pt): Pt {
    const x = Math.max(0, p.x),
        half = halfAt(L, x);
    const slope = (middle(L, x + 0.5) - middle(L, x - 0.5)) / 1;
    const n = Math.hypot(1, slope);
    const pool = Math.max(0, Math.min(1, (x - L.length + 2) / 6));
    let speed = L.current * (L.half / half) * (1 - 0.94 * pool);
    const d = (p.y - middle(L, x)) / half;
    speed *= Math.max(0.25, 1 - 0.55 * d * d);
    for (const r of L.rocks) {
        const at = rockAt(L, r),
            rr = rockRadius(r.size);
        if (p.x > at.x && p.x < at.x + rr * 4 && Math.abs(p.y - at.y) < rr * 1.3) speed *= -0.25;
    }
    return { x: speed / n, y: (speed * slope) / n };
}

export const poolStart = (L: RiverLevel): number => L.length;
/** Where a number on the line of posts is along the pool, in squares. */
export const lineX = (L: RiverLevel, value: number): number =>
    poolStart(L) + LINE_IN + ((value - L.line.from) / L.line.step) * L.line.gap;
/** The number on the line at a place along the pool. */
export const lineValue = (L: RiverLevel, x: number): number =>
    L.line.from + ((x - poolStart(L) - LINE_IN) / L.line.gap) * L.line.step;
/** Where the near bank of the pool is, the one the posts stand on. */
export const bankAt = (L: RiverLevel, x: number): number => middle(L, x) - halfAt(L, x);
/** Where the checkpoint of each gate pair stands along the river. */
export const gateX = (L: RiverLevel, k: number): number =>
    16 + (k * (L.length - 30)) / Math.max(1, L.count.length - 1);
/** How close the bow has to rest to the number, in squares. */
export const dockTolerance = (L: RiverLevel): number => Math.min(1, L.line.gap * 0.45);

/** The front of the canoe. */
export const bowOf = (s: RiverState): Pt => {
    const a = along(s.boat);
    return { x: s.boat.x + a.x * (HULL.length / 2), y: s.boat.y + a.y * (HULL.length / 2) };
};

const spoken = (n: number): string => String(Math.round(n * 100) / 100);

function tell(s: RiverState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

export function startRiver(L: RiverLevel, level: number): RiverState {
    const world = { w: Math.round(L.length + POOL + 4), h: H };
    const s: RiverState = {
        level,
        L,
        world,
        boat: { x: 5, y: middle(L, 5), angle: 0, vx: 0, vy: 0, spin: 0 },
        t: 0,
        steps: 0,
        next: 0,
        goal: track({
            inOrder: [...L.count.map((value) => ({ on: "gate", value })), { on: "dock" }],
        }),
        lastStroke: -10,
        side: 1,
        charge: null,
        goWas: false,
        drag: null,
        backing: false,
        carried: 0,
        calm: 0,
        toldRest: false,
        wake: [],
        rings: [],
        said: "",
        saidAt: -999,
        touched: false,
        bumps: 0,
        strokes: 0,
        won: false,
        cam: { x: 0, y: 0, zoom: 1 },
    };
    s.cam = { ...keepInside(wanted(s), VIEW, world), zoom: 1 };
    return s;
}

export const start = (level: number): RiverState =>
    startRiver(RIVER_LEVELS[level] ?? RIVER_LEVELS[0], level);

const wanted = (s: RiverState): Cam => {
    const ahead = lead(s.boat, { x: s.boat.vx, y: s.boat.vy }, 1.2, 6);
    return { x: ahead.x + 4, y: ahead.y, zoom: 1 };
};

/** Makes a stroke of `power` on a side, as a drag or a key did, and says nothing: the splash is the answer. */
function paddle(s: RiverState, side: 1 | -1, power: number, back: boolean, out: Happening[]): void {
    const p = Math.max(0.15, Math.min(1, power)) * rhythm(s.t - s.lastStroke, ROW.beat.value);
    stroke(s.boat, side, p, hull(), back);
    s.lastStroke = s.t;
    s.side = side;
    s.strokes++;
    s.touched = true;
    s.toldRest = false;
    const blade = {
        x: s.boat.x + starboard(s.boat).x * side * 1.1,
        y: s.boat.y + starboard(s.boat).y * side * 1.1,
    };
    out.push(
        { cue: "splash" },
        { burst: { kind: "splash", x: blade.x, y: blade.y, n: 2 + Math.round(p * 3) } },
    );
    s.rings.push({ ...blade, t: 0, size: p });
}

/** The stroke a drag in the water stands for: drawn back past the canoe it paddles on, drawn forward it backs water. */
export function strokeOfDrag(
    s: RiverState,
    from: Pt,
    to: Pt,
): { side: 1 | -1; power: number; back: boolean } {
    const a = along(s.boat),
        r = starboard(s.boat);
    const across = (from.x - s.boat.x) * r.x + (from.y - s.boat.y) * r.y;
    const side: 1 | -1 = across >= 0 ? 1 : -1;
    const pull = (to.x - from.x) * a.x + (to.y - from.y) * a.y;
    const full = 4;
    if (pull < -0.35) return { side, power: -pull / full, back: false };
    if (pull > 0.35) return { side, power: pull / full, back: true };
    return { side, power: 0.35, back: false };
}

function hands(s: RiverState, pad: Pad, out: Happening[]): void {
    const t = pad.touch;
    if (t) {
        if (!s.drag) s.drag = { from: { ...t }, to: { ...t }, t: 0 };
        else {
            s.drag.to = { ...t };
            s.drag.t += DT;
        }
        // a finger held still in the water holds the paddle back against it
        const d = s.drag;
        s.backing = d.t > 0.35 && Math.hypot(d.to.x - d.from.x, d.to.y - d.from.y) < 0.4;
    }
    if (pad.lifted && s.drag) {
        const d = s.drag;
        s.drag = null;
        const held =
            d.t > 0.35 && Math.hypot(pad.lifted.x - d.from.x, pad.lifted.y - d.from.y) < 0.4;
        s.backing = false;
        if (!held) {
            const k = strokeOfDrag(s, d.from, pad.lifted);
            paddle(s, k.side, k.power, k.back, out);
        }
    }
}

function keys(s: RiverState, pad: Pad, out: Happening[]): void {
    if (pad.touch || s.drag) return;
    const down = (k: "up" | "left" | "right" | "go") =>
        k === "go" ? pad.go : pad.holding.includes(k);
    const began = (k: "up" | "left" | "right" | "go") =>
        k === "go" ? pad.go && !s.goWas : pad.pressed.includes(k);
    if (!s.charge) {
        for (const k of ["up", "left", "right", "go"] as const)
            if (began(k)) {
                s.charge = { key: k, t: 0 };
                break;
            }
    } else if (down(s.charge.key)) s.charge.t += DT;
    const c = s.charge;
    if (c && !down(c.key)) {
        s.charge = null;
        const power = 0.35 + 0.65 * Math.min(1, c.t / ROW.charge.value);
        // left turns the bow left, which is a stroke on the right; up and the big button paddle straight, side about
        const side: 1 | -1 = c.key === "left" ? 1 : c.key === "right" ? -1 : s.side === 1 ? -1 : 1;
        paddle(s, side, power, false, out);
    }
    if (pad.tapped && !pad.go && !c) paddle(s, s.side === 1 ? -1 : 1, 0.6, false, out);
    s.goWas = pad.go;
    s.backing = pad.brake || pad.holding.includes("down");
}

/** Keeps the canoe inside the river and off the rocks and logs, bumping off whatever it meets. */
function collide(s: RiverState, out: Happening[]): void {
    const L = s.L,
        c = s.boat,
        a = along(c);
    let hardest = 0;
    for (const k of [-1, 0, 1]) {
        const p = { x: c.x + a.x * HULL.reach * k, y: c.y + a.y * HULL.reach * k };
        const d = p.y - middle(L, p.x),
            limit = halfAt(L, p.x) - HULL.r;
        if (Math.abs(d) > limit)
            hardest = Math.max(
                hardest,
                bounce(c, { x: 0, y: -Math.sign(d) }, Math.abs(d) - limit, 0.25, k),
            );
        if (p.x < 1) hardest = Math.max(hardest, bounce(c, { x: 1, y: 0 }, 1 - p.x, 0.3, k));
        if (p.x > s.world.w - 2)
            hardest = Math.max(hardest, bounce(c, { x: -1, y: 0 }, p.x - s.world.w + 2, 0.3, k));
        for (const r of L.rocks) {
            const at = rockAt(L, r),
                rr = rockRadius(r.size) + HULL.r;
            const dx = p.x - at.x,
                dy = p.y - at.y,
                dist = Math.hypot(dx, dy);
            if (dist < rr && dist > 1e-6)
                hardest = Math.max(
                    hardest,
                    bounce(c, { x: dx / dist, y: dy / dist }, rr - dist, 0.45, k),
                );
        }
        for (const g of L.logs) {
            const m = moverAt(logPath(L, g), s.t).at;
            const qx = Math.max(m.x - LOG / 2, Math.min(m.x + LOG / 2, p.x));
            const dx = p.x - qx,
                dy = p.y - m.y,
                dist = Math.hypot(dx, dy),
                rr = 0.45 + HULL.r;
            if (dist < rr && dist > 1e-6)
                hardest = Math.max(
                    hardest,
                    bounce(c, { x: dx / dist, y: dy / dist }, rr - dist, 0.5, k),
                );
        }
    }
    if (hardest > 0.5) {
        s.bumps++;
        out.push({ cue: "bump" }, { burst: { kind: "splash", x: c.x, y: c.y, n: 4 } });
        if (hardest > 2) out.push({ shake: 0.2 });
    }
}

function emit(s: RiverState, out: Happening[], event: GameEvent): void {
    feed(s.goal, event);
    out.push({ event });
}

function gates(s: RiverState, before: number, out: Happening[]): void {
    const L = s.L;
    const k = s.next;
    if (k >= L.count.length) return;
    const x = gateX(L, k);
    if (!(before < x && s.boat.x >= x)) return;
    const side: 1 | -1 = s.boat.y >= middle(L, x) ? 1 : -1;
    const right = L.sides[k] ?? 1;
    if (side === right) {
        emit(s, out, { kind: "gate", value: L.count[k] ?? 0 });
        // a gate taken is where Back to the checkpoint returns the canoe to
        emit(s, out, { kind: "checkpoint" });
        s.next++;
        const so = L.count.slice(0, s.next).map(spoken).join(", ");
        tell(
            s,
            s.next < L.count.length
                ? `${so}. Which comes next?`
                : `${so}. Now find ${spoken(L.dock)} at the pool.`,
        );
        out.push(
            { cue: "ring" },
            { burst: { kind: "sparkle", x: s.boat.x, y: s.boat.y - 1, n: 8 } },
        );
        return;
    }
    const passed =
        side === -1
            ? right === -1
                ? L.count[k]
                : L.decoys[k]
            : right === 1
              ? L.count[k]
              : L.decoys[k];
    tell(
        s,
        `That gate was ${spoken(passed ?? 0)}. ${k ? `After ${spoken(L.count[k - 1] ?? 0)} ` : "The count starts with "}${k ? "comes " : ""}${spoken(L.count[k] ?? 0)}. The river takes you back to try again.`,
    );
    s.carried = 1.2;
    out.push({ cue: "nope" });
}

function dock(s: RiverState, out: Happening[]): void {
    const L = s.L,
        c = s.boat;
    if (s.next < L.count.length || c.x < poolStart(L)) {
        s.calm = 0;
        return;
    }
    const alongside = c.y - bankAt(L, c.x) < ALONGSIDE;
    const speed = Math.hypot(c.vx, c.vy);
    if (!alongside || speed > 0.45) {
        s.calm = 0;
        if (speed > 0.6) s.toldRest = false;
        return;
    }
    s.calm += DT;
    if (s.calm < 0.6 || s.toldRest) return;
    const bow = bowOf(s),
        target = lineX(L, L.dock),
        off = bow.x - target;
    if (Math.abs(off) <= dockTolerance(L)) {
        emit(s, out, { kind: "dock", value: L.dock });
        s.won = done(s.goal);
        c.vx = 0;
        c.vy = 0;
        c.spin = 0;
        tell(s, L.done);
        out.push({ cue: "win" }, { burst: { kind: "sparkle", x: bow.x, y: bow.y - 1, n: 14 } });
        return;
    }
    s.toldRest = true;
    const at = Math.round(lineValue(L, bow.x) / L.line.step) * L.line.step;
    tell(
        s,
        `The front of the canoe is beside about ${spoken(at)}. ${spoken(L.dock)} is ${off < 0 ? "a little further on" : "a little back"}.`,
    );
    out.push({ cue: "bump" });
}

export function step(s: RiverState, pad: Pad): Happening[] {
    const out: Happening[] = [],
        L = s.L;
    s.steps++;
    s.t += DT;
    // a ring drifts with the water it is on and spreads until it is gone
    s.rings = s.rings
        .map((r) => {
            const w = currentAt(L, r);
            return { x: r.x + w.x * DT, y: r.y + w.y * DT, t: r.t + DT, size: r.size };
        })
        .filter((r) => r.t < RING);
    if (s.won) return out;
    if (s.carried > 0) {
        s.carried -= DT;
        if (s.carried <= 0) {
            const x = gateX(L, s.next) - 10;
            s.boat = { x, y: middle(L, x), angle: 0, vx: 0, vy: 0, spin: 0 };
            s.carried = 0;
        }
        return out;
    }
    hands(s, pad, out);
    keys(s, pad, out);
    const before = s.boat.x;
    // held back against a canoe that has all but stopped, the paddle backs it slowly the other way
    if (s.backing) {
        const a = along(s.boat),
            w = currentAt(L, s.boat);
        if ((s.boat.vx - w.x) * a.x + (s.boat.vy - w.y) * a.y < 0.3)
            stroke(s.boat, s.side, 0.012, hull(), true);
    }
    // tied close along the bank the water holds a slow canoe, which is how one pulls in and stays
    const near = s.boat.y - bankAt(L, s.boat.x) < ALONGSIDE && s.boat.x > poolStart(L);
    canoeStep(s.boat, currentAt(L, s.boat), hull(), DT, s.backing ? 1 : near ? 0.6 : 0);
    collide(s, out);
    gates(s, before, out);
    dock(s, out);
    if (s.steps % 5 === 0)
        s.wake.push({
            x: s.boat.x - along(s.boat).x * 1.7,
            y: s.boat.y - along(s.boat).y * 1.7,
            t: s.t,
        });
    s.wake = s.wake.filter((p) => s.t - p.t < 1.6);
    // fast water through the rapids throws spray off the bow, more of it the faster it runs
    const water = currentAt(L, s.boat),
        fast = Math.hypot(water.x, water.y) / L.current;
    if (fast > 1.25 && s.steps % 6 === 0)
        out.push({
            burst: {
                kind: "splash",
                x: s.boat.x + along(s.boat).x * 1.6,
                y: s.boat.y + along(s.boat).y * 1.6,
                n: Math.min(5, Math.round(fast * 2)),
            },
        });
    s.cam = follow(s.cam, wanted(s), { rate: 2.2, dt: DT, view: VIEW, world: s.world });
    return out;
}

/** How long a paddle's ring spreads, in seconds, and how far apart the streaks of the current start, in squares. */
const RING = 0.9,
    STREAK = 2.4;

/**
 * The current as streaks on the water in view: each rides the water from where it starts and comes
 * round again, so they run quick and long through the rapids, slow in the slack and hardly at all in
 * the pool.
 */
function streaks(s: RiverState): Mark[] {
    const L = s.L,
        out: Mark[] = [],
        from = Math.max(0, Math.floor((s.cam.x - VIEW.w / 2) / STREAK) - 1),
        to = Math.ceil((s.cam.x + VIEW.w / 2) / STREAK) + 1;
    for (let i = from; i <= to; i++)
        for (const lane of [-0.55, 0, 0.55]) {
            const x0 = i * STREAK + (lane + 0.55) * 0.9,
                start = { x: x0, y: middle(L, x0) + lane * halfAt(L, x0) },
                w = currentAt(L, start),
                speed = Math.hypot(w.x, w.y);
            if (speed < 0.15) continue;
            // how far along its round a streak is, in a time that is shorter where the water is quicker
            const round = STREAK / speed,
                u = ((s.t + i * 0.37 + lane) % round) / round,
                at = { x: start.x + w.x * u * round, y: start.y + w.y * u * round },
                len = Math.min(1.6, 0.35 + speed * 0.35);
            out.push({
                kind: "line",
                a: at,
                b: { x: at.x + (w.x / speed) * len, y: at.y + (w.y / speed) * len },
                style: "thin",
            });
        }
    return out;
}

/** Where the canoe would drift over the next second and a half with nothing done, for the faint line ahead of it. */
function drift(s: RiverState): Pt[] {
    const c = { ...s.boat },
        pts: Pt[] = [];
    for (let i = 1; i <= 54; i++) {
        canoeStep(c, currentAt(s.L, c), hull(), DT, s.backing ? 1 : 0);
        if (i % 6 === 0) pts.push({ x: c.x, y: c.y });
    }
    return pts;
}

export function frame(s: RiverState, rest = false): Frame {
    const L = s.L,
        W = s.world,
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    const reach = 24,
        // meadow above and below the world, as much as the drawing's tallest reach allows, for a field taller than the river
        meadow = Math.max(0, Math.min(5, (40 - H) / 2));
    for (let x0 = 0; x0 < W.w; x0 += reach) {
        const w = Math.min(reach, W.w - x0),
            points: number[] = [],
            halves: number[] = [],
            rapids: number[] = [];
        for (let dx = 0; dx <= w + 1e-9; dx += 2) {
            const x = x0 + dx;
            points.push(dx, middle(L, x) + meadow);
            halves.push(halfAt(L, x));
            rapids.push(halfAt(L, x) < L.half - 1 ? 1 : 0);
        }
        sprites.push({
            key: `reach:${x0}`,
            art: "riverreach",
            params: { w, h: H + 2 * meadow, points, halves, rapids },
            x: x0 + w / 2,
            y: H / 2,
            z: 0,
            still: true,
        });
    }
    // trees and reeds along the banks, and a heron fishing at the pool
    for (let x = 8, k = 0; x < W.w - 4; x += 11, k++) {
        const top = k % 2 === 0,
            y = top ? bankAt(L, x) - 0.6 : middle(L, x) + halfAt(L, x) + 3.6;
        sprites.push({
            key: `tree:${k}`,
            art: k % 3 === 2 ? "firs" : "tree",
            params: k % 3 === 2 ? { count: 2, snow: 0 } : { fruit: 0, fallen: 0, item: "apple" },
            seed: 50 + k,
            size: 4,
            x,
            y,
            stand: true,
            z: top ? 1 : 6,
            still: true,
        });
        sprites.push({
            key: `reeds:${k}`,
            art: "reeds",
            params: { stems: 4 + (k % 3), lean: 0.1 },
            seed: 80 + k,
            size: 2,
            x: x + 5,
            y: top ? middle(L, x + 5) + halfAt(L, x + 5) + 0.9 : bankAt(L, x + 5) + 0.3,
            stand: true,
            z: 2,
            still: true,
        });
    }
    sprites.push({
        key: "heron",
        art: "heron",
        params: { facing: -1, reeds: 2 },
        size: 4,
        x: W.w - 6,
        y: middle(L, W.w - 6) + halfAt(L, W.w - 6) + 3.5,
        stand: true,
        z: 6,
        still: true,
    });
    L.rocks.forEach((r, i) => {
        const at = rockAt(L, r);
        sprites.push({
            key: `rock:${i}`,
            art: "boulder",
            params: { size: r.size },
            size: r.size,
            x: at.x,
            y: at.y,
            z: 3,
            still: true,
        });
    });
    L.logs.forEach((g, i) => {
        const at = moverAt(logPath(L, g), s.t).at;
        sprites.push({
            key: `log:${i}`,
            art: "log",
            params: { rings: 5, toadstools: 0 },
            crop: { x: 0, y: 1.2, w: 10, h: 3 },
            size: LOG,
            seed: 30 + i,
            x: at.x,
            y: at.y,
            z: 3,
        });
    });
    // the gates: a pair across the river at each checkpoint, the count's number on one
    L.count.forEach((n, k) => {
        const x = gateX(L, k),
            half = halfAt(L, x),
            right = L.sides[k] ?? 1;
        for (const side of [-1, 1] as const) {
            const label = side === right ? n : (L.decoys[k] ?? 0);
            const cy = middle(L, x) + (side * half) / 2;
            const span = Math.max(3, Math.round(half));
            sprites.push({
                key: `gate:${k}:${side}`,
                art: "rivergate",
                params: { n: spoken(label), w: span },
                size: (2 * half) / span,
                x,
                y: cy,
                z: 4,
                alpha: k < s.next ? 0.45 : 1,
                still: true,
            });
        }
    });
    // the line of posts along the pool's near bank, with its numbers where they are written
    for (let i = 0; i < L.line.posts; i++) {
        const v = L.line.from + i * L.line.step,
            x = lineX(L, v),
            y = bankAt(L, x);
        const every = L.line.every ?? 1;
        const written =
            L.line.labels === "all" ||
            (L.line.labels === "every" && Math.abs(v / every - Math.round(v / every)) < 1e-6) ||
            (L.line.labels === "ends" && (i === 0 || i === L.line.posts - 1));
        marks.push({
            kind: "line",
            a: { x, y: y - 0.1 },
            b: { x, y: y - (written ? 0.9 : 0.55) },
            style: "ink",
        });
        if (written) marks.push({ kind: "word", x, y: y - 1.5, text: spoken(v), size: 0.65 });
    }
    const first = lineX(L, L.line.from),
        last = lineX(L, L.line.from + (L.line.posts - 1) * L.line.step);
    marks.push({
        kind: "line",
        a: { x: first, y: bankAt(L, first) - 0.1 },
        b: { x: last, y: bankAt(L, last) - 0.1 },
        style: "thin",
    });
    if (!rest && s.wake.length > 1) marks.push({ kind: "dots", pts: s.wake, faint: true });
    if (!rest) {
        marks.push(...streaks(s));
        for (const r of s.rings)
            marks.push({ kind: "ring", x: r.x, y: r.y, r: 0.25 + (r.t / RING) * (0.6 + r.size) });
    }
    if (!s.won) marks.push({ kind: "dots", pts: drift(s), opacity: 0.35 });
    // a drag in the water shows the stroke it will make
    if (s.drag) {
        const k = strokeOfDrag(s, s.drag.from, s.drag.to);
        marks.push({ kind: "line", a: s.drag.from, b: s.drag.to, style: "aim", head: true });
        marks.push({
            kind: "ring",
            x: s.drag.from.x,
            y: s.drag.from.y,
            r: 0.5 + 0.5 * Math.min(1, k.power),
            on: true,
        });
    }
    const c = s.boat,
        since = s.t - s.lastStroke,
        sweep = since < 0.45 ? s.side * (1 - since / 0.45) * 0.9 + s.side * 0.1 : 0;
    const charging = s.charge ? Math.min(1, s.charge.t / ROW.charge.value) : 0;
    sprites.push({
        key: "canoe",
        art: "canoe",
        params: {
            stroke:
                Math.round(
                    (s.charge ? (s.charge.key === "left" ? 1 : -1) * charging : sweep) * 20,
                ) / 20,
            top: "berry",
        },
        size: HULL.length * (5 / 4.6),
        x: c.x,
        y: c.y,
        angle: c.angle,
        alpha: s.carried > 0 ? Math.max(0.2, s.carried / 1.2) : 1,
        z: 5,
        live: true,
    });
    if (s.won)
        marks.push({
            kind: "ring",
            x: lineX(L, L.dock),
            y: bankAt(L, lineX(L, L.dock)) - 0.3,
            r: 0.7,
            on: true,
            solid: true,
        });
    return {
        sprites,
        marks,
        camera: rest ? { ...keepInside(wanted(s), VIEW, W), zoom: 1 } : s.cam,
        view: VIEW,
        world: W,
    };
}

export function say(s: RiverState): string {
    const L = s.L,
        c = s.boat;
    const counted = L.count.slice(0, s.next).map(spoken);
    const inPool = c.x >= poolStart(L);
    const parts = [
        counted.length ? `Gates passed: ${counted.join(", ")}.` : "No gate passed yet.",
        s.next < L.count.length
            ? `The next pair of gates says ${spoken(L.sides[s.next] === -1 ? (L.count[s.next] ?? 0) : (L.decoys[s.next] ?? 0))} on the left and ${spoken(L.sides[s.next] === 1 ? (L.count[s.next] ?? 0) : (L.decoys[s.next] ?? 0))} on the right.`
            : `Stop with the front of the canoe beside ${spoken(L.dock)}.`,
        inPool
            ? `The front of the canoe is beside about ${spoken(Math.round(lineValue(L, bowOf(s).x) / L.line.step) * L.line.step)}.`
            : `The canoe is ${Math.round(((c.x - 5) / (L.length - 5)) * 10) * 10} percent of the way to the pool.`,
    ];
    return parts.join(" ");
}

export const rowGame: ActionGame<RiverState> = {
    id: "straight",
    title: "Down the river",
    group: "action",
    seen: "above",
    quiet: true,
    levels: RIVER_LEVELS,
    rate: RATE,
    touch: true,
    plays: { activity: "race.stop-on-the-line", levels: [0, 1] },
    cover: { art: "canoe", params: { stroke: 0.6, top: "berry" } },
    hint: "Drag back through the water beside the canoe to paddle on that side, harder for a longer drag; drag forward or hold a finger still to back water. With the keys: hold and let go of up to paddle, left and right to turn, down to back water",
    controls: {
        arrows: { left: "Turn left", right: "Turn right", up: "Paddle", down: "Back water" },
        go: "Paddle",
        brake: "Back water",
    },
    start,
    step,
    frame,
    say,
    note: (s) =>
        !s.touched && !s.won
            ? s.L.prompt
            : s.steps - s.saidAt < RATE * 4 || s.won
              ? s.said
              : s.next < s.L.count.length
                ? `${s.L.count.slice(0, s.next).map(spoken).join(", ")}${s.next ? ", …" : "Find the first gate."}`
                : `Find ${spoken(s.L.dock)} at the pool.`,
    won: (s) => s.won,
    objectives: (s) => progress(s.goal),
    cancelInput: (s) => {
        s.drag = null;
        s.charge = null;
        s.backing = false;
    },
    tuning: ROW,
    still: {
        press: () => Math.round(RATE * 0.4),
        settling: (s) =>
            !s.won &&
            (s.carried > 0 ||
                Math.hypot(s.boat.vx, s.boat.vy) >
                    0.05 + Math.hypot(currentAt(s.L, s.boat).x, currentAt(s.L, s.boat).y)),
    },
};
