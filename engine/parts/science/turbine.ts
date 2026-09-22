import { part, type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";

/** How many of the house's lamps the turbine keeps lit: one more for each step up in the wind. */
export const lampsLit = (wind: number, lamps: number): number =>
    Math.max(0, Math.min(Math.round(lamps), Math.round(wind)));

export const turbine = defineDrawing({
    id: "turbine",
    family: "science",
    title: "Wind turbine",
    group: "Structures",
    about: "A wind turbine on a hill with a cable to a house. The moving air turns the blades, the turning makes electricity, and the electricity lights the lamps in the house: no wind lights nothing, and each stronger step of wind lights one more lamp. The wind is the number of arrows, so the lamps lit are worked out from it. Only the blades move, because their turning is not a reading.",
    params: { wind: 2, lamps: 3 },
    settings: { wind: { kind: "whole", min: 0, max: 3 }, lamps: { kind: "whole", min: 1, max: 4 } },
    takes: [
        { label: "A steady wind", params: { wind: 2, lamps: 3 } },
        { label: "No wind", params: { wind: 0, lamps: 4 } },
        { label: "A strong wind", params: { wind: 3, lamps: 4 } },
    ],
    box: () => ({ w: 22, h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            wind = Math.max(0, Math.min(3, Math.round(p.wind))),
            n = Math.max(1, Math.min(4, Math.round(p.lamps)));
        const ground = 12.2 * U,
            hx = 7 * U,
            hy = 3.6 * U;
        pen.path(
            g,
            `M0 ${ground}Q${5 * U} ${ground - 2.2 * U} ${11 * U} ${ground - 0.6 * U}Q${16 * U} ${ground + 0.2 * U} ${22 * U} ${ground}`,
            "pencil",
            null,
            { strokeWidth: 2.2 },
        );
        for (let i = 0; i < wind; i++) {
            const y = (2.6 + i * 1.6) * U;
            pen.curve(
                g,
                [
                    [0.3 * U, y + 0.2 * U],
                    [1.4 * U, y - 0.25 * U],
                    [2.5 * U, y + 0.2 * U],
                    [3.4 * U, y],
                ],
                "pencil",
                { strokeWidth: 1.8, stroke: c.t.pen },
            );
            pen.polygon(
                g,
                [
                    [3.8 * U, y],
                    [3.3 * U, y - 0.3 * U],
                    [3.3 * U, y + 0.3 * U],
                ],
                "ruler",
                { fill: c.t.pen, fillStyle: "solid" },
                { strokeWidth: 0.8, stroke: c.t.pen },
            );
        }
        if (wind === 0) soft(c, 1.9 * U, 3.2 * U, "no wind", 12);
        pen.polygon(
            g,
            [
                [hx - 0.25 * U, hy],
                [hx + 0.25 * U, hy],
                [hx + 0.45 * U, ground - 1.6 * U],
                [hx - 0.45 * U, ground - 1.6 * U],
            ],
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.8 },
        );
        pen.path(
            g,
            roundedRect(hx - 0.3 * U, hy - 0.45 * U, 1.5 * U, 0.9 * U, 5),
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.6 },
        );
        // the blades turn on their own, as a part that is free to move
        const b = part(c, "blades", [hx, hy], { symmetry: 3 });
        for (let k = 0; k < 3; k++) {
            const t = -Math.PI / 2 + (k * 2 * Math.PI) / 3,
                ux = Math.cos(t),
                uy = Math.sin(t),
                nx = -uy,
                ny = ux;
            b.pen.polygon(
                b.g,
                [
                    [hx + nx * 0.18 * U, hy + ny * 0.18 * U],
                    [hx + ux * 3.4 * U + nx * 0.28 * U, hy + uy * 3.4 * U + ny * 0.28 * U],
                    [hx + ux * 3.6 * U, hy + uy * 3.6 * U],
                    [hx - nx * 0.18 * U, hy - ny * 0.18 * U],
                ],
                "ruler",
                b.pen.fill("sky"),
                { strokeWidth: 1.5 },
            );
        }
        pen.circle(g, hx, hy, 0.7 * U, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
        a.blades = [hx, hy - 3.6 * U, "up"];
        // the cable to the house, sagging between the turbine and the wall
        const wx = 15 * U,
            lit = lampsLit(wind, n);
        pen.path(
            g,
            `M${hx + 0.4 * U} ${ground - 2 * U}Q${11 * U} ${ground - 1.2 * U} ${wx} ${ground - 3.6 * U}`,
            "pencil",
            null,
            { strokeWidth: 1.4, stroke: c.t["ink-soft"] },
        );
        pen.rect(g, wx, ground - 5.4 * U, 6 * U, 5.4 * U, "pencil", pen.fill("card"), {
            strokeWidth: 2,
        });
        pen.polygon(
            g,
            [
                [wx - 0.4 * U, ground - 5.4 * U],
                [wx + 3 * U, ground - 7.6 * U],
                [wx + 6.4 * U, ground - 5.4 * U],
            ],
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 2 },
        );
        for (let i = 0; i < n; i++) {
            const x = wx + (0.6 + (i % 2) * 2.9) * U,
                y = ground - (4.6 - Math.floor(i / 2) * 2.2) * U,
                on = i < lit;
            pen.rect(
                g,
                x,
                y,
                2 * U,
                1.5 * U,
                "ruler",
                on ? pen.fill("glow") : pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                { strokeWidth: 1.6 },
            );
            a[`lamp(${i})`] = [x + U, y, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A wind turbine on a hill with a cable sagging across to a house with lamps in its windows${p.wind > 0 ? ", arrows for the wind blowing at its blades" : ", the air still"}.`,
    motion: { parts: { blades: { is: "spin", rev: 14, free: true } } },
    reads: true,
});
