import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { type Pt, clamp, eye } from "../animals/nature";

/** One stage of a frog's life, drawn to sit on `base` in a circle of `r`. */
function frogStage<G>(c: Ctx<G>, k: number, cx: number, base: number, r: number): void {
    const { pen, g } = c;
    if (k === 0) {
        // frogspawn: eggs in their jelly, each with a dark dot
        for (const [dx, dy] of [
            [0, -0.5],
            [-0.42, -0.3],
            [0.42, -0.32],
            [-0.2, -0.8],
            [0.22, -0.78],
            [-0.5, -0.7],
            [0.5, -0.66],
        ] as const) {
            pen.circle(g, cx + dx * r, base + dy * r, r * 0.46, "pencil", pen.fill("card"), {
                strokeWidth: 1.1,
            });
            pen.circle(
                g,
                cx + dx * r + 1,
                base + dy * r,
                r * 0.13,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.4 },
            );
        }
        return;
    }
    if (k === 1 || k === 2) {
        const y = base - r * 0.55,
            legs = k === 2;
        pen.curve(
            g,
            [
                [cx - r * 0.2, y],
                [cx - r * 0.55, y - r * 0.18],
                [cx - r * 0.8, y + r * 0.1],
                [cx - r * (legs ? 0.95 : 1.1), y - r * 0.12],
            ],
            "pencil",
            { strokeWidth: legs ? 1.6 : 2 },
        );
        if (legs)
            for (const up of [-1, 1])
                pen.linear(
                    g,
                    [
                        [cx - r * 0.1, y + up * r * 0.12],
                        [cx - r * 0.25, y + up * r * 0.38],
                        [cx - r * 0.02, y + up * r * 0.46],
                    ],
                    "pencil",
                    { strokeWidth: 1.3 },
                );
        pen.ellipse(
            g,
            cx + r * 0.15,
            y,
            r * (legs ? 0.8 : 0.72),
            r * (legs ? 0.52 : 0.5),
            "pencil",
            pen.fill(legs ? "mint" : "ink-soft", "hachure", { hachureGap: 3.5 }),
            { strokeWidth: 1.4 },
        );
        eye(c, cx + r * 0.36, y - r * 0.08, 3.5);
        return;
    }
    // a frog sitting, facing out, with its back legs folded
    const y = base - r * 0.08,
        skin = pen.fill("mint");
    for (const sd of [-1, 1]) {
        pen.ellipse(g, cx + sd * r * 0.5, y - r * 0.18, r * 0.62, r * 0.36, "pencil", skin, {
            strokeWidth: 1.3,
        });
        pen.linear(
            g,
            [
                [cx + sd * r * 0.2, y - r * 0.3],
                [cx + sd * r * 0.28, y],
                [cx + sd * r * 0.42, y],
            ],
            "pencil",
            { strokeWidth: 1.3 },
        );
    }
    pen.ellipse(g, cx, y - r * 0.5, r * 1.1, r * 0.8, "pencil", skin, { strokeWidth: 1.5 });
    for (const sd of [-1, 1]) {
        pen.circle(g, cx + sd * r * 0.28, y - r * 0.9, r * 0.36, "pencil", pen.fill("card"), {
            strokeWidth: 1.2,
        });
        eye(c, cx + sd * r * 0.28, y - r * 0.9, 3.5);
    }
    pen.arc(g, cx, y - r * 0.5, r * 0.5, r * 0.22, 0.3, Math.PI - 0.3, "pencil", {
        strokeWidth: 1,
    });
}

const FROG_STAGES = ["frogspawn", "tadpole", "froglet", "frog"];

export const frogCycle = defineDrawing({
    id: "frogcycle",
    family: "outdoors",
    title: "Frog life cycle",
    group: "Props",
    about: "Frogspawn, a tadpole, a froglet with its back legs and a frog, joined by arrows in a ring or a row. Show fewer stages and the rest wait as dashed circles, which is the question: what comes next?",
    params: { stage: 4, ring: 1, names: 0 },
    settings: {
        stage: { kind: "whole", min: 0, max: 4 },
        ring: { kind: "whole", min: 0, max: 1 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "The whole ring", params: { stage: 4, ring: 1, names: 0 } },
        { label: "Two stages, then what?", params: { stage: 2, ring: 1, names: 0 } },
        { label: "In a row, named", params: { stage: 4, ring: 0, names: 1 } },
    ],
    box: (p) => (p.ring > 0 ? { w: 10, h: 9 } : { w: 21, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            shown = clamp(p.stage, 0, 4),
            ring = p.ring > 0,
            a: RawAnchors = {};
        const cx = 5 * U,
            cy = 4.6 * U,
            R = 3.05 * U;
        const spots: Pt[] = ring
            ? [
                  [cx, cy - R],
                  [cx + R, cy],
                  [cx, cy + R],
                  [cx - R, cy],
              ]
            : [0, 1, 2, 3].map((i) => [(2.5 + i * 5.3) * U, 3.2 * U] as Pt);
        const r = ring ? 1.15 * U : 1.35 * U;
        spots.forEach(([x, y], i) => {
            if (i < shown) frogStage(c, i, x, y + r * 0.7, r);
            else
                pen.circle(g, x, y, r * 2, "pencil", null, {
                    strokeWidth: 1.4,
                    strokeLineDash: [6, 6],
                    stroke: c.t["ink-soft"],
                });
            if (p.names > 0 && i < shown) say(c, x, y + r * 1.55, FROG_STAGES[i] ?? "", 13);
            a[`stage(${i})`] = [x, y - r, "up"];
        });
        // arrows round the ring, following the circle from one stage to the next, or along the row
        for (let i = 0; i < (ring ? 4 : 3); i++) {
            if (ring) {
                const a0 = -Math.PI / 2 + i * (Math.PI / 2) + 0.5,
                    a1 = a0 + Math.PI / 2 - 1,
                    pts: Pt[] = [];
                for (let k = 0; k <= 8; k++) {
                    const t = a0 + ((a1 - a0) * k) / 8;
                    pts.push([cx + R * Math.cos(t), cy + R * Math.sin(t)]);
                }
                pen.curve(g, pts, "pencil", { strokeWidth: 1.8 });
                const [ex, ey] = pts[8] ?? [0, 0],
                    back = a1 - Math.PI / 2;
                for (const sd of [-1, 1])
                    pen.line(
                        g,
                        ex,
                        ey,
                        ex + 10 * Math.cos(back + sd * 0.5),
                        ey + 10 * Math.sin(back + sd * 0.5),
                        "pencil",
                        { strokeWidth: 1.8 },
                    );
            } else {
                const [x0, y0] = spots[i] ?? [0, 0],
                    [x1] = spots[i + 1] ?? [0, 0];
                pen.arrow(g, [x0 + r * 1.5, y0], [x1 - r * 1.5, y0], c.t.ink, 0.12);
            }
        }
        return a;
    },
    describe: (p) =>
        `Stages of a frog's life set ${p.ring > 0 ? "round a ring" : "along a row"} and joined by arrows, each in its own round patch of water${clamp(p.stage, 0, 4) < 4 ? ", with dashed circles for stages still to come" : ""}.`,
    motion: { still: "Its stages are read in order round the ring." },
});
