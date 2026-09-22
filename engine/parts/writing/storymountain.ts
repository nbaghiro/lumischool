import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, say } from "../lettering";
import { writeLine, wrapTo } from "./lines";

type Pt = [number, number];

const MOUNT_CARDS: [number, number][] = [
    [0.3, 13],
    [2.6, 5.4],
    [13.8, 0.3],
    [25, 5.4],
    [27.3, 13],
];

const MOUNT_FLAGS: Pt[] = [
    [8.2, 17.1],
    [11.6, 13.2],
    [17, 7.6],
    [22.4, 13.2],
    [25.8, 17.1],
];

const CARD_W = 6.4;

export const storyMountain = defineDrawing({
    id: "storymountain",
    family: "writing",
    title: "Story mountain",
    group: "Structures",
    about: "A story drawn as a climb: the opening at the foot, the build-up on the way up, the problem at the top, the part where it gets fixed on the way down and the ending at the foot of the other side. Each stage has a card with a note or two ruled lines for one, so a plan has a shape before a word of the story is written.",
    params: {
        stages: ["Opening", "Build-up", "Problem", "Fixing it", "Ending"],
        notes: ["", "", "", "", ""],
        ring: -1,
    },
    settings: {
        stages: { kind: "words", most: 5 },
        notes: { kind: "words", most: 5 },
        ring: { kind: "whole", min: -1, max: 4 },
    },
    takes: [
        {
            label: "Empty, to plan on",
            params: {
                stages: ["Opening", "Build-up", "Problem", "Fixing it", "Ending"],
                notes: ["", "", "", "", ""],
                ring: -1,
            },
        },
        {
            label: "A plan in notes",
            params: {
                stages: ["Opening", "Build-up", "Problem", "Fixing it", "Ending"],
                notes: [
                    "Rocket on the hill",
                    "Count down from ten",
                    "It will not go",
                    "Mia finds the loose wire",
                    "Up it goes at last",
                ],
                ring: 2,
            },
        },
    ],
    box: () => ({ w: 34, h: 20 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const hill: Pt[] = [
            [6.2, 18.8],
            [9, 16.2],
            [12, 12.6],
            [15, 9],
            [17, 7.4],
            [19, 9],
            [22, 12.6],
            [25, 16.2],
            [27.8, 18.8],
        ];
        pen.path(
            g,
            `M${hill.map(([x, y]) => `${x * U} ${y * U}`).join("L")}Z`,
            "pencil",
            pen.fill("mint", "hachure", { hachureGap: 7, fillWeight: 0.8 }),
            { strokeWidth: 2.4 },
        );
        pen.line(g, 5 * U, 18.8 * U, 29 * U, 18.8 * U, "pencil", { strokeWidth: 1.6 });
        pen.polygon(
            g,
            [
                [15.9 * U, 8.3 * U],
                [17 * U, 7.4 * U],
                [18.1 * U, 8.3 * U],
                [17.5 * U, 8.7 * U],
                [17 * U, 8.2 * U],
                [16.5 * U, 8.7 * U],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.2 },
        );
        const n = Math.min(5, p.stages.length);
        for (let i = 0; i < n; i++) {
            const [fx, fy] = MOUNT_FLAGS[i] ?? [0, 0],
                [cx, cy] = MOUNT_CARDS[i] ?? [0, 0];
            const note = p.notes[i] ?? "";
            const lines = note ? wrapTo(note, (CARD_W - 1) * U, 15).slice(0, 3) : [];
            const ch = 1.9 + (note ? lines.length * 1.3 + 0.5 : 4);
            const toX = cx + CARD_W / 2,
                toY = i === 0 || i === 4 ? cy : cy + ch;
            pen.line(g, fx * U, fy * U, toX * U, toY * U, "pencil", {
                strokeWidth: 1,
                strokeLineDash: [3, 5],
                stroke: c.t["ink-soft"],
            });
            pen.path(
                g,
                roundedRect(cx * U, cy * U, CARD_W * U, ch * U, 8),
                "ruler",
                pen.fill(i === p.ring ? "glow" : "card"),
                { strokeWidth: 1.8 },
            );
            cap(c, (cx + CARD_W / 2) * U, (cy + 1.2) * U, p.stages[i] ?? "", 11);
            if (note)
                lines.forEach((l, k) =>
                    say(c, (cx + 0.5) * U, (cy + 2.9 + k * 1.3) * U, l, 15, "start"),
                );
            else
                for (const k of [0, 1])
                    writeLine(c, (cx + 0.4) * U, (cy + 3.6 + k * 2) * U, (CARD_W - 0.8) * U);
            pen.line(g, fx * U, fy * U, fx * U, (fy - 1.6) * U, "pencil", { strokeWidth: 1.8 });
            pen.polygon(
                g,
                [
                    [fx * U, (fy - 1.6) * U],
                    [(fx + 1.1) * U, (fy - 1.25) * U],
                    [fx * U, (fy - 0.9) * U],
                ],
                "pencil",
                pen.fill("berry"),
                { strokeWidth: 1.2 },
            );
            pen.circle(g, (fx - 0.6) * U, (fy - 0.4) * U, 0.9 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.2,
                stroke: c.t.pen,
            });
            num(c, (fx - 0.6) * U, (fy - 0.4) * U + 5, i + 1, 12, "middle", c.t.pen);
            a[`stage(${i})`] = [(cx + CARD_W / 2) * U, cy * U, "up"];
        }
        return a;
    },
    describe: () =>
        "A story drawn as a mountain, a card at each stage from the opening at one foot over the top to the ending at the other, a note on each.",
});
