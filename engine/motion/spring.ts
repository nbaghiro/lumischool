// Damped springs in closed form. A spring is a pure function of the time since it started, so a frame
// is the same on every machine, a test asks for the value at a time without a clock, and the position
// at the end is the same whether the spring ran or not (.docs/engine.md).

export interface Spring {
    /** Natural frequency in hertz. */
    hz: number;
    /** Damping ratio: 1 arrives without overshooting, under 1 overshoots and rings down. */
    zeta: number;
}

interface Motion {
    x: number;
    v: number;
}

export const SPRINGS = {
    snap: { hz: 4.5, zeta: 1 },
    back: { hz: 3, zeta: 1 },
    /** Overshoots once and rings down, which is what a child watches a beam do. */
    swing: { hz: 1.5, zeta: 0.32 },
    pour: { hz: 2, zeta: 1 },
    /** Slower than a snap, so the trail a car leaves can be followed. */
    drive: { hz: 2.4, zeta: 1 },
} as const satisfies Record<string, Spring>;

/** `t` is in seconds. The three cases are the damped oscillator's closed forms; nothing is integrated. */
export function springAt(s: Spring, from: number, to: number, v0: number, t: number): Motion {
    if (t <= 0) return { x: from, v: v0 };
    const w0 = 2 * Math.PI * s.hz,
        z = s.zeta,
        x0 = from - to;
    if (z < 1) {
        const wd = w0 * Math.sqrt(1 - z * z);
        const a = x0,
            b = (v0 + z * w0 * x0) / wd;
        const e = Math.exp(-z * w0 * t),
            c = Math.cos(wd * t),
            sn = Math.sin(wd * t);
        const x = e * (a * c + b * sn);
        const v = e * (-z * w0 * (a * c + b * sn) + (-a * wd * sn + b * wd * c));
        return { x: to + x, v };
    }
    if (z === 1) {
        const e = Math.exp(-w0 * t),
            c = v0 + w0 * x0;
        return { x: to + e * (x0 + c * t), v: e * (c - w0 * (x0 + c * t)) };
    }
    const q = w0 * Math.sqrt(z * z - 1),
        r1 = -z * w0 + q,
        r2 = -z * w0 - q;
    const c1 = (v0 - r2 * x0) / (r1 - r2),
        c2 = x0 - c1;
    const e1 = Math.exp(r1 * t),
        e2 = Math.exp(r2 * t);
    return { x: to + c1 * e1 + c2 * e2, v: c1 * r1 * e1 + c2 * r2 * e2 };
}

export const settled = (m: Motion, to: number, dx = 0.003, dv = 0.02): boolean =>
    Math.abs(m.x - to) < dx && Math.abs(m.v) < dv;

/** An upper bound from the decay envelope, at most 4 s. A frame loop stops on it, so it errs long. */
export function settleTime(s: Spring, from: number, to: number, v0: number, eps = 0.003): number {
    const w0 = 2 * Math.PI * s.hz,
        z = s.zeta,
        x0 = from - to;
    const amp = Math.abs(x0) + Math.abs(v0) / w0;
    if (amp < eps) return 0;
    if (z <= 1) return Math.min(4, Math.log(amp / eps) / (z * w0) + 2 / w0);
    // Overdamped, the slow root sets the pace: both terms are bounded by their sizes at its rate.
    const q = w0 * Math.sqrt(z * z - 1),
        r1 = -z * w0 + q,
        r2 = -z * w0 - q;
    const c1 = (v0 - r2 * x0) / (r1 - r2),
        c2 = x0 - c1;
    return Math.min(4, Math.max(0, Math.log((Math.abs(c1) + Math.abs(c2)) / eps) / -r1));
}
