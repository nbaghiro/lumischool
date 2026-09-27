import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";

interface RailParams {
    /** Across, in squares. */
    w: number;
    /** Tall, in squares, from the top bar to the floor under the wheels. */
    h: number;
    /** Where each bar is, in squares down from the top. */
    bars: number[];
    /** Where the shoe shelf is, in squares down from the top, or 0 for none. */
    shelf: number;
}

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

export const clothesRail = defineDrawing<RailParams>({
    id: "clothesrail",
    family: "home",
    title: "Clothes rail",
    group: "Props",
    about: "A clothes rail on wheels, with a bar or two to hang things from and a low shelf for shoes. It is the shop or the wardrobe a dressing-up game chooses from, and each bar says where a hanger goes.",
    params: { w: 20, h: 22, bars: [1, 10], shelf: 19 },
    settings: {
        w: { kind: "whole", min: 6, max: 34 },
        h: { kind: "whole", min: 6, max: 40 },
        bars: { kind: "numbers", min: 1, max: 38, most: 3 },
        shelf: { kind: "whole", min: 0, max: 38 },
    },
    takes: [
        { label: "Two bars and a shelf", params: { w: 20, h: 22, bars: [1, 10], shelf: 19 } },
        { label: "One bar", params: { w: 14, h: 10, bars: [1], shelf: 0 } },
        { label: "A long rail", params: { w: 30, h: 12, bars: [1], shelf: 9 } },
    ],
    box: (p) => ({ w: Math.round(p.w), h: Math.round(p.h) }),
    draw: (c, p) => {
        const { pen, g } = c,
            W = Math.round(p.w) * U,
            floor = Math.round(p.h) * U;
        const left = 0.7 * U,
            right = W - 0.7 * U,
            base = floor - 0.9 * U;
        const bars = p.bars.map((b) => b * U).filter((y) => y > 0 && y < base);
        const top = Math.min(...bars, base - U) - 0.2 * U;
        const a: RawAnchors = {};
        for (const x of [left, right]) {
            pen.line(g, x, top, x, base, "pencil", { strokeWidth: 3, ...FIRM });
            pen.line(g, x - 0.6 * U, base, x + 0.6 * U, base, "pencil", {
                strokeWidth: 2.6,
                ...FIRM,
            });
            for (const k of [-1, 1])
                pen.circle(
                    g,
                    x + k * 0.45 * U,
                    floor - 0.45 * U,
                    0.7 * U,
                    "ruler",
                    pen.fill("grid"),
                    {
                        strokeWidth: 1.4,
                    },
                );
        }
        bars.forEach((y, i) => {
            pen.line(g, left - 0.3 * U, y, right + 0.3 * U, y, "ruler", {
                strokeWidth: 3.4,
                ...FIRM,
            });
            for (const x of [left - 0.3 * U, right + 0.3 * U])
                pen.circle(g, x, y, 0.5 * U, "ruler", pen.fill("tang"), { strokeWidth: 1.4 });
            a[`bar(${i})`] = [W / 2, y, "up"];
        });
        const shelf = p.shelf * U;
        if (shelf > top && shelf < base) {
            pen.rect(g, left, shelf, right - left, 0.45 * U, "ruler", pen.fill("tang"), {
                strokeWidth: 1.6,
                ...FIRM,
            });
            a.shelf = [W / 2, shelf, "up"];
        }
        a.floor = [W / 2, floor, "down"];
        return a;
    },
    describe: (p) => {
        const n = p.bars.length;
        const bars = n === 1 ? "one bar" : n === 2 ? "two bars" : "three bars";
        const shelf = p.shelf > 0 ? " and a low wooden shelf for shoes" : "";
        return `An empty clothes rail on four small wheels, with ${bars} to hang coat hangers from${shelf}, standing ready.`;
    },
    motion: { still: STILL.setting },
});
