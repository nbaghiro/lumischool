import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const deg = (d: number): number => (d * Math.PI) / 180;

/** Hexagon radius. Chosen so a column of them is close to two squares across. */
const HEX_R = 1.4 * U;

export const tessellation = defineDrawing({
    id: "tessellation",
    family: "shapes",
    title: "Tessellation",
    group: "Structures",
    about: "One shape repeated with no gaps and no overlaps, in two colours so the repeat is visible. The question is usually which shapes can do this, and why a regular pentagon cannot.",
    params: { tile: "hexagon", cols: 4, rows: 4 },
    settings: {
        tile: { kind: "one of", of: ["hexagon", "triangle", "square"] },
        cols: { kind: "whole", min: 1, max: 8 },
        rows: { kind: "whole", min: 1, max: 8 },
    },
    takes: [
        { label: "Hexagons", params: { tile: "hexagon", cols: 4, rows: 4 } },
        { label: "Triangles", params: { tile: "triangle", cols: 4, rows: 4 } },
        { label: "An L of three squares", params: { tile: "ell", cols: 4, rows: 3 } },
    ],
    // A hexagon never lands on a square grid, so only the box is whole: the tiling inside it is
    // spaced by the shape's own geometry, 1.5r across and r root three down.
    box: (p) =>
        p.tile === "hexagon"
            ? {
                  w: Math.ceil(((p.cols * 1.5 + 0.5) * HEX_R) / U) + 2,
                  h: Math.ceil(((p.rows + 0.5) * HEX_R * Math.sqrt(3)) / U) + 2,
              }
            : p.tile === "triangle"
              ? { w: p.cols * 2 + 2, h: Math.ceil(p.rows * 2 * 0.87) + 2 }
              : { w: p.cols * 2 + 2, h: p.rows * 3 + 2 },
    draw: (c, p) => {
        const { pen, g } = c,
            fills: Marker[] = ["sky", "mint"],
            a: RawAnchors = {};
        const tile = (pts: Pt[], i: number) =>
            pen.polygon(
                g,
                pts,
                "ruler",
                pen.fill(fills[i % 2], "solid", { hachureGap: 7, fillWeight: 0.7 }),
                { strokeWidth: 1.6 },
            );
        if (p.tile === "hexagon") {
            const r = HEX_R,
                down = r * Math.sqrt(3);
            for (let k = 0; k < p.cols; k++) {
                for (let row = 0; row < p.rows; row++) {
                    const cx = U + r + k * r * 1.5,
                        cy = U + down / 2 + row * down + (k % 2 ? down / 2 : 0);
                    tile(
                        Array.from({ length: 6 }, (_, j): Pt => [
                            cx + r * Math.cos(deg(j * 60)),
                            cy + r * Math.sin(deg(j * 60)),
                        ]),
                        row + k,
                    );
                }
            }
        } else if (p.tile === "triangle") {
            const s = 2 * U,
                hgt = s * 0.87;
            for (let row = 0; row < p.rows; row++) {
                for (let k = 0; k < p.cols * 2 - 1; k++) {
                    const up = k % 2 === 0,
                        x = U + (k * s) / 2,
                        yy = U + row * hgt;
                    tile(
                        up
                            ? [
                                  [x, yy + hgt],
                                  [x + s, yy + hgt],
                                  [x + s / 2, yy],
                              ]
                            : [
                                  [x + s / 2, yy],
                                  [x + s, yy + hgt],
                                  [x + s * 1.5, yy],
                              ],
                        row + k,
                    );
                }
            }
        } else {
            // Two L-shaped trominoes fill a two by three block between them, which is the point worth
            // showing: a shape that leaves a hole on its own still tiles the plane in pairs.
            const s = U;
            for (let row = 0; row < p.rows; row++) {
                for (let k = 0; k < p.cols; k++) {
                    const x = U + k * 2 * s,
                        yy = U + row * 3 * s;
                    tile(
                        [
                            [x, yy],
                            [x + 2 * s, yy],
                            [x + 2 * s, yy + s],
                            [x + s, yy + s],
                            [x + s, yy + 2 * s],
                            [x, yy + 2 * s],
                        ],
                        row + k,
                    );
                    tile(
                        [
                            [x + 2 * s, yy + s],
                            [x + 2 * s, yy + 3 * s],
                            [x, yy + 3 * s],
                            [x, yy + 2 * s],
                            [x + s, yy + 2 * s],
                            [x + s, yy + s],
                        ],
                        row + k + 1,
                    );
                }
            }
        }
        a.first = [1.5 * U, U, "up"];
        return a;
    },
    describe: () =>
        "A tessellation of one shape repeated across the page with no gaps and no overlaps, in two colours in turn so the repeat can be seen.",
});
