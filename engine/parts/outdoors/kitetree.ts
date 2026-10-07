import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

/** The tree that eats kites: a big round crown with a sulky face, and old kites caught in its branches. */
export const kiteTree = defineDrawing<{ kites: number }>({
    id: "kitetree",
    family: "outdoors",
    title: "The tree that eats kites",
    group: "Props",
    about: "A big leafy tree with a round crown and a sulky face in its leaves, the kind that catches kites, with old kites and their lines tangled in its branches.",
    params: { kites: 2 },
    settings: { kites: { kind: "whole", min: 0, max: 2 } },
    takes: [
        { label: "Two kites caught", params: { kites: 2 } },
        { label: "Nothing caught yet", params: { kites: 0 } },
    ],
    box: () => ({ w: 8, h: 10 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            o = { strokeWidth: 1.5, roughness: 0.3 };
        pen.polygon(
            g,
            [
                [3.4 * U, 10 * U],
                [3.6 * U, 6 * U],
                [4.4 * U, 6 * U],
                [4.7 * U, 10 * U],
            ],
            "pencil",
            pen.fill("tang", "hachure"),
            o,
        );
        const crown: [number, number, number][] = [
            [4, 4.4, 6.6],
            [2.2, 4.8, 3.4],
            [5.9, 4.6, 3.4],
            [4, 2.2, 3.8],
        ];
        for (const [x, y, d] of crown)
            pen.circle(g, x * U, y * U, d * U, "pencil", pen.fill("mint", "solid"), o);
        // a sulky face in the leaves: heavy brows and a turned-down mouth
        for (const x of [3.2, 4.8]) {
            pen.circle(g, x * U, 4.2 * U, 0.42 * U, "ruler", pen.fill("card", "solid"), {
                strokeWidth: 1,
            });
            pen.circle(g, x * U, 4.3 * U, 0.18 * U, "ruler", pen.fill("ink", "solid"), {
                strokeWidth: 0.4,
            });
            pen.line(
                g,
                (x - 0.5) * U,
                (x < 4 ? 3.55 : 3.75) * U,
                (x + 0.5) * U,
                (x < 4 ? 3.75 : 3.55) * U,
                "pencil",
                { strokeWidth: 1.6 },
            );
        }
        pen.arc(g, 4 * U, 5.9 * U, 1.6 * U, 0.9 * U, Math.PI * 1.1, Math.PI * 1.9, "pencil", {
            strokeWidth: 1.5,
        });
        const caught: [Pt, string][] = [
            [[1.4, 3.4], "berry"],
            [[6.6, 2.6], "sky"],
        ];
        caught
            .slice(0, Math.max(0, Math.min(2, Math.round(p.kites))))
            .forEach(([[x, y], tone], i) => {
                const t = tone === "sky" ? "sky" : "berry";
                pen.polygon(
                    g,
                    [
                        [x * U, (y - 0.8) * U],
                        [(x + 0.6) * U, y * U],
                        [x * U, (y + 1) * U],
                        [(x - 0.6) * U, y * U],
                    ],
                    "pencil",
                    pen.fill(t, "solid"),
                    {
                        strokeWidth: 1.1,
                        roughness: 0.3,
                    },
                );
                pen.curve(
                    g,
                    [
                        [x * U, (y + 1) * U],
                        [(x + (i ? -0.6 : 0.5)) * U, (y + 1.8) * U],
                        [(x + (i ? 0.2 : -0.2)) * U, (y + 2.6) * U],
                    ],
                    "pencil",
                    {
                        strokeWidth: 0.8,
                        stroke: c.t["ink-soft"],
                    },
                );
            });
        return { crown: [4 * U, 4.4 * U, "up"], foot: [4 * U, 10 * U, "down"] };
    },
    describe: (p) =>
        `A big leafy tree with a round crown and a sulky face in its leaves${Math.round(p.kites) > 0 ? ", with old kites and their lines tangled in its branches" : ", its branches empty for now"}.`,
});
