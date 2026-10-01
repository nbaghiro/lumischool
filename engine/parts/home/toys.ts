import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

/** The toys the shelf draws; when each was first made is in engine/notation/chronicle.ts, with its source. */
export const TOYS = [
    "spinning top",
    "kite",
    "rag doll",
    "teddy bear",
    "building bricks",
    "puzzle cube",
] as const;
type Toy = (typeof TOYS)[number];
const isToy = (s: string): s is Toy => (TOYS as readonly string[]).includes(s);

const STEP = 5.5;
const BASE = 6.2 * U;

function toy<G>(c: Ctx<G>, t: Toy, x: number): number {
    const { pen, g } = c,
        w = { strokeWidth: 1.6 };
    switch (t) {
        case "spinning top":
            pen.polygon(
                g,
                [
                    [x - 1.5 * U, BASE - 2.4 * U],
                    [x + 1.5 * U, BASE - 2.4 * U],
                    [x, BASE],
                ],
                "pencil",
                pen.fill("berry", "hachure"),
                w,
            );
            pen.ellipse(g, x, BASE - 2.4 * U, 3 * U, 0.8 * U, "pencil", pen.fill("glow"), w);
            pen.line(g, x, BASE - 2.4 * U, x, BASE - 3.4 * U, "pencil", { strokeWidth: 2.2 });
            return BASE - 3.4 * U;
        case "kite":
            pen.polygon(
                g,
                [
                    [x, BASE - 4.6 * U],
                    [x + 1.3 * U, BASE - 3 * U],
                    [x, BASE - 1.2 * U],
                    [x - 1.3 * U, BASE - 3 * U],
                ],
                "pencil",
                pen.fill("sky"),
                w,
            );
            pen.line(g, x, BASE - 4.6 * U, x, BASE - 1.2 * U, "pencil", { strokeWidth: 1 });
            pen.line(g, x - 1.3 * U, BASE - 3 * U, x + 1.3 * U, BASE - 3 * U, "pencil", {
                strokeWidth: 1,
            });
            pen.curve(
                g,
                [
                    [x, BASE - 1.2 * U],
                    [x + 0.6 * U, BASE - 0.7 * U],
                    [x - 0.3 * U, BASE - 0.3 * U],
                    [x + 0.4 * U, BASE],
                ],
                "pencil",
                { strokeWidth: 1.1 },
            );
            return BASE - 4.6 * U;
        case "rag doll":
            pen.circle(g, x, BASE - 3.6 * U, 1.3 * U, "pencil", pen.fill("card"), w);
            pen.polygon(
                g,
                [
                    [x - 0.5 * U, BASE - 3 * U],
                    [x + 0.5 * U, BASE - 3 * U],
                    [x + 1.1 * U, BASE - 0.4 * U],
                    [x - 1.1 * U, BASE - 0.4 * U],
                ],
                "pencil",
                pen.fill("mint", "hachure"),
                w,
            );
            for (const dx of [-0.4, 0.4])
                pen.line(g, x + dx * U, BASE - 0.4 * U, x + dx * U, BASE, "pencil", w);
            for (const dx of [-0.25, 0.25])
                pen.circle(g, x + dx * U, BASE - 3.7 * U, 3, "pencil", pen.fill("ink"), {
                    strokeWidth: 0.6,
                });
            return BASE - 4.3 * U;
        case "teddy bear":
            pen.ellipse(
                g,
                x,
                BASE - 1.1 * U,
                2.4 * U,
                2.2 * U,
                "pencil",
                pen.fill("tang", "hachure"),
                w,
            );
            pen.circle(g, x, BASE - 3 * U, 1.8 * U, "pencil", pen.fill("tang", "hachure"), w);
            for (const dx of [-0.75, 0.75])
                pen.circle(g, x + dx * U, BASE - 3.8 * U, 0.7 * U, "pencil", pen.fill("tang"), w);
            pen.circle(g, x, BASE - 2.8 * U, 0.6 * U, "pencil", pen.fill("card"), {
                strokeWidth: 1,
            });
            return BASE - 4.2 * U;
        case "building bricks":
            for (const [dx, dy, fill] of [
                [-1, 0, "berry"],
                [0.9, 0, "sky"],
                [0, -1.3, "glow"],
            ] as const) {
                pen.rect(
                    g,
                    x + (dx - 0.9) * U,
                    BASE + (dy - 1.3) * U,
                    1.8 * U,
                    1.3 * U,
                    "ruler",
                    pen.fill(fill, "solid"),
                    w,
                );
                for (const k of [-0.45, 0.45])
                    pen.rect(
                        g,
                        x + (dx + k - 0.25) * U,
                        BASE + (dy - 1.55) * U,
                        0.5 * U,
                        0.25 * U,
                        "ruler",
                        pen.fill(fill, "solid"),
                        { strokeWidth: 1 },
                    );
            }
            return BASE - 2.9 * U;
        default: {
            const s = 2.7 * U,
                top = BASE - s;
            pen.rect(g, x - s / 2, top, s, s, "ruler", pen.fill("card"), w);
            const fills = [
                "berry",
                "glow",
                "sky",
                "mint",
                "tang",
                "berry",
                "sky",
                "mint",
                "glow",
            ] as const;
            fills.forEach((f, i) =>
                pen.rect(
                    g,
                    x - s / 2 + (i % 3) * (s / 3) + 2,
                    top + Math.floor(i / 3) * (s / 3) + 2,
                    s / 3 - 4,
                    s / 3 - 4,
                    "ruler",
                    pen.fill(f, "solid"),
                    { strokeWidth: 0.8 },
                ),
            );
            return top;
        }
    }
}

const SHELF = { toys: ["spinning top", "teddy bear", "puzzle cube"], letters: 1 };

export const toys = defineDrawing({
    id: "toys",
    family: "home",
    title: "Toys old and new",
    group: "Props",
    about: "A row of toys on a shelf, chosen from a spinning top, a kite, a rag doll, a teddy bear, plastic building bricks and a puzzle cube, lettered A, B, C when `letters` is 1. Some are very old kinds of toy and some were first made within living memory, so a row can be put in the order the toys were first made.",
    params: SHELF,
    settings: {
        toys: { kind: "words", of: TOYS, most: 6 },
        letters: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Three toys, lettered", params: SHELF },
        { label: "Every toy", params: { toys: [...TOYS], letters: 0 } },
    ],
    box: (p) => ({ w: Math.max(6, Math.ceil(p.toys.length * STEP + 0.5)), h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            width = Math.max(6, Math.ceil(p.toys.length * STEP + 0.5)) * U;
        pen.rect(g, 0.2 * U, BASE, width - 0.4 * U, 0.5 * U, "pencil", pen.fill("tang", "solid"), {
            strokeWidth: 1.6,
        });
        p.toys.forEach((t, i) => {
            if (!isToy(t)) return;
            const x = (0.5 + STEP * (i + 0.5)) * U,
                top = toy(c, t, x);
            if (Math.round(p.letters) === 1) num(c, x, BASE + 1.5 * U, "ABCDEF".charAt(i), 15);
            a[`toy(${i})`] = [x, top, "up"];
        });
        return a;
    },
    describe: (p) =>
        `A wooden shelf with ${p.toys.length} toys standing on it in a row, old kinds of toy and newer ones side by side${Math.round(p.letters) === 1 ? ", each with a letter under it" : ""}.`,
});
