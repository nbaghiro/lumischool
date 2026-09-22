// The staff's hand: the space between its lines, notes read from their names, the treble and bass
// clefs and the sharp sign, which the staff and the grand staff draw with.
import { type Ctx } from "../../ink/surface";
import { U } from "../../paper";
import { readNote, type Note } from "../../sound/pitch";

/** One staff space is one square, so a note's line is a line on the paper underneath. */
export const SPACE = U;

export const names = (list: readonly string[]): Note[] =>
    list.map(readNote).filter((n): n is Note => n !== null);

/**
 * The G clef, drawn rather than set in a music font, because there is no music font in the product
 * and because a drawn one belongs with the rest of the art. Two strokes: the stem with its hook,
 * and the curl that spirals into the line the clef names.
 */
export function trebleClef<G>(c: Ctx<G>, x: number, gy: number): void {
    const s = SPACE;
    const at = (dx: number, dy: number): [number, number] => [x + dx * s, gy + dy * s];
    // The stem, nearly upright with a slight lean, ending in the hook below the staff.
    c.pen.curve(
        c.g,
        [
            at(0.1, -3.55),
            at(0.18, -2.2),
            at(0.16, -0.4),
            at(0.06, 1.3),
            at(-0.06, 2.25),
            at(-0.5, 2.64),
            at(-0.86, 2.28),
        ],
        "pencil",
        { strokeWidth: 2 },
    );
    // The curl: left and down from the tip, back across the stem, out to the right at the line the
    // clef names, and round into the spiral centred on that line.
    c.pen.curve(
        c.g,
        [
            at(0.1, -3.55),
            at(-0.42, -3.08),
            at(-0.72, -2.3),
            at(-0.48, -1.6),
            at(0.16, -1.2),
            at(0.78, -0.76),
            at(1.0, -0.04),
            at(0.7, 0.62),
            at(0.05, 0.82),
            at(-0.58, 0.5),
            at(-0.68, -0.12),
            at(-0.28, -0.5),
            at(0.12, -0.38),
        ],
        "pencil",
        { strokeWidth: 2 },
    );
}

/** The F clef, for the one lesson that meets it. Two dots and a hook round the line it names. */
export function bassClef<G>(c: Ctx<G>, x: number, fy: number): void {
    const s = SPACE;
    c.pen.curve(
        c.g,
        [
            [x - 0.5 * s, fy - 0.7 * s],
            [x + 0.2 * s, fy - 0.95 * s],
            [x + 0.7 * s, fy - 0.2 * s],
            [x + 0.5 * s, fy + 1.1 * s],
            [x - 0.3 * s, fy + 2.1 * s],
            [x - 1 * s, fy + 2.5 * s],
        ],
        "pencil",
        { strokeWidth: 2 },
    );
    for (const dy of [-0.5, 0.5])
        c.pen.circle(c.g, x + 1.3 * s, fy + dy * s, 6, "ruler", c.pen.fill("ink"), {
            strokeWidth: 0.8,
        });
}

/** A sharp, drawn the way a hand writes one: two uprights and two rising strokes. */
export function sharpSign<G>(c: Ctx<G>, x: number, y: number): void {
    const s = SPACE;
    for (const dx of [-0.2, 0.2])
        c.pen.line(c.g, x + dx * s, y - 0.85 * s, x + dx * s, y + 0.75 * s, "pencil", {
            strokeWidth: 1.5,
        });
    for (const dy of [-0.3, 0.3])
        c.pen.line(
            c.g,
            x - 0.45 * s,
            y + dy * s + 0.12 * s,
            x + 0.45 * s,
            y + dy * s - 0.12 * s,
            "pencil",
            { strokeWidth: 1.7 },
        );
}
