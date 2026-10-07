import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const whole = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/** Power lines between two wooden poles, `span` squares apart and `h` squares tall, the wires sagging between them. */
export const powerLine = defineDrawing<{ span: number; h: number }>({
    id: "powerline",
    family: "places",
    title: "Power lines",
    group: "Structures",
    about: "Two tall wooden poles with a crossbar and white cups at the top, and two wires sagging between them, the kind a kite must be kept well away from.",
    params: { span: 24, h: 11 },
    settings: { span: { kind: "whole", min: 8, max: 36 }, h: { kind: "whole", min: 6, max: 14 } },
    takes: [
        { label: "A long span", params: { span: 30, h: 11 } },
        { label: "A short span", params: { span: 12, h: 9 } },
    ],
    box: (p) => ({ w: whole(p.span, 8, 36), h: whole(p.h, 6, 14) + 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = whole(p.span, 8, 36) * U,
            h = (whole(p.h, 6, 14) + 1) * U,
            top = U;
        for (const x of [0.9 * U, w - 0.9 * U]) {
            pen.rect(
                g,
                x - 0.18 * U,
                top - 0.3 * U,
                0.36 * U,
                h - top + 0.1 * U,
                "ruler",
                pen.fill("tang", "hachure"),
                {
                    strokeWidth: 1.2,
                },
            );
            pen.line(g, x - 0.6 * U, top - 0.1 * U, x + 0.6 * U, top - 0.1 * U, "ruler", {
                strokeWidth: 1.6,
            });
            for (const dx of [-0.45, 0.45])
                pen.circle(
                    g,
                    x + dx * U,
                    top - 0.3 * U,
                    0.22 * U,
                    "ruler",
                    pen.fill("card", "solid"),
                    {
                        strokeWidth: 0.6,
                    },
                );
        }
        // the sag matches the line a game keeps a kite off: 1.2 squares at the middle
        for (const dx of [-0.45, 0.45])
            pen.curve(
                g,
                Array.from({ length: 9 }, (_, i): [number, number] => {
                    const u = i / 8;
                    return [
                        0.9 * U + dx * U * (1 - 2 * u) + (w - 1.8 * U) * u,
                        top - 0.3 * U + 1.2 * U * 4 * u * (1 - u) + (dx > 0 ? 0.4 * U : 0),
                    ];
                }),
                "pencil",
                { strokeWidth: 1, stroke: c.t.ink, roughness: 0.15 },
            );
        return { left: [0.9 * U, top, "up"], right: [w - 0.9 * U, top, "up"] };
    },
    describe: () =>
        "Two tall wooden poles with a crossbar and white insulators at the top, and two dark wires sagging between them high above the ground.",
});
