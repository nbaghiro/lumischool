import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";

export const clockTower = defineDrawing({
    id: "clocktower",
    family: "places",
    title: "Clock tower",
    group: "Structures",
    about: "A town clock tower with a pointed roof, a clock face with twelve marks and two hands, a window and a door. The time is any time, read exactly as the clock on a lesson is read.",
    params: { hour: 3, minute: 15 },
    settings: {
        hour: { kind: "whole", min: 0, max: 12 },
        minute: { kind: "whole", min: 0, max: 59 },
    },
    takes: [
        { label: "Quarter past three", params: { hour: 3, minute: 15 } },
        { label: "Twenty to eleven", params: { hour: 10, minute: 40 } },
    ],
    box: () => ({ w: 7, h: 16 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 3.5 * U,
            base = 15.6 * U,
            x = 1 * U,
            w = 5 * U,
            top = 5.6 * U;
        pen.rect(
            g,
            x,
            top,
            w,
            base - top,
            "pencil",
            pen.fill("glow", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
            { strokeWidth: 2.2 },
        );
        pen.polygon(
            g,
            [
                [x - 0.4 * U, top],
                [cx, 0.4 * U],
                [x + w + 0.4 * U, top],
            ],
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 2 },
        );
        pen.line(g, x - 0.4 * U, top, x + w + 0.4 * U, top, "ruler", { strokeWidth: 2.4 });
        const cy = top + 2.2 * U,
            r = 1.7 * U;
        pen.circle(g, cx, cy, r * 2, "ruler", pen.fill("card"), { strokeWidth: 2 });
        for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2;
            pen.line(
                g,
                cx + Math.cos(a) * r * 0.78,
                cy + Math.sin(a) * r * 0.78,
                cx + Math.cos(a) * r * 0.92,
                cy + Math.sin(a) * r * 0.92,
                "ruler",
                { strokeWidth: k % 3 ? 1 : 2 },
            );
        }
        const hr = (((p.hour % 12) + p.minute / 60) / 12) * Math.PI * 2 - Math.PI / 2,
            mn = (p.minute / 60) * Math.PI * 2 - Math.PI / 2;
        pen.line(g, cx, cy, cx + Math.cos(hr) * r * 0.48, cy + Math.sin(hr) * r * 0.48, "ruler", {
            strokeWidth: 2.8,
        });
        pen.line(g, cx, cy, cx + Math.cos(mn) * r * 0.74, cy + Math.sin(mn) * r * 0.74, "ruler", {
            strokeWidth: 1.8,
        });
        pen.circle(
            g,
            cx,
            cy,
            5,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.5 },
        );
        pen.rect(g, cx - 0.6 * U, top + 5 * U, 1.2 * U, 1.8 * U, "ruler", pen.fill("sky"), {
            strokeWidth: 1.4,
        });
        pen.path(
            g,
            `M${cx - 1 * U} ${base}V${base - 2.4 * U}A${1 * U} ${1 * U} 0 0 1 ${cx + 1 * U} ${base - 2.4 * U}V${base}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.6 },
        );
        pen.line(g, 0.2 * U, base, 6.8 * U, base, "pencil", { strokeWidth: 2.2 });
        return {
            clock: [cx, cy - r, "up"],
            roof: [cx, 0.4 * U, "up"],
            door: [cx, base - 3.4 * U, "up"],
        };
    },
    describe: () =>
        "A stone clock tower with a pointed roof, a round clock face with numbers and two hands near the top, and a door at its foot.",
    motion: { still: STILL.instrument },
    reads: true,
});
