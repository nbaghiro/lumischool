import { part, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const f1 = (n: number) => n.toFixed(1);

/** A closed outline through every point (Catmull-Rom as cubic curves), so a patch cut from the same points meets it. */
function through(pts: readonly Pt[]): string {
    const nth = (i: number): Pt => pts[(i + pts.length) % pts.length] ?? [0, 0];
    const first = nth(0);
    let d = `M${f1(first[0])} ${f1(first[1])}`;
    for (let i = 0; i < pts.length; i++) {
        const p0 = nth(i - 1);
        const p1 = nth(i);
        const p2 = nth(i + 1);
        const p3 = nth(i + 2);
        d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return `${d}Z`;
}

// The robin facing right, in squares from its belly before it is scaled and stood on its legs. Its
// head and body are one plump outline, from the bill over the crown and round the belly. The
// orange-red of its face and breast covers the front half of the bird, from the forehead round the eye
// to the belly, and meets the olive-brown of its crown and back along one line edged in grey; the
// belly under both is white. The patches are cut from the outline's own points, so they meet it.
const OUTLINE: readonly Pt[] = [
    [0.8, -1.84],
    [0.64, -2.12],
    [0.34, -2.26],
    [0.02, -2.18],
    [-0.24, -1.96],
    [-0.52, -1.68],
    [-0.76, -1.3],
    [-0.86, -0.9],
    [-0.74, -0.52],
    [-0.44, -0.26],
    [-0.02, -0.16],
    [0.42, -0.26],
    [0.76, -0.56],
    [0.94, -1],
    [0.92, -1.42],
    [0.84, -1.68],
];
const MEET: readonly Pt[] = [
    [0.4, -2.14],
    [0.12, -1.92],
    [-0.02, -1.58],
    [-0.04, -1.16],
    [0.1, -0.74],
    [0.3, -0.36],
];
const at = (i: number): Pt => OUTLINE[i] ?? [0, 0];
const BREAST: readonly Pt[] = [
    at(1),
    at(0),
    at(15),
    at(14),
    at(13),
    at(12),
    at(11),
    ...[...MEET].reverse(),
];
const BACK: readonly Pt[] = [
    ...OUTLINE.slice(1, 9),
    [-0.46, -0.66],
    [-0.2, -0.9],
    ...MEET.slice(0, 4).reverse(),
];
const FRINGE: readonly Pt[] = [
    [0.36, -2.17],
    [0.06, -1.93],
    [-0.08, -1.58],
    [-0.1, -1.16],
    [0.02, -0.8],
];
const WING: readonly Pt[] = [
    [-0.08, -1.46],
    [-0.4, -1.58],
    [-0.7, -1.3],
    [-0.92, -0.78],
    [-0.6, -0.72],
    [-0.28, -0.9],
];
const FEATHERS: readonly (readonly Pt[])[] = [
    [
        [-0.62, -1.2],
        [-0.4, -1.06],
        [-0.18, -1.02],
    ],
    [
        [-0.74, -0.96],
        [-0.5, -0.86],
        [-0.3, -0.88],
    ],
];
const TAIL: readonly Pt[] = [
    [-0.7, -1],
    [-1.28, -0.66],
    [-1.2, -0.44],
    [-0.66, -0.66],
];
const BILL: readonly Pt[] = [
    [0.82, -1.86],
    [1.1, -1.76],
    [0.84, -1.7],
];
const EYE: Pt = [0.52, -1.8];
/** How big the bird is drawn, and how far its belly stands above its feet, in squares. */
const K = 1.02;
const LEGS = 0.2;

export const robin = defineDrawing({
    id: "robin",
    family: "animals",
    title: "Robin",
    group: "Characters",
    about: "A robin perched on a wooden fence post, or on a window sill when there is no post: a small plump bird with an orange-red face and breast edged in grey, an olive-brown crown, back and wings, a white belly, a short tail and thin legs.",
    params: { post: 1, facing: 1 },
    settings: {
        post: { kind: "whole", min: 0, max: 1 },
        facing: { kind: "one of", of: [1, -1] },
    },
    takes: [
        { label: "On a post", params: { post: 1, facing: 1 } },
        { label: "On a sill, facing left", params: { post: 0, facing: -1 } },
    ],
    box: (p) => ({ w: 3, h: p.post > 0 ? 5 : 3 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const s = p.facing < 0 ? -1 : 1;
        const onPost = p.post > 0;
        const fx = 1.62 * U;
        const fy = onPost ? 2.6 * U : 2.52 * U;
        const a: RawAnchors = {};
        const X = (x: number) => (s > 0 ? x : 3 * U - x);
        const on = ([dx, dy]: Pt): Pt => [X(fx + dx * K * U), fy + (dy - LEGS) * K * U];
        const wood = pen.fill("card");
        const shade = pen.fill("ink-soft", "hachure", { hachureGap: 3.5, fillWeight: 0.7 });
        const grain = { ...calm(c, 1.1), stroke: c.t["ink-soft"] };
        // the wood is seen a little from above and to one side, so it has a top to stand on
        const d = 0.22 * U;
        if (onPost) {
            const L = 1.05 * U;
            const R = 2.15 * U;
            const top = fy + 0.1 * U;
            const foot = 4.7 * U;
            pen.polygon(
                g,
                [
                    [X(R), top],
                    [X(R + d), top - d * 0.8],
                    [X(R + d), foot - d * 0.8],
                    [X(R), foot],
                ],
                "pencil",
                shade,
                calm(c, 1.6),
            );
            pen.polygon(
                g,
                [
                    [X(L), top],
                    [X(L + d), top - d * 0.8],
                    [X(R + d), top - d * 0.8],
                    [X(R), top],
                ],
                "pencil",
                wood,
                calm(c, 1.6),
            );
            pen.polygon(
                g,
                [
                    [X(L), top],
                    [X(R), top],
                    [X(R), foot],
                    [X(L), foot],
                ],
                "pencil",
                wood,
                calm(c, 1.8),
            );
            pen.curve(
                g,
                [
                    [X(L + 0.3 * U), top + 0.3 * U],
                    [X(L + 0.38 * U), top + 0.9 * U],
                    [X(L + 0.28 * U), foot - 0.2 * U],
                ],
                "pencil",
                grain,
            );
            pen.curve(
                g,
                [
                    [X(L + 0.8 * U), top + 1.1 * U],
                    [X(L + 0.74 * U), top + 1.5 * U],
                    [X(L + 0.82 * U), foot - 0.1 * U],
                ],
                "pencil",
                grain,
            );
            pen.ellipse(
                g,
                X(L + 0.72 * U),
                top + 0.62 * U,
                0.2 * U,
                0.34 * U,
                "pencil",
                null,
                grain,
            );
            pen.line(g, X(0.2 * U), foot, X(2.85 * U), foot, "pencil", calm(c, 1.6));
            for (const [x, lean] of [
                [0.45, -0.1],
                [0.62, 0.08],
                [2.45, -0.06],
                [2.62, 0.1],
            ] as const)
                pen.line(
                    g,
                    X(x * U),
                    foot,
                    X((x + lean) * U),
                    foot - 0.34 * U,
                    "pencil",
                    calm(c, 1.2),
                );
            a.post = [X((L + R) / 2), foot, "down"];
        } else {
            const L = 0.12 * U;
            const R = 2.66 * U;
            const top = fy + 0.08 * U;
            const front = 0.32 * U;
            pen.polygon(
                g,
                [
                    [X(R), top],
                    [X(R + d), top - d * 0.8],
                    [X(R + d), top + front - d * 0.8],
                    [X(R), top + front],
                ],
                "pencil",
                shade,
                calm(c, 1.5),
            );
            pen.polygon(
                g,
                [
                    [X(L), top],
                    [X(L + d), top - d * 0.8],
                    [X(R + d), top - d * 0.8],
                    [X(R), top],
                ],
                "pencil",
                wood,
                calm(c, 1.6),
            );
            pen.polygon(
                g,
                [
                    [X(L), top],
                    [X(R), top],
                    [X(R), top + front],
                    [X(L), top + front],
                ],
                "pencil",
                wood,
                calm(c, 1.8),
            );
            pen.curve(
                g,
                [
                    [X(L + 0.3 * U), top + 0.17 * U],
                    [X(1.3 * U), top + 0.13 * U],
                    [X(R - 0.4 * U), top + 0.18 * U],
                ],
                "pencil",
                grain,
            );
            a.sill = [X((L + R) / 2), top + front, "down"];
        }
        // thin legs from under the belly, each with its toes gripping the wood
        for (const [hip, toe] of [
            [-0.02, -0.06],
            [0.24, 0.28],
        ] as const) {
            const [hx, hy] = on([hip, -0.2]);
            const tx = X(fx + toe * K * U);
            pen.line(g, hx, hy, tx, fy, "pencil", { ...calm(c, 1.5), stroke: c.t.ink });
            pen.line(g, tx - s * 0.08 * U, fy, tx + s * 0.18 * U, fy + 0.02 * U, "pencil", {
                ...calm(c, 1.3),
                stroke: c.t.ink,
            });
        }
        pen.polygon(
            part(c, "tail", on([-0.66, -0.8]), { dir: s }).g,
            TAIL.map(on),
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3, fillWeight: 0.7 }),
            calm(c, 1.6),
        );
        const body = through(OUTLINE.map(on));
        pen.path(g, body, "pencil", pen.fill("card"), { stroke: "none" });
        // the back is olive-brown on screen, grey hatching warmed with orange; in print it is an open grey
        // hatch, lighter than the breast's crossed markers, so the breast is still the part that stands out
        if (!c.paper)
            pen.polygon(
                g,
                BACK.map(on),
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 5, fillWeight: 0.6, hachureAngle: -40 }),
                { stroke: "none" },
            );
        pen.polygon(
            g,
            BACK.map(on),
            "pencil",
            pen.fill("ink-soft", "hachure", {
                hachureGap: c.paper ? 7 : 3.6,
                fillWeight: 0.7,
                hachureAngle: 50,
            }),
            { stroke: "none" },
        );
        // the breast is orange deepened with more orange and warmed towards red with a lighter hatch of berry
        pen.polygon(g, BREAST.map(on), "pencil", pen.fill("tang", "solid"), { stroke: "none" });
        if (!c.paper)
            pen.polygon(
                g,
                BREAST.map(on),
                "pencil",
                pen.fill("tang", "hachure", { hachureGap: 2.4, fillWeight: 1.2, hachureAngle: 40 }),
                { stroke: "none" },
            );
        pen.polygon(
            g,
            BREAST.map(on),
            "pencil",
            pen.fill("berry", "hachure", {
                hachureGap: c.paper ? 4 : 5,
                fillWeight: 0.9,
                hachureAngle: -50,
            }),
            { stroke: "none" },
        );
        pen.curve(g, FRINGE.map(on), "pencil", {
            ...calm(c, c.paper ? 1.1 : 2.6),
            stroke: c.paper ? c.t.ink : c.t["ink-soft"],
        });
        pen.polygon(
            g,
            WING.map(on),
            "pencil",
            pen.fill("ink-soft", "hachure", {
                hachureGap: c.paper ? 5 : 2.8,
                fillWeight: 0.7,
                hachureAngle: 50,
            }),
            calm(c, 1.2),
        );
        for (const line of FEATHERS) pen.curve(g, line.map(on), "pencil", calm(c, 1.1));
        pen.path(g, body, "pencil", null, calm(c, 1.7));
        pen.polygon(
            g,
            BILL.map(on),
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 1, preserveVertices: true },
        );
        const [ex, ey] = on(EYE);
        pen.circle(g, ex, ey, 8.5, "ruler", pen.fill("card"), { stroke: "none" });
        pen.circle(
            g,
            ex,
            ey,
            5.2,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.8 },
        );
        pen.circle(
            g,
            ex + s * 0.9,
            ey - 1,
            1.8,
            "ruler",
            { fill: c.t.card, fillStyle: "solid" },
            { stroke: "none" },
        );
        const [hx, hy] = on([0.34, -2.26]);
        const [bx, by] = on(BILL[1] ?? [1.1, -1.76]);
        const [kx, ky] = [X(fx + 0.12 * K * U), fy];
        a.head = [hx, hy, "up"];
        a.beak = [bx, by, s > 0 ? "right" : "left"];
        a.feet = [kx, ky, "down"];
        return a;
    },
    describe: (p) =>
        `A small plump robin perched on ${p.post > 0 ? "a wooden fence post" : "a window sill"}, with an orange-red face and breast edged in grey, an olive-brown back and wings and a white belly.`,
    motion: {
        body: {
            is: "float",
            lift: 0,
            dx: 2,
            deg: 2.5,
            pivot: [0.5, 0.52],
            period: 6.6,
            units: true,
        },
        parts: { tail: { is: "wiggle", deg: 12, period: 3.4, cycles: 2 } },
    },
});
