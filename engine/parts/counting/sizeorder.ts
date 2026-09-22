import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";

export const sizeOrder = defineDrawing({
    id: "sizeorder",
    family: "counting",
    title: "Towers to order",
    group: "Structures",
    about: "Towers of cubes on one baseline, so tallest and shortest are seen before they are counted. Ordering by eye and then checking by counting is the whole of early comparison.",
    params: { heights: [3, 6, 4], labels: ["A", "B", "C"], numbers: false },
    settings: {
        heights: { kind: "numbers", min: 1, max: 8, most: 6 },
        labels: { kind: "words", most: 6 },
        numbers: { kind: "flag" },
    },
    takes: [
        {
            label: "Three towers",
            params: { heights: [3, 6, 4], labels: ["A", "B", "C"], numbers: false },
        },
        {
            label: "With their counts",
            params: { heights: [5, 2, 7, 4], labels: ["A", "B", "C", "D"], numbers: true },
        },
        {
            label: "Two the same",
            params: { heights: [4, 4, 6], labels: ["A", "B", "C"], numbers: true },
        },
    ],
    box: (p) => ({ w: p.heights.length * 4 + 1, h: Math.max(...p.heights, 1) * 2 + 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            fills: Marker[] = ["sky", "mint", "tang", "berry", "glow"],
            a: RawAnchors = {};
        const base = (Math.max(...p.heights, 1) * 2 + 2.4) * U;
        p.heights.forEach((h, i) => {
            const x = (0.9 + i * 4) * U;
            for (let k = 0; k < h; k++) {
                pen.rect(
                    g,
                    x,
                    base - (k + 1) * 2 * U,
                    2.4 * U,
                    2 * U,
                    "ruler",
                    pen.fill(fills[i % fills.length], "solid", { hachureGap: 6 }),
                    { strokeWidth: 1.6 },
                );
            }
            say(c, x + 1.2 * U, base + 1.1 * U, p.labels[i] ?? "", 17);
            if (p.numbers) num(c, x + 1.2 * U, base + 2.2 * U, h, 16);
            a[`tower(${i})`] = [x + 1.2 * U, base - h * 2 * U, "up"];
        });
        pen.line(g, 0.4 * U, base, (p.heights.length * 4 + 0.6) * U, base, "ruler", {
            strokeWidth: 2.4,
        });
        return a;
    },
    describe: (p) =>
        `Towers of coloured cubes standing on one baseline, tall and short, with a letter under each${p.numbers ? " and its height written under the letter" : " and nothing else written"}.`,
});
