import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** A wooden ladder a climber goes up and down, as tall as it has rungs, a square apart. */
export const climbLadder = defineDrawing<{ rungs: number }>({
    id: "climbladder",
    family: "sport",
    title: "Climbing ladder",
    group: "Props",
    about: "A wooden ladder standing upright, two rails with a rung every square between them, for a climber to go up to a ledge and back down.",
    params: { rungs: 6 },
    settings: { rungs: { kind: "whole", min: 2, max: 12 } },
    takes: [
        { label: "Short", params: { rungs: 3 } },
        { label: "Tall", params: { rungs: 7 } },
    ],
    box: (p) => ({ w: 1, h: Math.max(2, Math.min(12, Math.round(Number(p.rungs) || 6))) }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        const n = Math.max(2, Math.min(12, Math.round(Number(p.rungs) || 6))),
            h = n * U;
        for (const x of [0.15 * U, 0.85 * U])
            pen.line(g, x, 0.1 * U, x, h - 0.1 * U, "pencil", {
                strokeWidth: 1.8,
                stroke: c.t.tang,
                roughness: 0.3,
            });
        for (let i = 0; i < n; i++)
            pen.line(g, 0.15 * U, (i + 0.5) * U, 0.85 * U, (i + 0.5) * U, "pencil", {
                strokeWidth: 1.4,
                roughness: 0.3,
            });
        return { top: [0.5 * U, 0, "up"] };
    },
    describe: (p) =>
        `A wooden ladder standing upright, two brown rails with ${Math.max(2, Math.min(12, Math.round(Number(p.rungs) || 6)))} rungs between them a square apart, for climbing up and down.`,
    motion: { still: "A ladder stands still where it leans." },
});
