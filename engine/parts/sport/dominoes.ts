import { type RawAnchors } from "../../ink/surface";
import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const PIPS: Record<number, Pt[]> = {
    0: [],
    1: [[0, 0]],
    2: [
        [-1, -1],
        [1, 1],
    ],
    3: [
        [-1, -1],
        [0, 0],
        [1, 1],
    ],
    4: [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
    ],
    5: [
        [-1, -1],
        [1, -1],
        [0, 0],
        [-1, 1],
        [1, 1],
    ],
    6: [
        [-1, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [1, 1],
    ],
};

export const dominoes = defineDrawing({
    id: "dominoes",
    family: "sport",
    title: "Dominoes",
    group: "Props",
    about: "Tiles with a dice pattern at each end, so a tile is two numbers at once. A row of them is a row of additions, and turning one round is the clearest picture of why the order does not matter.",
    params: {
        tiles: [
            [3, 4],
            [5, 5],
            [0, 6],
        ] as [number, number][],
        upright: false,
    },
    settings: { tiles: { kind: "fixed" }, upright: { kind: "flag" } },
    takes: [
        {
            label: "Three tiles",
            params: {
                tiles: [
                    [3, 4],
                    [5, 5],
                    [0, 6],
                ],
                upright: false,
            },
        },
        { label: "A double", params: { tiles: [[6, 6]], upright: false } },
        {
            label: "Standing up",
            params: {
                tiles: [
                    [2, 5],
                    [1, 3],
                ],
                upright: true,
            },
        },
    ],
    box: (p) =>
        p.upright ? { w: p.tiles.length * 4 + 1, h: 8 } : { w: p.tiles.length * 7 + 1, h: 5 },
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        p.tiles.forEach((tile, i) => {
            const up = p.upright,
                w = up ? 3 * U : 6 * U,
                h = up ? 6 * U : 3 * U;
            const x = (up ? 0.5 + i * 4 : 0.5 + i * 7) * U,
                y = U;
            pen.path(g, roundedRect(x, y, w, h, 7), "ruler", pen.fill("card"), {
                strokeWidth: 2.2,
            });
            pen.line(
                g,
                up ? x + 8 : x + w / 2,
                up ? y + h / 2 : y + 8,
                up ? x + w - 8 : x + w / 2,
                up ? y + h / 2 : y + h - 8,
                "ruler",
                { strokeWidth: 1.6 },
            );
            tile.forEach((n, half) => {
                const hx = up ? x + w / 2 : x + w / 4 + half * (w / 2),
                    hy = up ? y + h / 4 + half * (h / 2) : y + h / 2;
                const q = (up ? w : h) * 0.24;
                for (const [dx, dy] of PIPS[Math.max(0, Math.min(6, n))] ?? []) {
                    pen.circle(
                        g,
                        hx + dx * q,
                        hy + dy * q,
                        9,
                        "ruler",
                        { fill: c.t.ink, fillStyle: "solid" },
                        { strokeWidth: 0.8 },
                    );
                }
                a[`half(${i},${half})`] = [hx, hy, "up"];
            });
            a[`tile(${i})`] = [x + w / 2, y, "up"];
        });
        return a;
    },
    describe: () =>
        "Domino tiles in a row, each a white tile with a line across its middle and dice pips at each end.",
    reads: true,
});
