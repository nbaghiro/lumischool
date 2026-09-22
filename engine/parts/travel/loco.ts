import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { CAR, RAIL, underneath } from "./yard";

export const loco = defineDrawing({
    id: "loco",
    family: "travel",
    title: "Engine",
    group: "Props",
    about: "A small shunting engine, facing the way it is coupled. Which end of a train the engine is on is the whole of a shunting problem, so it is drawn as its own thing and turned round rather than redrawn.",
    params: { facing: 1 },
    settings: { facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "Facing right", params: { facing: 1 } },
        { label: "Facing left", params: { facing: -1 } },
    ],
    box: () => ({ w: CAR, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            top = 1.1 * U,
            bot = (RAIL - 0.7) * U;
        // Drawn facing right and mirrored for the other way, so both ends are the same engine.
        const X = (sq: number) => (p.facing < 0 ? CAR - sq : sq) * U;
        const cab = 1.9;
        pen.path(
            g,
            `M${X(0.35)} ${bot}V${top + 0.2 * U}Q${X(0.35)} ${top} ${X(0.9)} ${top}` +
                `H${X(cab)}V${top + 0.9 * U}H${X(CAR - 0.4)}V${bot}Z`,
            "pencil",
            pen.fill("tang", "solid", { hachureGap: 10, fillWeight: 0.55 }),
            { strokeWidth: 2.6 },
        );
        pen.rect(
            g,
            X(0.7),
            top + 0.3 * U,
            0.85 * U * (p.facing < 0 ? -1 : 1),
            0.8 * U,
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.4 },
        );
        // The funnel, and three puffs above it going the way the engine faces.
        pen.rect(
            g,
            X(CAR - 1.1),
            top + 0.35 * U,
            0.55 * U * (p.facing < 0 ? -1 : 1),
            0.6 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.6 },
        );
        for (const [dx, dy, d] of [
            [CAR - 0.85, 0.5, 0.5],
            [CAR - 0.45, 0.3, 0.38],
            [CAR - 0.15, 0.15, 0.28],
        ] as const) {
            pen.circle(g, X(dx), dy * U, d * U, "doodle", pen.fill("card"), { strokeWidth: 1.2 });
        }
        underneath(c, 0, [1.1, CAR - 1.3]);
        return { cab: [X(1), top, "up"], front: [X(CAR - 0.4), top + 0.9 * U, "up"] };
    },
    describe: (p) =>
        `A small orange shunting engine seen from the side, facing ${p.facing < 0 ? "left" : "right"}, with a cab window, a funnel with three puffs and two wheels.`,
});
