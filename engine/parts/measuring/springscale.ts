import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num, soft } from "../lettering";

export const springScale = defineDrawing({
    id: "springscale",
    family: "measuring",
    title: "Spring balance",
    group: "Props",
    about: "The hanging balance from the science cupboard: a hook, a barrel with a window, and a pointer that can sit between two marks. Reading it is the same skill as reading a jug, turned on its side.",
    params: { max: 500, step: 100, value: 250, unit: "g" },
    settings: {
        max: { kind: "whole", min: 100, max: 5000 },
        step: { kind: "whole", min: 10, max: 1000 },
        value: { kind: "whole", min: 0, max: 5000 },
        unit: { kind: "text", most: 4 },
    },
    takes: [
        { label: "250 g", params: { max: 500, step: 100, value: 250, unit: "g" } },
        { label: "Between marks", params: { max: 1000, step: 200, value: 340, unit: "g" } },
        { label: "Nothing hanging", params: { max: 500, step: 100, value: 0, unit: "g" } },
    ],
    box: () => ({ w: 7, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 3.2 * U,
            w = 2 * U,
            top = 2.4 * U,
            bottom = 11 * U;
        const at = (v: number) => top + (Math.max(0, Math.min(v, p.max)) / p.max) * (bottom - top);
        pen.arc(g, cx, 1.6 * U, 1.4 * U, 1.4 * U, Math.PI * 0.85, Math.PI * 2.15, "ruler", {
            strokeWidth: 2.4,
        });
        pen.path(
            g,
            roundedRect(cx - w / 2, top - 12, w, bottom - top + 40, 8),
            "ruler",
            pen.fill("card"),
            { strokeWidth: 2.2 },
        );
        const a: RawAnchors = { hook: [cx, U, "up"], hang: [cx, 13 * U, "down"] };
        const half = p.step / 2;
        for (let v = 0; v <= p.max; v += half) {
            const y = at(v),
                major = v % p.step === 0;
            pen.line(g, cx - w / 2, y, cx - w / 2 + (major ? 16 : 9), y, "ruler", {
                strokeWidth: major ? 1.5 : 0.9,
            });
            if (major) {
                num(c, cx + w / 2 - 6, y + 5, v, 12, "end");
                a[`mark(${v})`] = [cx - w / 2, y, "left"];
            }
        }
        const y = at(p.value);
        pen.polygon(
            g,
            [
                [cx - w / 2 - 16, y],
                [cx - w / 2 - 2, y - 7],
                [cx - w / 2 - 2, y + 7],
            ],
            "ruler",
            pen.fill("berry"),
            { strokeWidth: 1.4 },
        );
        pen.line(g, cx, bottom + 28, cx, 12.2 * U, "ruler", { strokeWidth: 1.8 });
        pen.arc(g, cx, 12.6 * U, 1.2 * U, 1.2 * U, Math.PI * 0.1, Math.PI * 1.3, "ruler", {
            strokeWidth: 2.2,
        });
        soft(c, cx + w / 2 + 22, top + 16, p.unit, 13, "start");
        a.pointer = [cx - w / 2 - 16, y, "left"];
        return a;
    },
    describe: () =>
        "A spring scale hanging from a ring, its scale marked down the front in steps with the unit written, a pointer at the reading and a hook below.",
    motion: { still: STILL.instrument },
    reads: true,
});
