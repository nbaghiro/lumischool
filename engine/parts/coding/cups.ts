import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, soft } from "../lettering";

export const cupAt = (i: number): { x: number; y: number; w: number; h: number } => ({
    x: (0.5 + i * 3) * U,
    y: 0.3 * U,
    w: 2.6 * U,
    h: 6.4 * U,
});

export const cups = defineDrawing({
    id: "cups",
    family: "coding",
    title: "Cups hiding numbers in order",
    group: "Structures",
    about: "A row of cups with a number hidden under each, smallest on the left, for finding one number by lifting as few cups as possible. A lifted cup shows its number, and `crossed` strikes out every cup that lifting it rules out, so halving the row each time can be seen. `open` lists the cups lifted so far, counted from the left.",
    params: { cards: [2, 5, 8, 11, 14, 17, 20], open: [4] as number[], target: 14, crossed: true },
    settings: {
        cards: { kind: "numbers", min: 0, max: 99, most: 9 },
        open: { kind: "numbers", min: 1, max: 9, most: 9 },
        target: { kind: "whole", min: 0, max: 99 },
        crossed: { kind: "flag" },
    },
    takes: [
        {
            label: "The middle cup lifted",
            params: { cards: [2, 5, 8, 11, 14, 17, 20], open: [4], target: 14, crossed: true },
        },
        {
            label: "Found in two",
            params: {
                cards: [2, 5, 8, 11, 14, 17, 20],
                open: [4, 6, 5],
                target: 14,
                crossed: true,
            },
        },
    ],
    box: (p) => ({ w: Math.max(1, p.cards.length) * 3 + 1, h: 8 }),
    draw: (c, p) => {
        const a: RawAnchors = {},
            { pen, g } = c,
            n = p.cards.length;
        const opened = new Set(p.open.map((i) => Math.round(i) - 1));
        let lo = 0,
            hi = n - 1;
        for (const i of p.open.map((k) => Math.round(k) - 1)) {
            if (i < 0 || i >= n) continue;
            const card = p.cards[i] ?? 0;
            if (card < p.target) lo = Math.max(lo, i + 1);
            else if (card > p.target) hi = Math.min(hi, i - 1);
        }
        p.cards.forEach((v, i) => {
            const x = (0.5 + i * 3) * U,
                base = 6.5 * U,
                up = opened.has(i);
            if (up) {
                num(c, x + 1.3 * U, base - 0.6 * U, String(v), 20);
                pen.polygon(
                    g,
                    [
                        [x + 0.2 * U, base - 3.6 * U],
                        [x + 2.4 * U, base - 3.6 * U],
                        [x + 2 * U, base - 6.2 * U],
                        [x + 0.6 * U, base - 6.2 * U],
                    ],
                    "pencil",
                    pen.fill(v === p.target ? "mint" : "tang"),
                    { strokeWidth: 1.8 },
                );
            } else {
                pen.polygon(
                    g,
                    [
                        [x + 0.2 * U, base],
                        [x + 2.4 * U, base],
                        [x + 2 * U, base - 2.8 * U],
                        [x + 0.6 * U, base - 2.8 * U],
                    ],
                    "pencil",
                    pen.fill("tang"),
                    { strokeWidth: 1.8 },
                );
            }
            pen.line(g, x - 0.1 * U, base + 0.1 * U, x + 2.7 * U, base + 0.1 * U, "ruler", {
                strokeWidth: 1.2,
            });
            soft(c, x + 1.3 * U, base + 1.2 * U, String(i + 1), 12);
            if (p.crossed && p.open.length && !up && (i < lo || i > hi)) {
                pen.line(g, x + 0.2 * U, base - 3 * U, x + 2.4 * U, base, "pencil", {
                    strokeWidth: 2.2,
                    stroke: c.paper ? c.t.ink : "#C2185B",
                });
            }
            a[`cup(${i + 1})`] = [x + 1.3 * U, base - 3 * U, "up"];
        });
        return a;
    },
    describe: () =>
        "A row of upturned cups on a table, each hiding a number, the smallest at the left, some lifted to show their numbers and others crossed out.",
});
