import { type RawAnchors, clip } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, patch, penned, say, soft } from "../lettering";

/**
 * The Earth's layers from the surface down, depths in kilometres. The mean radius is 6,371 km
 * (IUGG); the core begins at 2,890 km and the inner core at 5,150 km (PREM, Dziewonski and
 * Anderson, 1981); the crust is 5 to 70 km thick, thin under the oceans and thick under mountains,
 * and 35 km is its usual thickness under a continent (USGS, "The interior of the Earth").
 */
export const EARTH_LAYERS = [
    { name: "crust", from: 0, to: 35, state: "solid rock" },
    { name: "mantle", from: 35, to: 2890, state: "solid rock that flows very slowly" },
    { name: "outer core", from: 2890, to: 5150, state: "liquid iron and nickel" },
    { name: "inner core", from: 5150, to: 6371, state: "solid iron and nickel" },
] as const;

export const EARTH_RADIUS = 6371;

/** The layer at a depth in kilometres, by its index in EARTH_LAYERS, or -1 below the centre or above the ground. */
export const layerAt = (depth: number): number =>
    depth < 0 || depth > EARTH_RADIUS ? -1 : EARTH_LAYERS.findIndex((l) => depth <= l.to);

/** How thick a layer is in kilometres; the inner core's is its radius. */
export const thicknessOf = (i: number): number => {
    const l = EARTH_LAYERS[Math.round(i)];
    return l ? l.to - l.from : 0;
};

const R = 7 * U,
    CX = 7.5 * U,
    CY = 8 * U,
    // drawn to scale inside the crust, which at scale would be a quarter of a unit and is drawn as a band
    CRUST = 6,
    radius = (depth: number): number => ((EARTH_RADIUS - depth) / EARTH_RADIUS) * R;

/** A closed smooth outline through the middles of a polygon's sides, for a coast. */
function blob(pts: readonly [number, number][]): string {
    const mid = (i: number): [number, number] => {
        const [ax, ay] = pts[i % pts.length] ?? [0, 0],
            [bx, by] = pts[(i + 1) % pts.length] ?? [0, 0];
        return [(ax + bx) / 2, (ay + by) / 2];
    };
    const [sx, sy] = mid(0);
    let d = `M${sx} ${sy}`;
    for (let i = 1; i <= pts.length; i++) {
        const [cx, cy] = pts[i % pts.length] ?? [0, 0],
            [mx, my] = mid(i);
        d += `Q${cx} ${cy} ${mx} ${my}`;
    }
    return `${d}Z`;
}

const DEPTH_WORDS = ["5 to 70 km thick", "to 2,890 km", "to 5,150 km", "to 6,371 km, the centre"];

export const earthInside = defineDrawing({
    id: "earthinside",
    family: "science",
    title: "The Earth inside",
    group: "Structures",
    about: "The Earth with a quarter cut away to show its layers: the crust, 5 to 70 km thick; the mantle, solid rock that flows very slowly, down to 2,890 km; the liquid outer core of iron and nickel down to 5,150 km; and the solid inner core down to the centre at 6,371 km. The layers below the crust are drawn to scale, and the crust, which at scale would be thinner than a line, is drawn as a band. `names` 0 letters the layers A to D in place of their names, `depths` 1 writes how deep each goes, `ask` (1 to 4, 0 none) puts a question mark in place of one layer's depth, and `scale` 1 draws a bar 1,000 km long.",
    params: { names: 1, depths: 1, ask: 0, scale: 0 },
    settings: {
        names: { kind: "whole", min: 0, max: 1 },
        depths: { kind: "whole", min: 0, max: 1 },
        ask: { kind: "whole", min: 0, max: 4 },
        scale: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Named, with depths", params: { names: 1, depths: 1, ask: 0, scale: 0 } },
        { label: "Lettered, no depths", params: { names: 0, depths: 0, ask: 0, scale: 0 } },
        {
            label: "The outer core's depth asked, with a scale",
            params: { names: 1, depths: 1, ask: 3, scale: 1 },
        },
    ],
    box: () => ({ w: 26, h: 17 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            ask = Math.round(p.ask);
        // the three quarters still whole: sea with land on it, seen from outside
        const whole = clip(c, {
            kind: "polygon",
            points: [
                [CX, CY],
                [CX, CY - R - U],
                [CX - R - U, CY - R - U],
                [CX - R - U, CY + R + U],
                [CX + R + U, CY + R + U],
                [CX + R + U, CY],
            ],
        });
        whole.pen.circle(
            whole.g,
            CX,
            CY,
            2 * R,
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 9 }),
            {
                stroke: "none",
            },
        );
        const land: [number, number][][] = [
            [
                [-6.2, -2.2],
                [-5, -3.6],
                [-3.4, -4.8],
                [-2.2, -4.2],
                [-1.4, -5],
                [-0.6, -3.4],
                [-1.8, -2.6],
                [-1.4, -1.2],
                [-2.8, -0.8],
                [-3.4, 0.6],
                [-4.6, -0.2],
                [-5.8, -0.4],
            ],
            [
                [-3, 1.4],
                [-1.6, 1],
                [-0.2, 1.8],
                [0.4, 3.2],
                [-0.2, 4.4],
                [-0.8, 5.8],
                [-1.6, 4.8],
                [-2.2, 3.4],
                [-3.2, 2.6],
            ],
            [
                [1.8, 1.2],
                [3.4, 0.8],
                [5.2, 1],
                [6.2, 2.2],
                [5.4, 3],
                [4.8, 4.6],
                [3.6, 4],
                [2.4, 3.2],
                [2.6, 2.2],
            ],
        ];
        for (const shape of land) {
            const coast = blob(shape.map(([x, y]): [number, number] => [CX + x * U, CY + y * U]));
            // the land is laid on paper first, so the sea's hatching does not show through it
            whole.pen.path(whole.g, coast, "ruler", pen.fill("card"), { stroke: "none" });
            whole.pen.path(
                whole.g,
                coast,
                "pencil",
                pen.fill("mint", "hachure", { hachureGap: 6 }),
                { strokeWidth: 1.2 },
            );
        }
        // each layer as a ring of the quarter, so no layer's hatching lies over another's
        const ring = (outer: number, inner: number): string =>
            inner > 0
                ? `M${CX} ${CY - outer}A${outer} ${outer} 0 0 1 ${CX + outer} ${CY}L${CX + inner} ${CY}A${inner} ${inner} 0 0 0 ${CX} ${CY - inner}Z`
                : `M${CX} ${CY}L${CX} ${CY - outer}A${outer} ${outer} 0 0 1 ${CX + outer} ${CY}Z`;
        const LOOKS = [
            pen.fill("ink-soft", "hachure", { hachureGap: 2.5 }),
            pen.fill("tang", "hachure", { hachureGap: 9, hachureAngle: 20 }),
            pen.fill("glow", "dots", { hachureGap: 7 }),
            pen.fill("berry", "hachure", { hachureGap: 6 }),
        ];
        const edges = [R, R - CRUST, radius(2890), radius(5150), 0];
        LOOKS.forEach((look, i) =>
            pen.path(g, ring(edges[i] ?? 0, edges[i + 1] ?? 0), "ruler", look, {
                strokeWidth: 1.4,
            }),
        );
        pen.circle(g, CX, CY, 2 * R, "ruler", null, { strokeWidth: 2 });
        // each layer's name and depth at the right, with a line to a point inside it
        const inside = [
            R - CRUST / 2,
            (R - CRUST + radius(2890)) / 2,
            (radius(2890) + radius(5150)) / 2,
            radius(5150) / 2,
        ];
        const at = [-38, -32, -30, -35].map((d) => (d * Math.PI) / 180);
        const x = 17.4 * U;
        inside.forEach((r, i) => {
            const y = (2.4 + i * 3.2) * U,
                th = at[i] ?? 0,
                px = CX + r * Math.cos(th),
                py = CY + r * Math.sin(th);
            pen.circle(g, px, py, 5, "ruler", pen.fill("card"), { strokeWidth: 1.2 });
            pen.line(g, px + 2.5, py, x - 0.3 * U, y - 0.25 * U, "ruler", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
            const name = EARTH_LAYERS[i]?.name ?? "";
            say(c, x, y, p.names > 0 ? name : ("ABCD"[i] ?? "?"), p.names > 0 ? 15 : 17, "start");
            if (p.depths > 0) {
                if (ask === i + 1) {
                    soft(c, x, y + 0.9 * U, "to", 13, "start");
                    penned(c, x + 1.2 * U, y + 1 * U, "?", 18, "start");
                    soft(c, x + 2 * U, y + 0.9 * U, "km", 13, "start");
                } else soft(c, x, y + 0.9 * U, DEPTH_WORDS[i] ?? "", 13, "start");
            }
            a[`layer(${i})`] = [px, py, "right"];
        });
        a.centre = [CX, CY, "left"];
        a.surface = [CX - R, CY, "left"];
        if (p.scale > 0) {
            const len = (1000 / EARTH_RADIUS) * R,
                y = 16 * U,
                x0 = CX;
            patch(c, x0 + len / 2, y, len + 8, 10);
            pen.line(g, x0, y, x0 + len, y, "ruler", { strokeWidth: 2 });
            for (const e of [x0, x0 + len])
                pen.line(g, e, y - 5, e, y + 5, "ruler", { strokeWidth: 1.6 });
            soft(c, x0 + len + 0.4 * U, y + 4, "1,000 km", 13, "start");
        }
        cap(c, 17.4 * U, 15.6 * U, "crust drawn thicker", 11, "start");
        return a;
    },
    describe: (p) =>
        `The Earth with a quarter cut away to show its layers, from a thin crust at the surface down to a core at the centre, ${p.names > 0 ? "each named" : "each lettered"} at the side.`,
    reads: true,
    motion: { still: "A diagram whose layers and depths are read off it holds still." },
});
