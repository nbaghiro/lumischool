// Bursts of small things that fly apart and fade: dust where something lands, sparkles where
// something is won, drops where something meets the water, bubbles that rise. A burst is feedback,
// never information, so it is left out under reduced motion and nothing is lost. Each mote is plain
// data stepped on the fixed clock from a seeded generator, and the pool keeps at most so many,
// retiring the oldest, so a burst costs the same on a slow tablet as on a fast one and a replay
// throws the same motes.
import type { Pt } from "./geometry";
import { seeded } from "./spawn";

interface Mote {
    kind: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    spin: number;
    /** Seconds since it was thrown, and how many it lasts. */
    age: number;
    life: number;
    /** Squares across when thrown, and how much that grows over its life (0.5 is half as big again). */
    size: number;
    grow: number;
    fall: number;
    drag: number;
}

/** How one kind of mote flies. Speeds are squares a second and angles are radians. */
export interface Style {
    life: number;
    speed: number;
    /** How far either side of the burst's direction a mote may fly; π throws them all round. */
    spread: number;
    /** Squares a second each second, down; a bubble's is negative. */
    fall: number;
    /** The share of its speed a mote loses each second. */
    drag: number;
    spin: number;
    size: number;
    grow: number;
}

export interface Bursts {
    readonly most: number;
    motes: Mote[];
    readonly rnd: () => number;
}

export const bursts = (most: number, seed: number): Bursts => ({
    most,
    motes: [],
    rnd: seeded(seed),
});

/** Throws `n` motes of one kind from a point, round `dir` (straight up by default). */
export function burst(
    b: Bursts,
    kind: string,
    at: Pt,
    n: number,
    s: Style,
    dir = -Math.PI / 2,
): void {
    for (let i = 0; i < n; i++) {
        const r = b.rnd,
            a = dir + (r() * 2 - 1) * s.spread,
            v = s.speed * (0.55 + 0.45 * r());
        b.motes.push({
            kind,
            x: at.x,
            y: at.y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            angle: r() * Math.PI * 2,
            spin: (r() * 2 - 1) * s.spin,
            age: 0,
            life: s.life * (0.75 + 0.5 * r()),
            size: s.size * (0.75 + 0.5 * r()),
            grow: s.grow,
            fall: s.fall,
            drag: s.drag,
        });
    }
    if (b.motes.length > b.most) b.motes.splice(0, b.motes.length - b.most);
}

export function stepBursts(b: Bursts, dt: number): void {
    for (const m of b.motes) {
        const k = Math.exp(-m.drag * dt);
        m.vx *= k;
        m.vy = m.vy * k + m.fall * dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.angle += m.spin * dt;
        m.age += dt;
    }
    b.motes = b.motes.filter((m) => m.age < m.life);
}

/** How far through its life a mote is, from nought to one. */
export const ageOf = (m: Mote): number => Math.min(1, m.age / m.life);
