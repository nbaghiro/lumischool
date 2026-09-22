import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const upto = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

/** A diving bell on its chain, for visiting the reef (.docs/worlds-next.md). */
export const divingBell = defineDrawing({
    id: "divingbell",
    family: "travel",
    title: "Diving bell",
    group: "Props",
    about: "A diving bell on its chain: a round-topped bell of riveted metal, open at the bottom, with round windows to look out of. It is let down from a boat to the sea floor with air kept inside it, which is how a child visits a reef without getting wet. Its windows and its rivets can be counted.",
    params: { windows: 3, lit: 0 },
    settings: {
        windows: { kind: "whole", min: 1, max: 4 },
        lit: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Three windows", params: { windows: 3, lit: 0 } },
        { label: "Two windows, lit", params: { windows: 2, lit: 1 } },
    ],
    box: () => ({ w: 8, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = upto(p.windows, 1, 4),
            cx = 4 * U,
            top = 3.1 * U,
            rim = 9.6 * U,
            a: RawAnchors = {};
        for (let i = 0; i < 5; i++)
            pen.ellipse(
                g,
                cx,
                0.35 * U + i * 0.5 * U,
                i % 2 ? 0.24 * U : 0.46 * U,
                0.62 * U,
                "ruler",
                null,
                { strokeWidth: 1.5 },
            );
        pen.circle(g, cx, top - 0.45 * U, 0.8 * U, "pencil", null, { strokeWidth: 2 });
        pen.path(
            g,
            `M${1 * U} ${rim}C${1.1 * U} ${6.2 * U} ${1.5 * U} ${top} ${cx} ${top}C${6.5 * U} ${top} ${6.9 * U} ${6.2 * U} ${7 * U} ${rim}Z`,
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 2.3 },
        );
        // a shine down one side, and the bands of rivets that hold the plates together
        pen.path(
            g,
            `M${2 * U} ${8.9 * U}C${2 * U} ${6.4 * U} ${2.2 * U} ${4.6 * U} ${3 * U} ${3.6 * U}`,
            "pencil",
            null,
            { strokeWidth: 3.2, stroke: c.t.glow },
        );
        for (const [y, half] of [
            [4.7, 2.3],
            [8.5, 2.85],
        ] as const) {
            pen.curve(
                g,
                [
                    [cx - half * U, y * U],
                    [cx, (y + 0.3) * U],
                    [cx + half * U, y * U],
                ],
                "pencil",
                { strokeWidth: 1.4 },
            );
            for (let k = -3; k <= 3; k++)
                pen.circle(
                    g,
                    cx + (k * half * U) / 3.5,
                    (y + 0.3 - Math.abs(k) * 0.03) * U - 6,
                    3.4,
                    "ruler",
                    pen.fill("ink-soft"),
                    { strokeWidth: 0.5 },
                );
        }
        for (let i = 0; i < n; i++) {
            const x = cx + (i - (n - 1) / 2) * 1.75 * U,
                y = 6.4 * U;
            if (p.lit > 0)
                pen.circle(g, x, y, 2 * U, "doodle", pen.fill("glow"), { stroke: "none" });
            pen.circle(g, x, y, 1.4 * U, "ruler", pen.fill("card"), { strokeWidth: 1.9 });
            pen.circle(g, x, y, 0.98 * U, "ruler", pen.fill(p.lit > 0 ? "glow" : "sky"), {
                strokeWidth: 1.2,
            });
            pen.line(g, x - 0.34 * U, y - 0.12 * U, x - 0.1 * U, y - 0.4 * U, "pencil", {
                strokeWidth: 1.6,
                stroke: c.t.card,
            });
            a[`window(${i})`] = [x, y - 0.7 * U, "up"];
        }
        pen.ellipse(
            g,
            cx,
            rim,
            6 * U,
            0.95 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.9 },
        );
        a.chain = [cx, 0, "up"];
        a.rim = [cx, rim + 0.5 * U, "down"];
        return a;
    },
    describe: (p) =>
        `An orange diving bell hanging from a chain, round-topped with bands of rivets, open at the bottom and with round windows${p.lit > 0 ? " glowing yellow" : " of blue glass"}.`,
});
