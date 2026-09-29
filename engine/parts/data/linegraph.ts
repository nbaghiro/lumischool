import { type RawAnchors } from "../../ink/surface";
import { MARKERS, MARKER_WORD, U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

interface LineGraphParams {
    labels: string[];
    values: number[];
    max: number;
    min: number;
    per: number;
    step: number;
    color: Marker;
}

/** A value as the axis writes it, without the float's noise: 0.30000000000000004 is 0.3. */
const shown = (v: number): string => String(Number(v.toFixed(6)));

/**
 * The value between two numbered ticks. Left at 0 it is the smallest of 1, 2 and 5 squares' worth
 * that numbers at most ten ticks, which on the default axis of one unit a square is 1 up to ten and 2 past it.
 */
function tickStep(rows: number, per: number, step: number): number {
    if (step > 0) return step;
    for (const k of [1, 2, 5, 10, 20, 50]) if (rows / k <= 10) return k * per;
    return 50 * per;
}

/** The lowest and highest values the axis runs between, and how many squares that is. */
function axis(p: LineGraphParams): { lo: number; hi: number; rows: number } {
    const per = p.per > 0 ? p.per : 1;
    const lo = Math.min(p.min, ...p.values);
    const hi = Math.max(p.max, ...p.values, lo + per);
    return { lo, hi, rows: Math.ceil((hi - lo) / per - 1e-9) };
}

export const lineGraph = defineDrawing<LineGraphParams>({
    id: "linegraph",
    family: "data",
    title: "Line graph",
    group: "Structures",
    about: "Points joined in order: how a measurement changes over time. One square is one unit unless `per` says what a square is worth, and the axis can start below zero or run in decimals.",
    params: {
        labels: ["Mon", "Tue", "Wed", "Thu"],
        values: [3, 6, 5, 9],
        max: 10,
        min: 0,
        per: 1,
        step: 0,
        color: "berry",
    },
    settings: {
        labels: { kind: "words", most: 8 },
        values: { kind: "numbers", min: -1000, max: 1000, most: 8 },
        max: { kind: "number", min: -1000, max: 1000, step: 0.1 },
        min: { kind: "number", min: -1000, max: 1000, step: 0.1 },
        per: { kind: "number", min: 0.1, max: 100, step: 0.1 },
        step: { kind: "number", min: 0, max: 500, step: 0.1 },
        color: { kind: "one of", of: MARKERS },
    },
    takes: [
        {
            label: "Four days",
            params: {
                labels: ["Mon", "Tue", "Wed", "Thu"],
                values: [3, 6, 5, 9],
                max: 10,
                min: 0,
                per: 1,
                step: 0,
                color: "berry",
            },
        },
        {
            label: "A dip in the middle",
            params: {
                labels: ["1", "2", "3", "4", "5"],
                values: [8, 4, 2, 5, 9],
                max: 10,
                min: 0,
                per: 1,
                step: 0,
                color: "sky",
            },
        },
        {
            label: "Below freezing",
            params: {
                labels: ["6am", "9am", "12pm", "3pm", "6pm", "9pm"],
                values: [-4, -1, 3, 5, 2, -2],
                max: 6,
                min: -6,
                per: 1,
                step: 2,
                color: "sky",
            },
        },
        {
            label: "Ten to a square",
            params: {
                labels: ["0", "1", "2", "3", "4"],
                values: [0, 45, 90, 135, 180],
                max: 200,
                min: 0,
                per: 10,
                step: 20,
                color: "tang",
            },
        },
        {
            label: "In halves",
            params: {
                labels: ["1", "2", "3", "4", "5"],
                values: [1.5, 2, 3.5, 4, 2.5],
                max: 5,
                min: 0,
                per: 0.5,
                step: 1,
                color: "mint",
            },
        },
    ],
    box: (p) => ({ w: p.labels.length * 3 + 4, h: axis(p).rows + 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            { lo, hi, rows } = axis(p),
            per = p.per > 0 ? p.per : 1,
            base = (rows + 1) * U,
            y = (v: number) => base - ((v - lo) / per) * U,
            a: RawAnchors = {};
        pen.line(g, 3 * U, U, 3 * U, base, "ruler", { strokeWidth: 2 });
        pen.line(g, 3 * U, base, (p.labels.length * 3 + 3.5) * U, base, "ruler", {
            strokeWidth: 2,
        });
        const step = tickStep(rows, per, p.step);
        for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + 1e-9; k++) {
            const n = k * step;
            pen.line(g, 3 * U - 6, y(n), 3 * U, y(n), "ruler", { strokeWidth: 1.2 });
            say(c, 3 * U - 12, y(n) + 5, shown(n), 13, "end");
        }
        // below zero the zero line is ruled across, so a reading above it and one below read apart
        if (lo < 0 && hi > 0)
            pen.line(g, 3 * U, y(0), (p.labels.length * 3 + 3.5) * U, y(0), "ruler", {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
            });
        const pts = p.labels.map(
            (_, i) => [(4.5 + i * 3) * U, y(p.values[i] ?? 0)] as [number, number],
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
