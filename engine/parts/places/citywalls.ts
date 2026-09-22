import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

const within = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

export const cityWalls = defineDrawing({
    id: "citywalls",
    family: "places",
    title: "City walls",
    group: "Structures",
    about: "A stretch of old city wall with battlements along its top, round towers standing out of it and a gateway in the middle whose gate can be up or down. The battlements and the towers can be counted, and the wall is a length made of equal parts.",
    params: { towers: 3, open: 1 },
    settings: {
        towers: { kind: "whole", min: 2, max: 4 },
        open: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "The gate up", params: { towers: 3, open: 1 } },
        { label: "The gate down, four towers", params: { towers: 4, open: 0 } },
    ],
    box: () => ({ w: 16, h: 8 }),
    draw: (c, p) => {
        const { pen, g } = c,
            n = within(p.towers, 2, 4),
            open = p.open > 0,
            W = 16 * U,
            base = 7.8 * U,
            top = 3.2 * U,
            a: RawAnchors = {};
        const stone = pen.fill("glow", "hachure", { hachureGap: 6, fillWeight: 0.5 });
        pen.rect(g, 0.3 * U, top, W - 0.6 * U, base - top, "pencil", stone, { strokeWidth: 2 });
        for (let y = top + 0.9 * U; y < base - 0.2 * U; y += 0.9 * U)
            pen.line(g, 0.4 * U, y, W - 0.4 * U, y, "pencil", {
                strokeWidth: 0.7,
                stroke: c.t["ink-soft"],
            });
        let merlon = 0;
        for (let x = 0.4 * U; x < W - 0.8 * U; x += 0.9 * U) {
            pen.rect(g, x, top - 0.55 * U, 0.55 * U, 0.55 * U, "pencil", stone, {
                strokeWidth: 1.2,
            });
            a[`merlon(${merlon++})`] = [x + 0.27 * U, top - 0.55 * U, "up"];
        }
        for (let i = 0; i < n; i++) {
            const x = 1.6 * U + (i / (n - 1)) * (W - 3.2 * U),
                tw = 1.9 * U,
                tt = 1.6 * U;
            if (Math.abs(x - W / 2) < 1.6 * U) continue;
            pen.rect(
                g,
                x - tw / 2,
                tt,
                tw,
                base - tt,
                "pencil",
                pen.fill("glow", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
                { strokeWidth: 1.8 },
            );
            for (let k = 0; k < 3; k++)
                pen.rect(
                    g,
                    x - tw / 2 + k * (tw / 3) + 0.05 * U,
                    tt - 0.5 * U,
                    tw / 3 - 0.2 * U,
                    0.5 * U,
                    "pencil",
                    stone,
                    { strokeWidth: 1.1 },
                );
            pen.rect(
                g,
                x - 0.12 * U,
                tt + 1.2 * U,
                0.24 * U,
                0.8 * U,
                "ruler",
                { fill: c.t.ink, fillStyle: "solid" },
                { strokeWidth: 0.6 },
            );
            a[`tower(${i})`] = [x, tt - 0.5 * U, "up"];
        }
        // the gateway: an arch, with its portcullis down or drawn up out of sight
        const gx = W / 2,
            gw = 1.5 * U,
            gy = base - 3 * U;
        pen.rect(
            g,
            gx - gw - 0.4 * U,
            top - 1 * U,
            2 * gw + 0.8 * U,
            base - top + 1 * U,
            "pencil",
            pen.fill("glow", "hachure", { hachureGap: 5, fillWeight: 0.6 }),
            { strokeWidth: 1.8 },
        );
        for (let k = 0; k < 4; k++)
            pen.rect(
                g,
                gx - gw - 0.4 * U + k * ((2 * gw + 0.8 * U) / 4) + 0.05 * U,
                top - 1.5 * U,
                (2 * gw + 0.8 * U) / 4 - 0.2 * U,
                0.5 * U,
                "pencil",
                stone,
                { strokeWidth: 1.1 },
            );
        pen.path(
            g,
            `M${gx - gw} ${base}L${gx - gw} ${gy}A${gw} ${gw} 0 0 1 ${gx + gw} ${gy}L${gx + gw} ${base}Z`,
            "pencil",
            pen.fill(open ? "sky" : "ink-soft", "hachure", { hachureGap: 3.5 }),
            { strokeWidth: 1.6 },
        );
        if (!open) {
            for (let x = gx - gw + 0.35 * U; x < gx + gw - 0.1 * U; x += 0.5 * U)
                pen.line(g, x, gy - 0.9 * U, x, base, "ruler", { strokeWidth: 1.4 });
            for (let y = gy - 0.4 * U; y < base; y += 0.6 * U)
                pen.line(g, gx - gw + 0.1 * U, y, gx + gw - 0.1 * U, y, "ruler", {
                    strokeWidth: 1.2,
                });
        }
        pen.line(g, 0.1 * U, base, W - 0.1 * U, base, "pencil", { strokeWidth: 2 });
        a.gate = [gx, gy - gw, "up"];
        return a;
    },
    describe: (p) =>
        `A stretch of old city wall with battlements along its top, round towers standing out of it and an arched gateway in the middle, ${p.open > 0 ? "its gate drawn up" : "its portcullis down"}.`,
});
