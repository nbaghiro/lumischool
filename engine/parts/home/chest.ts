import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const chest = defineDrawing({
    id: "chest",
    family: "home",
    title: "Treasure chest",
    group: "Props",
    about: "A wooden treasure chest with iron bands and a lock, shut or with its lid thrown back on a heap of gold coins. The coins are drawn apart from each other so they can be counted.",
    params: { open: 1, coins: 5 },
    settings: { open: { kind: "whole", min: 0, max: 1 }, coins: { kind: "whole", min: 0, max: 9 } },
    takes: [
        { label: "Open, five coins", params: { open: 1, coins: 5 } },
        { label: "Shut", params: { open: 0, coins: 0 } },
    ],
    box: () => ({ w: 7, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(0, Math.min(9, Math.round(p.coins))),
            top = 3.2 * U,
            base = 5.7 * U,
            a: RawAnchors = {};
        if (p.open > 0) {
            // the lid thrown back, showing its shadowed inside, and the gold heaped over the rim
            pen.polygon(
                g,
                [
                    [1 * U, top - 0.1 * U],
                    [1.4 * U, 0.4 * U],
                    [5.6 * U, 0.4 * U],
                    [6 * U, top - 0.1 * U],
                ],
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.9 },
            );
            pen.polygon(
                g,
                [
                    [1.35 * U, top - 0.2 * U],
                    [1.7 * U, 0.75 * U],
                    [5.3 * U, 0.75 * U],
                    [5.65 * U, top - 0.2 * U],
                ],
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                { strokeWidth: 1.1 },
            );
            pen.path(
                g,
                `M${1.2 * U} ${top + 2}Q${3.5 * U} ${top - 1.6 * U} ${5.8 * U} ${top + 2}Z`,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1.5 },
            );
            for (let k = 0; k < n; k++) {
                const row = k < 5 ? 0 : 1,
                    i = row ? k - 5 : k,
                    per = row ? 4 : 5;
                const x = (3.5 + (i - (per - 1) / 2) * (row ? 0.75 : 0.85)) * U,
                    y = top - (row ? 0.85 : 0.25) * U;
                pen.ellipse(g, x, y, 15, 10, "ruler", pen.fill("glow"), { strokeWidth: 1.2 });
                a[`coin(${k})`] = [x, y - 5, "up"];
            }
        } else
            pen.path(
                g,
                `M${1 * U} ${top}Q${3.5 * U} ${1.4 * U} ${6 * U} ${top}Z`,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.9 },
            );
        pen.rect(g, 1 * U, top, 5 * U, base - top, "pencil", pen.fill("tang"), { strokeWidth: 2 });
        for (const x of [1.8, 5.2])
            pen.rect(
                g,
                (x - 0.15) * U,
                top,
                0.3 * U,
                base - top,
                "ruler",
                pen.fill("ink-soft", "hachure", { hachureGap: 2.5 }),
                { strokeWidth: 1 },
            );
        pen.rect(g, 3.2 * U, top + 0.3 * U, 0.6 * U, 0.8 * U, "ruler", pen.fill("glow"), {
            strokeWidth: 1.3,
        });
        pen.line(g, 0.4 * U, base, 6.6 * U, base, "pencil", { strokeWidth: 1.8 });
        a.lock = [3.5 * U, top + 0.7 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A wooden treasure chest with iron bands and a gold lock, ${p.open > 0 ? (Math.round(p.coins) > 0 ? "its lid thrown back on a heap of gold coins" : "its lid thrown back and nothing inside") : "its curved lid shut tight"}.`,
    reads: true,
});
