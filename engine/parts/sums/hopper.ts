// The function machine's parts: the straight ink arrow that feeds it and the hopper with the rule
// written on it, which the machine and the chain of two draw.
import { type Ctx } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { num, patch, wide } from "../lettering";

export type Pt = [number, number];

/** A straight ink arrow along the grid. Everything in this file is joined by one of these. */
export function feed<G>(c: Ctx<G>, from: Pt, to: Pt): void {
    const { pen, g } = c;
    pen.line(g, from[0], from[1], to[0], to[1], "ruler", { strokeWidth: 2.2 });
    const t = Math.atan2(to[1] - from[1], to[0] - from[0]);
    for (const s of [-0.45, 0.45]) {
        pen.line(
            g,
            to[0],
            to[1],
            to[0] + 12 * Math.cos(t + Math.PI + s),
            to[1] + 12 * Math.sin(t + Math.PI + s),
            "ruler",
            { strokeWidth: 2.2 },
        );
    }
}

/** The machine itself: a hopper narrowing into a body with the rule written on it. */
export function hopper<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    w: number,
    h: number,
    rule: string,
): void {
    const { pen, g } = c,
        lip = 0.5 * U;
    pen.polygon(
        g,
        [
            [x - lip, y],
            [x + w + lip, y],
            [x + w, y + 0.7 * U],
            [x, y + 0.7 * U],
        ],
        "pencil",
        pen.fill("ink-soft", "hachure", { hachureGap: 5 }),
        { strokeWidth: 1.8 },
    );
    pen.path(
        g,
        roundedRect(x, y + 0.7 * U, w, h - 0.7 * U, 8),
        "pencil",
        pen.fill("sky", "solid", { hachureGap: 9, fillWeight: 0.5 }),
        { strokeWidth: 2.4 },
    );
    patch(c, x + w / 2, y + h / 2 + 0.2 * U, wide(rule, 26) + 14, 34);
    num(c, x + w / 2, y + h / 2 + 0.35 * U, rule, 26);
    for (const dx of [0.5, w - 0.5 * U])
        pen.circle(c.g, x + dx, y + h - 0.42 * U, 10, "pencil", pen.fill("card"), {
            strokeWidth: 1.2,
        });
}
