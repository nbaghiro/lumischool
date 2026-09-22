// What a child's work has made happen on the map, worked out from the record every time it is drawn.
//
// Nothing here is stored. Every mark the journal and the map make because of work done (a road inked,
// a landmark lit, a stamp in a world, a creature walking behind the guide, a world's moment) is a
// function of the lessons finished and the day each was finished on, which is what the record
// already holds for the parent's week. So none of it can drift from the work, none of it can be
// bought or lost, and a grown-up looking at the same map sees the same marks with the lesson and the
// day that made each one. The refusals this keeps are in .docs/story.md: no streaks, no counts to
// fill, nothing timed, nothing chosen for the child by an algorithm, nothing that is taken back.
import { at } from "../../engine/space";
import type { Progress } from "../record/record";
import { pathOrder, type Year } from "../year";
import { standingAt, termOf } from "./roll";
import type { Reach, World } from "./types";
import { hostedLessons, type Side } from "./worlds";

/**
 * What a family's plan says about tracks: each `track` op of `plan-changed`, in the order it was
 * written, with the day it was written on (school/record/record.ts reads them off the log). A plan that has
 * never named a track has every track on, which is also what the sample child has.
 */
export type TrackPlan = { track: string; on: boolean; day: string }[];

/**
 * The tracks a plan has on at the end of a day, or on the latest day when none is given, or null for
 * every track. Before its first change the plan reads as it was first written, so a lesson finished
 * the day before the family set it up still counts.
 */
export function tracksOn(plan: TrackPlan, day?: string): Set<string> | null {
    const first = plan[0]?.day;
    if (first === undefined) return null;
    const on = new Map<string, boolean>();
    for (const c of plan)
        if (day === undefined || c.day <= day || c.day === first) on.set(c.track, c.on);
    return new Set([...on].filter(([, v]) => v).map(([t]) => t));
}

/** One year of a child's record, the worlds its terms are in, and what the plan says about tracks. */
export interface YearRecord {
    grade: number;
    year: Year;
    progress: Progress;
    worlds: string[];
    tracks?: TrackPlan;
    /**
     * The lessons the child is on in this year, as the plan's days have them (`nowIn` in
     * school/family/family.ts): today's, or the next planned day's. Only the child's own year has any.
     */
    now?: readonly string[];
}

/**
 * The lessons a child is on in a year, in the order the year meets them, as the plan's days have them.
 * Without those, the record's own next lesson says where the child is, which is on the maths path, and
 * this is undefined; but a plan with maths off has no maths path to be on, so there it is the first
 * lesson still to do in the tracks the plan has on. A year nobody stands in has none.
 */
export function nowOf(
    year: Year,
    progress: Progress,
    plan: TrackPlan = [],
    now?: readonly string[],
): string[] | undefined {
    const order = pathOrder(year);
    if (now) return order.filter((l) => now.includes(l.id)).map((l) => l.id);
    const on = tracksOn(plan);
    if (!progress.current || !on || on.has("maths")) return undefined;
    const first = order.find((l) => on.has(l.subject ?? "maths") && !progress.done[l.id]);
    return first ? [first.id] : [];
}

/** The first of a world's reaches that a lesson's topics hit, read the way the journal reads them. */
export function reachOf(w: Pick<World, "reaches">, topics: string[]): Reach | null {
    return (
        w.reaches.find((r) =>
            r.when.some((want) =>
                want.startsWith("skill:")
                    ? topics.some((t) => t === want || t.startsWith(`${want}.`))
                    : topics.includes(want),
            ),
        ) ?? null
    );
}

/** A world of the run, and what the record says has happened in it. */
export interface Place {
    grade: number;
    term: number;
    world: string;
    /**
     * The lessons the world's moment waits for: the term's lessons in the tracks the family's plan has
     * on. Once the moment has happened, the ones it waited for, so turning a track on later never takes
     * it away.
     */
    lessons: string[];
    /** Those finished, in the order they were finished. */
    done: string[];
    /** Finished, where the child is now, begun and left for later, or not reached. */
    state: "done" | "here" | "begun" | "ahead";
    /** The day of the first lesson finished here, in any track: the world's stamp. */
    stamp: string | null;
    /** The day the last of `lessons` was finished, which is the day the world's moment happened. */
    moment: string | null;
    /** The landmarks lit by a finished lesson they belong beside, with the lesson and the day. */
    lit: { art: string; lesson: string; on: string }[];
    /** The creatures that walk behind the guide since the lesson they belong beside was finished. */
    followers: { art: string; lesson: string; on: string }[];
}

/** A way between two places of the run. It is inked on the day the child first finished a lesson beyond it. */
export interface Road {
    from: number;
    to: number;
    open: string | null;
}

export interface Journey {
    places: Place[];
    roads: Road[];
    here: number;
    /**
     * The places off the run a track’s lessons bring a child to, in the order they were asked for, each
     * one world in one year (`grade`) holding that year's lessons. Each is stamped by the first of those
     * finished and is never where the child is: a place follows the lessons and leads none of them.
     */
    sides: Place[];
}

/** A lesson a world holds, and the track it is in. */
interface Held {
    id: string;
    subject: string;
}

/**
 * What the record says has happened in one world: the lessons its moment waits for, which of them are
 * finished, its stamp, the landmarks lit, the creatures brought and the day of its moment. `done` and
 * `on` say whether a lesson is finished and on which day.
 */
function marksIn(
    w: World,
    held: Held[],
    done: (lesson: string) => boolean,
    on: (lesson: string) => string,
    plan: TrackPlan,
    topics: (lesson: string) => string[],
): Pick<Place, "lessons" | "done" | "stamp" | "moment" | "lit" | "followers"> {
    const ids = held.map((l) => l.id);
    const finished = ids
        .filter(done)
        .sort((a, b) => on(a).localeCompare(on(b)) || ids.indexOf(a) - ids.indexOf(b));
    const counted = (day?: string): string[] => {
        const t = tracksOn(plan, day);
        return held.filter((l) => !t || t.has(l.subject)).map((l) => l.id);
    };
    // the moment is the first day on which every lesson here in the tracks then on was finished
    let lessons = counted(),
        moment: string | null = null;
    for (const day of [...new Set([...finished.map(on), ...plan.map((c) => c.day)])].sort()) {
        const want = counted(day);
        if (!want.length || !want.every((x) => done(x) && on(x) <= day)) continue;
        lessons = want;
        moment = want.map(on).sort().at(-1) ?? day;
        break;
    }
    // a landmark lit or a creature brought by a lesson stays, whatever the plan says about its track since
    const lit: Place["lit"] = [],
        followers: Place["followers"] = [];
    for (const x of finished) {
        const reach = reachOf(w, topics(x));
        if (!reach) continue;
        const into = w.offers.creatures.includes(reach.art) ? followers : lit;
        if (!into.some((y) => y.art === reach.art))
            into.push({ art: reach.art, lesson: x, on: on(x) });
    }
    return {
        lessons,
        done: finished.filter((x) => lessons.includes(x)),
        stamp: finished[0] ? on(finished[0]) : null,
        moment,
        lit,
        followers,
    };
}

/**
 * The whole run from the records: every world of every year in order, what has happened in each,
 * and which ways between them are inked; and each place off the run named in `sides`, walked by the
 * lessons it holds in its own year. `topics` names what a lesson holds, as reaches are written.
 */
export function journey(
    records: YearRecord[],
    worldOf: (id: string) => World,
    topics: (lesson: string) => string[],
    sides: readonly Side[] = [],
    /** The child's own grade, so one with no work yet stands in their own year and not in year one's. */
    grade?: number,
): Journey {
    const places: Place[] = [];
    let here = -1;
    const sorted = [...records].sort((a, b) => a.grade - b.grade);
    for (const r of sorted) {
        const terms = Math.max(1, Math.ceil(r.year.units.length / 3));
        const done = (x: string) => !!r.progress.done[x],
            on = (x: string) => r.progress.done[x]?.on ?? "";
        // the child stands at the maths lesson they are on, or at the last aside when maths is off today
        const now = nowOf(r.year, r.progress, r.tracks, r.now);
        const at = now ? standingAt(r.year, now) : r.progress.current;
        for (let term = 1; term <= terms; term++) {
            // a term the choice names no world for is not drawn, rather than drawn as the first world again
            const id = r.worlds[term - 1];
            if (id === undefined) continue;
            const held = r.year.lessons
                .filter((l) => termOf(r.year, l.unit) === term)
                .map((l) => ({ id: l.id, subject: l.subject ?? "maths" }));
            const m = marksIn(worldOf(id), held, done, on, r.tracks ?? [], topics);
            const current = !!at && m.lessons.includes(at) && !m.moment;
            const state: Place["state"] = m.moment
                ? "done"
                : current
                  ? "here"
                  : m.stamp
                    ? "begun"
                    : "ahead";
            if (state === "here") here = places.length;
            places.push({ grade: r.grade, term, world: id, ...m, state });
        }
    }
    if (here < 0) {
        // a child between years, or at the very end: where the last finished place is. A child with
        // nothing done at all stands at the first place of their own grade, since standing at the
        // school's first world put every new child in year one's meadow.
        const last = places.map((p) => p.state !== "ahead").lastIndexOf(true);
        const own = grade === undefined ? -1 : places.findIndex((p) => p.grade === grade);
        here = last >= 0 ? last : Math.max(0, own);
    }
    const roads: Road[] = [];
    for (let i = 1; i < places.length; i++) {
        const a = at(places, i - 1),
            b = at(places, i);
        roads.push({ from: i - 1, to: i, open: b.stamp ?? a.moment ?? null });
    }
    const doneIn = (x: string) => sorted.find((r) => r.progress.done[x])?.progress.done[x];
    const offRun = sides.map((side): Place => {
        const w = worldOf(side.world),
            own = sorted.find((r) => r.grade === side.grade),
            held = hostedLessons(w, own ? [own.year] : []).map((l) => ({
                id: l.id,
                subject: l.subject ?? "maths",
            }));
        const m = marksIn(
            w,
            held,
            (x) => !!doneIn(x),
            (x) => doneIn(x)?.on ?? "",
            own?.tracks ?? sorted[0]?.tracks ?? [],
            topics,
        );
        return {
            grade: side.grade,
            term: 0,
            world: side.world,
            ...m,
            state: m.moment ? "done" : m.stamp ? "begun" : "ahead",
        };
    });
    return { places, roads, here, sides: offRun };
}
