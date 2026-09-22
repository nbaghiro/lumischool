// Join the dots: numbered dots in a world's sky, joined in the order of a count until the picture
// closes, with a few dots beside them that are not in the count. The count comes from what the
// term's finished lessons taught, or from the grade. A tap on any dot but the next one changes
// nothing, so a round can always be finished, and nothing in a round is counted or kept. The
// pictures, the box and the layout of a round's dots live with the drawing, in
// engine/parts/puzzles/dots.ts, and are read back from there.
import { seeded } from "../../engine/motion/spawn";
import {
    ROOM,
    SHAPES,
    layout,
    type Count,
    type Round,
    type ShapeId,
} from "../../engine/parts/puzzles/dots";

export {
    BOX,
    ROOM,
    SHAPES,
    SHAPE_IDS,
    goalOf,
    label,
    layout,
} from "../../engine/parts/puzzles/dots";
export type { Count, Dot, P, Round, Shape, ShapeId } from "../../engine/parts/puzzles/dots";

/** Each world's picture, from what stands in it or over it. A world without a line here fails the test. */
export const WORLD_SHAPE: Record<string, ShapeId> = {
    meadow: "kite",
    harbour: "boat",
    railway: "house",
    woods: "star",
    kitchen: "house",
    town: "balloon",
    "night-sky": "rocket",
    "sports-ground": "star",
    laboratory: "balloon",
    mountains: "star",
    "open-sea": "whale",
    "volcano-island": "boat",
    "home-garden": "kite",
    "reed-marsh": "boat",
    "bandstand-park": "balloon",
    "canal-town": "boat",
    "winter-fair": "star",
    "valley-farm": "house",
    "old-tower": "star",
    "ferry-town": "boat",
    "painters-hut": "kite",
    "star-cliffs": "rocket",
    "walled-city": "balloon",
    "coral-reef": "whale",
    "crystal-caves": "star",
    "cloud-islands": "balloon",
    "dune-oasis": "star",
    "fossil-cliffs": "whale",
    "long-grass": "kite",
    "lamp-rocks": "boat",
    "clockwork-island": "star",
    "book-island": "house",
    "printing-works": "house",
    "post-office": "boat",
    "windmill-island": "kite",
    treetops: "balloon",
    "salt-flats": "star",
    "geyser-valley": "rocket",
};
export const shapeFor = (world: string): ShapeId => WORLD_SHAPE[world] ?? "kite";

/** The times tables a grade counts in, when nothing the term taught says otherwise. */
const TABLES: Record<number, number[]> = { 2: [2, 5, 10], 3: [3, 4, 8], 4: [6, 7, 9] };

/**
 * The count a round joins in. The skills are the term's finished lessons' skills, the most recent
 * first, and the first one that names a kind of counting decides: counting back past zero, steps of
 * two tenths, a times table, tens, hundreds or thousands, fives for the clock, tens or twenty-fives
 * for money. With none of those it is the grade's: counting on in ones, then a table of the grade.
 */
export function countFor(
    grade: number,
    skills: readonly string[],
    n: number,
    pick: () => number,
): Count {
    const g = Math.max(0, Math.min(4, Math.round(grade)));
    const one = (xs: readonly number[]): number =>
        xs[Math.floor(pick() * xs.length) % xs.length] ?? xs[0] ?? 1;
    for (const k of skills) {
        if (k.startsWith("number.negatives") && g >= 3) {
            const step = one([2, 3]);
            return { start: step * Math.ceil(n / 2), step: -step, places: 0 };
        }
        if (k.startsWith("decimals") && g >= 3) return { start: 0.2, step: 0.2, places: 1 };
        if (k.startsWith("multiplication") || k.startsWith("division")) {
            const step = one(TABLES[Math.max(2, g)] ?? [2]);
            return { start: step, step, places: 0 };
        }
        if (k.startsWith("place-value") && g >= 2) {
            const step = g >= 4 ? 1000 : g === 3 ? 100 : 10;
            return { start: step, step, places: 0 };
        }
        if (k.startsWith("time") && g >= 2) return { start: 5, step: 5, places: 0 };
        if (k.startsWith("money") && g >= 2) {
            const step = g >= 3 ? 25 : 10;
            return { start: step, step, places: 0 };
        }
    }
    if (g <= 1) return { start: one(g === 0 ? [1] : [1, 4, 9]), step: 1, places: 0 };
    const step = one(TABLES[g] ?? [2]);
    return { start: step, step, places: 0 };
}

/** How many dots not in the count stand beside a grade's picture, where the count leaves room for any. */
export const decoysFor = (grade: number): number => (grade <= 2 ? 3 : 4);

/** A world's round: its picture, the count the term's skills or the grade give, and its decoys. */
export function round(o: {
    world: string;
    grade: number;
    skills?: readonly string[];
    seed: number;
}): Round {
    const shape = shapeFor(o.world),
        n = SHAPES[shape].pts.length;
    const count = countFor(o.grade, o.skills ?? [], n, seeded(o.seed ^ 0x5bd1));
    return layout({ shape, count, decoys: decoysFor(o.grade), seed: o.seed });
}

/** Where the pencil is: the last dot it reached, and whether the line has come back to the first. */
export interface Joining {
    at: number;
    closed: boolean;
}
export const begin = (): Joining => ({ at: 0, closed: false });

export type Target = { dot: number } | { decoy: number };

/** The dot the pencil goes to next: the one after, or the first again to close the picture. */
export const nextDot = (r: Round, s: Joining): number => (s.at + 1) % r.dots.length;

export const labelOf = (r: Round, t: Target): string =>
    ("dot" in t ? r.dots[t.dot]?.label : r.decoys[t.decoy]?.label) ?? "";

/** A tap on a dot. Only the next dot joins; anything else is answered and changes nothing. */
export function tap(
    r: Round,
    s: Joining,
    t: Target,
): { s: Joining; said: string; joined: boolean } {
    const cur = r.dots[s.at]?.label ?? "",
        first = r.dots[0]?.label ?? "";
    if (s.closed)
        return { s, said: `The picture is finished. It is ${r.shape.name}.`, joined: false };
    const want = nextDot(r, s),
        ask = want === 0 ? `Join ${cur} back to ${first}.` : `What comes after ${cur}?`;
    if ("decoy" in t) {
        const d = r.decoys[t.decoy];
        return { s, said: d ? `${d.label} is not in the count. ${ask}` : ask, joined: false };
    }
    if (t.dot === want) {
        const closed = want === 0;
        return {
            s: { at: want, closed },
            said: closed
                ? `Back to ${first}. It is ${r.shape.name}.`
                : `${r.dots[want]?.label ?? ""}.`,
            joined: true,
        };
    }
    const d = r.dots[t.dot];
    if (!d) return { s, said: ask, joined: false };
    return {
        s,
        said: t.dot <= s.at ? `${d.label} is joined already. ${ask}` : `Not ${d.label} yet. ${ask}`,
        joined: false,
    };
}

/** The dot or decoy under a point in squares, within `reach`, nearest first. */
export function nearest(r: Round, x: number, y: number, reach = ROOM / 2): Target | null {
    let best: Target | null = null,
        bestD = reach;
    for (let i = 0; i < r.dots.length; i++) {
        const d = r.dots[i];
        const k = d ? Math.hypot(d.x - x, d.y - y) : Infinity;
        if (k <= bestD) {
            bestD = k;
            best = { dot: i };
        }
    }
    for (let i = 0; i < r.decoys.length; i++) {
        const d = r.decoys[i];
        const k = d ? Math.hypot(d.x - x, d.y - y) : Infinity;
        if (k <= bestD) {
            bestD = k;
            best = { decoy: i };
        }
    }
    return best;
}

/**
 * Four numbers to choose the next dot from, for a keyboard or a screen reader: the next dot and three
 * others, decoys first and then dots still to come, in an order the seed and the pencil decide.
 */
export function tray(r: Round, s: Joining, seed: number): Target[] {
    if (s.closed) return [];
    const pick = seeded(seed + s.at * 97),
        want = nextDot(r, s);
    const shuffle = <T>(xs: T[]): T[] => {
        for (let i = xs.length - 1; i > 0; i--) {
            const j = Math.floor(pick() * (i + 1)),
                a = xs[i],
                b = xs[j];
            if (a !== undefined && b !== undefined) {
                xs[i] = b;
                xs[j] = a;
            }
        }
        return xs;
    };
    const decoys: Target[] = shuffle(r.decoys.map((_, i) => ({ decoy: i })));
    const later: Target[] = shuffle(
        r.dots.map((_, i) => ({ dot: i })).filter((t) => t.dot !== want && t.dot > s.at),
    );
    return shuffle([{ dot: want }, ...[...decoys, ...later].slice(0, 3)]);
}

/** The round in words, for the text form and a screen reader. */
export function say(r: Round, s: Joining): string {
    const first = r.dots[0]?.label ?? "",
        last = r.dots.at(-1)?.label ?? "",
        d = r.decoys.length;
    const more = d
        ? `, and ${d === 1 ? "one more dot that is" : `${d} more dots that are`} not in the count`
        : "";
    const where = s.closed
        ? `The picture is finished. It is ${r.shape.name}.`
        : s.at === 0
          ? `The pencil is on ${first}.`
          : `The line is joined from ${first} to ${r.dots[s.at]?.label ?? ""}.`;
    return `Dots numbered from ${first} to ${last}${more}. ${where}`;
}
