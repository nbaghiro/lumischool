// A blank the child fills in, a ruled box with the answer in pen when the key is on, and the pen it is
// written with, at the size these sums write. The pyramid, the bus stop and the area grid draw with them.
import { letter, type Ctx } from "../../ink/surface";

/** What the teacher's pen writes into a blank on the answer key. */
export const penned = <G>(c: Ctx<G>, x: number, y: number, s: string, size = 19) =>
    letter(c, {
        x,
        y,
        s,
        face: "hand",
        weight: 600,
        size,
        fill: c.t.pen,
        anchor: "middle",
        informal: 100,
    });

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
    if (filled) penned(c, x + w / 2, y + h / 2 + 7, filled);
}
