import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { clamp } from "../animals/nature";

export const firs = defineDrawing({
    id: "firs",
    family: "outdoors",
    title: "Fir trees",
    group: "Props",
    about: "A row of fir trees, tall and short in turn, each three tiers of branches on a trunk, with snow on the tiers if it is winter. A horizon for a wood, and tiers to count.",
    params: { count: 3, snow: 0 },
    settings: { count: { kind: "whole", min: 1, max: 8 }, snow: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Three firs", params: { count: 3, snow: 0 } },
        { label: "Five, in snow", params: { count: 5, snow: 1 } },
    ],
    box: (p) => ({ w: clamp(p.count, 1, 8) * 4 + 2, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.count, 1, 8),
            base = 9.5 * U,
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const cx = (3 + i * 4) * U,
                tall = i % 2 ? 6.6 * U : 8.2 * U,
                half = 1.9 * U;
            pen.rect(g, cx - 6, base - 22, 12, 22, "pencil", pen.fill("tang"), {
                strokeWidth: 1.4,
            });
            for (let k = 0; k < 3; k++) {
                const top = base - 16 - tall + k * tall * 0.28,
                    low = base - 16 - tall * (0.42 - k * 0.2) + tall * 0.08;
                const w = half * (0.62 + k * 0.28);
                pen.polygon(
                    g,
                    [
                        [cx, top],
                        [cx + w, low],
                        [cx - w, low],
                    ],
                    "pencil",
                    pen.fill("mint"),
                    { strokeWidth: 1.8 },
                );
                if (p.snow > 0)
                    pen.polygon(
                        g,
                        [
                            [cx, top],
                            [cx + w * 0.34, top + (low - top) * 0.34],
                            [cx - w * 0.34, top + (low - top) * 0.34],
                        ],
                        "pencil",
                        pen.fill("card"),
                        { strokeWidth: 1.1 },
                    );
            }
            a[`fir(${i})`] = [cx, base - 16 - tall, "up"];
        }
        pen.line(g, 0.4 * U, base, (n * 4 + 1.6) * U, base, "pencil", { strokeWidth: 2 });
        return a;
    },
    describe: (p) =>
        `A row of fir trees, tall and short in turn, each three tiers of branches on a short trunk${p.snow > 0 ? ", with snow on the tiers" : ""}, on a line of ground.`,
});
