import { type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

interface LineGraphParams {
    labels: string[];
    values: number[];
    max: number;
    color: Marker;
}

export const lineGraph = defineDrawing<LineGraphParams>({
    id: "linegraph",
    family: "data",
    title: "Line graph",
    group: "Structures",
    about: "Points one square per unit, joined in order: how a measurement changes over time.",
    params: {
        labels: ["Mon", "Tue", "Wed", "Thu"],
        values: [3, 6, 5, 9],
        max: 10,
        color: "berry",
    },
    settings: {
        labels: { kind: "words", most: 8 },
        values: { kind: "numbers", min: 0, max: 20, most: 8 },
        max: { kind: "whole", min: 1, max: 20 },
        color: { kind: "one of", of: MARKERS },
    },
    takes: [
        {
            label: "Four days",
            params: {
                labels: ["Mon", "Tue", "Wed", "Thu"],
                values: [3, 6, 5, 9],
                max: 10,
                color: "berry",
            },
        },
        {
            label: "A dip in the middle",
            params: {
                labels: ["1", "2", "3", "4", "5"],
                values: [8, 4, 2, 5, 9],
                max: 10,
                color: "sky",
            },
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
        const pts = p.labels.map(
            (_, i) => [(4.5 + i * 3) * U, base - (p.values[i] ?? 0) * U] as [number, number],
        );
        if (pts.length > 1) pen.linear(g, pts, "ruler", { stroke: c.t[p.color], strokeWidth: 2.4 });
        p.labels.forEach((s, i) => {
            const [x, y] = pts[i] ?? [0, 0];
            pen.circle(g, x, y, 11, "ruler", pen.fill(p.color), { strokeWidth: 1.6 });
            say(c, x, base + 26, s, 14);
            a[`point(${i})`] = [x, y - 8, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A line graph with a numbered axis up the left and labels along the bottom, ${MARKER_WORD[p.color]} points joined by a line.`,
});
