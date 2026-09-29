import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num, numOn, onCircle, patch, sector } from "../lettering";

/** A value as it is written on the circle, without the float's noise. */
const shown = (v: number): string => String(Number(v.toFixed(3)));

export const circleParts = defineDrawing({
    id: "circleparts",
    family: "shapes",
    title: "Labelled circle",
    group: "Structures",
    about: "A circle with its centre, a radius, a diameter and the curve round it, each drawn or left out and each written with a value or left as a question, and a shaded sector with its angle. For the parts of a circle, its circumference and its area.",
    params: {
        size: 5,
        lines: 3,
        centre: 1,
        radius: 0,
        diameter: 0,
        around: 0,
        sector: 0,
        ask: 0,
        unit: "",
    },
    settings: {
        size: { kind: "whole", min: 3, max: 8 },
        lines: { kind: "one of", of: [0, 1, 2, 3] },
        centre: { kind: "one of", of: [0, 1] },
        radius: { kind: "number", min: 0, max: 1000, step: 0.1 },
        diameter: { kind: "number", min: 0, max: 1000, step: 0.1 },
        around: { kind: "number", min: 0, max: 10000, step: 0.01 },
        sector: { kind: "whole", min: 0, max: 359 },
        ask: { kind: "one of", of: [0, 1, 2, 3, 4] },
        unit: { kind: "text", most: 4 },
    },
    takes: [
        {
            label: "Radius and diameter",
            params: {
                size: 5,
                lines: 3,
                centre: 1,
                radius: 4,
                diameter: 8,
                around: 0,
                sector: 0,
                ask: 0,
                unit: "cm",
            },
        },
        {
            label: "Find the diameter",
            params: {
                size: 5,
                lines: 3,
                centre: 1,
                radius: 7,
                diameter: 0,
                around: 0,
                sector: 0,
                ask: 2,
                unit: "m",
            },
        },
        {
            label: "The way round",
            params: {
                size: 5,
                lines: 2,
                centre: 1,
                radius: 0,
                diameter: 10,
                around: 31.4,
                sector: 0,
                ask: 0,
                unit: "cm",
            },
        },
        {
            label: "A sector",
            params: {
                size: 5,
                lines: 1,
                centre: 1,
                radius: 6,
                diameter: 0,
                around: 0,
                sector: 90,
                ask: 4,
                unit: "cm",
            },
        },
    ],
    box: (p) => ({ w: p.size * 2 + 4, h: p.size * 2 + 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            r = p.size * U,
            cx = r + 2 * U,
            cy = r + 2 * U,
            unit = p.unit ? ` ${p.unit}` : "",
            a: RawAnchors = { centre: [cx, cy, "down"] };
        const value = (v: number, which: number): string =>
            p.ask === which ? "?" : v > 0 ? `${shown(v)}${unit}` : "";
        const turn = Math.max(0, Math.min(359, p.sector)) / 360;
        if (turn > 0) {
            // The sector opens from three o'clock towards six, clear of the radius, which points up and right.
            pen.path(
                g,
                sector(cx, cy, r, Math.PI / 2, Math.PI / 2 + turn * 2 * Math.PI),
                "ruler",
                pen.fill("glow", "solid", { hachureGap: 7 }),
                { strokeWidth: 1.6 },
            );
            pen.arc(g, cx, cy, 40, 40, 0, turn * 2 * Math.PI, "ruler", { strokeWidth: 1.4 });
            const [sx, sy] = onCircle(cx, cy, r * 0.55, 0.25 + turn / 2);
            const said = p.ask === 4 ? "?" : `${p.sector}°`;
            numOn(c, sx, sy + 6, said, 16);
            a.sector = [sx, sy, "right"];
        }
        pen.circle(g, cx, cy, r * 2, "ruler", null, { strokeWidth: 2.2 });
        const around = value(p.around, 3);
        if (around) {
            pen.arc(g, cx, cy, r * 2, r * 2, -Math.PI * 0.8, -Math.PI * 0.2, "ruler", {
                strokeWidth: 3.2,
                stroke: c.t.pen,
            });
            num(c, cx, cy - r - 12, around, 16);
        }
        a.around = [cx, cy - r, "up"];
        const radius = p.lines === 1 || p.lines === 3;
        const diameter = p.lines === 2 || p.lines === 3;
        if (diameter) {
            pen.line(g, cx - r, cy, cx + r, cy, "ruler", { strokeWidth: 2 });
            const said = value(p.diameter, 2);
            if (said) {
                patch(c, cx - r / 2, cy + 14, said.length * 9 + 8, 18);
                num(c, cx - r / 2, cy + 20, said, 16);
            }
            a.diameter = [cx - r / 2, cy, "down"];
        }
        if (radius) {
            const [ex, ey] = onCircle(cx, cy, r, 0.125);
            pen.line(g, cx, cy, ex, ey, "ruler", { strokeWidth: 2 });
            const said = value(p.radius, 1);
            // written on the upper left side of the line, so it never meets the diameter under it
            const [mx, my] = onCircle(cx, cy, r / 2, 0.125);
            if (said) {
                patch(c, mx - 16, my - 18, said.length * 9 + 8, 18);
                num(c, mx - 12, my - 12, said, 16, "end");
            }
            a.radius = [mx, my, "up"];
        }
        if (p.centre === 1) pen.circle(g, cx, cy, 7, "ruler", pen.fill("ink"), { strokeWidth: 1 });
        return a;
    },
    describe: (p) =>
        `A circle drawn in ink${p.centre === 1 ? " with its centre marked" : ""}${p.lines === 3 ? ", a radius and a diameter ruled across it" : p.lines === 1 ? ", a radius ruled from the centre" : p.lines === 2 ? ", a diameter ruled across it" : ""}${p.sector > 0 ? ", one sector shaded" : ""}, with values written by its parts.`,
    motion: { still: STILL.instrument },
});
