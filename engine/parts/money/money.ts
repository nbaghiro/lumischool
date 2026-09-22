import { type Ctx, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, say, soft } from "../lettering";
import { COINS, coin, type Coin } from "../props";

/** US notes are all the same size, so the number on the corner is the only thing that tells them
 *  apart. That is worth drawing honestly: it is why children misread a five for a fifty. */
const NOTE_W = 6,
    NOTE_H = 2.5;

function note<G>(c: Ctx<G>, value: number, x: number, y: number): void {
    const { pen, g } = c,
        w = NOTE_W * U,
        h = NOTE_H * U;
    pen.path(
        g,
        roundedRect(x, y, w, h, 5),
        "ruler",
        pen.fill("mint", "solid", { hachureGap: 9, fillWeight: 0.5 }),
        { strokeWidth: 1.8 },
    );
    pen.path(g, roundedRect(x + 7, y + 7, w - 14, h - 14, 3), "ruler", null, {
        strokeWidth: 0.9,
        stroke: c.t["ink-soft"],
    });
    pen.ellipse(g, x + w / 2, y + h / 2, 2.1 * U, 1.5 * U, "ruler", pen.fill("card"), {
        strokeWidth: 1.3,
    });
    // A head in the oval, so the note reads as a note at a glance and not as a labelled rectangle.
    pen.circle(g, x + w / 2, y + h / 2 - 7, 17, "pencil", pen.fill("card"), { strokeWidth: 1.1 });
    pen.arc(g, x + w / 2, y + h / 2 + 18, 40, 30, Math.PI, 2 * Math.PI, "pencil", {
        strokeWidth: 1.1,
    });
    for (const [dx, dy] of [
        [12, 16],
        [w - 12, 16],
        [12, h - 10],
        [w - 12, h - 10],
    ] as const) {
        patch(c, x + dx, y + dy - 5, 26, 18);
        num(c, x + dx, y + dy, value, 15);
    }
    patch(c, x + w / 2, y + h - 13, 70, 14);
    soft(c, x + w / 2, y + h - 9, "DOLLARS", 9);
}

type Piece = string;

const pieceW = (s: Piece): number => (s in COINS ? 2 : NOTE_W + 0.5);

export const moneyRow = defineDrawing({
    id: "money",
    family: "money",
    title: "Notes and coins",
    group: "Props",
    about: "An amount laid out as the things it is actually made of, largest first. Every note is the same size, as they really are, so only the corner numbers tell a five from a twenty.",
    params: { pieces: ["10", "5", "quarter", "dime", "penny"] as Piece[], total: false },
    settings: { pieces: { kind: "words", most: 8 }, total: { kind: "flag" } },
    takes: [
        {
            label: "$15.36",
            params: { pieces: ["10", "5", "quarter", "dime", "penny"], total: false },
        },
        { label: "Notes only, with a total box", params: { pieces: ["20", "5"], total: true } },
        {
            label: "Coins only",
            params: {
                pieces: ["quarter", "quarter", "dime", "nickel", "penny", "penny"],
                total: true,
            },
        },
        { label: "One note", params: { pieces: ["1"], total: false } },
    ],
    box: (p) => ({
        w: Math.ceil(p.pieces.reduce((s, k) => s + pieceW(k), 0)) + 1,
        h: p.total ? 8 : 5,
    }),
    draw: (c, p) => {
        const a: RawAnchors = {};
        let x = U / 2;
        p.pieces.forEach((k, i) => {
            if (k in COINS) {
                coin(c, x + U, 2.2 * U, k as Coin);
                a[`piece(${i})`] = [x + U, 2.2 * U - COINS[k as Coin].mm * 0.8, "up"];
            } else {
                note(c, Number(k), x, 1.1 * U);
                a[`piece(${i})`] = [x + (NOTE_W / 2) * U, 1.1 * U, "up"];
            }
            x += pieceW(k) * U;
        });
        if (p.total) {
            const w = Math.ceil(p.pieces.reduce((s, k) => s + pieceW(k), 0)) + 1;
            say(c, (w / 2) * U - 30, 6.6 * U, "in all", 17, "end");
            c.pen.rect(c.g, (w / 2) * U - 20, 5.4 * U, 4 * U, 1.8 * U, "ruler", null, {
                strokeWidth: 1.8,
            });
            a.total = [(w / 2) * U + 20, 5.4 * U, "up"];
        }
        return a;
    },
    describe: () =>
        "Notes and coins laid out in a row largest first, every note the same green rectangle with its number in the corners and each coin at its real size.",
    reads: true,
});
