import { part, type Ctx, type RawAnchors } from "../../ink/surface";
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

/** A bed of weed growing up from the bottom of a pond or the sea, seen from the side under the water. */
export const pondweed = defineDrawing({
    id: "pondweed",
    family: "outdoors",
    title: "Pondweed",
    group: "Props",
    about: "A bed of weed growing up from the bottom of a pond, a lake or the sea, seen from the side under the water: long ribbon fronds with small leaves along them, swaying in the water. A fishing line reeled through it can snag. Its width in fronds and its height are settings.",
    params: { fronds: 5, tall: 5 },
    settings: {
        fronds: { kind: "whole", min: 2, max: 9 },
        tall: { kind: "whole", min: 2, max: 10 },
    },
    takes: [
        { label: "Five fronds, five squares tall", params: { fronds: 5, tall: 5 } },
        { label: "A low bed of three", params: { fronds: 3, tall: 3 } },
        { label: "A tall wide bed", params: { fronds: 8, tall: 9 } },
    ],
    box: (p) => ({
        w: Math.max(2, Math.ceil(whole(p.fronds, 2, 9, 5) * 0.6) + 1),
        h: whole(p.tall, 2, 10, 5),
    }),
    draw: (c, p): RawAnchors => {
        const n = whole(p.fronds, 2, 9, 5),
            h = whole(p.tall, 2, 10, 5) * U,
            w = Math.max(2, Math.ceil(n * 0.6) + 1) * U,
            foot = h - 0.15 * U;
        const fronds = part(c, "fronds", [w / 2, foot]);
        const { pen, g } = fronds;
        for (let i = 0; i < n; i++) {
            const x = 0.5 * U + ((i + 0.5) / n) * (w - U),
                tall = h * (0.55 + (((i * 5) % 7) / 7) * 0.4),
                bend = (i % 2 ? 1 : -1) * 0.35 * U;
            pen.path(
                g,
                `M${x} ${foot}C${x + bend} ${foot - tall * 0.35} ${x - bend} ${foot - tall * 0.7} ${x + bend * 0.5} ${foot - tall}`,
                "pencil",
                null,
                { strokeWidth: 2, stroke: c.paper ? c.t.ink : c.t.mint, disableMultiStroke: true },
            );
            for (let k = 1; k <= 3; k++) {
                const t = k / 4,
                    ly = foot - tall * t,
                    lx = x + bend * Math.sin(t * Math.PI * 1.4),
                    s = k % 2 ? 1 : -1;
                pen.ellipse(
                    g,
                    lx + s * 0.28 * U,
                    ly,
                    0.55 * U,
                    0.22 * U,
                    "ruler",
                    pen.fill("mint"),
                    calm(c, 1),
                );
            }
        }
        pen.ellipse(
            g,
            w / 2,
            foot,
            w - 0.4 * U,
            0.35 * U,
            "ruler",
            pen.fill("tang", "hachure"),
            calm(c, 1.2),
        );
        return { top: [w / 2, foot - h * 0.9, "up"], foot: [w / 2, foot, "down"] };
    },
    describe: () =>
        "A bed of green weed growing up from the bottom under the water, long wavy fronds with small leaves along them rising from a patch of mud.",
    motion: { parts: { fronds: { is: "sway", deg: 5, period: 4.2, bend: true } } },
});
