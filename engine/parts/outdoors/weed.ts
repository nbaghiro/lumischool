import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** A spiky weed come up in a bed, with a dandelion-like flower, ready to be pulled. */
export const weed = defineDrawing<{ flower: boolean }>({
    id: "weed",
    family: "outdoors",
    title: "Weed",
    group: "Props",
    about: "A small spiky weed come up in the soil between the crops, with jagged leaves spreading from its middle and sometimes a little yellow flower.",
    params: { flower: true },
    settings: { flower: { kind: "flag" } },
    takes: [
        { label: "In flower", params: { flower: true } },
        { label: "Just leaves", params: { flower: false } },
    ],
    box: () => ({ w: 2, h: 2 }),
    draw: (c, p) => {
        const x = U,
            y = 1.35 * U;
        for (const a of [-2.6, -1.9, -1.2, -0.5]) {
            const ex = x + Math.cos(a) * 0.8 * U,
                ey = y + Math.sin(a) * 0.8 * U;
            c.pen.path(
                c.g,
                `M${x} ${y}L${(x + ex) / 2 - 0.12 * U} ${(y + ey) / 2 - 0.12 * U}L${(x + ex) / 2 + 0.06 * U} ${(y + ey) / 2 + 0.05 * U}L${ex} ${ey}`,
                "pencil",
                null,
                { stroke: c.t.ok, strokeWidth: 1.5 },
            );
        }
        if (p.flower) {
            c.pen.line(c.g, x, y, x + 0.1 * U, y - 0.95 * U, "pencil", {
                stroke: c.t.ok,
                strokeWidth: 1.2,
            });
            c.pen.circle(
                c.g,
                x + 0.1 * U,
                y - 1 * U,
                0.45 * U,
                "pencil",
                c.pen.fill("glow", "solid"),
                {
                    strokeWidth: 0.9,
                },
            );
        }
        return {};
    },
    describe: (p) =>
        `A small spiky weed growing in the soil of a garden bed, with jagged leaves spreading from its middle${p.flower ? " and a little yellow flower on a stalk" : ""}.`,
});
