import { part, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const cottage = defineDrawing({
    id: "cottage",
    family: "places",
    title: "Cottage",
    group: "Structures",
    about: "A cottage with a thatched roof, a chimney, a door and windows that can be lit. Lit, the windows are yellow and a curl of smoke goes up from the chimney: somebody is home.",
    params: { windows: 2, lit: 1 },
    settings: {
        windows: { kind: "whole", min: 1, max: 3 },
        lit: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Lit, two windows", params: { windows: 2, lit: 1 } },
        { label: "Dark, three windows", params: { windows: 3, lit: 0 } },
    ],
    box: () => ({ w: 9, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(1, Math.min(3, Math.round(p.windows))),
            lit = p.lit > 0,
            base = 7.6 * U,
            eave = 3.8 * U,
            a: RawAnchors = {};
        pen.rect(g, 1.2 * U, eave, 6.6 * U, base - eave, "pencil", pen.fill("card"), {
            strokeWidth: 2,
        });
        pen.rect(g, 6 * U, 1.3 * U, 0.8 * U, 1.8 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.5,
        });
        if (lit)
            for (const [dx, dy, d] of [
                [0.2, -0.4, 0.7],
                [0.6, -1, 0.55],
            ] as const)
                pen.ellipse(
                    part(c, "smoke", [(6.4 + dx) * U, (1.3 + dy) * U]).g,
                    (6.4 + dx) * U,
                    (1.3 + dy) * U,
                    d * U * 1.2,
                    d * U,
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.1 },
                );
        pen.polygon(
            g,
            [
                [0.5 * U, eave + 0.2 * U],
                [2.6 * U, 1.2 * U],
                [6.4 * U, 1.2 * U],
                [8.5 * U, eave + 0.2 * U],
            ],
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 4.5 }),
            { strokeWidth: 2 },
        );
        pen.path(
            g,
            `M${4.1 * U} ${base}L${4.1 * U} ${base - 1.9 * U}Q${4.6 * U} ${base - 2.5 * U} ${5.1 * U} ${base - 1.9 * U}L${5.1 * U} ${base}Z`,
            "pencil",
            pen.fill("berry"),
            { strokeWidth: 1.5 },
        );
        const xs = n === 1 ? [2.4] : n === 2 ? [2.1, 6.5] : [1.9, 3.1, 6.5];
        xs.forEach((x, i) => {
            pen.rect(
                lit ? part(c, "window", [x * U, eave + 1.4 * U]).g : g,
                (x - 0.5) * U,
                eave + 0.9 * U,
                1 * U,
                1 * U,
                "ruler",
                lit ? pen.fill("glow") : pen.fill("sky", "hachure", { hachureGap: 3 }),
                { strokeWidth: 1.4 },
            );
            pen.line(g, x * U, eave + 0.9 * U, x * U, eave + 1.9 * U, "ruler", {
                strokeWidth: 0.9,
            });
            a[`window(${i})`] = [x * U, eave + 0.9 * U, "up"];
        });
        pen.line(g, 0.2 * U, base, 8.8 * U, base, "pencil", { strokeWidth: 2 });
        a.door = [4.6 * U, base - 2.2 * U, "up"];
        a.chimney = [6.4 * U, 1.3 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A cottage with a thatched roof, a chimney, a red door and windows, ${p.lit > 0 ? "the windows lit yellow and smoke curling from the chimney" : "the windows dark"}.`,
    motion: {
        parts: {
            smoke: { is: "flow", lift: 8, dx: 3, period: 3.2, wave: 0.5 },
            window: { is: "twinkle", dim: 0.2, amt: 0, period: 3.1 },
        },
    },
});
