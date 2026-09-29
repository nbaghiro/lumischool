import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

/** The arm, lying to the right from its pivot: the pivot and the bucket's middle, in squares from the box's middle. */
export const DIGGERARM = {
    w: 6,
    h: 2,
    pivot: { x: -2.6, y: 0 },
    bucket: { x: 2.35, y: 0.2 },
} as const;

export const diggerArm = defineDrawing({
    id: "diggerarm",
    family: "travel",
    title: "Digger arm",
    group: "Props",
    about: "A yellow digger's arm lying on its side: a boom with a ram along it, bent at the elbow, and at its far end a steel bucket with teeth, ready to be turned at the pivot to scoop.",
    params: { teeth: 3 },
    settings: { teeth: { kind: "whole", min: 2, max: 4 } },
    takes: [
        { label: "Three teeth", params: { teeth: 3 } },
        { label: "Four teeth", params: { teeth: 4 } },
    ],
    box: () => ({ w: DIGGERARM.w, h: DIGGERARM.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            yellow = pen.fill("glow"),
            line = { strokeWidth: 1.6 };
        const cx = (DIGGERARM.w / 2) * U,
            cy = (DIGGERARM.h / 2) * U;
        const px = cx + DIGGERARM.pivot.x * U;
        pen.polygon(
            g,
            [
                [px, cy - 0.3 * U],
                [3.2 * U, 0.35 * U],
                [4.9 * U, 0.75 * U],
                [4.9 * U, 1.15 * U],
                [3.2 * U, 0.85 * U],
                [px, cy + 0.3 * U],
            ],
            "pencil",
            yellow,
            line,
        );
        pen.line(g, 1.2 * U, 1 * U, 3.1 * U, 0.55 * U, "ruler", {
            strokeWidth: 2.4,
            stroke: c.t.ink,
            ...FIRM,
        });
        pen.circle(g, px, cy, 0.5 * U, "ruler", pen.fill("ink-soft"), { strokeWidth: 1, ...FIRM });
        const bx = cx + DIGGERARM.bucket.x * U,
            by = cy + DIGGERARM.bucket.y * U;
        pen.path(
            g,
            `M${bx - 0.55 * U} ${by - 0.55 * U}L${bx + 0.6 * U} ${by - 0.45 * U}Q${bx + 0.7 * U} ${by + 0.55 * U} ${bx - 0.35 * U} ${by + 0.6 * U}Z`,
            "pencil",
            pen.fill("ink-soft"),
            line,
        );
        const n = Math.max(2, Math.min(4, Math.round(p.teeth)));
        for (let i = 0; i < n; i++) {
            const x = bx - 0.3 * U + (i * 0.6 * U) / Math.max(1, n - 1);
            pen.line(g, x, by + 0.58 * U, x - 0.08 * U, by + 0.78 * U, "ruler", {
                strokeWidth: 1.6,
                ...FIRM,
            });
        }
        return { pivot: [px, cy, "left"], bucket: [bx, by, "down"] };
    },
    describe: (p) =>
        `A yellow digger's arm on its side, a boom bent at the elbow with a ram along it and a steel bucket with ${Math.max(2, Math.min(4, Math.round(p.teeth)))} teeth at its end.`,
});
