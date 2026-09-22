import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** The worktop's length in whole squares, kept to the range a game may ask for. */
const length = (w: number): number => Math.max(12, Math.min(64, Math.round(Number(w) || 40)));

export const worktop = defineDrawing({
    id: "worktop",
    family: "food",
    title: "Kitchen worktop",
    group: "Structures",
    about: "A fitted kitchen drawn to any length at a true scale: wall tiles above a wooden worktop, a row of cupboard doors with handles under it and a plinth along the floor. It can have a steel sink set into the worktop.",
    params: { w: 40, sink: 6 },
    settings: {
        w: { kind: "whole", min: 12, max: 64 },
        sink: { kind: "whole", min: -1, max: 64 },
    },
    takes: [
        { label: "A short one, no sink", params: { w: 16, sink: -1 } },
        { label: "Long, sink at the left", params: { w: 30, sink: 6 } },
        { label: "Longest on a page, sink in the middle", params: { w: 36, sink: 18 } },
    ],
    box: (p) => ({ w: length(p.w), h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            W = length(p.w),
            a: RawAnchors = {};
        const grout = { strokeWidth: 1.1, stroke: c.t["ink-soft"], disableMultiStroke: true };

        const cols = Math.max(1, Math.round(W / 2.2)),
            tw = (W * U) / cols,
            th = 2.25 * U;
        pen.rect(g, 1, 1, W * U - 2, 4.5 * U - 1, "ruler", pen.fill("card"), { strokeWidth: 1.4 });
        pen.line(g, 1, th, W * U - 1, th, "ruler", grout);
        for (let i = 1; i < cols; i++) pen.line(g, i * tw, 1, i * tw, 4.5 * U, "ruler", grout);

        const doors = Math.max(1, Math.round((W - 0.4) / 6.5)),
            x0 = 0.2 * U,
            dw = ((W - 0.4) * U) / doors;
        pen.rect(
            g,
            0.5 * U,
            12.3 * U,
            (W - 1) * U,
            0.65 * U,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.4 },
        );
        pen.rect(g, x0, 5.5 * U, (W - 0.4) * U, 6.8 * U, "ruler", pen.fill("grid", "solid"), {
            strokeWidth: 1.8,
        });
        for (let i = 0; i < doors; i++) {
            // doors pair up with their handles side by side, and an odd last door keeps its handle on the right
            const dx = x0 + i * dw + 3,
                w = dw - 6,
                right = i % 2 === 0;
            pen.rect(g, dx, 5.7 * U, w, 6.4 * U, "ruler", pen.fill("mint", "solid"), {
                strokeWidth: 1.6,
            });
            pen.rect(g, dx + 0.45 * U, 6.15 * U, w - 0.9 * U, 5.5 * U, "ruler", null, {
                strokeWidth: 1,
                stroke: c.t["ink-soft"],
                disableMultiStroke: true,
            });
            const hx = right ? dx + w - 0.9 * U : dx + 0.65 * U;
            pen.rect(g, hx, 6.6 * U, 0.25 * U, 1.5 * U, "ruler", pen.fill("ink-soft", "solid"), {
                strokeWidth: 1.2,
            });
        }

        const r = 6;
        pen.path(
            g,
            `M1 ${4.5 * U}H${W * U - 1}V${5.5 * U - r}Q${W * U - 1} ${5.5 * U} ${W * U - 1 - r} ${5.5 * U}H${1 + r}Q1 ${5.5 * U} 1 ${5.5 * U - r}Z`,
            "ruler",
            pen.fill("tang", "solid"),
            { strokeWidth: 1.8 },
        );
        const grain = { strokeWidth: 1, stroke: c.t["ink-soft"], disableMultiStroke: true };
        for (let x = 1.2, k = 0; x + 3 < W - 1; x += 7.5, k++) {
            const y = (k % 2 ? 5.15 : 4.85) * U,
                len = Math.min(4.5, W - 1.2 - x);
            pen.line(g, x * U, y, (x + len) * U, y, "ruler", grain);
        }

        const sink = Number(p.sink);
        if (sink !== -1) {
            const sx = Math.max(3.3, Math.min(W - 3.3, sink)) * U;
            pen.rect(g, sx - 3 * U, 4.2 * U, 6 * U, 0.55 * U, "ruler", pen.fill("grid", "solid"), {
                strokeWidth: 1.6,
            });
            pen.rect(
                g,
                sx - 2.5 * U,
                4.33 * U,
                5 * U,
                0.2 * U,
                "ruler",
                pen.fill("ink-soft", "solid"),
                { strokeWidth: 1 },
            );
            a.sink = [sx, 4.5 * U, "up"];
        }

        a.top = [(W / 2) * U, 4.5 * U, "up"];
        a.tiles = [(W / 2) * U, 2.2 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A fitted kitchen from the front: tiles above a wooden worktop, cupboard doors with handles below and a plinth along the floor${Number(p.sink) !== -1 ? ", and a sink set into the worktop" : ""}.`,
});
