import { roundedRect } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";
import { CAR, RAIL, underneath } from "./yard";

export const carriage = defineDrawing({
    id: "carriage",
    family: "travel",
    title: "Carriage",
    group: "Props",
    about: "One carriage with its number on the side, drawn on its own so it can be somewhere: in a train, in a siding, or on its way between the two. The number is what tells two carriages apart, so the order of a train can be read without any colour in it.",
    params: { label: "1", windows: 2 },
    settings: { label: { kind: "text", most: 3 }, windows: { kind: "whole", min: 1, max: 4 } },
    takes: [
        { label: "Carriage 1", params: { label: "1", windows: 2 } },
        { label: "Carriage 12, three windows", params: { label: "12", windows: 3 } },
    ],
    box: () => ({ w: CAR, h: 5 }),
    draw: (c, p) => {
        const { pen, g } = c,
            top = 1.1 * U,
            bot = (RAIL - 0.7) * U;
        pen.path(
            g,
            roundedRect(0.35 * U, top, (CAR - 0.7) * U, bot - top, 8),
            "pencil",
            pen.fill("sky", "solid", { hachureGap: 8, fillWeight: 0.6 }),
            { strokeWidth: 2.4 },
        );
        pen.line(g, 0.55 * U, top + 0.3 * U, (CAR - 0.55) * U, top + 0.3 * U, "pencil", {
            strokeWidth: 1.1,
            stroke: c.t["ink-soft"],
        });
        const n = Math.max(1, p.windows);
        for (let i = 0; i < n; i++) {
            const ww = 0.95 * U,
                gap = ((CAR - 1.6) * U - n * ww) / (n + 1);
            const wx = 0.8 * U + gap + i * (ww + gap);
            pen.rect(g, wx, top + 0.55 * U, ww, 0.95 * U, "ruler", pen.fill("card"), {
                strokeWidth: 1.4,
            });
        }
        // The number sits in a panel on the side, the way a running number does on a real carriage.
        const px = (CAR - 1.5) * U;
        pen.rect(g, px, top + 1.75 * U, 1.1 * U, 0.9 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.4,
        });
        num(c, px + 0.55 * U, top + 2.45 * U, p.label, 16);
        underneath(c, 0, [1.2, CAR - 1.2]);
        return {
            roof: [(CAR / 2) * U, top, "up"],
            plate: [px + 0.55 * U, top + 1.75 * U, "up"],
        };
    },
    describe: () =>
        "One blue railway carriage seen from the side, with a row of windows, a number in a panel on its side and two wheels under it.",
});
