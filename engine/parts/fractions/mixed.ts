import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, sector } from "../lettering";

/** One whole is a five-square circle, so a mixed number is as wide as its whole-number part. */
function pieOf<G>(
    c: Ctx<G>,
    cx: number,
    cy: number,
    r: number,
    n: number,
    k: number,
    color: Marker,
): void {
    const { pen, g } = c;
    for (let i = 0; i < n; i++) {
        pen.path(
            g,
            sector(cx, cy, r, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2),
            "ruler",
            i < k ? pen.fill(color, "solid", { hachureGap: 6 }) : null,
            { strokeWidth: 1.4 },
        );
    }
    pen.circle(g, cx, cy, r * 2, "ruler", null, { strokeWidth: 2.2 });
}

export const mixedNumber = defineDrawing({
    id: "mixed",
    family: "fractions",
    title: "Mixed number",
    group: "Structures",
    about: "Whole circles and one part circle, with the number written both as a mixed number and as an improper fraction. Counting the shaded parts across all the circles gives the top of the improper one.",
    params: { whole: 2, n: 4, k: 3, write: true },
    settings: {
        whole: { kind: "whole", min: 0, max: 4 },
        n: { kind: "whole", min: 1, max: 8 },
        k: { kind: "whole", min: 0, max: 8 },
        write: { kind: "flag" },
    },
    takes: [
        { label: "Two and three quarters", params: { whole: 2, n: 4, k: 3, write: true } },
        { label: "One and a half", params: { whole: 1, n: 2, k: 1, write: true } },
        { label: "Three whole", params: { whole: 3, n: 4, k: 0, write: true } },
        { label: "Circles only", params: { whole: 1, n: 6, k: 5, write: false } },
    ],
    box: (p) => ({ w: (p.whole + (p.k ? 1 : 0)) * 5 + 1, h: 8 }),
    draw: (c, p) => {
        const cy = 3 * U,
            r = 2.1 * U,
            a: RawAnchors = {};
        const count = p.whole + (p.k ? 1 : 0);
        for (let i = 0; i < count; i++) {
            const cx = 2.5 * U + i * 5 * U,
                full = i < p.whole;
            pieOf(c, cx, cy, r, p.n, full ? p.n : p.k, full ? "mint" : "tang");
            a[`whole(${i})`] = [cx, cy - r, "up"];
        }
        if (p.write) {
            const improper = p.whole * p.n + p.k;
            num(
                c,
                (count * 5 * U) / 2,
                6.8 * U,
                `${p.whole} ${p.k}/${p.n}  =  ${improper}/${p.n}`,
                19,
            );
            a.written = [(count * 5 * U) / 2, 7 * U, "down"];
        }
        return a;
    },
    describe: (p) =>
        `Circles in a row cut into equal sectors, the whole ones shaded green and the last shaded orange in part${p.write ? ", with the number written under them two ways" : ""}.`,
});
