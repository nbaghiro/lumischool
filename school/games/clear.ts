// Clear round: a pony canters a show jumping course. With the keys the child chooses its stride and
// holds space for a gather, and letting go leaps it from its next hoof print. On the screen the pony
// sees its own stride and chooses its own leap, so a tap on the field as it comes in is all it needs.
// The poles are bodies in their cups and fall when a hoof goes through them. See .docs/games.md.
import {
    actor,
    actorSprites,
    land as squash,
    stepActor,
    type Cycle,
    type Actor,
} from "../../engine/motion/actor";
import { bodies, type Bodies, type Body } from "../../engine/motion/bodies";
import { follow, type Cam } from "../../engine/motion/camera";
import { feed, progress, track, type GameEvent, type Track } from "../../engine/motion/goals";
import type { Pad } from "../../engine/motion/pad";
import type { Frame, Happening, Mark, Sprite, Water } from "../../engine/motion/scene";
import {
    runner,
    stepRunner,
    type Course,
    type Moves,
    type Runner,
} from "../../engine/motion/walker";
import { panOf, type Kit } from "../../engine/sound/kit";
import { lengths, row, type Eye } from "./scenery";
import type { ActionGame, ActionLevel } from "./game";

/** Steps a second, which is the rate the page's loop runs this game at. */
export const RATE = 60;
const DT = 1 / RATE;
/** Seconds a canter stride takes whatever its length, so a longer stride is a faster pony. */
export const BEAT = 0.5;
/** Squares a second, each second, that a leap falls back by. */
export const G = 24;
/** Seconds of holding space that gather the pony fully. */
export const GATHER = 0.9;
/** The least a let-go of space asks for, so a tap of it is a small hop rather than nothing. */
export const LEAST = 0.25;
/** The gathers the pony chooses between for a leap, from a small hop to all it has, smallest first. */
const POWERS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
/** Squares of room the pony leaves over every pole and past the water, so a leap never hangs on a hair. */
const SPARE = 0.05;
/**
 * How high a leap rises for a gather, from nought to one, in squares, at a stride: a fast pony jumps
 * flatter and a slow one rounder, so a long stride buys length with height.
 */
export const heightOf = (power: number, stride: number): number =>
    (1.2 + 2.4 * power) * (1.15 - 0.15 * (stride - 2));
/** How far ahead of the pony's middle its leading hoof reaches on the grass, and either way of it in the air. */
export const REACH = 1.2;
export const TUCKED = 0.6;
/** How far up the hooves fold over the middle of a leap, in squares. */
const TUCK = 0.55;
/** A pole: how far it reaches either way of its middle, and how thick it is. */
export const POLE = { half: 0.55, thick: 0.24 };
/** How near a hoof must come to a pole to touch it, past the pole's own end. */
const HOOF = 0.1;
/** A pole is down once it has dropped this far out of its cups, or turned this far over. */
const FALLEN = { drop: 0.4, angle: 0.4 };
/** Steps at the start of a round in which a press only starts the pony, since the page begins a round on its first input. */
const START = 6;
/** Seconds after a fence is passed before it is judged, so a rattled pole can settle back or fall. */
const JUDGE = 0.6;

const VIEW = { w: 24, h: 13 };
/** The world's height: sky enough over the course for a taller room, and the ground at its foot. */
const WORLD_H = 22;
export const GROUND = WORLD_H - 2.6;
/** The pony's size in squares across; its drawing is six squares by five. */
const PONY = 4.4;

export type FenceKind = "upright" | "oxer" | "water";

/** A fence on the course: where its near pole stands, how high, and how far a spread or water runs. */
export interface Fence {
    kind: FenceKind;
    at: number;
    /** Squares above the grass that the poles rest at; nought for water. */
    height: number;
    /** Squares from the near pole to the far one, or across the water; nought for an upright. */
    spread: number;
}

export interface ClearCourse {
    /** Where the pony's first hoof falls. */
    start: number;
    /** Past this the round is over. */
    finish: number;
    fences: Fence[];
    /** The strides the pony may lengthen and shorten between, shortest first; it sees its own stride. */
    strides: number[];
    /** The stride it canters at when nothing is ahead. */
    stride: number;
}

/** How the pony will meet the next fence: its first stride, the stride after, and the print it takes off from. */
export interface Approach {
    first: number;
    stride: number;
    /** The take-off print, and its count from the last hoof fall. */
    at: number;
    n: number;
}

/** What each level draws to help: numbers on the prints, the take-off band, and the leap's arc. */
export interface Helps {
    numbers: boolean;
    band: boolean;
    /** The leap's arc: always, only while Jump is held or asked, or never. */
    arc: "always" | "asked" | "never";
    /** Prints drawn ahead of the pony; the rest are left to count. */
    ahead: number;
    /** The squares from each fence to the next, written on the grass. */
    distances: boolean;
}

export interface ClearLevel extends ActionLevel {
    helps: Helps;
}

interface Rail {
    body: Body;
    fence: number;
    rest: { x: number; y: number };
    hit: boolean;
    down: boolean;
}

/** A leap: where it left from, how fast along and up, and the fence it was for. */
export interface Leap {
    from: number;
    v: number;
    vy: number;
}

type Act = "stand" | "canter" | "gather" | "leap" | "air" | "land" | "skid" | "back";

const ACTS: Record<Act, Cycle> = {
    stand: { poses: ["stand"] },
    canter: { poses: ["canter1", "canter2", "canter3"], per: 1 / 3 },
    gather: { poses: ["gather"] },
    leap: { poses: ["leap"] },
    air: { poses: ["air"] },
    land: { poses: ["land"] },
    skid: { poses: ["skid"] },
    back: { poses: ["canter1", "canter2", "canter3"], per: 1 / 3 },
};

export interface ClearState {
    phase: number;
    course: ClearCourse;
    helps: Helps;
    world: Bodies;
    rails: Rail[];
    pony: Runner;
    act: Actor<Act>;
    /** The stride in use, and the one it takes at the next hoof fall. */
    stride: number;
    want: number;
    /** Where the last hoof fell, and how many have. */
    fall: number;
    falls: number;
    /** The gather built while space is held, whether a hand was down last step, and whether it was the keys'. */
    power: number;
    hand: boolean;
    keys: boolean;
    /** A tap on the screen that came down as the round began: it starts the pony and asks for nothing. */
    starting: boolean;
    /** A leap asked for and waiting for a hoof fall: the keys' gather, or the pony's own choice. */
    asked: { keys: true; power: number } | { keys: false } | null;
    /** A tap on the screen has been seen this round, so the pony sees its own stride into the fences. */
    screen: boolean;
    /** The stride was chosen by the arrows for this fence, so the pony keeps it rather than seeing its own. */
    own: boolean;
    approach: Approach | null;
    flight: (Leap & { k: number; fence: number }) | null;
    /** The fence ridden to next. */
    fence: number;
    /** A fence passed and waiting to be judged, and the step it is judged on. */
    judging: { fence: number; at: number; splash: boolean }[];
    /** Poles knocked down and hooves in the water on the way round; each fence is jumped again, so none stops the round. */
    faults: number;
    stops: number;
    /** A stop: sliding to a halt, cantering back, then turning to come again. */
    turn: { stage: "stop" | "back"; to: number } | null;
    goal: Track;
    done: boolean;
    said: string;
    steps: number;
    /** Steps since the hooves last came down out of a leap. */
    since: number;
    cam: Cam;
    ripples: { x: number; age: number }[];
}

const up = (x: number, n: number): Fence => ({ kind: "upright", at: x, height: n, spread: 0 });
const oxer = (x: number, n: number): Fence => ({ kind: "oxer", at: x, height: n, spread: 1.4 });
const water = (x: number, w: number): Fence => ({ kind: "water", at: x, height: 0, spread: w });

export const CLEAR_LEVELS: ClearLevel[] = [
    {
        title: "Little fences",
        grades: [1, 1],
        goal: "Tap the field as the pony comes to the band, and it leaps from the ringed print. Three little fences.",
        helps: {
            numbers: true,
            band: true,
            arc: "always",
            ahead: 8,
            distances: false,
        },
    },
    {
        title: "Count the strides",
        grades: [1, 2],
        goal: "Count the prints to the ringed one, and tap on the print before it.",
        helps: {
            numbers: true,
            band: true,
            arc: "always",
            ahead: 8,
            distances: false,
        },
    },
    {
        title: "Spreads and a double",
        grades: [2, 3],
        goal: "A spread and a double with one stride between. With the keys, gather longer for the spread.",
        helps: {
            numbers: false,
            band: true,
            arc: "asked",
            ahead: 8,
            distances: false,
        },
    },
    {
        title: "The water jump",
        grades: [2, 4],
        goal: "Water is five squares across. It takes a long stride and a big leap.",
        helps: {
            numbers: false,
            band: true,
            arc: "asked",
            ahead: 8,
            distances: true,
        },
    },
    {
        title: "The big round",
        grades: [3, 4],
        goal: "No band now. Read the squares between the fences, and meet each one on a good stride.",
        helps: {
            numbers: false,
            band: false,
            arc: "never",
            ahead: 8,
            distances: true,
        },
    },
];

const FIRST: Helps = {
    numbers: true,
    band: true,
    arc: "always",
    ahead: 8,
    distances: false,
};

/**
 * The courses the levels ride, with the variant moving a fence or two a square, so a stride that
 * fitted one layout may not fit the next. Every layout is ridden clean by the planner in
 * clear-challenges.ts before it ships, and by the game itself in the tests.
 */
export function clearCourse(phase: number, variant = 0): ClearCourse {
    if (!Number.isInteger(phase) || phase < 0 || phase >= CLEAR_LEVELS.length)
        throw new Error("Unknown clear phase");
    const v = (((variant % 3) + 3) % 3) - 1;
    const course = (fences: Fence[], strides: number[], stride: number): ClearCourse => {
        const last = fences[fences.length - 1];
        return {
            start: 14,
            finish: (last ? last.at + last.spread : 30) + 14,
            fences,
            strides,
            stride,
        };
    };
    if (phase === 0) return course([up(26 + v, 1), up(41, 1), up(56 - v, 1)], [3], 3);
    if (phase === 1)
        return course([up(26, 2), up(40 + v, 2), up(55, 2), up(71 - v, 2)], [2, 3, 4], 3);
    if (phase === 2)
        return course([up(26, 2), oxer(41 + v, 2), up(58, 2), up(67 + v, 2)], [2, 3, 4], 3);
    if (phase === 3)
        return course([up(26, 2), water(40 + v, 5), up(62, 2), oxer(78 - v, 2)], [2, 3, 4], 3);
    return course(
        [up(26, 2), oxer(41 + v, 2), water(57, 5), up(78 - v, 3), up(87 - v, 2), oxer(104, 2)],
        [2, 3, 4],
        3,
    );
}

/** The poles of a fence, near first: one for an upright, two for a spread, none for water. */
export const polesOf = (f: Fence): number[] =>
    f.kind === "water" ? [] : f.kind === "oxer" ? [f.at, f.at + f.spread] : [f.at];

/** Where a grounded pony's leading hoof would meet the fence, so it stops there rather than walking in. */
export const refusalAt = (f: Fence): number =>
    f.kind === "water" ? f.at - 0.1 : f.at - POLE.half - HOOF;

/** A leap from `from` at this stride and gather. */
export const leapOf = (from: number, stride: number, power: number): Leap => ({
    from,
    v: stride / BEAT,
    vy: Math.sqrt(2 * G * heightOf(power, stride)),
});

/** Seconds a leap stays up. */
export const airtime = (l: Leap): number => (2 * l.vy) / G;

/**
 * Where a leap is `k` steps after it left: the middle of the pony, its feet, and how far through it
 * is. It is the arc the runner steps, sampled the same way, so what this says the game does.
 */
export function flightAt(l: Leap, k: number): { x: number; y: number; u: number } {
    const t = k * DT;
    return { x: l.from + l.v * t, y: GROUND - (l.vy * t - (G * t * t) / 2), u: t / airtime(l) };
}

/** The step a leap comes down on, and where. */
export function landingOf(l: Leap): { k: number; x: number } {
    let k = 1;
    while (flightAt(l, k).y < GROUND) k++;
    return { k, x: flightAt(l, k).x };
}

/** The two hooves a step of a leap reaches with, folded up under the middle. */
export function hoovesAt(l: Leap, k: number): { x: number; y: number }[] {
    const at = flightAt(l, k),
        lift = TUCK * Math.sin(Math.PI * Math.min(1, at.u));
    return [
        { x: at.x + TUCKED, y: at.y - lift },
        { x: at.x - TUCKED, y: at.y - lift },
    ];
}

/** Whether a hoof touches a pole whose middle is at (x, y). */
const touches = (h: { x: number; y: number }, x: number, y: number, spare = 0): boolean =>
    Math.abs(h.x - x) < POLE.half + HOOF + spare && h.y > y - POLE.thick / 2 - spare;

/**
 * Whether a leap carries a fence clean: every hoof over every pole, and over water, the hind hoof down
 * past the far edge. The game knocks a pole on exactly these touches, so a leap this passes is one the
 * pony rides; `spare` asks for that much room besides, for a plan that must not hang on a hair.
 */
export function carries(f: Fence, l: Leap, spare = 0): boolean {
    const { k, x } = landingOf(l);
    if (f.kind === "water") return x - TUCKED >= f.at + f.spread + spare && l.from + REACH < f.at;
    for (let i = 1; i < k; i++)
        for (const h of hoovesAt(l, i))
            for (const p of polesOf(f)) if (touches(h, p, GROUND - f.height, spare)) return false;
    return x > f.at + f.spread + spare;
}

/** The hoof falls from the one after `fall`, one stride then `want` apart, up to `most` of them. */
export function printsFrom(fall: number, stride: number, want: number, most: number): number[] {
    const out: number[] = [];
    for (let x = fall + stride, n = 0; n < most; x += want, n++) out.push(x);
    return out;
}

/** The least gather that carries the fence clean from `from` at this stride, or null when none does. */
export function gatherFor(f: Fence, from: number, stride: number): number | null {
    if (from + REACH >= refusalAt(f)) return null;
    for (const p of POWERS) if (carries(f, leapOf(from, stride, p), SPARE)) return p;
    return null;
}

/** Take-off bands already worked out, by the fence's shape and the stride, as offsets from the fence. */
const BANDS = new Map<string, { from: number; to: number } | null>();

/** Where some gather carries the fence clean at this stride, as one band, or null. */
export function takeoffBand(f: Fence, stride: number): { from: number; to: number } | null {
    const key = `${f.kind}:${f.height}:${f.spread}:${stride.toFixed(2)}`;
    if (!BANDS.has(key)) {
        const at = { ...f, at: 0 };
        let from: number | null = null,
            to: number | null = null;
        for (let x = -12; x <= refusalAt(at) - REACH; x += 0.1) {
            if (gatherFor(at, x, stride) === null) continue;
            from ??= x;
            to = x;
        }
        BANDS.set(key, from === null || to === null ? null : { from, to });
    }
    const band = BANDS.get(key);
    return band ? { from: f.at + band.from, to: f.at + band.to } : null;
}

/** The strides the pony may take on a course, a tenth of a square apart, from half a square either side of the course's own. */
function stridesOf(course: ClearCourse): number[] {
    const lo = Math.max(1.8, Math.min(...course.strides) - 0.5),
        hi = Math.max(...course.strides) + 0.5,
        out: number[] = [];
    for (let x = lo; x <= hi + 1e-9; x += 0.1) out.push(Math.round(x * 10) / 10);
    return out;
}

/**
 * How the pony meets fence `f` from a hoof fall at `fall`: the stride nearest its own and a count of
 * prints, two to four where it can, that puts a print well inside the take-off band; its first stride
 * may be shorter or longer before it settles, as a rider's is. Null when nothing fits, and the pony
 * then stops at the fence and comes again.
 */
export function approachTo(course: ClearCourse, f: Fence, fall: number): Approach | null {
    const strides = stridesOf(course);
    const fits = (at: number, stride: number) =>
        gatherFor(f, at, stride) !== null &&
        gatherFor(f, at - 0.2, stride) !== null &&
        gatherFor(f, at + 0.2, stride) !== null;
    let best: (Approach & { score: number }) | null = null;
    for (const first of strides)
        for (let n = 1; n <= 10; n++)
            for (const stride of strides) {
                if (n === 1 && stride !== first) continue;
                const at = fall + first + (n - 1) * stride;
                if (!fits(at, stride)) continue;
                const score =
                    Math.abs(stride - course.stride) +
                    Math.abs(first - stride) +
                    (n < 2 ? 1 : 0) +
                    (n > 4 ? 0.3 * (n - 4) : 0);
                if (!best || score < best.score) best = { first, stride, at, n, score };
            }
    return best ? { first: best.first, stride: best.stride, at: best.at, n: best.n } : null;
}

function build(course: ClearCourse): { world: Bodies; rails: Rail[] } {
    const world = bodies({ gravity: { x: 0, y: 14 } });
    world.ground({ y: GROUND, from: 0, to: course.finish + 30, friction: 0.8 });
    const rails: Rail[] = [];
    course.fences.forEach((fence, i) => {
        for (const x of polesOf(fence)) {
            const y = GROUND - fence.height;
            // a cup under each end holds the pole, and is part of the stand rather than anything that moves
            for (const dx of [-POLE.half + 0.08, POLE.half - 0.08])
                world.box({
                    x: x + dx,
                    y: y + POLE.thick / 2 + 0.08,
                    w: 0.16,
                    h: 0.16,
                    fixed: true,
                });
            const body = world.box({
                x,
                y,
                w: POLE.half * 2,
                h: POLE.thick,
                density: 0.6,
                friction: 0.5,
                restitution: 0.1,
            });
            rails.push({ body, fence: i, rest: { x, y }, hit: false, down: false });
        }
    });
    return { world, rails };
}

export function startClear(course: ClearCourse, phase = 0): ClearState {
    const { world, rails } = build(course);
    const helps = CLEAR_LEVELS[phase]?.helps ?? FIRST;
    const pony = runner(course.start, GROUND, 1);
    pony.vx = course.stride / BEAT;
    pony.state = "run";
    const s: ClearState = {
        phase,
        course: structuredClone(course),
        helps,
        world,
        rails,
        pony,
        act: actor<Act>("canter", "canter1"),
        stride: course.stride,
        want: course.stride,
        fall: course.start,
        falls: 0,
        power: 0,
        hand: false,
        keys: false,
        starting: false,
        asked: null,
        screen: false,
        own: false,
        approach: null,
        flight: null,
        fence: 0,
        judging: [],
        faults: 0,
        stops: 0,
        turn: null,
        goal: track({ inOrder: course.fences.map((_, i) => ({ on: "clear", value: i })) }),
        done: false,
        said: "Tap the field as the pony comes to the band, and it leaps from the ringed print.",
        steps: 0,
        since: 99,
        cam: { x: course.start + 7, y: WORLD_H - VIEW.h / 2, zoom: 1 },
        ripples: [],
    };
    plan(s);
    return s;
}

/** The pony keeps the stride it has: until a tap on the screen, and wherever the arrows chose it. */
const keeps = (s: ClearState): boolean => !s.screen || s.own;

/**
 * From the last hoof fall: the pony sees its own stride into the next fence and takes it at once, or
 * where it keeps its stride, the take-off print is the first one the band holds at it.
 */
function plan(s: ClearState): void {
    const f = s.course.fences[s.fence];
    if (keeps(s)) {
        s.approach = approachAt(s);
        return;
    }
    s.approach = f ? approachTo(s.course, f, s.fall) : null;
    s.stride = s.approach?.first ?? s.course.stride;
    s.want = s.approach?.stride ?? s.course.stride;
}

/** The first print ahead at the stride chosen that some gather carries the fence from, as an approach. */
function approachAt(s: ClearState): Approach | null {
    const f = s.course.fences[s.fence];
    if (!f) return null;
    const prints = printsFrom(s.fall, s.stride, s.want, 12);
    const i = prints.findIndex(
        (x) => gatherFor(f, x, x === prints[0] ? s.stride : s.want) !== null,
    );
    const at = prints[i];
    return at === undefined ? null : { first: s.stride, stride: s.want, at, n: i + 1 };
}

/**
 * A tap on the screen asks the pony to leap and choose its own gather. The first in a round lets it see
 * its own stride from then on, at once if its stride has no print on the band.
 */
function tapped(s: ClearState): void {
    s.asked = { keys: false };
    if (s.screen) return;
    s.screen = true;
    if (!s.approach) plan(s);
}

/** The keys choose the next stride from the course's own, which starts at the next hoof fall. */
function choose(s: ClearState, d: "left" | "right"): void {
    const strides = s.course.strides;
    let i = 0;
    for (const [k, x] of strides.entries())
        if (Math.abs(x - s.want) < Math.abs((strides[i] ?? x) - s.want)) i = k;
    const next = strides[d === "left" ? Math.max(0, i - 1) : Math.min(strides.length - 1, i + 1)];
    if (next === undefined) return;
    s.want = next;
    s.own = true;
    if (!s.flight) s.approach = approachAt(s);
}

const flat: Course = {
    floor: (_x, from, to) => (GROUND >= from && GROUND <= to ? { y: GROUND } : null),
};

const movesAt = (speed: number, accel = 24): Moves => ({
    speed,
    accel,
    airAccel: 0,
    gravity: G,
    jump: 1,
    cut: 1,
    coyote: 0,
    buffer: 0,
    step: 0.3,
    fall: 100,
    climb: 0,
    pace: 1,
    height: 3,
});

const emit = (s: ClearState, out: Happening[], event: GameEvent): void => {
    feed(s.goal, event);
    out.push({ event });
};

const cue = (
    s: ClearState,
    out: Happening[],
    c: "place" | "lift" | "bump" | "crash" | "nope" | "ring" | "splash" | "win" | "level",
    strength: number,
    pitch = 1,
): void => {
    out.push({ cue: c, strength, pitch, pan: panOf(s.pony.x, s.cam.x, VIEW.w) });
};

/** The next fence, or null once they are all behind. */
export const nextFence = (s: ClearState): Fence | null => s.course.fences[s.fence] ?? null;

function takeOff(s: ClearState, out: Happening[], power: number): void {
    const l = leapOf(s.fall, s.stride, power);
    s.flight = { ...l, k: 0, fence: s.fence };
    s.asked = null;
    s.power = 0;
    Object.assign(s.pony, { x: l.from, y: GROUND, vx: l.v, vy: -l.vy, state: "rise" });
    cue(s, out, "lift", 0.35 + 0.5 * power);
    out.push({ puff: { x: l.from - 0.6, y: GROUND, n: 3 } });
}

function refuse(s: ClearState, out: Happening[], f: Fence): void {
    s.turn = { stage: "stop", to: comeAgainFrom(s, f) };
    s.asked = null;
    s.power = 0;
    s.own = false;
    s.stops++;
    s.said = "The pony stopped at the fence. Tap Jump as it comes to the band, and it will leap.";
    cue(s, out, "nope", 0.6);
    out.push({ puff: { x: s.pony.x + REACH, y: GROUND, n: 5 } });
}

/** Where a pony turned back from fence `f` canters to before it comes again: room for a few strides. */
const comeAgainFrom = (s: ClearState, f: Fence): number =>
    refusalAt(f) - REACH - 3 * s.course.stride - 4;

/**
 * A leap asked for, at a hoof fall. The keys' gather leaps from the next print whatever it carries, as
 * a rider's does. A tap on the screen lets the pony choose: from a print some gather carries the fence
 * from it leaps with the least that does, and one print early it waits for the next; any earlier, or
 * past the band, it leaps all the same, and the fence is jumped again if a pole comes down. Says
 * whether it leapt.
 */
function answer(s: ClearState, out: Happening[]): boolean {
    const f = nextFence(s),
        asked = s.asked;
    if (!f || !asked) {
        s.asked = null;
        return false;
    }
    if (asked.keys) {
        takeOff(s, out, asked.power);
        return true;
    }
    const power = gatherFor(f, s.fall, s.stride);
    if (power !== null) {
        takeOff(s, out, power);
        return true;
    }
    const next = s.fall + s.want;
    if (gatherFor(f, next, s.want) !== null) return false;
    if (s.fall + REACH >= refusalAt(f)) {
        s.asked = null;
        return false;
    }
    const a = s.approach;
    s.said = a && s.fall < a.at ? "Too soon. The pony took off early." : "A little late.";
    takeOff(s, out, 1);
    return true;
}

/**
 * A hoof caught a pole, `deep` squares below its top: a brush rattles it in its cups, where it may
 * settle, and a hoof through it throws it out the way the pony goes. A pole is caught once a leap.
 */
function knock(s: ClearState, out: Happening[], r: Rail, speed: number, deep: number): void {
    if (r.hit) return;
    r.hit = true;
    const p = s.world.where(r.body);
    if (deep < 0.1) s.world.launch(r.body, { x: 0.4, y: -1 }, 1.5);
    else s.world.launch(r.body, { x: 1.2 + speed * 0.25, y: -1.8 }, 5);
    cue(s, out, "bump", deep < 0.1 ? 0.3 : 0.6);
    out.push({ burst: { kind: "dust", x: p.x, y: p.y, n: 3 } });
}

function landed(s: ClearState, out: Happening[], speed: number): void {
    const flight = s.flight;
    if (!flight) return;
    s.flight = null;
    s.fall = s.pony.x;
    s.stride = s.want;
    s.since = 0;
    squash(s.act, speed);
    cue(s, out, "bump", Math.min(1, 0.4 + speed / 30));
    const f = s.course.fences[flight.fence];
    if (f?.kind === "water" && s.pony.x - TUCKED < f.at + f.spread && s.pony.x > f.at) {
        s.ripples.push({ x: s.pony.x - TUCKED, age: 0 });
        cue(s, out, "splash", 0.8);
        out.push({ burst: { kind: "splash", x: s.pony.x - TUCKED, y: GROUND, n: 10 } });
        s.faults++;
        s.said = "A hoof in the water. The pony goes round to jump it again.";
        pass(s, flight.fence, true);
        return;
    }
    out.push({ puff: { x: s.pony.x, y: GROUND, n: 4 } });
    if (f && s.pony.x > f.at + f.spread) pass(s, flight.fence, false);
    else plan(s);
}

/** A fence is behind the pony: it is judged once its poles have had a moment to fall or settle. */
function pass(s: ClearState, fence: number, splash: boolean): void {
    if (s.fence !== fence) return;
    s.fence = fence + 1;
    s.judging.push({ fence, at: s.steps + Math.round(JUDGE * RATE), splash });
    s.own = false;
    plan(s);
}

function judge(s: ClearState, out: Happening[]): void {
    for (let j = s.judging[0]; j && s.steps >= j.at; j = s.judging[0]) {
        const down = s.rails.filter((r) => r.fence === j.fence && r.down);
        if (down.length || j.splash) {
            // the pony goes round with its hooves on the grass, so a knock waits for a leap in the air to land
            if (s.flight) return;
            s.judging = [];
            again(s, j.fence);
            if (down.length)
                s.said = `A pole came down at fence ${j.fence + 1}. Round again to jump it.`;
            return;
        }
        s.judging.shift();
        emit(s, out, { kind: "clear", value: j.fence });
        emit(s, out, { kind: "checkpoint" });
        cue(s, out, "ring", 0.5, 1 + j.fence * 0.06);
        const left = s.course.fences.length - j.fence - 1;
        s.said = left
            ? `Clear over fence ${j.fence + 1}. ${left} ${left === 1 ? "fence" : "fences"} to go.`
            : "Clear over the last fence. Canter on through the finish.";
        out.push({ burst: { kind: "sparkle", x: s.pony.x, y: GROUND - 3, n: 4 } });
    }
}

/** A fence knocked or splashed: its poles go back in their cups and the pony goes round to jump it again. */
function again(s: ClearState, fence: number): void {
    const f = s.course.fences[fence];
    if (!f) return;
    for (const r of s.rails)
        if (r.fence === fence) {
            s.world.moveTo(r.body, r.rest, 0);
            r.down = false;
            r.hit = false;
        }
    s.fence = fence;
    s.asked = null;
    s.power = 0;
    s.own = false;
    s.approach = null;
    s.turn = { stage: "stop", to: comeAgainFrom(s, f) };
}

/** The canter's three beats in a stride, as far through it as each falls. */
const BEATS = [0, 0.22, 0.36];

/** One step of cantering on the grass at a stride, easing to its speed. */
export function canter(pony: Runner, stride: number): void {
    stepRunner(pony, { run: 1, jump: false, jumped: false }, flat, movesAt(stride / BEAT), DT);
}

function run(s: ClearState, out: Happening[]): void {
    const was = s.pony.x;
    if (s.done) {
        stepRunner(s.pony, { run: 0, jump: false, jumped: false }, flat, movesAt(0.001, 6), DT);
        if (Math.abs(s.pony.vx) < 0.05) s.pony.vx = 0;
        return;
    }
    canter(s.pony, s.stride);
    // the canter's beats, heard at their places through the stride
    const before = (was - s.fall) / s.stride,
        now = (s.pony.x - s.fall) / s.stride;
    for (const b of BEATS.slice(1))
        if (before < b && now >= b) cue(s, out, "place", 0.3 + b * 0.4, 0.9 + b);
    while (s.pony.x >= s.fall + s.stride - 1e-9) {
        s.fall += s.stride;
        s.falls++;
        s.stride = s.want;
        cue(s, out, "place", 0.55, 0.8);
        if (keeps(s)) s.approach = approachAt(s);
        if (s.asked && answer(s, out)) return;
    }
    // the note says when: in the stride before the ringed print, a tap now is on time
    if (!s.asked && !s.hand && countTo(s) === 1) s.said = "Tap now.";
    const f = nextFence(s);
    if (!f) return;
    const stop = refusalAt(f),
        standing = f.kind === "water" || s.rails.some((r) => r.fence === s.fence && !r.down);
    if (standing && was + REACH < stop && s.pony.x + REACH >= stop) {
        refuse(s, out, f);
        return;
    }
    // come down short of the water and run on into it: a hoof in the water all the same
    if (f.kind === "water" && s.pony.x + REACH > f.at + 0.3) {
        s.ripples.push({ x: s.pony.x + REACH, age: 0 });
        cue(s, out, "splash", 0.8);
        out.push({ burst: { kind: "splash", x: s.pony.x + REACH, y: GROUND, n: 10 } });
        s.faults++;
        s.said = "A hoof in the water. The pony goes round to jump it again.";
        pass(s, s.fence, true);
        return;
    }
    // landed inside a fence: the poles under the hooves are knocked where they stand
    for (const r of s.rails)
        if (r.fence === s.fence && !r.down) {
            const p = s.world.where(r.body);
            for (const hx of [s.pony.x + REACH, s.pony.x - REACH])
                if (touches({ x: hx, y: GROUND }, p.x, p.y)) knock(s, out, r, s.pony.vx, 1);
        }
    if (s.pony.x - REACH > f.at + f.spread + 0.2) pass(s, s.fence, false);
}

function fly(s: ClearState, out: Happening[]): void {
    const flight = s.flight;
    if (!flight) return;
    flight.k++;
    const ran = stepRunner(
        s.pony,
        { run: 1, jump: true, jumped: false },
        flat,
        movesAt(flight.v),
        DT,
    );
    // the step it comes down on is the grass's to judge, as the run does
    if (ran.includes("landed")) {
        landed(s, out, flight.vy);
        return;
    }
    for (const h of hoovesAt(flight, flight.k))
        for (const r of s.rails) {
            if (r.down) continue;
            const p = s.world.where(r.body);
            if (touches(h, p.x, p.y)) knock(s, out, r, flight.v, h.y - (p.y - POLE.thick / 2));
        }
}

function turning(s: ClearState, out: Happening[]): void {
    const t = s.turn;
    if (!t) return;
    if (t.stage === "stop") {
        stepRunner(s.pony, { run: 0, jump: false, jumped: false }, flat, movesAt(0.001, 22), DT);
        if (Math.abs(s.pony.vx) < 0.05) {
            s.pony.vx = 0;
            t.stage = "back";
        }
        return;
    }
    const d = t.to - s.pony.x;
    if (d < -0.05) {
        stepRunner(s.pony, { run: -1, jump: false, jumped: false }, flat, movesAt(5, 12), DT);
        return;
    }
    // back far enough: it turns and comes again from here, at the stride it had
    s.turn = null;
    s.pony.facing = 1;
    s.pony.vx = 0;
    s.fall = s.pony.x;
    plan(s);
    s.said = "Coming round again. Tap Jump as it comes to the band.";
    cue(s, out, "place", 0.4, 0.7);
}

function actOf(s: ClearState): Act {
    if (s.turn) return s.turn.stage === "stop" ? "skid" : "back";
    if (s.flight) {
        const u = s.flight.k / Math.max(1, landingOf(s.flight).k);
        return u < 0.22 ? "leap" : u < 0.68 ? "air" : "land";
    }
    if (s.done && s.pony.vx === 0) return "stand";
    if (s.since < 7) return "land";
    const through = (s.pony.x - s.fall) / s.stride;
    if ((s.asked || s.hand) && through > 0.45) return "gather";
    return "canter";
}

export function stepClear(s: ClearState, pad: Pad): Happening[] {
    const out: Happening[] = [];
    s.steps++;
    s.since++;
    for (const d of pad.pressed) if (!s.done && (d === "left" || d === "right")) choose(s, d);
    // space held on the grass gathers and let go asks for a leap of that gather; Jump or a finger on the
    // field asks the pony to choose its own; a hand let go in the air asks nothing
    const hand = pad.go || pad.tapped || pad.touch !== null,
        grounded = !s.flight && !s.turn && !s.done;
    if (hand) {
        if (!s.hand) {
            s.power = 0;
            s.keys = pad.keys === true;
            s.starting = s.steps <= START && !s.keys;
        }
        if (grounded) s.power = Math.min(1, s.power + DT / GATHER);
    } else if (s.hand) {
        if (s.starting) s.starting = false;
        else if (grounded && s.keys) s.asked = { keys: true, power: Math.max(LEAST, s.power) };
        else if (grounded) tapped(s);
        s.power = 0;
    } else if (pad.lifted && grounded && s.steps > START) tapped(s);
    s.hand = hand;
    if (s.turn) turning(s, out);
    else if (s.flight) fly(s, out);
    else run(s, out);
    s.world.step(DT);
    for (const r of s.rails) {
        if (r.down) continue;
        const p = s.world.where(r.body);
        if (p.y - r.rest.y > FALLEN.drop || Math.abs(p.angle) > FALLEN.angle) {
            r.down = true;
            s.faults++;
            cue(s, out, "crash", 0.8);
            out.push({ shake: 0.15 });
        }
    }
    judge(s, out);
    for (const w of s.ripples) w.age += DT;
    s.ripples = s.ripples.filter((w) => w.age < 3);
    if (
        !s.done &&
        !s.flight &&
        !s.judging.length &&
        s.fence >= s.course.fences.length &&
        s.pony.x >= s.course.finish
    ) {
        s.done = true;
        s.said = s.faults
            ? `Every fence jumped, with ${s.faults} ${s.faults === 1 ? "knock" : "knocks"} on the way.`
            : "A clear round!";
        cue(s, out, "win", 0.9);
        out.push({ burst: { kind: "sparkle", x: s.pony.x, y: GROUND - 4, n: 14 } });
    }
    stepActor(
        s.act,
        actOf(s),
        ACTS,
        DT,
        s.falls + (s.pony.x - s.fall) / Math.max(1, s.stride),
        s.pony.facing,
    );
    s.cam = follow(
        s.cam,
        // the camera leads well ahead, so the fence is in sight a few strides before the band
        { x: s.pony.x + (s.turn ? 0 : 7), y: WORLD_H - VIEW.h / 2, zoom: 1 },
        { rate: 3, dt: DT, view: VIEW, world: worldOf(s) },
    );
    return out;
}

const worldOf = (s: ClearState) => ({ w: s.course.finish + 16, h: WORLD_H });

/** The colours the fences take down the course, so one reads apart from the next. */
const TONES = ["tang", "sky", "berry", "mint", "glow"] as const;
const toneOf = (i: number): string => TONES[i % TONES.length] ?? "tang";

/** A fence's number as a course shows it: 1, 2, and 3a and 3b for the two parts of a double. */
function numbersOf(course: ClearCourse): string[] {
    const out: string[] = [];
    let n = 0;
    course.fences.forEach((f, i) => {
        const before = course.fences[i - 1];
        const after = course.fences[i + 1];
        const close = (a: Fence | undefined, b: Fence | undefined) =>
            !!a &&
            !!b &&
            a.kind !== "water" &&
            b.kind !== "water" &&
            b.at - (a.at + a.spread) <= 10;
        const double = close(before, f),
            opens = close(f, after);
        if (double) out.push(`${n}b`);
        else {
            n++;
            out.push(opens ? `${n}a` : String(n));
        }
    });
    return out;
}

/** The prints to the next fence at the pony's stride, the band, the take-off print and the gather it will leap with. */
export function helpOf(s: ClearState): {
    prints: number[];
    band: { from: number; to: number } | null;
    takeoff: number | null;
    power: number | null;
} {
    const f = nextFence(s),
        a = s.approach;
    const prints = printsFrom(s.fall, s.stride, s.want, 12).filter(
        (x) => !f || x + REACH < refusalAt(f) + 0.01,
    );
    const keys = s.hand ? s.keys : s.asked?.keys === true;
    const power = !f
        ? null
        : keys
          ? s.hand
              ? Math.max(LEAST, s.power)
              : s.asked?.keys
                ? s.asked.power
                : null
          : a && gatherFor(f, a.at, a.stride);
    return {
        prints,
        band: f ? takeoffBand(f, s.want) : null,
        takeoff: a ? a.at : null,
        power: power ?? null,
    };
}

/** How many prints ahead the take-off print is, counting the next as one, or null. */
function countTo(s: ClearState): number | null {
    const a = s.approach;
    if (!a) return null;
    const i = printsFrom(s.fall, s.stride, s.want, 12).findIndex((x) => Math.abs(x - a.at) < 1e-6);
    return i < 0 ? null : i + 1;
}

export function clearFrame(s: ClearState, rest = false): Frame {
    const sprites: Sprite[] = [];
    const marks: Mark[] = [];
    const eye: Eye = { cam: s.cam, view: { w: 72, h: WORLD_H } };
    sprites.push(
        ...row(
            {
                key: "cloud",
                depth: 0.15,
                base: WORLD_H - 11,
                every: 16,
                stray: 4,
                z: 0,
                gaps: 0.3,
                alpha: 0.9,
                drift: rest ? 0 : 0.25,
                things: [
                    { art: "cloud", params: { puffs: 4, rain: 0 }, size: 5, often: 2 },
                    { art: "cloud", params: { puffs: 3, rain: 0 }, size: 3.6, often: 1 },
                ],
            },
            eye,
            3,
            rest ? 0 : s.steps * DT,
        ),
        ...row(
            {
                key: "far",
                depth: 0.3,
                base: GROUND - 2.4,
                every: 11,
                stray: 3,
                z: 1,
                alpha: 0.55,
                things: [
                    {
                        art: "tree",
                        params: { fruit: 0, fallen: 0, item: "apple" },
                        size: 5,
                        often: 2,
                    },
                    {
                        art: "hedge",
                        params: { clumps: 4, berries: 0, gap: 0 },
                        size: 4.5,
                        often: 2,
                    },
                ],
            },
            eye,
            11,
        ),
        ...row(
            {
                key: "crowd",
                depth: 0.42,
                base: GROUND - 1.6,
                every: 26,
                stray: 3,
                z: 2,
                gaps: 0.2,
                alpha: 0.75,
                things: [
                    {
                        art: "grandstand",
                        params: { rows: 3, seats: 10, filled: 26 },
                        size: 7,
                        often: 3,
                    },
                    {
                        art: "grandstand",
                        params: { rows: 2, seats: 8, filled: 13 },
                        size: 5.5,
                        often: 1,
                    },
                ],
            },
            eye,
            21,
        ),
        ...row(
            {
                key: "bunting",
                depth: 0.6,
                base: GROUND - 6.2,
                every: 9,
                stray: 0.3,
                z: 2.5,
                alpha: 0.9,
                things: [{ art: "strokes.bunting", size: 4, often: 1 }],
            },
            eye,
            31,
        ),
        ...lengths(
            {
                key: "grass",
                art: "arcade.ground",
                every: 20,
                y: GROUND + 1.1,
                z: 3,
                params: (_x0, across) => ({ w: across }),
            },
            eye,
        ),
    );
    const numbers = numbersOf(s.course);
    const waters: Water[] = [];
    s.course.fences.forEach((f, i) => {
        const tone = toneOf(i);
        if (f.kind === "water") {
            waters.push({
                x: f.at,
                w: f.spread,
                level: GROUND - 0.1,
                bottom: GROUND + 0.9,
                waves: 0.04,
                ripples: rest ? [] : s.ripples.map((r) => ({ x: r.x, age: r.age, size: 0.8 })),
                z: 3.5,
            });
            sprites.push({
                key: `brush${i}`,
                art: "hedge",
                params: { clumps: 2, berries: 0, gap: 0 },
                x: f.at - 0.8,
                y: GROUND + 0.05,
                size: 1.6,
                stand: true,
                z: 6,
                still: true,
            });
        } else {
            const poles = polesOf(f);
            const first = poles[0] ?? f.at,
                last = poles[poles.length - 1] ?? f.at;
            const stand = (x: number, facing: number, flag: string, key: string) =>
                sprites.push({
                    key,
                    art: "jumpstand",
                    params: { tall: Math.max(2, f.height + 1), set: f.height, facing, tone, flag },
                    x,
                    y: GROUND + 0.1,
                    stand: true,
                    z: 6,
                    still: true,
                });
            stand(first - POLE.half - 0.45, 1, "white", `stand${i}a`);
            stand(last + POLE.half + 0.45, -1, "red", `stand${i}b`);
        }
        marks.push({
            kind: "word",
            x: f.kind === "water" ? f.at - 0.8 : f.at + f.spread / 2,
            y: GROUND - (f.kind === "water" ? 2.2 : f.height + 1),
            text: numbers[i] ?? String(i + 1),
            size: 0.6,
        });
        const next = s.course.fences[i + 1];
        if (s.helps.distances && next) {
            const from = f.at + f.spread,
                gap = next.at - from;
            marks.push({
                kind: "word",
                x: from + gap / 2,
                y: GROUND + 1.3,
                text: `${gap} squares`,
                size: 0.5,
            });
        }
    });
    for (const [i, r] of s.rails.entries()) {
        const p = s.world.where(r.body);
        sprites.push({
            key: `pole${i}`,
            art: "jumppole",
            params: { long: 2, tone: toneOf(r.fence), bands: 3 },
            x: p.x,
            y: p.y,
            angle: p.angle,
            size: POLE.half * 2 + 0.1,
            z: 7,
        });
    }
    const dress = (pose: string, facing: 1 | -1): Sprite => ({
        key: "pony",
        art: "pony",
        params: { pose, facing, coat: "chestnut", horn: false },
        x: s.pony.x,
        y: s.pony.y + 0.2 * (PONY / 6),
        size: PONY,
        stand: true,
        z: 9,
    });
    sprites.push(
        ...actorSprites(
            s.act,
            ACTS,
            dress,
            s.falls + (s.pony.x - s.fall) / Math.max(1, s.stride),
            rest,
        ),
    );
    sprites.push({
        key: "board",
        art: "scoreboard",
        params: {
            home: "Fences",
            away: "Knocks",
            scores: [Math.min(s.fence, s.course.fences.length), s.faults],
            note: !keeps(s)
                ? countTo(s) === null
                    ? ""
                    : `Take off on ${countTo(s)}`
                : `Stride ${s.want}`,
        },
        x: 2.5,
        y: 2,
        size: 4.2,
        fixed: true,
        z: 20,
    });
    if (!s.done && !s.turn && !s.flight) help(s, marks);
    return {
        sprites,
        marks,
        camera: rest ? { x: s.cam.x, y: s.cam.y, zoom: 1 } : { ...s.cam },
        view: { ...VIEW },
        world: worldOf(s),
        time: rest ? 0 : s.steps * DT,
        water: waters,
    };
}

function help(s: ClearState, marks: Mark[]): void {
    const h = s.helps,
        f = nextFence(s),
        { prints, band, takeoff, power } = helpOf(s);
    if (h.band && band)
        marks.push(
            {
                kind: "box",
                x: band.from - 0.15,
                y: GROUND - 0.32,
                w: band.to - band.from + 0.3,
                h: 0.3,
                on: true,
            },
            {
                kind: "word",
                x: (band.from + band.to) / 2,
                y: GROUND + 0.75,
                text: "take off",
                size: 0.45,
            },
        );
    const shown = prints.slice(0, h.ahead);
    for (const [i, x] of shown.entries()) {
        const on = takeoff !== null && Math.abs(x - takeoff) < 1e-6;
        marks.push({ kind: "ring", x, y: GROUND - 0.12, r: on ? 0.4 : 0.26, on, solid: on });
        if (h.numbers)
            marks.push({ kind: "word", x, y: GROUND - 0.9, text: String(i + 1), size: 0.5 });
    }
    const asking = s.hand || s.asked !== null;
    const show = h.arc === "always" || (h.arc === "asked" && asking);
    if (!show || !f || takeoff === null || power === null) return;
    const l = leapOf(takeoff, s.want, power),
        { k } = landingOf(l),
        pts = [];
    for (let i = 0; i <= k; i += 3) {
        const at = flightAt(l, i);
        pts.push({ x: at.x, y: at.y - 1.4 });
    }
    marks.push({ kind: "dots", pts, faint: !asking });
}

/** The pony's own sounds: hooves on grass, a leap, a thud down, a pole clattering, a snort and a cheer. */
const SOUNDS: Kit = {
    place: [
        { wave: "noise", hz: 420, attack: 0.002, decay: 0.05, gain: 0.45 },
        { wave: "sine", hz: 95, to: 70, attack: 0.002, decay: 0.08, gain: 0.5 },
    ],
    lift: [
        { wave: "noise", hz: 900, attack: 0.03, decay: 0.3, gain: 0.35 },
        { wave: "triangle", hz: 300, to: 520, attack: 0.01, decay: 0.2, gain: 0.15 },
    ],
    bump: [
        { wave: "noise", hz: 320, attack: 0.002, decay: 0.12, gain: 0.6 },
        { wave: "sine", hz: 80, to: 50, attack: 0.002, decay: 0.18, gain: 0.6 },
    ],
    crash: [
        { wave: "square", hz: 520, attack: 0.002, decay: 0.06, gain: 0.25 },
        { wave: "square", hz: 660, attack: 0.002, decay: 0.06, gain: 0.22, delay: 0.07 },
        { wave: "noise", hz: 2600, attack: 0.002, decay: 0.2, gain: 0.35 },
        { wave: "square", hz: 440, attack: 0.002, decay: 0.08, gain: 0.2, delay: 0.15 },
    ],
    nope: [
        { wave: "noise", hz: 1800, attack: 0.01, decay: 0.12, gain: 0.3 },
        { wave: "triangle", hz: 360, to: 240, attack: 0.01, decay: 0.25, gain: 0.3, delay: 0.08 },
    ],
    ring: [
        { wave: "sine", hz: 988, attack: 0.005, decay: 0.35, gain: 0.3 },
        { wave: "sine", hz: 1318, attack: 0.005, decay: 0.45, gain: 0.22, delay: 0.08 },
    ],
    win: [
        { wave: "triangle", hz: 523, attack: 0.005, decay: 0.18, gain: 0.4 },
        { wave: "triangle", hz: 659, attack: 0.005, decay: 0.18, gain: 0.4, delay: 0.12 },
        { wave: "triangle", hz: 784, attack: 0.005, decay: 0.18, gain: 0.4, delay: 0.24 },
        { wave: "triangle", hz: 1046, attack: 0.005, decay: 0.6, gain: 0.45, delay: 0.36 },
        { wave: "noise", hz: 1500, attack: 0.25, decay: 1.4, gain: 0.3, delay: 0.3 },
    ],
};

export const clearGame: ActionGame<ClearState> = {
    portrait: { keep: 18 },
    id: "clear",
    title: "Clear round",
    group: "action",
    levels: CLEAR_LEVELS,
    rate: RATE,
    hint: "Tap the field or Jump as the pony comes to the band, and it leaps from the ringed print; a tap one print early waits for it. With the keys, left and right choose the stride, and holding space gathers the pony: let go on the print before the band.",
    cover: { art: "pony", params: { pose: "air", facing: 1, coat: "chestnut", horn: false } },
    controls: { arrows: { left: "Shorter stride", right: "Longer stride" }, go: "Jump" },
    touch: true,
    quiet: true,
    sounds: SOUNDS,
    start: (phase, seed) => startClear(clearCourse(phase, ((seed ?? 0) >>> 0) % 3), phase),
    step: stepClear,
    cancelInput: (s) => {
        s.hand = false;
        s.power = 0;
    },
    hum: (s) => [
        { kind: "wind", level: s.flight ? 0.35 : Math.min(0.2, Math.abs(s.pony.vx) / 40) },
    ],
    say(s) {
        if (s.done)
            return s.faults
                ? `A round finished, with ${s.faults} ${s.faults === 1 ? "knock" : "knocks"} on the way.`
                : "A clear round.";
        const ride = keeps(s) ? `Stride ${s.want}. ` : "";
        if (s.flight) return `${ride}In the air over the fence.`;
        if (s.turn) return `${ride}The pony is going round to come again.`;
        const f = nextFence(s),
            n = countTo(s);
        if (!f) return `${ride}Cantering on to the finish.`;
        const to = `${ride}Fence ${s.fence + 1} is ${Math.round(f.at - s.pony.x)} squares ahead.`;
        if (n === null)
            return `${to} No print lands on the band; the pony will stop and come again.`;
        if (s.asked) return `${to} Jump is asked for.`;
        return n === 1
            ? `${to} Tap now: the next print is the one to take off from.`
            : `${to} The pony takes off from print ${n}.`;
    },
    note: (s) => s.said,
    won: (s) => s.done,
    objectives: (s) => {
        const p = progress(s.goal);
        return { completed: p.completed, total: p.total };
    },
    frame: clearFrame,
    still: {
        press: () => Math.round(BEAT * RATE),
        settling: (s) => s.flight !== null || s.turn !== null || s.judging.length > 0,
    },
};
