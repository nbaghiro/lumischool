import { roundedRect } from "../../ink/pen";
import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const clamp = (n: number | undefined, lo: number, hi: number, dflt: number) =>
    Math.max(lo, Math.min(hi, Math.round(n ?? dflt)));

/** A well, for the oasis (.docs/worlds-next.md). */
export const well = defineDrawing({
    id: "well",
    family: "places",
    title: "Well",
    group: "Props",
    about: "A stone well with a wooden frame over it, a handle to wind and a rope down to a bucket. Its stones are laid in rings, and the bucket holds so many litres, so how many buckets fill a trough is a question the well can ask.",
    params: { courses: 3, bucket: 1 },
    settings: {
        courses: { kind: "whole", min: 2, max: 5 },
        bucket: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Three rings, the bucket up", params: { courses: 3, bucket: 1 } },
        { label: "Four rings, the bucket down", params: { courses: 4, bucket: 0 } },
    ],
    box: () => ({ w: 8, h: 10 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = clamp(p.courses, 2, 5, 3),
            up = p.bucket > 0,
            cx = 4 * U,
            base = 9.5 * U,
            rim = base - n * 0.95 * U,
            a: RawAnchors = {};
        const wood = pen.fill("tang");
        // the frame and its roller, behind the well
        for (const x of [1.2 * U, 6.8 * U])
            pen.rect(g, x - 0.24 * U, 1.3 * U, 0.48 * U, rim - 1.3 * U + 0.4 * U, "pencil", wood, {
                strokeWidth: 1.5,
            });
        pen.rect(g, 1.2 * U, 1.75 * U, 5.6 * U, 0.6 * U, "pencil", wood, { strokeWidth: 1.5 });
        for (let x = 2.4 * U; x < 5.8 * U; x += 0.28 * U)
            pen.line(g, x, 1.78 * U, x + 3, 2.32 * U, "pencil", { strokeWidth: 0.8 });
        pen.linear(
            g,
            [
                [6.8 * U, 2.05 * U],
                [7.5 * U, 2.05 * U],
                [7.5 * U, 2.9 * U],
                [7.8 * U, 2.9 * U],
            ],
            "pencil",
            { strokeWidth: 2 },
        );
        pen.polygon(
            g,
            [
                [0.6 * U, 1.5 * U],
                [cx, 0.3 * U],
                [7.4 * U, 1.5 * U],
            ],
            "pencil",
            pen.fill("tang", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.6 },
        );
        const hang = up ? 4.2 * U : rim;
        pen.line(g, cx, 2.35 * U, cx, hang, "pencil", { strokeWidth: 1.2 });
        // the wall, a ring of stones at a time
        pen.path(
            g,
            `M${1 * U} ${rim}V${base}Q${cx} ${base + 0.9 * U} ${7 * U} ${base}V${rim}Z`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.8 },
        );
        for (let k = 0; k < n; k++) {
            const y0 = rim + k * 0.95 * U,
                off = k % 2 ? 0.45 : 0;
            for (let s = -1; s < 6; s++) {
                const x = 1 * U + (s + off) * 1.2 * U,
                    x0 = Math.max(1.05 * U, x + 2),
                    x1 = Math.min(6.95 * U, x + 1.2 * U - 2);
                if (x1 - x0 < 6) continue;
                const bow = Math.sin((((x0 + x1) / 2 - 1 * U) / (6 * U)) * Math.PI) * 0.3 * U;
                pen.path(
                    g,
                    roundedRect(x0, y0 + 3 + bow, x1 - x0, 0.95 * U - 6, 5),
                    "pencil",
                    s % 3 === 1 ? pen.fill("tang", "hachure", { hachureGap: 4 }) : null,
                    { strokeWidth: 1.1 },
                );
            }
        }
        pen.ellipse(g, cx, rim, 6.2 * U, 1.3 * U, "pencil", pen.fill("card"), { strokeWidth: 1.8 });
        pen.ellipse(
            g,
            cx,
            rim,
            4.6 * U,
            0.8 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 2.5 }),
            { strokeWidth: 1.3 },
        );
        if (up) {
            pen.path(
                g,
                `M${cx - 0.75 * U} ${hang}L${cx + 0.75 * U} ${hang}L${cx + 0.55 * U} ${hang + 1.3 * U}L${cx - 0.55 * U} ${hang + 1.3 * U}Z`,
                "pencil",
                wood,
                { strokeWidth: 1.6 },
            );
            for (const y of [0.35, 0.95])
                pen.line(
                    g,
                    cx - 0.72 * U + y * 3,
                    hang + y * U,
                    cx + 0.72 * U - y * 3,
                    hang + y * U,
                    "pencil",
                    { strokeWidth: 1 },
                );
            pen.arc(g, cx, hang, 1.5 * U, 1 * U, Math.PI, Math.PI * 2, "pencil", {
                strokeWidth: 1.2,
            });
            a.bucket = [cx, hang, "up"];
        }
        a.rim = [cx, rim - 0.6 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A stone well with a wooden frame over it, a handle to wind and a rope ${p.bucket > 0 ? "down to a bucket hanging over the water" : "let down into the well"}, its stones laid in rings.`,
});
