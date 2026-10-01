import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

/** Squares across the road the line spans: the road drawing's three lanes of three. */
export const FINISHLINE = { w: 1, h: 9 } as const;

export const finishLine = defineDrawing({
    id: "finishline",
    family: "travel",
    title: "Finish line",
    group: "Structures",
    about: "A chequered finish line painted across a road of three lanes, seen from above, two squares wide and black and white in turn, where a race or a delivery round ends.",
    params: { rows: 9 },
    settings: { rows: { kind: "whole", min: 3, max: 12 } },
    takes: [
        { label: "Across three lanes", params: { rows: 9 } },
        { label: "A short line", params: { rows: 4 } },
    ],
    box: (p) => ({ w: FINISHLINE.w, h: Math.max(3, Math.min(12, Math.round(p.rows))) }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            rows = Math.max(3, Math.min(12, Math.round(p.rows))),
            side = U / 2;
        for (let r = 0; r < rows * 2; r++)
            for (let col = 0; col < 2; col++)
                pen.rect(
                    g,
                    col * side,
                    r * side,
                    side,
                    side,
                    "ruler",
                    pen.fill((r + col) % 2 ? "card" : "ink"),
                    { strokeWidth: 0.6, ...FIRM },
                );
        pen.rect(g, 0, 0, U, rows * U, "pencil", null, { strokeWidth: 1.6 });
        return { top: [U / 2, 0, "up"], bottom: [U / 2, rows * U, "down"] };
    },
    describe: (p) =>
        `A chequered finish line of black and white squares painted across a road, ${Math.max(3, Math.min(12, Math.round(p.rows)))} squares long, seen from above where the round ends.`,
});
