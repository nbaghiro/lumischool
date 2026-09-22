import { type RawAnchors } from "../../ink/surface";
import { rng, roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { lightFill } from "./apparatus";

export const dish = defineDrawing({
    id: "dish",
    family: "science",
    title: "Evaporating dish",
    group: "Structures",
    about: "A shallow dish of salty water left on a windowsill, in the sun or not (`sun`), looked at on one day. `left` is how much water is still in it, in quarters, and as the water evaporates the salt it held is left behind as a white crust round the edge and then over the bottom; the water goes into the air and the salt stays, which is the point the picture makes.",
    params: { left: 2, day: 3, sun: 1 },
    settings: {
        left: { kind: "whole", min: 0, max: 4 },
        day: { kind: "whole", min: 0, max: 30 },
        sun: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "Day 1, nearly full", params: { left: 4, day: 1, sun: 1 } },
        { label: "Day 3, half gone", params: { left: 2, day: 3, sun: 1 } },
        { label: "Day 6 in the shade, only salt", params: { left: 0, day: 6, sun: 0 } },
    ],
    box: () => ({ w: 11, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            left = Math.max(0, Math.min(4, Math.round(p.left)));
        const cx = 5.2 * U,
            rimY = 3.2 * U,
            w = 8.4 * U,
            depth = 2.2 * U;
        pen.rect(
            g,
            0.2 * U,
            6.1 * U,
            10.6 * U,
            0.7 * U,
            "pencil",
            lightFill(c, "tang", "hachure", 5),
            { strokeWidth: 1.6 },
        );
        const bowl = `M${cx - w / 2} ${rimY}Q${cx - w / 2 + 0.6 * U} ${rimY + depth + 0.6 * U} ${cx} ${rimY + depth + 0.5 * U}Q${cx + w / 2 - 0.6 * U} ${rimY + depth + 0.6 * U} ${cx + w / 2} ${rimY}Z`;
        pen.path(g, bowl, "pencil", pen.fill("card"), { strokeWidth: 2 });
        if (left > 0) {
            const lw = w * (0.45 + 0.13 * left),
                ly = rimY + depth * (1 - left * 0.2);
            pen.path(
                g,
                `M${cx - lw / 2} ${ly}Q${cx - lw / 2 + 0.4 * U} ${rimY + depth + 0.3 * U} ${cx} ${rimY + depth + 0.3 * U}Q${cx + lw / 2 - 0.4 * U} ${rimY + depth + 0.3 * U} ${cx + lw / 2} ${ly}Z`,
                "pencil",
                pen.fill("sky"),
                { strokeWidth: 1.2 },
            );
        }
        const crust = 4 - left,
            r = rng(5);
        for (let k = 0; k < crust * 5; k++) {
            const u = r(),
                side = k % 2 ? 1 : -1,
                x = cx + side * (w / 2 - 0.5 * U - u * (0.6 + crust * 0.5) * U),
                y = rimY + 0.35 * U + u * depth * (0.3 + crust * 0.15);
            pen.rect(g, x - 3, y - 3, 6, 6, "pencil", pen.fill("card"), { strokeWidth: 0.9 });
        }
        if (left === 0)
            for (let k = 0; k < 14; k++)
                pen.rect(
                    g,
                    cx - 2.6 * U + r() * 5.2 * U - 3,
                    rimY + depth - 0.2 * U + r() * 0.5 * U,
                    6,
                    6,
                    "pencil",
                    pen.fill("card"),
                    { strokeWidth: 0.9 },
                );
        pen.ellipse(g, cx, rimY, w, 0.8 * U, "pencil", null, { strokeWidth: 1.8 });
        if (p.sun > 0) {
            for (let k = 0; k < 6; k++) {
                const th = (k / 6) * Math.PI * 2;
                pen.line(
                    g,
                    9.6 * U + Math.cos(th) * 0.7 * U,
                    1 * U + Math.sin(th) * 0.7 * U,
                    9.6 * U + Math.cos(th) * 1 * U,
                    1 * U + Math.sin(th) * 1 * U,
                    "pencil",
                    { strokeWidth: 1.3 },
                );
            }
            pen.circle(g, 9.6 * U, 1 * U, 1.1 * U, "pencil", lightFill(c, "glow", "solid"), {
                strokeWidth: 1.4,
            });
        }
        pen.path(
            g,
            roundedRect(0.3 * U, 0.2 * U, 3.6 * U, 1.4 * U, 5),
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.4 },
        );
        num(c, 2.1 * U, 1.25 * U, `day ${Math.max(0, Math.round(p.day))}`, 15);
        a.dish = [cx, rimY - 0.4 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A shallow dish on a windowsill${p.sun > 0 ? " with the sun shining on it" : ""}, salty water drying in it, a white crust left where it has dried, a day tag beside it.`,
    reads: true,
});
