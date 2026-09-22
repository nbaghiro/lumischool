import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { colourOf, paintFill, panColour } from "../../pigment";
import { defineDrawing } from "../drawing";
import { type Pt } from "./kit";

/**
 * One line taken for a walk without lifting the pencil, after Paul Klee's Pedagogical Sketchbook.
 * It is a prolate trochoid (a point on a wheel's spoke beyond its rim), so every loop crosses the
 * line exactly once and the crossings can be counted.
 */
export const lineWalk = defineDrawing({
    id: "linewalk",
    family: "art",
    title: "A line for a walk",
    group: "Structures",
    about: "One line drawn without lifting the pencil, wandering across the paper and looping back over itself, with a dot where it starts and an arrow where it stops. Each loop crosses the line once, so the crossings can be counted, and the little shapes the loops close off can be coloured in, as Paul Klee's students did.",
    params: { loops: 3, filled: false, colour: "tang" },
    settings: {
        loops: { kind: "whole", min: 1, max: 6 },
        filled: { kind: "flag" },
        colour: { kind: "text", most: 24 },
    },
    takes: [
        { label: "Three loops", params: { loops: 3, filled: false, colour: "orange" } },
        { label: "Four loops, coloured", params: { loops: 4, filled: true, colour: "yellow" } },
    ],
    box: () => ({ w: 16, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(1, Math.min(6, Math.round(p.loops))),
            a: RawAnchors = {};
        const x0 = 1.4 * U,
            x1 = 14.6 * U,
            yc = 4 * U,
            b = 1.5 * U,
            step = (x1 - x0 - 2 * b) / (2 * Math.PI * n),
            A = step,
            tail = Math.PI;
        // where the loop closes: the t either side of the loop's lowest point where x comes back to itself
        let lo = 0.01,
            hi = Math.PI;
        for (let k = 0; k < 40; k++) {
            const m = (lo + hi) / 2;
            if (b * Math.sin(m) > A * m) lo = m;
            else hi = m;
        }
        const tau = lo,
            at = (t: number): Pt => [x0 + b + A * t - b * Math.sin(t), yc + b * Math.cos(t) * 0.9];
        if (p.filled)
            for (let k = 0; k < n; k++) {
                const mid = Math.PI * 2 * k + Math.PI * 2,
                    loop: Pt[] = [];
                for (let t = mid - tau; t <= mid + tau; t += 0.08) loop.push(at(t));
                pen.polygon(
                    g,
                    loop,
                    "ruler",
                    paintFill(c, colourOf(p.colour) ?? panColour("orange")),
                    { strokeWidth: 0 },
                );
            }
        const pts: Pt[] = [];
        for (let t = tail; t <= Math.PI * 2 * (n + 1) - tail + 0.001; t += 0.1) pts.push(at(t));
        pen.curve(g, pts, "pencil", { strokeWidth: 3, stroke: c.t.ink });
        const [sx, sy] = pts[0] ?? [0, 0],
            [ex, ey] = pts[pts.length - 1] ?? [0, 0],
            [px, py] = pts[pts.length - 3] ?? [0, 0];
        pen.circle(
            g,
            sx,
            sy,
            10,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0 },
        );
        const dx = ex - px,
            dy = ey - py;
        for (const side of [-1, 1]) {
            const ang = Math.atan2(dy, dx) + Math.PI + side * 0.5;
            pen.line(g, ex, ey, ex + 11 * Math.cos(ang), ey + 11 * Math.sin(ang), "pencil", {
                strokeWidth: 2.4,
            });
        }
        a.start = [sx, sy, "down"];
        a.line = [8 * U, 0.4 * U, "up"];
        return a;
    },
    describe: (p) =>
        `One line that wanders across the page without the pencil lifting, looping over itself, a dot at its start and an arrow at its end${p.filled ? ", the loops coloured in" : ""}.`,
});
