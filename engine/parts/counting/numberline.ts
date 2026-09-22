import { letter, type RawAnchors } from "../../ink/surface";
import { lineTicks } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

/** Places to write a tick label with, taken from the step: 0.1 gives one, 0.25 gives two. */
const stepPlaces = (step: number): number => {
    const s = String(step);
    return s.includes(".") ? (s.split(".")[1] ?? "").length : 0;
};

export const numberLine = defineDrawing({
    id: "numberline",
    family: "counting",
    title: "Number line",
    group: "Structures",
    about: "Ticks are one square apart, whatever the step, so a line in tenths reads like a line in ones. Jumps are drawn in ballpoint above the line.",
    params: {
        from: 0,
        to: 10,
        step: 1,
        jumps: [
            { a: 0, b: 3, label: "+3" },
            { a: 3, b: 7, label: "+4" },
        ],
    },
    settings: {
        from: { kind: "whole", min: -100, max: 1000 },
        to: { kind: "whole", min: -100, max: 1000 },
        step: { kind: "number", min: 0.1, max: 100, step: 0.1 },
        jumps: { kind: "fixed" },
    },
    takes: [
        {
            label: "0 to 10, two jumps",
            params: {
                from: 0,
                to: 10,
                step: 1,
                jumps: [
                    { a: 0, b: 3, label: "+3" },
                    { a: 3, b: 7, label: "+4" },
                ],
            },
        },
        { label: "0 to 20, no jumps", params: { from: 0, to: 20, step: 1, jumps: [] } },
        { label: "0 to 1 in tenths", params: { from: 0, to: 1, step: 0.1, jumps: [] } },
        {
            label: "10 to 20, one jump",
            params: { from: 10, to: 20, step: 1, jumps: [{ a: 12, b: 19, label: "+7" }] },
        },
        {
            label: "Counting back",
            params: { from: 0, to: 12, step: 1, jumps: [{ a: 11, b: 6, label: "-5" }] },
        },
    ],
    box: (p) => ({ w: lineTicks(p.from, p.to, p.step) + 1, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            step = p.step || 1,
            places = stepPlaces(step);
        const x = (n: number) => 20 + ((n - p.from) / step) * 20,
            y = 70,
            a: RawAnchors = {};
        const ticks = lineTicks(p.from, p.to, step);
        pen.line(g, x(p.from) - 8, y, x(p.from + (ticks - 1) * step) + 8, y, "ruler", {
            strokeWidth: 2,
        });
        // A decimal label is three characters wide in a twenty pixel square, so tenths are labelled
        // every fifth tick, the way a ruler is: the ticks between are counted, not read.
        const every = places ? 5 : 1;
        for (let i = 0; i < ticks; i++) {
            // The value is built from the index so tenths stay exact: 0.1 added eleven times is not 1.
            const n = Math.round((p.from + i * step) * 10 ** places) / 10 ** places;
            const labelled = i % every === 0 || i === ticks - 1;
            pen.line(g, x(n), y - 6, x(n), y + (labelled ? 8 : 5), "ruler", {
                strokeWidth: labelled ? 1.8 : 1.2,
            });
            if (labelled) num(c, x(n), y + 26, n.toFixed(places), 13);
            a[`tick(${places ? i : n})`] = [x(n), y + 6, "down"];
        }
        p.jumps.forEach((j, i) => {
            const xa = x(j.a),
                xb = x(j.b),
                xm = (xa + xb) / 2,
                top = y - 12 - Math.min(40, 8 + Math.abs(j.b - j.a) * 7);
            pen.curve(
                g,
                [
                    [xa, y - 8],
                    [xm, top],
                    [xb, y - 8],
                ],
                "pencil",
                { strokeWidth: 1.8, stroke: c.t.pen },
            );
            const dir = Math.sign(j.b - j.a) || 1;
            for (const s of [-1, 1])
                pen.line(
                    g,
                    xb,
                    y - 8,
                    xb - dir * 7 * Math.cos(0.9 + s * 0.45),
                    y - 8 - 7 * Math.sin(0.9 + s * 0.45),
                    "pencil",
                    { strokeWidth: 1.8, stroke: c.t.pen },
                );
            letter(c, {
                x: xm,
                y: top - 6,
                s: j.label,
                face: "hand",
                weight: 600,
                size: 14,
                fill: c.t.pen,
                anchor: "middle",
            });
            a[`jump(${i})`] = [xm, top, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A number line with ticks one square apart and numbers under the labelled ticks${p.jumps.length > 0 ? ", and jumps drawn as arcs above the line with their labels" : ", and nothing drawn above the line"}.`,
});
