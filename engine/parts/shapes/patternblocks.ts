import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { say, soft } from "../lettering";

type Pt = [number, number];

/** The six blocks, at the real relative sizes: every one is built from the same unit triangle. */
const TRI = 1.6 * U;

function block<G>(c: Ctx<G>, kind: string, cx: number, cy: number, turn = 0): void {
    const { pen, g } = c,
        s = TRI;
    const reg = (n: number, r: number, off: number): Pt[] =>
        Array.from({ length: n }, (_, i) => [
            cx + r * Math.cos(off + turn + (i * 2 * Math.PI) / n),
            cy + r * Math.sin(off + turn + (i * 2 * Math.PI) / n),
        ]);
    const fill = (m: Marker) => pen.fill(m, "solid", { hachureGap: 7 });
    if (kind === "hexagon")
        pen.polygon(g, reg(6, s, 0), "ruler", fill("glow"), { strokeWidth: 1.8 });
    else if (kind === "trapezoid")
        pen.polygon(g, reg(6, s, 0).slice(0, 4), "ruler", fill("berry"), { strokeWidth: 1.8 });
    else if (kind === "triangle")
        pen.polygon(g, reg(3, s * 0.75, -Math.PI / 2), "ruler", fill("mint"), { strokeWidth: 1.8 });
    else if (kind === "square")
        pen.polygon(g, reg(4, s * 0.72, Math.PI / 4), "ruler", fill("tang"), { strokeWidth: 1.8 });
    else if (kind === "rhombus") {
        const h = s * 0.87;
        pen.polygon(
            g,
            rot(
                [
                    [cx - h, cy],
                    [cx, cy - s / 2],
                    [cx + h, cy],
                    [cx, cy + s / 2],
                ],
                cx,
                cy,
                turn,
            ),
            "ruler",
            fill("sky"),
            { strokeWidth: 1.8 },
        );
    } else {
        const h = s * 0.97;
        pen.polygon(
            g,
            rot(
                [
                    [cx - h, cy],
                    [cx, cy - s * 0.26],
                    [cx + h, cy],
                    [cx, cy + s * 0.26],
                ],
                cx,
                cy,
                turn,
            ),
            "ruler",
            pen.fill("card"),
            { strokeWidth: 1.8 },
        );
    }
}

const rot = (pts: Pt[], cx: number, cy: number, t: number): Pt[] =>
    pts.map(([x, y]) => [
        cx + (x - cx) * Math.cos(t) - (y - cy) * Math.sin(t),
        cy + (x - cx) * Math.sin(t) + (y - cy) * Math.cos(t),
    ]);

const BLOCKS = ["hexagon", "trapezoid", "rhombus", "triangle", "square", "thin"];

export const patternBlocks = defineDrawing({
    id: "patternblocks",
    family: "shapes",
    title: "Pattern blocks",
    group: "Props",
    about: "The six blocks from the tub, or one hexagon covered by the smaller ones. Covering a hexagon two, three and six ways is the shortest route there is to halves, thirds and sixths of the same whole.",
    params: { mode: "set" },
    settings: { mode: { kind: "one of", of: ["set", "halves", "thirds", "sixths"] } },
    takes: [
        { label: "The whole set", params: { mode: "set" } },
        { label: "A hexagon in halves", params: { mode: "halves" } },
        { label: "In thirds", params: { mode: "thirds" } },
        { label: "In sixths", params: { mode: "sixths" } },
    ],
    box: (p) => (p.mode === "set" ? { w: 22, h: 7 } : { w: 9, h: 9 }),
    draw: (c, p) => {
        const a: RawAnchors = {};
        if (p.mode === "set") {
            BLOCKS.forEach((kind, i) => {
                const cx = (2.2 + i * 3.6) * U;
                block(c, kind, cx, 3 * U);
                soft(c, cx, 5.6 * U, kind === "thin" ? "thin" : kind, 13);
                a[`block(${kind})`] = [cx, 3 * U - TRI, "up"];
            });
            return a;
        }
        // The covering pieces are cut from the hexagon's own corners rather than placed next to it,
        // which is the only way they tile it exactly: two trapezoids, three rhombi or six triangles.
        const { pen, g } = c,
            cx = 4.5 * U,
            cy = 4.2 * U,
            R = 2.6 * U;
        const V = (i: number): Pt => [
            cx + R * Math.cos((i * Math.PI) / 3),
            cy + R * Math.sin((i * Math.PI) / 3),
        ];
        const n = p.mode === "sixths" ? 6 : p.mode === "thirds" ? 3 : 2;
        const fill: Marker = n === 6 ? "mint" : n === 3 ? "sky" : "berry";
        for (let i = 0; i < n; i++) {
            const step = 6 / n;
            const pts: Pt[] =
                n === 2
                    ? [V(i * 3), V(i * 3 + 1), V(i * 3 + 2), V(i * 3 + 3)]
                    : [[cx, cy], ...Array.from({ length: step + 1 }, (_, k) => V(i * step + k))];
            pen.polygon(g, pts, "ruler", pen.fill(fill, "solid", { hachureGap: 7 }), {
                strokeWidth: 1.8,
            });
            const mx = pts.reduce((t, q) => t + q[0], 0) / pts.length,
                my = pts.reduce((t, q) => t + q[1], 0) / pts.length;
            a[`piece(${i})`] = [mx, my, "up"];
        }
        pen.polygon(
            g,
            Array.from({ length: 6 }, (_, i) => V(i)),
            "ruler",
            null,
            { strokeWidth: 2.6 },
        );
        say(c, cx, 7.8 * U, `${n} of them make one`, 15);
        a.hexagon = [cx, cy - R, "up"];
        return a;
    },
    describe: (p) =>
        p.mode === "set"
            ? "The six pattern blocks in a row, a hexagon, a trapezoid, a rhombus, a triangle, a square and a thin rhombus, each named underneath."
            : "A hexagon outlined in ink and covered exactly by smaller pattern blocks of one kind, with how many make one written under it.",
});
