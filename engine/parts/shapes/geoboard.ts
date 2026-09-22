import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

type Pt = [number, number];

export const geoboard = defineDrawing({
    id: "geoboard",
    family: "shapes",
    title: "Geoboard",
    group: "Structures",
    about: "A board of pegs two squares apart with a band stretched round some of them. Area and perimeter are both countable off it, and a shape can be changed by moving one peg.",
    params: {
        n: 5,
        band: [
            [0, 0],
            [3, 0],
            [3, 2],
            [1, 3],
        ] as [number, number][],
        count: false,
    },
    settings: {
        n: { kind: "whole", min: 3, max: 7 },
        band: { kind: "fixed" },
        count: { kind: "flag" },
    },
    takes: [
        {
            label: "A four-sided band",
            params: {
                n: 5,
                band: [
                    [0, 0],
                    [3, 0],
                    [3, 2],
                    [1, 3],
                ],
                count: false,
            },
        },
        {
            label: "A triangle, with its area",
            params: {
                n: 5,
                band: [
                    [0, 3],
                    [4, 3],
                    [2, 0],
                ],
                count: true,
            },
        },
        { label: "Bare pegs", params: { n: 6, band: [], count: false } },
    ],
    box: (p) => ({ w: p.n * 2 + 2, h: p.n * 2 + 2 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = 2 * U,
            o = 1.5 * U,
            a: RawAnchors = {};
        pen.rect(g, U / 2, U / 2, (p.n * 2 + 1) * U, (p.n * 2 + 1) * U, "ruler", pen.fill("card"), {
            strokeWidth: 2.4,
        });
        if (p.band.length > 2) {
            pen.polygon(
                g,
                p.band.map(([x, y]) => [o + x * s, o + y * s] as Pt),
                "pencil",
                pen.fill("mint", "solid", { hachureGap: 7, fillWeight: 0.8 }),
                { strokeWidth: 3 },
            );
        }
        for (let r = 0; r < p.n; r++)
            for (let k = 0; k < p.n; k++) {
                pen.circle(
                    g,
                    o + k * s,
                    o + r * s,
                    8,
                    "ruler",
                    { fill: c.t["ink-soft"], fillStyle: "solid" },
                    { strokeWidth: 1, stroke: c.t.ink },
                );
                a[`peg(${k},${r})`] = [o + k * s, o + r * s, "up"];
            }
        if (p.count) {
            const A =
                Math.abs(
                    p.band.reduce((t, q, i) => {
                        const n = p.band[(i + 1) % p.band.length] ?? q;
                        return t + q[0] * n[1] - n[0] * q[1];
                    }, 0),
                ) / 2;
            num(c, (p.n + 1) * U, (p.n * 2 + 1.6) * U, `${A} squares`, 16);
        }
        return a;
    },
    describe: (p) =>
        `A geoboard, a square white board with a grid of dark pegs, ${p.band.length > 2 ? "a green band stretched round some of the pegs" : "no band stretched on it"}${p.count ? ", and the area written under it" : ""}.`,
});
