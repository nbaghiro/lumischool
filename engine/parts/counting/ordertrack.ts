import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch, slot } from "../lettering";

export const orderTrack = defineDrawing({
    id: "ordertrack",
    family: "counting",
    title: "Put them in order",
    group: "Inputs",
    about: "Loose cards above a track of slots that runs from smallest to largest. The arrow under the track says which way round it goes, which is the instruction children most often lose.",
    params: { cards: ["36", "12", "51"], filled: [] as string[], way: "up" },
    settings: {
        cards: { kind: "words", most: 6 },
        filled: { kind: "fixed" },
        way: { kind: "one of", of: ["up", "down"] },
    },
    takes: [
        { label: "Three to place", params: { cards: ["36", "12", "51"], filled: [], way: "up" } },
        {
            label: "Answered",
            params: { cards: ["36", "12", "51"], filled: ["12", "36", "51"], way: "up" },
        },
        {
            label: "Largest first",
            params: { cards: ["0.4", "0.25", "0.7", "0.1"], filled: [], way: "down" },
        },
    ],
    box: (p) => ({ w: p.cards.length * 4 + 5, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = p.cards.length,
            a: RawAnchors = {};
        p.cards.forEach((v, i) => {
            const x = (1.6 + i * 4) * U;
            pen.path(
                g,
                roundedRect(x, U, 3.2 * U, 2.6 * U, 7),
                "ruler",
                pen.fill("glow", "solid", { hachureGap: 8 }),
                { strokeWidth: 1.8 },
            );
            patch(c, x + 1.6 * U, 2 * U, 44, 26);
            num(c, x + 1.6 * U, 2.6 * U, v, 22);
            a[`card(${i})`] = [x + 1.6 * U, U, "up"];
        });
        const top = 5.4 * U;
        for (let i = 0; i < n; i++) {
            const x = (1.6 + i * 4) * U;
            slot(c, x, top, 3.2 * U, 2.6 * U, p.filled[i] || undefined);
            a[`slot(${i})`] = [x + 1.6 * U, top, "up"];
        }
        const y = 9.4 * U,
            x0 = 1.4 * U,
            x1 = (n * 4 + 1.4) * U;
        pen.line(g, x0, y, x1, y, "ruler", { strokeWidth: 2 });
        for (const s of [-0.45, 0.45])
            pen.line(g, x1, y, x1 - 14 * Math.cos(s), y - 14 * Math.sin(s), "ruler", {
                strokeWidth: 2,
            });
        cap(c, x0, y + 1.1 * U, p.way === "up" ? "smallest" : "largest", 12, "start");
        cap(c, x1, y + 1.1 * U, p.way === "up" ? "largest" : "smallest", 12, "end");
        return a;
    },
    describe: () =>
        "Yellow number cards above a row of empty slots along a track, with an arrow under the track and the words smallest and largest at its ends.",
});
