// Fetch with the pups: pull back and throw a ball, a frisbee or a stick across the park, and the Pup
// family races after it. The throw is set by degrees, planck decides where it bounces, rolls, floats
// or catches in a bush, and each pup gets there as it can: Pip is quickest but runs past, Dot is small
// enough for the hole in the fence, Rufus swims and Maple jumps highest. The mathematics is in the
// path's metre marks: throw it to a number, a number of metres past a pup, or where only one pup can
// reach. It keeps the id `blocks`, so links to the pups' earlier game open it. See .docs/games.md.
import {
    aimAt,
    launchOf,
    nearness,
    stepAim,
    type Aim,
    type AimSpec,
} from "../../engine/motion/aim";
import {
    actor,
    actorSprites,
    land,
    stepActor,
    type Actor,
    type Cycle,
} from "../../engine/motion/actor";
import { bodies, type Bodies, type Body } from "../../engine/motion/bodies";
import { follow, type Cam } from "../../engine/motion/camera";
import type { Pt } from "../../engine/motion/geometry";
import { feed, progress, track, type GameEvent, type Track } from "../../engine/motion/goals";
import { gustAt, type Gust } from "../../engine/motion/gust";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite } from "../../engine/motion/scene";
import { knob } from "../../engine/motion/tune";
import {
    grounded,
    runner,
    seek,
    stepRunner,
    type Course,
    type Moves,
    type Runner,
} from "../../engine/motion/walker";
import { PUPS, PUP_FACTS, type Pup } from "../../engine/parts/animals/pupfamily";
import { BENCH_SEAT } from "../../engine/parts/outdoors/parkbench";
import { FENCE_HOLE } from "../../engine/parts/outdoors/parkfence";
import { hillAt } from "../../engine/parts/outdoors/parkhill";
import { slideShape } from "../../engine/parts/outdoors/parkslide";
import type { Hum, Kit } from "../../engine/sound/kit";
import type { ActionGame, ActionLevel, Levels } from "./game";
import { BEYOND, ground, row } from "./scenery";

export type Toy = "ball" | "frisbee" | "stick";

/**
 * What a throw is for: to land by a number on the path (said as the number, or in `words` such as
 * "halfway to the tree"), to land a number of metres past a pup, to land on the number that makes
 * `total` with the one a pup sits on, to come to rest by a number (the pups wait for it to stop), or
 * for one pup to fetch.
 */
export type Ask =
    | { kind: "spot"; at: number; words?: string }
    | { kind: "past"; who: Pup; by: number }
    | { kind: "make"; who: Pup; total: number }
    | { kind: "stop"; at: number }
    | { kind: "pup"; who: Pup };

/** A level of the park. Places across are in metres along the path, which starts at the rug's edge. */
export interface FetchLevel extends ActionLevel {
    /** What there is to throw; the first is in hand at the start and Swap goes through the rest. */
    toys: Toy[];
    /** Where each pup waits for a throw; below nought is on the rug. */
    seats: Record<Pup, number>;
    asks: Ask[];
    /** How near a number a throw must be picked up to count, in metres. */
    within: number;
    /** Seconds of flight the dotted line shows while aiming; nought shows none. */
    preview: number;
    /** How far the path is marked. */
    length: number;
    hills?: { at: number; w: number; h: number }[];
    /** A pond, or frozen over on a snowy day. */
    pond?: { from: number; to: number; ice?: boolean };
    trees?: number[];
    bushes?: { at: number; w: number }[];
    bench?: number;
    slide?: { at: number; h: number };
    fence?: { at: number; h: number; hole?: boolean };
    /** Squares a second, each second, that a gust pushes a thing in the air to the right at its height. */
    wind?: number;
    snow?: boolean;
    prompt: string;
}

/** Pip sits at the front of the rug, so on open grass he is first to anything and the others win only where he cannot go. */
const SEATS = { pip: -1.2, maple: -2.3, dot: -3.3, rufus: -4.3 } as const;

export const FETCH_LEVELS: Levels<FetchLevel> = [
    {
        title: "The open meadow",
        grades: [1, 2],
        goal: "Throw the ball to each number the pups ask for.",
        toys: ["ball"],
        seats: { ...SEATS },
        asks: [
            { kind: "spot", at: 6 },
            { kind: "spot", at: 10 },
            { kind: "spot", at: 14 },
            { kind: "spot", at: 4 },
        ],
        within: 1,
        preview: 1.2,
        length: 20,
        trees: [23],
        bushes: [{ at: 18, w: 3 }],
        prompt: "Pull the ball back and let go. The pups will fetch it.",
    },
    {
        title: "Across the pond",
        grades: [1, 2],
        goal: "Land the ball by the numbers, and send one into the pond for Rufus.",
        toys: ["ball", "stick"],
        seats: { ...SEATS },
        asks: [
            { kind: "spot", at: 7 },
            { kind: "pup", who: "rufus" },
            { kind: "spot", at: 19 },
            { kind: "spot", at: 4 },
        ],
        within: 1,
        preview: 1,
        length: 22,
        pond: { from: 10, to: 16 },
        trees: [24],
        prompt: "Only Rufus swims. The others wait on the bank.",
    },
    {
        title: "Up the hill",
        grades: [2, 3],
        goal: "Make a ball or a stick stop on the hill at each number.",
        toys: ["ball", "stick"],
        seats: { ...SEATS },
        asks: [
            { kind: "spot", at: 5 },
            { kind: "stop", at: 11 },
            { kind: "stop", at: 14 },
            { kind: "spot", at: 3 },
        ],
        within: 1,
        preview: 0.8,
        length: 22,
        hills: [{ at: 7, w: 14, h: 3 }],
        bushes: [{ at: 20, w: 3 }],
        prompt: "A ball rolls back down a hill. A stick stays where it lands. Swap to choose.",
    },
    {
        title: "The playground",
        grades: [2, 3],
        goal: "Find a throw that only Dot can fetch, then one only Maple can reach.",
        toys: ["ball", "frisbee"],
        seats: { ...SEATS },
        asks: [
            { kind: "pup", who: "dot" },
            { kind: "pup", who: "maple" },
            { kind: "spot", at: 14 },
            { kind: "spot", at: 13, words: "halfway to the tree" },
        ],
        within: 1,
        preview: 0.5,
        length: 22,
        slide: { at: 5, h: 3 },
        fence: { at: 16, h: 5, hole: true },
        trees: [26],
        prompt: "Dot fits through the hole in the fence. Maple can jump up onto the slide.",
    },
    {
        title: "A windy day",
        grades: [3, 4],
        goal: "Throw in the wind to land a number of metres past a pup.",
        toys: ["frisbee", "ball"],
        seats: { pip: -1.2, maple: 4, dot: 8, rufus: -4.3 },
        asks: [
            { kind: "past", who: "maple", by: 5 },
            { kind: "past", who: "dot", by: 6 },
            { kind: "make", who: "dot", total: 20 },
            { kind: "spot", at: 21 },
        ],
        within: 1,
        preview: 0.3,
        length: 24,
        wind: 3,
        bench: 12,
        fence: { at: 19, h: 2 },
        trees: [27],
        bushes: [{ at: 23, w: 2 }],
        prompt: "The wind pushes a frisbee further than a ball.",
    },
    {
        title: "The snowy park",
        grades: [3, 4],
        goal: "Throw to the half metre on the snow, and past the pups on the ice.",
        toys: ["ball", "stick"],
        seats: { pip: 3, maple: -2.3, dot: -3.3, rufus: -4.3 },
        asks: [
            { kind: "spot", at: 7.5 },
            { kind: "past", who: "pip", by: 9 },
            { kind: "make", who: "pip", total: 15 },
            { kind: "pup", who: "dot" },
        ],
        within: 0.5,
        preview: 0,
        length: 24,
        snow: true,
        pond: { from: 14, to: 20, ice: true },
        fence: { at: 22, h: 5, hole: true },
        trees: [26],
        prompt: "A ball stops dead in snow and slides on ice.",
    },
];

export const FETCH = {
    power: knob(
        24,
        14,
        34,
        1,
        "squares a second",
        "a full pull throws from the rug past the far end of the path",
    ),
    gravity: knob(
        22,
        12,
        40,
        1,
        "squares a second, each second",
        "an arc slow enough to follow, fast enough that a throw lands in a couple of seconds",
    ),
    lift: knob(
        0.05,
        0.02,
        0.2,
        0.01,
        "of the speed across, squared",
        "a fast frisbee flies nearly flat and sinks as it slows",
    ),
};

const RATE = 60,
    DT = 1 / RATE;
/** Where metre nought is across, the ground's top, and the world's height, in squares. */
const ORIGIN = 12,
    GROUND = 22,
    H = GROUND + 2.5;
/** Kept low, so the path and its targets are big and the sky is only as tall as a high throw needs. */
const VIEW = { w: 34, h: 16 };
/** A pond's bed below the ground, and its surface. */
const DEPTH = 1.6,
    SURFACE = GROUND + 0.25;
/** How deep a swimmer's feet ride under the surface: low enough to look afloat, high enough to hop out onto the bank. */
const SWIM = 0.6;
const X = (m: number) => ORIGIN + m;
const metres = (x: number) => x - ORIGIN;
const worldOf = (L: FetchLevel) => ({ w: X(L.length) + 18, h: H });
/** Where the thing to throw rests on the rug, and how far back a finger may pull it. */
const REST = { x: X(0), y: GROUND - 0.4 };
const PULL = 4.5;

const AIM: AimSpec = {
    min: 4,
    max: 24,
    per: 24 / PULL,
    dead: 0.6,
    lo: -1.45,
    hi: 0.1,
    turn: 1.2,
    ramp: 10,
    turns: "up",
};
export const aimSpec = (): AimSpec => ({
    ...AIM,
    max: FETCH.power.value,
    per: FETCH.power.value / PULL,
});
/** The aim each level starts with, in radians and squares a second. */
export const FIRST_AIM = { angle: -0.7, power: 12 };

/**
 * Each thing to throw: its drawing's size, how far it reaches from its middle, how low it sits (its
 * middle's height above what it lies on), and the spin a throw gives it.
 */
const TOYS: Record<Toy, { size: number; r: number; low: number; spin: number; name: string }> = {
    ball: { size: 0.8, r: 0.35, low: 0.35, spin: 0.4, name: "ball" },
    frisbee: { size: 1.4, r: 0.65, low: 0.12, spin: 0, name: "frisbee" },
    stick: { size: 1.8, r: 0.85, low: 0.15, spin: 3, name: "stick" },
};

/**
 * Each pup's legs and size: Pip is fastest but slow to stop, so he runs past; Dot is the smallest;
 * Rufus swims; Maple jumps highest. Heights are in squares from the feet, as the drawing stands.
 */
const PUP: Record<
    Pup,
    {
        speed: number;
        accel: number;
        jump: number;
        tall: number;
        swims: boolean;
        wait: number;
        bark: number;
    }
> = {
    rufus: { speed: 6.5, accel: 26, jump: 1.3, tall: 3.1, swims: true, wait: 0.25, bark: 0.7 },
    maple: { speed: 7, accel: 26, jump: 3.4, tall: 3, swims: false, wait: 0.2, bark: 0.85 },
    pip: { speed: 9.5, accel: 9, jump: 1.5, tall: 2.5, swims: false, wait: 0.1, bark: 1.1 },
    dot: { speed: 5, accel: 24, jump: 1.1, tall: 1.9, swims: false, wait: 0.35, bark: 1.35 },
};
/** How many squares across a pup is drawn; the heights above are measured off the drawing at this size. */
const PUP_SIZE = 2.2;
/** How far a pup's mouth reaches for a thing, in squares. */
const REACH = 0.9;

const movesOf = (who: Pup, L: FetchLevel, swimming: boolean, onIce: boolean): Moves => {
    const p = PUP[who],
        slow = L.snow ? 0.8 : 1;
    return {
        speed: swimming ? 2.8 : p.speed * slow,
        accel: onIce ? p.accel * 0.3 : p.accel,
        airAccel: 12,
        gravity: 40,
        jump: p.jump,
        cut: 1,
        coyote: 0.1,
        buffer: 0.15,
        step: 0.5,
        fall: 22,
        climb: 0,
        pace: 0.9,
        height: p.tall,
    };
};

type Act = "sit" | "stand" | "run" | "air" | "swim" | "carry" | "shake" | "cheer" | "bark";
const ACTS: Record<Act, Cycle> = {
    sit: { poses: ["sit"] },
    stand: { poses: ["stand"] },
    run: { poses: ["run", "walk"], per: 1 },
    air: { poses: ["leap"] },
    swim: { poses: ["swim"] },
    carry: { poses: ["carry", "walk"], per: 1 },
    shake: { poses: ["shake"] },
    cheer: { poses: ["cheer", "jump"], every: 0.35 },
    bark: { poses: ["stand", "wave"], every: 0.4 },
};

type Job = "sit" | "chase" | "stuck" | "carry" | "home";

interface Dog {
    who: Pup;
    r: Runner;
    a: Actor<Act>;
    job: Job;
    /** Seconds in this job. */
    t: number;
    /** Seconds it has been kept from going on. */
    held: number;
    /** Seconds left of a shake, after swimming. */
    shake: number;
    wet: boolean;
    barkAt: number;
}

export interface FetchState {
    level: number;
    L: FetchLevel;
    world: Bodies;
    bushes: Body[];
    toy: Toy;
    thing: Body | null;
    phase: "ready" | "flying" | "fetched" | "home";
    aim: Aim;
    dogs: Dog[];
    /** Which dog has it, while it is carried. */
    carrier: number;
    /** Seconds since the throw, and since the thing came to rest. */
    flight: number;
    still: number;
    /** Where it was picked up, in metres, for the line after a throw. */
    fetchedAt: number | null;
    /** Where it first came down, in metres, marked on the path until the next throw. */
    landed: number | null;
    /** Whether this throw has been judged: on landing, on stopping or on being fetched, as its ask says. */
    decided: boolean;
    ask: number;
    goal: Track;
    /** Whether the throw that is being carried back did what was asked. */
    good: boolean;
    throws: number;
    /** Throws at the ask now, and asks done with their first throw in a row. */
    tries: number;
    streak: number;
    said: string;
    saidAt: number;
    cheer: number;
    ripples: { x: number; age: number; size?: number }[];
    splashed: boolean;
    trail: Pt[];
    look: number;
    /** Whether the Swap button was down last step, so a press swaps once. */
    braked: boolean;
    cam: Cam;
    steps: number;
    won: boolean;
    touched: boolean;
}

/** The ground's height across, in squares, before any pond. */
function landAt(L: FetchLevel, x: number): number {
    let y = GROUND;
    for (const h of L.hills ?? []) y -= hillAt(h.w, h.h, x - X(h.at));
    return y;
}

const inPond = (L: FetchLevel, x: number) => !!L.pond && x > X(L.pond.from) && x < X(L.pond.to);
const openWater = (L: FetchLevel, x: number) => inPond(L, x) && !L.pond?.ice;

function slideOf(L: FetchLevel) {
    if (!L.slide) return null;
    const s = slideShape(L.slide.h),
        left = X(L.slide.at);
    return {
        left,
        w: s.w,
        top: GROUND - s.platform.y,
        a: left + s.platform.x0,
        b: left + s.platform.x1,
        chute: {
            a: { x: left + s.chute.x0, y: GROUND - s.chute.y0 },
            b: { x: left + s.chute.x1, y: GROUND - s.chute.y1 },
        },
    };
}

/** The half-width of the fence as the pups meet it. */
const FENCE_HALF = 0.3;
/** How far above a pup's feet the land may be and still be stepped up onto, in squares. */
const CLIMB = 1.5;

/** What one pup runs over: the land, the ice, a swimmer's water, the bench and the slide, and the fence and pond edges as walls. */
function courseOf(L: FetchLevel, who: Pup): Course {
    const p = PUP[who],
        slide = slideOf(L);
    return {
        floor: (x, from, to) => {
            const found: { y: number; oneWay?: boolean }[] = [];
            if (slide && x >= slide.a && x <= slide.b) found.push({ y: slide.top, oneWay: true });
            if (L.bench !== undefined && Math.abs(x - X(L.bench) - 0.1) < 1.8)
                found.push({ y: GROUND - BENCH_SEAT - 0.26, oneWay: true });
            const up = found.filter((f) => f.y >= from && f.y <= to).sort((a, b) => a.y - b.y)[0];
            if (up) return up;
            // only a swimmer goes in, but anyone that slips in can paddle out
            const land = openWater(L, x) ? SURFACE + SWIM : landAt(L, x);
            // feet that a jump carried into a slope, or a swimmer at the bank, come up onto the land
            return land <= to && land >= from - CLIMB ? { y: land } : null;
        },
        solid: (x, y) => {
            if (L.fence && Math.abs(x - X(L.fence.at)) < FENCE_HALF && y > GROUND - L.fence.h) {
                const hole = L.fence.hole ? L.fence.h * FENCE_HOLE : 0;
                if (!(hole > p.tall && y > GROUND - hole)) return true;
            }
            return openWater(L, x) && !p.swims && y > GROUND - 6;
        },
    };
}

function seatOf(L: FetchLevel, who: Pup): Pt {
    const x = X(L.seats[who]);
    return { x, y: landAt(L, x) };
}

function dogAt(L: FetchLevel, who: Pup): Dog {
    const at = seatOf(L, who);
    return {
        who,
        r: runner(at.x, at.y, 1),
        a: actor<Act>("sit", "sit", 1),
        job: "sit",
        t: 0,
        held: 0,
        shake: 0,
        wet: false,
        barkAt: -99,
    };
}

export function startFetch(L: FetchLevel, level = 0): FetchState {
    const world = bodies({ gravity: { x: 0, y: FETCH.gravity.value } });
    const w = worldOf(L),
        rough = L.snow ? 1.2 : 0.7;
    const pond = L.pond;
    if (pond && !pond.ice) {
        world.ground({ y: GROUND, from: -BEYOND, to: X(pond.from), friction: rough });
        world.ground({ y: GROUND, from: X(pond.to), to: w.w + BEYOND, friction: rough });
        world.ground({ y: GROUND + DEPTH, from: X(pond.from), to: X(pond.to), friction: 0.6 });
        for (const edge of [pond.from, pond.to])
            world.box({ x: X(edge), y: GROUND + DEPTH / 2, w: 0.2, h: DEPTH, fixed: true });
        world.water({ y: SURFACE, from: X(pond.from), to: X(pond.to), density: 1.5, drag: 3 });
    } else if (pond) {
        world.ground({ y: GROUND, from: -BEYOND, to: X(pond.from), friction: rough });
        world.ground({ y: GROUND, from: X(pond.from), to: X(pond.to), friction: 0.02 });
        world.ground({ y: GROUND, from: X(pond.to), to: w.w + BEYOND, friction: rough });
    } else world.ground({ y: GROUND, from: -BEYOND, to: w.w + BEYOND, friction: rough });
    for (const h of L.hills ?? []) {
        const n = 24;
        for (let i = 0; i < n; i++) {
            const a = (h.w * i) / n,
                b = (h.w * (i + 1)) / n;
            const ya = hillAt(h.w, h.h, a),
                yb = hillAt(h.w, h.h, b);
            world.poly({
                x: X(h.at) + a,
                y: GROUND,
                points: [
                    { x: 0, y: -ya },
                    { x: b - a, y: -yb },
                    { x: b - a, y: 0.5 },
                    { x: 0, y: 0.5 },
                ],
                fixed: true,
                friction: rough,
            });
        }
    }
    for (const t of L.trees ?? []) {
        world.box({ x: X(t), y: GROUND - 1.9, w: 0.8, h: 3.8, fixed: true, friction: 0.6 });
        world.ball({ x: X(t), y: GROUND - 5, r: 1.8, fixed: true, restitution: 0.45 });
    }
    if (L.bench !== undefined) {
        const bx = X(L.bench);
        world.box({ x: bx + 0.1, y: GROUND - BENCH_SEAT - 0.13, w: 3.8, h: 0.26, fixed: true });
        world.box({ x: bx - 1.6, y: GROUND - 2.3, w: 0.24, h: 1.8, fixed: true });
    }
    const slide = slideOf(L);
    if (slide) {
        world.box({
            x: (slide.a + slide.b) / 2,
            y: slide.top + 0.14,
            w: slide.b - slide.a,
            h: 0.28,
            fixed: true,
        });
        const { a, b } = slide.chute,
            len = Math.hypot(b.x - a.x, b.y - a.y);
        world.box({
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2 + 0.15,
            w: len,
            h: 0.25,
            angle: Math.atan2(b.y - a.y, b.x - a.x),
            fixed: true,
            friction: 0.05,
        });
    }
    if (L.fence) {
        const hole = L.fence.hole ? L.fence.h * FENCE_HOLE : 0,
            tall = L.fence.h - hole;
        world.box({
            x: X(L.fence.at),
            y: GROUND - hole - tall / 2,
            w: 0.3,
            h: tall,
            fixed: true,
            restitution: 0.3,
        });
    }
    const bushes = (L.bushes ?? []).map((b) =>
        world.ball({
            x: X(b.at),
            y: GROUND - b.w * 0.35,
            r: b.w * 0.42,
            fixed: true,
            sensor: true,
        }),
    );
    const toy = L.toys[0] ?? "ball";
    return {
        level,
        L,
        world,
        bushes,
        toy,
        thing: null,
        phase: "ready",
        aim: aimAt(FIRST_AIM.angle, FIRST_AIM.power),
        dogs: PUPS.map((who) => dogAt(L, who)),
        carrier: -1,
        flight: 0,
        still: 0,
        fetchedAt: null,
        landed: null,
        decided: false,
        ask: 0,
        goal: track({ inOrder: L.asks.map((_, i) => ({ on: "fetched", value: i })) }),
        good: false,
        throws: 0,
        tries: 0,
        streak: 0,
        said: "",
        saidAt: -999,
        cheer: 0,
        ripples: [],
        splashed: false,
        trail: [],
        look: 1,
        braked: false,
        cam: { ...readyCam(L), zoom: 1 },
        steps: 0,
        won: false,
        touched: false,
    };
}

export const start = (level: number): FetchState =>
    startFetch(FETCH_LEVELS[level] ?? FETCH_LEVELS[0], level);

/** Where an ask wants the thing, in metres, or null for an ask about who. */
export function targetOf(L: FetchLevel, a: Ask): number | null {
    if (a.kind === "spot" || a.kind === "stop") return a.at;
    if (a.kind === "past") return L.seats[a.who] + a.by;
    if (a.kind === "make") return a.total - L.seats[a.who];
    return null;
}

const name = (who: Pup) => PUP_FACTS[who].name;
const said = (m: number) =>
    Number.isInteger(m)
        ? String(m)
        : Math.abs(m - Math.round(m)) === 0.5
          ? `${Math.floor(m)} and a half`
          : m.toFixed(1);

/** An ask in words, as a pup would put it. */
export function askWords(L: FetchLevel, a: Ask): string {
    if (a.kind === "spot")
        return a.words ? `Throw it ${a.words}.` : `Throw it to the ${said(a.at)}.`;
    if (a.kind === "make")
        return `${name(a.who)} sits on ${said(L.seats[a.who])}. Throw it to the number that makes ${said(a.total)} with ${said(L.seats[a.who])}.`;
    if (a.kind === "stop")
        return `Make it stop at the ${said(a.at)}. The pups wait until it stops.`;
    if (a.kind === "past")
        return `${name(a.who)} is at ${said(L.seats[a.who])}. Throw it ${said(a.by)} metres past ${name(a.who)}.`;
    return `Throw it where only ${name(a.who)} can fetch it.`;
}

function say(s: FetchState, words: string): void {
    s.said = words;
    s.saidAt = s.steps;
}

const emit = (s: FetchState, out: Happening[], event: GameEvent) => {
    feed(s.goal, event);
    out.push({ event });
};

/** The thing's body for a throw, placed on the rug. */
function makeThing(s: FetchState): Body {
    const w = s.world,
        bouncy = s.L.snow ? 0.12 : 0.55;
    if (s.toy === "ball")
        return w.ball({
            ...REST,
            r: TOYS.ball.r,
            density: 1,
            friction: 0.5,
            restitution: bouncy,
            fast: true,
        });
    if (s.toy === "frisbee")
        return w.box({
            ...REST,
            w: 1.3,
            h: 0.18,
            density: 0.6,
            friction: 0.3,
            restitution: 0.2,
            upright: true,
        });
    return w.box({
        ...REST,
        w: 1.7,
        h: 0.22,
        density: 0.7,
        friction: 1,
        restitution: 0.15,
        damping: { turn: 1.5 },
    });
}

const GUST: Gust = { rise: 0.8, hold: 1.2, fall: 0.8, flutter: 0.3 };
/** The wind's push to the right at `t` seconds into a throw, in squares a second each second. */
const windAt = (L: FetchLevel, t: number) =>
    L.wind ? L.wind * (0.35 + 0.65 * gustAt(GUST, t % 4)) : 0;

/** How a thing in the air moves beyond gravity: a frisbee glides on its speed across, and the wind carries all of them. */
function airOf(L: FetchLevel, toy: Toy, v: Pt, t: number): Pt {
    const catches = toy === "frisbee" ? 1.5 : toy === "stick" ? 1.2 : 1;
    const wind = windAt(L, t) * catches;
    if (toy !== "frisbee") return { x: wind, y: 0 };
    const lift = Math.min(FETCH.gravity.value * 0.6, FETCH.lift.value * v.x * v.x);
    return { x: wind - v.x * 0.35, y: -lift - v.y * 0.35 };
}

/** Where a throw would go for its first `seconds`, with nothing in its way and no wind, for the dotted line. */
export function path(s: FetchState, seconds: number): Pt[] {
    const out: Pt[] = [];
    let p = { ...REST },
        v = launchOf(s.aim);
    const calm = { ...s.L, wind: 0 };
    for (let t = 0; t < seconds; t += DT) {
        const a = airOf(calm, s.toy, v, t);
        v = { x: v.x + a.x * DT, y: v.y + (FETCH.gravity.value + a.y) * DT };
        p = { x: p.x + v.x * DT, y: p.y + v.y * DT };
        if (p.y > landAt(s.L, p.x) - 0.2) break;
        if (Math.round(t / DT) % 3 === 0) out.push(p);
    }
    return out;
}

function throwIt(s: FetchState, v: Pt, out: Happening[]): void {
    const b = makeThing(s);
    s.world.launch(b, v, s.toy === "ball" ? v.x * TOYS.ball.spin : TOYS[s.toy].spin);
    s.thing = b;
    s.phase = "flying";
    s.flight = 0;
    s.still = 0;
    s.fetchedAt = null;
    s.landed = null;
    s.decided = false;
    s.good = false;
    s.throws++;
    s.tries++;
    s.trail = [];
    s.splashed = false;
    s.touched = true;
    for (const d of s.dogs) {
        d.job = "chase";
        d.t = 0;
        d.held = 0;
    }
    out.push({ cue: "lift", strength: Math.min(1, v.x / 20 + 0.3) });
}

function bark(s: FetchState, d: Dog, out: Happening[]): void {
    if (s.steps - d.barkAt < RATE * 1.1) return;
    d.barkAt = s.steps;
    out.push({ cue: "place", strength: 0.5, pitch: PUP[d.who].bark });
}

/** The pup's mouth, where it takes hold of a thing. */
const mouthOf = (d: Dog): Pt => ({
    x: d.r.x + d.r.facing * 0.5,
    y: d.r.y - PUP[d.who].tall * 0.75,
});

/** Whether `m` metres is the number an ask wants, and the words for it after `verb`. */
function measured(s: FetchState, m: number, verb: string): { good: boolean; words: string } {
    const a = s.L.asks[s.ask],
        want = a ? targetOf(s.L, a) : null,
        got = `${verb} at about ${said(Math.round(m * 2) / 2)}.`;
    if (want === null) return { good: false, words: got };
    const off = m - want;
    if (Math.abs(off) <= s.L.within)
        return { good: true, words: `${got} That is the ${said(want)}.` };
    const near = nearness(off, s.L.within);
    const how = near === "close" ? "Close to" : `${near[0]?.toUpperCase()}${near.slice(1)} of`;
    return { good: false, words: `${got} ${how} the ${said(want)}.` };
}

/** Judges the throw once: a number counts it done and moves on to the next ask. */
function decide(
    s: FetchState,
    j: { good: boolean; words: string },
    at: Pt,
    out: Happening[],
): void {
    if (s.decided) return;
    s.decided = true;
    s.good = j.good;
    say(s, j.words);
    if (j.good) {
        emit(s, out, { kind: "fetched", value: s.ask });
        emit(s, out, { kind: "checkpoint" });
        s.streak = s.tries === 1 ? s.streak + 1 : 1;
        s.tries = 0;
        s.ask++;
        out.push({ cue: "ring" }, { burst: { kind: "sparkle", x: at.x, y: at.y - 0.5, n: 8 } });
    } else {
        s.streak = 0;
        out.push({ cue: "nope" });
    }
}

const asked = (s: FetchState) => s.L.asks[s.ask]?.kind;

function pickUp(s: FetchState, k: number, out: Happening[]): void {
    const d = s.dogs[k],
        b = s.thing;
    if (!d || !b) return;
    const at = s.world.where(b),
        m = metres(at.x),
        a = s.L.asks[s.ask];
    s.world.remove(b);
    s.thing = null;
    s.carrier = k;
    s.phase = "fetched";
    s.fetchedAt = m;
    d.job = "carry";
    d.t = 0;
    for (const o of s.dogs) if (o !== d && o.job !== "carry") o.job = "home";
    out.push({ cue: "place", strength: 0.8, pitch: PUP[d.who].bark });
    if (s.decided) return;
    if (a?.kind === "pup")
        decide(
            s,
            d.who === a.who
                ? { good: true, words: `${name(d.who)} fetched it. Nobody else could.` }
                : {
                      good: false,
                      words: `${name(d.who)} got there first. It is ${name(a.who)}'s turn.`,
                  },
            at,
            out,
        );
    else decide(s, measured(s, m, `${name(d.who)} caught it`), at, out);
}

/** The thing is out of reach or out of the park: it comes back to the rug and the pups go home. */
function bringBack(s: FetchState, out: Happening[]): void {
    if (s.thing) {
        const at = s.world.where(s.thing);
        out.push({ puff: { x: at.x, y: at.y, n: 6 } });
        s.world.remove(s.thing);
    }
    s.thing = null;
    s.phase = "home";
    s.carrier = -1;
    for (const d of s.dogs) d.job = "home";
    if (s.decided) say(s, `${s.said} Nobody could reach it, so it came back.`);
    else {
        s.decided = true;
        s.good = false;
        say(s, "Nobody could reach that one, so it came back. Try another throw.");
    }
}

function stepThing(s: FetchState, out: Happening[]): void {
    const b = s.thing;
    if (!b) return;
    s.flight += DT;
    const at = s.world.where(b),
        v = s.world.velocity(b);
    const wet = s.world.wet(b) > 0,
        down = s.world.rayDown(at.x, at.y, at.y + TOYS[s.toy].low + 0.25) !== null;
    if (!wet && !down) {
        const a = airOf(s.L, s.toy, v, s.flight);
        s.world.launch(b, { x: v.x + a.x * DT, y: v.y + a.y * DT }, s.world.spin(b));
    }
    for (const bush of s.bushes)
        if (s.world.touching(bush).includes(b)) {
            if (Math.hypot(v.x, v.y) > 2) out.push({ cue: "bump", strength: 0.2, pitch: 1.6 });
            s.world.launch(b, { x: v.x * 0.8, y: Math.max(v.y * 0.8, 0.5) }, s.world.spin(b) * 0.8);
        }
    // a ball slows as it rolls: a little on grass, at once in snow, and hardly at all on ice
    if (down && !wet && s.toy === "ball") {
        const drag = s.L.pond?.ice && inPond(s.L, at.x) ? 0.05 : s.L.snow ? 6 : 1.2;
        s.world.launch(b, { x: v.x * (1 - drag * DT), y: v.y }, s.world.spin(b));
    }
    if ((down || wet) && s.landed === null && s.flight > 0.15) {
        s.landed = metres(at.x);
        out.push({ puff: { x: at.x, y: at.y + 0.2, n: 4 } });
        const k = asked(s);
        if (k === "spot" || k === "past" || k === "make")
            decide(s, measured(s, s.landed, "It landed"), at, out);
    }
    if (wet && !s.splashed) {
        s.splashed = true;
        s.ripples.push({ x: at.x, age: 0, size: 1 });
        out.push(
            { cue: "splash", strength: Math.min(1, Math.abs(v.y) / 10 + 0.3) },
            { burst: { kind: "splash", x: at.x, y: SURFACE, n: 10 } },
        );
    }
    if (s.steps % 3 === 0 && !down && !wet) {
        s.trail.push({ x: at.x, y: at.y });
        if (s.trail.length > 30) s.trail.shift();
    }
    s.still = s.world.moving(b, wet ? 0.6 : 0.15) ? 0 : s.still + DT;
    if (s.still > 0.4 && asked(s) === "stop")
        decide(s, measured(s, metres(at.x), "It stopped"), at, out);
    const gone = at.x < -4 || at.x > worldOf(s.L).w + 4 || at.y > H + 4;
    const stuck = s.dogs.every((d) => d.job === "stuck" || d.job === "home");
    if (gone || (s.still > 2.5 && stuck) || s.flight > 14) bringBack(s, out);
}

/** Whether a thing lies on the slide's platform with the pup under it, where no mouth reaches through. */
function above(L: FetchLevel, d: Dog, t: Pt): boolean {
    const slide = slideOf(L);
    return (
        !!slide &&
        t.x > slide.a - 0.3 &&
        t.x < slide.b + 0.3 &&
        t.y < slide.top &&
        d.r.y > slide.top + 0.2
    );
}

/** Whether a thing in the air is right over a pup, low enough to jump for. */
function overhead(d: Dog, t: Pt): boolean {
    const p = PUP[d.who],
        head = d.r.y - p.tall;
    return Math.abs(t.x - d.r.x) < 1.2 && t.y < head && t.y > head - p.jump - 0.6;
}

function stepDog(s: FetchState, k: number, out: Happening[]): void {
    const d = s.dogs[k];
    if (!d) return;
    const L = s.L,
        p = PUP[d.who];
    d.t += DT;
    d.shake = Math.max(0, d.shake - DT);
    const swimming = openWater(L, d.r.x) && p.swims,
        onIce = !!L.pond?.ice && inPond(L, d.r.x);
    const moves = movesOf(d.who, L, swimming, onIce),
        course = courseOf(L, d.who);
    const seat = seatOf(L, d.who);
    let want = d.r.x,
        near = 0.15;
    const t = s.thing ? s.world.where(s.thing) : null;
    if ((d.job === "chase" || d.job === "stuck") && t && d.t > p.wait) {
        want = t.x;
        near = 0.3;
    } else if (d.job === "carry") want = X(-0.5);
    else if (d.job === "home") want = seat.x;
    // for a stop the pups stay until it has stopped, then go
    const waiting = d.job === "chase" && s.phase === "flying" && asked(s) === "stop" && !s.decided;
    if (waiting) d.t = 0;
    let intent =
        d.job === "sit" || (d.job === "chase" && d.t <= p.wait)
            ? { run: 0 as const, jump: false, jumped: false }
            : seek(d.r, want, course, moves, near);
    if (d.job === "chase" && !waiting && t && grounded(d.r) && overhead(d, t))
        intent = { ...intent, jump: true, jumped: true };
    const was = d.r.state;
    const ran = stepRunner(d.r, intent, course, moves, DT);
    if (ran.includes("landed")) {
        land(d.a, d.r.landed);
        if (d.r.landed > 8) out.push({ puff: { x: d.r.x, y: d.r.y, n: 3 } });
    }
    if (swimming) d.wet = true;
    else if (d.wet && grounded(d.r) && was !== "rise") {
        d.wet = false;
        d.shake = 0.8;
        out.push({ burst: { kind: "splash", x: d.r.x, y: d.r.y - p.tall * 0.6, n: 8 } });
    }
    // a pup kept from its thing by a fence or the water stops and barks at it
    if (d.job === "chase" || d.job === "stuck") {
        const far = t ? Math.abs(t.x - d.r.x) > 0.8 : false;
        d.held =
            far && grounded(d.r) && Math.abs(d.r.vx) < 0.3 && d.t > p.wait + 0.3 ? d.held + DT : 0;
        if (d.held > 0.6 && d.job === "chase") d.job = "stuck";
        if (d.job === "stuck" && d.held === 0) d.job = "chase";
        if (d.job === "stuck") bark(s, d, out);
    }
    if (d.job === "home" && Math.abs(d.r.x - seat.x) < 0.2 && grounded(d.r)) d.job = "sit";
    const act: Act =
        d.shake > 0
            ? "shake"
            : swimming
              ? "swim"
              : !grounded(d.r)
                ? "air"
                : d.job === "carry"
                  ? "carry"
                  : d.job === "stuck"
                    ? "bark"
                    : s.cheer > 0 && d.job !== "chase"
                      ? "cheer"
                      : Math.abs(d.r.vx) > 0.3
                        ? "run"
                        : d.job === "sit"
                          ? "sit"
                          : "stand";
    stepActor(d.a, act, ACTS, DT, d.r.stride, d.r.facing);
    // the thing is taken in the mouth: on the ground, off the water, or out of the air
    if (d.job === "chase" && !waiting && t && s.thing && s.flight > 0.3 && !above(L, d, t)) {
        const m = mouthOf(d);
        const low = t.y > d.r.y - 0.6 && Math.abs(t.x - d.r.x) < REACH;
        if (Math.hypot(t.x - m.x, t.y - m.y) < REACH + TOYS[s.toy].r * 0.5 || low)
            pickUp(s, k, out);
    }
}

/** The camera's aim at the start of a throw: the rug near the left and the path running away to the right. */
const readyCam = (L: FetchLevel): Pt => ({ x: X(L.length / 2 - 1), y: H - VIEW.h / 2 });

function stepCam(s: FetchState): void {
    const t = s.thing ? s.world.where(s.thing) : null,
        carrier = s.dogs[s.carrier];
    const x =
        s.phase === "flying" && t
            ? Math.max(readyCam(s.L).x, t.x)
            : s.phase === "fetched" && carrier
              ? Math.max(readyCam(s.L).x, carrier.r.x)
              : readyCam(s.L).x;
    // a high throw lifts the view with it, so the thing never leaves the top
    const low = H - VIEW.h / 2 / s.look,
        y = s.phase === "flying" && t ? Math.min(low, t.y - 2 + VIEW.h / 2 / s.look) : low;
    s.cam = follow(
        s.cam,
        { x, y, zoom: s.look },
        { rate: 2.5, zoomRate: 4, dt: DT, view: VIEW, world: worldOf(s.L) },
    );
}

/** Whether every pup is back in its seat, so the next throw starts from the same place. */
const seated = (s: FetchState) => s.dogs.every((d) => d.job === "sit");

/** Changes what is thrown to the level's next thing, and says whether there was another. */
function swap(s: FetchState): boolean {
    if (s.phase !== "ready" || s.won || s.L.toys.length < 2) return false;
    const i = s.L.toys.indexOf(s.toy);
    s.toy = s.L.toys[(i + 1) % s.L.toys.length] ?? s.toy;
    s.touched = true;
    return true;
}

export function step(s: FetchState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    s.cheer = Math.max(0, s.cheer - DT);
    for (const i of pad.intents ?? [])
        if (i.kind === "zoom") s.look = Math.max(0.6, Math.min(1.8, s.look * i.by));
    if (pad.pressed.length || pad.pull || pad.released || pad.tapped || pad.brake) s.touched = true;
    if (s.phase === "ready" && !s.won) {
        if (pad.brake && !s.braked && swap(s)) out.push({ cue: "lift", strength: 0.2, pitch: 1.5 });
        const v = stepAim(s.aim, pad, aimSpec(), DT);
        if (v) throwIt(s, v, out);
    }
    s.braked = pad.brake;
    s.world.step(DT);
    for (const h of s.world.hits())
        if (s.thing && (h.a === s.thing || h.b === s.thing) && h.speed > 2)
            out.push({
                cue: "bump",
                strength: Math.min(1, h.speed / 12),
                pitch: s.toy === "stick" ? 0.8 : 1.2,
            });
    if (s.phase === "flying") stepThing(s, out);
    s.dogs.forEach((_, k) => stepDog(s, k, out));
    const carrier = s.dogs[s.carrier];
    if (s.phase === "fetched" && carrier && Math.abs(carrier.r.x - X(-0.5)) < 0.4) {
        carrier.job = "home";
        s.carrier = -1;
        s.phase = "home";
        if (s.good) s.cheer = 1.2;
        if (done(s)) {
            s.won = true;
            s.cheer = 3;
            say(s, "Every throw done. The pups flop down on the rug.");
            out.push(
                { cue: "win" },
                { burst: { kind: "sparkle", x: X(-2), y: GROUND - 3, n: 14 } },
            );
        }
    }
    if (s.phase === "home" && seated(s)) {
        // every pup sits exactly on its seat, so a throw goes the same way whatever came before
        s.dogs = s.dogs.map((d) => ({ ...dogAt(s.L, d.who), a: d.a }));
        s.phase = "ready";
        s.flight = 0;
        s.trail = [];
        const next = s.L.asks[s.ask];
        if (next && !s.won) say(s, `${s.said} ${askWords(s.L, next)}`);
    }
    for (const r of s.ripples) r.age += DT;
    s.ripples = s.ripples.filter((r) => r.age < 3);
    stepCam(s);
    return out;
}

const done = (s: FetchState) => progress(s.goal).done;

function frame(s: FetchState, rest = false): Frame {
    const L = s.L,
        w = worldOf(L),
        sprites: Sprite[] = [],
        marks: Mark[] = [];
    const cam = rest ? { ...readyCam(L), zoom: 1 } : s.cam;
    const eye = { cam, view: VIEW };
    const snowy = (list: Sprite[]) =>
        L.snow ? list.map((sp) => ({ ...sp, params: { ...sp.params, snow: 1 } })) : list;
    const pond = L.pond;
    if (pond && !pond.ice) {
        sprites.push(...snowy(ground("ground", -BEYOND, X(pond.from), GROUND, 2)));
        sprites.push(...snowy(ground("far", X(pond.to), w.w + BEYOND, GROUND, 2)));
        sprites.push(...ground("bed", X(pond.from), X(pond.to), GROUND + DEPTH, 1));
    } else sprites.push(...snowy(ground("ground", -BEYOND, w.w + BEYOND, GROUND, 2)));
    sprites.push(
        ...row(
            {
                key: "cloud",
                depth: 0.2,
                base: 5,
                every: 16,
                stray: 3,
                z: 0,
                drift: 0.3,
                alpha: 0.6,
                things: [{ art: "cloud", size: 5, often: 1, params: { puffs: 4 } }],
            },
            eye,
            41,
            rest ? 0 : s.steps * DT,
        ),
        ...row(
            {
                key: "far",
                depth: 0.5,
                base: GROUND - 2,
                every: 14,
                stray: 3,
                gaps: 0.4,
                z: 0.5,
                alpha: 0.35,
                things: [
                    { art: "firs", size: 7, often: 1, params: { count: 2, snow: L.snow ? 1 : 0 } },
                ],
            },
            eye,
            43 + s.level,
        ),
    );
    for (const [i, h] of (L.hills ?? []).entries())
        sprites.push({
            key: `hill:${i}`,
            art: "parkhill",
            params: { w: h.w, h: h.h, snow: L.snow ? 1 : 0 },
            x: X(h.at) + h.w / 2,
            y: GROUND,
            stand: true,
            z: 3,
            still: true,
        });
    sprites.push({
        key: "rug",
        art: "picnicrug",
        params: { w: 6, colour: "berry" },
        size: 6,
        x: X(-3),
        y: GROUND + 0.3,
        stand: true,
        z: 3,
        still: true,
    });
    for (const [i, t] of (L.trees ?? []).entries())
        sprites.push({
            key: `tree:${i}`,
            art: L.snow ? "firs" : "tree",
            params: L.snow ? { count: 1, snow: 1 } : { fruit: 0, fallen: 0, item: "apple" },
            size: L.snow ? 4.2 : 7,
            x: X(t),
            y: L.snow ? GROUND + 0.3 : GROUND - 3.08,
            stand: L.snow,
            z: 4,
            still: true,
        });
    for (const [i, b] of (L.bushes ?? []).entries())
        sprites.push({
            key: `bush:${i}`,
            art: "parkbush",
            params: { w: b.w },
            x: X(b.at),
            y: GROUND + 0.1,
            stand: true,
            z: 7,
            still: true,
        });
    if (L.bench !== undefined)
        sprites.push({
            key: "bench",
            art: "parkbench",
            params: { tone: "tang" },
            x: X(L.bench),
            y: GROUND,
            stand: true,
            z: 4,
            still: true,
        });
    const slide = slideOf(L);
    if (slide && L.slide)
        sprites.push({
            key: "slide",
            art: "parkslide",
            params: { h: L.slide.h },
            size: Math.ceil(slide.w),
            x: slide.left + Math.ceil(slide.w) / 2,
            y: GROUND,
            stand: true,
            z: 4,
            still: true,
        });
    if (L.fence)
        sprites.push({
            key: "fence",
            art: "parkfence",
            params: { w: 2, h: L.fence.h, hole: L.fence.hole ? 1 : 0 },
            x: X(L.fence.at),
            y: GROUND,
            stand: true,
            z: 6,
            still: true,
        });
    if (L.snow)
        sprites.push({
            key: "snowman",
            art: "snowman",
            params: { buttons: 3, hat: 1 },
            size: 3,
            x: X(-7),
            y: GROUND,
            stand: true,
            z: 3,
            still: true,
        });
    // the path's metre marks, on the earth under the ground line
    for (let m = 0; m <= L.length; m++) {
        const x = X(m),
            y = openWater(L, x) ? GROUND + DEPTH + 0.5 : landAt(L, x) + 0.55;
        marks.push({
            kind: "line",
            a: { x, y: y - 0.25 },
            b: { x, y: y + (m % 5 === 0 ? 0.3 : 0.1) },
            style: "thin",
        });
        // past 9 only the fives are written, since two figures a metre apart run together on a phone's squares
        if (m % 5 === 0 || (m < 10 && (L.length <= 20 || m % 2 === 0)))
            marks.push({
                kind: "word",
                x,
                y: y + 0.85,
                text: String(m),
                size: m % 5 === 0 ? 0.62 : 0.48,
            });
    }
    const a = L.asks[s.ask];
    // a good throw makes the sign it was for jump: the ask just done, while the pups cheer
    const pop =
        !rest && s.cheer > 0 && s.good ? 1 + 0.3 * Math.sin(Math.min(1, s.cheer) * Math.PI) : 1;
    const done = s.ask > 0 ? L.asks[s.ask - 1] : undefined;
    const shown = s.cheer > 0 && s.good && done ? done : a;
    if (shown && !s.won) {
        const at = targetOf(L, shown),
            lit = shown !== a;
        // a number to throw to stands where it is; an ask worked out from a pup stands by the pup, so
        // the sign does not give the answer away
        if (shown.kind === "spot" || shown.kind === "stop") {
            const x = X(shown.at);
            sprites.push({
                key: "target",
                art: "fetchmark",
                params: {
                    n: shown.kind === "spot" && shown.words ? "half" : String(shown.at),
                    lit: lit ? 1 : 0,
                },
                size: 2.4,
                x,
                y: landAt(L, x) + 0.15,
                stand: true,
                z: 6,
                scale: lit ? pop : 1,
            });
        } else if (shown.kind === "past" || shown.kind === "make") {
            const x = X(L.seats[shown.who]) + 1.6;
            sprites.push({
                key: "target",
                art: "fetchmark",
                params: {
                    n: shown.kind === "past" ? `+${said(shown.by)}` : `=${said(shown.total)}`,
                    lit: lit ? 1 : 0,
                },
                size: 2.4,
                x,
                y: landAt(L, x) + 0.15,
                stand: true,
                z: 6,
                scale: lit ? pop : 1,
            });
        }
        // the band a throw has to land in, drawn while the level still helps with a dotted line
        if (at !== null && L.preview >= 0.5 && !lit) {
            const x = X(at),
                y = landAt(L, x) - 0.1;
            marks.push({
                kind: "line",
                a: { x: x - L.within, y },
                b: { x: x + L.within, y },
                style: "aim",
            });
        }
    }
    if (s.streak > 1 && !s.won)
        marks.push({
            kind: "word",
            x: 5,
            y: 2,
            text: `${s.streak} in a row!`,
            size: 0.8,
            fixed: true,
        });
    if (s.landed !== null && s.phase !== "ready") {
        const x = X(s.landed),
            y = (openWater(L, x) ? SURFACE : landAt(L, x)) - 0.15;
        marks.push(
            { kind: "line", a: { x: x - 0.3, y: y - 0.3 }, b: { x: x + 0.3, y: y + 0.3 } },
            { kind: "line", a: { x: x - 0.3, y: y + 0.3 }, b: { x: x + 0.3, y: y - 0.3 } },
        );
    }
    PUPS.forEach((who, k) => {
        const d = s.dogs[k];
        if (!d) return;
        const swimming = openWater(L, d.r.x) && PUP[who].swims;
        const dress = (pose: string, facing: 1 | -1): Sprite => ({
            key: `pup:${who}`,
            art: "pupfamily",
            params: {
                member: who,
                pose,
                mood:
                    d.job === "stuck"
                        ? "worried"
                        : d.job === "chase" || s.cheer > 0
                          ? "excited"
                          : "happy",
                dir: facing,
            },
            size: PUP_SIZE,
            x: d.r.x,
            y: d.r.y + 0.1,
            stand: true,
            z: swimming ? 2.9 : 8 - k * 0.1,
        });
        sprites.push(...actorSprites(d.a, ACTS, dress, d.r.stride, rest));
        if (a?.kind === "pup" && a.who === who && s.phase === "ready" && !s.won)
            marks.push({ kind: "ring", x: d.r.x, y: d.r.y - PUP[who].tall / 2, r: 1.6 });
    });
    const carrier = s.dogs[s.carrier];
    const held = s.phase === "fetched" && carrier;
    const t = s.thing
        ? s.world.where(s.thing)
        : held
          ? {
                x: carrier.r.x + carrier.r.facing * 0.45,
                y: carrier.r.y - PUP[carrier.who].tall * 0.5,
                angle: 0,
            }
          : s.phase === "ready"
            ? { ...REST, angle: 0 }
            : null;
    if (t)
        sprites.push({
            key: `toy:${s.throws}`,
            art: "fetchtoy",
            params: { kind: s.toy },
            size: TOYS[s.toy].size,
            x: t.x,
            y: t.y,
            angle: t.angle,
            z: 9,
        });
    if (s.phase === "ready" && !s.won && !rest) {
        if (s.aim.pulling || s.touched) {
            const pull = {
                x: (-Math.cos(s.aim.angle) * s.aim.power) / aimSpec().per,
                y: (-Math.sin(s.aim.angle) * s.aim.power) / aimSpec().per,
            };
            marks.push({
                kind: "line",
                a: REST,
                b: { x: REST.x + pull.x, y: REST.y + pull.y },
                style: "thin",
            });
        }
        if (L.preview > 0) marks.push({ kind: "dots", pts: path(s, L.preview), opacity: 0.55 });
    }
    if (!rest && s.trail.length)
        marks.push({ kind: "dots", pts: s.trail, opacity: 0.25, faint: true });
    if (L.wind && !rest)
        for (let i = 0; i < 4; i++) {
            const u = ((s.steps * DT * 0.6 + i * 0.25) % 1) * VIEW.w,
                x = cam.x - VIEW.w / 2 + u,
                y = 4 + i * 2.2;
            marks.push({
                kind: "line",
                a: { x, y },
                b: { x: x + 1.5 + windAt(L, s.steps * DT) * 0.2, y },
                style: "thin",
            });
        }
    return {
        sprites,
        marks,
        camera: { ...cam },
        view: { ...VIEW },
        world: { ...w },
        time: rest ? 0 : s.steps * DT,
        water: pond
            ? [
                  {
                      x: X(pond.from),
                      w: X(pond.to) - X(pond.from),
                      level: pond.ice ? GROUND - 0.02 : SURFACE,
                      bottom: pond.ice ? GROUND + 0.9 : GROUND + DEPTH,
                      waves: pond.ice ? 0 : 0.06,
                      ripples: rest || pond.ice ? [] : s.ripples.map((r) => ({ ...r })),
                      hue: "sky",
                  },
              ]
            : [],
    };
}

function describe(s: FetchState): string {
    const L = s.L,
        a = L.asks[s.ask];
    const parts = [s.said];
    if (s.won) parts.push("Every throw is done.");
    else {
        parts.push(
            `${progress(s.goal).completed} of ${L.asks.length} done.`,
            a ? `Next: ${askWords(L, a)}` : "",
        );
        if (s.phase === "ready")
            parts.push(
                `The ${TOYS[s.toy].name} is on the rug, aimed ${Math.round((-s.aim.angle * 180) / Math.PI)} degrees up with a throw of ${Math.round(s.aim.power)}.`,
            );
        else if (s.phase === "flying")
            parts.push(`The ${TOYS[s.toy].name} is flying and the pups are after it.`);
        else parts.push("The pups are coming back to the rug.");
    }
    return parts.filter(Boolean).join(" ");
}

/** Throws whoosh, things bounce, and each pup barks at its own pitch. */
const PARK: Kit = {
    lift: [{ wave: "noise", hz: 900, to: 1800, attack: 0.03, decay: 0.22, gain: 0.35 }],
    bump: [
        { wave: "sine", hz: 240, to: 130, attack: 0.004, decay: 0.09, gain: 0.5 },
        { wave: "noise", hz: 700, attack: 0.004, decay: 0.04, gain: 0.2 },
    ],
    place: [
        { wave: "square", hz: 430, to: 330, attack: 0.005, decay: 0.08, gain: 0.16 },
        { wave: "noise", hz: 1600, attack: 0.005, decay: 0.05, gain: 0.18 },
        { wave: "square", hz: 400, to: 310, attack: 0.005, decay: 0.07, gain: 0.12, delay: 0.14 },
    ],
};

/** The pups pant while they run, and the wind blows on a windy day. */
function hum(s: FetchState): Hum[] {
    const running = s.dogs.filter((d) => Math.abs(d.r.vx) > 1).length;
    const out: Hum[] = [];
    if (running) out.push({ kind: "pant", level: Math.min(1, 0.3 + running * 0.15) });
    if (s.L.wind) out.push({ kind: "wind", level: 0.25 + 0.5 * gustAt(GUST, (s.steps * DT) % 4) });
    return out;
}

export const fetchGame: ActionGame<FetchState> = {
    portrait: { keep: 26 },
    id: "blocks",
    title: "Fetch with the pups",
    group: "action",
    card: { round: { level: 0, asks: 1 }, keep: 26, minutes: 2 },
    quiet: true,
    levels: FETCH_LEVELS,
    rate: RATE,
    intents: true,
    sounds: PARK,
    hum,
    cover: { art: "pupfamily", params: { member: "dot", pose: "leap", mood: "excited", dir: 1 } },
    hint: "Pull the thing on the rug back and let go, and the pups race to fetch it. With the keys: up and down aim, left and right throw softer or harder, space throws and B swaps what you throw",
    controls: {
        arrows: { up: "Aim higher", down: "Aim lower", left: "Softer", right: "Harder" },
        go: "Throw",
        brake: "Swap",
        icons: { go: "launch", brake: "ball" },
    },
    // Swap shows what is in hand, so a press is seen to change it
    brakeIcon: (s) => s.toy,
    // the brake button is Swap on screen and on a gamepad; this gives it the B key as well
    commands: [{ id: "swap", label: "Swap", key: "b" }],
    command: (s, id) => {
        if (id === "swap") swap(s);
    },
    start,
    round: (level, asks) => {
        const L = FETCH_LEVELS[level] ?? FETCH_LEVELS[0];
        return startFetch({ ...L, asks: L.asks.slice(0, Math.max(1, asks)) }, level);
    },
    step,
    frame,
    say: describe,
    note: (s) => {
        const a = s.L.asks[s.ask];
        if (!s.touched) return a ? `${askWords(s.L, a)} ${s.L.prompt}` : s.L.prompt;
        if (s.won || s.steps - s.saidAt < RATE * 5) return s.said;
        return s.phase === "ready" && a ? askWords(s.L, a) : "";
    },
    won: (s) => s.won,
    objectives: (s) => {
        const p = progress(s.goal);
        return { completed: p.completed, total: p.total };
    },
    pullFrom: (s) => (s.phase === "ready" && !s.won ? REST : null),
    cancelInput: (s) => {
        s.aim.pulling = false;
    },
    tuning: FETCH,
    still: { press: () => 1, settling: (s) => s.phase !== "ready" && !s.won },
};
