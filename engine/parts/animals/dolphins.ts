import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { clamp, eye } from "./nature";

export const dolphins = defineDrawing({
    id: "dolphins",
    family: "animals",
    title: "Dolphins",
    group: "Characters",
    about: "Dolphins leaping out of the sea one after another, each on an arc with a fin on its back and a splash where it went in. The leaps can be counted, and a pod is a row of the same shape at different heights.",
    params: { count: 3 },
    settings: { count: { kind: "whole", min: 1, max: 5 } },
    takes: [
        { label: "Three leaping", params: { count: 3 } },
        { label: "One", params: { count: 1 } },
    ],
    box: (p) => ({ w: clamp(p.count, 1, 5) * 4 + 2, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.count, 1, 5),
            sea = 4.2 * U,
            W = (n * 4 + 2) * U,
            a: RawAnchors = {},
            grey = pen.fill("sky", "hachure", { hachureGap: 4, fillWeight: 0.7 });
        for (let i = 0; i < n; i++) {
            const x = (2.2 + i * 4) * U,
                lift = (i % 2 ? 1.1 : 1.8) * U,
                top = sea - lift - 0.9 * U;
            // one leap: the back arches up out of the water, the belly paler under it
            pen.path(
                g,
                `M${x - 1.6 * U} ${sea - 0.1 * U}Q${x - 0.8 * U} ${top} ${x + 0.4 * U} ${top + 0.1 * U}Q${x + 1.3 * U} ${top + 0.2 * U} ${x + 1.7 * U} ${top + 0.75 * U}Q${x + 1 * U} ${top + 0.7 * U} ${x + 0.3 * U} ${top + 0.75 * U}Q${x - 0.7 * U} ${top + 1 * U} ${x - 1.2 * U} ${sea - 0.1 * U}Z`,
                "pencil",
                grey,
                { strokeWidth: 1.6 },
            );
            pen.polygon(
                g,
                [
                    [x - 0.1 * U, top + 0.05 * U],
                    [x - 0.55 * U, top - 0.55 * U],
                    [x - 0.6 * U, top + 0.2 * U],
                ],
                "pencil",
                grey,
                { strokeWidth: 1.3 },
            );
            pen.polygon(
                g,
                [
                    [x - 1.5 * U, sea - 0.15 * U],
                    [x - 2 * U, sea - 0.55 * U],
                    [x - 1.3 * U, sea - 0.4 * U],
                    [x - 1.1 * U, sea - 0.8 * U],
                ],
                "pencil",
                grey,
                { strokeWidth: 1.2 },
            );
            eye(c, x + 1.1 * U, top + 0.38 * U, 3.5);
            for (const dx of [-0.4, 0, 0.4])
                pen.line(
                    g,
                    x - 1.35 * U + dx * U,
                    sea - 0.1 * U,
                    x - 1.35 * U + dx * 1.8 * U,
                    sea - 0.6 * U,
                    "pencil",
                    { strokeWidth: 1, stroke: c.t.sky },
                );
            a[`dolphin(${i})`] = [x, top, "up"];
        }
        for (let x = 0.3 * U; x < W - 0.4 * U; x += 1.1 * U)
            pen.curve(
                g,
                [
                    [x, sea],
                    [x + 0.28 * U, sea - 0.16 * U],
                    [x + 0.56 * U, sea],
                    [x + 0.84 * U, sea - 0.16 * U],
                ],
                "pencil",
                { strokeWidth: 1.3 },
            );
        return a;
    },
    describe: (p) =>
        `${clamp(p.count, 1, 5) > 1 ? "Dolphins leaping out of a wavy sea one after another, each" : "A dolphin leaping out of a wavy sea"} on an arc with a fin on its back and a splash where it went in.`,
    motion: {
        body: { is: "float", lift: 10, dx: 0, deg: 3, pivot: [0.5, 1], period: 5.4, units: true },
    },
});
