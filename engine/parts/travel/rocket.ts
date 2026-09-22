import { type Ctx } from "../../ink/surface";
import { defineDrawing } from "../drawing";

/** One stroke to a line, corners kept, the roughness turned down: the shelf's calm level for things. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const rocket = defineDrawing({
    id: "rocket",
    family: "travel",
    title: "Rocket",
    group: "Props",
    about: "A small rocket standing on two legs, with a round window, a band round its middle, two fins and a nozzle, and a flame under the nozzle that is off, small, or long while the engine is held.",
    params: { flame: 0 },
    settings: { flame: { kind: "whole", min: 0, max: 3 } },
    takes: [
        { label: "Standing, engine off", params: { flame: 0 } },
        { label: "Waiting on a small flame", params: { flame: 1 } },
        { label: "Engine held", params: { flame: 3 } },
    ],
    box: () => ({ w: 3, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 30;
        const flame = Math.max(0, Math.min(3, Math.round(p.flame)));
        if (flame > 0) {
            const long = [0, 9, 17, 25][flame] ?? 0,
                top = 72,
                w = 7 + flame * 1.5;
            pen.path(
                g,
                `M${cx - w} ${top}Q${cx - w * 0.9} ${top + long * 0.55} ${cx} ${top + long}Q${cx + w * 0.9} ${top + long * 0.55} ${cx + w} ${top}Z`,
                "pencil",
                pen.fill("glow"),
                { ...calm(c, 1.3), stroke: c.t["glow-ink"] },
            );
            if (flame > 1)
                pen.path(
                    g,
                    `M${cx - w * 0.45} ${top}Q${cx - w * 0.3} ${top + long * 0.45} ${cx} ${top + long * 0.7}Q${cx + w * 0.3} ${top + long * 0.45} ${cx + w * 0.45} ${top}Z`,
                    "pencil",
                    pen.fill("tang"),
                    { ...calm(c, 1), stroke: "none" },
                );
        }
        for (const side of [-1, 1]) {
            pen.line(g, cx + side * 11, 60, cx + side * 21, 75, "ruler", {
                strokeWidth: 1.8,
                disableMultiStroke: true,
            });
            pen.line(g, cx + side * 16, 75, cx + side * 25, 75, "ruler", {
                strokeWidth: 2.2,
                disableMultiStroke: true,
            });
            pen.path(
                g,
                `M${cx + side * 13} 50L${cx + side * 23} 66L${cx + side * 21} 70L${cx + side * 13} 64Z`,
                "ruler",
                pen.fill("tang"),
                calm(c, 1.6),
            );
        }
        pen.path(
            g,
            `M${cx - 7} 66L${cx + 7} 66L${cx + 10} 72L${cx - 10} 72Z`,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 3, fillWeight: 0.7 }),
            calm(c, 1.5),
        );
        pen.path(
            g,
            `M${cx - 13} 66V30Q${cx - 13} 16 ${cx} 6Q${cx + 13} 16 ${cx + 13} 30V66Z`,
            "pencil",
            pen.fill("card"),
            calm(c, 1.8),
        );
        pen.path(
            g,
            `M${cx - 13} 50H${cx + 13}V56H${cx - 13}Z`,
            "ruler",
            pen.fill("berry", "hachure", { hachureGap: 3.2 }),
            calm(c, 1.2),
        );
        pen.circle(g, cx, 36, 12, "ruler", pen.fill("sky"), calm(c, 1.6));
        if (!c.paper)
            pen.arc(g, cx - 1.5, 34.5, 6, 6, Math.PI * 1.05, Math.PI * 1.5, "ruler", {
                stroke: c.t.card,
                strokeWidth: 1.3,
                disableMultiStroke: true,
            });
        return {
            nose: [cx, 6, "up"],
            window: [cx, 36, "right"],
            feet: [cx, 75, "down"],
            nozzle: [cx, 72, "down"],
        };
    },
    describe: (p) =>
        `A small rocket standing on two legs with a round window, a band round its middle, two fins and a nozzle${Math.round(p.flame) > 0 ? ", a flame burning under the nozzle" : ", its engine off"}.`,
});
