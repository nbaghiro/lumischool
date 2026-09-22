// Where a released piece lands.
//
// A drop target is a shape on the board that carries whatever the caller wants to know when a
// piece lands in it, which in a game is the move it stands for. `land` turns a release, a point
// and a velocity, into the target the child meant: the one the piece is over, or near enough to
// snap into, or the one a flick was aimed at. It never invents a target, so what a gesture can
// choose is exactly the list it was given, and that list comes from the mechanic's own moves.

import {
    centre,
    dist,
    distanceTo,
    isCircle,
    type Pt,
    type Shape,
} from "../../engine/motion/geometry";

export interface Target<T> {
    id: string;
    shape: Shape;
    /** What landing here means. In a game, the move. */
    carries: T;
}

export interface Release {
    x: number;
    y: number;
    /** Units per second at the moment of release. */
    vx: number;
    vy: number;
}

export interface Reach {
    /** How far outside a target a release still snaps into it, in squares. */
    reach: number;
    /** How many seconds ahead a flick is projected when looking for what it was aimed at. */
    flickSeconds: number;
    /** The speed, in squares per second, under which a release is a drop and not a flick. */
    minSpeed: number;
}

export const REACH: Reach = { reach: 1, flickSeconds: 0.35, minSpeed: 14 };

export type How = "on" | "near" | "flick" | "miss";

export interface Landing<T> {
    target: Target<T> | null;
    how: How;
    /** Where the piece was judged to be: the release point, or where a flick was projected to. */
    at: Pt;
}

/**
 * The target nearest a point by distance to its edge, which is nought inside it. Targets grown to
 * the forty four pixel floor can overlap, so a point inside two goes to the one whose centre is
 * nearer, which is the one the finger was aimed at.
 */
export function nearestTarget<T>(
    p: Pt,
    targets: Target<T>[],
): { target: Target<T>; d: number } | null {
    let best: { target: Target<T>; d: number; c: number } | null = null;
    for (const target of targets) {
        const d = distanceTo(target.shape, p),
            c = dist(centre(target.shape), p);
        if (!best || d < best.d || (d === best.d && c < best.c)) best = { target, d, c };
    }
    return best ? { target: best.target, d: best.d } : null;
}

/** The closest a flick's path comes to a target, walked in small steps so a fast flick cannot skip over a small target. */
function alongFlick<T>(
    r: Release,
    targets: Target<T>[],
    o: Reach,
): { target: Target<T>; at: Pt } | null {
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
        const u = (i / steps) * o.flickSeconds;
        const p = { x: r.x + r.vx * u, y: r.y + r.vy * u };
        const n = nearestTarget(p, targets);
        if (n && n.d <= o.reach) return { target: n.target, at: p };
    }
    return null;
}

export function land<T>(r: Release, targets: Target<T>[], o: Reach = REACH): Landing<T> {
    const p = { x: r.x, y: r.y };
    const n = nearestTarget(p, targets);
    if (n && n.d === 0) return { target: n.target, how: "on", at: p };
    if (n && n.d <= o.reach) return { target: n.target, how: "near", at: p };
    if (Math.hypot(r.vx, r.vy) >= o.minSpeed) {
        const f = alongFlick(r, targets, o);
        if (f) return { target: f.target, how: "flick", at: f.at };
    }
    return { target: null, how: "miss", at: p };
}

/** The point a piece rests at when it is in a target: the target's centre. */
export const restingPoint = <T>(t: Target<T>): Pt => centre(t.shape);

/** A target's size across, for sizing a ring drawn round it. */
export const across = <T>(t: Target<T>): number =>
    isCircle(t.shape) ? t.shape.r * 2 : Math.min(t.shape.w, t.shape.h);

/** A piece the view keeps an identity for, where the model keeps only a count per place. */
export interface Piece<K extends string = string, W extends string = string> {
    id: string;
    kind: K;
    where: W;
}

/**
 * Pieces brought into line with how many of each kind the position says are in each place. A
 * model's place is a bag and cannot say which ball went in, so the view keeps one piece per thing
 * and moves as few as it must: a piece that has to move is the preferred one if it can be, which is
 * the one the child's hand moved, otherwise the last to arrive. A moved piece goes to the end of the
 * list, so the list is arrival order and a take-back takes back the last to arrive.
 */
export function settle<K extends string, W extends string, T extends Piece<K, W>>(
    pieces: T[],
    o: { places: W[]; home: W; kinds: K[]; want(where: W, kind: K): number; prefer?: string },
): T[] {
    let out = pieces.map((p) => ({ ...p }));
    const move = (p: T, where: W): void => {
        out = out.filter((x) => x.id !== p.id);
        out.push({ ...p, where });
    };
    const pick = (list: T[]): T | undefined =>
        list.find((p) => p.id === o.prefer) ?? list[list.length - 1];
    for (const place of o.places) {
        for (const kind of o.kinds) {
            const wanted = o.want(place, kind);
            const here = (): T[] => out.filter((p) => p.kind === kind && p.where === place);
            const home = (): T[] => out.filter((p) => p.kind === kind && p.where === o.home);
            for (let p = pick(here()); p && here().length > wanted; p = pick(here()))
                move(p, o.home);
            for (let p = pick(home()); p && here().length < wanted; p = pick(home()))
                move(p, place);
        }
    }
    return out;
}
