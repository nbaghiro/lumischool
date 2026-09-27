import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const within = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/** How much of a fence's height its hole takes, from the ground up: the pups' park lets through only a pup shorter than it. */
export const FENCE_HOLE = 0.45;

export const parkFence = defineDrawing<{ w: number; h: number; hole: number }>({
    id: "parkfence",
    family: "outdoors",
    title: "Picket fence",
    group: "Structures",
    about: "A white picket fence seen from the side, its pointed boards nailed to two rails, sometimes with one board broken off at the bottom to leave a small hole.",
    params: { w: 3, h: 2, hole: 0 },
    settings: {
        w: { kind: "whole", min: 2, max: 8 },
        h: { kind: "whole", min: 1, max: 5 },
        hole: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "A low fence", params: { w: 3, h: 2, hole: 0 } },
        { label: "A tall fence with a hole", params: { w: 3, h: 4, hole: 1 } },
    ],
    box: (p) => ({ w: within(p.w, 2, 8), h: within(p.h, 1, 5) }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = within(p.w, 2, 8),
            h = within(p.h, 1, 5),
            hole = p.hole > 0,
            board = pen.fill("card");
        // drawn a little inside the box, so the pencil's wobble stays within it
        const pad = 0.12 * U,
            n = w * 2,
            bw = (w * U - 2 * pad) / n,
            foot = h * U - pad;
        const mid = Math.floor(n / 2);
        for (let i = 0; i < n; i++) {
            const x = pad + i * bw,
                bottom = hole && (i === mid || i === mid - 1) ? foot * (1 - FENCE_HOLE) : foot;
            pen.path(
                g,
                `M${x + 2} ${bottom}L${x + 2} ${0.35 * U}L${x + bw / 2} ${pad}L${x + bw - 2} ${0.35 * U}L${x + bw - 2} ${bottom}Z`,
                "pencil",
                board,
                { strokeWidth: 1.3 },
            );
        }
        for (const y of [0.2, 0.45])
            pen.rect(g, pad, y * h * U, w * U - 2 * pad, 0.18 * U, "pencil", pen.fill("ink-soft"), {
                strokeWidth: 1,
            });
        return { top: [(w / 2) * U, 0, "up"] };
    },
    describe: (p) =>
        p.hole > 0
            ? "A white picket fence seen from the side, pointed boards on two grey rails, with two boards broken short at the bottom to leave a small hole."
            : "A white picket fence seen from the side, a row of pointed boards nailed to two grey rails, standing on the ground.",
});
