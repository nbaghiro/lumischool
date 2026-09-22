import { type RawAnchors } from "../../ink/surface";
import { U, type TokenName } from "../../paper";
import { defineDrawing } from "../drawing";
import { numOn } from "../lettering";

export const targetBoard = defineDrawing({
    id: "target",
    family: "sport",
    title: "Target board",
    group: "Structures",
    about: "Rings with their points written in them and shots marked where they landed. Which ring a shot is in decides the score, so the boundaries are ruled and a shot is a dot with a cross on it, not a blob.",
    params: {
        rings: [1, 2, 5, 10],
        shots: [
            [0.2, 0.1],
            [-0.5, 0.4],
        ],
    },
    settings: { rings: { kind: "numbers", min: 0, max: 100, most: 6 }, shots: { kind: "fixed" } },
    takes: [
        {
            label: "Four rings, two darts",
            params: {
                rings: [1, 2, 5, 10],
                shots: [
                    [0.2, 0.1],
                    [-0.5, 0.4],
                ],
            },
        },
        {
            label: "Three rings",
            params: {
                rings: [2, 5, 20],
                shots: [
                    [0.05, -0.08],
                    [0.6, 0.3],
                    [-0.3, -0.55],
                ],
            },
        },
        { label: "Nothing thrown", params: { rings: [1, 2, 5, 10], shots: [] } },
    ],
    box: () => ({ w: 14, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            cx = 7 * U,
            cy = 7 * U,
            R = 6 * U;
        const n = Math.max(1, p.rings.length);
        // Drawn outermost first: each smaller disc covers the middle of the one before it, which is
        // how the bands end up alternating in colour and in hatching both.
        for (let i = 0; i < n; i++) {
            const r = R * (1 - i / n),
                tint: TokenName = (n - 1 - i) % 2 === 0 ? "berry" : "card";
            pen.circle(
                g,
                cx,
                cy,
                r * 2,
                "ruler",
                pen.fill(tint, "solid", { hachureGap: 7, fillWeight: 0.7 }),
                { strokeWidth: i === 0 ? 2.4 : 1.6 },
            );
        }
        for (let i = 0; i < n; i++) {
            const rm = R * (1 - (i + 0.5) / n);
            numOn(c, cx - rm, cy + 5, p.rings[i] ?? 0, 14);
            a[`ring(${p.rings[i]})`] = [cx - rm, cy - 8, "up"];
        }
        p.shots.forEach((s, i) => {
            const x = cx + (s[0] ?? 0) * R,
                y = cy + (s[1] ?? 0) * R;
            pen.circle(g, x, y, 17, "ruler", pen.fill("card"), { strokeWidth: 1.4 });
            pen.line(g, x - 6, y - 6, x + 6, y + 6, "ruler", { strokeWidth: 2.2 });
            pen.line(g, x - 6, y + 6, x + 6, y - 6, "ruler", { strokeWidth: 2.2 });
            a[`shot(${i + 1})`] = [x, y - 12, "up"];
        });
        a.centre = [cx, cy, "right"];
        return a;
    },
    describe: () =>
        "A round target board of rings alternating pink and white, the points for each ring written on it, where any shot is marked with a white dot and a cross.",
    reads: true,
});
