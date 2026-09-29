import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch } from "../lettering";
import { loop } from "../marks";
import { type Pt } from "./kit";

const W = 16,
    H = 10;
/** Where the four lines along the ground start at the front edge, in squares: towpath, water, water, towpath. */
const NEAR = [0.4, 4.4, 11.6, 15.6];
/** How far towards the vanishing point the canal is drawn before the far bridge stops it. */
const FAR = 0.72;

const within = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, Math.round(v)));

export const perspective = defineDrawing({
    id: "perspective",
    family: "art",
    title: "Looking down the canal",
    group: "Structures",
    about: "A canal drawn in one-point perspective: the horizon at the eye's height, the banks and the water's edges running back to one vanishing point, mooring posts that shrink as they go, and a wall whose top slopes down to the point. The lines can be lettered, one drawn wrong, the point hidden among three to choose from, or the guide lines ruled on to it.",
    params: {
        horizon: 4,
        vp: 8,
        posts: 4,
        wall: false,
        letters: false,
        wrong: -1,
        dots: false,
        guide: false,
        ring: false,
    },
    settings: {
        horizon: { kind: "whole", min: 2, max: 6 },
        vp: { kind: "whole", min: 3, max: 13 },
        posts: { kind: "whole", min: 0, max: 5 },
        wall: { kind: "flag" },
        letters: { kind: "flag" },
        wrong: { kind: "whole", min: -1, max: 3 },
        dots: { kind: "flag" },
        guide: { kind: "flag" },
        ring: { kind: "flag" },
    },
    takes: [
        {
            label: "The canal, guide lines ruled",
            params: {
                horizon: 4,
                vp: 8,
                posts: 4,
                wall: false,
                letters: false,
                wrong: -1,
                dots: false,
                guide: true,
                ring: true,
            },
        },
        {
            label: "Lettered, one line wrong",
            params: {
                horizon: 3,
                vp: 8,
                posts: 3,
                wall: false,
                letters: true,
                wrong: 2,
                dots: false,
                guide: false,
                ring: false,
            },
        },
        {
            label: "The wall above the eye",
            params: {
                horizon: 5,
                vp: 10,
                posts: 2,
                wall: true,
                letters: false,
                wrong: -1,
                dots: false,
                guide: false,
                ring: false,
            },
        },
        {
            label: "Three points to choose from",
            params: {
                horizon: 4,
                vp: 12,
                posts: 3,
                wall: false,
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
            hy = within(p.horizon, 2, 6) * U,
            vx = within(p.vp, 3, 13) * U,
            bottom = (H - 0.3) * U,
            wrong = within(p.wrong, -1, 3);
        // a wrong line is aimed at a point above the vanishing point, far enough to see with a ruler
        const aim = (i: number): Pt => [vx, i === wrong ? hy - 1.4 * U : hy];
        const along = (i: number, t: number, [ax, ay]: Pt): Pt => {
            const x0 = (NEAR[i] ?? 0) * U;
            return [x0 + (ax - x0) * t, bottom + (ay - bottom) * t];
        };
        const at = (i: number, t: number): Pt => along(i, t, aim(i));
        // the posts and the wall stand on the true lines, so a wrong line is the only thing wrong
        const truly = (i: number, t: number): Pt => along(i, t, [vx, hy]);
        // every line stops level with the bridge's foot, a wrong one too, so none runs up into the bridge
        const end = (i: number): number => (FAR * (bottom - hy)) / (bottom - (aim(i)[1] ?? hy));
        pen.line(g, 0.2 * U, hy, (W - 0.2) * U, hy, "ruler", {
            strokeWidth: 1.2,
            stroke: c.t["ink-soft"],
        });
        pen.polygon(
            g,
            [at(1, 0), at(2, 0), at(2, end(2)), at(1, end(1))],
            "ruler",
            pen.fill("sky"),
            {
                strokeWidth: 0,
            },
        );
        for (const [i, j] of [
            [0, 1],
            [2, 3],
        ] as const)
            pen.polygon(
                g,
                [at(i, 0), at(j, 0), at(j, end(j)), at(i, end(i))],
                "pencil",
                pen.fill("glow", "hachure", { hachureGap: 7, fillWeight: 0.5 }),
                { strokeWidth: 0 },
            );
        for (let i = 0; i < 4; i++) {
            const [x0, y0] = at(i, 0),
                [x1, y1] = at(i, end(i));
            pen.line(g, x0, y0, x1, y1, "ruler", { strokeWidth: 2.2 });
            if (p.guide) {
                const [x2, y2] = at(i, 1);
                pen.line(g, x1, y1, x2, y2, "ruler", {
                    strokeWidth: 1.1,
                    stroke: c.t.pen,
                    strokeLineDash: [5, 5],
                });
            }
            if (p.letters && !p.dots) {
                // beside the line, clear of where it has leant in by the top of its patch
                const slope = Math.abs(x1 - x0) / Math.max(1, y0 - y1),
                    lx = x0 + (i < 2 ? 1 : -1) * (24 * slope + 9);
                patch(c, lx, y0 - 14, 14, 18);
                num(c, lx, y0 - 8, "ABCD"[i] ?? "", 16);
            }
            a[`line(${i})`] = [x0, y0 - U, "up"];
        }
        // the far bridge closes the canal where the drawn lines stop
        const [bl, by] = truly(1, FAR),
            [br] = truly(2, FAR),
            span = br - bl;
        pen.path(
            g,
            `M${bl - span * 0.3} ${by}L${bl - span * 0.3} ${by - span * 0.55}L${br + span * 0.3} ${by - span * 0.55}L${br + span * 0.3} ${by}L${br} ${by}Q${(bl + br) / 2} ${by - span * 0.8} ${bl} ${by}Z`,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.5 }),
            { strokeWidth: 1.4 },
        );
        const count = within(p.posts, 0, 5);
        for (let k = 0; k < count; k++) {
            const t = 1 - 0.9 / (1 + 0.55 * k),
                [x2, y2] = truly(2, t),
                [x3] = truly(3, t),
                x = (x2 + x3) / 2,
                tall = 3 * U * (1 - t),
                wide = 0.6 * U * (1 - t);
            pen.rect(g, x - wide / 2, y2 - tall, wide, tall, "pencil", pen.fill("tang"), {
                strokeWidth: 1.4,
            });
            a[`post(${k})`] = [x, y2 - tall, "up"];
        }
        if (p.wall) {
            // the wall stands on the left towpath's outer line and rises well above the eye
            const top = (t: number): Pt => {
                const [x, y] = truly(0, t);
                return [x, y - (bottom - U) * (1 - t)];
            };
            const face = (t: number, s: number): Pt => {
                const [x, y] = truly(0, t),
                    [, ty] = top(t);
                return [x, y + (ty - y) * s];
            };
            pen.polygon(
                g,
                [truly(0, 0), truly(0, 0.6), top(0.6), top(0)],
                "pencil",
                pen.fill("berry", "hachure", { hachureGap: 8, fillWeight: 0.4 }),
                { strokeWidth: 2 },
            );
            for (const [t0, t1] of [
                [0.06, 0.16],
                [0.26, 0.33],
                [0.42, 0.47],
            ] as const)
                pen.polygon(
                    g,
                    [face(t0, 0.55), face(t1, 0.55), face(t1, 0.8), face(t0, 0.8)],
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.3 },
                );
            const [tx, ty] = top(0.3);
            a.wall = [tx, ty, "up"];
        }
        if (p.dots)
            ["A", "B", "C"].forEach((name, i) => {
                const x = (4 + i * 4) * U;
                pen.circle(
                    g,
                    x,
                    hy,
                    9,
                    "ruler",
                    { fill: c.t.ink, fillStyle: "solid" },
                    { strokeWidth: 0.8 },
                );
                patch(c, x, hy - 22, 20, 20);
                num(c, x, hy - 8, name, 16);
                a[`dot(${i})`] = [x, hy - U, "up"];
            });
        if (p.ring) loop(c, vx, hy, 1.6 * U, 1.6 * U);
        a.horizon = [0.5 * U, hy, "up"];
        a.vp = [vx, hy, "up"];
        return a;
    },
    describe: (p) =>
        `A canal between towpaths, its edges ruled towards a horizon line, a bridge far off${within(p.posts, 0, 5) ? ", posts shrinking on the right" : ""}${p.wall ? ", a wall on the left" : ""}${p.letters && !p.dots ? ", the four edges lettered" : ""}${p.dots ? ", dots lettered on the horizon" : ""}.`,
});
