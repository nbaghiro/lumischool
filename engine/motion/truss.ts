// A bridge of beams pinned at joints, stepped as stiff springs: each beam pulls or pushes its two
// joints back towards its length, a load rides on a beam and weighs on its two ends, and a beam
// that is pulled or pushed past its strength snaps. A pinned joint cannot hold a beam's angle, so
// a square of beams folds and a triangle does not, which is the lesson the bridge game teaches.
// Every value is plain data, stepped in a fixed order, so a run is the same run every time and a
// replay needs nothing but the design and the hands. See .docs/engine.md.
import type { Pt } from "./geometry";

export type Material = "wood" | "road" | "rope";
export const MATERIALS: readonly Material[] = ["wood", "road", "rope"];

/**
 * What a beam is made of. `stiff` is the force a whole length's stretch would take, so a beam a
 * hundredth longer than its length pulls with a hundredth of it; `strength` is the most force it
 * takes before it snaps; `weight` is its weight a square; `most` is the longest beam, in squares.
 */
interface Stuff {
    stiff: number;
    strength: number;
    weight: number;
    most: number;
    /** A rope only pulls: pushed, it goes slack. */
    pulls?: true;
}

export const STUFF: Record<Material, Stuff> = {
    wood: { stiff: 3000, strength: 33, weight: 0.04, most: 4.5 },
    road: { stiff: 3000, strength: 33, weight: 0.06, most: 4.5 },
    rope: { stiff: 2000, strength: 40, weight: 0.015, most: 8, pulls: true },
};

/** Squares a second each second, downwards. */
export const GRAVITY = 10;
const SUBSTEPS = 24;
/** The share of a joint's speed lost each second, so a bridge rings down rather than for ever. */
const DAMPING = 1.6;
/** The share of a joint's speed lost each second in water, as well. */
const WET = 4;
/** A joint's weight with no beam on it, so a lone joint still falls. */
const BARE = 0.02;

interface Joint {
    x: number;
    y: number;
    /** Pinned to the bank or a rock: it never moves. */
    fixed?: boolean;
}

interface Beam {
    a: number;
    b: number;
    m: Material;
}

/** A bridge as drawn: joints by index, and beams between them. */
export interface Plan {
    joints: Joint[];
    beams: Beam[];
}

interface Pin {
    x: number;
    y: number;
    vx: number;
    vy: number;
    fixed: boolean;
    /** Its own weight: half of each beam on it. */
    mass: number;
}

interface Bar {
    a: number;
    b: number;
    m: Material;
    rest: number;
    /** The pull along it at the last step, less than nought for a push. */
    force: number;
    broken: boolean;
}

export interface Truss {
    nodes: Pin[];
    bars: Bar[];
}

/** A weight riding on a bar: `at` from nought at its `a` end to one at its `b` end. */
export interface Load {
    bar: number;
    at: number;
    mass: number;
}

interface Around {
    /** Squares a second each second, sideways, on every loose joint: a gust of wind. */
    wind?: number;
    /** Where a falling joint comes to rest, as a depth. */
    floor?: number;
    /** Below this depth a joint is in water and slowed. */
    water?: number;
    /** Nothing snaps, for a trial that only reads how hard each bar works. */
    holds?: true;
}

export const lengthOf = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.y - a.y);

/** A bridge ready to step, every beam at its own length. */
export function truss(plan: Plan): Truss {
    const nodes: Pin[] = plan.joints.map((j) => ({
        x: j.x,
        y: j.y,
        vx: 0,
        vy: 0,
        fixed: j.fixed === true,
        mass: BARE,
    }));
    const bars: Bar[] = [];
    for (const b of plan.beams) {
        const p = nodes[b.a],
            q = nodes[b.b];
        if (!p || !q || b.a === b.b) continue;
        const rest = lengthOf(p, q);
        p.mass += (STUFF[b.m].weight * rest) / 2;
        q.mass += (STUFF[b.m].weight * rest) / 2;
        bars.push({ a: b.a, b: b.b, m: b.m, rest, force: 0, broken: false });
    }
    return { nodes, bars };
}

/** How near a bar is to snapping, from nought to one and past it. */
export function strainOf(b: Bar): number {
    if (b.broken) return 0;
    const s = STUFF[b.m];
    return (s.pulls ? Math.max(0, b.force) : Math.abs(b.force)) / s.strength;
}

/**
 * One step of `dt` seconds: the loads weigh on their bars' ends, every bar is held to its length
 * in turn, and the bar furthest past its strength snaps, one a step. Returns the bar that snapped, or null.
 */
export function stepTruss(
    t: Truss,
    dt: number,
    loads: readonly Load[] = [],
    around: Around = {},
): number | null {
    const h = dt / SUBSTEPS;
    // a load is weight carried by the joints it rides between, so they are heavier to push back
    const mass = t.nodes.map((p) => p.mass);
    for (const l of loads) {
        const b = t.bars[l.bar];
        if (!b || b.broken) continue;
        mass[b.a] = (mass[b.a] ?? 0) + l.mass * (1 - l.at);
        mass[b.b] = (mass[b.b] ?? 0) + l.mass * l.at;
    }
    const inv = t.nodes.map((p, i) => (p.fixed ? 0 : 1 / (mass[i] ?? BARE)));
    const sum = t.bars.map(() => 0);
    const px = t.nodes.map((p) => p.x),
        py = t.nodes.map((p) => p.y);
    const slow = Math.exp(-DAMPING * h),
        wet = Math.exp(-WET * h);
    for (let k = 0; k < SUBSTEPS; k++) {
        for (const [i, p] of t.nodes.entries()) {
            px[i] = p.x;
            py[i] = p.y;
            if (p.fixed) continue;
            p.vy += GRAVITY * h;
            p.vx += (around.wind ?? 0) * h;
            p.x += p.vx * h;
            p.y += p.vy * h;
        }
        for (const [i, b] of t.bars.entries()) {
            if (b.broken) continue;
            const p = t.nodes[b.a],
                q = t.nodes[b.b];
            const wa = inv[b.a] ?? 0,
                wb = inv[b.b] ?? 0;
            if (!p || !q) continue;
            const dx = q.x - p.x,
                dy = q.y - p.y,
                len = Math.hypot(dx, dy) || 1e-9,
                c = len - b.rest;
            const s = STUFF[b.m];
            if ((s.pulls && c < 0) || wa + wb === 0) continue;
            // the bar's give: a long bar stretches further for the same pull than a short one
            const give = b.rest / s.stiff / (h * h);
            const lambda = -c / (wa + wb + give);
            const nx = dx / len,
                ny = dy / len;
            p.x -= wa * lambda * nx;
            p.y -= wa * lambda * ny;
            q.x += wb * lambda * nx;
            q.y += wb * lambda * ny;
            sum[i] = (sum[i] ?? 0) - lambda / (h * h);
        }
        for (const [i, p] of t.nodes.entries()) {
            if (p.fixed) continue;
            const ox = px[i] ?? p.x,
                oy = py[i] ?? p.y;
            if (around.floor !== undefined && p.y > around.floor) p.y = around.floor;
            p.vx = ((p.x - ox) / h) * slow;
            p.vy = ((p.y - oy) / h) * slow;
            if (around.water !== undefined && p.y > around.water) {
                p.vx *= wet;
                p.vy *= wet;
            }
        }
    }
    let worst: number | null = null,
        most = 1;
    for (const [i, b] of t.bars.entries()) {
        if (b.broken) continue;
        b.force = (sum[i] ?? 0) / SUBSTEPS;
        const over = strainOf(b);
        if (over > most) {
            most = over;
            worst = i;
        }
    }
    if (around.holds) return null;
    const snapped = worst === null ? null : t.bars[worst];
    if (snapped) {
        snapped.broken = true;
        snapped.force = 0;
    }
    return worst;
}
