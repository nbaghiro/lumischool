import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, soft } from "../lettering";

export const roundingLine = defineDrawing({
    id: "rounding",
    family: "place",
    title: "Rounding line",
    group: "Structures",
    about: "The ten, hundred or thousand a number sits between, with the halfway mark drawn in and an arrow to the end it rounds to. Ticks are one square apart, so the halfway point is always the sixth.",
    params: { from: 240, to: 250, value: 247, show: true },
    settings: {
        from: { kind: "whole", min: 0, max: 10000 },
        to: { kind: "whole", min: 0, max: 10000 },
        value: { kind: "whole", min: 0, max: 10000 },
        show: { kind: "flag" },
    },
    takes: [
        { label: "247 to the nearest ten", params: { from: 240, to: 250, value: 247, show: true } },
        { label: "Under halfway", params: { from: 300, to: 400, value: 341, show: true } },
        { label: "Exactly halfway", params: { from: 60, to: 70, value: 65, show: true } },
        { label: "No arrow yet", params: { from: 1000, to: 2000, value: 1720, show: false } },
    ],
    box: () => ({ w: 14, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 4 * U,
            step = (p.to - p.from) / 10;
        const x = (v: number) => 2 * U + ((v - p.from) / (p.to - p.from)) * 10 * U;
        const a: RawAnchors = {};
        pen.line(g, x(p.from) - 10, y, x(p.to) + 10, y, "ruler", { strokeWidth: 2.2 });
        for (let i = 0; i <= 10; i++) {
            const v = p.from + i * step,
                end = i === 0 || i === 10,
                half = i === 5;
            pen.line(g, x(v), y - (end ? 10 : 6), x(v), y + (end || half ? 10 : 6), "ruler", {
                strokeWidth: end ? 2 : 1.1,
            });
            if (end || half)
                num(c, x(v), y + 32, v, end ? 17 : 14, "middle", half ? c.t["ink-soft"] : c.t.ink);
        }
        pen.line(g, x(p.from + 5 * step), U, x(p.from + 5 * step), y - 10, "ruler", {
            strokeWidth: 1.4,
            strokeLineDash: [7, 6],
            stroke: c.t["ink-soft"],
        });
        soft(c, x(p.from + 5 * step), 0.9 * U, "halfway", 12);
        const vx = x(p.value);
        pen.circle(g, vx, y, 13, "ruler", pen.fill("berry"), { strokeWidth: 1.8 });
        patch(c, vx, y - 1.6 * U - 6, 48, 22);
        num(c, vx, y - 1.5 * U, p.value, 18);
        a.value = [vx, y - 2 * U, "up"];
        if (p.show) {
            const to = p.value - p.from >= 5 * step ? p.to : p.from;
            pen.arrow(g, [vx, y + 3 * U], [x(to), y + 3 * U], c.t.pen, 0.05);
            a.lands = [x(to), y + 3 * U, "down"];
        }
        a.from = [x(p.from), y, "down"];
        a.to = [x(p.to), y, "down"];
        return a;
    },
    describe: (p) =>
        `A number line between two round numbers, ticks one square apart, a dashed halfway line and a pink dot at a value${p.show ? ", an arrow to the end it rounds to" : ""}.`,
});
