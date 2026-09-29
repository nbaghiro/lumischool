import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

/**
 * Where the winch lets its rope down and where the pilot's head shows in the open canopy, in squares
 * from the box's middle: the game hangs the rope and seats the pilot there.
 */
export const COPTER = {
    w: 8,
    h: 4,
    winch: { x: 0.4, y: 1.5 },
    seat: { x: 1.7, y: -0.55 },
} as const;

export const rescueCopter = defineDrawing({
    id: "rescuecopter",
    family: "travel",
    title: "Rescue helicopter",
    group: "Props",
    about: "A small orange rescue helicopter seen from the side, facing right: an open bubble canopy a pilot sits in, a tail with its own little rotor, two landing skids, a winch under the body for a rescue rope, and the long main rotor on top.",
    params: { rotor: 1 },
    settings: { rotor: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Rotor turning", params: { rotor: 1 } },
        { label: "Rotor still", params: { rotor: 0 } },
    ],
    box: () => ({ w: COPTER.w, h: COPTER.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            orange = pen.fill("tang"),
            line = { strokeWidth: 1.6 };
        const cx = (COPTER.w / 2) * U,
            cy = (COPTER.h / 2) * U;
        // the tail boom, its fin and the little tail rotor
        pen.polygon(
            g,
            [
                [0.9 * U, 1.35 * U],
                [3.2 * U, 2.1 * U],
                [3.2 * U, 2.55 * U],
                [0.9 * U, 1.75 * U],
            ],
            "pencil",
            orange,
            line,
        );
        pen.polygon(
            g,
            [
                [0.5 * U, 0.8 * U],
                [1.1 * U, 1.3 * U],
                [1.1 * U, 1.8 * U],
                [0.55 * U, 1.7 * U],
            ],
            "pencil",
            orange,
            line,
        );
        pen.ellipse(g, 0.6 * U, 1.25 * U, 0.9 * U, 0.9 * U, "ruler", null, {
            strokeWidth: 1,
            ...FIRM,
        });
        // the body, and over it the canopy left open so the pilot shows through
        pen.path(
            g,
            `M${3 * U} ${2 * U}L${6.9 * U} ${2 * U}Q${7.6 * U} ${2.1 * U} ${7.2 * U} ${2.9 * U}L${3.2 * U} ${3.05 * U}Q${2.8 * U} ${2.6 * U} ${3 * U} ${2 * U}Z`,
            "pencil",
            orange,
            line,
        );
        pen.path(
            g,
            `M${4.3 * U} ${2 * U}Q${4.6 * U} ${0.9 * U} ${6 * U} ${0.95 * U}Q${7.1 * U} ${1.05 * U} ${7.05 * U} ${2 * U}`,
            "pencil",
            null,
            line,
        );
        pen.line(g, 3.5 * U, 2.35 * U, 7 * U, 2.35 * U, "ruler", {
            strokeWidth: 2,
            stroke: c.t.card,
            ...FIRM,
        });
        // the mast and the main rotor, a long blur when it turns
        pen.line(g, 5 * U, 1.05 * U, 5 * U, 0.45 * U, "ruler", { strokeWidth: 2, ...FIRM });
        if (p.rotor >= 1)
            pen.ellipse(g, 5 * U, 0.35 * U, 5.8 * U, 0.35 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.2,
                ...FIRM,
            });
        else
            pen.line(g, 1.6 * U, 0.35 * U, 7.8 * U, 0.35 * U, "ruler", {
                strokeWidth: 2.2,
                ...FIRM,
            });
        pen.circle(g, 5 * U, 0.4 * U, 0.35 * U, "ruler", pen.fill("ink"), {
            strokeWidth: 1,
            ...FIRM,
        });
        // the skids on their struts, and the winch drum under the body
        for (const x of [4, 6.4])
            pen.line(g, x * U, 3 * U, x * U, 3.55 * U, "ruler", { strokeWidth: 1.4, ...FIRM });
        pen.path(
            g,
            `M${3.2 * U} ${3.55 * U}L${7.3 * U} ${3.55 * U}Q${7.7 * U} ${3.5 * U} ${7.7 * U} ${3.25 * U}`,
            "ruler",
            null,
            { strokeWidth: 1.8, ...FIRM },
        );
        const wx = cx + COPTER.winch.x * U,
            wy = cy + COPTER.winch.y * U;
        pen.rect(g, wx - 0.35 * U, wy - 0.55 * U, 0.7 * U, 0.4 * U, "ruler", pen.fill("ink-soft"), {
            strokeWidth: 1,
            ...FIRM,
        });
        return {
            winch: [wx, wy, "down"],
            seat: [cx + COPTER.seat.x * U, cy + COPTER.seat.y * U, "up"],
        };
    },
    describe: (p) =>
        `A small orange rescue helicopter seen from the side, with an open bubble canopy, a tail rotor, two skids and a winch under its body${p.rotor >= 1 ? ", its main rotor a blur" : ""}.`,
});
