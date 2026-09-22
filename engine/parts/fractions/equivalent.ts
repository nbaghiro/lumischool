import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";
import { BAR, ROW_FILL } from "./bar";

/** Two bars cut different ways with the same amount shaded: the picture of an equivalent fraction. */
export const equivalentBars = defineDrawing({
    id: "equivalent",
    family: "fractions",
    title: "Equivalent fractions",
    group: "Structures",
    about: "The same bar cut two ways with the same amount shaded, so a half and three sixths are the one length. The arrow between the two ways of writing it carries what was multiplied by what.",
    params: { a: [1, 2] as [number, number], b: [3, 6] as [number, number], show: true },
    settings: { a: { kind: "fixed" }, b: { kind: "fixed" }, show: { kind: "flag" } },
    takes: [
        { label: "A half and three sixths", params: { a: [1, 2], b: [3, 6], show: true } },
        { label: "Two thirds and four sixths", params: { a: [2, 3], b: [4, 6], show: true } },
        { label: "A quarter and three twelfths", params: { a: [1, 4], b: [3, 12], show: true } },
        { label: "Bars only", params: { a: [3, 4], b: [6, 8], show: false } },
    ],
    box: () => ({ w: BAR + 6, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = 3 * U,
            w = BAR * U,
            a: RawAnchors = {};
        (
            [
                [p.a, U],
                [p.b, 4 * U],
            ] as const
        ).forEach(([f, y], r) => {
            const [k, n] = f,
                cw = w / Math.max(1, n);
            for (let i = 0; i < n; i++) {
                pen.rect(
                    g,
                    x0 + i * cw,
                    y,
                    cw,
                    2 * U,
                    "ruler",
                    i < k ? pen.fill(ROW_FILL[r], "solid", { hachureGap: 6 }) : null,
                    { strokeWidth: 1.4 },
                );
            }
            pen.rect(g, x0, y, w, 2 * U, "ruler", null, { strokeWidth: 2.4 });
            num(c, x0 - 12, y + 1.4 * U, `${k}/${n}`, 18, "end");
            a[`bar(${r})`] = [x0 + w / 2, y, "up"];
        });
        pen.line(
            g,
            x0 + (p.a[0] / p.a[1]) * w,
            U - 8,
            x0 + (p.a[0] / p.a[1]) * w,
            6 * U + 8,
            "ruler",
            { strokeWidth: 2, strokeLineDash: [7, 5], stroke: c.t.pen },
        );
        if (p.show) {
            const times = Math.round(p.b[1] / p.a[1]);
            say(
                c,
                x0 + w / 2,
                7.6 * U,
                `${p.a[0]}/${p.a[1]} = ${p.b[0]}/${p.b[1]}   (× ${times} top and bottom)`,
                16,
            );
            a.written = [x0 + w / 2, 7.8 * U, "down"];
        }
        return a;
    },
    describe: (p) =>
        `Two bars of the same length one above the other, each cut a different way with the same amount shaded and a fraction at its left${p.show ? ", the equivalence written under" : " end"}.`,
});
