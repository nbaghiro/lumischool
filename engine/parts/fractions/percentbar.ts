import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say } from "../lettering";
import { BAR } from "./bar";

export const percentBar = defineDrawing({
    id: "percentbar",
    family: "fractions",
    title: "Percent bar",
    group: "Structures",
    about: "A bar of a hundred with ten marked tenths and the part filled from the left. The same bar carries the fraction and the decimal underneath it, which is where the three ways of saying it meet.",
    params: { percent: 35, show: true, whole: 0 },
    settings: {
        percent: { kind: "whole", min: 0, max: 100 },
        show: { kind: "flag" },
        whole: { kind: "whole", min: 0, max: 1000 },
    },
    takes: [
        { label: "35 percent", params: { percent: 35, show: true, whole: 0 } },
        { label: "A half", params: { percent: 50, show: true, whole: 0 } },
        { label: "Of an amount", params: { percent: 25, show: false, whole: 80 } },
        { label: "Nearly all of it", params: { percent: 90, show: true, whole: 0 } },
    ],
    box: () => ({ w: BAR + 4, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            x0 = 2 * U,
            w = BAR * U,
            y = 2.4 * U,
            h = 2 * U,
            a: RawAnchors = {};
        const at = (v: number) => x0 + (Math.max(0, Math.min(100, v)) / 100) * w;
        pen.rect(
            g,
            x0,
            y,
            at(p.percent) - x0,
            h,
            "ruler",
            pen.fill("mint", "solid", { hachureGap: 6 }),
            { strokeWidth: 0 },
        );
        for (let k = 1; k < 10; k++)
            pen.line(g, x0 + (k * w) / 10, y, x0 + (k * w) / 10, y + h, "ruler", {
                strokeWidth: k === 5 ? 1.6 : 0.9,
            });
        pen.rect(g, x0, y, w, h, "ruler", null, { strokeWidth: 2.4 });
        pen.line(g, at(p.percent), y - 10, at(p.percent), y + h + 10, "ruler", {
            strokeWidth: 2.4,
            stroke: c.t.pen,
        });
        num(c, x0, y - 14, "0%", 14, "start");
        num(c, x0 + w, y - 14, "100%", 14, "end");
        // The moving label goes under the bar: above it, ninety percent would sit on the hundred.
        num(c, at(p.percent), y + h + 24, `${p.percent}%`, 18, "middle", c.t.pen);
        const a2: RawAnchors = {
            mark: [at(p.percent), y, "up"],
            start: [x0, y + h, "down"],
            end: [x0 + w, y + h, "down"],
        };
        if (p.show) {
            const g100 = (n: number, d: number): number => (d ? g100(d, n % d) : n);
            const d = g100(p.percent, 100) || 1;
            say(
                c,
                x0 + w / 2,
                y + h + 2.6 * U,
                `${p.percent}/100 = ${p.percent / d}/${100 / d} = ${(p.percent / 100).toFixed(2)}`,
                17,
            );
            a2.written = [x0 + w / 2, y + h + 2.8 * U, "down"];
        }
        if (p.whole) {
            say(c, x0 + w / 2, y - 1.6 * U, `of ${p.whole}`, 15);
            a2.whole = [x0 + w / 2, y - 1.8 * U, "up"];
        }
        return { ...a, ...a2 };
    },
    describe: (p) =>
        `A percent bar marked 0% and 100% at its ends and ruled into tenths, shaded green from the left to a pencil line${p.show ? ", the fraction and decimal written under it" : ""}.`,
});
