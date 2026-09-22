import { part } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { blade, clamp } from "./nature";

export const dragonfly = defineDrawing({
    id: "dragonfly",
    family: "animals",
    title: "Dragonfly",
    group: "Characters",
    about: "A dragonfly seen from above: big eyes, a long body in rings and two pairs of clear wings, four in all. The wings are the thing to count, and they are always two and two.",
    params: { facing: 1, rings: 8 },
    settings: {
        facing: { kind: "one of", of: [1, -1] },
        rings: { kind: "whole", min: 4, max: 10 },
    },
    takes: [
        { label: "Facing right", params: { facing: 1, rings: 8 } },
        { label: "Facing left, a shorter body", params: { facing: -1, rings: 6 } },
    ],
    box: () => ({ w: 6, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = p.facing < 0 ? -1 : 1,
            n = clamp(p.rings, 4, 10),
            y = 2 * U;
        const X = (x: number) => (s > 0 ? x : 6 * U - x);
        const thorax = X(4 * U),
            wings = part(c, "wings", [thorax, y]).g,
            clear = pen.fill("sky", "hachure", { hachureGap: 5, fillWeight: 0.5 });
        for (const [off, len, lean] of [
            [0.25, 2.6, -0.2],
            [-0.3, 2.4, 0.25],
        ] as const) {
            for (const up of [-1, 1]) {
                const a = (up * Math.PI) / 2 + s * lean * up,
                    x = thorax + s * off * U;
                pen.polygon(wings, blade(x, y, len * U * 0.7, 0.62 * U, a, 10), "pencil", clear, {
                    strokeWidth: 1.2,
                });
                pen.line(
                    wings,
                    x,
                    y,
                    x + Math.cos(a) * len * U * 0.64,
                    y + Math.sin(a) * len * U * 0.64,
                    "pencil",
                    { strokeWidth: 0.7, stroke: c.t["ink-soft"] },
                );
            }
        }
        // the long body in rings, thinning to the tail
        for (let i = 0; i < n; i++) {
            const x = X((3.4 - (i * 2.9) / n) * U),
                w = (2.9 / n) * U * 1.15,
                h = 0.36 * U * (1 - i / (n * 1.6));
            pen.ellipse(g, x, y, w, h, "pencil", pen.fill(i % 2 ? "sky" : "mint"), {
                strokeWidth: 1.1,
            });
        }
        pen.ellipse(g, thorax, y, 1 * U, 0.62 * U, "pencil", pen.fill("mint"), {
            strokeWidth: 1.4,
        });
        for (const up of [-1, 1])
            pen.circle(g, X(4.75 * U), y + up * 0.24 * U, 0.52 * U, "pencil", pen.fill("berry"), {
                strokeWidth: 1.2,
            });
        return {
            head: [X(4.9 * U), y, s > 0 ? "right" : "left"],
            tail: [X(0.4 * U), y, s > 0 ? "left" : "right"],
        };
    },
    describe: () =>
        "A dragonfly seen from above with two big red eyes, a long ringed body in blue and green, and two pairs of clear wings spread out.",
    motion: {
        body: { is: "float", lift: 8, dx: 12, deg: 3, pivot: [0.5, 0.5], period: 5.2, units: true },
        parts: { wings: { is: "flap", deg: 12, beat: 0.12, burst: 3, period: 3.6 } },
        weight: "light",
    },
});
