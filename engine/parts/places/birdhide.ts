import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { clamp } from "../animals/nature";

export const birdHide = defineDrawing({
    id: "birdhide",
    family: "places",
    title: "Bird hide",
    group: "Structures",
    about: "A wooden hide on stilts at the edge of the water, with a row of long slots to watch the birds through and a ramp up to its door. The slots can be counted, and the hide is where a tally of the birds seen is kept.",
    params: { slots: 3 },
    settings: { slots: { kind: "whole", min: 1, max: 4 } },
    takes: [
        { label: "Three slots", params: { slots: 3 } },
        { label: "Two slots", params: { slots: 2 } },
    ],
    box: () => ({ w: 9, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.slots, 1, 4),
            W = 9 * U,
            floor = 4.4 * U,
            water = 6.1 * U,
            a: RawAnchors = {};
        for (const x of [1.6, 3.8, 6, 8])
            pen.rect(
                g,
                x * U - 0.14 * U,
                floor,
                0.28 * U,
                water - floor + 0.5 * U,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.1 },
            );
        pen.rect(
            g,
            1.2 * U,
            2.1 * U,
            7.2 * U,
            floor - 2.1 * U,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 4, hachureAngle: 90 }),
            { strokeWidth: 1.8 },
        );
        pen.polygon(
            g,
            [
                [0.7 * U, 2.25 * U],
                [8.9 * U, 1.3 * U],
                [8.9 * U, 1.75 * U],
                [0.7 * U, 2.65 * U],
            ],
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.6 },
        );
        for (let i = 0; i < n; i++) {
            const w = (5.6 * U) / n,
                x = 1.9 * U + i * w;
            pen.rect(g, x, 2.85 * U, w - 0.4 * U, 0.45 * U, "ruler", pen.fill("ink-soft"), {
                strokeWidth: 1.1,
            });
            a[`slot(${i})`] = [x + (w - 0.4 * U) / 2, 2.85 * U, "up"];
        }
        pen.line(g, 0.2 * U, water - 0.4 * U, 1.2 * U, floor, "pencil", { strokeWidth: 2.2 });
        pen.line(g, 0.3 * U, water - 0.15 * U, 1.3 * U, floor + 0.25 * U, "pencil", {
            strokeWidth: 1.2,
        });
        pen.line(g, 1.2 * U, floor, 8.4 * U, floor, "pencil", { strokeWidth: 1.8 });
        for (let x = 1.4 * U; x < W; x += 1.3 * U)
            pen.curve(
                g,
                [
                    [x, water + 0.3 * U],
                    [x + 0.32 * U, water + 0.12 * U],
                    [x + 0.64 * U, water + 0.3 * U],
                ],
                "pencil",
                { strokeWidth: 1.2 },
            );
        a.door = [1.2 * U, floor, "left"];
        return a;
    },
    describe: () =>
        "A wooden hide on stilts at the water's edge with a green roof, a row of long dark slots in its wall and a ramp up to its door.",
});
