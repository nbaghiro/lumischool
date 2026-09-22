import { type RawAnchors } from "../../ink/surface";
import { type Fill } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { cap, penned } from "../lettering";
import { torchAt } from "./optics";

/** How much of a torch's light a sheet lets through: all of it, some of it, or none. */
export const SHEETS = [
    { name: "clear glass", lets: "all" },
    { name: "tracing paper", lets: "some" },
    { name: "card", lets: "none" },
] as const;

export const beam = defineDrawing({
    id: "beam",
    family: "science",
    title: "Torch through a sheet",
    group: "Structures",
    about: "A torch shining at a wall with a sheet in the way, smaller than the beam so light gets past its edges. Clear glass lets all the light through and the whole patch on the wall is bright; tracing paper lets some through and the middle of the patch is dim; card lets none through, so the middle is a shadow with light all round it. The shadow is worked out from the edges of the sheet in straight lines from the torch. The sheet is a number, 0 to 2, so a question can vary it; with `show` at 0 the wall waits under a question mark.",
    params: { sheet: 0, show: 1 },
    settings: { sheet: { kind: "whole", min: 0, max: 2 }, show: { kind: "whole", min: 0, max: 1 } },
    takes: [
        { label: "Clear glass", params: { sheet: 0, show: 1 } },
        { label: "Tracing paper", params: { sheet: 1, show: 1 } },
        { label: "Card, and its shadow", params: { sheet: 2, show: 1 } },
    ],
    box: () => ({ w: 18, h: 9 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            k = Math.max(0, Math.min(2, Math.round(p.sheet))),
            show = p.show > 0;
        // light travels in straight lines from the torch's lens, so every width grows with the distance
        const ox = 3 * U,
            ty = 4.2 * U,
            sx = 8.2 * U,
            wx = 15.4 * U,
            spread = 0.3,
            half = 1.1 * U;
        const at = (x: number) => (x - ox) * spread,
            shadow = (half * (wx - ox)) / (sx - ox);
        const edge = { strokeWidth: 0.9, stroke: c.t["ink-soft"], strokeLineDash: [4, 4] };
        const cone = (x0: number, h0: number, x1: number, h1: number, fill: Fill) =>
            pen.polygon(
                g,
                [
                    [x0, ty - h0],
                    [x1, ty - h1],
                    [x1, ty + h1],
                    [x0, ty + h0],
                ],
                "ruler",
                fill,
                edge,
            );
        const glow = c.paper ? null : { fill: c.t.glow, fillStyle: "solid" };
        if (show) {
            cone(ox + 2, 0.4 * U, wx, at(wx), glow);
            if (k === 1)
                cone(
                    sx + 0.5 * U,
                    half,
                    wx,
                    shadow,
                    c.paper
                        ? {
                              fill: c.t.ink,
                              fillStyle: "hachure",
                              hachureGap: 9,
                              fillWeight: 0.5,
                              hachureAngle: 60,
                          }
                        : { fill: c.t.card, fillStyle: "hachure", hachureGap: 4, fillWeight: 2.2 },
                );
            if (k === 2)
                cone(
                    sx + 0.5 * U,
                    half,
                    wx,
                    shadow,
                    c.paper
                        ? {
                              fill: c.t.ink,
                              fillStyle: "hachure",
                              hachureGap: 4,
                              fillWeight: 0.7,
                              hachureAngle: 90,
                          }
                        : { fill: c.t.card, fillStyle: "solid" },
                );
        } else cone(ox + 2, 0.4 * U, sx, at(sx), glow);
        torchAt(c, ox, ty);
        // the sheet on its stand
        const sheetFill =
            k === 0
                ? pen.fill("sky", "hachure", { hachureGap: 9, fillWeight: 0.6 })
                : k === 1
                  ? pen.fill("card")
                  : pen.fill("tang");
        pen.rect(g, sx, ty - half, 0.5 * U, 2 * half, "ruler", sheetFill, { strokeWidth: 1.8 });
        if (k === 1)
            for (let y = ty - half + 0.3 * U; y < ty + half; y += 0.4 * U)
                pen.line(g, sx + 0.08 * U, y, sx + 0.42 * U, y + 0.18 * U, "pencil", {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
        pen.line(g, sx + 0.25 * U, ty + half, sx + 0.25 * U, ty + 3.2 * U, "ruler", {
            strokeWidth: 2,
        });
        pen.line(g, sx - 0.8 * U, ty + 3.2 * U, sx + 1.3 * U, ty + 3.2 * U, "ruler", {
            strokeWidth: 2.2,
        });
        cap(c, sx + 0.25 * U, ty + 4.2 * U, SHEETS[k]?.name ?? "", 10);
        a.sheet = [sx + 0.25 * U, ty - half - 0.2 * U, "up"];
        // the wall, and what lands on it
        pen.rect(
            g,
            wx,
            0.3 * U,
            0.6 * U,
            7.8 * U,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 5 }),
            { strokeWidth: 2 },
        );
        if (!show) penned(c, wx - 1 * U, ty + 0.3 * U, "?", 24);
        else {
            pen.rect(
                g,
                wx - 0.35 * U,
                ty - at(wx),
                0.35 * U,
                2 * at(wx),
                "ruler",
                pen.fill("glow"),
                { strokeWidth: 1 },
            );
            if (k > 0)
                pen.rect(
                    g,
                    wx - 0.35 * U,
                    ty - shadow,
                    0.35 * U,
                    2 * shadow,
                    "ruler",
                    k === 2 ? pen.fill("ink-soft") : pen.fill("glow", "hachure", { hachureGap: 6 }),
                    { strokeWidth: 1.2 },
                );
            if (k === 2) cap(c, wx - 0.6 * U, ty + 0.25 * U, "shadow", 10, "end");
        }
        a.wall = [wx, 0.3 * U, "up"];
        return a;
    },
    describe: (p) =>
        `A torch shining at a wall with a sheet of ${SHEETS[Math.max(0, Math.min(2, Math.round(p.sheet)))]?.name ?? "glass"} in the way, smaller than the beam so light gets past its edges to the wall.`,
    reads: true,
});
