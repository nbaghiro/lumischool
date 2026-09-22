import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const upto = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const ferry = defineDrawing({
    id: "ferry",
    family: "travel",
    title: "Ferry",
    group: "Props",
    about: "A small ferry: a hull, a car deck with cars on it, a cabin with a row of round windows and a funnel with a stripe. The cars and the windows can be counted, and the ferry makes the same crossing there and back.",
    params: { cars: 2, windows: 5 },
    settings: {
        cars: { kind: "whole", min: 0, max: 3 },
        windows: { kind: "whole", min: 3, max: 7 },
    },
    takes: [
        { label: "Two cars aboard", params: { cars: 2, windows: 5 } },
        { label: "An empty deck", params: { cars: 0, windows: 7 } },
    ],
    box: () => ({ w: 13, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cars = upto(p.cars, 0, 3),
            n = upto(p.windows, 3, 7),
            W = 13 * U,
            deck = 3.6 * U,
            keel = 5.2 * U,
            a: RawAnchors = {};
        pen.path(
            g,
            `M${0.5 * U} ${deck}L${W - 0.4 * U} ${deck}Q${W - 0.8 * U} ${keel} ${W - 2 * U} ${keel}L${1.4 * U} ${keel}Q${0.7 * U} ${keel - 0.3 * U} ${0.5 * U} ${deck}Z`,
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1.9 },
        );
        pen.line(g, 0.8 * U, deck + 0.55 * U, W - 0.9 * U, deck + 0.55 * U, "pencil", {
            strokeWidth: 3,
            stroke: c.paper ? c.t.ink : c.t.card,
        });
        // the cabin, its round windows in a row, and the funnel
        pen.rect(g, 5.8 * U, 1.8 * U, 5.6 * U, deck - 1.8 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.7,
        });
        pen.rect(g, 5.5 * U, 1.55 * U, 6.2 * U, 0.3 * U, "pencil", pen.fill("card"), {
            strokeWidth: 1.3,
        });
        for (let i = 0; i < n; i++) {
            const x = 6.3 * U + (i / (n - 1)) * 4.6 * U;
            pen.circle(
                g,
                x,
                2.65 * U,
                0.55 * U,
                "ruler",
                pen.fill("sky", "hachure", { hachureGap: 2.5 }),
                { strokeWidth: 1.1 },
            );
            a[`window(${i})`] = [x, 2.4 * U, "up"];
        }
        pen.rect(g, 8.4 * U, 0.35 * U, 1.1 * U, 1.2 * U, "pencil", pen.fill("berry"), {
            strokeWidth: 1.5,
        });
        pen.rect(g, 8.4 * U, 0.7 * U, 1.1 * U, 0.3 * U, "pencil", pen.fill("card"), {
            strokeWidth: 0.9,
        });
        a.funnel = [8.95 * U, 0.35 * U, "up"];
        for (let i = 0; i < cars; i++) {
            const x = 1.2 * U + i * 1.5 * U,
                fill = pen.fill((["tang", "glow", "mint"] as const)[i % 3]);
            pen.path(
                g,
                `M${x} ${deck - 0.2 * U}L${x} ${deck - 0.75 * U}L${x + 0.35 * U} ${deck - 0.75 * U}L${x + 0.5 * U} ${deck - 1.15 * U}L${x + 1 * U} ${deck - 1.15 * U}L${x + 1.2 * U} ${deck - 0.75 * U}L${x + 1.35 * U} ${deck - 0.7 * U}L${x + 1.35 * U} ${deck - 0.2 * U}Z`,
                "pencil",
                fill,
                { strokeWidth: 1.2 },
            );
            for (const dx of [0.3, 1.05])
                pen.circle(
                    g,
                    x + dx * U,
                    deck - 0.2 * U,
                    0.34 * U,
                    "pencil",
                    pen.fill("ink-soft"),
                    { strokeWidth: 0.9 },
                );
            a[`car(${i})`] = [x + 0.7 * U, deck - 1.15 * U, "up"];
        }
        pen.line(g, W - 1.1 * U, 1.55 * U, W - 1.1 * U, 0.2 * U, "pencil", { strokeWidth: 1.3 });
        pen.polygon(
            g,
            [
                [W - 1.1 * U, 0.2 * U],
                [W - 0.3 * U, 0.4 * U],
                [W - 1.1 * U, 0.65 * U],
            ],
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1 },
        );
        for (let x = 0.2 * U; x < W - 0.3 * U; x += 1.3 * U)
            pen.curve(
                g,
                [
                    [x, keel + 0.3 * U],
                    [x + 0.33 * U, keel + 0.1 * U],
                    [x + 0.66 * U, keel + 0.3 * U],
                ],
                "pencil",
                { strokeWidth: 1.1 },
            );
        a.bow = [W - 0.4 * U, deck, "right"];
        return a;
    },
    describe: (p) =>
        `A blue ferry on the waves with a white cabin, a row of round windows, a red funnel with a white stripe and a flag${p.cars > 0 ? ", cars on its front deck" : ""}.`,
    motion: {
        body: { is: "float", lift: 6, dx: 0, deg: 2, pivot: [0.5, 0.9], period: 8.2, units: true },
    },
});
