// A mountain goat is white on white paper, so its outline carries it: the shag hangs in tufts along
// the belly and down the legs, and only the horns and the hooves are black.
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

export const goat = defineDrawing({
    id: "goat",
    family: "animals",
    title: "Mountain goat",
    group: "Characters",
    about: "A mountain goat standing on a ledge of rock with its hooves close together: a shaggy white coat, a beard under its chin and two short horns curving back. Without the rock it stands on the ground.",
    params: { facing: 1, rock: 1 },
    settings: {
        facing: { kind: "one of", of: [1, -1] },
        rock: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "On a rock ledge", params: { facing: 1, rock: 1 } },
        { label: "Facing left, on the ground", params: { facing: -1, rock: 0 } },
    ],
    box: (p) => ({ w: 5, h: p.rock > 0 ? 5 : 4 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const dir = p.facing < 0 ? -1 : 1;
        const rock = p.rock > 0;
        const W = 5 * U;
        const F = rock ? 3.4 * U : 3.8 * U;
        const X = (x: number) => (dir > 0 ? x : W - x);
        const P = (pts: Pt[]): Pt[] => pts.map(([x, k]) => [X(x), F - k]);
        const coat = pen.fill("card");
        const black = { fill: c.t.ink, fillStyle: "solid" };
        const tuft = (x: number) => {
            for (const dx of [-2.5, 0, 2.5])
                pen.polygon(
                    g,
                    P([
                        [x + dx - 1.3, 0],
                        [x + dx * 2, 8 - Math.abs(dx)],
                        [x + dx + 1.3, 0],
                    ]),
                    "pencil",
                    pen.fill("mint"),
                    { strokeWidth: 1 },
                );
        };
        if (rock) {
            pen.polygon(
                g,
                P([
                    [4, -3],
                    [26, -4],
                    [52, -2],
                    [80, -4],
                    [95, -2],
                    [98, -14],
                    [92, -22],
                    [96, -31],
                    [4, -31],
                    [8, -20],
                    [2, -10],
                ]),
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.7 }),
                { strokeWidth: 1.8, preserveVertices: true },
            );
            pen.polygon(
                g,
                P([
                    [4, -3],
                    [12, 3],
                    [40, 4],
                    [70, 3],
                    [90, 4],
                    [95, -2],
                    [80, -4],
                    [52, -2],
                    [26, -4],
                ]),
                "pencil",
                coat,
                { strokeWidth: 1.6, preserveVertices: true },
            );
            for (const crack of [
                [
                    [36, -3],
                    [42, -14],
                    [38, -31],
                ],
                [
                    [72, -4],
                    [77, -18],
                ],
            ] as Pt[][])
                pen.linear(g, P(crack), "pencil", { strokeWidth: 1.1 });
        } else pen.line(g, 0.2 * U, F, W - 0.2 * U, F, "pencil", { strokeWidth: 1.6 });
        tuft(9);
        tuft(91);

        const leg = (x: number, far: boolean) => {
            pen.polygon(
                g,
                P([
                    [x, 14],
                    [x + 5, 14],
                    [x + 4.5, 3.5],
                    [x + 0.5, 3.5],
                ]),
                "pencil",
                coat,
                { strokeWidth: far ? 1.2 : 1.5, preserveVertices: true },
            );
            pen.polygon(
                g,
                P([
                    [x - 0.2, 3.8],
                    [x + 5.2, 3.8],
                    [x + 5.6, 0],
                    [x - 0.6, 0],
                ]),
                "ruler",
                black,
                { strokeWidth: 1 },
            );
        };
        leg(29, true);
        leg(52, true);
        pen.path(
            g,
            ring(
                P([
                    [14, 39],
                    [7, 37],
                    [6, 33],
                    [12, 33],
                ]),
            ),
            "pencil",
            coat,
            { strokeWidth: 1.3 },
        );
        pen.path(
            g,
            ring(
                P([
                    [15, 40],
                    [30, 41],
                    [44, 42],
                    [56, 46],
                    [65, 44],
                    [72, 34],
                    [70, 24],
                    [64, 18],
                    [58, 21],
                    [52, 17],
                    [46, 20],
                    [40, 16.5],
                    [34, 20],
                    [28, 17],
                    [22, 21],
                    [14, 25],
                    [11, 33],
                ]),
            ),
            "pencil",
            coat,
            { strokeWidth: 1.8 },
        );
        for (const fur of [
            [
                [50, 37],
                [54, 31],
                [53, 25],
            ],
            [
                [36, 35],
                [39, 29],
            ],
            [
                [21, 36],
                [23, 30],
            ],
        ] as Pt[][])
            pen.curve(g, P(fur), "pencil", { strokeWidth: 0.8, stroke: c.t["ink-soft"] });
        leg(21.5, false);
        leg(60, false);
        pen.path(
            g,
            ring(
                P([
                    [14, 32],
                    [30, 29],
                    [30, 20],
                    [28, 12],
                    [26.5, 15],
                    [24.5, 10],
                    [22.5, 14],
                    [20, 11],
                    [18, 17],
                    [15, 22],
                ]),
            ),
            "pencil",
            coat,
            { strokeWidth: 1.5 },
        );
        pen.path(
            g,
            ring(
                P([
                    [56, 29],
                    [71, 28],
                    [70, 19],
                    [67, 11],
                    [65.5, 14.5],
                    [63.5, 10],
                    [61.5, 14],
                    [59, 11.5],
                    [57.5, 17],
                ]),
            ),
            "pencil",
            coat,
            { strokeWidth: 1.5 },
        );

        const hc = part(c, "head", [X(66), F - 38], { dir });
        const h = hc.g;
        pen.path(
            h,
            ring(
                P([
                    [58, 44],
                    [63, 50],
                    [72, 55],
                    [80, 52],
                    [80, 44],
                    [76, 36],
                    [72, 28],
                    [64, 32],
                ]),
            ),
            "pencil",
            coat,
            { strokeWidth: 1.7 },
        );
        pen.polygon(
            h,
            P([
                [80, 54],
                [84, 55],
                [82, 60],
                [77, 64],
                [73, 64.5],
                [78, 60],
            ]),
            "ruler",
            { fill: c.t["ink-soft"], fillStyle: "solid" },
            { strokeWidth: 1 },
        );
        pen.path(
            h,
            ring(
                P([
                    [83, 43],
                    [90, 41],
                    [89, 34],
                    [87, 28],
                    [85, 32],
                    [82, 37],
                ]),
            ),
            "pencil",
            coat,
            { strokeWidth: 1.4 },
        );
        pen.path(
            h,
            ring(
                P([
                    [74, 54],
                    [80, 57],
                    [86, 55],
                    [92, 49],
                    [96, 44],
                    [95, 40],
                    [90, 40],
                    [84, 43],
                    [78, 44],
                    [73, 47],
                ]),
            ),
            "pencil",
            coat,
            { strokeWidth: 1.7 },
        );
        pen.polygon(
            h,
            P([
                [77, 54],
                [81, 55.5],
                [79, 60],
                [74, 64],
                [70, 65],
                [75, 61],
            ]),
            "ruler",
            black,
            { strokeWidth: 1 },
        );
        pen.polygon(
            h,
            P([
                [75, 50],
                [66, 51],
                [73, 46],
            ]),
            "pencil",
            coat,
            { strokeWidth: 1.2 },
        );
        eye(hc, X(86), F - 50, 5);
        pen.circle(h, X(94.5), F - 43.5, 3.5, "ruler", black, { strokeWidth: 0.6 });
        pen.line(h, X(94), F - 40.5, X(90), F - 41, "ruler", { strokeWidth: 1.1 });
        const a: RawAnchors = { head: [X(84), F - 66, "up"], feet: [X(42), F, "down"] };
        if (rock) a.rock = [W / 2, 5 * U, "down"];
        return a;
    },
    describe: (p) =>
        `A mountain goat standing with its hooves close together ${p.rock > 0 ? "on a ledge of rock" : "on the ground"}, a shaggy white coat, a beard under its chin and two short horns curving back.`,
    motion: {
        body: {
            is: "float",
            lift: 0,
            dx: 0,
            deg: 1.5,
            pivot: [0.5, 0.68],
            period: 8.6,
            units: true,
        },
        parts: { head: { is: "wiggle", deg: 4, period: 3.9, cycles: 2 } },
    },
});
