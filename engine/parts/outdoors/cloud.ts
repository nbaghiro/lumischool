import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

type Pt = [number, number];

/** A cloud with a flat base and puffs on top, and rain under it when it is raining. */
export const cloud = defineDrawing({
    id: "cloud",
    family: "outdoors",
    title: "Cloud",
    group: "Props",
    about: "A white cloud, flat underneath and heaped up on top, with rain falling from it when there is rain. Its puffs can be counted, and it can go on a weather chart or float over a map.",
    params: { puffs: 4, rain: 0 },
    settings: { puffs: { kind: "whole", min: 2, max: 6 }, rain: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Four puffs", params: { puffs: 4, rain: 0 } },
        { label: "Raining", params: { puffs: 5, rain: 1 } },
    ],
    box: (p) => ({ w: 7, h: Number(p.rain) ? 5 : 4 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = Math.max(2, Math.min(6, Math.round(Number(p.puffs) || 4))),
            a: RawAnchors = {};
        const base = 3.6 * U,
            left = 0.4 * U,
            right = 6.6 * U,
            bumps: { x: number; r: number }[] = [];
        for (let i = 0; i < n; i++) {
            const u = (i + 0.5) / n,
                mid = 1 - Math.abs(u - 0.5) * 1.3;
            bumps.push({
                x: left + (right - left) * u,
                r: (0.75 + 0.75 * mid) * U * (4 / (n + 2)) * 1.5,
            });
        }
        // the top is the upper edge of the puffs taken together, sampled along the cloud
        const edge: Pt[] = [];
        for (let k = 0; k <= 48; k++) {
            const x = left + ((right - left) * k) / 48;
            let y = base - 0.35 * U;
            for (const b of bumps) {
                const dx = x - b.x;
                if (Math.abs(dx) < b.r)
                    y = Math.min(y, base - 0.35 * U - Math.sqrt(b.r * b.r - dx * dx));
            }
            edge.push([x, y]);
        }
        pen.polygon(g, [...edge, [right, base], [left, base]], "pencil", pen.fill("card"), {
            strokeWidth: 1.7,
        });
        for (const b of bumps.slice(1))
            pen.arc(
                g,
                b.x - b.r * 0.7,
                base - 0.5 * U,
                b.r * 0.9,
                b.r * 0.7,
                Math.PI * 1.1,
                Math.PI * 1.6,
                "pencil",
                { strokeWidth: 0.9 },
            );
        if (Number(p.rain))
            for (let i = 0; i < 7; i++) {
                const x = 1 * U + i * 0.8 * U;
                pen.line(g, x, base + 0.4 * U, x - 0.35 * U, base + 1.5 * U, "pencil", {
                    strokeWidth: 1.1,
                });
            }
        a.base = [(left + right) / 2, base, "down"];
        return a;
    },
    describe: (p) =>
        `A white cloud with a flat base and puffs heaped up on top, drawn with a fine line${p.rain ? ", with lines of rain falling from it" : " and nothing under it"}.`,
    motion: {
        body: { is: "float", lift: 0, dx: 12, deg: 0, pivot: [0.5, 1], period: 9, units: true },
    },
});
