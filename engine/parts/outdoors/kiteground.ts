import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const GROUNDS = ["grass", "sand", "leaves", "path"] as const;

/** A strip of ground for a kite field: grass with tufts, sand with ripples, fallen leaves, or a paved path. */
export const kiteGround = defineDrawing<{ w: number; ground: string }>({
    id: "kiteground",
    family: "outdoors",
    title: "Field ground",
    group: "Structures",
    about: "A strip of ground seen from the side, one ruled line where it starts: grass with tufts, beach sand with ripples, autumn leaves, or a grey paved path.",
    params: { w: 20, ground: "grass" },
    settings: { w: { kind: "whole", min: 4, max: 20 }, ground: { kind: "one of", of: GROUNDS } },
    takes: [
        { label: "Grass", params: { w: 12, ground: "grass" } },
        { label: "Sand", params: { w: 12, ground: "sand" } },
        { label: "Autumn leaves", params: { w: 12, ground: "leaves" } },
        { label: "A paved path", params: { w: 12, ground: "path" } },
    ],
    box: (p) => ({ w: Math.max(4, Math.min(20, Math.round(p.w))), h: 3 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = Math.max(4, Math.min(20, Math.round(p.w))) * U,
            y = 0.6 * U,
            ground = GROUNDS.find((x) => x === p.ground) ?? "grass";
        const fill =
            ground === "sand"
                ? pen.fill("glow", "hachure", { hachureGap: 12, fillWeight: 0.7 })
                : ground === "leaves"
                  ? pen.fill("tang", "hachure", { hachureGap: 11, fillWeight: 0.8 })
                  : ground === "path"
                    ? pen.fill("ink-soft", "hachure", { hachureGap: 14, fillWeight: 0.5 })
                    : pen.fill("mint", "hachure", { hachureGap: 10, fillWeight: 0.8 });
        pen.rect(g, 0.4 * U, y + 0.1 * U, w - 0.8 * U, 1.7 * U, "pencil", fill, {
            stroke: "none",
            roughness: 0.4,
        });
        pen.line(g, 0.15 * U, y, w - 0.15 * U, y, "ruler", { strokeWidth: 2.4 });
        for (let x = 0.7 * U; x < w - 1.4 * U; x += 2.3 * U) {
            if (ground === "grass") {
                pen.line(g, x, y, x - 3, y - 7, "pencil", { strokeWidth: 1.2 });
                pen.line(g, x + 4, y, x + 6, y - 8, "pencil", { strokeWidth: 1.2 });
            } else if (ground === "sand")
                pen.arc(g, x + 10, y + 16, 18, 6, Math.PI, Math.PI * 2, "pencil", {
                    strokeWidth: 1,
                });
            else if (ground === "leaves")
                pen.ellipse(
                    g,
                    x + 6,
                    y - 2,
                    9,
                    4,
                    "pencil",
                    pen.fill(x % 3 > 1 ? "berry" : "tang", "solid"),
                    {
                        strokeWidth: 0.8,
                    },
                );
            else pen.line(g, x + 12, y, x + 12, y + 1.9 * U, "ruler", { strokeWidth: 0.8 });
        }
        return { top: [w / 2, y, "up"] };
    },
    describe: (p) =>
        `A strip of ground seen from the side, one ruled line along its top, ${p.ground === "sand" ? "pale beach sand with little ripples" : p.ground === "leaves" ? "brown earth with fallen autumn leaves" : p.ground === "path" ? "grey paving stones in a row" : "green grass with tufts along it"}.`,
});
