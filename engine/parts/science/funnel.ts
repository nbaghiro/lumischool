import { type RawAnchors } from "../../ink/surface";
import { rng } from "../../ink/pen";
import { U } from "../../paper";
import { defineDrawing, STILL } from "../drawing";
import { soft } from "../lettering";
import { LIQUID } from "./apparatus";

export const funnel = defineDrawing({
    id: "funnel",
    family: "science",
    title: "Filter funnel",
    group: "Structures",
    about: "A funnel with folded paper in it standing in a beaker: what will not go through stays on the paper, what does drips into the glass below. Separating is two pictures in one, and this is the only drawing where both halves of the answer are visible at once.",
    params: { residue: 6, level: 2, unit: "ml", drops: 3, label: "" },
    settings: {
        residue: { kind: "whole", min: 0, max: 30 },
        level: { kind: "whole", min: 0, max: 4 },
        unit: { kind: "text", most: 3 },
        drops: { kind: "whole", min: 0, max: 5 },
        label: { kind: "text", most: 20 },
    },
    takes: [
        {
            label: "Sand left in the paper",
            params: { residue: 8, level: 2, unit: "ml", drops: 3, label: "" },
        },
        {
            label: "A little left",
            params: { residue: 2, level: 4, unit: "ml", drops: 3, label: "" },
        },
    ],
    box: () => ({ w: 13, h: 16 }),
    draw: (c, p) => {
        const { pen, g } = c,
            a: RawAnchors = {};
        const cx = 6.5 * U,
            rim = 1.6 * U,
            half = 3.2 * U,
            tipY = 6.4 * U;
        // the cone, then the paper inside it a little lower, so the two edges read apart
        pen.path(
            g,
            `M${cx - half} ${rim}L${cx - 0.32 * U} ${tipY}V${8.4 * U}h${0.64 * U}V${tipY}L${cx + half} ${rim}Z`,
            "ruler",
            pen.fill("card"),
            { strokeWidth: 2.4 },
        );
        pen.path(
            g,
            `M${cx - half + 10} ${rim + 8}L${cx} ${tipY - 6}L${cx + half - 10} ${rim + 8}`,
            "ruler",
            null,
            { strokeWidth: 1.6, stroke: c.t["ink-soft"] },
        );
        pen.line(g, cx, rim + 10, cx, tipY - 8, "ruler", {
            strokeWidth: 1,
            strokeLineDash: [5, 5],
            stroke: c.t["ink-soft"],
        });
        pen.line(g, cx - half - 6, rim, cx + half + 6, rim, "ruler", { strokeWidth: 1.8 });
        if (p.residue > 0) {
            const r = rng(421);
            for (let i = 0; i < Math.min(30, p.residue); i++) {
                const t = 0.15 + r() * 0.55,
                    y = rim + 14 + t * (tipY - rim - 20);
                const w = (half - 12) * (1 - (y - rim) / (tipY - rim));
                pen.circle(
                    g,
                    cx + (r() - 0.5) * 2 * w,
                    y,
                    8,
                    "pencil",
                    { fill: c.t.ink, fillStyle: "solid" },
                    { strokeWidth: 0.6 },
                );
            }
            a.residue = [cx, rim + 1.4 * U, "up"];
        }
        for (let i = 0; i < Math.max(0, Math.min(5, p.drops)); i++) {
            const y = 9 * U + i * 0.8 * U;
            pen.ellipse(g, cx, y, 10, 14, "pencil", pen.fill(LIQUID), { strokeWidth: 1.2 });
        }
        // the beaker underneath, plain, because the funnel is the thing being read
        const lx = 2.6 * U,
            rx = 10.4 * U,
            top = 11.4 * U,
            bottom = 14.6 * U;
        const level = bottom - Math.max(0, Math.min(1, p.level / 4)) * (bottom - top - 8);
        pen.rect(
            g,
            lx + 3,
            level,
            rx - lx - 6,
            bottom - level - 4,
            "ruler",
            pen.fill(LIQUID, "solid", { hachureGap: 6 }),
            { strokeWidth: 0 },
        );
        pen.line(g, lx + 3, level, rx - 3, level, "ruler", { strokeWidth: 1.8 });
        pen.path(
            g,
            `M${lx} ${top}V${bottom - 12}Q${lx} ${bottom} ${lx + 12} ${bottom}H${rx - 12}Q${rx} ${bottom} ${rx} ${bottom - 12}V${top}`,
            "ruler",
            null,
            { strokeWidth: 2.4 },
        );
        pen.line(g, lx - 4, top, rx + 4, top, "ruler", { strokeWidth: 1.6 });
        soft(c, cx, 15.6 * U, p.label || "what went through", 13);
        a.filtrate = [rx, level, "right"];
        a.paper = [cx, rim, "up"];
        return a;
    },
    describe: (p) =>
        `A funnel lined with folded paper standing in a glass beaker${p.residue > 0 ? ", dark grains caught on the paper" : ""}${p.drops > 0 ? ", drops falling from its stem" : ""}, blue liquid gathered in the beaker below.`,
    motion: { still: STILL.instrument },
    reads: true,
});
