// Rowing: a stroke and the glide between strokes. A stroke is a drive, the blades drawn back through
// the water, and how much speed it adds goes with how long the drive was and whether it came at the
// right moment. A catch while the boat is still surging from the last drive fights the water, and a
// catch long after lets the boat slow first. Between strokes the boat glides, slowed by the water and
// pushed back by any current. Metres and seconds, with speed along the river positive.

export interface Rhythm {
    /** How hard a whole drive pushes, in metres a second: nearly what it adds to a boat at rest. */
    push: number;
    /** The speed drives build towards and never pass, metres a second. */
    top: number;
    /** Seconds from the end of one drive to the next catch that are in time, as [earliest, latest]. */
    window: [number, number];
    /** The share of a drive's push a rushed catch keeps. */
    rushed: number;
}

export type Timing = "rushed" | "in time" | "late";

/** How a catch `since` seconds after the last drive ended sits in the rhythm. A first stroke is in time. */
export function timing(since: number | null, r: Rhythm): Timing {
    if (since === null) return "in time";
    if (since < r.window[0]) return "rushed";
    return since > r.window[1] ? "late" : "in time";
}

/**
 * The speed after a piece of drive `length` long, from nought to one for a whole drive, caught with
 * `t`. The drive's push is `length * push`, or `rushed` of that for a rushed catch; a late catch pushes
 * fully, on a boat that has already slowed. The push first takes away any backward speed and then eases
 * the boat towards `top`, keeping exp(-push / top) of the gap, so a boat near its top speed gains
 * little. A drive of negative length is backing water: it takes speed away one for one and moves a
 * boat backwards no faster than 0.3 of `push`. The same total drive gives the same speed however it is
 * split into pieces, so a finger's drag and a held key agree.
 */
export function drive(v: number, length: number, t: Timing, r: Rhythm): number {
    const l = Math.max(-1, Math.min(1, length));
    if (l < 0) return Math.max(Math.min(v, -0.3 * r.push), v + l * r.push);
    let push = l * (t === "rushed" ? r.rushed : 1) * r.push;
    if (v < 0) {
        if (push <= -v) return v + push;
        push += v;
        v = 0;
    }
    return v >= r.top ? v : r.top - (r.top - v) * Math.exp(-push / r.top);
}

/**
 * One glide of `dt` seconds: the water keeps exp(-water * dt) of the speed, and a current pushes the
 * boat back at `current` metres a second. Returns the speed after and how far the boat moved.
 */
export function glide(
    v: number,
    dt: number,
    water: number,
    current: number,
): { v: number; moved: number } {
    const keep = Math.exp(-water * dt);
    const through = water > 0 ? (v * (1 - keep)) / water : v * dt;
    return { v: v * keep, moved: through - current * dt };
}

/** How far a boat at speed `v` glides before it stops in still water. */
export const glideDistance = (v: number, water: number): number =>
    water > 0 ? Math.max(0, v) / water : Infinity;

/**
 * A bow meeting something it cannot pass, a jetty, at speed `v`: at `gentle` or slower it comes to
 * rest touching, and faster it bumps and comes away backwards with `bounce` of its speed.
 */
export function meet(v: number, gentle: number, bounce: number): { v: number; bumped: boolean } {
    return v <= gentle ? { v: 0, bumped: false } : { v: -v * bounce, bumped: true };
}
