import { letter, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";

const SCALE = ["C", "D", "E", "F", "G", "A", "B", "C"];

const BARS = ["berry", "tang", "glow", "mint", "sky"] as const;

export const chimeBars = defineDrawing({
    id: "chimebars",
    family: "music",
    title: "Chime bars",
    group: "Props",
    about: "Chime bars on a wooden stand, each a little shorter than the one before, from a long low C up to a short high C, with a beater to strike them. The shorter the bar, the higher the note, which is a comparison before it is a scale.",
    params: { bars: 8, letters: 1 },
    settings: {
        bars: { kind: "whole", min: 1, max: 8 },
        letters: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "C to C, lettered", params: { bars: 8, letters: 1 } },
        { label: "Five, no letters", params: { bars: 5, letters: 0 } },
    ],
    box: (p) => ({ w: Math.ceil(Math.max(3, Math.min(8, Math.round(p.bars))) * 1.5 + 2), h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(3, Math.min(8, Math.round(p.bars))),
            W = Math.ceil(n * 1.5 + 2) * U,
            mid = 3.6 * U,
            a: RawAnchors = {};
        pen.polygon(
            g,
            [
                [0.3 * U, mid + 1.9 * U],
                [W - 0.3 * U, mid + 1.3 * U],
                [W - 0.3 * U, mid + 1.8 * U],
                [0.3 * U, mid + 2.5 * U],
            ],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.6 },
        );
        for (let i = 0; i < n; i++) {
            const x = (1.2 + i * 1.5) * U,
                h = (5.4 - i * 0.42) * U,
                top = mid - h / 2 + i * 0.04 * U;
            pen.rect(g, x, top, 1.05 * U, h, "ruler", pen.fill(BARS[i % BARS.length], "solid"), {
                strokeWidth: 1.4,
            });
            for (const y of [top + 0.35 * U, top + h - 0.35 * U])
                pen.circle(g, x + 0.52 * U, y, 5, "ruler", pen.fill("card"), { strokeWidth: 0.8 });
            if (p.letters > 0)
                letter(c, {
                    x: x + 0.52 * U,
                    y: top + h / 2 + 6,
                    s: SCALE[i] ?? "",
                    face: "read",
                    weight: 700,
                    size: 16,
                    fill: c.t.ink,
                    anchor: "middle",
                });
            a[`bar(${i})`] = [x + 0.52 * U, top, "up"];
        }
        pen.line(g, W - 2.4 * U, 0.5 * U, W - 0.9 * U, 1.4 * U, "pencil", {
            strokeWidth: 2.4,
            stroke: c.t.tang,
        });
        pen.circle(g, W - 2.5 * U, 0.45 * U, 0.55 * U, "pencil", pen.fill("berry"), {
            strokeWidth: 1.1,
        });
        return a;
    },
    describe: () =>
        "Chime bars on a wooden stand, each a little shorter than the one before, from a long low bar up to a short high one, with a beater beside them.",
    motion: { still: STILL.music },
});
