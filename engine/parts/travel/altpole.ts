import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, soft } from "../lettering";

const whole = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/**
 * Fifty metres of a tall altitude pole, five metres to a square, with a tick every ten and the metres
 * written at its top: stood one on another they read a climb into the sky in tens and hundreds.
 */
export const altPole = defineDrawing<{ from: number; top: boolean }>({
    id: "altpole",
    family: "travel",
    title: "Altitude pole",
    group: "Structures",
    about: "Fifty metres of a tall altitude pole at five metres to a square: a tick every ten metres, a long mark at every fifty with its number, and a cap on the top length.",
    params: { from: 0, top: false },
    settings: { from: { kind: "whole", min: 0, max: 950 }, top: { kind: "flag" } },
    takes: [
        { label: "The foot, nought to fifty", params: { from: 0, top: false } },
        {
            label: "The top, four hundred and fifty to five hundred",
            params: { from: 450, top: true },
        },
    ],
    box: () => ({ w: 3, h: 10 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            from = whole(p.from, 0, 950),
            x = 0.3 * U,
            w = 0.3 * U,
            hundred = (from + 50) % 100 === 0;
        for (let i = 0; i < 5; i++)
            pen.rect(
                g,
                x,
                i * 2 * U,
                w,
                2 * U,
                "ruler",
                pen.fill(i % 2 ? "card" : "sky", "solid"),
                { strokeWidth: 0.9, roughness: 0.15 },
            );
        for (let i = 1; i < 5; i++)
            pen.line(g, x + w, i * 2 * U, x + w + 0.3 * U, i * 2 * U, "ruler", {
                strokeWidth: 1,
            });
        pen.line(g, x - 0.1 * U, 0.05 * U, x + w + (hundred ? 0.8 : 0.6) * U, 0.05 * U, "ruler", {
            strokeWidth: hundred ? 2.2 : 1.6,
        });
        num(c, x + w + 0.75 * U, 0.6 * U, from + 50, 13, "start");
        soft(c, x + w + 0.8 * U + String(from + 50).length * 13 * 0.56, 0.6 * U, "m", 11, "start");
        if (from === 0) num(c, x + w + 0.75 * U, 9.95 * U, 0, 13, "start");
        if (p.top)
            pen.rect(g, x - 0.1 * U, -0.05 * U, w + 0.2 * U, 0.3 * U, "ruler", pen.fill("berry"), {
                strokeWidth: 1,
                roughness: 0.15,
            });
        return { top: [x + w / 2, 0, "up"], foot: [x + w / 2, 10 * U, "down"] };
    },
    describe: (p) =>
        `Fifty metres of a striped altitude pole, marked every ten metres, from ${whole(p.from, 0, 950)} metres at its foot up to ${whole(p.from, 0, 950) + 50} metres written at its top.`,
    motion: { still: "The pole stands still while the climb goes past its marks." },
});
