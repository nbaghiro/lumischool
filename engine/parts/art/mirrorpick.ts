import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { paintFill, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { cap, num } from "../lettering";
import { CELL_PAINTS, mirrorOptions } from "./kit";

export const mirrorPick = defineDrawing({
    id: "mirrorpick",
    family: "art",
    title: "Finish the mirror",
    group: "Structures",
    about: "Half a pattern of painted squares beside a mirror line, with its other half missing, and three halves to choose from: the true mirror, the same half copied across without turning, and the mirror with one square changed. As wings it is half a butterfly; as a print it is the block and three prints, and the print is the mirror of the block. As whole butterflies each half is already joined on, and only one of the three is the same on both sides of its fold.",
    params: { seed: 3, rows: 4, cols: 3, answer: 0, kind: "wings" },
    settings: {
        seed: { kind: "whole", min: 1, max: 99 },
        rows: { kind: "whole", min: 2, max: 8 },
        cols: { kind: "whole", min: 2, max: 6 },
        answer: { kind: "whole", min: 0, max: 2 },
        kind: { kind: "one of", of: ["wings", "print", "whole"] },
    },
    takes: [
        {
            label: "Wings, the mirror is A",
            params: { seed: 3, rows: 4, cols: 3, answer: 0, kind: "wings" },
        },
        {
            label: "A print, the mirror is C",
            params: { seed: 8, rows: 4, cols: 3, answer: 2, kind: "print" },
        },
        {
            label: "Three whole butterflies, B is the same both sides",
            params: { seed: 5, rows: 4, cols: 3, answer: 1, kind: "whole" },
        },
    ],
    box: (p) =>
        p.kind === "whole"
            ? { w: Math.round(3 * (2 * Math.round(p.cols) + 1.5) + 0.5), h: Math.round(p.rows) + 4 }
            : {
                  w: Math.max(3 * (Math.round(p.cols) + 2) + 1, 2 * Math.round(p.cols) + 4),
                  h: 2 * Math.round(p.rows) + 5,
              },
    draw: (c, p) => {
        const { pen, g } = c,
            rows = Math.round(p.rows),
            cols = Math.round(p.cols),
            a: RawAnchors = {};
        const { half, options } = mirrorOptions(p.seed, rows, cols, p.answer);
        const cells = (grid: number[][], x0: number, y0: number, dashed = false) => {
            grid.forEach((row, r) =>
                row.forEach((v, k) => {
                    const x = x0 + k * U,
                        y = y0 + r * U;
                    pen.rect(
                        g,
                        x,
                        y,
                        U,
                        U,
                        "ruler",
                        v >= 0 ? paintFill(c, panColour(CELL_PAINTS[v] ?? "red")) : null,
                        { strokeWidth: 1.1, stroke: dashed ? c.t["ink-soft"] : c.t.ink },
                    );
                }),
            );
        };
        if (p.kind === "whole") {
            options.forEach((o, i) => {
                const x = (0.75 + i * (2 * cols + 1.5)) * U,
                    fold = x + cols * U;
                cells(half, x, 1 * U);
                cells(o, fold, 1 * U);
                pen.line(g, fold, 0.4 * U, fold, (rows + 1.6) * U, "ruler", {
                    strokeWidth: 2.2,
                    strokeLineDash: [8, 6],
                    stroke: c.t.pen,
                });
                num(c, fold, (rows + 3) * U, "ABC"[i] ?? "", 16);
                a[`option(${i})`] = [fold, 0.4 * U, "up"];
            });
            return a;
        }
        const topW = 2 * cols + 2,
            left = ((Math.max(3 * (cols + 2) + 1, 2 * cols + 4) - topW) / 2) * U;
        if (p.kind === "print") {
            pen.path(
                g,
                roundedRect(left + 0.2 * U, 0.2 * U, (cols + 1.6) * U, (rows + 1.6) * U, 8),
                "pencil",
                c.pen.fill("tang", "hachure", { hachureGap: 7, hachureAngle: 80 }),
                { strokeWidth: 1.8 },
            );
            cells(half, left + 1 * U, 1 * U);
            cap(c, left + (cols / 2 + 1) * U, (rows + 2.4) * U, "block", 10);
            c.pen.arrow(
                g,
                [left + (cols + 2.2) * U, (rows / 2 + 1) * U],
                [left + (cols + 4) * U, (rows / 2 + 1) * U],
                c.t.pen,
                0.1,
                2,
            );
            pen.rect(g, left + (cols + 4.4) * U, 1 * U, cols * U, rows * U, "ruler", null, {
                strokeWidth: 1.4,
                strokeLineDash: [6, 5],
                stroke: c.t["ink-soft"],
            });
            num(c, left + (cols * 1.5 + 4.4) * U, (rows / 2 + 1.4) * U, "?", 24, "middle", c.t.pen);
            a.mirror = [left + (cols + 3) * U, 1 * U, "up"];
        } else {
            cells(half, left + 1 * U, 1 * U);
            const mx = left + (cols + 1) * U;
            pen.rect(g, mx, 1 * U, cols * U, rows * U, "ruler", null, {
                strokeWidth: 1.4,
                strokeLineDash: [6, 5],
                stroke: c.t["ink-soft"],
            });
            num(c, mx + (cols / 2) * U, (rows / 2 + 1.4) * U, "?", 24, "middle", c.t.pen);
            pen.line(g, mx, 0.2 * U, mx, (rows + 1.8) * U, "ruler", {
                strokeWidth: 2.4,
                strokeLineDash: [9, 6],
                stroke: c.t.pen,
            });
            pen.ellipse(
                g,
                mx,
                (rows / 2 + 1) * U,
                0.55 * U,
                (rows + 0.4) * U,
                "pencil",
                c.pen.fill("ink-soft"),
                { strokeWidth: 1.6 },
            );
            pen.path(
                g,
                `M${mx - 3} ${0.9 * U}Q${mx - 8} ${0.2 * U} ${mx - 15} ${0.3 * U}M${mx + 3} ${0.9 * U}Q${mx + 8} ${0.2 * U} ${mx + 15} ${0.3 * U}`,
                "pencil",
                null,
                { strokeWidth: 1.6 },
            );
            a.mirror = [mx, 0.4 * U, "up"];
        }
        const y0 = (rows + 3) * U;
        options.forEach((o, i) => {
            const x = (1 + i * (cols + 2)) * U;
            cells(o, x, y0);
            num(c, x + (cols / 2) * U, y0 + (rows + 1.5) * U, "ABC"[i] ?? "", 16);
            a[`option(${i})`] = [x + (cols / 2) * U, y0, "up"];
        });
        return a;
    },
    describe: (p) =>
        p.kind === "whole"
            ? "Three whole patterns of painted squares side by side, each with a dashed fold line down its middle, lettered A, B and C underneath."
            : p.kind === "print"
              ? "Half a pattern of painted squares on a wooden block, an arrow to an empty dashed square, and three prints lettered A, B and C below."
              : "Half a pattern of painted squares beside a dashed mirror line with the other half missing, and three halves lettered A, B and C to choose from below.",
});
