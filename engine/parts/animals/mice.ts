import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { pip } from "../stories/pictures";

const turn = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const mice = defineDrawing({
    id: "mice",
    family: "animals",
    title: "Mice",
    group: "Characters",
    about: "One mouse or a row of them, each with a round ear, a long curled tail and whiskers. Small enough to hide beside a jar, which is where a kitchen keeps one.",
    params: { count: 1, facing: 1 },
    settings: { count: { kind: "whole", min: 1, max: 6 }, facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "One mouse", params: { count: 1, facing: 1 } },
        { label: "Four, facing left", params: { count: 4, facing: -1 } },
    ],
    box: (p) => ({ w: turn(p.count, 1, 6) * 3 + 1, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = turn(p.count, 1, 6),
            dir = p.facing < 0 ? -1 : 1,
            base = 2.7 * U,
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const cx = (2 + i * 3) * U,
                X = (k: number) => cx + dir * k;
            pen.curve(
                g,
                [
                    [X(-18), base - 8],
                    [X(-30), base - 2],
                    [X(-26), base - 20],
                    [X(-34), base - 26],
                ],
                "pencil",
                { strokeWidth: 1.3 },
            );
            pen.ellipse(
                g,
                X(-2),
                base - 12,
                38,
                22,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 3.5, fillWeight: 0.6 }),
                { strokeWidth: 1.7 },
            );
            pen.polygon(
                g,
                [
                    [X(10), base - 22],
                    [X(26), base - 10],
                    [X(10), base - 4],
                ],
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 3.5, fillWeight: 0.6 }),
                { strokeWidth: 1.5 },
            );
            pen.circle(g, X(8), base - 26, 16, "pencil", pen.fill("berry"), { strokeWidth: 1.4 });
            pip(c, X(16), base - 15, 4);
            pen.circle(g, X(26), base - 10, 5, "ruler", pen.fill("berry"), { strokeWidth: 0.6 });
            for (const dy of [-2, 3])
                pen.line(g, X(26), base - 10 + dy, X(36), base - 12 + dy * 2, "pencil", {
                    strokeWidth: 0.7,
                    stroke: c.t["ink-soft"],
                });
            a[`mouse(${i})`] = [cx, base - 34, "up"];
        }
        pen.line(g, 0.4 * U, base, (n * 3 + 0.6) * U, base, "pencil", { strokeWidth: 1.8 });
        return a;
    },
    describe: (p) =>
        turn(p.count, 1, 6) > 1
            ? "Mice in a row on a line, each with a round pink ear, a long curled tail, whiskers and a pink nose."
            : "A mouse on a line with a round pink ear, a long curled tail, whiskers and a pink nose.",
    motion: { body: { is: "idle", deg: 4, period: 2.9 }, weight: "light" },
});
