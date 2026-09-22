import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num } from "../lettering";

export const doubleLine = defineDrawing({
    id: "doubleline",
    family: "fractions",
    title: "Double number line",
    group: "Structures",
    about: "Two scales on the same ticks: percent against an amount, centimetres against inches, a recipe against the number it feeds. Whatever is above a tick and whatever is below it are the same thing said twice.",
    params: { steps: 5, topTo: 100, bottomTo: 40, topUnit: "%", bottomUnit: "children", mark: 3 },
    settings: {
        steps: { kind: "whole", min: 1, max: 10 },
        topTo: { kind: "whole", min: 1, max: 1000 },
        bottomTo: { kind: "whole", min: 1, max: 1000 },
        topUnit: { kind: "text", most: 8 },
        bottomUnit: { kind: "text", most: 10 },
        mark: { kind: "whole", min: -1, max: 10 },
    },
    takes: [
        {
            label: "Percent against children",
            params: {
                steps: 5,
                topTo: 100,
                bottomTo: 40,
                topUnit: "%",
                bottomUnit: "children",
                mark: 3,
            },
        },
        {
            label: "Recipe, doubled",
            params: {
                steps: 4,
                topTo: 8,
                bottomTo: 400,
                topUnit: "people",
                bottomUnit: "grams",
                mark: 2,
            },
        },
        {
            label: "Nothing marked",
            params: {
                steps: 6,
                topTo: 60,
                bottomTo: 6,
                topUnit: "minutes",
                bottomUnit: "km",
                mark: -1,
            },
        },
    ],
    box: (p) => ({ w: p.steps * 3 + 7, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 4.5 * U,
            x = (i: number) => 5 * U + i * 3 * U,
            a: RawAnchors = {};
        const n = Math.max(1, p.steps);
        pen.line(g, x(0) - 14, y, x(n) + 14, y, "ruler", { strokeWidth: 2.4 });
        for (let i = 0; i <= n; i++) {
            const top = (p.topTo * i) / n,
                bottom = (p.bottomTo * i) / n;
            const heavy = i === p.mark;
            pen.line(g, x(i), y - 12, x(i), y + 12, "ruler", { strokeWidth: heavy ? 2.4 : 1.4 });
            const round = (v: number) => (Number.isInteger(v) ? v : v.toFixed(1));
            num(c, x(i), y - 24, round(top), 15, "middle", heavy ? c.t.pen : c.t.ink);
            num(c, x(i), y + 34, round(bottom), 15, "middle", heavy ? c.t.pen : c.t.ink);
            a[`tick(${i})`] = [x(i), y, "up"];
        }
        cap(c, x(0) - 24, y - 24, p.topUnit, 12, "end");
        cap(c, x(0) - 24, y + 34, p.bottomUnit, 12, "end");
        if (p.mark >= 0 && p.mark <= n) {
            pen.line(g, x(p.mark), y - 2 * U, x(p.mark), y + 2.4 * U, "pencil", {
                strokeWidth: 1.6,
                strokeLineDash: [6, 5],
                stroke: c.t.pen,
            });
            a.mark = [x(p.mark), y, "up"];
        }
        return a;
    },
    describe: () =>
        "A double number line: one line with ticks, a number above and a number below each tick, a unit named at each end and one tick heavier.",
});
