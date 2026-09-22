import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const upto = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const tractor = defineDrawing({
    id: "tractor",
    family: "travel",
    title: "Tractor",
    group: "Props",
    about: "A farm tractor with a big back wheel and a small front one, a cab to sit in and a pipe that puffs, pulling a trailer of hay bales when it has one. The bales can be counted, and a big wheel goes round fewer times than a small one.",
    params: { trailer: 0, bales: 3 },
    settings: {
        trailer: { kind: "whole", min: 0, max: 1 },
        bales: { kind: "whole", min: 0, max: 4 },
    },
    takes: [
        { label: "On its own", params: { trailer: 0, bales: 0 } },
        { label: "Pulling four bales", params: { trailer: 1, bales: 4 } },
    ],
    box: (p) => ({ w: p.trailer > 0 ? 14 : 8, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            ground = 4.8 * U,
            withTrailer = p.trailer > 0,
            ox = withTrailer ? 6 * U : 0,
            a: RawAnchors = {};
        if (withTrailer) {
            const n = upto(p.bales, 0, 4),
                tw = 5 * U;
            pen.rect(
                g,
                0.4 * U,
                2.8 * U,
                tw,
                0.8 * U,
                "pencil",
                pen.fill("berry", "hachure", { hachureGap: 4 }),
                { strokeWidth: 1.6 },
            );
            pen.line(g, tw + 0.4 * U, 3.3 * U, ox + 0.8 * U, 3.5 * U, "pencil", { strokeWidth: 2 });
            for (const x of [1.5 * U, 4.2 * U]) {
                pen.circle(g, x, ground - 0.7 * U, 1.3 * U, "pencil", pen.fill("ink-soft"), {
                    strokeWidth: 1.5,
                });
                pen.circle(g, x, ground - 0.7 * U, 0.45 * U, "pencil", pen.fill("card"), {
                    strokeWidth: 1,
                });
            }
            for (let i = 0; i < n; i++) {
                const x = 0.6 * U + (i % 3) * 1.55 * U + (i >= 3 ? 0.75 * U : 0),
                    y = i >= 3 ? 1.5 * U : 2.8 * U;
                pen.rect(g, x, y - 1.2 * U, 1.45 * U, 1.2 * U, "pencil", pen.fill("glow"), {
                    strokeWidth: 1.3,
                });
                for (const f of [0.35, 0.7])
                    pen.line(
                        g,
                        x + 0.1 * U,
                        y - 1.2 * U + f * 1.2 * U,
                        x + 1.35 * U,
                        y - 1.2 * U + f * 1.2 * U,
                        "pencil",
                        { strokeWidth: 0.8, stroke: c.t.tang },
                    );
                a[`bale(${i})`] = [x + 0.72 * U, y - 1.2 * U, "up"];
            }
        }
        const X = (x: number) => ox + x;
        // the body and the bonnet, then the cab with its window
        pen.rect(g, X(3.4 * U), 2.3 * U, 3.8 * U, 1.3 * U, "pencil", pen.fill("mint"), {
            strokeWidth: 1.8,
        });
        pen.polygon(
            g,
            [
                [X(1.2 * U), 3.6 * U],
                [X(1.4 * U), 0.6 * U],
                [X(3.8 * U), 0.6 * U],
                [X(4 * U), 3.6 * U],
            ],
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.8 },
        );
        pen.rect(
            g,
            X(1.7 * U),
            0.95 * U,
            1.9 * U,
            1.3 * U,
            "ruler",
            pen.fill("sky", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.3 },
        );
        pen.rect(g, X(1.1 * U), 0.35 * U, 3.1 * U, 0.3 * U, "pencil", pen.fill("mint"), {
            strokeWidth: 1.3,
        });
        pen.rect(g, X(5.6 * U), 1 * U, 0.3 * U, 1.3 * U, "pencil", pen.fill("ink-soft"), {
            strokeWidth: 1.1,
        });
        a.exhaust = [X(5.75 * U), 1 * U, "up"];
        for (const [x, d] of [
            [2.4 * U, 3],
            [6.3 * U, 1.7],
        ] as const) {
            pen.circle(g, X(x), ground - (d / 2) * U, d * U, "pencil", pen.fill("ink-soft"), {
                strokeWidth: 1.8,
            });
            pen.circle(g, X(x), ground - (d / 2) * U, d * U * 0.45, "pencil", pen.fill("glow"), {
                strokeWidth: 1.2,
            });
            for (let k = 0; k < 8; k++) {
                const t = (k / 8) * Math.PI * 2;
                pen.line(
                    g,
                    X(x) + Math.cos(t) * d * U * 0.4,
                    ground - (d / 2) * U + Math.sin(t) * d * U * 0.4,
                    X(x) + Math.cos(t) * d * U * 0.5,
                    ground - (d / 2) * U + Math.sin(t) * d * U * 0.5,
                    "pencil",
                    { strokeWidth: 2 },
                );
            }
        }
        a.seat = [X(2.6 * U), 0.95 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A green tractor with a big back wheel and a small front one, a cab with a window and an exhaust pipe${p.trailer > 0 ? ", pulling a pink trailer stacked with hay bales" : ""}.`,
    motion: {
        body: { is: "breathe", amt: 0.02, period: 3 },
        puff: { at: "exhaust", every: 5, rise: 70, drift: 30 },
    },
});
