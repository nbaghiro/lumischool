import type { RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

/**
 * The digger's body without its arm, facing right, and in squares from the box's middle where the
 * arm's pivot is and where the driver's head shows in the open cab. The arm is `diggerarm`, turned at the pivot.
 */
export const DIGGER = {
    w: 6,
    h: 4,
    pivot: { x: 2.1, y: 0.1 },
    seat: { x: -0.8, y: -0.8 },
} as const;

export const digger = defineDrawing({
    id: "digger",
    family: "travel",
    title: "Digger",
    group: "Props",
    about: "A yellow digger seen from the side, facing right, without its arm: caterpillar tracks on rollers, a heavy body with a counterweight at the back, and a cab with an open window the driver shows through.",
    params: { tracks: 5 },
    settings: { tracks: { kind: "whole", min: 3, max: 6 } },
    takes: [
        { label: "Five rollers", params: { tracks: 5 } },
        { label: "Three rollers", params: { tracks: 3 } },
    ],
    box: () => ({ w: DIGGER.w, h: DIGGER.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            yellow = pen.fill("glow"),
            line = { strokeWidth: 1.6 };
        const cx = (DIGGER.w / 2) * U,
            cy = (DIGGER.h / 2) * U;
        // the tracks and their rollers
        pen.path(
            g,
            roundedRect(0.3 * U, 3.05 * U, 5.4 * U, 0.85 * U, 8),
            "pencil",
            pen.fill("ink-soft"),
            line,
        );
        const n = Math.max(3, Math.min(6, Math.round(p.tracks)));
        for (let i = 0; i < n; i++) {
            const x = 0.75 * U + (i * 4.5 * U) / (n - 1);
            pen.circle(g, x, 3.47 * U, 0.5 * U, "ruler", pen.fill("card"), {
                strokeWidth: 0.9,
                ...FIRM,
            });
        }
        // the body, the counterweight at the back, and the open cab
        pen.rect(g, 0.4 * U, 2.1 * U, 5.1 * U, 0.95 * U, "pencil", yellow, line);
        pen.path(
            g,
            roundedRect(0.1 * U, 1.7 * U, 1.1 * U, 1.3 * U, 6),
            "pencil",
            pen.fill("ink-soft"),
            line,
        );
        // the cab is a frame round an open window, filled piece by piece so the driver shows through
        const frame: [number, number][][] = [
            [
                [0.9, 0.35],
                [2.9, 0.35],
                [2.75, 0.6],
                [0.9, 0.6],
            ],
            [
                [0.9, 0.6],
                [1.15, 0.6],
                [1.15, 1.75],
                [0.9, 1.75],
            ],
            [
                [0.9, 1.75],
                [3.5, 1.75],
                [3.5, 2.1],
                [0.9, 2.1],
            ],
            [
                [2.9, 0.35],
                [3.5, 1.1],
                [3.5, 1.75],
                [3.25, 1.75],
                [3.25, 1.2],
                [2.75, 0.6],
            ],
        ];
        for (const piece of frame)
            pen.polygon(
                g,
                piece.map(([x, y]) => [x * U, y * U]),
                "ruler",
                yellow,
                { stroke: "none", ...FIRM },
            );
        pen.path(
            g,
            `M${0.9 * U} ${2.1 * U}L${0.9 * U} ${0.35 * U}L${2.9 * U} ${0.35 * U}L${3.5 * U} ${1.1 * U}L${3.5 * U} ${2.1 * U}`,
            "pencil",
            null,
            line,
        );
        pen.path(
            g,
            `M${1.15 * U} ${1.75 * U}L${1.15 * U} ${0.6 * U}L${2.75 * U} ${0.6 * U}L${3.25 * U} ${1.2 * U}L${3.25 * U} ${1.75 * U}Z`,
            "ruler",
            null,
            { strokeWidth: 1.2, ...FIRM },
        );
        pen.line(g, 4.1 * U, 2.1 * U, 4.1 * U, 1.3 * U, "ruler", { strokeWidth: 2, ...FIRM });
        pen.rect(g, 4.6 * U, 1.55 * U, 1.1 * U, 0.6 * U, "pencil", yellow, line);
        return {
            pivot: [cx + DIGGER.pivot.x * U, cy + DIGGER.pivot.y * U, "right"],
            seat: [cx + DIGGER.seat.x * U, cy + DIGGER.seat.y * U, "up"],
        };
    },
    describe: (p) =>
        `A yellow digger seen from the side without its arm, on caterpillar tracks with ${Math.max(3, Math.min(6, Math.round(p.tracks)))} rollers, a heavy counterweight and an open cab window.`,
});
