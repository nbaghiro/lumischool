// Bolt's sky flight: Bolt flies straight up out of the garden on its jets, through the clouds, an
// aurora and the edge of space to the planets, the station and the moon. Holding the jets builds the
// thrust over a moment and heats them; past a hover's share they heat until they sputter and cool, so
// a climb is flown in pulses. Left and right steer with a lean, the air carries Bolt sideways, and a
// moon's pull bends its path. Numbered stars and lost crew float on the way: make an exact sum, the
// fives only, count by tens, or stop at a height read off the pole. A bump knocks Bolt down a little,
// and a fall below the last cloud it stood on puts it back there. See .docs/games.md.
import type { ActionGame, ActionLevel, Levels } from "./game";
import { follow, type Cam } from "../../engine/motion/camera";
import type { Pt } from "../../engine/motion/geometry";
import {
    flyer,
    pullAt,
    stepFlyer,
    type FlyEvent,
    type FlyHands,
    type FlySpec,
    type Flyer,
    type Pull,
} from "../../engine/motion/jets";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import { panOf, type Hum, type Kit } from "../../engine/sound/kit";

export const RATE = 60;
const SUB = 4;
const DT = 1 / (RATE * SUB);

/** The world's width and the view's, in squares: the climb is up, so the view holds the whole width. */
export const W = 40;
const VIEW = { w: 40, h: 24 };
/** Metres to a square, so the pole reads a climb in tens and hundreds. */
const PER = 5;
/** Squares from a star's or a robot's middle that Bolt catches it from, and how far Bolt's middle is above its feet. */
const REACH = 1.45;
export const BODY = 1.3;
const RADIUS = 0.85;

/** A number from nought to one fixed by two whole numbers, for scattering backdrops the same way every time. */
const hash = (a: number, b: number): number => {
    const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return v - Math.floor(v);
};

type Band =
    "garden" | "clouds" | "aurora" | "edge" | "ringed" | "nebula" | "station" | "belt" | "moon";
type Tone = "glow" | "sky" | "mint" | "berry" | "tang";
const TONES: Tone[] = ["glow", "sky", "mint", "berry", "tang"];

type Ask =
    | { kind: "count"; count: number }
    | { kind: "sum"; total: number }
    | { kind: "fives"; count: number }
    | { kind: "order"; seq: number[] }
    | { kind: "hold"; m: number; hold: number }
    | { kind: "crew"; count: number }
    | { kind: "free" };

/** A star by its number, its height in metres and its place across in squares. */
interface StarSpot {
    n: number;
    m: number;
    x: number;
}

/** Something to stand on: a cloud, a station's metal deck, or the moon, from `x0` to `x1` across at `m` metres. */
interface Ledge {
    x0: number;
    x1: number;
    m: number;
    look: "cloud" | "metal" | "moon";
}

/** Something that bumps Bolt: a rock, a satellite swinging `swing` squares either side every `period` seconds, a comet crossing at `speed`, or a soft cloud. */
interface Hazard {
    kind: "asteroid" | "crystal" | "satellite" | "comet" | "puff";
    x: number;
    m: number;
    swing?: number;
    period?: number;
    speed?: number;
}

/** A small moon whose pull bends a path: its middle, its size, how hard it pulls close in, and its reach, in squares. */
interface Moon {
    x: number;
    m: number;
    r: number;
    strength: number;
    reach: number;
}

/** Air moving sideways at `x` squares a second between two heights, or rising at `up` in a column from `x0` to `x1`. */
interface Current {
    from: number;
    to: number;
    x: number;
    up?: number;
    x0?: number;
    x1?: number;
}

type Colour = "sky" | "mint" | "berry" | "tang" | "glow";

export interface FlyLevel extends ActionLevel {
    prompt: string;
    ask: Ask;
    /** The height the world reaches, in metres. */
    top: number;
    bands: { kind: Band; from: number; to: number }[];
    stars: StarSpot[];
    crew?: { x: number; m: number; colour: Colour }[];
    ledges: Ledge[];
    hazards?: Hazard[];
    moons?: Moon[];
    currents?: Current[];
    /** Seconds a try has, where it is timed. */
    time?: number;
    /** Seconds of the dotted way ahead Bolt is shown, or nought for none. */
    preview: number;
    /** Jets that heat slower, for the first level. */
    gentle?: true;
}

const S = (n: number, m: number, x: number): StarSpot => ({ n, m, x });
const L = (x0: number, x1: number, m: number, look: Ledge["look"] = "cloud"): Ledge => ({
    x0,
    x1,
    m,
    look,
});

export const FLY_LEVELS: Levels<FlyLevel> = [
    {
        title: "Up from the garden",
        goal: "Fly up through the clouds and catch four stars.",
        prompt: "Hold a finger above Bolt and it flies there, or hold up or space for the jets and steer with left and right. Let go to drift down. Catch four stars.",
        grades: [1, 1],
        ask: { kind: "count", count: 4 },
        top: 300,
        bands: [
            { kind: "garden", from: 0, to: 40 },
            { kind: "clouds", from: 30, to: 300 },
        ],
        stars: [
            S(1, 45, 22),
            S(2, 95, 7),
            S(3, 150, 28),
            S(4, 205, 15),
            S(5, 245, 31),
            S(6, 280, 20),
        ],
        ledges: [L(18, 24, 120), L(26, 32, 210)],
        preview: 1.2,
        gentle: true,
    },
    {
        title: "Ten above the clouds",
        goal: "Catch stars that make exactly 10.",
        prompt: "Each star adds its number. Make exactly 10. A star that would go past 10 pushes Bolt away, and a caught one comes back. The warm air in the middle lifts Bolt.",
        grades: [1, 2],
        ask: { kind: "sum", total: 10 },
        top: 350,
        bands: [
            { kind: "garden", from: 0, to: 40 },
            { kind: "clouds", from: 30, to: 260 },
            { kind: "aurora", from: 230, to: 350 },
        ],
        stars: [
            S(1, 40, 30),
            S(2, 80, 10),
            S(3, 120, 26),
            S(4, 165, 8),
            S(5, 210, 30),
            S(6, 255, 16),
        ],
        ledges: [L(13, 19, 140), L(4, 10, 240)],
        currents: [{ from: 60, to: 200, x: 0, up: 2.5, x0: 24, x1: 32 }],
        preview: 1.0,
    },
    {
        title: "Stop at 300 metres",
        goal: "Hover between 290 and 310 metres for two seconds.",
        prompt: "The pole counts the metres in fifties. Fly up to 300, three hundred, and hold Bolt there for two seconds: a little jet, not too much. The breeze pushes Bolt to the right.",
        grades: [1, 2],
        ask: { kind: "hold", m: 300, hold: 2 },
        top: 400,
        bands: [
            { kind: "garden", from: 0, to: 40 },
            { kind: "clouds", from: 30, to: 260 },
            { kind: "aurora", from: 240, to: 400 },
        ],
        stars: [],
        ledges: [L(26, 32, 120), L(8, 14, 220)],
        currents: [{ from: 150, to: 330, x: 1.6 }],
        preview: 0.8,
    },
    {
        title: "Tens at the edge of space",
        goal: "Catch 10, 20, 30 and 40 in order.",
        prompt: "Count by tens: 10, then 20, then 30, then 40. Another star pushes Bolt away. Steer round the satellites.",
        grades: [2, 3],
        ask: { kind: "order", seq: [10, 20, 30, 40] },
        top: 480,
        bands: [
            { kind: "garden", from: 0, to: 40 },
            { kind: "clouds", from: 30, to: 150 },
            { kind: "aurora", from: 130, to: 280 },
            { kind: "edge", from: 260, to: 480 },
        ],
        stars: [
            S(10, 70, 28),
            S(15, 110, 10),
            S(20, 160, 20),
            S(25, 205, 33),
            S(30, 250, 9),
            S(35, 300, 28),
            S(40, 360, 18),
            S(45, 410, 32),
        ],
        ledges: [L(28, 34, 130), L(4, 10, 290, "metal")],
        hazards: [
            { kind: "satellite", x: 20, m: 222, swing: 9, period: 7 },
            { kind: "satellite", x: 14, m: 330, swing: 7, period: 6 },
        ],
        preview: 0.7,
    },
    {
        title: "The moon's pull",
        goal: "Catch stars that make exactly 25.",
        prompt: "Make exactly 25. The little moon pulls Bolt towards it, so its path bends near the moon. Use the pull to swing round to the stars.",
        grades: [2, 3],
        ask: { kind: "sum", total: 25 },
        top: 480,
        bands: [
            { kind: "garden", from: 0, to: 40 },
            { kind: "clouds", from: 30, to: 170 },
            { kind: "edge", from: 150, to: 480 },
        ],
        stars: [
            S(6, 110, 28),
            S(4, 150, 16),
            S(5, 220, 30),
            S(10, 260, 10),
            S(3, 300, 33),
            S(2, 330, 30),
            S(7, 345, 12),
            S(8, 380, 22),
        ],
        ledges: [L(4, 10, 160), L(28, 34, 400, "metal")],
        moons: [{ x: 22, m: 300, r: 2.6, strength: 7, reach: 13 }],
        preview: 0.6,
    },
    {
        title: "Fives by the ringed planet",
        goal: "Catch four different multiples of 5.",
        prompt: "Only the fives count: 5, 10, 15, 20 and on, each one once. Another number pops but does not count. The solar wind blows one way and then the other.",
        grades: [2, 3],
        ask: { kind: "fives", count: 4 },
        top: 520,
        bands: [
            { kind: "garden", from: 0, to: 40 },
            { kind: "clouds", from: 30, to: 140 },
            { kind: "aurora", from: 120, to: 250 },
            { kind: "ringed", from: 230, to: 520 },
        ],
        stars: [
            S(3, 80, 20),
            S(5, 120, 30),
            S(8, 160, 10),
            S(10, 200, 24),
            S(12, 250, 34),
            S(15, 290, 12),
            S(14, 330, 30),
            S(20, 370, 20),
            S(22, 420, 8),
            S(25, 460, 28),
        ],
        ledges: [L(4, 10, 240, "metal"), L(30, 36, 380, "metal")],
        hazards: [
            { kind: "asteroid", x: 24, m: 312 },
            { kind: "asteroid", x: 12, m: 402, swing: 3, period: 8 },
        ],
        currents: [
            { from: 220, to: 300, x: 2.5 },
            { from: 340, to: 420, x: -2.5 },
        ],
        preview: 0.5,
    },
    {
        title: "Fifty in the nebula",
        goal: "Catch stars that make exactly 50 before the time runs out.",
        prompt: "Make exactly 50 with tens, fives and more before the clock runs out. Comets cross the nebula: let them pass.",
        grades: [3, 4],
        ask: { kind: "sum", total: 50 },
        top: 560,
        bands: [
            { kind: "garden", from: 0, to: 40 },
            { kind: "clouds", from: 30, to: 140 },
            { kind: "edge", from: 130, to: 260 },
            { kind: "nebula", from: 240, to: 560 },
        ],
        stars: [
            S(10, 120, 30),
            S(20, 170, 10),
            S(5, 220, 20),
            S(15, 270, 34),
            S(25, 320, 8),
            S(30, 380, 26),
            S(4, 430, 14),
            S(12, 480, 30),
        ],
        ledges: [L(16, 22, 200, "metal"), L(4, 10, 340, "metal"), L(28, 34, 480, "metal")],
        hazards: [
            { kind: "comet", x: 0, m: 252, speed: 5 },
            { kind: "comet", x: 30, m: 362, speed: -6 },
            { kind: "comet", x: 10, m: 458, speed: 4 },
        ],
        time: 150,
        preview: 0.3,
    },
    {
        title: "Crew at the space station",
        goal: "Rescue five lost crew robots before the time runs out.",
        prompt: "Five crew robots are floating round the space station. Fly to each one to rescue it, and keep clear of the satellites.",
        grades: [3, 4],
        ask: { kind: "crew", count: 5 },
        top: 560,
        bands: [
            { kind: "garden", from: 0, to: 40 },
            { kind: "clouds", from: 30, to: 130 },
            { kind: "edge", from: 120, to: 330 },
            { kind: "station", from: 310, to: 560 },
        ],
        stars: [],
        crew: [
            { x: 30, m: 300, colour: "sky" },
            { x: 10, m: 360, colour: "mint" },
            { x: 33, m: 410, colour: "berry" },
            { x: 18, m: 455, colour: "tang" },
            { x: 8, m: 500, colour: "glow" },
            { x: 28, m: 535, colour: "sky" },
        ],
        ledges: [L(4, 10, 200), L(14, 24, 380, "metal"), L(26, 34, 470, "metal")],
        hazards: [
            { kind: "satellite", x: 20, m: 332, swing: 10, period: 8 },
            { kind: "satellite", x: 22, m: 432, swing: 8, period: 6 },
            { kind: "asteroid", x: 30, m: 482 },
        ],
        time: 180,
        preview: 0.3,
    },
    {
        title: "Up to the moon",
        goal: "Catch 25, 50, 75 and 100 in order before the time runs out.",
        prompt: "Count by 25s on the way to the moon: 25, 50, 75, 100. Two little moons pull at Bolt, and crystal rocks drift in the belt.",
        grades: [4, 4],
        ask: { kind: "order", seq: [25, 50, 75, 100] },
        top: 640,
        bands: [
            { kind: "garden", from: 0, to: 40 },
            { kind: "clouds", from: 30, to: 120 },
            { kind: "aurora", from: 100, to: 230 },
            { kind: "edge", from: 210, to: 360 },
            { kind: "belt", from: 340, to: 600 },
            { kind: "moon", from: 590, to: 640 },
        ],
        stars: [
            S(25, 260, 30),
            S(30, 300, 12),
            S(50, 400, 24),
            S(60, 440, 6),
            S(80, 480, 34),
            S(75, 500, 18),
            S(100, 580, 22),
            S(90, 605, 32),
        ],
        ledges: [
            L(4, 10, 150),
            L(28, 34, 330, "metal"),
            L(2, 8, 470, "metal"),
            L(0, 40, 620, "moon"),
        ],
        moons: [
            { x: 10, m: 420, r: 2.2, strength: 5, reach: 11 },
            { x: 30, m: 540, r: 2.2, strength: 5, reach: 11 },
        ],
        hazards: [
            { kind: "comet", x: 0, m: 302, speed: 4 },
            { kind: "crystal", x: 24, m: 380 },
            { kind: "crystal", x: 16, m: 472 },
            { kind: "crystal", x: 26, m: 562 },
        ],
        time: 200,
        preview: 0,
    },
    {
        title: "Free sky",
        goal: "Fly as high as you can.",
        prompt: "Fly as high as you like and catch what you like. The pole keeps your best height, all the way to the moon.",
        grades: [1, 4],
        ask: { kind: "free" },
        top: 1000,
        bands: [
            { kind: "garden", from: 0, to: 40 },
            { kind: "clouds", from: 30, to: 200 },
            { kind: "aurora", from: 180, to: 360 },
            { kind: "edge", from: 340, to: 520 },
            { kind: "ringed", from: 500, to: 680 },
            { kind: "nebula", from: 660, to: 840 },
            { kind: "station", from: 820, to: 950 },
            { kind: "moon", from: 940, to: 1000 },
        ],
        stars: [
            S(1, 60, 20),
            S(2, 130, 32),
            S(3, 200, 8),
            S(4, 270, 26),
            S(5, 340, 14),
            S(6, 410, 30),
            S(7, 480, 10),
            S(8, 560, 24),
            S(9, 640, 34),
            S(10, 720, 16),
            S(10, 800, 28),
            S(10, 880, 12),
        ],
        ledges: [
            L(26, 32, 150),
            L(6, 12, 300),
            L(24, 30, 450, "metal"),
            L(6, 12, 600, "metal"),
            L(26, 32, 750, "metal"),
            L(10, 16, 900, "metal"),
            L(0, 40, 980, "moon"),
        ],
        moons: [{ x: 20, m: 620, r: 2.4, strength: 6, reach: 12 }],
        hazards: [
            { kind: "satellite", x: 20, m: 420, swing: 8, period: 7 },
            { kind: "comet", x: 0, m: 760, speed: 4 },
        ],
        currents: [{ from: 200, to: 300, x: 1.5 }],
        preview: 1.0,
    },
];

const FLY = {
    gravity: knob(
        12,
        8,
        16,
        0.5,
        "squares a second, each second",
        "how quickly Bolt falls once the jets let go",
    ),
    power: knob(
        22,
        18,
        28,
        0.5,
        "squares a second, each second",
        "the push of the jets at full thrust: a hover takes a little over half of it",
    ),
    spool: knob(
        4.5,
        2,
        8,
        0.25,
        "per second",
        "how quickly the thrust follows the hand: a moment, not at once",
    ),
    heat: knob(
        0.35,
        0.2,
        0.6,
        0.01,
        "heat a second at full thrust",
        "full thrust from cold sputters in about three seconds, so a long climb is flown in pulses",
    ),
    side: knob(
        16,
        10,
        24,
        0.5,
        "squares a second, each second",
        "how hard a steer pushes Bolt along",
    ),
};

function specOf(L: FlyLevel): FlySpec {
    return {
        gravity: FLY.gravity.value,
        power: FLY.power.value,
        spool: FLY.spool.value,
        cruise: 0.7,
        heat: FLY.heat.value * (L.gentle ? 0.6 : 1),
        cool: 0.55,
        sputter: 0.9,
        side: FLY.side.value,
        drag: 1.3,
        dive: 10,
        most: 11,
    };
}

const worldOf = (L: FlyLevel) => ({ w: W, h: Math.round(L.top / PER) + 8 });
const groundOf = (L: FlyLevel): number => worldOf(L).h - 2;
/** Where a height in metres is down the world, in squares. */
export const yAt = (L: FlyLevel, m: number): number => groundOf(L) - m / PER;
/** Metres above the grass of a point's feet. */
export const metresAt = (L: FlyLevel, y: number): number => Math.max(0, (groundOf(L) - y) * PER);

const pullsOf = (L: FlyLevel): Pull[] =>
    (L.moons ?? []).map((m) => ({ x: m.x, y: yAt(L, m.m), strength: m.strength, reach: m.reach }));

/** The air at a point and a moment: a sideways current between two heights, swelling and easing, or a column rising. */
function airAt(L: FlyLevel, x: number, y: number, t: number): { x: number; y: number } {
    let ax = 0,
        ay = 0;
    const m = metresAt(L, y);
    for (const c of L.currents ?? []) {
        // a current fades in and out over ten metres at its edges, so it is felt and never a wall
        const inside = Math.min(1, Math.max(0, (m - c.from) / 10), Math.max(0, (c.to - m) / 10));
        if (inside <= 0) continue;
        if (c.x0 !== undefined && c.x1 !== undefined) {
            const across = Math.min(
                1,
                Math.max(0, (x - c.x0) / 1.5),
                Math.max(0, (c.x1 - x) / 1.5),
            );
            ay -= (c.up ?? 0) * inside * across;
            continue;
        }
        ax += c.x * inside * (0.85 + 0.15 * Math.sin(t * 0.6 + c.from));
        ay -= (c.up ?? 0) * inside;
    }
    return { x: ax, y: ay };
}

/** Where a hazard is at a moment: a rock where it was put, a satellite swinging, a comet crossing and round again. */
export function hazardAt(L: FlyLevel, h: Hazard, t: number): Pt {
    const y = yAt(L, h.m);
    if (h.kind === "comet") {
        const span = W + 12,
            x = ((((h.x + (h.speed ?? 4) * t) % span) + span) % span) - 6;
        return { x, y: y + Math.sin(t * 0.7 + h.x) * 0.3 };
    }
    if (!h.swing) return { x: h.x, y };
    const a = (t / (h.period ?? 6)) * Math.PI * 2;
    return { x: h.x + h.swing * Math.sin(a), y: y + Math.cos(a) * 0.4 };
}

const HIT: Record<Hazard["kind"], number> = {
    asteroid: 1.3,
    crystal: 1.1,
    satellite: 1.1,
    comet: 0.8,
    puff: 1.6,
};

/** A star or a robot in the sky: where it floats, and how long until a caught one comes back. */
interface Shine {
    n: number;
    tone: Tone;
    x: number;
    y: number;
    /** Steps until it is back, nought while it is there, and less than nought when it is gone for good. */
    gone: number;
    /** The step it last pushed Bolt away, so it says why once. */
    no: number;
}

interface Mate {
    x: number;
    y: number;
    colour: Colour;
    got: boolean;
}

export interface FlyState {
    phase: number;
    L: FlyLevel;
    steps: number;
    f: Flyer;
    hands: FlyHands;
    stars: Shine[];
    crew: Mate[];
    /** The numbers that counted, in the order they did. */
    counted: number[];
    next: number;
    score: number;
    rescued: number;
    /** The ledge Bolt last stood on, by its place among the level's, or -1 for the grass. */
    checkpoint: number;
    landed: boolean;
    /** Steps Bolt is knocked about after a bump, before it can bump again, and blinking after it is put back. */
    stun: number;
    hitCool: number;
    blink: number;
    /** The highest Bolt has been this try and ever, in metres, and steps it has held a height asked for. */
    top: number;
    best: number;
    above: number;
    cam: Cam;
    pops: { text: string; x: number; y: number; step: number; counted: boolean }[];
    won: boolean;
    out: boolean;
    touched: boolean;
    note: string;
    cheer: number;
    /** Ledges whose line has been said, so a checkpoint is told once. */
    told: number[];
}

const START_X = 8;

const cameraFor = (f: Flyer): Cam => ({
    x: W / 2,
    // a climb looks ahead up the sky and a fall a little down it
    y: f.y - 2 + Math.max(-5, Math.min(3, f.vy * 0.45)),
    zoom: 1,
});

export function startFly(L: FlyLevel, phase = 0): FlyState {
    const f = flyer(START_X, groundOf(L));
    const s: FlyState = {
        phase,
        L,
        steps: 0,
        f,
        hands: { lift: 0, steer: 0, dive: false },
        stars: L.stars.map((sp, i) => ({
            n: sp.n,
            tone: TONES[i % TONES.length] ?? "glow",
            x: sp.x,
            y: yAt(L, sp.m),
            gone: 0,
            no: -999,
        })),
        crew: (L.crew ?? []).map((c) => ({ x: c.x, y: yAt(L, c.m), colour: c.colour, got: false })),
        counted: [],
        next: 0,
        score: 0,
        rescued: 0,
        checkpoint: -1,
        landed: true,
        stun: 0,
        hitCool: 0,
        blink: 0,
        top: 0,
        best: 0,
        above: 0,
        cam: { x: 0, y: 0, zoom: 1 },
        pops: [],
        won: false,
        out: false,
        touched: false,
        note: "",
        cheer: -999,
        told: [],
    };
    s.cam = { ...cameraFor(f) };
    return s;
}

/** Where a star or a robot floats now, bobbing a little. */
export function shineAt(p: { x: number; y: number }, t: number, i: number): Pt {
    return {
        x: p.x + Math.sin(t * 0.9 + i * 1.7) * 0.3,
        y: p.y + Math.cos(t * 0.7 + i * 2.3) * 0.35,
    };
}

const middleOf = (f: Flyer): Pt => ({ x: f.x, y: f.y - BODY });

function askWords(s: FlyState): string {
    const a = s.L.ask;
    switch (a.kind) {
        case "count":
            return `Catch ${a.count} stars`;
        case "sum":
            return `Make exactly ${a.total}`;
        case "fives":
            return `Catch ${a.count} different fives`;
        case "order":
            return `In order: ${a.seq.join(", ")}`;
        case "hold":
            return `Stop at ${a.m} m`;
        case "crew":
            return `Rescue ${a.count} crew`;
        case "free":
            return "Free sky";
    }
}

const sumOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

function tallyWords(s: FlyState): string {
    const a = s.L.ask,
        c = s.counted;
    const clock =
        s.L.time !== undefined
            ? ` · ${Math.max(0, Math.ceil(s.L.time - s.steps / RATE))} s left`
            : "";
    switch (a.kind) {
        case "count":
            return `${c.length} of ${a.count}`;
        case "sum":
            return `${c.length ? `${c.join(" + ")} = ${sumOf(c)}` : "0 so far"}${clock}`;
        case "fives":
            return c.length ? `${c.join(", ")} · ${a.count - c.length} more` : "None yet";
        case "order":
            return `${s.next < a.seq.length ? `Next: ${a.seq[s.next] ?? ""}` : "All caught"}${clock}`;
        case "hold":
            return `Now ${Math.round(metresAt(s.L, s.f.y))} m`;
        case "crew":
            return `${s.rescued} of ${a.count} rescued${clock}`;
        case "free":
            return `Highest ${Math.round(Math.max(s.best, s.top))} m · score ${s.score}`;
    }
}

function win(s: FlyState, out: Happening[], words: string): void {
    s.won = true;
    s.note = words;
    s.cheer = s.steps;
    const m = middleOf(s.f);
    out.push(
        { event: { kind: "won" } },
        { cue: "win" },
        { burst: { kind: "sparkle", x: m.x, y: m.y, n: 18 } },
    );
}

/** Whether catching `n` counts, whether the star pops at all, and what to say when it does not count. */
function verdict(s: FlyState, n: number): { counts: boolean; pops: boolean; why: string } {
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
        case "fives":
            return n % 5 !== 0
                ? {
                      counts: false,
                      pops: true,
                      why: `${n} is not a multiple of 5, so it does not count.`,
                  }
                : s.counted.includes(n)
                  ? {
                        counts: false,
                        pops: true,
                        why: `${n} is counted already. Find another five.`,
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
        case "hold":
        case "crew":
            return { counts: false, pops: true, why: "" };
    }
}

/** Seconds a caught star stays away: the sums and free sky want their numbers again, the rest are gone for good. */
const comesBack = (a: Ask): boolean => a.kind === "sum" || a.kind === "free";

function pushAway(f: Flyer, from: Pt): void {
    const m = middleOf(f),
        dx = m.x - from.x,
        dy = m.y - from.y,
        d = Math.hypot(dx, dy) || 1,
        vn = f.vx * (dx / d) + f.vy * (dy / d);
    if (vn < 2.5) {
        f.vx += (dx / d) * (2.5 - vn);
        f.vy += (dy / d) * (2.5 - vn);
    }
}

function catchStar(s: FlyState, i: number, out: Happening[]): void {
    const p = s.stars[i];
    if (!p || p.gone !== 0) return;
    const t = s.steps / RATE,
        where = shineAt(p, t, i),
        v = verdict(s, p.n),
        pan = panOf(where.x, s.cam.x, VIEW.w),
        a = s.L.ask;
    if (!v.pops) {
        pushAway(s.f, where);
        if (s.steps - p.no > RATE * 1.5) {
            s.note = v.why;
            out.push({ cue: "nope", pan });
        }
        p.no = s.steps;
        return;
    }
    p.gone = v.counts && !comesBack(a) ? -1 : Math.round(RATE * 6);
    out.push(
        { cue: "ring", strength: 0.6, pitch: 0.9 + Math.min(0.9, p.n / 60), pan },
        { burst: { kind: "sparkle", x: where.x, y: where.y, n: 8 } },
    );
    s.pops = [
        ...s.pops.filter((q) => s.steps - q.step < RATE),
        {
            text: v.counts && a.kind === "sum" ? `+${p.n}` : `${p.n}`,
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
    if (a.kind === "order") s.next++;
    const sum = sumOf(s.counted);
    switch (a.kind) {
        case "free":
            s.score += p.n;
            s.note = `${p.n}! The score is ${s.score}.`;
            return;
        case "count":
            if (s.counted.length >= a.count)
                win(s, out, `${a.count} stars caught: ${s.counted.join(", ")}. Well flown!`);
            else s.note = `${s.counted.length} caught. ${a.count - s.counted.length} to go.`;
            return;
        case "sum":
            if (sum === a.total) win(s, out, `${s.counted.join(" + ")} = ${a.total}. Exactly!`);
            else
                s.note = `${s.counted.join(" + ")} = ${sum}. ${a.total - sum} more to make ${a.total}.`;
            return;
        case "fives":
            if (s.counted.length >= a.count)
                win(s, out, `${s.counted.join(", ")}: four multiples of 5. Well flown!`);
            else s.note = `${p.n} is a five. ${a.count - s.counted.length} more to find.`;
            return;
        case "order":
            if (s.next >= a.seq.length)
                win(s, out, `${a.seq.join(", ")}: counted all the way. Well flown!`);
            else s.note = `${p.n}! Next is ${a.seq[s.next] ?? ""}.`;
            return;
        case "hold":
        case "crew":
            return;
    }
}

function rescue(s: FlyState, i: number, out: Happening[]): void {
    const c = s.crew[i],
        a = s.L.ask;
    if (!c || c.got) return;
    c.got = true;
    s.rescued++;
    out.push(
        {
            cue: "ring",
            strength: 0.6,
            pitch: 1 + s.rescued * 0.1,
            pan: panOf(c.x, s.cam.x, VIEW.w),
        },
        { burst: { kind: "sparkle", x: c.x, y: c.y, n: 10 } },
    );
    if (a.kind !== "crew") return;
    if (s.rescued >= a.count)
        win(s, out, `${a.count} crew rescued from round the station. Well flown!`);
    else s.note = `Rescued! ${s.rescued} of ${a.count}. ${a.count - s.rescued} more out there.`;
}

/** What the pad asks of the jets this step: the keys as they are held, or a finger in the sky flown to. */
function handsOf(s: FlyState, pad: Pad): FlyHands {
    const left = pad.holding.includes("left"),
        right = pad.holding.includes("right");
    let steer = 0;
    if (left !== right) steer = right ? 1 : -1;
    else if (left && right) steer = pad.held === "right" ? 1 : -1;
    const lift = pad.holding.includes("up") || pad.go,
        dive = pad.holding.includes("down");
    if (pad.touch && !lift && !dive && steer === 0) return toward(s, pad.touch);
    return { lift: lift ? 1 : 0, steer, dive };
}

/** The climb a finger asks for at most, in squares a second, and the least it eases to as the jets get hot. */
const CLIMB = 5;
const WARM = 2;
/** The fastest a finger brings Bolt down, well under a fall, so flying down never counts as one. */
const SINK = 5;

/**
 * A finger in the sky flown to at a jet's rate: the thrust that would give the climb or the sink it
 * asks for, with the air and a moon's pull allowed for, and a steer that brings Bolt across to it.
 * As the jets get hot the climb eases, so a finger held high never sputters them.
 */
function toward(s: FlyState, p: Pt): FlyHands {
    const f = s.f,
        L = s.L,
        spec = specOf(L),
        t = s.steps / RATE,
        air = airAt(L, f.x, f.y, t),
        g = pullAt(pullsOf(L), f.x, f.y),
        dy = f.y - p.y;
    let wantVy = Math.max(-CLIMB, Math.min(SINK, -dy * 1.6));
    if (f.heat > 0.7) wantVy = Math.max(wantVy, -CLIMB + ((f.heat - 0.7) / 0.3) * (CLIMB - WARM));
    const lift =
        (spec.gravity + g.y + (air.y - wantVy) * spec.drag) / spec.power + (f.vy - wantVy) * 0.12;
    const wantVx = Math.max(-7, Math.min(7, (p.x - f.x) * 1.4));
    const steer = (3 * (wantVx - f.vx) - (air.x - f.vx) * spec.drag - g.x) / spec.side;
    return {
        lift: Math.max(0, Math.min(1, lift)),
        steer: Math.max(-1, Math.min(1, steer)),
        dive: false,
    };
}

/** Where Bolt lands this substep, if it does: a ledge by its place, -1 for the grass, or null. */
type Landing = number | null;

/**
 * One substep of the flight, the same for the game and for the dots ahead: the jets and the air,
 * then the walls of the world, a ledge met from above, and the grass.
 */
function flyStep(
    L: FlyLevel,
    f: Flyer,
    hands: FlyHands,
    t: number,
): { ev: FlyEvent; land: Landing } {
    const prevY = f.y,
        spec = specOf(L),
        ev = stepFlyer(f, hands, airAt(L, f.x, f.y, t), pullsOf(L), spec, DT);
    if (f.x < 1) {
        f.x = 1;
        f.vx = Math.abs(f.vx) * 0.4;
    } else if (f.x > W - 1) {
        f.x = W - 1;
        f.vx = -Math.abs(f.vx) * 0.4;
    }
    if (f.y < 2.5) {
        f.y = 2.5;
        f.vy = Math.abs(f.vy) * 0.3;
    }
    let land: Landing = null;
    if (f.vy >= 0)
        L.ledges.forEach((l, i) => {
            const top = yAt(L, l.m);
            if (
                land === null &&
                prevY <= top + 1e-9 &&
                f.y >= top &&
                f.x >= l.x0 - 0.4 &&
                f.x <= l.x1 + 0.4
            ) {
                f.y = top;
                f.vy = 0;
                land = i;
            }
        });
    const ground = groundOf(L);
    if (f.y >= ground) {
        f.y = ground;
        f.vy = 0;
        land = -1;
    }
    if (land !== null && Math.abs(hands.steer) < 0.1) f.vx *= Math.exp(-8 * DT);
    return { ev, land };
}

/** Where Bolt goes in the next `seconds` with the hands as they are, by the same substep it flies by, as dots. */
export function aheadOf(s: FlyState, seconds: number): Pt[] {
    const f = structuredClone(s.f),
        n = Math.round(seconds * RATE * SUB),
        t0 = s.steps / RATE,
        pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
        const { land } = flyStep(s.L, f, s.hands, t0 + i * DT);
        if ((i + 1) % (SUB * 5) === 0) pts.push({ x: f.x, y: f.y - BODY });
        if (land !== null && i > SUB) break;
    }
    return pts;
}

/** Bumps off the rocks, the satellites, the comets and the moons: pushed out and sent back softly, and knocked down by anything hard. */
function bumps(s: FlyState, out: Happening[]): void {
    const L = s.L,
        f = s.f,
        t = s.steps / RATE;
    const bounce = (c: Pt, r: number, give: number): boolean => {
        const m = middleOf(f),
            dx = m.x - c.x,
            dy = m.y - c.y,
            d = Math.hypot(dx, dy);
        if (d >= r + RADIUS || d < 1e-6) return false;
        const nx = dx / d,
            ny = dy / d,
            over = r + RADIUS - d;
        f.x += nx * over;
        f.y += ny * over;
        const vn = f.vx * nx + f.vy * ny;
        if (vn < 0) {
            f.vx -= (1 + give) * vn * nx;
            f.vy -= (1 + give) * vn * ny;
        }
        return true;
    };
    for (const m of L.moons ?? []) bounce({ x: m.x, y: yAt(L, m.m) }, m.r, 0.3);
    for (const h of L.hazards ?? []) {
        if (!bounce(hazardAt(L, h, t), HIT[h.kind], h.kind === "puff" ? 0.3 : 0.5)) continue;
        if (h.kind === "puff" || s.hitCool > 0) continue;
        // a knock down and a moment without jets: a few seconds lost, never the try
        s.stun = Math.round(RATE * 0.5);
        s.hitCool = Math.round(RATE * 1.2);
        f.vy = Math.max(f.vy, 4);
        s.note =
            h.kind === "comet"
                ? "A comet clipped Bolt! Let the comets pass before you cross."
                : h.kind === "satellite"
                  ? "Bonk! A satellite. Steer round it as it swings."
                  : "Bonk! Bolt bumped a rock. Steer round it.";
        out.push(
            { cue: "bump", strength: 0.5, pan: panOf(f.x, s.cam.x, VIEW.w) },
            { puff: { x: f.x, y: f.y - BODY, n: 4 } },
            { shake: 0.15 },
        );
    }
}

/** Squares a second of falling that is a fall rather than a flight down: faster than a finger or the keys ever bring Bolt down. */
const FALLING = 7.5;

/** A fall well below the last ledge Bolt stood on puts it back there at once; a flight down on the jets is left alone. */
function caught(s: FlyState, out: Happening[]): void {
    const l = s.L.ledges[s.checkpoint];
    if (!l || s.f.y <= yAt(s.L, l.m) + 6 || s.f.vy < FALLING) return;
    const f = flyer((l.x0 + l.x1) / 2, yAt(s.L, l.m));
    f.heat = 0;
    s.f = f;
    s.landed = true;
    s.blink = Math.round(RATE * 0.6);
    s.stun = 0;
    s.note = `Back on the ${l.look === "cloud" ? "cloud" : l.look === "moon" ? "moon" : "deck"} at ${l.m} m. Up again!`;
    out.push({ cue: "back", strength: 0.5 });
}

/** A height asked for, held: counted in whole seconds, and started again when Bolt leaves the band round it. */
function held(s: FlyState, a: { m: number; hold: number }, out: Happening[]): void {
    const m = metresAt(s.L, s.f.y);
    if (Math.abs(m - a.m) > 10) {
        if (s.above > RATE * 0.3)
            s.note =
                m > a.m
                    ? `Too high: ${Math.round(m)} m. Ease off the jets.`
                    : `Too low: ${Math.round(m)} m. A little more jet.`;
        s.above = 0;
        return;
    }
    s.above++;
    if (s.above === 1)
        s.note = `${Math.round(m)} m, between ${a.m - 10} and ${a.m + 10}! Hold it: 1...`;
    else if (s.above % RATE === 0 && s.above < a.hold * RATE)
        s.note = `Hold it: ${s.above / RATE + 1}...`;
    if (s.above >= a.hold * RATE)
        win(
            s,
            out,
            `${Math.round(m)} metres, held for ${a.hold} seconds: ${a.m} is ${a.m / 50} fifties up the pole. Well flown!`,
        );
}

export function stepFly(s: FlyState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    if (pad.touch || pad.holding.length || pad.go) s.touched = true;
    if (s.won || s.out) {
        s.steps++;
        settle(s);
        return out;
    }
    const L = s.L,
        t0 = s.steps / RATE;
    if (L.time !== undefined && t0 >= L.time) {
        s.out = true;
        const a = L.ask;
        s.note =
            a.kind === "sum"
                ? `Time is up at ${sumOf(s.counted)}, and the target was ${a.total}. Another go?`
                : a.kind === "crew"
                  ? `Time is up with ${s.rescued} of ${a.count} crew rescued. Another go?`
                  : "Time is up this time. Another go?";
        return out;
    }
    const hands = handsOf(s, pad);
    s.hands = s.stun > 0 ? { lift: 0, steer: hands.steer * 0.4, dive: false } : hands;
    const wasThrust = s.f.thrust;
    let land: Landing = null;
    for (let i = 0; i < SUB; i++) {
        const r = flyStep(L, s.f, s.hands, t0 + i * DT);
        if (r.land !== null) land = r.land;
        if (r.ev === "sputter") {
            s.note =
                "The jets are too hot! They sputter until they cool. Pulse them: a burst, then a rest.";
            out.push({ cue: "creak", strength: 0.5 }, { puff: { x: s.f.x, y: s.f.y + 0.3, n: 4 } });
        }
    }
    s.steps++;
    if (s.stun > 0) s.stun--;
    if (s.hitCool > 0) s.hitCool--;
    if (s.blink > 0) s.blink--;
    if (wasThrust < 0.15 && s.f.thrust >= 0.15 && s.f.sputter === 0)
        out.push({ cue: "lift", strength: 0.3 });
    const wasLanded = s.landed;
    s.landed = land !== null;
    if (land !== null && land >= 0) {
        if (!wasLanded) out.push({ cue: "place", strength: 0.3, pitch: 0.9 });
        s.checkpoint = land;
        if (!s.told.includes(land)) {
            s.told = [...s.told, land];
            const l = L.ledges[land];
            if (l) s.note = `Landed at ${l.m} m. A fall from here comes back to this spot.`;
        }
    }
    bumps(s, out);
    caught(s, out);
    const t = s.steps / RATE,
        mid = middleOf(s.f);
    s.stars.forEach((p, i) => {
        if (p.gone > 0) p.gone--;
        if (p.gone !== 0 || s.won) return;
        const at = shineAt(p, t, i);
        if (Math.hypot(at.x - mid.x, at.y - mid.y) < REACH) catchStar(s, i, out);
    });
    s.crew.forEach((c, i) => {
        if (c.got || s.won) return;
        const at = shineAt(c, t, i + 7);
        if (Math.hypot(at.x - mid.x, at.y - mid.y) < REACH) rescue(s, i, out);
    });
    s.top = Math.max(s.top, metresAt(L, s.f.y));
    if (L.ask.kind === "free") s.best = Math.max(s.best, s.top);
    if (L.ask.kind === "hold" && !s.won) held(s, L.ask, out);
    settle(s);
    return out;
}

function settle(s: FlyState): void {
    s.cam = follow(s.cam, cameraFor(s.f), {
        rate: 3.2,
        dt: 1 / RATE,
        view: VIEW,
        world: worldOf(s.L),
    });
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
};

/**
 * Where a backdrop at `depth` is drawn so it slides past slower than the world: at its own height when
 * the camera is there, and carried along with the camera by a share of how far off it is. The share
 * is a third of the sideways parallax's, since a climb crosses a band in seconds and a stronger drift
 * would bring the aurora down to the garden.
 */
const far = (s: FlyState, y: number, depth: number): number =>
    y + (s.cam.y - y) * (1 - depth) * 0.3;

type Wash = "sky" | "pen" | "berry" | "mint";
/** The sky's colour by band, washes laid over one another: pale blue low down, lavender past the aurora, pale indigo by the moon. */
const WASH: Record<Band, readonly (readonly [Wash, number])[]> = {
    garden: [],
    clouds: [["sky", 0.1]],
    aurora: [
        ["sky", 0.18],
        ["mint", 0.05],
    ],
    edge: [
        ["sky", 0.2],
        ["pen", 0.05],
    ],
    ringed: [
        ["sky", 0.1],
        ["pen", 0.07],
        ["berry", 0.07],
    ],
    nebula: [
        ["berry", 0.09],
        ["pen", 0.08],
    ],
    station: [
        ["pen", 0.11],
        ["sky", 0.08],
    ],
    belt: [
        ["pen", 0.11],
        ["berry", 0.05],
    ],
    moon: [["pen", 0.12]],
};
/** A wash is drawn 46 squares across, so 15.3 tall with a 3.8-square ramp at each end; laid 11.5 apart, the ramps cross. */
const WASH_W = 46,
    WASH_H = (WASH_W * 12) / 36,
    WASH_RAMP = (WASH_W * 3) / 36;
/** The Earth below is drawn 54 squares across, so its rim's top is 4.5 squares under the drawing's top and its middle 4.5 under the rim. */
const EARTH_W = 54,
    EARTH_K = EARTH_W / 36;

/** The bands of sky behind the play, each from the shelf, at their heights and depths. */
function backdrops(s: FlyState, sprites: Sprite[], rest: boolean): void {
    const L = s.L,
        ground = groundOf(L),
        t = rest ? 0 : s.steps / RATE,
        reach = VIEW.h * 1.6;
    const shimmer = (i: number) => (rest ? 1 : 0.7 + 0.3 * Math.sin(t * 1.4 + i * 2.1));
    L.bands.forEach((b, k) => {
        const y0 = yAt(L, b.to),
            y1 = yAt(L, b.from);
        for (const [j, [tone, alpha]] of WASH[b.kind].entries())
            for (
                let c = y1 + WASH_RAMP / 2 - WASH_H / 2;
                c + WASH_H / 2 > y0 + WASH_RAMP / 2;
                c -= WASH_H - WASH_RAMP
            ) {
                if (Math.abs(c - s.cam.y) > WASH_H / 2 + reach) continue;
                sprites.push({
                    key: `wash:${k}:${j}:${Math.round(c * 10)}`,
                    art: "skyband",
                    params: { kind: "wash", tone, n: 0 },
                    x: W / 2,
                    y: c,
                    size: WASH_W,
                    z: 0,
                    alpha,
                    still: true,
                });
            }
    });
    // the Earth stays below Bolt, its rim held near the foot of the view and sinking as Bolt climbs on into space
    const edge = L.bands.find((b) => b.kind === "edge");
    if (edge) {
        const climb = metresAt(L, s.cam.y) - edge.from,
            show = Math.min(1, (climb + 30) / 40),
            rim = s.cam.y + VIEW.h / 2 - 7 + Math.max(0, climb / PER) * 0.2;
        if (show > 0 && rim < s.cam.y + VIEW.h / 2 + 2)
            sprites.push({
                key: "earth",
                art: "skyband",
                params: { kind: "earthcurve", tone: "sky", n: 0 },
                x: W / 2,
                y: rim + 3 * EARTH_K,
                size: EARTH_W,
                z: 0,
                alpha: 0.9 * show,
            });
    }
    L.bands.forEach((b, k) => {
        const y0 = yAt(L, b.to),
            y1 = yAt(L, b.from),
            mid = (y0 + y1) / 2,
            span = y1 - y0;
        if (Math.abs(s.cam.y - mid) > span / 2 + reach) return;
        const put = (key: string, sp: Omit<Sprite, "key" | "y">, y: number, depth: number) =>
            sprites.push({ ...sp, key: `band:${k}:${key}`, y: rest ? y : far(s, y, depth) });
        const scatter = (each: number, fn: (i: number, y: number) => void) => {
            const n = Math.max(1, Math.round(span / each));
            for (let i = 0; i < n; i++) fn(i, y1 - ((i + 0.5) * span) / n);
        };
        const cloud = (n: number) => ({ kind: "cumulus", tone: "sky", n: n % 2 });
        const stars = (alpha: number) => {
            scatter(9, (i, y) =>
                put(
                    `stars:${i}`,
                    {
                        art: "skyplanet",
                        params: { kind: "stars" },
                        x: 4 + hash(i, k + 31) * 32,
                        size: 6,
                        z: 0,
                        alpha: alpha * shimmer(i),
                    },
                    y,
                    0.3,
                ),
            );
            scatter(13, (i, y) =>
                put(
                    `dust:${i}`,
                    {
                        art: "skyplanet",
                        params: { kind: "stars" },
                        x: 2 + hash(i, k + 57) * 36,
                        size: 4,
                        z: 0,
                        alpha: alpha * 0.6 * shimmer(i + 5),
                        flip: i % 2 === 0,
                    },
                    y + 4,
                    0.15,
                ),
            );
        };
        switch (b.kind) {
            case "garden":
                for (const [i, x] of [10, 32].entries())
                    sprites.push({
                        key: `band:${k}:hill:${i}`,
                        art: "parkhill",
                        params: { w: 18, h: 4 + i * 2, snow: 0 },
                        x,
                        y: ground,
                        stand: true,
                        z: 0,
                        alpha: 0.5,
                        still: true,
                    });
                sprites.push(
                    {
                        key: `band:${k}:roofs`,
                        art: "houses",
                        params: { count: 3, windows: 2 },
                        x: 9,
                        y: ground - 0.4,
                        stand: true,
                        size: 9,
                        z: 0,
                        alpha: 0.4,
                        still: true,
                    },
                    {
                        key: `band:${k}:houses`,
                        art: "houses",
                        params: { count: 2, windows: 2 },
                        x: 31,
                        y: ground,
                        stand: true,
                        size: 11,
                        z: 1,
                        still: true,
                    },
                    {
                        key: `band:${k}:tree`,
                        art: "tree",
                        params: { fruit: 4, fallen: 0, item: "apple" },
                        x: 16,
                        y: ground,
                        stand: true,
                        size: 8,
                        z: 1,
                        still: true,
                    },
                    {
                        key: `band:${k}:hedge`,
                        art: "hedge",
                        params: { clumps: 4, berries: 3, gap: 0 },
                        x: 23,
                        y: ground,
                        stand: true,
                        size: 8,
                        z: 1,
                        still: true,
                    },
                );
                put(
                    "kite:0",
                    {
                        art: "flyingkite",
                        params: { shape: "diamond", tone: "berry", look: "kite" },
                        x: 34,
                        size: 2.4,
                        z: 0,
                        alpha: 0.9,
                        angle: Math.sin(t * 1.1) * 0.12,
                    },
                    ground - 16,
                    0.7,
                );
                put(
                    "kite:1",
                    {
                        art: "flyingkite",
                        params: { shape: "delta", tone: "tang", look: "kite" },
                        x: 10,
                        size: 2,
                        z: 0,
                        alpha: 0.85,
                        angle: Math.sin(t * 0.9 + 1) * 0.1,
                    },
                    ground - 23,
                    0.6,
                );
                return;
            case "clouds":
                // three depths of cloud: small and faint far off, tall stacks to the sides, and big ones passing close at the edges
                scatter(7, (i, y) =>
                    put(
                        `far:${i}`,
                        {
                            art: "skyband",
                            params: cloud(i),
                            x: 3 + hash(i, k + 5) * 34,
                            size: 6,
                            z: 0,
                            alpha: 0.4,
                        },
                        y,
                        0.3,
                    ),
                );
                scatter(11, (i, y) =>
                    put(
                        `cloud:${i}`,
                        {
                            art: "skyband",
                            params: cloud(i + 1),
                            x: i % 2 ? 6 + hash(i, k + 3) * 6 : 28 + hash(i, k + 3) * 6,
                            size: 11,
                            z: 0,
                            alpha: 0.75,
                            flip: i % 3 === 2,
                        },
                        y,
                        0.55,
                    ),
                );
                scatter(26, (i, y) =>
                    put(
                        `near:${i}`,
                        {
                            art: "skyband",
                            params: cloud(i),
                            x: i % 2 ? -3 : W + 3,
                            size: 17,
                            z: 0,
                            alpha: 0.45,
                        },
                        y + 6,
                        0.85,
                    ),
                );
                put(
                    "balloon",
                    {
                        art: "balloon",
                        params: { panels: 6, bags: 2 },
                        x: 31,
                        size: 4,
                        z: 0,
                        alpha: 0.8,
                    },
                    mid,
                    0.5,
                );
                put(
                    "birds",
                    {
                        art: "starlings",
                        params: { count: 12, swirl: 0.4 },
                        x: 9,
                        size: 7,
                        z: 0,
                        alpha: 0.55,
                    },
                    y0 + span * 0.7,
                    0.6,
                );
                put(
                    "plane",
                    {
                        art: "seaplane",
                        params: { facing: -1 },
                        x: rest ? 30 : W + 6 - ((t * 1.2) % (W + 12)),
                        size: 3,
                        z: 0,
                        alpha: 0.55,
                    },
                    y0 + span * 0.35,
                    0.35,
                );
                return;
            case "aurora":
                stars(0.35);
                // two layers of curtains swaying past one another, their light breathing slowly
                scatter(24, (i, y) => {
                    const sway = rest ? 0 : Math.sin(t * 0.35 + i * 1.3) * 0.8,
                        glow = rest ? 1 : 0.8 + 0.2 * Math.sin(t * 0.6 + i);
                    put(
                        `aurora:${i}`,
                        {
                            art: "skyband",
                            params: { kind: "aurora", tone: "sky", n: i % 2 },
                            x: W / 2 + sway + (i % 2 ? 2 : -2),
                            size: 50,
                            z: 0,
                            alpha: 0.6 * glow,
                        },
                        y,
                        0.35,
                    );
                    if (i % 2 === 0)
                        put(
                            `veil:${i}`,
                            {
                                art: "skyband",
                                params: { kind: "aurora", tone: "sky", n: (i + 1) % 2 },
                                x: W / 2 - sway * 1.4,
                                size: 44,
                                z: 0,
                                alpha: 0.3 * (rest ? 1 : 1.2 - glow * 0.4),
                            },
                            y + 12,
                            0.5,
                        );
                });
                return;
            case "edge":
                stars(0.8);
                return;
            case "ringed":
                stars(0.8);
                put(
                    "haze",
                    {
                        art: "skyband",
                        params: { kind: "nebula", tone: "sky", n: 1 },
                        x: 14,
                        size: 50,
                        z: 0,
                        alpha: 0.25,
                    },
                    mid + 6,
                    0.15,
                );
                put(
                    "ringed",
                    {
                        art: "skyplanet",
                        params: { kind: "ringed" },
                        x: 29,
                        size: 24,
                        z: 0,
                        alpha: 0.7,
                    },
                    mid,
                    0.2,
                );
                put(
                    "moonlet",
                    {
                        art: "skyplanet",
                        params: { kind: "small" },
                        x: 7,
                        size: 5,
                        z: 0,
                        alpha: 0.55,
                    },
                    y0 + span * 0.3,
                    0.25,
                );
                return;
            case "nebula":
                stars(0.8);
                put(
                    "nebula",
                    {
                        art: "skyband",
                        params: { kind: "nebula", tone: "sky", n: 0 },
                        x: 16,
                        size: 50,
                        z: 0,
                        alpha: 0.8,
                    },
                    mid,
                    0.25,
                );
                put(
                    "bloom",
                    {
                        art: "skyband",
                        params: { kind: "nebula", tone: "sky", n: 1 },
                        x: 27,
                        size: 42,
                        z: 0,
                        alpha: 0.55,
                    },
                    y0 + span * 0.25,
                    0.4,
                );
                put(
                    "comets",
                    {
                        art: "skyband",
                        params: { kind: "comets", tone: "sky", n: 0 },
                        x: W / 2,
                        size: 42,
                        z: 0,
                        alpha: 0.7,
                    },
                    y0 + span * 0.6,
                    0.35,
                );
                return;
            case "station":
                stars(0.7);
                put(
                    "farstation",
                    {
                        art: "spacestation",
                        params: { wings: 1 },
                        x: 9,
                        size: 8,
                        z: 0,
                        alpha: 0.45,
                    },
                    y0 + span * 0.25,
                    0.2,
                );
                put(
                    "station",
                    {
                        art: "spacestation",
                        params: { wings: 2 },
                        x: 27,
                        size: 22,
                        z: 0,
                        alpha: 0.8,
                    },
                    mid,
                    0.4,
                );
                return;
            case "belt":
                stars(0.7);
                put(
                    "giant",
                    {
                        art: "skyplanet",
                        params: { kind: "giant" },
                        x: 8,
                        size: 14,
                        z: 0,
                        alpha: 0.5,
                    },
                    mid,
                    0.2,
                );
                // rocks at three depths: grit far off, rocks in the middle, and a few big ones drifting close at the edges
                scatter(4, (i, y) =>
                    put(
                        `grit:${i}`,
                        {
                            art: "spacerock",
                            params: { kind: i % 3 ? "asteroid" : "crystal" },
                            x: 2 + hash(i, k + 19) * 36,
                            size: 1,
                            z: 0,
                            alpha: 0.3,
                        },
                        y,
                        0.25,
                    ),
                );
                scatter(6, (i, y) =>
                    put(
                        `rock:${i}`,
                        {
                            art: "spacerock",
                            params: { kind: i % 2 ? "crystal" : "asteroid" },
                            x: 3 + hash(i, k + 13) * 34,
                            size: 2,
                            z: 0,
                            alpha: 0.45,
                        },
                        y,
                        0.5,
                    ),
                );
                scatter(16, (i, y) =>
                    put(
                        `boulder:${i}`,
                        {
                            art: "spacerock",
                            params: { kind: i % 2 ? "asteroid" : "crystal" },
                            x: i % 2 ? -1 : W + 1,
                            size: 3.6,
                            z: 0,
                            alpha: 0.4,
                            angle: rest ? 0 : t * 0.1 * (i % 2 ? 1 : -1),
                        },
                        y + 5,
                        0.85,
                    ),
                );
                return;
            case "moon": {
                stars(0.8);
                put(
                    "home",
                    {
                        art: "skyplanet",
                        params: { kind: "earth" },
                        x: 31,
                        size: 7,
                        z: 0,
                        alpha: 0.85,
                    },
                    y0 + 2,
                    0.2,
                );
                const rock = L.ledges.find((l) => l.look === "moon");
                if (rock)
                    sprites.push({
                        key: `band:${k}:flag`,
                        art: "flag",
                        params: { stripes: 3 },
                        x: rock.x1 - 6,
                        y: yAt(L, rock.m),
                        stand: true,
                        size: 2.6,
                        z: 4.5,
                        still: true,
                    });
                return;
            }
        }
    });
}

/** Streaks where the air moves, carried the way it blows, so a child sees a current before Bolt feels it. */
function currents(s: FlyState, sprites: Sprite[], rest: boolean): void {
    if (rest) return;
    const L = s.L,
        t = s.steps / RATE;
    (L.currents ?? []).forEach((c, k) => {
        const y0 = yAt(L, c.to),
            y1 = yAt(L, c.from);
        if (y1 < s.cam.y - VIEW.h || y0 > s.cam.y + VIEW.h) return;
        for (let j = 0; j < 8; j++) {
            if (c.x0 !== undefined && c.x1 !== undefined) {
                const h = y1 - y0,
                    y = y1 - ((j * 7.1 + t * (c.up ?? 1) * 1.6) % h);
                sprites.push({
                    key: `air:${k}:${j}`,
                    art: "guststreak",
                    params: { length: 4, curl: j % 2 },
                    x: c.x0 + ((j * 2.3) % Math.max(1, c.x1 - c.x0)),
                    y,
                    size: 3,
                    angle: -Math.PI / 2,
                    z: 3,
                    alpha: 0.5,
                });
                continue;
            }
            const span = W + 8,
                x = ((((j * 6.7 + t * c.x * 1.5) % span) + span) % span) - 4;
            sprites.push({
                key: `air:${k}:${j}`,
                art: "guststreak",
                params: { length: 4 + (j % 3), curl: j % 2 },
                x,
                y: y1 - (((j * 13 + k * 5) % 17) / 17) * (y1 - y0),
                size: 4,
                z: 3,
                alpha: 0.55,
                ...(c.x < 0 ? { flip: true } : {}),
            });
        }
    });
}

export function flyFrame(s: FlyState, rest = false): Frame {
    const L = s.L,
        f = s.f,
        t = s.steps / RATE,
        ground = groundOf(L),
        world = worldOf(L),
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    backdrops(s, sprites, rest);
    currents(s, sprites, rest);
    for (let x = -10; x < W + 10; x += 19.4)
        sprites.push({
            key: `ground:${x}`,
            art: "kiteground",
            params: { w: 20, ground: "grass" },
            x: x + 10,
            y: ground + 0.9,
            z: 2,
            still: true,
        });
    // five metres to a square, so the pole reads Bolt's height in fifties
    for (let m = 0; m < L.top; m += 50)
        sprites.push({
            key: `pole:${m}`,
            art: "altpole",
            params: { from: m, top: m + 50 >= L.top },
            x: 1.8,
            y: yAt(L, m),
            stand: true,
            size: 3,
            z: 3,
            still: true,
        });
    L.ledges.forEach((l, i) => {
        const deep = l.look === "moon" ? 3 : 1;
        for (let x = l.x0; x < l.x1 - 1e-6; x += 10) {
            const w = Math.min(10, l.x1 - x);
            sprites.push({
                key: `ledge:${i}:${x}`,
                art: "planetground",
                params: { kind: l.look, w: Math.round(w), h: deep },
                x: x + w / 2,
                y: yAt(L, l.m) + deep / 2,
                size: w,
                z: 4,
                still: true,
            });
        }
    });
    for (const m of L.moons ?? []) {
        const y = yAt(L, m.m);
        sprites.push({
            key: `moon:${m.x}:${m.m}`,
            art: "skyplanet",
            params: { kind: "small" },
            x: m.x,
            y,
            size: m.r * 4,
            z: 4,
            still: true,
        });
        // the pull's reach, so a child sees where the path will bend
        marks.push({ kind: "ring", x: m.x, y, r: m.reach });
    }
    (L.hazards ?? []).forEach((h, i) => {
        const at = hazardAt(L, h, rest ? 0 : t);
        sprites.push(
            h.kind === "puff"
                ? {
                      key: `hazard:${i}`,
                      art: "cloud",
                      params: { puffs: 4, rain: 0 },
                      x: at.x,
                      y: at.y,
                      size: 4,
                      z: 5,
                  }
                : {
                      key: `hazard:${i}`,
                      art: "spacerock",
                      params: { kind: h.kind },
                      x: at.x,
                      y: at.y,
                      size:
                          h.kind === "satellite"
                              ? 3.2
                              : h.kind === "comet"
                                ? 3.6
                                : HIT[h.kind] * 2.2,
                      z: 5,
                      ...(h.kind === "comet" && (h.speed ?? 4) < 0 ? { flip: true } : {}),
                  },
        );
    });
    const a = L.ask;
    s.stars.forEach((p, i) => {
        if (p.gone < 0 || (p.gone > 0 && p.gone > RATE * 0.5)) return;
        const at = shineAt(p, rest ? 0 : t, i),
            back = p.gone > 0 ? 1 - p.gone / (RATE * 0.5) : 1,
            lit = a.kind === "order" && a.seq[s.next] === p.n && L.preview > 0;
        sprites.push({
            key: `star:${i}`,
            art: "numberstar",
            params: { n: p.n, tone: p.tone },
            x: at.x,
            y: at.y,
            size: 2,
            z: 9,
            alpha: back,
            ...(lit ? { glow: 1.6 } : {}),
        });
    });
    s.crew.forEach((c, i) => {
        if (c.got) return;
        const at = shineAt(c, rest ? 0 : t, i + 7);
        sprites.push({
            key: `crew:${i}`,
            art: "crewbot",
            params: { colour: c.colour, mood: "awake", n: 0 },
            x: at.x,
            y: at.y,
            size: 1.7,
            z: 9,
        });
    });
    const cheering = s.won || recent(s.cheer, s.steps, RATE * 1.4);
    sprites.push({
        key: "charlie",
        art: "charlie",
        params: {
            ...CHARLIE_LOOK,
            pose: cheering ? "cheer" : "wave",
            mood: cheering ? "excited" : "happy",
            holding: "",
            dir: 1,
        },
        x: 4,
        y: ground,
        size: 4.5,
        stand: true,
        z: 6,
        seed: 5,
    });
    const pose = s.won
        ? "cheer"
        : s.landed
          ? "stand"
          : f.thrust > 0.35 && f.sputter === 0
            ? "fly"
            : "hover";
    const showBolt = rest || s.blink === 0 || Math.floor(s.blink / 4) % 2 === 0;
    if (showBolt) {
        sprites.push({
            key: "bolt",
            art: "boltbot",
            params: { pose, gear: "none" },
            x: f.x,
            y: f.y,
            size: 2.3,
            stand: true,
            z: 11,
            ...(rest ? {} : { angle: f.lean }),
            // the jets' heat warms Bolt as it nears a sputter
            ...(f.heat > 0.55 ? { glow: (f.heat - 0.55) * 4 } : {}),
        });
        const on = f.sputter > 0 ? !rest && Math.floor(s.steps / 3) % 2 === 0 : f.thrust > 0.08;
        if (on && !s.landed)
            for (const dx of [-0.32, 0.32])
                sprites.push({
                    key: `flame:${dx}`,
                    art: "spacekit",
                    params: {
                        kind: "flame",
                        n: f.sputter > 0 ? 1 : 1 + Math.round(f.thrust * 2),
                        on: true,
                    },
                    x: f.x + dx + Math.sin(f.lean) * 0.25,
                    y: f.y + 0.45 + f.thrust * 0.4,
                    size: 0.8 + f.thrust * 0.6,
                    z: 10.9,
                    glow: 0.5 + f.thrust * 0.9,
                    ...(rest ? {} : { angle: f.lean }),
                });
        if (f.heat > 0.02 || f.sputter > 0)
            sprites.push({
                key: "heat",
                art: "spacekit",
                params: { kind: "fuel", n: Math.ceil((1 - f.heat) * 6), on: true },
                x: f.x,
                y: f.y - 1.7,
                size: 4.2,
                z: 10.8,
                alpha: 0.8,
                live: true,
            });
    }
    if (!s.won && L.preview > 0 && !rest) {
        const pts = aheadOf(s, L.preview);
        if (pts.length > 1) marks.push({ kind: "dots", pts, faint: true });
    }
    if (a.kind === "hold") {
        const y = yAt(L, a.m);
        marks.push(
            { kind: "line", a: { x: 3, y }, b: { x: W - 1, y }, style: "aim" },
            {
                kind: "dots",
                pts: Array.from({ length: 13 }, (_, i) => ({ x: 3 + i * 3, y: y - 2 })),
                faint: true,
                opacity: 0.5,
            },
            {
                kind: "dots",
                pts: Array.from({ length: 13 }, (_, i) => ({ x: 3 + i * 3, y: y + 2 })),
                faint: true,
                opacity: 0.5,
            },
        );
    }
    if (a.kind === "hold" || a.kind === "free")
        marks.push({
            kind: "dots",
            pts: Array.from({ length: Math.max(0, Math.floor((f.x - 3.5) / 1.5)) }, (_, i) => ({
                x: 3 + i * 1.5,
                y: f.y - BODY,
            })),
            faint: true,
            opacity: 0.6,
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
    // a star or a crew robot flying behind the board shows through it, since the board is drawn over the sky
    const z = s.cam.zoom,
        behind = [
            ...s.stars.filter((p) => p.gone === 0).map((p, i) => shineAt(p, rest ? 0 : t, i)),
            ...s.crew.filter((c) => !c.got).map((c, i) => shineAt(c, rest ? 0 : t, i + 7)),
        ].some((p) => {
            const vx = VIEW.w / 2 + (p.x - s.cam.x) * z,
                vy = VIEW.h / 2 + (p.y - s.cam.y) * z;
            return Math.abs(vx - VIEW.w / 2) < 7.5 + z && vy > 0.6 - z && vy < 4.6 + z;
        });
    // over the middle of the sky, where a phone held upright still shows all of it
    sprites.push({
        key: "board",
        art: "kiteboard",
        params: { tone: "sky" },
        x: VIEW.w / 2,
        y: 2.6,
        size: 15,
        z: 20,
        fixed: true,
        alpha: behind ? 0.3 : 1,
    });
    marks.push(
        { kind: "word", x: VIEW.w / 2, y: 2.1, text: askWords(s), size: 0.85, fixed: true },
        { kind: "word", x: VIEW.w / 2, y: 3.5, text: tallyWords(s), size: 0.7, fixed: true },
    );
    return {
        sprites,
        marks,
        camera: { x: s.cam.x, y: s.cam.y, zoom: s.cam.zoom },
        focus: { x: f.x, y: s.cam.y },
        chase: true,
        view: { ...VIEW },
        world: { ...world },
        time: rest ? 0 : t,
    };
}

/** The flight's own sounds: the jets catching, a star's chime pitched by its number, a sputter, a bump, a landing and the way back. */
const SOUNDS: Kit = {
    lift: [
        { wave: "noise", hz: 1800, attack: 0.01, decay: 0.12, gain: 0.2 },
        { wave: "sine", hz: 220, to: 330, attack: 0.01, decay: 0.15, gain: 0.18 },
    ],
    ring: [
        { wave: "triangle", hz: 880, to: 1320, attack: 0.003, decay: 0.16, gain: 0.3 },
        { wave: "sine", hz: 1760, attack: 0.003, decay: 0.1, gain: 0.1, delay: 0.04 },
    ],
    place: [{ wave: "triangle", hz: 260, to: 220, attack: 0.002, decay: 0.12, gain: 0.2 }],
    bump: [
        { wave: "noise", hz: 700, attack: 0.002, decay: 0.08, gain: 0.25 },
        { wave: "sine", hz: 300, to: 180, attack: 0.002, decay: 0.14, gain: 0.3 },
    ],
    creak: [
        { wave: "noise", hz: 900, attack: 0.002, decay: 0.06, gain: 0.25 },
        { wave: "noise", hz: 900, attack: 0.002, decay: 0.06, gain: 0.2, delay: 0.12 },
        { wave: "noise", hz: 900, attack: 0.002, decay: 0.06, gain: 0.15, delay: 0.26 },
    ],
    back: [{ wave: "sine", hz: 440, to: 660, attack: 0.01, decay: 0.2, gain: 0.22 }],
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

function say(s: FlyState): string {
    const f = s.f,
        m = Math.round(metresAt(s.L, f.y));
    const where = s.landed
        ? `Bolt is standing at ${m} metres.`
        : `Bolt is flying at ${m} metres, ${f.vy < -0.5 ? "climbing" : f.vy > 0.5 ? "falling" : "hovering"}, with the jets ${f.sputter > 0 ? "sputtering" : f.heat > 0.7 ? "hot" : "cool"}.`;
    const left = s.stars.filter((p) => p.gone === 0).map((p) => p.n);
    return `${askWords(s)}. ${tallyWords(s)}. ${where}${left.length ? ` Stars: ${left.join(", ")}.` : ""}`;
}

const isBest = (v: unknown): v is { best: number } =>
    typeof v === "object" &&
    v !== null &&
    "best" in v &&
    typeof v.best === "number" &&
    Number.isFinite(v.best) &&
    v.best >= 0;

export const boltflyGame: ActionGame<FlyState> = {
    id: "boltfly",
    title: "Bolt's sky flight",
    group: "action",
    card: { round: { level: 0 }, keep: 30, minutes: 2 },
    portrait: { keep: 22 },
    quiet: true,
    touch: true,
    wasd: true,
    levels: FLY_LEVELS,
    rate: RATE,
    cover: { art: "boltflycover", params: { stars: 2 } },
    hint: "Hold a finger in the sky and Bolt flies there. With the keys, up or space fires the jets, left and right steer, and down dives. Pulse the jets so they cool before they sputter.",
    controls: {},
    sounds: SOUNDS,
    saves: { level: FLY_LEVELS.length - 1 },
    checkpoint: (s) => ({ best: Math.round(Math.max(s.best, s.top)) }),
    restore: (s, v) => {
        if (!isBest(v)) return false;
        s.best = Math.max(s.best, Math.round(v.best));
        return true;
    },
    start: (phase) => startFly(FLY_LEVELS[phase] ?? FLY_LEVELS[0], phase),
    step: stepFly,
    say,
    note: (s) => (!s.touched && !s.won ? s.L.prompt : s.note),
    won: (s) => s.won,
    ended: (s) =>
        s.won ? { won: true, words: s.note } : s.out ? { won: false, words: s.note } : null,
    objectives: (s) => {
        const a = s.L.ask;
        switch (a.kind) {
            case "count":
            case "fives":
                return { completed: s.counted.length, total: a.count };
            case "sum":
                return { completed: Math.min(a.total, sumOf(s.counted)), total: a.total };
            case "order":
                return { completed: s.next, total: a.seq.length };
            case "hold":
                return { completed: s.won ? 1 : 0, total: 1 };
            case "crew":
                return { completed: s.rescued, total: a.count };
            case "free":
                return { completed: 0, total: 1 };
        }
    },
    frame: flyFrame,
    cancelInput: (s) => {
        s.hands = { lift: 0, steer: 0, dive: false };
    },
    hum: (s): Hum[] => [
        {
            kind: "water",
            level: s.landed ? 0 : Math.min(0.4, s.f.thrust * 0.4),
            pitch: 0.8 + s.f.thrust * 0.7 + s.f.heat * 0.3,
        },
        { kind: "wind", level: Math.min(0.4, 0.04 + Math.hypot(s.f.vx, s.f.vy) / 40) },
    ],
    tuning: FLY,
    still: {
        press: () => Math.round(RATE * 0.3),
        settling: (s) => !s.won && !s.out && (s.stun > 0 || s.blink > 0),
    },
};
