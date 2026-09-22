// Rings of sound spreading from a point, more of them for a louder sound, which the stretched bands
// and the drum with rice on it draw with.
import { type Ctx } from "../../ink/surface";
import { U } from "../../paper";

/** Rings of sound spreading from (x, y) in the direction `toward` (radians, 0 is right), more of them for a louder sound. */
export function rings<G>(c: Ctx<G>, x: number, y: number, n: number, toward = 0, size = 1): void {
    for (let i = 0; i < n; i++) {
        const r = (0.8 + i * 0.55) * U * size;
        c.pen.arc(c.g, x, y, 2 * r, 2 * r, toward - 0.55, toward + 0.55, "pencil", {
            strokeWidth: 1.6,
            stroke: c.t.pen,
        });
    }
}
