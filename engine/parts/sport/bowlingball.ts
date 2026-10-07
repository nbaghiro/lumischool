import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const bowlingBall = defineDrawing({
    id: "bowlingball",
    family: "sport",
    title: "Bowling ball",
    group: "Props",
    about: "A polished bowling ball with three finger holes and a curved highlight, seen from above.",
    params: { blue: true },
    settings: { blue: { kind: "flag" } },
    takes: [
        { label: "Blue ball", params: { blue: true } },
        { label: "Red ball", params: { blue: false } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c;
        pen.circle(g, U, U, 1.8 * U, "pencil", pen.fill(p.blue ? "sky" : "berry"), {
            strokeWidth: 1.5,
        });
        for (const [x, y] of [
            [0.8, 0.7],
            [1.15, 0.65],
            [1.04, 1.05],
        ])
            pen.circle(g, (x ?? 1) * U, (y ?? 1) * U, 0.2 * U, "ruler", pen.fill("ink"), {
                strokeWidth: 0.5,
            });
        pen.circle(g, 0.55 * U, 0.65 * U, 0.18 * U, "ruler", pen.fill("card"), {
            strokeWidth: 0.5,
        });
        return { middle: [U, U, "up"] };
    },
    describe: () =>
        "A round polished bowling ball with three dark finger holes grouped near its middle and a small pale highlight along one side.",
    motion: { still: "The game rolls and turns the ball after a bowl." },
});
