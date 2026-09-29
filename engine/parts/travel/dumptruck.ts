import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

/** The open bed's inside, from its left wall to its right wall and from its rim to its floor, in squares from the box's top left. */
export const DUMPTRUCK = {
    w: 7,
    h: 4,
    bed: { x0: 0.35, x1: 4.45, rim: 1.2, floor: 2.75 },
} as const;

export const dumpTruck = defineDrawing({
    id: "dumptruck",
    family: "travel",
    title: "Dump truck",
    group: "Props",
    about: "A green dump truck seen from the side, facing right: a deep open bed at the back to load rubble into, a cab with a window, and big wheels.",
    params: { load: 0 },
    settings: { load: { kind: "whole", min: 0, max: 2 } },
    takes: [
        { label: "Empty", params: { load: 0 } },
        { label: "Heaped with rubble", params: { load: 2 } },
    ],
    box: () => ({ w: DUMPTRUCK.w, h: DUMPTRUCK.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            green = pen.fill("mint"),
            line = { strokeWidth: 1.6 },
            b = DUMPTRUCK.bed;
        const heap = Math.max(0, Math.min(2, Math.round(p.load)));
        if (heap > 0)
            for (let i = 0; i < heap + 2; i++)
                pen.circle(
                    g,
                    (0.9 + i * 0.95) * U,
                    (b.rim + 0.15 - heap * 0.12) * U,
                    0.9 * U,
                    "pencil",
                    pen.fill("ink-soft"),
                    line,
                );
        pen.polygon(
            g,
            [
                [b.x0 * U, b.rim * U],
                [b.x1 * U, b.rim * U],
                [(b.x1 - 0.25) * U, (b.floor + 0.35) * U],
                [(b.x0 + 0.3) * U, (b.floor + 0.35) * U],
            ],
            "pencil",
            green,
            line,
        );
        for (const x of [1.4, 2.4, 3.4])
            pen.line(g, x * U, (b.rim + 0.2) * U, x * U, (b.floor + 0.15) * U, "ruler", {
                strokeWidth: 1,
                ...FIRM,
            });
        pen.rect(g, 0.3 * U, 3.05 * U, 6.4 * U, 0.3 * U, "ruler", pen.fill("ink-soft"), {
            strokeWidth: 1.2,
            ...FIRM,
        });
        pen.path(
            g,
            `M${4.7 * U} ${3.05 * U}L${4.7 * U} ${1.1 * U}L${5.9 * U} ${1.1 * U}L${6.6 * U} ${2 * U}L${6.6 * U} ${3.05 * U}Z`,
            "pencil",
            green,
            line,
        );
        pen.path(
            g,
            `M${4.95 * U} ${2 * U}L${4.95 * U} ${1.35 * U}L${5.8 * U} ${1.35 * U}L${6.3 * U} ${2 * U}Z`,
            "ruler",
            pen.fill("sky"),
            { strokeWidth: 1.1, ...FIRM },
        );
        for (const x of [1.3, 3.6, 5.6]) {
            pen.circle(g, x * U, 3.4 * U, 1.1 * U, "pencil", pen.fill("ink"), line);
            pen.circle(g, x * U, 3.4 * U, 0.4 * U, "ruler", pen.fill("card"), {
                strokeWidth: 0.8,
                ...FIRM,
            });
        }
        return { bed: [((b.x0 + b.x1) / 2) * U, b.rim * U, "up"] };
    },
    describe: (p) =>
        p.load >= 1
            ? "A green dump truck seen from the side, its deep open bed heaped with grey rubble, with a cab window and three big wheels."
            : "A green dump truck seen from the side with a deep open bed at the back, a cab with a window and three big black wheels.",
});
