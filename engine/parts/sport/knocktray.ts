import type { RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

export const knockTray = defineDrawing<{ w: number; sticky: boolean; wide: boolean }>({
    id: "knocktray",
    family: "sport",
    title: "Catching tray",
    group: "Props",
    about: "The long wooden tray carried along the foot of a knock-down game to send the ball back up: a flat board with a raised lip at each end, glowing when it has grown wide, and dripping honey when it holds the ball.",
    params: { w: 6, sticky: false, wide: false },
    settings: {
        w: { kind: "whole", min: 3, max: 12 },
        sticky: { kind: "flag" },
        wide: { kind: "flag" },
    },
    takes: [
        { label: "The tray", params: { w: 6, sticky: false, wide: false } },
        { label: "Grown wide", params: { w: 9, sticky: false, wide: true } },
        { label: "Sticky with honey", params: { w: 6, sticky: true, wide: false } },
    ],
    box: (p) => ({ w: Math.max(3, Math.min(12, Math.round(p.w))), h: 1 }),
    draw: (c, p): RawAnchors => {
        const { pen, g } = c,
            w = Math.max(3, Math.min(12, Math.round(p.w))) * U,
            top = 0.18 * U,
            lip = 0.3 * U;
        pen.path(
            g,
            `M${0.1 * U} ${top}L${0.1 * U + lip} ${0.85 * U}H${w - 0.1 * U - lip}L${w - 0.1 * U} ${top}H${w - 0.1 * U - lip}V${0.5 * U}H${0.1 * U + lip}V${top}Z`,
            "pencil",
            pen.fill(p.wide ? "glow" : "tang", "solid"),
            { strokeWidth: 1.3, roughness: 0.25 },
        );
        pen.line(g, 0.6 * U, 0.68 * U, w - 0.6 * U, 0.68 * U, "pencil", {
            strokeWidth: 0.6,
            stroke: c.paper ? c.t.ink : c.t["ink-soft"],
            roughness: 0.2,
        });
        if (p.sticky)
            for (let x = 0.9 * U; x < w - 0.6 * U; x += 1.3 * U)
                pen.path(
                    g,
                    `M${x - 0.25 * U} ${0.5 * U}Q${x} ${0.42 * U} ${x + 0.25 * U} ${0.5 * U}V${0.62 * U}Q${x + 0.12 * U} ${0.95 * U} ${x} ${0.62 * U}Q${x - 0.12 * U} ${0.9 * U} ${x - 0.25 * U} ${0.62 * U}Z`,
                    "pencil",
                    pen.fill("glow", "solid"),
                    { strokeWidth: 0.6, roughness: 0.2 },
                );
        return { middle: [w / 2, 0.5 * U, "up"] };
    },
    describe: (p) =>
        `A long wooden catching tray ${Math.round(p.w)} squares wide, with a raised lip at each end to send a ball back up${p.wide ? ", glowing yellow because it has grown wide" : ""}${p.sticky ? ", with honey dripping along it so a ball sticks" : ""}.`,
    motion: { still: "The tray moves only as the game slides it." },
});
