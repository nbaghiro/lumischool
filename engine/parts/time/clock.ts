import { defineDrawing, STILL } from "../drawing";
import { num } from "../lettering";

export const clock = defineDrawing({
    id: "clock",
    family: "time",
    title: "Clock",
    group: "Structures",
    about: "Minute ticks at the ruler level; hands in graphite.",
    params: { h: 3, m: 30 },
    settings: { h: { kind: "whole", min: 0, max: 12 }, m: { kind: "whole", min: 0, max: 59 } },
    takes: [
        { label: "Half past three", params: { h: 3, m: 30 } },
        { label: "Nine o'clock", params: { h: 9, m: 0 } },
        { label: "Quarter past seven", params: { h: 7, m: 15 } },
        { label: "Quarter to one", params: { h: 12, m: 45 } },
    ],
    box: () => ({ w: 7, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 70,
            cy = 70,
            R = 60;
        pen.circle(g, cx, cy, R * 2, "ruler", pen.fill("card"), { strokeWidth: 2.4 });
        for (let i = 0; i < 60; i++) {
            const a = (i * Math.PI) / 30,
                r1 = i % 5 ? R - 5 : R - 10;
            pen.line(
                g,
                cx + r1 * Math.sin(a),
                cy - r1 * Math.cos(a),
                cx + (R - 2) * Math.sin(a),
                cy - (R - 2) * Math.cos(a),
                "ruler",
                { strokeWidth: i % 5 ? 0.8 : 1.6 },
            );
        }
        for (let h = 1; h <= 12; h++) {
            const a = (h * Math.PI) / 6;
            num(c, cx + 42 * Math.sin(a), cy - 42 * Math.cos(a) + 5, h, 13);
        }
        const ha = ((p.h % 12) + p.m / 60) * (Math.PI / 6),
            ma = p.m * (Math.PI / 30);
        pen.line(g, cx, cy, cx + 30 * Math.sin(ha), cy - 30 * Math.cos(ha), "ruler", {
            strokeWidth: 4,
        });
        pen.line(g, cx, cy, cx + 48 * Math.sin(ma), cy - 48 * Math.cos(ma), "ruler", {
            strokeWidth: 2.4,
        });
        pen.circle(g, cx, cy, 7, "ruler", { fill: c.t.ink, fillStyle: "solid" });
        return { centre: [cx, cy, "right"], "12": [cx, cy - R, "up"] };
    },
    describe: () =>
        "A round clock face with the numbers one to twelve, a tick for every minute, a short thick hour hand and a long thin minute hand.",
    motion: { still: STILL.instrument },
});
