import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const jetty = defineDrawing({
    id: "jetty",
    family: "places",
    title: "Jetty",
    group: "Structures",
    about: "A wooden jetty running out over the water on posts, with a bollard at the end to tie a boat to. The posts are evenly spaced and stand in the water, so they can be counted.",
    params: { posts: 5 },
    settings: { posts: { kind: "whole", min: 2, max: 8 } },
    takes: [
        { label: "Five posts", params: { posts: 5 } },
        { label: "Eight posts", params: { posts: 8 } },
    ],
    box: (p) => ({ w: Math.max(2, Math.min(8, Math.round(p.posts))) * 2 + 2, h: 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(2, Math.min(8, Math.round(p.posts))),
            W = (n * 2 + 2) * U,
            deck = 1.6 * U,
            a: RawAnchors = {};
        for (let i = 0; i < n; i++) {
            const x = (1.5 + i * 2) * U;
            pen.rect(g, x - 0.2 * U, deck, 0.4 * U, 2 * U, "pencil", pen.fill("tang"), {
                strokeWidth: 1.3,
            });
            a[`post(${i})`] = [x, deck + 2 * U, "down"];
        }
        pen.rect(
            g,
            0.4 * U,
            deck - 0.45 * U,
            W - 0.8 * U,
            0.45 * U,
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 3.5 }),
            { strokeWidth: 1.6 },
        );
        for (let x = 0.9 * U; x < W - 0.6 * U; x += 0.7 * U)
            pen.line(g, x, deck - 0.45 * U, x, deck, "ruler", { strokeWidth: 0.8 });
        pen.rect(g, W - 1.3 * U, deck - 1 * U, 0.4 * U, 0.55 * U, "pencil", pen.fill("ink-soft"), {
            strokeWidth: 1.1,
        });
        for (let x = 0.2 * U; x < W; x += 1.4 * U)
            pen.curve(
                g,
                [
                    [x, 3.2 * U],
                    [x + 0.35 * U, 2.95 * U],
                    [x + 0.7 * U, 3.2 * U],
                ],
                "pencil",
                { strokeWidth: 1.2 },
            );
        a.end = [W - 1.1 * U, deck - 1 * U, "up"];
        return a;
    },
    describe: () =>
        "A wooden jetty running out over the water on evenly spaced posts, with planks along its top and a bollard at the far end.",
});
