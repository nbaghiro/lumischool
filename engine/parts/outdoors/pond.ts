import { part, type Ctx, type RawAnchors } from "../../ink/surface";
import { rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, ring, lumps, along, clamp, eye } from "../animals/nature";

const PADS: Pt[] = [
    [-64, -24],
    [10, -46],
    [74, -14],
    [30, 40],
    [-46, 34],
    [0, 4],
];

const FISH: Pt[] = [
    [-20, 30],
    [52, 26],
    [-2, -14],
    [-84, 12],
    [26, 62],
];

const REEDS: Pt[] = [
    [-114, -10],
    [114, 6],
    [-96, 52],
];

const PAD_R = 17;

/** A lily pad: a disc with the wedge cut out of it that makes a pad read as a pad. */
function pad<G>(c: Ctx<G>, x: number, y: number, r: number, turn: number): void {
    const { pen, g } = c;
    const p1 = along(x, y, r, turn),
        p2 = along(x, y, r, turn + 0.62);
    pen.path(
        g,
        `M${x} ${y}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}A${r} ${r} 0 1 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}Z`,
        "pencil",
        pen.fill("mint", "solid", { hachureGap: 6, fillWeight: 0.6 }),
        { strokeWidth: 1.8 },
    );
    for (const k of [2.0, 3.1, 4.2]) {
        const e = along(x, y, r * 0.78, turn + k);
        pen.line(g, x, y, e[0], e[1], "pencil", { strokeWidth: 0.8, stroke: c.t["ink-soft"] });
    }
}

/** A frog from above, sitting on a pad: two eyes over the nose and two legs folded behind. */
function frog<G>(c: Ctx<G>, x: number, y: number): void {
    const { pen, g } = c,
        skin = () => pen.fill("glow", "solid", { hachureGap: 5 });
    for (const s of [-1, 1]) {
        pen.linear(
            g,
            [
                [x + s * 6, y - 2],
                [x + s * 19, y + 4],
                [x + s * 13, y + 17],
                [x + s * 5, y + 13],
            ],
            "pencil",
            { strokeWidth: 1.4 },
        );
    }
    pen.ellipse(g, x, y, 28, 26, "pencil", skin(), { strokeWidth: 1.8 });
    for (const s of [-1, 1]) {
        pen.circle(g, x + s * 8, y - 12, 12, "pencil", skin(), { strokeWidth: 1.4 });
        eye(c, x + s * 8, y - 13, 5);
    }
    pen.arc(g, x, y - 2, 18, 12, 0.4, Math.PI - 0.4, "pencil", { strokeWidth: 1.2 });
}

export const pond = defineDrawing({
    id: "pond",
    family: "outdoors",
    title: "Pond",
    group: "Props",
    about: "A pond seen from above, with lily pads on the surface, fish below it, reeds at the edge and a frog on one pad. Two separate counts sit in one picture, and what is above the water can be told from what is under it.",
    params: { pads: 4, fish: 3, frog: true },
    settings: {
        pads: { kind: "whole", min: 0, max: 6 },
        fish: { kind: "whole", min: 0, max: 5 },
        frog: { kind: "flag" },
    },
    takes: [
        { label: "Four pads, three fish", params: { pads: 4, fish: 3, frog: true } },
        { label: "Empty pond", params: { pads: 2, fish: 0, frog: false } },
    ],
    box: () => ({ w: 14, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            px = 7 * U,
            py = 5.6 * U,
            a: RawAnchors = {};
        const r = rng(6421);
        pen.path(
            g,
            ring(
                lumps(
                    px,
                    py,
                    120,
                    80,
                    [
                        1.0, 0.97, 1.03, 0.98, 1.02, 0.96, 1.04, 0.99, 1.01, 0.97, 1.03, 0.98, 1.0,
                        0.96, 1.04, 0.99,
                    ],
                ),
            ),
            "pencil",
            pen.fill("sky", "solid", { hachureGap: 11, fillWeight: 0.5 }),
            { strokeWidth: 2.4 },
        );
        // Fish first, so a pad can lie over one: that overlap is what puts them under the surface.
        for (let i = 0; i < clamp(p.fish, 0, FISH.length); i++) {
            const [dx, dy] = FISH[i] ?? [0, 0],
                x = px + dx,
                y = py + dy,
                d = i % 2 ? -1 : 1;
            pen.path(
                g,
                `M${x - d * 18} ${y}Q${x} ${y - 10} ${x + d * 17} ${y}Q${x} ${y + 10} ${x - d * 18} ${y}Z`,
                "pencil",
                null,
                { strokeWidth: 1.6, stroke: c.t["ink-soft"] },
            );
            pen.polygon(
                g,
                [
                    [x - d * 17, y],
                    [x - d * 28, y - 9],
                    [x - d * 28, y + 9],
                ],
                "pencil",
                null,
                { strokeWidth: 1.4, stroke: c.t["ink-soft"] },
            );
            eye(c, x + d * 9, y - 2, 4);
            a[`fish(${i})`] = [x, y, "up"];
        }
        const pads = clamp(p.pads, 0, PADS.length);
        for (let i = 0; i < pads; i++) {
            const [dx, dy] = PADS[i] ?? [0, 0];
            pad(c, px + dx, py + dy, PAD_R, 1.1 + i * 1.3);
            a[`pad(${i})`] = [px + dx, py + dy - PAD_R, "up"];
        }
        if (p.frog && pads > 0) {
            const fx = px + (PADS[0] ?? [0, 0])[0],
                fy = py + (PADS[0] ?? [0, 0])[1] - 2;
            frog(part(c, "frog", [fx, fy + 12]), fx, fy);
            a.frog = [fx, fy - 20, "up"];
        }
        for (const [dx, dy] of REEDS) {
            const x = px + dx,
                y = py + dy;
            for (let k = 0; k < 4; k++) {
                const sx = x + (k - 1.5) * 8,
                    h = 26 + r() * 24,
                    lean = (r() - 0.5) * 12;
                pen.curve(
                    g,
                    [
                        [sx, y],
                        [sx + lean * 0.5, y - h * 0.6],
                        [sx + lean, y - h],
                    ],
                    "pencil",
                    { strokeWidth: 1.3 },
                );
                pen.ellipse(
                    g,
                    sx + lean,
                    y - h - 5,
                    5,
                    11,
                    "pencil",
                    pen.fill("ink-soft", "solid"),
                    { strokeWidth: 0.9 },
                );
            }
        }
        a.pond = [px, py - 80, "up"];
        return a;
    },
    describe: (p) =>
        `A pond seen from above with lily pads on the surface, fish under the water and reeds at the edge${p.frog ? ", and a frog sitting on one pad" : ""}.`,
    motion: { parts: { frog: { is: "hop", lift: 8, squash: 0.15, period: 5.4 } } },
});
