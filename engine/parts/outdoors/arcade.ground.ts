import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const ground = defineDrawing<{ w: number; snow: number }>({
    id: "arcade.ground",
    family: "outdoors",
    title: "Ground",
    group: "Structures",
    about: "A strip of ground to stand things on: one ruled line for where the ground is, earth hatched under it, and a few tufts of grass, or a covering of snow.",
    params: { w: 20, snow: 0 },
    settings: { w: { kind: "whole", min: 1, max: 36 }, snow: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "A short strip", params: { w: 12, snow: 0 } },
        { label: "A long strip", params: { w: 30, snow: 0 } },
        { label: "A snowy strip", params: { w: 12, snow: 1 } },
    ],
    box: (p) => ({ w: p.w, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 0.4 * U,
            w = p.w * U,
            snow = p.snow > 0;
        pen.rect(
            g,
            0,
            y,
            w,
            2.4 * U,
            "pencil",
            snow
                ? pen.fill("sky", "hachure", { hachureGap: 16, fillWeight: 0.5 })
                : pen.fill("mint", "hachure", { hachureGap: 10, fillWeight: 0.8 }),
            { stroke: "none" },
        );
        pen.line(g, 0, y, w, y, "ruler", { strokeWidth: 2.4 });
        if (snow) return { top: [w / 2, y, "up"] };
        for (let x = 0.7 * U; x < w - 10; x += 2.3 * U) {
            pen.line(g, x, y, x - 3, y - 7, "pencil", { strokeWidth: 1.2 });
            pen.line(g, x + 4, y, x + 6, y - 8, "pencil", { strokeWidth: 1.2 });
        }
        return { top: [w / 2, y, "up"] };
    },
    describe: (p) =>
        p.snow > 0
            ? "A strip of snowy ground seen from the side, one ruled line for where the snow lies, with pale blue hatching under it and no grass showing."
            : "A strip of ground seen from the side, one ruled line for where the ground is, green earth hatched under it and a few tufts of grass along it.",
});
