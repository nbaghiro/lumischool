import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, say, soft } from "../lettering";

interface CouncilParams {
    /** One number a seat along the table: 1 a hand up for the idea, 0 a hand down. */
    hands: number[];
    /** 1 shows the ballot box on the table. */
    box: number;
    /** What is being decided, written on the board; empty leaves the board off. */
    motion: string;
    /** 1 writes the count on the board: for, against. */
    count: number;
}

const SEAT = 2.6;

const MEETING: CouncilParams = {
    hands: [1, 0, 1, 1, 0, 1, 0],
    box: 0,
    motion: "A new footbridge",
    count: 0,
};

export const council = defineDrawing<CouncilParams>({
    id: "council",
    family: "places",
    title: "A council at its table",
    group: "Props",
    about: "A town council sitting along one long table, each member with a hand up to vote for the idea on the board or a hand down (`hands`, one a seat, up to twelve), a ballot box on the table when the vote is secret (`box`), and the board above them with what is being decided and, when `count` is 1, the votes for and against.",
    params: MEETING,
    settings: {
        hands: { kind: "numbers", min: 0, max: 1, most: 12 },
        box: { kind: "whole", min: 0, max: 1 },
        motion: { kind: "text", most: 30 },
        count: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Hands up for a footbridge", params: MEETING },
        {
            label: "The count on the board",
            params: {
                hands: [1, 1, 0, 1, 0, 1, 1, 0, 1],
                box: 0,
                motion: "Open the library on Sundays",
                count: 1,
            },
        },
        {
            label: "A secret vote",
            params: { hands: [0, 0, 0, 0, 0], box: 1, motion: "Choose a new mayor", count: 0 },
        },
    ],
    box: (p) => ({ w: Math.max(14, Math.ceil(p.hands.length * SEAT + 2)), h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            n = p.hands.length,
            w = Math.max(14, Math.ceil(n * SEAT + 2)) * U,
            tableY = 8.4 * U;
        if (p.motion) {
            pen.rect(
                g,
                w / 2 - 6 * U,
                0.4 * U,
                12 * U,
                Math.round(p.count) === 1 ? 2.6 * U : 1.6 * U,
                "ruler",
                pen.fill("card"),
                {
                    strokeWidth: 1.6,
                },
            );
            say(c, w / 2, 1.5 * U, p.motion, 13);
            if (Math.round(p.count) === 1) {
                const yes = p.hands.filter((h) => Math.round(h) === 1).length;
                soft(c, w / 2 - 3 * U, 2.55 * U, "for", 11);
                num(c, w / 2 - 1.6 * U, 2.6 * U, yes, 14);
                soft(c, w / 2 + 1.4 * U, 2.55 * U, "against", 11);
                num(c, w / 2 + 3.3 * U, 2.6 * U, n - yes, 14);
            }
        }
        p.hands.forEach((h, i) => {
            const x = (1 + SEAT * (i + 0.5)) * U + (w - (n * SEAT + 2) * U) / 2,
                shirts = ["sky", "berry", "mint", "tang"] as const;
            pen.circle(g, x, tableY - 3.1 * U, 1.2 * U, "pencil", pen.fill("card"), {
                strokeWidth: 1.4,
            });
            pen.path(
                g,
                `M${x - 0.9 * U} ${tableY}V${tableY - 1.6 * U}Q${x} ${tableY - 2.7 * U} ${x + 0.9 * U} ${tableY - 1.6 * U}V${tableY}Z`,
                "pencil",
                pen.fill(shirts[i % 4], "solid"),
                {
                    strokeWidth: 1.4,
                },
            );
            if (Math.round(h) === 1) {
                pen.line(g, x + 0.75 * U, tableY - 1.7 * U, x + 1.2 * U, tableY - 4 * U, "pencil", {
                    strokeWidth: 2.2,
                });
                pen.circle(g, x + 1.2 * U, tableY - 4.3 * U, 0.7 * U, "pencil", pen.fill("card"), {
                    strokeWidth: 1.1,
                });
            }
            a[`seat(${i})`] = [x, tableY - 3.8 * U, "up"];
        });
        pen.rect(g, 0.4 * U, tableY, w - 0.8 * U, 1.1 * U, "pencil", pen.fill("tang", "hachure"), {
            strokeWidth: 1.8,
        });
        for (const x of [1.2 * U, w - 1.2 * U])
            pen.line(g, x, tableY + 1.1 * U, x, 11.6 * U, "pencil", { strokeWidth: 1.8 });
        if (Math.round(p.box) === 1) {
            const bx = w / 2;
            pen.rect(
                g,
                bx - 1.2 * U,
                tableY - 1.8 * U,
                2.4 * U,
                1.8 * U,
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.6 },
            );
            pen.line(g, bx - 0.6 * U, tableY - 1.8 * U, bx + 0.6 * U, tableY - 1.8 * U, "ruler", {
                strokeWidth: 2.6,
            });
            a.ballot = [bx, tableY - 1.8 * U, "up"];
        }
        a.board = [w / 2, 0.4 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A council of ${p.hands.length} people along a long table${p.motion ? `, deciding on ${p.motion.toLowerCase()}` : ""}, some with a hand up to vote${Math.round(p.box) === 1 ? ", and a ballot box on the table" : ""}.`,
});
