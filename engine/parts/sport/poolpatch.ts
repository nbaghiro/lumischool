import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const KINDS = ["soft", "slope"] as const;
const DIRS = ["down", "up", "left", "right"] as const;
const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

/** Radians each way a slope's arrows point, y growing downwards. */
const TURN: Record<(typeof DIRS)[number], number> = {
    right: 0,
    down: Math.PI / 2,
    left: Math.PI,
    up: -Math.PI / 2,
};

export const poolPatch = defineDrawing<{
    kind: string;
    width: number;
    height: number;
    dir: string;
}>({
    id: "poolpatch",
    family: "sport",
    title: "Patch of cloth",
    group: "Props",
    about: "A patch on a games table's cloth, seen from above: soft deep cloth hatched close, which slows a ball, or a slope marked with rows of arrows pointing the way a ball rolls down it.",
    params: { kind: "soft", width: 6, height: 4, dir: "down" },
    settings: {
        kind: { kind: "one of", of: KINDS },
        width: { kind: "whole", min: 2, max: 16 },
        height: { kind: "whole", min: 2, max: 12 },
        dir: { kind: "one of", of: DIRS },
    },
    takes: [
        { label: "Soft cloth", params: { kind: "soft", width: 6, height: 4, dir: "down" } },
        { label: "A slope down", params: { kind: "slope", width: 8, height: 6, dir: "down" } },
        {
            label: "A slope to the left",
            params: { kind: "slope", width: 6, height: 4, dir: "left" },
        },
    ],
    box: (p) => ({ w: p.width, h: p.height }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = p.width * U,
            h = p.height * U;
        if (p.kind !== "slope") {
            pen.rect(
                g,
                0.1 * U,
                0.1 * U,
                w - 0.2 * U,
                h - 0.2 * U,
                "pencil",
                pen.fill("mint", "cross-hatch", { hachureGap: 4 }),
                {
                    strokeWidth: 1.2,
                    strokeLineDash: [6, 4],
                    roughness: 0.3,
                },
            );
            return { middle: [w / 2, h / 2, "up"] };
        }
        pen.rect(
            g,
            0.1 * U,
            0.1 * U,
            w - 0.2 * U,
            h - 0.2 * U,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 9 }),
            {
                strokeWidth: 1.2,
                strokeLineDash: [6, 4],
                roughness: 0.3,
            },
        );
        const dir = DIRS.find((d) => d === p.dir) ?? "down",
            a = TURN[dir],
            ca = Math.cos(a),
            sa = Math.sin(a);
        for (let x = 1.5; x < p.width - 0.5; x += 2.5)
            for (let y = 1.5; y < p.height - 0.5; y += 2.5) {
                const cx = x * U,
                    cy = y * U,
                    s = 0.5 * U;
                // a chevron pointing downhill
                pen.path(
                    g,
                    `M${cx - ca * s - sa * s} ${cy - sa * s + ca * s}L${cx} ${cy}L${cx - ca * s + sa * s} ${cy - sa * s - ca * s}`,
                    "ruler",
                    null,
                    { strokeWidth: 1.6, stroke: c.t.pen, ...FIRM },
                );
            }
        return { middle: [w / 2, h / 2, "up"] };
    },
    describe: (p) =>
        p.kind === "slope"
            ? "A dashed patch on a games table seen from above, washed pale blue and marked with rows of arrows pointing the way a ball rolls down it."
            : "A dashed patch of soft deep cloth on a games table seen from above, closely cross-hatched in green, where a rolling ball slows down quickly.",
    motion: { still: "A patch is part of the cloth and never moves." },
});
