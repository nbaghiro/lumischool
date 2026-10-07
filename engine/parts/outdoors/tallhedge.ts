import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash } from "./wash";

const within = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, Math.round(Number(v) || lo)));

export const tallHedge = defineDrawing<{ w: number; h: number }>({
    id: "tallhedge",
    family: "outdoors",
    title: "Garden hedge",
    group: "Props",
    about: "A tall clipped garden hedge seen from the side, square at the sides and rounded on top, thick enough that a ball thrown low into it drops out of the leaves.",
    params: { w: 3, h: 6 },
    settings: { w: { kind: "whole", min: 2, max: 6 }, h: { kind: "whole", min: 3, max: 9 } },
    takes: [
        { label: "Tall and narrow", params: { w: 3, h: 6 } },
        { label: "Low and wide", params: { w: 6, h: 3 } },
    ],
    box: (p) => ({ w: within(p.w, 2, 6), h: within(p.h, 3, 9) }),
    draw: (c, p) => {
        const { pen, g } = c,
            w = within(p.w, 2, 6) * U,
            h = within(p.h, 3, 9) * U,
            m = 0.15 * U,
            top = 0.55 * U;
        pen.path(
            g,
            `M${m} ${h - m}V${top + 0.5 * U}Q${m} ${m} ${w / 2} ${m}Q${w - m} ${m} ${w - m} ${top + 0.5 * U}V${h - m}Z`,
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 1.6, roughness: 0.6 },
        );
        // tufts of leaves scattered over the face, the same for the same size
        const n = Math.round((w * h) / (U * U)) * 2;
        for (let i = 0; i < n; i++) {
            const x = m + 0.35 * U + hash(i, 3) * (w - 2 * m - 0.7 * U),
                y = top + 0.4 * U + hash(i, 7) * (h - top - 0.8 * U);
            pen.path(
                g,
                `M${x - 0.18 * U} ${y + 0.1 * U}Q${x} ${y - 0.2 * U} ${x + 0.18 * U} ${y + 0.1 * U}`,
                "pencil",
                null,
                { strokeWidth: 1, roughness: 0.4 },
            );
        }
        return { top: [w / 2, m, "up"], foot: [w / 2, h, "down"] };
    },
    describe: () =>
        "A clipped green garden hedge seen from the side, thick with small leaves, square at the sides and rounded along its top like a loaf.",
});
