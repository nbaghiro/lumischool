// A force arrow straight down onto a point with its size written beside it, which the lever, the
// pulleys and the wheel and axle draw the push with.
import { type Ctx } from "../../ink/surface";
import { U } from "../../paper";
import { num, patch, penned } from "../lettering";

/** A force arrow straight down onto a point, with its size written beside it (or a question mark). */
export function pushDown<G>(c: Ctx<G>, x: number, y: number, len: number, label: string): void {
    const { pen, g } = c;
    pen.line(g, x, y - len, x, y - 10, "ruler", { strokeWidth: 3 });
    pen.polygon(
        g,
        [
            [x, y],
            [x - 8, y - 13],
            [x + 8, y - 13],
        ],
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 1.2 },
    );
    if (label === "?") penned(c, x + 0.5 * U, y - len * 0.55, "?", 24);
    else {
        patch(c, x + 0.4 * U + label.length * 4.4, y - len * 0.55 - 5, label.length * 9 + 8, 18);
        num(c, x + 0.4 * U, y - len * 0.55, label, 15, "start");
    }
}
