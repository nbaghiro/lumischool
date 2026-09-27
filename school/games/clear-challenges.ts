// A course is only shipped once a ride through it has been found.
//
// The hoof falls are whole squares apart and a leap is the arc the game steps, sampled the same way,
// so the search for a clear round is arithmetic over hoof falls: at each fall the pony canters on at a
// stride the child may choose, or leaps with a gather the child had time to hold. `ridePlan` finds a
// way, fence by fence, and the tests ride that plan through the game itself, so the arithmetic and
// the bodies have to agree.
import { configurationKey } from "../../engine/motion/configuration";
import {
    BEAT,
    carries,
    clearCourse,
    CLEAR_LEVELS,
    GATHER,
    landingOf,
    leapOf,
    RATE,
    REACH,
    refusalAt,
    startClear,
    type ClearCourse,
    type ClearState,
} from "./clear";

/** The gathers a plan holds for, in steps of holding: a third, a half, two thirds, five sixths and all. */
export const HOLDS = [18, 27, 36, 45, 54] as const;
/** Squares of room a plan leaves over every pole and past the water, so it never hangs on a hair. */
const SPARE = 0.05;
/** Steps of holding that gather the pony fully. */
const FULL = GATHER * RATE;

/**
 * One hoof fall of a ride: where it falls and the stride to choose before the next. A fall the pony
 * leaps from has the steps the gather was held for, and the stride to choose in the air for the
 * landing.
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
    /** Strides on the grass since the last landing, which is how long a gather may have been held. */
    grass: number;
}

/**
 * A ride through the course, fall by fall, or null when there is none. From each fall the pony either
 * leaps with a gather it had the grass to hold, carrying the fence clean and coming down short of the
 * next, or canters on at any stride, so long as the next fall is short of where it would stop. The
 * search is breadth first, so the ride found is one with the fewest hoof falls.
 */
export function ridePlan(course: ClearCourse): Fall[] | null {
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
                const leap = leapOf(here.at, here.stride, hold / FULL);
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

/** Whether a course can be ridden clean at all, which every shipped course must be. */
export const rideable = (course: ClearCourse): boolean => ridePlan(course) !== null;

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
