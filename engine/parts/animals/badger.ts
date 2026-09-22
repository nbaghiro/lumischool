// A badger is known by its face, white with a black stripe from the nose back through each eye, so
// the head is drawn large enough for the stripe and the eye inside it to read in a tile. The coat
// hangs in a fringe over short legs, which is what keeps it from reading as a box on four posts.
import { part, type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const f1 = (n: number) => n.toFixed(1);

function ring(pts: readonly Pt[]): string {
    const nth = (i: number): Pt => pts[i] ?? [0, 0];
    const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const start = mid(nth(pts.length - 1), nth(0));
    let d = `M${f1(start[0])} ${f1(start[1])}`;
    for (let i = 0; i < pts.length; i++) {
        const p = nth(i);
        const m = mid(p, nth((i + 1) % pts.length));
        d += `Q${f1(p[0])} ${f1(p[1])} ${f1(m[0])} ${f1(m[1])}`;
    }
    return `${d}Z`;
}

const eye = <G>(c: Ctx<G>, x: number, y: number, d = 5) =>
    c.pen.circle(
        c.g,
        x,
        y,
        d,
        "ruler",
        { fill: c.t.ink, fillStyle: "solid" },
        { strokeWidth: 0.6 },
    );

/** One badger, its points given as (along from its middle towards the nose, up from the ground). */
function badgerAt<G>(c: Ctx<G>, X: (n: number) => number, base: number, dir: number): void {
    const { pen, g } = c;
    const P = (pts: Pt[]): Pt[] => pts.map(([x, k]) => [X(x), base - k]);
    const black = { fill: c.t.ink, fillStyle: "solid" };
    const leg = (x: number) =>
        ring(
            P([
                [x, 17],
                [x + 12, 17],
                [x + 12.5, 5],
                [x + 17, 2.5],
                [x + 16.5, 0],
                [x + 0.5, 0],
                [x - 0.5, 8],
            ]),
        );
    for (const x of [-30, 5]) pen.path(g, leg(x), "ruler", black, { strokeWidth: 1.1 });
    for (const x of [-40, 14])
        pen.path(g, leg(x), "ruler", black, { strokeWidth: 1.4, stroke: c.t.card });
    pen.path(
        g,
        ring(
            P([
                [-47, 31],
                [-57, 27],
                [-56, 21],
                [-47, 23],
            ]),
        ),
        "pencil",
        pen.fill("card"),
        { strokeWidth: 1.3 },
    );
    const body = ring(
        P([
            [-50, 22],
            [-49, 34],
            [-40, 43],
            [-24, 48],
            [-6, 48],
            [10, 44],
            [22, 38],
            [30, 28],
            [28, 16],
            [22, 11.5],
            [16, 8.5],
            [10, 12],
            [3, 8.5],
            [-4, 12],
            [-11, 8.5],
            [-18, 12],
            [-25, 8.5],
            [-32, 12],
            [-39, 8.5],
            [-46, 13],
        ]),
    );
    pen.path(g, body, "pencil", pen.fill("card"), { stroke: "none", strokeWidth: 0 });
    pen.path(
        g,
        body,
        "pencil",
        pen.fill("ink-soft", "dashed", {
            fillStyle: "dashed",
            hachureGap: 4,
            hachureAngle: -12,
            dashOffset: 6,
            dashGap: 3.5,
            fillWeight: 0.8,
        }),
        { strokeWidth: 1.8 },
    );

    const hc = part(c, "head", [X(22), base - 30], { dir });
    const h = hc.g;
    pen.circle(h, X(23), base - 40, 10, "pencil", pen.fill("card"), { strokeWidth: 1.3 });
    pen.path(
        h,
        ring(
            P([
                [18, 38],
                [30, 39],
                [41, 31],
                [49, 18],
                [55, 8],
                [53, 3],
                [45, 7],
                [35, 13],
                [24, 18],
                [15, 27],
            ]),
        ),
        "pencil",
        pen.fill("card"),
        { strokeWidth: 1.7 },
    );
    pen.path(
        h,
        ring(
            P([
                [21, 36],
                [31, 35],
                [40, 28],
                [47, 17],
                [53, 8],
                [48, 7],
                [40, 16],
                [31, 24],
                [20, 27],
            ]),
        ),
        "ruler",
        black,
        { strokeWidth: 1 },
    );
    pen.circle(h, X(35), base - 26, 9, "ruler", pen.fill("card"), {
        stroke: "none",
        strokeWidth: 0,
    });
    eye(hc, X(35), base - 26, 5);
    pen.circle(h, X(54), base - 5, 7, "ruler", black, { strokeWidth: 0.8 });
    for (const [x0, k0, x1, k1] of [
        [58, 10, 61, 13],
        [59, 3, 63, 3],
    ] as const)
        pen.line(h, X(x0), base - k0, X(x1), base - k1, "ruler", {
            strokeWidth: 1.1,
            stroke: c.t["ink-soft"],
        });
}

export const badger = defineDrawing({
    id: "badger",
    family: "animals",
    title: "Badger",
    group: "Characters",
    about: "A badger snuffling along with its nose to the ground, as badgers do at dusk: a stout grey body on short black legs, and a white face with a black stripe through each eye. One badger or two in a line, with four legs each to count.",
    params: { facing: 1, count: 1 },
    settings: {
        facing: { kind: "one of", of: [1, -1] },
        count: { kind: "whole", min: 1, max: 2 },
    },
    takes: [
        { label: "One badger", params: { facing: 1, count: 1 } },
        { label: "Two, facing left", params: { facing: -1, count: 2 } },
    ],
    box: (p) => ({ w: (p.count > 1 ? 2 : 1) * 6, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const n = p.count > 1 ? 2 : 1;
        const dir = p.facing < 0 ? -1 : 1;
        const W = n * 6 * U;
        const base = 2.8 * U;
        const a: RawAnchors = {};
        pen.line(g, 0.3 * U, base, W - 0.3 * U, base, "pencil", { strokeWidth: 1.6 });
        for (let i = 0; i < n; i++) {
            const cx = 56 + i * 6 * U;
            const X = (x: number) => (dir > 0 ? cx + x : W - cx - x);
            badgerAt(c, X, base, dir);
            a[`badger(${i})`] = [X(-12), base - 49, "up"];
            a[`nose(${i})`] = [X(55), base - 5, dir > 0 ? "right" : "left"];
        }
        a.feet = [W / 2, base, "down"];
        return a;
    },
    describe: (p) =>
        p.count > 1
            ? "Badgers snuffling along in a line with their noses to the ground, stout grey bodies on short black legs and white faces with a black stripe through each eye."
            : "A badger snuffling along with its nose to the ground, a stout grey body on short black legs and a white face with a black stripe through each eye.",
    motion: {
        body: { is: "float", lift: 0, dx: 4, deg: 2, pivot: [0.5, 1], period: 7.8, units: true },
        parts: { head: { is: "wiggle", deg: 6, period: 3.4, cycles: 2 } },
    },
});
