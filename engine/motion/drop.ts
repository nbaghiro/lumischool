// A drop that bounces to rest: a thing let fall onto a floor keeps a share of its speed at each
// bounce, rises less each time and settles, in closed form. A frame is a function of the time, the
// thing is exactly on the floor once it has settled, and the moments it meets the floor are known,
// so a squash or a knock can be timed to them. Squares and seconds, with y growing downwards.

export interface Drop {
    /** Where it is let go and the floor it comes to rest on. The floor is not above the start. */
    from: number;
    to: number;
    /** Speed downwards when it is let go. */
    v0: number;
    /** Squares a second each second. */
    g: number;
    /** The share of its speed a bounce keeps, from nought to under one. */
    bounce: number;
}

/** A bounce slower than this is not drawn: the thing is at rest. */
const STILL = 0.8;
const MOST = 6;

/** When it meets the floor and how fast, first the fall and then each bounce, until it is still. */
export function impacts(d: Drop): { t: number; speed: number }[] {
    const fall = Math.max(0, d.to - d.from);
    const first = (-d.v0 + Math.sqrt(d.v0 * d.v0 + 2 * d.g * fall)) / d.g;
    let t = Number.isFinite(first) ? Math.max(0, first) : 0;
    let speed = d.v0 + d.g * t;
    const out = [{ t, speed }];
    for (let i = 0; i < MOST; i++) {
        const up = speed * d.bounce;
        if (up < STILL) break;
        t += (2 * up) / d.g;
        speed = up;
        out.push({ t, speed });
    }
    return out;
}

/** How long from being let go until it is at rest on the floor. */
export const dropTime = (d: Drop): number => impacts(d).at(-1)?.t ?? 0;

/** Where it is and how fast it is going at `t`: falling, on a bounce, or at rest on the floor. */
export function dropAt(d: Drop, t: number): { y: number; v: number } {
    if (t <= 0) return { y: d.from, v: d.v0 };
    const hits = impacts(d);
    const first = hits[0];
    if (!first || t < first.t)
        return { y: d.from + d.v0 * t + 0.5 * d.g * t * t, v: d.v0 + d.g * t };
    for (let i = 0; i < hits.length - 1; i++) {
        const hit = hits[i],
            next = hits[i + 1];
        if (!hit || !next || t >= next.t) continue;
        const u = t - hit.t,
            up = next.speed;
        return { y: d.to - up * u + 0.5 * d.g * u * u, v: -up + d.g * u };
    }
    return { y: d.to, v: 0 };
}
