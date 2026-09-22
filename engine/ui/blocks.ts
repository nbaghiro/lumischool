// A program as a child builds it in a pad's slots (program.tsx): blocks added from the tray, moved,
// set inside a repeat or an if above them, their numbers changed, taken out and put back with undo.
// Each change says in words what it did, for a screen reader and the line under the pad. A block is
// never further in than one step inside a repeat or an if above it, so the program is always one the
// interpreter can read (.docs/coding.md, "The editor").

import type { ProgramLine } from "../answer";

/** A block in a slot: its words, how far in it is set, and the tray card it came from. */
interface Placed extends ProgramLine {
    from: number;
}

/** The pad as the child has it: the blocks in the slots and the one chosen, or -1 for none. */
export interface Build {
    blocks: readonly Placed[];
    chosen: number;
}

/** The pad's tray and slots, as its drawing's settings give them. */
export interface Pad {
    tray: readonly string[];
    slots: number;
    /** The tray is a set of cards to put in order: each used once, and its number fixed. */
    once: boolean;
}

/** A change, and what it says; `build` is null when nothing changed. */
export interface Changed {
    build: Build | null;
    said: string;
}

export const EMPTY: Build = { blocks: [], chosen: -1 };

const HOLDS = /^(repeat|if|otherwise|else|define|to)\b/i;
const NUMBER = /-?\d+/;
/** The most a block's number goes to. */
const MOST = 20;

/** The deepest a block at `i` may go: one further in than a repeat or an if above it, or level with the block above. */
function deepest(blocks: readonly ProgramLine[], i: number): number {
    const above = blocks[i - 1];
    return above ? above.depth + (HOLDS.test(above.text.trim()) ? 1 : 0) : 0;
}

/** Every block kept no deeper than the block above allows. */
function tidy(blocks: readonly Placed[]): Placed[] {
    const out: Placed[] = [];
    for (const b of blocks)
        out.push({ ...b, depth: Math.max(0, Math.min(b.depth, deepest(out, out.length))) });
    return out;
}

const unchanged = (said: string): Changed => ({ build: null, said });

/** A tray card put into the slots at `at`, set as far in as the block above allows. */
export function add(b: Build, pad: Pad, from: number, at: number): Changed {
    const text = pad.tray[from];
    if (text === undefined) return unchanged("");
    if (pad.once && b.blocks.some((x) => x.from === from))
        return unchanged("That card is already in a slot.");
    if (b.blocks.length >= pad.slots)
        return unchanged(`The ${pad.slots} slots are full. Take a block out first.`);
    const i = Math.max(0, Math.min(b.blocks.length, at));
    let depth = deepest(b.blocks, i);
    // an otherwise lines up with the if it answers
    if (/^(otherwise|else)\b/i.test(text))
        for (let j = i - 1; j >= 0; j--) {
            const above = b.blocks[j];
            if (above && /^if\b/i.test(above.text) && above.depth < depth + 1) {
                depth = above.depth;
                break;
            }
        }
    const blocks = [...b.blocks];
    blocks.splice(i, 0, { text, depth, from });
    return { build: { blocks: tidy(blocks), chosen: i }, said: `${text} is in slot ${i + 1}.` };
}

/** The chosen block taken out. */
export function remove(b: Build): Changed {
    const gone = b.blocks[b.chosen];
    if (!gone) return unchanged("");
    const blocks = b.blocks.filter((_, i) => i !== b.chosen);
    return {
        build: { blocks: tidy(blocks), chosen: Math.min(b.chosen, blocks.length - 1) },
        said: `${gone.text} is taken out.`,
    };
}

/** The chosen block moved up (-1) or down (1) a slot. */
export function move(b: Build, by: -1 | 1): Changed {
    const i = b.chosen,
        j = i + by;
    const here = b.blocks[i],
        there = b.blocks[j];
    if (!here || !there) return unchanged("");
    const blocks = [...b.blocks];
    blocks[i] = there;
    blocks[j] = here;
    return {
        build: { blocks: tidy(blocks), chosen: j },
        said: `${here.text} is in slot ${j + 1}.`,
    };
}

/** The chosen block set further in (1), inside the repeat or the if above it, or out (-1). */
export function deepen(b: Build, by: -1 | 1): Changed {
    const here = b.blocks[b.chosen];
    if (!here) return unchanged("");
    const next = Math.max(0, Math.min(deepest(b.blocks, b.chosen), here.depth + by));
    if (next === here.depth)
        return unchanged(
            by > 0
                ? "It cannot go further in: there is no repeat or if above it to go inside."
                : "It is already at the left edge.",
        );
    const blocks = b.blocks.map((x, i) => (i === b.chosen ? { ...x, depth: next } : x));
    return {
        build: { blocks: tidy(blocks), chosen: b.chosen },
        said:
            by > 0
                ? `${here.text} is inside the block above.`
                : `${here.text} is out of the block above.`,
    };
}

/** The chosen block's number one more (1) or one fewer (-1), from 1 to 20. A card's number is fixed. */
export function count(b: Build, pad: Pad, by: -1 | 1): Changed {
    const here = b.blocks[b.chosen];
    if (!here || pad.once) return unchanged("");
    const m = NUMBER.exec(here.text);
    if (!m) return unchanged(`${here.text} has no number to change.`);
    const n = Math.max(1, Math.min(MOST, Number(m[0]) + by));
    const text = here.text.replace(NUMBER, String(n));
    return {
        build: {
            blocks: b.blocks.map((x, i) => (i === b.chosen ? { ...x, text } : x)),
            chosen: b.chosen,
        },
        said: `${text}.`,
    };
}

/** What the tools can do with the chosen block, for their buttons. */
export function can(
    b: Build,
    pad: Pad,
): { up: boolean; down: boolean; in: boolean; out: boolean; count: boolean; take: boolean } {
    const here = b.blocks[b.chosen];
    return {
        up: !!here && b.chosen > 0,
        down: !!here && b.chosen < b.blocks.length - 1,
        in: !!here && here.depth < deepest(b.blocks, b.chosen),
        out: !!here && here.depth > 0,
        count: !!here && !pad.once && NUMBER.test(here.text),
        take: !!here,
    };
}

/** The blocks of a program already written, such as a key or a child's last program, as placed from the tray. */
export const placedFrom = (lines: readonly ProgramLine[], pad: Pad): Placed[] =>
    lines.map((l) => ({ text: l.text, depth: l.depth, from: pad.tray.indexOf(l.text) }));

/** How a slot reads to a screen reader. */
export function slotWords(b: Build, i: number): string {
    const here = b.blocks[i];
    if (!here) return `Slot ${i + 1}: empty`;
    const inside = here.depth
        ? `, inside ${here.depth === 1 ? "one block" : `${here.depth} blocks`}`
        : "";
    return `Slot ${i + 1}: ${here.text}${inside}`;
}
