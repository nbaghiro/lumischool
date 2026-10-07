// Hoops in the yard: Charlie shoots a basketball at a hoop over the garage, from spots chalked on the
// drive that are worth points. A finger pulls back and lets go, or the arrows turn the aim and set the
// power and space shoots, and the ball flies, spins and bounces as a real one does
// (engine/motion/hoop.ts): it can swish, rattle in, kiss the board or bounce out off the front of the
// rim. Every shot is set by hand: the aim goes back to the same soft lob once the ball is back, and
// after a basket the spots are chalked again a little nearer or further and sometimes on a kerb, a step
// or a crate, so a throw found once does not go in twice. The mathematics is in the targets: an exact
// score, a second hoop worth more, only baskets off the board, round the world in order, a number made
// three ways, Pip's baskets to copy, and a score against the clock. See .docs/games.md.
import {
    aimOfPull,
    launchOf,
    stepAim,
    strength,
    type Aim,
    type AimSpec,
} from "../../engine/motion/aim";
import { actor, actorSprites, stepActor, type Actor, type Cycle } from "../../engine/motion/actor";
import { follow, type Cam } from "../../engine/motion/camera";
import type { Pt } from "../../engine/motion/geometry";
import {
    freshSensor,
    netAt,
    netPoint,
    NET_ROWS,
    shakeNet,
    stepBall,
    stepNet,
    type Ball,
    type Court,
    type HoopEvent,
    type Net,
    type Rim,
    type Sensor,
} from "../../engine/motion/hoop";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import { BACKBOARD } from "../../engine/parts/sport/backboard";
import { STEP_LIFT } from "../../engine/parts/home/yardstep";
import { panOf, type Hum, type Kit } from "../../engine/sound/kit";
import type { ActionGame, ActionLevel, Levels } from "./game";

const RATE = 60,
    DT = 1 / RATE;

/** The yard in squares: the ground a ball bounces on, the hoop's middle across, the ball's radius and the fence at the far end. */
export const YARD = {
    floor: 22,
    hoop: 38,
    r: 0.5,
    tube: 0.08,
    /** How far above the ground the ball leaves Charlie's hands, and Pip's paws. */
    hand: 4.5,
    paws: 2.6,
    fence: 46,
} as const;
const WORLD = { w: 48, h: 26 };
/** The world once the round is over: paper under the drive, so the yard can rise above the round's card. */
const ENDED = { w: 48, h: 34 };
const worldOf = (s: HoopState) => (s.mode === "won" || s.mode === "out" ? ENDED : WORLD);
const VIEW = { w: 40, h: 24 };

export const HOOPS = {
    gravity: knob(
        30,
        20,
        40,
        1,
        "squares a second each second",
        "a long shot is in the air for about a second and a half, long enough to watch it drop",
    ),
    rim: knob(
        0.65,
        0.3,
        0.8,
        0.05,
        "of the speed",
        "a steel rim gives back most of a hit, so a ball that only just reaches the back rim rattles round and a long one clanks out",
    ),
    board: knob(
        0.8,
        0.3,
        0.9,
        0.05,
        "of the speed",
        "a backboard is hard: a soft bank off the painted square drops in, and a long throw high on the board comes back out over the rim",
    ),
    bounce: knob(
        0.72,
        0.5,
        0.85,
        0.01,
        "of the speed",
        "a pumped basketball comes back to about half the height it fell from on tarmac",
    ),
    spin: knob(
        0.1,
        0,
        0.5,
        0.05,
        "of the throw's speed at the ball's skin",
        "a shot rolls off the fingertips with a little backspin, enough to soften a touch on the rim without pulling a long ball off the board into the hoop",
    ),
};

/**
 * A shot: from a soft lob to a long hard throw, up into the sky and never back over the shooter. No
 * steeper than 63 degrees, since a near-vertical lob drops in from almost anywhere; a pull of a square
 * changes the power by six, so the narrow run of powers a long shot needs is a fingertip wide.
 */
export const SHOT: AimSpec = {
    min: 12,
    max: 34,
    per: 6,
    dead: 0.4,
    lo: -1.1,
    hi: -0.35,
    turn: 0.55,
    ramp: 7,
    turns: "up",
};

/** The aim every shot starts from: a soft lob that falls well short, so each throw is set by hand. */
export const READY: Readonly<Aim> = { angle: -0.95, power: 13, pulling: false };

/** A chalked spot: where across the drive, and what a basket from it is worth (0 for a plain spot when the hoop sets the worth). */
interface Spot {
    x: number;
    n: number;
}

type Ask =
    | { kind: "exact"; total: number; bank?: true }
    | { kind: "ways"; total: number; ways: number }
    | { kind: "world" }
    | { kind: "copy"; matches: number }
    | { kind: "free" };

export interface HoopLevel extends ActionLevel {
    prompt: string;
    ask: Ask;
    spots: Spot[];
    /** The most shots the child takes, or 0 for as many as they like. */
    shots: number;
    /** How high the rim is, in squares above the ground. */
    rim: number;
    /** Seconds of flight the dots show, to the first thing the ball would meet: 9 for all of it, 0 for none. */
    preview: number;
    /** The dots turn green when the shot as aimed would go in and count. */
    green: boolean;
    /**
     * The green band on the power gauge, the powers that go in at the angle aimed: all of them, only
     * the middle half of each run, or none where the dots or the child's own eye do the job.
     */
    band: "full" | "core" | "none";
    /** Squares either way a spot is chalked again after each basket. */
    shift: number;
    /** Some spots are chalked on a kerb, a step or a crate. */
    lifts?: true;
    /** Squares a second each second along the yard; more than nought blows towards the hoop. */
    wind?: number;
    /** The wind changes between shots, from a little against to half as much again. */
    gusts?: true;
    /** A tall hedge between the spots and the hoop, by its left side, width and height in squares. */
    hedge?: { x: number; w: number; h: number };
    /** A branch overhead, by its left side, width, and how high its underside is above the ground. */
    branch?: { x: number; w: number; h: number };
    /** A hoop that slides along a rail on the garage: squares either way, and seconds for one there and back. */
    slide?: { by: number; period: number };
    /** A low hoop on its own pole in front of the high one, and what a basket in each is worth. */
    low?: { x: number; rim: number; n: number; top: number };
    /** Seconds on the clock, with a rack of balls so the shots keep coming. */
    clock?: number;
    /** An evening game under the porch light. */
    dusk?: true;
}

const S1 = YARD.hoop - 7,
    S2 = YARD.hoop - 12,
    S3 = YARD.hoop - 18;

const SPOTS: Spot[] = [
    { x: S1, n: 1 },
    { x: S2, n: 2 },
    { x: S3, n: 3 },
];

export const HOOP_LEVELS: Levels<HoopLevel> = [
    {
        title: "First baskets",
        grades: [1, 2],
        goal: "Make exactly 3 points. The spots are worth 1 and 2.",
        prompt: "Pull back anywhere and let go. Green dots mean it will go in.",
        ask: { kind: "exact", total: 3 },
        spots: [
            { x: S1, n: 1 },
            { x: S2, n: 2 },
        ],
        shots: 12,
        rim: 9,
        preview: 9,
        green: true,
        band: "none",
        shift: 2.2,
        lifts: true,
    },
    {
        title: "Make exactly 7",
        grades: [1, 2],
        goal: "Make exactly 7 points from the spots worth 1, 2 and 3.",
        prompt: "Tap a spot to walk to it. After a basket the spots move, so aim again.",
        ask: { kind: "exact", total: 7 },
        spots: SPOTS,
        shots: 10,
        rim: 9.5,
        preview: 9,
        green: true,
        band: "none",
        shift: 2,
        lifts: true,
    },
    {
        title: "Two hoops",
        grades: [1, 2],
        goal: "The low hoop is worth 2 and the high hoop 3. Make exactly 10.",
        prompt: "Choose a hoop for each throw. Which 2s and 3s make 10?",
        ask: { kind: "exact", total: 10 },
        spots: [
            { x: 25, n: 0 },
            { x: 20.5, n: 0 },
        ],
        shots: 10,
        rim: 11,
        preview: 0.6,
        green: true,
        band: "full",
        shift: 2,
        lifts: true,
        low: { x: 32, rim: 7, n: 2, top: 3 },
    },
    {
        title: "A gusty day",
        grades: [2, 3],
        goal: "Make exactly 10 using only 2s and 3s, while the wind changes.",
        prompt: "Watch the wind sock before each throw. It changes every time.",
        ask: { kind: "exact", total: 10 },
        spots: [
            { x: S2, n: 2 },
            { x: S3, n: 3 },
        ],
        shots: 10,
        rim: 9.5,
        preview: 0,
        green: false,
        band: "full",
        shift: 2.5,
        lifts: true,
        wind: 2.5,
        gusts: true,
    },
    {
        title: "Hedge and branch",
        grades: [2, 3],
        goal: "Throw over the hedge and under the branch. Make exactly 9.",
        prompt: "Too low hits the hedge and too high hits the branch. Find the arc between.",
        ask: { kind: "exact", total: 9 },
        spots: [
            { x: S1 - 2.5, n: 1 },
            { x: S2 - 1.5, n: 2 },
            { x: S3 - 1, n: 3 },
        ],
        shots: 12,
        rim: 9.5,
        preview: 0,
        green: false,
        band: "full",
        shift: 2,
        lifts: true,
        hedge: { x: YARD.hoop - 4, w: 2, h: 7 },
        branch: { x: 16, w: 14, h: 13 },
    },
    {
        title: "Off the board",
        grades: [2, 3],
        goal: "Only baskets off the backboard count. Make exactly 8.",
        prompt: "Throw a little long so the ball hits the board and drops in.",
        ask: { kind: "exact", total: 8, bank: true },
        spots: SPOTS,
        shots: 12,
        rim: 9.5,
        preview: 0,
        green: true,
        band: "full",
        shift: 2,
        lifts: true,
    },
    {
        title: "Around the world",
        grades: [2, 3],
        goal: "Make a basket from each spot in order, 1 to 5. What do they add up to?",
        prompt: "A basket takes you to the next spot. A miss means try again from there.",
        ask: { kind: "world" },
        spots: [
            { x: 32, n: 1 },
            { x: 28.2, n: 2 },
            { x: 24.4, n: 3 },
            { x: 20.6, n: 4 },
            { x: 16.8, n: 5 },
        ],
        shots: 15,
        rim: 9.5,
        preview: 0,
        green: false,
        band: "core",
        shift: 1.2,
        lifts: true,
    },
    {
        title: "Three ways at dusk",
        grades: [3, 4],
        goal: "Make 6 three different ways, like 3 + 3, under the porch light.",
        prompt: "Each time you make 6 the board starts again. Use a different mix each time.",
        ask: { kind: "ways", total: 6, ways: 3 },
        spots: SPOTS,
        shots: 18,
        rim: 9.5,
        preview: 0,
        green: false,
        band: "core",
        shift: 2,
        lifts: true,
        dusk: true,
    },
    {
        title: "The sliding hoop",
        grades: [3, 4],
        goal: "The hoop slides along the garage door. Make exactly 6.",
        prompt: "Watch where the hoop will be when the ball gets there, and let go early.",
        ask: { kind: "exact", total: 6 },
        spots: SPOTS,
        shots: 12,
        rim: 9.5,
        preview: 0,
        green: false,
        band: "none",
        shift: 2.5,
        lifts: true,
        slide: { by: 2.5, period: 4 },
    },
    {
        title: "Copy Pip",
        grades: [3, 4],
        goal: "When Pip makes a basket, make the same one. Copy 3 before you spell PIP.",
        prompt: "Pip chooses the spot. Miss the copy and you get a letter.",
        ask: { kind: "copy", matches: 3 },
        spots: SPOTS,
        shots: 0,
        rim: 9.5,
        preview: 0,
        green: false,
        band: "none",
        shift: 2,
        lifts: true,
    },
    {
        title: "Beat the clock",
        grades: [3, 4],
        goal: "Make exactly 12 before 30 seconds are up.",
        prompt: "The rack hands you a new ball straight away. Plan your spots and be quick.",
        ask: { kind: "exact", total: 12 },
        spots: SPOTS,
        shots: 0,
        rim: 9.5,
        preview: 0,
        green: false,
        band: "none",
        shift: 2,
        lifts: true,
        clock: 30,
    },
    {
        title: "Shoot-around",
        grades: [1, 4],
        goal: "Shoot for fun round the drive. How many baskets can you make in a row?",
        prompt: "No score to make. A basket takes you to the next spot, and your best run is kept.",
        ask: { kind: "free" },
        spots: [
            { x: S2, n: 2 },
            { x: S3, n: 3 },
            { x: 23, n: 2 },
            { x: S1, n: 1 },
            { x: 28.5, n: 1 },
        ],
        shots: 0,
        rim: 9.5,
        preview: 0,
        green: true,
        band: "none",
        shift: 1.4,
        lifts: true,
    },
];

type Act = "ready" | "walk" | "follow" | "cheer" | "watch";
const ACTS: Record<Act, Cycle> = {
    ready: { poses: ["shoot"] },
    walk: { poses: ["walk"] },
    follow: { poses: ["release"] },
    cheer: { poses: ["cheer", "jump"], every: 0.35 },
    watch: { poses: ["stand"] },
};

/** Where a shooter stands: across the drive, and how high whatever they stand on lifts them. */
interface Place {
    x: number;
    lift: number;
}

/** A shot in the air: whose it was, what it is worth, and how it has gone. */
interface Shot {
    by: "child" | "pup";
    sensor: Sensor;
    /** The first thing it met, for the note on a miss. */
    first: { kind: HoopEvent["kind"]; x: number; y: number } | null;
    /** It met the board before it went in, and it met nothing at all before it went in. */
    banked: boolean;
    clean: boolean;
    /** The angle it was thrown at, and where it first came down past each rim's height, high hoop first, with how steeply. */
    angle: number;
    cross: ({ x: number; dive: number } | null)[];
    /** Steps since it was let go, and since it was settled in or out. */
    t: number;
    result: "in" | "out" | null;
    since: number;
}

export interface HoopState {
    phase: number;
    L: HoopLevel;
    seed: number;
    /** Lining up, walking to a spot, the ball in the air, the ball coming back, or the round over. */
    mode: "aim" | "walk" | "flight" | "back" | "won" | "out";
    turn: "child" | "pup";
    spot: number;
    /** Where Charlie stands on the drive and how high she stands, and where she is walking to. */
    at: number;
    lift: number;
    place: Place;
    aim: Aim;
    ball: Ball;
    shot: Shot | null;
    /** Where the ball came back from, and how far through its trip it is, from nought to one. */
    back: { from: Pt; k: number } | null;
    net: Net;
    /** The wind for this throw, which changes between throws on a gusty day. */
    wind: number;
    /** Baskets that counted, in order, for the sum on the board; the ways found so far; shots the child has taken. */
    made: number[];
    ways: number[][];
    taken: number;
    /** Every basket the child has made, counted or not, which chalks the spots again. */
    makes: number;
    /** Baskets in a row, for the glow of a hot hand. */
    run: number;
    /** Pip's baskets and shots, where Pip stands, and the letters of PIP the child has. */
    pup: { made: number[]; taken: number; wait: number; at: Place; spot: number };
    letters: number;
    /** Steps left on the clock, on a level against it. */
    left: number;
    streak: number;
    best: number;
    down: Pt | null;
    hand: Pt | null;
    pulling: boolean;
    brakeWas: boolean;
    note: string;
    touched: boolean;
    steps: number;
    cam: Cam;
    act: Actor<Act>;
    trail: Pt[];
    /** The flight of the throw in the air, and of the child's last throw, left on the paper until the spot moves. */
    flight: Pt[];
    last: Pt[];
    /** Words going up from the hoop; a miss's word stays put and stays longer, since it says what to change. */
    pops: {
        text: string;
        x: number;
        y: number;
        age: number;
        big?: true;
        size?: number;
        stay?: true;
    }[];
    cheer: number;
    clang: number;
}

/** Steps after a shot is settled before the ball comes back, and steps it takes to come back. */
const LINGER = { in: 24, out: 14 } as const,
    RACKED = { in: 10, out: 6 } as const,
    RETURN = 18,
    PUP_WAIT = 50;
const RACK_X = S3 - 4;

/** A number from nought to one for draw `n` of a sequence, the same every time for one seed. */
function luck(seed: number, n: number): number {
    let h = Math.imul(seed ^ 0x9e3779b9, 2654435761) ^ Math.imul(n + 1, 40503);
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const LIFTS = [0, STEP_LIFT.kerb, STEP_LIFT.step, STEP_LIFT.crate] as const;

/**
 * Where spot `i` is chalked after `k` baskets. Each basket moves it to the other side of where it was
 * first chalked, most of the level's shift away, and on a level with them onto another height, so
 * the throw that went in last lands short or long from the new place.
 */
export function placeOf(L: HoopLevel, seed: number, i: number, k: number): Place {
    const sp = L.spots[i] ?? L.spots[0] ?? { x: S1, n: 1 };
    if (k === 0 || L.shift <= 0) return { x: sp.x, lift: 0 };
    const side = (k + (luck(seed + i * 131, 0) < 0.5 ? 0 : 1)) % 2 === 0 ? -1 : 1;
    const x = Math.min(
        YARD.hoop - 4.5,
        sp.x + side * L.shift * (0.7 + 0.3 * luck(seed + i * 131, k)),
    );
    let j = 0;
    if (L.lifts)
        for (let n = 1; n <= k; n++)
            j = (j + 1 + Math.floor(luck(seed + 977 + i, n) * 3)) % LIFTS.length;
    return { x: Math.round(x * 10) / 10, lift: LIFTS[j] ?? 0 };
}

/** The wind for throw `k`: the level's own, or on a gusty day anything from a little against it to half as much again. */
function windOf(L: HoopLevel, seed: number, k: number): number {
    const w = L.wind ?? 0;
    if (!L.gusts) return w;
    return Math.round(w * (-0.5 + 2 * luck(seed + 4021, k)) * 2) / 2;
}

const spotOf = (s: HoopState): Spot => s.L.spots[s.spot] ?? s.L.spots[0] ?? { x: S1, n: 1 };

/** Where the ball leaves a shooter's hands, at a place. */
export const handAt = (p: Place, pup = false): Pt =>
    pup
        ? { x: p.x + 0.3, y: YARD.floor - YARD.paws - p.lift }
        : { x: p.x + 0.1, y: YARD.floor - YARD.hand - p.lift };

/** Where the ball leaves the shooter's hands now. */
export const handOf = (s: HoopState): Pt =>
    s.turn === "pup" ? handAt(s.pup.at, true) : handAt({ x: s.at, lift: s.lift });

/** How far the hoop has slid at step `clock`, and how fast it is sliding then. */
function slideAt(L: HoopLevel, clock: number): { dx: number; vx: number } {
    if (!L.slide) return { dx: 0, vx: 0 };
    const w = (2 * Math.PI) / (L.slide.period * RATE),
        k = clock * w;
    return { dx: L.slide.by * Math.sin(k), vx: L.slide.by * Math.cos(k) * w * RATE };
}

const rimAt = (L: HoopLevel, clock: number): Rim => {
    const sl = slideAt(L, clock);
    return {
        x: YARD.hoop + sl.dx,
        y: YARD.floor - L.rim,
        half: BACKBOARD.half,
        tube: YARD.tube,
        vx: sl.vx,
    };
};

const lowRim = (low: NonNullable<HoopLevel["low"]>): Rim => ({
    x: low.x,
    y: YARD.floor - low.rim,
    half: BACKBOARD.half,
    tube: YARD.tube,
});

/** A hoop's board, and its pole unless it hangs on the garage. */
function boardOf(rim: Rim, pole: boolean): Court["blocks"] {
    const out: Court["blocks"] = [
        {
            kind: "board",
            x: rim.x + (BACKBOARD.face - BACKBOARD.rim),
            y: rim.y - BACKBOARD.above,
            w: BACKBOARD.thick,
            h: BACKBOARD.above + BACKBOARD.below,
            bounce: HOOPS.board.value,
            grip: 0.3,
            vx: rim.vx ?? 0,
        },
    ];
    if (pole)
        out.push({
            kind: "board",
            x: rim.x + (BACKBOARD.pole - BACKBOARD.rim),
            y: rim.y - BACKBOARD.above + BACKBOARD.poleTop,
            w: BACKBOARD.poleW,
            h: YARD.floor - (rim.y - BACKBOARD.above + BACKBOARD.poleTop),
            bounce: 0.5,
            grip: 0.2,
        });
    return out;
}

/** The yard as the ball meets it at step `clock` in `wind`: the hoops and boards where they are, a hedge, a branch, the ground and the fence. */
function courtAt(L: HoopLevel, clock: number, wind = L.wind ?? 0): Court {
    const rim = rimAt(L, clock);
    const blocks = boardOf(rim, !L.slide);
    if (L.low) blocks.push(...boardOf(lowRim(L.low), true));
    if (L.hedge)
        blocks.push({
            kind: "hedge",
            x: L.hedge.x,
            y: YARD.floor - L.hedge.h,
            w: L.hedge.w,
            h: L.hedge.h,
            bounce: 0.12,
            grip: 0.9,
        });
    if (L.branch)
        blocks.push({
            kind: "branch",
            x: L.branch.x,
            y: YARD.floor - L.branch.h - 1,
            w: L.branch.w,
            h: 1,
            bounce: 0.2,
            grip: 0.8,
        });
    return {
        r: YARD.r,
        gravity: HOOPS.gravity.value,
        drag: 0.04,
        wind,
        floor: YARD.floor,
        wall: YARD.fence,
        rim,
        ...(L.low ? { rims: [lowRim(L.low)] } : {}),
        blocks,
        rimBounce: HOOPS.rim.value,
        rimGrip: 0.35,
        floorBounce: HOOPS.bounce.value,
        floorGrip: 0.4,
    };
}

/** The ball let go from `from` at `v`, spinning back as a shot rolls off the fingers. */
const released = (from: Pt, v: Pt): Ball => ({
    x: from.x,
    y: from.y,
    vx: v.x,
    vy: v.y,
    spin: (-HOOPS.spin.value * Math.hypot(v.x, v.y) * Math.sign(v.x || 1)) / YARD.r,
    turn: 0,
});

/** How a shot is settled after one step's events: in when a net counted it, out when it touched the ground, left the yard or took too long. */
function settle(b: Ball, sensor: Sensor, events: readonly HoopEvent[], t: number) {
    if (sensor.scored) return "in";
    if (events.some((e) => e.kind === "floor")) return "out";
    if (b.x < -1 || b.x > WORLD.w + 1 || t > RATE * 6) return "out";
    return null;
}

export interface Flight {
    scored: boolean;
    /** The hoop it went through: 0 the high one, 1 the low one. */
    hoop: number;
    banked: boolean;
    clean: boolean;
    pts: Pt[];
    first: HoopEvent["kind"] | null;
}

/**
 * Flies a shot let go from `from` at `v` at step `clock` in `wind` to where it is settled, through the
 * same step the game uses: whether and where it goes in, off the board or clean, the dots of its
 * flight to the first thing it meets, and what that is.
 */
export function flightOf(L: HoopLevel, from: Pt, v: Pt, clock: number, wind = L.wind ?? 0): Flight {
    const b = released(from, v),
        sensor = freshSensor(),
        pts: Pt[] = [];
    let first: HoopEvent["kind"] | null = null,
        banked = false,
        clean = true;
    for (let t = 1; t <= RATE * 6; t++) {
        const events = stepBall(b, courtAt(L, clock + t, wind), sensor, DT);
        for (const e of events) {
            if (e.kind === "score") break;
            if (e.kind === "board") banked = true;
            if (e.kind === "board" || e.kind === "rim") clean = false;
        }
        if (!first && events[0]) first = events[0].kind;
        if (!first && t % 3 === 0) pts.push({ x: b.x, y: b.y });
        const r = settle(b, sensor, events, t);
        if (r)
            return {
                scored: r === "in",
                hoop: sensor.hoop,
                banked: r === "in" && banked,
                clean: r === "in" && clean,
                pts,
                first,
            };
    }
    return { scored: false, hoop: -1, banked: false, clean: false, pts, first };
}

/** What a basket through `hoop` is worth from where the shooter stands. */
function worthOf(s: HoopState, hoop: number): number {
    if (s.L.low) return hoop === 1 ? s.L.low.n : s.L.low.top;
    if (s.turn === "pup") return s.L.spots[s.pup.spot]?.n ?? 2;
    return spotOf(s).n;
}

/** Whether a shot that goes in counts towards the ask, before any total: off the board where only those count. */
export const countsAs = (L: HoopLevel, f: Pick<Flight, "scored" | "banked">): boolean =>
    f.scored && (L.ask.kind !== "exact" || !L.ask.bank || f.banked);

/** The level's target now, or none. */
function targetOf(s: HoopState): number {
    const a = s.L.ask;
    if (a.kind === "exact" || a.kind === "ways") return a.total;
    if (a.kind === "world") return s.L.spots.reduce((t, p) => t + p.n, 0);
    if (a.kind === "copy") return a.matches;
    return Infinity;
}

const sum = (ns: readonly number[]) => ns.reduce((a, b) => a + b, 0);
const tally = (ns: readonly number[]) =>
    ns.length > 1 ? `${ns.join(" + ")} = ${sum(ns)}` : ns.length ? String(ns[0]) : "0";

export function startHoops(L: HoopLevel, phase = 0, seed = 1): HoopState {
    const first = placeOf(L, seed, 0, 0);
    const copy = L.ask.kind === "copy";
    const s: HoopState = {
        phase,
        L,
        seed,
        mode: "aim",
        turn: copy ? "pup" : "child",
        spot: 0,
        at: first.x,
        lift: first.lift,
        place: first,
        aim: { ...READY },
        ball: { x: 0, y: 0, vx: 0, vy: 0, spin: 0, turn: 0 },
        shot: null,
        back: null,
        net: netAt(rimAt(L, 0)),
        wind: windOf(L, seed, 0),
        made: [],
        ways: [],
        taken: 0,
        makes: 0,
        run: 0,
        pup: { made: [], taken: 0, wait: PUP_WAIT, at: { x: S2, lift: 0 }, spot: 1 },
        letters: 0,
        left: Math.round((L.clock ?? 0) * RATE),
        streak: 0,
        best: 0,
        down: null,
        hand: null,
        pulling: false,
        brakeWas: false,
        note: "",
        touched: false,
        steps: 0,
        cam: { x: 24, y: 12.5, zoom: 1 },
        act: actor<Act>("ready", "shoot"),
        trail: [],
        flight: [],
        last: [],
        pops: [],
        cheer: 0,
        clang: 0,
    };
    if (copy) {
        pipPlace(s);
        // Charlie waits off to the side while Pip shoots
        s.at = s.place.x = Math.max(4, S3 - 6);
        s.lift = s.place.lift = 0;
    }
    holdBall(s);
    s.cam = { ...wanted(s) };
    return s;
}

/** Pip's spot and place for the next shot, chosen by the seed. */
function pipPlace(s: HoopState): void {
    const i = Math.floor(luck(s.seed + 7919, s.pup.taken) * s.L.spots.length);
    s.pup.spot = i;
    s.pup.at = placeOf(s.L, s.seed + 53, i, s.pup.taken + 1);
}

/** The ball in the shooter's hands. */
function holdBall(s: HoopState): void {
    const h = handOf(s);
    Object.assign(s.ball, { x: h.x, y: h.y - YARD.r * 0.6, vx: 0, vy: 0, spin: 0 });
}

const pan = (s: HoopState, x: number) => panOf(x, s.cam.x, VIEW.w / s.cam.zoom);

function shoot(s: HoopState, v: Pt, out: Happening[]): void {
    const from = handOf(s),
        by = s.turn;
    s.ball = released(from, v);
    s.shot = {
        by,
        sensor: freshSensor(),
        angle: Math.atan2(v.y, v.x),
        cross: [null, null],
        first: null,
        banked: false,
        clean: true,
        t: 0,
        result: null,
        since: 0,
    };
    s.mode = "flight";
    s.trail = [];
    s.flight = by === "child" ? [{ x: s.ball.x, y: s.ball.y }] : [];
    s.down = null;
    s.hand = null;
    s.pulling = false;
    if (by === "child") {
        s.taken++;
        s.note = "";
    } else s.pup.taken++;
    out.push({
        cue: "creak",
        strength: Math.min(1, Math.hypot(v.x, v.y) / SHOT.max),
        pan: pan(s, from.x),
    });
}

/** Whether the child may choose where to shoot from, or the level walks them round. */
const chooses = (L: HoopLevel) =>
    L.spots.length > 1 && L.ask.kind !== "world" && L.ask.kind !== "copy";

/** Sends Charlie to spot `i` as it is chalked now. */
function goTo(s: HoopState, i: number, out: Happening[], say = true): void {
    if (!s.L.spots[i]) return;
    s.spot = i;
    s.place = placeOf(s.L, s.seed, i, s.makes);
    if (s.place.x === s.at && s.place.lift === s.lift) return;
    s.mode = "walk";
    s.last = [];
    const n = spotOf(s).n;
    if (say && n > 0) s.note = `The ${n} spot: a basket from here is worth ${n}.`;
    out.push({ cue: "lift", strength: 0.4, pitch: 0.9 + n * 0.1 });
}

/** The spot under a finger on the drive, if there is one. */
function spotUnder(s: HoopState, p: Pt): number {
    if (p.y < YARD.floor - 1.5 || p.y > YARD.floor + 3) return -1;
    let best = -1,
        d = 1.8;
    s.L.spots.forEach((_, i) => {
        const e = Math.abs(placeOf(s.L, s.seed, i, s.makes).x - p.x);
        if (e < d) {
            d = e;
            best = i;
        }
    });
    return best;
}

/**
 * The hands while lining up: a pull back from wherever the finger went down above the drive (or from
 * the ball), a tap on a spot to walk to it, or the keys.
 */
function aimHands(s: HoopState, pad: Pad, out: Happening[]): void {
    if (pad.brake && !s.brakeWas && chooses(s.L)) goTo(s, (s.spot + 1) % s.L.spots.length, out);
    s.brakeWas = pad.brake;
    if (s.mode !== "aim") return;
    const at = handOf(s);
    if (pad.touch) {
        s.touched = true;
        if (!s.down) {
            s.down = { ...pad.touch };
            const onBall = Math.hypot(pad.touch.x - at.x, pad.touch.y - at.y) <= 2.6;
            s.pulling = onBall || pad.touch.y < YARD.floor - 1.5;
            // a pull from the ball is measured from the ball, so the band starts in the hand
            if (onBall) s.down = { ...at };
        }
        const pull = { x: pad.touch.x - s.down.x, y: pad.touch.y - s.down.y };
        s.hand = s.pulling ? { x: at.x + pull.x, y: at.y + pull.y } : null;
        if (s.pulling && Math.hypot(pull.x, pull.y) >= SHOT.dead) s.aim = aimOfPull(pull, SHOT);
        return;
    }
    if (pad.lifted && s.down) {
        const downAt = s.down,
            pull = { x: pad.lifted.x - downAt.x, y: pad.lifted.y - downAt.y },
            was = s.pulling;
        s.down = null;
        s.hand = null;
        s.pulling = false;
        s.aim.pulling = false;
        if (was && Math.hypot(pull.x, pull.y) >= SHOT.dead) {
            s.aim = { ...aimOfPull(pull, SHOT), pulling: false };
            shoot(s, launchOf(s.aim), out);
        } else if (!was && Math.hypot(pull.x, pull.y) < 0.8 && chooses(s.L))
            goTo(s, spotUnder(s, downAt), out);
        return;
    }
    s.down = null;
    s.hand = null;
    s.pulling = false;
    if (pad.holding.length || pad.pressed.length || pad.tapped) s.touched = true;
    const v = stepAim(s.aim, pad, SHOT, DT);
    if (v) shoot(s, v, out);
}

/** The sounds and marks of what the ball met this step, and whether it met the board or the rim before it went in. */
function contacts(s: HoopState, events: readonly HoopEvent[], out: Happening[]): void {
    const shot = s.shot;
    let through = false;
    for (const e of events) {
        if (shot && !shot.first) shot.first = { kind: e.kind, x: e.x, y: e.y };
        if (e.kind === "score") {
            through = true;
            const swish = !!shot && shot.clean;
            if (swish) shakeNet(s.net, 0.09);
            out.push(
                { cue: "splash", strength: swish ? 1 : 0.8, pan: pan(s, e.x) },
                { burst: { kind: "sparkle", x: e.x, y: e.y + 0.6, n: swish ? 9 : 4 } },
            );
            continue;
        }
        if (shot && !shot.result && !through && (e.kind === "board" || e.kind === "rim")) {
            shot.clean = false;
            if (e.kind === "board") shot.banked = true;
        }
        if (e.speed < 0.8) continue;
        if (e.kind === "rim") {
            shakeNet(s.net, Math.min(0.08, e.speed * 0.006));
            if (s.clang > 0) continue;
            s.clang = 5;
            out.push({
                cue: "ring",
                strength: Math.min(1, e.speed / 12),
                // a hard hit rings higher and brighter than a soft roll round the rim
                pitch: 0.85 + Math.min(0.5, e.speed / 24),
                pan: pan(s, e.x),
            });
        } else if (e.kind === "board" || e.kind === "wall")
            out.push({ cue: "bump", strength: Math.min(1, e.speed / 14), pan: pan(s, e.x) });
        else if (e.kind === "hedge" || e.kind === "branch")
            out.push(
                { cue: "crash", strength: Math.min(1, e.speed / 16), pan: pan(s, e.x) },
                { burst: { kind: "dust", x: e.x, y: e.y, n: 3 } },
            );
        else if (e.kind === "floor" && e.speed > 1.2)
            out.push({ cue: "place", strength: Math.min(1, e.speed / 12), pan: pan(s, e.x) });
    }
}

/** The rims a shot can go through, the high hoop first. */
const rimsOf = (s: HoopState): Rim[] =>
    s.L.low ? [rimAt(s.L, s.steps), lowRim(s.L.low)] : [rimAt(s.L, s.steps)];

/** How big a miss's word is written, a little smaller than a basket's, since it says what to change rather than cheers. */
const MISS_SIZE = 0.8;

/** Squares past the rim's middle within which a miss is "a little" short or long rather than plainly so. */
const NEAR = 2.3;

/**
 * Why a shot that did not go in missed, from its real flight: what it met first, and where it came
 * down past the rim's height. A short word for over the hoop, and a line a child can act on, with a
 * hint about the angle on the levels below grade four when the angle is the likely cause.
 */
function missOf(s: HoopState, shot: Shot): { word: string; note: string; rim: Rim } {
    const f = shot.first,
        rims = rimsOf(s),
        high = rimAt(s.L, s.steps);
    if (f?.kind === "hedge")
        return { word: "Hedge", note: "Into the hedge. Aim higher.", rim: high };
    if (f?.kind === "branch")
        return { word: "Branch", note: "Into the branch. A flatter throw.", rim: high };
    // the rim it came down nearest, or the high one when it never came down past either
    let k = 0;
    shot.cross.forEach((c, i) => {
        const best = shot.cross[k];
        const r = rims[i];
        const rk = rims[k];
        if (c && r && rk && (!best || Math.abs(c.x - r.x) < Math.abs(best.x - rk.x))) k = i;
    });
    const rim = rims[k] ?? high,
        c = shot.cross[k],
        d = c && rim ? c.x - rim.x : -Infinity,
        half = rim.half;
    let word: string, note: string, side: "short" | "long" | "rim";
    if (f?.kind === "rim" && f.x < rim.x) {
        [word, note, side] = ["Front rim", "Off the front rim. A touch more power.", "short"];
    } else if (f?.kind === "board" && f.y > rim.y + 0.3) {
        // under the rim's height a board is the pole or the board's foot: the ball came in low and short
        [word, note, side] = ["Under the hoop", "Short, under the hoop. More power.", "short"];
    } else if (f?.kind === "board") {
        [word, note, side] = ["Off the board", "Off the back of the board. Less power.", "long"];
    } else if (f?.kind === "rim") {
        [word, note, side] = ["Back rim", "Off the back rim. A touch less power.", "long"];
    } else if (d < -half) {
        [word, note, side] =
            d > -NEAR
                ? ["A little short", "A little short. A touch more power.", "short"]
                : ["Short", "Short: more power.", "short"];
    } else if (d > half) {
        [word, note, side] =
            d < NEAR
                ? ["A little long", "A little long. A touch less power.", "long"]
                : ["Long", "Long: less power.", "long"];
    } else [word, note, side] = ["So close", "Just missed.", "rim"];
    if (s.L.grades[1] <= 3) {
        // flatter than about 38 degrees comes into the rim side on and catches its front; steeper than about 58 drops long
        if (shot.angle > -0.66 && side !== "long") note += " Too flat: aim higher.";
        else if (shot.angle < -1.02 && side === "long") note += " Very high: a bit flatter.";
    }
    return { word, note, rim };
}

/** Steps of power the band is first looked for in, and how finely its edges are found after. */
const BAND_STEP = 0.25,
    BAND_EDGE = 0.02;

const bands = new WeakMap<HoopLevel, Map<string, [number, number][]>>();

/**
 * The runs of power that go in and count from where the shooter stands at the angle aimed, worked out
 * by the same flight as the throw, as the level shows them: whole, the middle half of each, or none.
 * Kept per level, place, wind and angle to the hundredth of a radian, since the hoop does not move on
 * a level with a band.
 */
export function sweetBand(s: HoopState): [number, number][] {
    if (s.L.band === "none" || s.L.slide || s.turn !== "child") return [];
    const angle = Math.round(s.aim.angle * 100) / 100,
        from = handOf(s),
        key = `${from.x.toFixed(2)}:${from.y.toFixed(2)}:${s.wind}:${angle}`;
    let known = bands.get(s.L);
    if (!known) {
        known = new Map();
        bands.set(s.L, known);
    }
    let runs = known.get(key);
    if (!runs) {
        const goes = (p: number) =>
            countsAs(
                s.L,
                flightOf(
                    s.L,
                    from,
                    { x: Math.cos(angle) * p, y: Math.sin(angle) * p },
                    s.steps,
                    s.wind,
                ),
            );
        // the edge between a power that goes in and one that does not, to within BAND_EDGE
        const edge = (inside: number, outside: number) => {
            while (Math.abs(outside - inside) > BAND_EDGE) {
                const m = (inside + outside) / 2;
                if (goes(m)) inside = m;
                else outside = m;
            }
            return inside;
        };
        runs = [];
        let open: number | null = null,
            prev = SHOT.min;
        for (let p = SHOT.min; p <= SHOT.max + 1e-9; p += BAND_STEP) {
            const ok = goes(p);
            if (ok && open === null) open = p === SHOT.min ? p : edge(p, prev);
            if (!ok && open !== null) {
                runs.push([open, edge(prev, p)]);
                open = null;
            }
            prev = p;
        }
        if (open !== null) runs.push([open, SHOT.max]);
        known.set(key, runs);
    }
    if (s.L.band === "full") return runs;
    return runs.map(([a, b]) => [a + (b - a) / 4, b - (b - a) / 4]);
}

/** A basket made: counted, or turned down because it would go past the target or missed the board, or a run kept. */
function counted(s: HoopState, shot: Shot, out: Happening[]): void {
    const rim = shot.sensor.hoop === 1 && s.L.low ? lowRim(s.L.low) : rimAt(s.L, s.steps),
        a = s.L.ask,
        n = worthOf(s, shot.sensor.hoop),
        pop = (text: string, big = false) =>
            s.pops.push({ text, x: rim.x, y: rim.y - 1.2, age: 0, ...(big ? { big: true } : {}) });
    if (shot.by === "pup") {
        s.pup.made.push(n);
        s.cheer = RATE;
        pop(`+${n}`);
        s.note = `Pip scores from the ${n} spot. Now you make that one.`;
        return;
    }
    s.makes++;
    s.run++;
    if (shot.clean) pop("Swish", true);
    if (s.run === 3) s.note = "Three in a row. You're on fire.";
    if (a.kind === "free") {
        s.streak++;
        s.best = Math.max(s.best, s.streak);
        s.cheer = RATE;
        pop(`${s.streak}`);
        s.note = `${s.streak} in a row${s.streak === s.best && s.streak > 1 ? ", your best" : ""}.`;
        out.push({ cue: "level", strength: Math.min(1, 0.4 + s.streak * 0.1) });
        return;
    }
    if (a.kind === "copy") {
        s.made.push(n);
        s.cheer = RATE;
        pop("Copied");
        s.note = `Copied. ${s.made.length} of ${a.matches}.`;
        out.push({ cue: "level", strength: 0.6 });
        return;
    }
    if (a.kind === "world") {
        s.made.push(n);
        s.cheer = RATE;
        pop(`+${n}`);
        s.note = `${tally(s.made)}.`;
        out.push({ cue: "level", strength: 0.6 });
        return;
    }
    if (a.kind === "exact" && a.bank && !shot.banked) {
        pop("not off the board");
        s.note = "In, but not off the board, so it does not count. Hit the board first.";
        out.push({ cue: "nope" });
        return;
    }
    const now = sum(s.made);
    if (now + n > a.total) {
        pop("too many");
        s.note = `In, but ${now} + ${n} = ${now + n}, past ${a.total}, so it does not count. Try for fewer points.`;
        out.push({ cue: "nope" });
        return;
    }
    s.made.push(n);
    s.cheer = RATE;
    if (!shot.clean) pop(`+${n}`);
    out.push({ cue: "level", strength: shot.clean ? 0.9 : 0.6 });
    if (a.kind === "ways" && sum(s.made) === a.total) {
        const way = [...s.made].sort((x, y) => y - x);
        const key = way.join(" + ");
        s.made = [];
        if (s.ways.some((w) => w.join(" + ") === key)) {
            s.note = `You made ${a.total} as ${key} already. Find another way.`;
            return;
        }
        s.ways.push(way);
        const left = a.ways - s.ways.length;
        s.note = `${key} = ${a.total}. ${left > 0 ? `${left} more way${left === 1 ? "" : "s"} to find.` : "Three ways!"}`;
        return;
    }
    if (s.run !== 3) s.note = `${tally(s.made)}.`;
}

/** The round's ask is met. */
function met(s: HoopState): boolean {
    const a = s.L.ask;
    if (a.kind === "free") return false;
    if (a.kind === "ways") return s.ways.length >= a.ways;
    if (a.kind === "world") return s.made.length >= s.L.spots.length;
    if (a.kind === "copy") return s.made.length >= a.matches;
    return sum(s.made) === a.total;
}

function wonWords(s: HoopState): string {
    const a = s.L.ask;
    if (a.kind === "ways")
        return `Three ways to make ${a.total}: ${s.ways.map((w) => w.join(" + ")).join(", ")}.`;
    if (a.kind === "world") return `All the way round: ${tally(s.made)}!`;
    if (a.kind === "copy")
        return `You copied Pip ${a.matches} times: ${tally(s.made)}, the same as Pip's ${tally(s.pup.made.slice(-a.matches))}.`;
    if (s.L.clock)
        return `${tally(s.made)}, with ${Math.ceil(s.left / RATE)} seconds to spare. Exactly ${a.kind === "exact" ? a.total : ""}!`;
    return `${tally(s.made)}. Exactly ${targetOf(s)}!`;
}

function outWords(s: HoopState): string {
    const a = s.L.ask;
    const got = s.made.length ? `${tally(s.made)}` : "no baskets yet";
    if (a.kind === "ways")
        return `Out of balls with ${s.ways.length} of ${a.ways} ways found. Good shooting, try again.`;
    if (a.kind === "copy")
        return `P, I, P: Pip wins this time, with ${s.made.length} of ${a.matches} copied. Another go?`;
    if (a.kind === "world")
        return `Out of balls at the ${spotOf(s).n} spot, with ${got}. Another go round?`;
    if (s.L.clock) return `Time's up, with ${got} towards ${targetOf(s)}. Another go?`;
    return `Out of balls this time, with ${got} towards ${targetOf(s)}. Another go?`;
}

/** The round cannot go on: the shots used up, the clock run down, or PIP spelled. */
function spent(s: HoopState): boolean {
    if (s.L.ask.kind === "copy") return s.letters >= 3;
    if (s.L.clock) return s.left <= 0;
    return s.L.shots > 0 && s.taken >= s.L.shots;
}

/** After the ball has come back: the round won or over, Pip's turn or the child's, and a fresh aim. */
function nextTurn(s: HoopState, shot: Shot, out: Happening[]): void {
    const a = s.L.ask;
    if (met(s)) {
        s.mode = "won";
        s.cheer = RATE * 3;
        s.note = wonWords(s);
        out.push({ cue: "win" });
        return;
    }
    if (spent(s)) {
        s.mode = "out";
        s.note = outWords(s);
        return;
    }
    s.aim = { ...READY };
    s.mode = "aim";
    if (shot.by === "pup") {
        if (shot.result === "in") {
            // Charlie steps up to exactly where Pip stood
            s.turn = "child";
            s.spot = s.pup.spot;
            s.place = { ...s.pup.at };
            s.mode = "walk";
            s.last = [];
        } else {
            pipPlace(s);
            s.pup.wait = PUP_WAIT;
        }
        holdBall(s);
        return;
    }
    s.wind = windOf(s.L, s.seed, s.taken);
    if (a.kind === "copy") {
        s.turn = "pup";
        pipPlace(s);
        s.pup.wait = PUP_WAIT;
        s.place = { x: Math.max(4, S3 - 6), lift: 0 };
        s.mode = "walk";
        s.last = [];
    } else if (shot.result === "in") {
        const next = a.kind === "world" || a.kind === "free" ? s.spot + 1 : s.spot;
        goTo(s, next % s.L.spots.length, out, false);
    }
    holdBall(s);
}

/**
 * Pip's shot from where Pip stands: a fixed angle and the power in the middle of the widest run of
 * powers that go in, or, on a shot luck says misses, one a little short that hits the front of the rim.
 */
function pupShot(s: HoopState): Pt {
    const from = handOf(s),
        angle = -1.0,
        clock = s.steps;
    let run: [number, number] | null = null,
        start: number | null = null;
    for (let p = SHOT.min; p <= SHOT.max + 1e-9; p += 0.1) {
        const v = { x: Math.cos(angle) * p, y: Math.sin(angle) * p };
        const ok = flightOf(s.L, from, v, clock, s.wind).scored;
        if (ok && start === null) start = p;
        if (!ok && start !== null) {
            if (!run || p - start > run[1] - run[0]) run = [start, p];
            start = null;
        }
    }
    const makes = luck(s.seed, s.pup.taken) < 0.65;
    const power = run ? (makes ? (run[0] + run[1]) / 2 : run[0] - 0.8) : SHOT.min;
    return { x: Math.cos(angle) * power, y: Math.sin(angle) * power };
}

function stepHoops(s: HoopState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    if (s.cheer > 0) s.cheer--;
    if (s.clang > 0) s.clang--;
    for (const p of s.pops) p.age += DT;
    s.pops = s.pops.filter((p) => p.age < (p.stay ? 2.2 : 1.1));
    const rim = rimAt(s.L, s.steps);
    // the clock starts with the first throw, so reading the ask costs no time
    if (s.L.clock && s.taken > 0 && s.mode !== "won" && s.mode !== "out" && s.left > 0) {
        s.left--;
        if (s.left === RATE * 5) out.push({ cue: "lift", strength: 0.5, pitch: 1.4 });
        if (s.left === 0) {
            out.push({ cue: "nope" });
            // the buzzer: a ball already in the air still counts, and one in the hands does not
            if (s.mode === "aim" || s.mode === "walk") {
                s.mode = met(s) ? "won" : "out";
                s.note = s.mode === "won" ? wonWords(s) : outWords(s);
                return out;
            }
        }
    }
    if (s.mode === "aim" && s.turn === "child") aimHands(s, pad, out);
    else if (s.mode === "walk") {
        if (pad.touch || pad.lifted || pad.tapped || pad.brake) s.touched = true;
        if (s.turn === "child") aimHands(s, pad, out);
        const to = s.place.x,
            step = 9 * DT;
        s.at = Math.abs(to - s.at) <= step ? to : s.at + Math.sign(to - s.at) * step;
        // stepping up onto a kerb, a step or a crate as she gets there
        const near = Math.abs(to - s.at) < 1.2 ? s.place.lift : 0;
        s.lift =
            Math.abs(near - s.lift) <= 6 * DT ? near : s.lift + Math.sign(near - s.lift) * 6 * DT;
        if (s.at === to && s.lift === s.place.lift) s.mode = "aim";
        holdBall(s);
    } else if (s.mode === "aim" && s.turn === "pup") {
        if (pad.touch || pad.tapped) s.touched = true;
        if (--s.pup.wait <= 0) shoot(s, pupShot(s), out);
    } else if (s.mode === "flight" && s.shot) {
        const shot = s.shot;
        shot.t++;
        const was = s.ball.y;
        const events = stepBall(s.ball, courtAt(s.L, s.steps, s.wind), shot.sensor, DT);
        contacts(s, events, out);
        if (s.steps % 2 === 0) s.trail = [...s.trail, { x: s.ball.x, y: s.ball.y }].slice(-12);
        if (!shot.result) {
            if (shot.by === "child" && shot.t % 2 === 0)
                s.flight.push({ x: s.ball.x, y: s.ball.y });
            rimsOf(s).forEach((r, k) => {
                if (shot.cross[k] || s.ball.vy <= 0 || was >= r.y || s.ball.y < r.y) return;
                shot.cross[k] = {
                    x: s.ball.x,
                    dive: Math.atan2(s.ball.vy, Math.abs(s.ball.vx)),
                };
            });
        }
        // a hot hand: sparks off the ball after three in a row
        if (shot.by === "child" && s.run >= 3 && !shot.result && s.steps % 5 === 0)
            out.push({ burst: { kind: "sparkle", x: s.ball.x, y: s.ball.y, n: 2 } });
        if (!shot.result) {
            shot.result = settle(s.ball, shot.sensor, events, shot.t);
            if (shot.result === "in") counted(s, shot, out);
            else if (shot.result === "out") {
                if (shot.by === "child") {
                    const miss = missOf(s, shot);
                    s.note = miss.note;
                    // the word goes up in the open sky in front of the hoop, clear of the board and pole behind it
                    const wide = miss.word.length * MISS_SIZE * 0.5;
                    s.pops.push({
                        text: miss.word,
                        x: miss.rim.x - miss.rim.half - 0.8 - wide / 2,
                        y: miss.rim.y - 2.2,
                        age: 0,
                        size: MISS_SIZE,
                        stay: true,
                    });
                    s.run = 0;
                    if (s.L.ask.kind === "free") s.streak = 0;
                    if (s.L.ask.kind === "copy") {
                        s.letters++;
                        s.note = `Missed the copy: that's ${"PIP".slice(0, s.letters).split("").join(", ")}.`;
                    }
                } else s.note = "Pip missed. Pip goes again.";
            }
        } else if (++shot.since >= (s.L.clock ? RACKED : LINGER)[shot.result]) {
            s.mode = "back";
            // against the clock the next ball comes off the rack
            s.back = {
                from: s.L.clock
                    ? { x: RACK_X + 2, y: YARD.floor - 1.5 }
                    : { x: s.ball.x, y: s.ball.y },
                k: 0,
            };
            s.trail = [];
            if (shot.by === "child" && s.flight.length > 1) s.last = s.flight;
            s.flight = [];
            out.push({ cue: "back", strength: 0.3 });
        }
    } else if (s.mode === "back" && s.back && s.shot) {
        s.back.k = Math.min(1, s.back.k + 1 / (s.L.clock ? 10 : RETURN));
        const to = handOf(s),
            k = s.back.k,
            e = 1 - (1 - k) * (1 - k);
        // a bounce pass, down to the drive halfway and up into the hands; off the rack, a short toss
        const ground = YARD.floor - YARD.r,
            from = s.back.from,
            dip = s.L.clock ? -1.2 : Math.max(0, ground - (from.y + to.y) / 2),
            v = s.L.clock ? Math.sin(Math.PI * k) : 1 - Math.abs(1 - 2 * k);
        s.ball.x = from.x + (to.x - from.x) * e;
        s.ball.y = from.y + (to.y - from.y) * e + v * dip;
        s.ball.turn -= 0.25;
        if (k >= 1) {
            const shot = s.shot;
            s.back = null;
            s.shot = null;
            nextTurn(s, shot, out);
        }
    }
    const inAir = s.mode === "flight" && s.shot !== null;
    stepNet(s.net, rim, inAir ? s.ball : null, YARD.r + 0.12, s.wind, DT);
    const act: Act =
        s.mode === "won" || (s.cheer > 0 && s.shot?.by !== "pup")
            ? "cheer"
            : s.mode === "walk" && s.turn === "child"
              ? "walk"
              : s.turn === "pup"
                ? "watch"
                : s.mode === "flight" && s.shot?.result === null
                  ? "follow"
                  : s.mode === "aim"
                    ? "ready"
                    : "watch";
    stepActor(s.act, act, ACTS, DT, s.at * 2, s.mode === "walk" && s.place.x < s.at ? -1 : 1);
    s.cam = follow(s.cam, wanted(s), { rate: 2, dt: DT, view: VIEW, world: worldOf(s) });
    return out;
}

/** Where the camera wants to be: framing the shooter and the hoop, and drifting a little after a long shot. */
function wanted(s: HoopState): Cam {
    // a zoom of one throughout, since a field held upright or a card crops the view by its focus and
    // a zoom would crop it again
    const from = Math.min(handOf(s).x, ...s.L.spots.map((p) => p.x));
    let x = (from - 4 + YARD.hoop + 6) / 2;
    if (s.mode === "flight") x += (s.ball.x - x) * 0.25;
    // once the round is over the yard rises, so the card under it leaves Charlie and the hoop in sight
    if (s.mode === "won" || s.mode === "out") return { x, y: YARD.floor - 2, zoom: 1 };
    // the drive's near edge kept at the foot of the view, so the spots and their numbers show
    return { x, y: YARD.floor + 2.9 - VIEW.h / 2, zoom: 1 };
}

/** The dots of the shot as it is lined up, as far as the level shows them, and whether it would go in and count. */
function preview(s: HoopState): { pts: Pt[]; scores: boolean } {
    if (s.L.preview <= 0 || s.mode !== "aim" || s.turn !== "child")
        return { pts: [], scores: false };
    const f = flightOf(s.L, handOf(s), launchOf(s.aim), s.steps, s.wind);
    const most = Math.ceil((s.L.preview * RATE) / 3);
    return { pts: f.pts.slice(0, most), scores: s.L.green && countsAs(s.L, f) };
}

const CHARLIE = {
    mood: "happy",
    hair: "ponytail",
    top: "tang",
    sleeves: "short",
    print: "star",
    wear: "shorts",
    bottom: "sky",
    pattern: "plain",
    feet: "shoes",
    holding: "",
};

/** The yard behind the court: sky, the house, the fence and shrubs, the garage with its scoreboard, and at dusk the moon and the porch light. */
function yard(s: HoopState): Sprite[] {
    const F = YARD.floor;
    const out: Sprite[] = [
        ...(
            [
                [8, 7, 6],
                [21, 6, 4.5],
                [31, 8, 5],
            ] as const
        ).map(([x, y, size], i): Sprite => ({
            key: `cloud:${i}`,
            art: "cloud",
            params: { puffs: 3 + i, rain: 0 },
            x,
            y,
            size,
            depth: 0.3,
            still: true,
            z: -3,
        })),
        {
            key: "house",
            art: "houses",
            params: { count: 2, windows: 2 },
            x: 11,
            y: F - 0.7,
            size: 12,
            stand: true,
            depth: 0.6,
            still: true,
            z: -2,
        },
        // the apple tree at the drive's far end, clear of the ball in Charlie's hands
        {
            key: "tree",
            art: "tree",
            params: { fruit: 5, fallen: 0, item: "apple" },
            x: 2.5,
            y: F - 0.7,
            size: 6,
            stand: true,
            depth: 0.8,
            still: true,
            z: -1.8,
        },
    ];
    if (s.L.dusk)
        out.push(
            {
                key: "moon",
                art: "moon",
                params: { phase: 0.2 },
                x: 26,
                y: 4,
                size: 3,
                depth: 0.2,
                still: true,
                z: -3.2,
            },
            ...(
                [
                    [4, 3],
                    [15, 2],
                    [35, 3.5],
                    [44, 2.5],
                ] as const
            ).map(([x, y], i): Sprite => ({
                key: `star:${i}`,
                art: "prop.star",
                params: {},
                x,
                y,
                size: 0.9,
                depth: 0.2,
                still: true,
                z: -3.2,
            })),
            {
                key: "porch",
                art: "lamppost",
                params: { lit: 1, letterbox: 0 },
                x: 17.8,
                y: F - 0.5,
                size: 2.4,
                stand: true,
                still: true,
                z: -0.7,
            },
        );
    for (let i = 0; i < 5; i++)
        out.push({
            key: `fence:${i}`,
            art: "parkfence",
            params: { w: 7, h: 2, hole: 0 },
            x: 3.5 + i * 7,
            y: F - 0.55,
            size: 7,
            stand: true,
            still: true,
            z: -1,
        });
    out.push(
        {
            key: "garage",
            art: "garage",
            params: { w: 14, door: "sky" },
            x: GARAGE.x,
            y: F - 0.5,
            size: GARAGE.size,
            stand: true,
            still: true,
            z: -0.8,
        },
        {
            key: "slate",
            art: "chalkslate",
            params: board(s),
            x: GARAGE.slate,
            y: F - 2.8,
            size: 5,
            live: true,
            z: -0.5,
        },
    );
    for (const [i, x, w] of [
        [0, 6, 3],
        [1, 15.5, 2],
    ] as const)
        out.push({
            key: `bush:${i}`,
            art: "parkbush",
            params: { w },
            x,
            y: F - 0.4,
            size: w,
            stand: true,
            still: true,
            z: -0.4,
        });
    return out;
}

/** The garage behind the hoop: its middle across, how big it is drawn, and where its scoreboard hangs. */
const GARAGE = { x: YARD.hoop + 3, size: 13, slate: YARD.hoop + 7.1 };

const clockWords = (s: HoopState) => {
    const sec = Math.ceil(s.left / RATE);
    return `0:${String(sec).padStart(2, "0")}`;
};

/** What the scoreboard on the garage says: the ask at the top and the running sum under it. */
function board(s: HoopState): { top: string; sum: string } {
    const a = s.L.ask;
    if (a.kind === "free") return { top: `Best ${s.best}`, sum: `${s.streak} in a row` };
    if (a.kind === "ways")
        return {
            top: `Make ${a.total}: ${s.ways.length} of ${a.ways} ways`,
            sum: tally(s.made),
        };
    if (a.kind === "world")
        return {
            top: `Round the world: ${s.made.length} of ${s.L.spots.length}`,
            sum: tally(s.made),
        };
    if (a.kind === "copy")
        return {
            top: `Copied ${s.made.length} of ${a.matches}`,
            sum: s.letters ? `You: ${"PIP".slice(0, s.letters).split("").join(" ")}` : "No letters",
        };
    if (s.L.clock) return { top: `Make ${a.total}  ${clockWords(s)}`, sum: tally(s.made) };
    return { top: `Make ${a.total}${a.bank ? " off the board" : ""}`, sum: tally(s.made) };
}

/** The net's foot as the drawing takes it, from the verlet points: across, down and open, to a fiftieth. */
function netGive(n: Net, rim: Rim): { swing: number; stretch: number; open: number } {
    const l = netPoint(n, 0, NET_ROWS - 1),
        r = netPoint(n, 1, NET_ROWS - 1);
    const rest = netAt(rim),
        l0 = netPoint(rest, 0, NET_ROWS - 1),
        r0 = netPoint(rest, 1, NET_ROWS - 1);
    const q = (v: number, lo: number, hi: number) =>
        Math.round(Math.max(lo, Math.min(hi, v)) * 50) / 50;
    return {
        swing: q((l.x - l0.x + r.x - r0.x) / 2, -1, 1),
        stretch: q((l.y - l0.y + r.y - r0.y) / 2, -0.5, 1),
        open: q(r.x - l.x - (r0.x - l0.x), -0.5, 1),
    };
}

const stepKind = (lift: number) =>
    lift >= STEP_LIFT.crate ? "crate" : lift >= STEP_LIFT.step ? "step" : "kerb";

/** A hoop drawn in its three layers, the board behind the ball and the rim and net in front. */
function hoopSprites(key: string, x: number, tall: number, mount: string, give: object): Sprite[] {
    const F = YARD.floor,
        hoop = { tall, mount },
        at = x + (2.5 - BACKBOARD.rim);
    return [
        {
            key: `${key}:back`,
            art: "backboard",
            params: { ...hoop, part: "back", swing: 0, stretch: 0, open: 0 },
            x: at,
            y: F,
            size: 5,
            stand: true,
            z: 3,
        },
        {
            key: `${key}:net`,
            art: "backboard",
            params: { ...hoop, part: "net", swing: 0, stretch: 0, open: 0, ...give },
            x: at,
            y: F,
            size: 5,
            stand: true,
            live: true,
            z: 7,
        },
        {
            key: `${key}:front`,
            art: "backboard",
            params: { ...hoop, part: "front", swing: 0, stretch: 0, open: 0 },
            x: at,
            y: F,
            size: 5,
            stand: true,
            z: 7.5,
        },
    ];
}

function hoopsFrame(s: HoopState, rest = false): Frame {
    const L = s.L,
        F = YARD.floor,
        sprites: Sprite[] = [...yard(s)],
        marks: Mark[] = [];
    const rim = rimAt(L, s.steps);
    const places = L.spots.map((_, i) => placeOf(L, s.seed, i, s.makes));
    const lines = [S1 - 1.6, S2 - 1.6];
    sprites.push({
        key: "court",
        art: "chalkcourt",
        params: { length: 36, lines: lines.map((x) => Math.round((x - COURT_LEFT) * 10) / 10) },
        x: COURT_LEFT + 18,
        y: F + 0.5,
        size: 36,
        still: true,
        z: 0,
    });
    L.spots.forEach((sp, i) => {
        const p = places[i] ?? { x: sp.x, lift: 0 };
        const here = s.turn === "child" && i === s.spot;
        const pipHere = s.turn === "pup" && i === s.pup.spot;
        sprites.push({
            key: `spot:${i}`,
            art: "chalkspot",
            params: { n: sp.n, on: here || pipHere },
            x: p.x,
            y: F + 1.15,
            size: 2.4,
            z: 1,
        });
        if (p.lift > 0)
            sprites.push({
                key: `step:${i}`,
                art: "yardstep",
                params: { kind: stepKind(p.lift) },
                x: p.x,
                y: F,
                size: 3,
                stand: true,
                z: 4.5,
            });
    });
    if (s.turn === "pup" && s.pup.at.lift > 0 && L.ask.kind === "copy")
        sprites.push({
            key: "step:pip",
            art: "yardstep",
            params: { kind: stepKind(s.pup.at.lift) },
            x: s.pup.at.x,
            y: F,
            size: 3,
            stand: true,
            z: 4.5,
        });
    if (L.wind)
        sprites.push({
            key: "windsock",
            art: "windsock",
            params: { wind: Math.min(1, Math.abs(s.wind) / 3), stripes: 5 },
            x: 6,
            y: F - 0.3,
            size: 5,
            stand: true,
            flip: s.wind < 0,
            z: 0.5,
        });
    if (L.hedge)
        sprites.push({
            key: "hedge",
            art: "tallhedge",
            params: { w: Math.round(L.hedge.w), h: Math.round(L.hedge.h) },
            x: L.hedge.x + L.hedge.w / 2,
            y: F,
            size: L.hedge.w,
            stand: true,
            z: 4,
        });
    if (L.branch)
        sprites.push(
            // the branch's underside, 0.65 squares above its box's foot, is where the ball meets it; it
            // is drawn behind the tree's crown, so the limb grows out of the tree
            {
                key: "branch",
                art: "swingbranch",
                params: { long: Math.round(L.branch.w), leaves: 4, look: "limb" },
                x: L.branch.x + L.branch.w / 2,
                y: F - L.branch.h + 0.65,
                size: L.branch.w,
                stand: true,
                z: -1.6,
            },
            {
                key: "branch:tree",
                art: "tree",
                params: { fruit: 0, fallen: 0, item: "apple" },
                x: L.branch.x - 1,
                y: F - 0.7,
                size: 13,
                stand: true,
                still: true,
                z: -1.5,
            },
        );
    if (L.clock)
        sprites.push({
            key: "rack",
            art: "ballrack",
            params: { balls: 4 },
            x: RACK_X,
            y: F,
            size: 6,
            stand: true,
            z: 2,
        });
    if (L.slide) {
        const y = rim.y - 2.4;
        marks.push({
            kind: "line",
            a: { x: YARD.hoop - L.slide.by + 3.3, y },
            b: { x: YARD.hoop + L.slide.by + 3.6, y },
            style: "rod",
        });
    }
    sprites.push(
        ...hoopSprites(
            "hoop",
            rim.x,
            L.rim,
            L.slide ? "wall" : "pole",
            rest ? {} : netGive(s.net, rim),
        ),
    );
    if (L.low) {
        const low = lowRim(L.low);
        sprites.push(...hoopSprites("low", low.x, L.low.rim, "pole", {}));
        marks.push(
            {
                kind: "word",
                x: low.x,
                y: low.y - BACKBOARD.above - 0.6,
                text: `${L.low.n}`,
                size: 0.9,
            },
            {
                kind: "word",
                x: rim.x,
                y: rim.y - BACKBOARD.above - 0.6,
                text: `${L.low.top}`,
                size: 0.9,
            },
        );
    }
    // Charlie, and Pip on the level Pip plays
    const child = s.turn === "child";
    sprites.push(
        ...actorSprites(
            s.act,
            ACTS,
            (pose, facing) => ({
                key: "charlie",
                art: "charlie",
                params: { ...CHARLIE, pose, dir: facing },
                x: s.at,
                y: F - s.lift,
                size: 2.9,
                stand: true,
                z: 5,
            }),
            s.at * 2,
            rest,
        ),
    );
    if (L.ask.kind === "copy") {
        const pupMode = !child;
        const pose =
            s.cheer > 0 && s.shot?.by === "pup"
                ? "jump"
                : pupMode && s.mode === "flight"
                  ? "cheer"
                  : pupMode
                    ? "stand"
                    : "sit";
        sprites.push({
            key: "pip",
            art: "pupfamily",
            params: { member: "pip", pose, mood: "happy", dir: 1, gear: "none" },
            x: pupMode ? s.pup.at.x : Math.max(3, s.at - 2.6),
            y: F - (pupMode ? s.pup.at.lift : 0),
            size: 2,
            stand: true,
            z: 5,
        });
    }
    // the ball, its shadow on the drive, and a faint trail behind it in flight
    const b = s.ball,
        ballSize = (YARD.r * 2) / 0.9,
        high = Math.max(0, F - YARD.r - b.y);
    const shadow = Math.max(0.4, 1.3 - high * 0.07);
    sprites.push(
        {
            key: "ball",
            art: "basketball",
            params: { part: "ball", worn: false },
            x: b.x,
            y: b.y,
            size: ballSize,
            angle: rest ? 0 : b.turn,
            z: 6,
        },
        {
            key: "ball:shadow",
            art: "basketball",
            params: { part: "shadow", worn: false },
            x: b.x,
            y: F + 0.15 - 0.3 * shadow,
            size: shadow,
            alpha: Math.max(0.25, 1 - high * 0.06),
            z: 0.8,
        },
    );
    // the child's last throw stays as a faint line until the spot moves, so the next is a correction of it
    if (child && s.last.length > 1 && s.mode !== "won" && s.mode !== "out")
        s.last.forEach((p, k) => {
            const q = s.last[k + 1];
            if (q) marks.push({ kind: "line", a: p, b: q, style: "thin" });
        });
    // a hot hand: a glow round the ball after three in a row
    if (!rest && child && s.run >= 3 && s.mode !== "won" && s.mode !== "out")
        marks.push({ kind: "ring", x: b.x, y: b.y, r: YARD.r + 0.35, solid: true, tone: "ok" });
    if (!rest && s.mode === "flight" && s.trail.length > 2) {
        const n = s.trail.length;
        for (let k = 0; k < 3; k++) {
            const part = s.trail.slice(Math.floor((n * k) / 3), Math.floor((n * (k + 1)) / 3) + 1);
            if (part.length > 1)
                marks.push({ kind: "dots", pts: part, faint: true, opacity: 0.1 + k * 0.1 });
        }
    }
    // lining up: the pull back to the finger, the aim's arrow as long as the throw is strong, a power
    // gauge beside Charlie, and as much of the flight as the level shows
    if (s.mode === "aim" && child) {
        const from = handOf(s),
            p = preview(s);
        if (s.hand) marks.push({ kind: "line", a: from, b: s.hand, style: "thin" });
        const n = p.pts.length;
        // the dots fade towards their end, a third at a time
        for (let k = 0; k < 3 && n > 1; k++) {
            const part = p.pts.slice(Math.floor((n * k) / 3), Math.floor((n * (k + 1)) / 3) + 1);
            if (part.length > 0)
                marks.push({
                    kind: "dots",
                    pts: part,
                    opacity: 0.9 - k * 0.28,
                    ...(p.scores ? { tone: "ok" as const } : {}),
                });
        }
        const a = s.aim.angle,
            power = strength(s.aim, SHOT),
            len = arrowLength(s.aim),
            at = (r: number): Pt => ({ x: from.x + Math.cos(a) * r, y: from.y + Math.sin(a) * r });
        // a tick at 45 degrees, so "higher" and "flatter" have something to be read against
        const tick = -Math.PI / 4;
        marks.push(
            {
                kind: "line",
                a: { x: from.x + Math.cos(tick) * 1.1, y: from.y + Math.sin(tick) * 1.1 },
                b: { x: from.x + Math.cos(tick) * 1.9, y: from.y + Math.sin(tick) * 1.9 },
                style: "thin",
            },
            { kind: "line", a: at(0.9), b: at(0.9 + len), style: "rod", head: true },
        );
        // the gauge: a card to read it on, the fill as far as the power, the powers that go in in green, and a bar at the power
        const gw = 1,
            gx = s.at - 1.6 - gw,
            foot = F - s.lift - 0.3,
            tall = GAUGE,
            yOf = (p: number) => foot - ((p - SHOT.min) / (SHOT.max - SHOT.min)) * tall,
            full = Math.max(0.25, power * tall),
            inset = 0.15;
        marks.push(
            { kind: "box", x: gx, y: foot - tall, w: gw, h: tall, card: true },
            {
                kind: "box",
                x: gx + inset,
                y: foot - full,
                w: gw - inset * 2,
                h: full - inset,
                on: true,
            },
        );
        // one band, the widest run, since between two runs the powers do not go in
        const runs = sweetBand(s),
            main = runs.reduce<[number, number] | null>(
                (b, r) => (!b || r[1] - r[0] > b[1] - b[0] ? r : b),
                null,
            );
        if (main) {
            const [lo, hi] = main,
                mid = (yOf(lo) + yOf(hi)) / 2,
                h = Math.max(1, yOf(lo) - yOf(hi));
            marks.push({
                kind: "box",
                x: gx + inset,
                y: mid - h / 2,
                w: gw - inset * 2,
                h,
                tone: "ok",
            });
        }
        const bar = yOf(s.aim.power);
        marks.push({
            kind: "line",
            a: { x: gx - 0.3, y: bar },
            b: { x: gx + gw + 0.3, y: bar },
            style: "rod",
        });
    }
    if (!rest)
        for (const p of s.pops)
            marks.push({
                kind: "word",
                x: p.x,
                y: p.stay ? p.y : p.y - p.age * 1.6,
                text: p.text,
                size: p.size ?? (p.big ? 1.2 : 0.9),
            });
    marks.push({
        kind: "word",
        x: VIEW.w / 2,
        y: 1.2,
        text: askWords(L),
        size: 0.75,
        fixed: true,
    });
    // a narrow field keeps the whole court in sight, from behind the furthest spot to the scoreboard,
    // and holds still while the ball flies, since its arc stays inside that
    const back = Math.min(...places.map((p) => p.x)) - 1.5,
        focus = { x: (back + GARAGE.slate + 2.5) / 2, y: YARD.floor - L.rim + 2 };
    const camera = rest ? { ...wanted(s) } : { ...s.cam };
    return {
        sprites,
        marks,
        camera,
        view: { ...VIEW },
        world: { ...worldOf(s) },
        focus,
        time: s.steps / RATE,
    };
}

/** How tall the power gauge beside Charlie stands, in squares. */
const GAUGE = 5.5;

/** The aim arrow's length in squares: longer the harder the throw, so a strong pull looks strong. */
export const arrowLength = (aim: Aim): number => 1.2 + strength(aim, SHOT) * 4.8;

/** Where the drive's chalk court starts on the left. */
const COURT_LEFT = 6;

export function askWords(L: HoopLevel): string {
    const a = L.ask;
    if (a.kind === "exact")
        return L.clock
            ? `Make exactly ${a.total} in ${L.clock} seconds`
            : a.bank
              ? `Make exactly ${a.total} off the board`
              : `Make exactly ${a.total}`;
    if (a.kind === "ways") return `Make ${a.total} three different ways`;
    if (a.kind === "world") return "Around the world: 1, 2, 3, 4, 5";
    if (a.kind === "copy") return `Copy ${a.matches} of Pip's baskets`;
    return "Shoot-around: baskets in a row";
}

function say(s: HoopState): string {
    const L = s.L,
        sp = spotOf(s),
        a = L.ask;
    const parts = [`${askWords(L)}.`];
    if (a.kind === "free") parts.push(`${s.streak} in a row, best ${s.best}.`);
    else if (a.kind === "ways")
        parts.push(
            `Ways found: ${s.ways.length ? s.ways.map((w) => w.join(" + ")).join("; ") : "none"}. This one so far: ${tally(s.made)}.`,
        );
    else if (a.kind === "copy")
        parts.push(
            `Copied ${s.made.length} of ${a.matches}. Letters: ${s.letters ? "PIP".slice(0, s.letters) : "none"}.`,
        );
    else parts.push(`Your baskets: ${tally(s.made)}.`);
    if (L.shots > 0) parts.push(`${Math.max(0, L.shots - s.taken)} of ${L.shots} shots left.`);
    if (L.clock) parts.push(`${Math.ceil(s.left / RATE)} seconds left.`);
    if (L.low) parts.push(`Hoops: low worth ${L.low.n}, high worth ${L.low.top}.`);
    else
        parts.push(
            `Spots: ${L.spots.map((p) => `${p.n}${p === sp && s.turn === "child" ? " (you are here)" : ""}`).join(", ")}.`,
        );
    if (s.lift > 0) parts.push(`You are standing on a ${stepKind(s.lift)}.`);
    if (L.wind)
        parts.push(
            s.wind === 0
                ? "No wind this throw."
                : `The wind blows ${s.wind > 0 ? "towards" : "away from"} the hoop.`,
        );
    if (s.mode === "aim" && s.turn === "child") {
        const deg = Math.round((-s.aim.angle * 180) / Math.PI);
        const pct = Math.round(strength(s.aim, SHOT) * 100);
        parts.push(`Aimed ${deg} degrees up at ${pct}% power.`);
    } else if (s.mode === "flight") parts.push("The ball is in the air.");
    else if (s.turn === "pup") parts.push("Pip is about to shoot.");
    if (s.note) parts.push(s.note);
    return parts.join(" ");
}

/** The yard's own sounds: a whoosh as the ball goes, the rim's clang, the board's thud, the swish of the net, a bounce and a cheer. */
const SOUNDS: Kit = {
    creak: [{ wave: "noise", hz: 900, to: 1500, attack: 0.02, decay: 0.16, gain: 0.12 }],
    lift: [{ wave: "triangle", hz: 520, to: 660, attack: 0.004, decay: 0.08, gain: 0.25 }],
    ring: [
        { wave: "triangle", hz: 620, attack: 0.001, decay: 0.35, gain: 0.3 },
        { wave: "sine", hz: 1490, attack: 0.001, decay: 0.22, gain: 0.14 },
        { wave: "noise", hz: 3000, attack: 0.001, decay: 0.02, gain: 0.15 },
    ],
    bump: [
        { wave: "sine", hz: 150, to: 95, attack: 0.002, decay: 0.12, gain: 0.45 },
        { wave: "noise", hz: 700, attack: 0.001, decay: 0.05, gain: 0.2 },
    ],
    splash: [
        // the swish of the cords: a quick bright noise that falls away
        { wave: "noise", hz: 4200, to: 2600, attack: 0.01, decay: 0.28, gain: 0.25 },
        { wave: "noise", hz: 1800, attack: 0.03, decay: 0.2, gain: 0.1 },
    ],
    place: [
        { wave: "sine", hz: 120, to: 70, attack: 0.002, decay: 0.14, gain: 0.5 },
        { wave: "noise", hz: 400, attack: 0.001, decay: 0.04, gain: 0.15 },
    ],
    back: [{ wave: "sine", hz: 140, to: 90, attack: 0.002, decay: 0.1, gain: 0.25 }],
    crash: [{ wave: "noise", hz: 1500, to: 600, attack: 0.01, decay: 0.3, gain: 0.25 }],
    level: [
        // the family on the drive cheering a basket that counts
        { wave: "noise", hz: 1600, attack: 0.08, decay: 0.6, gain: 0.14 },
        { wave: "triangle", hz: 784, attack: 0.01, decay: 0.2, gain: 0.15, delay: 0.05 },
    ],
    nope: [
        { wave: "sine", hz: 440, to: 330, attack: 0.01, decay: 0.2, gain: 0.25 },
        { wave: "sine", hz: 330, to: 260, attack: 0.01, decay: 0.25, gain: 0.25, delay: 0.18 },
    ],
    win: [
        { wave: "triangle", hz: 523, attack: 0.01, decay: 0.25, gain: 0.35 },
        { wave: "triangle", hz: 659, attack: 0.01, decay: 0.25, gain: 0.35, delay: 0.12 },
        { wave: "triangle", hz: 784, attack: 0.01, decay: 0.3, gain: 0.35, delay: 0.24 },
        { wave: "noise", hz: 1400, attack: 0.15, decay: 1, gain: 0.2, delay: 0.1 },
    ],
};

const isBest = (v: unknown): v is { best: number } =>
    typeof v === "object" &&
    v !== null &&
    "best" in v &&
    typeof v.best === "number" &&
    Number.isFinite(v.best) &&
    v.best >= 0;

export const hoopsGame: ActionGame<HoopState> = {
    id: "hoops",
    title: "Hoops in the yard",
    group: "action",
    quiet: true,
    // one basket from the near spot fits a card: thirty squares round the shooter and the hoop
    card: { round: { level: 0 }, keep: 30, minutes: 2 },
    portrait: { keep: 28 },
    levels: HOOP_LEVELS,
    rate: RATE,
    touch: true,
    cover: { art: "backboard", params: { tall: 9.5, part: "cover", mount: "pole" } },
    hint: "Pull back anywhere above the drive and let go to shoot; tap a chalk spot to walk to it. With the keys, up and down aim, left and right set the power, space shoots and N walks to the next spot. Each throw starts from a soft lob, so set it again every time.",
    controls: {
        arrows: { up: "Aim higher", down: "Aim lower", left: "Softer", right: "Harder" },
        go: "Shoot",
        icons: { go: "launch" },
    },
    commands: [{ id: "spot", label: "Walk to the next spot", key: "n", icon: "locate" }],
    command: (s, id) => {
        if (id === "spot" && s.mode === "aim" && s.turn === "child" && chooses(s.L))
            goTo(s, (s.spot + 1) % s.L.spots.length, []);
    },
    // the button is there only while there is somewhere else to shoot from and a throw to line up
    shows: (s, id) => id === "spot" && s.mode === "aim" && s.turn === "child" && chooses(s.L),
    sounds: SOUNDS,
    saves: { level: HOOP_LEVELS.length - 1 },
    checkpoint: (s) => ({ best: s.best }),
    restore: (s, v) => {
        if (!isBest(v)) return false;
        s.best = Math.max(s.best, Math.round(v.best));
        return true;
    },
    start: (phase, seed = 1) => startHoops(HOOP_LEVELS[phase] ?? HOOP_LEVELS[0], phase, seed),
    step: stepHoops,
    say,
    note: (s) => (!s.touched && s.mode === "aim" && s.turn === "child" ? s.L.prompt : s.note),
    won: (s) => s.mode === "won",
    ended: (s) =>
        s.mode === "won"
            ? { won: true, words: s.note }
            : s.mode === "out"
              ? { won: false, words: s.note }
              : null,
    objectives: (s) => {
        const a = s.L.ask;
        if (a.kind === "ways") return { completed: s.ways.length, total: a.ways };
        if (a.kind === "free") return { completed: s.streak, total: Math.max(1, s.best) };
        if (a.kind === "world") return { completed: s.made.length, total: s.L.spots.length };
        if (a.kind === "copy") return { completed: s.made.length, total: a.matches };
        const t = targetOf(s);
        return { completed: Math.min(t, sum(s.made)), total: t };
    },
    frame: hoopsFrame,
    cancelInput: (s) => {
        s.down = null;
        s.hand = null;
        s.pulling = false;
        s.aim.pulling = false;
    },
    hum: (s): Hum[] =>
        s.L.wind ? [{ kind: "wind", level: Math.min(1, Math.abs(s.wind) / 3) }] : [],
    tuning: HOOPS,
    still: {
        press: () => Math.round(RATE * 0.1),
        settling: (s) =>
            s.mode === "flight" ||
            s.mode === "back" ||
            s.mode === "walk" ||
            (s.turn === "pup" && s.mode === "aim"),
    },
};
