import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";

/** The six corners of a rectangle with one corner cut away, in units of the shape's own grid. */
function ellPoints(
    w: number,
    h: number,
    cut: number,
    deep: number,
    corner: string,
): [number, number][] {
    const base: [number, number][] = [
        [0, 0],
        [w - cut, 0],
        [w - cut, deep],
        [w, deep],
        [w, h],
        [0, h],
    ];
    const flipX = corner.includes("left"),
        flipY = corner.includes("bottom");
    return base.map(([x, y]) => [flipX ? w - x : x, flipY ? h - y : y]);
}

export const ellShape = defineDrawing({
    id: "lshape",
    family: "shapes",
    title: "Rectilinear shape",
    group: "Structures",
    about: "A rectangle with one corner cut away, every side labelled: perimeter and area of a compound shape.",
    params: { w: 9, h: 6, cut: 3, deep: 2, corner: "top-right", cell: 2, squares: false },
    settings: {
        w: { kind: "whole", min: 2, max: 12 },
        h: { kind: "whole", min: 2, max: 12 },
        cut: { kind: "whole", min: 1, max: 10 },
        deep: { kind: "whole", min: 1, max: 10 },
        corner: { kind: "one of", of: ["top-right", "top-left", "bottom-right", "bottom-left"] },
        cell: { kind: "one of", of: [1, 2] },
        squares: { kind: "flag" },
    },
    takes: [
        {
            label: "A corner cut out",
            params: { w: 9, h: 6, cut: 3, deep: 2, corner: "top-right", cell: 2, squares: false },
        },
        {
            label: "On squares",
            params: { w: 8, h: 5, cut: 3, deep: 2, corner: "bottom-left", cell: 2, squares: true },
        },
    ],
    box: (p) => ({ w: p.w * p.cell + 4, h: p.h * p.cell + 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = p.cell * U,
            ox = 2 * U,
            oy = 2 * U;
        const pts = ellPoints(p.w, p.h, p.cut, p.deep, p.corner);
        const px = pts.map(([x, y]) => [ox + x * s, oy + y * s] as [number, number]);
        const inside = (x: number, y: number) => {
            const [gx, gy] = [x + 0.5, y + 0.5];
            const notch = ellPoints(p.w, p.h, p.cut, p.deep, p.corner);
            // Point in polygon, by ray casting; the shape is rectilinear so this is exact.
            let hit = false;
            for (let i = 0, j = notch.length - 1; i < notch.length; j = i++) {
                const [xi, yi] = notch[i] ?? [0, 0],
                    [xj, yj] = notch[j] ?? [0, 0];
                if (yi > gy !== yj > gy && gx < ((xj - xi) * (gy - yi)) / (yj - yi) + xi)
                    hit = !hit;
            }
            return hit;
        };
        if (p.squares) {
            for (let y = 0; y < p.h; y++)
                for (let x = 0; x < p.w; x++) {
                    if (inside(x, y))
                        pen.rect(g, ox + x * s, oy + y * s, s, s, "ruler", null, {
                            strokeWidth: 0.9,
                        });
                }
        }
        pen.polygon(g, px, "ruler", null, { strokeWidth: 2.4 });
        const cx = px.reduce((t, q) => t + q[0], 0) / px.length,
            cy = px.reduce((t, q) => t + q[1], 0) / px.length;
        const a: RawAnchors = { centre: [cx, cy, "up"] };
        px.forEach(([x, y], i) => {
            a[`corner(${i})`] = [x, y, "up"];
        });
        for (let i = 0; i < pts.length; i++) {
            const [x1, y1] = pts[i] ?? [0, 0],
                [x2, y2] = pts[(i + 1) % pts.length] ?? [0, 0];
            const len = Math.abs(x2 - x1) + Math.abs(y2 - y1);
            const mx = ox + ((x1 + x2) / 2) * s,
                my = oy + ((y1 + y2) / 2) * s;
            const away = Math.hypot(mx - cx, my - cy) || 1;
            say(c, mx + ((mx - cx) / away) * 16, my + ((my - cy) / away) * 16 + 5, String(len), 15);
        }
        return a;
    },
    describe: (p) =>
        `An L-shaped outline on the grid with a corner cut away${p.squares ? ", its squares drawn inside" : ""}, and its side lengths written along the sides.`,
});
