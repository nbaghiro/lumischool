import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

type Pt = [number, number];

const SUITS = ["heart", "spade", "diamond", "club"];

function suit<G>(c: Ctx<G>, kind: string, x: number, y: number, r: number): void {
    const { pen, g } = c;
    const dark = kind === "spade" || kind === "club";
    const f = dark ? pen.fill("ink-soft", "solid", { hachureGap: 3 }) : pen.fill("berry");
    if (kind === "diamond") {
        pen.polygon(
            g,
            [
                [x, y - r],
                [x + r * 0.75, y],
                [x, y + r],
                [x - r * 0.75, y],
            ],
            "pencil",
            f,
            { strokeWidth: 1.2 },
        );
        return;
    }
    if (kind === "heart") {
        pen.path(
            g,
            `M${x} ${y + r * 0.85}C${x - r * 1.35} ${y - r * 0.2} ${x - r * 0.5} ${y - r * 1.1} ${x} ${y - r * 0.3}` +
                `C${x + r * 0.5} ${y - r * 1.1} ${x + r * 1.35} ${y - r * 0.2} ${x} ${y + r * 0.85}Z`,
            "pencil",
            f,
            { strokeWidth: 1.2 },
        );
        return;
    }
    if (kind === "spade") {
        pen.path(
            g,
            `M${x} ${y - r}C${x + r * 1.2} ${y + r * 0.1} ${x + r * 0.45} ${y + r * 0.8} ${x} ${y + r * 0.3}` +
                `C${x - r * 0.45} ${y + r * 0.8} ${x - r * 1.2} ${y + r * 0.1} ${x} ${y - r}Z`,
            "pencil",
            f,
            { strokeWidth: 1.2 },
        );
        pen.line(g, x, y + r * 0.2, x, y + r, "pencil", { strokeWidth: 2 });
        return;
    }
    for (const [dx, dy] of [
        [0, -0.45],
        [-0.5, 0.25],
        [0.5, 0.25],
    ] as Pt[])
        pen.circle(g, x + dx * r, y + dy * r, r * 0.85, "pencil", f, { strokeWidth: 1.1 });
    pen.line(g, x, y + r * 0.4, x, y + r, "pencil", { strokeWidth: 2 });
}

export const playingCards = defineDrawing({
    id: "cards",
    family: "sport",
    title: "Playing cards",
    group: "Props",
    about: "A hand of cards with the suit drawn rather than typed, so nothing depends on a font. A pack is a ready-made set of numbers to one to ten with four of each, which is most of a card game's maths.",
    params: {
        cards: [
            { rank: "7", suit: "heart" },
            { rank: "K", suit: "spade" },
            { rank: "3", suit: "diamond" },
        ],
        spread: true,
    },
    settings: { cards: { kind: "fixed" }, spread: { kind: "flag" } },
    takes: [
        {
            label: "Three, spread",
            params: {
                cards: [
                    { rank: "7", suit: "heart" },
                    { rank: "K", suit: "spade" },
                    { rank: "3", suit: "diamond" },
                ],
                spread: true,
            },
        },
        {
            label: "Laid out",
            params: {
                cards: [
                    { rank: "4", suit: "club" },
                    { rank: "9", suit: "diamond" },
                ],
                spread: false,
            },
        },
        { label: "One card", params: { cards: [{ rank: "A", suit: "spade" }], spread: false } },
    ],
    box: (p) => ({ w: p.cards.length * (p.spread ? 3 : 5) + 4, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        p.cards.forEach((card, i) => {
            const x = (1 + i * (p.spread ? 3 : 5)) * U,
                y = 1.4 * U,
                w = 4.4 * U,
                h = 6.2 * U;
            pen.path(g, roundedRect(x, y, w, h, 8), "ruler", pen.fill("card"), { strokeWidth: 2 });
            const kind = SUITS.includes(card.suit) ? card.suit : "heart";
            const red = kind === "heart" || kind === "diamond";
            for (const [cx, cy, flip] of [
                [x + 0.6 * U, y + 0.9 * U, 1],
                [x + w - 0.6 * U, y + h - 0.9 * U, -1],
            ] as const) {
                num(c, cx, cy + 6 * flip, card.rank, 17, "middle", red ? c.t.berry : c.t.ink);
                suit(c, kind, cx, cy + 0.8 * U * flip, 7);
            }
            suit(c, kind, x + w / 2, y + h / 2, 0.9 * U);
            a[`card(${i})`] = [x + w / 2, y, "up"];
        });
        return a;
    },
    describe: () =>
        "A hand of playing cards, each white card with its rank and suit in two corners and the suit drawn large in the middle.",
    reads: true,
});
