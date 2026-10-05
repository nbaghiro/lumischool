import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/**
 * A potting bench seen from above: a slatted wooden top where seed packets stand in a rack and a
 * trowel and a pot or two wait, the place a gardener's things live.
 */
export const pottingBench = defineDrawing<{ h: number; pots: number }>({
    id: "pottingbench",
    family: "outdoors",
    title: "Potting bench",
    group: "Structures",
    about: "A wooden potting bench seen from above, its top made of planks laid long, with a trowel and a few clay flowerpots at its foot, where seed packets stand ready.",
    params: { h: 12, pots: 2 },
    settings: {
        h: { kind: "number", min: 4, max: 20, step: 1 },
        pots: { kind: "number", min: 0, max: 3, step: 1 },
    },
    takes: [
        { label: "A long bench with two pots", params: { h: 12, pots: 2 } },
        { label: "A short bench, no pots", params: { h: 6, pots: 0 } },
    ],
    box: (p) => ({ w: 4, h: p.h }),
    draw: (c, p) => {
        const w = 4 * U,
            h = p.h * U,
            m = 0.15 * U,
            pots = Math.max(0, Math.min(3, Math.round(p.pots))),
            top = h - (pots > 0 ? 1.4 * U : 0.2 * U);
        if (!c.paper)
            plain(c, {
                kind: "rect",
                x: m,
                y: m,
                w: w - 2 * m,
                h: top - m,
                fill: c.t.tang,
                opacity: 0.45,
            });
        c.pen.rect(c.g, m, m, w - 2 * m, top - m, "pencil", null, { strokeWidth: 1.5 });
        // the planks run the length of the bench
        for (const f of [0.34, 0.66])
            c.pen.line(c.g, w * f, m + 0.2 * U, w * f, top - 0.2 * U, "pencil", {
                stroke: c.t["ink-soft"],
                strokeWidth: 0.7,
            });
        // the trowel lying across the top
        c.pen.line(c.g, 0.7 * U, top - 1.1 * U, 2.1 * U, top - 0.7 * U, "pencil", {
            strokeWidth: 1.4,
        });
        c.pen.ellipse(
            c.g,
            2.6 * U,
            top - 0.55 * U,
            1 * U,
            0.55 * U,
            "pencil",
            c.pen.fill("ink-soft", "solid"),
            {
                strokeWidth: 0.8,
            },
        );
        for (let i = 0; i < pots; i++)
            c.pen.circle(
                c.g,
                (0.75 + i * 1.25) * U,
                h - 0.7 * U,
                0.95 * U,
                "pencil",
                c.pen.fill("tang", "solid"),
                {
                    strokeWidth: 1,
                },
            );
        return {};
    },
    describe: (p) =>
        `A wooden potting bench seen from above, a top of long planks with a trowel lying on it${p.pots > 0 ? ` and ${Math.round(p.pots)} clay flowerpot${Math.round(p.pots) === 1 ? "" : "s"} at its foot` : ""}, where seed packets stand.`,
    motion: {
        still: "A bench is furniture of the plot: it stays put so the packets on it can be found again.",
    },
});
