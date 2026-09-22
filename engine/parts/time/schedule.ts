import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, sayOn } from "../lettering";
import { mins, spanText } from "./spans";

const hhmm = (t: number): string => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;

interface Slot {
    from: string;
    to: string;
    label: string;
    color: Marker;
}

export const schedule = defineDrawing({
    id: "schedule",
    family: "time",
    title: "Day timetable",
    group: "Structures",
    about: "The school day down the page, one hour to three squares, so how long a lesson lasts can be read off its height. Blocks may leave gaps; a gap is a question of its own.",
    params: {
        start: "9:00",
        hours: 4,
        blocks: [
            { from: "9:00", to: "10:30", label: "Maths", color: "sky" },
            { from: "11:00", to: "12:00", label: "Reading", color: "mint" },
        ] as Slot[],
    },
    settings: {
        start: { kind: "text", most: 5 },
        hours: { kind: "whole", min: 1, max: 12 },
        blocks: { kind: "fixed" },
    },
    takes: [
        {
            label: "A morning",
            params: {
                start: "9:00",
                hours: 4,
                blocks: [
                    { from: "9:00", to: "10:30", label: "Maths", color: "sky" },
                    { from: "11:00", to: "12:00", label: "Reading", color: "mint" },
                ],
            },
        },
        {
            label: "One gap to find",
            params: {
                start: "9:00",
                hours: 3,
                blocks: [
                    { from: "9:00", to: "9:45", label: "Writing", color: "berry" },
                    { from: "10:15", to: "11:30", label: "Art", color: "tang" },
                ],
            },
        },
        {
            label: "Back to back",
            params: {
                start: "13:00",
                hours: 3,
                blocks: [
                    { from: "13:00", to: "14:00", label: "Science", color: "mint" },
                    { from: "14:00", to: "16:00", label: "Sport", color: "sky" },
                ],
            },
        },
    ],
    box: (p) => ({ w: 15, h: p.hours * 3 + 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            gut = 4 * U,
            right = 14 * U,
            top = U,
            t0 = mins(p.start);
        const y = (t: number) => top + ((t - t0) / 60) * 3 * U;
        const a: RawAnchors = {};
        for (let h = 0; h <= p.hours; h++) {
            const yy = y(t0 + h * 60);
            pen.line(g, gut - 6, yy, right, yy, "ruler", {
                strokeWidth: h === 0 || h === p.hours ? 2 : 1.2,
            });
            num(c, gut - 14, yy + 5, hhmm(t0 + h * 60), 14, "end");
            a[`hour(${h})`] = [gut, yy, "left"];
            if (h < p.hours) {
                const half = y(t0 + h * 60 + 30);
                pen.line(g, gut, half, right, half, "ruler", {
                    strokeWidth: 0.8,
                    strokeLineDash: [5, 6],
                    stroke: c.t["ink-soft"],
                });
            }
        }
        pen.line(g, gut, y(t0), gut, y(t0 + p.hours * 60), "ruler", { strokeWidth: 2 });
        p.blocks.forEach((b, i) => {
            const ya = y(mins(b.from)),
                yb = y(mins(b.to));
            pen.rect(
                g,
                gut + 8,
                ya + 3,
                right - gut - 16,
                yb - ya - 6,
                "ruler",
                pen.fill(b.color, "solid", { hachureGap: 7 }),
                { strokeWidth: 1.8 },
            );
            sayOn(c, gut + 22, (ya + yb) / 2 + 1, b.label, 17, "start");
            sayOn(c, right - 22, (ya + yb) / 2 + 1, spanText(mins(b.to) - mins(b.from)), 13, "end");
            a[`block(${i})`] = [(gut + right) / 2, ya + 3, "up"];
        });
        return a;
    },
    describe: () =>
        "A day's timetable as a column, the hours marked down its side and coloured blocks for each activity with its name and its length.",
});
