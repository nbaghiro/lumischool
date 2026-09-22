import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, num, patch, soft } from "../lettering";

export const seesaw = defineDrawing({
    id: "seesaw",
    family: "science",
    title: "See-saw",
    group: "Structures",
    about: "A plank on a pivot, marked off in equal steps each side, with a weight hung at a step. It tilts by the turning effect rather than by the weight, which is the one drawing that makes the distance from the pivot as visible as the load. With `held` at 1 two props hold it level, so whether it would balance has to be worked out rather than read off the tilt.",
    params: { left: 4, atleft: 3, right: 6, atright: 2, unit: "kg", marks: true, held: 0 },
    settings: {
        left: { kind: "whole", min: 0, max: 10 },
        atleft: { kind: "whole", min: 1, max: 5 },
        right: { kind: "whole", min: 0, max: 10 },
        atright: { kind: "whole", min: 1, max: 5 },
        unit: { kind: "text", most: 3 },
        marks: { kind: "flag" },
        held: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Balanced",
            params: { left: 4, atleft: 3, right: 6, atright: 2, unit: "kg", marks: true, held: 0 },
        },
        {
            label: "One side empty",
            params: { left: 4, atleft: 3, right: 0, atright: 2, unit: "kg", marks: true, held: 0 },
        },
        {
            label: "Held level, to work out",
            params: { left: 3, atleft: 4, right: 4, atright: 3, unit: "kg", marks: true, held: 1 },
        },
    ],
    box: () => ({ w: 26, h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const cx = 13 * U,
            ground = 11 * U,
            pivotTop = 7.2 * U,
            arm = 5,
            step = 2.2 * U;
        const ml = p.left * p.atleft,
            mr = p.right * p.atright;
        // the plank turns by the difference in turning effect, capped so it never leaves the pivot
        const tilt =
            p.held > 0
                ? 0
                : Math.max(-0.16, Math.min(0.16, (mr - ml) / Math.max(1, Math.max(ml, mr) * 3)));
        pen.line(g, 0, ground, 26 * U, ground, "ruler", { strokeWidth: 2.6 });
        if (p.held > 0) {
            // props between the fourth and fifth steps, clear of both numbers, holding the plank level
            for (const side of [-1, 1])
                pen.rect(
                    g,
                    cx + side * 4.5 * step - 0.4 * U,
                    pivotTop + 0.4 * U + 1.4 * U,
                    0.8 * U,
                    ground - pivotTop - 1.8 * U,
                    "ruler",
                    pen.fill("tang", "hachure", { hachureGap: 4 }),
                    { strokeWidth: 1.8 },
                );
            cap(c, cx, ground + 0.8 * U, "held level until it is let go", 10);
        }
        pen.polygon(
            g,
            [
                [cx - 1.6 * U, ground],
                [cx + 1.6 * U, ground],
                [cx, pivotTop],
            ],
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 2.2 },
        );
        const at = (side: -1 | 1, d: number): [number, number] => [
            cx + side * d * step,
            pivotTop + side * tilt * d * step,
        ];
        const [lx, ly] = at(-1, arm),
            [rx, ry] = at(1, arm);
        pen.line(g, lx, ly, rx, ry, "ruler", { strokeWidth: 4.4 });
        a.pivot = [cx, pivotTop, "up"];
        for (const side of [-1, 1] as const)
            for (let d = 1; d <= arm; d++) {
                const [x, y] = at(side, d);
                pen.line(g, x, y - 6, x, y + 6, "ruler", { strokeWidth: 1.2, stroke: c.t.card });
                if (p.marks) {
                    patch(c, x, y + 0.9 * U, 22, 17);
                    soft(c, x, y + 0.9 * U + 5, String(d), 12);
                }
                a[`${side < 0 ? "left" : "right"}(${d})`] = [x, y, "up"];
            }
        const block = (kg: number, d: number, side: -1 | 1) => {
            if (kg <= 0 || d < 1 || d > arm) return;
            const [x, y] = at(side, d),
                w = Math.min(2.2, 1 + kg * 0.14) * U,
                h = Math.min(2.4, 1 + kg * 0.16) * U;
            pen.rect(
                g,
                x - w / 2,
                y - h - 4,
                w,
                h,
                "ruler",
                pen.fill("tang", "solid", { hachureGap: 5 }),
                { strokeWidth: 2 },
            );
            patch(c, x, y - h / 2 - 4, w - 4, 18);
            num(c, x, y - h / 2 + 2, `${kg}`, 14);
            a[`${side < 0 ? "load-left" : "load-right"}`] = [x, y - h - 5, "up"];
        };
        block(p.left, p.atleft, -1);
        block(p.right, p.atright, 1);
        soft(c, cx, p.held > 0 ? 12.7 * U : 12.5 * U, `weights in ${p.unit}`, 13);
        return a;
    },
    describe: (p) =>
        `A plank on a pivot marked off in equal steps each side, a weight hung at a step on ${p.left > 0 && p.right > 0 ? "each side" : "one side"}${p.held > 0 ? ", two props holding it level" : ""}.`,
    motion: { still: "Which way it tips is the answer." },
    reads: true,
});
