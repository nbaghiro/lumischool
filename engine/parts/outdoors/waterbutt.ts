import { U } from "../../paper";
import { defineDrawing } from "../drawing";

/** A water butt seen from above: a round barrel of rainwater with a lid half off, where the can is filled. */
export const waterButt = defineDrawing<{ full: number }>({
    id: "waterbutt",
    family: "outdoors",
    title: "Water butt",
    group: "Props",
    about: "A round water butt seen from above, a barrel of saved rainwater with wooden hoops and a lid pushed half off, showing how full it is.",
    params: { full: 0.8 },
    settings: { full: { kind: "number", min: 0, max: 1, step: 0.1 } },
    takes: [
        { label: "Nearly full", params: { full: 0.8 } },
        { label: "Low", params: { full: 0.3 } },
    ],
    box: () => ({ w: 3, h: 3 }),
    draw: (c, p) => {
        const x = 1.5 * U,
            y = 1.5 * U,
            r = 1.3 * U,
            water = Math.max(0, Math.min(1, p.full));
        c.pen.circle(c.g, x, y, 2 * r, "pencil", c.pen.fill("tang", "solid"), { strokeWidth: 1.6 });
        c.pen.circle(c.g, x, y, 2 * r * 0.78, "pencil", c.pen.fill("sky", "solid"), {
            strokeWidth: 1,
            fillWeight: 0.5 + water,
        });
        c.pen.circle(c.g, x, y, 2 * r * 0.78 * (0.4 + 0.6 * water), "pencil", null, {
            strokeWidth: 0.6,
            stroke: c.t.sky,
        });
        // the lid, pushed half off to the side
        c.pen.ellipse(
            c.g,
            x + 0.75 * U,
            y - 0.55 * U,
            1.3 * U,
            1.3 * U,
            "pencil",
            c.pen.fill("tang", "solid"),
            {
                strokeWidth: 1.1,
            },
        );
        return {};
    },
    describe: (p) =>
        `A round wooden water butt seen from above, full of saved rainwater ${p.full >= 0.6 ? "nearly to the top" : "a little way up"}, with its lid pushed half off.`,
    motion: { still: "A barrel stands where the can goes back to; it does not move." },
});
