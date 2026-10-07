// Kite flying: Charlie stands in a field with a kite up on its line, and the wind blows from the left.
// The kite flies along its nose, the wind carries it, and a taut line holds it on a circle round her
// hands: steering turns the nose so it swings across the sky and loops, pulling the line in brings
// it nearer and gives it speed, and letting it out lets it climb away on the wind. Gusts sweep across
// from the left, drawn as streaks before they arrive, and lift the kite; a lull lets it sink unless
// the line is pulled. The numbers are on balloons in the sky, and the kite pops one by flying through
// it: make an exact sum, the even numbers only, count by threes, read a height off the pole. A crash
// is a moment on the grass before Charlie launches it again. See .docs/games.md.
import type { ActionGame, ActionLevel, Levels } from "./game";
import { follow, type Cam } from "../../engine/motion/camera";
import type { Pt } from "../../engine/motion/geometry";
import {
    changesOf,
    elevation,
    noseOf,
    sagOf,
    stepKite,
    stepTail,
    tailRoot,
    windAt,
    changeAt,
    FRONT,
    type Change,
    type Hands,
    type Kite,
    type Rig,
} from "../../engine/motion/kite";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import { panOf, type Hum, type Kit } from "../../engine/sound/kit";

export const RATE = 60;
const SUB = 4;
const DT = 1 / (RATE * SUB);

export const WORLD = { w: 80, h: 64 };
/** The top of the grass, and where Charlie's hands hold the reel. */
export const GROUND = 58;
const CHARLIE = { x: 9, y: GROUND };
export const HANDS: Pt = { x: 10.3, y: GROUND - 2.6 };
const VIEW = { w: 44, h: 26 };
/** Squares round a balloon's middle the kite pops it from. */
const REACH = 1.45;

type Place = "meadow" | "beach" | "hill" | "park" | "town" | "autumn" | "festival" | "sky";
type Tone = "berry" | "sky" | "tang" | "glow" | "mint";
const TONES: Tone[] = ["berry", "sky", "tang", "mint", "glow"];

export type Ask =
    | { kind: "count"; count: number }
    | { kind: "sum"; total: number }
    | { kind: "even"; count: number }
    | { kind: "order"; seq: number[] }
    | { kind: "height"; m: number; hold: number }
    | { kind: "double"; of: number[] }
    | { kind: "free" };

/** A balloon: its number, how many squares from the hands, and how many degrees above the ground downwind. */
interface Spot {
    n: number;
    r: number;
    deg: number;
}

/** A bird carrying a number across the sky at a height, so many squares a second, starting so far across. */
interface Bird {
    n: number;
    height: number;
    speed: number;
    from: number;
}

export interface KiteLevel extends ActionLevel {
    prompt: string;
    place: Place;
    ask: Ask;
    /** The usual wind in squares a second, a gust or a lull about every `every` seconds, and how strong they are. */
    wind: { usual: number; every: number; gust: number; lull: number };
    line: { start: number; most: number };
    spots: Spot[];
    birds?: Bird[];
    /** Trees by where they stand and how tall, one of them perhaps the tree that eats kites. */
    trees?: { x: number; size: number; eats?: true }[];
    /** Power lines from `x0` to `x1`, `h` squares up. */
    wires?: { x0: number; x1: number; h: number }[];
    /** Houses whose roofs the kite must keep off, by where they stand. */
    roofs?: { x: number; count: number }[];
    /** Other flyers' kites, held from `x` on a line, swinging either side of `deg` and back every `period` seconds. */
    others?: { x: number; line: number; deg: number; swing: number; period: number }[];
    /** Flights a try has, where a crash costs one, and seconds it has, where it is timed. */
    flights?: number;
    time?: number;
    /** Seconds of the dotted way ahead the kite is shown, or nought for none. */
    preview: number;
    shape: "diamond" | "delta" | "box";
    tone: Tone;
    /** The double asks a variation gives instead, by variation. */
    doubles?: number[][];
    /** A kite that comes upright quicker, only leans when steered, and stalls later, for the first level. */
    gentle?: true;
}

const S = (n: number, r: number, deg: number): Spot => ({ n, r, deg });

export const KITE_LEVELS: Levels<KiteLevel> = [
    {
        title: "The meadow",
        goal: "Fly the kite through four balloons.",
        prompt: "Hold a finger in the sky and the kite flies that way, or steer with left and right. Up lets the line out and down pulls it in. Pop four balloons.",
        grades: [1, 1],
        place: "meadow",
        ask: { kind: "count", count: 4 },
        wind: { usual: 5, every: 0, gust: 0, lull: 0 },
        line: { start: 10, most: 22 },
        spots: [S(1, 14, 70), S(2, 17, 50), S(3, 13, 44), S(4, 19, 63), S(5, 15, 78), S(6, 20, 40)],
        preview: 1.2,
        shape: "diamond",
        tone: "berry",
        gentle: true,
    },
    {
        title: "Make ten at the beach",
        goal: "Pop balloons that make exactly 10.",
        prompt: "Each balloon adds its number. Make exactly 10. A balloon that would go past 10 bounces away, and a popped one comes back.",
        grades: [1, 2],
        place: "beach",
        ask: { kind: "sum", total: 10 },
        wind: { usual: 5.5, every: 12, gust: 0.35, lull: 0 },
        line: { start: 12, most: 26 },
        spots: [S(1, 18, 74), S(2, 21, 52), S(3, 16, 34), S(4, 24, 64), S(5, 20, 28), S(6, 25, 44)],
        preview: 1.2,
        shape: "diamond",
        tone: "sky",
    },
    {
        title: "Even numbers on the hill",
        goal: "Pop four different even numbers.",
        prompt: "Only even numbers count, each one once. An odd balloon pops but does not count. When the wind drops, pull the line in.",
        grades: [1, 2],
        place: "hill",
        ask: { kind: "even", count: 4 },
        wind: { usual: 5.5, every: 11, gust: 0.4, lull: 0.5 },
        line: { start: 12, most: 26 },
        spots: [
            S(2, 15, 70),
            S(3, 19, 58),
            S(4, 13, 44),
            S(5, 22, 70),
            S(6, 18, 38),
            S(7, 24, 52),
            S(8, 21, 80),
            S(9, 16, 56),
        ],
        preview: 1.0,
        shape: "delta",
        tone: "tang",
    },
    {
        title: "Count by threes in the park",
        goal: "Pop 3, 6, 9 and 12 in order.",
        prompt: "Count by threes: 3, then 6, then 9, then 12. Another balloon just bounces away. Keep clear of the tree that eats kites.",
        grades: [2, 2],
        place: "park",
        ask: { kind: "order", seq: [3, 6, 9, 12] },
        wind: { usual: 5.5, every: 10, gust: 0.45, lull: 0.55 },
        line: { start: 12, most: 28 },
        spots: [
            S(3, 16, 66),
            S(4, 21, 48),
            S(6, 24, 62),
            S(8, 18, 78),
            S(9, 20, 42),
            S(10, 26, 74),
            S(12, 26, 50),
        ],
        trees: [
            { x: 27, size: 9 },
            { x: 38, size: 11, eats: true },
            { x: 52, size: 9 },
        ],
        preview: 0.7,
        shape: "diamond",
        tone: "mint",
    },
    {
        title: "Up over the town",
        goal: "Keep the kite higher than 35 metres while you count to three.",
        prompt: "The pole counts the metres in tens. Let the line out and fly higher than 35, halfway between 30 and 40, and keep it there for three seconds. Keep off the roofs and away from the power lines.",
        grades: [2, 3],
        place: "town",
        ask: { kind: "height", m: 35, hold: 3 },
        wind: { usual: 5.5, every: 10, gust: 0.45, lull: 0.5 },
        line: { start: 14, most: 36 },
        spots: [],
        roofs: [
            { x: 24, count: 1 },
            { x: 33, count: 2 },
            { x: 58, count: 1 },
        ],
        wires: [{ x0: 27, x1: 56, h: 11 }],
        preview: 0.7,
        shape: "box",
        tone: "glow",
    },
    {
        title: "Twenty-five in the autumn wind",
        goal: "Make exactly 25 in two flights.",
        prompt: "Make exactly 25. The wind gusts and drops, and a crash ends a flight: you have two.",
        grades: [2, 3],
        place: "autumn",
        ask: { kind: "sum", total: 25 },
        wind: { usual: 5.5, every: 8, gust: 0.5, lull: 0.6 },
        line: { start: 12, most: 30 },
        spots: [
            S(5, 16, 68),
            S(10, 22, 44),
            S(2, 14, 46),
            S(3, 25, 66),
            S(7, 19, 80),
            S(8, 27, 52),
            S(4, 21, 58),
            S(6, 12, 60),
        ],
        flights: 2,
        preview: 0.5,
        shape: "delta",
        tone: "berry",
    },
    {
        title: "Doubles on the windy hill",
        goal: "Pop the doubles the board asks for, in order.",
        prompt: "The board asks for a double: double 7 is 7 and 7 more. Pop that balloon, or catch the bird that carries it.",
        grades: [3, 3],
        place: "hill",
        ask: { kind: "double", of: [7, 6, 9] },
        doubles: [
            [7, 6, 9],
            [8, 5, 7],
            [6, 9, 8],
        ],
        wind: { usual: 6, every: 8, gust: 0.55, lull: 0.6 },
        line: { start: 14, most: 32 },
        spots: [
            S(10, 18, 70),
            S(13, 22, 48),
            S(14, 26, 62),
            S(16, 16, 42),
            S(7, 28, 78),
            S(18, 25, 38),
            S(9, 20, 58),
        ],
        birds: [
            { n: 12, height: 24, speed: 2.4, from: 10 },
            { n: 21, height: 16, speed: 1.8, from: 50 },
        ],
        preview: 0,
        shape: "diamond",
        tone: "tang",
    },
    {
        title: "Fifty at the festival",
        goal: "Make exactly 50 before the festival ends.",
        prompt: "Make exactly 50 with fives and tens before the clock runs out, and dodge the other kites.",
        grades: [3, 4],
        place: "festival",
        ask: { kind: "sum", total: 50 },
        wind: { usual: 5.5, every: 9, gust: 0.45, lull: 0.55 },
        line: { start: 14, most: 34 },
        spots: [
            S(5, 17, 64),
            S(10, 23, 46),
            S(15, 28, 70),
            S(20, 20, 80),
            S(25, 30, 52),
            S(30, 25, 36),
        ],
        others: [
            { x: 26, line: 16, deg: 66, swing: 14, period: 9 },
            { x: 44, line: 15, deg: 70, swing: 18, period: 11 },
        ],
        time: 150,
        preview: 0,
        shape: "box",
        tone: "sky",
    },
    {
        title: "Sixes on the gusty beach",
        goal: "Pop 6, 12, 18 and 24 in order, in three flights.",
        prompt: "Count by sixes: 6, 12, 18, 24. The gusts are strong, and a crash ends a flight: you have three.",
        grades: [4, 4],
        place: "beach",
        ask: { kind: "order", seq: [6, 12, 18, 24] },
        wind: { usual: 6, every: 7, gust: 0.6, lull: 0.6 },
        line: { start: 14, most: 34 },
        spots: [
            S(6, 18, 72),
            S(9, 24, 48),
            S(12, 28, 64),
            S(15, 16, 44),
            S(18, 22, 82),
            S(20, 30, 40),
            S(21, 26, 56),
            S(24, 31, 70),
        ],
        wires: [{ x0: 30, x1: 60, h: 10 }],
        flights: 3,
        preview: 0,
        shape: "delta",
        tone: "glow",
    },
    {
        title: "Free sky",
        goal: "Fly as high as you can.",
        prompt: "Fly as high as you like and pop what you like. The pole keeps your best height.",
        grades: [1, 4],
        place: "sky",
        ask: { kind: "free" },
        wind: { usual: 5.5, every: 12, gust: 0.4, lull: 0.4 },
        line: { start: 12, most: 50 },
        spots: [
            S(1, 14, 66),
            S(2, 20, 48),
            S(5, 26, 70),
            S(10, 32, 56),
            S(3, 18, 36),
            S(4, 36, 76),
            S(6, 40, 50),
        ],
        birds: [{ n: 10, height: 30, speed: 2, from: 20 }],
        preview: 1.0,
        shape: "diamond",
        tone: "mint",
    },
];

/** The height pole stands behind Charlie, its marks every ten metres, a metre to a square. */
const POLE = { x: 5.5, from: 0, to: 50 };
/** Where the wind sock stands, upwind of everything, so it shows a gust before the kite feels it. */
const SOCK = 3;

export const KITE = {
    lift: knob(
        2.2,
        1.4,
        3,
        0.1,
        "airspeed for each square a second of wind",
        "high enough that a kite left alone rests well up, not so high that it never stalls in a lull",
    ),
    turn: knob(
        2.6,
        1.4,
        4,
        0.1,
        "radians a second",
        "how quickly a held steer turns the nose: a loop about three squares across",
    ),
    stall: knob(
        5,
        3,
        7,
        0.25,
        "squares a second",
        "the airspeed under which the kite starts to sink, so a deep lull brings it down unless the line is pulled",
    ),
    reelIn: knob(4, 2, 8, 0.5, "squares a second", "how quickly pulling brings the line in"),
    reelOut: knob(
        4,
        2,
        8,
        0.5,
        "squares a second",
        "how quickly letting out pays the line out: slow enough that a climb takes a while to ride",
    ),
};

export function rigOf(L: KiteLevel): Rig {
    return {
        lift: KITE.lift.value,
        turn: KITE.turn.value,
        right: L.gentle ? 3.2 : 2.2,
        keel: L.gentle ? 2.2 : 0,
        stall: KITE.stall.value * (L.gentle ? 0.8 : 1),
        sink: 6,
        heavy: 5,
        dive: 5,
        pull: 4,
        reelIn: KITE.reelIn.value,
        reelOut: KITE.reelOut.value,
        least: 5,
        most: L.line.most,
    };
}

const at = (r: number, deg: number): Pt => ({
    x: HANDS.x + r * Math.cos((deg * Math.PI) / 180),
    y: HANDS.y - r * Math.sin((deg * Math.PI) / 180),
});

/** A balloon or a bird in the sky: where it belongs, where it is pushed to, and how long until a popped one comes back. */
export interface Puff {
    n: number;
    tone: Tone;
    home: Pt;
    off: Pt;
    v: Pt;
    /** Steps until it is back, or nought while it is there. */
    gone: number;
    /** The step it last refused the kite, so it says why once. */
    no: number;
    bird?: { speed: number; from: number; height: number };
}

export interface KiteState {
    phase: number;
    L: KiteLevel;
    steps: number;
    kite: Kite;
    tail: Pt[];
    changes: Change[];
    puffs: Puff[];
    /** The numbers that counted, in the order they did. */
    counted: number[];
    /** How far along an ordered ask, or a free flight's score. */
    next: number;
    score: number;
    flights: number;
    /** Steps the kite lies on the grass after a crash, stuck in a tree, or tumbling, and until a tug is ready again. */
    down: number;
    snag: number;
    tumble: number;
    cool: number;
    hands: Hands;
    /** What the hands did this step, for Charlie and the reel. */
    pulling: boolean;
    letting: boolean;
    /** The highest the kite has been this try and ever, in metres, and steps it has stayed above a height asked for. */
    top: number;
    above: number;
    best: number;
    cam: Cam;
    pups: { x: number; v: number }[];
    pops: { text: string; x: number; y: number; step: number; counted: boolean }[];
    won: boolean;
    out: boolean;
    touched: boolean;
    note: string;
    cheer: number;
    /** The change the line under the goal last spoke of, so a lull is told once. */
    told: number;
}

const launchKite = (L: KiteLevel): Kite => {
    const p = at(L.line.start - 0.2, 45);
    return { x: p.x, y: p.y, vx: 0, vy: 0, a: 0, u: 6, line: L.line.start };
};

const tailOf = (k: Kite): Pt[] =>
    Array.from({ length: 6 }, (_, i) => ({ x: k.x + 0.2 * i, y: k.y + 1.2 + 0.7 * i }));

/** Where a bird is `t` seconds in: across the world and round again, bobbing as it flies. */
const birdAt = (b: { speed: number; from: number; height: number }, t: number): Pt => {
    const span = WORLD.w + 10,
        x = ((((b.from + b.speed * t) % span) + span) % span) - 5;
    return { x, y: GROUND - b.height + Math.sin(t * 2.1 + b.from) * 0.4 };
};

/**
 * Where the camera wants to be: far enough back to hold Charlie, the kite and every balloon, with
 * room over them for the board, so a child sees what to fly at; past the farthest it draws back, it
 * keeps the kite in sight and lets the ground go.
 */
function cameraFor(k: Pt, targets: readonly Pt[]): Cam {
    let x0 = Math.min(HANDS.x - 6, k.x - 4),
        x1 = Math.max(HANDS.x + 8, k.x + 4),
        y0 = Math.min(GROUND - 10, k.y - 4);
    for (const p of targets) {
        x0 = Math.min(x0, p.x - 2.5);
        x1 = Math.max(x1, p.x + 2.5);
        y0 = Math.min(y0, p.y - 2);
    }
    const y1 = GROUND + 2,
        zoom = Math.max(0.55, Math.min(1, VIEW.w / (x1 - x0), VIEW.h / (y1 - y0 + 5)));
    const hh = VIEW.h / zoom / 2;
    const y = Math.min((y0 - 5 + y1) / 2, k.y + hh - 5);
    return { x: (x0 + x1) / 2, y, zoom };
}

/** The balloons and birds the camera keeps in view: those in the sky now, where they belong. */
const targetsOf = (s: KiteState): Pt[] =>
    s.puffs.filter((p) => !p.bird && p.gone === 0).map((p) => p.home);

export function startKite(L: KiteLevel, phase = 0, seed = 1): KiteState {
    const kite = launchKite(L);
    const s: KiteState = {
        phase,
        L,
        steps: 0,
        kite,
        tail: tailOf(kite),
        changes: changesOf(seed * 7919 + phase * 104729 + 17, {
            every: L.wind.every,
            gust: L.wind.gust,
            lull: L.wind.lull,
            seconds: 600,
        }),
        puffs: [
            ...L.spots.map((sp, i) => ({
                n: sp.n,
                tone: TONES[i % TONES.length] ?? "berry",
                home: at(sp.r, sp.deg),
                off: { x: 0, y: 0 },
                v: { x: 0, y: 0 },
                gone: 0,
                no: -999,
            })),
            ...(L.birds ?? []).map((b, i) => ({
                n: b.n,
                tone: TONES[(i + 2) % TONES.length] ?? "sky",
                home: birdAt(b, 0),
                off: { x: 0, y: 0 },
                v: { x: 0, y: 0 },
                gone: 0,
                no: -999,
                bird: { speed: b.speed, from: b.from, height: b.height },
            })),
        ],
        counted: [],
        next: 0,
        score: 0,
        flights: 0,
        down: 0,
        snag: 0,
        tumble: 0,
        cool: 0,
        hands: { steer: 0, toward: null, reel: 0 },
        pulling: false,
        letting: false,
        top: 0,
        above: 0,
        best: 0,
        cam: { x: 0, y: 0, zoom: 1 },
        pups: [
            { x: 15, v: 0 },
            { x: 12, v: 0 },
        ],
        pops: [],
        won: false,
        out: false,
        touched: false,
        note: "",
        cheer: -999,
        told: -1,
    };
    s.cam = cameraFor(kite, targetsOf(s));
    return s;
}

/** Metres above the grass, a square to a metre. */
export const heightOf = (p: Pt): number => Math.max(0, GROUND - p.y);

/** Where a balloon or a bird is now. */
export function puffAt(p: Puff, t: number, i: number): Pt {
    const home = p.bird ? birdAt(p.bird, t) : p.home;
    const bob = p.bird ? 0 : 1;
    return {
        x: home.x + p.off.x + Math.sin(t * 0.9 + i * 1.7) * 0.35 * bob,
        y: home.y + p.off.y + Math.cos(t * 0.7 + i * 2.3) * 0.45 * bob,
    };
}

/** The wind aloft at `x` now, and the day's usual. */
export const airAt = (s: KiteState, x: number, t = s.steps / RATE) => ({
    now: windAt(s.L.wind.usual, s.changes, x, t),
    usual: s.L.wind.usual,
});

export function askWords(s: KiteState): string {
    const a = s.L.ask;
    switch (a.kind) {
        case "count":
            return `Pop ${a.count} balloons`;
        case "sum":
            return `Make exactly ${a.total}`;
        case "even":
            return `Pop ${a.count} different even numbers`;
        case "order":
            return `In order: ${a.seq.join(", ")}`;
        case "height":
            return `Fly higher than ${a.m} m`;
        case "double": {
            const n = a.of[s.next];
            return n === undefined ? "All the doubles" : `Double ${n}`;
        }
        case "free":
            return "Free sky";
    }
}

export function tallyWords(s: KiteState): string {
    const a = s.L.ask,
        c = s.counted;
    const flights =
        s.L.flights !== undefined
            ? ` · flight ${Math.min(s.flights + 1, s.L.flights)} of ${s.L.flights}`
            : "";
    const clock =
        s.L.time !== undefined
            ? ` · ${Math.max(0, Math.ceil(s.L.time - s.steps / RATE))} s left`
            : "";
    switch (a.kind) {
        case "count":
            return `${c.length} of ${a.count}`;
        case "sum": {
            const sum = c.reduce((x, y) => x + y, 0);
            const said = c.length ? `${c.join(" + ")} = ${sum}` : "0 so far";
            return `${said}${flights}${clock}`;
        }
        case "even":
            return c.length ? `${c.join(", ")} · ${a.count - c.length} more` : "None yet";
        case "order":
            return s.next < a.seq.length ? `Next: ${a.seq[s.next] ?? ""}${flights}` : "All popped";
        case "height":
            return s.won ? `${Math.round(s.top)} m` : `Best so far: see the pole`;
        case "double":
            return `${s.next} of ${a.of.length} doubles`;
        case "free":
            return `Highest ${Math.round(Math.max(s.best, s.top))} m · score ${s.score}`;
    }
}

const sumOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

function win(s: KiteState, out: Happening[], words: string): void {
    s.won = true;
    s.note = words;
    s.cheer = s.steps;
    out.push(
        { event: { kind: "won" } },
        { cue: "win" },
        { burst: { kind: "sparkle", x: s.kite.x, y: s.kite.y, n: 18 } },
    );
}

/** Whether the kite popping `n` counts, and what to say when it does not; null is a balloon that bounces away whole. */
function verdict(s: KiteState, n: number): { counts: boolean; pops: boolean; why: string } {
    const a = s.L.ask;
    switch (a.kind) {
        case "count":
        case "free":
            return { counts: true, pops: true, why: "" };
        case "sum": {
            const sum = sumOf(s.counted);
            return sum + n <= a.total
                ? { counts: true, pops: true, why: "" }
                : {
                      counts: false,
                      pops: false,
                      why: `${sum} + ${n} would be ${sum + n}, past ${a.total}.`,
                  };
        }
        case "even":
            return n % 2 === 1
                ? { counts: false, pops: true, why: `${n} is odd, so it does not count.` }
                : s.counted.includes(n)
                  ? {
                        counts: false,
                        pops: true,
                        why: `${n} is counted already. Find another even number.`,
                    }
                  : { counts: true, pops: true, why: "" };
        case "order": {
            const want = a.seq[s.next];
            return n === want
                ? { counts: true, pops: true, why: "" }
                : {
                      counts: false,
                      pops: false,
                      why: `Not ${n} yet: the next is ${want ?? "nothing"}.`,
                  };
        }
        case "double": {
            const of = a.of[s.next];
            return of !== undefined && n === of * 2
                ? { counts: true, pops: true, why: "" }
                : {
                      counts: false,
                      pops: false,
                      why:
                          of === undefined
                              ? ""
                              : `${n} is not double ${of}. Double ${of} is ${of} and ${of} more.`,
                  };
        }
        case "height":
            return { counts: false, pops: true, why: "" };
    }
}

function popAt(s: KiteState, i: number, out: Happening[]): void {
    const p = s.puffs[i];
    if (!p || p.gone > 0) return;
    const L = s.L,
        a = L.ask,
        t = s.steps / RATE,
        where = puffAt(p, t, i);
    const v = verdict(s, p.n);
    const pan = panOf(where.x, s.cam.x, VIEW.w / s.cam.zoom);
    if (!v.pops) {
        // it bounces off the kite and drifts home again, and says why once
        p.v = {
            x: s.kite.vx * 0.6 + (where.x - s.kite.x) * 2,
            y: s.kite.vy * 0.6 + (where.y - s.kite.y) * 2,
        };
        if (s.steps - p.no > RATE * 1.5) {
            s.note = v.why;
            out.push({ cue: "nope", pan });
        }
        p.no = s.steps;
        return;
    }
    p.gone = Math.round(RATE * (p.bird ? 7 : 5));
    p.off = { x: 0, y: 0 };
    p.v = { x: 0, y: 0 };
    out.push(
        { cue: "ring", strength: 0.6, pitch: 0.9 + Math.min(0.8, p.n / 30), pan },
        { burst: { kind: "sparkle", x: where.x, y: where.y, n: 8 } },
    );
    s.pops = [
        ...s.pops.filter((q) => s.steps - q.step < RATE),
        {
            text: v.counts ? (a.kind === "sum" ? `+${p.n}` : `${p.n}`) : `${p.n}`,
            x: where.x,
            y: where.y,
            step: s.steps,
            counted: v.counts,
        },
    ];
    if (!v.counts) {
        s.note = v.why;
        out.push({ cue: "nope", strength: 0.4, pan });
        return;
    }
    s.counted = [...s.counted, p.n];
    if (a.kind === "order" || a.kind === "double") s.next++;
    if (a.kind === "free") {
        s.score += p.n;
        s.note = `${p.n}! The score is ${s.score}.`;
        return;
    }
    const sum = sumOf(s.counted);
    switch (a.kind) {
        case "count":
            if (s.counted.length >= a.count)
                win(s, out, `${a.count} balloons popped: ${s.counted.join(", ")}. Well flown!`);
            else s.note = `${s.counted.length} popped. ${a.count - s.counted.length} to go.`;
            break;
        case "sum":
            if (sum === a.total) win(s, out, `${s.counted.join(" + ")} = ${a.total}. Exactly!`);
            else
                s.note = `${s.counted.join(" + ")} = ${sum}. ${a.total - sum} more to make ${a.total}.`;
            break;
        case "even":
            if (s.counted.length >= a.count)
                win(s, out, `${s.counted.join(", ")}: four even numbers. Well flown!`);
            else s.note = `${p.n} is even. ${a.count - s.counted.length} more to find.`;
            break;
        case "order":
            if (s.next >= a.seq.length)
                win(s, out, `${a.seq.join(", ")}: counted all the way. Well flown!`);
            else s.note = `${p.n}! Next is ${a.seq[s.next] ?? ""}.`;
            break;
        case "double": {
            const of = a.of[s.next - 1] ?? 0;
            if (s.next >= a.of.length) win(s, out, `Double ${of} is ${p.n}. Every double found!`);
            else s.note = `Double ${of} is ${p.n}. Now double ${a.of[s.next] ?? ""}.`;
            break;
        }
    }
}

/** A crash on the grass or a roof: a moment down, and a flight gone where flights are counted. */
function crash(s: KiteState, out: Happening[], words: string): void {
    s.down = Math.round(RATE * 1.1);
    s.flights++;
    s.kite.vx = 0;
    s.kite.vy = 0;
    s.kite.u = 0;
    s.tumble = 0;
    out.push(
        { cue: "crash", strength: 0.5, pan: panOf(s.kite.x, s.cam.x, VIEW.w / s.cam.zoom) },
        { puff: { x: s.kite.x, y: s.kite.y + 0.6, n: 5 } },
        { shake: 0.2 },
    );
    const L = s.L;
    if (L.flights !== undefined && s.flights >= L.flights && !s.won) {
        s.out = true;
        s.note =
            L.ask.kind === "sum"
                ? `The last flight came down at ${sumOf(s.counted)}, and the target was ${L.ask.total}.`
                : "That was the last flight. Have another go.";
        return;
    }
    s.note = words;
}

function relaunch(s: KiteState): void {
    s.kite = launchKite(s.L);
    s.tail = tailOf(s.kite);
}

const wireY = (w: { x0: number; x1: number; h: number }, x: number) => {
    const u = (x - w.x0) / (w.x1 - w.x0);
    return GROUND - w.h + 1.2 * 4 * u * (1 - u);
};

/** Where another flyer's kite is now. */
export function otherAt(o: NonNullable<KiteLevel["others"]>[number], t: number): Pt {
    const deg = o.deg + o.swing * Math.sin((t / o.period) * Math.PI * 2),
        r = (deg * Math.PI) / 180;
    return { x: o.x + o.line * Math.cos(r), y: GROUND - 2.6 - o.line * Math.sin(r) };
}

/** What the kite touches besides balloons: a roof or the grass, a tree, a power line, another kite. */
function obstacles(s: KiteState, out: Happening[]): void {
    const k = s.kite,
        L = s.L,
        t = s.steps / RATE;
    if (k.y >= GROUND - 0.6) {
        crash(s, out, "The kite came down on the grass. Charlie sends it up again.");
        return;
    }
    for (const r of L.roofs ?? []) {
        const w = r.count * 5 + 1;
        if (Math.abs(k.x - r.x) < w / 2 && k.y > GROUND - 9) {
            crash(s, out, "The kite came down on a roof. Charlie sends it up again.");
            return;
        }
    }
    if (s.snag > 0 || s.tumble > 0) return;
    for (const tree of L.trees ?? []) {
        const c = { x: tree.x, y: GROUND - tree.size * 0.62 },
            r = tree.size * 0.36;
        if (Math.hypot(k.x - c.x, k.y - c.y) > r) continue;
        if (tree.eats) {
            s.snag = Math.round(RATE * 1.3);
            s.note = "The tree that eats kites caught it! Charlie tugs it free.";
            out.push({ cue: "creak", strength: 0.6 }, { shake: 0.15 });
        } else tumbled(s, out, "The kite brushed a tree and tumbled.");
        return;
    }
    for (const w of L.wires ?? [])
        if (k.x > w.x0 - 0.5 && k.x < w.x1 + 0.5 && Math.abs(k.y - wireY(w, k.x)) < 0.7) {
            // knocked clear of the wire on the side it came from, so it never hangs there
            const side = k.y < wireY(w, k.x) ? -1 : 1;
            k.y = wireY(w, k.x) + side * 0.9;
            k.vy = side * 2;
            tumbled(s, out, "Careful! Real kites always stay far away from power lines.");
            return;
        }
    for (const o of L.others ?? [])
        if (Math.hypot(k.x - otherAt(o, t).x, k.y - otherAt(o, t).y) < 1.7) {
            tumbled(s, out, "Two kites bumped! Steer round the other kites.");
            return;
        }
}

function tumbled(s: KiteState, out: Happening[], words: string): void {
    s.tumble = Math.round(RATE * 0.55);
    s.kite.u *= 0.4;
    s.note = words;
    out.push({ cue: "bump", strength: 0.5, pan: panOf(s.kite.x, s.cam.x, VIEW.w / s.cam.zoom) });
}

/** What the pad asks of the kite this step. */
export function handsOf(s: KiteState, pad: Pad): Hands {
    const left = pad.holding.includes("left"),
        right = pad.holding.includes("right");
    let steer = 0;
    if (left !== right) steer = right ? 1 : -1;
    else if (left && right) steer = pad.held === "right" ? 1 : -1;
    let reel: -1 | 0 | 1 = 0;
    // up lets the line out and down pulls it in, so the arrow points the way the kite goes
    const pullKeys = pad.holding.includes("down") || pad.go,
        letKeys = pad.holding.includes("up") || pad.brake;
    const touch = pad.touch;
    if (touch && !pullKeys && !letKeys) {
        // a finger in the sky is where the kite should go, and the line goes out or comes in to reach it
        const want = Math.hypot(touch.x - HANDS.x, touch.y - HANDS.y);
        if (s.kite.line < want - 0.6) reel = -1;
        else if (s.kite.line > want + 0.6) reel = 1;
    }
    if (pullKeys !== letKeys) reel = pullKeys ? 1 : -1;
    return { steer: touch ? 0 : steer, toward: touch ? { x: touch.x, y: touch.y } : null, reel };
}

export function stepKiteGame(s: KiteState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (pad.touch || pad.holding.length || pad.tapped || pad.go || pad.brake) s.touched = true;
    if (s.won || s.out) {
        settle(s);
        return out;
    }
    const L = s.L,
        t = s.steps / RATE;
    if (L.time !== undefined && t >= L.time) {
        s.out = true;
        s.note =
            L.ask.kind === "sum"
                ? `The festival is over at ${sumOf(s.counted)}, and the target was ${L.ask.total}.`
                : "The time is up. Have another go.";
        return out;
    }
    const k = s.kite;
    const hands = handsOf(s, pad);
    s.hands = hands;
    s.pulling = hands.reel === 1;
    s.letting = hands.reel === -1;
    if (s.cool > 0) s.cool--;
    if (s.down > 0) {
        s.down--;
        if (s.down === 0) relaunch(s);
        moveAround(s);
        return out;
    }
    if (s.snag > 0) {
        s.snag--;
        if (s.snag === 0) {
            const back = Math.hypot(k.x - HANDS.x, k.y - HANDS.y);
            k.line = Math.max(5, Math.min(k.line, back) - 3);
            const toward = { x: HANDS.x - k.x, y: HANDS.y - k.y },
                d = Math.hypot(toward.x, toward.y) || 1;
            k.x += (toward.x / d) * 3;
            k.y += (toward.y / d) * 3 - 2;
            k.a = 0;
            k.u = 5;
            k.vx = 0;
            k.vy = 0;
        }
        moveAround(s);
        return out;
    }
    if (pad.tapped && s.cool === 0) {
        k.u += 3.5;
        k.line = Math.max(5, k.line - 0.8);
        s.cool = Math.round(RATE * 0.6);
        out.push({ cue: "lift", strength: 0.45 });
    }
    const rig = rigOf(L),
        field = { hands: HANDS, ground: GROUND };
    const wasTaut = Math.hypot(k.x - HANDS.x, k.y - HANDS.y) >= k.line - 0.3;
    for (let i = 0; i < SUB; i++) {
        // each substep reads the wind at the moment it ends, as aheadOf does, so the dots and the flight agree
        const air = airAt(s, k.x, (s.steps - 1) / RATE + (i + 1) * DT);
        if (s.tumble > 0) {
            k.a += 9 * DT;
            stepKite(k, field, air, { steer: 0, toward: null, reel: hands.reel }, rig, DT);
            k.a += 9 * DT;
        } else stepKite(k, field, air, hands, rig, DT);
        stepTail(s.tail, tailRoot(k), air.now, DT);
    }
    if (s.tumble > 0) s.tumble--;
    const taut = Math.hypot(k.x - HANDS.x, k.y - HANDS.y) >= k.line - 0.3;
    if (taut && !wasTaut && Math.hypot(k.vx, k.vy) > 3)
        out.push({ cue: "place", strength: 0.25, pitch: 1.4 });
    s.top = Math.max(s.top, heightOf(k));
    if (L.ask.kind === "free") s.best = Math.max(s.best, s.top);
    speak(s, t);
    obstacles(s, out);
    if (s.down === 0 && !s.out)
        s.puffs.forEach((p, i) => {
            if (p.gone > 0) return;
            const where = puffAt(p, t, i);
            if (Math.hypot(where.x - k.x, where.y - k.y) < REACH) popAt(s, i, out);
        });
    if (L.ask.kind === "height" && !s.won && s.down === 0) held(s, L.ask, out);
    moveAround(s);
    return out;
}

/** A height asked for, held: counted aloud in whole seconds, and started again when the kite drops under it. */
function held(s: KiteState, a: { m: number; hold: number }, out: Happening[]): void {
    if (heightOf(s.kite) <= a.m) {
        if (s.above > RATE * 0.3) s.note = `Under ${a.m} again. Climb back up and hold it there.`;
        s.above = 0;
        return;
    }
    s.above++;
    if (s.above === 1) s.note = `Above ${a.m} m! Hold it there: 1...`;
    else if (s.above % RATE === 0 && s.above < a.hold * RATE)
        s.note = `Above ${a.m} m! Hold it there: ${s.above / RATE + 1}...`;
    if (s.above >= a.hold * RATE)
        win(
            s,
            out,
            `${Math.round(heightOf(s.kite))} metres, held for ${a.hold} seconds: above ${a.m}, past halfway from ${Math.floor(a.m / 10) * 10} to ${Math.ceil(a.m / 10) * 10}. Well flown!`,
        );
}

/** The line under the goal, when the wind changes where the kite is. */
function speak(s: KiteState, t: number): void {
    s.changes.forEach((c, i) => {
        if (i <= s.told || changeAt(c, s.kite.x, t) <= 0) return;
        s.told = i;
        s.note =
            c.amp < 0
                ? "The wind is dropping. Pull the line in to keep the kite up."
                : "A gust! Let the line out to ride it higher.";
    });
}

/** The balloons drift home, popped ones come back, the pups run, and the camera follows. */
function moveAround(s: KiteState): void {
    for (const p of s.puffs) {
        if (p.gone > 0) {
            p.gone--;
            continue;
        }
        p.off.x += p.v.x / RATE;
        p.off.y += p.v.y / RATE;
        p.v.x = p.v.x * 0.94 - p.off.x * 0.08;
        p.v.y = p.v.y * 0.94 - p.off.y * 0.08;
    }
    s.pups.forEach((p, i) => {
        const want = s.kite.x - i * 3;
        p.v += (Math.max(-6, Math.min(6, (want - p.x) * 2)) - p.v) * 0.08;
        p.x = Math.max(12, Math.min(WORLD.w - 4, p.x + p.v / RATE));
    });
    settle(s);
}

function settle(s: KiteState): void {
    s.cam = follow(s.cam, cameraFor(s.kite, targetsOf(s)), {
        rate: 2.6,
        zoomRate: 1.2,
        dt: 1 / RATE,
        view: VIEW,
        world: WORLD,
    });
}

/** Where the kite goes in the next `seconds` with the hands as they are, by the same step it flies by, as dots. */
export function aheadOf(s: KiteState, seconds: number): Pt[] {
    const k = structuredClone(s.kite),
        rig = rigOf(s.L),
        field = { hands: HANDS, ground: GROUND },
        t = s.steps / RATE,
        pts: Pt[] = [];
    const n = Math.round(seconds * RATE * SUB);
    for (let i = 1; i <= n; i++) {
        stepKite(k, field, airAt(s, k.x, t + i * DT), s.hands, rig, DT);
        if (i % (SUB * 5) === 0) pts.push({ x: k.x, y: k.y });
        if (k.y >= GROUND - 0.6) break;
    }
    return pts;
}

const recent = (at: number, now: number, within: number) => now - at < within;

const CHARLIE_LOOK = {
    hair: "ponytail",
    top: "tang",
    sleeves: "short",
    print: "star",
    wear: "shorts",
    bottom: "sky",
    pattern: "plain",
    feet: "shoes",
    dir: 1,
};

/** The scenery a place has, behind and round Charlie: hills, the sea, houses, trees and bunting. */
function scenery(s: KiteState, sprites: Sprite[]): void {
    const place = s.L.place,
        ground =
            place === "beach"
                ? "sand"
                : place === "autumn"
                  ? "leaves"
                  : place === "town"
                    ? "path"
                    : "grass";
    // the lengths overlap a little, so the ruled line runs on unbroken where one meets the next
    for (let x = -20; x < WORLD.w + 20; x += 19.4)
        sprites.push({
            key: `ground:${x}`,
            art: "kiteground",
            params: { w: 20, ground },
            x: x + 10,
            y: GROUND + 0.9,
            z: 2,
            still: true,
        });
    if (place === "beach")
        sprites.push({
            key: "sea",
            art: "sea",
            params: { across: 36, deep: 6, x0: 0, bed: false },
            x: 66,
            y: GROUND - 0.4,
            stand: true,
            depth: 0.5,
            z: 1,
            still: true,
        });
    const far: Record<Place, Sprite[]> = {
        meadow: [0, 1, 2].map((i) => ({
            key: `hill:${i}`,
            art: "parkhill",
            params: { w: 18, h: 4 + (i % 2) * 2, snow: 0 },
            x: 8 + i * 26,
            y: GROUND,
            stand: true,
            depth: 0.4,
            z: 0,
            alpha: 0.6,
            still: true,
        })),
        beach: [],
        hill: [0, 1].map((i) => ({
            key: `hill:${i}`,
            art: "parkhill",
            params: { w: 24, h: 7 - i * 2, snow: 0 },
            x: 14 + i * 34,
            y: GROUND,
            stand: true,
            depth: 0.45,
            z: 0,
            alpha: 0.55,
            still: true,
        })),
        park: [0, 1, 2].map((i) => ({
            key: `hedge:${i}`,
            art: "hedge",
            params: { clumps: 5, berries: 2, gap: 0 },
            x: 6 + i * 24,
            y: GROUND,
            stand: true,
            depth: 0.6,
            z: 0,
            alpha: 0.7,
            size: 16,
            still: true,
        })),
        town: [0, 1, 2].map((i) => ({
            key: `town:${i}`,
            art: "houses",
            params: { count: 4, windows: 2 },
            x: 10 + i * 28,
            y: GROUND,
            stand: true,
            depth: 0.4,
            z: 0,
            alpha: 0.4,
            still: true,
        })),
        autumn: [0, 1, 2, 3].map((i) => ({
            key: `trees:${i}`,
            art: "seasontrees",
            params: { seasons: ["autumn"], names: 0 },
            x: 16 + i * 18,
            y: GROUND,
            stand: true,
            depth: 0.5,
            z: 0,
            alpha: 0.6,
            size: 7,
            still: true,
        })),
        festival: [0, 1, 2].map((i) => ({
            key: `bunting:${i}`,
            art: "strokes.bunting",
            x: 18 + i * 22,
            y: GROUND - 7,
            size: 20,
            z: 1,
            still: true,
        })),
        sky: [0, 1].map((i) => ({
            key: `hill:${i}`,
            art: "parkhill",
            params: { w: 24, h: 3, snow: 0 },
            x: 20 + i * 36,
            y: GROUND,
            stand: true,
            depth: 0.4,
            z: 0,
            alpha: 0.5,
            still: true,
        })),
    };
    sprites.push(...far[place]);
    const t = s.steps / RATE;
    for (let i = 0; i < 7; i++) {
        const span = WORLD.w + 24,
            x = ((((i * 23 + t * s.L.wind.usual * 0.18) % span) + span) % span) - 12;
        sprites.push({
            key: `cloud:${i}`,
            art: "cloud",
            params: { puffs: 3 + (i % 3), rain: 0 },
            x,
            y: 16 + ((i * 17) % 26),
            size: 5 + (i % 3),
            z: 0,
            alpha: 0.75,
        });
    }
    for (const tree of s.L.trees ?? [])
        sprites.push(
            tree.eats
                ? {
                      key: `tree:${tree.x}`,
                      art: "kitetree",
                      params: { kites: 2 },
                      x: tree.x,
                      y: GROUND,
                      size: tree.size,
                      stand: true,
                      z: 4,
                      ...(s.snag > 0 ? {} : { still: true }),
                  }
                : {
                      key: `tree:${tree.x}`,
                      art: "tree",
                      params: { fruit: 0, fallen: 0, item: "apple" },
                      x: tree.x,
                      y: GROUND,
                      size: tree.size,
                      stand: true,
                      z: 4,
                      still: true,
                  },
        );
    for (const r of s.L.roofs ?? [])
        sprites.push({
            key: `roof:${r.x}`,
            art: "houses",
            params: { count: r.count, windows: 2 },
            x: r.x,
            y: GROUND,
            stand: true,
            z: 4,
            still: true,
        });
    for (const w of s.L.wires ?? [])
        sprites.push({
            key: `wire:${w.x0}`,
            art: "powerline",
            params: { span: Math.round(w.x1 - w.x0), h: w.h },
            x: (w.x0 + w.x1) / 2,
            y: GROUND,
            stand: true,
            z: 4,
            still: true,
        });
}

/** Streaks where a gust is blowing, carried across with its front, so a child sees it coming. */
function streaks(s: KiteState, sprites: Sprite[], rest: boolean): void {
    if (rest) return;
    const t = s.steps / RATE;
    s.changes.forEach((c, i) => {
        if (c.amp <= 0) return;
        const len = c.rise + c.hold + c.fall,
            x1 = (t - c.at) * FRONT,
            x0 = x1 - len * FRONT;
        if (x1 < -5 || x0 > WORLD.w + 5) return;
        for (let j = 0; j < 9; j++) {
            const x = x0 + ((j * 7.3 + t * FRONT * 0.6) % (len * FRONT)),
                strength = changeAt(c, x, t);
            if (strength < 0.15 || x < -4 || x > WORLD.w + 4) continue;
            sprites.push({
                key: `gust:${i}:${j}`,
                art: "guststreak",
                params: { length: 4 + (j % 3), curl: j % 2 },
                x,
                y: GROUND - 6 - ((j * 13 + i * 7) % 40),
                size: 4 + (j % 3),
                z: 3,
                alpha: Math.min(0.8, strength * c.amp * 1.6),
            });
        }
    });
}

export function kiteFrame(s: KiteState, rest = false): Frame {
    const L = s.L,
        k = s.kite,
        t = s.steps / RATE,
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    scenery(s, sprites);
    streaks(s, sprites, rest);
    // a metre to a square, so the pole reads the kite's height
    if (L.ask.kind === "height" || L.ask.kind === "free")
        for (let m = POLE.from; m < POLE.to; m += 10)
            sprites.push({
                key: `pole:${m}`,
                art: "heightpole",
                params: { from: m, top: m + 10 >= POLE.to },
                x: POLE.x,
                y: GROUND - m,
                stand: true,
                z: 3,
                still: true,
            });
    const air = airAt(s, SOCK, t),
        wind = Math.max(0, Math.min(1, Math.round((air.now / air.usual) * 2) / 4));
    sprites.push({
        key: "sock",
        art: "windsock",
        params: { wind, stripes: 5 },
        x: SOCK,
        y: GROUND,
        stand: true,
        z: 3,
        live: true,
    });
    const cheering = s.won || recent(s.cheer, s.steps, RATE * 1.4);
    sprites.push({
        key: "charlie",
        art: "charlie",
        params: {
            ...CHARLIE_LOOK,
            pose: cheering ? "cheer" : "hold",
            mood: cheering ? "excited" : s.down > 0 ? "surprised" : "happy",
            holding: "",
        },
        x: CHARLIE.x,
        y: CHARLIE.y,
        size: 5,
        stand: true,
        z: 6,
        angle: s.pulling && !cheering ? -0.12 : s.letting ? 0.05 : 0,
        live: true,
        seed: 5,
    });
    sprites.push({
        key: "reel",
        art: "kitereel",
        params: { tone: "tang" },
        x: HANDS.x,
        y: HANDS.y,
        size: 1.3,
        z: 7,
        angle: -k.line * 0.9,
    });
    s.pups.forEach((p, i) => {
        const fast = Math.abs(p.v) > 1.2;
        sprites.push({
            key: `pup:${i}`,
            art: "pupfamily",
            params: {
                member: i === 0 ? "pip" : "dot",
                pose: s.won ? "jump" : fast ? "run" : "sit",
                mood: s.won ? "excited" : "happy",
                dir: p.v < -0.2 ? -1 : 1,
                gear: "none",
            },
            x: p.x,
            y: GROUND,
            size: 2.6,
            stand: true,
            z: 6,
            live: true,
        });
    });
    const lying = s.down > 0;
    const h = heightOf(k);
    if (!lying)
        sprites.push({
            key: "shadow",
            art: "flyingkite",
            params: { shape: L.shape, tone: L.tone, look: "shadow" },
            x: k.x,
            y: GROUND + 0.15,
            size: 2.4,
            stand: true,
            z: 3,
            alpha: Math.max(0.08, 0.3 - h / 150),
        });
    for (const o of L.others ?? []) {
        const p = otherAt(o, t),
            from = { x: o.x + 1, y: GROUND - 2.6 };
        marks.push({ kind: "line", a: from, b: p, bend: -o.line * 0.05, style: "thin" });
        sprites.push({
            key: `other:${o.x}`,
            art: "flyingkite",
            params: { shape: "delta", tone: o.x % 2 ? "berry" : "mint", look: "kite" },
            x: p.x,
            y: p.y,
            size: 2.4,
            angle: Math.sin((t / o.period) * Math.PI * 2) * 0.5,
            z: 8,
        });
        sprites.push({
            key: `flyer:${o.x}`,
            art: "pupfamily",
            params: { member: "maple", pose: "carry", mood: "happy", dir: 1, gear: "none" },
            x: o.x,
            y: GROUND,
            size: 2.8,
            stand: true,
            z: 5,
            still: true,
        });
    }
    s.puffs.forEach((p, i) => {
        if (p.gone > 0 && !(p.gone < RATE * 0.5)) return;
        const where = puffAt(p, t, i),
            back = p.gone > 0 ? 1 - p.gone / (RATE * 0.5) : 1;
        const a = L.ask;
        const lit =
            (a.kind === "order" && a.seq[s.next] === p.n) ||
            (a.kind === "double" && (a.of[s.next] ?? -1) * 2 === p.n && L.preview > 0);
        sprites.push(
            p.bird
                ? {
                      key: `bird:${i}`,
                      art: "numberbird",
                      params: { n: p.n, wings: Math.floor(t * 4 + i) % 2 ? "up" : "down" },
                      x: where.x,
                      y: where.y,
                      size: 2.6,
                      z: 9,
                      alpha: back,
                      live: true,
                  }
                : {
                      key: `balloon:${i}`,
                      art: "skyballoon",
                      params: { n: p.n, tone: p.tone },
                      x: where.x,
                      y: where.y + 0.9,
                      size: 2,
                      z: 9,
                      alpha: back,
                      ...(lit ? { glow: 1.6 } : {}),
                  },
        );
    });
    for (const q of s.pops) {
        const age = s.steps - q.step;
        if (age >= RATE || rest) continue;
        marks.push({
            kind: "word",
            x: q.x,
            y: q.y - 1 - age / 30,
            text: q.text,
            size: q.counted ? 1 : 0.8,
        });
    }
    const bridle = lying
        ? { x: k.x, y: GROUND - 0.4 }
        : { x: k.x - Math.sin(k.a) * 0.1, y: k.y + Math.cos(k.a) * 0.1 };
    marks.push({
        kind: "line",
        a: HANDS,
        b: bridle,
        bend: lying ? -0.2 : -sagOf(k, HANDS, airAt(s, k.x, t)),
        style: "thin",
    });
    const tail = lying
        ? Array.from({ length: s.tail.length }, (_, i) => ({
              x: k.x + 1.2 + i * 0.7,
              y: GROUND - 0.3,
          }))
        : s.tail;
    let prev = lying ? { x: k.x + 0.6, y: GROUND - 0.3 } : tailRoot(k);
    tail.forEach((p, i) => {
        marks.push({ kind: "line", a: prev, b: p, style: "thin" });
        sprites.push({
            key: `bow:${i}`,
            art: "kitebow",
            params: { tone: i % 2 ? "card" : L.tone },
            x: p.x,
            y: p.y,
            size: 0.8,
            angle: Math.atan2(p.y - prev.y, p.x - prev.x) + (rest ? 0 : Math.sin(t * 9 + i) * 0.3),
            z: 10,
        });
        prev = p;
    });
    sprites.push({
        key: "kite",
        art: "flyingkite",
        params: { shape: L.shape, tone: L.tone, look: "kite" },
        x: k.x,
        y: lying ? GROUND - 0.8 : k.y,
        size: 2.6,
        z: 11,
        angle: lying ? 1.3 : k.a,
        ...(s.snag > 0 ? { angle: k.a + Math.sin(s.steps * 0.9) * 0.25 } : {}),
    });
    if (!s.won && !lying && L.preview > 0 && !rest) {
        const pts = aheadOf(s, L.preview);
        if (pts.length > 1) marks.push({ kind: "dots", pts, faint: true });
    }
    if (L.ask.kind === "height" && !lying)
        marks.push({
            kind: "dots",
            pts: Array.from(
                { length: Math.max(0, Math.floor((k.x - POLE.x - 1.5) / 1.5)) },
                (_, i) => ({
                    x: POLE.x + 1 + i * 1.5,
                    y: k.y,
                }),
            ),
            faint: true,
            opacity: 0.6,
        });
    // over the middle of the sky, where a phone held upright still shows all of it
    sprites.push({
        key: "board",
        art: "kiteboard",
        params: { tone: L.tone },
        x: VIEW.w / 2,
        y: 2.6,
        size: 15,
        z: 20,
        fixed: true,
        still: true,
    });
    marks.push(
        { kind: "word", x: VIEW.w / 2, y: 2.1, text: askWords(s), size: 0.85, fixed: true },
        { kind: "word", x: VIEW.w / 2, y: 3.5, text: tallyWords(s), size: 0.7, fixed: true },
    );
    return {
        sprites,
        marks,
        camera: { x: s.cam.x, y: s.cam.y, zoom: s.cam.zoom },
        focus: { x: HANDS.x + (k.x - HANDS.x) * 0.75, y: k.y + 3 },
        view: { ...VIEW },
        world: { ...WORLD },
        time: rest ? 0 : t,
    };
}

/** Kite flying's own sounds: the tug, a balloon's pop pitched by its number, a crash on the grass, a bounce off a wrong balloon. */
const SOUNDS: Kit = {
    lift: [
        { wave: "noise", hz: 2400, attack: 0.002, decay: 0.05, gain: 0.25 },
        { wave: "sine", hz: 300, to: 520, attack: 0.003, decay: 0.12, gain: 0.25 },
    ],
    ring: [
        { wave: "noise", hz: 3000, attack: 0.001, decay: 0.03, gain: 0.35 },
        { wave: "triangle", hz: 880, to: 1320, attack: 0.003, decay: 0.16, gain: 0.3 },
    ],
    place: [{ wave: "triangle", hz: 220, to: 260, attack: 0.002, decay: 0.1, gain: 0.18 }],
    crash: [
        { wave: "noise", hz: 900, attack: 0.002, decay: 0.12, gain: 0.3 },
        { wave: "sine", hz: 180, to: 110, attack: 0.002, decay: 0.15, gain: 0.3 },
    ],
    bump: [{ wave: "sine", hz: 340, to: 200, attack: 0.002, decay: 0.12, gain: 0.3 }],
    creak: [
        { wave: "noise", hz: 1500, attack: 0.01, decay: 0.25, gain: 0.25 },
        { wave: "sine", hz: 260, to: 180, attack: 0.01, decay: 0.3, gain: 0.2 },
    ],
    nope: [
        { wave: "sine", hz: 560, attack: 0.001, decay: 0.06, gain: 0.22 },
        { wave: "sine", hz: 470, attack: 0.001, decay: 0.08, gain: 0.22, delay: 0.08 },
    ],
    win: [
        { wave: "triangle", hz: 523, attack: 0.01, decay: 0.25, gain: 0.35 },
        { wave: "triangle", hz: 659, attack: 0.01, decay: 0.25, gain: 0.35, delay: 0.12 },
        { wave: "triangle", hz: 784, attack: 0.01, decay: 0.3, gain: 0.35, delay: 0.24 },
        { wave: "triangle", hz: 1047, attack: 0.01, decay: 0.5, gain: 0.35, delay: 0.36 },
    ],
};

function say(s: KiteState): string {
    const k = s.kite,
        deg = Math.round((elevation(k, HANDS) * 180) / Math.PI);
    const where =
        s.down > 0
            ? "The kite is down on the grass, and Charlie is about to launch it again."
            : `The kite is ${Math.round(heightOf(k))} metres up on ${Math.round(k.line)} squares of line, ${deg} degrees above the ground, its nose ${noseWords(k.a)}.`;
    const balloons = s.puffs
        .filter((p) => p.gone === 0)
        .map((p) => p.n)
        .join(", ");
    return `${askWords(s)}. ${tallyWords(s)}. ${where}${balloons ? ` Balloons: ${balloons}.` : ""}`;
}

function noseWords(a: number): string {
    const n = noseOf(a);
    if (n.y < -0.7) return "up";
    if (n.y > 0.7) return "down";
    return n.x > 0 ? "to the right" : "to the left";
}

const isBest = (v: unknown): v is { best: number } =>
    typeof v === "object" &&
    v !== null &&
    "best" in v &&
    typeof v.best === "number" &&
    Number.isFinite(v.best) &&
    v.best >= 0;

export const kiteGame: ActionGame<KiteState> = {
    id: "kite",
    title: "Kite flying",
    group: "action",
    card: { round: { level: 0 }, keep: 30, minutes: 2 },
    portrait: { keep: 22 },
    quiet: true,
    touch: true,
    wasd: true,
    levels: KITE_LEVELS,
    rate: RATE,
    cover: { art: "kitecover", params: { balloons: 3 } },
    hint: "Hold a finger in the sky and the kite flies there. With the keys, left and right steer (hold one to loop), up lets the line out, down pulls it in, and space gives a tug.",
    controls: {
        go: "Pull",
        brake: "Let out",
        icons: { go: "reel", brake: "up" },
    },
    sounds: SOUNDS,
    saves: { level: KITE_LEVELS.length - 1 },
    checkpoint: (s) => ({ best: Math.round(Math.max(s.best, s.top)) }),
    restore: (s, v) => {
        if (!isBest(v)) return false;
        s.best = Math.max(s.best, Math.round(v.best));
        return true;
    },
    start: (phase, seed) => startKite(KITE_LEVELS[phase] ?? KITE_LEVELS[0], phase, seed ?? 1),
    step: stepKiteGame,
    say,
    note: (s) => (!s.touched && !s.won ? s.L.prompt : s.note),
    won: (s) => s.won,
    ended: (s) =>
        s.won ? { won: true, words: s.note } : s.out ? { won: false, words: s.note } : null,
    objectives: (s) => {
        const a = s.L.ask;
        switch (a.kind) {
            case "count":
                return { completed: s.counted.length, total: a.count };
            case "even":
                return { completed: s.counted.length, total: a.count };
            case "sum":
                return { completed: Math.min(a.total, sumOf(s.counted)), total: a.total };
            case "order":
                return { completed: s.next, total: a.seq.length };
            case "double":
                return { completed: s.next, total: a.of.length };
            case "height":
                return { completed: Math.min(a.m, Math.round(s.top)), total: a.m };
            case "free":
                return { completed: 0, total: 1 };
        }
    },
    frame: kiteFrame,
    cancelInput: (s) => {
        s.hands = { steer: 0, toward: null, reel: 0 };
    },
    hum: (s): Hum[] => {
        const air = airAt(s, s.kite.x),
            speed = Math.hypot(s.kite.vx, s.kite.vy);
        return [{ kind: "wind", level: Math.min(0.5, 0.06 + (air.now / 12) * 0.35 + speed / 80) }];
    },
    tuning: KITE,
    still: {
        press: () => Math.round(RATE * 0.3),
        settling: (s) => !s.won && !s.out && (s.down > 0 || s.snag > 0),
    },
};
