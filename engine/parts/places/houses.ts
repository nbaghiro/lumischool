import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

const turn = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const houses = defineDrawing({
    id: "houses",
    family: "places",
    title: "A street of houses",
    group: "Props",
    about: "Houses side by side along a street, each with a front door, a chimney and the same number of windows upstairs, so the street is an array: three houses of two windows is six windows.",
    params: { count: 3, windows: 2 },
    settings: {
        count: { kind: "whole", min: 1, max: 6 },
        windows: { kind: "whole", min: 1, max: 3 },
    },
    takes: [
        { label: "Three houses, two windows", params: { count: 3, windows: 2 } },
        { label: "Five houses, three windows", params: { count: 5, windows: 3 } },
    ],
    box: (p) => ({ w: turn(p.count, 1, 6) * 5 + 1, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = turn(p.count, 1, 6),
            per = turn(p.windows, 1, 3),
            base = 9.5 * U,
            a: RawAnchors = {};
        const walls: Marker[] = ["glow", "sky", "mint", "berry", "tang"];
        for (let i = 0; i < n; i++) {
            const x = (0.5 + i * 5) * U,
                w = 5 * U,
                top = base - (i % 2 ? 5.6 : 6.2) * U;
            pen.rect(g, x + w * 0.66, top - 2.9 * U, 0.8 * U, 1.6 * U, "pencil", pen.fill("tang"), {
                strokeWidth: 1.4,
            });
            pen.polygon(
                g,
                [
                    [x - 4, top],
                    [x + w / 2, top - 2.4 * U],
                    [x + w + 4, top],
                ],
                "pencil",
                pen.fill(i % 2 ? "tang" : "berry", "hachure", { hachureGap: 5 }),
                { strokeWidth: 1.9 },
            );
            pen.rect(
                g,
                x,
                top,
                w,
                base - top,
                "pencil",
                pen.fill(walls[i % walls.length], "solid"),
                { strokeWidth: 1.9 },
            );
            for (let k = 0; k < per; k++) {
                const wx = x + (w / (per + 1)) * (k + 1) - 0.6 * U;
                pen.rect(g, wx, top + 0.7 * U, 1.2 * U, 1.3 * U, "ruler", pen.fill("card"), {
                    strokeWidth: 1.4,
                });
                pen.line(g, wx + 0.6 * U, top + 0.7 * U, wx + 0.6 * U, top + 2 * U, "ruler", {
                    strokeWidth: 0.9,
                });
            }
            pen.rect(g, x + 0.8 * U, base - 2.8 * U, 1.3 * U, 2.8 * U, "pencil", pen.fill("card"), {
                strokeWidth: 1.5,
            });
            pen.circle(
                g,
                x + 1.8 * U,
                base - 1.4 * U,
                3,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.5 },
            );
            pen.rect(g, x + 2.8 * U, base - 2.6 * U, 1.4 * U, 1.3 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.4,
            });
            a[`house(${i})`] = [x + w / 2, top - 2.4 * U, "up"];
            a[`door(${i})`] = [x + 1.45 * U, base - 2.8 * U, "up"];
        }
        pen.line(g, 0.2 * U, base, (n * 5 + 0.8) * U, base, "pencil", { strokeWidth: 2.2 });
        return a;
    },
    describe: (p) =>
        turn(p.count, 1, 6) > 1
            ? "Houses side by side along a street, each with a pointed roof, a chimney, a front door and the same windows upstairs."
            : "A house on a street with a pointed roof, a chimney, a front door and windows upstairs.",
});
