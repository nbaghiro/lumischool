import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { CELL } from "./racecircuit";

type Pt = [number, number];

export const raceCar = defineDrawing({
    id: "racecar",
    family: "sport",
    title: "Race car",
    group: "Props",
    about: "A car from above with the arrow of where it is going drawn from it. The arrow is as long as the speed, so a car about to travel three cells says so a turn before it does, which is the whole of braking distance in one drawing.",
    params: { vx: 1, vy: 0 },
    settings: { vx: { kind: "whole", min: -6, max: 6 }, vy: { kind: "whole", min: -6, max: 6 } },
    takes: [
        { label: "Stopped", params: { vx: 0, vy: 0 } },
        { label: "Two cells right", params: { vx: 2, vy: 0 } },
        { label: "Three right, one up", params: { vx: 3, vy: -1 } },
    ],
    box: () => ({ w: CELL, h: CELL }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = (CELL * U) / 2,
            cy = (CELL * U) / 2;
        const ang = p.vx || p.vy ? Math.atan2(p.vy, p.vx) : 0;
        const spin = (x: number, y: number): Pt => [
            cx + x * Math.cos(ang) - y * Math.sin(ang),
            cy + x * Math.sin(ang) + y * Math.cos(ang),
        ];
        // The arrow first, so the car sits on top of its own tail.
        if (p.vx || p.vy) {
            const len = Math.hypot(p.vx, p.vy) * CELL * U;
            const [hx, hy] = spin(len, 0);
            pen.line(g, cx, cy, hx, hy, "pencil", { strokeWidth: 2, stroke: c.t.pen });
            for (const side of [-1, 1]) {
                const [bx, by] = spin(len - 11, side * 7);
                pen.line(g, hx, hy, bx, by, "pencil", { strokeWidth: 2, stroke: c.t.pen });
            }
        }
        for (const side of [-1, 1])
            for (const end of [-1, 1]) {
                pen.polygon(
                    g,
                    [
                        spin(end * 10 - 5, side * 14),
                        spin(end * 10 + 5, side * 14),
                        spin(end * 10 + 5, side * 8),
                        spin(end * 10 - 5, side * 8),
                    ],
                    "pencil",
                    pen.fill("ink"),
                    { strokeWidth: 1.1 },
                );
            }
        pen.polygon(
            g,
            [spin(-15, -10), spin(8, -10), spin(17, 0), spin(8, 10), spin(-15, 10)],
            "pencil",
            pen.fill("berry", "solid", { hachureGap: 6 }),
            { strokeWidth: 1.8 },
        );
        pen.polygon(
            g,
            [spin(-2, -7), spin(6, -5), spin(6, 5), spin(-2, 7)],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.2 },
        );
        return { seat: [cx, cy, "up"], nose: [...spin(15, 0), "right"] };
    },
    describe: (p) =>
        `A small red racing car seen from above with black wheels and a white windscreen${p.vx || p.vy ? ", an arrow drawn from it showing where it is going" : ", standing still with no arrow"}.`,
    motion: { body: { is: "bob", lift: 0.02, arc: 0.2, deg: 0.8, period: 1.6 } },
});
