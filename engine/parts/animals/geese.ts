import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { blade, along, clamp } from "./nature";

export const geese = defineDrawing({
    id: "geese",
    family: "animals",
    title: "Geese in a V",
    group: "Characters",
    about: "Geese flying in a V, one at the front and the rest in two lines behind it, the way geese fly a long way together. How many on each side, and is there one over at the front: an odd number drawn as a shape.",
    params: { count: 7 },
    settings: { count: { kind: "whole", min: 1, max: 9 } },
    takes: [
        { label: "Seven", params: { count: 7 } },
        { label: "Four", params: { count: 4 } },
        { label: "Nine", params: { count: 9 } },
    ],
    box: () => ({ w: 14, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.count, 1, 9),
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const rank = Math.ceil(i / 2),
                side = i === 0 ? 0 : i % 2 ? -1 : 1,
                x = (11.9 - rank * 2.25) * U,
                y = (4.6 + side * rank * 0.95) * U,
                up = rank % 2 === 0;
            // the far wing, the body and long dark neck, then the near wing, lifted or pressed down
            pen.polygon(
                g,
                blade(x + 0.1 * U, y - 0.1 * U, 1.5 * U, 0.42 * U, up ? -2.05 : 2.55),
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
                { strokeWidth: 1 },
            );
            pen.ellipse(g, x - 0.15 * U, y, 1.6 * U, 0.58 * U, "pencil", pen.fill("card"), {
                strokeWidth: 1.3,
            });
            pen.polygon(
                g,
                [
                    [x - 0.95 * U, y - 0.05 * U],
                    [x - 1.35 * U, y - 0.22 * U],
                    [x - 1.35 * U, y + 0.12 * U],
                ],
                "pencil",
                pen.fill("ink-soft"),
                { strokeWidth: 0.9 },
            );
            pen.line(g, x + 0.5 * U, y - 0.06 * U, x + 1.15 * U, y - 0.16 * U, "pencil", {
                strokeWidth: 3.6,
                stroke: c.t.ink,
            });
            pen.ellipse(
                g,
                x + 1.25 * U,
                y - 0.18 * U,
                0.44 * U,
                0.3 * U,
                "pencil",
                pen.fill("ink-soft"),
                { strokeWidth: 1 },
            );
            pen.line(g, x + 1.15 * U, y - 0.1 * U, x + 1.3 * U, y - 0.08 * U, "pencil", {
                strokeWidth: 1.6,
                stroke: c.t.card,
            });
            pen.polygon(
                g,
                [
                    [x + 1.44 * U, y - 0.24 * U],
                    [x + 1.74 * U, y - 0.16 * U],
                    [x + 1.44 * U, y - 0.1 * U],
                ],
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 0.8 },
            );
            pen.polygon(
                g,
                blade(x - 0.05 * U, y - 0.05 * U, 1.9 * U, 0.52 * U, up ? -2.2 : 2.7),
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.2 },
            );
            const [tx, ty] = along(x - 0.05 * U, y - 0.05 * U, 1.45 * U, up ? -2.2 : 2.7);
            pen.line(
                g,
                ...along(tx, ty, -2, up ? -2.2 : 2.7),
                ...along(tx, ty, 0.45 * U, up ? -2.2 : 2.7),
                "pencil",
                { strokeWidth: 3, stroke: c.t["ink-soft"] },
            );
            a[`goose(${i})`] = [x, y - 0.5 * U, "up"];
        }
        return a;
    },
    describe: (p) => {
        const n = clamp(p.count, 1, 9);
        return n === 1
            ? "A goose flying with a long dark neck, a white body, grey wings spread and an orange beak, seen from the side."
            : `${n === 2 ? "Two geese flying one behind the other" : "Geese flying in a V, one at the front and the rest in two lines behind"}, each with a long dark neck, a white body and grey wings.`;
    },
});
