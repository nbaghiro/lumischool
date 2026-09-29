import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

/** The deck at the stern, where the crew stands to throw, and the waterline, in squares from the box's top left. */
export const RESCUEBOAT = { w: 6, h: 3, deck: { x: 1.6, y: 1.55 }, waterline: 2.4 } as const;

export const rescueBoat = defineDrawing({
    id: "rescueboat",
    family: "travel",
    title: "Rescue boat",
    group: "Props",
    about: "A small orange rescue boat seen from the side, facing right, with a white stripe along its hull, a rail round the open deck at the back, a little blue cabin with a life ring on it and a flag.",
    params: { flag: 1 },
    settings: { flag: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "With its flag", params: { flag: 1 } },
        { label: "No flag", params: { flag: 0 } },
    ],
    box: () => ({ w: RESCUEBOAT.w, h: RESCUEBOAT.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            line = { strokeWidth: 1.6 };
        const deck = RESCUEBOAT.deck.y * U;
        pen.polygon(
            g,
            [
                [0.2 * U, deck],
                [5.85 * U, 1.35 * U],
                [5.2 * U, 2.85 * U],
                [0.75 * U, 2.85 * U],
            ],
            "pencil",
            pen.fill("tang"),
            line,
        );
        pen.line(g, 0.45 * U, 2.15 * U, 5.55 * U, 2.05 * U, "ruler", {
            strokeWidth: 2.2,
            stroke: c.t.card,
            ...FIRM,
        });
        // the rail round the open deck
        pen.line(g, 0.35 * U, deck - 0.55 * U, 2.9 * U, deck - 0.6 * U, "ruler", {
            strokeWidth: 1.2,
            ...FIRM,
        });
        for (const x of [0.4, 1.3, 2.2])
            pen.line(g, x * U, deck, x * U, deck - 0.55 * U, "ruler", {
                strokeWidth: 1.1,
                ...FIRM,
            });
        // the cabin with its windows and a life ring
        pen.rect(g, 3.1 * U, 0.35 * U, 1.9 * U, 1.1 * U, "pencil", pen.fill("sky"), line);
        pen.rect(g, 4.3 * U, 0.55 * U, 0.5 * U, 0.4 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1,
            ...FIRM,
        });
        pen.circle(g, 3.65 * U, 0.9 * U, 0.6 * U, "ruler", pen.fill("tang"), {
            strokeWidth: 1.1,
            ...FIRM,
        });
        pen.circle(g, 3.65 * U, 0.9 * U, 0.26 * U, "ruler", pen.fill("card"), {
            strokeWidth: 0.8,
            ...FIRM,
        });
        if (p.flag >= 1) {
            pen.line(g, 4.95 * U, 0.35 * U, 4.95 * U, 0.05 * U, "ruler", {
                strokeWidth: 1.2,
                ...FIRM,
            });
            pen.polygon(
                g,
                [
                    [4.95 * U, 0.05 * U],
                    [5.55 * U, 0.15 * U],
                    [4.95 * U, 0.3 * U],
                ],
                "ruler",
                pen.fill("berry"),
                { strokeWidth: 0.9, ...FIRM },
            );
        }
        return { deck: [RESCUEBOAT.deck.x * U, deck, "up"] };
    },
    describe: (p) =>
        `A small orange rescue boat seen from the side, with a white stripe, a railed deck at the back and a blue cabin carrying a life ring${p.flag >= 1 ? " and a flag" : ""}.`,
});
