// spell: put a sound in the next box, or take the last one out, until the boxes spell the picture.
//
// The one activity in the set that is not mathematics, and it is here because the shelf and the
// week both carry more than number. The move is the phonics in the same way that putting a thing in
// a pan is the arithmetic: there is one box for each sound in the word, so the child has to hear
// that a word has three sounds before they can choose the first one, and the tiles include the
// spellings that would be plausible and are wrong. Star is three sounds and four letters, and no
// amount of copying letters will fill three boxes with it.
//
// The picture is the question. Take it away and there is nothing to spell, which is the test
// .docs/activities.md sets for whether a drawing is load bearing: the word is never written down,
// so the only place it comes from is the drawing, and the text form names it instead for a child
// who cannot see it.
//
// Reversible: the last tile can always come back out, so a wrong sound is a thing to hear and
// change rather than a lost round.
import type { Board, Chip, Contract, Mechanic } from "./games";

export interface SpellVersion {
    /** The sounds of the word in order, one to a box: ["s", "t", "ar"]. */
    sounds: string[];
    /** The tiles on offer, which are the sounds and some that could plausibly have been. */
    tiles: string[];
    /** The drawing that says which word it is, and what to draw it with. */
    picture: { art: string; params: Record<string, unknown> };
    /** What the picture is of, for the text form and for the record. */
    word: string;
}

export interface SpellPos {
    /** The tiles in the boxes, left to right. Shorter than the boxes means the rest are empty. */
    filled: string[];
}

export type SpellMove = { put: string } | { back: true };

const isPut = (m: SpellMove): m is { put: string } => "put" in m;

/** The drawings a picture may be, which is the palette this mechanic's one slot accepts. */
const PICTURES = [
    "prop.star",
    "prop.ball",
    "prop.apple",
    "bus",
    "train",
    "clock",
    "tree",
    "cake",
    "daysky",
    "minibeasts",
    "flowers",
    "pond",
    "birdrow",
];

/**
 * How many ways the tiles can fill exactly this many boxes and spell the word. It has to be one:
 * two ways would mean two right answers, and the box count is the whole of what the child is being
 * asked to hear, so a set of tiles that lets the word be cut somewhere else is a broken version.
 */
export function spellings(word: string, tiles: string[], boxes: number): number {
    const seen = new Map<string, number>();
    const walk = (at: number, left: number): number => {
        if (at === word.length) return left === 0 ? 1 : 0;
        if (left === 0) return 0;
        const id = `${at}:${left}`;
        const had = seen.get(id);
        if (had !== undefined) return had;
        let n = 0;
        for (const tile of new Set(tiles)) {
            if (word.startsWith(tile, at)) n += walk(at + tile.length, left - 1);
        }
        seen.set(id, n);
        return n;
    };
    return walk(0, boxes);
}

const CONTRACT: Contract = {
    draws: ["soundboxes"],
    slots: {
        picture: {
            doc: "What the word is a word for. It is the only place the word comes from, so it has to be a drawing a child can name in one word.",
            from: PICTURES,
            count: [1, 1],
        },
    },
    settings: {
        sounds: { doc: "The sounds of the word in order, one to a box.", kind: "rules" },
        tiles: {
            doc: "The tiles on offer: the sounds, and some that could plausibly have been.",
            kind: "rules",
        },
        word: { doc: "What the picture is of, for the text form and the record.", kind: "rules" },
    },
};

export const spell: Mechanic<SpellVersion, SpellPos, SpellMove> = {
    id: "spell",
    title: "Spell the picture",
    reversible: true,
    contract: CONTRACT,

    accepts: (v) => {
        const out: string[] = [];
        const boxes = v.sounds.length;
        if (boxes < 2) out.push("a word of one sound has nothing to segment");
        if (boxes > 5)
            out.push(`${boxes} boxes is more sounds than a child holds while choosing the first`);
        if (v.sounds.join("") !== v.word)
            out.push(`the sounds spell "${v.sounds.join("")}" and the word is "${v.word}"`);
        if (!PICTURES.includes(v.picture.art))
            out.push(
                `the picture is ${v.picture.art}, which is not one of the drawings this mechanic can put a word to`,
            );
        if (new Set(v.tiles).size !== v.tiles.length)
            out.push("two tiles read the same, so one of them is doing nothing");
        for (const sound of v.sounds) {
            if (!v.tiles.includes(sound))
                out.push(`the word needs the sound "${sound}" and no tile offers it`);
        }
        if (v.tiles.some((t) => t.length > 3))
            out.push("a tile of more than three letters is not a sound a box holds");
        const spare = v.tiles.filter((t) => !v.sounds.includes(t));
        if (spare.length < 2)
            out.push(
                "with fewer than two tiles that are not in the answer, the right ones are whatever is left",
            );
        const ways = spellings(v.word, v.tiles, boxes);
        if (ways === 0) out.push(`"${v.word}" cannot be made from these tiles in ${boxes} boxes`);
        if (ways > 1)
            out.push(
                `these tiles spell "${v.word}" in ${boxes} boxes ${ways} different ways, so there is more than one right answer`,
            );
        const size = v.tiles.length ** boxes;
        if (size > 20000)
            out.push(
                `${v.tiles.length} tiles in ${boxes} boxes is about ${size} positions, over what the prover may look at`,
            );
        return out;
    },

    goal: () =>
        "Spell what is in the picture. There is one box for each sound, so listen for how many there are.",

    bounds: (v) => ({
        solution: [v.sounds.length, v.sounds.length],
        budget: v.sounds.length * 3,
        patience: 1.5,
        branch: v.tiles.length + 1,
        positions: 20000,
    }),

    start: () => ({ filled: [] }),

    // A tile goes in the next empty box, left to right, which is the way a child pushes counters into
    // sound boxes while saying a word. Taking the last one out is the other move, so a full row of
    // boxes is never the end of the round.
    moves: (s, v) => {
        const out: SpellMove[] = [];
        if (s.filled.length < v.sounds.length) for (const tile of v.tiles) out.push({ put: tile });
        if (s.filled.length) out.push({ back: true });
        return out;
    },

    apply: (s, m) =>
        isPut(m) ? { filled: [...s.filled, m.put] } : { filled: s.filled.slice(0, -1) },

    // Every box holds a sound and the sounds spell the word. `accepts` has already made sure there is
    // only one way to do that, so this is the answer rather than an answer.
    won: (s, v) => s.filled.length === v.sounds.length && s.filled.join("") === v.word,

    key: (s) => s.filled.join("."),

    say: (s, v) => {
        const boxes = v.sounds.length;
        const said = s.filled.length
            ? `The boxes say ${s.filled.map((t) => `"${t}"`).join(", ")}`
            : "The boxes are empty";
        const empty = boxes - s.filled.length;
        return `The picture is a ${v.word}. ${said}, and ${empty === 0 ? "none are empty" : `${empty} of the ${boxes} ${empty === 1 ? "is" : "are"} empty`}.`;
    },

    sayMove: (m) => (isPut(m) ? `Put "${m.put}" in the next box` : "Take the last sound out"),

    board: (s, v): Board => ({
        parts: [
            { art: v.picture.art, params: v.picture.params, label: "what is it?" },
            {
                art: "soundboxes",
                params: { boxes: v.sounds.length, filled: s.filled, counters: false },
                label: "one box for each sound",
            },
        ],
    }),

    // A sound is written, not drawn: the tile is the letters, which is the thing being chosen.
    chip: (m): Chip =>
        isPut(m)
            ? { text: m.put, group: "The sounds you have" }
            : { text: "back", note: "the last one", group: "Take one out" },
};
