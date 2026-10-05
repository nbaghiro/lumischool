// What a game shows a player who does not know what to do next: which of its steps is the one to do,
// worked out from the game's state rather than scripted, whether the pointer to it shows yet, and
// what is said, wrapped to fit a speech bubble. Plain functions over plain data. See .docs/engine.md.

export interface Step {
    done: boolean;
}

/** The first step not yet done, or -1 when every step is. */
export const currentOf = (steps: readonly Step[]): number => steps.findIndex((x) => !x.done);

/** Whether the pointer shows: always on a first level, otherwise once the player has stood idle `after` steps. */
export const pointing = (o: { always: boolean; idle: number; after: number }): boolean =>
    o.always || o.idle >= o.after;

/** A gentle bounce, in squares, for a pointer; still when the board is at rest or motion is reduced. */
export const bounce = (steps: number, rest: boolean, high = 0.5): number =>
    rest ? 0 : Math.abs(Math.sin(steps * 0.12)) * high;

/** Words broken into lines of at most `most` characters, never splitting a word, and at most `lines` lines. */
export function wrap(text: string, most: number, lines = 4): string[] {
    const out: string[] = [];
    for (const word of text.split(/\s+/).filter(Boolean)) {
        const last = out[out.length - 1];
        if (last !== undefined && last.length + 1 + word.length <= most)
            out[out.length - 1] = `${last} ${word}`;
        else out.push(word);
    }
    if (out.length <= lines) return out;
    const kept = out.slice(0, lines);
    kept[lines - 1] = out.slice(lines - 1).join(" ");
    return kept;
}

/** Squares across a bubble needs for its longest line, in the bubble drawing's own squares. */
export const bubbleWidth = (lines: readonly string[]): number =>
    Math.max(4, Math.min(16, Math.ceil(Math.max(0, ...lines.map((l) => l.length)) * 0.46 + 1.7)));
