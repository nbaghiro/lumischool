import { type RawAnchors } from "../../ink/surface";
import { rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { num, patch, soft } from "../lettering";
import { LIQUID } from "./apparatus";

export const beaker = defineDrawing({
    id: "beaker",
    family: "science",
    title: "Beaker",
    group: "Structures",
    about: "A beaker with a lip and a scale up its side, filled to a level, with room for a solid settled on the bottom and a stirring rod in it. Ten of the chemistry lessons start by reading one of these, so the minor marks are worked out from the numbered ones the way a jug's are.",
    params: { max: 400, step: 100, level: 250, unit: "ml", solid: 0, rod: false, label: "" },
    settings: {
        max: { kind: "whole", min: 20, max: 1000 },
        step: { kind: "whole", min: 5, max: 500 },
        level: { kind: "whole", min: 0, max: 1000 },
        unit: { kind: "text", most: 3 },
        solid: { kind: "whole", min: 0, max: 40 },
        rod: { kind: "flag" },
        label: { kind: "text", most: 8 },
    },
    takes: [
        {
            label: "250 ml",
            params: {
                max: 400,
                step: 100,
                level: 250,
                unit: "ml",
                solid: 0,
                rod: false,
                label: "",
            },
        },
        {
            label: "Something to dissolve",
            params: {
                max: 400,
                step: 100,
                level: 200,
                unit: "ml",
                solid: 10,
                rod: true,
                label: "",
            },
        },
        {
            label: "Nearly empty",
            params: { max: 400, step: 100, level: 50, unit: "ml", solid: 0, rod: false, label: "" },
        },
    ],
    box: () => ({ w: 11, h: 13 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const lx = 2.6 * U,
            rx = 8.4 * U,
            top = 1.8 * U,
            bottom = 10.4 * U;
        const span = bottom - top - 14;
        const at = (v: number) =>
            bottom - (Math.max(0, Math.min(v, p.max)) / Math.max(1, p.max)) * span;
        const level = at(p.level);
        if (p.level > 0) {
            pen.rect(
                g,
                lx + 3,
                level,
                rx - lx - 6,
                bottom - level - 3,
                "ruler",
                pen.fill(LIQUID, "solid", { hachureGap: 6 }),
                { strokeWidth: 0 },
            );
            pen.line(g, lx + 3, level, rx - 3, level, "ruler", { strokeWidth: 2, stroke: c.t.ink });
        }
        // the solid that has not dissolved: grains on the floor of the beaker, the answer to
        // "is it all gone yet" without a word on the page
        if (p.solid > 0) {
            const r = rng(97);
            for (let i = 0; i < Math.min(40, p.solid); i++) {
                const x = lx + 12 + r() * (rx - lx - 24),
                    y = bottom - 6 - r() * 0.6 * U;
                pen.circle(
                    g,
                    x,
                    y,
                    7,
                    "pencil",
                    { fill: c.t.ink, fillStyle: "solid" },
                    { strokeWidth: 0.6 },
                );
            }
        }
        // the glass: straight sides, a rounded floor and a lip pulled out at the top left
        pen.path(
            g,
            `M${lx} ${top}V${bottom - 14}Q${lx} ${bottom} ${lx + 14} ${bottom}H${rx - 14}Q${rx} ${bottom} ${rx} ${bottom - 14}V${top}`,
            "ruler",
            null,
            { strokeWidth: 2.6 },
        );
        pen.path(g, `M${lx} ${top}L${lx - 20} ${top - 6}`, "ruler", null, { strokeWidth: 2.2 });
        pen.line(g, lx - 4, top, rx + 4, top, "ruler", { strokeWidth: 1.6 });
        if (p.rod)
            pen.line(g, rx - 0.9 * U, top - 1.6 * U, lx + 1.2 * U, bottom - 0.5 * U, "ruler", {
                strokeWidth: 3,
                stroke: c.t["ink-soft"],
            });
        const half = p.step / 2;
        for (let v = half; v <= p.max; v += half) {
            const y = at(v),
                major = v % p.step === 0;
            pen.line(g, rx - (major ? 26 : 14), y, rx, y, "ruler", {
                strokeWidth: major ? 1.6 : 1,
            });
            if (major) {
                patch(c, rx + 1.1 * U, y - 5, 46, 18);
                num(c, rx + 0.4 * U, y + 5, v, 13, "start");
                a[`mark(${v})`] = [rx, y, "right"];
            }
        }
        soft(c, (lx + rx) / 2, 11.9 * U, p.label || p.unit, 13);
        a.level = [lx, level, "left"];
        a.rim = [(lx + rx) / 2, top, "up"];
        a.floor = [(lx + rx) / 2, bottom, "down"];
        return a;
    },
    describe: (p) =>
        `A glass beaker with a lip and a scale up its side, blue liquid part way up it${p.solid > 0 ? ", grains settled on its floor" : ""}${p.rod ? ", a rod leaning in it" : ""}.`,
    motion: { still: STILL.instrument },
    reads: true,
});
