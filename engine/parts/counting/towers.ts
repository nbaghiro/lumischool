import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

const MARKER_CYCLE: Marker[] = ["berry", "sky", "mint", "tang", "glow"];

export const cubeTowers = defineDrawing({
    id: "towers",
    family: "counting",
    title: "Cube towers",
    group: "Structures",
    about: "Towers of interlocking cubes standing in a row, each cube drawn with its top and side so a tower reads as a thing that can be built and taken apart. Heights are counted, compared and made equal: a dashed level across the row asks how many cubes each tower needs, or has to give, to reach it.",
    params: { heights: [3, 5, 2, 4], labels: true, level: 0 },
    settings: {
        heights: { kind: "numbers", min: 0, max: 10, most: 6 },
        labels: { kind: "flag" },
        level: { kind: "whole", min: 0, max: 10 },
    },
    takes: [
        { label: "Four towers", params: { heights: [3, 5, 2, 4], labels: true, level: 0 } },
        { label: "Make them level", params: { heights: [2, 6, 4], labels: true, level: 4 } },
        { label: "A staircase", params: { heights: [1, 2, 3, 4, 5], labels: false, level: 0 } },
    ],
    box: (p) => ({
        w: Math.ceil(0.8 + p.heights.length * 3 + 0.4),
        h: Math.ceil(0.9 + Math.max(1, p.level, ...p.heights) * 1.5 + 0.6 + (p.labels ? 1.8 : 0.4)),
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = 1.5 * U,
            d = 0.55 * U,
            a: RawAnchors = {};
        const tallest = Math.max(1, p.level, ...p.heights),
            base = (0.9 + tallest * 1.5 + 0.35) * U;
        const w = (0.8 + p.heights.length * 3 + 0.4) * U;
        pen.line(g, 0.3 * U, base, w - 0.2 * U, base, "ruler", { strokeWidth: 2.2 });
        p.heights.forEach((h, i) => {
            const x = (0.8 + i * 3) * U,
                color = MARKER_CYCLE[i % MARKER_CYCLE.length];
            for (let k = 0; k < h; k++) {
                const y = base - (k + 1) * s;
                pen.polygon(
                    g,
                    [
                        [x + s, y],
                        [x + s + d, y - d],
                        [x + s + d, y - d + s],
                        [x + s, y + s],
                    ],
                    "ruler",
                    pen.fill(color, "hachure", { hachureGap: 4, fillWeight: 0.8 }),
                    { strokeWidth: 1.3 },
                );
                pen.rect(g, x, y, s, s, "ruler", pen.fill(color, "solid", { hachureGap: 6 }), {
                    strokeWidth: 1.6,
                });
                pen.circle(g, x + s / 2, y + s / 2, 0.45 * U, "ruler", null, {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
            }
            const topY = base - h * s;
            if (h > 0)
                pen.polygon(
                    g,
                    [
                        [x, topY],
                        [x + d, topY - d],
                        [x + s + d, topY - d],
                        [x + s, topY],
                    ],
                    "ruler",
                    pen.fill("card"),
                    { strokeWidth: 1.3 },
                );
            if (p.labels) say(c, x + s / 2, base + 1.3 * U, String.fromCharCode(65 + i), 17);
            a[`tower(${i})`] = [x + s / 2, topY - d, "up"];
        });
        if (p.level > 0) {
            const y = base - p.level * s;
            pen.line(g, 0.3 * U, y, w - 0.2 * U, y, "pencil", {
                strokeWidth: 1.8,
                strokeLineDash: [8, 6],
                stroke: c.t.pen,
            });
            a.level = [w - 0.2 * U, y, "right"];
        }
        a.ground = [w / 2, base, "down"];
        return a;
    },
    describe: (p) =>
        `Towers of interlocking cubes in a row on a baseline, each tower its own colour with every cube drawn with a top and a side${p.labels ? ", and a letter under each" : ""}.`,
});
