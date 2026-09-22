// weigh: put a thing in a pan, or take one out, until the beam is level.
//
// This is the mechanic .docs/product.md names as the good case, and it is here first because it is
// the clearest example of the move being the mathematics: there is no arithmetic step separate
// from the move, and a child who plays it well has understood that two threes and one six are the
// same weight, because nothing else would let them play it well.
//
// Every move can be taken back, so the dead-end clause is met by retreat.
import type { Board, Chip, Contract, Mechanic } from "./games";

/** The props the balance drawing can put in a pan. */
export type Thing = "cube" | "ball" | "star" | "apple";
const THINGS: Thing[] = ["cube", "ball", "star", "apple"];

const NOUN: Record<Thing, [string, string]> = {
    cube: ["cube", "cubes"],
    ball: ["ball", "balls"],
    star: ["star", "stars"],
    apple: ["apple", "apples"],
};
const many = (k: Thing, n: number) => `${n} ${NOUN[k][n === 1 ? 0 : 1]}`;

/** A count per kind. Absent means none. */
export type Bag = Partial<Record<Thing, number>>;

export interface WeighVersion {
    /** Already in the left pan, and not the child's to move. */
    fixed: Thing[];
    /** What the child has to work with. */
    tray: Bag;
    /** What one of each kind weighs. The child is never told these numbers. */
    worth: Partial<Record<Thing, number>>;
    /** Whether the child may load one pan or both. Both is the harder version. */
    pans: "right" | "both";
    /** The balance drawing holds at most six props in a pan, so this is a drawing limit too. */
    capacity: number;
}

export interface WeighPos {
    /** What the child has added to each pan. The fixed props are not in here. */
    left: Bag;
    right: Bag;
    tray: Bag;
}

export type WeighMove = { take: false | true; kind: Thing; pan: "left" | "right" };

const count = (b: Bag): number => THINGS.reduce((s, k) => s + (b[k] ?? 0), 0);
const weight = (b: Bag, v: WeighVersion): number =>
    THINGS.reduce((s, k) => s + (b[k] ?? 0) * (v.worth[k] ?? 0), 0);
const fixedWeight = (v: WeighVersion): number => v.fixed.reduce((s, k) => s + (v.worth[k] ?? 0), 0);
const move1 = (b: Bag, k: Thing, by: number): Bag => {
    const out: Bag = { ...b };
    const n = (out[k] ?? 0) + by;
    if (n > 0) out[k] = n;
    else delete out[k];
    return out;
};
/** The props in a pan, in a fixed order, so the drawing does not shuffle between moves. */
const props = (b: Bag): Thing[] =>
    THINGS.flatMap((k) => Array.from({ length: b[k] ?? 0 }, () => k));
const withFixed = (b: Bag, v: WeighVersion): Bag => {
    const out: Bag = { ...b };
    for (const k of v.fixed) out[k] = (out[k] ?? 0) + 1;
    return out;
};
const show = (b: Bag): string => {
    const parts = THINGS.filter((k) => b[k]).map((k) => many(k, b[k] ?? 0));
    return parts.length ? parts.join(" and ") : "nothing";
};
const sides = (v: WeighVersion): ("left" | "right")[] =>
    v.pans === "both" ? ["left", "right"] : ["right"];

/**
 * How far the beam leans for a difference in weight, the right pan heavier being positive. A small
 * difference already shows and each more shows a little less, up to the drawing's steepest, so a child
 * can tell nearer from further and the beam guides a search rather than only saying which side is
 * heavier. The balance drawing turns a lean of 1 into eight degrees.
 */
const lean = (d: number): number => Math.sign(d) * Math.min(1.8, 0.5 * Math.sqrt(Math.abs(d)));

const CONTRACT: Contract = {
    draws: ["balance"],
    slots: {
        fixed: {
            doc: "What is already in the left pan, and not the child's to move.",
            from: THINGS.map((k) => `prop.${k}`),
            count: [1, 3],
        },
        tray: {
            doc: "What the child has to work with. Two kinds is enough to think about at grade one.",
            from: THINGS.map((k) => `prop.${k}`),
            count: [1, 3],
        },
    },
    settings: {
        pans: {
            doc: "Whether the child may load one pan or both.",
            kind: "pick",
            values: ["right", "both"],
        },
        worth: {
            doc: "What one of each kind weighs. The child is never told these numbers.",
            kind: "numbers",
            range: [1, 20],
        },
        count: { doc: "How many of each kind are in the tray.", kind: "numbers", range: [1, 9] },
    },
};

export const weigh: Mechanic<WeighVersion, WeighPos, WeighMove> = {
    id: "weigh",
    title: "Balance the pans",
    reversible: true,
    contract: CONTRACT,

    // A fill can be legal against the contract and still be nonsense: a heavy side nothing can
    // match, a tray of one kind whose weight does not divide the target, a capacity too small to
    // hold any answer. Each of these would search cleanly and prove unwinnable, and saying why is
    // more use to whoever wrote it than "no sequence of legal moves reaches a win".
    accepts: (v) => {
        const out: string[] = [];
        const kinds = THINGS.filter((k) => (v.tray[k] ?? 0) > 0);
        if (!v.fixed.length)
            out.push("fixed= needs at least one prop, or there is nothing to balance against");
        if (!kinds.length) out.push("tray= needs at least one kind of prop for the child to use");
        for (const k of new Set([...v.fixed, ...kinds])) {
            if (!v.worth[k]) out.push(`worth= does not say what a ${k} weighs`);
            else if ((v.worth[k] ?? 0) < 1)
                out.push(`a ${k} weighs ${v.worth[k]}, and a weight has to be at least 1`);
        }
        if (v.capacity < 1 || v.capacity > 6)
            out.push(
                `a pan holds at most 6 props in the drawing, so capacity=${v.capacity} cannot be drawn`,
            );
        const target = fixedWeight(v);
        const lightest = Math.min(...kinds.map((k) => v.worth[k] ?? Infinity));
        if (kinds.length && target > v.capacity * Math.max(...kinds.map((k) => v.worth[k] ?? 0))) {
            out.push(
                `the left pan weighs ${target}, which a pan of ${v.capacity} props from this tray cannot reach`,
            );
        }
        if (kinds.length && lightest > target)
            out.push(
                `the lightest prop in the tray weighs ${lightest}, more than the ${target} it has to match`,
            );
        return out;
    },

    goal: (v) =>
        v.pans === "both"
            ? "Make the beam level. You can load either pan."
            : "Make the beam level.",

    bounds: (v) => ({
        solution: v.pans === "both" ? [2, 5] : [2, 4],
        budget: 12,
        patience: 2.5,
        branch: 8,
        positions: 20000,
    }),

    start: (v) => ({ left: {}, right: {}, tray: { ...v.tray } }),

    moves: (s, v) => {
        const out: WeighMove[] = [];
        for (const pan of sides(v)) {
            const held = pan === "left" ? s.left : s.right;
            const room = v.capacity - count(held) - (pan === "left" ? v.fixed.length : 0);
            for (const kind of THINGS) {
                if ((s.tray[kind] ?? 0) > 0 && room > 0) out.push({ take: false, kind, pan });
            }
        }
        for (const pan of sides(v)) {
            const held = pan === "left" ? s.left : s.right;
            for (const kind of THINGS)
                if ((held[kind] ?? 0) > 0) out.push({ take: true, kind, pan });
        }
        return out;
    },

    apply: (s, m) => {
        const held = m.pan === "left" ? s.left : s.right;
        const by = m.take ? -1 : 1;
        const pan = move1(held, m.kind, by);
        return {
            left: m.pan === "left" ? pan : s.left,
            right: m.pan === "right" ? pan : s.right,
            tray: move1(s.tray, m.kind, -by),
        };
    },

    // Level, and not level because both pans are empty. The fixed prop is on the left, so the right
    // pan holding nothing is never a win.
    won: (s, v) => count(s.right) > 0 && weight(s.left, v) + fixedWeight(v) === weight(s.right, v),

    key: (s) =>
        [s.left, s.right, s.tray].map((b) => THINGS.map((k) => b[k] ?? 0).join("")).join("|"),

    say: (s, v) => {
        const l = weight(s.left, v) + fixedWeight(v),
            r = weight(s.right, v);
        const beam =
            l === r
                ? "The beam is level."
                : l > r
                  ? "The left pan is heavier."
                  : "The right pan is heavier.";
        return `The left pan holds ${show(withFixed(s.left, v))}. The right pan holds ${show(s.right)}. ${beam}`;
    },

    sayMove: (m) => {
        const noun = NOUN[m.kind][0];
        return m.take
            ? `Take a ${noun} out of the ${m.pan} pan`
            : `Put a ${noun} in the ${m.pan} pan`;
    },

    board: (s, v): Board => {
        const l = weight(s.left, v) + fixedWeight(v),
            r = weight(s.right, v);
        return {
            parts: [
                {
                    art: "balance",
                    params: {
                        left: [...v.fixed, ...props(s.left)],
                        right: props(s.right),
                        tilt: lean(r - l),
                        label: "",
                    },
                },
            ],
        };
    },

    chip: (m, v): Chip => ({
        art: `prop.${m.kind}`,
        params: {},
        note: v.pans === "both" ? `${m.pan} pan` : undefined,
        group: m.take ? "Take one out" : "Put one in",
    }),
};
