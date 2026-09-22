import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, wide } from "../lettering";

export const nearestTo = defineDrawing({
    id: "nearest",
    family: "counting",
    title: "Which is nearer",
    group: "Structures",
    about: "One number on a line with two others either side of it and the gap to each written in. Nearer is a shorter arrow, which settles an argument that a pair of subtractions leaves open.",
    params: { from: 0, to: 100, value: 62, options: [50, 75] },
    settings: {
        from: { kind: "whole", min: 0, max: 1000 },
        to: { kind: "whole", min: 1, max: 1000 },
        value: { kind: "whole", min: 0, max: 1000 },
        options: { kind: "numbers", min: 0, max: 1000, most: 2 },
    },
    takes: [
        { label: "Sixty-two", params: { from: 0, to: 100, value: 62, options: [50, 75] } },
        { label: "Halfway", params: { from: 0, to: 100, value: 50, options: [25, 75] } },
        { label: "Tenths", params: { from: 0, to: 10, value: 7, options: [5, 10] } },
    ],
    box: () => ({ w: 24, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 5 * U,
            span = p.to - p.from || 1,
            a: RawAnchors = {};
        const x = (v: number) => 2 * U + ((v - p.from) / span) * 20 * U;
        pen.line(g, x(p.from) - 14, y, x(p.to) + 14, y, "ruler", { strokeWidth: 2.4 });
        for (const v of [p.from, p.to]) {
            pen.line(g, x(v), y - 10, x(v), y + 10, "ruler", { strokeWidth: 2 });
            num(c, x(v), y + 32, v, 15);
        }
        p.options.forEach((o, i) => {
            pen.line(g, x(o), y - 8, x(o), y + 8, "ruler", { strokeWidth: 1.8 });
            num(c, x(o), y + 32, o, 16);
            const gap = Math.abs(p.value - o),
                mid = (x(o) + x(p.value)) / 2;
            pen.path(
                g,
                `M${Math.min(x(o), x(p.value))} ${y - 1.6 * U}H${Math.max(x(o), x(p.value))}`,
                "pencil",
                null,
                { strokeWidth: 1.8, stroke: c.t.pen },
            );
            patch(c, mid, y - 2 * U, wide(String(gap), 15) + 10, 20);
            num(c, mid, y - 1.8 * U, gap, 15, "middle", c.t.pen);
            a[`option(${i})`] = [x(o), y + 8, "down"];
        });
        pen.circle(g, x(p.value), y, 16, "ruler", pen.fill("berry"), { strokeWidth: 2 });
        patch(c, x(p.value), y + 1.9 * U, wide(String(p.value), 18) + 10, 24);
        num(c, x(p.value), y + 2.2 * U, p.value, 18);
        a.value = [x(p.value), y, "down"];
        return a;
    },
    describe: () =>
        "A number line with its ends numbered, two options marked with ticks, a pink dot between them and the gap to each written over a pencil line.",
});
