// The input log beside the move log: how each move was chosen, and the gestures that chose nothing,
// which the moves cannot show (a piece dropped short and sent home is a near miss). Replaying the
// gestures with the same clock rebuilds the frames, because every animation is a function of the
// time it started.

export type How = "drag" | "flick" | "tap" | "key";

export interface TraceEvent {
    /** Seconds since the round began. */
    t: number;
    how: How;
    /** An index into the moves the mechanic listed, or null when the gesture chose nothing. */
    move: number | null;
    piece?: string;
    to?: string;
    landing?: "on" | "near" | "flick" | "miss";
    undo?: boolean;
}

export interface Trace {
    events: TraceEvent[];
}

export const trace = (): Trace => ({ events: [] });

export function note(tr: Trace, e: TraceEvent): void {
    tr.events.push(e);
}

/** Exactly what `?replay=` on the games page takes. */
export const moves = (tr: Trace): number[] =>
    tr.events.flatMap((e) => (e.move !== null && !e.undo ? [e.move] : []));

interface TraceSummary {
    moves: number;
    byHand: number;
    byKey: number;
    flicks: number;
    /** Releases that chose nothing at all. */
    misses: number;
    /** Releases that landed by the reach rather than on the target. */
    nearMisses: number;
    undos: number;
}

export function summarise(tr: Trace): TraceSummary {
    const s: TraceSummary = {
        moves: 0,
        byHand: 0,
        byKey: 0,
        flicks: 0,
        misses: 0,
        nearMisses: 0,
        undos: 0,
    };
    for (const e of tr.events) {
        if (e.undo) {
            s.undos++;
            continue;
        }
        if (e.move === null) {
            if (e.how !== "key") s.misses++;
            continue;
        }
        s.moves++;
        if (e.how === "key") s.byKey++;
        else s.byHand++;
        if (e.how === "flick") s.flicks++;
        if (e.landing === "near") s.nearMisses++;
    }
    return s;
}

/** One line for a grown-up, in the register of the move log's. */
export function line(s: TraceSummary): string {
    const hand = s.byHand ? `${s.byHand} by hand` : "";
    const key = s.byKey ? `${s.byKey} by key` : "";
    const how = [hand, key].filter(Boolean).join(" and ") || "none";
    const misses = s.misses ? `, ${s.misses} drop${s.misses === 1 ? "" : "s"} that went home` : "";
    const near = s.nearMisses ? `, ${s.nearMisses} that only just landed` : "";
    const flicks = s.flicks ? `, ${s.flicks} flicked` : "";
    return `Moves: ${how}${flicks}${near}${misses}.`;
}
