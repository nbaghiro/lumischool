// A fallen log whose cut end is a count: the rings are drawn evenly at the ruler level, one stroke
// each, with nothing crossing them (no crack, no hatch on the cut face), so they can be counted in
// print. The end is as tall as the box allows because eight rings need about four units apiece.
import { type Ctx, type RawAnchors } from "../../ink/surface";
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

/** A pointed leaf lying from (x, y) towards an angle. */
function leaf<G>(c: Ctx<G>, x: number, y: number, len: number, angle: number): void {
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const at = (t: number, o: number): Pt => [x + t * ca - o * sa, y + t * sa + o * ca];
    const pts: Pt[] = [];
    for (let i = 0; i <= 6; i++)
        pts.push(at((i / 6) * len, (len / 4) * Math.sin((Math.PI * i) / 6)));
    for (let i = 5; i >= 1; i--)
        pts.push(at((i / 6) * len, -(len / 4) * Math.sin((Math.PI * i) / 6)));
    c.pen.polygon(c.g, pts, "pencil", c.pen.fill("card"), { strokeWidth: 1.1 });
    const [x0, y0] = at(-3, 0);
    const [x1, y1] = at(len * 0.85, 0);
    c.pen.line(c.g, x0, y0, x1, y1, "pencil", { strokeWidth: 0.8, stroke: c.t["ink-soft"] });
}

function toadstool<G>(c: Ctx<G>, x: number, y: number): number {
    const { pen, g } = c;
    const cap = `M${x - 9.5} ${y - 7}C${x - 9.5} ${y - 19.5} ${x + 9.5} ${y - 19.5} ${x + 9.5} ${y - 7}Q${x} ${y - 4.5} ${x - 9.5} ${y - 7}Z`;
    pen.path(
        g,
        `M${x - 2.6} ${y + 1}L${x - 2} ${y - 7}L${x + 2} ${y - 7}L${x + 2.6} ${y + 1}Z`,
        "ruler",
        pen.fill("card"),
        { strokeWidth: 1.1 },
    );
    pen.path(g, cap, "ruler", pen.fill("card"), { stroke: "none", strokeWidth: 0 });
    pen.path(g, cap, "ruler", pen.fill("berry"), { strokeWidth: 1.5 });
    for (const [dx, dy] of [
        [-4.6, -10.4],
        [4, -11.4],
        [-0.3, -14.6],
    ] as const)
        pen.circle(g, x + dx, y + dy, 3.6, "ruler", pen.fill("card"), { strokeWidth: 0.8 });
    return y - 16.5;
}

export const fallenLog = defineDrawing({
    id: "log",
    family: "outdoors",
    title: "Fallen log",
    group: "Props",
    about: "A fallen log lying in the leaves, with moss along its top and red toadstools with white spots growing from it. Its cut end shows the rings of the tree, drawn evenly so they can be counted, one for each year it grew.",
    params: { rings: 5, toadstools: 3 },
    settings: {
        rings: { kind: "whole", min: 3, max: 8 },
        toadstools: { kind: "whole", min: 0, max: 4 },
    },
    takes: [
        { label: "Five rings, three toadstools", params: { rings: 5, toadstools: 3 } },
        { label: "Eight rings, bare", params: { rings: 8, toadstools: 0 } },
        { label: "Three rings, one toadstool", params: { rings: 3, toadstools: 1 } },
    ],
    box: () => ({ w: 10, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const n = Math.max(3, Math.min(8, Math.round(p.rings)));
        const stools = Math.max(0, Math.min(4, Math.round(p.toadstools)));
        const a: RawAnchors = {};
        const ex = 150;
        const ey = 52;
        const R = 44;
        const wood = 39;
        const top = (x: number) => 8 + (22 * (ex - x)) / 130;
        const bot = (x: number) => 96 - (24 * (ex - x)) / 130;
        for (const [x, y, t] of [
            [4, 96, -0.3],
            [10, 80, 0.9],
            [28, 76, -0.2],
            [18, 86, 0.6],
            [34, 95, -0.9],
            [52, 90, 0.2],
            [70, 97, -0.5],
            [92, 97, 0.4],
            [178, 97, -0.2],
        ] as const)
            leaf(c, x, y, 14, t);
        const body: Pt[] = [
            [ex, top(ex)],
            [20, top(20)],
            [12, 34],
            [15, 40],
            [8, 46],
            [13, 52],
            [7, 58],
            [13, 64],
            [11, 69],
            [20, bot(20)],
            [ex, bot(ex)],
        ];
        pen.polygon(g, body, "pencil", pen.fill("card"), { stroke: "none", strokeWidth: 0 });
        pen.polygon(
            g,
            body,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 6.5, fillWeight: 0.7, hachureAngle: 90 }),
            { strokeWidth: 1.8, preserveVertices: true },
        );
        const moss: Pt[] = [];
        for (let x = 26; x <= 140; x += 9.5)
            moss.push([x, top(x) - (Math.round(x / 9.5) % 2 ? 5 : 3)]);
        for (let x = 140; x >= 26; x -= 19) moss.push([x, top(x) + 5]);
        pen.path(g, ring(moss), "pencil", pen.fill("mint"), { strokeWidth: 1.2 });

        pen.circle(
            g,
            ex,
            ey,
            R * 2,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3, fillWeight: 0.7 }),
            { strokeWidth: 1.8 },
        );
        pen.circle(g, ex, ey, wood * 2, "ruler", pen.fill("card"), { strokeWidth: 1.3 });
        const step = (wood - 2.5) / (n + 0.5);
        for (let k = 1; k <= n; k++)
            pen.circle(g, ex, ey, (2.5 + k * step) * 2, "ruler", null, {
                strokeWidth: 1.1,
                disableMultiStroke: true,
            });
        pen.circle(
            g,
            ex,
            ey,
            4,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.6 },
        );

        for (let i = 0; i < stools; i++) {
            const x = 66 + (i - (stools - 1) / 2) * 25;
            a[`toadstool(${i})`] = [x, toadstool(c, x, top(x) + 2), "up"];
        }
        a.rings = [ex + R, ey, "right"];
        a.moss = [60, top(60) - 5, "up"];
        a.end = [7, 52, "left"];
        return a;
    },
    describe: (p) =>
        `A fallen log lying in the leaves with moss along its top${Math.round(p.toadstools) > 0 ? " and red toadstools with white spots growing from it" : ""}, its cut end showing the rings of the tree.`,
    motion: {
        still: "A fallen log lies where it fell, and its rings are counted, so it holds still.",
    },
});
