// The computer keyboard, as data.
//
// Two maps, and the reason there are two is the age range. The
// musician's map, where the home row is the white keys and the row above is the black ones, is
// standard and is meaningless to a five-year-old. So the default is the number row, because a
// child who can read a number can use it at once and because the same numbers can be written on
// the keys themselves. The letter map is there for an older child who wants to play with both
// hands.
//
// Playing with the computer keyboard is not the same thing as keyboard access. Arrow keys and
// space move a focus ring and press the focused key, and that is what makes the instrument usable
// by a child who navigates with a keyboard rather than one who wants to play music with it. That
// part lives in instrument.ts, because it is about focus rather than about pitch.
import type { Note } from "./pitch";

/**
 * One place a finger can land. The hit rectangle is in user units (20 to the square) so the mount
 * can work out what was pressed from the declaration rather than from the shape of the drawing,
 * which is what lets a black key's target be wider than the key that is drawn.
 */
export interface Key {
    /** Stable within one instrument: "C4" on a keyboard, "s2f3" on a fretboard. */
    id: string;
    note: Note;
    /** The anchor this key lights. The part's draw function returns the same name. */
    anchor: string;
    /** What is written on it. */
    label: string;
    /** What a screen reader says, which is longer than the label. */
    spoken: string;
    /** True for a piano's black keys, so the mount can test them first and a lesson can skip them. */
    raised: boolean;
    hit: { x: number; y: number; w: number; h: number };
}

export const MAP_NAMES = ["numbers", "letters"] as const;
export type MapName = (typeof MAP_NAMES)[number];

/** The number row, in order, against the white keys in order. */
export const NUMBER_ROW = [
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Digit0",
] as const;

/**
 * The map every piano program uses: the home row is the white keys and the row above holds the
 * black ones where they fall, so the shape under the fingers is the shape on the keyboard.
 */
export const LETTER_ROWS = [
    "KeyA",
    "KeyW",
    "KeyS",
    "KeyE",
    "KeyD",
    "KeyF",
    "KeyT",
    "KeyG",
    "KeyY",
    "KeyH",
    "KeyU",
    "KeyJ",
    "KeyK",
    "KeyO",
    "KeyL",
    "KeyP",
    "Semicolon",
    "Quote",
] as const;

/** What to print on a key so a child can find it, given the map in use. */
export function keyCap(code: string): string {
    if (code.startsWith("Digit")) return code.slice(5);
    if (code.startsWith("Key")) return code.slice(3);
    return code === "Semicolon" ? ";" : code === "Quote" ? "'" : code;
}

/**
 * Which key of the instrument a computer key plays.
 *
 * The number map counts white keys only, because the numbers are written on the white keys and a
 * child pressing 3 expects the third white one. The letter map counts every key in pitch order,
 * because its whole point is that the black keys are reachable.
 */
export function keyFor(code: string, keys: readonly Key[], map: MapName): Key | undefined {
    if (map === "numbers") {
        const i = (NUMBER_ROW as readonly string[]).indexOf(code);
        if (i < 0) return undefined;
        return keys.filter((k) => !k.raised)[i];
    }
    const i = (LETTER_ROWS as readonly string[]).indexOf(code);
    if (i < 0) return undefined;
    return keys[i];
}

/** The cap to write on each key, in the order the part draws them, or an empty string for none. */
export function caps(keys: readonly Key[], map: MapName): Map<string, string> {
    const out = new Map<string, string>();
    if (map === "numbers") {
        keys.filter((k) => !k.raised).forEach((k, i) => {
            const code = NUMBER_ROW[i];
            if (code) out.set(k.id, keyCap(code));
        });
    } else {
        keys.forEach((k, i) => {
            const code = LETTER_ROWS[i];
            if (code) out.set(k.id, keyCap(code));
        });
    }
    return out;
}

/** How the map reads in the one line of help under an instrument. */
export const mapHelp: Record<MapName, string> = {
    numbers: "Number keys 1 to 8 play the white keys",
    letters: "A W S E D F T G Y H U J K play the keys from the left",
};

/**
 * The floor .docs/activities.md sets for a tap target, in device pixels. An instrument is not a
 * mechanic, so that rule does not bind it literally, but the finger is the same finger.
 */
export const MIN_TARGET_PX = 44;

/**
 * The smallest square size, in pixels, at which every target on an instrument clears the floor.
 *
 * A part declares its targets in squares and a page chooses how many pixels a square is, so
 * whether a key is big enough is a fact about the pair and not about either one. This is the
 * arithmetic that settles it, and it is the reason a keyboard at two squares to a white key is a
 * size to look at rather than a size to play: two squares of target needs 22 px to the square,
 * and the pages draw at 20.
 */
export function minSquarePx(keys: readonly Key[]): number {
    const smallest = Math.min(...keys.map((k) => Math.min(k.hit.w, k.hit.h) / 20));
    return Number.isFinite(smallest) && smallest > 0 ? MIN_TARGET_PX / smallest : Infinity;
}

/** Whether every target clears the floor when a square is this many pixels. */
export const targetsFit = (keys: readonly Key[], squarePx: number): boolean =>
    squarePx >= minSquarePx(keys);
