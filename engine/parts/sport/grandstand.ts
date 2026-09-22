import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const grandstand = defineDrawing({
    id: "grandstand",
    family: "sport",
    title: "Grandstand",
    group: "Structures",
    about: "Rows of seats stepping up under a roof, with people in some of them and the rest empty. Rows times seats is how many it holds, and the empty seats are how many more can sit down.",
    params: { rows: 3, seats: 8, filled: 17 },
    settings: {
        rows: { kind: "whole", min: 1, max: 5 },
        seats: { kind: "whole", min: 4, max: 12 },
        filled: { kind: "whole", min: 0, max: 60 },
    },
    takes: [
        { label: "Three rows of eight, 17 full", params: { rows: 3, seats: 8, filled: 17 } },
        { label: "Four rows of ten, 32 full", params: { rows: 4, seats: 10, filled: 32 } },
    ],
    box: (p) => ({
        w: Math.max(4, Math.min(12, Math.round(p.seats))) + 4,
        h: Math.max(1, Math.min(5, Math.round(p.rows))) * 2 + 4,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            rows = Math.max(1, Math.min(5, Math.round(p.rows))),
            seats = Math.max(4, Math.min(12, Math.round(p.seats)));
        const w = (seats + 4) * U,
            base = (rows * 2 + 3.6) * U,
            x0 = 2 * U;
        pen.polygon(
            g,
            [
                [0.6 * U, 1.8 * U],
                [w - 0.6 * U, 1.2 * U],
                [w - 0.6 * U, 2.2 * U],
                [0.6 * U, 2.8 * U],
            ],
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.9 },
        );
        for (const px of [1 * U, w - 1 * U])
            pen.line(g, px, 2.5 * U, px, base, "ruler", { strokeWidth: 2 });
        let n = 0;
        const a: RawAnchors = {};
        for (let r = 0; r < rows; r++) {
            const y = base - (r + 1) * 2 * U;
            pen.rect(
                g,
                x0 - 0.4 * U,
                y + 1.2 * U,
                seats * U + 0.8 * U,
                0.8 * U,
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 4 }),
                { strokeWidth: 1.5 },
            );
            for (let s = 0; s < seats; s++) {
                const sx = x0 + (s + 0.5) * U,
                    full = n++ < p.filled;
                if (full) {
                    pen.circle(
                        g,
                        sx,
                        y + 0.5 * U,
                        0.7 * U,
                        "pencil",
                        pen.fill((["glow", "berry", "mint", "sky"] as const)[(s + r) % 4]),
                        { strokeWidth: 1.2 },
                    );
                    pen.arc(g, sx, y + 1.25 * U, 0.8 * U, 0.6 * U, Math.PI, Math.PI * 2, "pencil", {
                        strokeWidth: 1.2,
                    });
                } else {
                    pen.rect(g, sx - 0.3 * U, y + 0.6 * U, 0.6 * U, 0.6 * U, "ruler", null, {
                        strokeWidth: 1,
                        stroke: c.t["ink-soft"],
                    });
                }
            }
            a[`row(${r})`] = [x0, y + 1.2 * U, "left"];
        }
        pen.line(g, 0.2 * U, base, w - 0.2 * U, base, "pencil", { strokeWidth: 2.2 });
        return a;
    },
    describe: () =>
        "A grandstand seen from the front, rows of seats stepping up under a blue roof, people sitting in some seats and the rest drawn empty.",
    reads: true,
});
