import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { patch, say } from "../lettering";

/** A mass block is wider for a heavier mass, but not in proportion: a kilogram is not ten times
 *  as tall as a hundred grams, it is about twice, the way a real block is. */
const massW = (m: number): number => 1.45 + 1.75 * Math.cbrt(m / 1000);

const massLabel = (m: number): string => (m >= 1000 ? `${m / 1000} kg` : `${m} g`);

export const massSet = defineDrawing({
    id: "masses",
    family: "measuring",
    title: "Set of masses",
    group: "Props",
    about: "The brass masses from the balance, each one labelled and sized by its cube root, so a kilogram looks about twice a hundred grams rather than ten times it. Enough to ask which ones make 800 grams.",
    params: { masses: [1000, 500, 200, 100] },
    settings: { masses: { kind: "numbers", min: 1, max: 5000, most: 6 } },
    takes: [
        { label: "The whole set", params: { masses: [1000, 500, 200, 100] } },
        { label: "Making 800 g", params: { masses: [500, 200, 100] } },
        { label: "Two kilograms", params: { masses: [1000, 1000] } },
        { label: "Small masses", params: { masses: [100, 50, 20, 10] } },
    ],
    box: (p) => ({ w: Math.ceil(p.masses.reduce((s, m) => s + massW(m) + 0.4, 0)) + 1, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            bottom = 6.6 * U,
            a: RawAnchors = {};
        let x = U / 2;
        p.masses.forEach((m, i) => {
            const w = massW(m) * U,
                h = (1.4 + 1.4 * Math.cbrt(m / 1000)) * U,
                top = bottom - h,
                lean = w * 0.12;
            pen.arc(g, x + w / 2, top, 0.9 * U, 0.9 * U, Math.PI * 1.05, Math.PI * 1.95, "ruler", {
                strokeWidth: 2.2,
            });
            pen.polygon(
                g,
                [
                    [x + lean, top],
                    [x + w - lean, top],
                    [x + w, bottom],
                    [x, bottom],
                ],
                "ruler",
                pen.fill("tang", "solid", { hachureGap: 6 }),
                { strokeWidth: 2 },
            );
            patch(c, x + w / 2, bottom - h / 2 - 5, w - 8, 20);
            say(c, x + w / 2, bottom - h / 2 + 5, massLabel(m), m >= 1000 ? 15 : 12);
            a[`mass(${i})`] = [x + w / 2, top - 0.6 * U, "up"];
            x += w + 0.4 * U;
        });
        return a;
    },
    describe: () =>
        "A set of masses standing in a row, each a knobbed weight with its mass written on its face, larger ones taller.",
    reads: true,
});
