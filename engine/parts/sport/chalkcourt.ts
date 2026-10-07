import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash } from "../outdoors/wash";

const whole = (v: number) => Math.max(8, Math.min(36, Math.round(Number(v) || 8)));

export const chalkCourt = defineDrawing<{ length: number; lines: number[] }>({
    id: "chalkcourt",
    family: "sport",
    title: "Chalk court",
    group: "Structures",
    about: "A tarmac drive seen from the side and a little above, with a basketball court chalked on it: a line across the drive under the hoop and the lines a shot is taken behind.",
    params: { length: 30, lines: [12, 20] },
    settings: {
        length: { kind: "whole", min: 8, max: 36 },
        lines: { kind: "numbers", min: 1, max: 35, most: 4 },
    },
    takes: [
        { label: "A long drive", params: { length: 30, lines: [12, 18, 23] } },
        { label: "A short drive", params: { length: 14, lines: [6] } },
    ],
    box: (p) => ({ w: whole(p.length), h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = whole(p.length),
            w = n * U,
            far = 0.45 * U,
            near = 2.75 * U;
        pen.polygon(
            g,
            [
                [0.15 * U, far],
                [w - 0.15 * U, far],
                [w - 0.15 * U, near],
                [0.15 * U, near],
            ],
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 9, fillWeight: 0.5 }),
            { strokeWidth: 1.3, roughness: 0.3 },
        );
        if (!c.paper) {
            plain(c, {
                kind: "rect",
                x: 0.15 * U,
                y: far,
                w: w - 0.3 * U,
                h: near - far,
                fill: c.t["ink-soft"],
                opacity: 0.12,
            });
            // grit in the tarmac, fine and even
            for (let i = 0; i < n * 3; i++)
                plain(c, {
                    kind: "circle",
                    cx: (0.4 + hash(i, 5) * (n - 0.8)) * U,
                    cy: far + (0.15 + hash(i, 9) * 0.7) * (near - far),
                    r: 0.05 * U,
                    fill: c.t["ink-soft"],
                    opacity: 0.35,
                });
        }
        const chalk = {
            strokeWidth: 2.4,
            roughness: 0.5,
            stroke: c.paper ? c.t.ink : c.t.card,
        };
        // each line runs across the drive, leaning as a line on the ground does seen from the side
        for (const x of [...(p.lines ?? []), n - 1.2]) {
            if (x <= 0.5 || x >= n - 0.5) continue;
            pen.path(
                g,
                `M${(x + 0.35) * U} ${far + 0.15 * U}Q${x * U} ${(far + near) / 2} ${(x - 0.35) * U} ${near - 0.15 * U}`,
                "pencil",
                null,
                chalk,
            );
        }
        pen.line(g, 0.6 * U, far + 0.12 * U, w - 0.6 * U, far + 0.12 * U, "pencil", {
            ...chalk,
            strokeWidth: 1.4,
        });
        return { far: [w / 2, far, "up"], near: [w / 2, near, "down"] };
    },
    describe: (p) =>
        `A grey tarmac drive seen from the side, ${whole(p.length)} squares long, with white chalk lines across it for a basketball court and one along its far edge.`,
    motion: {
        still: "The drive is the ground the players stand on, and chalk on it does not move.",
    },
});
