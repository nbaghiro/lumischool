import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash } from "../outdoors/wash";

const DIRS = [
    "right",
    "down-right",
    "down",
    "down-left",
    "left",
    "up-left",
    "up",
    "up-right",
] as const;

type P = readonly [number, number];

/** The way downhill as a unit vector, y growing downwards. */
const downhill = (dir: string): P => {
    const i = Math.max(
        0,
        DIRS.findIndex((d) => d === dir),
    );
    const a = (i * Math.PI) / 4;
    return [Math.cos(a), Math.sin(a)];
};

/** The part of a w by h box whose distance along `u` from its middle lies between `t0` and `t1`. */
function slab(w: number, h: number, u: P, t0: number, t1: number): P[] {
    let poly: P[] = [
        [0, 0],
        [w, 0],
        [w, h],
        [0, h],
    ];
    const along = (p: P) => (p[0] - w / 2) * u[0] + (p[1] - h / 2) * u[1];
    for (const [t, keepAbove] of [
        [t0, true],
        [t1, false],
    ] as const) {
        const inside = (p: P) => (keepAbove ? along(p) >= t : along(p) <= t);
        const out: P[] = [];
        poly.forEach((p, i) => {
            const q = poly[(i + 1) % poly.length] ?? p;
            const pi = inside(p),
                qi = inside(q);
            if (pi) out.push(p);
            if (pi !== qi) {
                const k = (t - along(p)) / (along(q) - along(p));
                out.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]);
            }
        });
        poly = out;
    }
    return poly;
}

const pathOf = (poly: P[]) =>
    poly.length ? `M${poly.map((p) => `${p[0]} ${p[1]}`).join("L")}Z` : "";

export const golfSlope = defineDrawing<{
    dir: string;
    steep: number;
    width: number;
    height: number;
}>({
    id: "golfslope",
    family: "sport",
    title: "Sloping lawn",
    group: "Props",
    about: "A rise in a putting lawn seen from above: green that deepens towards the low side, contour lines closer together where it is steeper, and grass tufts leaning downhill.",
    params: { dir: "down", steep: 1, width: 10, height: 8 },
    settings: {
        dir: { kind: "one of", of: DIRS },
        steep: { kind: "number", min: 0.4, max: 2, step: 0.1 },
        width: { kind: "number", min: 2, max: 24, step: 0.5 },
        height: { kind: "number", min: 2, max: 24, step: 0.5 },
    },
    takes: [
        { label: "Down the page", params: { dir: "down", steep: 1, width: 10, height: 8 } },
        { label: "Steep, to the left", params: { dir: "left", steep: 1.8, width: 8, height: 8 } },
        {
            label: "Gentle, to a corner",
            params: { dir: "down-right", steep: 0.6, width: 12, height: 8 },
        },
    ],
    box: (p) => ({ w: p.width, h: p.height }),
    draw: (c, p) => {
        const w = p.width * U,
            h = p.height * U,
            u = downhill(p.dir),
            v: P = [-u[1], u[0]],
            reach = (Math.abs(u[0]) * w + Math.abs(u[1]) * h) / 2,
            // a contour every so many squares downhill: closer on a steeper slope
            gap = (2.2 / Math.max(0.4, p.steep)) * U,
            bands = Math.max(3, Math.round((2 * reach) / gap));
        if (!c.paper) {
            for (let k = 0; k < bands; k++) {
                const t0 = -reach + (2 * reach * k) / bands,
                    t1 = -reach + (2 * reach * (k + 1)) / bands;
                const d = pathOf(slab(w, h, u, t0, t1));
                if (d)
                    plain(c, {
                        kind: "path",
                        d,
                        fill: c.t.mint,
                        opacity: 0.04 + (0.26 * k) / Math.max(1, bands - 1),
                    });
            }
            // light on the high edge, and the bank's shadow along the low one
            const high = pathOf(slab(w, h, u, -reach, -reach + 0.5 * U));
            if (high) plain(c, { kind: "path", d: high, fill: c.t.card, opacity: 0.55 });
            const low = pathOf(slab(w, h, u, reach - 0.7 * U, reach));
            if (low) plain(c, { kind: "path", d: low, fill: c.t.ok, opacity: 0.14 });
        }
        // contour lines across the slope, bowed downhill in the middle so the rise reads as a rounded
        // shoulder, faint, and kept off the box's sides so its edge stays soft
        for (let k = 1; k < bands; k++) {
            const t = -reach + (2 * reach * k) / bands,
                mid: P = [w / 2 + u[0] * t, h / 2 + u[1] * t],
                run = Math.abs(v[0]) * w + Math.abs(v[1]) * h,
                pts: P[] = [];
            for (let s = -run / 2; s <= run / 2; s += 0.5 * U) {
                const f = (2 * s) / run,
                    bow = 1.1 * U * (1 - f * f) + (hash(k, s) - 0.5) * 0.12 * U,
                    x = mid[0] + v[0] * s + u[0] * bow,
                    y = mid[1] + v[1] * s + u[1] * bow;
                if (x > 0.6 * U && x < w - 0.6 * U && y > 0.6 * U && y < h - 0.6 * U)
                    pts.push([x, y]);
            }
            if (pts.length < 2) continue;
            plain(c, {
                kind: "path",
                d: `M${pts.map((q) => `${q[0]} ${q[1]}`).join("L")}`,
                fill: "none",
                stroke: c.t.ok,
                width: 1.1,
                cap: "round",
                join: "round",
                opacity: c.paper ? 0.5 : 0.3 + (0.25 * k) / bands,
            });
        }
        // a few tufts of grass leaning downhill
        for (let y = 1.5 * U; y < h - U; y += 3 * U)
            for (let x = 1.5 * U; x < w - U; x += 3.4 * U) {
                const k = hash(x, y, 3);
                if (k < 0.5) continue;
                const bx = x + (k - 0.5) * U,
                    by = y + (hash(y, x, 5) - 0.5) * U;
                for (const off of [-0.18, 0, 0.18]) {
                    const sx = bx + v[0] * off * U,
                        sy = by + v[1] * off * U,
                        lean = 0.42 * U;
                    c.pen.path(
                        c.g,
                        `M${sx} ${sy}L${sx + u[0] * lean + v[0] * off * 0.6 * U} ${sy + u[1] * lean + v[1] * off * 0.6 * U}`,
                        "pencil",
                        null,
                        { strokeWidth: 1, stroke: c.t.ok },
                    );
                }
            }
        return {};
    },
    describe: (p) =>
        `A sloping patch of putting lawn seen from above, its green deepening towards the ${p.dir.replace("-", " and ")} side, with contour lines and grass tufts leaning downhill.`,
    motion: { still: "A slope is part of the lawn and never moves." },
});
