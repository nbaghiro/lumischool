import { clip, type RawAnchors } from "../../ink/surface";
import { defineDrawing } from "../drawing";

interface Pit {
    x: number;
    y: number;
    rx: number;
    ry: number;
}

const BIG = { rx: 54, ry: 17 },
    MID = { rx: 32, ry: 10 },
    SMALL = { rx: 19, ry: 6 };

// back to front, so a nearer crater's rim is drawn over a further one's
const LAYOUT: Record<1 | 2 | 3, Pit[]> = {
    1: [{ x: 120, y: 60, ...BIG }],
    2: [
        { x: 92, y: 58, ...BIG },
        { x: 184, y: 66, ...MID },
    ],
    3: [
        { x: 176, y: 30, ...SMALL },
        { x: 90, y: 60, ...BIG },
        { x: 184, y: 70, ...MID },
    ],
};

const countOf = (n: number): 1 | 2 | 3 => (n <= 1 ? 1 : n >= 3 ? 3 : 2);

export const crater = defineDrawing({
    id: "crater",
    family: "outdoors",
    title: "Moon craters",
    group: "Props",
    about: "Craters in the grey dust of the moon, seen a little from above and in front: each a bowl with a raised rim, its near wall in shadow and its far wall in the light, with pebbles thrown round it. One, two or three, each a different size.",
    params: { count: 1 },
    settings: { count: { kind: "whole", min: 1, max: 3 } },
    takes: [
        { label: "One crater", params: { count: 1 } },
        { label: "Two craters", params: { count: 2 } },
        { label: "Three craters", params: { count: 3 } },
    ],
    box: () => ({ w: 12, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            pits = LAYOUT[countOf(p.count)],
            a: RawAnchors = {};
        for (const k of pits)
            pen.ellipse(
                g,
                k.x,
                k.y + 2,
                k.rx * 2.8,
                k.ry * 3.3,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 7, fillWeight: 0.6 }),
                { stroke: "none" },
            );
        pits.forEach((k, i) => {
            pen.ellipse(g, k.x, k.y + 1, k.rx * 2.4, k.ry * 2.8, "pencil", pen.fill("card"), {
                strokeWidth: 1.6,
                disableMultiStroke: true,
            });
            const bowl = `M${k.x - k.rx} ${k.y}A${k.rx} ${k.ry} 0 0 1 ${k.x + k.rx} ${k.y}A${k.rx} ${k.ry} 0 0 1 ${k.x - k.rx} ${k.y}Z`;
            const inside = clip(c, { kind: "path", d: bowl });
            pen.ellipse(
                inside.g,
                k.x,
                k.y,
                k.rx * 2,
                k.ry * 2,
                "pencil",
                pen.fill("ink-soft", "hachure", { hachureGap: 9, fillWeight: 0.6 }),
                { stroke: "none" },
            );
            // the sun is low on the right, so the left wall is in shadow and the far wall is lit
            pen.path(
                inside.g,
                `M${k.x + k.rx * 0.1} ${k.y - k.ry}A${k.rx} ${k.ry} 0 0 0 ${k.x + k.rx * 0.1} ${k.y + k.ry}Q${k.x - k.rx * 0.5} ${k.y} ${k.x + k.rx * 0.1} ${k.y - k.ry}Z`,
                "pencil",
                pen.fill("ink-soft", "hachure", {
                    hachureGap: 2.6,
                    fillWeight: 0.7,
                    hachureAngle: -60,
                }),
                { stroke: "none" },
            );
            const lit = `M${k.x - k.rx * 0.55} ${k.y - k.ry * 0.84}A${k.rx} ${k.ry} 0 0 1 ${k.x + k.rx} ${k.y}Q${k.x + k.rx * 0.2} ${k.y - k.ry * 0.3} ${k.x - k.rx * 0.55} ${k.y - k.ry * 0.84}Z`;
            pen.path(inside.g, lit, "pencil", pen.fill("card"), { stroke: "none" });
            pen.path(
                inside.g,
                `M${k.x - k.rx * 0.55} ${k.y - k.ry * 0.84}Q${k.x + k.rx * 0.2} ${k.y - k.ry * 0.3} ${k.x + k.rx} ${k.y}`,
                "pencil",
                null,
                { strokeWidth: 1.1, stroke: c.t["ink-soft"], disableMultiStroke: true },
            );
            pen.ellipse(g, k.x, k.y, k.rx * 2, k.ry * 2, "pencil", null, { strokeWidth: 1.4 });
            const pebbles: [number, number, number][] = [
                [-1.55, 0.9, 1],
                [-1.35, -0.7, 0.7],
                [1.45, 1.1, 0.8],
                [1.6, -0.4, 1.1],
                [0.4, 1.75, 0.7],
            ];
            for (const [u, v, s] of pebbles) {
                const px = k.x + u * k.rx,
                    py = k.y + v * k.ry,
                    r = Math.max(2.4, (k.rx / 12) * s);
                pen.ellipse(g, px, py, r * 2, r * 1.3, "ruler", pen.fill("card"), {
                    strokeWidth: 1.1,
                    disableMultiStroke: true,
                });
            }
            a[`crater(${i})`] = [k.x, k.y - k.ry * 1.4, "up"];
        });
        return a;
    },
    describe: (p) => {
        const n = countOf(p.count);
        return n === 1
            ? "A crater in the grey dust of the moon, a round bowl with a raised rim, its near side in shadow and its far side lit, pebbles scattered round it."
            : `${n === 2 ? "Two" : "Three"} craters of different sizes in the grey dust of the moon, each a round bowl with a raised rim, shadow inside and pebbles round it.`;
    },
    motion: { still: "Craters are the ground other things stand on, and they are counted." },
});
