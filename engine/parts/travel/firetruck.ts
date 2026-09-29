import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

/** Where the hose's nozzle rests and where a firefighter stands, in squares from the box's top left: the game places both on the drawing. */
export const FIRETRUCK = {
    w: 7,
    h: 4,
    deck: { x: 2.2, y: 1.8 },
    nozzle: { x: 3.6, y: 1.4 },
} as const;

export const fireTruck = defineDrawing({
    id: "firetruck",
    family: "travel",
    title: "Fire truck",
    group: "Props",
    about: "A small red fire engine seen from the side, facing right: a cab with a big window, a flat deck at the back for a firefighter to stand on, a hose reel and lockers on its side, and a light bar that can flash.",
    params: { lights: 1 },
    settings: { lights: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Lights flashing", params: { lights: 1 } },
        { label: "Lights off", params: { lights: 0 } },
    ],
    box: () => ({ w: FIRETRUCK.w, h: FIRETRUCK.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            red = pen.fill("berry"),
            line = { strokeWidth: 1.6 };
        // the back body sits lower than the cab, so its top is a deck to stand on
        pen.rect(g, 0.3 * U, FIRETRUCK.deck.y * U, 4.4 * U, 1.7 * U, "pencil", red, line);
        pen.rect(g, 4.7 * U, 1.0 * U, 2.0 * U, 2.5 * U, "pencil", red, line);
        pen.rect(g, 5.05 * U, 1.3 * U, 1.3 * U, 0.9 * U, "ruler", pen.fill("sky"), {
            strokeWidth: 1.2,
            ...FIRM,
        });
        // lockers along the side, and the hose wound on its reel
        for (const x of [0.6, 1.5])
            pen.rect(g, x * U, 2.2 * U, 0.75 * U, 0.9 * U, "ruler", null, {
                strokeWidth: 1,
                ...FIRM,
            });
        pen.circle(g, 3.35 * U, 2.65 * U, 1.1 * U, "pencil", pen.fill("card"), line);
        pen.circle(g, 3.35 * U, 2.65 * U, 0.45 * U, "ruler", null, { strokeWidth: 1, ...FIRM });
        pen.line(g, 0.3 * U, 3.25 * U, 6.7 * U, 3.25 * U, "ruler", {
            strokeWidth: 2.2,
            stroke: c.t.card,
            ...FIRM,
        });
        pen.rect(
            g,
            5.2 * U,
            0.7 * U,
            1.0 * U,
            0.3 * U,
            "ruler",
            pen.fill(p.lights >= 1 ? "tang" : "card"),
            { strokeWidth: 1.1, ...FIRM },
        );
        for (const x of [1.3, 5.6]) {
            pen.circle(g, x * U, 3.45 * U, 1.0 * U, "pencil", pen.fill("ink"), line);
            pen.circle(g, x * U, 3.45 * U, 0.36 * U, "ruler", pen.fill("card"), {
                strokeWidth: 0.8,
                ...FIRM,
            });
        }
        return {
            deck: [FIRETRUCK.deck.x * U, FIRETRUCK.deck.y * U, "up"],
            nozzle: [FIRETRUCK.nozzle.x * U, FIRETRUCK.nozzle.y * U, "right"],
        };
    },
    describe: (p) =>
        `A small red fire engine seen from the side, with a flat deck at the back, a hose reel, lockers and a big cab window${p.lights >= 1 ? ", its light bar flashing" : ""}.`,
});
