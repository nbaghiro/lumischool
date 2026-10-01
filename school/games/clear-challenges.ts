// A course is only shipped once it has been ridden clean through the game itself, both ways it is played.
//
// On the screen the pony sees its own stride and chooses its own leap, so the question is whether one
// tap a fence at the right moment carries every fence: `steady` is that rider. With the keys the child
// chooses the stride and holds space for the gather, so `ridePlan` searches the hoof falls for a way (a
// stride at each fall, or a leap with a hold the child had the grass to make), and `skilful` rides it.
import { configurationKey } from "../../engine/motion/configuration";
import { emptyPad, type Pad } from "../../engine/motion/pad";
import {
    BEAT,
    canter,
    carries,
    clearCourse,
    clearGame,
    CLEAR_LEVELS,
    GATHER,
    LEAST,
    landingOf,
    leapOf,
    nextFence,
    RATE,
    REACH,
    refusalAt,
    startClear,
    type ClearCourse,
    type ClearState,
} from "./clear";

/** How far through the stride before the take-off print a steady rider taps, from nought to one. */
const TAP_AT = 0.4;

/**
 * The pad a steady rider presses this step: Jump down for one step, a little way into the stride
 * before each ringed print, and up otherwise, so each fence gets exactly one tap.
 */
export function steady(s: ClearState): Pad {
    const pad = emptyPad();
    const a = s.approach;
    if (s.hand || s.asked || s.flight || s.turn || s.done || !a || !nextFence(s)) return pad;
    const through = (s.pony.x - s.fall) / Math.max(1e-6, s.stride);
    pad.go = s.fall + s.want >= a.at - 1e-6 && through >= TAP_AT;
    return pad;
}

/** The holds a skilful rider makes, in steps of space held: a third, a half, two thirds, five sixths and all. */
export const HOLDS = [18, 27, 36, 45, 54] as const;
/** Squares of room a plan leaves over every pole and past the water, so it never hangs on a hair. */
const SPARE = 0.05;
/** Steps of holding that gather the pony fully. */
const FULL = GATHER * RATE;
const gatherOf = (hold: number): number => Math.max(LEAST, hold / FULL);

/**
 * One hoof fall of a ride: where it falls and the stride to choose before the next. A fall the pony
 * leaps from has the steps Jump was held for, and the stride to choose in the air for the landing.
 */
export interface Fall {
    at: number;
    want: number;
    hold?: number;
    after?: number;
}

interface Node {
    fence: number;
    at: number;
    stride: number;
    /** Strides on the grass since the last landing, which is how long Jump may have been held. */
    grass: number;
}

/** Rides already found, by course, since a course is asked about again for every seed that lays it out. */
const PLANS = new Map<string, readonly Fall[] | null>();

/**
 * A ride through the course, fall by fall, or null when there is none. From each fall the pony either
 * leaps with a hold it had the grass to make, carrying the fence clean and coming down short of the
 * next, or canters on at any of the course's strides, so long as the next fall is short of where it
 * would stop. The search is breadth first, so the ride found has the fewest hoof falls.
 */
export function ridePlan(course: ClearCourse): readonly Fall[] | null {
    const known = configurationKey(course);
    if (!PLANS.has(known)) PLANS.set(known, search(course));
    return PLANS.get(known) ?? null;
}

function search(course: ClearCourse): Fall[] | null {
    const key = (n: Node) =>
        `${n.fence}:${Math.round(n.at * 1000)}:${n.stride}:${Math.min(n.grass, 3)}`;
    const first: Node = { fence: 0, at: course.start, stride: course.stride, grass: 0 };
    const from = new Map<string, { previous: string; fall: Fall }>();
    const seen = new Set([key(first)]);
    const queue = [first];
    let end: string | null = null;
    const go = (here: Node, next: Node, fall: Fall) => {
        const k = key(next);
        if (seen.has(k)) return;
        seen.add(k);
        from.set(k, { previous: key(here), fall });
        queue.push(next);
    };
    while (queue.length && end === null) {
        const here = queue.shift();
        if (!here) break;
        const f = course.fences[here.fence];
        if (!f) {
            if (here.at >= course.finish) end = key(here);
            else
                go(
                    here,
                    { ...here, at: here.at + here.stride, grass: here.grass + 1 },
                    { at: here.at, want: here.stride },
                );
            continue;
        }
        const stop = refusalAt(f);
        if (here.at + REACH < stop) {
            const after = course.fences[here.fence + 1];
            for (const hold of HOLDS) {
                // the hold ends in the stride before the leap, so it had the strides on the grass to build in
                if (hold / RATE > here.grass * BEAT - 0.08) continue;
                const leap = leapOf(here.at, here.stride, gatherOf(hold));
                if (!carries(f, leap, SPARE)) continue;
                const down = landingOf(leap).x;
                if (after && down + REACH >= refusalAt(after)) continue;
                for (const want of course.strides)
                    go(
                        here,
                        { fence: here.fence + 1, at: down, stride: want, grass: 0 },
                        { at: here.at, want: here.stride, hold, after: want },
                    );
            }
        }
        for (const want of course.strides) {
            const at = here.at + here.stride;
            if (at + REACH >= stop) continue;
            go(
                here,
                { fence: here.fence, at, stride: want, grass: here.grass + 1 },
                { at: here.at, want },
            );
        }
    }
    if (end === null) return null;
    const falls: Fall[] = [];
    for (let k: string | undefined = end; k !== undefined;) {
        const step = from.get(k);
        if (!step) break;
        falls.unshift(step.fall);
        k = step.previous;
    }
    return falls;
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/**
 * The pad a skilful rider presses this step to ride `plan` with the keys: left or right before each
 * fall to choose its stride, and space held for each leap's steps so it comes up in the stride before.
 */
export function skilful(s: ClearState, plan: readonly Fall[]): Pad {
    const pad = emptyPad();
    const leapt = s.flight
        ? plan.find((f) => f.hold !== undefined && near(f.at, s.flight?.from ?? NaN))
        : undefined;
    const here = s.flight ? undefined : plan.find((f) => near(f.at, s.fall));
    const want = leapt ? leapt.after : here?.hold === undefined ? here?.want : undefined;
    if (want !== undefined && want !== s.want) pad.pressed.push(want < s.want ? "left" : "right");
    if (s.flight || s.turn) return pad;
    const leap = plan.find((f) => f.hold !== undefined && f.at > s.fall + 1e-6);
    if (leap?.hold === undefined) return pad;
    if (s.hand) {
        pad.go = pad.keys = s.power < leap.hold / FULL - 1e-9;
        return pad;
    }
    if (s.asked) return pad;
    pad.go = pad.keys = stepsTo(s, plan, leap.at) <= leap.hold + 2;
    return pad;
}

/** Steps until the pony's hooves fall at `at`, cantering on as the plan chooses its strides. */
function stepsTo(s: ClearState, plan: readonly Fall[], at: number): number {
    const pony = { ...s.pony };
    let fall = s.fall,
        stride = s.stride,
        want = s.want;
    for (let n = 1; n < 60 * 20; n++) {
        canter(pony, stride);
        while (pony.x >= fall + stride - 1e-9) {
            if (near(fall + stride, at)) return n;
            fall += stride;
            stride = want;
            want = plan.find((f) => near(f.at, fall))?.want ?? want;
        }
    }
    return Infinity;
}

/** Rounds already ridden, by course. */
const RIDDEN = new Map<string, boolean>();

/** Whether a rider rides the course clean, with no knock and no stop. */
function clean(course: ClearCourse, rider: (s: ClearState) => Pad): boolean {
    const s = startClear(course);
    for (let i = 0; i < 60 * 120 && !s.done; i++) clearGame.step(s, rider(s));
    return s.done && s.faults === 0 && s.stops === 0;
}

/** Whether both riders ride the course clean, a steady tapper and the keys to a plan, which every shipped course must be. */
export function rideable(course: ClearCourse): boolean {
    const known = configurationKey(course);
    let ok = RIDDEN.get(known);
    if (ok === undefined) {
        const plan = ridePlan(course);
        ok = clean(course, steady) && plan !== null && clean(course, (s) => skilful(s, plan));
        RIDDEN.set(known, ok);
    }
    return ok;
}

export interface ClearConfiguration {
    phase: number;
    variant: number;
    course: ClearCourse;
}

export function clearChallenge(seed: number, phase: number): ClearConfiguration {
    if (!Number.isInteger(phase) || phase < 0 || phase >= CLEAR_LEVELS.length)
        throw new Error("Unknown clear phase");
    const variant = (seed >>> 0) % 3;
    const course = clearCourse(phase, variant);
    if (!rideable(course)) throw new Error("That course cannot be ridden clean");
    return { phase, variant, course };
}

export function isClearConfiguration(value: unknown, phase?: number): value is ClearConfiguration {
    if (
        !value ||
        typeof value !== "object" ||
        !("phase" in value) ||
        !("variant" in value) ||
        typeof value.phase !== "number" ||
        typeof value.variant !== "number" ||
        !Number.isInteger(value.phase) ||
        value.phase < 0 ||
        value.phase >= CLEAR_LEVELS.length ||
        !Number.isInteger(value.variant) ||
        value.variant < 0 ||
        value.variant > 2 ||
        (phase !== undefined && value.phase !== phase)
    )
        return false;
    return configurationKey(value) === configurationKey(clearChallenge(value.variant, value.phase));
}

export function openClearConfiguration(value: ClearConfiguration): ClearState {
    if (!isClearConfiguration(value)) throw new Error("Unverified clear round course");
    return startClear(value.course, value.phase);
}
