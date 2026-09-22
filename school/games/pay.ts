// pay: take a coin out of the drawer or put one back, until the counter comes to the price.
//
// The money mechanic, and the one nearest to the balance: something is put down, something is taken
// back, and the board says whether it is right yet. What makes it a different game is that the
// things are not interchangeable and their values are not the child's to see. A quarter and two
// dimes and a nickel come to the same place by different routes, and the drawer only holds what it
// holds, so a child who has spent the dimes has to find another way to fifty.
//
// The limit on how many coins may lie on the counter is what turns it from stacking into thinking.
// Sixty-five cents in pennies is not a wrong answer, it is a child not yet using the coins; asking
// for it in four coins is asking for twenty-five and twenty-five and ten and five, and there is no
// way to find that except by knowing what the coins are worth.
//
// The second framing is change, which is the same mechanic and a different sentence: the tag says
// the price, the note says what was handed over, and what has to be built is the difference. That
// is the counting-up method the shelf already draws for paper, done as an action.
//
// Reversible, so a coin put down in hope is a coin that can go back.
import type { Board, BoardPart, Chip, Contract, Mechanic } from "./games";

/** The pieces the money drawings can draw: four coins and two notes. */
export type Piece = "quarter" | "dime" | "nickel" | "penny" | "1" | "5";
const PIECES: Piece[] = ["5", "1", "quarter", "dime", "nickel", "penny"];
export const WORTH: Record<Piece, number> = {
    "5": 500,
    "1": 100,
    quarter: 25,
    dime: 10,
    nickel: 5,
    penny: 1,
};
const NAMES: Record<Piece, string> = {
    "5": "five dollar note",
    "1": "dollar note",
    quarter: "quarter",
    dime: "dime",
    nickel: "nickel",
    penny: "penny",
};

/** How many of each piece there are. Absent means none. */
export type Tray = Partial<Record<Piece, number>>;

export interface PayVersion {
    /** What the tag says, in cents. */
    price: number;
    /** What was handed over, in cents, or nought when the round is making the price itself. */
    paid: number;
    /** What the drawer holds. */
    drawer: Tray;
    /** The most pieces that may lie on the counter, which is what makes it a puzzle. */
    most: number;
}

export interface PayPos {
    /** What is on the counter. */
    on: Tray;
}

export type PayMove = { take: boolean; piece: Piece };

/** What has to be on the counter: the price, or the change from what was handed over. */
export const wanted = (v: PayVersion): number => (v.paid ? v.paid - v.price : v.price);
const value = (t: Tray): number => PIECES.reduce((s, k) => s + (t[k] ?? 0) * WORTH[k], 0);
const count = (t: Tray): number => PIECES.reduce((s, k) => s + (t[k] ?? 0), 0);
const shift = (t: Tray, k: Piece, by: number): Tray => {
    const out: Tray = { ...t };
    const n = (out[k] ?? 0) + by;
    if (n > 0) out[k] = n;
    else delete out[k];
    return out;
};
/** The pieces of a tray, largest first, which is the order the money drawing lays them out in. */
const spread = (t: Tray): Piece[] =>
    PIECES.flatMap((k) => Array.from({ length: t[k] ?? 0 }, () => k));
const money = (cents: number): string =>
    cents >= 100 || cents % 100 === 0 ? `$${(cents / 100).toFixed(2)}` : `${cents}¢`;

/**
 * Whether the amount can be made at all from this drawer within the limit. The prover would find
 * out by search and report that no sequence of moves wins, which is true and tells whoever wrote
 * the activity nothing; this says the drawer is the problem.
 */
function makeable(v: PayVersion): boolean {
    const target = wanted(v);
    const kinds = PIECES.filter((k) => (v.drawer[k] ?? 0) > 0);
    const walk = (i: number, left: number, coins: number): boolean => {
        if (left === 0) return coins > 0;
        if (i >= kinds.length || coins >= v.most || left < 0) return false;
        const k = kinds[i];
        if (k === undefined) return false;
        const have = v.drawer[k] ?? 0;
        for (let n = Math.min(have, v.most - coins, Math.floor(left / WORTH[k])); n >= 0; n--) {
            if (walk(i + 1, left - n * WORTH[k], coins + n)) return true;
        }
        return false;
    };
    return walk(0, target, 0);
}

/**
 * An amount as the fewest pieces that make it, biggest first, which is how somebody hands over a
 * note and how the drawing lays money out. It is only used to draw what was paid with, so greedy
 * is right here: the amounts on a tag are the ones a purse actually holds.
 */
function fewest(cents: number): Tray {
    const out: Tray = {};
    let left = cents;
    for (const k of PIECES) {
        const n = Math.floor(left / WORTH[k]);
        if (n > 0) {
            out[k] = n;
            left -= n * WORTH[k];
        }
    }
    return out;
}

/** The ladder beside the counter: a scale the target and the total can both be read off. */
const ladder = (target: number): { to: number; step: number } => {
    const step = target <= 50 ? 10 : target <= 100 ? 20 : target <= 200 ? 50 : 100;
    return { to: Math.ceil(target / step) * step + step, step };
};

const CONTRACT: Contract = {
    draws: ["pricetag", "money", "till", "ladder"],
    slots: {},
    settings: {
        price: { doc: "What the tag says, in cents.", kind: "number", range: [1, 2000] },
        paid: {
            doc: "What was handed over, in cents, or nought when the round is making the price itself.",
            kind: "number",
            range: [0, 2000],
        },
        drawer: {
            doc: "How many of each piece the drawer holds, by name.",
            kind: "numbers",
            range: [0, 9],
        },
        most: {
            doc: "The most pieces that may lie on the counter, which is the whole difficulty.",
            kind: "number",
            range: [1, 8],
        },
    },
};

export const pay: Mechanic<PayVersion, PayPos, PayMove> = {
    id: "pay",
    title: "Make the amount",
    reversible: true,
    contract: CONTRACT,

    accepts: (v) => {
        const out: string[] = [];
        const target = wanted(v);
        if (v.price < 1) out.push("the tag has to say something");
        if (v.paid && v.paid <= v.price)
            out.push(
                `${money(v.paid)} was handed over for something costing ${money(v.price)}, so there is no change to make`,
            );
        if (target < 1) out.push("there is nothing to make");
        if (v.most < 1) out.push("with nothing allowed on the counter there is no move");
        if (v.most > 8)
            out.push(
                `${v.most} pieces on a counter is more than the drawing lays out or a child counts`,
            );
        const kinds = PIECES.filter((k) => (v.drawer[k] ?? 0) > 0);
        if (kinds.length < 2)
            out.push("a drawer of one kind of coin makes the amount by counting, not by choosing");
        for (const k of Object.keys(v.drawer) as Piece[]) {
            if (!PIECES.includes(k))
                out.push(
                    `the drawer holds "${k}", which is not a piece the money drawings can draw`,
                );
            else if ((v.drawer[k] ?? 0) > 9)
                out.push(
                    `nine of a kind is as many as the drawer shows, and this holds ${v.drawer[k]} ${k}s`,
                );
        }
        if (value(v.drawer) < target)
            out.push(
                `the whole drawer comes to ${money(value(v.drawer))}, less than the ${money(target)} it has to make`,
            );
        else if (!makeable(v)) {
            out.push(
                `${money(target)} cannot be made from this drawer in ${v.most} piece${v.most === 1 ? "" : "s"}, so the version has no answer`,
            );
        }
        if (
            kinds.some((k) => WORTH[k] > target) &&
            kinds.filter((k) => WORTH[k] <= target).length < 2
        ) {
            out.push(
                "all but one of the pieces in the drawer are worth more than the amount, so there is nothing to choose between",
            );
        }
        return out;
    },

    goal: (v) =>
        v.paid
            ? `Put the change on the counter: ${money(v.price)} was paid for with ${money(v.paid)}. Use ${v.most} pieces or fewer.`
            : `Put exactly ${money(v.price)} on the counter, in ${v.most} pieces or fewer.`,

    bounds: (v) => ({
        solution: [2, v.most],
        budget: v.most * 3,
        patience: 1.5,
        branch: 12,
        positions: 20000,
    }),

    start: () => ({ on: {} }),

    // Taking a piece out of the drawer and putting one back, in one fixed order: the pieces largest
    // first, then the ones that can go back. The limit is a limit on the counter rather than on the
    // moves, so a child who has filled it can still change their mind.
    moves: (s, v) => {
        const out: PayMove[] = [];
        const room = count(s.on) < v.most;
        for (const piece of PIECES) {
            const left = (v.drawer[piece] ?? 0) - (s.on[piece] ?? 0);
            if (room && left > 0) out.push({ take: true, piece });
        }
        for (const piece of PIECES) if ((s.on[piece] ?? 0) > 0) out.push({ take: false, piece });
        return out;
    },

    apply: (s, m) => ({ on: shift(s.on, m.piece, m.take ? 1 : -1) }),

    won: (s, v) => count(s.on) > 0 && value(s.on) === wanted(v),

    key: (s) => PIECES.map((k) => s.on[k] ?? 0).join(","),

    say: (s, v) => {
        const target = wanted(v);
        const total = value(s.on);
        const pieces = spread(s.on);
        const list = pieces.length ? pieces.map((k) => NAMES[k]).join(", ") : "nothing";
        // How far off, and deliberately not by how much. The board says the same thing the same way:
        // the peg on the ladder is above the price or below it. Working out the difference is the
        // arithmetic the activity is about, and a mechanic that prints it has done the move for the
        // child. In the change round even the amount wanted is left out, because that subtraction is
        // the whole question.
        const how =
            total === target
                ? "That is the amount."
                : total > target
                  ? "That is more than it has to be."
                  : "That is not enough yet.";
        const asked = v.paid
            ? `${money(v.price)} was paid for with ${money(v.paid)}.`
            : `It has to come to ${money(target)}.`;
        return `The counter holds ${list}, which comes to ${money(total)}. ${asked} ${how}`;
    },

    sayMove: (m) =>
        m.take
            ? `Take a ${NAMES[m.piece]} out of the drawer`
            : `Put the ${NAMES[m.piece]} back in the drawer`,

    board: (s, v): Board => {
        const target = wanted(v);
        const total = value(s.on);
        const scale = ladder(target);
        const left: Tray = {};
        for (const k of PIECES) {
            const n = (v.drawer[k] ?? 0) - (s.on[k] ?? 0);
            if (n > 0) left[k] = n;
        }
        const parts: BoardPart[] = [
            {
                art: "pricetag",
                key: "tag",
                at: { x: 0, y: 0 },
                params: { now: v.price, was: 0 },
                label: "the price",
            },
            {
                art: "money",
                key: "counter",
                at: { x: 0, y: 7 },
                params: { pieces: spread(s.on), total: false },
                label: `on the counter, ${count(s.on)} of ${v.most}`,
            },
            {
                art: "till",
                key: "drawer",
                at: { x: 0, y: 14 },
                params: {
                    counts: [0, 0, left["5"] ?? 0, left["1"] ?? 0],
                    coins: [left.quarter ?? 0, left.dime ?? 0, left.nickel ?? 0, left.penny ?? 0],
                },
                label: "the drawer",
            },
            // The ladder is this mechanic's beam. It says how far off the counter is without saying what
            // to add, which is the same help the tilt of a balance gives.
            {
                art: "ladder",
                key: "scale",
                at: { x: 20, y: 5 },
                params: {
                    from: 0,
                    to: scale.to,
                    step: scale.step,
                    // The price is pegged on the scale beside the counter, so being over or under is
                    // something to see. In the change round it is not: what the change comes to is the
                    // subtraction the child is there to do, and a peg saying 52 would do it for them.
                    marks: [
                        ...(v.paid ? [] : [{ at: target, label: "price" }]),
                        { at: Math.min(total, scale.to), label: "counter" },
                    ],
                },
            },
        ];
        if (v.paid) {
            parts.push({
                art: "money",
                key: "handed",
                at: { x: 11, y: 0 },
                params: { pieces: spread(fewest(v.paid)), total: false },
                label: `handed over: ${money(v.paid)}`,
            });
        }
        return { parts };
    },

    chip: (m, v): Chip => ({
        art: "money",
        params: { pieces: [m.piece], total: false },
        note: m.take ? NAMES[m.piece] : `${NAMES[m.piece]} back`,
        group: m.take ? `Out of the drawer, ${v.most} at most` : "Back in the drawer",
    }),
};
