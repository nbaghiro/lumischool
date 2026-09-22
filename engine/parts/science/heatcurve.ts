import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, soft } from "../lettering";
import { type Pt } from "./apparatus";

export const heatcurve = defineDrawing({
    id: "heatcurve",
    family: "science",
    title: "Heating curve",
    group: "Structures",
    about: "A thermometer reading taken every few minutes and plotted: temperature up the side in steps, minutes along the bottom, each reading a point joined to the next. Water heated in a pan climbs and then stays flat at 100 degrees while it boils, and ice warmed from the freezer stays flat at 0 while it melts, and the flat part is the question the drawing exists for. Readings land on a line or halfway between two, so every one can be read.",
    params: {
        temps: [20, 40, 60, 80, 100, 100, 100],
        every: 2,
        min: 0,
        max: 120,
        step: 20,
        tag: "",
    },
    settings: {
        temps: { kind: "numbers", min: -50, max: 150, most: 10 },
        every: { kind: "whole", min: 1, max: 60 },
        min: { kind: "whole", min: -50, max: 100 },
        max: { kind: "whole", min: 0, max: 150 },
        step: { kind: "whole", min: 1, max: 50 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        {
            label: "Water boiling",
            params: {
                temps: [20, 40, 60, 80, 100, 100, 100],
                every: 2,
                min: 0,
                max: 120,
                step: 20,
                tag: "",
            },
        },
        {
            label: "Ice melting",
            params: {
                temps: [-20, -10, 0, 0, 0, 10, 20],
                every: 5,
                min: -20,
                max: 20,
                step: 10,
                tag: "A",
            },
        },
        {
            label: "Cooling down",
            params: { temps: [90, 70, 55, 45, 40], every: 10, min: 0, max: 100, step: 20, tag: "" },
        },
    ],
    box: (p) => ({
        w: Math.max(2, Math.min(10, p.temps.length)) * 2 + 5,
        h: Math.round((p.max - p.min) / Math.max(1, p.step)) * 2 + 4,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = c.t,
            rows = Math.round((p.max - p.min) / Math.max(1, p.step));
        const n = Math.max(2, Math.min(10, p.temps.length)),
            left = 3.4 * U,
            base = (rows * 2 + 1.6) * U,
            right = left + (n * 2 - 0.4) * U;
        const y = (v: number) => base - ((v - p.min) / Math.max(1, p.step)) * 2 * U;
        for (let k = 0; k <= rows; k++) {
            const yy = base - k * 2 * U;
            pen.line(g, left, yy, right, yy, "ruler", {
                strokeWidth: 0.8,
                stroke: t["ink-soft"],
                strokeLineDash: k === 0 ? undefined : [3, 5],
            });
            num(c, left - 0.3 * U, yy + 5, p.min + k * p.step, 12, "end");
        }
        pen.line(g, left, base, left, 0.9 * U, "ruler", { strokeWidth: 2 });
        pen.line(g, left, base, right, base, "ruler", { strokeWidth: 2 });
        soft(c, left - 0.3 * U, 0.8 * U, "°C", 12, "end");
        const pts: Pt[] = p.temps.slice(0, n).map((v, i) => [left + (i + 0.6) * 2 * U, y(v)]);
        pen.linear(g, pts, "ruler", { strokeWidth: 2.4, stroke: c.paper ? t.ink : t.pen });
        pts.forEach(([x, yy], i) => {
            pen.circle(
                g,
                x,
                yy,
                8,
                "ruler",
                { fill: c.paper ? t.ink : t.pen, fillStyle: "solid" },
                { strokeWidth: 1 },
            );
            num(c, x, base + 1.1 * U, i * p.every, 12);
            a[`point(${i})`] = [x, yy, "up"];
        });
        soft(c, right, base + 2.1 * U, "minutes", 12, "end");
        if (p.tag) num(c, right - 0.2 * U, 1.2 * U, p.tag, 20, "end");
        return a;
    },
    describe: (p) =>
        `A graph with temperature up the side and minutes along the bottom, readings as dots joined by a line${p.tag ? ", lettered in the corner" : ""}.`,
    reads: true,
});
