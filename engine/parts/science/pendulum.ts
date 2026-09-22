import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, soft } from "../lettering";

/** Which of two pendulums swings faster: the shorter one, whatever the weights; equal lengths swing together. */
export const swingsFaster = (a: number, b: number): "a" | "b" | "same" =>
    a === b ? "same" : a < b ? "a" : "b";

export const pendulum = defineDrawing({
    id: "pendulum",
    family: "science",
    title: "Pendulum",
    group: "Structures",
    about: "A weight on a string hanging from a bar, drawn at its length and swinging between two dashed places. How long the string is sets how fast it swings, and the weight on the end does not: a shorter pendulum swings to and fro more times in ten seconds, and a heavier bob on the same string keeps exactly the same time. Length is in squares, each one ten centimetres.",
    params: { length: 5, mass: 50, swing: 1, tag: "" },
    settings: {
        length: { kind: "whole", min: 2, max: 8 },
        mass: { kind: "whole", min: 10, max: 500 },
        swing: { kind: "whole", min: 0, max: 1 },
        tag: { kind: "text", most: 2 },
    },
    takes: [
        { label: "Fifty centimetres", params: { length: 5, mass: 50, swing: 1, tag: "" } },
        { label: "Long and heavy", params: { length: 8, mass: 200, swing: 1, tag: "" } },
        { label: "Short, at rest", params: { length: 2, mass: 50, swing: 0, tag: "" } },
    ],
    box: () => ({ w: 12, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            len = Math.max(2, Math.min(8, Math.round(p.length))),
            px = 6 * U,
            py = 1.2 * U;
        const r = (0.5 + 0.28 * Math.cbrt(Math.max(10, p.mass) / 50)) * U;
        if (p.tag) num(c, 11.6 * U, 1.6 * U, p.tag, 22, "end");
        pen.rect(
            g,
            2 * U,
            py - 0.5 * U,
            8 * U,
            0.5 * U,
            "ruler",
            pen.fill("tang", "hachure", { hachureGap: 4 }),
            { strokeWidth: 2 },
        );
        pen.circle(
            g,
            px,
            py,
            8,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.8 },
        );
        const L = len * U,
            swing = 0.42;
        if (p.swing > 0) {
            pen.arc(g, px, py, 2 * L, 2 * L, Math.PI / 2 - swing, Math.PI / 2 + swing, "pencil", {
                strokeWidth: 1.3,
                strokeLineDash: [6, 6],
                stroke: c.t["ink-soft"],
            });
            for (const s of [-1, 1]) {
                const gx = px + s * L * Math.sin(swing),
                    gy = py + L * Math.cos(swing);
                pen.line(g, px, py, gx, gy, "pencil", {
                    strokeWidth: 1,
                    stroke: c.t["ink-soft"],
                    strokeLineDash: [4, 5],
                });
                pen.circle(g, gx, gy, 2 * r, "pencil", null, {
                    strokeWidth: 1.2,
                    stroke: c.t["ink-soft"],
                    strokeLineDash: [4, 4],
                });
            }
        }
        pen.line(g, px, py, px, py + L - r, "ruler", { strokeWidth: 1.8 });
        pen.circle(g, px, py + L, 2 * r, "ruler", pen.fill("tang"), { strokeWidth: 2 });
        patch(c, px, py + L, 34, 16);
        num(c, px, py + L + 5, `${Math.round(p.mass)} g`, 11);
        // the length on a measuring bracket at the side, clear of the swing
        const mx = 0.9 * U;
        pen.line(g, mx, py, mx, py + L, "ruler", { strokeWidth: 1.2, stroke: c.t["ink-soft"] });
        for (const y of [py, py + L])
            pen.line(g, mx - 0.25 * U, y, mx + 0.25 * U, y, "ruler", {
                strokeWidth: 1.2,
                stroke: c.t["ink-soft"],
            });
        patch(c, mx + 0.95 * U, py + L / 2, 40, 16);
        soft(c, mx + 0.3 * U, py + L / 2 + 4, `${len * 10} cm`, 12, "start");
        a.bob = [px, py + L + r, "down"];
        return a;
    },
    describe: (p) =>
        `A weight on a string hanging from a bar${p.swing > 0 ? ", swinging between two dashed places either side" : ", hanging still"}, its length and its mass written beside it.`,
    reads: true,
});
