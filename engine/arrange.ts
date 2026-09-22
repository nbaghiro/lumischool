// An answer the child makes on the drawing rather than writes: where weights stand on a see-saw
// plank, where the cuts go along a cake. A part that takes one lists every arrangement a child can
// hand in and works out the measures an item's answer and feedback are written over, with the maths
// of motion/lever.ts and motion/cuts.ts, so the verifier walks every arrangement of every variant and
// a page judges the one the child made. The layouts say where each piece and place is drawn, in
// squares of the part's box, which the drawing and the buttons over it share.

import type { Given } from "./answer";
import { evaluate, num, type Env, type Expr } from "./expr";
import { piecesOf, sizeOf } from "./motion/cuts";
import { lean, turning, type Load } from "./motion/lever";

/** One thing the child put somewhere: which piece, and where along the part, in the part's own unit. */
export type Place = Extract<Given, { k: "arranged" }>["places"][number];
export type Arrangement = Place[];
/** A part's settings as a scene carries them. */
type Values = Record<string, unknown>;
export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** A part set up for one variant: everything the verifier and the page ask of an arrangement. */
export interface Board {
    /** How many arrangements there are, known before any is listed. */
    count: number;
    /** Every arrangement a child can hand in, in a fixed order. A board with nothing done to it is not one. */
    arrangements(): Arrangement[];
    legal(a: Arrangement): string | null;
    measure(a: Arrangement): Env;
    /** The whole board in words, for the screen reader after every move. */
    say(a: Arrangement): string;
    /** Only what the child did, for the answer key: "cuts 4 and 8 squares from the left end". */
    placing(a: Arrangement): string;
    /** What the drawing shows once it is let go. */
    after(a: Arrangement): string;
}

export interface Part {
    /** The names an item's answer and feedback may read, and what each one is. */
    measures: Record<string, string>;
    board(v: Values): Board | string;
}

/** The most arrangements one variant may have. Past it a part is refused, never sampled. */
export const MOST = 20_000;
/** The share of arrangements that may be right, so that putting pieces anywhere seldom answers it. */
export const LUCK = 1 / 4;

const isWhole = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x);
const wholes = (x: unknown): number[] | null => (Array.isArray(x) && x.every(isWhole) ? x : null);
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const listed = (xs: string[]): string =>
    xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1] ?? ""}` : (xs[0] ?? "");

export interface Plank {
    steps: number;
    /** Squares between one step and the next. */
    gap: number;
    load: number;
    /** The load's step, less than nought on the left. */
    loadAt: number;
    bags: number[];
    /** The steps a weight may stand on, left to right. */
    open: number[];
    /** How many weights one step holds. */
    most: number;
}

export function plankOf(v: Values): Plank | string {
    const steps = v.steps ?? 3,
        gap = v.apart ?? 4,
        load = v.load,
        loadAt = v["load-at"],
        most = v.most ?? 2;
    const bags = wholes(v.bags);
    if (!isWhole(steps) || steps < 1 || steps > 4)
        return "steps= is how many steps each side, 1 to 4";
    if (!isWhole(gap) || gap < 3 || gap > 5) return "apart= is 3 to 5 squares between steps";
    if (!isWhole(load) || load < 1 || load > 20)
        return "load= is a whole number of kilograms, 1 to 20";
    if (!isWhole(loadAt) || loadAt === 0 || Math.abs(loadAt) > steps)
        return `load-at= is a step 1 to ${steps} out, less than nought on the left`;
    if (!bags || !bags.length || bags.length > 5) return "bags= lists one to five weights";
    if (bags.some((b) => b < 1 || b > 12))
        return "every weight in bags= is a whole number of kilograms, 1 to 12";
    const every = [
        ...Array.from({ length: steps }, (_, i) => i - steps),
        ...Array.from({ length: steps }, (_, i) => i + 1),
    ];
    const open = v.open === undefined ? every : wholes(v.open);
    if (
        !open ||
        !open.length ||
        open.some((s) => s === 0 || Math.abs(s) > steps) ||
        new Set(open).size !== open.length
    )
        return `open= lists different steps 1 to ${steps} out, less than nought on the left`;
    if (!isWhole(most) || most < 1 || most > 3)
        return "most= is how many weights one step holds, 1 to 3";
    return { steps, gap, load, loadAt, bags, open: [...open].sort((a, b) => a - b), most };
}

export const bagPiece = (i: number): string => `bag(${i})`;
export const bagIndex = (piece: string): number | null => {
    const m = /^bag\((\d+)\)$/.exec(piece);
    return m ? Number(m[1]) : null;
};
const sideWord = (s: number): string => (s < 0 ? "left" : "right");
const kilos = (kgs: number[]): string =>
    `${listed(kgs.map(String))} ${kgs.length === 1 && kgs[0] === 1 ? "kilogram" : "kilograms"}`;
const bagKg = (p: Plank, piece: string): number => p.bags[bagIndex(piece) ?? -1] ?? 0;

/** The load and every weight on the plank, as lever.ts takes them. */
const loadsOf = (p: Plank, a: Arrangement): Load[] => [
    { mass: p.load, at: p.loadAt },
    ...a.map((x) => ({ mass: bagKg(p, x.piece), at: x.at })),
];

/** The most a plank leans either way in a question, less than a game's so the stacks stay on the page. */
const LEAN = 0.12;
/** The angle the plank rests at once its props are taken away, the way lever.ts leans a plank. */
export const plankRest = (p: Plank, a: Arrangement): number =>
    lean(turning(loadsOf(p, a)), { per: 0.03, most: LEAN });

export function plankBoard(p: Plank): Board {
    const byStep = (a: Arrangement): Map<number, number[]> => {
        const out = new Map<number, number[]>();
        for (const x of a) out.set(x.at, [...(out.get(x.at) ?? []), bagKg(p, x.piece)]);
        return out;
    };
    const steps = (a: Arrangement): string[] =>
        [...byStep(a)]
            .sort((x, y) => x[0] - y[0])
            .map(([s, kgs]) => `${kilos(kgs)} on step ${Math.abs(s)} on the ${sideWord(s)}`);
    return {
        count: (p.open.length + 1) ** p.bags.length,
        arrangements() {
            const out: Arrangement[] = [],
                at = p.bags.map(() => 0);
            const walk = (i: number): void => {
                if (i === p.bags.length) {
                    const a = at.flatMap((s, j) =>
                        s === 0 ? [] : [{ piece: bagPiece(j), at: s }],
                    );
                    if (a.length) out.push(a);
                    return;
                }
                for (const s of [0, ...p.open]) {
                    if (s !== 0 && at.slice(0, i).filter((x) => x === s).length >= p.most) continue;
                    at[i] = s;
                    walk(i + 1);
                }
                at[i] = 0;
            };
            walk(0);
            return out;
        },
        legal(a) {
            if (!a.length) return "nothing is on the plank";
            const seen = new Set<number>();
            for (const x of a) {
                const i = bagIndex(x.piece);
                if (i === null || i >= p.bags.length) return `there is no weight "${x.piece}"`;
                if (seen.has(i)) return `${x.piece} is in two places`;
                seen.add(i);
                if (!p.open.includes(x.at)) return `a weight cannot stand on step ${x.at}`;
            }
            for (const [s, kgs] of byStep(a))
                if (kgs.length > p.most)
                    return `step ${Math.abs(s)} on the ${sideWord(s)} holds ${p.most}`;
            return null;
        },
        measure(a) {
            const loads = loadsOf(p, a),
                on = (s: number) => loads.filter((l) => Math.sign(l.at) === s);
            return {
                turning: num(turning(loads)),
                left: num(-turning(on(-1))),
                right: num(turning(on(1))),
                leftkg: num(sum(on(-1).map((l) => l.mass))),
                rightkg: num(sum(on(1).map((l) => l.mass))),
                onleft: num(a.filter((x) => x.at < 0).length),
                onright: num(a.filter((x) => x.at > 0).length),
                placed: num(a.length),
                grass: num(p.bags.length - a.length),
            };
        },
        say(a) {
            const grass = p.bags.filter((_, i) => !a.some((x) => bagIndex(x.piece) === i));
            return [
                `A ${p.load} kilogram weight stands on step ${Math.abs(p.loadAt)} on the ${sideWord(p.loadAt)}.`,
                ...steps(a).map((s) => `On the plank: ${s}.`),
                grass.length ? `On the grass: ${kilos(grass)}.` : "Every weight is on the plank.",
            ].join(" ");
        },
        placing: (a) => listed(steps(a)),
        after(a) {
            const t = turning(loadsOf(p, a));
            return t === 0
                ? "The plank stays level."
                : `The plank goes down on the ${t < 0 ? "left" : "right"}.`;
        },
    };
}

/** Where everything goes inside a plank's box, in squares. Shared by the drawing, the layout and the page. */
export interface PlankLayout {
    box: { w: number; h: number };
    /** The middle of the plank, across. */
    mid: number;
    /** The top line of the plank when it is level, which is where a weight's foot stands. */
    top: number;
    pivot: number;
    ground: number;
    stepX: (s: number) => number;
    /** A weight's drawn box, its body's height, the foot inside it, and the part of the masses drawing it crops. */
    weight: (kg: number) => { w: number; h: number; body: number; foot: number; crop: Box };
    /** Each weight's place on the grass, in order: the place stays when the weight is on the plank. */
    grass: Box[];
    /** The row under the grass where the paper says how to answer. */
    caption: number;
}

/** The masses drawing (capacity's `masses`) sizes a mass by its cube root; these are its formulas. */
const massBody = (kg: number): { w: number; h: number } => ({
    w: 1.45 + 1.75 * Math.cbrt(kg),
    h: 1.4 + 1.4 * Math.cbrt(kg),
});
const HANDLE = 0.59,
    FOOT = 0.12,
    STACK = 0.15;

export function plankLayout(p: Plank): PlankLayout {
    const weight = (kg: number): ReturnType<PlankLayout["weight"]> => {
        const m = massBody(kg),
            crop = { x: 0.32, y: 6.6 - m.h - HANDLE, w: m.w + 0.36, h: m.h + HANDLE + FOOT };
        return { w: crop.w, h: crop.h, body: m.h, foot: FOOT, crop };
    };
    const reach = p.steps * p.gap + 1;
    const rise = Math.ceil(reach * Math.sin(LEAN) * 2) / 2;
    const tallest = [...new Set([...p.open, p.loadAt])].map((s) => {
        const bodies = [
            ...(s === p.loadAt ? [p.load] : []),
            ...(p.open.includes(s) ? [...p.bags].sort((a, b) => b - a).slice(0, p.most) : []),
        ];
        return sum(bodies.map((kg) => massBody(kg).h + STACK)) - STACK + HANDLE + FOOT;
    });
    const top = 0.5 + rise + Math.max(...tallest);
    const pivot = top + 0.38,
        ground = pivot + 5.6;
    const sizes = p.bags.map(weight),
        row = sum(sizes.map((s) => s.w)) + 0.8 * (sizes.length - 1);
    const plankW = 2 * p.steps * p.gap + 2;
    const w = Math.ceil(Math.max(plankW, row + 1));
    const mid = w / 2,
        deepest = Math.max(...sizes.map((s) => s.h));
    let x = mid - row / 2;
    const grass = sizes.map((s) => {
        const b = { x, y: ground + 1 + deepest - s.h, w: s.w, h: s.h };
        x += s.w + 0.8;
        return b;
    });
    const caption = ground + 1.5 + deepest;
    return {
        box: { w, h: Math.ceil(caption + 2) },
        mid,
        top,
        pivot,
        ground,
        stepX: (s) => mid + s * p.gap,
        weight,
        grass,
        caption,
    };
}

/** Where the load and each weight on the plank are drawn when it is level: stacked on their steps, the load first. */
export function plankStacks(
    p: Plank,
    L: PlankLayout,
    a: Arrangement,
): { piece: string; kg: number; at: number; box: Box }[] {
    const out: { piece: string; kg: number; at: number; box: Box }[] = [];
    const steps = [...new Set([p.loadAt, ...a.map((x) => x.at)])];
    for (const s of steps) {
        let foot = L.top;
        const here = [
            ...(s === p.loadAt ? [{ piece: "load", kg: p.load }] : []),
            ...a
                .filter((x) => x.at === s)
                .map((x) => ({ piece: x.piece, kg: bagKg(p, x.piece) || 1 })),
        ];
        for (const h of here) {
            const wb = L.weight(h.kg);
            out.push({
                ...h,
                at: s,
                box: { x: L.stepX(s) - wb.w / 2, y: foot + wb.foot - wb.h, w: wb.w, h: wb.h },
            });
            foot -= wb.body + STACK;
        }
    }
    return out;
}

/** The areas a plank's anchors name, for a pen loop and for the buttons over it. */
export function plankAreas(p: Plank, L: PlankLayout, a: Arrangement): Record<string, Box> {
    const half = p.steps * p.gap + 1,
        above = 0.5,
        deep = L.top + 1.4 - above;
    // A side is what stands on it and its half of the plank, so a pen loop goes round the weights and not the sky.
    const stacks = plankStacks(p, L, a);
    const side = (sign: number): Box => {
        const high =
            Math.min(
                L.top - 2,
                ...stacks.filter((x) => Math.sign(x.at) === sign).map((x) => x.box.y),
            ) - 0.3;
        return { x: sign < 0 ? L.mid - half : L.mid, y: high, w: half, h: L.top + 1.4 - high };
    };
    const out: Record<string, Box> = {
        left: side(-1),
        right: side(1),
        pivot: { x: L.mid - 1.5, y: L.pivot - 1, w: 3, h: 2 },
        grass: {
            x: Math.min(...L.grass.map((g) => g.x)) - 0.4,
            y: L.ground + 0.6,
            w: sum(L.grass.map((g) => g.w)) + 0.8 * L.grass.length,
            h: L.caption - L.ground - 0.6,
        },
    };
    for (let k = 1; k <= p.steps; k++) {
        out[`left(${k})`] = { x: L.stepX(-k) - p.gap / 2, y: above, w: p.gap, h: deep };
        out[`right(${k})`] = { x: L.stepX(k) - p.gap / 2, y: above, w: p.gap, h: deep };
    }
    const load = stacks.find((x) => x.piece === "load");
    if (load) out.load = load.box;
    const t = turning(loadsOf(p, a));
    const heavy = t < 0 ? out.left : t > 0 ? out.right : out.pivot;
    if (heavy) out.heavy = heavy;
    return out;
}

export interface Cutting {
    /** Squares long. */
    whole: number;
    into: number;
    /** The most cuts a child may make. */
    most: number;
    /** Where a cut can land: every square, or every half square. */
    snap: 1 | 0.5;
    candles: number;
}

export function cuttingOf(v: Values): Cutting | string {
    const whole = v.whole,
        into = v.into,
        most = v.most ?? v.into,
        snap = v.snap ?? 1,
        candles = v.candles ?? 0;
    if (!isWhole(whole) || whole < 4 || whole > 30)
        return "whole= is how many squares long, 4 to 30";
    if (!isWhole(into) || into < 2 || into > 8) return "into= is how many shares, 2 to 8";
    if (!isWhole(most) || most < into - 1 || most > 8)
        return `most= is the most cuts, at least the ${into - 1} that ${into} shares need, and no more than 8`;
    if (snap !== 1 && snap !== 0.5)
        return "snap= is 1 or 1/2: a cut lands on a square's line, or halfway along one";
    if (!isWhole(candles) || candles < 0 || candles > 24) return "candles= is 0 to 24";
    return { whole, into, most, snap, candles };
}

export const CUT = "cut";
const squaresWord = (n: number): string => `${n} ${n === 1 ? "square" : "squares"}`;

export function cutBoard(s: Cutting): Board {
    const per = s.snap === 1 ? 1 : 2,
        places = s.whole * per - 1;
    const units = (a: Arrangement): number[] =>
        a.map((x) => Math.round(x.at * per)).sort((x, y) => x - y);
    const sizes = (a: Arrangement): number[] => piecesOf(s.whole * per, units(a)).map(sizeOf);
    const choose = (n: number, k: number): number => {
        let c = 1;
        for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
        return Math.round(c);
    };
    return {
        count: sum(Array.from({ length: s.most }, (_, k) => choose(places, k + 1))),
        arrangements() {
            const out: Arrangement[] = [];
            const walk = (from: number, chosen: number[], size: number): void => {
                if (chosen.length === size) {
                    out.push(chosen.map((u) => ({ piece: CUT, at: u / per })));
                    return;
                }
                for (let u = from; u <= places; u++) walk(u + 1, [...chosen, u], size);
            };
            for (let size = 1; size <= s.most; size++) walk(1, [], size);
            return out;
        },
        legal(a) {
            if (!a.length) return "the cake has not been cut";
            if (a.length > s.most) return `the cake takes ${s.most} cuts`;
            if (
                a.some(
                    (x) =>
                        x.piece !== CUT ||
                        !Number.isInteger(x.at * per) ||
                        x.at <= 0 ||
                        x.at >= s.whole,
                )
            )
                return "a cut is inside the cake, on a square's line or halfway along one";
            if (new Set(a.map((x) => x.at)).size !== a.length)
                return "two cuts are in the same place";
            return null;
        },
        measure(a) {
            const got = sizes(a),
                wholeUnits = s.whole * per;
            // Exact: a piece is off its share by |size * into - whole| / (into * per) squares.
            const off = Math.max(...got.map((z) => Math.abs(z * s.into - wholeUnits)));
            return {
                pieces: num(got.length),
                cuts: num(a.length),
                share: num(s.whole, s.into),
                smallest: num(Math.min(...got), per),
                biggest: num(Math.max(...got), per),
                off: num(off, s.into * per),
            };
        },
        say(a) {
            if (!a.length) return `The cake is ${squaresWord(s.whole)} long and has not been cut.`;
            const cuts = units(a).map((u) => String(u / per)),
                got = sizes(a).map((z) => String(z / per));
            return `The cake is ${squaresWord(s.whole)} long. It is cut ${listed(cuts)} squares from the left end, into ${got.length} pieces of ${listed(got)} squares.`;
        },
        placing: (a) =>
            `${a.length === 1 ? "a cut" : "cuts"} ${listed(units(a).map((u) => String(u / per)))} squares from the left end`,
        after(a) {
            const got = sizes(a).map((z) => z / per);
            return new Set(got).size === 1
                ? `${got.length} pieces, each ${squaresWord(got[0] ?? 0)} long.`
                : `${got.length} pieces, ${listed(got.map(String))} squares long.`;
        },
    };
}

/** How far pieces part once they are cut, in squares, so each one can be seen. */
export const PART = 0.4;

export interface CutLayout {
    box: { w: number; h: number };
    /** Where a piece's drawing starts across, for the piece that begins `from` squares along, after `before` cuts. */
    pieceX: (from: number, before: number) => number;
    /** The row under the cake where a piece's length is written once it is let go. */
    sizes: number;
    caption: number;
}

export function cutLayout(s: Cutting): CutLayout {
    return {
        box: { w: Math.ceil(s.whole + s.most * PART + 1), h: 10 },
        pieceX: (from, before) => from + before * PART,
        sizes: 6.2,
        caption: 8,
    };
}

/** The boxes of the biggest and smallest pieces, and the cake's own anchors, for a pen loop. */
export function cutAreas(s: Cutting, L: CutLayout, a: Arrangement): Record<string, Box> {
    const cuts = a.map((x) => x.at).sort((x, y) => x - y);
    const pieces = piecesOf(s.whole, cuts).map((pc, i) => ({
        size: sizeOf(pc),
        box: { x: L.pieceX(pc.from, i) + 0.5, y: 2.6, w: sizeOf(pc), h: 3.4 },
    }));
    const whole = { x: 0.5, y: 2.6, w: s.whole + cuts.length * PART, h: 3.4 };
    const by = (pick: (x: number, y: number) => boolean): Box =>
        pieces.reduce(
            (best, pc) => (pick(pc.size, best.size) ? pc : best),
            pieces[0] ?? { size: 0, box: whole },
        ).box;
    return {
        top: { ...whole, h: 1 },
        left: { x: 0, y: 2.6, w: 2, h: 3.4 },
        right: { x: whole.x + whole.w - 1.5, y: 2.6, w: 2, h: 3.4 },
        biggest: by((x, y) => x > y),
        smallest: by((x, y) => x < y),
    };
}

export const ARRANGED: Record<string, Part> = {
    "balance-plank": {
        measures: {
            turning: "the right side's turning effect less the left side's, so level is nought",
            left: "weight times step on the left, the load included",
            right: "weight times step on the right, the load included",
            leftkg: "kilograms on the left, the load included",
            rightkg: "kilograms on the right, the load included",
            onleft: "weights the child stood on the left",
            onright: "weights the child stood on the right",
            placed: "weights on the plank",
            grass: "weights still on the grass",
        },
        board: (v) => {
            const p = plankOf(v);
            return typeof p === "string" ? p : plankBoard(p);
        },
    },
    "fair-cut": {
        measures: {
            pieces: "how many pieces the cake is in",
            cuts: "how many cuts were made",
            share: "one share of the whole, in squares",
            smallest: "the smallest piece, in squares",
            biggest: "the biggest piece, in squares",
            off: "how far the piece furthest from a share is from it, in squares",
        },
        board: (v) => {
            const s = cuttingOf(v);
            return typeof s === "string" ? s : cutBoard(s);
        },
    },
};

/** A feedback rule as the verifier and the pack both write one: a condition, and rules of its own read after it. */
export interface Ruled {
    when: Expr;
    children: this[];
}

const flat = <R extends Ruled>(rules: readonly R[]): R[] =>
    rules.flatMap((r) => [r, ...flat(r.children)]);
const truth = (e: Expr, env: Env): boolean => {
    const v = evaluate(e, env);
    if (v.k !== "bool") throw new Error("a condition on an arrangement has to be true or false");
    return v.v;
};

export interface Proof<R extends Ruled> {
    /** The right arrangement the key draws: the fewest pieces moved, then the nearest the pivot or the left end. */
    key: Arrangement | null;
    right: number;
    tried: number;
    /** Wrong arrangements that some feedback rule speaks to. */
    spoken: number;
    problems: string[];
    fired: Set<R>;
    /** Each rule that is true for a right arrangement, with the first such arrangement. */
    onRight: Map<R, Arrangement>;
}

/** Walks every arrangement of one variant: the answer, every feedback rule, and each arrangement's legality. */
export function prove<R extends Ruled>(
    board: Board,
    env: Env,
    answer: Expr,
    rules: readonly R[],
): Proof<R> {
    const out: Proof<R> = {
        key: null,
        right: 0,
        tried: 0,
        spoken: 0,
        problems: [],
        fired: new Set(),
        onRight: new Map(),
    };
    if (board.count > MOST) {
        out.problems.push(
            `the part can be arranged ${board.count} ways, more than the ${MOST} the verifier walks; give it fewer pieces, places or cuts`,
        );
        return out;
    }
    const all = flat(rules),
        rights: Arrangement[] = [];
    try {
        for (const a of board.arrangements()) {
            out.tried++;
            const bad = board.legal(a);
            if (bad) {
                out.problems.push(`the part lists an arrangement it does not allow: ${bad}`);
                return out;
            }
            const e = { ...env, ...board.measure(a) };
            const ok = truth(answer, e);
            const hits = all.filter((r) => truth(r.when, e));
            if (ok) {
                out.right++;
                rights.push(a);
                for (const r of hits) if (!out.onRight.has(r)) out.onRight.set(r, a);
            } else {
                if (hits.length) out.spoken++;
                for (const r of hits) out.fired.add(r);
            }
        }
    } catch (error) {
        out.problems.push(error instanceof Error ? error.message : String(error));
        return out;
    }
    if (!out.right)
        out.problems.push(
            "no arrangement a child can make is right, so the question cannot be answered",
        );
    else if (out.right > out.tried * LUCK)
        out.problems.push(
            `${out.right} of the ${out.tried} arrangements a child can make are right, more than one in four, so putting pieces anywhere answers it too often`,
        );
    const cost = (a: Arrangement): [number, number] => [
        a.length,
        sum(a.map((x) => Math.abs(x.at))),
    ];
    out.key =
        rights.sort((x, y) => {
            const [a, b] = [cost(x), cost(y)];
            return a[0] - b[0] || a[1] - b[1];
        })[0] ?? null;
    return out;
}

/** What the page tells the child for an arrangement: whether it is right, and the first rule that speaks to it. */
export function judge<R extends Ruled>(
    board: Board,
    env: Env,
    answer: Expr,
    rules: readonly R[],
    a: Arrangement,
): { right: boolean; rule: R | null; env: Env } {
    const e = { ...env, ...board.measure(a) };
    const right = truth(answer, e);
    const first = (rs: readonly R[]): R | null => {
        for (const r of rs) {
            if (truth(r.when, e)) return r;
            const deeper = first(r.children);
            if (deeper) return deeper;
        }
        return null;
    };
    return { right, rule: right ? null : first(rules), env: e };
}
