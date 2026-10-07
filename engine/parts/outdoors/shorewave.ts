import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const shoreWave = defineDrawing<{ curls: number }>({
    id: "shorewave",
    family: "outdoors",
    title: "Wave on the shore",
    group: "Props",
    about: "A little wave seen from above as it runs up a beach: a white line of foam curling along its front over a pale band of water, one to three curls long.",
    params: { curls: 2 },
    settings: { curls: { kind: "whole", min: 1, max: 3 } },
    takes: [
        { label: "Two curls", params: { curls: 2 } },
        { label: "A long one", params: { curls: 3 } },
    ],
    box: (p) => ({ w: Math.max(1, Math.min(3, Math.round(p.curls))) + 1, h: 1 }),
    draw: (c, p) => {
        const n = Math.max(1, Math.min(3, Math.round(p.curls)));
        const w = (n + 1) * U;
        c.pen.path(
            c.g,
            `M${0.2 * U} ${0.6 * U}Q${w / 2} ${0.05 * U} ${w - 0.2 * U} ${0.6 * U}Q${w / 2} ${0.95 * U} ${0.2 * U} ${0.6 * U}Z`,
            "ruler",
            c.pen.fill("sky"),
            { stroke: "none" },
        );
        let d = `M${0.3 * U} ${0.55 * U}`;
        for (let k = 0; k < n; k++) {
            const x = (0.3 + k) * U;
            d += `Q${x + 0.25 * U} ${0.2 * U} ${x + 0.5 * U} ${0.55 * U}T${x + U} ${0.55 * U}`;
        }
        c.pen.path(c.g, d, "pencil", null, {
            strokeWidth: 2.2,
            stroke: c.paper ? c.t.ink : c.t.card,
            roughness: 0.4,
        });
        return {};
    },
    describe: (p) =>
        `A little wave running up a beach, seen from above: a white line of foam curling ${Math.round(p.curls) === 1 ? "once" : `${Math.round(p.curls)} times`} along its front over pale water.`,
    motion: {
        still: "The game moves the wave up and down the beach; the drawing itself holds still.",
    },
});
