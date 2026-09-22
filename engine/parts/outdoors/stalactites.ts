import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, clamp } from "../animals/nature";

export const stalactites = defineDrawing({
    id: "stalactites",
    family: "outdoors",
    title: "Stalactites and stalagmites",
    group: "Props",
    about: "Stalactites hanging from a cave's roof and stalagmites growing up from its floor under them, drop by drop, until some meet in a column. They grow about a finger's width in a hundred years, so a long one is very old, and two can be compared by length.",
    params: { pairs: 3, joined: 1, rock: 1 },
    settings: {
        pairs: { kind: "whole", min: 1, max: 5 },
        joined: { kind: "whole", min: 0, max: 5 },
        rock: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Three pairs, one met", params: { pairs: 3, joined: 1, rock: 1 } },
        { label: "Four pairs, none met", params: { pairs: 4, joined: 0, rock: 1 } },
        { label: "Two columns, without the rock", params: { pairs: 2, joined: 2, rock: 0 } },
    ],
    box: () => ({ w: 12, h: 12 }),
    draw: (c, p) => {
        const rocky = p.rock > 0,
            { pen, g } = c,
            n = clamp(p.pairs, 1, 5),
            j = clamp(p.joined, 0, n),
            roof = rocky ? 1.2 * U : 0.1 * U,
            floor = rocky ? 10.9 * U : 11.9 * U,
            a: RawAnchors = {};
        const stone = pen.fill("glow", "hachure", { hachureGap: 3.4, fillWeight: 0.9 }),
            rim = { strokeWidth: 1.5 };
        const DOWN = [3.4, 4.6, 2.7, 3.9, 3],
            UP = [2.5, 3.2, 2, 2.9, 2.3];
        const xs = Array.from(
            { length: n },
            (_, i) => ((i + 0.5) * 12 * U) / n + (i % 2 ? 0.25 : -0.2) * U,
        );
        /** One side of a hanging or standing cone, wavy where the drips run down it, from its root to its point. */
        const cone = (x: number, y0: number, len: number, w0: number, dir: 1 | -1): Pt[] => {
            const left: Pt[] = [],
                right: Pt[] = [];
            for (let k = 0; k <= 8; k++) {
                const t = k / 8,
                    w = w0 * (1 - t) ** 0.85 + (k === 8 ? 0 : 1.5),
                    wob = Math.sin(t * 9 + x) * 2.2 * (1 - t);
                left.push([x - w + wob, y0 + dir * len * t]);
                right.push([x + w + wob * 0.6, y0 + dir * len * t]);
            }
            return [...left, ...right.reverse()];
        };
        for (let i = 0; i < n; i++) {
            const x = xs[i] ?? 0;
            if (i < j) {
                // a column: the two have met, and are one
                const waist = roof + (floor - roof) * 0.52,
                    L: Pt[] = [],
                    R: Pt[] = [];
                for (let k = 0; k <= 12; k++) {
                    const y = roof + ((floor - roof) * k) / 12,
                        w =
                            0.3 * U +
                            Math.abs(y - waist) * (y < waist ? 0.14 : 0.2) +
                            Math.sin(k * 1.7) * 2;
                    L.push([x - w, y]);
                    R.push([x + w, y]);
                }
                pen.polygon(g, [...L, ...R.reverse()], "pencil", stone, rim);
                for (let k = 1; k < 9; k++) {
                    const y = roof + ((floor - roof) * k) / 9,
                        w = 0.3 * U + Math.abs(y - waist) * 0.13;
                    pen.curve(
                        g,
                        [
                            [x - w, y],
                            [x, y + 3],
                            [x + w, y],
                        ],
                        "pencil",
                        { strokeWidth: 0.9, stroke: c.t.tang },
                    );
                }
                a[`column(${i})`] = [x, waist, "right"];
                continue;
            }
            const d = (DOWN[i] ?? 0) * U,
                u = (UP[i] ?? 0) * U;
            pen.polygon(g, cone(x, roof - 4, d, 0.5 * U, 1), "pencil", stone, rim);
            for (let k = 1; k < 4; k++) {
                const y = roof + (d * k) / 4.4,
                    w = 0.46 * U * (1 - k / 4.4);
                pen.curve(
                    g,
                    [
                        [x - w, y],
                        [x, y + 2.5],
                        [x + w, y],
                    ],
                    "pencil",
                    { strokeWidth: 0.9, stroke: c.t.tang },
                );
            }
            pen.path(
                g,
                `M${x} ${roof + d + 0.22 * U}Q${x - 5} ${roof + d + 0.52 * U} ${x} ${roof + d + 0.68 * U}Q${x + 5} ${roof + d + 0.52 * U} ${x} ${roof + d + 0.22 * U}Z`,
                "ruler",
                pen.fill("sky"),
                { strokeWidth: 1 },
            );
            pen.polygon(g, cone(x, floor + 4, u, 0.85 * U, -1), "pencil", stone, rim);
            for (let k = 1; k < 4; k++) {
                const y = floor - (u * k) / 4.2,
                    w = 0.78 * U * (1 - k / 4.2);
                pen.curve(
                    g,
                    [
                        [x - w, y],
                        [x, y + 2.5],
                        [x + w, y],
                    ],
                    "pencil",
                    { strokeWidth: 0.9, stroke: c.t.tang },
                );
            }
            a[`above(${i})`] = [x, roof + d, "down"];
            a[`below(${i})`] = [x, floor - u, "up"];
        }
        if (!rocky) return a;
        // the roof and the floor, lumpy, thicker where each one grows out of them
        const rock = pen.fill("ink-soft", "hachure", { hachureGap: 5, fillWeight: 0.7 });
        const edge = (base: number, out: number): Pt[] => {
            const pts: Pt[] = [];
            for (let k = 0; k <= 24; k++) {
                const x = (k / 24) * 12 * U,
                    bulge = xs.reduce((s, q) => s + Math.exp(-(((x - q) / (0.8 * U)) ** 2)), 0);
                pts.push([x, base + out * (Math.sin(k * 1.3) * 3 + bulge * 0.3 * U)]);
            }
            return pts;
        };
        pen.polygon(
            g,
            [[0, 0], [12 * U, 0], ...edge(roof - 0.3 * U, 1).reverse()],
            "pencil",
            rock,
            { strokeWidth: 1.7 },
        );
        pen.polygon(
            g,
            [[0, 12 * U], [12 * U, 12 * U], ...edge(floor + 0.3 * U, -1).reverse()],
            "pencil",
            rock,
            { strokeWidth: 1.7 },
        );
        return a;
    },
    describe: (p) =>
        `Stalactites hanging from a cave roof and stalagmites growing up under them${clamp(p.joined, 0, 5) > 0 ? ", some pairs met in a column" : ""}, drips at the tips${p.rock > 0 ? ", the roof and floor lumpy rock" : ""}.`,
});
