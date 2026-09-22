import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** An X on the ground, and once it is dug, the hole, the earth heaped beside it and the spade left standing in the heap. */
export const digSpot = defineDrawing({
    id: "dig",
    family: "outdoors",
    title: "X marks the spot",
    group: "Props",
    about: "An X marked on the ground where something is hidden. Dug, it is a hole with the earth heaped up beside it and a spade standing in the heap. A treasure hunt's directions and a map's squares end at one.",
    params: { dug: 1, spade: 1 },
    settings: { dug: { kind: "whole", min: 0, max: 1 }, spade: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "An X on the ground", params: { dug: 0, spade: 0 } },
        { label: "Dug, with the spade in the heap", params: { dug: 1, spade: 1 } },
        { label: "Dug, the spade taken away", params: { dug: 1, spade: 0 } },
    ],
    box: () => ({ w: 6, h: 4 }),
    draw: (c, p) => {
        const { pen, g, t } = c,
            a: RawAnchors = {};
        const cx = 2.4 * U,
            cy = 3 * U;
        if (!Number(p.dug)) {
            pen.line(g, cx - 0.8 * U, cy - 0.5 * U, cx + 0.8 * U, cy + 0.5 * U, "pencil", {
                stroke: t.berry,
                strokeWidth: 3.2,
            });
            pen.line(g, cx + 0.8 * U, cy - 0.5 * U, cx - 0.8 * U, cy + 0.5 * U, "pencil", {
                stroke: t.berry,
                strokeWidth: 3.2,
            });
        } else {
            pen.path(
                g,
                `M${3.2 * U} ${3.35 * U}C${3.5 * U} ${1.9 * U} ${5.2 * U} ${1.7 * U} ${5.7 * U} ${3.35 * U}Z`,
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 4 }),
                { strokeWidth: 1.6 },
            );
            for (const [x, y] of [
                [3, 2.9],
                [5.75, 2.7],
                [2.95, 2.25],
            ] as const)
                pen.circle(g, x * U, y * U, 5, "pencil", pen.fill("tang"), { strokeWidth: 1 });
            pen.ellipse(g, cx, cy, 2.4 * U, 0.95 * U, "pencil", pen.fill("ink-soft"), {
                strokeWidth: 1.7,
            });
            pen.ellipse(g, cx, cy + 0.08 * U, 1.7 * U, 0.55 * U, "pencil", pen.fill("ink"), {
                strokeWidth: 0.8,
            });
            if (Number(p.spade)) {
                const top: [number, number] = [4.9 * U, 0.35 * U],
                    foot: [number, number] = [4.45 * U, 2.45 * U];
                pen.line(g, ...top, ...foot, "pencil", { strokeWidth: 2.6 });
                pen.line(
                    g,
                    top[0] - 0.35 * U,
                    top[1] + 0.05 * U,
                    top[0] + 0.35 * U,
                    top[1] - 0.02 * U,
                    "pencil",
                    { strokeWidth: 2.2 },
                );
                pen.polygon(
                    g,
                    [
                        [foot[0] - 0.4 * U, foot[1]],
                        [foot[0] + 0.4 * U, foot[1] + 0.08 * U],
                        [foot[0] + 0.3 * U, foot[1] + 0.85 * U],
                        [foot[0] - 0.05 * U, foot[1] + 1.05 * U],
                        [foot[0] - 0.45 * U, foot[1] + 0.8 * U],
                    ],
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.5, preserveVertices: true },
                );
                a.spade = [top[0], top[1], "up"];
            }
        }
        a.hole = [cx, cy, "up"];
        return a;
    },
    describe: (p) =>
        !Number(p.dug)
            ? "A red X marked on the ground, two thick strokes crossing where something is hidden, with nothing dug and no spade."
            : `A hole dug in the ground, a dark oval with the earth heaped up brown beside it${Number(p.spade) ? " and a spade standing in the heap" : " and no spade in sight"}.`,
    motion: { still: "A hole stays where it was dug, and so does the X that marked it." },
});
