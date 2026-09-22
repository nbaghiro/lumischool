import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num, patch, soft } from "../lettering";
import { LIQUID } from "./apparatus";

export const flame = defineDrawing({
    id: "flame",
    family: "science",
    title: "Burner and flame",
    group: "Structures",
    about: "A burner with a flame of a chosen height, and a tripod and gauze over it when something is being heated. `holds` puts a beaker on the gauze, filled to that fraction, because a tripod with nothing on it reads as a cage rather than as apparatus; the beaker drawn here carries no scale, so a reading still comes from a beaker of its own. Heating is the change a child cannot undo, so the flame is drawn big enough that turning it up is obviously a decision.",
    params: { height: 3, on: 1, stand: true, holds: 0, minutes: 0 },
    settings: {
        height: { kind: "whole", min: 0, max: 5 },
        on: { kind: "whole", min: 0, max: 1 },
        stand: { kind: "flag" },
        holds: { kind: "number", min: 0, max: 0.9, step: 0.05 },
        minutes: { kind: "whole", min: 0, max: 60 },
    },
    takes: [
        {
            label: "A burner on its stand",
            params: { height: 4, on: 1, stand: true, holds: 0.6, minutes: 0 },
        },
        {
            label: "Lit, no stand",
            params: { height: 3, on: 1, stand: false, holds: 0, minutes: 0 },
        },
        { label: "Turned off", params: { height: 3, on: 0, stand: true, holds: 0, minutes: 0 } },
    ],
    box: (p) => ({ w: 12, h: p.stand ? 17 : 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const cx = 6 * U,
            base = (p.stand ? 15.4 : 10.4) * U;
        const top = base - 4.6 * U;
        // the burner: a foot, a stem and a collar, in the shape of the one in a school cupboard
        pen.path(
            g,
            `M${cx - 2.4 * U} ${base}h${4.8 * U}l${-1.1 * U} ${-0.8 * U}h${-2.6 * U}Z`,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 2 },
        );
        pen.rect(g, cx - 0.7 * U, top, 1.4 * U, base - top - 0.8 * U, "ruler", pen.fill("card"), {
            strokeWidth: 2.2,
        });
        pen.rect(g, cx - 0.95 * U, top + 1.4 * U, 1.9 * U, 0.7 * U, "ruler", pen.fill("ink-soft"), {
            strokeWidth: 1.6,
        });
        a.barrel = [cx, top, "up"];
        const h = Math.max(0, Math.min(5, p.height));
        if (p.on > 0 && h > 0) {
            const fl = h * 0.8 * U;
            pen.path(
                g,
                `M${cx - 0.55 * U} ${top}Q${cx - 0.9 * U} ${top - fl * 0.5} ${cx} ${top - fl}Q${cx + 0.9 * U} ${top - fl * 0.5} ${cx + 0.55 * U} ${top}Z`,
                "pencil",
                pen.fill("tang", "solid", { hachureGap: 5 }),
                { strokeWidth: 1.8 },
            );
            pen.path(
                g,
                `M${cx - 0.28 * U} ${top}Q${cx - 0.45 * U} ${top - fl * 0.42} ${cx} ${top - fl * 0.62}Q${cx + 0.45 * U} ${top - fl * 0.42} ${cx + 0.28 * U} ${top}Z`,
                "pencil",
                pen.fill("glow"),
                { strokeWidth: 1.2 },
            );
            a.flame = [cx, top - fl, "up"];
        } else {
            soft(c, cx, top - 0.5 * U, "off", 13);
        }
        if (p.stand) {
            // the tripod, with the gauze across it, drawn above the tallest flame the settings allow
            const gy = 5.6 * U;
            pen.line(g, cx - 3 * U, gy, cx + 3 * U, gy, "ruler", { strokeWidth: 2.6 });
            for (let i = 0; i < 7; i++)
                pen.line(g, cx - 3 * U + i * U, gy - 5, cx - 3 * U + i * U, gy + 5, "ruler", {
                    strokeWidth: 0.8,
                    stroke: c.t["ink-soft"],
                });
            for (const s of [-1, 1])
                pen.line(g, cx + s * 2.6 * U, gy, cx + s * 2 * U, base - 0.8 * U, "ruler", {
                    strokeWidth: 2.2,
                });
            a.gauze = [cx, gy, "up"];
            if (p.holds > 0) {
                // The thing being heated, standing on the gauze: an outline with a water line in it and no
                // scale, because what is being read here is the flame rather than the volume.
                const lx = cx - 1.9 * U,
                    rx = cx + 1.9 * U,
                    top = 1.4 * U,
                    floor = gy - 6;
                const fill = Math.max(0.1, Math.min(0.9, p.holds));
                const level = floor - (floor - top - 10) * fill;
                pen.rect(
                    g,
                    lx + 3,
                    level,
                    rx - lx - 6,
                    floor - level - 3,
                    "ruler",
                    pen.fill(LIQUID, "solid", { hachureGap: 6 }),
                    { strokeWidth: 0 },
                );
                pen.line(g, lx + 3, level, rx - 3, level, "ruler", { strokeWidth: 1.8 });
                pen.path(
                    g,
                    `M${lx} ${top}V${floor - 12}Q${lx} ${floor} ${lx + 12} ${floor}H${rx - 12}Q${rx} ${floor} ${rx} ${floor - 12}V${top}`,
                    "ruler",
                    null,
                    { strokeWidth: 2.4 },
                );
                pen.path(g, `M${lx} ${top}L${lx - 16} ${top - 5}`, "ruler", null, {
                    strokeWidth: 2,
                });
                pen.line(g, lx - 4, top, rx + 4, top, "ruler", { strokeWidth: 1.6 });
                a.heated = [cx, top, "up"];
            }
        }
        if (p.minutes > 0) {
            patch(c, cx, 1.4 * U, 5 * U, 22);
            num(c, cx, 1.6 * U, `${p.minutes} min`, 16);
            a.time = [cx, U, "up"];
        }
        return a;
    },
    describe: (p) =>
        `A gas burner with a foot, a stem and a collar, ${p.on > 0 ? "lit with a flame above its barrel" : "turned off, the word off above it"}${p.stand && p.holds > 0 ? ", a beaker of liquid on a tripod's gauze" : p.stand ? ", a tripod and gauze over it" : ""}${p.minutes > 0 ? ", minutes written above" : ""}.`,
    motion: { still: STILL.instrument },
    reads: true,
});
