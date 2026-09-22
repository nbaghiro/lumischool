import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const WASH: Marker[] = ["sky", "berry", "glow", "mint"];

export const clothesLine = defineDrawing({
    id: "clothesline",
    family: "home",
    title: "Washing on the line",
    group: "Props",
    about: "A washing line between two posts with clothes pegged along it, a shirt, a sock, a towel, a dress, their colours repeating in a pattern. The clothes and the pegs can be counted, and what colour comes next is a pattern question.",
    params: { count: 5, pattern: 2 },
    settings: {
        count: { kind: "whole", min: 1, max: 8 },
        pattern: { kind: "whole", min: 1, max: 4 },
    },
    takes: [
        { label: "Five, two colours", params: { count: 5, pattern: 2 } },
        { label: "Seven, three colours", params: { count: 7, pattern: 3 } },
    ],
    box: (p) => ({ w: Math.max(1, Math.min(8, Math.round(p.count))) * 2 + 3, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(1, Math.min(8, Math.round(p.count))),
            period = Math.max(1, Math.min(4, Math.round(p.pattern)));
        const W = (n * 2 + 3) * U,
            ground = 5.7 * U,
            top = 1.1 * U,
            a: RawAnchors = {};
        for (const x of [0.8 * U, W - 0.8 * U]) {
            pen.line(g, x, ground, x, top - 0.2 * U, "pencil", { strokeWidth: 2.2 });
            pen.line(g, x - 0.4 * U, top - 0.1 * U, x + 0.4 * U, top - 0.1 * U, "pencil", {
                strokeWidth: 1.6,
            });
        }
        const sagAt = (x: number) =>
            top + 0.55 * U * Math.sin((Math.PI * (x - 0.8 * U)) / (W - 1.6 * U));
        pen.curve(
            g,
            Array.from({ length: 9 }, (_, i) => {
                const x = 0.8 * U + (i / 8) * (W - 1.6 * U);
                return [x, sagAt(x)] as Pt;
            }),
            "pencil",
            { strokeWidth: 1.3 },
        );
        for (let i = 0; i < n; i++) {
            const x = (2.5 + i * 2) * U,
                y = sagAt(x),
                fill = pen.fill(WASH[i % period] ?? "sky");
            const kind = i % 4;
            if (kind === 0)
                pen.polygon(
                    g,
                    [
                        [x - 0.8 * U, y + 0.1 * U],
                        [x + 0.8 * U, y + 0.1 * U],
                        [x + 0.95 * U, y + 0.7 * U],
                        [x + 0.55 * U, y + 0.75 * U],
                        [x + 0.55 * U, y + 1.9 * U],
                        [x - 0.55 * U, y + 1.9 * U],
                        [x - 0.55 * U, y + 0.75 * U],
                        [x - 0.95 * U, y + 0.7 * U],
                    ],
                    "pencil",
                    fill,
                    { strokeWidth: 1.4 },
                );
            else if (kind === 1)
                pen.polygon(
                    g,
                    [
                        [x - 0.25 * U, y + 0.1 * U],
                        [x + 0.25 * U, y + 0.1 * U],
                        [x + 0.25 * U, y + 1.3 * U],
                        [x + 0.75 * U, y + 1.35 * U],
                        [x + 0.75 * U, y + 1.75 * U],
                        [x - 0.25 * U, y + 1.75 * U],
                    ],
                    "pencil",
                    fill,
                    { strokeWidth: 1.3 },
                );
            else if (kind === 2) {
                pen.rect(g, x - 0.7 * U, y + 0.1 * U, 1.4 * U, 1.9 * U, "pencil", fill, {
                    strokeWidth: 1.4,
                });
                for (const dy of [0.5, 1.6])
                    pen.line(g, x - 0.7 * U, y + dy * U, x + 0.7 * U, y + dy * U, "ruler", {
                        strokeWidth: 0.9,
                    });
            } else
                pen.polygon(
                    g,
                    [
                        [x - 0.35 * U, y + 0.1 * U],
                        [x + 0.35 * U, y + 0.1 * U],
                        [x + 0.85 * U, y + 2.1 * U],
                        [x - 0.85 * U, y + 2.1 * U],
                    ],
                    "pencil",
                    fill,
                    { strokeWidth: 1.4 },
                );
            for (const dx of kind === 1 ? [0] : [-0.45, 0.45])
                pen.rect(g, x + dx * U - 3, y - 7, 6, 12, "ruler", pen.fill("tang"), {
                    strokeWidth: 0.9,
                });
            a[`item(${i})`] = [x, y + 2.1 * U, "down"];
        }
        pen.line(g, 0.2 * U, ground, W - 0.2 * U, ground, "pencil", { strokeWidth: 1.8 });
        return a;
    },
    describe: (p) =>
        `A washing line between two posts with clothes pegged along it, a shirt, a sock, a towel and a dress in turn, ${Math.round(p.pattern) > 1 ? "their colours repeating" : "all one colour"}.`,
});
