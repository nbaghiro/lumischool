// What an activity records, and what a parent is shown from it.
//
// One attempt is one record: the moves in order, the gap in seconds before each one, and how it
// ended. The positions themselves are not stored, because the move log and a pure `apply` rebuild
// every one of them, which keeps the record small and keeps a replay honest.
//
// The distance to a win comes from the prover and is the one thing an activity can say that a
// question cannot: a child who gave up two moves from the end and a child who never got past the
// first move look the same on a worksheet.
//
// A move and an outcome are the `round-played` event's own fields, so they are declared once in
// engine/answer.ts and read from there.
import type { LoggedMove, Outcome } from "../../engine/answer";
import type { Round } from "./games";

/** The most moves one attempt records, so a child idly tapping cannot fill a disk. */
export const MOVE_CAP = 120;

/** The prover's distance as a record keeps it: Infinity does not survive JSON, so no win is null. */
export const far = (dist: number): number | null => (Number.isFinite(dist) ? dist : null);

const near = (dist: number | null): number => dist ?? Infinity;

export interface Attempt {
    activity: string;
    kind: string;
    version: number;
    values: string;
    /** Milliseconds since the epoch, and the only clock time in the record. */
    started: number;
    /** How far from a win the starting position was, with no win left as null. */
    from: number | null;
    moves: LoggedMove[];
    outcome: Outcome;
    /** True when the move cap was reached and moves stopped being recorded. */
    capped: boolean;
}

export const begin = (r: Round, from: number, now = Date.now()): Attempt => ({
    activity: r.id,
    kind: r.kind,
    version: r.version,
    values: r.values,
    started: now,
    from: far(from),
    moves: [],
    outcome: "playing",
    capped: false,
});

/** Adds one move. Returns the attempt, changed in place, since it is a log rather than a value. */
export function record(a: Attempt, m: Omit<LoggedMove, "at" | "gap">, now = Date.now()): Attempt {
    if (a.moves.length >= MOVE_CAP) {
        a.capped = true;
        return a;
    }
    const at = (now - a.started) / 1000;
    const gap = at - (a.moves.at(-1)?.at ?? 0);
    a.moves.push({ ...m, at: Math.round(at * 10) / 10, gap: Math.round(gap * 10) / 10 });
    return a;
}

export interface Evidence {
    outcome: Outcome;
    moves: number;
    /** Of those, how many took a move back. Undoing is usually the best sign in the record. */
    undos: number;
    seconds: number;
    /** How long the first move took: the thinking before anything was tried. */
    firstMove: number;
    /** The closest to a win they ever got, in moves. */
    closest: number;
    /** How far from a win they were when they stopped. */
    ended: number;
    /**
     * Whether the moves worked towards a win or wandered. This is what separates a child who is
     * working from a child who is poking, and it is the reason the distance is logged per move.
     */
    direction: "no moves" | "closer" | "wandered" | "level";
}

export function summarise(a: Attempt): Evidence {
    const moves = a.moves.length;
    const last = a.moves.at(-1);
    let closer = 0,
        further = 0,
        closest = near(a.from);
    let prev = near(a.from);
    for (const m of a.moves) {
        const dist = near(m.dist);
        if (dist < prev) closer++;
        else if (dist > prev) further++;
        if (dist < closest) closest = dist;
        prev = dist;
    }
    return {
        outcome: a.outcome,
        moves,
        undos: a.moves.filter((m) => m.undo).length,
        seconds: last ? last.at : 0,
        firstMove: a.moves[0]?.gap ?? 0,
        closest,
        ended: last ? near(last.dist) : near(a.from),
        direction: !moves
            ? "no moves"
            : closer > further
              ? "closer"
              : further > closer
                ? "wandered"
                : "level",
    };
}

/** One line a parent reads, which is all the week view has room for. */
export function line(e: Evidence): string {
    const mins =
        e.seconds >= 60 ? `${Math.round(e.seconds / 60)} min` : `${Math.round(e.seconds)}s`;
    const took = `${e.moves} move${e.moves === 1 ? "" : "s"} in ${mins}`;
    if (e.outcome === "won") {
        return `Won in ${took}${e.undos ? `, taking ${e.undos} back on the way` : ""}.`;
    }
    if (e.outcome === "playing") return `Still playing: ${took}.`;
    const how =
        e.ended === Infinity
            ? "with no win left on the board"
            : `${e.ended} move${e.ended === 1 ? "" : "s"} from the end`;
    const why =
        e.direction === "closer"
            ? "getting closer"
            : e.direction === "wandered"
              ? "not getting closer"
              : "holding level";
    return `Stopped ${how} after ${took}, ${why}.`;
}
