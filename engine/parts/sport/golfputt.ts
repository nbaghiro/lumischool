import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const golfPutt = defineDrawing({
    id: "golfputt",
    family: "sport",
    title: "A garden putt",
    group: "Props",
    about: "A white golf ball and putter on a mint putting green, with a small oval hole and a tall yellow flag.",
    params: { near: false },
    settings: { near: { kind: "flag" } },
    takes: [
        { label: "Ready to putt", params: { near: false } },
        { label: "Near the hole", params: { near: true } },
    ],
    box: () => ({ w: 6, h: 5 }),
    draw: (c, p) => {
        c.pen.ellipse(c.g, 3 * U, 3.55 * U, 5.3 * U, 2 * U, "pencil", c.pen.fill("mint", "solid"), {
            strokeWidth: 1.5,
            roughness: 0.4,
        });
        c.pen.ellipse(
            c.g,
            4 * U,
            3.35 * U,
            0.65 * U,
            0.25 * U,
            "pencil",
            c.pen.fill("ink", "solid"),
            {
                strokeWidth: 1,
                roughness: 0.2,
            },
        );
        c.pen.line(c.g, 4 * U, 3.35 * U, 4 * U, 0.4 * U, "pencil", { strokeWidth: 1.8 });
        c.pen.polygon(
            c.g,
            [
                [4 * U, 0.4 * U],
                [5.35 * U, 0.6 * U],
                [5 * U, 0.94 * U],
                [5.35 * U, 1.26 * U],
                [4 * U, 1.2 * U],
            ],
            "pencil",
            c.pen.fill("glow", "solid"),
            { strokeWidth: 1.5, roughness: 0.4 },
        );
        c.pen.line(c.g, 1.1 * U, 0.95 * U, 1.75 * U, 3.7 * U, "pencil", { strokeWidth: 2 });
        c.pen.line(c.g, 1.1 * U, 0.95 * U, 1.27 * U, 1.7 * U, "pencil", { strokeWidth: 5 });
        c.pen.polygon(
            c.g,
            [
                [1.48 * U, 3.58 * U],
                [2.14 * U, 3.56 * U],
                [2.25 * U, 3.84 * U],
                [1.5 * U, 3.88 * U],
            ],
            "pencil",
            c.pen.fill("sky", "solid"),
            { strokeWidth: 1.5 },
        );
        const shift = p.near ? 0.7 : 0;
        c.pen.circle(
            c.g,
            (2.75 + shift) * U,
            3.63 * U,
            0.48 * U,
            "pencil",
            c.pen.fill("card", "solid"),
            {
                strokeWidth: 1.3,
                roughness: 0.25,
            },
        );
        for (const [x, y] of [
            [2.65, 3.62],
            [2.82, 3.7],
            [2.82, 3.55],
        ] as const)
            c.pen.circle(c.g, (x + shift) * U, y * U, 0.035 * U, "pencil", null, {
                strokeWidth: 0.5,
            });
        return {};
    },
    describe: () =>
        "A putter beside a white dimpled golf ball on a little green lawn. A tall yellow flag marks a small oval putting hole.",
});
