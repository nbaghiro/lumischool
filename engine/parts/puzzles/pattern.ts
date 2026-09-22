import { roundedRect } from "../../ink/pen";
import { letter, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { drawProp } from "../props";

export const patternStrip = defineDrawing({
    id: "pattern",
    family: "puzzles",
    title: "Pattern strip",
    group: "Structures",
    about: "A unit of props repeated along a strip, with one cell left blank for the child to name.",
    params: { unit: ["circle", "triangle"], count: 6, missing: 6 },
    settings: {
        unit: { kind: "words", most: 6 },
        count: { kind: "whole", min: 1, max: 12 },
        missing: { kind: "whole", min: 0, max: 12 },
    },
    takes: [
        {
            label: "Two shapes, last gap",
            params: { unit: ["circle", "triangle"], count: 6, missing: 6 },
        },
        {
            label: "Three shapes, gap in the middle",
            params: { unit: ["square", "square", "circle"], count: 7, missing: 5 },
        },
        { label: "Apples and stars", params: { unit: ["apple", "star"], count: 5, missing: 3 } },
    ],
    box: (p) => ({ w: p.count * 3 + 1, h: 4 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            cell = 3 * U;
        for (let i = 0; i < p.count; i++) {
            const x = 10 + i * cell,
                cx = x + cell / 2;
            if (i + 1 === p.missing) {
                c.pen.path(c.g, roundedRect(x + 4, 14, cell - 8, 52, 8), "pencil", null, {
                    strokeWidth: 1.8,
                    strokeLineDash: [7, 6],
                });
                letter(c, {
                    x: cx,
                    y: 50,
                    s: "?",
                    face: "hand",
                    weight: 700,
                    size: 26,
                    fill: c.t.pen,
                    anchor: "middle",
                });
                a.gap = [cx, 14, "up"];
            } else {
                drawProp(c, p.unit[i % p.unit.length] ?? "counter", cx, 40, 40);
            }
            a[`item(${i})`] = [cx, 12, "up"];
        }
        return a;
    },
    describe: (p) =>
        p.missing >= 1 && p.missing <= p.count
            ? "A strip of cells holding a repeating pattern of small pictures, with one cell left blank and marked with a question mark."
            : "A strip of cells holding a repeating pattern of small pictures, drawn in a row across the page.",
});
