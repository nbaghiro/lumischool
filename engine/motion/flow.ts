// A flow shared by two levels: what leaves one vessel arrives in the other at the same moment, so
// the two together always hold what they held before. A pour starts and stops over a short ramp
// rather than all at once, and holds a steady rate between, in closed form, so a frame is a
// function of the time and the amount moved at the end is exact.

export interface Flow {
    /** How much moves in all, in the vessels' own unit. */
    amount: number;
    /** The steady rate, in that unit a second. */
    rate: number;
    /** Seconds the flow takes to start, and to stop. */
    ramp: number;
}

/** Seconds from the first drop to the last. A small amount never reaches the steady rate. */
export const flowTime = (f: Flow): number =>
    f.amount <= 0 ? 0 : Math.max(2 * f.ramp, f.amount / f.rate + f.ramp);

/** How much has moved by `t`, and the rate it is moving at then. */
export function flowAt(f: Flow, t: number): { moved: number; rate: number } {
    const end = flowTime(f);
    if (end <= 0 || t <= 0) return { moved: 0, rate: 0 };
    if (t >= end) return { moved: f.amount, rate: 0 };
    const ramp = f.ramp,
        peak = f.amount / (end - ramp);
    if (t < ramp) return { moved: (peak * t * t) / (2 * ramp), rate: (peak * t) / ramp };
    if (t < end - ramp) return { moved: (peak * ramp) / 2 + peak * (t - ramp), rate: peak };
    const left = end - t;
    return { moved: f.amount - (peak * left * left) / (2 * ramp), rate: (peak * left) / ramp };
}

/** The two levels at `t`, the one that gives and the one that takes, and the rate between them. */
export function shared(
    f: Flow,
    giver: number,
    taker: number,
    t: number,
): { giver: number; taker: number; rate: number } {
    const { moved, rate } = flowAt(f, t);
    return { giver: giver - moved, taker: taker + moved, rate };
}
