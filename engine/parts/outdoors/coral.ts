import { type RawAnchors } from "../../ink/surface";
import { rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, ring, clamp, tapered, spline } from "../animals/nature";

export const coral = defineDrawing({
    id: "coral",
    family: "outdoors",
    title: "Coral reef",
    group: "Props",
    about: "A head of coral on the sand: a round brain coral with its winding grooves, branching coral, tube coral and sea fans like lace. Once a year the coral lets go of its eggs all on one night and they float up like pink snow. The sea fans can be counted, and a reef is a place full of living things to sort.",
    params: { fans: 2, spawn: 0 },
    settings: { fans: { kind: "whole", min: 0, max: 3 }, spawn: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Two sea fans", params: { fans: 2, spawn: 0 } },
        { label: "Spawning, pink snow rising", params: { fans: 3, spawn: 1 } },
        { label: "No fans", params: { fans: 0, spawn: 0 } },
    ],
    box: (p) => ({ w: 14, h: p.spawn > 0 ? 11 : 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            top = p.spawn > 0 ? 3 * U : 0,
            base = top + 7.5 * U,
            n = clamp(p.fans, 0, 3),
            a: RawAnchors = {};
        // the sea fans stand at the back, lace against the water
        const FANS = [
            [11.4, 3.4, 0.18],
            [3.0, 2.9, -0.22],
            [7.6, 4.1, 0.02],
        ] as const;
        for (let i = 0; i < n; i++) {
            const [fx, r, lean] = FANS[i] ?? FANS[0],
                x = fx * U,
                y = base - 1.1 * U,
                R = r * U,
                pts: Pt[] = [[x, y]];
            for (let k = 0; k <= 12; k++) {
                const t = -Math.PI * 0.86 + (k / 12) * Math.PI * 0.72 + lean,
                    wob = 1 + (k % 3 === 1 ? 0.07 : k % 3 === 2 ? -0.04 : 0);
                pts.push([x + Math.cos(t) * R * wob, y + Math.sin(t) * R * wob]);
            }
            pen.polygon(
                g,
                pts,
                "pencil",
                pen.fill("tang", "cross-hatch", { hachureGap: 5.5, fillWeight: 0.8 }),
                { strokeWidth: 1.5 },
            );
            for (let k = 0; k < 5; k++) {
                const t = -Math.PI * 0.8 + (k / 4) * Math.PI * 0.6 + lean;
                pen.curve(
                    g,
                    [
                        [x, y],
                        [x + Math.cos(t) * R * 0.5, y + Math.sin(t) * R * 0.55],
                        [x + Math.cos(t) * R * 0.9, y + Math.sin(t) * R * 0.9],
                    ],
                    "pencil",
                    { strokeWidth: 1.2 },
                );
            }
            a[`fan(${i})`] = [x + Math.cos(-Math.PI / 2 + lean) * R, y - R, "up"];
        }
        // branching coral, its tips paler where it is still growing
        const bx = 9.3 * U,
            tips: Pt[] = [];
        for (const [ang, len, fork] of [
            [-2.35, 2.6, 0],
            [-2.0, 3.5, 1],
            [-1.58, 4.3, 1],
            [-1.12, 3.7, 1],
            [-0.72, 2.7, 0],
        ] as const) {
            const x0 = bx + Math.cos(ang) * 0.35 * U,
                y0 = base - 0.5 * U;
            const tip: Pt = [x0 + Math.cos(ang) * len * U, y0 + Math.sin(ang) * len * U];
            const mid: Pt = [
                x0 + Math.cos(ang + 0.22) * len * 0.55 * U,
                y0 + Math.sin(ang + 0.22) * len * 0.55 * U,
            ];
            const line = spline([[x0, y0], mid, tip], 4);
            pen.polygon(g, tapered(line, 0.8 * U, 0.44 * U), "pencil", pen.fill("berry"), {
                strokeWidth: 1.4,
            });
            pen.circle(g, tip[0], tip[1], 0.46 * U, "pencil", pen.fill("card"), {
                strokeWidth: 1.1,
            });
            tips.push(tip);
            if (fork) {
                const f0 = line[Math.floor(line.length * 0.55)] ?? [0, 0],
                    t2: Pt = [
                        f0[0] + Math.cos(ang + 0.75) * 1.3 * U,
                        f0[1] + Math.sin(ang + 0.75) * 1.3 * U,
                    ];
                pen.polygon(
                    g,
                    tapered(
                        spline([f0, [(f0[0] + t2[0]) / 2 + 4, (f0[1] + t2[1]) / 2], t2], 3),
                        0.55 * U,
                        0.36 * U,
                    ),
                    "pencil",
                    pen.fill("berry"),
                    { strokeWidth: 1.2 },
                );
                pen.circle(g, t2[0], t2[1], 0.36 * U, "pencil", pen.fill("card"), {
                    strokeWidth: 1,
                });
            }
        }
        // tube coral on the left, open at the top
        for (const [dx, h] of [
            [0.9, 1.8],
            [1.6, 2.7],
            [2.3, 1.5],
            [2.95, 2.2],
        ] as const) {
            const x = dx * U,
                y = base - 0.2 * U;
            pen.rect(g, x - 0.28 * U, y - h * U, 0.56 * U, h * U, "pencil", pen.fill("mint"), {
                strokeWidth: 1.3,
            });
            pen.ellipse(
                g,
                x,
                y - h * U,
                0.66 * U,
                0.3 * U,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 2.5 }),
                { strokeWidth: 1.1 },
            );
        }
        // the brain coral, in front, with the grooves it is named for
        const cx = 5.7 * U,
            rw = 2.9 * U,
            rh = 2.5 * U;
        pen.path(
            g,
            `M${cx - rw} ${base}C${cx - rw} ${base - rh * 1.3} ${cx + rw} ${base - rh * 1.3} ${cx + rw} ${base}Z`,
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.9 },
        );
        for (let k = 0; k < 4; k++) {
            const y = base - rh * (0.14 + k * 0.2),
                half = rw * Math.sqrt(Math.max(0, 1 - ((base - y) / (rh * 0.98)) ** 2)) * 0.86,
                pts: Pt[] = [];
            for (let x = -half; x <= half; x += 0.36 * U)
                pts.push([cx + x, y + (Math.round(x / (0.36 * U)) % 2 ? -3.5 : 3.5)]);
            if (pts.length > 2) pen.curve(g, pts, "pencil", { strokeWidth: 1.1, stroke: c.t.tang });
        }
        // the rock the reef stands on
        pen.path(
            g,
            ring([
                [0.3 * U, base + 0.1 * U],
                [2.2 * U, base - 0.35 * U],
                [5 * U, base - 0.1 * U],
                [8.4 * U, base - 0.3 * U],
                [11.6 * U, base - 0.15 * U],
                [13.7 * U, base + 0.1 * U],
                [12.4 * U, base + 0.45 * U],
                [7 * U, base + 0.5 * U],
                [1.6 * U, base + 0.45 * U],
            ]),
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 7, fillWeight: 0.6 }),
            { strokeWidth: 1.6 },
        );
        if (p.spawn > 0) {
            // the spawn: pink eggs rising in plumes from every part of the reef
            const r = rng(71),
                from: Pt[] = [[cx, base - rh * 0.95], [2 * U, base - 2.8 * U], ...tips.slice(1, 4)];
            for (const [sx, sy] of from)
                for (let k = 0; k < 11; k++) {
                    const t = (k + 0.5) / 11,
                        x = sx + (r() - 0.5) * (0.6 + t * 2.6) * U,
                        y = sy - 0.3 * U - t * (sy - 0.4 * U);
                    pen.circle(
                        g,
                        x,
                        y,
                        3 + r() * 4.5,
                        "ruler",
                        pen.fill(k % 3 ? "berry" : "card"),
                        { strokeWidth: 0.8 },
                    );
                }
        }
        a.crown = [cx, base - rh, "up"];
        a.branch = [bx, base - 4.6 * U, "up"];
        a.foot = [7 * U, base + 0.4 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A reef on a rock: a round yellow brain coral, pink branching coral with pale tips and green tubes open at the top${clamp(p.fans, 0, 3) > 0 ? ", orange sea fans behind" : ""}${p.spawn > 0 ? ", pink eggs rising" : ""}.`,
});
