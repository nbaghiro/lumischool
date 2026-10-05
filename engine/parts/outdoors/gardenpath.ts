import { plain } from "../../ink/surface";
import { U } from "../../paper";
import { defineDrawing } from "../drawing";
import { hash } from "./wash";

/** A gravel path seen from above: a pale strip of crunchy stones with soft edges, laid in lengths that meet. */
export const gardenPath = defineDrawing<{ w: number; h: number }>({
    id: "gardenpath",
    family: "outdoors",
    title: "Gravel path",
    group: "Structures",
    about: "A garden path of pale gravel seen from above, a strip scattered with small round stones between soft edges of grass, for walking from the house to the beds.",
    params: { w: 12, h: 2 },
    settings: {
        w: { kind: "whole", min: 2, max: 36 },
        h: { kind: "whole", min: 1, max: 6 },
    },
    takes: [
        { label: "A long path", params: { w: 12, h: 2 } },
        { label: "A short, wide path", params: { w: 4, h: 3 } },
    ],
    box: (p) => ({ w: p.w, h: p.h }),
    draw: (c, p) => {
        const w = p.w * U,
            h = p.h * U,
            m = 0.15 * U;
        if (!c.paper)
            plain(c, {
                kind: "rect",
                x: m,
                y: m,
                w: w - 2 * m,
                h: h - 2 * m,
                fill: c.t.tang,
                opacity: 0.16,
            });
        c.pen.line(c.g, m, m, w - m, m, "pencil", { stroke: c.t["ink-soft"], strokeWidth: 0.8 });
        c.pen.line(c.g, m, h - m, w - m, h - m, "pencil", {
            stroke: c.t["ink-soft"],
            strokeWidth: 0.8,
        });
        const n = Math.round(p.w * p.h * 3);
        for (let i = 0; i < n; i++)
            c.pen.circle(
                c.g,
                m + 0.3 * U + hash(i, 11) * (w - 2 * m - 0.6 * U),
                m + 0.3 * U + hash(i, 5) * (h - 2 * m - 0.6 * U),
                (0.14 + hash(i, 2) * 0.14) * U,
                "pencil",
                null,
                { stroke: c.t["ink-soft"], strokeWidth: 0.5 },
            );
        return {};
    },
    describe: () =>
        "A garden path of pale gravel seen from above, scattered with small round stones between edges of grass.",
    motion: { still: "A path is ground; it stays put under the feet that walk it." },
});
