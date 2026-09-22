import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num } from "../lettering";

/** A sundial, for the oasis and the old tower (.docs/worlds-next.md). */
export const sundial = defineDrawing({
    id: "sundial",
    family: "time",
    title: "Sundial",
    group: "Structures",
    about: "A sundial on a stone pillar: the sun casts the shadow of the pointer onto the dial, and the shadow moves round from morning to evening. Where the shadow falls is the time, read the way the hand of a clock is read.",
    params: { hour: 10 },
    settings: { hour: { kind: "whole", min: 6, max: 18 } },
    takes: [
        { label: "Ten in the morning", params: { hour: 10 } },
        { label: "Three in the afternoon", params: { hour: 15 } },
        { label: "Noon", params: { hour: 12 } },
    ],
    box: () => ({ w: 8, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            hr = Math.max(6, Math.min(18, Math.round(p.hour))),
            cx = 4 * U,
            cy = 2.6 * U,
            rx = 3.4 * U,
            ry = 1.45 * U;
        const at = (h: number, f: number): [number, number] => {
            const th = ((h - 12) * Math.PI) / 12;
            return [cx + Math.sin(th) * rx * f, cy - Math.cos(th) * ry * f + 0.1 * U];
        };
        pen.path(
            g,
            `M${2.9 * U} ${cy + 0.9 * U}Q${3.3 * U} ${5 * U} ${2.7 * U} ${6.9 * U}L${5.3 * U} ${6.9 * U}Q${4.7 * U} ${5 * U} ${5.1 * U} ${cy + 0.9 * U}Z`,
            "pencil",
            pen.fill("card"),
            { strokeWidth: 1.6 },
        );
        for (const y of [4.3, 5.6])
            pen.line(g, 3.05 * U, y * U, 4.95 * U, y * U, "pencil", {
                strokeWidth: 0.9,
                stroke: c.t["ink-soft"],
            });
        pen.rect(
            g,
            1.9 * U,
            6.9 * U,
            4.2 * U,
            0.8 * U,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 5 }),
            { strokeWidth: 1.5 },
        );
        pen.ellipse(
            g,
            cx,
            cy + 0.35 * U,
            rx * 2 + 6,
            ry * 2 + 10,
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.4 },
        );
        pen.ellipse(g, cx, cy, rx * 2, ry * 2, "pencil", pen.fill("card"), { strokeWidth: 1.7 });
        for (let h = 6; h <= 18; h++)
            pen.line(g, ...at(h, 0.72), ...at(h, h % 3 ? 0.84 : 0.92), "ruler", {
                strokeWidth: h % 3 ? 1 : 1.6,
            });
        for (const h of [6, 9, 12, 15, 18]) {
            const [x, y] = at(h, 0.6);
            num(c, x, y + 4, String(h > 12 ? h - 12 : h), 10);
        }
        // the shadow falls away from the sun, along the line of the hour
        const foot: [number, number] = [cx, cy + 0.45 * ry],
            [sx, sy] = at(hr, 0.8);
        pen.polygon(
            g,
            [
                [foot[0] - 3, foot[1]],
                [sx, sy],
                [foot[0] + 3, foot[1]],
            ],
            "ruler",
            pen.fill("ink-soft"),
            { strokeWidth: 1 },
        );
        pen.polygon(
            g,
            [foot, [cx, cy - 0.7 * ry], [cx, cy - 0.7 * ry - 1.5 * U]],
            "pencil",
            pen.fill("tang"),
            { strokeWidth: 1.5 },
        );
        return { shadow: [sx, sy, "up"], pointer: [cx, cy - 0.7 * ry - 1.5 * U, "up"] };
    },
    describe: () =>
        "A sundial seen from above, a round dial with the hours marked round it and a gnomon casting its shadow across the face.",
});
