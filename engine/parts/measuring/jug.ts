import { type RawAnchors } from "../../ink/surface";
import { U, type Marker } from "../../paper";
import { defineDrawing } from "../drawing";
import { num, patch, soft } from "../lettering";

/** Water, juice, or whatever is in the container: one colour, so a level is never ambiguous. */
const WATER: Marker = "sky";

export const jug = defineDrawing({
    id: "jug",
    family: "measuring",
    title: "Measuring jug",
    group: "Structures",
    about: "A tapered jug with its scale on the outside and the liquid drawn to a level. The minor marks come from the numbered ones, so asking what is between 200 and 300 millilitres always works.",
    params: { max: 1000, step: 200, level: 350, unit: "ml" },
    settings: {
        max: { kind: "whole", min: 100, max: 5000 },
        step: { kind: "whole", min: 10, max: 1000 },
        level: { kind: "whole", min: 0, max: 5000 },
        unit: { kind: "text", most: 4 },
    },
    takes: [
        { label: "350 ml", params: { max: 1000, step: 200, level: 350, unit: "ml" } },
        { label: "Full litre", params: { max: 1000, step: 200, level: 1000, unit: "ml" } },
        {
            label: "Half a litre, finer scale",
            params: { max: 500, step: 100, level: 275, unit: "ml" },
        },
        { label: "Empty", params: { max: 1000, step: 250, level: 0, unit: "ml" } },
    ],
    box: () => ({ w: 11, h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            top = 2 * U,
            bottom = 10 * U,
            H = bottom - top - 16;
        const lx = 3 * U,
            rx = 8 * U,
            taper = 0.4 * U;
        const at = (v: number) => bottom - (Math.max(0, Math.min(v, p.max)) / p.max) * H;
        // The jug narrows towards the base, so the two sides have to be interpolated at every height.
        const edge = (y: number, side: -1 | 1): number => {
            const t = Math.max(0, Math.min(1, (y - top) / (bottom - top))),
                inner = side < 0 ? lx : rx;
            return inner + side * -taper * t;
        };
        const level = at(p.level);
        if (p.level > 0) {
            pen.path(
                g,
                `M${edge(level, -1)} ${level}H${edge(level, 1)}L${edge(bottom, 1)} ${bottom}H${edge(bottom, -1)}Z`,
                "ruler",
                pen.fill(WATER, "solid", { hachureGap: 6 }),
                { strokeWidth: 0 },
            );
            pen.line(g, edge(level, -1), level, edge(level, 1), level, "ruler", {
                strokeWidth: 2,
                stroke: c.t.ink,
            });
        }
        pen.path(
            g,
            `M${lx} ${top}L${edge(bottom, -1)} ${bottom}Q${(lx + rx) / 2} ${bottom + 14} ${edge(bottom, 1)} ${bottom}L${rx} ${top}`,
            "ruler",
            null,
            { strokeWidth: 2.4 },
        );
        // Spout on the left, handle on the right: the shape says "jug" before the scale is read.
        pen.path(
            g,
            `M${lx} ${top}L${lx - 22} ${top - 4}L${lx - 6} ${top + 16}`,
            "ruler",
            pen.fill("card"),
            { strokeWidth: 2 },
        );
        pen.path(
            g,
            `M${rx} ${top + 20}C${rx + 44} ${top + 22} ${rx + 44} ${top + 96} ${rx - 6} ${top + 92}`,
            "ruler",
            null,
            { strokeWidth: 2.4 },
        );
        const a: RawAnchors = {
            level: [edge(level, 1), level, "right"],
            rim: [(lx + rx) / 2, top, "up"],
        };
        const half = p.step / 2;
        for (let v = 0; v <= p.max; v += half) {
            const y = at(v),
                major = v % p.step === 0;
            pen.line(g, edge(y, -1), y, edge(y, -1) + (major ? 26 : 14), y, "ruler", {
                strokeWidth: major ? 1.6 : 1,
            });
            if (major && v > 0) {
                patch(c, edge(y, -1) - 22, y - 5, 46, 18);
                num(c, edge(y, -1) - 6, y + 5, v, 13, "end");
                a[`mark(${v})`] = [edge(y, -1), y, "left"];
            }
        }
        soft(c, (lx + rx) / 2, 11.4 * U, p.unit, 13);
        return a;
    },
    describe: () =>
        "A measuring jug with a handle and a lip, its scale marked up the side in steps with the unit written, blue water filling it part way.",
});
