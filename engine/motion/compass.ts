// Finding the way on a map: the eight points of the compass as steps of one square, the squares of a
// map's grid named by a letter and a number as a child reads them (C4: the column along the top, the
// row down the side), and how one square lies from another, counted the way a walker counts squares.
// Places are in squares with y growing downwards, so north is up. See .docs/engine.md.
import type { Pt } from "./geometry";

export const POINTS = [
    "north",
    "north-east",
    "east",
    "south-east",
    "south",
    "south-west",
    "west",
    "north-west",
] as const;
export type Point = (typeof POINTS)[number];

export const isPoint = (v: unknown): v is Point => POINTS.some((p) => p === v);

/** A step of one square towards each point, as a column and a row. */
export const STEP: Record<Point, { c: number; r: number }> = {
    north: { c: 0, r: -1 },
    "north-east": { c: 1, r: -1 },
    east: { c: 1, r: 0 },
    "south-east": { c: 1, r: 1 },
    south: { c: 0, r: 1 },
    "south-west": { c: -1, r: 1 },
    west: { c: -1, r: 0 },
    "north-west": { c: -1, r: -1 },
};

/** Each point's letters, as a compass rose writes them. */
export const LETTERS: Record<Point, string> = {
    north: "N",
    "north-east": "NE",
    east: "E",
    "south-east": "SE",
    south: "S",
    "south-west": "SW",
    west: "W",
    "north-west": "NW",
};

/** A map's grid laid over the ground: its corner, the side of a square, and how many across and down. */
export interface Grid {
    x: number;
    y: number;
    cell: number;
    cols: number;
    rows: number;
}

/** A square of a grid, counted from nought at the top left. */
export interface Square {
    c: number;
    r: number;
}

/** The square a point is in, or null off the grid. */
export function squareAt(g: Grid, p: Pt): Square | null {
    const c = Math.floor((p.x - g.x) / g.cell),
        r = Math.floor((p.y - g.y) / g.cell);
    return c >= 0 && r >= 0 && c < g.cols && r < g.rows ? { c, r } : null;
}

export const middleOf = (g: Grid, q: Square): Pt => ({
    x: g.x + (q.c + 0.5) * g.cell,
    y: g.y + (q.r + 0.5) * g.cell,
});

export const sameSquare = (a: Square | null, b: Square | null): boolean =>
    a !== null && b !== null && a.c === b.c && a.r === b.r;

const COLUMNS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** A column's letter. */
export const letterOf = (c: number): string => COLUMNS[c] ?? "?";

/** A square's name, its column's letter and its row's number: C4. */
export const nameOf = (q: Square): string => `${letterOf(q.c)}${q.r + 1}`;

/** The square a name such as C4 means, or null for one that is not a square of the grid. */
export function squareNamed(g: Grid, name: string): Square | null {
    const m = /^([A-Z])(\d{1,2})$/.exec(name.trim().toUpperCase());
    if (!m) return null;
    const c = COLUMNS.indexOf(m[1] ?? ""),
        r = Number(m[2]) - 1;
    return c >= 0 && r >= 0 && c < g.cols && r < g.rows ? { c, r } : null;
}

/** A walk of `n` squares towards one point. */
export interface Leg {
    point: Point;
    n: number;
}

/** Where legs walked one after another from a square end. */
export const walkFrom = (q: Square, legs: readonly Leg[]): Square =>
    legs.reduce(
        (at, l) => ({ c: at.c + STEP[l.point].c * l.n, r: at.r + STEP[l.point].r * l.n }),
        q,
    );

/** How far a square lies from another, in whole squares north (less than nought is south) and east (less than nought is west). */
export const offset = (from: Square, to: Square): { north: number; east: number } => ({
    north: from.r - to.r,
    east: to.c - from.c,
});

/** An offset in words, the north or south first: "3 north and 4 east", "2 west", or "here". */
export function offsetWords(o: { north: number; east: number }): string {
    const ns = o.north === 0 ? "" : `${Math.abs(o.north)} ${o.north > 0 ? "north" : "south"}`;
    const ew = o.east === 0 ? "" : `${Math.abs(o.east)} ${o.east > 0 ? "east" : "west"}`;
    return ns && ew ? `${ns} and ${ew}` : ns || ew || "here";
}

/**
 * The point a square lies towards from another and how many squares along it, when it lies on one of
 * the eight lines out from it; null when it lies between them, or is the same square.
 */
export function bearing(from: Square, to: Square): Leg | null {
    const dc = to.c - from.c,
        dr = to.r - from.r;
    if ((dc === 0 && dr === 0) || (dc !== 0 && dr !== 0 && Math.abs(dc) !== Math.abs(dr)))
        return null;
    const point = POINTS.find((p) => STEP[p].c === Math.sign(dc) && STEP[p].r === Math.sign(dr));
    return point ? { point, n: Math.max(Math.abs(dc), Math.abs(dr)) } : null;
}

/** Squares apart as a walker going any of the eight ways counts them: a diagonal step is one. */
export const stepsApart = (a: Square, b: Square): number =>
    Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r));

/** The point of the compass nearest a direction, such as the way a figure faces. */
export function pointOf(v: Pt): Point {
    const turn = Math.round(Math.atan2(v.x, -v.y) / (Math.PI / 4));
    return POINTS[((turn % 8) + 8) % 8] ?? "north";
}
