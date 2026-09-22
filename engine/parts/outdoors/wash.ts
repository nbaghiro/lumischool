// A marker's wash over the squared paper, no stronger than a world's, and a number fixed by two whole
// numbers so a scatter over lengths that meet is the same where they meet, which the meadow, the sea
// and the sheep pen draw with. Listed as construction in the catalogue suite.
import { plain, type Ctx } from "../../ink/surface";
import { type Marker } from "../../paper";

/** A number from nought to one fixed by two whole numbers, so a scatter over lengths that meet is the same where they meet. */
export const hash = (a: number, b: number, k = 0) => {
    const s = Math.sin(a * 12.9898 + b * 78.233 + k * 37.719) * 43758.5453;
    return s - Math.floor(s);
};

/**
 * A wash of a marker over the squared paper, no stronger than a world's (.docs/journal.md). On paper
 * it opens to a wide hatch when it has to be read as water or straw, and is left out when it is only
 * the colour of the ground.
 */
export function wash<G>(c: Ctx<G>, d: string, tone: Marker, opacity: number, hatch: boolean): void {
    if (c.paper) {
        if (hatch)
            c.pen.path(
                c.g,
                d,
                "pencil",
                c.pen.fill(tone, "hachure", { hachureGap: 11, fillWeight: 0.5 }),
                { stroke: "none" },
            );
        return;
    }
    plain(c, { kind: "path", d, fill: c.t[tone], opacity: Math.min(0.3, opacity) });
}
