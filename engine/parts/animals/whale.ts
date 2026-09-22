import { part } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { type Pt, ring, blade, eye } from "./nature";

export const whale = defineDrawing({
    id: "whale",
    family: "animals",
    title: "Whale",
    group: "Characters",
    about: "A humpback whale rising out of the sea, with the grooves along its throat, a fluke of a tail and a spout of water over its head. The sea is a wavy line across it, so most of the whale is under the water.",
    params: { spout: 1, facing: 1 },
    settings: { spout: { kind: "whole", min: 0, max: 1 }, facing: { kind: "one of", of: [1, -1] } },
    takes: [
        { label: "Spouting", params: { spout: 1, facing: 1 } },
        { label: "Facing left, no spout", params: { spout: 0, facing: -1 } },
    ],
    box: () => ({ w: 13, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            dir = p.facing < 0 ? -1 : 1,
            X = (n: number) => (dir > 0 ? n : 13 * U - n);
        // a big blunt head, a small hump for a fin, and the long white flipper a humpback is known by
        const body: Pt[] = [
            [X(2.4 * U), 3.4 * U],
            [X(4.6 * U), 2.3 * U],
            [X(7.6 * U), 1.6 * U],
            [X(10.6 * U), 1.6 * U],
            [X(12.3 * U), 2.5 * U],
            [X(12.6 * U), 3.7 * U],
            [X(11.3 * U), 4.8 * U],
            [X(8 * U), 5.4 * U],
            [X(4.6 * U), 5 * U],
        ];
        pen.path(g, ring(body), "pencil", pen.fill("sky"), { strokeWidth: 2 });
        pen.path(
            g,
            ring([
                [X(7 * U), 4.9 * U],
                [X(9.4 * U), 4.4 * U],
                [X(12 * U), 3.9 * U],
                [X(11.2 * U), 4.8 * U],
                [X(8.4 * U), 5.3 * U],
            ]),
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.2 },
        );
        for (let k = 0; k < 4; k++)
            pen.line(
                g,
                X((7.8 + k * 1) * U),
                (4.95 - k * 0.14) * U,
                X((8.6 + k * 1) * U),
                (4.8 - k * 0.14) * U,
                "pencil",
                { strokeWidth: 1 },
            );
        pen.polygon(
            g,
            blade(X(9.2 * U), 4.2 * U, 3 * U, 20, dir > 0 ? Math.PI * 0.8 : Math.PI * 0.2),
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.5 },
        );
        pen.curve(
            g,
            [
                [X(12.5 * U), 3.5 * U],
                [X(11.4 * U), 3.9 * U],
                [X(10.2 * U), 3.85 * U],
            ],
            "pencil",
            { strokeWidth: 1.3 },
        );
        // the tail, lifted clear of the water behind
        pen.polygon(
            g,
            [
                [X(2.8 * U), 3.3 * U],
                [X(1.6 * U), 2.5 * U],
                [X(0.3 * U), 1.4 * U],
                [X(1.2 * U), 2.6 * U],
                [X(0.4 * U), 3.4 * U],
                [X(1.8 * U), 3.1 * U],
            ],
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1.8 },
        );
        pen.path(
            g,
            `M${X(7 * U)} ${1.75 * U}Q${X(7.5 * U)} ${1.2 * U} ${X(8.1 * U)} ${1.62 * U}`,
            "pencil",
            pen.fill("sky"),
            { strokeWidth: 1.5 },
        );
        eye(c, X(10.7 * U), 3.25 * U, 5);
        if (p.spout > 0) {
            const jet = part(c, "spout", [X(10.4 * U), 1.6 * U]).g;
            for (const s of [-1, 0, 1])
                pen.curve(
                    jet,
                    [
                        [X(10.4 * U), 1.6 * U],
                        [X((10.4 + s * 0.3) * U), 0.9 * U],
                        [X((10.4 + s * 0.9) * U), 0.2 * U],
                    ],
                    "pencil",
                    { strokeWidth: 1.4, strokeLineDash: [5, 5] },
                );
        }
        const wave: Pt[] = [];
        for (let x = 0; x <= 13 * U; x += 0.5 * U)
            wave.push([x, 4.9 * U + (Math.round(x / (0.5 * U)) % 2 ? -5 : 4)]);
        pen.curve(g, wave, "pencil", { strokeWidth: 1.6 });
        return {
            head: [X(11.4 * U), 2.2 * U, "up"],
            tail: [X(0.3 * U), 1.4 * U, dir > 0 ? "left" : "right"],
            spout: [X(10.4 * U), 0.2 * U, "up"],
        };
    },
    describe: (p) =>
        `A humpback whale rising through a wavy line of sea, with grooves along its throat, a long white flipper${p.spout > 0 ? ", its tail lifted and a spout of water over its head" : " and its tail lifted behind"}.`,
    motion: {
        body: { is: "float", deg: 2.2, lift: 0.04, dx: 0.02, period: 8.4 },
        parts: { spout: { is: "flow", lift: 6, dx: 2, period: 2.6 } },
        weight: "heavy",
    },
});
