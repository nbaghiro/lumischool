import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || d)));

const wood = <G>(c: Ctx<G>) => c.pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.8 });

/** Where the rail's top and the grass line run down the railway's box, and how tall the box is, in squares; a game stands its wheels on the rail. */
export const RAILWAY = { rail: 0.5, grass: 2.1, h: 4 } as const;

export const railway = defineDrawing({
    id: "railway",
    family: "travel",
    title: "Railway",
    group: "Structures",
    about: "A length of railway seen from the side: a rail on sleepers over a bed of ballast, with a strip of grass in front of it. It can leave a gap, for a pit or a bridge, where the rail, the sleepers and the ballast stop and start again while the grass runs on.",
    params: { length: 24, gap: 0, at: 0 },
    settings: {
        length: { kind: "whole", min: 4, max: 36 },
        gap: { kind: "whole", min: 0, max: 30 },
        at: { kind: "whole", min: 0, max: 36 },
    },
    takes: [
        { label: "Twenty-four squares of line", params: { length: 24, gap: 0, at: 0 } },
        { label: "With a gap for a pit", params: { length: 30, gap: 11, at: 10 } },
    ],
    box: (p) => ({ w: whole(p.length, 4, 120, 24), h: RAILWAY.h }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = whole(p.length, 4, 120, 24) * U,
            rail = RAILWAY.rail * U,
            grass = RAILWAY.grass * U;
        const gap = Math.max(0, Number(p.gap) || 0) * U,
            at = Math.max(0, Math.min(w, Number(p.at) || 0)) * U;
        const cut: [number, number] | null = gap > 0 ? [at, Math.min(w, at + gap)] : null;
        const spans: [number, number][] = cut
            ? [
                  [0, cut[0]],
                  [cut[1], w],
              ]
            : [[0, w]];
        const runs = spans.filter(([a, b]) => b - a > U);
        pen.rect(
            g,
            0,
            grass,
            w,
            RAILWAY.h * U - grass,
            "pencil",
            pen.fill("mint", "hachure", { hachureGap: 10, fillWeight: 0.8 }),
            { stroke: "none" },
        );
        pen.line(g, 0, grass, w, grass, "ruler", { strokeWidth: 2.2, disableMultiStroke: true });
        for (let x = 0.7 * U; x < w - 10; x += 2.3 * U) {
            pen.line(g, x, grass, x - 3, grass - 7, "pencil", { strokeWidth: 1.2 });
            pen.line(g, x + 4, grass, x + 6, grass - 8, "pencil", { strokeWidth: 1.2 });
        }
        for (const [a, b] of runs) {
            const top = 0.95 * U,
                foot = 2 * U;
            pen.path(
                g,
                `M${a} ${top}L${b} ${top}L${b} ${foot - 3}Q${(a + 3 * b) / 4} ${foot + 3} ${(a + b) / 2} ${foot - 2}T${a} ${foot - 3}Z`,
                "pencil",
                pen.fill("ink-soft", "hachure", {
                    hachureGap: 6,
                    hachureAngle: 62,
                    fillWeight: 0.6,
                }),
                { stroke: "none" },
            );
            for (let x = a + 0.55 * U; x < b - 0.35 * U; x += U) {
                pen.rect(
                    g,
                    x - 0.3 * U,
                    rail + 0.12 * U,
                    0.6 * U,
                    0.42 * U,
                    "ruler",
                    wood(c),
                    calm(c, 1.1),
                );
            }
            pen.line(g, a, rail + 0.14 * U, b, rail + 0.14 * U, "ruler", {
                strokeWidth: 1.1,
                stroke: c.t["ink-soft"],
                disableMultiStroke: true,
            });
            pen.line(g, a, rail, b, rail, "ruler", { strokeWidth: 2.8, disableMultiStroke: true });
        }
        return {
            left: [0, rail, "left"],
            right: [w, rail, "right"],
            gap: [cut ? (cut[0] + cut[1]) / 2 : w / 2, rail, "down"],
            grass: [w / 2, grass, "down"],
        };
    },
    describe: (p) =>
        `A length of railway seen from the side, a rail on wooden sleepers over grey ballast with a strip of green grass in front${Number(p.gap) > 0 ? ", with a gap in the line" : ""}.`,
    motion: {
        still: "A railway is the ground the trains run on; if it moved, every carriage on it would seem to move.",
    },
});
