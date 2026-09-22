import { type RawAnchors } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { patch, say } from "../lettering";

export const tank = defineDrawing({
    id: "tank",
    family: "science",
    title: "Tank of water",
    group: "Structures",
    about: "A glass tank of water with lettered things in it, some bobbing at the surface and some resting on the bottom. Floating and sinking is the first question in physics a child can answer by looking, so the answer has to be in the drawing rather than in the words.",
    params: { float: 2, sunk: 2, water: 0.72, letters: true },
    settings: {
        float: { kind: "whole", min: 0, max: 6 },
        sunk: { kind: "whole", min: 0, max: 6 },
        water: { kind: "number", min: 0.15, max: 0.95, step: 0.01 },
        letters: { kind: "flag" },
    },
    takes: [
        {
            label: "Three float, two sink",
            params: { float: 3, sunk: 2, water: 0.72, letters: true },
        },
        { label: "Everything sinks", params: { float: 0, sunk: 4, water: 0.72, letters: true } },
    ],
    box: (p) => ({ w: Math.max(12, (p.float + p.sunk) * 4 + 2), h: 12 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const w = Math.max(12, (p.float + p.sunk) * 4 + 2) * U;
        const top = 1.4 * U,
            bottom = 9.6 * U;
        const level = bottom - (bottom - top) * Math.max(0.15, Math.min(0.95, p.water));
        pen.rect(
            g,
            U,
            level,
            w - 2 * U,
            bottom - level,
            "ruler",
            pen.fill("sky", "solid", { hachureGap: 7 }),
            { strokeWidth: 0 },
        );
        pen.line(g, U, level, w - U, level, "ruler", { strokeWidth: 2 });
        pen.path(g, `M${U} ${top}V${bottom}H${w - U}V${top}`, "ruler", null, { strokeWidth: 2.6 });
        const n = p.float + p.sunk;
        const step = (w - 3 * U) / Math.max(1, n);
        for (let i = 0; i < n; i++) {
            const cx = 1.5 * U + step * (i + 0.5),
                floats = i < p.float;
            const cy = floats ? level : bottom - 1.1 * U;
            if (floats) {
                // A cork, standing up out of the water: the dome is above the surface line and the part
                // under it is a light arc, because "floats" has to be visible as sticking out.
                pen.path(
                    g,
                    `M${cx - 1 * U} ${cy}a${1 * U} ${1 * U} 0 0 0 ${2 * U} 0`,
                    "pencil",
                    pen.fill("tang"),
                    { strokeWidth: 1.8 },
                );
                pen.arc(g, cx, cy, 2 * U, 1.1 * U, 0, Math.PI, "pencil", {
                    strokeWidth: 1.2,
                    stroke: c.t["ink-soft"],
                });
            } else {
                // A stone on the floor of the tank: heavy, flat-bottomed and unmistakably on the bottom.
                pen.polygon(
                    g,
                    [
                        [cx - 1.2 * U, cy + 1 * U],
                        [cx - 1 * U, cy - 0.7 * U],
                        [cx + 0.3 * U, cy - 1 * U],
                        [cx + 1.2 * U, cy - 0.2 * U],
                        [cx + 1.1 * U, cy + 1 * U],
                    ],
                    "pencil",
                    pen.fill("ink-soft", "hachure", { hachureGap: 3.6 }),
                    { strokeWidth: 2 },
                );
            }
            if (p.letters) {
                patch(c, cx, 10.6 * U - 5, 24, 20);
                say(c, cx, 10.9 * U, "ABCDEFGH"[i] ?? "?", 17);
            }
            a[`thing(${i})`] = [cx, cy - U, "up"];
        }
        a.level = [w - U, level, "right"];
        return a;
    },
    describe: () =>
        "A glass tank of water seen from the side with lettered things in it, each either bobbing at the surface or resting on the bottom.",
    reads: true,
});
