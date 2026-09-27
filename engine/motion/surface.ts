// Where water's surface stands at a place and a moment: two waves of different lengths travelling
// against each other, carried along by a river's flow, and rings running out from where something
// broke it. The game view's water shader in engine/ui/gl.ts draws this same sum, so a game that floats
// a boat on `surfaceAt` sees it ride the waves it is drawn on. Squares and seconds, y down.
import type { Water } from "./scene";

/** How high waves reach, in squares, when a water does not say. */
export const WAVES = 0.12;
/** The long wave's length in squares; the short one is `SHORT` of it. These must match WATER_FRAGMENT in gl.ts. */
export const LONG = 5.3;
export const SHORT = 0.53;
/**
 * A ripple's ring runs out at `speed` squares a second for `life` seconds, rising `rise` squares at
 * its largest; the view draws at most `most` of a water's ripples, the newest.
 */
export const RIPPLE = { speed: 3, life: 2.2, rise: 0.3, most: 8 };

const TAU = Math.PI * 2;

/** Where the surface is at `x` and time `t`, in squares down from the top of the world. */
export function surfaceAt(w: Water, x: number, t: number): number {
    const a = w.waves ?? WAVES,
        u = x - (w.flow ?? 0) * t;
    let y =
        w.level +
        a *
            (0.6 * Math.sin((TAU * u) / LONG + 1.7 * t) +
                0.4 * Math.sin((TAU * u) / (LONG * SHORT) - 2.3 * t));
    for (const r of ripplesOf(w)) y += rippleAt(r, x);
    return y;
}

/** The ripples a water shows, the newest `RIPPLE.most` of those still running. */
export function ripplesOf(w: Water): { x: number; age: number; size: number }[] {
    return (w.ripples ?? [])
        .filter((r) => r.age >= 0 && r.age < RIPPLE.life)
        .sort((a, b) => a.age - b.age)
        .slice(0, RIPPLE.most)
        .map((r) => ({ x: r.x, age: r.age, size: r.size ?? 1 }));
}

/** How far one ripple lifts the surface at `x`: nothing ahead of its ring, and a fading swell behind it. */
export function rippleAt(r: { x: number; age: number; size: number }, x: number): number {
    const front = r.age * RIPPLE.speed,
        behind = front - Math.abs(x - r.x);
    if (behind < 0 || r.age >= RIPPLE.life) return 0;
    const fade = (1 - r.age / RIPPLE.life) ** 2;
    return -RIPPLE.rise * r.size * fade * Math.sin((behind * TAU) / 1.4) * Math.exp(-behind * 0.9);
}
