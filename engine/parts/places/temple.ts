import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const temple = defineDrawing({
    id: "temple",
    family: "places",
    title: "Stepped temple",
    group: "Structures",
    about: "A temple built in steps of stone, each stone resting on two below it, with a small shrine on top and vines growing up its sides. It is a number wall: write a number on each stone and every stone is the sum of the two it sits on.",
    params: { rows: 4 },
    settings: { rows: { kind: "whole", min: 2, max: 6 } },
    takes: [
        { label: "Four rows", params: { rows: 4 } },
        { label: "Three rows", params: { rows: 3 } },
    ],
    box: (p) => ({
        w: Math.max(2, Math.min(6, Math.round(p.rows))) * 2 + 2,
        h: Math.max(2, Math.min(6, Math.round(p.rows))) + 4,
    }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(2, Math.min(6, Math.round(p.rows))),
            W = n * 2 + 2,
            base = (n + 3.6) * U,
            a: RawAnchors = {};
        for (let r = 0; r < n; r++) {
            const count = n - r,
                y = base - (r + 1) * U,
                x0 = (W / 2 - count) * U;
            for (let i = 0; i < count; i++) {
                pen.rect(
                    g,
                    x0 + i * 2 * U,
                    y,
                    2 * U,
                    U,
                    "pencil",
                    pen.fill(r % 2 ? "tang" : "glow", "hachure", {
                        hachureGap: 5,
                        fillWeight: 0.7,
                    }),
                    { strokeWidth: 1.6 },
                );
                a[`stone(${r},${i})`] = [x0 + i * 2 * U + U, y + U / 2, "up"];
            }
        }
        const sy = base - n * U;
        pen.rect(g, (W / 2 - 1.1) * U, sy - 1.8 * U, 2.2 * U, 1.8 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.7,
        });
        pen.path(
            g,
            `M${(W / 2 - 0.4) * U} ${sy}L${(W / 2 - 0.4) * U} ${sy - 0.9 * U}Q${(W / 2) * U} ${sy - 1.4 * U} ${(W / 2 + 0.4) * U} ${sy - 0.9 * U}L${(W / 2 + 0.4) * U} ${sy}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.2 },
        );
        pen.polygon(
            g,
            [
                [(W / 2 - 1.5) * U, sy - 1.8 * U],
                [(W / 2) * U, sy - 2.9 * U],
                [(W / 2 + 1.5) * U, sy - 1.8 * U],
            ],
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.7 },
        );
        for (const s of [-1, 1]) {
            const x = (W / 2 + s * (n - 0.3)) * U;
            pen.curve(
                g,
                [
                    [x, base],
                    [x - s * 10, base - 0.8 * U],
                    [x + s * 4, base - 1.6 * U],
                    [x - s * 16, base - 2.4 * U],
                ],
                "pencil",
                { strokeWidth: 1.4, stroke: c.t["ink-soft"] },
            );
            for (let k = 0; k < 3; k++)
                pen.ellipse(
                    g,
                    x - s * (k * 5) + s * 6,
                    base - (0.5 + k * 0.7) * U,
                    14,
                    9,
                    "pencil",
                    pen.fill("mint"),
                    { strokeWidth: 1 },
                );
        }
        pen.line(g, 0.2 * U, base, (W - 0.2) * U, base, "pencil", { strokeWidth: 2 });
        a.top = [(W / 2) * U, sy - 2.9 * U, "up"];
        return a;
    },
    describe: () =>
        "A temple built in steps of stone blocks, each block resting on the two below it, with a small shrine on top and vines growing up its sides.",
});
