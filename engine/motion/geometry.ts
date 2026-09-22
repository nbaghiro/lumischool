// Points, rectangles and circles in board squares, and the few questions a grid game asks of them.

export interface Pt {
    x: number;
    y: number;
}
export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}
interface Circle {
    cx: number;
    cy: number;
    r: number;
}
export type Shape = Rect | Circle;

export const isCircle = (s: Shape): s is Circle => "r" in s;
export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const centre = (s: Shape): Pt =>
    isCircle(s) ? { x: s.cx, y: s.cy } : { x: s.x + s.w / 2, y: s.y + s.h / 2 };

export function inside(s: Shape, p: Pt): boolean {
    if (isCircle(s)) return Math.hypot(p.x - s.cx, p.y - s.cy) <= s.r;
    return p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h;
}

/** To the shape's edge, and nought inside it. */
export function distanceTo(s: Shape, p: Pt): number {
    if (isCircle(s)) return Math.max(0, Math.hypot(p.x - s.cx, p.y - s.cy) - s.r);
    const dx = Math.max(s.x - p.x, 0, p.x - (s.x + s.w));
    const dy = Math.max(s.y - p.y, 0, p.y - (s.y + s.h));
    return Math.hypot(dx, dy);
}

/** `u` is how far along, 0 at `a` and 1 at `b`. */
function projectOnSegment(p: Pt, a: Pt, b: Pt): { point: Pt; u: number } {
    const dx = b.x - a.x,
        dy = b.y - a.y,
        len2 = dx * dx + dy * dy;
    const u = len2 === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
    return { point: { x: a.x + dx * u, y: a.y + dy * u }, u };
}

/**
 * The closest point on a path of straight segments, with `s` the distance along the path to it. This
 * is what turns a finger anywhere near a rail into a place on it.
 */
export function projectOnPath(
    p: Pt,
    path: Pt[],
): { point: Pt; s: number; segment: number; d: number } {
    const start = path[0];
    let best = { point: start ?? p, s: 0, segment: 0, d: start ? dist(p, start) : 0 };
    let along = 0;
    for (let i = 0; i + 1 < path.length; i++) {
        const a = path[i],
            b = path[i + 1];
        if (!a || !b) break;
        const { point, u } = projectOnSegment(p, a, b);
        const seg = dist(a, b);
        const d = dist(p, point);
        if (d < best.d) best = { point, s: along + u * seg, segment: i, d };
        along += seg;
    }
    return best;
}

/** Clamped to the path's ends. */
export function alongPath(path: Pt[], s: number): Pt {
    const end = path[path.length - 1];
    if (!end) return { x: 0, y: 0 };
    let left = Math.max(0, s);
    for (let i = 0; i + 1 < path.length; i++) {
        const a = path[i],
            b = path[i + 1];
        if (!a || !b) break;
        const seg = dist(a, b);
        if (left <= seg) {
            const u = seg === 0 ? 0 : left / seg;
            return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
        }
        left -= seg;
    }
    return end;
}

/**
 * Grown about its centre to at least `min` squares across: the 44 pixel floor for a target, so a pan
 * a finger has to land in is never smaller than a finger, whatever the drawing says.
 */
export function atLeast(s: Shape, min: number): Shape {
    if (isCircle(s)) return s.r * 2 >= min ? s : { cx: s.cx, cy: s.cy, r: min / 2 };
    const w = Math.max(s.w, min),
        h = Math.max(s.h, min);
    return { x: s.x + (s.w - w) / 2, y: s.y + (s.h - h) / 2, w, h };
}
