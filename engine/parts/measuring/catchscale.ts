import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, wide } from "../lettering";

type Pt = [number, number];

/** One stroke to a line, corners kept, the roughness turned down: the shelf's calm level for things. */
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

/** A value as a scale writes it: whole numbers plainly, and a decimal without a trailing nought. */
const reading = (v: number): string =>
    Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : String(Math.round(v * 100) / 100);

/** Where a catch scale's pan is in its box, in squares, which a game lays its catch on. */
export const CATCH = { pan: 1.05, across: 6 } as const;

export const catchScale = defineDrawing({
    id: "catchscale",
    family: "measuring",
    title: "Catch scale",
    group: "Structures",
    about: "A quayside scale for weighing a catch: a wide pan on top, a round dial as big as a plate with a few large numbers round it, a needle, and a red mark on the rim at the weight a catch should come to. The whole dial is one turn of the most it weighs, so half a turn is half that.",
    params: { max: 12, step: 2, value: 0, unit: "", mark: -1 },
    settings: {
        max: { kind: "number", min: 1, max: 2000, step: 0.5 },
        step: { kind: "number", min: 0.1, max: 500, step: 0.1 },
        value: { kind: "number", min: 0, max: 2000, step: 0.1 },
        unit: { kind: "text", most: 3 },
        mark: { kind: "number", min: -1, max: 2000, step: 0.1 },
    },
    takes: [
        { label: "Seven, to make ten", params: { max: 12, step: 2, value: 7, unit: "", mark: 10 } },
        {
            label: "Grams, 650 of a kilogram",
            params: { max: 1200, step: 200, value: 650, unit: "g", mark: 1000 },
        },
        {
            label: "Kilograms, empty",
            params: { max: 3, step: 0.5, value: 0, unit: "kg", mark: 2.5 },
        },
    ],
    box: () => ({ w: CATCH.across, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            cx = 3 * U,
            cy = 4.4 * U,
            R = 2.55 * U,
            max = Number(p.max) > 0 ? Number(p.max) : 12,
            step = Number(p.step) > 0 ? Number(p.step) : max / 6;
        const turn = (v: number) => (v / max) * Math.PI * 2 - Math.PI / 2;
        const on = (v: number, r: number): Pt => [
            cx + Math.cos(turn(v)) * r,
            cy + Math.sin(turn(v)) * r,
        ];
        pen.rect(
            g,
            2.35 * U,
            6.6 * U,
            1.3 * U,
            1.1 * U,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
            calm(c, 1.4),
        );
        pen.rect(g, 1.2 * U, 7.55 * U, 3.6 * U, 0.4 * U, "ruler", pen.fill("tang"), calm(c, 1.4));
        pen.path(
            g,
            `M${0.3 * U} ${CATCH.pan * U - 4}Q${cx} ${CATCH.pan * U + 12} ${5.7 * U} ${CATCH.pan * U - 4}Z`,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 3.2 }),
            calm(c, 1.6),
        );
        pen.rect(
            g,
            cx - 5,
            CATCH.pan * U + 6,
            10,
            cy - R - CATCH.pan * U - 6,
            "ruler",
            pen.fill("card"),
            calm(c, 1.3),
        );
        pen.circle(
            g,
            cx,
            cy,
            (R + 7) * 2,
            "ruler",
            pen.fill("sky", "hachure", { hachureGap: 4, fillWeight: 0.8 }),
            calm(c, 2.2),
        );
        pen.circle(g, cx, cy, R * 2, "ruler", pen.fill("card"), calm(c, 1.6));
        const a: RawAnchors = { pan: [cx, CATCH.pan * U, "up"], centre: [cx, cy, "right"] };
        const mark = Number(p.mark);
        if (mark >= 0) {
            const [mx, my] = on(mark, R + 1),
                [lx, ly] = on(mark - max * 0.02, R + 8),
                [rx, ry] = on(mark + max * 0.02, R + 8);
            pen.polygon(
                g,
                [
                    [mx, my],
                    [lx, ly],
                    [rx, ry],
                ],
                "ruler",
                pen.fill("berry"),
                calm(c, 1.2),
            );
            a.mark = [mx, my, "up"];
        }
        for (let i = 0; i * (step / 2) < max - 1e-9; i++) {
            const v = i * (step / 2),
                major = i % 2 === 0,
                [ax, ay] = on(v, R - 2),
                [bx, by] = on(v, R - (major ? 11 : 6));
            pen.line(g, ax, ay, bx, by, "ruler", {
                strokeWidth: major ? 2 : 1.2,
                disableMultiStroke: true,
            });
            if (major) {
                const text = reading(v),
                    size = text.length > 3 ? 15 : 19,
                    [tx, ty] = on(v, R - 22 - (text.length > 2 ? 3 : 0));
                patch(c, tx, ty, wide(text, size) + 4, size + 2);
                num(c, tx, ty + size * 0.35, text, size);
            }
        }
        const v = Math.max(0, Math.min(max, Number(p.value) || 0)),
            [hx, hy] = on(v, R - 6),
            [tx2, ty2] = on(v, -9);
        pen.line(g, tx2, ty2, hx, hy, "ruler", {
            strokeWidth: 3.2,
            stroke: c.t.berry,
            disableMultiStroke: true,
        });
        pen.circle(g, cx, cy, 9, "ruler", pen.fill("card"), calm(c, 1.4));
        if (p.unit) num(c, cx, cy + 1.05 * U, String(p.unit), 14);
        a.needle = [hx, hy, "up"];
        return a;
    },
    describe: (p) =>
        `A quayside scale for weighing a catch, a wide pan on top, a round dial with large numbers round it, a red needle${Number(p.mark) >= 0 ? " and a red mark on its rim" : ""}.`,
});
