import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const poolSpinner = defineDrawing<{ length: number }>({
    id: "poolspinner",
    family: "sport",
    title: "Table spinner",
    group: "Props",
    about: "A wooden bar lying across a games table, seen from above, turning slowly about a round pivot in its middle and sweeping aside any ball in its way.",
    params: { length: 8 },
    settings: { length: { kind: "whole", min: 4, max: 14 } },
    takes: [
        { label: "A long spinner", params: { length: 8 } },
        { label: "A short spinner", params: { length: 4 } },
    ],
    box: (p) => ({ w: p.length, h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = p.length * U,
            y = 0.5 * U;
        pen.rect(g, 0.1 * U, y - 0.25 * U, w - 0.2 * U, 0.5 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.4,
            roughness: 0.3,
        });
        pen.circle(g, w / 2, y, 0.85 * U, "pencil", pen.fill("glow"), { strokeWidth: 1.4 });
        pen.circle(g, w / 2, y, 0.25 * U, "ruler", pen.fill("ink"), {
            strokeWidth: 0.6,
            disableMultiStroke: true,
        });
        return { middle: [w / 2, y, "up"] };
    },
    describe: () =>
        "A long wooden bar lying across a games table seen from above, with a round yellow pivot in its middle that it slowly turns about.",
    motion: { still: "The game turns the spinner; the drawing holds still." },
});
