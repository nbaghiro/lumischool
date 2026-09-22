import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { patch, penned, soft } from "../lettering";

/** Days from one new moon to the next. */
const MONTH = 29.53;

/** The eight shapes of the moon through a month, from the new moon round to the one before the next. */
export const PHASES = [
    "new moon",
    "crescent",
    "half moon",
    "gibbous",
    "full moon",
    "gibbous",
    "half moon",
    "crescent",
] as const;

/** How much of the moon is lit on a day of the month (0 new, 1 full), and whether that is growing. */
export function moonOn(day: number): {
    lit: number;
    growing: boolean;
    phase: number;
    near: number;
} {
    const d = ((day % MONTH) + MONTH) % MONTH,
        t = (2 * Math.PI * d) / MONTH,
        q = (d / MONTH) * 8;
    return {
        lit: (1 - Math.cos(t)) / 2,
        growing: d < MONTH / 2,
        phase: Math.round(q) % 8,
        near: Math.abs(q - Math.round(q)),
    };
}

/**
 * The moon as it looks on a day of the month, from the northern half of the world: its dark disc,
 * and the lit part bounded by the edge on the lit side and a half ellipse across the middle.
 */
function moonDay<G>(c: Ctx<G>, x: number, y: number, r: number, day: number): void {
    const { pen, g } = c,
        m = moonOn(day),
        t = (2 * Math.PI * (((day % MONTH) + MONTH) % MONTH)) / MONTH;
    pen.circle(
        g,
        x,
        y,
        2 * r,
        "ruler",
        pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
        { strokeWidth: 1.4 },
    );
    if (m.lit < 0.03) return;
    if (m.lit > 0.97) {
        pen.circle(g, x, y, 2 * r, "ruler", pen.fill("glow"), { strokeWidth: 1.6 });
        return;
    }
    const k = Math.max(0.5, r * Math.abs(Math.cos(t))),
        right = m.growing,
        crescent = m.lit < 0.5;
    const limb = right ? 1 : 0,
        term = crescent === right ? 0 : 1;
    pen.path(
        g,
        `M${x} ${y - r}A${r} ${r} 0 0 ${limb} ${x} ${y + r}A${k.toFixed(2)} ${r} 0 0 ${term} ${x} ${y - r}Z`,
        "ruler",
        pen.fill("glow"),
        { strokeWidth: 1.6 },
    );
}

export const moonphases = defineDrawing({
    id: "moonphases",
    family: "science",
    title: "A month of moons",
    group: "Structures",
    about: "The moon night after night, one box for each chosen day of the month counted from a new moon, each drawn as it really looks that night: a thin crescent lit on the right, growing to a half and a full moon, then shrinking and lit on the left. The lit part is worked out from the day, so the shapes are true to the calendar, and one box can be left empty for a child to work out.",
    params: { from: 0, step: 4, count: 8, blank: -1, days: 1 },
    settings: {
        from: { kind: "whole", min: 0, max: 29 },
        step: { kind: "whole", min: 1, max: 7 },
        count: { kind: "whole", min: 3, max: 8 },
        blank: { kind: "whole", min: -1, max: 7 },
        days: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "A month, every four days",
            params: { from: 0, step: 4, count: 8, blank: -1, days: 1 },
        },
        {
            label: "Every two days, one to work out",
            params: { from: 10, step: 2, count: 6, blank: 3, days: 1 },
        },
        { label: "Once a week", params: { from: 1, step: 7, count: 5, blank: -1, days: 1 } },
    ],
    box: (p) => ({ w: Math.max(3, Math.min(8, Math.round(p.count))) * 3 + 1, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            n = Math.max(3, Math.min(8, Math.round(p.count)));
        for (let i = 0; i < n; i++) {
            const x = (0.5 + i * 3) * U,
                day = Math.round(p.from) + i * Math.round(p.step),
                cx = x + 1.5 * U;
            pen.rect(
                g,
                x,
                0.4 * U,
                3 * U,
                3.4 * U,
                "ruler",
                pen.fill(c.paper ? "card" : "ink-soft", "hachure", {
                    hachureGap: 12,
                    fillWeight: 0.4,
                }),
                { strokeWidth: 1.6 },
            );
            if (Math.round(p.blank) === i) penned(c, cx, 2.7 * U, "?", 26);
            else moonDay(c, cx, 2.1 * U, 1.05 * U, day);
            if (p.days > 0) {
                patch(c, cx, 4.35 * U, 40, 14);
                soft(c, cx, 4.55 * U, `day ${day}`, 12);
            }
            a[`moon(${i})`] = [cx, 0.4 * U, "up"];
        }
        return a;
    },
    describe: () =>
        "The moon night after night in a row of boxes, one for each chosen day counted from a new moon, each drawn lit as it looks that night.",
    reads: true,
});
