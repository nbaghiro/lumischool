import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const telescope = defineDrawing({
    id: "telescope",
    family: "science",
    title: "Telescope",
    group: "Props",
    about: "A telescope on a three legged stand, its tube tipped up towards the sky at an angle you choose, with a small finder along its top and an eyepiece at the low end.",
    params: { tilt: 30 },
    settings: { tilt: { kind: "whole", min: 5, max: 70 } },
    takes: [
        { label: "Tipped up a little", params: { tilt: 30 } },
        { label: "Nearly upright", params: { tilt: 60 } },
    ],
    box: () => ({ w: 10, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            px = 4.6 * U,
            py = 4.8 * U,
            base = 8.6 * U;
        for (const dx of [-2.4, 0.2, 2.6])
            pen.line(g, px, py + 6, px + dx * U, base, "pencil", { strokeWidth: 2 });
        pen.line(g, 1.6 * U, base, 8 * U, base, "pencil", { strokeWidth: 1.8 });
        const a = (-Math.max(5, Math.min(70, p.tilt)) * Math.PI) / 180,
            ca = Math.cos(a),
            sa = Math.sin(a);
        const at = (u: number, v: number): [number, number] => [
            px + u * ca - v * sa,
            py + u * sa + v * ca,
        ];
        const tube = (u0: number, u1: number, r0: number, r1: number): [number, number][] => [
            at(u0, -r0),
            at(u1, -r1),
            at(u1, r1),
            at(u0, r0),
        ];
        pen.polygon(g, tube(-2.2 * U, 4.4 * U, 0.55 * U, 0.8 * U), "pencil", pen.fill("sky"), {
            strokeWidth: 2,
        });
        pen.polygon(g, tube(3.6 * U, 4.8 * U, 0.9 * U, 0.9 * U), "pencil", pen.fill("berry"), {
            strokeWidth: 1.6,
        });
        pen.polygon(
            g,
            tube(-3.2 * U, -2.2 * U, 0.3 * U, 0.3 * U),
            "pencil",
            pen.fill("ink-soft", "hachure", { hachureGap: 3 }),
            { strokeWidth: 1.4 },
        );
        pen.polygon(
            g,
            tube(0.4 * U, 2 * U, 0.2 * U, 0.2 * U).map(
                ([x, y]) => [x - sa * -1.05 * U, y + ca * -1.05 * U] as [number, number],
            ),
            "pencil",
            pen.fill("glow"),
            { strokeWidth: 1.2 },
        );
        pen.circle(g, px, py, 10, "ruler", pen.fill("card"), { strokeWidth: 1.6 });
        const end = at(4.8 * U, 0);
        return {
            lens: [end[0], end[1], "right"],
            eyepiece: [...at(-3.2 * U, 0), "left"] as [number, number, "left"],
        };
    },
    describe: () =>
        "A telescope on a three legged stand, its tube tipped up towards the sky, with a small finder along its top and an eyepiece at the low end.",
    reads: true,
});
