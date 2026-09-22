import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash, wash } from "./wash";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const whole = (v: unknown, lo: number, hi: number, d: number) =>
    clamp(Math.round(Number(v) || d), lo, hi);

export const meadow = defineDrawing({
    id: "meadow",
    family: "outdoors",
    title: "Meadow",
    group: "Structures",
    about: "Grass seen from above and a little way off: tufts, clover and daisies scattered over a pale green wash, drawn in lengths that meet, so a field can be as big as a scene needs. It is ground to stand things on, with nothing in it to count.",
    params: { across: 16, deep: 10, x0: 0, y0: 0, daisies: 1 },
    settings: {
        across: { kind: "whole", min: 1, max: 36 },
        deep: { kind: "whole", min: 1, max: 40 },
        x0: { kind: "whole", min: 0, max: 400 },
        y0: { kind: "whole", min: 0, max: 400 },
        daisies: { kind: "whole", min: 0, max: 3 },
    },
    takes: [
        { label: "A length of grass", params: { across: 16, deep: 10, x0: 0, y0: 0, daisies: 1 } },
        { label: "Full of daisies", params: { across: 12, deep: 8, x0: 16, y0: 0, daisies: 3 } },
    ],
    box: (p) => ({ w: whole(p.across, 1, 36, 16), h: whole(p.deep, 1, 40, 10) }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = whole(p.across, 1, 36, 16),
            h = whole(p.deep, 1, 40, 10),
            x0 = Math.round(Number(p.x0) || 0),
            y0 = Math.round(Number(p.y0) || 0);
        wash(c, `M0 0H${w * U}V${h * U}H0Z`, "mint", 0.16, false);
        const flowers = clamp(Number(p.daisies) || 0, 0, 3);
        // One thing at most in every cell of a square and a half, placed by the cell's place in the whole field.
        for (let j = 0; j < h / 1.5; j++)
            for (let i = 0; i < w / 1.5; i++) {
                const gx = Math.floor(x0 / 1.5) + i,
                    gy = Math.floor(y0 / 1.5) + j,
                    r = hash(gx, gy);
                const x = (gx * 1.5 + 0.2 + hash(gx, gy, 1) * 1.1 - x0) * U,
                    y = (gy * 1.5 + 0.3 + hash(gx, gy, 2) * 1.0 - y0) * U;
                if (x < 6 || x > w * U - 6 || y < 8 || y > h * U - 3) continue;
                if (r < 0.36) {
                    // a tuft is a few blades from a short run of ground, fanned a little, never meeting at a point
                    const lean = (hash(gx, gy, 3) - 0.5) * 3;
                    for (const [dx, tall] of [
                        [-3.5, 5.5],
                        [-1, 8],
                        [1.6, 6.5],
                        [4, 4.5],
                    ] as const)
                        pen.line(g, x + dx, y, x + dx * 1.35 + lean, y - tall, "pencil", {
                            strokeWidth: 1.15,
                            stroke: c.t.ok,
                            roughness: 0.45,
                            disableMultiStroke: true,
                        });
                } else if (r < 0.36 + 0.06 * flowers) {
                    for (let k = 0; k < 5; k++) {
                        const a = (k / 5) * Math.PI * 2;
                        pen.ellipse(
                            g,
                            x + Math.cos(a) * 3.2,
                            y + Math.sin(a) * 3.2,
                            4.4,
                            3.2,
                            "ruler",
                            pen.fill("card"),
                            { strokeWidth: 0.7, roughness: 0.3 },
                        );
                    }
                    pen.circle(g, x, y, 3.2, "ruler", pen.fill("glow"), {
                        strokeWidth: 0.6,
                        roughness: 0.3,
                    });
                } else if (r < 0.42 + 0.06 * flowers) {
                    for (const [dx, dy] of [
                        [-2.2, 0],
                        [2.2, 0],
                        [0, -3],
                    ] as const)
                        pen.circle(g, x + dx, y + dy, 4.4, "ruler", pen.fill("mint"), {
                            strokeWidth: 0.7,
                            roughness: 0.3,
                        });
                }
            }
        return { top: [(w * U) / 2, 0, "up"] };
    },
    describe: (p) =>
        `Grass seen from above and a little way off, tufts of green blades${clamp(Number(p.daisies) || 0, 0, 3) > 0 ? ", clover and white daisies" : " and clover"} scattered over a pale green wash of ground.`,
});
