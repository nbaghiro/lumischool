import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

const upto = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

/** A rope bridge between two posts, for the cloud islands (.docs/worlds-next.md). */
export const ropeBridge = defineDrawing({
    id: "ropebridge",
    family: "travel",
    title: "Rope bridge",
    group: "Props",
    about: "A rope bridge slung between two posts, with a plank to step on for every stride and a rope on each side to hold. It sags in the middle under its own weight. Its planks can be counted, and so can the ones still to be put in.",
    params: { planks: 10, gaps: 0 },
    settings: {
        planks: { kind: "whole", min: 4, max: 16 },
        gaps: { kind: "whole", min: 0, max: 14 },
    },
    takes: [
        { label: "Ten planks, all in", params: { planks: 10, gaps: 0 } },
        { label: "Twelve planks, three still to go", params: { planks: 12, gaps: 3 } },
        { label: "Six planks, one to go", params: { planks: 6, gaps: 1 } },
    ],
    box: () => ({ w: 16, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = upto(p.planks, 4, 16),
            gaps = upto(p.gaps, 0, n - 2),
            L = 1 * U,
            R = 15 * U,
            a: RawAnchors = {};
        const sag = (x: number, depth: number, y0: number) =>
            y0 + depth * (1 - ((2 * (x - L)) / (R - L) - 1) ** 2);
        const hand: Pt[] = [],
            foot: Pt[] = [];
        for (let k = 0; k <= 24; k++) {
            const x = L + ((R - L) * k) / 24;
            hand.push([x, sag(x, 1.1 * U, 1.4 * U)]);
            foot.push([x, sag(x, 1.6 * U, 3.2 * U)]);
        }
        for (let k = 1; k < n + 1; k++) {
            const x = L + ((R - L) * k) / (n + 1);
            pen.line(g, x, sag(x, 1.1 * U, 1.4 * U), x, sag(x, 1.6 * U, 3.2 * U), "pencil", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
        }
        const missing = new Set<number>();
        for (let i = 0; i < gaps; i++) missing.add(Math.round(((i + 1) * n) / (gaps + 1) - 0.5));
        for (let i = 0; i < n; i++) {
            const x = L + ((R - L) * (i + 0.5)) / n,
                y = sag(x, 1.6 * U, 3.2 * U),
                w = ((R - L) / n) * 0.72;
            if (missing.has(i))
                pen.rect(g, x - w / 2, y - 0.1 * U, w, 0.5 * U, "pencil", null, {
                    strokeWidth: 1,
                    stroke: c.t["ink-soft"],
                    strokeLineDash: [4, 4],
                });
            else
                pen.rect(g, x - w / 2, y - 0.1 * U, w, 0.5 * U, "ruler", pen.fill("tang"), {
                    strokeWidth: 1.3,
                });
            a[`plank(${i})`] = [x, y - 0.1 * U, "up"];
        }
        pen.curve(g, foot, "pencil", { strokeWidth: 1.5 });
        pen.curve(g, hand, "pencil", { strokeWidth: 1.8 });
        for (const x of [L, R]) {
            pen.rect(g, x - 0.28 * U, 0.8 * U, 0.56 * U, 5 * U, "pencil", pen.fill("tang"), {
                strokeWidth: 1.6,
            });
            pen.circle(g, x, 0.8 * U, 0.7 * U, "pencil", pen.fill("tang"), { strokeWidth: 1.3 });
            for (const y of [1.4, 3.2])
                pen.ellipse(g, x, y * U, 0.8 * U, 0.35 * U, "pencil", null, { strokeWidth: 1.2 });
        }
        a.left = [L, 0.5 * U, "up"];
        a.right = [R, 0.5 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A rope bridge slung between two wooden posts, sagging in the middle, with a hand rope above and orange planks along it${p.gaps > 0 ? ", some planks missing and drawn as dashed outlines" : ""}.`,
});
