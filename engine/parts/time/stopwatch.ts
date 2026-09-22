import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num, onCircle, patch, sector } from "../lettering";

export const stopwatch = defineDrawing({
    id: "stopwatch",
    family: "time",
    title: "Stopwatch",
    group: "Structures",
    about: "Sixty seconds round the dial, numbered every five, with the swept part shaded so a reading can be checked at a glance. Seconds are the unit a child can actually feel.",
    params: { seconds: 25, sweep: true },
    settings: { seconds: { kind: "whole", min: 0, max: 60 }, sweep: { kind: "flag" } },
    takes: [
        { label: "Twenty-five seconds", params: { seconds: 25, sweep: true } },
        { label: "Just started", params: { seconds: 4, sweep: true } },
        { label: "Fifty seconds", params: { seconds: 50, sweep: true } },
        { label: "No sweep", params: { seconds: 38, sweep: false } },
    ],
    box: () => ({ w: 9, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 4.5 * U,
            cy = 5.6 * U,
            R = 3.5 * U;
        pen.rect(
            g,
            cx - 13,
            cy - R - 30,
            26,
            16,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.5 },
        );
        for (const s of [-1, 1])
            pen.rect(
                g,
                cx + s * (R - 4) - 8,
                cy - R + 4,
                16,
                11,
                "ruler",
                pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                { strokeWidth: 1.3 },
            );
        pen.circle(g, cx, cy, (R + 9) * 2, "ruler", pen.fill("card"), { strokeWidth: 2.6 });
        pen.circle(g, cx, cy, R * 2, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
        const turn = (p.seconds % 60) / 60;
        // Hatched rather than solid: the sweep has to say how far round without swallowing the numbers.
        if (p.sweep && p.seconds % 60 > 0)
            pen.path(
                g,
                sector(cx, cy, R - 4, 0, turn * Math.PI * 2),
                "ruler",
                pen.fill("tang", "hachure", { hachureGap: 7, fillWeight: 1.1 }),
                { strokeWidth: 0 },
            );
        for (let s = 0; s < 60; s++) {
            const [ax, ay] = onCircle(cx, cy, R, s / 60),
                [bx, by] = onCircle(cx, cy, R - (s % 5 ? 5 : 10), s / 60);
            pen.line(g, ax, ay, bx, by, "ruler", { strokeWidth: s % 5 ? 0.8 : 1.6 });
            if (s % 5 === 0) {
                const [tx, ty] = onCircle(cx, cy, R - 22, s / 60);
                patch(c, tx, ty - 4, 20, 16);
                num(c, tx, ty + 5, s, 12);
            }
        }
        const [hx, hy] = onCircle(cx, cy, R - 8, turn),
            [tx2, ty2] = onCircle(cx, cy, -14, turn);
        pen.line(g, tx2, ty2, hx, hy, "ruler", { strokeWidth: 3, stroke: c.t.ink });
        pen.circle(
            g,
            cx,
            cy,
            9,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 1 },
        );
        return {
            centre: [cx, cy, "right"],
            crown: [cx, cy - R - 30, "up"],
            hand: [hx, hy, "up"],
        };
    },
    describe: () =>
        "A stopwatch with a button on top, its round face marked in seconds all the way round and numbered every five, standing on a card.",
    motion: { still: STILL.instrument },
});
