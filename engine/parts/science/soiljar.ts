import { type RawAnchors } from "../../ink/surface";
import { rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { say } from "../lettering";
import { lightFill, glassPath, liquid, gleam } from "./apparatus";

export const soiljar = defineDrawing({
    id: "soiljar",
    family: "science",
    title: "Soil shaken in a jar",
    group: "Structures",
    about: "A jar of soil shaken up with water and left to settle: the stones sink first, then the sand, then the fine silt, then the clay, with the water on top and bits of old plants floating in it. Each layer is a whole number of squares thick, so how thick it is can be counted against the paper, and the order is the order of size, biggest at the bottom. Soil is rock ground small and plants rotted down, which is what the two ends of the jar show.",
    params: { stones: 1, sand: 3, silt: 2, clay: 1, bits: 4, names: 1 },
    settings: {
        stones: { kind: "whole", min: 0, max: 4 },
        sand: { kind: "whole", min: 0, max: 4 },
        silt: { kind: "whole", min: 0, max: 4 },
        clay: { kind: "whole", min: 0, max: 4 },
        bits: { kind: "whole", min: 0, max: 8 },
        names: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        {
            label: "Garden soil, settled",
            params: { stones: 1, sand: 3, silt: 2, clay: 1, bits: 4, names: 1 },
        },
        {
            label: "Sandy soil",
            params: { stones: 1, sand: 4, silt: 1, clay: 0, bits: 2, names: 1 },
        },
        {
            label: "Clay soil, no labels",
            params: { stones: 0, sand: 1, silt: 2, clay: 3, bits: 3, names: 0 },
        },
    ],
    box: (p) => ({ w: p.names > 0 ? 15 : 9, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {},
            t = c.t,
            lx = 1.5 * U,
            rx = 7.5 * U,
            top = 2 * U,
            bottom = 13 * U;
        const layers: [string, number][] = [
            ["stones", p.stones],
            ["sand", p.sand],
            ["silt", p.silt],
            ["clay", p.clay],
        ];
        const clampAll = layers.map(
            ([k, n]) => [k, Math.max(0, Math.min(4, Math.round(n)))] as [string, number],
        );
        const r = rng(53);
        let y = bottom;
        const water = top + 1.2 * U;
        liquid(
            c,
            lx,
            rx,
            water,
            bottom,
            pen.fill("sky", "hachure", { hachureGap: 9, fillWeight: 0.6 }),
            10,
        );
        for (const [kind, n] of clampAll) {
            if (!n) continue;
            const hi = y - n * U;
            const fill =
                kind === "stones"
                    ? pen.fill("card")
                    : kind === "sand"
                      ? lightFill(c, "tang", "hachure", 4)
                      : kind === "silt"
                        ? lightFill(c, "glow", "hachure", 6)
                        : pen.fill("ink-soft", "hachure", { hachureGap: 3.2, fillWeight: 0.8 });
            liquid(c, lx, rx, hi, y === bottom ? bottom : y + 3, fill, y === bottom ? 10 : 0, true);
            if (kind === "stones")
                for (let k = 0; k < n * 5; k++)
                    pen.ellipse(
                        g,
                        lx + 0.6 * U + r() * (rx - lx - 1.2 * U),
                        hi + 0.35 * U + r() * (n - 0.7) * U,
                        0.7 * U + r() * 6,
                        0.45 * U + r() * 4,
                        "pencil",
                        pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
                        { strokeWidth: 1.2 },
                    );
            if (kind === "sand")
                for (let k = 0; k < n * 12; k++)
                    pen.circle(
                        g,
                        lx + 6 + r() * (rx - lx - 12),
                        hi + 4 + r() * (n * U - 8),
                        2.4,
                        "pencil",
                        { fill: t["ink-soft"], fillStyle: "solid" },
                        { strokeWidth: 0.3 },
                    );
            a[kind] = [rx, hi + (n * U) / 2, "right"];
            if (p.names > 0) {
                pen.line(
                    g,
                    rx + 0.3 * U,
                    hi + (n * U) / 2,
                    rx + 1.3 * U,
                    hi + (n * U) / 2,
                    "pencil",
                    { strokeWidth: 1, stroke: t["ink-soft"] },
                );
                say(c, rx + 1.5 * U, hi + (n * U) / 2 + 5, kind, 14, "start");
            }
            y = hi;
        }
        for (let k = 0; k < Math.max(0, Math.min(8, Math.round(p.bits))); k++) {
            const bx =
                    lx +
                    0.7 * U +
                    (k + 0.5) * ((rx - lx - 1.4 * U) / Math.max(1, Math.round(p.bits))),
                ang = r() - 0.5;
            pen.line(
                g,
                bx - Math.cos(ang) * 8,
                water + 3 + Math.sin(ang) * 3,
                bx + Math.cos(ang) * 8,
                water + 3 - Math.sin(ang) * 3,
                "pencil",
                { strokeWidth: 2.2, stroke: c.paper ? t.ink : "#6B8F3A" },
            );
        }
        if (p.names > 0) {
            pen.line(g, rx + 0.3 * U, water + 0.6 * U, rx + 1.3 * U, water + 0.6 * U, "pencil", {
                strokeWidth: 1,
                stroke: t["ink-soft"],
            });
            say(c, rx + 1.5 * U, water + 0.6 * U + 5, "water", 14, "start");
            if (p.bits > 0) {
                pen.line(g, rx - 0.6 * U, water, rx + 1.3 * U, water - 0.9 * U, "pencil", {
                    strokeWidth: 1,
                    stroke: t["ink-soft"],
                });
                say(c, rx + 1.5 * U, water - 0.9 * U + 5, "bits of plant", 14, "start");
            }
        }
        pen.path(g, glassPath(lx, rx, top, bottom, 10), "pencil", null, { strokeWidth: 2.6 });
        pen.rect(
            g,
            lx - 0.3 * U,
            top - 0.9 * U,
            rx - lx + 0.6 * U,
            0.9 * U,
            "pencil",
            pen.fill("mint"),
            { strokeWidth: 2 },
        );
        for (let k = 1; k < 8; k++)
            pen.line(
                g,
                lx - 0.3 * U + k * 0.8 * U,
                top - 0.8 * U,
                lx - 0.3 * U + k * 0.8 * U,
                top - 0.1 * U,
                "pencil",
                { strokeWidth: 0.9, stroke: t["ink-soft"] },
            );
        gleam(c, lx + 0.4 * U, top + 0.6 * U, bottom - 1 * U);
        a.jar = [(lx + rx) / 2, top - U, "up"];
        return a;
    },
    describe: (p) =>
        `A jar of water with soil settled into layers in it, stones, sand, silt and clay, bits of plant floating on top${p.names > 0 ? ", each layer named beside it" : ""}.`,
    reads: true,
});
