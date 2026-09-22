// A ruled box for the number a child writes, with the answer in pen when the key is on, and the width
// in squares of a run of text, which put in order and match the pairs draw with.
import { type Ctx } from "../../ink/surface";
import { penned } from "../lettering";

/** A blank the child fills in: a ruled box, with the answer in pen when the key is on. */
export function slot<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    w: number,
    h: number,
    filled?: string,
): void {
    c.pen.rect(c.g, x, y, w, h, "ruler", null, { strokeWidth: 1.8 });
    if (filled) penned(c, x + w / 2, y + h / 2 + 7, filled, 19);
}

/** Width in squares of a run of text at the reading size, the same estimate layout uses. */
export const textW = (entries: string[]): number =>
    Math.ceil(Math.max(0, ...entries.map((s) => s.length)) * 0.5);
