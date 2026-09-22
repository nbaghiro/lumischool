import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { ring, blade } from "./nature";

export const seal = defineDrawing({
    id: "seal",
    family: "animals",
    title: "Seal",
    group: "Characters",
    about: "A grey seal hauled out on a rock with its whiskers and big dark eyes, or just its head up out of the waves, looking back. It is slow on land and quick in the water, and it can hold its breath for as long as a lesson lasts.",
    params: { rock: 1, facing: 1 },
    settings: { rock: { kind: "whole", min: 0, max: 1 }, facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "On a rock", params: { rock: 1, facing: 1 } },
        { label: "Head out of the water", params: { rock: 0, facing: -1 } },
    ],
    box: (p) => (p.rock > 0 ? { w: 9, h: 5 } : { w: 5, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            onRock = p.rock > 0,
            s = p.facing < 0 ? -1 : 1,
            W = (onRock ? 9 : 5) * U,
            X = (x: number) => (s > 0 ? x : W - x);
        const grey = pen.fill("sky", "hachure", { hachureGap: 3.6, fillWeight: 0.8 });
        const head = (hx: number, hy: number) => {
            pen.path(
                g,
                ring([
                    [X(hx - 0.8 * U), hy],
                    [X(hx - 0.3 * U), hy - 0.75 * U],
                    [X(hx + 0.6 * U), hy - 0.65 * U],
                    [X(hx + 1.2 * U), hy - 0.05 * U],
                    [X(hx + 0.7 * U), hy + 0.45 * U],
                    [X(hx - 0.3 * U), hy + 0.5 * U],
                ]),
                "pencil",
                grey,
                { strokeWidth: 1.7 },
            );
            pen.ellipse(
                g,
                X(hx + 0.95 * U),
                hy + 0.05 * U,
                0.55 * U,
                0.42 * U,
                "pencil",
                pen.fill("card"),
                { strokeWidth: 1 },
            );
            pen.circle(
                g,
                X(hx + 1.08 * U),
                hy - 0.08 * U,
                4,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.4 },
            );
            for (const dy of [-0.05, 0.1, 0.25])
                pen.line(
                    g,
                    X(hx + 0.95 * U),
                    hy + dy * U,
                    X(hx + 1.8 * U),
                    hy + dy * 1.8 * U - 2,
                    "pencil",
                    { strokeWidth: 0.7 },
                );
            pen.circle(
                g,
                X(hx + 0.35 * U),
                hy - 0.3 * U,
                6.5,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.4 },
            );
            pen.circle(
                g,
                X(hx + 0.35 * U) + 1.5,
                hy - 0.3 * U - 1.5,
                2,
                "ruler",
                { fill: c.t.card, fillStyle: "solid" },
                { strokeWidth: 0 },
            );
        };
        if (onRock) {
            pen.path(
                g,
                ring([
                    [0.5 * U, 4.8 * U],
                    [1.3 * U, 3.7 * U],
                    [3.6 * U, 3.3 * U],
                    [6.4 * U, 3.4 * U],
                    [8.4 * U, 4.1 * U],
                    [8.7 * U, 4.8 * U],
                ]),
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 5 }),
                { strokeWidth: 1.7 },
            );
            pen.path(
                g,
                ring([
                    [X(1.1 * U), 2.6 * U],
                    [X(2.2 * U), 3.1 * U],
                    [X(4.2 * U), 3.2 * U],
                    [X(6 * U), 2.9 * U],
                    [X(6.8 * U), 2.1 * U],
                    [X(6.2 * U), 3.5 * U],
                    [X(4 * U), 3.9 * U],
                    [X(2 * U), 3.7 * U],
                ]),
                "pencil",
                grey,
                { strokeWidth: 1.8 },
            );
            pen.polygon(
                g,
                [
                    [X(1.2 * U), 2.7 * U],
                    [X(0.5 * U), 2.1 * U],
                    [X(0.9 * U), 2.9 * U],
                    [X(0.4 * U), 3.2 * U],
                ],
                "pencil",
                grey,
                { strokeWidth: 1.3 },
            );
            pen.polygon(
                g,
                blade(X(4.8 * U), 3.5 * U, 1 * U, 0.4 * U, s > 0 ? 2.2 : 0.94),
                "pencil",
                grey,
                { strokeWidth: 1.2 },
            );
            head(6.6 * U, 1.9 * U);
            for (const [dx, dy] of [
                [2.6, 3.2],
                [3.4, 3.45],
                [4.4, 3.1],
            ] as const)
                pen.circle(g, X(dx * U), dy * U, 3, "ruler", pen.fill("ink-soft"), {
                    strokeWidth: 0.3,
                });
        } else {
            pen.path(
                g,
                `M${X(1.4 * U)} ${3 * U}Q${X(1.5 * U)} ${2 * U} ${X(2.1 * U)} ${1.6 * U}L${X(3.2 * U)} ${1.8 * U}Q${X(3.4 * U)} ${2.4 * U} ${X(3.3 * U)} ${3 * U}Z`,
                "pencil",
                grey,
                { strokeWidth: 1.6 },
            );
            head(2.4 * U, 1.35 * U);
            for (const [rx, ry] of [
                [3.6, 0.7],
                [4.6, 1],
            ] as const)
                pen.ellipse(g, 2.4 * U, 3.05 * U, rx * U, ry * U, "pencil", null, {
                    strokeWidth: 1.1,
                    stroke: c.t.sky,
                });
            for (let x = 0.2 * U; x < W; x += 1 * U)
                pen.curve(
                    g,
                    [
                        [x, 3.1 * U],
                        [x + 0.25 * U, 2.95 * U],
                        [x + 0.5 * U, 3.1 * U],
                    ],
                    "pencil",
                    { strokeWidth: 1.2 },
                );
        }
        return { head: [X(onRock ? 6.9 * U : 2.7 * U), onRock ? 1.1 * U : 0.6 * U, "up"] };
    },
    describe: (p) =>
        p.rock > 0
            ? "A grey seal hauled out on a rock with big dark eyes, a pale muzzle with whiskers and its tail flipper raised."
            : "A grey seal's head up out of the wavy sea with big dark eyes and a pale muzzle with whiskers, ripples round it.",
});
