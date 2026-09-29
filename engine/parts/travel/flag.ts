import { type Ctx } from "../../ink/surface";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

const stripesOf = (n: number) => Math.max(2, Math.min(5, Math.round(n)));

const POLE = 22,
    TOP = 14,
    FLY = 88,
    DROP = 52,
    FOOT = 124;

/** The flag's lower hem, which hangs in small creases because nothing but the top bar holds it out. */
const hem = (y: number, t: number) => y + Math.sin(t * Math.PI * 3) * 1.6 * t;

export const flag = defineDrawing({
    id: "flag",
    family: "travel",
    title: "Flag on the moon",
    group: "Props",
    about: "A flag on a straight pole planted in a small mound of dust, held out stiff by a bar along its top as a flag on the moon is, with two to five stripes across it in turn.",
    params: { stripes: 3 },
    settings: { stripes: { kind: "whole", min: 2, max: 5 } },
    takes: [
        { label: "Three stripes", params: { stripes: 3 } },
        { label: "Two stripes", params: { stripes: 2 } },
        { label: "Five stripes", params: { stripes: 5 } },
    ],
    box: () => ({ w: 5, h: 7 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = stripesOf(p.stripes),
            band = DROP / n,
            left = POLE + 3,
            steps = 8;
        const edge = (y: number, t: number) => (y >= TOP + DROP - 0.5 ? hem(y, t) : y);
        for (let i = 0; i < n; i++) {
            const y0 = TOP + i * band,
                y1 = y0 + band,
                pts: [number, number][] = [];
            for (let k = 0; k <= steps; k++) {
                const t = k / steps;
                pts.push([left + (FLY - left) * t, edge(y0, t)]);
            }
            for (let k = steps; k >= 0; k--) {
                const t = k / steps;
                pts.push([left + (FLY - left) * t, edge(y1, t)]);
            }
            pen.polygon(g, pts, "ruler", pen.fill(i % 2 === 0 ? "sky" : "glow"), {
                ...calm(c, 1.1),
                stroke: "none",
            });
        }
        const outline: [number, number][] = [
            [left, TOP],
            [FLY, TOP],
        ];
        for (let k = steps; k >= 0; k--) {
            const t = k / steps;
            outline.push([left + (FLY - left) * t, hem(TOP + DROP, t)]);
        }
        pen.polygon(g, outline, "ruler", null, calm(c, 1.7));
        for (let i = 1; i < n; i++) {
            const y = TOP + i * band;
            pen.line(g, left, y, FLY, y, "ruler", calm(c, 1.1));
        }
        for (const [x, y0, y1] of [
            [48, TOP + 6, TOP + 18],
            [70, TOP + DROP - 16, TOP + DROP - 2],
        ] as const)
            pen.line(g, x, y0, x + 1, y1, "ruler", {
                ...calm(c, 0.8),
                stroke: c.t["ink-soft"],
            });
        pen.line(g, POLE, TOP - 1, FLY + 2, TOP - 1, "ruler", calm(c, 1.8));
        pen.rect(g, POLE - 2, TOP - 5, 4, FOOT - TOP + 3, "ruler", pen.fill("card"), calm(c, 1.5));
        pen.circle(g, POLE, TOP - 6, 6, "ruler", pen.fill("card"), calm(c, 1.3));
        pen.path(
            g,
            `M2 ${FOOT + 12}Q8 ${FOOT - 2} ${POLE} ${FOOT - 3}Q${POLE + 16} ${FOOT - 2} ${POLE + 26} ${FOOT + 12}Z`,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4, fillWeight: 0.6 }),
            { strokeWidth: 1.6, disableMultiStroke: true },
        );
        for (const [x, y, r] of [
            [58, FOOT + 10, 3],
            [72, FOOT + 12, 2.4],
            [8, FOOT + 13, 2.2],
        ] as const)
            pen.ellipse(g, x, y, r * 2, r * 1.3, "ruler", pen.fill("card"), calm(c, 1));
        pen.line(g, 0, FOOT + 14, 100, FOOT + 14, "pencil", { strokeWidth: 1.6 });
        return {
            top: [POLE, TOP - 9, "up"],
            flag: [FLY, TOP + DROP / 2, "right"],
            foot: [POLE, FOOT + 14, "down"],
        };
    },
    describe: (p) =>
        `A flag on a pole planted in a mound of dust, held out stiff by a bar along its top, with ${stripesOf(p.stripes) > 2 ? "blue and yellow stripes" : "a blue and a yellow stripe"} across it.`,
    motion: {
        still: "There is no air on the moon, so a flag there does not wave: a bar holds it out and it hangs still.",
    },
});
