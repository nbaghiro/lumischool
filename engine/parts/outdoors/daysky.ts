import { part, type Ctx, type RawAnchors } from "../../ink/surface";
import { rng, roundedRect, starPoints } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, along, clamp } from "../animals/nature";
import { moon } from "./moon";

/** Seven stars in a fixed pattern, in squares from the panel's corner: the same sky every render. */
const PLOUGH: Pt[] = [
    [8.6, 5.8],
    [10.2, 5.2],
    [11.6, 4.7],
    [12.9, 4.3],
    [13.1, 2.8],
    [11.7, 2.4],
    [10.5, 3.1],
];

const sparkle = <G>(c: Ctx<G>, x: number, y: number, r: number) =>
    c.pen.polygon(c.g, starPoints(x, y, r, 4, 0.36), "pencil", c.pen.fill("glow"), {
        strokeWidth: 1.1,
    });

function cloud<G>(c: Ctx<G>, x: number, y: number, w: number): void {
    c.pen.path(
        c.g,
        `M${x} ${y}A${w * 0.28} ${w * 0.28} 0 0 1 ${x + w * 0.3} ${y - w * 0.3}` +
            `A${w * 0.3} ${w * 0.3} 0 0 1 ${x + w * 0.7} ${y - w * 0.26}` +
            `A${w * 0.26} ${w * 0.26} 0 0 1 ${x + w} ${y}Z`,
        "pencil",
        c.pen.fill("card"),
        { strokeWidth: 2 },
    );
}

export const daySky = defineDrawing({
    id: "daysky",
    family: "outdoors",
    title: "Day and night sky",
    group: "Props",
    about: "A wide strip of sky: a sun and a few clouds by day, or a moon and one fixed pattern of stars by night. The moon is drawn as a true fraction of its disc, so a half or a quarter can be read straight off it.",
    params: { night: false, phase: 0.5, clouds: 3, stars: 12 },
    settings: {
        night: { kind: "flag" },
        phase: { kind: "number", min: 0, max: 1, step: 0.05 },
        clouds: { kind: "whole", min: 0, max: 5 },
        stars: { kind: "whole", min: 0, max: 22 },
    },
    takes: [
        { label: "Day", params: { night: false, phase: 0.5, clouds: 3, stars: 12 } },
        { label: "Night, half moon", params: { night: true, phase: 0.5, clouds: 1, stars: 14 } },
        { label: "Night, full moon", params: { night: true, phase: 1, clouds: 0, stars: 20 } },
    ],
    box: () => ({ w: 18, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        pen.path(
            g,
            roundedRect(0.5 * U, 0.5 * U, 17 * U, 6 * U, 10),
            "ruler",
            p.night
                ? pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.55 })
                : pen.fill("sky", "solid", { hachureGap: 12, fillWeight: 0.5 }),
            { strokeWidth: 2.2 },
        );
        if (p.night) {
            const mx = 3.9 * U,
                my = 3.3 * U;
            moon(c, mx, my, 30, p.phase);
            a.moon = [mx, my - 30, "up"];
            const stars = clamp(p.stars, 0, 22);
            const set = PLOUGH.slice(0, Math.min(PLOUGH.length, stars));
            for (let i = 1; i < set.length; i++) {
                pen.line(
                    g,
                    (set[i - 1] ?? [0, 0])[0] * U,
                    (set[i - 1] ?? [0, 0])[1] * U,
                    (set[i] ?? [0, 0])[0] * U,
                    (set[i] ?? [0, 0])[1] * U,
                    "ruler",
                    { strokeWidth: 1, stroke: c.t["ink-soft"] },
                );
            }
            if (set.length === PLOUGH.length) {
                pen.line(
                    g,
                    (set[6] ?? [0, 0])[0] * U,
                    (set[6] ?? [0, 0])[1] * U,
                    (set[3] ?? [0, 0])[0] * U,
                    (set[3] ?? [0, 0])[1] * U,
                    "ruler",
                    {
                        strokeWidth: 1,
                        stroke: c.t["ink-soft"],
                    },
                );
            }
            set.forEach(([x, y], i) => {
                sparkle(part(c, "star", [x * U, y * U]), x * U, y * U, 8);
                a[`star(${i})`] = [x * U, y * U - 8, "up"];
            });
            const r = rng(5503);
            for (let i = set.length; i < stars; i++) {
                let x = 0,
                    y = 0;
                for (let tries = 0; tries < 12; tries++) {
                    x = (1.3 + r() * 15.4) * U;
                    y = (1.3 + r() * 4.6) * U;
                    if (
                        Math.hypot(x - mx, y - my) > 2.7 * U &&
                        set.every(([sx, sy]) => Math.hypot(x - sx * U, y - sy * U) > 1.1 * U)
                    )
                        break;
                }
                sparkle(part(c, "star", [x, y]), x, y, 5);
            }
            return a;
        }
        const sx = 3.8 * U,
            sy = 3.5 * U;
        for (let k = 0; k < 8; k++) {
            const t = (k / 8) * Math.PI * 2,
                s = along(sx, sy, 32, t),
                e = along(sx, sy, 44, t);
            pen.line(g, s[0], s[1], e[0], e[1], "pencil", { strokeWidth: 2 });
        }
        pen.circle(g, sx, sy, 52, "pencil", pen.fill("glow"), { strokeWidth: 2.2 });
        a.sun = [sx, sy - 44, "up"];
        const n = clamp(p.clouds, 0, 5),
            span = n > 1 ? 7.4 / (n - 1) : 0;
        for (let i = 0; i < n; i++) {
            const cw = 3.1 * U,
                cx = (n > 1 ? 7.6 + i * span : 11) * U,
                cy = (2.4 + (i % 2) * 2.6) * U;
            cloud(part(c, "cloud", [cx, cy]), cx - cw / 2, cy, cw);
            a[`cloud(${i})`] = [cx, cy - 0.5 * U, "up"];
        }
        return a;
    },
    describe: (p) =>
        p.night
            ? "A wide strip of dark night sky with the moon and a pattern of stars, some of them joined by faint lines."
            : "A wide strip of blue daytime sky with a yellow sun sending out rays and white clouds drifting across it.",
    motion: {
        parts: {
            cloud: { is: "drift", dx: 9, lift: 1.5, period: 8.5, free: true },
            star: { is: "twinkle", period: 3.4, free: true },
        },
    },
    reads: true,
});
