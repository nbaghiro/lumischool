import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, clamp, ring } from "../animals/nature";

const tall = (height: number): number => 5 + 2 * clamp(height, 1, 3);

export const iceCliff = defineDrawing({
    id: "icecliff",
    family: "outdoors",
    title: "Ice cliff",
    group: "Props",
    about: "The sheer edge of an ice shelf standing out of the sea: a blue-white face in layered bands with cracks down it and a cave at the waterline, a flat snowy top, and small floes of ice in the water in front.",
    params: { height: 2, floes: 2 },
    settings: {
        height: { kind: "whole", min: 1, max: 3 },
        floes: { kind: "whole", min: 0, max: 3 },
    },
    takes: [
        { label: "With two floes", params: { height: 2, floes: 2 } },
        { label: "Low, on a clear sea", params: { height: 1, floes: 0 } },
        { label: "Tall, with three floes", params: { height: 3, floes: 3 } },
    ],
    box: (p) => ({ w: 16, h: tall(p.height) }),
    draw: (c, p) => {
        const { pen, g } = c,
            h = tall(p.height) * U,
            top = 1.2 * U,
            line = h - 2.4 * U,
            x0 = 0.3 * U,
            x1 = 13.4 * U,
            side = 15.4 * U,
            dip = 0.7 * U,
            a: RawAnchors = {};
        // the face's top edge is nearly flat, broken here and there where a block has fallen away
        const edge: Pt[] = [
            [x0, top + 0.15 * U],
            [2.6 * U, top],
            [4.4 * U, top + 0.1 * U],
            [4.7 * U, top + 0.4 * U],
            [9.2 * U, top + 0.35 * U],
            [9.5 * U, top + 0.05 * U],
            [x1, top + 0.15 * U],
        ];
        pen.polygon(g, [...edge, [x1, line], [x0, line]], "pencil", pen.fill("card"), {
            strokeWidth: 1.9,
        });
        pen.polygon(
            g,
            [
                [x1, top + 0.2 * U],
                [side, top + dip],
                [side, line],
                [x1, line],
            ],
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1.7 },
        );
        // the bands the snow laid down year on year, blue between white
        const bands = Math.max(2, Math.round((line - top) / (1.3 * U)) - 1);
        for (let k = 0; k < bands; k++) {
            const y = top + ((k + 1) * (line - top)) / (bands + 1),
                upper: Pt[] = [],
                lower: Pt[] = [];
            for (let i = 0; i <= 9; i++) {
                const x = x0 + (i / 9) * (x1 - x0),
                    wob = (i + k) % 3 === 0 ? 0.1 * U : i % 2 ? -0.06 * U : 0.04 * U;
                upper.push([x, y + wob]);
                lower.push([x, y + wob + (k % 2 ? 0.28 * U : 0.4 * U)]);
            }
            pen.polygon(
                g,
                [...upper, ...lower.reverse()],
                "pencil",
                pen.fill("sky", "hachure", { hachureGap: 3, fillWeight: 0.7 }),
                { stroke: "none" },
            );
            pen.curve(g, upper, "pencil", { strokeWidth: 0.9, stroke: c.t["ink-soft"] });
            pen.line(g, x1, y, side, y + dip * 0.9, "pencil", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
        }
        for (const [x, reach] of [
            [2.2, 0.55],
            [8.6, 0.7],
            [11.9, 0.4],
        ] as const) {
            const down = top + 0.3 * U + reach * (line - top - 1.8 * U),
                crack: Pt[] = [];
            for (let i = 0; i <= 4; i++)
                crack.push([
                    x * U + (i % 2 ? 0.18 * U : -0.12 * U),
                    top + 0.3 * U + (i / 4) * (down - top - 0.3 * U),
                ]);
            pen.linear(g, crack, "pencil", { strokeWidth: 1.3 });
        }
        // a cave the waves have worn at the foot of the face
        const cx = 5.2 * U,
            cw = 1.3 * U,
            ch = Math.min(1.7 * U, (line - top) * 0.35);
        pen.path(
            g,
            `M${cx - cw} ${line}Q${cx - cw} ${line - ch} ${cx} ${line - ch}Q${cx + cw} ${line - ch} ${cx + cw} ${line}Z`,
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1.6 },
        );
        pen.path(
            g,
            `M${cx - cw * 0.55} ${line}Q${cx - cw * 0.5} ${line - ch * 0.6} ${cx} ${line - ch * 0.62}Q${cx + cw * 0.5} ${line - ch * 0.6} ${cx + cw * 0.55} ${line}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 2.5, fillWeight: 0.7 }),
            { strokeWidth: 1 },
        );
        // the snow on top, rounded and hanging a little over the edge
        const snow: Pt[] = [
            ...edge.map(([x, y], i): Pt => [x, y - (i % 2 ? 0.7 : 0.55) * U]),
            [side, top + dip - 0.6 * U],
            [side + 0.1 * U, top + dip + 0.1 * U],
            [x1, top + 0.45 * U],
            ...edge.map(([x, y], i): Pt => [x + 0.3 * U, y + (i % 2 ? 0.35 : 0.15) * U]).reverse(),
            [x0 - 0.1 * U, top + 0.1 * U],
        ];
        pen.path(g, ring(snow), "pencil", pen.fill("card"), { strokeWidth: 1.8 });
        pen.polygon(
            g,
            [
                [0, line],
                [16 * U, line],
                [16 * U, h - 0.1 * U],
                [0, h - 0.1 * U],
            ],
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 8, fillWeight: 0.5 }),
            { stroke: "none" },
        );
        const wave: Pt[] = [];
        for (let x = 0; x <= 16 * U; x += 0.5 * U)
            wave.push([x, line + (Math.round(x / (0.5 * U)) % 2 ? -2.5 : 2.5)]);
        pen.curve(g, wave, "pencil", { strokeWidth: 1.7 });
        for (const [x, y, w] of [
            [1.4, 1.1, 1.4],
            [10.6, 1.7, 1.2],
            [14.2, 0.9, 1],
        ] as const)
            pen.line(g, x * U, line + y * U, (x + w) * U, line + y * U, "pencil", {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
            });
        const n = clamp(p.floes, 0, 3);
        for (const [i, [x, y, w]] of (
            [
                [3.4, 1.3, 2.8],
                [8.8, 1.7, 2.2],
                [12.8, 1.1, 1.6],
            ] as const
        ).entries()) {
            if (i >= n) break;
            const fx = x * U,
                fy = line + y * U,
                fw = w * U;
            pen.polygon(
                g,
                [
                    [fx - fw / 2, fy],
                    [fx - fw / 2 + 0.2 * U, fy - 0.5 * U],
                    [fx + fw / 2 - 0.15 * U, fy - 0.55 * U],
                    [fx + fw / 2, fy],
                ],
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.5 },
            );
            pen.polygon(
                g,
                [
                    [fx - fw / 2, fy],
                    [fx + fw / 2, fy],
                    [fx + fw / 2 - 0.1 * U, fy + 0.3 * U],
                    [fx - fw / 2 + 0.1 * U, fy + 0.3 * U],
                ],
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 1.2 },
            );
            a[`floe(${i})`] = [fx, fy - 0.55 * U, "up"];
        }
        a.top = [7 * U, top - 0.7 * U, "up"];
        a.cave = [cx, line - ch, "up"];
        a.waterline = [side, line, "right"];
        return a;
    },
    describe: (p) =>
        `The sheer blue and white face of an ice shelf standing out of the sea, banded, cracked, with a cave at the waterline${p.floes > 0 ? " and small floes of ice in front" : ""}.`,
    motion: {
        still: "An ice shelf is the ground a world stands on, and its floes lie too close to its foot to float without seeming to slide.",
    },
});
