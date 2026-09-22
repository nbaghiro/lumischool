// jump: play one card from your hand onto the line, and land exactly on the flag.
//
// The second of the three shapes. Placement in `weigh` can always be undone and the order does
// not matter; here every card is spent when it is played, order decides whether the next card
// fits, and a child can jump themselves into a corner where nothing is legal. That is a real dead
// end, and the mechanic is still reversible, so the dead-end clause is met by retreat and the
// prover reports the dead ends rather than refusing the activity.
//
// The number line drawing already draws the jumps taken above the line, so the board is the move
// log: nothing here has to invent a way to show the child what they have done.
import type { Board, Chip, Contract, Mechanic } from "./games";

export interface JumpVersion {
    /** The line the child may not leave. */
    from: number;
    to: number;
    step: number;
    /** Where they start, and the flag they have to land on. */
    start: number;
    target: number;
    /** The hand. A card may be played once, and two cards may carry the same number. */
    cards: number[];
}

export interface JumpPos {
    at: number;
    /** The cards not yet played, in the order they were dealt. */
    hand: number[];
    /** The jumps taken, which is what the drawing shows. */
    path: { a: number; b: number }[];
}

export type JumpMove = { n: number };

const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

const CONTRACT: Contract = {
    draws: ["numberline"],
    // The line and the cards are numbers, so this mechanic fills no art slots: the only drawing it
    // uses is the number line, and the number line is the same drawing whatever the numbers are.
    slots: {},
    settings: {
        from: { doc: "The left end of the line.", kind: "number", range: [-100, 100] },
        to: { doc: "The right end of the line.", kind: "number", range: [-100, 100] },
        step: { doc: "What one tick is worth.", kind: "number", range: [1, 10] },
        start: { doc: "Where the child starts.", kind: "number", range: [-100, 100] },
        target: { doc: "The number they have to land on.", kind: "number", range: [-100, 100] },
        cards: {
            doc: "The hand. A card may be played once, and two cards may read the same.",
            kind: "numbers",
            range: [-100, 100],
        },
    },
};

export const jump: Mechanic<JumpVersion, JumpPos, JumpMove> = {
    id: "jump",
    title: "Land on the number",
    reversible: true,
    contract: CONTRACT,

    accepts: (v) => {
        const out: string[] = [];
        const on = (n: number) => n >= v.from && n <= v.to;
        if (v.to <= v.from)
            out.push(`the line runs from ${v.from} to ${v.to}, which is not a line`);
        // A line is a square per tick, so a line of more than forty ticks will not fit a printed page
        // or a tablet held in a hand, whatever the arithmetic says.
        if ((v.to - v.from) / (v.step || 1) > 40)
            out.push("the line needs more than 40 ticks, which is wider than a page");
        if (!on(v.start)) out.push(`the child starts on ${v.start}, which is not on the line`);
        if (!on(v.target)) out.push(`the flag is on ${v.target}, which is not on the line`);
        if (v.start === v.target) out.push("the child starts on the flag");
        if (v.cards.length < 2) out.push("a hand of fewer than two cards is a sum, not a choice");
        if (v.cards.length > 6)
            out.push(`a hand of ${v.cards.length} cards is more than a child can hold in mind`);
        if (v.cards.some((n) => n === 0)) out.push("a card of 0 does nothing");
        if (v.cards.some((n) => n % v.step !== 0))
            out.push(`every card has to be a whole number of steps of ${v.step}`);
        return out;
    },

    goal: (v) =>
        `Land exactly on ${v.target}. You can play each card once, and you may not leave the line.`,

    bounds: (v) => ({
        solution: [2, 5],
        budget: v.cards.length,
        patience: 1.5,
        branch: 6,
        positions: 20000,
    }),

    start: (v) => ({ at: v.start, hand: [...v.cards], path: [] }),

    // One move per distinct card value, because two cards reading +5 are the same move. A card that
    // would take the child off the line is not offered, which is where the arithmetic sits: the
    // child has to see that +9 does not fit yet.
    moves: (s, v) =>
        [...new Set(s.hand)]
            .sort((a, b) => a - b)
            .filter((n) => s.at + n >= v.from && s.at + n <= v.to)
            .map((n) => ({ n })),

    apply: (s, m) => {
        const hand = [...s.hand];
        hand.splice(hand.indexOf(m.n), 1);
        return { at: s.at + m.n, hand, path: [...s.path, { a: s.at, b: s.at + m.n }] };
    },

    won: (s, v) => s.at === v.target,

    // The jumps already drawn are deliberately not in the key: two children who arrive at 8 with the
    // same cards left have the same game in front of them, however they got there.
    key: (s) => `${s.at}|${[...s.hand].sort((a, b) => a - b).join(",")}`,

    say: (s, v) => {
        const left = s.hand.length
            ? `Cards left: ${[...s.hand]
                  .sort((a, b) => a - b)
                  .map(sign)
                  .join(", ")}.`
            : "No cards left.";
        return `You are on ${s.at}. The flag is on ${v.target}. ${left}`;
    },

    sayMove: (m) => `Jump ${sign(m.n)}`,

    board: (s, v): Board => ({
        parts: [
            {
                art: "numberline",
                params: {
                    from: v.from,
                    to: v.to,
                    step: v.step,
                    jumps: s.path.map((j) => ({ a: j.a, b: j.b, label: sign(j.b - j.a) })),
                },
                marks: [{ mark: "loop", at: `tick(${v.target})` }],
            },
        ],
    }),

    // A jump card has no drawing of its own: it is a number with a sign.
    chip: (m): Chip => ({ text: sign(m.n), group: "Your cards" }),
};
