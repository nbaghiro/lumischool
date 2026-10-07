import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

const WINGS = ["up", "down"] as const;

/** A little bird flying to the right with a number card hanging from its beak. */
export const numberBird = defineDrawing<{ n: number; wings: string }>({
    id: "numberbird",
    family: "sport",
    title: "Bird with a number",
    group: "Props",
    about: "A little round bird flying to the right with its wings up or down, carrying a white card with a number on it in its beak.",
    params: { n: 12, wings: "up" },
    settings: { n: { kind: "whole", min: 0, max: 99 }, wings: { kind: "one of", of: WINGS } },
    takes: [
        { label: "Wings up, twelve", params: { n: 12, wings: "up" } },
        { label: "Wings down, five", params: { n: 5, wings: "down" } },
    ],
    box: () => ({ w: 3, h: 3 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            o = { strokeWidth: 1.3, roughness: 0.25 },
            up = p.wings !== "down";
        pen.polygon(
            g,
            [
                [1.3 * U, 1.0 * U],
                [0.6 * U, up ? 0.15 * U : 1.75 * U],
                [1.9 * U, 1.0 * U],
            ],
            "pencil",
            pen.fill("sky", "solid"),
            o,
        );
        pen.ellipse(g, 1.4 * U, 1.1 * U, 1.7 * U, 1.0 * U, "pencil", pen.fill("sky", "solid"), o);
        pen.polygon(
            g,
            [
                [0.6 * U, 1.0 * U],
                [0.1 * U, 0.75 * U],
                [0.2 * U, 1.3 * U],
            ],
            "pencil",
            pen.fill("sky", "solid"),
            o,
        );
        pen.circle(g, 2.15 * U, 0.85 * U, 0.75 * U, "pencil", pen.fill("sky", "solid"), o);
        pen.circle(g, 2.3 * U, 0.75 * U, 0.14 * U, "ruler", pen.fill("ink", "solid"), {
            strokeWidth: 0.3,
        });
        pen.polygon(
            g,
            [
                [2.5 * U, 0.85 * U],
                [2.95 * U, 0.98 * U],
                [2.5 * U, 1.08 * U],
            ],
            "pencil",
            pen.fill("tang", "solid"),
            { strokeWidth: 0.8 },
        );
        pen.line(g, 2.75 * U, 1.0 * U, 2.6 * U, 1.75 * U, "pencil", {
            strokeWidth: 0.8,
            stroke: c.t["ink-soft"],
        });
        pen.rect(g, 1.85 * U, 1.75 * U, 1.1 * U, 1.1 * U, "pencil", pen.fill("card", "solid"), {
            strokeWidth: 1.1,
            roughness: 0.2,
        });
        const n = Math.max(0, Math.min(99, Math.round(p.n)));
        num(c, 2.4 * U, 2.6 * U, n, n > 9 ? 13 : 16);
        return { card: [2.4 * U, 2.3 * U, "down"] };
    },
    describe: (p) =>
        `A small blue bird flying to the right with its wings ${p.wings === "down" ? "down" : "up"}, holding a white card with the number ${Math.max(0, Math.min(99, Math.round(p.n)))} in its beak.`,
    motion: { still: "A bird crosses the sky as the game flies it." },
});
