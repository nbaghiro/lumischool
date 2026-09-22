import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { soft } from "../lettering";
import { type Pt, blade, clamp } from "../animals/nature";

export const strata = defineDrawing({
    id: "strata",
    family: "outdoors",
    title: "Layers of rock",
    group: "Structures",
    about: "A cliff cut through to show its layers, the oldest at the bottom and the youngest at the top, each a different rock with different things in it: shells, a fish, a leaf, an ammonite. Reading down the layers is reading back in time, which makes it a timeline to put fossils on.",
    params: { layers: 5, names: 1 },
    settings: {
        layers: { kind: "whole", min: 3, max: 7 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Five layers, named", params: { layers: 5, names: 1 } },
        { label: "Seven layers", params: { layers: 7, names: 0 } },
        { label: "Three layers", params: { layers: 3, names: 1 } },
    ],
    box: () => ({ w: 14, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.layers, 3, 7),
            x0 = 0.5 * U,
            x1 = 9.6 * U,
            top = 1.8 * U,
            bot = 11.5 * U,
            a: RawAnchors = {};
        const TH = [1, 1.4, 0.8, 1.2, 1.6, 0.9, 1.3].slice(0, n),
            sum = TH.reduce((s, v) => s + v, 0);
        const KINDS = [
            pen.fill("glow", "dots", { hachureGap: 6 }),
            pen.fill("sky", "hachure", { hachureGap: 5, hachureAngle: 0 }),
            pen.fill("tang", "cross-hatch", { hachureGap: 7 }),
            pen.fill("ink-soft", "hachure", { hachureGap: 3.5, hachureAngle: 0, fillWeight: 0.6 }),
            pen.fill("card"),
            pen.fill("tang", "hachure", { hachureGap: 4 }),
            pen.fill("berry", "hachure", { hachureGap: 5 }),
        ];
        const edge = (y: number, k: number): Pt[] => [
            [x0, y],
            [x0 + 2.4 * U, y + (k % 2 ? 4 : -3)],
            [x0 + 5.3 * U, y + (k % 3 ? -4 : 3)],
            [x0 + 7.6 * U, y + 2],
            [x1, y - 2],
        ];
        let y = top;
        for (let k = 0; k < n; k++) {
            const h = ((bot - top) * (TH[k] ?? 0)) / sum,
                up = edge(y, k),
                down = edge(y + h, k + 1);
            pen.polygon(g, [...up, ...down.reverse()], "pencil", KINDS[k], { strokeWidth: 1.4 });
            const fx = (k % 2 ? 6.8 : 3.2) * U,
                fy = y + h / 2;
            if (k % 4 === 1) {
                // an ammonite
                const ln: Pt[] = [];
                for (let th = 0; th < Math.PI * 5; th += 0.3) {
                    const r = 1.3 * Math.exp(0.18 * th);
                    ln.push([fx + r * Math.cos(th), fy + r * Math.sin(th)]);
                }
                pen.curve(g, ln, "pencil", { strokeWidth: 1.2 });
            } else if (k % 4 === 2) {
                // a shell
                pen.path(
                    g,
                    `M${fx - 0.5 * U} ${fy + 0.3 * U}Q${fx} ${fy - 0.6 * U} ${fx + 0.5 * U} ${fy + 0.3 * U}Z`,
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.1 },
                );
                for (const d of [-0.25, 0, 0.25])
                    pen.line(g, fx, fy + 0.3 * U, fx + d * U, fy - 0.15 * U, "pencil", {
                        strokeWidth: 0.8,
                    });
            } else if (k % 4 === 3) {
                // a little fish, bones and all
                pen.line(g, fx - 0.7 * U, fy, fx + 0.5 * U, fy, "pencil", { strokeWidth: 1.2 });
                for (let q = 0; q < 4; q++)
                    pen.line(
                        g,
                        fx - 0.4 * U + q * 0.22 * U,
                        fy - 0.22 * U,
                        fx - 0.4 * U + q * 0.22 * U,
                        fy + 0.22 * U,
                        "pencil",
                        { strokeWidth: 0.9 },
                    );
                pen.circle(g, fx + 0.62 * U, fy, 0.3 * U, "pencil", null, { strokeWidth: 1 });
                pen.polygon(
                    g,
                    [
                        [fx - 0.7 * U, fy],
                        [fx - 1 * U, fy - 0.25 * U],
                        [fx - 1 * U, fy + 0.25 * U],
                    ],
                    "pencil",
                    null,
                    { strokeWidth: 1 },
                );
            } else if (k > 0) {
                // a leaf
                pen.polygon(
                    g,
                    blade(fx - 0.6 * U, fy + 0.1 * U, 1.3 * U, 0.55 * U, -0.2),
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1 },
                );
            }
            a[`layer(${k})`] = [x1, y + h / 2, "right"];
            y += h;
        }
        // soil and grass on top
        pen.polygon(
            g,
            [[x0, top - 0.5 * U], [x1, top - 0.6 * U], ...edge(top, 0).reverse()],
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.4 },
        );
        for (let x = x0 + 4; x < x1; x += 0.55 * U)
            pen.line(g, x, top - 0.5 * U, x + 2, top - 0.95 * U, "pencil", {
                strokeWidth: 1.1,
                stroke: c.t.ok,
            });
        if (p.names > 0) {
            soft(c, x1 + 0.4 * U, top + 0.55 * U, "youngest", 13, "start");
            soft(c, x1 + 0.4 * U, bot - 0.2 * U, "oldest", 13, "start");
            c.pen.arrow(
                g,
                [x1 + 1.6 * U, top + 1.4 * U],
                [x1 + 1.6 * U, bot - 1.2 * U],
                c.t["ink-soft"],
                0.02,
            );
        }
        return a;
    },
    describe: (p) =>
        `A cliff cut through to show its layers of rock, each a different kind, grass on top, a fossil in some${p.names > 0 ? " and an arrow beside it from youngest to oldest" : " of the layers"}.`,
});
