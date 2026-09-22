// pour: fill a jug, empty one, or tip one into another, until a jug holds exactly what was asked
// for.
//
// The oldest puzzle in the set and the one where the move is most obviously the arithmetic. A jug
// of five and a jug of three cannot measure four by being read: the four has to be made, and every
// way of making it is a chain of additions and subtractions the child can see happening in the
// water. Nothing is written down, and nothing can be: tipping the five into the three leaves two,
// and either the child sees why or the puzzle does not move.
//
// What it teaches beside the arithmetic is that a measure is a difference. A jug says what it holds
// at the brim and says nothing about what is in it, so the amount that matters is the one between
// two marks, which is the idea the scale on the side of the jug is for.
//
// Reversible: emptying a jug loses the water and loses nothing, since the tap is still there. There
// are no dead ends in the graph for that reason, and the prover says so rather than being told.
import { gcd } from "../../engine/numbers";
import type { Board, BoardPart, Chip, Contract, Mechanic } from "./games";

export interface PourVersion {
    /** The jugs, in the order they stand on the bench: what each holds, and its marks. */
    jugs: { max: number; step: number }[];
    /** The amount that has to be standing in one jug at the end. */
    target: number;
    /** Millilitres, litres, cups: the word on the scale. */
    unit: string;
}

export interface PourPos {
    /** What is in each jug. */
    level: number[];
}

export type PourMove = { fill: number } | { empty: number } | { from: number; to: number };

const LETTERS = "ABCD";
/** A jug by its place on the bench. A position counts its levels off this same list. */
const jug = (v: PourVersion, i: number): PourVersion["jugs"][number] =>
    v.jugs[i] ?? { max: 0, step: 1 };
const isFill = (m: PourMove): m is { fill: number } => "fill" in m;
const isEmpty = (m: PourMove): m is { empty: number } => "empty" in m;
const name = (i: number, v: PourVersion): string =>
    `jug ${LETTERS[i]} (${jug(v, i).max} ${v.unit})`;

const CONTRACT: Contract = {
    draws: ["jug", "pinned"],
    // Jugs are the only thing on the bench and a jug is a jug, so there is nothing to choose from the
    // shelf: what an activity chooses is how big they are and what has to be measured with them.
    slots: {},
    settings: {
        jugs: {
            doc: "The jugs: what each one holds at the brim, and how far apart its marks are.",
            kind: "rules",
        },
        target: {
            doc: "The amount that has to be standing in one jug at the end.",
            kind: "number",
            range: [1, 2000],
        },
        unit: {
            doc: "The word on the scale: ml, l or cups.",
            kind: "pick",
            values: ["ml", "l", "cups"],
        },
    },
};

export const pour: Mechanic<PourVersion, PourPos, PourMove> = {
    id: "pour",
    title: "Measure it out",
    reversible: true,
    contract: CONTRACT,

    accepts: (v) => {
        const out: string[] = [];
        if (v.jugs.length < 2)
            out.push("one jug can only measure what it holds, so there is nothing to work out");
        if (v.jugs.length > 3)
            out.push("more than three jugs is more bench than a child can hold in mind");
        for (const [i, jug] of v.jugs.entries()) {
            if (jug.max < 1) out.push(`jug ${LETTERS[i]} holds ${jug.max}, which is not a jug`);
            if (jug.step < 1 || jug.max % jug.step)
                out.push(
                    `jug ${LETTERS[i]} is ${jug.max} with marks every ${jug.step}, so its scale would not come out even at the brim`,
                );
        }
        const biggest = Math.max(...v.jugs.map((j) => j.max));
        const step = Math.min(...v.jugs.map((j) => j.step));
        if (v.target < 1) out.push("the target has to be more than nothing");
        if (v.target > biggest)
            out.push(
                `${v.target} ${v.unit} will not stand in any of these jugs, the biggest of which holds ${biggest}`,
            );
        if (v.jugs.some((j) => j.max === v.target))
            out.push(
                `one jug holds exactly ${v.target} ${v.unit}, so filling it is the whole puzzle`,
            );
        // Only multiples of the greatest common measure of the jugs can ever be made, so a target that
        // is not one of them is unwinnable for a reason worth saying in a sentence.
        const measure = v.jugs.map((j) => j.max).reduce(gcd);
        if (v.target % measure)
            out.push(
                `these jugs can only ever measure multiples of ${measure} ${v.unit}, so ${v.target} cannot be made`,
            );
        if (v.target % step)
            out.push(
                `${v.target} does not land on a mark, so the child could not read it off the jug`,
            );
        const size = v.jugs.reduce((n, j) => n * (j.max / measure + 1), 1);
        if (size > 20000)
            out.push(`these jugs make about ${size} positions, over what the prover may look at`);
        return out;
    },

    goal: (v) =>
        `Get exactly ${v.target} ${v.unit} standing in one jug. You can fill a jug at the tap, tip one away, or pour one into another.`,

    bounds: () => ({
        solution: [2, 10],
        budget: 14,
        patience: 1.5,
        branch: 8,
        positions: 20000,
    }),

    start: (v) => ({ level: v.jugs.map(() => 0) }),

    moves: (s, v) => {
        const out: PourMove[] = [];
        s.level.forEach((n, i) => {
            if (n < jug(v, i).max) out.push({ fill: i });
        });
        s.level.forEach((n, i) => {
            if (n > 0) out.push({ empty: i });
        });
        // Pouring is only a move if something would move: a full jug takes nothing and an empty one
        // gives nothing, and offering either would be offering a move that changes nothing.
        s.level.forEach((n, from) => {
            if (!n) return;
            s.level.forEach((m, to) => {
                if (to !== from && m < jug(v, to).max) out.push({ from, to });
            });
        });
        return out;
    },

    apply: (s, m, v) => {
        const level = [...s.level];
        if (isFill(m)) level[m.fill] = jug(v, m.fill).max;
        else if (isEmpty(m)) level[m.empty] = 0;
        else {
            // As much as the other jug will take, which is the subtraction the child is doing.
            const room = jug(v, m.to).max - (level[m.to] ?? 0);
            const moved = Math.min(level[m.from] ?? 0, room);
            level[m.from] = (level[m.from] ?? 0) - moved;
            level[m.to] = (level[m.to] ?? 0) + moved;
        }
        return { level };
    },

    won: (s, v) => s.level.some((n) => n === v.target),

    key: (s) => s.level.join(","),

    say: (s, v) => {
        const jugs = s.level
            .map((n, i) => (n ? `${name(i, v)} holds ${n} ${v.unit}` : `${name(i, v)} is empty`))
            .join(". ");
        return `${jugs}. You need ${v.target} ${v.unit} in a jug.`;
    },

    sayMove: (m, v) =>
        isFill(m)
            ? `Fill ${name(m.fill, v)} to the brim`
            : isEmpty(m)
              ? `Tip ${name(m.empty, v)} away`
              : `Pour ${name(m.from, v)} into ${name(m.to, v)} until one of them stops it`,

    board: (s, v): Board => {
        const parts: BoardPart[] = s.level.map((n, i) => ({
            art: "jug",
            key: `jug:${i}`,
            params: { max: jug(v, i).max, step: jug(v, i).step, level: n, unit: v.unit },
            label: `${LETTERS[i]}, holds ${jug(v, i).max} ${v.unit}`,
        }));
        // The order is taped to the bench rather than being something the child has to remember. It is
        // the goal sentence in the shape a kitchen has it, and it never changes during a round.
        parts.push({
            art: "pinned",
            key: "order",
            params: {
                hold: "tape",
                lines: ["We need exactly", `${v.target} ${v.unit}`],
                width: 11,
            },
        });
        return { parts };
    },

    chip: (m, v): Chip =>
        isFill(m)
            ? {
                  text: LETTERS[m.fill],
                  note: `${jug(v, m.fill).max} ${v.unit}`,
                  group: "Fill at the tap",
              }
            : isEmpty(m)
              ? { text: LETTERS[m.empty], note: "tip it away", group: "Empty out" }
              : {
                    text: `${LETTERS[m.from]} → ${LETTERS[m.to]}`,
                    note: "as much as fits",
                    group: "Pour across",
                },
};
