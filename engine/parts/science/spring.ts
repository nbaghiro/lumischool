import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, soft } from "../lettering";

/** Each newton hung past the spring's limit stretches it half as much again as one inside it did. */
const PAST = 1.5;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/**
 * How far the spring has stretched, in centimetres, with `load` newtons on it: `per` centimetres for
 * each newton up to its `limit`, in step with the load (Hooke's law), and more for each newton past it,
 * where it no longer springs back. The past-the-limit part is how the drawing shows it, not a law.
 */
export function springStretch(load: number, per: number, limit: number): number {
    const w = clamp(Math.round(load), 0, 10),
        k = clamp(per, 0.5, 2),
        l = clamp(Math.round(limit), 4, 10);
    return w <= l ? k * w : k * l + PAST * k * (w - l);
}

/** Whether the load is inside the spring's limit, where the stretch is in step with it. */
export const inStep = (load: number, limit: number): boolean =>
    Math.round(load) <= clamp(Math.round(limit), 4, 10);

const TOP = 1.8 * U,
    SPRING_X = 4 * U,
    RULER_X = 6.4 * U;

export const spring = defineDrawing({
    id: "spring",
    family: "science",
    title: "A spring and its load",
    group: "Structures",
    about: "A coiled spring hanging from a hook on a stand, drawn one centimetre to a square, with `load` slotted masses of 1 N each on a hanger at its foot and a pointer to a centimetre ruler. Unloaded it is `natural` centimetres long, and each newton stretches it by `per` centimetres, in step with the load, up to its `limit`; past the limit each newton stretches it half as much again, and it no longer springs back, which the drawing shows but a question should not ask to be read. With `from` 0 the ruler's zero is at the unloaded foot, so it reads the stretch; with `from` 1 its zero is at the hook, so it reads the whole length. With `tell` 1 the limit is written under the stand.",
    params: { load: 3, per: 2, limit: 8, natural: 6, from: 0, tell: 0 },
    settings: {
        load: { kind: "whole", min: 0, max: 10 },
        per: { kind: "number", min: 0.5, max: 2, step: 0.5 },
        limit: { kind: "whole", min: 4, max: 10 },
        natural: { kind: "whole", min: 4, max: 8 },
        from: { kind: "whole", min: 0, max: 1 },
        tell: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Three newtons, reading the stretch",
            params: { load: 3, per: 2, limit: 8, natural: 6, from: 0, tell: 0 },
        },
        {
            label: "No load, reading the length",
            params: { load: 0, per: 1, limit: 6, natural: 5, from: 1, tell: 0 },
        },
        {
            label: "Six newtons, a stiffer spring",
            params: { load: 6, per: 0.5, limit: 8, natural: 4, from: 1, tell: 1 },
        },
        {
            label: "Past its limit",
            params: { load: 7, per: 1.5, limit: 4, natural: 5, from: 0, tell: 1 },
        },
    ],
    box: (p) => {
        const length = clamp(Math.round(p.natural), 4, 8) + springStretch(p.load, p.per, p.limit);
        const masses = clamp(Math.round(p.load), 0, 10);
        return { w: 11, h: Math.ceil(TOP / U + length + 1.2 + masses * 0.45 + 3) };
    },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            natural = clamp(Math.round(p.natural), 4, 8),
            load = clamp(Math.round(p.load), 0, 10),
            stretch = springStretch(p.load, p.per, p.limit),
            foot = TOP + (natural + stretch) * U,
            floor = foot + 1.2 * U + load * 0.45 * U + 1.4 * U;
        // the stand: a heavy base, an upright and an arm, with the hook the spring hangs from
        pen.rect(g, 0.3 * U, floor, 3.4 * U, 0.5 * U, "ruler", pen.fill("ink-soft"), {
            strokeWidth: 1.6,
        });
        pen.line(g, 1 * U, floor, 1 * U, 0.8 * U, "ruler", { strokeWidth: 2.6 });
        pen.line(g, 1 * U, 0.8 * U, SPRING_X + 0.6 * U, 0.8 * U, "ruler", { strokeWidth: 2.6 });
        pen.path(
            g,
            `M${SPRING_X} ${0.8 * U}L${SPRING_X} ${1.3 * U}a${0.25 * U} ${0.25 * U} 0 1 1 ${0.3 * U} ${0.3 * U}`,
            "ruler",
            null,
            { strokeWidth: 1.6 },
        );
        a.hook = [SPRING_X, 0.8 * U, "up"];
        // the coil: the same number of turns whatever its length, so a stretched spring opens out
        const turns = 12,
            half = 0.6 * U,
            top = TOP + 0.4 * U,
            bottom = foot - 0.4 * U,
            step = (bottom - top) / turns;
        const pts: [number, number][] = [
            [SPRING_X, TOP],
            [SPRING_X, top],
        ];
        for (let i = 0; i < turns; i++) {
            pts.push([SPRING_X - half, top + (i + 0.25) * step]);
            pts.push([SPRING_X + half, top + (i + 0.75) * step]);
        }
        pts.push([SPRING_X, bottom], [SPRING_X, foot]);
        pen.linear(g, pts, "ruler", { strokeWidth: 1.7 });
        // the pointer at the foot, reaching to the ruler's edge
        pen.line(g, SPRING_X, foot, RULER_X, foot, "ruler", {
            strokeWidth: 1.8,
            stroke: c.t.berry,
        });
        pen.circle(g, SPRING_X, foot, 6, "ruler", pen.fill("berry"), { strokeWidth: 1 });
        a.pointer = [RULER_X, foot, "right"];
        // the hanger and its slotted masses, one newton each
        const stem = foot + 1.2 * U;
        pen.line(g, SPRING_X, foot, SPRING_X, stem, "ruler", { strokeWidth: 1.6 });
        for (let i = 0; i < load; i++)
            pen.rect(
                g,
                SPRING_X - 0.9 * U,
                stem + i * 0.45 * U,
                1.8 * U,
                0.45 * U,
                "ruler",
                c.paper ? pen.fill("card") : pen.fill("ink-soft"),
                { strokeWidth: 1.2 },
            );
        pen.line(g, SPRING_X - 1 * U, stem, SPRING_X + 1 * U, stem, "ruler", { strokeWidth: 2 });
        if (load > 0)
            num(c, SPRING_X - 1.3 * U, stem + (load * 0.45 * U) / 2 + 5, `${load} N`, 14, "end");
        a.masses = [SPRING_X, stem, "left"];
        // the ruler, its zero at the hook or at the unloaded foot, a mark to each half centimetre
        const zero = Math.round(p.from) === 1 ? TOP : TOP + natural * U,
            end = foot + 1 * U,
            cms = Math.ceil((end - zero) / U);
        pen.rect(
            g,
            RULER_X,
            zero - 0.3 * U,
            1.5 * U,
            cms * U + 0.6 * U,
            "ruler",
            pen.fill("card"),
            {
                strokeWidth: 1.6,
            },
        );
        for (let k = 0; k <= cms * 2; k++) {
            const y = zero + (k * U) / 2,
                whole = k % 2 === 0;
            pen.line(g, RULER_X, y, RULER_X + (whole ? 0.6 : 0.35) * U, y, "ruler", {
                strokeWidth: whole ? 1.3 : 0.9,
            });
            if (whole && (k / 2) % 2 === 0) num(c, RULER_X + 1.8 * U, y + 5, k / 2, 13, "start");
        }
        cap(c, RULER_X + 0.75 * U, zero - 0.6 * U, "cm", 11);
        a.ruler = [RULER_X + 1.5 * U, zero, "right"];
        if (Math.round(p.tell) === 1)
            soft(
                c,
                0.3 * U,
                floor + 1.35 * U,
                `in step up to ${Math.round(p.limit)} N`,
                11,
                "start",
            );
        return a;
    },
    describe: (p) =>
        `A coiled spring hanging from a hook on a stand, with ${Math.round(p.load) > 0 ? "slotted masses on a hanger" : "an empty hanger"} at its foot and a pointer to a centimetre ruler beside it.`,
    reads: true,
    motion: { still: "An instrument holds still while its reading is taken off the ruler." },
});
