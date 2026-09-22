// rule: feed a number into the machine, watch what comes out, then name the rule it is using.
//
// The third shape, and the one furthest from a question. What the child spends is not a placement
// but information: a number can be fed once, nothing can be taken back, and the skill the activity
// is about is choosing which number to try. Feeding 4 into a machine that might be "+ 5" or
// "x 2 + 1" tells you nothing, because both give 9; feeding 1 separates them at once.
//
// It is the mechanic whose moves are spent, so the prover has to show it has no dead ends rather
// than relying on retreat: after any set of feeds, the numbers still in hand must be able to pin
// the rule down to one.
import type { Board, Chip, Contract, Mechanic } from "./games";

/** A rule the machine might be using. Kept as data so an author can write one. */
export interface Rule {
    op: "add" | "mul" | "muladd";
    a: number;
    /** Only for muladd: the number added after multiplying. It may be negative. */
    b?: number;
}

export const label = (r: Rule): string =>
    r.op === "add"
        ? `+ ${r.a}`
        : r.op === "mul"
          ? `× ${r.a}`
          : `× ${r.a} ${(r.b ?? 0) < 0 ? "-" : "+"} ${Math.abs(r.b ?? 0)}`;

export const run = (r: Rule, n: number): number =>
    r.op === "add" ? n + r.a : r.op === "mul" ? n * r.a : n * r.a + (r.b ?? 0);

/** A card by its place on the table. Every index read here is one the version's own list gave. */
const card = (v: RuleVersion, i: number): Rule => v.cards[i] ?? { op: "add", a: 0 };

export interface RuleVersion {
    /** The cards on the table. One of them is what the machine is doing. */
    cards: Rule[];
    /** Which card it is. This is the parameter that makes one activity many versions. */
    answer: number;
    /** The numbers the child may feed in, each once. */
    inputs: number[];
}

export interface RulePos {
    /** The numbers fed in, in the order they were fed. */
    fed: number[];
    /** The card named, once the child has named one. Naming ends the round either way. */
    named: number | null;
}

export type RuleMove = { feed: number } | { name: number };

const isFeed = (m: RuleMove): m is { feed: number } => "feed" in m;

const CONTRACT: Contract = {
    draws: ["machine", "inout"],
    slots: {},
    settings: {
        cards: {
            doc: "The rules on the table. One of them is what the machine is doing.",
            kind: "rules",
        },
        answer: {
            doc: "Which card it is. This is the setting that makes one activity many versions.",
            kind: "number",
            range: [0, 15],
        },
        inputs: {
            doc: "The numbers the child may feed in, each once.",
            kind: "numbers",
            range: [0, 20],
        },
    },
};

export const rule: Mechanic<RuleVersion, RulePos, RuleMove> = {
    id: "rule",
    title: "Find the rule",
    reversible: false,
    contract: CONTRACT,

    accepts: (v) => {
        const out: string[] = [];
        if (v.cards.length < 4)
            out.push(
                `${v.cards.length} cards means a guess lands too often; a guess has to be worth less than the working out`,
            );
        if (v.cards.length > 12)
            out.push(`${v.cards.length} cards is more than a child can read before choosing`);
        if (v.answer < 0 || v.answer >= v.cards.length)
            out.push(`answer=${v.answer} names no card`);
        if (v.inputs.length < 2)
            out.push("with fewer than two numbers to feed in there is nothing to choose between");
        if (new Set(v.inputs).size !== v.inputs.length)
            out.push("the same number cannot be fed in twice, so inputs= may not repeat one");
        const labels = v.cards.map(label);
        if (new Set(labels).size !== labels.length)
            out.push("two cards read the same, so naming one of them is ambiguous");
        for (const [i, c] of v.cards.entries()) {
            if (c.op !== "add" && c.a < 2)
                out.push(`card ${i} multiplies by ${c.a}, which is not a rule a child can see`);
            for (const n of v.inputs) {
                const y = run(c, n);
                if (y < 0)
                    out.push(
                        `card ${i} turns ${n} into ${y}, and the machine does not show negative numbers`,
                    );
                else if (y > 999)
                    out.push(`card ${i} turns ${n} into ${y}, which does not fit the output box`);
            }
        }
        return [...new Set(out)];
    },

    goal: () => "Feed numbers in, then name the rule the machine is using. You get one guess.",

    bounds: (v) => ({
        solution: [2, 3],
        // Every input, and then the one guess.
        budget: v.inputs.length + 1,
        // One guess out of nine cards, so luck stays near a ninth however long the child plays.
        luck: 0.15,
        branch: v.inputs.length + v.cards.length,
        positions: 20000,
    }),

    start: () => ({ fed: [], named: null }),

    // The cards cannot be named until something has been fed in, which is why the shortest win is
    // two moves rather than one. Without that, naming a card is a legal opening move and a ninth of
    // all first moves wins, which is the definition of winning by accident.
    moves: (s, v) => {
        if (s.named !== null) return [];
        const feeds: RuleMove[] = v.inputs
            .filter((n) => !s.fed.includes(n))
            .map((n) => ({ feed: n }));
        if (!s.fed.length) return feeds;
        return [...feeds, ...v.cards.map((_, i) => ({ name: i }))];
    },

    apply: (s, m) =>
        isFeed(m) ? { fed: [...s.fed, m.feed], named: s.named } : { fed: s.fed, named: m.name },

    won: (s, v) => s.named === v.answer,

    key: (s) => `${[...s.fed].sort((a, b) => a - b).join(",")}|${s.named ?? "-"}`,

    say: (s, v) => {
        const seen = s.fed.map((n) => `${n} came out as ${run(card(v, v.answer), n)}`);
        const left = v.inputs.filter((n) => !s.fed.includes(n));
        const part = seen.length ? seen.join(", ") : "Nothing has been fed in yet";
        if (s.named !== null) {
            return `${part}. You said the rule is ${label(card(v, s.named))}, and it is ${label(card(v, v.answer))}.`;
        }
        return `${part}. You can still feed in ${left.join(", ")}.`;
    },

    sayMove: (m, v) => (isFeed(m) ? `Feed in ${m.feed}` : `The rule is ${label(card(v, m.name))}`),

    board: (s, v): Board => {
        const secret = card(v, v.answer);
        const last = s.fed.at(-1) ?? null;
        return {
            parts: [
                {
                    art: "machine",
                    params: {
                        // The rule box is empty while the rule is unknown, which is what the drawing already
                        // does with a blank: it draws the slot the answer goes in.
                        rule: s.named === null ? "" : label(secret),
                        input: last === null ? "" : String(last),
                        output: last === null ? "" : String(run(secret, last)),
                    },
                },
                {
                    art: "inout",
                    params: {
                        rule: "",
                        rows: s.fed.map((n) => [n, run(secret, n)]),
                        blanks: [],
                    },
                    label: "what you have found out",
                },
            ],
        };
    },

    // A rule is written, not drawn: "x 3" is shorter and clearer than any picture of tripling.
    chip: (m, v): Chip =>
        isFeed(m)
            ? { text: String(m.feed), group: "Feed a number in" }
            : { text: label(card(v, m.name)), group: "Name the rule" },

    // What the move graph cannot see. Its idea of "it can be won" is weak here, because naming a
    // card is always a legal move, so every position is one move from a win and a lucky guess counts
    // as winning. The clause we actually want is that the rule can be worked out, which is this.
    audit: (v) =>
        feedSets(v)
            .filter((fed) => !distinguishable(v, fed))
            .map((fed) =>
                fed.length
                    ? `after feeding in ${fed.join(", ")} the rule cannot be pinned down with the numbers left`
                    : "the rule cannot be pinned down even by feeding in every number",
            ),
};

/**
 * Whether the numbers still in hand can pin the rule down to exactly one card, given what the
 * child has already seen. This is the dead-end clause for a mechanic whose moves are spent, and
 * the prover cannot work it out from the move graph alone, because the graph does not know which
 * cards are still consistent with what has been fed.
 */
export function distinguishable(v: RuleVersion, fed: number[]): boolean {
    const consistent = (seen: number[]): number[] =>
        v.cards
            .map((_, i) => i)
            .filter((i) => seen.every((n) => run(card(v, i), n) === run(card(v, v.answer), n)));
    const left = v.inputs.filter((n) => !fed.includes(n));
    const walk = (seen: number[], rest: number[]): boolean => {
        if (consistent(seen).length === 1) return true;
        return rest.some((n, i) =>
            walk(
                [...seen, n],
                rest.filter((_, j) => j !== i),
            ),
        );
    };
    return walk(fed, left);
}

/** Every set of feeds the child can reach, so the check above can be run over all of them. */
function feedSets(v: RuleVersion): number[][] {
    const out: number[][] = [];
    const walk = (chosen: number[], from: number) => {
        out.push(chosen);
        for (const [i, n] of v.inputs.entries()) if (i >= from) walk([...chosen, n], i + 1);
    };
    walk([], 0);
    return out;
}
