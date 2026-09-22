import { part, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const W = 7 * U;
const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const at = (pts: readonly Pt[], i: number): Pt => pts[i] ?? [0, 0];
const lerpPt = (p: Pt, q: Pt, t: number): Pt => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
];
const f1 = (n: number) => n.toFixed(1);

/** A smooth line on from the first point through every other (Catmull-Rom as cubic curves), without the move to its start. */
function curveThrough(pts: readonly Pt[]): string {
    let d = "";
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = at(pts, Math.max(0, i - 1));
        const p1 = at(pts, i);
        const p2 = at(pts, i + 1);
        const p3 = at(pts, Math.min(pts.length - 1, i + 2));
        d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d;
}

/** A closed outline through every point, as the same cubic curves carried round past the start. */
function through(pts: readonly Pt[]): string {
    const round = (i: number) => at(pts, (i + pts.length) % pts.length);
    const first = round(0);
    let d = `M${f1(first[0])} ${f1(first[1])}`;
    for (let i = 0; i < pts.length; i++) {
        const p0 = round(i - 1);
        const p1 = round(i);
        const p2 = round(i + 1);
        const p3 = round(i + 2);
        d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return `${d}Z`;
}

// A wing seen from in front, in squares out from the middle of the body and from the shoulder line: the
// leading edge from the shoulder out to the tip, then the notches between the feather ends back in. The
// first five are between the long primaries, the fingers an owl spreads at the end of each wing.
const LEADING: readonly Pt[] = [
    [0.5, -0.2],
    [1.2, -0.7],
    [2, -0.92],
    [2.8, -0.86],
    [3.35, -0.6],
];
const NOTCHES: readonly Pt[] = [
    [3.45, -0.22],
    [3.28, 0.1],
    [3.02, 0.36],
    [2.7, 0.54],
    [2.34, 0.64],
    [1.9, 0.66],
    [1.46, 0.66],
    [1.02, 0.6],
    [0.6, 0.48],
];
const FINGERS = 5;
/** The pale rim of the face, heart-shaped over the eyes, in squares from the middle of the head. */
const DISC: readonly Pt[] = [
    [0, -0.42],
    [0.3, -0.56],
    [0.56, -0.36],
    [0.6, 0],
    [0.42, 0.36],
    [0, 0.56],
    [-0.42, 0.36],
    [-0.6, 0],
    [-0.56, -0.36],
    [-0.3, -0.56],
];

export const owlFlying = defineDrawing({
    id: "owlflying",
    family: "animals",
    title: "Owl in flight",
    group: "Characters",
    about: "A tawny owl in flight, seen from in front: broad rounded wings spread wide, barred, with the long feathers at the tips spread like fingers, and a round head with a pale face turned towards us, two dark eyes and a small hooked beak.",
    params: { facing: 1 },
    settings: { facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "Facing right", params: { facing: 1 } },
        { label: "Facing left", params: { facing: -1 } },
    ],
    box: () => ({ w: 7, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const s = p.facing < 0 ? -1 : 1;
        const cx = 3.5 * U;
        const shoulders = 1.9 * U;
        const a: RawAnchors = {};
        const X = (x: number) => (s > 0 ? x : W - x);
        const coat = pen.fill("tang", "solid", { hachureGap: 6.5, fillWeight: 0.6 });
        const bar = { ...calm(c, 1.2), stroke: c.t["ink-soft"] };
        const tail = `M${X(cx - 0.42 * U)} ${3 * U}Q${X(cx - 0.5 * U)} ${3.95 * U} ${X(cx)} ${3.9 * U}Q${X(cx + 0.5 * U)} ${3.95 * U} ${X(cx + 0.42 * U)} ${3 * U}Z`;
        pen.path(g, tail, "pencil", coat, calm(c, 1.6));
        for (const y of [3.4, 3.65])
            pen.line(g, X(cx - 0.36 * U), y * U, X(cx + 0.36 * U), y * U, "pencil", bar);
        // the wing on the side it flies towards is lifted a little, and the other held lower
        for (const [side, raise, reach] of [
            [-1, 0.12, 0.95],
            [1, -0.14, 1],
        ] as const) {
            const on = ([x, y]: Pt): Pt => [
                X(cx + side * x * reach * U),
                shoulders + (y + raise * (x / 3.4)) * U,
            ];
            const lead = LEADING.map(on);
            const notches = NOTCHES.map(on);
            const root = on([0.46, 0.3]);
            const inside = on([1.9, 0]);
            const start = at(lead, 0);
            let d = `M${f1(start[0])} ${f1(start[1])}${curveThrough(lead)}`;
            let from = at(lead, lead.length - 1);
            for (const to of [...notches, root]) {
                // each feather end bulges out between two notches, away from the middle of the wing
                const mx = (from[0] + to[0]) / 2;
                const my = (from[1] + to[1]) / 2;
                const ex = to[0] - from[0];
                const ey = to[1] - from[1];
                const out = ey * (inside[0] - mx) - ex * (inside[1] - my) > 0 ? -1 : 1;
                d += `Q${f1(mx - ey * 0.3 * out)} ${f1(my + ex * 0.3 * out)} ${f1(to[0])} ${f1(to[1])}`;
                from = to;
            }
            const wing = part(c, "wing", on([0.6, 0]), { dir: side * s }).g;
            pen.path(wing, `${d}Z`, "pencil", coat, calm(c, 1.7));
            const toLead = (i: number, f: number) =>
                lerpPt(at(notches, i), at(lead, Math.round(4 - (i * 4) / (notches.length - 1))), f);
            // the long flight feathers are darker on screen; bars cross each feather on its own, as they do on the bird
            if (!c.paper) {
                const dark = [
                    ...notches.slice(0, 6),
                    ...Array.from({ length: 6 }, (_, k) => toLead(5 - k, 0.4)),
                ];
                const shade = pen.fill("ink-soft", "hachure", { hachureGap: 4.6, fillWeight: 0.6 });
                // The notches are passed as they are, not copied: rough.js's hachure turns them in
                // place and back, and the bars below are drawn from them as turned. TODO: the pen
                // copies points, in its own change with a new baseline.
                pen.polygon(wing, dark, "pencil", shade, { stroke: "none" });
            }
            for (let i = 0; i < notches.length - 1; i++) {
                for (const f of [0.16, 0.34]) {
                    const [x1, y1] = lerpPt(toLead(i, f), toLead(i + 1, f), 0.22);
                    const [x2, y2] = lerpPt(toLead(i, f), toLead(i + 1, f), 0.78);
                    pen.line(wing, x1, y1, x2, y2, "pencil", bar);
                }
            }
            for (let i = 0; i < FINGERS; i++) {
                const [x, y] = at(notches, i);
                const k = (0.48 * U) / Math.hypot(inside[0] - x, inside[1] - y);
                pen.line(
                    wing,
                    x,
                    y,
                    x + (inside[0] - x) * k,
                    y + (inside[1] - y) * k,
                    "pencil",
                    calm(c, 1.2),
                );
            }
            const tip = lerpPt(at(lead, lead.length - 1), at(notches, 0), 0.5);
            a[`wing(${side * s > 0 ? 1 : 0})`] = [tip[0], tip[1], side * s > 0 ? "right" : "left"];
        }
        for (const dx of [-0.22, 0.22]) {
            pen.ellipse(
                g,
                X(cx + dx * U),
                3.22 * U,
                0.26 * U,
                0.3 * U,
                "pencil",
                pen.fill("card"),
                calm(c, 1.2),
            );
            for (const k of [-1, 1]) {
                pen.line(
                    g,
                    X(cx + (dx + k * 0.06) * U),
                    3.34 * U,
                    X(cx + (dx + k * 0.08) * U),
                    3.46 * U,
                    "ruler",
                    { strokeWidth: 1.1 },
                );
            }
        }
        pen.ellipse(g, X(cx - 0.05 * U), 2.4 * U, 1.3 * U, 1.75 * U, "pencil", coat, calm(c, 1.7));
        for (const [dx, dy] of [
            [-0.28, 2.3],
            [0, 2.55],
            [0.26, 2.3],
            [-0.12, 2.85],
            [0.16, 2.85],
        ] as const) {
            pen.line(
                g,
                X(cx + dx * U),
                dy * U,
                X(cx + (dx - 0.02) * U),
                (dy + 0.22) * U,
                "pencil",
                bar,
            );
        }
        const hx = X(cx);
        const hy = 1.42 * U;
        const face = (dx: number, dy: number): Pt => [X(cx + (0.05 + dx) * U), hy + dy * U];
        pen.circle(g, hx, hy, 1.48 * U, "pencil", coat, calm(c, 1.7));
        pen.path(
            g,
            through(DISC.map(([dx, dy]) => face(dx, dy))),
            "pencil",
            pen.fill("card"),
            calm(c, 1.2),
        );
        for (const k of [-1, 1]) {
            const brow = [face(k * 0.46, -0.3), face(k * 0.26, -0.3), face(k * 0.06, -0.12)];
            pen.curve(g, brow, "pencil", bar);
            const [ex, ey] = face(k * 0.25, -0.06);
            pen.circle(
                g,
                ex,
                ey,
                0.34 * U,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 1 },
            );
            pen.circle(
                g,
                ex + 1.6,
                ey - 1.6,
                2.4,
                "ruler",
                { fill: c.t.card, fillStyle: "solid" },
                { stroke: "none" },
            );
        }
        const beak = [face(-0.08, 0.08), face(0.08, 0.08), face(0.01, 0.36)];
        pen.polygon(g, beak, "ruler", pen.fill("glow"), {
            strokeWidth: 1.1,
            preserveVertices: true,
        });
        a.head = [hx, hy - 0.74 * U, "up"];
        a.tail = [X(cx), 3.9 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A tawny owl flying towards us, heading ${p.facing < 0 ? "left" : "right"}, its broad barred wings spread wide and its pale round face turned to the front.`,
    // A float in world units, as the worlds' rare sights are declared. Each wing flaps on its own, the left one mirrored.
    motion: {
        body: { is: "float", lift: 10, dx: 8, deg: 3, pivot: [0.5, 0.5], period: 7.2, units: true },
        parts: { wing: { is: "flap", deg: 12, beat: 0.5, burst: 2, period: 4.2 } },
    },
});
