import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const narrowboat = defineDrawing({
    id: "narrowboat",
    family: "travel",
    title: "Narrowboat",
    group: "Props",
    about: "A long, narrow canal boat with a row of windows along its cabin, pots of flowers on the roof, a chimney and a tiller at the back. The windows and the pots can be counted, and the boat is exactly as long as its windows need.",
    params: { windows: 5, pots: 3 },
    settings: {
        windows: { kind: "whole", min: 2, max: 8 },
        pots: { kind: "whole", min: 0, max: 6 },
    },
    takes: [
        { label: "Five windows, three pots", params: { windows: 5, pots: 3 } },
        { label: "Three windows, no flowers", params: { windows: 3, pots: 0 } },
    ],
    box: (p) => ({ w: Math.max(2, Math.min(8, Math.round(p.windows))) * 2 + 5, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(2, Math.min(8, Math.round(p.windows))),
            pots = Math.max(0, Math.min(6, Math.round(p.pots)));
        const W = (n * 2 + 5) * U,
            deck = 3 * U,
            keel = 4.2 * U,
            roof = 1.7 * U,
            a: RawAnchors = {};
        pen.path(
            g,
            `M${0.8 * U} ${deck}L${W - 1.6 * U} ${deck}Q${W - 0.3 * U} ${deck - 0.4 * U} ${W - 0.4 * U} ${deck - 0.9 * U}Q${W - 0.8 * U} ${keel} ${W - 2 * U} ${keel}L${1.1 * U} ${keel}Z`,
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.8 },
        );
        pen.line(g, 1 * U, deck + 0.45 * U, W - 1.2 * U, deck + 0.45 * U, "pencil", {
            strokeWidth: 3.2,
            stroke: c.paper ? c.t.ink : c.t.glow,
        });
        pen.rect(g, 1.6 * U, roof, W - 4.2 * U, deck - roof, "pencil", pen.fill("mint"), {
            strokeWidth: 1.6,
        });
        for (let i = 0; i < n; i++) {
            const x = 2.6 * U + i * 2 * U;
            pen.circle(g, x, roof + 0.62 * U, 0.62 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.2,
            });
            a[`window(${i})`] = [x, roof + 0.62 * U, "up"];
        }
        for (let i = 0; i < pots; i++) {
            const x = 3 * U + i * ((W - 6 * U) / Math.max(1, pots));
            pen.polygon(
                g,
                [
                    [x - 0.3 * U, roof],
                    [x - 0.22 * U, roof - 0.45 * U],
                    [x + 0.22 * U, roof - 0.45 * U],
                    [x + 0.3 * U, roof],
                ],
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1 },
            );
            for (const dx of [-0.18, 0.02, 0.2])
                pen.circle(
                    g,
                    x + dx * U,
                    roof - 0.62 * U - Math.abs(dx) * 4,
                    7,
                    "pencil",
                    pen.fill(dx < 0 ? "berry" : "glow"),
                    { strokeWidth: 0.8 },
                );
            a[`pot(${i})`] = [x, roof - 0.5 * U, "up"];
        }
        pen.rect(
            g,
            W - 3.6 * U,
            roof - 0.9 * U,
            0.35 * U,
            0.9 * U,
            "pencil",
            pen.fill("ink-soft"),
            { strokeWidth: 1 },
        );
        pen.line(g, 0.9 * U, deck - 0.1 * U, 0.2 * U, deck - 0.9 * U, "pencil", { strokeWidth: 2 });
        for (let x = 0; x < W; x += 1.4 * U)
            pen.curve(
                g,
                [
                    [x, keel + 0.35 * U],
                    [x + 0.35 * U, keel + 0.12 * U],
                    [x + 0.7 * U, keel + 0.35 * U],
                ],
                "pencil",
                { strokeWidth: 1.1 },
            );
        a.bow = [W - 0.5 * U, deck - 0.8 * U, "right"];
        a.stern = [0.3 * U, deck - 0.8 * U, "left"];
        return a;
    },
    describe: () =>
        "A long pink narrowboat on the water with a green cabin, a row of round windows, pots of flowers on the roof, a chimney and a tiller at the back.",
});
