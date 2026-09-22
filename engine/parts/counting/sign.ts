// A greater-than, less-than or equals sign drawn as strokes, so it never reads as a letter. The pair
// and the chain of signs draw it.
import { type Ctx } from "../../ink/surface";
import { U } from "../../paper";

/** A greater-than or less-than sign, drawn as two strokes so it never reads as a letter. */
export function sign<G>(c: Ctx<G>, x: number, y: number, s: string, size = 1.2 * U): void {
    const { pen, g } = c;
    if (s === "=") {
        for (const dy of [-0.3, 0.3])
            pen.line(g, x - size, y + dy * size, x + size, y + dy * size, "ruler", {
                strokeWidth: 3.4,
            });
        return;
    }
    const dir = s === ">" ? 1 : -1;
    pen.linear(
        g,
        [
            [x - dir * size, y - size],
            [x + dir * size, y],
            [x - dir * size, y + size],
        ],
        "ruler",
        { strokeWidth: 3.4 },
    );
}
