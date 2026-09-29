import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";
import { loop } from "../marks";
import { type Pt } from "./kit";

const W = 16,
    H = 11,
    TOP = 4,
    BOTTOM = 9;
/** Where the five lettered dots stand on the horizon, in squares; both points must be among them. */
const DOTS = [1, 4, 8, 12, 15];
/** How far along each side the far corner is, as a share of the way to that side's point. */
const DEPTH = 0.5;

const within = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, Math.round(v)));

/** Where the line from `a` towards `b` crosses the upright line at `x`. */
const atX = ([ax, ay]: Pt, [bx, by]: Pt, x: number): Pt => [
    x,
    ay + ((by - ay) * (x - ax)) / (bx - ax || 1),
];

/** Where the line through a and b meets the line through c and d. */
function meet([ax, ay]: Pt, [bx, by]: Pt, [cx, cy]: Pt, [dx, dy]: Pt): Pt {
    const d = (ax - bx) * (cy - dy) - (ay - by) * (cx - dx) || 1,
        s = ax * by - ay * bx,
        t = cx * dy - cy * dx;
    return [(s * (cx - dx) - (ax - bx) * t) / d, (s * (cy - dy) - (ay - by) * t) / d];
}

const lerp = ([ax, ay]: Pt, [bx, by]: Pt, t: number): Pt => [
    ax + (bx - ax) * t,
    ay + (by - ay) * t,
];

export const twoPoint = defineDrawing({
    id: "twopoint",
    family: "art",
    title: "A box in two-point perspective",
    group: "Structures",
    about: "A box seen corner-on, the way a hut or a crate is seen from beside it: its nearest upright edge drawn first, and the edges along each side ruled back to their own vanishing point, one at each end of the horizon. Upright lines stay upright. With the horizon above the box its top shows. It can be drawn at the first stage (the horizon, the two points and the near edge), with the lines ruled to both points, or finished, with a door and a window, its edges lettered, one ruled wrong, or the points hidden among five dots.",
    params: {
        horizon: 2,
        left: 1,
        right: 15,
        corner: 8,
        stage: 3,
        door: true,
        letters: false,
        wrong: -1,
        dots: false,
        guide: false,
        ring: false,
    },
    settings: {
        horizon: { kind: "whole", min: 1, max: 9 },
        left: { kind: "whole", min: 1, max: 4 },
        right: { kind: "whole", min: 12, max: 15 },
        corner: { kind: "whole", min: 6, max: 10 },
        stage: { kind: "whole", min: 1, max: 3 },
        door: { kind: "flag" },
        letters: { kind: "flag" },
        wrong: { kind: "whole", min: -1, max: 3 },
        dots: { kind: "flag" },
        guide: { kind: "flag" },
        ring: { kind: "flag" },
    },
    takes: [
        {
            label: "From above, guide lines ruled",
            params: {
                horizon: 2,
                left: 1,
                right: 15,
                corner: 8,
                stage: 3,
                door: true,
                letters: false,
                wrong: -1,
                dots: false,
                guide: true,
                ring: true,
            },
        },
        {
            label: "At eye level, one edge wrong",
            params: {
                horizon: 6,
                left: 1,
                right: 15,
                corner: 7,
                stage: 3,
                door: false,
                letters: true,
                wrong: 2,
                dots: false,
                guide: false,
                ring: false,
            },
        },
        {
            label: "The first stage",
            params: {
                horizon: 3,
                left: 2,
                right: 14,
                corner: 9,
                stage: 1,
                door: false,
                letters: false,
                wrong: -1,
                dots: false,
                guide: false,
                ring: false,
            },
        },
        {
            label: "Five dots to choose from",
            params: {
                horizon: 2,
                left: 4,
                right: 15,
                corner: 9,
                stage: 3,
                door: true,
                letters: false,
                wrong: -1,
                dots: true,
                guide: false,
                ring: false,
            },
        },
    ],
    box: () => ({ w: W, h: H }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            hy = within(p.horizon, 1, 9) * U,
            stage = within(p.stage, 1, 3),
            wrong = within(p.wrong, -1, 3),
            cx = within(p.corner, 6, 10) * U,
            vl: Pt = [within(p.left, 1, 4) * U, hy],
            vr: Pt = [within(p.right, 12, 15) * U, hy],
            nt: Pt = [cx, TOP * U],
            nb: Pt = [cx, BOTTOM * U],
            xl = cx + (vl[0] - cx) * DEPTH,
            xr = cx + (vr[0] - cx) * DEPTH;
        // an edge ruled wrong aims at a point well off the horizon, far enough to see with a ruler
        const aims: Pt[] = [vl, vl, vr, vr].map(([x, y], i) =>
            i === wrong ? [x, y + (i % 2 === 0 ? -2.2 : 2.2) * U] : [x, y],
        );
        const starts = [nt, nb, nt, nb];
        const ends = starts.map((s, i) => atX(s, aims[i] ?? s, i < 2 ? xl : xr));
        const [lt, lb, rt, rb] = [ends[0] ?? nt, ends[1] ?? nb, ends[2] ?? nt, ends[3] ?? nb];
        const soft = { strokeWidth: 1.1, stroke: c.t.pen, strokeLineDash: [5, 5] };
        pen.line(g, 0, hy, W * U, hy, "ruler", { strokeWidth: 1.2, stroke: c.t["ink-soft"] });
        if (stage === 3) {
            pen.polygon(
                g,
                [nt, lt, lb, nb],
                "pencil",
                pen.fill("sky", "hachure", { hachureGap: 8, fillWeight: 0.5 }),
                { strokeWidth: 0 },
            );
            pen.polygon(
                g,
                [nt, rt, rb, nb],
                "pencil",
                pen.fill("sky", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
                { strokeWidth: 0 },
            );
            if (hy < TOP * U) {
                const far = meet(lt, vr, rt, vl);
                pen.polygon(g, [nt, lt, far, rt], "pencil", pen.fill("card"), {
                    strokeWidth: 2,
                });
                a.top = [(nt[0] + far[0]) / 2, (nt[1] + far[1]) / 2, "up"];
            }
            if (p.door) {
                // a door on the left side and a window on the right, their tops ruled to each side's point
                const on = (s0: Pt, s1: Pt, e0: Pt, e1: Pt, u: number, v: number): Pt =>
                    lerp(lerp(s1, e1, u), lerp(s0, e0, u), v);
                const door: Pt[] = [
                    on(nt, nb, lt, lb, 0.3, 0),
                    on(nt, nb, lt, lb, 0.3, 0.62),
                    on(nt, nb, lt, lb, 0.62, 0.62),
                    on(nt, nb, lt, lb, 0.62, 0),
                ];
                pen.polygon(g, door, "pencil", pen.fill("tang"), { strokeWidth: 1.5 });
                const win: Pt[] = [
                    on(nt, nb, rt, rb, 0.3, 0.4),
                    on(nt, nb, rt, rb, 0.3, 0.72),
                    on(nt, nb, rt, rb, 0.66, 0.72),
                    on(nt, nb, rt, rb, 0.66, 0.4),
                ];
                pen.polygon(g, win, "pencil", pen.fill("card"), { strokeWidth: 1.5 });
            }
            pen.line(g, lt[0], lt[1], lb[0], lb[1], "ruler", { strokeWidth: 2 });
            pen.line(g, rt[0], rt[1], rb[0], rb[1], "ruler", { strokeWidth: 2 });
        }
        pen.line(g, nt[0], nt[1], nb[0], nb[1], "ruler", { strokeWidth: 2.4 });
        starts.forEach((s, i) => {
            const e = ends[i] ?? s,
                aim = aims[i] ?? s;
            if (stage === 2) {
                pen.line(g, s[0], s[1], aim[0], aim[1], "ruler", { strokeWidth: 1.4 });
                return;
            }
            if (stage === 1) return;
            pen.line(g, s[0], s[1], e[0], e[1], "ruler", { strokeWidth: 2.2 });
            if (p.guide && !p.dots) pen.line(g, e[0], e[1], aim[0], aim[1], "ruler", soft);
            const mid = lerp(s, e, 0.5),
                off = i % 2 === 0 ? -0.8 * U : 1.25 * U;
            if (p.letters) {
                patch(c, mid[0], mid[1] + off - 6, 20, 20);
                num(c, mid[0], mid[1] + off, "ABCD"[i] ?? "", 16);
            }
            a[`edge(${i})`] = [mid[0], mid[1], "up"];
        });
        if (p.dots)
            DOTS.forEach((x, i) => {
                const dx = x * U;
                pen.circle(
                    g,
                    dx,
                    hy,
                    9,
                    "ruler",
                    { fill: c.t.ink, fillStyle: "solid" },
                    {
                        strokeWidth: 0.8,
                    },
                );
                patch(c, dx, hy - 22, 20, 20);
                num(c, dx, hy - 8, "ABCDE"[i] ?? "", 16);
                a[`dot(${i})`] = [dx, hy - U, "up"];
            });
        else
            for (const [x, y] of [vl, vr])
                pen.circle(
                    g,
                    x,
                    y,
                    9,
                    "ruler",
                    { fill: c.t.ink, fillStyle: "solid" },
                    {
                        strokeWidth: 0.8,
                    },
                );
        if (p.ring) for (const [x, y] of [vl, vr]) loop(c, x, y, 1.6 * U, 1.6 * U);
        a.horizon = [0.5 * U, hy, "up"];
        a["vp(0)"] = [vl[0], hy, "up"];
        a["vp(1)"] = [vr[0], hy, "up"];
        a.corner = [nt[0], nt[1], "up"];
        a.box = [cx, (TOP + BOTTOM) * 0.5 * U, "up"];
        return a;
    },
    describe: (p) => {
        const hy = within(p.horizon, 1, 9),
            stage = within(p.stage, 1, 3);
        const what =
            stage === 1
                ? "a horizon ruled across with a vanishing point at each end of it, and the one upright edge a box is drawn from"
                : stage === 2
                  ? "an upright edge with lines ruled from both its ends to a dot at each end of the horizon"
                  : `a corner-on box, its sides ruled to two points on a horizon ${hy < TOP ? "above it, its top showing" : hy > BOTTOM - 1 ? "at its foot" : "across its middle"}`;
        return `${what[0]?.toUpperCase() ?? ""}${what.slice(1)}${stage === 3 && p.door ? " with a door and a window" : ""}${stage === 3 && p.letters ? ", edges lettered" : ""}${p.dots ? ", five dots on the horizon" : ""}.`;
    },
});
