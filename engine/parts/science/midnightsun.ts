import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, clamp } from "../animals/nature";
import { patch, soft } from "../lettering";

export const midnightSun = defineDrawing({
    id: "midnightsun",
    family: "science",
    title: "The midnight sun",
    group: "Structures",
    about: "The sun's day in the far north in summer: over a flat sea the sun is drawn every two hours round a low tilted loop, dipping to touch the sea at midnight and climbing again without setting.",
    params: { suns: 5, midnight: 1 },
    settings: {
        suns: { kind: "whole", min: 3, max: 8 },
        midnight: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Five suns, touching the sea", params: { suns: 5, midnight: 1 } },
        { label: "Before midnight", params: { suns: 4, midnight: 0 } },
        { label: "Eight suns", params: { suns: 8, midnight: 1 } },
    ],
    box: () => ({ w: 20, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.suns, 3, 8),
            sea = 8.4 * U,
            r = 0.62 * U,
            rx = 7.6 * U,
            ry = 3.4 * U,
            tilt = (6 * Math.PI) / 180,
            reach = Math.hypot(rx * Math.sin(tilt), ry * Math.cos(tilt)),
            // the loop's lowest point, where the midnight sun stands on the sea
            low = Math.atan2(ry * Math.cos(tilt), rx * Math.sin(tilt)),
            cx = 9 * U,
            cy = sea - r - reach,
            at = (t: number): Pt => {
                const x = rx * Math.cos(t),
                    y = ry * Math.sin(t);
                return [
                    cx + x * Math.cos(tilt) - y * Math.sin(tilt),
                    cy + x * Math.sin(tilt) + y * Math.cos(tilt),
                ];
            },
            a: RawAnchors = {};
        const loop: Pt[] = [];
        for (let k = 0; k <= 48; k++) loop.push(at((k / 48) * Math.PI * 2));
        pen.curve(g, loop, "pencil", {
            strokeWidth: 1.6,
            strokeLineDash: [2, 7],
            stroke: c.t.tang,
        });
        pen.polygon(
            g,
            [
                [0.2 * U, sea],
                [19.8 * U, sea],
                [19.8 * U, 10.7 * U],
                [0.2 * U, 10.7 * U],
            ],
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 9, fillWeight: 0.6 }),
            { stroke: "none" },
        );
        pen.line(g, 0.2 * U, sea, 19.8 * U, sea, "ruler", { strokeWidth: 2.2 });
        for (const [x, y, w] of [
            [1.6, 9.4, 1.6],
            [14.6, 9.2, 1.4],
            [5.2, 10.1, 1.2],
            [16.8, 10.2, 1.6],
        ] as const)
            pen.line(g, x * U, y * U, (x + w) * U, y * U, "pencil", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
        // one sun every two hours, the midnight one in the middle of the run, the earlier ones to its left
        const step = Math.PI / 6,
            first = -Math.floor((n - 1) / 2);
        for (let k = 0; k < n; k++) {
            const hours = first + k,
                midnight = hours === 0;
            if (midnight && p.midnight <= 0) continue;
            const [x, y] = at(low - hours * step);
            for (let j = 0; j < 8; j++) {
                const t = (j / 8) * Math.PI * 2;
                if (y + 1.3 * r * Math.sin(t) > sea) continue;
                pen.line(
                    g,
                    x + 1.3 * r * Math.cos(t),
                    y + 1.3 * r * Math.sin(t),
                    x + 1.7 * r * Math.cos(t),
                    y + 1.7 * r * Math.sin(t),
                    "pencil",
                    { strokeWidth: 1.3, stroke: c.t["glow-ink"] },
                );
            }
            pen.circle(g, x, y, 2 * r, "pencil", pen.fill("glow"), {
                strokeWidth: midnight ? 1.9 : 1.5,
            });
            a[`sun(${k})`] = [x, y - r, "up"];
            if (!midnight) continue;
            for (const [dy, w] of [
                [0.35, 1.2],
                [0.75, 0.8],
                [1.15, 0.45],
            ] as const)
                pen.line(g, x - w * U, sea + dy * U, x + w * U, sea + dy * U, "pencil", {
                    strokeWidth: 1.8,
                    stroke: c.t.glow,
                });
            patch(c, x, sea + 1.75 * U, 64, 17);
            soft(c, x, sea + 2 * U, "midnight", 13);
            a.midnight = [x, y, "down"];
        }
        return a;
    },
    describe: (p) =>
        `The sun in the far north in summer, drawn every two hours round a low dotted loop over a flat sea${p.midnight > 0 ? ", the lowest just touching the sea" : ""}.`,
    motion: {
        still: "It carries a reading: where the sun stands against the sea, hour by hour, holds still to be read.",
    },
});
