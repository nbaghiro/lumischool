import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

/**
 * A windsock on its pole, striped so its sections can be counted. It streams out straight in a strong
 * wind and hangs down in a light one, which is how a pilot reads the wind before landing.
 */
export const windsock = defineDrawing({
    id: "windsock",
    family: "travel",
    title: "Windsock",
    group: "Props",
    about: "A striped windsock on a pole, the way an airfield shows the wind. In a strong wind it streams out level; in a light one it droops. It points the way the wind is blowing to, so a plane lands facing the other way, into the wind.",
    params: { wind: 1, stripes: 5 },
    settings: {
        wind: { kind: "number", min: 0, max: 1, step: 0.25 },
        stripes: { kind: "whole", min: 3, max: 7 },
    },
    takes: [
        { label: "A strong wind", params: { wind: 1, stripes: 5 } },
        { label: "A light breeze", params: { wind: 0.3, stripes: 5 } },
    ],
    box: () => ({ w: 5, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            wind = Math.max(0, Math.min(1, Number(p.wind) || 0)),
            n = Math.max(3, Math.min(7, Math.round(Number(p.stripes) || 5))),
            a: RawAnchors = {};
        const foot: Pt = [0.7 * U, 4.8 * U],
            top: Pt = [0.7 * U, 0.6 * U];
        pen.line(g, foot[0], foot[1], top[0], top[1], "pencil", { strokeWidth: 2 });
        pen.ellipse(g, foot[0], foot[1], 0.9 * U, 0.25 * U, "pencil", pen.fill("mint"), {
            strokeWidth: 1,
        });
        // the sock's line droops as the wind drops, and it narrows from the ring at the pole to its tail
        const droop = (1 - wind) * 1.15,
            len = 3.9 * U,
            ring = 0.62 * U,
            end = 0.26 * U;
        const at = (u: number): Pt => [
            top[0] + 0.15 * U + Math.cos(droop * u) * len * u,
            top[1] + 0.3 * U + Math.sin(droop * u) * len * u,
        ];
        for (let i = 0; i < n; i++) {
            const u0 = i / n,
                u1 = (i + 1) / n,
                r0 = ring + (end - ring) * u0,
                r1 = ring + (end - ring) * u1;
            const [x0, y0] = at(u0),
                [x1, y1] = at(u1),
                nx0 = -Math.sin(droop * u0),
                ny0 = Math.cos(droop * u0),
                nx1 = -Math.sin(droop * u1),
                ny1 = Math.cos(droop * u1);
            pen.polygon(
                g,
                [
                    [x0 + nx0 * r0, y0 + ny0 * r0],
                    [x1 + nx1 * r1, y1 + ny1 * r1],
                    [x1 - nx1 * r1, y1 - ny1 * r1],
                    [x0 - nx0 * r0, y0 - ny0 * r0],
                ],
                "pencil",
                pen.fill(i % 2 ? "card" : "berry"),
                { strokeWidth: 1.2 },
            );
        }
        a.top = [top[0], top[1], "up"];
        a.tail = [...at(1), "right"];
        return a;
    },
    describe: (p) =>
        `A windsock in pink and white stripes on a pole, ${p.wind >= 0.5 ? "streaming out level in the wind" : "drooping down in a light wind"}, its wide end at the pole and its narrow end away.`,
});
