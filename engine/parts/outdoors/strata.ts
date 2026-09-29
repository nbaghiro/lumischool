import { type Ctx, type RawAnchors, clip, group } from "../../ink/surface";
import { rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { sayOn, soft } from "../lettering";
import { type Pt, blade, clamp } from "../animals/nature";

/** Where a boundary drawn through `pts`, left to right, is at `x`. */
function yAt(pts: readonly Pt[], x: number): number {
    for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1] ?? [0, 0],
            [bx, by] = pts[i] ?? [0, 0];
        if (x <= bx || i === pts.length - 1) return ay + ((by - ay) * (x - ax)) / (bx - ax || 1);
    }
    return pts[0]?.[1] ?? 0;
}

/** The fossil the layer `k` holds, at its middle: an ammonite, a shell, a fish or a leaf. */
function fossil<G>(d: Ctx<G>, k: number, fx: number, fy: number): void {
    if (k % 4 === 1) {
        // an ammonite
        const ln: Pt[] = [];
        for (let th = 0; th < Math.PI * 5; th += 0.3) {
            const r = 1.3 * Math.exp(0.18 * th);
            ln.push([fx + r * Math.cos(th), fy + r * Math.sin(th)]);
        }
        d.pen.curve(d.g, ln, "pencil", { strokeWidth: 1.2 });
    } else if (k % 4 === 2) {
        // a shell
        d.pen.path(
            d.g,
            `M${fx - 0.5 * U} ${fy + 0.3 * U}Q${fx} ${fy - 0.6 * U} ${fx + 0.5 * U} ${fy + 0.3 * U}Z`,
            "pencil",
            d.pen.fill("card"),
            { strokeWidth: 1.1 },
        );
        for (const e of [-0.25, 0, 0.25])
            d.pen.line(d.g, fx, fy + 0.3 * U, fx + e * U, fy - 0.15 * U, "pencil", {
                strokeWidth: 0.8,
            });
    } else if (k % 4 === 3) {
        // a little fish, bones and all
        d.pen.line(d.g, fx - 0.7 * U, fy, fx + 0.5 * U, fy, "pencil", { strokeWidth: 1.2 });
        for (let q = 0; q < 4; q++)
            d.pen.line(
                d.g,
                fx - 0.4 * U + q * 0.22 * U,
                fy - 0.22 * U,
                fx - 0.4 * U + q * 0.22 * U,
                fy + 0.22 * U,
                "pencil",
                { strokeWidth: 0.9 },
            );
        d.pen.circle(d.g, fx + 0.62 * U, fy, 0.3 * U, "pencil", null, { strokeWidth: 1 });
        d.pen.polygon(
            d.g,
            [
                [fx - 0.7 * U, fy],
                [fx - 1 * U, fy - 0.25 * U],
                [fx - 1 * U, fy + 0.25 * U],
            ],
            "pencil",
            null,
            { strokeWidth: 1 },
        );
    } else if (k > 0) {
        // a leaf
        d.pen.polygon(
            d.g,
            blade(fx - 0.6 * U, fy + 0.1 * U, 1.3 * U, 0.55 * U, -0.2),
            "pencil",
            d.pen.fill("card"),
            { strokeWidth: 1 },
        );
    }
}

export const strata = defineDrawing({
    id: "strata",
    family: "outdoors",
    title: "Layers of rock",
    group: "Structures",
    about: "A cliff cut through to show its layers, the oldest at the bottom and the youngest at the top, each a different rock with different things in it: shells, a fish, a leaf, an ammonite. Reading down the layers is reading back in time, which makes it a timeline to put fossils on. `ash` makes the layer at that place from the top (1 the youngest, 0 none) a thin band of volcanic ash, laid in one short time and so the same age everywhere it is found. `fault` breaks the lowest that many layers along a slanting crack, with the block on the right slipped down; a fault is younger than every layer it breaks and older than any layer lying unbroken across it, and at the number of layers it breaks the ground as well.",
    params: { layers: 5, names: 1, ash: 0, fault: 0 },
    settings: {
        layers: { kind: "whole", min: 3, max: 7 },
        names: { kind: "whole", min: 0, max: 1 },
        ash: { kind: "whole", min: 0, max: 7 },
        fault: { kind: "whole", min: 0, max: 7 },
    },
    takes: [
        { label: "Five layers, named", params: { layers: 5, names: 1, ash: 0, fault: 0 } },
        { label: "Seven layers", params: { layers: 7, names: 0, ash: 0, fault: 0 } },
        { label: "Three layers", params: { layers: 3, names: 1, ash: 0, fault: 0 } },
        {
            label: "An ash layer, a fault through the lowest three",
            params: { layers: 5, names: 1, ash: 2, fault: 3 },
        },
        { label: "A fault through every layer", params: { layers: 4, names: 0, ash: 3, fault: 4 } },
    ],
    box: () => ({ w: 14, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.layers, 3, 7),
            ash = Math.round(clamp(p.ash, 0, n)) - 1,
            cut = Math.round(clamp(p.fault, 0, n)),
            x0 = 0.5 * U,
            x1 = 9.6 * U,
            top = 1.8 * U,
            bot = 11.5 * U,
            a: RawAnchors = {};
        const TH = [1, 1.4, 0.8, 1.2, 1.6, 0.9, 1.3]
                .slice(0, n)
                .map((t, k) => (k === ash ? 0.6 : t)),
            sum = TH.reduce((s, v) => s + v, 0);
        const KINDS = [
            pen.fill("glow", "dots", { hachureGap: 6 }),
            pen.fill("sky", "hachure", { hachureGap: 5, hachureAngle: 0 }),
            pen.fill("tang", "cross-hatch", { hachureGap: 7 }),
            pen.fill("ink-soft", "hachure", { hachureGap: 3.5, hachureAngle: 0, fillWeight: 0.6 }),
            pen.fill("card"),
            pen.fill("tang", "hachure", { hachureGap: 4 }),
            pen.fill("berry", "hachure", { hachureGap: 5 }),
        ];
        const edge = (y: number, k: number): Pt[] => [
            [x0, y],
            [x0 + 2.4 * U, y + (k % 2 ? 4 : -3)],
            [x0 + 5.3 * U, y + (k % 3 ? -4 : 3)],
            [x0 + 7.6 * U, y + 2],
            [x1, y - 2],
        ];
        const thick = (k: number): number => ((bot - top) * (TH[k] ?? 0)) / sum,
            middle = (k: number): number => (tops[k] ?? top) + thick(k) / 2;
        const tops: number[] = [];
        let y = top;
        for (let k = 0; k < n; k++) {
            tops.push(y);
            y += thick(k);
        }
        const layer = <H>(d: Ctx<H>, k: number, sink = 0): void => {
            const at = tops[k] ?? top,
                h = thick(k),
                up = edge(at, k),
                down = edge(at + h, k + 1).map(([x, yy]): Pt => [x, yy + sink]);
            d.pen.polygon(
                d.g,
                [...up, ...[...down].reverse()],
                "pencil",
                k === ash ? d.pen.fill("card") : KINDS[k],
                { strokeWidth: 1.4 },
            );
            if (k === ash) {
                // ash: grey specks on pale ground, so it reads the same on screen and in ink
                const r = rng(31 + k);
                for (let x = x0 + 0.4 * U; x < x1 - 0.3 * U; x += 0.3 * U) {
                    const hi = yAt(up, x),
                        lo = yAt(down, x);
                    for (const f of [0.3, 0.7]) {
                        const sx = x + (r() - 0.5) * 4,
                            sy = hi + (lo - hi) * (f + (r() - 0.5) * 0.25);
                        d.pen.line(d.g, sx, sy, sx + 1.8, sy + 0.8, "ruler", {
                            strokeWidth: 1.6,
                            stroke: c.t["ink-soft"],
                        });
                    }
                }
            } else fossil(d, k, (k % 2 ? (cut > 0 ? 8.2 : 6.8) : 3.2) * U, at + h / 2);
        };
        if (cut === 0) {
            for (let k = 0; k < n; k++) {
                layer(c, k);
                a[`layer(${k})`] = [x1, middle(k), "right"];
            }
        } else {
            // a normal fault: the block on the right has slipped down along it, breaking the lowest `fault` layers
            const drop = 0.9 * U,
                first = n - cut,
                along = (yy: number): number => 6.3 * U - ((bot - yy) / (bot - top)) * 1.6 * U,
                over = top - 1.2 * U,
                left = clip(c, {
                    kind: "polygon",
                    points: [
                        [-U, over],
                        [along(over), over],
                        [along(bot), bot],
                        [-U, bot],
                    ],
                }),
                right = clip(c, {
                    kind: "polygon",
                    points: [
                        [along(over), over],
                        [x1 + U, over],
                        [x1 + U, bot],
                        [along(bot), bot],
                    ],
                }),
                slipped = group(right, { turn: [["translate", 0, drop]] });
            for (let k = 0; k < n; k++) {
                if (k < first - 1) layer(c, k);
                else if (k === first - 1) {
                    layer(left, k);
                    layer(right, k, drop);
                } else {
                    layer(left, k);
                    layer(slipped, k);
                }
                a[`layer(${k})`] = [x1, middle(k), "right"];
            }
            const upper = first > 0 ? (tops[first] ?? top) : top - 0.5 * U;
            pen.line(g, along(bot), bot, along(upper), upper, "ruler", { strokeWidth: 2.4 });
            const mid = (upper + bot) / 2;
            sayOn(c, along(bot) - 0.2 * U, bot - 0.35 * U, "fault", 13, "end");
            a.fault = [along(mid), mid, "left"];
        }
        if (ash >= 0) {
            const at = middle(ash);
            sayOn(c, x0 + 1.2 * U, at + 4, "ash", 13, "middle");
            a.ash = [x0 + 1.2 * U, at, "left"];
        }
        // soil and grass on top
        const ground = (d: Ctx<typeof g>): void => {
            d.pen.polygon(
                d.g,
                [[x0, top - 0.5 * U], [x1, top - 0.6 * U], ...edge(top, 0).reverse()],
                "pencil",
                d.pen.fill("mint"),
                { strokeWidth: 1.4 },
            );
            for (let x = x0 + 4; x < x1; x += 0.55 * U)
                d.pen.line(d.g, x, top - 0.5 * U, x + 2, top - 0.95 * U, "pencil", {
                    strokeWidth: 1.1,
                    stroke: c.t.ok,
                });
        };
        if (cut >= n) {
            const along = (yy: number): number => 6.3 * U - ((bot - yy) / (bot - top)) * 1.6 * U,
                over = top - 1.2 * U;
            ground(
                clip(c, {
                    kind: "polygon",
                    points: [
                        [-U, over],
                        [along(over), over],
                        [along(bot), bot],
                        [-U, bot],
                    ],
                }),
            );
            ground(
                group(
                    clip(c, {
                        kind: "polygon",
                        points: [
                            [along(over), over],
                            [x1 + U, over],
                            [x1 + U, bot],
                            [along(bot), bot],
                        ],
                    }),
                    { turn: [["translate", 0, 0.9 * U]] },
                ),
            );
        } else ground(c);
        if (p.names > 0) {
            soft(c, x1 + 0.4 * U, top + 0.55 * U, "youngest", 13, "start");
            soft(c, x1 + 0.4 * U, bot - 0.2 * U, "oldest", 13, "start");
            c.pen.arrow(
                g,
                [x1 + 1.6 * U, top + 1.4 * U],
                [x1 + 1.6 * U, bot - 1.2 * U],
                c.t["ink-soft"],
                0.02,
            );
        }
        return a;
    },
    describe: (p) => {
        const plain = `A cliff cut through to show its layers of rock, each a different kind, grass on top, a fossil in some${p.names > 0 ? " and an arrow beside it from youngest to oldest" : " of the layers"}.`;
        if (p.ash < 1 && p.fault < 1) return plain;
        const n = clamp(p.layers, 3, 7),
            broken = Math.round(clamp(p.fault, 0, n));
        const parts = [
            p.ash >= 1 ? "an ash band" : "",
            broken >= n
                ? "a fault through every layer"
                : broken > 0
                  ? "a fault through the lower ones"
                  : "",
        ].filter(Boolean);
        return `A cliff cut through to show its layers of rock, grass on top, a fossil in some, and ${parts.join(" and ")}.`;
    },
});
