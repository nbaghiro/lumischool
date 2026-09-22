// A thing in flight under gravity, in closed form, with y growing downwards as it does on the page.
// The slingshot's aim, the rocket's drift and the crane's drop all draw these dots, and each game's
// own physics steps the same arc, which the games' tests hold them to.
import type { Pt } from "./geometry";

export function flightAt(from: Pt, v: Pt, g: number, t: number): Pt {
    return { x: from.x + v.x * t, y: from.y + v.y * t + 0.5 * g * t * t };
}

/** The first time the path comes down through `floor`, or null when it never reaches it. */
export function landing(
    from: Pt,
    v: Pt,
    g: number,
    floor: number,
): { t: number; at: Pt; v: Pt } | null {
    const dy = floor - from.y;
    let t: number;
    if (Math.abs(g) < 1e-9) {
        if (v.y <= 0 || dy < 0) return null;
        t = dy / v.y;
    } else {
        const disc = v.y * v.y + 2 * g * dy;
        if (disc < 0) return null;
        t = (-v.y + Math.sqrt(disc)) / g;
        if (t < 0) return null;
    }
    return { t, at: flightAt(from, v, g, t), v: { x: v.x, y: v.y + g * t } };
}

/**
 * Dots along the path, one every `every` seconds for `seconds`, stopping at the first dot `until`
 * says is past where the thing would meet something (the ground, a plank). `every` must be more than
 * 0 and `seconds` finite, or there would be no end to the dots.
 */
export function arc(
    from: Pt,
    v: Pt,
    g: number,
    o: { seconds: number; every?: number; until?: (p: Pt) => boolean },
): Pt[] {
    const every = o.every ?? 0.05;
    if (!(every > 0) || !Number.isFinite(o.seconds))
        throw new RangeError(`arc needs dots more than 0 s apart over a finite time, not ${every}`);
    const out: Pt[] = [];
    for (let t = every; t <= o.seconds + 1e-9; t += every) {
        const p = flightAt(from, v, g, t);
        if (o.until?.(p)) break;
        out.push(p);
    }
    return out;
}

/**
 * A lob from `a` to `b`: the throw whose top is `rise` squares above the higher of the two, and how
 * long it takes to come down on `b`. Across, it goes at one speed the whole way.
 */
export function lob(a: Pt, b: Pt, g: number, rise: number): { v: Pt; t: number } {
    const top = Math.min(a.y, b.y) - Math.max(0, rise);
    const t = Math.sqrt((2 * (a.y - top)) / g) + Math.sqrt((2 * (b.y - top)) / g);
    if (t < 1e-9) return { v: { x: 0, y: 0 }, t: 0 };
    return { v: { x: (b.x - a.x) / t, y: (b.y - a.y - 0.5 * g * t * t) / t }, t };
}

/** How a pull becomes a throw: at most `most` squares of pull, which gives `speed` squares a second. */
interface Throw {
    most: number;
    speed: number;
}

/** A pull clamped to the reach of the band. */
export function withinReach(pull: Pt, most: number): Pt {
    const d = Math.hypot(pull.x, pull.y);
    return d <= most ? pull : { x: (pull.x / d) * most, y: (pull.y / d) * most };
}

/** Straight back through where it was pulled from, faster the further it was pulled. */
export function throwOf(pull: Pt, t: Throw): Pt {
    const d = Math.hypot(pull.x, pull.y);
    if (d < 1e-9) return { x: 0, y: 0 };
    const k = (Math.min(d, t.most) / t.most) * t.speed;
    return { x: (-pull.x / d) * k, y: (-pull.y / d) * k };
}

/** Whole degrees above the ground that a pull throws at. */
export const degreesOf = (pull: Pt): number =>
    Math.round((Math.atan2(pull.y, -pull.x) * 180) / Math.PI);
