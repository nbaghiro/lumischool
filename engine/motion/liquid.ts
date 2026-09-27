// Water as drops, for a game whose water has to go where it is poured: a stream from a tipped jug,
// water running down a marble run.
//
// The drops are a small particle liquid: each step they fall, are pushed apart where they crowd and
// drawn together where they thin (the double density relaxation of Clavet, Beaudoin and Poulin,
// "Particle-based viscoelastic fluid simulation", 2005), and run over walls and bodies. The same
// drops stepped the same way give the same water, since nothing here draws on chance, and the whole
// liquid is four numbers a drop and a tag, so it is stored with a game's state as it is. What a game
// counts (the water that reached a jug) is the drops that got there, so the reading is the pour.
import type { Bodies } from "./bodies";
import type { Pt } from "./geometry";

export interface Liquid {
    /** Each drop's place and speed, four numbers a drop: x, y, vx and vy, in squares and squares a second. */
    drops: number[];
    /** A number each drop carries for its game, such as the jug it was poured from. */
    tags: number[];
    /** The most drops it holds: a pour past it is refused, so a level never asks too much of a frame. */
    most: number;
}

export interface Feel {
    /** A drop's radius, in squares: how near a wall its middle comes. */
    r: number;
    /** How far apart drops still feel each other, in squares. */
    reach: number;
    gravity: number;
    /** The crowding the drops settle at, and how hard they push back from more of it and from a near neighbour. */
    rest: number;
    stiff: number;
    near: number;
    /** How much of a drop's speed into a wall comes back out, and how much of its speed along the wall it keeps. */
    bounce: number;
    slip: number;
    /** A drop's mass, for how hard it pushes what it hits. */
    mass: number;
    /** The fastest a drop moves, in squares a second. */
    most: number;
    /** The most the drops' crowding moves one in a step, as a share of its radius. */
    give: number;
}

/** Water about a sixth of a square across, running like water rather than sand or syrup. */
export const WATER: Feel = {
    r: 0.18,
    reach: 0.75,
    gravity: 24,
    rest: 2.2,
    stiff: 160,
    near: 700,
    bounce: 0.05,
    slip: 0.995,
    mass: 0.08,
    most: 40,
    give: 0.15,
};

/**
 * Water falling in a stream from a spout or a tap: drops that do not crowd each other, since a thin
 * column pushed apart by its own crowding sprays sideways as nothing round it holds it in.
 */
export const STREAM: Feel = { ...WATER, stiff: 0, near: 0 };

/**
 * Something the drops run over: closed convex outlines and open lines of two points, in the world,
 * how fast its surface moves at a point, and what takes the push of the drops that hit it.
 */
export interface Solid {
    outline: readonly (readonly Pt[])[];
    velocity?: (at: Pt) => Pt;
    push?: (force: Pt, at: Pt) => void;
}

export interface Drop {
    x: number;
    y: number;
    vx: number;
    vy: number;
    tag: number;
}

export const liquid = (most: number): Liquid => ({ drops: [], tags: [], most });

export const count = (l: Liquid): number => l.tags.length;

export function dropAt(l: Liquid, i: number): Drop | null {
    const k = i * 4;
    const x = l.drops[k],
        y = l.drops[k + 1],
        vx = l.drops[k + 2],
        vy = l.drops[k + 3],
        tag = l.tags[i];
    if (x === undefined || y === undefined || vx === undefined || vy === undefined) return null;
    if (tag === undefined) return null;
    return { x, y, vx, vy, tag };
}

/** Adds a drop at `at`, moving at `v`, unless the liquid already holds all it may; says whether it did. */
export function pour(l: Liquid, at: Pt, v: Pt, tag = 0): boolean {
    if (count(l) >= l.most) return false;
    l.drops.push(at.x, at.y, v.x, v.y);
    l.tags.push(tag);
    return true;
}

/** Takes out every drop `gone` picks, keeping the rest in order, and gives back the ones taken. */
export function drain(l: Liquid, gone: (d: Drop, i: number) => boolean): Drop[] {
    const out: Drop[] = [],
        drops: number[] = [],
        tags: number[] = [];
    for (let i = 0; i < count(l); i++) {
        const d = dropAt(l, i);
        if (!d) continue;
        if (gone(d, i)) out.push(d);
        else {
            drops.push(d.x, d.y, d.vx, d.vy);
            tags.push(d.tag);
        }
    }
    l.drops = drops;
    l.tags = tags;
    return out;
}

/** Whether every drop is moving slower than `speed`, squares a second. */
export function calm(l: Liquid, speed: number): boolean {
    for (let i = 0; i < count(l); i++) {
        const vx = l.drops[i * 4 + 2] ?? 0,
            vy = l.drops[i * 4 + 3] ?? 0;
        if (vx * vx + vy * vy > speed * speed) return false;
    }
    return true;
}

/** The drops' places as pairs, x then y, for a frame to draw. */
export function places(l: Liquid): number[] {
    const out: number[] = [];
    for (let i = 0; i < count(l); i++) out.push(l.drops[i * 4] ?? 0, l.drops[i * 4 + 1] ?? 0);
    return out;
}

/** Every body in a world as something the drops run over and push, and the world's ground as lines. */
export function solidsOf(world: Bodies): Solid[] {
    return world.solids().map((s) => ({
        outline: s.outline,
        ...(s.moving
            ? {
                  velocity: (at: Pt) => world.velocityAt(s.body, at),
                  push: (force: Pt, at: Pt) => world.pushAt(s.body, force, at),
              }
            : {}),
    }));
}

interface Box {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

const boxOf = (pts: readonly Pt[], pad: number): Box => {
    let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
    for (const p of pts) {
        x0 = Math.min(x0, p.x);
        y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x);
        y1 = Math.max(y1, p.y);
    }
    return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
};

/** The nearest point to `p` on the segment from `a` to `b`. */
function nearest(p: Pt, a: Pt, b: Pt): Pt {
    const dx = b.x - a.x,
        dy = b.y - a.y,
        len = dx * dx + dy * dy;
    const t = len > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0;
    return { x: a.x + dx * t, y: a.y + dy * t };
}

/** Whether `p` is inside the convex outline `poly`, wound either way. */
function inside(p: Pt, poly: readonly Pt[]): boolean {
    let sign = 0;
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i],
            b = poly[(i + 1) % poly.length];
        if (!a || !b) return false;
        const c = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        if (c === 0) continue;
        const s = c > 0 ? 1 : -1;
        if (sign === 0) sign = s;
        else if (s !== sign) return false;
    }
    return true;
}

/**
 * Where a drop at `p` touches an outline, if it does: the point on the outline and the way out of
 * it. A drop inside a closed outline is put out through its nearest side.
 */
function touch(p: Pt, poly: readonly Pt[], r: number): { at: Pt; n: Pt } | null {
    const closed = poly.length > 2;
    const within = closed && inside(p, poly);
    let best: Pt | null = null,
        far = Infinity;
    const sides = closed ? poly.length : poly.length - 1;
    for (let i = 0; i < sides; i++) {
        const a = poly[i],
            b = poly[(i + 1) % poly.length];
        if (!a || !b) continue;
        const c = nearest(p, a, b),
            d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
        if (d < far) {
            far = d;
            best = c;
        }
    }
    if (!best) return null;
    const d = Math.sqrt(far);
    if (!within && d >= r) return null;
    if (d < 1e-9) {
        // exactly on the outline: out the way from its middle
        let mx = 0,
            my = 0;
        for (const q of poly) {
            mx += q.x / poly.length;
            my += q.y / poly.length;
        }
        const ox = p.x - mx,
            oy = p.y - my,
            ol = Math.hypot(ox, oy) || 1;
        return { at: best, n: { x: ox / ol, y: oy / ol } };
    }
    const s = within ? -1 : 1;
    return { at: best, n: { x: (s * (p.x - best.x)) / d, y: (s * (p.y - best.y)) / d } };
}

/**
 * Where a drop that moved from `a` to `b` went through a line of two points, if it did, with the way
 * back to the side it came from: a drop squeezed hard against a thin wall is not let through it.
 */
function crossed(a: Pt, b: Pt, poly: readonly Pt[]): { at: Pt; n: Pt } | null {
    const p = poly[0],
        q = poly[1];
    if (poly.length !== 2 || !p || !q) return null;
    const ex = q.x - p.x,
        ey = q.y - p.y,
        dx = b.x - a.x,
        dy = b.y - a.y;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) return null;
    const t = ((p.x - a.x) * ey - (p.y - a.y) * ex) / den,
        u = ((p.x - a.x) * dy - (p.y - a.y) * dx) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    const len = Math.hypot(ex, ey) || 1;
    let nx = -ey / len,
        ny = ex / len;
    if ((a.x - p.x) * nx + (a.y - p.y) * ny < 0) {
        nx = -nx;
        ny = -ny;
    }
    return { at: { x: a.x + dx * t, y: a.y + dy * t }, n: { x: nx, y: ny } };
}

/** Pairs each drop with its neighbours inside `reach`, through a grid of cells `reach` wide. */
function neighbours(xs: Float64Array, ys: Float64Array, n: number, reach: number): number[][] {
    const cells = new Map<number, number[]>();
    const keyOf = (cx: number, cy: number) => (cx + 32768) * 65536 + (cy + 32768);
    for (let i = 0; i < n; i++) {
        const k = keyOf(Math.floor((xs[i] ?? 0) / reach), Math.floor((ys[i] ?? 0) / reach));
        const c = cells.get(k);
        if (c) c.push(i);
        else cells.set(k, [i]);
    }
    const out: number[][] = [];
    for (let i = 0; i < n; i++) {
        const cx = Math.floor((xs[i] ?? 0) / reach),
            cy = Math.floor((ys[i] ?? 0) / reach),
            near: number[] = [];
        for (let dx = -1; dx <= 1; dx++)
            for (let dy = -1; dy <= 1; dy++)
                for (const j of cells.get(keyOf(cx + dx, cy + dy)) ?? [])
                    if (j > i) {
                        const ddx = (xs[j] ?? 0) - (xs[i] ?? 0),
                            ddy = (ys[j] ?? 0) - (ys[i] ?? 0);
                        if (ddx * ddx + ddy * ddy < reach * reach) near.push(j);
                    }
        out.push(near);
    }
    return out;
}

/**
 * Moves the drops on by `dt` seconds: they fall, crowd and spread, and run over `walls` (lines of
 * two points, or closed convex outlines) and `solids`, pushing the solids that can be pushed. A step
 * is cut into as many pieces as it takes for no drop to pass through a wall in one.
 */
export function stepLiquid(
    l: Liquid,
    dt: number,
    feel: Feel,
    o: { walls?: readonly (readonly Pt[])[]; solids?: readonly Solid[] } = {},
): void {
    const n = count(l);
    if (n === 0) return;
    const xs = new Float64Array(n),
        ys = new Float64Array(n),
        vxs = new Float64Array(n),
        vys = new Float64Array(n);
    let fastest = 0;
    for (let i = 0; i < n; i++) {
        xs[i] = l.drops[i * 4] ?? 0;
        ys[i] = l.drops[i * 4 + 1] ?? 0;
        vxs[i] = l.drops[i * 4 + 2] ?? 0;
        vys[i] = l.drops[i * 4 + 3] ?? 0;
        fastest = Math.max(fastest, Math.hypot(vxs[i] ?? 0, vys[i] ?? 0));
    }
    fastest = Math.min(feel.most, fastest + feel.gravity * dt);
    const pieces = Math.max(1, Math.min(4, Math.ceil((fastest * dt) / feel.r)));
    const h = dt / pieces;
    const outlines: { poly: readonly Pt[]; box: Box; solid: Solid | null }[] = [];
    for (const w of o.walls ?? []) outlines.push({ poly: w, box: boxOf(w, feel.r), solid: null });
    for (const s of o.solids ?? [])
        for (const poly of s.outline) outlines.push({ poly, box: boxOf(poly, feel.r), solid: s });
    const px = new Float64Array(n),
        py = new Float64Array(n);
    for (let piece = 0; piece < pieces; piece++) {
        for (let i = 0; i < n; i++) {
            vys[i] = (vys[i] ?? 0) + feel.gravity * h;
            const speed = Math.hypot(vxs[i] ?? 0, vys[i] ?? 0);
            if (speed > feel.most) {
                vxs[i] = ((vxs[i] ?? 0) * feel.most) / speed;
                vys[i] = ((vys[i] ?? 0) * feel.most) / speed;
            }
            px[i] = xs[i] ?? 0;
            py[i] = ys[i] ?? 0;
            xs[i] = (xs[i] ?? 0) + (vxs[i] ?? 0) * h;
            ys[i] = (ys[i] ?? 0) + (vys[i] ?? 0) * h;
        }
        if (feel.stiff > 0 || feel.near > 0) relax(xs, ys, n, feel, h);
        for (let i = 0; i < n; i++) {
            vxs[i] = ((xs[i] ?? 0) - (px[i] ?? 0)) / h;
            vys[i] = ((ys[i] ?? 0) - (py[i] ?? 0)) / h;
        }
        for (let i = 0; i < n; i++)
            for (const w of outlines) {
                const x = xs[i] ?? 0,
                    y = ys[i] ?? 0;
                if (x < w.box.x0 || x > w.box.x1 || y < w.box.y0 || y > w.box.y1) continue;
                const hit =
                    crossed({ x: px[i] ?? 0, y: py[i] ?? 0 }, { x, y }, w.poly) ??
                    touch({ x, y }, w.poly, feel.r);
                if (!hit) continue;
                xs[i] = hit.at.x + hit.n.x * feel.r;
                ys[i] = hit.at.y + hit.n.y * feel.r;
                const sv = w.solid?.velocity?.(hit.at) ?? { x: 0, y: 0 };
                const rx = (vxs[i] ?? 0) - sv.x,
                    ry = (vys[i] ?? 0) - sv.y;
                const into = rx * hit.n.x + ry * hit.n.y;
                if (into >= 0) continue;
                const tx = rx - into * hit.n.x,
                    ty = ry - into * hit.n.y;
                const nx = -into * feel.bounce * hit.n.x,
                    ny = -into * feel.bounce * hit.n.y;
                const vx = sv.x + nx + tx * feel.slip,
                    vy = sv.y + ny + ty * feel.slip;
                w.solid?.push?.(
                    {
                        x: (-feel.mass * (vx - (vxs[i] ?? 0))) / h / pieces,
                        y: (-feel.mass * (vy - (vys[i] ?? 0))) / h / pieces,
                    },
                    hit.at,
                );
                vxs[i] = vx;
                vys[i] = vy;
            }
    }
    for (let i = 0; i < n; i++) {
        l.drops[i * 4] = xs[i] ?? 0;
        l.drops[i * 4 + 1] = ys[i] ?? 0;
        l.drops[i * 4 + 2] = vxs[i] ?? 0;
        l.drops[i * 4 + 3] = vys[i] ?? 0;
    }
}

/** The double density relaxation: crowded drops are pushed apart and sparse ones drawn together, by moving them. */
function relax(xs: Float64Array, ys: Float64Array, n: number, feel: Feel, h: number): void {
    const bx = Float64Array.from(xs.subarray(0, n)),
        by = Float64Array.from(ys.subarray(0, n));
    const near = neighbours(xs, ys, n, feel.reach);
    const all: number[][] = near.map(() => []);
    near.forEach((js, i) => {
        for (const j of js) {
            all[i]?.push(j);
            all[j]?.push(i);
        }
    });
    for (let i = 0; i < n; i++) {
        const js = all[i] ?? [];
        let rho = 0,
            rhoNear = 0;
        for (const j of js) {
            const q =
                1 -
                Math.hypot((xs[j] ?? 0) - (xs[i] ?? 0), (ys[j] ?? 0) - (ys[i] ?? 0)) / feel.reach;
            if (q <= 0) continue;
            rho += q * q;
            rhoNear += q * q * q;
        }
        const pressure = feel.stiff * (rho - feel.rest),
            pressureNear = feel.near * rhoNear;
        let dx = 0,
            dy = 0;
        for (const j of js) {
            const ex = (xs[j] ?? 0) - (xs[i] ?? 0),
                ey = (ys[j] ?? 0) - (ys[i] ?? 0),
                d = Math.hypot(ex, ey);
            const q = 1 - d / feel.reach;
            if (q <= 0 || d < 1e-9) continue;
            const push = h * h * (pressure * q + pressureNear * q * q);
            const mx = (push * ex) / d / 2,
                my = (push * ey) / d / 2;
            xs[j] = (xs[j] ?? 0) + mx;
            ys[j] = (ys[j] ?? 0) + my;
            dx -= mx;
            dy -= my;
        }
        xs[i] = (xs[i] ?? 0) + dx;
        ys[i] = (ys[i] ?? 0) + dy;
    }
    // drops born on top of each other would fly apart as fast as they were pushed, so the relaxation
    // moves a drop at most a small share of its size in one step
    const most = feel.r * feel.give;
    for (let i = 0; i < n; i++) {
        const dx = (xs[i] ?? 0) - (bx[i] ?? 0),
            dy = (ys[i] ?? 0) - (by[i] ?? 0),
            d = Math.hypot(dx, dy);
        if (d <= most) continue;
        xs[i] = (bx[i] ?? 0) + (dx * most) / d;
        ys[i] = (by[i] ?? 0) + (dy * most) / d;
    }
}
