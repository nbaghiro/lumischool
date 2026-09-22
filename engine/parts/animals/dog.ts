import { part, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { pip } from "../stories/pictures";

export const dog = defineDrawing({
    id: "dog",
    family: "animals",
    title: "Dog",
    group: "Characters",
    about: "A dog standing side on with one ear flopped over, a wagging tail and a red collar, with a ball at its feet if it has one. For a story problem that wants a pet, and for the sports ground.",
    params: { facing: 1, ball: 1 },
    settings: { facing: { kind: "one of", of: [1, -1] }, ball: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "With a ball", params: { facing: 1, ball: 1 } },
        { label: "Facing left, no ball", params: { facing: -1, ball: 0 } },
    ],
    box: () => ({ w: 9, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            dir = p.facing < 0 ? -1 : 1,
            cx = 4.2 * U,
            base = 5.6 * U;
        const X = (n: number) => cx + dir * n,
            coat = pen.fill("tang", "hachure", { hachureGap: 4, fillWeight: 0.9 });
        pen.curve(
            part(c, "tail", [X(-32), base - 42], { dir }).g,
            [
                [X(-32), base - 42],
                [X(-44), base - 54],
                [X(-46), base - 70],
            ],
            "pencil",
            { strokeWidth: 3 },
        );
        for (const x0 of [-24, -12, 16, 26])
            pen.line(g, X(x0), base - 30, X(x0), base - 2, "pencil", { strokeWidth: 5 });
        pen.ellipse(g, X(0), base - 40, 74, 34, "pencil", coat, { strokeWidth: 2 });
        pen.ellipse(g, X(-6), base - 36, 26, 14, "pencil", pen.fill("card"), { strokeWidth: 1 });
        pen.circle(g, X(32), base - 58, 34, "pencil", coat, { strokeWidth: 1.9 });
        pen.ellipse(g, X(46), base - 52, 22, 16, "pencil", pen.fill("card"), { strokeWidth: 1.5 });
        pen.circle(
            g,
            X(56),
            base - 54,
            7,
            "ruler",
            { fill: c.t.ink, fillStyle: "solid" },
            { strokeWidth: 0.6 },
        );
        pen.polygon(
            g,
            [
                [X(22), base - 72],
                [X(12), base - 52],
                [X(22), base - 48],
                [X(28), base - 70],
            ],
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3.5 }),
            { strokeWidth: 1.4 },
        );
        pip(c, X(38), base - 62);
        pen.arc(g, X(24), base - 40, 26, 10, 0.2, Math.PI - 0.2, "pencil", {
            strokeWidth: 3.2,
            stroke: c.t.berry,
        });
        const a: RawAnchors = { head: [X(32), base - 76, "up"], tail: [X(-46), base - 72, "up"] };
        if (p.ball > 0) {
            const bx = X(64),
                by = base - 11;
            pen.circle(g, bx, by, 22, "pencil", pen.fill("berry"), { strokeWidth: 1.6 });
            pen.arc(g, bx, by, 22, 12, -0.3, Math.PI + 0.3, "pencil", { strokeWidth: 1.2 });
            a.ball = [bx, by - 12, "up"];
        }
        pen.line(g, 0.4 * U, base, 8.6 * U, base, "pencil", { strokeWidth: 2 });
        return a;
    },
    describe: (p) =>
        `A dog standing side on with one ear flopped over, a wagging tail and a red collar${p.ball > 0 ? ", with a ball at its feet" : ""}.`,
    motion: {
        body: { is: "idle" },
        parts: { tail: { is: "wiggle", deg: 16, period: 3.2, cycles: 4 } },
    },
});
