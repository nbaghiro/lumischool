import { letter, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";
import { type Pt } from "../sums/hopper";

/** The three corners of a sum triangle, and the sides that join them, in the order they are named. */
const HIDE = ["a", "b", "c", "ab", "bc", "ca", "corners", "sides", "none"] as const;
const CORNERS = ["a", "b", "c"] as const;

const SIDES = [
    ["ab", "a", "b"],
    ["bc", "b", "c"],
    ["ca", "c", "a"],
] as const;

export const sumTriangle = defineDrawing({
    id: "sumtriangle",
    family: "puzzles",
    title: "Sum triangle",
    group: "Structures",
    about: "A triangle with a number in each corner and, on each side, the sum of the two corners it joins. Any three numbers fix the rest, so the same drawing asks for one missing sum, one missing corner, or all three corners from the three sums, which has no method to follow and several ways in. The sides are worked out by the drawing, so they always agree with the corners.",
    params: { a: 3, b: 5, c: 4, hide: "a", letters: false },
    settings: {
        a: { kind: "number", min: 0, max: 100, step: 0.1 },
        b: { kind: "number", min: 0, max: 100, step: 0.1 },
        c: { kind: "number", min: 0, max: 100, step: 0.1 },
        hide: { kind: "one of", of: HIDE },
        letters: { kind: "flag" },
    },
    takes: [
        { label: "One corner to find", params: { a: 3, b: 5, c: 4, hide: "a", letters: false } },
        { label: "A sum to find", params: { a: 6, b: 2, c: 7, hide: "bc", letters: false } },
        { label: "Only the sums", params: { a: 2, b: 3, c: 4, hide: "corners", letters: true } },
    ],
    box: () => ({ w: 15, h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const at: Record<(typeof CORNERS)[number], Pt> = {
            a: [7.5 * U, 2.1 * U],
            b: [2.2 * U, 10.9 * U],
            c: [12.8 * U, 10.9 * U],
        };
        // Rounded to hundredths, so decimal corners add up without floating point showing (0.1 + 0.2 is 0.3).
        const add = (x: number, y: number) => Math.round((x + y) * 100) / 100;
        const value: Record<string, number> = {
            a: p.a,
            b: p.b,
            c: p.c,
            ab: add(p.a, p.b),
            bc: add(p.b, p.c),
            ca: add(p.c, p.a),
        };
        const hidden = new Set<string>(
            p.hide === "corners" ? CORNERS : p.hide === "sides" ? SIDES.map((x) => x[0]) : [p.hide],
        );
        let letters = 0;
        const name = (x: number, y: number, key: string) => {
            if (!p.letters || !hidden.has(key)) return;
            letter(c, {
                x,
                y,
                s: String.fromCharCode(65 + letters++),
                face: "hand",
                weight: 700,
                size: 15,
                informal: 100,
                fill: c.t.pen,
                anchor: "middle",
            });
        };
        pen.polygon(g, [at.a, at.b, at.c], "ruler", null, { strokeWidth: 2.6 });
        for (const [key, from, to] of SIDES) {
            const [x1, y1] = at[from],
                [x2, y2] = at[to],
                mx = (x1 + x2) / 2,
                my = (y1 + y2) / 2;
            const off = key === "bc" ? [0, 0.3 * U] : key === "ab" ? [-0.5 * U, 0] : [0.5 * U, 0];
            const bx = mx + (off[0] ?? 0),
                by = my + (off[1] ?? 0);
            if (hidden.has(key)) {
                pen.path(
                    g,
                    roundedRect(bx - 1.7 * U, by - 1.2 * U, 3.4 * U, 2.4 * U, 8),
                    "ruler",
                    pen.fill("card"),
                    { strokeWidth: 1.8, strokeLineDash: [6, 5] },
                );
                name(bx + 2.1 * U, by - 0.9 * U, key);
            } else {
                pen.path(
                    g,
                    roundedRect(bx - 1.7 * U, by - 1.2 * U, 3.4 * U, 2.4 * U, 8),
                    "ruler",
                    pen.fill("sky", "solid", { hachureGap: 6 }),
                    { strokeWidth: 2 },
                );
                patch(c, bx, by - 0.3 * U, 2.2 * U, 1.3 * U);
                num(c, bx, by + 0.45 * U, value[key] ?? 0, 22);
            }
            a[key] = [bx, by - 1.2 * U, "up"];
        }
        for (const key of CORNERS) {
            const [x, y] = at[key];
            if (hidden.has(key)) {
                pen.circle(g, x, y, 3.2 * U, "ruler", pen.fill("card"), {
                    strokeWidth: 1.8,
                    strokeLineDash: [6, 5],
                });
                name(x - 1.9 * U, y - 1.4 * U, key);
            } else {
                pen.circle(
                    g,
                    x,
                    y,
                    3.2 * U,
                    "ruler",
                    pen.fill("glow", "solid", { hachureGap: 6 }),
                    { strokeWidth: 2.2 },
                );
                patch(c, x, y - 0.3 * U, 2 * U, 1.3 * U);
                num(c, x, y + 0.5 * U, value[key] ?? 0, 24);
            }
            a[key] = [x, y - 1.6 * U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A triangle with a circle at each corner and a box on each side, some filled with numbers and the rest left empty with dashed edges${p.letters ? ", the empty ones lettered" : ""}.`,
});
