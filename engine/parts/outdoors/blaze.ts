import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const FIRM = { disableMultiStroke: true, preserveVertices: true } as const;

/** A tongue of flame standing on its foot at (x, y), `w` wide and `h` tall, leaning by `lean`. */
function tongue(x: number, y: number, w: number, h: number, lean: number): string {
    return `M${x - w / 2} ${y}Q${x - w * 0.7} ${y - h * 0.45} ${x + lean} ${y - h}Q${x + w * 0.7} ${y - h * 0.45} ${x + w / 2} ${y}Z`;
}

export const blaze = defineDrawing({
    id: "blaze",
    family: "outdoors",
    title: "Fire",
    group: "Props",
    about: "A fire seen from the side: two to four tongues of flame, red at the edge, orange inside and yellow at the heart, burning in a window, on a roof or in a tree.",
    params: { tongues: 3 },
    settings: { tongues: { kind: "whole", min: 2, max: 4 } },
    takes: [
        { label: "Three tongues", params: { tongues: 3 } },
        { label: "Two tongues", params: { tongues: 2 } },
        { label: "Four tongues", params: { tongues: 4 } },
    ],
    box: () => ({ w: 2, h: 3 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            n = Math.max(2, Math.min(4, Math.round(p.tongues))),
            foot = 2.85 * U;
        for (let i = 0; i < n; i++) {
            const x = (0.55 + (i * 0.9) / (n - 1)) * U,
                h = (i === Math.floor(n / 2) ? 2.6 : 1.9) * U,
                lean = (i % 2 === 0 ? -0.12 : 0.1) * U;
            pen.path(g, tongue(x, foot, 0.62 * U, h, lean), "pencil", pen.fill("berry"), {
                strokeWidth: 1.4,
            });
        }
        pen.path(g, tongue(U, foot, 1.1 * U, 1.8 * U, 0.05 * U), "ruler", pen.fill("tang"), {
            strokeWidth: 1.1,
            ...FIRM,
        });
        pen.path(g, tongue(U, foot, 0.55 * U, 1 * U, 0), "ruler", pen.fill("glow"), {
            strokeWidth: 0.9,
            ...FIRM,
        });
        return { foot: [U, foot, "down"], top: [U, foot - 2.6 * U, "up"] };
    },
    describe: (p) =>
        `A fire with ${Math.max(2, Math.min(4, Math.round(p.tongues)))} tongues of flame, red at the edges, orange inside and yellow at the heart, leaning a little as it burns.`,
    motion: { body: { is: "twinkle", dim: 0.2, amt: 0.14, period: 1.4 } },
});
