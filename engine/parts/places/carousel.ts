import { part, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const within = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const carousel = defineDrawing({
    id: "carousel",
    family: "places",
    title: "Carousel",
    group: "Structures",
    about: "A fairground carousel: a striped round roof on a middle pole, horses on twisted poles going round, and a ring of bulbs under the roof's edge that can be lit. The horses can be counted, and so can the bulbs.",
    params: { horses: 4, lit: 0 },
    settings: { horses: { kind: "whole", min: 2, max: 5 }, lit: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Dark, four horses", params: { horses: 4, lit: 0 } },
        { label: "Lit, five horses", params: { horses: 5, lit: 1 } },
    ],
    box: () => ({ w: 11, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = within(p.horses, 2, 5),
            lit = p.lit > 0,
            W = 11 * U,
            cx = W / 2,
            eave = 3.6 * U,
            floor = 8.3 * U,
            base = 9.6 * U,
            a: RawAnchors = {};
        // the roof: a low cone in stripes, scalloped at the edge
        const stripes = 8;
        for (let i = 0; i < stripes; i++) {
            const x0 = 0.6 * U + (i / stripes) * (W - 1.2 * U),
                x1 = 0.6 * U + ((i + 1) / stripes) * (W - 1.2 * U);
            pen.polygon(
                g,
                [
                    [cx, 0.8 * U],
                    [x0, eave],
                    [x1, eave],
                ],
                "pencil",
                pen.fill(i % 2 ? "card" : "berry"),
                { strokeWidth: 1.2 },
            );
        }
        for (let x = 0.6 * U; x < W - 0.7 * U; x += (W - 1.2 * U) / 10)
            pen.path(
                g,
                `M${x} ${eave}Q${x + (W - 1.2 * U) / 20} ${eave + 0.6 * U} ${x + (W - 1.2 * U) / 10} ${eave}Z`,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1 },
            );
        pen.line(g, cx, 0.8 * U, cx, 0.2 * U, "pencil", { strokeWidth: 1.4 });
        pen.polygon(
            g,
            [
                [cx, 0.2 * U],
                [cx + 0.7 * U, 0.4 * U],
                [cx, 0.6 * U],
            ],
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1 },
        );
        // bulbs under the edge: pencil circles, or lit
        const bulbs = lit ? part(c, "lights", [cx, eave + 0.8 * U]).g : g;
        for (let i = 0; i <= 10; i++) {
            const x = 0.8 * U + (i / 10) * (W - 1.6 * U);
            pen.circle(
                bulbs,
                x,
                eave + 0.85 * U,
                0.34 * U,
                "pencil",
                lit ? pen.fill("glow") : pen.fill("card"),
                { strokeWidth: 0.9 },
            );
            if (lit)
                pen.circle(
                    bulbs,
                    x,
                    eave + 0.85 * U,
                    0.8 * U,
                    "pencil",
                    pen.fill("glow", "hachure", { hachureGap: 5, fillWeight: 0.5 }),
                    { stroke: "none", strokeWidth: 0 },
                );
        }
        pen.rect(g, cx - 0.22 * U, eave, 0.44 * U, floor - eave, "pencil", pen.fill("glow"), {
            strokeWidth: 1.2,
        });
        for (let i = 0; i < n; i++) {
            const x = 1.6 * U + (i / (n - 1)) * (W - 3.2 * U),
                y = (i % 2 ? 6.1 : 5.6) * U,
                sd = i < n / 2 ? 1 : -1;
            pen.line(g, x, eave + 1.1 * U, x, floor, "ruler", { strokeWidth: 2, stroke: c.t.glow });
            pen.line(g, x, eave + 1.1 * U, x, floor, "ruler", {
                strokeWidth: 0.8,
                strokeLineDash: [4, 4],
            });
            // a horse, galloping, on the pole
            const coat = pen.fill(i % 2 ? "card" : "sky");
            pen.ellipse(g, x, y, 1.6 * U, 0.75 * U, "pencil", coat, { strokeWidth: 1.4 });
            pen.polygon(
                g,
                [
                    [x + sd * 0.55 * U, y - 0.2 * U],
                    [x + sd * 0.95 * U, y - 1 * U],
                    [x + sd * 1.35 * U, y - 0.8 * U],
                    [x + sd * 0.9 * U, y + 0.05 * U],
                ],
                "pencil",
                coat,
                { strokeWidth: 1.3 },
            );
            pen.line(g, x + sd * 0.9 * U, y - 1 * U, x + sd * 0.55 * U, y - 0.6 * U, "pencil", {
                strokeWidth: 2.2,
                stroke: c.t.berry,
            });
            for (const lx of [-0.55, 0.45])
                pen.linear(
                    g,
                    [
                        [x + lx * U, y + 0.25 * U],
                        [x + (lx + sd * 0.2) * U, y + 0.75 * U],
                        [x + (lx + sd * 0.45) * U, y + 0.7 * U],
                    ],
                    "pencil",
                    { strokeWidth: 1.5 },
                );
            pen.curve(
                g,
                [
                    [x - sd * 0.75 * U, y - 0.1 * U],
                    [x - sd * 1.05 * U, y + 0.2 * U],
                    [x - sd * 1.05 * U, y + 0.6 * U],
                ],
                "pencil",
                { strokeWidth: 1.8 },
            );
            a[`horse(${i})`] = [x, y - 0.4 * U, "up"];
        }
        pen.polygon(
            g,
            [
                [0.5 * U, floor],
                [W - 0.5 * U, floor],
                [W - 0.9 * U, base],
                [0.9 * U, base],
            ],
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.6 },
        );
        pen.line(g, 0.1 * U, base, W - 0.1 * U, base, "pencil", { strokeWidth: 1.8 });
        a.top = [cx, 0.2 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A fairground carousel with a striped round roof on a middle pole, horses on twisted poles going round, and a ring of bulbs under the roof's edge, ${p.lit > 0 ? "all lit" : "unlit"}.`,
    motion: { parts: { lights: { is: "twinkle", dim: 0.3, amt: 0, period: 2.8 } } },
});
