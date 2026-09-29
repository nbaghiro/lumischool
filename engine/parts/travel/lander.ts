import { part, type Ctx } from "../../ink/surface";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const rungsOf = (n: number) => Math.max(3, Math.min(8, Math.round(n)));

export const lander = defineDrawing({
    id: "lander",
    family: "travel",
    title: "Lunar lander",
    group: "Props",
    about: "A lunar lander standing on four splayed legs with round foot pads, three of them in sight: a gold-foil lower stage, an angular cabin with a triangular window, an antenna dish, and a ladder down the front leg whose rungs can be counted.",
    params: { rungs: 5 },
    settings: { rungs: { kind: "whole", min: 3, max: 8 } },
    takes: [
        { label: "Five rungs", params: { rungs: 5 } },
        { label: "Three rungs", params: { rungs: 3 } },
        { label: "Eight rungs", params: { rungs: 8 } },
    ],
    box: () => ({ w: 8, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 80,
            ground = 174,
            stageTop = 72,
            stageFoot = 102;
        for (const s of [-1, 1]) {
            const hip = cx + s * 38,
                pad = cx + s * 64;
            pen.line(g, hip, stageTop + 10, pad, ground - 8, "ruler", calm(c, 1.8));
            pen.line(g, cx + s * 30, stageFoot, pad - s * 4, ground - 16, "ruler", calm(c, 1.2));
            pen.ellipse(g, pad, ground - 5, 22, 7, "ruler", pen.fill("card"), calm(c, 1.6));
        }
        pen.line(g, cx - 6, stageFoot, cx - 6, ground - 8, "ruler", calm(c, 1.8));
        pen.line(g, cx - 22, stageFoot, cx - 8, ground - 22, "ruler", calm(c, 1.2));
        pen.ellipse(g, cx - 6, ground - 3, 24, 7, "ruler", pen.fill("card"), calm(c, 1.6));
        pen.polygon(
            g,
            [
                [cx - 42, stageTop + 4],
                [cx - 30, stageTop],
                [cx - 30, stageFoot],
                [cx - 42, stageFoot - 4],
            ],
            "ruler",
            pen.fill("glow"),
            calm(c, 1.6),
        );
        pen.polygon(
            g,
            [
                [cx + 30, stageTop],
                [cx + 42, stageTop + 4],
                [cx + 42, stageFoot - 4],
                [cx + 30, stageFoot],
            ],
            "ruler",
            pen.fill("glow"),
            calm(c, 1.6),
        );
        pen.rect(g, cx - 30, stageTop, 60, stageFoot - stageTop, "ruler", pen.fill("glow"), {
            ...calm(c, 1.8),
        });
        // the foil's creases, which is what says gold foil rather than a yellow box
        for (const pts of [
            [
                [cx - 26, stageTop + 7],
                [cx - 18, stageTop + 11],
                [cx - 20, stageTop + 17],
                [cx - 10, stageTop + 22],
            ],
            [
                [cx + 2, stageTop + 5],
                [cx + 8, stageTop + 12],
                [cx + 16, stageTop + 10],
                [cx + 22, stageTop + 19],
            ],
            [
                [cx - 8, stageTop + 24],
                [cx - 2, stageTop + 19],
                [cx + 6, stageTop + 25],
            ],
            [
                [cx - 40, stageTop + 10],
                [cx - 35, stageTop + 16],
                [cx - 38, stageTop + 22],
            ],
            [
                [cx + 34, stageTop + 8],
                [cx + 38, stageTop + 15],
                [cx + 35, stageTop + 21],
            ],
        ] satisfies [number, number][][])
            pen.linear(g, pts, "ruler", { ...calm(c, 0.9), stroke: c.t["glow-ink"] });
        pen.path(
            g,
            `M${cx - 32} ${stageTop}L${cx - 36} ${stageTop - 18}L${cx - 24} ${stageTop - 38}L${cx + 14} ${stageTop - 42}L${cx + 32} ${stageTop - 30}L${cx + 36} ${stageTop - 8}L${cx + 28} ${stageTop}Z`,
            "ruler",
            pen.fill("card"),
            calm(c, 1.8),
        );
        pen.path(
            g,
            `M${cx + 14} ${stageTop - 42}L${cx + 32} ${stageTop - 30}L${cx + 36} ${stageTop - 8}L${cx + 28} ${stageTop}L${cx + 18} ${stageTop}L${cx + 14} ${stageTop - 30}Z`,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.7 }),
            calm(c, 1.3),
        );
        pen.rect(g, cx - 12, stageTop - 50, 18, 9, "ruler", pen.fill("card"), calm(c, 1.5));
        pen.polygon(
            g,
            [
                [cx - 26, stageTop - 30],
                [cx - 6, stageTop - 32],
                [cx - 20, stageTop - 14],
            ],
            "ruler",
            pen.fill("sky"),
            calm(c, 1.5),
        );
        pen.line(g, cx + 24, stageTop - 34, cx + 36, stageTop - 56, "ruler", calm(c, 1.4));
        pen.path(
            g,
            `M${cx + 26} ${stageTop - 62}Q${cx + 34} ${stageTop - 48} ${cx + 50} ${stageTop - 58}Z`,
            "ruler",
            pen.fill("card"),
            calm(c, 1.5),
        );
        pen.line(g, cx + 38, stageTop - 57, cx + 42, stageTop - 66, "ruler", calm(c, 1.1));
        pen.circle(
            part(c, "light", [cx - 3, stageTop - 54]).g,
            cx - 3,
            stageTop - 54,
            6,
            "ruler",
            pen.fill("berry"),
            calm(c, 1.1),
        );
        const n = rungsOf(p.rungs),
            left = cx + 4,
            right = cx + 20,
            top = stageFoot + 2,
            foot = ground - 12,
            step = (foot - top) / (n + 1);
        pen.line(g, cx - 10, stageFoot + 1, right + 4, stageFoot + 1, "ruler", calm(c, 1.7));
        for (const x of [left, right]) pen.line(g, x, top, x, foot, "ruler", calm(c, 1.5));
        for (let i = 1; i <= n; i++)
            pen.line(g, left, top + i * step, right, top + i * step, "ruler", calm(c, 1.3));
        return {
            window: [cx - 17, stageTop - 25, "left"],
            ladder: [right, (top + foot) / 2, "right"],
            hatch: [cx - 3, stageTop - 50, "up"],
            dish: [cx + 38, stageTop - 60, "up"],
            feet: [cx, ground, "down"],
        };
    },
    describe: () =>
        "A lunar lander on four splayed legs with round feet, a gold-foil lower stage, an angular cabin with a triangular window, an antenna dish and a ladder down one leg.",
    motion: { parts: { light: { is: "twinkle", dim: 0.35, amt: 0, period: 2.6 } } },
});
