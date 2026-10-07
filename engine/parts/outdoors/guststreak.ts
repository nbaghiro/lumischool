import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** The lines a gust of wind is drawn with, blowing to the right, one of them curling at its end. */
export const gustStreak = defineDrawing<{ length: number; curl: number }>({
    id: "guststreak",
    family: "outdoors",
    title: "Gust of wind",
    group: "Marks",
    about: "Two or three long swept lines that show a gust of wind blowing to the right, the top one curling over at its end the way wind is drawn in a comic.",
    params: { length: 5, curl: 1 },
    settings: {
        length: { kind: "whole", min: 3, max: 8 },
        curl: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "A curling gust", params: { length: 5, curl: 1 } },
        { label: "A long straight gust", params: { length: 8, curl: 0 } },
    ],
    box: (p) => ({ w: Math.max(3, Math.min(8, Math.round(p.length))), h: 2 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = Math.max(3, Math.min(8, Math.round(p.length))) * U,
            o = { strokeWidth: 1.6, stroke: c.t.sky, roughness: 0.4 };
        pen.curve(
            g,
            [
                [0.1 * U, 0.7 * U],
                [w * 0.45, 0.45 * U],
                [w - 0.9 * U, 0.6 * U],
            ],
            "pencil",
            o,
        );
        if (p.curl > 0)
            pen.arc(
                g,
                w - 0.9 * U,
                0.95 * U,
                0.7 * U,
                0.7 * U,
                -Math.PI / 2,
                Math.PI * 0.75,
                "pencil",
                o,
            );
        pen.curve(
            g,
            [
                [0.6 * U, 1.35 * U],
                [w * 0.5, 1.15 * U],
                [w - 0.2 * U, 1.3 * U],
            ],
            "pencil",
            o,
        );
        pen.curve(
            g,
            [
                [1.4 * U, 1.8 * U],
                [w * 0.6, 1.7 * U],
                [w - 1.4 * U, 1.8 * U],
            ],
            "pencil",
            {
                ...o,
                strokeWidth: 1.1,
            },
        );
        return { front: [w, U, "right"] };
    },
    describe: (p) =>
        `Long swept lines of a gust of wind blowing to the right${p.curl > 0 ? ", the top one curling over at its end" : ", all of them straight"}.`,
    motion: { still: "A gust is carried across by the game." },
});
