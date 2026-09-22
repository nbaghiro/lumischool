import { type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

interface BarGraphParams {
    labels: string[];
    values: number[];
    max: number;
    color: Marker;
}

export const barGraph = defineDrawing<BarGraphParams>({
    id: "bargraph",
    family: "data",
    title: "Bar chart",
    group: "Structures",
    about: "One square per unit, so the height is the number without a ruler.",
    params: {
        labels: ["Apple", "Pear", "Plum"],
        values: [6, 3, 5],
        max: 8,
        color: "sky",
    },
    settings: {
        labels: { kind: "words", most: 6 },
        values: { kind: "numbers", min: 0, max: 20, most: 6 },
        max: { kind: "whole", min: 1, max: 20 },
        color: { kind: "one of", of: MARKERS },
    },
    takes: [
        {
            label: "Fruit, to 8",
            params: { labels: ["Apple", "Pear", "Plum"], values: [6, 3, 5], max: 8, color: "sky" },
        },
        {
            label: "Four days",
            params: {
                labels: ["Mon", "Tue", "Wed", "Thu"],
                values: [2, 5, 4, 7],
                max: 8,
                color: "mint",
            },
        },
        {
            label: "Tall scale",
            params: { labels: ["Bus", "Car", "Walk"], values: [12, 7, 14], max: 16, color: "tang" },
        },
    ],
    box: (p) => ({ w: p.labels.length * 3 + 4, h: Math.max(p.max, ...p.values, 1) + 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            max = Math.max(p.max, ...p.values, 1),
            base = (max + 1) * U,
            a: RawAnchors = {};
        pen.line(g, 3 * U, U, 3 * U, base, "ruler", { strokeWidth: 2 });
        pen.line(g, 3 * U, base, (p.labels.length * 3 + 3.5) * U, base, "ruler", {
            strokeWidth: 2,
        });
        const step = max > 10 ? 2 : 1;
        for (let n = 0; n <= max; n += step) {
            const y = base - n * U;
            pen.line(g, 3 * U - 6, y, 3 * U, y, "ruler", { strokeWidth: 1.2 });
            say(c, 3 * U - 12, y + 5, String(n), 13, "end");
        }
        p.labels.forEach((label, i) => {
            const v = p.values[i] ?? 0,
                x = (3.5 + i * 3) * U;
            pen.rect(g, x, base - v * U, 2 * U, v * U, "ruler", pen.fill(p.color), {
                strokeWidth: 1.8,
            });
            say(c, x + U, base + 26, label, 14);
            a[`bar(${i})`] = [x + U, base - v * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A bar chart with a numbered axis up the left, one ${MARKER_WORD[p.color]} bar per label with the label written under it, one square per unit.`,
});
