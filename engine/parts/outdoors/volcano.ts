import { part } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { blade } from "../animals/nature";

export const volcano = defineDrawing({
    id: "volcano",
    family: "outdoors",
    title: "Volcano",
    group: "Props",
    about: "A volcano with lava running down from its crater and smoke going up, or the same volcano far off on an island in the sea. A thing to hang a temperature on: rock melts, and the lava is the melted rock.",
    params: { smoke: 1, island: 0 },
    settings: {
        smoke: { kind: "whole", min: 0, max: 1 },
        island: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Smoking", params: { smoke: 1, island: 0 } },
        { label: "On an island, far off", params: { smoke: 1, island: 1 } },
    ],
    box: (p) => (p.island > 0 ? { w: 14, h: 8 } : { w: 12, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            isl = p.island > 0,
            base = isl ? 6.4 * U : 10.6 * U,
            cx = isl ? 7 * U : 6 * U;
        const hw = isl ? 3.6 * U : 5.4 * U,
            top = isl ? 2.6 * U : 2.8 * U,
            mouth = isl ? 0.8 * U : 1.4 * U;
        if (isl)
            pen.ellipse(g, cx, base, 11 * U, 1.4 * U, "pencil", pen.fill("glow"), {
                strokeWidth: 1.6,
            });
        pen.polygon(
            g,
            [
                [cx - hw, base],
                [cx - mouth, top],
                [cx + mouth, top],
                [cx + hw, base],
            ],
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 6, fillWeight: 0.7 }),
            { strokeWidth: 2 },
        );
        pen.ellipse(g, cx, top, mouth * 2, 0.6 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.5,
        });
        for (const [dx, len] of [
            [-0.35, 0.55],
            [0.3, 0.8],
        ] as const) {
            const x0 = cx + dx * mouth,
                y1 = top + (base - top) * len;
            pen.path(
                g,
                `M${x0 - 8} ${top}Q${x0 - 14 + dx * 30} ${(top + y1) / 2} ${x0 + dx * 60} ${y1}Q${x0 + 10 + dx * 30} ${(top + y1) / 2} ${x0 + 8} ${top}Z`,
                "pencil",
                pen.fill("tang"),
                { strokeWidth: 1.3 },
            );
        }
        if (p.smoke > 0)
            for (const [dx, dy, d] of [
                [0, -0.9, 1.3],
                [0.5, -1.8, 1.1],
                [1.2, -2.4, 0.9],
            ] as const) {
                if (top + dy * U - d * U * 0.4 < 0) continue;
                pen.ellipse(
                    part(c, "smoke", [cx + dx * U, top + dy * U]).g,
                    cx + dx * U,
                    top + dy * U,
                    d * U * 1.3,
                    d * U,
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 1.3 },
                );
            }
        if (isl) {
            for (let x = 0.2 * U; x < 14 * U; x += 1.6 * U)
                pen.curve(
                    g,
                    [
                        [x, base + 0.9 * U],
                        [x + 0.4 * U, base + 0.7 * U],
                        [x + 0.8 * U, base + 0.9 * U],
                    ],
                    "pencil",
                    { strokeWidth: 1.3 },
                );
            for (const px of [1.6, 12.4]) {
                pen.line(g, px * U, base - 0.1 * U, (px + 0.3) * U, base - 1.6 * U, "pencil", {
                    strokeWidth: 2.2,
                    stroke: c.t.tang,
                });
                for (const ang of [-2.6, -1.6, -0.5])
                    pen.polygon(
                        g,
                        blade((px + 0.3) * U, base - 1.6 * U, 0.9 * U, 9, ang),
                        "pencil",
                        pen.fill("mint"),
                        { strokeWidth: 1 },
                    );
            }
        } else pen.line(g, 0.2 * U, base, 11.8 * U, base, "pencil", { strokeWidth: 2 });
        return {
            crater: [cx, top - 4, "up"],
            lava: [cx + 0.3 * mouth + 36, top + (base - top) * 0.7, "right"],
            foot: [cx - hw, base, "left"],
        };
    },
    describe: (p) =>
        `${p.island > 0 ? "A volcano on an island in the sea with palm trees on its shore" : "A volcano with a shaded cone standing on a line of ground"}, orange lava running down from its crater${p.smoke > 0 ? " and puffs of smoke going up" : ""}.`,
    motion: {
        parts: { smoke: { is: "flow", lift: 9, dx: 4, period: 3.4, wave: 0.6 } },
        puff: { at: "crater", every: 6, rise: 110, drift: 40 },
    },
});
