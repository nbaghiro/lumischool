// Rabbit crossing: hop a rabbit from stone to stone along a number line to the carrot on its number.
//
// Stepping stones stand in a stream at some of the numbers on a line marked under the water. The child
// presses on the rabbit, pulls back and lets go, and the rabbit hops as far as the pull says, up to a
// longest hop, so reaching the carrot means hops that add up from stone to stone. A landing near a
// stone's edge wobbles, nearer still it tips the rabbit in, and a rabbit in the water swims back to the
// last stone still standing. Dark stones sink as the rabbit hops off them. The camera is close in and
// follows the rabbit along the stream, looking towards the carrot. See .docs/games.md.
import { follow, keepInside, type Cam } from "../../engine/motion/camera";
import { arc, flightAt, lob } from "../../engine/motion/flight";
import type { Pt } from "../../engine/motion/geometry";
import { knob } from "../../engine/motion/tune";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import type { ActionGame, ActionLevel, Levels } from "./game";

export interface HopLevel extends ActionLevel {
    from: number;
    to: number;
    start: number;
    target: number;
    /** The numbers stones stand at, the start and the target among them. */
    stones: number[];
    /** Stones that sink as the rabbit hops off them. Never the start or the target, and the others alone join every stone to the target. */
    sinking: number[];
    /** The longest hop, in the line's units: a half so that a pull held at its longest never lands square on a stone. */
    most: number;
    /** A tick every this many units. */
    tick: number;
    /** Numbers are written at multiples of this. */
    labels: number;
    /** Seconds of a hop drawn in dots while it is aimed. */
    preview: number;
    prompt: string;
}

export const HOP_LEVELS: Levels<HopLevel> = [
    {
        title: "0 to 20, land on 13",
        grades: [1, 2],
        goal: "Hop the rabbit from stone to stone to the carrot on 13.",
        prompt: "Pull the rabbit back and let go. Hop from stone to stone to the carrot on 13.",
        from: 0,
        to: 20,
        start: 0,
        target: 13,
        stones: [0, 3, 5, 8, 10, 13, 15, 18, 20],
        sinking: [],
        most: 5.5,
        tick: 1,
        labels: 1,
        preview: 0.35,
    },
    {
        title: "-10 to 10, land on -4",
        grades: [3, 4],
        goal: "Hop the rabbit back past nought to the carrot on minus 4.",
        prompt: "The carrot is on −4, back past nought.",
        from: -10,
        to: 10,
        start: 5,
        target: -4,
        stones: [-10, -8, -6, -4, -1, 0, 2, 5, 7, 10],
        sinking: [],
        most: 3.5,
        tick: 1,
        labels: 1,
        preview: 0.3,
    },
    {
        title: "Stones that sink",
        grades: [2, 3],
        goal: "Hop the rabbit to the carrot on 22. A dark stone sinks as the rabbit hops off it.",
        prompt: "Dark stones sink as the rabbit hops off them.",
        from: 0,
        to: 30,
        start: 0,
        target: 22,
        stones: [0, 3, 5, 8, 10, 13, 15, 18, 20, 22, 25, 28, 30],
        sinking: [5, 10, 15, 20],
        most: 5.5,
        tick: 1,
        labels: 5,
        preview: 0.3,
    },
    {
        title: "Only some numbers written",
        grades: [3, 4],
        goal: "Hop the rabbit to the carrot on 35. Only 0, 25 and 50 are written.",
        prompt: "Only 0, 25 and 50 are written on the line. The carrot is on 35.",
        from: 0,
        to: 50,
        start: 0,
        target: 35,
        stones: [0, 10, 15, 20, 30, 35, 45, 50],
        sinking: [],
        most: 12.5,
        tick: 5,
        labels: 25,
        preview: 0.25,
    },
    {
        title: "Back past nought",
        grades: [4, 4],
        goal: "Hop the rabbit from 4 to the carrot on minus 13. Some stones sink behind it.",
        prompt: "From 4 to −13, and dark stones sink behind the rabbit.",
        from: -20,
        to: 20,
        start: 4,
        target: -13,
        stones: [-20, -17, -13, -10, -8, -6, -3, -1, 1, 4, 8, 12, 16, 20],
        sinking: [-8, -3],
        most: 5.5,
        tick: 1,
        labels: 5,
        preview: 0.25,
    },
    {
        title: "Tens to a hundred",
        grades: [3, 4],
        goal: "Hop the rabbit to the carrot on 70. Only 0, 50 and 100 are written.",
        prompt: "The carrot is on 70, on a line to a hundred.",
        from: 0,
        to: 100,
        start: 0,
        target: 70,
        stones: [0, 15, 30, 40, 55, 70, 85, 100],
        sinking: [],
        most: 27.5,
        tick: 5,
        labels: 50,
        preview: 0.2,
    },
];

/** The rabbit's tuning table. */
export const HOP = {
    pull: knob(4.5, 3, 6, 0.5, "squares", "a pull this long is the longest hop"),
    minPull: knob(
        0.6,
        0.3,
        1.2,
        0.1,
        "squares",
        "anything shorter is a finger resting on the rabbit",
    ),
    gravity: knob(
        30,
        15,
        45,
        1,
        "squares a second, each second",
        "a hop slow enough to follow with the eye",
    ),
    rise: knob(1.4, 0.5, 3, 0.1, "squares", "how high a short hop goes; a longer one goes higher"),
    firm: knob(
        0.55,
        0.2,
        0.8,
        0.05,
        "of a stone's half width",
        "a landing nearer the middle than this stands still",
    ),
    tip: knob(
        0.82,
        0.5,
        1,
        0.02,
        "of a stone's half width",
        "a landing further out than this wobbles and tips the rabbit in",
    ),
    swim: knob(
        6,
        2,
        10,
        0.5,
        "squares a second",
        "a rabbit in the water paddles back without a long wait",
    ),
    sweep: knob(
        0.45,
        0.2,
        1,
        0.05,
        "of the longest hop a second",
        "a held arrow key moves the hop smoothly",
    ),
};

const RATE = 60,
    DT = 1 / RATE;
/**
 * In squares, y down. The near bank runs to `x0`, the stream to `x1`, and the far bank on from there.
 * The view is close in, so the rabbit and the stones are near three squares and the numbers read from
 * arm's length, and the camera pans along the stream as the rabbit crosses.
 */
export const STREAM = {
    world: { w: 52, h: 30 },
    view: { w: 32, h: 22 },
    bank: 17.5,
    surface: 19.5,
    x0: 6,
    x1: 47,
} as const;
/** Where the rabbit's feet are on a stone. */
export const TOP = STREAM.surface - 0.55;
const LINE_Y = STREAM.surface + 1.7;
/** The stone as the `steppingstone` drawing lays it out, restated in squares: its box for a width of three, and its top down the box. A test holds these to the drawing. */
const STONE = { w: 3, h: 2, top: 0.55 } as const;
/** The swimming rabbit as the `swimmingrabbit` drawing lays it out: its box, and the water's surface down it. */
const SWIMMER = { w: 3, h: 2, surface: 1.5 } as const;

export const perOf = (L: HopLevel): number => (STREAM.x1 - STREAM.x0 - 2) / (L.to - L.from);
export const xOf = (L: HopLevel, n: number): number => STREAM.x0 + 1 + (n - L.from) * perOf(L);
export const keyStepOf = (L: HopLevel): number => L.tick / 2;
/** A stone's half width in squares: one, or less where two stones stand close. */
export function halfOf(L: HopLevel): number {
    const sorted = [...L.stones].sort((a, b) => a - b);
    const gap = Math.min(...sorted.slice(1).map((n, i) => n - (sorted[i] ?? n)));
    return Math.min(1, 0.45 * gap * perOf(L));
}

export type Landing = { stone: number; kind: "stand" | "wobble" | "tip" | "water" };

/** Where a hop coming down at `x` ends: on the nearest standing stone, firmly, wobbling or tipping by how far out from its middle, or in the water. */
export function landingAt(L: HopLevel, x: number, standing: (i: number) => boolean): Landing {
    const half = halfOf(L);
    let best = -1,
        far = Infinity;
    L.stones.forEach((n, i) => {
        const d = Math.abs(x - xOf(L, n));
        if (standing(i) && d < far) {
            far = d;
            best = i;
        }
    });
    if (best < 0 || far > half) return { stone: -1, kind: "water" };
    const f = far / half;
    return {
        stone: best,
        kind: f <= HOP.firm.value ? "stand" : f <= HOP.tip.value ? "wobble" : "tip",
    };
}

/** The fewest hops, none longer than the longest, from each stone to the target over the stones `standing` allows. */
export function hopsTo(L: HopLevel, standing: (i: number) => boolean): number[] {
    const goal = L.stones.indexOf(L.target),
        out = L.stones.map(() => Infinity),
        todo = [goal];
    out[goal] = 0;
    for (let k = 0; k < todo.length; k++) {
        const i = todo[k] ?? goal;
        L.stones.forEach((n, j) => {
            if (out[j] === Infinity && standing(j) && Math.abs(n - (L.stones[i] ?? 0)) <= L.most) {
                out[j] = (out[i] ?? 0) + 1;
                todo.push(j);
            }
        });
    }
    return out;
}

type Phase = "sit" | "held" | "hop" | "wobble" | "fall" | "swim" | "climb";

export interface HopState {
    level: number;
    L: HopLevel;
    phase: Phase;
    /** The stone the rabbit stands on, or took off from. */
    stone: number;
    /** The stones it has stood on, in order, back to the start; a swim back takes it to the last of them still standing. */
    path: number[];
    /** Where its feet are. */
    at: Pt;
    facing: 1 | -1;
    angle: number;
    squash: number;
    grab: Pt | null;
    pull: Pt | null;
    hand: Pt | null;
    /** The hop the arrow keys have set, in the line's units, less than nought to the left. */
    aim: number | null;
    keyAt: number;
    keyHeld: boolean;
    flight: { from: Pt; v: Pt; T: number; t: number; x: number } | null;
    landing: Landing | null;
    timer: number;
    sunk: boolean[];
    depth: number[];
    trail: (Pt & { step: number })[];
    cam: Cam;
    hops: number;
    dips: number;
    said: string;
    saidAt: number;
    touched: boolean;
    steps: number;
    won: boolean;
}

export function start(level: number): HopState {
    const L = HOP_LEVELS[level] ?? HOP_LEVELS[0];
    const stone = Math.max(0, L.stones.indexOf(L.start)),
        at = { x: xOf(L, L.start), y: TOP };
    const s: HopState = {
        level,
        L,
        phase: "sit",
        stone,
        path: [stone],
        at,
        facing: L.target >= L.start ? 1 : -1,
        angle: 0,
        squash: 0,
        grab: null,
        pull: null,
        hand: null,
        aim: null,
        keyAt: -999,
        keyHeld: false,
        flight: null,
        landing: null,
        timer: 0,
        sunk: L.stones.map(() => false),
        depth: L.stones.map(() => 0),
        trail: [],
        cam: { x: 0, y: 0, zoom: 1 },
        hops: 0,
        dips: 0,
        said: "",
        saidAt: -999,
        touched: false,
        steps: 0,
        won: false,
    };
    s.cam = { ...keepInside(wanted(s), STREAM.view, STREAM.world), zoom: 1 };
    return s;
}

/** The camera looks at the rabbit and a little way towards the carrot, so the next stones are in view. */
const wanted = (s: HopState): Cam => {
    const towards = xOf(s.L, s.L.target) - s.at.x;
    return { x: s.at.x + Math.max(-7, Math.min(7, towards * 0.5)), y: STREAM.surface - 1, zoom: 1 };
};

function tell(s: HopState, text: string): void {
    s.said = text;
    s.saidAt = s.steps;
}

const standing = (s: HopState) => (i: number) => !s.sunk[i];
const written = (n: number) => (n < 0 ? `−${-n}` : String(n));

/** The flight of a hop of `units` along the line from where the rabbit sits, kept inside the stream. */
function flightOf(s: HopState, units: number): { from: Pt; v: Pt; T: number; x: number } {
    const x = Math.max(STREAM.x0 + 0.3, Math.min(STREAM.x1 - 0.3, s.at.x + units * perOf(s.L)));
    const f = lob(
        s.at,
        { x, y: TOP },
        HOP.gravity.value,
        HOP.rise.value + 0.12 * Math.abs(x - s.at.x),
    );
    return { from: { ...s.at }, v: f.v, T: f.t, x };
}

/** A pull as a hop in the line's units: as long as the pull, up to the longest hop, away from the side it was pulled to. */
export function unitsOf(s: HopState, pull: Pt): number {
    const len = Math.min(Math.hypot(pull.x, pull.y), HOP.pull.value),
        dir = Math.abs(pull.x) < 0.3 ? s.facing : pull.x > 0 ? -1 : 1;
    return (dir * len * s.L.most) / HOP.pull.value;
}

function hopWith(s: HopState, units: number, out: Happening[]): void {
    const L = s.L;
    s.flight = { ...flightOf(s, units), t: 0 };
    s.phase = "hop";
    s.facing = units < 0 ? -1 : 1;
    s.hops++;
    s.pull = null;
    s.grab = null;
    s.aim = null;
    s.keyHeld = false;
    s.trail = [];
    out.push({ cue: "lift" });
    if (L.sinking.includes(L.stones[s.stone] ?? NaN) && !s.sunk[s.stone]) {
        s.sunk[s.stone] = true;
        out.push({ burst: { kind: "bubble", x: s.at.x, y: STREAM.surface, n: 6 } });
    }
}

/** Hops `units` along the line from a sitting rabbit, as a pull or the keys would. */
export function hopBy(s: HopState, units: number): void {
    if (s.phase === "sit" && !s.won) hopWith(s, units, []);
}

function hands(s: HopState, pad: Pad, out: Happening[]): void {
    if (s.hand && !pad.touch && !pad.lifted) {
        s.hand = null;
        s.grab = null;
        s.pull = null;
        if (s.phase === "held") s.phase = "sit";
    }
    const t = pad.touch ?? (s.hand ? pad.lifted : null);
    if (t) {
        const began = !s.hand;
        s.hand = { ...t };
        if (began && s.phase === "sit" && Math.hypot(t.x - s.at.x, t.y - (s.at.y - 1.2)) <= 2.6) {
            s.phase = "held";
            s.grab = { ...t };
            s.touched = true;
            s.aim = null;
        }
        if (s.phase === "held" && s.grab) s.pull = { x: t.x - s.grab.x, y: t.y - s.grab.y };
    }
    if (pad.lifted) {
        if (s.phase === "held") {
            const p = s.pull ?? { x: 0, y: 0 };
            if (Math.hypot(p.x, p.y) < HOP.minPull.value) {
                s.phase = "sit";
                s.pull = null;
                s.grab = null;
            } else hopWith(s, unitsOf(s, p), out);
        }
        s.hand = null;
    }
}

function keys(s: HopState, pad: Pad, out: Happening[]): void {
    if (pad.touch || s.phase !== "sit") return;
    const L = s.L,
        by = keyStepOf(L),
        clamp = (v: number) => Math.max(-L.most, Math.min(L.most, v));
    for (const d of pad.pressed) {
        if (d !== "left" && d !== "right") continue;
        s.aim = clamp(Math.round(((s.aim ?? 0) + (d === "right" ? by : -by)) / by) * by);
        s.keyAt = s.steps;
        s.touched = true;
    }
    const hold = pad.holding.includes("right") ? 1 : pad.holding.includes("left") ? -1 : 0;
    if (hold) {
        const ramp = Math.min(1, (s.steps - s.keyAt) / (RATE * 0.2));
        s.aim = clamp((s.aim ?? 0) + hold * HOP.sweep.value * L.most * DT * ramp);
    } else if (s.keyHeld && s.aim !== null) {
        s.aim = clamp(Math.round(s.aim / by) * by);
    }
    s.keyHeld = hold !== 0;
    if (
        pad.tapped &&
        s.phase === "sit" &&
        s.aim !== null &&
        Math.abs(s.aim) >= (L.most * HOP.minPull.value) / HOP.pull.value
    )
        hopWith(s, s.aim, out);
}

/** The last stone on the rabbit's way here that is still standing. */
function homeOf(s: HopState): number {
    for (let k = s.path.length - 1; k >= 0; k--) {
        const i = s.path[k] ?? 0;
        if (!s.sunk[i]) return i;
    }
    return Math.max(0, s.L.stones.indexOf(s.L.start));
}

function land(s: HopState, i: number, out: Happening[]): void {
    const L = s.L,
        n = L.stones[i] ?? 0;
    s.phase = "sit";
    s.at = { x: xOf(L, n), y: TOP };
    s.angle = 0;
    s.squash = 0.25;
    s.stone = i;
    if (s.path.at(-1) !== i) s.path.push(i);
    out.push({ cue: "place" }, { puff: { x: s.at.x, y: TOP, n: 4 } });
    if (n !== L.target) {
        tell(s, `On ${written(n)}.`);
        return;
    }
    s.won = true;
    const hops = s.path
        .slice(1)
        .map((j, k) => (L.stones[j] ?? 0) - (L.stones[s.path[k] ?? 0] ?? 0));
    tell(
        s,
        `From ${written(L.start)}, ${hops.map((h) => (h < 0 ? `back ${-h}` : `on ${h}`)).join(", ")}: the rabbit is on ${written(n)}.`,
    );
    out.push({ cue: "win" }, { burst: { kind: "sparkle", x: s.at.x, y: TOP - 2, n: 12 } });
}

function intoWater(s: HopState, out: Happening[], text: string): void {
    s.phase = "fall";
    s.flight = { from: { ...s.at }, v: { x: s.facing * 1.5, y: 1 }, T: 0, t: 0, x: s.at.x };
    s.dips++;
    tell(s, text);
    out.push({ cue: "nope" });
}

export function step(s: HopState, pad: Pad): Happening[] {
    const out: Happening[] = [],
        L = s.L;
    s.steps++;
    s.trail = s.trail.filter((p) => s.steps - p.step < RATE * 0.3);
    if (!s.won) {
        hands(s, pad, out);
        keys(s, pad, out);
    }
    s.squash *= Math.exp(-12 * DT);
    s.depth = s.depth.map((d, i) => d + ((s.sunk[i] ? 1 : 0) - d) * Math.min(1, 2.5 * DT));
    const f = s.flight;
    switch (s.phase) {
        case "hop": {
            if (!f) break;
            f.t += DT;
            s.at = flightAt(f.from, f.v, HOP.gravity.value, Math.min(f.t, f.T));
            if (s.steps % 3 === 0) s.trail.push({ ...s.at, step: s.steps });
            if (f.t < f.T) break;
            s.at = { x: f.x, y: TOP };
            const where = landingAt(L, f.x, standing(s));
            s.landing = where;
            if (where.kind === "stand") land(s, where.stone, out);
            else if (where.kind === "water") intoWater(s, out, "Splash. The rabbit swims back.");
            else {
                s.phase = "wobble";
                s.timer = where.kind === "wobble" ? 0.45 : 0.4;
                out.push({ cue: "bump" });
            }
            break;
        }
        case "wobble": {
            s.timer -= DT;
            s.angle = Math.sin(s.steps * 0.9) * 0.28 * Math.max(0, s.timer / 0.45);
            if (s.timer > 0) break;
            const where = s.landing;
            if (where?.kind === "wobble") land(s, where.stone, out);
            else {
                s.facing = s.at.x >= xOf(L, L.stones[where?.stone ?? 0] ?? 0) ? 1 : -1;
                intoWater(s, out, "Too near the edge. The rabbit tipped in and swims back.");
            }
            break;
        }
        case "fall": {
            if (!f) break;
            f.t += DT;
            s.at = { x: s.at.x + f.v.x * DT, y: s.at.y + (f.v.y + 20 * f.t) * DT };
            s.angle = s.facing * Math.min(0.6, f.t * 2);
            if (s.at.y < STREAM.surface + 0.35) break;
            s.at.y = STREAM.surface + 0.35;
            s.phase = "swim";
            s.angle = 0;
            out.push(
                { cue: "splash" },
                { burst: { kind: "splash", x: s.at.x, y: STREAM.surface, n: 8 } },
            );
            break;
        }
        case "swim": {
            const home = homeOf(s),
                hx = xOf(L, L.stones[home] ?? 0),
                dx = hx - s.at.x;
            s.facing = dx >= 0 ? 1 : -1;
            s.at = {
                x: s.at.x + Math.sign(dx) * Math.min(Math.abs(dx), HOP.swim.value * DT),
                y: STREAM.surface + 0.35 + 0.08 * Math.sin(s.steps * 0.35),
            };
            if (s.steps % 20 === 0)
                out.push({ burst: { kind: "splash", x: s.at.x, y: STREAM.surface, n: 1 } });
            if (Math.abs(dx) > 0.02) break;
            const up = lob(s.at, { x: hx, y: TOP }, HOP.gravity.value, 0.8);
            s.flight = { from: { ...s.at }, v: up.v, T: up.t, t: 0, x: hx };
            s.stone = home;
            s.path = s.path.slice(0, s.path.lastIndexOf(home) + 1);
            s.phase = "climb";
            break;
        }
        case "climb": {
            if (!f) break;
            f.t += DT;
            s.at = flightAt(f.from, f.v, HOP.gravity.value, Math.min(f.t, f.T));
            if (f.t < f.T) break;
            s.phase = "sit";
            s.at = { x: f.x, y: TOP };
            s.squash = 0.15;
            tell(s, `Back on ${written(L.stones[s.stone] ?? 0)}.`);
            out.push({ cue: "place" });
            break;
        }
        default:
            break;
    }
    s.cam = follow(s.cam, wanted(s), { rate: 2.5, dt: DT, view: STREAM.view, world: STREAM.world });
    return out;
}

const BUNNY = { crop: { x: 0.5, y: 0.4, w: 5.2, h: 4.9 }, size: 2.6 };
/** A stone drawn this many squares across, where the stones stand a square or more apart. */
const STONE_SIZE = 2.9;

export function frame(s: HopState, rest = false): Frame {
    const L = s.L,
        W = STREAM.world,
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    sprites.push(
        {
            key: "cloud:0",
            art: "cloud",
            params: { puffs: 4, rain: 0 },
            seed: 17,
            size: 6,
            x: 5,
            y: 10.5,
            z: 0,
            depth: 0.5,
            still: true,
        },
        {
            key: "cloud:1",
            art: "cloud",
            params: { puffs: 3, rain: 0 },
            seed: 18,
            size: 5,
            x: 15,
            y: 8.5,
            z: 0,
            depth: 0.5,
            still: true,
        },
        {
            key: "cloud:2",
            art: "cloud",
            params: { puffs: 5, rain: 0 },
            seed: 19,
            size: 7,
            x: 26,
            y: 11,
            z: 0,
            depth: 0.5,
            still: true,
        },
        {
            key: "cloud:3",
            art: "cloud",
            params: { puffs: 3, rain: 0 },
            seed: 20,
            size: 5,
            x: 35,
            y: 9,
            z: 0,
            depth: 0.5,
            still: true,
        },
        {
            key: "hedge",
            art: "hedge",
            params: { clumps: 2, berries: 2, gap: 0 },
            seed: 27,
            size: 5,
            x: 3,
            y: STREAM.bank,
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
            x: 50,
            y: STREAM.bank,
            stand: true,
            z: 1,
            still: true,
        },
        {
            key: "ground:near",
            art: "arcade.ground",
            params: { w: STREAM.x0 },
            seed: 61,
            x: STREAM.x0 / 2,
            y: STREAM.bank + 1.1,
            z: 2,
            still: true,
        },
        {
            key: "ground:far",
            art: "arcade.ground",
            params: { w: W.w - STREAM.x1 },
            seed: 62,
            x: (STREAM.x1 + W.w) / 2,
            y: STREAM.bank + 1.1,
            z: 2,
            still: true,
        },
    );
    const deep = Math.ceil(W.h - STREAM.surface + 1);
    for (let x0 = STREAM.x0; x0 < STREAM.x1; x0 += 17) {
        const across = Math.min(17, STREAM.x1 - x0);
        sprites.push({
            key: `stream:${x0}`,
            art: "sea",
            params: { across, deep, x0, bed: true },
            seed: 70 + x0,
            x: x0 + across / 2,
            y: STREAM.surface - 0.5 + deep / 2,
            z: 3,
            still: true,
        });
    }
    for (const [i, [x, lean, y]] of (
        [
            [STREAM.x0 - 0.9, 0.2, STREAM.bank],
            [STREAM.x1 + 1.1, -0.15, STREAM.bank],
            [STREAM.x1 - 0.9, 0.1, STREAM.surface + 0.35],
        ] as const
    ).entries()) {
        sprites.push({
            key: `reeds:${i}`,
            art: "reeds",
            params: { stems: 5 + i, lean },
            seed: 80 + i,
            size: 3.2,
            x,
            y,
            stand: true,
            z: 4,
            still: true,
        });
    }
    const size = Math.min(STONE_SIZE, halfOf(L) * STONE_SIZE),
        lift = (STONE.h - STONE.top) * (size / STONE.w);
    L.stones.forEach((n, i) => {
        const d = rest ? (s.sunk[i] ? 1 : 0) : (s.depth[i] ?? 0);
        if (d > 0.98) return;
        const dark = L.sinking.includes(n) ? 1 : 0,
            label = n % L.labels === 0 ? written(n) : "";
        sprites.push({
            key: `stone:${i}`,
            art: "steppingstone",
            params: { n: label, w: STONE.w, dark },
            size,
            seed: 40 + i,
            x: xOf(L, n),
            y: TOP + lift + d * 1.8,
            stand: true,
            z: d > 0.3 ? 4.5 : 6,
            alpha: 1 - 0.7 * d,
        });
    });
    if (!s.won)
        sprites.push({
            key: "carrot",
            art: "carrot",
            params: { flat: 0 },
            seed: 9,
            size: 1.5,
            x: xOf(L, L.target) + 0.55,
            y: TOP + 0.05,
            stand: true,
            z: 7,
        });
    // A swimming rabbit shows only its head and back above the water.
    if (s.phase === "swim") {
        sprites.push({
            key: "rabbit:swim",
            art: "swimmingrabbit",
            params: { facing: s.facing },
            size: SWIMMER.w,
            seed: 12,
            x: s.at.x,
            y: s.at.y - (SWIMMER.surface - SWIMMER.h / 2) - 0.1,
            z: 8,
        });
    } else {
        sprites.push({
            key: "rabbit",
            art: "rabbits",
            params: { count: 1, facing: s.facing },
            crop: BUNNY.crop,
            size: BUNNY.size,
            seed: 12,
            x: s.at.x,
            y: s.at.y,
            stand: true,
            angle: s.angle,
            squash: s.squash,
            z: 8,
        });
    }
    marks.push({
        kind: "line",
        a: { x: xOf(L, L.from), y: LINE_Y },
        b: { x: xOf(L, L.to), y: LINE_Y },
        style: "thin",
    });
    for (let n = L.from; n <= L.to; n += L.tick) {
        const x = xOf(L, n),
            big = n % L.labels === 0;
        marks.push({
            kind: "line",
            a: { x, y: LINE_Y - (big ? 0.4 : 0.22) },
            b: { x, y: LINE_Y + (big ? 0.4 : 0.22) },
            style: "thin",
        });
        if (big) marks.push({ kind: "word", x, y: LINE_Y + 1.3, text: written(n), size: 0.9 });
    }
    if (!rest)
        for (const p of s.trail)
            marks.push({
                kind: "dots",
                pts: [p],
                opacity: 0.45 * (1 - (s.steps - p.step) / (RATE * 0.3)),
            });
    const aimed = s.won
        ? null
        : s.phase === "held" && s.pull && Math.hypot(s.pull.x, s.pull.y) >= HOP.minPull.value
          ? unitsOf(s, s.pull)
          : s.phase === "sit"
            ? s.aim
            : null;
    if (aimed !== null) {
        const fl = flightOf(s, aimed);
        marks.push({
            kind: "dots",
            pts: arc(fl.from, fl.v, HOP.gravity.value, { seconds: L.preview, every: 0.05 }),
        });
    }
    if (s.phase === "held" && s.grab && s.pull) {
        const len = Math.hypot(s.pull.x, s.pull.y),
            k = len > HOP.pull.value ? HOP.pull.value / len : 1;
        marks.push({
            kind: "line",
            a: s.grab,
            b: { x: s.grab.x + s.pull.x * k, y: s.grab.y + s.pull.y * k },
            style: "thin",
        });
    }
    if (!s.touched && !s.won && s.phase === "sit")
        marks.push({ kind: "ring", x: s.at.x, y: s.at.y - 1.2, r: 1.9 });
    const camera = rest
        ? { ...keepInside(wanted(s), STREAM.view, STREAM.world), zoom: 1 }
        : { ...s.cam };
    return { sprites, marks, camera, view: { ...STREAM.view }, world: { ...W } };
}

const spoken = (n: number) => (n < 0 ? `minus ${-n}` : String(n));

export function say(s: HopState): string {
    const L = s.L,
        here = spoken(L.stones[s.stone] ?? L.start);
    const where =
        s.phase === "sit" || s.phase === "held"
            ? `on the stone at ${here}`
            : s.phase === "fall" || s.phase === "swim"
              ? "in the water, swimming back"
              : "hopping";
    const up = L.stones.filter((_, i) => !s.sunk[i]).map(spoken),
        down = L.stones.filter((_, i) => s.sunk[i]).map(spoken);
    const parts = [
        s.said,
        `The rabbit is ${where}.`,
        `The carrot is on ${spoken(L.target)}.`,
        `Stones stand at ${up.join(", ")}.`,
        down.length ? `The stones at ${down.join(", ")} have sunk.` : "",
        `The longest hop is ${L.most}.`,
    ];
    if (s.aim !== null && s.phase === "sit")
        parts.push(
            `The hop is set to ${Math.round(Math.abs(s.aim) * 4) / 4} to the ${s.aim < 0 ? "left" : "right"}.`,
        );
    return parts.filter(Boolean).join(" ");
}

export const rabbitGame: ActionGame<HopState> = {
    id: "jump",
    title: "Rabbit crossing",
    group: "action",
    levels: HOP_LEVELS,
    rate: RATE,
    bleed: true,
    touch: true,
    cancelInput: (s) => {
        s.hand = null;
        s.grab = null;
        s.pull = null;
        if (s.phase === "held") s.phase = "sit";
    },
    plays: { activity: "jump.land-on", levels: [0, 1] },
    cover: { art: "rabbits", params: { count: 1, facing: 1 } },
    hint: "Pull the rabbit back and release to hop. Or use Aim left and Aim right to set the hop, then press Hop. The left and right arrow keys also aim; space makes the hop.",
    controls: { arrows: { left: "Aim left", right: "Aim right" }, go: "Hop" },
    start,
    step,
    frame,
    say,
    tuning: HOP,
    note: (s) =>
        !s.touched && !s.won ? s.L.prompt : s.steps - s.saidAt < RATE * 4 || s.won ? s.said : "",
    won: (s) => s.won,
    still: {
        press: () => Math.round(RATE * 0.25),
        settling: (s) => s.phase !== "sit" && s.phase !== "held",
    },
};
