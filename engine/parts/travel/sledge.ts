import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const upto = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const sledge = defineDrawing({
    id: "sledge",
    family: "travel",
    title: "Sledge",
    group: "Props",
    about: "A wooden sledge on two curled runners, its seat made of slats laid side by side, and a rope to pull it by. The slats can be counted, and a sledge down a slope is a push that keeps going.",
    params: { slats: 5 },
    settings: { slats: { kind: "whole", min: 3, max: 7 } },
    takes: [
        { label: "Five slats", params: { slats: 5 } },
        { label: "Three slats", params: { slats: 3 } },
    ],
    box: () => ({ w: 7, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = upto(p.slats, 3, 7),
            W = 7 * U,
            ground = 2.8 * U,
            seat = 1.3 * U,
            a: RawAnchors = {};
        for (const dy of [0, -0.22])
            pen.path(
                g,
                `M${0.7 * U} ${ground - 0.15 * U + dy * U}L${W - 1.7 * U} ${ground - 0.15 * U + dy * U}Q${W - 0.5 * U} ${ground - 0.2 * U + dy * U} ${W - 0.6 * U} ${seat - 0.3 * U}Q${W - 0.75 * U} ${seat - 0.9 * U} ${W - 1.25 * U} ${seat - 0.45 * U}`,
                "pencil",
                null,
                { strokeWidth: 3, stroke: c.t.berry },
            );
        for (const x of [1.4 * U, 3.3 * U, W - 2.2 * U])
            pen.line(g, x, seat + 0.2 * U, x, ground - 0.2 * U, "pencil", {
                strokeWidth: 1.8,
                stroke: c.t.tang,
            });
        for (let i = 0; i < n; i++) {
            const w = (W - 2.6 * U) / n,
                x = 0.9 * U + i * w;
            pen.rect(g, x, seat, w - 0.12 * U, 0.34 * U, "ruler", pen.fill("tang"), {
                strokeWidth: 1.1,
            });
            a[`slat(${i})`] = [x + w / 2, seat, "up"];
        }
        pen.curve(
            g,
            [
                [W - 1.3 * U, seat - 0.2 * U],
                [W - 0.4 * U, 0.3 * U],
                [W - 0.15 * U, 0.9 * U],
                [W - 0.4 * U, 1.3 * U],
            ],
            "pencil",
            { strokeWidth: 1.2, stroke: c.t["ink-soft"] },
        );
        pen.line(g, 0.1 * U, ground, W - 0.1 * U, ground, "pencil", {
            strokeWidth: 1.2,
            stroke: c.t.sky,
        });
        a.rope = [W - 0.4 * U, 1.3 * U, "right"];
        return a;
    },
    describe: () =>
        "A wooden sledge on two curled pink runners, with orange slats laid side by side for a seat and a rope to pull it by, on a line of snow.",
});
