import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";

type Pt = [number, number];

export const numberFan = defineDrawing({
    id: "fan",
    family: "counting",
    title: "Number fan",
    group: "Props",
    about: "The fan a class holds up to answer together, spread with one card turned to the front. It is the drawing that says an answer is shown rather than written, which some items need.",
    params: { show: "7", cards: 6 },
    settings: { show: { kind: "text", most: 3 }, cards: { kind: "whole", min: 2, max: 10 } },
    takes: [
        { label: "Showing seven", params: { show: "7", cards: 6 } },
        { label: "Showing twelve", params: { show: "12", cards: 8 } },
        { label: "Nothing chosen", params: { show: "?", cards: 6 } },
    ],
    box: () => ({ w: 12, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            px = 6 * U,
            py = 9.6 * U,
            a: RawAnchors = {};
        const n = Math.max(2, p.cards);
        for (let i = 0; i < n; i++) {
            const t = -Math.PI / 2 + (i - (n - 1) / 2) * 0.34;
            const len = 6.6 * U,
                w = 1.5 * U;
            const tipx = px + len * Math.cos(t),
                tipy = py + len * Math.sin(t);
            const nx = -Math.sin(t),
                ny = Math.cos(t);
            pen.polygon(
                g,
                [
                    [px + nx * w * 0.3, py + ny * w * 0.3],
                    [tipx + nx * w, tipy + ny * w],
                    [tipx - nx * w, tipy - ny * w],
                    [px - nx * w * 0.3, py - ny * w * 0.3],
                ] as Pt[],
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.8 },
            );
            if (i !== Math.floor(n / 2))
                num(c, tipx, tipy + 6, String((i + 1) % 10), 15, "middle", c.t["ink-soft"]);
        }
        const tipx = px,
            tipy = py - 6.6 * U;
        pen.polygon(
            g,
            [
                [px - 0.5 * U, py - 0.2 * U],
                [tipx - 1.6 * U, tipy],
                [tipx + 1.6 * U, tipy],
                [px + 0.5 * U, py - 0.2 * U],
            ] as Pt[],
            "ruler",
            pen.fill("glow", "solid", { hachureGap: 8 }),
            { strokeWidth: 2.2 },
        );
        patch(c, tipx, tipy + 0.7 * U, 44, 34);
        num(c, tipx, tipy + 1.1 * U, p.show, 32);
        pen.circle(
            g,
            px,
            py,
            0.7 * U,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 1 },
        );
        a.answer = [tipx, tipy, "up"];
        a.pivot = [px, py, "down"];
        return a;
    },
    describe: () =>
        "A number fan of white cards spread from a pivot, one card turned to the front in yellow with a large number on it.",
});
