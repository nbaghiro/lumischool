import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, soft } from "../lettering";

export const tapeMeasure = defineDrawing({
    id: "tape",
    family: "measuring",
    title: "Tape measure",
    group: "Props",
    about: "The blade out of its case, marked every centimetre and numbered every ten, for lengths a thirty centimetre rule cannot reach. The hook is at zero, which is where a child will not start from. An item that asks what the tape reads sets showReading=false, so the arrow points and the child reads the marks.",
    params: { to: 100, step: 10, mark: 65, unit: "cm", showReading: true },
    settings: {
        to: { kind: "whole", min: 10, max: 500 },
        step: { kind: "whole", min: 1, max: 100 },
        mark: { kind: "whole", min: 0, max: 500 },
        unit: { kind: "text", most: 4 },
        showReading: { kind: "flag" },
    },
    takes: [
        { label: "65 cm", params: { to: 100, step: 10, mark: 65, unit: "cm", showReading: true } },
        {
            label: "A shorter run",
            params: { to: 50, step: 10, mark: 34, unit: "cm", showReading: true },
        },
        {
            label: "Nothing marked",
            params: { to: 100, step: 20, mark: 0, unit: "cm", showReading: true },
        },
        {
            label: "Read it yourself",
            params: { to: 100, step: 10, mark: 45, unit: "cm", showReading: false },
        },
    ],
    box: (p) => ({ w: Math.ceil((p.to / p.step) * 2) + 7, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 4.6 * U,
            a: RawAnchors = {};
        const x0 = 4.5 * U,
            pitch = (2 * U) / p.step;
        const at = (v: number) => x0 + v * pitch;
        pen.path(
            g,
            roundedRect(0.5 * U, 2.6 * U, 3.6 * U, 3.4 * U, 12),
            "ruler",
            pen.fill("tang", "solid", { hachureGap: 7 }),
            { strokeWidth: 2.2 },
        );
        pen.path(g, roundedRect(U, 3.2 * U, 2.2 * U, 1.4 * U, 5), "ruler", pen.fill("card"), {
            strokeWidth: 1.4,
        });
        pen.rect(
            g,
            x0 - 10,
            y - 0.9 * U,
            at(p.to) - x0 + 20,
            1.8 * U,
            "ruler",
            pen.fill("glow", "solid", { hachureGap: 9, fillWeight: 0.6 }),
            { strokeWidth: 2 },
        );
        pen.rect(
            g,
            x0 - 16,
            y - 1.1 * U,
            10,
            2.2 * U,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.4 },
        );
        for (let v = 0; v <= p.to; v++) {
            const major = v % p.step === 0,
                mid = v % (p.step / 2) === 0;
            if (!major && !mid && pitch < 3.5) continue;
            pen.line(
                g,
                at(v),
                y - 0.9 * U,
                at(v),
                y - 0.9 * U + (major ? 20 : mid ? 13 : 8),
                "ruler",
                { strokeWidth: major ? 1.6 : 0.9 },
            );
            if (major) {
                patch(c, at(v), y + 8, 30, 18);
                num(c, at(v), y + 16, v, 13);
                a[`mark(${v})`] = [at(v), y - 0.9 * U, "up"];
            }
        }
        if (p.mark > 0) {
            pen.arrow(g, [at(p.mark), y - 2.6 * U], [at(p.mark), y - 1.1 * U], c.t.pen, 0.02);
            if (p.showReading)
                num(c, at(p.mark), y - 2.9 * U, `${p.mark} ${p.unit}`, 15, "middle", c.t.pen);
            a.reading = [at(p.mark), y - 0.9 * U, "up"];
        }
        soft(c, at(p.to) + 4, y + 1.9 * U, p.unit, 12, "end");
        return a;
    },
    describe: (p) =>
        `A tape measure unrolled along the page, its scale marked in steps with the unit at the end, and a pencil mark on it${p.showReading ? " with the reading written above" : ""}.`,
});
