import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, soft } from "../lettering";
import { LIQUID, gleam } from "./apparatus";

export const cylinder = defineDrawing({
    id: "cylinder",
    family: "science",
    title: "Measuring cylinder",
    group: "Structures",
    about: "A tall measuring cylinder with a spout and a foot, marked every few millilitres with every tenth mark numbered. Water curves up where it touches the glass, and the reading is taken at the bottom of the curve, which is drawn exactly at the level. It reads more finely than the beaker, so a question can ask for a mark that is not numbered.",
    params: { max: 100, step: 10, minor: 5, level: 64, unit: "ml" },
    settings: {
        max: { kind: "whole", min: 10, max: 1000 },
        step: { kind: "whole", min: 1, max: 100 },
        minor: { kind: "whole", min: 1, max: 10 },
        level: { kind: "whole", min: 0, max: 1000 },
        unit: { kind: "text", most: 3 },
    },
    takes: [
        { label: "64 ml", params: { max: 100, step: 10, minor: 5, level: 64, unit: "ml" } },
        {
            label: "In fives, 35 ml",
            params: { max: 50, step: 10, minor: 2, level: 35, unit: "ml" },
        },
        { label: "Nearly full", params: { max: 100, step: 10, minor: 5, level: 92, unit: "ml" } },
    ],
    box: () => ({ w: 8, h: 17 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const lx = 2 * U,
            rx = 4.4 * U,
            top = 1.4 * U,
            bottom = 14.6 * U,
            zero = bottom - 0.4 * U,
            full = top + 0.8 * U;
        const max = Math.max(1, p.max),
            at = (v: number) => zero - (Math.max(0, Math.min(v, max)) / max) * (zero - full);
        const level = at(p.level);
        if (p.level > 0) {
            pen.path(
                g,
                `M${lx + 3} ${level - 5}Q${lx + 5} ${level} ${(lx + rx) / 2} ${level}Q${rx - 5} ${level} ${rx - 3} ${level - 5}V${bottom - 3}H${lx + 3}Z`,
                "ruler",
                pen.fill(LIQUID, "solid"),
                { strokeWidth: 0 },
            );
            pen.path(
                g,
                `M${lx + 3} ${level - 5}Q${lx + 5} ${level} ${(lx + rx) / 2} ${level}Q${rx - 5} ${level} ${rx - 3} ${level - 5}`,
                "ruler",
                null,
                { strokeWidth: 1.8 },
            );
        }
        pen.path(g, `M${lx} ${top}V${bottom}H${rx}V${top}`, "ruler", null, { strokeWidth: 2.4 });
        pen.path(g, `M${lx} ${top}L${lx - 12} ${top - 7}`, "ruler", null, { strokeWidth: 2 });
        pen.line(g, lx - 3, top, rx + 3, top, "ruler", { strokeWidth: 1.5 });
        pen.path(
            g,
            `M${lx - 1.2 * U} ${bottom + 0.9 * U}L${lx - 0.6 * U} ${bottom}H${rx + 0.6 * U}L${rx + 1.2 * U} ${bottom + 0.9 * U}Z`,
            "ruler",
            pen.fill("ink-soft", "hachure", { hachureGap: 4 }),
            { strokeWidth: 2 },
        );
        gleam(c, lx + 0.35 * U, top + 0.5 * U, bottom - 0.5 * U);
        const each = p.step / Math.max(1, Math.round(p.minor));
        for (let k = 0; k * each <= max + 1e-9; k++) {
            const v = k * each,
                y = at(v),
                major = Math.abs(v / p.step - Math.round(v / p.step)) < 1e-9,
                half =
                    !major &&
                    Math.round(p.minor) % 2 === 0 &&
                    Math.abs(((v / p.step) % 1) - 0.5) < 1e-9;
            pen.line(g, rx - (major ? 0.8 * U : half ? 0.55 * U : 0.35 * U), y, rx, y, "ruler", {
                strokeWidth: major ? 1.5 : 0.9,
            });
            if (major && v > 0) {
                patch(c, rx + 1.1 * U, y - 5, 1.6 * U, 16);
                num(c, rx + 0.35 * U, y + 5, v, 12, "start");
                a[`mark(${v})`] = [rx, y, "right"];
            }
        }
        soft(c, (lx + rx) / 2, 16.5 * U, p.unit, 13);
        a.level = [lx, level, "left"];
        return a;
    },
    describe: () =>
        "A tall measuring cylinder with a spout and a foot, its scale marked up the side with the unit written, blue liquid curving up where it meets the glass.",
    reads: true,
});
