// The join-the-dots layout: the pictures, the box they are drawn in, a count's labels and where each
// dot and decoy stands, which the drawing and a round in a world's sky (.scratchpad/src/play/dots.ts,
// which keeps the game's rules) lay out with, so the shelf's drawing and the game's dots are one set
// of dots. Listed as construction in the catalogue suite.
import { rng } from "../../ink/pen";

export type P = [number, number];
export const SHAPE_IDS = ["kite", "boat", "rocket", "whale", "star", "house", "balloon"] as const;
export type ShapeId = (typeof SHAPE_IDS)[number];

export interface Shape {
    id: ShapeId;
    /** What the closed picture is, as a child reads it. */
    name: string;
    /** The world's drawing that stands in the closed picture, by its id in the scratchpad's src/world/art.ts. */
    art: string;
    /** The outline, in squares of the box, in the order the count joins it. */
    pts: P[];
}

/** The box every picture is drawn in, in squares. */
export const BOX = { w: 12, h: 10 } as const;
/** No two dots, counted or not, are nearer than this in squares, so each keeps a finger's room. */
export const ROOM = 1.9;

const r2 = (v: number) => Math.round(v * 100) / 100;
const starPts = (): P[] =>
    Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5,
            r = i % 2 ? 2 : 4.6;
        return [r2(6 + Math.cos(a) * r), r2(5.2 + Math.sin(a) * r)];
    });

export const SHAPES: Record<ShapeId, Shape> = {
    kite: {
        id: "kite",
        name: "a kite",
        art: "kite",
        pts: [
            [6, 0.6],
            [7.8, 2.1],
            [9.6, 3.6],
            [8.4, 5.4],
            [7.2, 7.2],
            [6, 9.2],
            [4.8, 7.2],
            [3.6, 5.4],
            [2.4, 3.6],
            [4.2, 2.1],
        ],
    },
    boat: {
        id: "boat",
        name: "a sailing boat",
        art: "boat",
        pts: [
            [0.8, 6.2],
            [2.6, 8.6],
            [6, 8.6],
            [9.4, 8.6],
            [11.2, 6.2],
            [9.6, 4.8],
            [5.6, 0.6],
            [5.6, 3.4],
            [5.6, 6.2],
        ],
    },
    rocket: {
        id: "rocket",
        name: "a rocket",
        art: "rocket",
        pts: [
            [6, 0.4],
            [7.4, 2.2],
            [7.6, 4.8],
            [9.6, 8.2],
            [7.4, 7.6],
            [6, 9.6],
            [4.6, 7.6],
            [2.4, 8.2],
            [4.4, 4.8],
            [4.6, 2.2],
        ],
    },
    whale: {
        id: "whale",
        name: "a whale",
        art: "whale",
        pts: [
            [0.8, 5.6],
            [2, 3.4],
            [4.4, 2.4],
            [7, 2.8],
            [9, 4.2],
            [10.2, 2.2],
            [11.6, 3.6],
            [10.6, 5.6],
            [8.6, 6.8],
            [5.6, 7.8],
            [2.8, 7.4],
        ],
    },
    star: { id: "star", name: "a shooting star", art: "shooting-star", pts: starPts() },
    house: {
        id: "house",
        name: "a house",
        art: "houses",
        pts: [
            [2.6, 4.6],
            [6, 1],
            [9.4, 4.6],
            [9.4, 7],
            [9.4, 9.2],
            [7, 9.2],
            [7, 6.6],
            [5, 6.6],
            [5, 9.2],
            [2.6, 9.2],
            [2.6, 6.8],
        ],
    },
    balloon: {
        id: "balloon",
        name: "a hot-air balloon",
        art: "balloon",
        pts: [
            [6, 0.4],
            [8.7, 1.3],
            [9.9, 3.6],
            [8.8, 6],
            [7.1, 7.8],
            [7.1, 9.8],
            [4.9, 9.8],
            [4.9, 7.8],
            [3.2, 6],
            [2.1, 3.6],
            [3.3, 1.3],
        ],
    },
};

/** A count: where it starts, how far each dot steps, and how many decimal places its numbers are written with. */
export interface Count {
    start: number;
    step: number;
    places: number;
}

/** A number as a dot is labelled: with its decimal places, and a minus sign rather than a hyphen. */
export function label(v: number, places: number): string {
    const s = places ? Math.abs(v).toFixed(places) : String(Math.abs(Math.round(v)));
    return v < -1e-9 ? `−${s}` : s;
}

const valueAt = (c: Count, k: number) => Math.round((c.start + c.step * k) * 1000) / 1000;

const STEP_WORDS: Record<number, string> = {
    2: "twos",
    3: "threes",
    4: "fours",
    5: "fives",
    6: "sixes",
    7: "sevens",
    8: "eights",
    9: "nines",
    10: "tens",
    25: "twenty-fives",
    50: "fifties",
    100: "hundreds",
    1000: "thousands",
};

/** The one sentence that says what joining the dots means for this count. */
export function goalOf(c: Count): string {
    const from = label(c.start, c.places),
        s = Math.abs(c.step);
    if (c.places) return `Join the dots, counting in steps of ${label(s, c.places)} from ${from}.`;
    if (s === 1)
        return c.step > 0
            ? `Join the dots, counting on from ${from}.`
            : `Join the dots, counting back from ${from}.`;
    return `Join the dots, counting ${c.step < 0 ? "back " : ""}in ${STEP_WORDS[s] ?? `steps of ${s}`} from ${from}.`;
}

/** A dot, in squares of the box, with its number and where the number is written. */
export interface Dot {
    x: number;
    y: number;
    value: number;
    label: string;
    lx: number;
    ly: number;
}

export interface Round {
    shape: Shape;
    count: Count;
    dots: Dot[];
    decoys: Dot[];
    goal: string;
}

function segDist(x: number, y: number, a: Dot, b: Dot): number {
    const dx = b.x - a.x,
        dy = b.y - a.y,
        L = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L));
    return Math.hypot(x - (a.x + dx * u), y - (a.y + dy * u));
}

/**
 * A picture's dots numbered by a count, and up to `decoys` more dots beside them numbered with values
 * between the count's first and last that are not in it, so a dot cannot be ruled out by its size
 * alone. A decoy keeps ROOM from every dot and a square from every line the count draws.
 */
export function layout(o: { shape: ShapeId; count: Count; decoys: number; seed: number }): Round {
    const shape = SHAPES[o.shape],
        pick = rng(o.seed),
        n = shape.pts.length;
    const cx = shape.pts.reduce((a, q) => a + q[0], 0) / n,
        cy = shape.pts.reduce((a, q) => a + q[1], 0) / n;
    const dots: Dot[] = shape.pts.map(([x, y], k) => {
        const v = valueAt(o.count, k),
            d = Math.hypot(x - cx, y - cy) || 1;
        return {
            x,
            y,
            value: v,
            label: label(v, o.count.places),
            lx: r2(x + ((x - cx) / d) * 0.85),
            ly: r2(y + ((y - cy) / d) * 0.85),
        };
    });
    const values = dots.map((d) => d.value),
        lo = Math.min(...values),
        hi = Math.max(...values),
        s = Math.abs(o.count.step);
    const unit = o.count.places ? 0.1 : s >= 100 ? s / 10 : s >= 25 ? 5 : 1;
    const pool: number[] = [];
    for (let k = 1; lo + unit * k < hi - 1e-9; k++) {
        const v = Math.round((lo + unit * k) * 1000) / 1000;
        if (!values.some((x) => Math.abs(x - v) < 1e-9)) pool.push(v);
    }
    const want = Math.min(o.decoys, pool.length),
        decoys: Dot[] = [];
    for (let tries = 0; decoys.length < want && tries < 800; tries++) {
        const x = r2(0.9 + pick() * (BOX.w - 1.8)),
            y = r2(0.9 + pick() * (BOX.h - 1.8));
        if ([...dots, ...decoys].some((d) => Math.hypot(d.x - x, d.y - y) < ROOM)) continue;
        if (dots.some((d, k) => segDist(x, y, d, dots[(k + 1) % n] ?? d) < 1)) continue;
        const v = pool.splice(Math.floor(pick() * pool.length), 1)[0];
        if (v === undefined) break;
        decoys.push({
            x,
            y,
            value: v,
            label: label(v, o.count.places),
            lx: r2(Math.min(BOX.w - 0.4, x + 0.75)),
            ly: r2(Math.max(0.5, y - 0.55)),
        });
    }
    return { shape, count: o.count, dots, decoys, goal: goalOf(o.count) };
}
