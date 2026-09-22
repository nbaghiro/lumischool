import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const ship = defineDrawing({
    id: "ship",
    family: "travel",
    title: "Sailing ship",
    group: "Structures",
    about: "A three-masted sailing ship on the waves, with bellying sails, a flag at the top of the tallest mast and a row of portholes along the hull. Sails and portholes are drawn evenly so they can be counted.",
    params: { sails: 3, portholes: 5 },
    settings: {
        sails: { kind: "whole", min: 1, max: 3 },
        portholes: { kind: "whole", min: 0, max: 8 },
    },
    takes: [
        { label: "Three masts, five portholes", params: { sails: 3, portholes: 5 } },
        { label: "Two masts, eight portholes", params: { sails: 2, portholes: 8 } },
    ],
    box: () => ({ w: 14, h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(1, Math.min(3, Math.round(p.sails))),
            holes = Math.max(0, Math.min(8, Math.round(p.portholes)));
        const deck = 9.2 * U,
            keel = 11.8 * U,
            a: RawAnchors = {};
        const masts = n === 1 ? [7] : n === 2 ? [5, 9] : [3.8, 7, 10.2];
        masts.forEach((mx, i) => {
            const tall = i === Math.floor(masts.length / 2) ? 0.8 * U : 2 * U;
            pen.line(g, mx * U, deck, mx * U, tall, "ruler", { strokeWidth: 2.4 });
            for (const [y0, y1, w] of [
                [tall + 1.2 * U, tall + 3.6 * U, 1.3],
                [tall + 3.9 * U, deck - 1.2 * U, 1.6],
            ] as const) {
                const L = mx * U - w * U,
                    R = mx * U + w * U;
                pen.path(
                    g,
                    `M${L} ${y0}L${R} ${y0}Q${R + 0.7 * U} ${(y0 + y1) / 2} ${R} ${y1}L${L} ${y1}Q${L + 0.7 * U} ${(y0 + y1) / 2} ${L} ${y0}Z`,
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.6 },
                );
                pen.line(g, L - 6, y0, R + 6, y0, "ruler", { strokeWidth: 1.8 });
            }
            a[`sail(${i})`] = [mx * U, tall + 1.2 * U, "up"];
            if (tall < U) {
                pen.polygon(
                    g,
                    [
                        [mx * U, tall],
                        [mx * U + 1.4 * U, tall + 0.35 * U],
                        [mx * U, tall + 0.7 * U],
                    ],
                    "pencil",
                    pen.fill("berry"),
                    { strokeWidth: 1.4 },
                );
                a.flag = [mx * U + 1.4 * U, tall + 0.35 * U, "right"];
            }
        });
        pen.linear(
            g,
            [
                [(masts[0] ?? 7) * U, 2.6 * U],
                [0.8 * U, deck - 0.4 * U],
            ],
            "pencil",
            { strokeWidth: 1, stroke: c.t["ink-soft"] },
        );
        pen.linear(
            g,
            [
                [(masts[masts.length - 1] ?? 7) * U, 2.6 * U],
                [13.4 * U, deck - 0.6 * U],
            ],
            "pencil",
            { strokeWidth: 1, stroke: c.t["ink-soft"] },
        );
        pen.polygon(
            g,
            [
                [0.4 * U, deck - 0.6 * U],
                [13.6 * U, deck - 0.8 * U],
                [12.2 * U, keel],
                [2 * U, keel],
            ],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 2.2 },
        );
        pen.line(g, 0.9 * U, deck + 0.5 * U, 13.1 * U, deck + 0.4 * U, "pencil", {
            strokeWidth: 1.2,
        });
        pen.polygon(
            g,
            [
                [1.1 * U, deck + 0.8 * U],
                [12.9 * U, deck + 0.7 * U],
                [12.7 * U, deck + 1.5 * U],
                [1.4 * U, deck + 1.6 * U],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.2 },
        );
        for (let k = 0; k < holes; k++) {
            const x = (2.2 + ((k + 0.5) * 9.6) / holes) * U;
            pen.circle(g, x, deck + 1.15 * U, 11, "ruler", pen.fill("sky"), { strokeWidth: 1.3 });
            a[`porthole(${k})`] = [x, deck + 1.15 * U, "down"];
        }
        for (let x = 0; x < 14 * U; x += 1.4 * U)
            pen.curve(
                g,
                [
                    [x, keel + 0.5 * U],
                    [x + 0.35 * U, keel + 0.15 * U],
                    [x + 0.7 * U, keel + 0.5 * U],
                ],
                "pencil",
                { strokeWidth: 1.5 },
            );
        a.bow = [13.6 * U, deck - 0.8 * U, "right"];
        return a;
    },
    describe: (p) =>
        `A sailing ship on the waves with ${p.sails === 1 ? "one mast" : "masts"} carrying bellying white sails, a red flag at the top, an orange hull and a row of portholes.`,
    motion: {
        body: { is: "float", lift: 10, dx: 0, deg: 3, pivot: [0.5, 0.9], period: 9, units: true },
    },
});
