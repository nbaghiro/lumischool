// share: give a piece to a plate or take it back, until every plate holds the same amount.
//
// The fraction mechanic, and the move is the equivalence. A half on one plate and two quarters on
// another are the same share, and the only way to see that a plate is done is to add what is on it,
// so a child who shares six pieces fairly between three plates has added fractions with unlike
// denominators without a single one being written down. The board is the answer: three plates that
// look the same are three equal shares, and three that do not are not.
//
// A plate holds one whole and no more, which is a rule rather than a nicety: it is what stops the
// game being solved by piling everything on one plate, and it keeps every position drawable, since
// a share of more than a whole is not a thing the fraction circle can show.
//
// Reversible. A piece on the wrong plate is the ordinary way to play this: the child puts pieces
// down, looks, and moves one. The prover reports the dead ends that come of filling a plate with
// the wrong pieces, and they are all one take-back from being fixed.
import { gcd } from "../../engine/numbers";
import type { Board, BoardPart, Chip, Contract, Mechanic } from "./games";

export interface ShareVersion {
    /** The pieces to share, each as how many units of a whole it is worth. */
    pieces: number[];
    /** Units to a whole, so a piece of 2 where the whole is 4 is a quarter. */
    whole: number;
    /** Who is sharing. One plate each, and the names are only names. */
    names: string[];
}

export interface SharePos {
    /** What is on each plate, biggest piece first. */
    plates: number[][];
    /** What is still to share, biggest first. */
    tray: number[];
}

export type ShareMove = { size: number; plate: number; off: boolean };

const sum = (xs: number[]): number => xs.reduce((n, x) => n + x, 0);
const down = (xs: number[]): number[] => [...xs].sort((a, b) => b - a);
const drop = (xs: number[], size: number): number[] => {
    const out = [...xs];
    out.splice(out.indexOf(size), 1);
    return out;
};

/** A piece in the smallest numbers that say it: four eighths is one half. */
function asFraction(size: number, whole: number): { n: number; k: number } {
    const g = gcd(size, whole) || 1;
    return { n: whole / g, k: size / g };
}
const words = (size: number, whole: number): string => {
    const { n, k } = asFraction(size, whole);
    if (k === n) return "a whole one";
    if (k === 1 && n === 2) return "a half";
    if (k === 1 && n === 4) return "a quarter";
    return `${k}/${n}`;
};
const shareWords = (xs: number[], whole: number): string =>
    xs.length ? xs.map((x) => words(x, whole)).join(", ") : "nothing";

const CONTRACT: Contract = {
    draws: ["fraction.circle", "divider"],
    slots: {},
    settings: {
        pieces: {
            doc: "The pieces to share, each as how many units of a whole it is worth.",
            kind: "numbers",
            range: [1, 12],
        },
        whole: {
            doc: "Units to a whole, so a piece of 2 where the whole is 4 is a quarter.",
            kind: "number",
            range: [2, 12],
        },
        names: {
            doc: "Who is sharing. One plate each, and the names carry no rules.",
            kind: "rules",
        },
    },
};

export const share: Mechanic<ShareVersion, SharePos, ShareMove> = {
    id: "share",
    title: "Share it out",
    reversible: true,
    contract: CONTRACT,

    accepts: (v) => {
        const out: string[] = [];
        const total = sum(v.pieces);
        if (v.names.length < 2) out.push("sharing needs at least two plates");
        if (v.names.length > 4)
            out.push("more than four plates is more than fits across the board");
        if (v.pieces.length < 3) out.push("two pieces between two plates is one move, not a share");
        if (v.pieces.length > 8) out.push(`${v.pieces.length} pieces is more than the tray shows`);
        if (v.whole < 2) out.push("a whole has to be divided into something");
        if (v.pieces.some((x) => x < 1 || x > v.whole))
            out.push(`every piece has to be between one unit and the whole of ${v.whole}`);
        if (total % v.names.length) {
            out.push(
                `the pieces come to ${total} of ${v.whole}, which ${v.names.length} plates cannot share evenly`,
            );
        } else if (total / v.names.length > v.whole) {
            out.push(
                `each plate would need ${total / v.names.length} of ${v.whole}, and a plate holds one whole`,
            );
        }
        if (new Set(v.pieces).size < 2)
            out.push("pieces that are all the same size make sharing counting, not sharing");
        return out;
    },

    goal: (v) => {
        const each = sum(v.pieces) / v.names.length;
        const { n, k } = asFraction(each, v.whole);
        return `Share the pieces so that ${v.names.join(" and ")} have the same amount. Each plate needs ${k}/${n} and a plate holds one whole.`;
    },

    bounds: (v) => ({
        solution: [v.pieces.length, v.pieces.length + 2],
        budget: v.pieces.length * 3,
        patience: 1.5,
        branch: 12,
        positions: 20000,
    }),

    start: (v) => ({ plates: v.names.map(() => []), tray: down(v.pieces) }),

    // One move per size rather than per piece, because two eighths are the same move, and a give that
    // would put more than a whole on a plate is not offered: the plate is the limit the child can see.
    moves: (s, v) => {
        const out: ShareMove[] = [];
        for (const [plate, held] of s.plates.entries()) {
            const room = v.whole - sum(held);
            for (const size of [...new Set(s.tray)].sort((a, b) => b - a)) {
                if (size <= room) out.push({ size, plate, off: false });
            }
        }
        for (const [plate, held] of s.plates.entries()) {
            for (const size of [...new Set(held)].sort((a, b) => b - a))
                out.push({ size, plate, off: true });
        }
        return out;
    },

    apply: (s, m) => {
        const plates = s.plates.map((held, i) => {
            if (i !== m.plate) return held;
            return m.off ? drop(held, m.size) : down([...held, m.size]);
        });
        return { plates, tray: m.off ? down([...s.tray, m.size]) : drop(s.tray, m.size) };
    },

    won: (s, v) => {
        if (s.tray.length) return false;
        const each = sum(v.pieces) / v.names.length;
        return s.plates.every((held) => sum(held) === each);
    },

    // The plates are interchangeable, so a share on Ann's plate and the same share on Ben's have the
    // same future and are one position. The drawing still shows whose plate is whose.
    key: (s) => [...s.plates.map((p) => down(p).join("+")).sort(), s.tray.join("+")].join("|"),

    say: (s, v) => {
        const each = sum(v.pieces) / v.names.length;
        const plates = s.plates
            .map((held, i) => `${v.names[i]} has ${shareWords(held, v.whole)}`)
            .join(". ");
        return `${plates}. Still to share: ${shareWords(s.tray, v.whole)}. Each plate needs ${words(each, v.whole)}.`;
    },

    sayMove: (m, v) =>
        m.off
            ? `Take ${words(m.size, v.whole)} back off ${v.names[m.plate]}'s plate`
            : `Give ${words(m.size, v.whole)} to ${v.names[m.plate]}`,

    board: (s, v): Board => {
        const parts: BoardPart[] = [];
        // The plates along the top, drawn as what is on them: two plates that look the same are two
        // equal shares, which is the whole of the feedback.
        s.plates.forEach((held, i) => {
            const held0 = sum(held);
            const { n, k } = held0 ? asFraction(held0, v.whole) : { n: v.whole, k: 0 };
            parts.push({
                art: "fraction.circle",
                key: `plate:${i}`,
                at: { x: i * 7, y: 0 },
                params: { n, k },
                label: `${v.names[i]}: ${held0 ? `${k}/${n}` : "nothing"}`,
            });
        });
        // A line across the board between what has been shared and what has not, so the two rows of
        // circles are two different things rather than nine circles.
        parts.push({
            art: "divider",
            key: "line",
            at: { x: 0, y: 6 },
            params: {
                style: "wave",
                width: Math.max(12, Math.max(v.names.length * 7, s.tray.length * 6) - 1),
            },
        });
        // The tray below, one piece to a drawing, each in the smallest numbers that say it.
        s.tray.forEach((size, i) => {
            const { n, k } = asFraction(size, v.whole);
            parts.push({
                art: "fraction.circle",
                key: `piece:${i}:${size}`,
                at: { x: i * 6, y: 8 },
                params: { n, k },
                label: `${k}/${n}`,
            });
        });
        return { parts };
    },

    chip: (m, v): Chip => {
        const { n, k } = asFraction(m.size, v.whole);
        return {
            art: "fraction.circle",
            params: { n, k },
            note: m.off ? `off ${v.names[m.plate]}` : `to ${v.names[m.plate]}`,
            group: m.off ? "Take a piece back" : `Give a piece to ${v.names[m.plate]}`,
        };
    },
};
