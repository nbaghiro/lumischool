import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, soft } from "../lettering";
import { pushDown } from "./push";

type Pt = [number, number];

/** A stone with its weight on it: the load a lever or a winch lifts. */
function stone<G>(c: Ctx<G>, x: number, bottom: number, w: number, label: string): void {
    const { pen, g } = c,
        h = w * 0.72,
        lw = label.length * 8.6 + 10;
    pen.polygon(
        g,
        [
            [x - w / 2, bottom],
            [x - w * 0.46, bottom - h * 0.6],
            [x - w * 0.18, bottom - h],
            [x + w * 0.3, bottom - h * 0.92],
            [x + w / 2, bottom - h * 0.4],
            [x + w * 0.46, bottom],
        ],
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.7 }),
        { strokeWidth: 2 },
    );
    // the weight sits on a card, because a number over a stone's hatching cannot be read on screen either
    pen.rect(g, x - lw / 2, bottom - h * 0.48 - 10, lw, 20, "ruler", pen.fill("card"), {
        strokeWidth: 1.2,
    });
    num(c, x, bottom - h * 0.48 + 5, label, 14);
}

/** The step the lever's pivot stands on, counted from the stone's end of a plank ten steps long. */
export const pivotStep = (fulcrum: number): number => Math.max(1, Math.min(9, Math.round(fulcrum)));

/** Which way a lever tips: the side whose turning effect is bigger goes down, and equal is level. */
type Tip = "left" | "right" | "balanced";

export const leverTips = (load: number, fulcrum: number, push: number, span = 10): Tip => {
    const l = load * fulcrum,
        r = push * (span - fulcrum);
    return l === r ? "balanced" : l > r ? "left" : "right";
};

export const lever = defineDrawing({
    id: "lever",
    family: "science",
    title: "Lever",
    group: "Structures",
    about: "A plank over a pivot with a stone on one end and a push on the other, the steps counted out from the pivot both ways. It tips the way the turning effect says: the stone's weight times its steps against the push times its steps, so a small push far from the pivot lifts a heavy stone close to it. With the push at 0 the arrow asks what push would hold it level.",
    params: { fulcrum: 3, load: 60, push: 20, unit: "N", marks: 1 },
    settings: {
        fulcrum: { kind: "whole", min: 1, max: 9 },
        load: { kind: "whole", min: 0, max: 100 },
        push: { kind: "whole", min: 0, max: 100 },
        unit: { kind: "text", most: 3 },
        marks: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "A small push lifts a big stone",
            params: { fulcrum: 3, load: 60, push: 30, unit: "N", marks: 1 },
        },
        { label: "Balanced", params: { fulcrum: 2, load: 80, push: 20, unit: "N", marks: 1 } },
        {
            label: "What push holds it level?",
            params: { fulcrum: 5, load: 40, push: 0, unit: "N", marks: 1 },
        },
    ],
    box: () => ({ w: 23, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            span = 10,
            step = 1.8 * U;
        const f = pivotStep(p.fulcrum),
            ground = 11 * U,
            pivotY = 7.8 * U;
        const x0 = 2.4 * U,
            px = x0 + f * step;
        // a question mark on either force holds the plank level, since the question is what balances it
        const tip = p.push > 0 && p.load > 0 ? leverTips(p.load, f, p.push, span) : "balanced";
        const tilt = tip === "balanced" ? 0 : tip === "left" ? -0.1 : 0.1;
        const at = (s: number): Pt => [
            px + (s - f) * step * Math.cos(tilt),
            pivotY + (s - f) * step * Math.sin(tilt),
        ];
        pen.line(g, 0, ground, 23 * U, ground, "ruler", { strokeWidth: 2.6 });
        pen.polygon(
            g,
            [
                [px - 1.3 * U, ground],
                [px + 1.3 * U, ground],
                [px, pivotY + 0.15 * U],
            ],
            "ruler",
            pen.fill("tang", "hachure", { hachureGap: 4 }),
            { strokeWidth: 2.2 },
        );
        const [lx, ly] = at(0),
            [rx, ry] = at(span);
        pen.line(g, lx, ly, rx, ry, "ruler", { strokeWidth: 5 });
        for (let s = 0; s <= span; s++) {
            if (s === f) continue;
            const [x, y] = at(s),
                d = Math.abs(s - f);
            pen.line(g, x, y - 5, x, y + 5, "ruler", { strokeWidth: 1.2, stroke: c.t.card });
            if (p.marks > 0) {
                patch(c, x, y + 0.95 * U, 20, 16);
                soft(c, x, y + 0.95 * U + 5, String(d), 12);
            }
            a[`step(${s})`] = [x, y, "up"];
        }
        a.pivot = [px, pivotY, "up"];
        stone(c, lx + 0.2 * U, ly - 2, 2.8 * U, p.load > 0 ? `${p.load} ${p.unit}` : "?");
        a.load = [lx, ly - 2.4 * U, "up"];
        pushDown(c, rx, ry - 3, 3.2 * U, p.push > 0 ? `${p.push} ${p.unit}` : "?");
        a.push = [rx, ry - 3.4 * U, "up"];
        return a;
    },
    describe: () =>
        "A plank over a pivot with a stone on one end and a push arrow on the other, the steps counted out from the pivot both ways.",
    reads: true,
});
