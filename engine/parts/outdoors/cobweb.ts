import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, along, clamp } from "../animals/nature";

export const cobweb = defineDrawing({
    id: "cobweb",
    family: "outdoors",
    title: "Spider's web",
    group: "Props",
    about: "A spider's web in the morning, strung between grass stems with drops of dew along the threads and the spider waiting in the middle. The spokes go out from the middle like a wheel's, and the spiral goes round and round across them.",
    params: { spokes: 8, spider: 1 },
    settings: {
        spokes: { kind: "whole", min: 5, max: 14 },
        spider: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Eight spokes and the spider", params: { spokes: 8, spider: 1 } },
        { label: "Twelve spokes, empty", params: { spokes: 12, spider: 0 } },
    ],
    box: () => ({ w: 11, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.spokes, 5, 14),
            cx = 5.5 * U,
            cy = 5.3 * U,
            thread = { strokeWidth: 0.9, stroke: c.t["ink-soft"] },
            a: RawAnchors = {};
        const R = (i: number) => (4.3 + ((i * 7) % 5) * 0.14) * U,
            ang = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2 + (i % 2 ? 0.05 : -0.03);
        const ends: Pt[] = [];
        for (let i = 0; i < n; i++) {
            const e = along(cx, cy, R(i), ang(i));
            ends.push(e);
            pen.line(g, cx, cy, e[0], e[1], "ruler", thread);
        }
        pen.polygon(g, ends, "pencil", null, thread);
        for (const [x, y] of [
            [0.3, 0.2],
            [10.8, 0.4],
            [10.7, 10.8],
            [0.2, 10.6],
        ] as const) {
            const e = ends.reduce(
                (best, q) =>
                    Math.hypot(q[0] - x * U, q[1] - y * U) <
                    Math.hypot(best[0] - x * U, best[1] - y * U)
                        ? q
                        : best,
                ends[0] ?? [cx, cy],
            );
            pen.line(g, e[0], e[1], x * U, y * U, "pencil", thread);
        }
        for (let r = 0.8 * U, k = 0; r < 4 * U; r += 0.44 * U, k++) {
            const ring2: Pt[] = [];
            for (let i = 0; i <= n; i++)
                ring2.push(
                    along(cx, cy, Math.min(r * (R(i % n) / (4.3 * U)), R(i % n) - 4), ang(i % n)),
                );
            pen.linear(g, ring2, "ruler", thread);
            if (k % 2)
                for (let i = k % 3; i < n; i += 2) {
                    const [x, y] = along(
                        cx,
                        cy,
                        r * (R(i) / (4.3 * U)) * 0.98,
                        ang(i) + Math.PI / n,
                    );
                    pen.circle(g, x, y, 5.5, "ruler", pen.fill("card"), {
                        strokeWidth: 0.8,
                        stroke: c.t.sky,
                    });
                    pen.circle(g, x - 1, y - 1, 1.6, "ruler", pen.fill("sky"), { strokeWidth: 0 });
                }
        }
        if (p.spider > 0) {
            for (const s of [-1, 1])
                for (let l = 0; l < 4; l++) {
                    const a0 = -0.9 + l * 0.55;
                    pen.linear(
                        g,
                        [
                            [cx + s * 4, cy - 2],
                            [
                                cx + s * (0.55 * U + l * 1),
                                cy - 0.45 * U + l * 0.3 * U + (a0 < 0 ? -6 : 0),
                            ],
                            [cx + s * (0.95 * U - l * 1.5), cy - 0.2 * U + l * 0.45 * U],
                        ],
                        "pencil",
                        { strokeWidth: 1.1 },
                    );
                }
            pen.circle(g, cx, cy - 0.35 * U, 0.55 * U, "pencil", pen.fill("tang"), {
                strokeWidth: 1.2,
            });
            pen.ellipse(
                g,
                cx,
                cy + 0.35 * U,
                0.85 * U,
                1 * U,
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 3 }),
                { strokeWidth: 1.3 },
            );
            a.spider = [cx, cy - 0.8 * U, "up"];
        }
        a.middle = [cx, cy, "up"];
        return a;
    },
    describe: (p) =>
        `A spider's web strung between grass stems, spokes going out from the middle and a spiral round across them beaded with dew${p.spider > 0 ? ", and an orange spider waiting in the middle" : ""}.`,
});
