import { type Ctx, type RawAnchors, type Side } from "../../ink/surface";
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

/** A turned handle's profile past the rim: distance out and half-width, in squares. */
const HANDLE: readonly Pt[] = [
    [0, 0.1],
    [0.1, 0.14],
    [0.2, 0.08],
    [0.45, 0.17],
    [0.68, 0.08],
    [0.78, 0.12],
    [0.9, 0.06],
];

/** The sea's picture for turning through angles. */
export const shipWheel = defineDrawing({
    id: "shipwheel",
    family: "travel",
    title: "Ship's wheel",
    group: "Props",
    about: "A ship's wooden wheel on its stand, with spokes set at equal angles round a brass hub, each ending in a turned handle past the rim. One handle is bound with rope, so how far the wheel is turned can be read from where it points.",
    params: { spokes: 8, turn: 0 },
    settings: {
        spokes: { kind: "one of", of: [6, 8] },
        turn: { kind: "whole", min: -180, max: 180 },
    },
    takes: [
        { label: "Eight spokes, not turned", params: { spokes: 8, turn: 0 } },
        { label: "Six spokes, turned 30°", params: { spokes: 6, turn: 30 } },
        { label: "Eight spokes, turned back 45°", params: { spokes: 8, turn: -45 } },
    ],
    box: () => ({ w: 6, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c;
        const n = p.spokes < 7 ? 6 : 8;
        const cx = 3 * U;
        const cy = 2.95 * U;
        const deck = 6.55 * U;
        const outer = 1.72 * U;
        const inner = 1.38 * U;
        const a: RawAnchors = {};
        // spokes and a rim in tang's cross-hatch print as lattice, so on paper the wood takes a single hatch
        const wood = pen.fill(
            "tang",
            "solid",
            c.paper ? { fillStyle: "hachure", hachureGap: 4.5 } : {},
        );
        const grain = pen.fill(
            "tang",
            "hachure",
            c.paper
                ? { fillStyle: "hachure", hachureGap: 8, hachureAngle: 45 }
                : { hachureGap: 4.5, fillWeight: 0.7 },
        );
        pen.polygon(
            g,
            [
                [cx - 0.32 * U, cy],
                [cx + 0.32 * U, cy],
                [cx + 0.56 * U, deck - 0.35 * U],
                [cx - 0.56 * U, deck - 0.35 * U],
            ],
            "pencil",
            grain,
            calm(c, 1.7),
        );
        pen.rect(g, cx - 0.5 * U, 5.05 * U, 1 * U, 0.22 * U, "pencil", wood, calm(c, 1.3));
        pen.rect(
            g,
            cx - 1.05 * U,
            deck - 0.35 * U,
            2.1 * U,
            0.35 * U,
            "pencil",
            wood,
            calm(c, 1.7),
        );
        const spokes = Array.from(
            { length: n },
            (_, k) => ((p.turn + (k * 360) / n) * Math.PI) / 180,
        );
        const along = (ang: number, r: number, w: number): Pt => [
            cx + Math.sin(ang) * r + Math.cos(ang) * w,
            cy - Math.cos(ang) * r + Math.sin(ang) * w,
        ];
        for (const ang of spokes)
            pen.polygon(
                g,
                [
                    along(ang, 0.3 * U, -0.13 * U),
                    along(ang, outer, -0.1 * U),
                    along(ang, outer, 0.1 * U),
                    along(ang, 0.3 * U, 0.13 * U),
                ],
                "ruler",
                wood,
                calm(c, 1.5),
            );
        const ring = (r: number, sweep: number) =>
            `M${cx + r} ${cy}A${r} ${r} 0 1 ${sweep} ${cx - r} ${cy}A${r} ${r} 0 1 ${sweep} ${cx + r} ${cy}Z`;
        pen.path(g, ring(outer, 1) + ring(inner, 0), "ruler", wood, calm(c, 1.8));
        spokes.forEach((ang, k) => {
            const side = HANDLE.map(([t, w]) => along(ang, outer + t * U, w * U));
            const other = HANDLE.map(([t, w]) => along(ang, outer + t * U, -w * U)).reverse();
            pen.polygon(
                g,
                [...side, ...other],
                "ruler",
                k === 0 ? pen.fill("card") : wood,
                calm(c, 1.5),
            );
            if (k === 0)
                for (const t of [0.34, 0.45, 0.56]) {
                    const [x0, y0] = along(ang, outer + t * U, -0.15 * U);
                    const [x1, y1] = along(ang, outer + (t + 0.06) * U, 0.15 * U);
                    pen.line(g, x0, y0, x1, y1, "ruler", calm(c, 0.9));
                }
            const dx = Math.sin(ang);
            const dy = -Math.cos(ang);
            const [tx, ty] = along(ang, outer + 0.9 * U, 0);
            const facing: Side =
                Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
            a[`handle(${k})`] = [tx, ty, facing];
        });
        pen.circle(g, cx, cy, 0.9 * U, "ruler", wood, calm(c, 1.6));
        pen.circle(g, cx, cy, 0.52 * U, "ruler", pen.fill("glow"), calm(c, 1.2));
        pen.circle(
            g,
            cx,
            cy,
            0.14 * U,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            calm(c, 0.8),
        );
        pen.line(g, 0.1 * U, deck, 5.9 * U, deck, "pencil", { strokeWidth: 1.8 });
        pen.line(g, 0.3 * U, deck + 0.3 * U, 5.7 * U, deck + 0.3 * U, "pencil", {
            ...calm(c, 0.9),
            stroke: c.t["ink-soft"],
        });
        a.hub = [cx, cy, "right"];
        a.stand = [cx + 1.05 * U, deck - 0.2 * U, "right"];
        return a;
    },
    describe: () =>
        "A ship's wheel on its stand with spokes set at equal angles round a brass hub, each ending in a turned handle past the rim, one handle bound with rope.",
    motion: {
        still: "How far the wheel is turned is read from the roped handle, so it holds still.",
    },
    reads: true,
});
