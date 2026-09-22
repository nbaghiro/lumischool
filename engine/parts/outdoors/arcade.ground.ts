import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const ground = defineDrawing({
    id: "arcade.ground",
    family: "outdoors",
    title: "Ground",
    group: "Structures",
    about: "A strip of ground to stand things on: one ruled line for where the ground is, earth hatched under it, and a few tufts of grass.",
    params: { w: 20 },
    settings: { w: { kind: "whole", min: 1, max: 36 } },
    takes: [
        { label: "A short strip", params: { w: 12 } },
        { label: "A long strip", params: { w: 30 } },
    ],
    box: (p) => ({ w: p.w, h: 3 }),
    draw: (c, p) => {
        const { pen, g } = c,
            y = 0.4 * U,
            w = p.w * U;
        pen.rect(
            g,
            0,
            y,
            w,
            2.4 * U,
            "pencil",
            pen.fill("mint", "hachure", { hachureGap: 10, fillWeight: 0.8 }),
            { stroke: "none" },
        );
        pen.line(g, 0, y, w, y, "ruler", { strokeWidth: 2.4 });
        for (let x = 0.7 * U; x < w - 10; x += 2.3 * U) {
            pen.line(g, x, y, x - 3, y - 7, "pencil", { strokeWidth: 1.2 });
            pen.line(g, x + 4, y, x + 6, y - 8, "pencil", { strokeWidth: 1.2 });
        }
        return { top: [w / 2, y, "up"] };
    },
    describe: () =>
        "A strip of ground seen from the side, one ruled line for where the ground is, green earth hatched under it and a few tufts of grass along it.",
});
