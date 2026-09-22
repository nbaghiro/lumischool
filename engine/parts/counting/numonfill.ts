// A number written on a fill: on paper it gets a white patch first, so no hatching crosses it. The bar
// model and the number bond write their values with it.
import { plain, type Ctx } from "../../ink/surface";
import { num } from "../lettering";

/** A number that sits on a fill. On paper it gets a white patch so hatching never crosses it. */
export const numOnFill = <G>(c: Ctx<G>, x: number, y: number, s: string | number, size = 17) => {
    if (c.paper) {
        const w = String(s).length * size * 0.62 + 8;
        plain(c, {
            kind: "rect",
            x: x - w / 2,
            y: y - size * 0.95,
            w,
            h: size * 1.25,
            r: 3,
            fill: c.t.card,
        });
    }
    return num(c, x, y, s, size);
};
