import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, penned, soft } from "../lettering";

/** Rain caught in the tube: the one colour, as in the jug, so the level is never in doubt. */
const RAIN: Marker = "sky";

export const rainGauge = defineDrawing({
    id: "raingauge",
    family: "measuring",
    title: "Rain gauge",
    group: "Structures",
    about: "A rain gauge on a spike in the grass, tied to a stake: a clear tube under a wide funnel, with a scale up its side from 0 at the tube's floor to `max` at its brim, numbered every `step` with a half mark between, and the rain it caught drawn to `level`. A level past `max` fills the tube to the brim, so it reads `max`, and the rest stands in the funnel and runs over its rim. With `show` at 0 the tube is empty under a question mark, for a prediction.",
    params: { max: 50, step: 10, level: 12, unit: "mm", show: 1 },
    settings: {
        max: { kind: "whole", min: 10, max: 100 },
        step: { kind: "whole", min: 2, max: 50 },
        level: { kind: "number", min: 0, max: 110, step: 0.5 },
        unit: { kind: "text", most: 3 },
        show: { kind: "whole", min: 0, max: 1 },
    },
    takes: [
        { label: "12 mm", params: { max: 50, step: 10, level: 12, unit: "mm", show: 1 } },
        { label: "On a half mark", params: { max: 20, step: 5, level: 7.5, unit: "mm", show: 1 } },
        { label: "Dry", params: { max: 10, step: 2, level: 0, unit: "mm", show: 1 } },
        { label: "Spilling over", params: { max: 50, step: 10, level: 58, unit: "mm", show: 1 } },
        {
            label: "How much will it catch?",
            params: { max: 20, step: 5, level: 0, unit: "mm", show: 0 },
        },
    ],
    box: () => ({ w: 8, h: 14 }),
    draw: (c, p) => {
        const { pen, g } = c,
            lx = 3.3 * U,
            rx = 5.1 * U,
            cx = (lx + rx) / 2,
            brim = 3.4 * U,
            floor = 11.2 * U,
            ground = 12.6 * U,
            max = Math.max(1, p.max),
            step = Math.max(1, p.step),
            shown = p.show > 0,
            over = shown && p.level > max;
        const at = (v: number) => floor - (Math.max(0, Math.min(v, max)) / max) * (floor - brim);
        const level = at(p.level);
        // the stake behind the tube, with its grain, and the two ties that hold the tube to it
        pen.rect(g, 5.5 * U, 2.2 * U, 0.7 * U, ground - 2.2 * U, "ruler", pen.fill("card"), {
            strokeWidth: 1.7,
        });
        pen.path(
            g,
            `M${5.7 * U} ${3 * U}V${6.2 * U}M${6 * U} ${7.4 * U}V${11.6 * U}`,
            "pencil",
            null,
            { strokeWidth: 0.9, stroke: c.t["ink-soft"] },
        );
        for (const y of [4.6 * U, 9.8 * U]) {
            pen.line(g, rx - 2, y, 6.2 * U + 3, y + 2, "ruler", { strokeWidth: 1.3 });
        }
        if (shown && p.level > 0) {
            pen.rect(g, lx, level, rx - lx, floor - level, "ruler", pen.fill(RAIN, "solid"), {
                strokeWidth: 0,
            });
            if (!over)
                pen.line(g, lx, level, rx, level, "ruler", { strokeWidth: 2, stroke: c.t.ink });
        }
        // the tube to its floor, then the spike that holds it in the ground
        pen.path(g, `M${lx} ${brim}V${floor}H${rx}V${brim}`, "ruler", null, { strokeWidth: 2.2 });
        pen.path(
            g,
            `M${cx - 0.5 * U} ${floor}L${cx - 0.2 * U} ${ground + 12}H${cx + 0.2 * U}L${cx + 0.5 * U} ${floor}`,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 1.6 },
        );
        // the funnel, wider than the tube's mouth, so it gathers the rain over its whole width
        pen.path(
            g,
            `M${1.9 * U} ${1.6 * U}H${6.9 * U}L${rx} ${brim}H${lx}Z`,
            "ruler",
            pen.fill(over ? RAIN : "card", "solid"),
            { strokeWidth: 2 },
        );
        if (over) {
            for (const [x, y] of [
                [1.6 * U, 2.4 * U],
                [7.2 * U, 2.5 * U],
                [7.4 * U, 3.9 * U],
            ] as const) {
                pen.path(
                    g,
                    `M${x} ${y - 7}C${x + 4} ${y - 1} ${x + 4} ${y + 4} ${x} ${y + 4}C${x - 4} ${y + 4} ${x - 4} ${y - 1} ${x} ${y - 7}Z`,
                    "ruler",
                    pen.fill(RAIN, "solid"),
                    { strokeWidth: 1.2 },
                );
            }
        }
        if (!shown) penned(c, cx, 8 * U, "?", 30);
        // the grass it stands in, kept clear of the scale's numbers
        pen.line(g, 0.4 * U, ground, 7.6 * U, ground, "pencil", { strokeWidth: 1.7 });
        for (const x of [0.8, 3.4, 6.7, 7.3]) {
            const gx = x * U;
            pen.path(
                g,
                `M${gx - 6} ${ground}L${gx - 3} ${ground - 12}M${gx} ${ground}L${gx + 1} ${ground - 15}M${gx + 5} ${ground}L${gx + 8} ${ground - 10}`,
                "pencil",
                null,
                { strokeWidth: 1.2, stroke: c.t.ink },
            );
        }
        const a: RawAnchors = {
            level: [rx, level, "right"],
            rim: [4.4 * U, 1.6 * U, "up"],
            ground: [cx, ground, "down"],
        };
        const half = step / 2;
        for (let v = 0; v <= max + 1e-9; v += half) {
            const y = at(v),
                major = Math.abs(v / step - Math.round(v / step)) < 1e-9;
            pen.line(g, lx, y, lx + (major ? 16 : 9), y, "ruler", {
                strokeWidth: major ? 1.6 : 1,
            });
            if (major) {
                patch(c, lx - 16, y, 30, 16);
                num(c, lx - 5, y + 5, v, 13, "end");
                a[`mark(${v})`] = [lx, y, "left"];
            }
        }
        soft(c, 1.3 * U, 13.6 * U, p.unit, 13);
        return a;
    },
    describe: () =>
        "A rain gauge on a spike in the grass beside a wooden stake: a clear tube under a wide funnel, with a scale marked up its side.",
});
