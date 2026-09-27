// What a game counts, apart from what it sounds and looks like. A step says what happened as typed
// events (a gate passed, a seed eaten, a checkpoint reached), and a level's goal is built from them:
// an event seen so many times, all of several goals, any one of them, or goals met in order. A track
// is plain data, so it is kept in a game's state, copied with it and replayed with it. See
// .docs/game-engine.md.
import type { Happening } from "./scene";

/** Something that happened in a game that a goal, a checkpoint or a replay can count. */
export interface GameEvent {
    kind: string;
    /** Which one, where it matters: the number on a gate, the kind of fish. */
    value?: number | string;
}

export type Goal =
    | { on: string; value?: number | string; times?: number }
    | { all: Goal[] }
    | { any: Goal[] }
    | { inOrder: Goal[] };

/** A goal with how far along it is. */
export type Track =
    | { on: string; value?: number | string; times: number; seen: number }
    | { all: Track[] }
    | { any: Track[] }
    | { inOrder: Track[]; at: number };

export interface Progress {
    done: boolean;
    completed: number;
    total: number;
}

export function track(goal: Goal): Track {
    if ("on" in goal)
        return {
            on: goal.on,
            ...(goal.value === undefined ? {} : { value: goal.value }),
            times: Math.max(1, goal.times ?? 1),
            seen: 0,
        };
    if ("all" in goal) return { all: goal.all.map(track) };
    if ("any" in goal) return { any: goal.any.map(track) };
    return { inOrder: goal.inOrder.map(track), at: 0 };
}

export function done(t: Track): boolean {
    if ("on" in t) return t.seen >= t.times;
    if ("all" in t) return t.all.every(done);
    if ("any" in t) return t.any.some(done);
    return t.at >= t.inOrder.length;
}

/**
 * Counts an event into a track, and says whether it moved. An event advances an in-order goal by
 * one part at most, so a single gate cannot pass two gates at once.
 */
export function feed(t: Track, e: GameEvent): boolean {
    if (done(t)) return false;
    if ("on" in t) {
        if (t.on !== e.kind || (t.value !== undefined && t.value !== e.value)) return false;
        t.seen++;
        return true;
    }
    if ("all" in t) return t.all.map((p) => feed(p, e)).some(Boolean);
    if ("any" in t) return t.any.map((p) => feed(p, e)).some(Boolean);
    const part = t.inOrder[t.at];
    if (!part || !feed(part, e)) return false;
    if (done(part)) t.at++;
    return true;
}

/** How much of a goal is met, in the units a progress bar counts: one for each event it needs. */
export function progress(t: Track): Progress {
    if ("on" in t) return { done: done(t), completed: Math.min(t.seen, t.times), total: t.times };
    if ("all" in t || "inOrder" in t) {
        const parts = ("all" in t ? t.all : t.inOrder).map(progress);
        return {
            done: done(t),
            completed: parts.reduce((n, p) => n + p.completed, 0),
            total: parts.reduce((n, p) => n + p.total, 0),
        };
    }
    // any: the part nearest to done stands for the whole
    const best = t.any
        .map(progress)
        .reduce<Progress | null>(
            (a, p) => (!a || p.completed / p.total > a.completed / a.total ? p : a),
            null,
        );
    return { done: done(t), completed: best?.completed ?? 0, total: best?.total ?? 1 };
}

/** The events among a step's happenings, in order. */
export const eventsOf = (hs: readonly Happening[]): GameEvent[] =>
    hs.flatMap((h) => ("event" in h ? [h.event] : []));
