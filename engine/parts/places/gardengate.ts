import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const within = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const gardenGate = defineDrawing({
    id: "gardengate",
    family: "places",
    title: "Garden gate",
    group: "Structures",
    about: "A wooden garden gate between two posts in a picket fence, with a latch and its bars evenly spaced. Shut, it is a row of bars to count; open, it swings in and the path runs on through it into the field beyond.",
    params: { bars: 5, open: 0 },
    settings: { bars: { kind: "whole", min: 3, max: 7 }, open: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Shut, five bars", params: { bars: 5, open: 0 } },
        { label: "Open onto the field", params: { bars: 5, open: 1 } },
        { label: "Shut, three bars", params: { bars: 3, open: 0 } },
    ],
    box: () => ({ w: 10, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = within(p.bars, 3, 7),
            open = p.open > 0,
            W = 10 * U,
            base = 5.6 * U,
            top = 1.6 * U,
            a: RawAnchors = {};
        const gx0 = 3.1 * U,
            gx1 = 6.9 * U,
            wood = pen.fill("card"),
            post = pen.fill("tang"),
            paint = pen.fill("mint");
        // the fence either side, its pickets pointed, not part of the count
        for (const [x0, x1] of [
            [0.2 * U, gx0 - 0.5 * U],
            [gx1 + 0.5 * U, W - 0.2 * U],
        ] as const) {
            for (const y of [top + 1.1 * U, base - 1 * U])
                pen.line(g, x0, y, x1, y, "pencil", { strokeWidth: 1.4 });
            for (let x = x0 + 0.25 * U; x < x1 - 0.2 * U; x += 0.62 * U) {
                pen.polygon(
                    g,
                    [
                        [x - 0.2 * U, base - 0.1 * U],
                        [x - 0.2 * U, top + 0.55 * U],
                        [x, top + 0.2 * U],
                        [x + 0.2 * U, top + 0.55 * U],
                        [x + 0.2 * U, base - 0.1 * U],
                    ],
                    "pencil",
                    wood,
                    { strokeWidth: 1, stroke: c.t["ink-soft"] },
                );
            }
        }
        for (const x of [gx0 - 0.32 * U, gx1 + 0.32 * U]) {
            pen.rect(
                g,
                x - 0.28 * U,
                top - 0.3 * U,
                0.56 * U,
                base - top + 0.25 * U,
                "pencil",
                post,
                { strokeWidth: 1.5 },
            );
            pen.circle(g, x, top - 0.36 * U, 0.6 * U, "pencil", post, { strokeWidth: 1.2 });
        }
        if (open) {
            // through the gap: the path going on into long grass and a flower
            pen.polygon(
                g,
                [
                    [gx0 + 0.3 * U, base],
                    [W / 2 - 0.25 * U, top + 1.5 * U],
                    [W / 2 + 0.25 * U, top + 1.5 * U],
                    [gx1 - 0.3 * U, base],
                ],
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 6 }),
                { strokeWidth: 1.2 },
            );
            pen.line(g, gx0, top + 1.5 * U, gx1, top + 1.5 * U, "pencil", {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
            });
            for (const x of [gx0 + 0.5 * U, gx1 - 0.6 * U])
                for (const d of [-6, 0, 6])
                    pen.line(g, x + d, top + 1.6 * U, x + d * 1.6, top + 0.9 * U, "pencil", {
                        strokeWidth: 1.2,
                        stroke: c.t.ok,
                    });
            pen.circle(g, gx1 - 0.6 * U, top + 0.75 * U, 0.4 * U, "pencil", pen.fill("berry"), {
                strokeWidth: 1,
            });
            // the gate itself, swung in on its hinges at the left post, seen edge on and narrow
            const x0 = gx0,
                x1 = gx0 + 1.1 * U;
            pen.polygon(
                g,
                [
                    [x0, top + 0.1 * U],
                    [x1, top + 0.5 * U],
                    [x1, base - 0.1 * U],
                    [x0, base - 0.4 * U],
                ],
                "pencil",
                null,
                { strokeWidth: 1.4 },
            );
            for (let i = 0; i < n; i++) {
                const u = (i + 0.5) / n,
                    x = x0 + u * (x1 - x0);
                pen.line(
                    g,
                    x,
                    top + 0.1 * U + u * 0.4 * U,
                    x,
                    base - 0.4 * U + u * 0.3 * U,
                    "pencil",
                    { strokeWidth: 3, stroke: c.t.mint },
                );
            }
            a.gate = [x1, top + 0.5 * U, "up"];
        } else {
            for (let i = 0; i < n; i++) {
                const x = gx0 + ((i + 0.5) / n) * (gx1 - gx0);
                pen.rect(
                    g,
                    x - 0.2 * U,
                    top - 0.1 * U,
                    0.4 * U,
                    base - top - 0.05 * U,
                    "ruler",
                    paint,
                    { strokeWidth: 1.5 },
                );
                a[`bar(${i})`] = [x, top - 0.1 * U, "up"];
            }
            pen.rect(g, gx0, top + 0.35 * U, gx1 - gx0, 0.42 * U, "pencil", paint, {
                strokeWidth: 1.6,
            });
            pen.rect(g, gx0, base - 1.1 * U, gx1 - gx0, 0.42 * U, "pencil", paint, {
                strokeWidth: 1.6,
            });
            pen.line(g, gx0 + 0.2 * U, base - 0.9 * U, gx1 - 0.2 * U, top + 0.6 * U, "pencil", {
                strokeWidth: 3,
                stroke: c.t.tang,
            });
            pen.circle(g, gx1 - 0.25 * U, top + 1.4 * U, 0.34 * U, "pencil", pen.fill("glow"), {
                strokeWidth: 1,
            });
            a.gate = [W / 2, top, "up"];
        }
        a.latch = [gx1 - 0.25 * U, top + 1.4 * U, "right"];
        pen.line(g, 0.1 * U, base, W - 0.1 * U, base, "pencil", { strokeWidth: 2 });
        return a;
    },
    describe: (p) =>
        `A wooden garden gate between two posts in a picket fence, ${p.open > 0 ? "swung open onto a path into the field beyond" : "shut, with its bars evenly spaced and a latch"}.`,
});
