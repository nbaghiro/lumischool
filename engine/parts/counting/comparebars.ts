import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, soft } from "../lettering";

export const compareBars = defineDrawing({
    id: "comparebars",
    family: "counting",
    title: "Two bars to compare",
    group: "Structures",
    about: "Two bars from the same left edge with the difference bracketed at the end of the shorter one. How many more is a length here, not a subtraction, which is the point of drawing it at all.",
    params: { values: [8, 5], labels: ["Ann", "Ben"], difference: true },
    settings: {
        values: { kind: "numbers", min: 1, max: 20, most: 4 },
        labels: { kind: "words", most: 4 },
        difference: { kind: "flag" },
    },
    takes: [
        {
            label: "Eight against five",
            params: { values: [8, 5], labels: ["Ann", "Ben"], difference: true },
        },
        {
            label: "No difference shown",
            params: { values: [6, 9], labels: ["Red", "Blue"], difference: false },
        },
        {
            label: "Three bars",
            params: { values: [4, 7, 10], labels: ["Mon", "Tue", "Wed"], difference: false },
        },
    ],
    box: (p) => ({ w: Math.max(...p.values, 1) + 12, h: p.values.length * 3 + 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = 5 * U,
            fills: Marker[] = ["sky", "mint", "tang", "berry"],
            a: RawAnchors = {};
        p.values.forEach((v, i) => {
            const y = U + i * 3 * U;
            soft(c, x0 - 10, y + 1.4 * U, p.labels[i] ?? "", 16, "end");
            pen.rect(
                g,
                x0,
                y,
                v * U,
                2 * U,
                "ruler",
                pen.fill(fills[i % fills.length], "solid", { hachureGap: 6 }),
                { strokeWidth: 1.8 },
            );
            patch(c, x0 + v * U + 0.9 * U, y + U - 5, 30, 20);
            num(c, x0 + v * U + 0.9 * U, y + 1.35 * U, v, 18);
            a[`bar(${i})`] = [x0 + (v * U) / 2, y, "up"];
            a[`end(${i})`] = [x0 + v * U, y + U, "right"];
        });
        if (p.difference && p.values.length === 2) {
            const [a1 = 0, b1 = 0] = p.values,
                lo = Math.min(a1, b1),
                hi = Math.max(a1, b1);
            const y0 = U,
                y1 = U + (p.values.length - 1) * 3 * U + 2 * U;
            pen.line(g, x0 + lo * U, y0 - 0.5 * U, x0 + lo * U, y1 + 0.5 * U, "ruler", {
                strokeWidth: 1.4,
                strokeLineDash: [6, 5],
                stroke: c.t["ink-soft"],
            });
            const by = y1 + 0.9 * U;
            pen.path(g, `M${x0 + lo * U} ${by - 8}V${by}H${x0 + hi * U}V${by - 8}`, "ruler", null, {
                strokeWidth: 1.6,
            });
            num(c, x0 + ((lo + hi) / 2) * U, by + 24, `${hi - lo} more`, 17);
            a.difference = [x0 + ((lo + hi) / 2) * U, by, "down"];
        }
        return a;
    },
    describe: (p) =>
        `Bars from the same left edge, each a different colour with a name at its left end and its value at its right end${p.difference ? ", and a bracket under the difference" : ""}.`,
});
