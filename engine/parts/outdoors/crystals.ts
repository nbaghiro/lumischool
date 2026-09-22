import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, ring, lumps, clamp, halo } from "../animals/nature";

type Gem = "berry" | "sky" | "mint";

/** One crystal: a six-sided prism with a pointed end, seen from the side so three long faces show. */
function crystal<G>(
    c: Ctx<G>,
    x: number,
    y: number,
    len: number,
    wid: number,
    ang: number,
    col: Gem,
    lit: boolean,
): Pt {
    const { pen, g } = c,
        ca = Math.cos(ang),
        sa = Math.sin(ang),
        h = wid / 2,
        tip = len + wid * 0.62;
    const P = (u: number, v: number): Pt => [x + u * ca - v * sa, y + u * sa + v * ca];
    if (lit) halo(c, ...P(len * 0.55, 0), len * 0.7 + wid * 0.4, c.t[col], 0.34);
    const vs = [-h, -h * 0.34, h * 0.34, h];
    const top = (v: number) => len - Math.abs(v) * 0.2;
    const sides = [
        pen.fill(col, "hachure", { hachureGap: 2.6, fillWeight: 1 }),
        pen.fill(col),
        pen.fill(col, "hachure", { hachureGap: 5.5, fillWeight: 0.8 }),
    ];
    const caps = [
        pen.fill(col, "cross-hatch", { hachureGap: 3.2, fillWeight: 0.8 }),
        pen.fill(col, "hachure", { hachureGap: 3.4 }),
        pen.fill("card"),
    ];
    for (let f = 0; f < 3; f++) {
        pen.polygon(
            g,
            [
                P(0, vs[f] ?? 0),
                P(top(vs[f] ?? 0), vs[f] ?? 0),
                P(top(vs[f + 1] ?? 0), vs[f + 1] ?? 0),
                P(0, vs[f + 1] ?? 0),
            ],
            "ruler",
            sides[f],
            { strokeWidth: 1.5 },
        );
        pen.polygon(
            g,
            [P(top(vs[f] ?? 0), vs[f] ?? 0), P(tip, 0), P(top(vs[f + 1] ?? 0), vs[f + 1] ?? 0)],
            "ruler",
            caps[f],
            { strokeWidth: 1.5 },
        );
    }
    // a glint down the lit face
    pen.line(g, ...P(len * 0.12, -h * 0.12), ...P(len * 0.72, -h * 0.12), "pencil", {
        strokeWidth: lit ? 2.6 : 1.6,
        stroke: c.t.card,
    });
    return P(tip, 0);
}

export const crystals = defineDrawing({
    id: "crystals",
    family: "outdoors",
    title: "Crystals",
    group: "Props",
    about: "A cluster of crystals growing out of the rock, each a six-sided prism with a pointed end, in pink, blue and green. A crystal is a solid a child can count the faces, edges and corners of, and in a cave it catches the light of a lamp.",
    params: { count: 5, lit: 0 },
    settings: { count: { kind: "whole", min: 1, max: 7 }, lit: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Five, in the dark", params: { count: 5, lit: 0 } },
        { label: "Seven, lit", params: { count: 7, lit: 1 } },
        { label: "Three", params: { count: 3, lit: 0 } },
    ],
    box: () => ({ w: 12, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.count, 1, 7),
            lit = p.lit > 0,
            a: RawAnchors = {};
        // [foot x, foot y, length, width, lean, colour], the biggest first so the smaller stand in front
        const SET: [number, number, number, number, number, Gem][] = [
            [6, 7.4, 3.9, 2, -1.6, "berry"],
            [4.2, 7.5, 2.8, 1.6, -2.15, "sky"],
            [7.9, 7.4, 3, 1.65, -1.12, "mint"],
            [2.6, 7.8, 1.9, 1.3, -2.55, "berry"],
            [9.6, 7.7, 2.1, 1.35, -0.72, "sky"],
            [5.1, 7.9, 1.5, 1.1, -1.9, "mint"],
            [7, 7.9, 1.4, 1, -1.35, "berry"],
        ];
        for (const [i, [x, y, len, wid, ang, col]] of SET.slice(0, n).entries()) {
            const tip = crystal(c, x * U, y * U, len * U, wid * U, ang, col, lit);
            a[`crystal(${i})`] = [tip[0], tip[1], "up"];
        }
        // the rock they grow out of, lumpy, with a stub or two of broken crystal in it
        pen.path(
            g,
            ring(
                lumps(
                    6 * U,
                    8.1 * U,
                    5.3 * U,
                    0.85 * U,
                    [1, 0.9, 1.08, 0.94, 1.04, 0.86, 1.1, 0.92, 1, 0.95, 1.06, 0.9],
                ),
            ),
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 5.5, fillWeight: 0.7 }),
            { strokeWidth: 1.8 },
        );
        for (const [x, col] of [
            [3.6, "sky"],
            [8.6, "berry"],
            [10.5, "mint"],
        ] as const)
            pen.polygon(
                g,
                [
                    [x * U - 7, 7.75 * U],
                    [x * U - 4, 7.3 * U],
                    [x * U + 5, 7.3 * U],
                    [x * U + 8, 7.75 * U],
                ],
                "ruler",
                pen.fill(col),
                { strokeWidth: 1.2 },
            );
        return a;
    },
    describe: (p) =>
        `A cluster of crystals growing out of a lumpy rock, each a six-sided prism with a pointed end, in pink, blue and green${p.lit > 0 ? ", each with a soft glow round it" : ""}.`,
});
