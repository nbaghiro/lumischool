import { roundedRect } from "../../ink/pen";
import type { Ctx, RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, paintFill } from "../../pigment";
import { defineDrawing, STILL } from "../drawing";
import { say, wide } from "../lettering";
import { apple } from "../props";

export const FOODS = [
    "apple",
    "orange",
    "banana",
    "lemon",
    "pear",
    "tomato",
    "strawberry",
    "grapes",
    "carrot",
    "potato",
    "bread",
    "cheese",
    "fish",
    "egg",
] as const;
type Food = (typeof FOODS)[number];

interface StallParams {
    foods: string[];
    /** The card on the counter under each crate, in any language; an empty word leaves it blank. */
    names: string[];
    /** A second line on the card, such as a price; empty for none. */
    costs: string[];
}

const isFood = (s: string): s is Food => (FOODS as readonly string[]).includes(s);

const paint = <G>(c: Ctx<G>, recipe: string) => paintFill(c, colourOf(recipe) ?? "#888888");

/** One piece of a food about `s` units across, standing on `base` and centred on x. */
function piece<G>(c: Ctx<G>, kind: Food, x: number, base: number, s: number): void {
    const { pen, g } = c,
        r = s / 2,
        y = base - r;
    switch (kind) {
        case "apple":
            apple(c, x, y + 2, s);
            return;
        case "orange":
            pen.circle(g, x, y, s, "pencil", pen.fill("tang"), { strokeWidth: 1.5 });
            pen.circle(g, x + r * 0.1, y - r * 0.7, 2.5, "doodle", pen.fill("mint"), {
                strokeWidth: 1,
            });
            return;
        case "lemon":
            pen.path(
                g,
                `M${x - r * 1.15} ${y}Q${x - r * 0.8} ${y - r * 0.95} ${x} ${y - r * 0.85}Q${x + r * 0.8} ${y - r * 0.95} ${x + r * 1.15} ${y}Q${x + r * 0.8} ${y + r * 0.95} ${x} ${y + r * 0.85}Q${x - r * 0.8} ${y + r * 0.95} ${x - r * 1.15} ${y}Z`,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1.5 },
            );
            return;
        case "banana":
            pen.path(
                g,
                `M${x - r * 1.2} ${y - r * 0.5}Q${x} ${y + r * 1.3} ${x + r * 1.2} ${y - r * 0.6}Q${x} ${y + r * 0.5} ${x - r * 1.2} ${y - r * 0.5}Z`,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1.5 },
            );
            pen.line(g, x + r * 1.2, y - r * 0.6, x + r * 1.35, y - r * 0.85, "pencil", {
                strokeWidth: 1.8,
            });
            return;
        case "pear":
            pen.path(
                g,
                `M${x} ${y - r * 1.05}C${x + r * 0.45} ${y - r * 1.05} ${x + r * 0.35} ${y - r * 0.2} ${x + r * 0.8} ${y + r * 0.3}C${x + r * 1.05} ${y + r * 0.95} ${x - r * 1.05} ${y + r * 0.95} ${x - r * 0.8} ${y + r * 0.3}C${x - r * 0.35} ${y - r * 0.2} ${x - r * 0.45} ${y - r * 1.05} ${x} ${y - r * 1.05}Z`,
                "pencil",
                pen.fill("mint"),
                { strokeWidth: 1.5 },
            );
            pen.line(g, x, y - r * 1.05, x + 2, y - r * 1.4, "pencil", { strokeWidth: 1.6 });
            return;
        case "tomato":
            pen.circle(g, x, y + 1, s, "pencil", paint(c, "red"), { strokeWidth: 1.5 });
            for (const d of [-0.35, 0, 0.35])
                pen.line(g, x, y - r * 0.8, x + d * s, y - r * 0.55, "pencil", {
                    stroke: c.t.ink,
                    strokeWidth: 1.3,
                });
            return;
        case "strawberry":
            pen.path(
                g,
                `M${x - r * 0.9} ${y - r * 0.55}Q${x} ${y - r * 0.9} ${x + r * 0.9} ${y - r * 0.55}Q${x + r * 0.8} ${y + r * 0.5} ${x} ${y + r}Q${x - r * 0.8} ${y + r * 0.5} ${x - r * 0.9} ${y - r * 0.55}Z`,
                "pencil",
                paint(c, "red"),
                { strokeWidth: 1.5 },
            );
            for (const [dx, dy] of [
                [-0.35, -0.2],
                [0.3, -0.15],
                [0, 0.25],
            ] as const)
                pen.circle(g, x + dx * s, y + dy * s, 1.6, "doodle", pen.fill("glow"), {
                    strokeWidth: 0.6,
                });
            pen.path(
                g,
                `M${x - r * 0.6} ${y - r * 0.7}L${x} ${y - r * 1.05}L${x + r * 0.6} ${y - r * 0.7}`,
                "pencil",
                null,
                { stroke: c.t.ink, strokeWidth: 1.4 },
            );
            return;
        case "grapes":
            for (const [dx, dy] of [
                [-0.5, -0.55],
                [0, -0.6],
                [0.5, -0.55],
                [-0.25, -0.05],
                [0.25, -0.05],
                [0, 0.45],
            ] as const)
                pen.circle(
                    g,
                    x + dx * r * 1.1,
                    y + dy * r,
                    r * 0.62,
                    "pencil",
                    paint(c, "red+blue"),
                    {
                        strokeWidth: 1.1,
                    },
                );
            pen.line(g, x, y - r * 0.95, x + 3, y - r * 1.35, "pencil", { strokeWidth: 1.6 });
            return;
        case "carrot":
            pen.path(
                g,
                `M${x - r * 0.45} ${y - r * 0.55}L${x + r * 0.45} ${y - r * 0.55}L${x + 1} ${y + r}Z`,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.5 },
            );
            for (const d of [-0.3, 0, 0.3])
                pen.line(g, x, y - r * 0.55, x + d * s, y - r * 1.15, "pencil", {
                    strokeWidth: 1.4,
                });
            return;
        case "potato":
            pen.ellipse(g, x, y + r * 0.2, s * 1.1, s * 0.8, "pencil", paint(c, "brown+white"), {
                strokeWidth: 1.5,
            });
            pen.circle(g, x - r * 0.3, y, 1.8, "doodle", null, { strokeWidth: 1 });
            pen.circle(g, x + r * 0.35, y + r * 0.3, 1.6, "doodle", null, { strokeWidth: 1 });
            return;
        case "bread":
            pen.path(
                g,
                `M${x - r * 1.2} ${base}V${y - r * 0.1}Q${x - r * 1.2} ${y - r * 0.9} ${x} ${y - r * 0.9}Q${x + r * 1.2} ${y - r * 0.9} ${x + r * 1.2} ${y - r * 0.1}V${base}Z`,
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 4 }),
                { strokeWidth: 1.6 },
            );
            for (const d of [-0.5, 0, 0.5])
                pen.line(g, x + d * r - 3, y - r * 0.2, x + d * r + 3, y - r * 0.6, "pencil", {
                    strokeWidth: 1.3,
                });
            return;
        case "cheese":
            pen.path(
                g,
                `M${x - r * 1.1} ${base}L${x - r * 1.1} ${y - r * 0.2}L${x + r * 1.1} ${y - r * 0.8}L${x + r * 1.1} ${base}Z`,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1.5 },
            );
            pen.circle(g, x - r * 0.4, y + r * 0.3, 3.2, "doodle", pen.fill("card"), {
                strokeWidth: 1,
            });
            pen.circle(g, x + r * 0.5, y + r * 0.1, 2.4, "doodle", pen.fill("card"), {
                strokeWidth: 1,
            });
            return;
        case "fish":
            pen.path(
                g,
                `M${x - r * 1.1} ${y}Q${x - r * 0.2} ${y - r * 0.75} ${x + r * 0.55} ${y}Q${x - r * 0.2} ${y + r * 0.75} ${x - r * 1.1} ${y}Z`,
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 1.5 },
            );
            pen.path(
                g,
                `M${x + r * 0.5} ${y}L${x + r * 1.15} ${y - r * 0.5}L${x + r * 1.15} ${y + r * 0.5}Z`,
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 1.4 },
            );
            pen.circle(g, x - r * 0.65, y - 1, 2, "doodle", pen.fill("ink"), { strokeWidth: 0.6 });
            return;
        case "egg":
            pen.ellipse(g, x, y + r * 0.1, s * 0.75, s * 0.95, "pencil", pen.fill("card"), {
                strokeWidth: 1.5,
            });
            return;
    }
}

/** Three of a food heaped in a crate `w` units wide whose rim is at `rim`. */
function heap<G>(c: Ctx<G>, kind: Food, x: number, rim: number, w: number): void {
    const s = 1.35 * U;
    const spots: [number, number][] =
        kind === "bread" || kind === "cheese" || kind === "fish"
            ? [
                  [-0.22, 0],
                  [0.22, 0],
              ]
            : [
                  [-0.27, 0],
                  [0.27, 0],
                  [0, -0.5],
              ];
    for (const [dx, dy] of spots) piece(c, kind, x + dx * w, rim + dy * s + 2, s);
}

export const foodStall = defineDrawing<StallParams>({
    id: "foodstall",
    family: "food",
    title: "A market stall with named crates",
    group: "Props",
    about: "A market stall under a striped awning with a crate of one food each on its counter and a card under each crate for its name and, if there is one, its price. The market as a word list: a child reads the card, or writes the missing one.",
    params: {
        foods: ["apple", "orange", "banana"],
        names: ["manzanas", "naranjas", "plátanos"],
        costs: ["", "", ""],
    },
    settings: {
        foods: { kind: "words", most: 4, of: FOODS },
        names: { kind: "words", most: 4 },
        costs: { kind: "words", most: 4 },
    },
    takes: [
        {
            label: "Fruit with names",
            params: {
                foods: ["apple", "orange", "banana"],
                names: ["manzanas", "naranjas", "plátanos"],
                costs: ["", "", ""],
            },
        },
        {
            label: "Four crates with prices",
            params: {
                foods: ["bread", "cheese", "fish", "tomato"],
                names: ["pan", "queso", "pescado", "tomates"],
                costs: ["2 €", "5 €", "8 €", "3 €"],
            },
        },
        {
            label: "Cards left blank",
            params: {
                foods: ["strawberry", "grapes", "carrot", "egg"],
                names: ["", "", "", ""],
                costs: ["", "", "", ""],
            },
        },
    ],
    box: (p) => ({ w: Math.max(1, p.foods.length) * 6 + 2, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            n = Math.max(1, p.foods.length),
            W = (n * 6 + 2) * U,
            awning = 1.8 * U,
            top = 7 * U,
            floor = 11.8 * U;
        for (const x of [0.6 * U, W - 0.6 * U])
            pen.line(g, x, awning, x, floor, "pencil", { strokeWidth: 2.6 });
        const stripes = n * 4;
        const sw = (W - 0.4 * U) / stripes;
        for (let i = 0; i < stripes; i++) {
            const x = 0.2 * U + i * sw;
            pen.path(
                g,
                `M${x} ${0.3 * U}H${x + sw}V${awning}Q${x + sw / 2} ${awning + 0.6 * U} ${x} ${awning}Z`,
                "pencil",
                pen.fill(i % 2 ? "card" : "sky"),
                { strokeWidth: 1.4 },
            );
        }
        pen.rect(
            g,
            0.3 * U,
            top + 0.5 * U,
            W - 0.6 * U,
            floor - top - 0.5 * U,
            "pencil",
            c.paper ? pen.fill("card") : pen.fill("tang", "hachure", { hachureGap: 12 }),
            { strokeWidth: 1.8 },
        );
        pen.rect(g, 0.1 * U, top, W - 0.2 * U, 0.5 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.8,
        });
        p.foods.forEach((kind, i) => {
            const x = (1.5 + i * 6) * U,
                w = 5 * U,
                mid = x + w / 2,
                rim = top - 1.8 * U;
            pen.rect(g, x, rim, w, top - rim, "pencil", pen.fill("card"), { strokeWidth: 1.7 });
            pen.line(g, x + 3, rim + 0.9 * U, x + w - 3, rim + 0.9 * U, "pencil", {
                strokeWidth: 1,
            });
            // the food heaps over the crate's rim, so it is drawn after the crate
            if (isFood(kind)) heap(c, kind, mid, rim, w);
            const name = p.names[i] ?? "",
                cost = p.costs[i] ?? "",
                cardTop = top + 1.2 * U,
                cardH = cost ? 2.6 * U : 1.6 * U;
            pen.path(
                g,
                roundedRect(x + 0.2 * U, cardTop, w - 0.4 * U, cardH, 5),
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.5 },
            );
            const size = Math.min(15, ((w - 0.8 * U) / Math.max(1, wide(name, 15))) * 15);
            if (name) say(c, mid, cardTop + 1.1 * U, name, size);
            if (cost) say(c, mid, cardTop + 2.2 * U, cost, 14);
            a[`crate(${i})`] = [mid, rim - 1.2 * U, "up"];
            a[`card(${i})`] = [mid, cardTop + cardH, "down"];
        });
        return a;
    },
    describe: (p) =>
        `A market stall under a striped awning with ${p.foods.length} crates of food on the counter, and a card under each crate for its name.`,
    motion: { still: STILL.clues },
});
