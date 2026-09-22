import { type Ctx, type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const calm = <G>(c: Ctx<G>, strokeWidth: number) => ({
    strokeWidth,
    roughness: 0.6 * c.pen.o.roughness,
    bowing: 0.8 * c.pen.o.roughness,
    disableMultiStroke: true,
    preserveVertices: true,
});

export const airship = defineDrawing({
    id: "airship",
    family: "travel",
    title: "Airship",
    group: "Structures",
    about: "A long airship seen from the side, its rounded nose to the right and its body tapering to fins at the tail, with seams dividing it into panels. A cabin with a row of windows hangs underneath on thin lines, and a two-bladed propeller turns at the cabin's back.",
    params: { windows: 4 },
    settings: { windows: { kind: "whole", min: 2, max: 6 } },
    takes: [
        { label: "Four windows", params: { windows: 4 } },
        { label: "Six windows", params: { windows: 6 } },
    ],
    box: () => ({ w: 14, h: 6 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            n = Math.max(2, Math.min(6, Math.round(p.windows)));
        const nose = 13.2 * U,
            tail = 1.6 * U,
            cy = 2.05 * U,
            h = 1.55 * U,
            skin = pen.fill("sky", "hachure", { hachureGap: 5, fillWeight: 0.7 }),
            wood = pen.fill("tang");
        /** The body's half height a share u of the way from tail (0) to nose (1). */
        const half = (u: number) =>
            h *
            Math.pow(
                Math.sin(
                    Math.min(1, u * 1.08 + 0.02) * Math.PI * 0.5 +
                        (u > 0.55 ? (u - 0.55) * 1.6 : 0),
                ),
                0.8,
            ) *
            (u > 0.93 ? Math.sqrt(Math.max(0, 1 - ((u - 0.93) / 0.07) * 0.55)) : 1);
        const X = (u: number) => tail + u * (nose - tail);
        // the fins at the tail, behind the body
        pen.polygon(
            g,
            [
                [X(0.02), cy - 0.2 * U],
                [X(0.2), cy - 0.9 * U],
                [X(0.02), cy - h - 0.25 * U],
                [0.5 * U, cy - h - 0.2 * U],
            ],
            "pencil",
            wood,
            calm(c, 1.6),
        );
        pen.polygon(
            g,
            [
                [X(0.02), cy + 0.2 * U],
                [X(0.2), cy + 0.9 * U],
                [X(0.02), cy + h + 0.25 * U],
                [0.5 * U, cy + h + 0.2 * U],
            ],
            "pencil",
            wood,
            calm(c, 1.6),
        );
        // the body, sampled along its length so the seams follow its curve
        const top: [number, number][] = [],
            bottom: [number, number][] = [];
        for (let i = 0; i <= 24; i++) {
            const u = i / 24;
            top.push([X(u), cy - half(u)]);
            bottom.push([X(u), cy + half(u)]);
        }
        const outline = [...top, ...bottom.reverse()];
        pen.polygon(g, outline, "pencil", skin, { ...calm(c, 1.8), preserveVertices: false });
        for (const u of [0.22, 0.4, 0.58, 0.76]) {
            const x = X(u),
                hh = half(u);
            pen.curve(
                g,
                [
                    [x, cy - hh],
                    [x + 0.22 * U, cy],
                    [x, cy + hh],
                ],
                "pencil",
                { strokeWidth: 1, stroke: c.t["ink-soft"] },
            );
        }
        pen.curve(
            g,
            [
                [X(0.06), cy + 0.05 * U],
                [X(0.5), cy + 0.12 * U],
                [X(0.95), cy + 0.02 * U],
            ],
            "pencil",
            { strokeWidth: 1, stroke: c.t["ink-soft"] },
        );
        // the side fin over the body
        pen.polygon(
            g,
            [
                [X(0.03), cy - 0.05 * U],
                [X(0.24), cy + 0.2 * U],
                [X(0.03), cy + 0.55 * U],
                [0.9 * U, cy + 0.35 * U],
            ],
            "pencil",
            wood,
            calm(c, 1.4),
        );
        // the cabin on its lines, with its windows, and the propeller at its back
        const cw = (n * 0.72 + 0.9) * U,
            cx0 = X(0.55) - cw / 2,
            ct = 4.2 * U,
            cb = 5.25 * U;
        for (const u of [0.08, 0.36, 0.64, 0.92])
            pen.line(
                g,
                cx0 + u * cw,
                ct,
                cx0 + u * cw + (u - 0.5) * 1.1 * U,
                cy + half(0.55) - 5,
                "pencil",
                calm(c, 1.1),
            );
        pen.path(
            g,
            `M${cx0} ${ct}H${cx0 + cw}Q${cx0 + cw + 0.55 * U} ${ct} ${cx0 + cw + 0.4 * U} ${(ct + cb) / 2}Q${cx0 + cw + 0.2 * U} ${cb} ${cx0 + cw - 0.2 * U} ${cb}H${cx0 + 0.2 * U}Q${cx0} ${cb} ${cx0} ${cb - 0.3 * U}Z`,
            "pencil",
            wood,
            calm(c, 1.7),
        );
        for (let i = 0; i < n; i++) {
            const wx = cx0 + 0.55 * U + i * 0.72 * U;
            pen.rect(
                g,
                wx - 0.22 * U,
                ct + 0.2 * U,
                0.44 * U,
                0.46 * U,
                "ruler",
                pen.fill("card"),
                { strokeWidth: 1.1 },
            );
            a[`window(${i})`] = [wx, ct + 0.2 * U, "down"];
        }
        const px = cx0 - 0.35 * U,
            py = (ct + cb) / 2;
        pen.line(g, cx0, py, px, py, "pencil", calm(c, 1.6));
        pen.ellipse(
            g,
            px,
            py - 0.5 * U,
            0.26 * U,
            0.9 * U,
            "pencil",
            pen.fill("card"),
            calm(c, 1.2),
        );
        pen.ellipse(
            g,
            px,
            py + 0.5 * U,
            0.26 * U,
            0.9 * U,
            "pencil",
            pen.fill("card"),
            calm(c, 1.2),
        );
        pen.circle(g, px, py, 7, "pencil", pen.fill("ink-soft"), calm(c, 1));
        a.nose = [nose, cy, "right"];
        a.cabin = [cx0 + cw / 2, cb, "down"];
        return a;
    },
    describe: () =>
        "A long airship seen from the side, its rounded nose to the right and fins at its tail, a cabin with a row of windows hanging underneath on thin lines.",
    motion: {
        body: { is: "float", lift: 6, dx: 12, deg: 1, pivot: [0.5, 0.5], period: 8.6, units: true },
    },
});
