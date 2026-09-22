import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

/**
 * The seven pieces in the unit square: two large triangles of a quarter each, one medium and one
 * square of an eighth, one parallelogram of an eighth, and two small triangles of a sixteenth.
 * They add to exactly one, which is what makes the square a picture of sixteenths.
 */
const TANGRAM: { pts: Pt[]; fill: Marker }[] = [
    {
        pts: [
            [0, 0],
            [1, 0],
            [0.5, 0.5],
        ],
        fill: "sky",
    },
    {
        pts: [
            [1, 0],
            [1, 1],
            [0.5, 0.5],
        ],
        fill: "mint",
    },
    {
        pts: [
            [0, 0.5],
            [0.5, 1],
            [0, 1],
        ],
        fill: "berry",
    },
    {
        pts: [
            [0.25, 0.25],
            [0.5, 0.5],
            [0.25, 0.75],
            [0, 0.5],
        ],
        fill: "glow",
    },
    {
        pts: [
            [0, 0],
            [0.25, 0.25],
            [0, 0.5],
        ],
        fill: "tang",
    },
    {
        pts: [
            [0.5, 1],
            [1, 1],
            [0.75, 0.75],
        ],
        fill: "sky",
    },
    {
        pts: [
            [0.5, 0.5],
            [0.75, 0.75],
            [0.5, 1],
            [0.25, 0.75],
        ],
        fill: "tang",
    },
];

export const tangram = defineDrawing({
    id: "tangram",
    family: "puzzles",
    title: "Tangram",
    group: "Props",
    about: "The seven pieces that make one square, together or pulled apart. Every piece is a whole number of the smallest triangles, so the square is also a picture of sixteenths.",
    params: { apart: false, size: 8 },
    settings: { apart: { kind: "flag" }, size: { kind: "whole", min: 4, max: 12 } },
    takes: [
        { label: "The square", params: { apart: false, size: 8 } },
        { label: "Pulled apart", params: { apart: true, size: 8 } },
        { label: "Smaller", params: { apart: false, size: 6 } },
    ],
    box: (p) => ({ w: p.size + (p.apart ? 4 : 2), h: p.size + (p.apart ? 4 : 2) }),
    draw: (c, p) => {
        const { pen, g } = c,
            s = p.size * U,
            o = (p.apart ? 2 : 1) * U,
            a: RawAnchors = {};
        TANGRAM.forEach((piece, i) => {
            const mx = piece.pts.reduce((t, q) => t + q[0], 0) / piece.pts.length;
            const my = piece.pts.reduce((t, q) => t + q[1], 0) / piece.pts.length;
            // Pulling them apart slides each piece away from the middle of the square. It must be a
            // slide and not a scale, or the pieces stop being the pieces.
            const dx = p.apart ? (mx - 0.5) * 0.34 : 0,
                dy = p.apart ? (my - 0.5) * 0.34 : 0;
            const pts: Pt[] = piece.pts.map(([x, y]) => [o + (x + dx) * s, o + (y + dy) * s]);
            pen.polygon(g, pts, "ruler", pen.fill(piece.fill, "solid", { hachureGap: 7 }), {
                strokeWidth: 1.8,
            });
            a[`piece(${i})`] = [o + (mx + dx) * s, o + (my + dy) * s, "up"];
        });
        if (!p.apart) pen.rect(g, o, o, s, s, "ruler", null, { strokeWidth: 2.6 });
        return a;
    },
    describe: (p) =>
        `The seven tangram pieces, two large triangles, a medium one, two small ones, a square and a parallelogram, each in its own colour, ${p.apart ? "slid a little apart from the middle" : "fitted together into one square"}.`,
});
