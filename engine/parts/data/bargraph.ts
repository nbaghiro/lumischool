import { type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

interface BarGraphParams {
    labels: string[];
    values: number[];
    max: number;
    color: Marker;
    set: number;
    touch: number;
    /** How many each square of the scale stands for: 1, or 2, 5, 10 and on for a scaled chart. */
    per: number;
}

type Layout = Pick<BarGraphParams, "labels" | "values" | "max" | "touch">;

const topOf = (p: Layout): number => Math.max(p.max, ...p.values, 1);
const pitchOf = (p: Layout): number => (p.touch === 1 ? 2 : 3);

/** Where bar `i` stands, in squares from the box's left edge: its left side and its width. */
export const barColumn = (p: Layout, i: number): { x: number; w: number } => ({
    x: 3.5 + i * pitchOf(p),
    w: 2,
});

/**
 * The value a bar the child sets takes when its top is let go `y` squares down from the box's top:
 * one square a unit, to the nearest whole unit, from nought on the axis to the top of the scale.
 */
export const barValueAt = (p: Layout, y: number): number =>
    Math.max(0, Math.min(topOf(p), Math.round(topOf(p) + 1 - y)));

export const barGraph = defineDrawing<BarGraphParams>({
    id: "bargraph",
    family: "data",
    title: "Bar chart",
    group: "Structures",
    about: "One square per unit, so the height is the number without a ruler, unless `per` makes each square stand for 2, 5, 10 or more and numbers the scale to match. With `touch` at 1 the bars stand side by side with no gaps, as a histogram's classes do. With `set` at 1 the bars are the child's to set: each column is drawn dashed to the top of the scale, and each bar, at the height `values` holds so far, carries a handle on its top, which lands on a whole unit. With `set` at 2 the columns are dashed without handles, for bars shaded on paper.",
    params: {
        labels: ["Apple", "Pear", "Plum"],
        values: [6, 3, 5],
        max: 8,
        color: "sky",
        set: 0,
        touch: 0,
        per: 1,
    },
    settings: {
        labels: { kind: "words", most: 6 },
        values: { kind: "numbers", min: 0, max: 20, most: 6 },
        max: { kind: "whole", min: 1, max: 20 },
        color: { kind: "one of", of: MARKERS },
        set: { kind: "whole", min: 0, max: 2 },
        touch: { kind: "whole", min: 0, max: 1 },
        per: { kind: "whole", min: 1, max: 100 },
    },
    takes: [
        {
            label: "Fruit, to 8",
            params: {
                labels: ["Apple", "Pear", "Plum"],
                values: [6, 3, 5],
                max: 8,
                color: "sky",
                set: 0,
                touch: 0,
                per: 1,
            },
        },
        {
            label: "Four days",
            params: {
                labels: ["Mon", "Tue", "Wed", "Thu"],
                values: [2, 5, 4, 7],
                max: 8,
                color: "mint",
                set: 0,
                touch: 0,
                per: 1,
            },
        },
        {
            label: "Tall scale",
            params: {
                labels: ["Bus", "Car", "Walk"],
                values: [12, 7, 14],
                max: 16,
                color: "tang",
                set: 0,
                touch: 0,
                per: 1,
            },
        },
        {
            label: "A scale of 5",
            params: {
                labels: ["Bean", "Pea", "Cress"],
                values: [7, 4, 5.5],
                max: 8,
                color: "mint",
                set: 0,
                touch: 0,
                per: 5,
            },
        },
        {
            label: "A histogram of jumps",
            params: {
                labels: ["0-9", "10-19", "20-29", "30-39", "40-49"],
                values: [2, 5, 8, 4, 1],
                max: 10,
                color: "berry",
                set: 0,
                touch: 1,
                per: 1,
            },
        },
        {
            label: "A histogram to draw, two bars set",
            params: {
                labels: ["0-9", "10-19", "20-29", "30-39"],
                values: [3, 6, 0, 0],
                max: 8,
                color: "sky",
                set: 1,
                touch: 1,
                per: 1,
            },
        },
        {
            label: "Bars to set",
            params: {
                labels: ["Rain", "Sun", "Snow"],
                values: [0, 0, 0],
                max: 6,
                color: "mint",
                set: 1,
                touch: 0,
                per: 1,
            },
        },
    ],
    box: (p) => ({
        w: p.touch === 1 ? p.labels.length * 2 + 4 : p.labels.length * 3 + 4,
        h: topOf(p) + 4,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            max = topOf(p),
            base = (max + 1) * U,
            right = p.touch === 1 ? p.labels.length * 2 + 3.9 : p.labels.length * 3 + 3.5,
            a: RawAnchors = {};
        pen.line(g, 3 * U, U, 3 * U, base, "ruler", { strokeWidth: 2 });
        pen.line(g, 3 * U, base, right * U, base, "ruler", {
            strokeWidth: 2,
        });
        const step = max > 10 ? 2 : 1;
        for (let n = 0; n <= max; n += step) {
            const y = base - n * U;
            pen.line(g, 3 * U - 6, y, 3 * U, y, "ruler", { strokeWidth: 1.2 });
            say(c, 3 * U - 12, y + 5, String(n * Math.max(1, p.per)), 13, "end");
        }
        p.labels.forEach((label, i) => {
            const v = p.values[i] ?? 0,
                x = barColumn(p, i).x * U;
            if (p.set !== 0)
                pen.rect(g, x, base - max * U, 2 * U, max * U, "ruler", null, {
                    strokeWidth: 1,
                    stroke: c.t["ink-soft"],
                    strokeLineDash: [4, 4],
                });
            if (v > 0 || p.set === 0)
                pen.rect(g, x, base - v * U, 2 * U, v * U, "ruler", pen.fill(p.color), {
                    strokeWidth: 1.8,
                });
            if (p.set === 1) {
                const y = base - v * U;
                pen.rect(
                    g,
                    x - 3,
                    y - 4,
                    2 * U + 6,
                    8,
                    "ruler",
                    { fill: c.t.pen, fillStyle: "solid" },
                    {
                        strokeWidth: 1.2,
                        stroke: c.t.pen,
                    },
                );
            }
            if (p.set !== 0) a[`column(${i})`] = [x + U, base - max * U, "up"];
            say(c, x + U, base + 26, label, p.touch === 1 && label.length > 4 ? 12 : 14);
            a[`bar(${i})`] = [x + U, base - v * U, "up"];
        });
        return a;
    },
    describe: (p) =>
        p.set === 1
            ? `A bar chart with a numbered axis up the left and a dashed column for each label, each with a handle to raise its ${MARKER_WORD[p.color]} bar.`
            : p.set === 2
              ? `A bar chart with a numbered axis up the left and a dashed column for each label, to shade its ${MARKER_WORD[p.color]} bar in.`
              : `A bar chart with a numbered axis up the left, one ${MARKER_WORD[p.color]} bar per label with the label written under it, one square per ${p.per > 1 ? String(p.per) : "unit"}.`,
});
