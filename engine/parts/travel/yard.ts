// The yard the shunting game is played in: a carriage's length, where its rail is, how far the siding
// sits below the main line, and the wheels and coupling bar a carriage and an engine share. The games
// keep their own copies of the numbers (school/games/shunt.ts), and a test holds the two the same. Listed
// as construction in the catalogue suite.
import { type Ctx } from "../../ink/surface";
import { U } from "../../paper";

/** One carriage's length, in squares. It is also the spacing of the places in the yard. */
export const CAR = 5;

/** Where the rail is in a carriage's own box, so a carriage placed on a yard's rail stands on it. */
export const RAIL = 4.3;

/** How far the siding sits below the main line, in squares. */
export const SPUR = 6;

/** Two wheels and the bar that couples to the next one. Shared by the carriage and the engine. */
export function underneath<G>(c: Ctx<G>, x0: number, wheels: number[]): void {
    const { pen, g } = c;
    for (const w of wheels) {
        pen.circle(
            g,
            x0 + w * U,
            (RAIL - 0.35) * U,
            0.7 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.8 },
        );
    }
    for (const end of [0, CAR])
        pen.line(
            g,
            x0 + end * U,
            (RAIL - 0.5) * U,
            x0 + (end === 0 ? 0.35 : CAR - 0.35) * U,
            (RAIL - 0.5) * U,
            "pencil",
            { strokeWidth: 2 },
        );
}
