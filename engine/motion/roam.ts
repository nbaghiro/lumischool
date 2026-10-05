// A figure walking about a place seen from above, in squares and seconds with y growing downwards. It
// walks the eight ways the arrows point, speeding up and slowing down rather than jumping, slides along
// whatever it walks into, and faces the way it last walked. Sent to a point, it finds its own way there
// around what is in the way, and round soft ground such as a bed of soil where it can. It says which
// of the things about it is the one it faces. The place and the things are the game's to say.
import type { Pt } from "./geometry";
import { DIRS, type Dir } from "./pad";

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface Place {
    w: number;
    h: number;
    /** What cannot be walked through. */
    blocked: readonly Box[];
    /** What can be walked over, but a route goes round where it can. */
    soft?: readonly Box[];
}

export interface Roamer {
    /** Where the feet are. */
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** The way it faces, one of eight, as a step of one square or its diagonal. */
    face: Pt;
    /** Squares walked, for the walk cycle. */
    stride: number;
    /** The points it is walking through on its own, the next first. */
    route: Pt[];
}

export interface Gait {
    /** Squares a second at a walk. */
    speed: number;
    /** Squares a second gained or lost each second. */
    accel: number;
    /** How near the feet come to what is in the way. */
    radius: number;
}

/** What a step did: stood, walked, or came to the end of a route. */
export type Roamed = "stand" | "walk" | "arrived";

/** A route costs this much more over soft ground than round it. */
const SOFT = 3;
/** Squares on a side of the grid a route is found on. */
const CELL = 1;

export const roamer = (x: number, y: number, face: Pt = { x: 0, y: 1 }): Roamer => ({
    x,
    y,
    vx: 0,
    vy: 0,
    face: { ...face },
    stride: 0,
    route: [],
});

/** The way the held arrows point together, as a unit step, or null when none or opposites are held. */
export function heading(holding: readonly Dir[]): Pt | null {
    let x = 0,
        y = 0;
    for (const d of new Set(holding)) {
        x += DIRS[d].x;
        y += DIRS[d].y;
    }
    const n = Math.hypot(x, y);
    return n === 0 ? null : { x: x / n, y: y / n };
}

/** The nearest of the eight ways to a direction. */
function snap(v: Pt): Pt {
    const a = Math.round(Math.atan2(v.y, v.x) / (Math.PI / 4)) * (Math.PI / 4);
    // `|| 0` keeps a negative nought out, so the state reads back from JSON as it was
    return { x: Math.round(Math.cos(a)) || 0, y: Math.round(Math.sin(a)) || 0 };
}

const within = (b: Box, p: Pt, r: number): boolean =>
    p.x > b.x - r && p.x < b.x + b.w + r && p.y > b.y - r && p.y < b.y + b.h + r;

/** Whether feet at `p` would stand in something, or off the place. */
export function blockedAt(place: Place, p: Pt, radius: number): boolean {
    if (p.x < radius || p.y < radius || p.x > place.w - radius || p.y > place.h - radius)
        return true;
    return place.blocked.some((b) => within(b, p, radius));
}

const softAt = (place: Place, p: Pt): boolean => (place.soft ?? []).some((b) => within(b, p, 0));

/** The point `by` squares ahead of the feet, the way it faces. */
export function ahead(r: Roamer, by: number): Pt {
    const n = Math.hypot(r.face.x, r.face.y) || 1;
    return { x: r.x + (r.face.x / n) * by, y: r.y + (r.face.y / n) * by };
}

/** Turns it to face a point, as one of the eight ways. */
export function faceTo(r: Roamer, p: Pt): void {
    const dx = p.x - r.x,
        dy = p.y - r.y;
    if (Math.hypot(dx, dy) > 1e-6) r.face = snap({ x: dx, y: dy });
}

/**
 * One step of `dt` seconds. `want` is the way the arrows point, which drops any route; left null, it
 * follows its route if it has one, slowing into the last point, and otherwise slows to a stand.
 */
export function stepRoam(r: Roamer, want: Pt | null, place: Place, g: Gait, dt: number): Roamed {
    let aim = { x: 0, y: 0 },
        speed = g.speed;
    if (want) {
        r.route = [];
        aim = want;
    } else {
        while (r.route.length > 1) {
            const next = r.route[0];
            if (!next || Math.hypot(next.x - r.x, next.y - r.y) > 0.35) break;
            r.route.shift();
        }
        const next = r.route[0];
        if (next) {
            const dx = next.x - r.x,
                dy = next.y - r.y,
                d = Math.hypot(dx, dy);
            if (r.route.length === 1 && d < 0.08) {
                r.route = [];
                r.vx = r.vy = 0;
                return "arrived";
            }
            aim = { x: dx / d, y: dy / d };
            // slowing into the last point, so it stops on it rather than past it
            if (r.route.length === 1) speed = Math.min(g.speed, Math.max(0.6, d * 6));
        }
    }
    const tx = aim.x * speed,
        ty = aim.y * speed;
    const dvx = tx - r.vx,
        dvy = ty - r.vy,
        dv = Math.hypot(dvx, dvy);
    // it stops twice as quickly as it starts, so letting go of an arrow stops it near where it was let go
    const most = (tx === 0 && ty === 0 ? 2 : 1) * g.accel * dt;
    if (dv > most) {
        r.vx += (dvx / dv) * most;
        r.vy += (dvy / dv) * most;
    } else {
        r.vx = tx;
        r.vy = ty;
    }
    const x0 = r.x,
        y0 = r.y;
    // each way on its own, so walking into a wall at a slant slides along it, and walking into the
    // corner of something eases round it rather than stopping dead on it
    const dx = r.vx * dt,
        dy = r.vy * dt;
    if (!blockedAt(place, { x: r.x + dx, y: r.y }, g.radius)) r.x += dx;
    else if (!(Math.abs(aim.y) < 0.1 && ease(place, r, g.radius, "y", dx))) r.vx = 0;
    if (!blockedAt(place, { x: r.x, y: r.y + dy }, g.radius)) r.y += dy;
    else if (!(Math.abs(aim.x) < 0.1 && ease(place, r, g.radius, "x", dy))) r.vy = 0;
    const moved = Math.hypot(r.x - x0, r.y - y0);
    r.stride += moved;
    if (aim.x !== 0 || aim.y !== 0) r.face = snap(aim);
    // a route that walks into something it cannot get round is given up
    if (!want && r.route.length && moved < 1e-4 && Math.hypot(r.vx, r.vy) < 1e-4) {
        r.route = [];
        return "arrived";
    }
    return moved > 1e-4 ? "walk" : "stand";
}

/** How far round a corner a blocked step looks for a way past it, in squares. */
const CORNER = 0.45;

/**
 * Blocked going `step` along one way, a step that would be clear a little to one side of it eases the
 * feet that way by as much as the step, so a corner it only clips is walked round. Says whether it did.
 */
function ease(place: Place, r: Roamer, radius: number, side: "x" | "y", step: number): boolean {
    const by = Math.abs(step);
    for (let off = 0.05; off <= CORNER + 1e-9; off += 0.05)
        for (const sign of [-1, 1]) {
            const shifted =
                side === "y"
                    ? { x: r.x + step, y: r.y + sign * off }
                    : { x: r.x + sign * off, y: r.y + step };
            const nudge =
                side === "y"
                    ? { x: r.x, y: r.y + sign * Math.min(off, by) }
                    : { x: r.x + sign * Math.min(off, by), y: r.y };
            if (!blockedAt(place, shifted, radius) && !blockedAt(place, nudge, radius)) {
                r.x = nudge.x;
                r.y = nudge.y;
                return true;
            }
        }
    return false;
}

/** A binary heap of grid cells by cost, cheapest first. */
function heap() {
    const items: { k: number; f: number }[] = [];
    return {
        size: () => items.length,
        push(k: number, f: number) {
            items.push({ k, f });
            let i = items.length - 1;
            for (;;) {
                const up = (i - 1) >> 1,
                    a = items[i],
                    b = items[up];
                if (i === 0 || !a || !b || b.f <= a.f) break;
                items[i] = b;
                items[up] = a;
                i = up;
            }
        },
        pop(): number {
            const top = items[0];
            const last = items.pop();
            if (!top || !last) return -1;
            if (items.length) {
                items[0] = last;
                let i = 0;
                for (;;) {
                    const l = 2 * i + 1,
                        rr = l + 1;
                    let m = i;
                    const fi = items[m]?.f ?? Infinity;
                    if ((items[l]?.f ?? Infinity) < fi) m = l;
                    if ((items[rr]?.f ?? Infinity) < (items[m]?.f ?? Infinity)) m = rr;
                    if (m === i) break;
                    const a = items[i],
                        b = items[m];
                    if (!a || !b) break;
                    items[i] = b;
                    items[m] = a;
                    i = m;
                }
            }
            return top.k;
        },
    };
}

/**
 * The way from `from` to `to` as points to walk through, round what is in the way and round soft
 * ground where that is not much further. A `to` inside something ends at the nearest free point to it.
 * Null when there is no way.
 */
export function route(place: Place, from: Pt, to: Pt, radius: number): Pt[] | null {
    const cols = Math.ceil(place.w / CELL),
        rows = Math.ceil(place.h / CELL);
    const mid = (k: number): Pt => ({
        x: ((k % cols) + 0.5) * CELL,
        y: (Math.floor(k / cols) + 0.5) * CELL,
    });
    const free: boolean[] = [];
    const cost: number[] = [];
    for (let k = 0; k < cols * rows; k++) {
        const p = mid(k);
        free.push(!blockedAt(place, p, radius));
        cost.push(softAt(place, p) ? SOFT : 1);
    }
    const cellOf = (p: Pt) =>
        Math.min(rows - 1, Math.max(0, Math.floor(p.y / CELL))) * cols +
        Math.min(cols - 1, Math.max(0, Math.floor(p.x / CELL)));
    const nearestFree = (p: Pt): number => {
        let best = -1,
            bd = Infinity;
        for (let k = 0; k < free.length; k++) {
            if (!free[k]) continue;
            const m = mid(k),
                d = Math.hypot(m.x - p.x, m.y - p.y);
            if (d < bd) {
                bd = d;
                best = k;
            }
        }
        return best;
    };
    const toFree = !blockedAt(place, to, radius);
    const start = free[cellOf(from)] ? cellOf(from) : nearestFree(from),
        goal = toFree && free[cellOf(to)] ? cellOf(to) : nearestFree(to);
    if (start < 0 || goal < 0) return null;
    const end = toFree ? to : mid(goal);
    const gScore = new Map<number, number>([[start, 0]]);
    const came = new Map<number, number>();
    const open = heap();
    const h = (k: number) => {
        const a = mid(k),
            b = mid(goal);
        const dx = Math.abs(a.x - b.x),
            dy = Math.abs(a.y - b.y);
        return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };
    open.push(start, h(start));
    const shut = new Set<number>();
    while (open.size()) {
        const k = open.pop();
        if (k === goal) break;
        if (shut.has(k)) continue;
        shut.add(k);
        const cx = k % cols,
            cy = Math.floor(k / cols);
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const nx = cx + dx,
                    ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
                const n = ny * cols + nx;
                if (!free[n]) continue;
                // no cutting a corner of something in the way
                if (dx && dy && (!free[cy * cols + nx] || !free[ny * cols + cx])) continue;
                const step = (dx && dy ? Math.SQRT2 : 1) * (((cost[n] ?? 1) + (cost[k] ?? 1)) / 2);
                const gk = (gScore.get(k) ?? Infinity) + step;
                if (gk < (gScore.get(n) ?? Infinity)) {
                    gScore.set(n, gk);
                    came.set(n, k);
                    open.push(n, gk + h(n));
                }
            }
    }
    if (start !== goal && !came.has(goal)) return null;
    const cells: number[] = [goal];
    for (let k = goal; k !== start;) {
        const back = came.get(k);
        if (back === undefined) break;
        cells.push(back);
        k = back;
    }
    cells.reverse();
    const onRoute = new Set(cells);
    // a straight line between two points of the route is walked instead where it is clear and no softer
    const clear = (a: Pt, b: Pt): boolean => {
        const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.25);
        for (let i = 1; i <= n; i++) {
            const p = { x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n };
            if (blockedAt(place, p, radius)) return false;
            if (softAt(place, p) && !onRoute.has(cellOf(p))) return false;
        }
        return true;
    };
    const pts = [...cells.slice(1, -1).map(mid), end];
    const out: Pt[] = [];
    let at = from,
        i = 0;
    while (i < pts.length) {
        let k = pts.length - 1;
        while (k > i) {
            const p = pts[k];
            if (p && clear(at, p)) break;
            k--;
        }
        const p = pts[k];
        if (!p) break;
        out.push(p);
        at = p;
        i = k + 1;
    }
    return out;
}

/** Sends it to a point on its own; false where there is no way. */
export function walkTo(r: Roamer, place: Place, to: Pt, g: Gait): boolean {
    const way = route(place, r, to, g.radius);
    if (!way) return false;
    r.route = way;
    return true;
}

/**
 * The thing it faces among those within `reach` of its feet: the nearest, counting a thing beside or
 * behind it as further off than one in front, so the one it is turned to is the one it takes.
 */
export function facing<T extends Pt>(r: Roamer, things: readonly T[], reach: number): T | null {
    let best: T | null = null,
        score = Infinity;
    const n = Math.hypot(r.face.x, r.face.y) || 1;
    for (const t of things) {
        const dx = t.x - r.x,
            dy = t.y - r.y,
            d = Math.hypot(dx, dy);
        if (d > reach) continue;
        const dot = d < 0.3 ? 1 : (dx * r.face.x + dy * r.face.y) / (d * n);
        const sc = d * (2 - dot);
        if (sc < score) {
            score = sc;
            best = t;
        }
    }
    return best;
}
