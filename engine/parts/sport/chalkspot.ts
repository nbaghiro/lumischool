import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

const WORTH = ["one", "two", "three", "four", "five"] as const;

export const chalkSpot = defineDrawing<{ n: number; on: boolean }>({
    id: "chalkspot",
    family: "sport",
    title: "Chalk spot",
    group: "Props",
    about: "A spot chalked on the drive to shoot from, with the points a basket from it is worth written in it (1 near the hoop, 2 further back, 3 behind the long line, and up to 5 round the world), or left plain.",
    params: { n: 2, on: false },
    settings: { n: { kind: "whole", min: 0, max: 5 }, on: { kind: "flag" } },
    takes: [
        { label: "Worth 1", params: { n: 1, on: false } },
        { label: "Worth 3, stood on", params: { n: 3, on: true } },
        { label: "A plain spot", params: { n: 0, on: false } },
    ],
    box: () => ({ w: 3, h: 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(0, Math.min(5, Math.round(p.n))),
            cx = 1.5 * U,
            cy = 1.2 * U;
        if (p.on && !c.paper)
            plain(c, {
                kind: "ellipse",
                cx,
                cy,
                rx: 1.4 * U,
                ry: 0.72 * U,
                fill: c.t.glow,
                opacity: 0.55,
            });
        pen.ellipse(
            g,
            cx,
            cy,
            2.3 * U,
            1.05 * U,
            "pencil",
            c.paper ? null : pen.fill("card", "solid"),
            {
                strokeWidth: p.on ? 2.4 : 1.6,
                roughness: 0.5,
                stroke: c.paper ? c.t.ink : c.t["ink-soft"],
            },
        );
        if (n > 0) num(c, cx, cy + 0.36 * U, n, 22);
        return { centre: [cx, cy, "up"] };
    },
    describe: (p) =>
        Math.round(p.n) < 1
            ? `A plain white chalk spot on the drive with no number in it, a place to stand and shoot from${p.on ? ", and someone stands on it" : ""}.`
            : `A white chalk spot on the drive with the number ${Math.round(p.n)} in it: a basket thrown from here is worth ${WORTH[Math.round(p.n) - 1] ?? "two"}${p.on ? ", and someone stands on it" : ""}.`,
    motion: { still: "A number on the ground is read where it is, so it holds still." },
});
