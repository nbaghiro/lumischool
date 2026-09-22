import { part, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { eye } from "./nature";

export const eagle = defineDrawing({
    id: "eagle",
    family: "animals",
    title: "Eagle",
    group: "Characters",
    about: "A golden eagle with a white head and a hooked yellow beak, either flying with its wings out and the feathers at the tips spread like fingers, or perched on a rock. Its span is drawn wide enough to measure.",
    params: { flying: 1, facing: 1 },
    settings: {
        flying: { kind: "whole", min: 0, max: 1 },
        facing: { kind: "one of", of: [1, -1] },
    },
    takes: [
        { label: "Flying", params: { flying: 1, facing: 1 } },
        { label: "Perched, facing left", params: { flying: 0, facing: -1 } },
    ],
    box: (p) => (p.flying > 0 ? { w: 10, h: 5 } : { w: 5, h: 7 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            dir = p.facing < 0 ? -1 : 1,
            coat = pen.fill("tang"),
            dark = pen.fill("ink-soft", "hachure", { hachureGap: 3.5 });
        if (p.flying > 0) {
            const cx = 5 * U,
                y = 2.8 * U,
                X = (n: number) => cx + dir * n;
            for (const s of [-1, 1]) {
                const tip = cx + s * 4.6 * U,
                    wing = part(c, "wing", [cx + s * 12, y], { dir: s }).g;
                pen.polygon(
                    wing,
                    [
                        [cx + s * 10, y - 8],
                        [cx + s * 2.2 * U, y - 1.5 * U],
                        [tip, y - 1.7 * U],
                        [tip + s * 4, y - 0.6 * U],
                        [cx + s * 3.8 * U, y + 0.3 * U],
                        [cx + s * 2.4 * U, y + 0.6 * U],
                        [cx + s * 1.2 * U, y + 0.7 * U],
                        [cx + s * 10, y + 12],
                    ],
                    "pencil",
                    coat,
                    { strokeWidth: 1.8 },
                );
                // the fingers at the end of each wing
                for (let k = 0; k < 4; k++)
                    pen.line(
                        wing,
                        tip - s * k * 9,
                        y - 1.55 * U + k * 5,
                        tip + s * (10 - k * 2),
                        y - 2 * U + k * 9,
                        "pencil",
                        { strokeWidth: 1.4 },
                    );
                pen.polygon(
                    wing,
                    [
                        [cx + s * 2.4 * U, y - 0.1 * U],
                        [cx + s * 3.8 * U, y + 0.3 * U],
                        [cx + s * 2.4 * U, y + 0.6 * U],
                        [cx + s * 1.2 * U, y + 0.7 * U],
                        [cx + s * 1.3 * U, y + 0.2 * U],
                    ],
                    "pencil",
                    dark,
                    { strokeWidth: 1 },
                );
            }
            pen.polygon(
                g,
                [
                    [X(-14), y + 6],
                    [X(-34), y + 30],
                    [X(-10), y + 26],
                    [X(2), y + 12],
                ],
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1.5 },
            );
            pen.ellipse(g, cx, y + 4, 58, 26, "pencil", coat, { strokeWidth: 1.9 });
            pen.circle(g, X(30), y - 2, 22, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
            pen.polygon(
                g,
                [
                    [X(38), y - 6],
                    [X(52), y - 2],
                    [X(46), y + 8],
                    [X(40), y + 2],
                ],
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1.3 },
            );
            eye(c, X(32), y - 5, 4);
            return {
                head: [X(30), y - 14, "up"],
                wing: [cx - 4.6 * U, y - 1.6 * U, "left"],
                tip: [cx + 4.6 * U, y - 1.6 * U, "right"],
            };
        }
        const cx = 2.5 * U,
            base = 6.7 * U,
            X = (n: number) => cx + dir * n;
        pen.polygon(
            g,
            [
                [0.2 * U, base],
                [0.8 * U, base - 1.4 * U],
                [2.4 * U, base - 1.8 * U],
                [4.2 * U, base - 1.3 * U],
                [4.8 * U, base],
            ],
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.8 },
        );
        pen.polygon(
            g,
            [
                [X(-10), base - 1.7 * U],
                [X(-22), base - 0.9 * U],
                [X(-4), base - 1.1 * U],
            ],
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.3 },
        );
        pen.ellipse(g, cx, base - 3.2 * U, 36, 62, "pencil", coat, { strokeWidth: 1.9 });
        pen.polygon(
            g,
            [
                [X(-16), base - 4.2 * U],
                [X(-2), base - 4.6 * U],
                [X(6), base - 2.4 * U],
                [X(-12), base - 1.6 * U],
            ],
            "pencil",
            dark,
            { strokeWidth: 1.2 },
        );
        for (const dx of [-6, 6])
            pen.line(g, X(dx), base - 1.75 * U, X(dx), base - 1.5 * U, "pencil", {
                strokeWidth: 3,
                stroke: c.t.glow,
            });
        pen.circle(g, X(4), base - 5 * U, 26, "pencil", pen.fill("card"), { strokeWidth: 1.6 });
        pen.polygon(
            g,
            [
                [X(14), base - 5.3 * U],
                [X(28), base - 5 * U],
                [X(20), base - 4.5 * U],
                [X(15), base - 4.7 * U],
            ],
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.3 },
        );
        eye(c, X(8), base - 5.2 * U, 4);
        return { head: [X(4), base - 5.7 * U, "up"], rock: [cx, base - 1.8 * U, "down"] };
    },
    describe: (p) =>
        p.flying > 0
            ? "A golden eagle flying with its wings spread wide, feathers spread like fingers at the tips, a white head and a hooked yellow beak."
            : "A golden eagle perched on a rock with its wings folded, a white head, a hooked yellow beak and yellow feet.",
    motion: {
        body: { is: "bob", lift: 0.035, deg: 2.4, arc: 0.8, period: 4.2 },
        parts: { wing: { is: "flap", deg: 14, beat: 0.55, burst: 2, period: 4.6 } },
    },
});
