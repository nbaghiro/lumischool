import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";

export const station = defineDrawing({
    id: "station",
    family: "places",
    title: "Railway station",
    group: "Structures",
    about: "A small station with a canopy over the platform, a bench under it and a clock hanging from it. The clock shows any time, so the station can ask what the time is when the train comes in.",
    params: { hour: 9, minute: 15 },
    settings: {
        hour: { kind: "whole", min: 0, max: 23 },
        minute: { kind: "whole", min: 0, max: 59 },
    },
    takes: [
        { label: "Quarter past nine", params: { hour: 9, minute: 15 } },
        { label: "Half past four", params: { hour: 4, minute: 30 } },
    ],
    box: () => ({ w: 18, h: 11 }),
    draw: (c, p) => {
        const { pen, g } = c,
            base = 10.2 * U;
        pen.rect(g, 1 * U, 3 * U, 9 * U, base - 3 * U, "pencil", pen.fill("glow"), {
            strokeWidth: 2.2,
        });
        pen.polygon(
            g,
            [
                [0.4 * U, 3 * U],
                [5.5 * U, 0.6 * U],
                [10.6 * U, 3 * U],
            ],
            "pencil",
            pen.fill("berry", "hachure", { hachureGap: 5 }),
            { strokeWidth: 2 },
        );
        pen.rect(g, 4.4 * U, base - 3.8 * U, 2.2 * U, 3.8 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.6,
        });
        for (const wx of [1.8, 7.4]) {
            pen.rect(g, wx * U, 4.4 * U, 1.8 * U, 2 * U, "ruler", pen.fill("sky"), {
                strokeWidth: 1.5,
            });
            pen.line(g, (wx + 0.9) * U, 4.4 * U, (wx + 0.9) * U, 6.4 * U, "ruler", {
                strokeWidth: 1,
            });
        }
        // the canopy, on posts, with a scalloped edge
        pen.polygon(
            g,
            [
                [10 * U, 3.4 * U],
                [17.4 * U, 3.4 * U],
                [17.4 * U, 4.2 * U],
                [10 * U, 4.2 * U],
            ],
            "pencil",
            pen.fill("sky", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.8 },
        );
        for (let x = 10; x < 17.4; x += 0.8)
            pen.arc(g, (x + 0.4) * U, 4.2 * U, 0.8 * U, 0.6 * U, 0, Math.PI, "pencil", {
                strokeWidth: 1.2,
            });
        for (const px of [11.2, 16.6])
            pen.line(g, px * U, 4.2 * U, px * U, base, "ruler", { strokeWidth: 2.2 });
        // a clock hanging under the canopy
        const cx = 13.9 * U,
            cy = 5.9 * U,
            r = 1 * U;
        pen.line(g, cx, 4.2 * U, cx, cy - r, "ruler", { strokeWidth: 1.2 });
        pen.circle(g, cx, cy, r * 2, "ruler", pen.fill("card"), { strokeWidth: 1.8 });
        const hr = (((p.hour % 12) + p.minute / 60) / 12) * Math.PI * 2 - Math.PI / 2,
            mn = (p.minute / 60) * Math.PI * 2 - Math.PI / 2;
        pen.line(g, cx, cy, cx + Math.cos(hr) * r * 0.5, cy + Math.sin(hr) * r * 0.5, "ruler", {
            strokeWidth: 2.2,
        });
        pen.line(g, cx, cy, cx + Math.cos(mn) * r * 0.8, cy + Math.sin(mn) * r * 0.8, "ruler", {
            strokeWidth: 1.4,
        });
        // the bench and the platform edge
        pen.rect(g, 12 * U, base - 1.4 * U, 3.6 * U, 0.5 * U, "pencil", pen.fill("tang"), {
            strokeWidth: 1.4,
        });
        for (const bx of [12.4, 15.2])
            pen.line(g, bx * U, base - 0.9 * U, bx * U, base, "pencil", { strokeWidth: 1.4 });
        pen.line(g, 0.2 * U, base, 17.8 * U, base, "ruler", { strokeWidth: 2.4 });
        pen.line(g, 0.2 * U, base + 0.4 * U, 17.8 * U, base + 0.4 * U, "pencil", {
            strokeWidth: 1,
            stroke: c.t["ink-soft"],
            strokeLineDash: [8, 6],
        });
        return {
            clock: [cx, cy - r, "up"],
            door: [5.5 * U, base - 3.8 * U, "up"],
            bench: [13.8 * U, base - 1.4 * U, "up"],
        };
    },
    describe: () =>
        "A small yellow station building with a red roof and a canopy over the platform on posts, a clock hanging from the canopy and a bench under it.",
    motion: { still: STILL.instrument },
    reads: true,
});
