import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, soft } from "../lettering";

const whole = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/**
 * Ten metres of a striped measuring pole, a square to a metre, with its top labelled: stood one on
 * another they make a pole as tall as a field needs, read in tens with a tick at every five.
 */
export const heightPole = defineDrawing<{ from: number; top: boolean }>({
    id: "heightpole",
    family: "sport",
    title: "Height pole",
    group: "Structures",
    about: "Ten metres of a tall striped measuring pole, a square to a metre: a mark and its number at the top, a tick halfway, and a cap on the top of the last length.",
    params: { from: 0, top: false },
    settings: { from: { kind: "whole", min: 0, max: 90 }, top: { kind: "flag" } },
    takes: [
        { label: "The foot, nought to ten", params: { from: 0, top: false } },
        { label: "The top, forty to fifty", params: { from: 40, top: true } },
    ],
    box: () => ({ w: 3, h: 10 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            from = whole(p.from, 0, 90),
            x = 0.4 * U,
            w = 0.36 * U;
        for (let i = 0; i < 4; i++)
            pen.rect(
                g,
                x,
                i * 2.5 * U,
                w,
                2.5 * U,
                "ruler",
                pen.fill(i % 2 ? "card" : "tang", "solid"),
                {
                    strokeWidth: 1,
                    roughness: 0.15,
                },
            );
        pen.line(g, x - 0.1 * U, 0.05 * U, x + w + 0.7 * U, 0.05 * U, "ruler", {
            strokeWidth: 1.8,
        });
        pen.line(g, x + w, 5 * U, x + w + 0.35 * U, 5 * U, "ruler", { strokeWidth: 1.2 });
        num(c, x + w + 0.8 * U, 0.55 * U, from + 10, 14, "start");
        soft(
            c,
            x + w + 0.85 * U + String(from + 10).length * 14 * 0.56,
            0.55 * U,
            "m",
            11,
            "start",
        );
        if (from === 0) num(c, x + w + 0.8 * U, 9.95 * U, 0, 14, "start");
        if (p.top)
            pen.rect(
                g,
                x - 0.15 * U,
                0.1 * U,
                w + 0.3 * U,
                0.4 * U,
                "ruler",
                pen.fill("berry", "solid"),
                {
                    strokeWidth: 1,
                },
            );
        return { top: [x + w / 2, 0, "up"], foot: [x + w / 2, 10 * U, "down"] };
    },
    describe: (p) =>
        `Ten metres of a tall striped measuring pole in orange and white, its top marked ${whole(p.from, 0, 90) + 10} metres and a tick halfway down${p.top ? ", with a pink cap on top" : ""}.`,
    reads: true,
    motion: { still: "A measuring pole holds still so its marks can be read." },
});
