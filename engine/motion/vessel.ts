// A vessel that pours when it is tilted: water reaches the lip sooner the fuller it is, and runs
// faster the further past that it is tipped, so a gentle tilt dribbles and a steep one gushes. What
// leaves one vessel goes into another only as far as it has room, and the rest is spilt. Radians of
// tilt from level, amounts in the vessel's own units, seconds.

export interface Pouring {
    /** The tilt at which a full vessel starts to pour, and an almost empty one. */
    full: number;
    empty: number;
    /** How far past the lip the pour reaches its fastest, in radians. */
    span: number;
    /** The fastest pour, as a share of what the vessel holds each second. */
    most: number;
}

/** The tilt at which water reaches the lip, for a vessel holding `level` of `max`. */
export const lipAngle = (level: number, max: number, p: Pouring): number =>
    p.full + (p.empty - p.full) * (1 - Math.max(0, Math.min(1, max > 0 ? level / max : 0)));

/** How fast a vessel tilted by `tilt` pours, in its units a second: nothing short of the lip. */
export function pourRate(tilt: number, level: number, max: number, p: Pouring): number {
    if (level <= 0) return 0;
    const past = tilt - lipAngle(level, max, p);
    if (past <= 0) return 0;
    return p.most * max * Math.min(1, past / p.span);
}

/**
 * Moves `amount` from a vessel holding `give` into one with `room` to spare: as much as there is and
 * as much as fits, and what does not fit is spilt.
 */
export function transfer(
    give: number,
    room: number,
    amount: number,
): { moved: number; spilt: number } {
    const out = Math.max(0, Math.min(give, amount));
    const moved = Math.min(out, Math.max(0, room));
    return { moved, spilt: out - moved };
}
