import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, sayOn, soft } from "../lettering";

type Pt = [number, number];

/** A closed shape rounded through its corners, so a lake has banks rather than a set of edges. */
function blob(pts: Pt[]): string {
    const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const start = pts[0] ?? [0, 0],
        last = pts[pts.length - 1] ?? start;
    const first = mid(last, start);
    let d = `M${first[0]} ${first[1]}`;
    for (let i = 0; i < pts.length; i++) {
        const q = pts[i] ?? start,
            m = mid(q, pts[(i + 1) % pts.length] ?? start);
        d += `Q${q[0]} ${q[1]} ${m[0]} ${m[1]}`;
    }
    return `${d}Z`;
}

const segments = (p: { km: number; step: number }): number =>
    Math.max(1, Math.round(p.km / (p.step || 1)));

/** A segment is two whole squares, or one when that is the only way the bar fits across a page. */
const segW = (segs: number): number => (segs * 2 + 6 <= 36 ? 2 : 1);

export const mapScale = defineDrawing({
    id: "mapscale",
    family: "travel",
    title: "Map with a scale",
    group: "Structures",
    about: "A small map with a route across it and a scale bar underneath, marked off in whole kilometres. The bar is the point of the drawing: it turns a length on the paper into a distance on the ground.",
    params: { km: 4, step: 1 },
    settings: { km: { kind: "whole", min: 1, max: 30 }, step: { kind: "whole", min: 1, max: 10 } },
    takes: [
        { label: "Four kilometres", params: { km: 4, step: 1 } },
        { label: "Ten, in twos", params: { km: 10, step: 2 } },
    ],
    box: (p) => ({ w: Math.max(14, segments(p) * segW(segments(p)) + 6), h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            segs = segments(p),
            sw = segW(segs),
            w = Math.max(14, segs * sw + 6) * U;
        const mx = U,
            mw = w - 2 * U,
            my = U,
            mh = 8 * U,
            a: RawAnchors = {};
        pen.path(g, roundedRect(mx, my, mw, mh, 8), "ruler", pen.fill("card"), {
            strokeWidth: 2.2,
        });
        // A lake, a couple of roads and the route: enough for the map to be a place, not a diagram.
        const lake: Pt[] = [
            [0.13, 0.68],
            [0.24, 0.62],
            [0.34, 0.71],
            [0.31, 0.85],
            [0.18, 0.89],
            [0.09, 0.8],
        ];
        pen.path(
            g,
            blob(lake.map(([fx, fy]) => [mx + fx * mw, my + fy * mh] as Pt)),
            "pencil",
            pen.fill("sky", "solid", { hachureGap: 10, fillWeight: 0.5 }),
            { strokeWidth: 1.6 },
        );
        pen.line(g, mx + 8, my + 0.26 * mh, mx + mw - 8, my + 0.4 * mh, "pencil", {
            strokeWidth: 3,
            stroke: c.t["ink-soft"],
        });
        pen.line(g, mx + 0.66 * mw, my + 12, mx + 0.56 * mw, my + mh - 12, "pencil", {
            strokeWidth: 3,
            stroke: c.t["ink-soft"],
        });
        const A: Pt = [mx + 0.2 * mw, my + 0.24 * mh],
            B: Pt = [mx + 0.8 * mw, my + 0.66 * mh];
        pen.curve(
            g,
            [A, [mx + 0.44 * mw, my + 0.3 * mh], [mx + 0.6 * mw, my + 0.6 * mh], B],
            "pencil",
            { strokeWidth: 2.6, stroke: c.t.pen },
        );
        for (const [q, name] of [
            [A, "A"],
            [B, "B"],
        ] as const) {
            pen.circle(g, q[0], q[1], 0.6 * U, "ruler", pen.fill("berry"), { strokeWidth: 1.6 });
            sayOn(c, q[0], q[1] - 0.7 * U, name, 15);
        }
        const bx = (w - segs * sw * U) / 2,
            by = 10 * U,
            bh = 0.6 * U;
        for (let k = 0; k < segs; k++) {
            if (k % 2 === 0)
                pen.rect(
                    g,
                    bx + k * sw * U,
                    by,
                    sw * U,
                    bh,
                    "ruler",
                    { fill: c.t.ink, fillStyle: "solid" },
                    { strokeWidth: 0 },
                );
        }
        pen.rect(g, bx, by, segs * sw * U, bh, "ruler", null, { strokeWidth: 1.8 });
        for (let k = 0; k <= segs; k++) {
            const tx = bx + k * sw * U;
            pen.line(g, tx, by + bh, tx, by + bh + 0.3 * U, "ruler", { strokeWidth: 1.4 });
            num(c, tx, by + 1.7 * U, k * p.step, 14);
            a[`mark(${k * p.step})`] = [tx, by, "up"];
        }
        soft(c, bx + segs * sw * U + 0.6 * U, by + 1.7 * U, "km", 13, "start");
        a.route = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, "up"];
        a.scale = [bx + (segs * sw * U) / 2, by + bh, "down"];
        return a;
    },
    describe: () =>
        "A small map on a card with a lake, two roads and a route from A to B, and a black and white scale bar underneath marked off in kilometres.",
    reads: true,
});
