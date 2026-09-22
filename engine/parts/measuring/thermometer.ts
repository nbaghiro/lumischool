import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, soft } from "../lettering";

export const thermometer = defineDrawing({
    id: "thermometer",
    family: "measuring",
    title: "Thermometer",
    group: "Structures",
    about: "A tube ten squares tall whatever the range, with the numbered marks worked out from the step and half marks between them. Below zero the column shortens, which is the point of the negative half.",
    params: { from: -10, to: 50, step: 10, value: 21, unit: "°C" },
    settings: {
        from: { kind: "whole", min: -50, max: 100 },
        to: { kind: "whole", min: -40, max: 150 },
        step: { kind: "whole", min: 1, max: 50 },
        value: { kind: "whole", min: -50, max: 150 },
        unit: { kind: "text", most: 4 },
    },
    takes: [
        {
            label: "21 degrees",
            params: { from: -10, to: 50, step: 10, value: 21, unit: "\u00b0C" },
        },
        {
            label: "Below freezing",
            params: { from: -20, to: 40, step: 10, value: -7, unit: "\u00b0C" },
        },
        {
            label: "A fever, finer scale",
            params: { from: 35, to: 41, step: 2, value: 38.5, unit: "\u00b0C" },
        },
        { label: "Fahrenheit", params: { from: 0, to: 100, step: 20, value: 68, unit: "\u00b0F" } },
    ],
    box: () => ({ w: 9, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x = 2.6 * U,
            w = 1.2 * U,
            top = U,
            bottom = 11 * U,
            span = p.to - p.from || 1;
        const at = (v: number) =>
            bottom - ((Math.max(p.from, Math.min(v, p.to)) - p.from) / span) * (bottom - top);
        pen.path(g, roundedRect(x, top, w, bottom - top + 20, w / 2), "ruler", pen.fill("card"), {
            strokeWidth: 2,
        });
        pen.circle(
            g,
            x + w / 2,
            11.9 * U,
            2.2 * U,
            "ruler",
            pen.fill("berry", "solid", { hachureGap: 5 }),
            { strokeWidth: 2 },
        );
        const y = at(p.value);
        pen.rect(
            g,
            x + 3,
            y,
            w - 6,
            bottom - y + 18,
            "ruler",
            pen.fill("berry", "solid", { hachureGap: 4 }),
            { strokeWidth: 0 },
        );
        const a: RawAnchors = { bulb: [x + w / 2, 11.9 * U, "down"], top: [x + w / 2, top, "up"] };
        const half = p.step / 2;
        for (let v = p.from; v <= p.to; v += half) {
            const yy = at(v),
                major = (v - p.from) % p.step === 0;
            pen.line(g, x + w, yy, x + w + (major ? 16 : 8), yy, "ruler", {
                strokeWidth: major ? 1.6 : 1,
            });
            if (major) {
                num(c, x + w + 22, yy + 5, v, 14, "start");
                a[`mark(${v})`] = [x + w, yy, "right"];
            }
            if (v < 0)
                pen.line(g, x - (major ? 16 : 8), yy, x, yy, "ruler", {
                    strokeWidth: major ? 1.4 : 0.9,
                    stroke: c.t["ink-soft"],
                });
        }
        soft(c, x + w + 30, 12.6 * U, p.unit, 14);
        a.reading = [x + w, y, "right"];
        return a;
    },
    describe: () =>
        "A thermometer, a glass tube on a card with its scale marked in steps beside it and the unit written, a red column rising from the bulb.",
});
