import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const within = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const snowman = defineDrawing({
    id: "snowman",
    family: "outdoors",
    title: "Snowman",
    group: "Props",
    about: "A snowman of three snowballs, smallest on top, with a hat, a scarf, a carrot nose, twig arms and a row of coal buttons down his front. The buttons can be counted, and the snowballs put in order of size.",
    params: { buttons: 3, hat: 1 },
    settings: {
        buttons: { kind: "whole", min: 0, max: 5 },
        hat: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Three buttons and a hat", params: { buttons: 3, hat: 1 } },
        { label: "Five buttons, no hat", params: { buttons: 5, hat: 0 } },
    ],
    box: () => ({ w: 6, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = within(p.buttons, 0, 5),
            cx = 3 * U,
            base = 7.7 * U,
            snow = pen.fill("card"),
            a: RawAnchors = {};
        const balls: [number, number][] = [
            [base - 1.45 * U, 1.45 * U],
            [base - 3.75 * U, 1.05 * U],
            [base - 5.4 * U, 0.72 * U],
        ];
        for (const [y, r] of balls)
            pen.circle(g, cx, y, r * 2, "doodle", snow, { strokeWidth: 1.8 });
        for (const sd of [-1, 1])
            pen.linear(
                g,
                [
                    [cx + sd * 0.95 * U, base - 4 * U],
                    [cx + sd * 2.1 * U, base - 4.9 * U],
                    [cx + sd * 2.6 * U, base - 4.75 * U],
                ],
                "pencil",
                { strokeWidth: 1.8, stroke: c.t.tang },
            );
        const [hy, hr] = balls[2] ?? [0, 0];
        if (p.hat > 0) {
            pen.rect(
                g,
                cx - 0.9 * U,
                hy - hr - 0.1 * U,
                1.8 * U,
                0.25 * U,
                "pencil",
                pen.fill("ink-soft"),
                { strokeWidth: 1.2 },
            );
            pen.rect(
                g,
                cx - 0.55 * U,
                hy - hr - 1 * U,
                1.1 * U,
                0.95 * U,
                "pencil",
                pen.fill("ink-soft"),
                { strokeWidth: 1.2 },
            );
            pen.rect(
                g,
                cx - 0.55 * U,
                hy - hr - 0.45 * U,
                1.1 * U,
                0.22 * U,
                "pencil",
                pen.fill("berry"),
                { strokeWidth: 0.9 },
            );
        }
        for (const sd of [-1, 1])
            pen.circle(
                g,
                cx + sd * 0.24 * U,
                hy - 0.12 * U,
                4.5,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.5 },
            );
        pen.polygon(
            g,
            [
                [cx, hy + 0.02 * U],
                [cx + 0.75 * U, hy + 0.14 * U],
                [cx, hy + 0.24 * U],
            ],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1 },
        );
        pen.path(
            g,
            `M${cx - 0.75 * U} ${hy + 0.5 * U}Q${cx} ${hy + 0.8 * U} ${cx + 0.75 * U} ${hy + 0.5 * U}L${cx + 0.7 * U} ${hy + 0.8 * U}Q${cx} ${hy + 1.1 * U} ${cx - 0.7 * U} ${hy + 0.8 * U}Z`,
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1.2 },
        );
        pen.polygon(
            g,
            [
                [cx + 0.3 * U, hy + 0.8 * U],
                [cx + 0.7 * U, hy + 1.8 * U],
                [cx + 0.95 * U, hy + 1.65 * U],
                [cx + 0.6 * U, hy + 0.75 * U],
            ],
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1 },
        );
        for (let i = 0; i < n; i++) {
            const y = base - 4.4 * U + i * 0.46 * U;
            pen.circle(
                g,
                cx,
                y,
                8,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.5 },
            );
            a[`button(${i})`] = [cx, y, "right"];
        }
        pen.line(g, 0.3 * U, base, 5.7 * U, base, "pencil", { strokeWidth: 1.5 });
        a.hat = [cx, hy - hr - 1 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A snowman of three snowballs, smallest on top, with ${p.hat > 0 ? "a hat, " : ""}a scarf, a carrot nose and twig arms${within(p.buttons, 0, 5) > 0 ? ", and coal buttons down his front" : ""}.`,
    motion: { still: "A snowman stands still; the snow falls round him." },
});
