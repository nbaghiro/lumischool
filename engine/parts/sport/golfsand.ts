import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { wash } from "../outdoors/wash";

export const golfSand = defineDrawing({
    id: "golfsand",
    family: "sport",
    title: "Putting sand",
    group: "Props",
    about: "A sandy patch seen from above. The hatch and scattered short grain marks distinguish the slowing surface without relying on colour.",
    params: { width: 5, height: 4 },
    settings: {
        width: { kind: "number", min: 1, max: 20, step: 0.5 },
        height: { kind: "number", min: 1, max: 20, step: 0.5 },
    },
    takes: [
        { label: "Sand patch", params: { width: 5, height: 4 } },
        { label: "Long bunker", params: { width: 9, height: 3 } },
    ],
    box: (p) => ({ w: p.width, h: p.height }),
    draw: (c, p) => {
        const w = p.width * U,
            h = p.height * U;
        wash(c, `M0 0H${w}V${h}H0Z`, "glow", 0.25, false);
        c.pen.rect(
            c.g,
            4,
            4,
            w - 8,
            h - 8,
            "pencil",
            c.pen.fill("tang", "hachure", { hachureGap: 10, fillWeight: 0.65 }),
            { strokeWidth: 0, stroke: "none", roughness: 0.2 },
        );
        c.pen.rect(c.g, 0, 0, w, h, "pencil", null, {
            strokeWidth: 1,
            stroke: c.t.tang,
            roughness: 0.2,
        });
        for (let y = 0.6 * U; y < h - 0.3 * U; y += 0.9 * U)
            for (let x = 0.5 * U; x < w - 0.3 * U; x += 1.1 * U)
                c.pen.line(c.g, x, y, x + 0.12 * U, y - 0.05 * U, "pencil", {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
        return {};
    },
    describe: () =>
        "A rectangular sandy patch on a putting course, washed yellow with orange hatching and scattered grains that distinguish it from the smooth lawn.",
});
