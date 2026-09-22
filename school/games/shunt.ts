// shunt: pull a carriage off one end of the train and push it into the siding, until the train is
// in order.
//
// The fifth shape, and the one where the moves are few and the thinking is deep. There are three
// of them: push the carriage at the engine's end into the siding, bring the one nearest the points
// back out onto that end, or run the engine round to the other end of the train. Everything hard
// about it comes from the siding being closed at the far end, so the carriage pushed in first is
// the one that comes out last, and from the engine only being able to work at the end it is
// coupled to. Reversing a train of three is not obvious and is seven moves, and a child who finds
// it has understood something about order that no worksheet asks for.
//
// What the child is doing is ordering, planning several moves ahead, and reading a sequence as
// something that can be taken apart and put back differently. There is no arithmetic in it at all,
// which is deliberate: the shelf and the curriculum both carry more than number, and a railway
// problem is a real problem rather than a sum in a costume.
//
// Reversible, so a shunt that turns out to be wrong is a take-back rather than a lost round. The
// graph is small enough that the prover walks all of it, and it reports how far from order any
// position is, which is what lets the guide point at a move that helps.
import type { Board, BoardPart, Chip, Contract, Mechanic } from "./games";

/**
 * The numbers the yard's drawings are built on, repeated here rather than imported, because a
 * mechanic names a drawing by its id and never loads one: the model has to run in a plain node test
 * with no renderer. A test asserts they are still the same numbers the drawings use.
 */
export const CAR = 5;
export const SPUR = 6;

export interface ShuntVersion {
    /** The carriages as they stand, the left end of the train first. */
    train: string[];
    /** The order they have to end up in, read the same way. */
    order: string[];
    /** How many carriages fit in the siding. */
    siding: number;
    /** Windows to a carriage, which is drawing rather than rules. */
    windows: number;
}

export interface ShuntPos {
    /** The train on the main line, left end first. */
    line: string[];
    /** The siding, the carriage against the buffer stop first and the one at the points last. */
    spur: string[];
    /** Which end of the train the engine is coupled to, and so which end it can work at. */
    end: "left" | "right";
}

export type ShuntMove = { do: "in" | "out" | "round" };

const other = (end: ShuntPos["end"]): ShuntPos["end"] => (end === "left" ? "right" : "left");
const list = (xs: string[]): string => (xs.length ? xs.join(", ") : "nothing");

const CONTRACT: Contract = {
    draws: ["sidings", "carriage", "loco"],
    // Nothing to fill: a carriage is a carriage, and what an activity chooses is the order they start
    // in, the order they have to reach, and how much siding there is to do it with.
    slots: {},
    settings: {
        train: {
            doc: "The carriages as they stand, the left end of the train first.",
            kind: "rules",
        },
        order: { doc: "The order they have to end up in, read the same way.", kind: "rules" },
        siding: {
            doc: "How many carriages fit in the siding, which is the difficulty.",
            kind: "number",
            range: [1, 6],
        },
        windows: {
            doc: "Windows to a carriage, which is drawing rather than rules.",
            kind: "number",
            range: [1, 4],
        },
    },
};

export const shunt: Mechanic<ShuntVersion, ShuntPos, ShuntMove> = {
    id: "shunt",
    title: "Shunt the carriages",
    reversible: true,
    contract: CONTRACT,

    accepts: (v) => {
        const out: string[] = [];
        if (v.train.length < 2)
            out.push("a train of one carriage is already in order, whatever order that is");
        if (v.train.length > 6)
            out.push(
                `${v.train.length} carriages and an engine is wider than a page, and more than a child can hold in mind`,
            );
        if (new Set(v.train).size !== v.train.length)
            out.push("two carriages read the same, so the order they are in could not be seen");
        if (v.train.some((s) => s.length > 2))
            out.push("a carriage's number has to be one or two characters to fit on its plate");
        if ([...v.train].sort().join() !== [...v.order].sort().join()) {
            out.push(
                "order= has to be the same carriages as train=, or the train can never be in it",
            );
        }
        if (v.train.join() === v.order.join())
            out.push("the train already stands in the order asked for");
        if (v.siding < 1)
            out.push("with no siding there is nowhere to put a carriage, so there is no move");
        if (v.windows < 1 || v.windows > 4)
            out.push(`windows=${v.windows} is not something the carriage drawing can draw`);
        return out;
    },

    goal: (v) =>
        `Get the carriages into the order ${v.order.join(", ")}, reading from the left. The engine can only work at the end it is coupled to.`,

    bounds: (v) => ({
        solution: [2, 14],
        budget: 4 + v.train.length * 4,
        patience: 1.5,
        branch: 3,
        positions: 20000,
    }),

    start: (v) => ({ line: [...v.train], spur: [], end: "right" }),

    // Three moves at most, and the narrowness is the point: there is nothing to read and everything
    // to work out. Running round is always allowed, because a yard that has a siding has a way round
    // it; if that ever stops being true it becomes a rule about the siding being empty and a harder
    // game.
    moves: (s, v) => {
        const out: ShuntMove[] = [];
        if (s.line.length && s.spur.length < v.siding) out.push({ do: "in" });
        if (s.spur.length) out.push({ do: "out" });
        out.push({ do: "round" });
        return out;
    },

    // `moves` offers a push only with a carriage at the engine's end and a pull only with one in the
    // siding, so the unchanged position is a move nobody can make rather than a case with behaviour.
    apply: (s, m) => {
        if (m.do === "round") return { ...s, end: other(s.end) };
        if (m.do === "in") {
            const line = [...s.line];
            const car = s.end === "left" ? line.shift() : line.pop();
            return car === undefined ? s : { line, spur: [...s.spur, car], end: s.end };
        }
        const spur = [...s.spur];
        const car = spur.pop();
        if (car === undefined) return s;
        return { line: s.end === "left" ? [car, ...s.line] : [...s.line, car], spur, end: s.end };
    },

    won: (s, v) => !s.spur.length && s.line.join() === v.order.join(),

    key: (s) => `${s.line.join("-")}|${s.spur.join("-")}|${s.end}`,

    say: (s, v) => {
        const train = s.line.length
            ? `The train is ${list(s.line)}, reading from the left.`
            : "There is nothing on the main line.";
        const siding = s.spur.length
            ? `The siding holds ${list(s.spur)}, with ${s.spur[s.spur.length - 1]} nearest the points.`
            : "The siding is empty.";
        return `${train} The engine is at the ${s.end} end. ${siding} It has to end up ${v.order.join(", ")}.`;
    },

    sayMove: (m, v) =>
        m.do === "round"
            ? "Run the engine round to the other end of the train"
            : m.do === "in"
              ? `Push the carriage at the engine's end into the siding, ${v.siding === 1 ? "which fills it" : "against the ones already in there"}`
              : "Bring the carriage nearest the points out of the siding and couple it on",

    board: (s, v): Board => {
        const slots = v.train.length + 2;
        const parts: BoardPart[] = [
            {
                art: "sidings",
                key: "yard",
                at: { x: 0, y: 0 },
                params: { slots, siding: v.siding },
            },
        ];
        // Every carriage is a part of its own that keeps its key wherever it stands, so a shunt is the
        // carriage travelling from the train into the siding rather than the yard being drawn again.
        // The train stands at the left, so pulling one off the left end slides the rest along too,
        // which is what the engine would be doing.
        s.line.forEach((car, i) => {
            parts.push({
                art: "carriage",
                key: `car:${car}`,
                at: { x: (1 + i) * CAR, y: 0 },
                params: { label: car, windows: v.windows },
            });
        });
        s.spur.forEach((car, i) => {
            parts.push({
                art: "carriage",
                key: `car:${car}`,
                at: { x: (slots - v.siding + i) * CAR, y: SPUR },
                params: { label: car, windows: v.windows },
            });
        });
        parts.push({
            art: "loco",
            key: "loco",
            at: { x: (s.end === "left" ? 0 : s.line.length + 1) * CAR, y: 0 },
            params: { facing: s.end === "left" ? 1 : -1 },
        });
        return { parts };
    },

    chip: (m, v): Chip => {
        if (m.do === "round") return { text: "round", note: "the other end", group: "The engine" };
        return {
            // The chip says which carriage it is about, because that is the thing the child is choosing:
            // the number is the carriage's name and it is already on its side on the board.
            text: m.do === "in" ? "in" : "out",
            note: m.do === "in" ? "this end" : "nearest one",
            group:
                v.siding === 1
                    ? "The siding, which holds one"
                    : `The siding, which holds ${v.siding}`,
        };
    },
};
