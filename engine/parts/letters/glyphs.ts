// A letter set large at a point, the cell a letter of a word takes, and where each letter of a word
// sits, which the letter cards, the sound buttons, the sound boxes, the syllable arcs and the alphabet
// line draw with.
import { type Ctx } from "../../ink/surface";
import { U } from "../../paper";
import { say } from "../lettering";

export const glyph = <G>(c: Ctx<G>, x: number, y: number, ch: string, size = 30) =>
    say(c, x, y, ch, size, "middle");

/** One cell per letter. Andika is a literacy face, so the single-storey a is the right shape. */
export const CELL = 1.4;

/** Where each letter of a word sits, and how wide the whole word is, in user units. */
export function letters(word: string, x0: number): { at: (i: number) => number; width: number } {
    return { at: (i) => x0 + (i + 0.5) * CELL * U, width: word.length * CELL * U };
}
